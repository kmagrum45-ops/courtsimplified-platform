/**
 * PART 3 — the verified content pipeline. Two passes, and a third gate that is
 * not a model at all.
 *
 * *** THE SHAPE ***
 *
 *   DRAFTER    sees the stage, the quoted rule text, and practical excerpts.
 *              Writes the five parts.
 *
 *   VERIFIER   a SEPARATE call with no sight of the drafter's reasoning, its
 *              prompt, or its explanation. Sees only the sentences and the
 *              source material. For each sentence it must FIND AND QUOTE the
 *              exact passage that supports it, or mark it unsupported.
 *
 *   CODE       takes every quote the verifier returned and looks for it,
 *              verbatim, in the vendored corpus.
 *
 * *** THE THIRD GATE IS THE POINT ***
 *
 * A verifier asked to quote its support can invent a quote. It will look
 * right — the right register, the right rule number, a plausible clause — and
 * a reviewer skimming the record would accept it. So no model's word is taken
 * for whether the support exists. The quote is looked up in the same vendored
 * text the corpus checks run against, whitespace collapsed, and a quote that
 * is not there fails the sentence no matter how confidently it was offered.
 *
 * Two independent models agreeing is not verification. A model agreeing with
 * a file on disk is.
 *
 * *** WHY THE VERIFIER IS NOT SHOWN THE DRAFTER'S REASONING ***
 *
 * Given the drafter's justification, a verifier grades the argument rather
 * than the sentence, and a confident wrong rationale is exactly what it should
 * be catching. It gets the claim and the sources, nothing else — the position
 * a reviewer would be in.
 *
 * *** TWO REDRAFTS, THEN A HUMAN ***
 *
 * An unsupported sentence goes back with the verifier's reason attached. After
 * two failed redrafts the block is marked NEEDS_HUMAN and is not published.
 * Not downgraded, not softened, not published with a caveat. The failure mode
 * this avoids is a pipeline that always produces something.
 *
 * *** NOTHING HERE REACHES `approved` ***
 *
 * `verified-draft` is the ceiling. It means checked against source text by a
 * separate pass and by code. It does not mean a licensee has read it.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { createOpenAIClient } from "../../src/lib/case-system/openaiClient";
import type { CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import { SOURCE_NAMES } from "../../src/lib/case-system/stage-map/citations";
import type { SentenceVerdict } from "../../src/lib/content-library/stageAnswers";
import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_DIR = path.join(ROOT, "docs", "sources", "corpus");

/**
 * Published rates, used only to report what a run cost.
 *
 * If these are stale the TOKEN COUNTS in the report are still exact — correct
 * the rate here and the arithmetic follows. They are stated rather than
 * hidden so nobody has to trust a dollar figure whose origin is invisible.
 */
export const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
};

export type Usage = { model: string; inputTokens: number; outputTokens: number; calls: number };

export function costOf(usage: Usage): number {
  const rate = PRICING[usage.model];
  if (!rate) return 0;
  return (
    (usage.inputTokens / 1_000_000) * rate.inputPerM +
    (usage.outputTokens / 1_000_000) * rate.outputPerM
  );
}

export function addUsage(total: Usage[], entry: Usage): void {
  const existing = total.find((candidate) => candidate.model === entry.model);
  if (existing) {
    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    existing.calls += entry.calls;
  } else {
    total.push({ ...entry });
  }
}

// ---------------------------------------------------------------- the corpus

const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

let corpusCache: Map<string, string> | null = null;

export function corpus(): Map<string, string> {
  if (corpusCache) return corpusCache;
  const loaded = new Map<string, string>();
  for (const file of readdirSync(CORPUS_DIR)) {
    if (file.endsWith(".txt")) {
      loaded.set(file.replace(/\.txt$/, ""), flat(readFileSync(path.join(CORPUS_DIR, file), "utf8")));
    }
  }
  corpusCache = loaded;
  return loaded;
}

/**
 * Is this quote actually in the vendored text? The gate no model can talk past.
 *
 * Searches EVERY source rather than only the one the verifier named, because a
 * verifier that attributes a real passage to the wrong statute has still found
 * real supporting text — that is a citation error to report, not a fabrication.
 * A quote found nowhere is the fabrication.
 */
export function findQuote(quote: string): { sourceId: string } | null {
  const needle = normaliseQuoteEdges(quote);
  // Below about 25 characters a fragment matches by accident. A "quote" that
  // short is not support for anything.
  if (needle.length < 25) return null;
  for (const [sourceId, text] of corpus()) {
    if (text.toLowerCase().includes(needle.toLowerCase())) return { sourceId };
  }
  return null;
}

