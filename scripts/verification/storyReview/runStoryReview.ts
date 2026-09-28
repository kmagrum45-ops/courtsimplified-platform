/**
 * Story review battery -- runs realistic stories through the WHOLE guided
 * intake the way a user meets it, and reports where it falls short of what a
 * careful human helper would do.
 *
 * WHAT IT CATCHES (2026-09-28). A manual run by the site owner found
 * problems no suite caught: questions the story had already answered, a
 * claim type for the wrong side, and nothing asking for the receipt or the
 * other party's address. Those live between stages -- each stage was tested
 * alone and passed. This runs the stages in order, on the same data a user's
 * browser would send:
 *
 *   1. classifyCourtPath                -- home-page routing
 *   2. orchestrateIntakeTurn(story)     -- safety, claim type, story proposals
 *   3. applyConfirmedStoryAnswers       -- the user accepts every proposal
 *   4. orchestrateIntakeTurn per answer -- the remaining questions
 *   5. selectDepthQuestions + orchestrateDepthTurn on the claim type
 *   6. runCaseReview on the confirmed case file
 *
 * and checks each story against expectations committed in stories.ts BEFORE
 * any run. Every check is deterministic pattern-matching over what the user
 * would see; no model grades another model (journeyInvariants.ts's rule).
 * The report also prints every question shown, in order, because some
 * failures ("that question didn't need asking") are only visible to a reader.
 *
 * Reuses the real functions and the depth route's own selection call. It does
 * NOT reuse fixtures/pipelineRunner.ts, because that runner stops before
 * steps 3, 5 and 6, and throws on an unscripted question -- here an
 * unscripted question is a finding, answered "I'm not sure." and reported.
 *
 * APPROXIMATION, stated: the case file for step 6 is built from the guided
 * facts directly (story, timeline, amount, evidence, remedy, role, filing
 * status). The builder's own save path is not exercised; names and addresses
 * are empty because the guided intake does not ask for them.
 *
 * Civil, family and tribunal stories run steps 1 and the safety pass only:
 * there is no guided intake for those areas, and the report says so.
 *
 * COST: gpt-4o-mini throughout; about 20 calls per Small Claims story.
 * --offline replaces every model call with a fixed fake so the plumbing can
 * be checked with no key and no cost.
 *
 * Writes scripts/verification/storyReview/REPORT.md and results.json.
 * Exits 0 whatever the findings: this is a review, not a gate. It exits 1
 * only when it could not run.
 */

import fs from "node:fs";
import path from "node:path";

import {
  applyConfirmedStoryAnswers,
  orchestrateIntakeTurn,
  type OrchestrateIntakeTurnOverrides,
  type OrchestrateIntakeTurnResult,
} from "../../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK } from "../../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../../src/lib/case-system/intake/selectQuestions";
import { runSafetyPass, type SafetyPassResult } from "../../../src/lib/case-system/intake/safetyPass";
import { classifyCourtPath } from "../../../src/lib/case-system/intelligence/courtPathClassifier";
import { selectDepthQuestions } from "../../../src/lib/case-system/intake/depth/selectDepthQuestions";
import { orchestrateDepthTurn } from "../../../src/lib/case-system/intake/depth/orchestrateDepthTurn";
import type { ElementStateMap } from "../../../src/lib/case-system/intake/depth/elementStateMap";
import { runCaseReview } from "../../../src/lib/case-system/caseReview/runCaseReview";
import type { CaseReviewFinding, ConfirmedCaseFile } from "../../../src/lib/case-system/caseReview/caseReview";
import { validateCaseStrengthLanguage } from "../../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

import {
  DEFENDANT_DEFAULTS,
  PLAINTIFF_DEFAULTS,
  STORIES,
  type ReviewStory,
} from "./stories";

const OUT_DIR = path.join(process.cwd(), "scripts", "verification", "storyReview");
const MAX_TURNS = 25;
const CONCURRENCY = 3;
const UNSCRIPTED = "I'm not sure.";

type Shown = { stage: "question" | "depth" | "proposal" | "review" | "notice"; id: string; text: string };

type CheckResult = { check: string; pass: boolean; detail: string };

