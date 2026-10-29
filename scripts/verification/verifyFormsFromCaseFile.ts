/**
 * What reaches a draft form is the person's own case-file facts, under the
 * right labels, and every fact they gave reaches it (site owner's Chrome
 * re-test, 29 Oct 2026, items A and B).
 *
 * WHAT IT CATCHES:
 *   - the site's own questions, record labels or analysis notes in a draft
 *     ("Q: ...", "Court path:", "Amount was captured...", "This claim appears
 *     to involve...", "No amount entered.");
 *   - the whole story pasted in as a draft's facts;
 *   - a family draft labelled with a Plaintiff, a place named twice;
 *   - a fact the case holds (the person's name, the other side, dates,
 *     evidence, issues, optional details) missing from the draft or from the
 *     form's starting values.
 *
 * Each save is built the way the intake saves it: the Small Claims chat
 * through mapGuidedIntakeToSmallClaimsInput and analyzeSmallClaimsWithBrain
 * with no model (allowExternalCognition: false), Family in FamilyIntake's own
 * payload shape; then the real draft builders (startingDocumentDraft,
 * respondingDocumentDraft) and the real form filler (getCaseValues).
 *
 * Known, unfixed problems are listed in knownProblems29octForms.ts: one there
 * may fail; a NEW failure fails the suite, and a listed one that now passes
 * fails it too until its entry is deleted.
 *
 * COSTS NOTHING: no model, no database, no network.
 * Run: npm run test:forms-from-case-file (needs the synthetic Supabase env for
 * the route module's client; it never connects).
 */
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import type { GuidedIntakeCompletionResult } from "../../app/builder/_components/GuidedSmallClaimsIntake";
import { familyGuidedFields, civilGuidedFields } from "../../app/builder/_components/guidedFields";
import { familyIssuesFromStory } from "../../app/builder/_components/storyAnswers";
import { startingDocumentDraft, type StartingDocumentIntake } from "../../src/lib/case-system/drafts/startingDocumentDraft";
import { respondingDocumentDraft, type RespondingDocumentIntake } from "../../src/lib/case-system/drafts/respondingDocumentDraft";
import { draftAsPlainText, type CaseDraft } from "../../src/lib/case-system/drafts/caseDrafts";
import { storedIntakeValues } from "../../src/lib/case-system/caseRecord";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { KNOWN_PROBLEMS_29OCT_FORMS } from "./knownProblems29octForms";

const NOW = new Date("2026-10-29T12:00:00Z");
const known = new Map(KNOWN_PROBLEMS_29OCT_FORMS.map((entry) => [entry.test, entry]));
const ran = new Set<string>();
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  ran.add(name);
  const entry = known.get(name);
  if (ok && !entry) return console.log(`  ok     ${name}`);
  if (!ok && entry) return console.log(`  known  ${entry.id} ${name}\n         ${detail}`);
  failures += 1;
  if (ok) console.log(`  FAIL   ${name}\n         fixed: delete ${entry!.id} from knownProblems29octForms.ts`);
  else console.log(`  FAIL   ${name}\n         ${detail}`);
}

const section = (draft: CaseDraft | null, heading: RegExp) => draft?.sections.find((part) => heading.test(part.heading))?.text ?? "";
const firstLine = (text: string, pattern: RegExp) => text.split("\n").find((line) => pattern.test(line)) ?? "";

/** A Small Claims chat save, as the builder stores it (handleGuidedComplete -> handleComplete -> intakeData). */
async function smallClaimsChatSave(result: Partial<GuidedIntakeCompletionResult> & { facts: Record<string, unknown> }, city = "Ottawa") {
  const input = mapGuidedIntakeToSmallClaimsInput({ answeredIds: [], matchedClaimType: null, ...result } as GuidedIntakeCompletionResult, { province: "Ontario", city }, result.storyText ?? "");
  const out = await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
  return out.payload as unknown as StartingDocumentIntake & Record<string, unknown>;
}

/** A Family save in FamilyIntake.tsx's own payload shape (buildNarrative labels, extra.story). */
function familySave(values: { story: string; yourRole: string; issues: string[]; yourName?: string; otherParty?: string; timeline?: string; goal?: string; evidence?: string }) {
  const narrative = [
    "Court path: Family",
    `Stage: ${values.yourRole === "respondent" ? "Responding" : "Starting a case"}`,
    values.yourName ? `Your full legal name: ${values.yourName}` : "",
    values.otherParty ? `Other party: ${values.otherParty}` : "",
    `Family issue signals selected by user: ${values.issues.join("; ")}`,
    `Case story: ${values.story}`,
    values.timeline ? `Timeline: ${values.timeline}` : "",
  ].filter(Boolean).join("\n");
  return {
    courtPath: "family", pathLabel: "Family", yourName: values.yourName ?? "", otherParty: values.otherParty ?? "",
    facts: narrative, timeline: values.timeline ?? "", evidence: values.evidence ?? "", goal: values.goal ?? "",
    extra: { story: values.story, yourRole: values.yourRole, issues: values.issues, city: "Ottawa", province: "Ontario" },
  };
}

