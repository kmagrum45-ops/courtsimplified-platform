/**
 * A PERSON BEING SUED IS NEVER SHOWN WORDING WRITTEN FOR THE PERSON SUING (role audit, 11 Nov 2026; Chrome's #547 report:
 * the dispute list started "Unpaid money owed to you" for a defendant, and the served date was offered as when it happened).
 *
 * The audit listed every question, label, suggestion and list that assumes the person is suing, and who sees it. The ones
 * fixed without new legal wording (the site's own defendant words already existed) are checked here as properties over
 * every court, so a new label or a new suggestion is covered without editing this:
 *   1. the review's labels, for a served case in each court, contain none of the plaintiff-only phrases below;
 *   2. the review's story suggestion never offers a person being sued a kind worded for the person suing
 *      (PLAINTIFF_WORDED_KINDS); control: a plaintiff's unpaid invoice is still "Unpaid money owed to you";
 *   3. the Small Claims analysis never asks a person being sued "Has the defendant filed a Defence?" (they are the
 *      defendant); control: the plaintiff past service still is.
 * What still needs sourced or reviewed wording (the dispute list's own choices, the default card's rule text, the defences
 * card) is listed for the review chat, not hidden here.
 *
 * WHAT FAILURE THIS CATCHES: plaintiff wording on a defendant's screen.
 *
 * Run: npm run test:side-wording
 */
import { reviewEntries, suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

/** Phrases that only make sense to the person suing (the role audit's table). */
export const PLAINTIFF_ONLY = [/\bdefendant address\b/i, /\byour losses\b/i, /\bthe court to order\b/i, /\bowed to you\b/i, /\byou paid for\b/i, /\bsaid about you\b/i];
const plaintiffOnly = (text: string) => PLAINTIFF_ONLY.filter((pattern) => pattern.test(text)).map(String);

const STORY = "Synthetic: I got served with a Plaintiff's Claim. My old landlord says I owe him $3,000 for an unpaid invoice for repairs. I don't think I owe it. It happened in March 2026.";
const situation = (where: "served" | "starting", court: string) => ({ record: where === "served" ? { where, papers: "not-sure", receivedOn: "2026-10-01", court, courtFrom: "choice", stage: "just-served" } : { where, filed: "nothing", court, courtFrom: "choice" } });
const checkpointOf = (court: "small-claims" | "civil" | "family", where: "served" | "starting", story: string) => {
  const sections: Record<string, Record<string, unknown>> = { situation: situation(where, court), story: { text: story, facts: story } };
  if (court === "small-claims") sections["small-claims"] = { input: { facts: story, amountClaimed: "$3,000", damagesBreakdown: "I dispute all of it", defendantAddress: "12 Main St", goal: "dismiss it", timeline: "March 2026" } };
  if (court === "civil") sections.civil = { input: { facts: story, amountClaimed: "$3,000", legalRemedy: "dismiss it", damagesBreakdown: "none", goal: "dismiss it" } };
  if (court === "family") sections.family = { facts: story, goal: "keep the schedule" };
  return { version: 1, flowId: "x", courtPath: court, revision: "1", sections } as never;
};

async function main() {
  // 1. The review's labels.
  for (const court of ["small-claims", "civil", "family"] as const) {
    const wrong = reviewEntries(checkpointOf(court, "served", STORY)).flatMap((entry) => plaintiffOnly(`${entry.label} ${entry.question ?? ""}`).map((phrase) => `"${entry.label}" (${phrase})`));
    check(`1. ${court}: no review label for a person being sued is worded for the person suing`, wrong.length === 0, wrong.join("; "));
  }

  // 2. The story suggestion of the kind.
  const DEFENDANT_STORIES = [
    STORY,
    "Synthetic: The contractor is suing me because I did not pay his invoice. I was served last week.",
    "Synthetic: I was served with a claim. My neighbour says I posted lies about her online and wants $5,000.",
    "Synthetic: I have been served with a claim. My former customer says I never finished the renovation she paid for.",
  ];
  for (const [index, story] of DEFENDANT_STORIES.entries()) {
    const kind = suggestInitialAnswers(checkpointOf("small-claims", "served", story))["sc-orient-dispute-category"];
    check(`2. defendant story ${index + 1}: no kind worded for the person suing is suggested`, !kind || plaintiffOnly(kind).length === 0, `suggested: ${kind}`);
  }
  const plaintiff = suggestInitialAnswers(checkpointOf("small-claims", "starting", "Synthetic: I sent an invoice for $2,000 for my design work in May 2026 and it is still unpaid."))["sc-orient-dispute-category"];
  check('2. control: a plaintiff\'s unpaid invoice is still suggested "Unpaid money owed to you"', plaintiff === "Unpaid money owed to you", `suggested: ${plaintiff}`);

  // 3. The analysis's "Has the defendant filed a Defence?".
  const { analyzeSmallClaimsWithBrain } = await import("../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine");
  // The Small Claims form's own empty input (SmallClaimsIntake.tsx defaultInput), filled for a case past service.
  const base = {
    caseStage: "not-sure", issues: [], filedDocuments: ["plaintiffs-claim", "affidavit-service"], uploadedEvidenceFiles: [],
    yourName: "", yourAddress: "", yourCity: "Ottawa", yourProvince: "Ontario", yourPostalCode: "", yourPhone: "", yourEmail: "",
    otherParty: "Robin Testhouse", otherPartyPhone: "", otherPartyEmail: "", courtLocation: "", claimNumber: "", amountClaimed: "$3,000",
    defendantAddress: "", agreementDetails: "", paymentHistory: "", damagesBreakdown: "", serviceDetails: "", deadlineDetails: "",
    facts: STORY, timeline: "", evidence: "", missingEvidence: "", settlementEfforts: "", defenceResponse: "", goal: "", urgent: "",
  };
  const asks = async (yourRole: string) => JSON.stringify(await analyzeSmallClaimsWithBrain({ ...base, yourRole } as never, { allowExternalCognition: false } as never)).includes("Has the defendant filed a Defence?");
  check('3. a person being sued is never asked "Has the defendant filed a Defence?"', !(await asks("defendant")));
  check("3. control: the plaintiff past service still is", await asks("plaintiff"));

  console.log(failures ? `\n${failures} check(s) failed.` : "\nA person being sued is never shown wording written for the person suing.");
  process.exit(failures ? 1 : 0);
}
void main();