type StoryRun = {
  id: string;
  area: string;
  side: string;
  note: string;
  story: string;
  courtPath: string;
  courtPathSource: string;
  safety: string;
  halted: boolean;
  /** The legal-advice notice showed (the user asked "do I have a case" or similar). */
  legalAdviceNotice: boolean;
  claimTypeMatched: string | null;
  claimTypeSuggested: string | null;
  claimTypeUsed: string | null;
  proposals: { questionId: string; answer: string; quote: string }[];
  askedIds: string[];
  unscripted: string[];
  depthAsked: { id: string; text: string }[];
  review: { aiRan: boolean; findings: { kind: string; text: string; quotes: string[]; ai: boolean }[] } | null;
  shown: Shown[];
  /** The facts the intake ended with -- what every later screen reads. */
  finalFacts: IntakeFacts;
  checks: CheckResult[];
  error?: string;
};

/* ------------------------------------------------------------------ */
/* Offline fakes -- plumbing only, never a stand-in for a real result */
/* ------------------------------------------------------------------ */

const fakeSafety = async (): Promise<SafetyPassResult> => ({ classification: "clear", requestsLegalAdvice: false });

const OFFLINE_OVERRIDES: OrchestrateIntakeTurnOverrides = {
  runSafety: fakeSafety,
  extractFacts: async () => ({ facts: {}, directFields: [] }),
  classifyClaimType: async () => null,
  composeVoice: async (_facts, question) => ({ leadIn: null, questionText: question.text, fellBackToPlainText: true }),
  proposeAnswers: async () => [],
};

/* ------------------------------------------------------------------ */

function answersFor(story: ReviewStory): Record<string, string> {
  const base = story.side === "defendant" ? DEFENDANT_DEFAULTS : PLAINTIFF_DEFAULTS;
  return { ...base, ...(story.answers || {}) };
}