async function main() {
  // getCaseValues lives in the route module, which builds a Supabase client on import (never used here).
  const { getCaseValues } = await import("../../app/api/generate-form/route");

  // ---- A. Draft forms -------------------------------------------------------------------------
  console.log("A. Draft forms");
  const plaintiffStory = "I did renovation work for Dana Smith in March 2026 and she never paid my invoice of $4,200.";
  const plaintiff = await smallClaimsChatSave({
    storyText: plaintiffStory,
    followUpText: "Answers to follow-up questions about the law that applies:\nQ: Did you have a written contract?\nA: Yes, an email.",
    facts: { role: "plaintiff", disputeCategory: "unpaid-money", amountClaimedText: "$4,200", timelineText: "Invoice sent March 3, 2026." },
  });
  const claim = startingDocumentDraft("small-claims", plaintiff, NOW);
  const claimFacts = section(claim, /^Facts$/);
  check("A1a small-claims chat: the Plaintiff's Claim facts hold none of the site's questions",
    !/\bQ:|Answers to follow-up questions/.test(claimFacts), firstLine(claimFacts, /Q:|follow-up/));

  const NOTES = /Amount was captured|appears to involve|still needs to be entered/;
  const claimText = claim ? draftAsPlainText(claim) : "";
  check("A2a small-claims Plaintiff's Claim holds no analysis notes", !NOTES.test(claimText), firstLine(claimText, NOTES));

  const familyStory = "We married on June 5, 2010 and separated on January 15, 2024. I was served with the application on September 30, 2026. My ex, Mark Jones, wants a divorce and I want child support.";
  const familyAnswer = familySave({ story: familyStory, yourRole: "respondent", issues: ["divorce", "child-support"] });
  const familyApplication = familySave({ story: familyStory, yourRole: "applicant", issues: ["divorce", "child-support"] });
  const civilSave = { courtPath: "civil", facts: "Court path: Civil", extra: { civilInput: { facts: familyStory.replace(/My ex.*$/, "") } } };
  const defenceStory = "Dana Smith is suing me for $4,200. I have pictures of the work when I finished it. The work was done properly.";
  const defendant = await smallClaimsChatSave({ storyText: defenceStory, facts: { role: "defendant", claimFiled: true, defenceFactsText: "I disagree that I owe anything." } });
  const drafts: [string, CaseDraft | null, string][] = [
    ["Small Claims Defence", respondingDocumentDraft("small-claims", defendant as RespondingDocumentIntake, NOW), defenceStory],
    ["Family Answer", respondingDocumentDraft("family", familyAnswer as RespondingDocumentIntake, NOW), familyStory],
    ["Family Application", startingDocumentDraft("family", familyApplication as StartingDocumentIntake, NOW), familyStory],
    ["Statement of Claim", startingDocumentDraft("civil", civilSave as StartingDocumentIntake, NOW), civilSave.extra.civilInput.facts],
  ];
  const pasted = drafts.filter(([, draft, story]) => draft?.sections.some((part) => part.text.includes(story.trim())));
  check("A1b responding and family drafts do not paste the whole story in", pasted.length === 0, `whole story pasted in: ${pasted.map(([name]) => name).join(", ")}`);

  const filled = [
    ["small-claims", getCaseValues({ intakeData: plaintiff }, "small-claims").facts],
    ["family", getCaseValues({ intakeData: familyApplication }, "family").facts],
  ];
  const leaky = filled.filter(([, facts]) => /\bQ:|Court path:|Case story:|Family issue signals/.test(facts));
  check("A1c generate-form facts hold none of the site's questions or record labels", leaky.length === 0,
    leaky.map(([court, facts]) => `${court}: ${firstLine(facts, /Q:|Court path:|Case story:|signals/)}`).join(" | "));

  const noAmount = drafts.filter(([name]) => /Family|Statement/.test(name)).filter(([, draft]) => draft && /No amount entered\./.test(draftAsPlainText(draft)));
  check("A2b family and civil starting drafts hold no 'No amount entered.' note", noAmount.length === 0, `in: ${noAmount.map(([name]) => name).join(", ")}`);

  const familyParties = [section(drafts[1][1], /^Parties$/), section(drafts[2][1], /^Parties$/)].join("\n");
  check("A3a a family draft names no Plaintiff", !/Plaintiff/.test(familyParties), firstLine(familyParties, /Plaintiff/));

  const typedForm = await smallClaimsChatSave({ storyText: plaintiffStory, facts: { role: "plaintiff" } });
  (typedForm.extra as Record<string, unknown>).yourAddress = "12 Bank St, Ottawa ON";
  const address = firstLine(section(startingDocumentDraft("small-claims", typedForm, NOW), /^Parties$/), /^Plaintiff address/);
  check("A3b the plaintiff's address names the city once", (address.match(/Ottawa/g) ?? []).length <= 1, address);

  // ---- B. Details not reaching forms -----------------------------------------------------------
  console.log("B. Details not reaching forms");
  const asksName = {
    family: familyGuidedFields({ issues: [], filed: [] }).some((field) => field.key === "yourName"),
    civil: civilGuidedFields({ issues: [], documents: [] }).some((field) => field.key === "yourName"),
    "small-claims": QUESTION_BANK.some((question) => /yourName|name/i.test(String(question.capturesField ?? ""))),
  };
  check("B1a every area's questions ask the person's own name", Object.values(asksName).every(Boolean),
    `no name question in: ${Object.entries(asksName).filter(([, asked]) => !asked).map(([area]) => area).join(", ")}`);

  const defence = drafts[0][1];
  const defenceParties = section(defence, /^Parties$/);
  check("B1b small-claims chat defence names the plaintiff the story names", /Dana Smith/.test(defenceParties), defenceParties.replace(/\n+/g, " | "));

  const dateWords = ["June 5, 2010", "January 15, 2024", "September 30, 2026"];
  const missingDates = [drafts[1], drafts[2]].map(([name, draft]) => {
    const dates = section(draft, /Dates|timeline/i);
    return [name, dateWords.filter((date) => !dates.includes(date))] as const;
  }).filter(([, missing]) => missing.length);
  check("B2 family drafts carry the dates the story gives", missingDates.length === 0,
    missingDates.map(([name, missing]) => `${name} dates section lacks ${missing.join(", ")}`).join(" | "));

  const checkpoint: Checkpoint = {
    version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000002",
    sections: {
      story: { text: plaintiffStory, location: { province: "Ontario", city: "Ottawa" } },
      home: { understoodAnswers: [{ question: "Who is the other party?", answer: "Dana Smith" }] },
      guided: { earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$4,200" }, { questionId: "sc-orient-when-happened", answerText: "March 3, 2026" }] },
    },
  };
  const file = caseFileOf(checkpoint);
  const starting = storedIntakeValues({ intakeCheckpoint: checkpoint, intakeData: { courtPath: "small-claims", facts: plaintiffStory } });
  const held = { otherParty: file.otherParty.value, amountClaimed: file.amount.value, timeline: file.whenHappened.value };
  // "$4,200" and 4200 are the same amount: compared without the currency sign and separators.
  const plain = (value: unknown) => String(value ?? "").replace(/[$,]/g, "");
  const notCarried = Object.entries(held).filter(([key, value]) => value !== undefined && !plain(starting[key]).includes(plain(value)));
  check("B3 small-claims form starting values carry what the case file holds", notCarried.length === 0,
    `case file holds ${notCarried.map(([key, value]) => `${key}=${value}`).join(", ")}; form starts with ${JSON.stringify(starting)}`);

  const evidence = section(defence, /^Evidence/);
  check("B4 small-claims chat defence evidence carries 'I have pictures'", /picture/i.test(evidence), evidence);

  const issueStories: [string, string][] = [
    ["parenting-time", "He stopped paying child support and I want more time with the kids."],
    ["property-division", "I want a divorce and we need to split the house."],
  ];
  const unoffered = issueStories.filter(([issue, story]) => !(familyIssuesFromStory(story)?.value ?? []).includes(issue));
  check("B5 family issues offered from the story cover each issue it names", unoffered.length === 0,
    unoffered.map(([issue, story]) => `"${story}" offers ${JSON.stringify(familyIssuesFromStory(story)?.value ?? [])}, not ${issue}`).join(" | "));

  const optional = { agreementDetails: "Quote emailed Feb 1.", paymentHistory: "Deposit $500 paid.", defenceResponse: "I dispute the amount.", deadlineDetails: "Hearing Nov 20.", settlementEfforts: "Offered $2,000." };
  const reopened = storedIntakeValues({ intakeData: { courtPath: "small-claims", facts: plaintiffStory, extra: { ...optional } } });
  const dropped = Object.keys(optional).filter((key) => !reopened[key]);
  check("B6 small-claims optional details come back when the case is reopened", dropped.length === 0, `dropped on reopen: ${dropped.join(", ")}`);

  // A property of the list itself: every entry names a check this suite runs.
  for (const entry of KNOWN_PROBLEMS_29OCT_FORMS) {
    if (!ran.has(entry.test)) { failures += 1; console.log(`  FAIL   ${entry.id} names no check this suite runs: "${entry.test}"`); }
  }
  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks pass or are known problems.");
  process.exit(failures ? 1 : 0);
}

void main();