/**
 * Trims what excerpting does to a quote's EDGES. Never touches its interior.
 *
 * *** WHY THIS LOOSENING EXISTS, AND EXACTLY HOW FAR IT GOES ***
 *
 * The first version compared verbatim, and the adversarial run rejected a
 * genuine quote of r. 3.01. The passage was real and present; the verifier had
 * ended it with a full stop where the source has a semicolon. One character.
 *
 * Strictly, a quote that is not character-for-character is not a quote. But
 * the consequence of enforcing that here is not rigour, it is noise: models
 * terminate an excerpt with a full stop as a matter of habit, so a large
 * share of TRUE sentences would fail the gate and land in NEEDS_HUMAN. A gate
 * that rejects truth and falsehood alike is not a filter, and the reviewer
 * queue it fills is the thing this pipeline exists to keep small.
 *
 * So the edges are normalised and the interior is not:
 *
 *   allowed   surrounding whitespace, quote marks, ellipses; a trailing
 *             . , ; :  ; a difference of case
 *   NOT allowed   any change inside the passage — a different number, a
 *                 different actor, a dropped "not", a swapped form
 *
 * "excluding the first day" -> "excluding the last day" is interior and still
 * fails. That is the distinction the gate is actually for: boundary
 * punctuation is an artefact of excerpting, the words are the claim.
 */