/** The fields buildUserTexts() in GuidedSmallClaimsIntake.tsx reads. */
function userTextsFrom(story: string, typed: string[], facts: IntakeFacts): string[] {
  const fields = ["storyText", "amountClaimedText", "timelineText", "evidenceText", "remedySoughtText", "serviceDetailsText"];
  const fromFacts = fields
    .map((field) => facts[field as keyof IntakeFacts])
    .filter((value): value is string => typeof value === "string");
  return [story, ...typed, ...fromFacts].filter((text) => text.trim().length > 0).slice(0, 12);
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

function caseFileFrom(story: string, facts: IntakeFacts, claimTypeId: string | null): ConfirmedCaseFile {
  const role = facts.role === "plaintiff" ? "Plaintiff / claimant" : facts.role === "defendant" ? "Defendant / responding party" : "";
  return {
    courtPath: "small-claims",
    role,
    stage: facts.claimFiled === true ? "claim-filed" : "starting-case",
    story,
    yourName: "",
    otherParty: "",
    otherPartyAddress: "",
    amountText: str(facts.amountClaimedText),
    timelineText: str(facts.timelineText),
    evidenceText: str(facts.evidenceText),
    goalText: str(facts.remedySoughtText),
    confirmedClaimTypeId: claimTypeId,
    filedDocuments: facts.claimFiled === true ? ["plaintiffs-claim"] : [],
  };
}

async function runOne(story: ReviewStory, apiKey: string, offline: boolean): Promise<StoryRun> {
  const run: StoryRun = {
    id: story.id,
    area: story.area,
    side: story.side,
    note: story.note,
    story: story.story,
    courtPath: "",
    courtPathSource: "",
    safety: "",
    halted: false,
    legalAdviceNotice: false,
    claimTypeMatched: null,
    claimTypeSuggested: null,
    claimTypeUsed: null,
    proposals: [],
    askedIds: [],
    unscripted: [],
    depthAsked: [],
    review: null,
    shown: [],
    finalFacts: {},
    checks: [],
  };

  // 1. Court routing.
  const court = await classifyCourtPath({ story: story.story, allowExternalCognition: !offline });
  run.courtPath = court.primaryPath === "out-of-scope" ? `out-of-scope (${court.outOfScopeForum?.id ?? "unnamed forum"})` : court.primaryPath;
  run.courtPathSource = court.source;
  run.checks.push({
    check: "court-path",
    pass: story.expect.courtPath.includes(court.primaryPath),
    detail: `routed to "${run.courtPath}", expected ${story.expect.courtPath.join(" or ")}`,
  });

  if (story.area !== "small-claims") {
    const safety = offline ? await fakeSafety() : await runSafetyPass(story.story, apiKey);
    run.safety = safety.classification;
    run.checks.push({
      check: "safety",
      pass: story.expect.safety.includes(safety.classification),
      detail: `got "${safety.classification}", expected ${story.expect.safety.join(" or ")}`,
    });
    run.shown.push({
      stage: "notice",
      id: "no-guided-intake",
      text: `No guided intake exists for ${story.area} yet; only routing and the safety check ran.`,
    });
    return run;
  }

  const overrides = offline ? OFFLINE_OVERRIDES : {};
  const answers = answersFor(story);
  const typed: string[] = [];

  // 2. Opening story.
  let result: OrchestrateIntakeTurnResult = await orchestrateIntakeTurn(
    {}, [], story.story, apiKey, QUESTION_BANK, CLAIM_TYPES, "small-claims", undefined, overrides,
  );
  let facts = result.facts;
  let answeredIds = result.answeredIds;
  run.safety = result.safetyClassification || "";
  run.halted = result.halted;
  run.legalAdviceNotice = result.requestsLegalAdvice === true;
  if (run.legalAdviceNotice) run.shown.push({ stage: "notice", id: "legal-advice", text: "We can't answer that one (fixed notice + referral list)" });
  run.checks.push({
    check: "safety",
    pass: story.expect.safety.includes(result.safetyClassification as never),
    detail: `got "${result.safetyClassification}", expected ${story.expect.safety.join(" or ")}`,
  });
  if (result.distressAcknowledgment) run.shown.push({ stage: "notice", id: "distress", text: result.distressAcknowledgment });
  if (result.halted) {
    run.shown.push({ stage: "notice", id: "halt", text: result.haltMessage || "" });
    return run;
  }

  const exact = result.matchedClaimTypes[0]?.claimType;
  run.claimTypeMatched = exact?.id || null;
  run.claimTypeSuggested = result.suggestedClaimType?.claimTypeId || null;

  // 3. Proposals -- the simulated user accepts every one as offered.
  run.proposals = result.storyProposals.map((p) => ({ questionId: p.questionId, answer: p.answer, quote: p.storyQuote }));
  for (const p of result.storyProposals) {
    run.shown.push({ stage: "proposal", id: p.questionId, text: `${p.questionText} -> ${p.answer}  (from: "${p.storyQuote}")` });
  }
  if (result.storyProposals.length > 0) {
    result = await applyConfirmedStoryAnswers(
      facts,
      answeredIds,
      result.storyProposals.map((p) => ({ questionId: p.questionId, answerText: p.answer })),
      apiKey,
      QUESTION_BANK,
      "small-claims",
      offline ? { extractFacts: OFFLINE_OVERRIDES.extractFacts, composeVoice: OFFLINE_OVERRIDES.composeVoice } : {},
    );
    facts = result.facts;
    answeredIds = result.answeredIds;
  }

  // 4. Remaining questions.
  let turns = 0;
  while (!result.halted && !result.intakeComplete && result.nextQuestion && turns < MAX_TURNS) {
    const question = result.nextQuestion;
    const shownText = result.voiceTurn?.questionText || question.text;
    run.shown.push({ stage: "question", id: question.id, text: (result.voiceTurn?.leadIn ? `${result.voiceTurn.leadIn} ` : "") + shownText });
    run.askedIds.push(question.id);
    let answer = answers[question.id];
    if (answer === undefined) {
      run.unscripted.push(question.id);
      answer = UNSCRIPTED;
    }
    typed.push(answer);
    answeredIds = [...answeredIds, question.id];
    result = await orchestrateIntakeTurn(
      facts, answeredIds, answer, apiKey, QUESTION_BANK, CLAIM_TYPES, "small-claims", question.id, overrides,
    );
    facts = result.facts;
    answeredIds = result.answeredIds;
    turns += 1;
  }
  if (turns >= MAX_TURNS) run.shown.push({ stage: "notice", id: "turn-cap", text: `Stopped after ${MAX_TURNS} questions.` });

  // Claim type the user would go forward with: an exact match, or a
  // suggestion the user confirms. The simulated user confirms a suggestion
  // only when it is one the story's expectations accept -- a real user
  // recognising their own situation. A wrong suggestion is reported below.
  const expectedTypes = story.expect.claimTypes || [];
  run.claimTypeUsed =
    run.claimTypeMatched ||
    (run.claimTypeSuggested && expectedTypes.includes(run.claimTypeSuggested) ? run.claimTypeSuggested : null);

  if (story.expect.claimTypes) {
    const offered = run.claimTypeMatched || run.claimTypeSuggested;
    run.checks.push({
      check: "claim-type",
      pass: Boolean(offered && expectedTypes.includes(offered)),
      detail: offered
        ? `${run.claimTypeMatched ? "matched" : "suggested"} "${offered}", expected ${expectedTypes.join(" or ")}`
        : `no claim type matched or suggested, expected ${expectedTypes.join(" or ")}`,
    });
  }

  // 5. Depth phase, as the depth route selects it.
  const claimType = CLAIM_TYPES.find((c) => c.id === run.claimTypeUsed);
  if (claimType) {
    const selection = selectDepthQuestions({
      elements: claimType.plaintiffElements,
      userTexts: userTextsFrom(story.story, typed, facts),
      slotValues: {},
    });
    let stateMap: ElementStateMap = selection.stateMap;
    for (let i = 0; i < selection.asked.length; i += 1) {
      const item = selection.asked[i];
      run.depthAsked.push({ id: item.question.id, text: item.renderedText });
      run.shown.push({ stage: "depth", id: item.question.id, text: item.renderedText });
      if (offline) continue;
      const answer = story.depthAnswers?.[item.question.id] ?? UNSCRIPTED;
      const turn = await orchestrateDepthTurn({
        answeredQuestion: item,
        answerText: answer,
        stateMap,
        nextQuestion: selection.asked[i + 1],
        apiKey,
        facts: facts as Record<string, string | number | boolean>,
      });
      stateMap = turn.stateMap;
      if (turn.halted) break;
    }
  }

  run.finalFacts = facts;

  // 6. Case review over the confirmed file.
  const file = caseFileFrom(story.story, facts, run.claimTypeUsed);
  const review = await runCaseReview(file, offline ? null : apiKey);
  run.review = {
    aiRan: review.aiRan,
    findings: review.findings.map((f: CaseReviewFinding) => ({ kind: f.kind, text: f.text, quotes: f.quotes, ai: f.aiLocated })),
  };
  for (const f of review.findings) run.shown.push({ stage: "review", id: f.kind, text: f.text });

  // ---- Checks over the whole journey ----

  if (story.expect.asksForAdvice !== undefined) {
    run.checks.push({
      check: "legal-advice-notice",
      pass: run.legalAdviceNotice === story.expect.asksForAdvice,
      detail: run.legalAdviceNotice
        ? "the \"we can't answer that\" notice and referrals were shown"
        : "the story asked for legal advice but no notice was shown",
    });
  }

  for (const id of story.expect.answeredByStory || []) {
    const proposed = run.proposals.some((p) => p.questionId === id);
    const asked = run.askedIds.includes(id);
    run.checks.push({
      check: "already-answered",
      pass: !asked,
      detail: asked
        ? `asked "${id}" although the story answers it${proposed ? " (and it was ALSO proposed)" : " (not offered from the story)"}`
        : proposed
          ? `"${id}" offered back from the story`
          : `"${id}" not asked`,
    });
  }

  if (story.expect.role) {
    const roleProposal = run.proposals.find((p) => p.questionId === "sc-orient-role");
    const recorded = facts.role;
    const ok = recorded === story.expect.role;
    run.checks.push({
      check: "side",
      pass: ok,
      detail: `recorded role "${String(recorded ?? "none")}", expected "${story.expect.role}"` +
        (roleProposal ? `; proposal said "${roleProposal.answer}"` : ""),
    });
  }

  for (const want of story.expect.reviewShouldRaise || []) {
    const hit = (run.review?.findings || []).find(
      (f) => f.kind === want.kind && (!want.quoteIncludes || f.quotes.some((q) => q.includes(want.quoteIncludes!))),
    );
    run.checks.push({
      check: "review-raises",
      pass: Boolean(hit),
      detail: hit
        ? `raised ${want.kind}${want.quoteIncludes ? ` quoting "${hit.quotes.join('" / "')}"` : ""}`
        : `did not raise ${want.kind}${want.quoteIncludes ? ` about "${want.quoteIncludes}"` : ""}` +
          (run.review && !run.review.aiRan ? " (AI half did not run)" : ""),
    });
  }

  const badText = run.shown
    .filter((s) => s.stage !== "notice")
    .map((s) => ({ s, v: validateCaseStrengthLanguage(s.text) }))
    .filter((x) => !x.v.valid);
  run.checks.push({
    check: "no-grading-language",
    pass: badText.length === 0,
    detail: badText.length === 0
      ? "no blocked term in anything shown"
      : badText.map((x) => `"${x.v.matchedTerm}" in ${x.s.stage} ${x.s.id}`).join("; "),
  });

  run.checks.push({
    check: "unscripted-questions",
    pass: run.unscripted.length === 0,
    detail: run.unscripted.length === 0
      ? "every question asked was one this person could answer from the script"
      : `asked questions the script did not anticipate: ${run.unscripted.join(", ")}`,
  });

  return run;
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

function renderReport(runs: StoryRun[], offline: boolean): string {
  const lines: string[] = [];
  const failed = runs.flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => ({ r, c })));
  lines.push(`# Story review report`);
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()}${offline ? " -- OFFLINE (fake model calls; plumbing only, results meaningless)" : ""}.`);
  lines.push(`Stories: ${runs.length}. Checks failed: ${failed.length}.`);
  lines.push("");
  lines.push("| Story | Route | Safety | Claim type | Questions | Depth | Review items | Failed checks |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const r of runs) {
    const bad = r.checks.filter((c) => !c.pass).map((c) => c.check);
    lines.push(
      `| ${r.id} | ${r.courtPath} | ${r.safety}${r.halted ? " (stopped)" : ""} | ${r.claimTypeMatched || (r.claimTypeSuggested ? `${r.claimTypeSuggested} (suggested)` : "-")} | ${r.askedIds.length} (+${r.proposals.length} offered) | ${r.depthAsked.length} | ${r.review?.findings.length ?? "-"} | ${r.error ? "RUN ERROR" : bad.join(", ") || "none"} |`,
    );
  }
  lines.push("");
  if (failed.length > 0) {
    lines.push("## Failed checks");
    lines.push("");
    for (const { r, c } of failed) lines.push(`- **${r.id}** -- ${c.check}: ${c.detail}`);
    lines.push("");
  }
  lines.push("## Each story, as the user saw it");
  for (const r of runs) {
    lines.push("");
    lines.push(`### ${r.id}`);
    lines.push("");
    lines.push(`_${r.note}_`);
    lines.push("");
    lines.push(`> ${r.story}`);
    lines.push("");
    if (r.error) lines.push(`**Run error:** ${r.error}`, "");
    for (const s of r.shown) lines.push(`- [${s.stage}] \`${s.id}\` ${s.text}`);
    if (Object.keys(r.finalFacts).length > 0) {
      const brief = Object.entries(r.finalFacts)
        .filter(([, v]) => typeof v !== "string" || v.length <= 60)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(", ");
      lines.push("", `Facts recorded: ${brief}`);
    }
    lines.push("");
    for (const c of r.checks) lines.push(`- ${c.pass ? "PASS" : "**FAIL**"} ${c.check}: ${c.detail}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const offline = process.argv.includes("--offline");
  const only = process.argv.find((a: string) => a.startsWith("--only="))?.slice("--only=".length);
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!offline && !apiKey) {
    console.error("OPENAI_API_KEY not set. Use --offline to check the plumbing without model calls.");
    process.exitCode = 1;
    return;
  }

  const stories = STORIES.filter((s) => !only || s.id === only);
  // Three stories at a time: each story's own turns stay strictly in order,
  // and the report keeps the story order whatever finishes first.
  const runs: StoryRun[] = new Array(stories.length);
  let next = 0;
  async function worker() {
    while (next < stories.length) {
      const index = next;
      next += 1;
      runs[index] = await runSafely(stories[index]);
    }
  }
  await Promise.all(Array.from({ length: offline ? 1 : CONCURRENCY }, () => worker()));

  async function runSafely(story: ReviewStory): Promise<StoryRun> {
    try {
      const run = await runOne(story, apiKey, offline);
      const bad = run.checks.filter((c) => !c.pass).length;
      console.log(`${story.id} ... ${bad === 0 ? "ok" : `${bad} failed`}`);
      return run;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${story.id} ... RUN ERROR: ${message}`);
      return {
        id: story.id, area: story.area, side: story.side, note: story.note, story: story.story,
        courtPath: "", courtPathSource: "", safety: "", halted: false, legalAdviceNotice: false, claimTypeMatched: null,
        claimTypeSuggested: null, claimTypeUsed: null, proposals: [], askedIds: [], unscripted: [],
        depthAsked: [], review: null, shown: [], finalFacts: {}, checks: [{ check: "ran", pass: false, detail: message }], error: message,
      };
    }
  }

  const suffix = offline ? ".offline" : "";
  fs.writeFileSync(path.join(OUT_DIR, `REPORT${suffix}.md`), renderReport(runs, offline));
  fs.writeFileSync(path.join(OUT_DIR, `results${suffix}.json`), JSON.stringify(runs, null, 2));
  const failedChecks = runs.reduce((n, r) => n + r.checks.filter((c) => !c.pass).length, 0);
  console.log(`\nStory review: ${runs.length} stories, ${failedChecks} failed checks. Report: scripts/verification/storyReview/REPORT${suffix}.md`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