export function normaliseQuoteEdges(quote: string): string {
  return flat(quote)
    .replace(/^["'“”‘’\s.…]+/, "")
    .replace(/["'“”‘’\s]+$/, "")
    .replace(/[.,;:…]+$/, "")
    .trim();
}

/** Splits drafted prose into the sentences the verifier must account for. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[a-z]/i.test(sentence) && sentence.split(/\s+/).length >= 4);
}

// --------------------------------------------------------------- the sources

/**
 * The stage premise: where the case stands, as a given rather than a claim.
 *
 * *** WHY THIS HAD TO BECOME A SOURCE ***
 *
 * The first subset run sent all three blocks to NEEDS_HUMAN, and the reasons
 * were not what I expected. Alongside real gaps, the verifier rejected:
 *
 *   "You have been served with a claim."
 *   "You are the defendant."
 *   "The defendant has not filed a defence."
 *
 * It was right. No rule says the reader was served. Those sentences are the
 * PREMISE of the stage — the position established before the block is shown at
 * all — and I had asked a verifier to check them against rule text, where they
 * were never going to be found. That was my error, not the content's.
 *
 * So the premise is supplied as its own source, clearly labelled as stating no
 * law. It is not model-written: it comes from the stage map, which is authored
 * and whose every citation is verified against the corpus.
 *
 * The obvious risk is that the premise becomes a laundry route — a legal claim
 * smuggled in by calling it context. `assertsRequirement` closes that: a
 * sentence whose only support is the premise may not state a deadline, a form,
 * a number, or an obligation. Those must come from legislation.
 */
export function stagePremise(stage: CaseStage): string {
  return `${stage.description} The reader's question at this point is: ${stage.userQuestion}`;
}

export const PREMISE_SOURCE_ID = "stage-premise";

/**
 * Does this sentence state a legal REQUIREMENT, as opposed to a position?
 *
 * Narrower than `makesAClaim` on purpose. "You have been served" describes
 * where the case stands; "you must file within 20 days" is law. Only the
 * second needs legislation behind it, and only the second is dangerous if the
 * premise is used as cover.
 */
/*
 * Narrowed after the second subset run rejected this:
 *
 *   "The defendant has not filed a defence within the required time."
 *
 * That is a position, not a requirement — it states no period and no form. It
 * was caught because the first version triggered on "within", "file", "days"
 * and "required", words that appear just as often in past-tense statements of
 * where a case stands as in statements of what the law demands.
 *
 * The harm this guards against is specific: a wrong NUMBER, a wrong FORM, or
 * an obligation asserted as absolute. So those are what it looks for. A
 * sentence with no particular in it cannot carry a wrong particular.
 */
const REQUIREMENT_MARKERS = /\b(\d|form\s+\d|must|shall|entitled to)\b/i;

export function assertsRequirement(sentence: string): boolean {
  return REQUIREMENT_MARKERS.test(sentence);
}

/**
 * Does this sentence predict an outcome? Refused even when a source says it.
 *
 * *** WHY "SOURCED" IS NOT A DEFENCE HERE ***
 *
 * A verified block said: "The faster you act, the better your chances of
 * collecting the money owed." Every sentence in it was supported, that one by
 * the court's own after-judgment guide. The verifier passed it correctly — the
 * source really does say it.
 *
 * It still cannot go out. CLAUDE.md §3 is not a rule about accuracy, it is a
 * rule about what this product is: it organises facts and identifies gaps, and
 * it does not judge how a case will go. A sourced prediction is still a
 * prediction, and a user reading "your chances improve" is being given an
 * assessment of their own case by a system that has no business making one.
 *
 * The court may tell people that. We may report that the court recommends
 * acting promptly, and link them to it. We may not adopt the prediction in our
 * own voice.
 *
 * *** WHY THIS IS CODE AND NOT ONLY AN INSTRUCTION ***
 *
 * Every other constraint in this pipeline is enforced twice: a model is told,
 * and then something deterministic checks. This one earns that more than most,
 * because the failure is invisible — a sentence about chances reads as helpful,
 * a reviewer nods at it, and nobody ever reports being quietly told they would
 * probably win.
 */
const OUTCOME_MARKERS = [
  // Odds, in any phrasing.
  /\bchances?\b/i,
  /\bodds\b/i,
  /\blikelihood\b/i,
  /\b(un)?likely\b/i,
  /\bprobabl[ey]\b/i,
  // Winning and losing, including the softened forms.
  /\b(you|your case)\s+(will|would|may|might|could)\s+(win|lose)\b/i,
  /\b(win|lose|losing|winning)\s+(your|the)\s+case\b/i,
  // Grading the case itself.
  /\b(strong|weak|good|poor|solid)\s+(case|claim|defence|position|argument)\b/i,
  // Comparatives that imply a better result.
  /\bbetter\s+(your|the|chances|result|outcome)\b/i,
  /\bimprove[sd]?\s+(your|the)\s+(chances|position|case|odds)\b/i,
  /\bincrease[sd]?\s+(your|the)\s+(chances|odds)\b/i,
  // Predicting what the court will do.
  /\bthe\s+(judge|court)\s+will\s+(likely|probably)\b/i,
  /\bexpect\s+to\s+(win|lose|succeed|recover)\b/i,
];

/**
 * An obligation asserted on the strength of a permissive passage.
 *
 * *** WHY THE PROMPT WAS NOT ENOUGH ***
 *
 * The verifier is told, in as many words, to be strict about "'must' where the
 * source says 'may', or the reverse". It was then handed "You must issue your
 * Defendant's Claim within 20 days after the day your defence is filed" with
 * r. 10.01 (2) in front of it — which says the claim MAY be issued within 20
 * days, and after that, before trial or default judgment, WITH LEAVE OF THE
 * COURT — and marked it supported.
 *
 * So this is code. A quote whose operative verb is permissive cannot support a
 * sentence that asserts an obligation, and that is checkable without judgment.
 *
 * *** WHY ONLY THIS DIRECTION ***
 *
 * Turning "may" into "must" CLOSES A DOOR the rule leaves open. A person
 * reading it on day 25 concludes they have lost a claim they could still bring
 * with leave, and abandons it — a harm nobody ever reports, because they
 * simply go away.
 *
 * The reverse is not checked, because it is usually legitimate. r. 9.01 says a
 * defendant who WISHES to dispute a claim "shall" file a defence; writing
 * "you may file a defence" describes a genuinely conditional obligation
 * correctly. Flagging that would fail true sentences in bulk.
 */
const ASSERTS_OBLIGATION = /\b(must|have to|has to|is required to|are required to)\b/i;

/**
 * The modal that GOVERNS the period, not merely one present in the passage.
 *
 * The first version asked whether the quote contained "may" and no "shall",
 * and it let the real error straight through. r. 10.01 (2) reads:
 *
 *   "The defendant's claim SHALL be in Form 10A and MAY be issued, (a) within
 *    20 days after the day on which the defence is filed; or (b) after the
 *    time described in clause (a) but before trial or default judgment, with
 *    leave of the court."
 *
 * Both modals are there. The "shall" governs the FORM; the "may" governs the
 * issuing, which is the thing the sentence was making mandatory. Presence tells
 * you nothing — proximity does.
 *
 * So: find the period in the quote, walk backwards, and take the LAST modal
 * before it. For r. 10.01 (2) that is "may". For r. 9.01 — "a defendant who
 * wishes to dispute a plaintiff's claim SHALL, within 20 days" — it is "shall",
 * and the control passes.
 */
function governingModal(quote: string, period: string): "may" | "shall" | null {
  const at = quote.toLowerCase().indexOf(period.toLowerCase());
  if (at < 0) return null;

  const before = quote.slice(0, at);
  const modals = [...before.matchAll(/\b(may|shall|must)\b/gi)];
  if (modals.length === 0) return null;

  return /may/i.test(modals[modals.length - 1][1]) ? "may" : "shall";
}

export function modalMismatch(sentence: string, quote: string): boolean {
  if (!ASSERTS_OBLIGATION.test(sentence)) return false;

  const period = /\b(?:within\s+)?(\d{1,3}\s+(?:days?|months?|years?))\b/i.exec(sentence)?.[1];
  if (!period) return false;

  return governingModal(quote, period) === "may";
}

export function predictsOutcome(sentence: string): string | null {
  for (const marker of OUTCOME_MARKERS) {
    const found = marker.exec(sentence);
    if (found) return found[0];
  }
  return null;
}

/**
 * The practical layer — fees, filing, what to bring, what happens after.
 *
 * *** WHY THE FIRST FULL RUN PRODUCED 3 BLOCKS OUT OF 35 ***
 *
 * The pipeline was given legislation and nothing else, and then asked for the
 * things legislation does not contain. The rejections said so plainly: "the
 * source does not mention a demand letter", "the source does not specify what
 * is required to be ready for trial", "whatHappensAfter could not be written
 * from the sources". Those were correct. O. Reg. 258/98 does not say what a
 * filing fee is, whether you can file online, or what to bring to a hearing.
 *
 * The tier-2 guides that DO say those things were vendored in Part 1b and
 * then never wired in. That was my omission, not a limit of the approach.
 *
 * *** WHY A MAP AND NOT A SEARCH ***
 *
 * Handing every guide to every stage would bury the two relevant pages in
 * fifty thousand characters and invite the drafter to pick the wrong one — a
 * defendant told how to issue a claim. The mapping is short, it is obviously
 * wrong when it is wrong, and it is a list that has to be maintained, which
 * CLAUDE.md permits. What it must not do is silently omit: a stage matching
 * nothing gets legislation only, and the run log records that.
 */
const PRACTICAL_FOR_STAGE: Array<{ match: RegExp; sources: string[] }> = [
  {
    match: /^before-filing|claim-drafted|claim-exceeds|limitation/,
    sources: [
      "guide-making-a-claim",
      "ontario-suing-someone-small-claims",
      "ontario-file-small-claims-online",
      "ontario-fee-waiver",
    ],
  },
  {
    // The motions guide is here because the answer for an expired service
    // window is a motion to extend time — r. 8.01 (2) allows the court to
    // extend "before or after the six months has elapsed". Without it the
    // block could not say what to do and was reported as an unsourced gap.
    match: /not-served|service-attempted|service-window/,
    sources: [
      "guide-serving-documents",
      "guide-making-a-claim",
      "guide-motions-and-clerks-orders",
    ],
  },
  {
    match: /defence-period|served-defence|defence-filed|defendants-claim/,
    sources: ["guide-replying-to-a-claim", "scj-how-to-respond"],
  },
  {
    match: /default/,
    sources: ["scj-default-proceedings", "guide-after-judgment"],
  },
  {
    // A plaintiff asking "they filed a defence, what now?" needs the
    // settlement-conference material, not the guide on replying to a claim,
    // which is written for the defendant. That mismatch left the block unable
    // to say what happens next.
    match: /defence-filed/,
    sources: ["guide-getting-ready-for-court", "scj-steps-in-a-case"],
  },
  {
    match: /settlement-conference|awaiting-settlement/,
    sources: ["guide-getting-ready-for-court", "scj-steps-in-a-case"],
  },
  {
    match: /trial|assessment-of-damages/,
    sources: ["guide-getting-ready-for-court", "scj-steps-in-a-case"],
  },
  {
    match: /judgment|enforce/,
    sources: ["guide-after-judgment"],
  },
  {
    match: /dismissed-for-delay|filed-in-wrong-place/,
    sources: ["guide-motions-and-clerks-orders", "scj-steps-in-a-case"],
  },
];

/**
 * *** THE TRUNCATION THAT WAS THROWING AWAY THE ANSWER ***
 *
 * This was 7,000 characters. `guide-getting-ready-for-court` is 45,269 and
 * `guide-after-judgment` is 57,427, so the drafter was seeing 15% and 12% of
 * them — and then being asked what to bring to trial.
 *
 * Measured, not guessed: of 61 mentions of "witness" in the getting-ready
 * guide, ONE fell inside the old budget. Of 20 mentions of "evidence", one.
 *
 * Worse, the part it did see was mostly not the guide. An ontario.ca page
 * begins with "Skip to main content", "Ontario.ca needs JavaScript to function
 * properly", "Log in to continue", "Print all" and a page-navigation list. So
 * a meaningful share of that 7,000 characters was boilerplate, and several
 * blocks that came back "the source does not mention it" were reading a
 * JavaScript warning.
 *
 * *** AND THEN 60,000 WAS WORSE THAN 7,000 ***
 *
 * Passing the guides whole fixed the gap it was meant to fix — sections that
 * could not be sourced fell from four to three. Everything else got worse:
 * reading-level rejections 8 -> 14, filler 5 -> 9, paraphrased quotes 5 -> 8,
 * unsupported claims 20 -> 31. Publishable blocks fell from 18 to 12, and the
 * run cost tripled.
 *
 * Given 60,000 characters the drafter writes MORE and more loosely — lifting
 * guide prose that reads well above grade 8 rather than saying the one thing
 * the section needs. More context is not more accuracy.
 *
 * 18,000 is the compromise, chosen by measuring rather than by taste: at 7,000
 * the getting-ready guide yielded ONE mention of "witness", at 18,000 it
 * yields eight, and at 60,000 the extra material bought nothing the checks
 * could see.
 */
const PRACTICAL_BUDGET = 18_000;

/**
 * Drops the navigation furniture an ontario.ca page carries before its content.
 *
 * Conservative on purpose: it looks for the guide's own "Overview" heading and
 * keeps everything from there. If that marker is not found, NOTHING is
 * dropped — a stripper that silently ate the content it could not recognise
 * would reintroduce exactly the failure this exists to fix.
 */
export function stripPageFurniture(text: string): string {
  const at = text.indexOf("Overview");
  if (at < 0 || at > 3_000) return text;
  return text.slice(at);
}

export function practicalSourcesFor(stageId: string): string[] {
  const matched = PRACTICAL_FOR_STAGE.filter((entry) => entry.match.test(stageId));
  return Array.from(new Set(matched.flatMap((entry) => entry.sources)));
}

/** The source material both passes are given. Quotes only — never summaries. */
export function sourceMaterial(stage: CaseStage): string {
  const seen = new Set<string>();
  const lines: string[] = [
    `[STAGE PREMISE — already established with the reader before this block is shown. ` +
      `It states no law. You may rely on it for WHERE THE CASE STANDS, and never for ` +
      `what the law requires, permits, or when anything is due.]\n${stagePremise(stage)}`,
  ];

  const add = (pinpoint: string, sourceId: string, quote: string) => {
    const key = `${sourceId} ${pinpoint}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(`[${pinpoint} — ${SOURCE_NAMES[sourceId as keyof typeof SOURCE_NAMES]}]\n${quote}`);
  };

  for (const citation of stage.rules) {
    add(citation.pinpoint, citation.sourceId, citation.quote);
  }
  for (const deadline of stage.deadlines) {
    for (const citation of [deadline.rule, deadline.computation, ...deadline.exceptions]) {
      add(citation.pinpoint, citation.sourceId, citation.quote);
    }
  }

  /*
   * The practical pages go in whole rather than as pre-chosen quotes.
   *
   * Legislation is cited to a pinpoint, so quoting it is precise. A guide page
   * is prose, and deciding in advance which paragraph matters would be me
   * choosing the answer and then asking the model to agree with it. The
   * verifier checks whatever is used against the same text, and findQuote
   * searches every vendored source, so nothing escapes the gate either way.
   */
  for (const sourceId of practicalSourcesFor(stage.id)) {
    const text = corpus().get(sourceId);
    if (!text) continue;
    lines.push(
      `[${SOURCE_NAMES[sourceId as keyof typeof SOURCE_NAMES] ?? sourceId} — official court guide. ` +
        `Use for practical detail: fees, filing, timing, what to bring. It is not legislation, ` +
        `so do not state a rule from it.]\n${stripPageFurniture(text).slice(0, PRACTICAL_BUDGET)}`,
    );
  }

  return lines.join("\n\n");
}

// ---------------------------------------------------------------- the passes

const DRAFTER_SYSTEM = `You write procedural information for people representing themselves in the Ontario Small Claims Court.

ABSOLUTE RULES
1. Every factual statement you make must be supported by the SOURCE MATERIAL given to you. If the source material does not say something, you do not say it. Do not add anything from your own knowledge of Ontario procedure, however confident you are.
2. Never tell the reader whether they will win, how strong their position is, what they should argue, or what a judge is likely to do. You give information; the reader applies it.
2a. This holds EVEN WHEN A SOURCE SAYS IT. Court guides sometimes talk about improving your chances. You may report that the guide recommends something and link to it -- "the court's guide recommends starting enforcement promptly" -- but never adopt a prediction about odds, chances, likelihood, winning or losing in your own voice.
3. Never address the reader's specific facts. Write the general position for someone at this stage.
3a. Use Canadian spelling: defence, favour, honour, centre, judgment (not judgement). The document a defendant files is a DEFENCE.
4. Write at a Grade 8 reading level. Short sentences. Ordinary words. Say what a term means the first time you use it.
5. Address the reader as "you". Be direct and calm. Do not reassure, do not alarm, do not apologise.
6. Where a form is mentioned, give BOTH its number and its name.
7. Keep each sentence to one idea. Do not combine what the rule says with where the case stands in a single sentence.
8. Do not write encouragement, exhortation or filler. "Prepare for the conference", "be ready for trial", "review the judgment" and "you may want to consider" say nothing a source can support and nothing a reader can act on. Every sentence must carry a fact from the sources.
9. THE SECTION NAMES ARE ALREADY HEADINGS THE READER SEES. Do not restate them. "Prepare for the settlement conference", "You need to be ready for trial" and "Here is what happens next" say nothing the heading has not already said, and they carry no fact a source can support. Go straight to the specifics: which document, which form number and name, where it is filed, what it costs, what the period is.
10. SHORTER IS BETTER. Three sentences that are each supported by a source beat ten with two rejections among them. Never pad a section to make it look complete. If a source gives you only one fact for a section, write that one fact.
11. If the source material does not let you write one of the sections properly, write the string NOT_SUPPORTED for that section rather than filling it with something plausible. This is a correct answer, not a failure — some things genuinely are not written down.

You reply with JSON only, in this shape:
{"whatsHappening": "...", "whatToDoNext": "...", "yourDeadline": "..." or null, "whatHappensAfter": "..."}`;

const VERIFIER_SYSTEM = `You check whether each sentence is supported by the source material provided.

You are not the author. You have not seen how these sentences were written or why. Judge only the sentence against the sources.

For EACH sentence you must decide:
- supported: true ONLY if the source material actually states this. You must then give "quote": the exact wording from the source material that supports it, copied character for character. If the sentence draws on more than one passage, give "quote" as a LIST of the exact passages. Every passage you list must be copied from the source material. Do not paraphrase the quote. Do not construct a quote. If you cannot copy an exact passage that states this, the sentence is NOT supported.
- supported: false otherwise. Give "reason": what the sentence claims that the sources do not say.

A sentence that predicts an outcome -- chances, odds, likelihood, winning, losing, how strong a case is -- is NOT supported, even if the source material says it. Mark it unsupported and say it is a prediction.

Be strict about these in particular, because they are the errors that cost people their cases:
- a number that differs from the source (days, months, dollar amounts)
- the wrong actor (the clerk does some things, a judge does others, a party does others)
- a form number or name that does not match the source
- "must" where the source says "may", or the reverse
- anything the source is silent about

A sentence that is merely plausible, or that you believe to be true from general knowledge, is NOT supported. Only the source material counts.

Some sentences make no claim about law or procedure at all — for example "This page explains what happens next." Mark those "states": "nothing". Use this ONLY for sentences that say nothing a source could support or contradict. A sentence that mentions a deadline, a number, a form, a court official, or what someone must or may do is making a claim and must be supported or rejected.

You reply with JSON only:
{"verdicts": [{"sentence": "...", "states": "law", "supported": true, "quote": ["...", "..."]} or {"sentence": "...", "states": "law", "supported": false, "reason": "..."} or {"sentence": "...", "states": "nothing"}]}`;

/**
 * Words that mean a sentence IS making a procedural claim.
 *
 * *** WHY THE MODEL DOES NOT GET THE LAST WORD ON THIS ***
 *
 * "states: nothing" is necessary — a block needs an occasional framing
 * sentence, and a verifier that rejects those sends every block to a human,
 * which defeats the pipeline. But it is also the obvious loophole: the easiest
 * way for a verifier to pass a sentence it cannot support is to decide the
 * sentence was not really claiming anything.
 *
 * So the classification is checked by code. A sentence carrying a number, a
 * form, a deadline word, a court actor or a modal obligation is making a
 * claim, whatever the verifier called it, and it must be supported or fail.
 * The model may narrow this set's effect; it cannot widen it.
 */
const CLAIM_MARKERS =
  /\b(\d|form|days?|months?|years?|deadline|within|file|filed|filing|serve|served|service|court|clerk|judge|justice|must|shall|may|required|entitled|rule|section|fee|motion|default|judgment|hearing|conference|trial)\b/i;

/** Does this sentence make a claim a source could support or contradict? */
export function makesAClaim(sentence: string): boolean {
  return CLAIM_MARKERS.test(sentence);
}

type ChatResult = { content: string; usage: Usage };

/*
 * A token-per-minute throttle, because retrying is forbidden here.
 *
 * openaiClient sets maxRetries: 0 deliberately — see its header; retries once
 * tripled the request rate against a daily cap. That is right, and it means a
 * 429 in this pipeline is not a blip, it is a lost stage: the first gpt-4o run
 * dropped two of three stages to "Rate limit reached ... on tokens per min".
 *
 * The practical guides make each call about 7,000 tokens, so a 30,000 TPM
 * ceiling is reached after four. Rather than retry, the pipeline paces itself:
 * it tracks what it has sent in the last minute and waits before it would
 * exceed the budget. Slower, and it finishes.
 */
/*
 * *** THE THROTTLE IS PER MODEL, AFTER APPLYING ONE MODEL'S LIMIT TO ANOTHER ***
 *
 * I added this for gpt-4o's 30,000 TPM ceiling and then applied that budget to
 * every model. gpt-4o-mini's limit is far higher, so a full run that had taken
 * ten minutes spent most of its time asleep — and the throttle became the
 * slowest part of a pipeline it was meant to make reliable.
 *
 * So the budget is looked up by model, and a model with no entry is not
 * throttled at all. An unnecessary throttle is not a safe default: it makes
 * long runs unusable, and unusable checks get skipped.
 */
/*
 * *** THESE ARE THE OBSERVED LIMITS, AND BOTH ARE NEEDED ***
 *
 * gpt-4o-mini was deliberately left out of this table when a call was about
 * 7,000 tokens: its ceiling is high and throttling it made a ten-minute run
 * take hours. Raising PRACTICAL_BUDGET so the guides arrive whole took a call
 * to ~24,000 tokens, and the next full run lost TWENTY of thirty-five stages
 * to "Rate limit reached ... on tokens per min (TPM): Limit 200000".
 *
 * So the earlier decision was right for the traffic at the time and wrong the
 * moment the traffic changed. Both models are paced now, from the limits their
 * own 429s reported, with headroom because the estimate is approximate and a
 * 429 here does not retry — it loses the stage.
 */
const TPM_BY_MODEL: Record<string, number> = {
  "gpt-4o": 28_000,
  "gpt-4o-mini": 170_000,
};

const recentCalls: Array<{ at: number; tokens: number }> = [];

async function throttle(model: string, estimatedTokens: number): Promise<void> {
  const budget = Number(process.env.PIPELINE_TPM ?? TPM_BY_MODEL[model] ?? 0);
  if (budget <= 0) return;

  /*
   * A single call larger than the whole budget can never fit.
   *
   * The first version looped forever in that case and then read
   * `recentCalls[0].at` on an empty array. Waiting cannot help — the call is
   * over the per-minute ceiling on its own — so it goes out after the window
   * has drained and the rate limiter, not this function, decides.
   */
  if (estimatedTokens >= budget) {
    if (recentCalls.length > 0) {
      const drain = Math.max(0, recentCalls[0].at + 60_000 - Date.now());
      if (drain > 0) await new Promise((resolve) => setTimeout(resolve, drain));
      recentCalls.length = 0;
    }
    return;
  }

  for (;;) {
    const cutoff = Date.now() - 60_000;
    while (recentCalls.length > 0 && recentCalls[0].at < cutoff) recentCalls.shift();

    const used = recentCalls.reduce((total, call) => total + call.tokens, 0);
    if (used + estimatedTokens <= budget) return;
    if (recentCalls.length === 0) return;

    const waitFor = Math.min(60_000, Math.max(1_000, recentCalls[0].at + 60_000 - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, waitFor));
  }
}

async function chat(
  model: string,
  system: string,
  user: string,
): Promise<ChatResult> {
  // Roughly four characters per token. Only needs to be close enough to pace.
  const estimated = Math.ceil((system.length + user.length) / 4) + 800;
  await throttle(model, estimated);
  recentCalls.push({ at: Date.now(), tokens: estimated });

  const client = createOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return {
    content: response.choices[0]?.message?.content ?? "{}",
    usage: {
      model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      calls: 1,
    },
  };
}

export type DraftSections = {
  whatsHappening: string;
  whatToDoNext: string;
  yourDeadline: string | null;
  whatHappensAfter: string;
};

export async function draft(
  model: string,
  stage: CaseStage,
  feedback: string[],
): Promise<{ sections: DraftSections; usage: Usage }> {
  const deadlineNote =
    stage.deadlines.length === 0
      ? "This stage carries no deadline of its own. Set yourDeadline to null."
      : `This stage has ${stage.deadlines.length} deadline(s). Say what the period is and what it is counted FROM. Do not compute a date — a date is filled in later by code.`;

  const retry =
    feedback.length === 0
      ? ""
      : `\n\nA previous draft was rejected. Each line below is a sentence that could not be supported, and why. Do not repeat these claims. If a section cannot be written from the sources without them, write NOT_SUPPORTED for that section.\n${feedback.map((line) => `- ${line}`).join("\n")}`;

  const user = `STAGE: ${stage.title}
THE READER'S QUESTION: ${stage.userQuestion}
WHERE THEIR CASE STANDS: ${stage.description}
${deadlineNote}

SOURCE MATERIAL — the only thing you may state:

${sourceMaterial(stage)}${retry}`;

  const result = await chat(model, DRAFTER_SYSTEM, user);
  const parsed = JSON.parse(result.content) as Partial<DraftSections>;

  return {
    sections: {
      whatsHappening: parsed.whatsHappening ?? "NOT_SUPPORTED",
      whatToDoNext: parsed.whatToDoNext ?? "NOT_SUPPORTED",
      yourDeadline: parsed.yourDeadline ?? null,
      whatHappensAfter: parsed.whatHappensAfter ?? "NOT_SUPPORTED",
    },
    usage: result.usage,
  };
}

/**
 * The verifier pass, plus the code gate on its quotes.
 *
 * `sourceText` is passed in rather than derived so the adversarial harness can
 * hand it a known set of provisions and a known-wrong sentence.
 */
export async function verify(
  model: string,
  sourceText: string,
  sentences: string[],
  /** The stage premise, when one was supplied as a source. */
  premise?: string,
): Promise<{ verdicts: SentenceVerdict[]; usage: Usage }> {
  const user = `SOURCE MATERIAL:

${sourceText}

SENTENCES TO CHECK:

${sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n")}`;

  const result = await chat(model, VERIFIER_SYSTEM, user);
  const parsed = JSON.parse(result.content) as { verdicts?: SentenceVerdict[] };
  const returned = parsed.verdicts ?? [];

  const verdicts: SentenceVerdict[] = sentences.map((sentence) => {
    /*
     * Outcome language is refused BEFORE the verifier's verdict is read.
     *
     * Not after, and not as a tie-breaker. If a source says it, the verifier
     * will pass it and quote it accurately — that is the verifier working. The
     * question this answers is not "is it true" but "is it ours to say", and
     * the answer is no regardless.
     */
    const prediction = predictsOutcome(sentence);
    if (prediction) {
      return {
        sentence,
        supported: false,
        reason:
          `this predicts an outcome ("${prediction}"). CourtSimplified does not judge ` +
          `how a case will go, even where a source does. Say what the source recommends ` +
          `and link to it — "the court's guide recommends starting enforcement promptly" ` +
          `— rather than what it will achieve.`,
      };
    }

    const match =
      returned.find((verdict) => verdict.sentence?.trim() === sentence.trim()) ??
      returned.find((verdict) => sentence.includes((verdict.sentence ?? "").slice(0, 40)));

    if (!match) {
      return {
        sentence,
        supported: false,
        reason: "the verifier returned no verdict for this sentence",
      };
    }

    /*
     * "states nothing" — accepted only if code agrees the sentence really
     * makes no claim. See CLAIM_MARKERS for why the model is not trusted here.
     */
    if ((match as { states?: string }).states === "nothing") {
      if (makesAClaim(sentence)) {
        return {
          sentence,
          supported: false,
          reason:
            "the verifier called this a sentence that states nothing, but it makes a " +
            "procedural claim (a number, a form, a deadline, a court actor or an " +
            "obligation) and so must be supported by a source",
        };
      }
      return { sentence, supported: true, quoteFound: false };
    }

    if (!match.supported) {
      return { sentence, supported: false, reason: match.reason ?? "unsupported" };
    }

    /*
     * The code gate. A verifier that says "supported" and hands back a quote
     * that is nowhere in the vendored text has fabricated its support, and
     * that is treated as a harder failure than an honest rejection — it is the
     * one failure a reviewer reading the record would not catch.
     */
    /*
     * A sentence may rest on MORE THAN ONE passage.
     *
     * The subset run produced "The 20 days have passed since the claim was
     * served, and no defence has been filed." That is a compound: r. 9.01
     * supplies the twenty days, the stage premise supplies that they have
     * passed. My first gate allowed a single source and rejected it as a
     * requirement smuggled in on the premise — a false positive on a true
     * sentence, which is the failure mode that fills the reviewer queue.
     *
     * So every passage offered is checked, ALL must be found, and a sentence
     * asserting a requirement must have at least one passage from legislation
     * rather than from the premise alone.
     */
    const offered = (Array.isArray(match.quote) ? match.quote : [match.quote]).filter(
      (quote): quote is string => typeof quote === "string" && quote.length > 0,
    );

    if (offered.length === 0) {
      return {
        sentence,
        supported: false,
        reason: "the verifier called this supported but quoted nothing",
      };
    }

    const inPremise = (quote: string) =>
      Boolean(
        premise &&
          normaliseQuoteEdges(premise)
            .toLowerCase()
            .includes(normaliseQuoteEdges(quote).toLowerCase()),
      );

    const resolved = offered.map((quote) => ({
      quote,
      sourceId: findQuote(quote)?.sourceId ?? (inPremise(quote) ? PREMISE_SOURCE_ID : null),
    }));

    const missing = resolved.filter((entry) => entry.sourceId === null);
    if (missing.length > 0) {
      return {
        sentence,
        supported: false,
        quote: missing[0].quote,
        quoteFound: false,
        reason:
          "the verifier called this supported but the passage it quoted is not in the " +
          "vendored source text",
      };
    }

    /*
     * An obligation resting only on permissive text. See modalMismatch.
     * Checked after the quotes are located, because it needs the quote.
     */
    const permissive = resolved.find(
      (entry) => entry.sourceId !== PREMISE_SOURCE_ID && modalMismatch(sentence, entry.quote),
    );
    if (permissive) {
      return {
        sentence,
        supported: false,
        quote: permissive.quote,
        quoteFound: true,
        reason:
          "this says something must be done, but the passage supporting it says 'may'. " +
          "Turning a permission into an obligation closes a door the rule leaves open — " +
          "write what the rule actually allows, including any later route with leave of " +
          "the court.",
      };
    }

    const fromLaw = resolved.filter((entry) => entry.sourceId !== PREMISE_SOURCE_ID);
    if (assertsRequirement(sentence) && fromLaw.length === 0) {
      return {
        sentence,
        supported: false,
        quote: offered[0],
        quoteFound: true,
        reason:
          "this states a requirement — a deadline, a form, a number or an obligation — " +
          "but its only support is the stage premise, which states no law. It needs a " +
          "legislative source.",
      };
    }

    return {
      sentence,
      supported: true,
      quote: offered.join(" | "),
      sourceId: (fromLaw[0] ?? resolved[0]).sourceId ?? undefined,
      quoteFound: true,
    };
  });

  return { verdicts, usage: result.usage };
}

/** Readability is checked by code, not asked of the model. */
export function readabilityProblem(text: string): string | null {
  const score = readability(text);
  /*
   * Compared at one decimal place, because that is the precision the estimate
   * actually has.
   *
   * A run rejected a draft "at grade 8.0, above the grade 8 target" — it was
   * 8.04. The syllable count is a vowel-group heuristic accurate to a few
   * percent, so treating 8.04 as a failure and 7.99 as a pass is precision the
   * measurement does not possess, and it sends true, readable content to a
   * human reviewer over rounding noise.
   */
  if (Number(score.grade.toFixed(1)) <= TARGET_GRADE) return null;
  return (
    `reads at grade ${score.grade.toFixed(1)}, above the grade ${TARGET_GRADE} target. ` +
    `Longest sentence: "${score.hardestSentences[0]?.text ?? ""}"`
  );
}
