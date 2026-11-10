/**
 * THE LANDLORD AND TENANT BOARD NOTICE COMES FIRST, BEFORE ANY FOLLOW-UP QUESTION, FOR EVERY PERSON AND EVERY COURT
 * (C1, site owner 9 Nov 2026).
 *
 * The report: a tenant whose first message was about mould and repairs was asked follow-up questions, and the notice
 * that the matter goes to the Landlord and Tenant Board came late or not at all. Cause found (9 Nov, read-only): the
 * code rule for tenancies ran only when the AI reading of the story was skipped (guests), so a signed-in person got
 * only the AI's own "tribunal" label, shown BELOW its questions; the builder ran no tribunal check at all.
 *
 * What it checks, offline (no model is called; the AI reading is a stand-in that answers "Small Claims" with three
 * questions):
 *   1. one shared code rule, exclusiveTribunalFor (fixedRegimes.ts), names the LTB for a tenant's mould, a tenant's
 *      repairs and a landlord's eviction, and names nothing for a commercial lease, a landlord's contractor damaging a
 *      car, renting out one's own car, or a deposit dispute with a business landlord;
 *      a residential tenant whose landlord is a company or property manager still gets the LTB (site owner, 10 Nov
 *      2026: only a business renting commercial space is excluded -- shop, warehouse, office, "my company is the
 *      tenant"), and a company renting a warehouse or a shop for a business gets none;
 *   2. a story where the tenancy has ended gets the same LTB notice, marked `ended` (the boundary the legal review
 *      looks at), and a story that names a case already in Small Claims gets none;
 *      a tenancy word alone is not enough: "I rent an apartment and a stranger hit my parked car", a neighbour's dog
 *      bite, a car sold to a cousin who is also the landlord get none (site owner, 10 Nov 2026);
 *   3. the other tribunals on the out-of-scope list go through the same rule (a human rights complaint);
 *   4. the AI reading (understandCase) returns the tribunal with NO follow-up questions on a match, without calling the
 *      model; for an ended tenancy it keeps the reading and carries the notice;
 *   6. the court-path classifier (the home page's check) agrees, offline, for the tenancy-word-alone stories and the
 *      tenancy disputes;
 *   5. every screen shows the one notice component (TribunalNotice) with the forum's own sourced redirectMessage, the
 *      reading card shows it above its questions, and each entry point (home, builder chat, Small Claims chat) runs
 *      the shared rule before its first follow-up question.
 *
 * WHAT FAILURE THIS CATCHES: a person whose matter belongs to a tribunal answering questions first, or a screen that
 * shows the tribunal notice differently, later, or not at all.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import * as fixed from "../../src/lib/case-system/intelligence/fixedRegimes";
import { OUT_OF_SCOPE_FORUMS } from "../../src/lib/case-system/intelligence/outOfScopeForums";
import { understandCase } from "../../src/lib/case-system/understanding/understandCase";
import { classifyCourtPath } from "../../src/lib/case-system/intelligence/courtPathClassifier";

delete process.env.OPENAI_API_KEY;

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

type Found = { forum: { id: string; redirectMessage: string }; ended: boolean } | null;
const rule = (fixed as unknown as { exclusiveTribunalFor?: (story: string) => Found }).exclusiveTribunalFor;
const tribunalOf = (story: string): Found | "missing" => (typeof rule === "function" ? rule(story) : "missing");

export const TRIBUNAL_FIRST_STORIES = {
  "tenant-mould": "I rent an apartment in Ottawa. There has been black mould in the bathroom since March and my landlord will not fix it. My daughter has asthma.",
  "tenant-repairs": "I am a tenant in Sudbury. The heater in my unit has been broken since November and the landlord ignores my repair requests.",
  "landlord-eviction": "I own a duplex in Hamilton and my tenant has not paid rent for three months. I want to evict him.",
  "commercial-lease": "I lease a storefront in a strip mall for my shop. The landlord changed the locks and kept my $8,000 deposit.",
  "contractor-car": "A contractor my landlord hired to fix the roof backed his truck into my parked car and damaged my car. The repair cost is $3,200 and he refuses to pay.",
  "own-car-rented": "I rented out my own car to a coworker for a week. He returned it with a dented door and will not pay for the repair.",
  "business-landlord-deposit": "I paid a $5,000 deposit to a business landlord to lease warehouse space for my company. They kept the deposit when the deal fell through.",
  "tenant-property-manager-mould": "I rent an apartment from a property management company and there is mould",
  "tenant-numbered-company-repairs": "my landlord is a numbered company and will not do repairs",
  "company-warehouse-deposit": "My company rents a warehouse and the landlord kept our deposit",
  "shop-rent-raised": "I rent a shop for my business and the landlord raised the rent",
  "tenancy-ended": "I moved out of my apartment in June 2026 and my landlord kept my $1,500 deposit.",
  "already-in-small-claims": "My former landlord sued me in Small Claims Court for $3,000 of rent.",
  // A tenancy word alone is not a tenancy dispute (site owner, 10 Nov 2026): these name the person's rented home or
  // their landlord, but the dispute has nothing to do with the tenancy.
  "stranger-hit-car": "I rent an apartment and a stranger hit my parked car",
  "neighbour-dog": "I rent an apartment and my neighbour's dog bit me",
  "cousin-car-sale": "I sold my cousin a car and he owes me $2,000 (he is also my landlord)",
  "human-rights": "My employer discriminated against me because of my disability and refused the duty to accommodate.",
} as const;
const S = TRIBUNAL_FIRST_STORIES;

// 1. The shared rule.
check("0. one shared code rule exists: exclusiveTribunalFor in fixedRegimes.ts", typeof rule === "function", `exports: ${Object.keys(fixed).join(", ")}`);
for (const id of ["tenant-mould", "tenant-repairs", "landlord-eviction", "tenant-property-manager-mould", "tenant-numbered-company-repairs"] as const) {
  const found = tribunalOf(S[id]);
  check(`1. ${id}: the LTB, active tenancy`, found !== "missing" && found?.forum.id === "ltb" && found.ended === false, JSON.stringify(found));
}
for (const id of ["commercial-lease", "contractor-car", "own-car-rented", "business-landlord-deposit", "company-warehouse-deposit", "shop-rent-raised", "stranger-hit-car", "neighbour-dog", "cousin-car-sale"] as const) {
  const found = tribunalOf(S[id]);
  check(`1. ${id}: no tribunal`, found === null, JSON.stringify(found));
}
// 2. Ended tenancy and a case already in Small Claims.
{
  const ended = tribunalOf(S["tenancy-ended"]);
  check("2. tenancy ended: the same LTB notice, marked ended (for the legal review)", ended !== "missing" && ended?.forum.id === "ltb" && ended.ended === true, JSON.stringify(ended));
  const already = tribunalOf(S["already-in-small-claims"]);
  check("2. a case already in Small Claims: no tribunal notice", already === null, JSON.stringify(already));
}
// 3. The other tribunals go the same way.
{
  const hr = tribunalOf(S["human-rights"]);
  check("3. a human rights complaint: the HRTO, by the same rule", hr !== "missing" && hr?.forum.id === "hrto", JSON.stringify(hr));
  const found = tribunalOf(S["tenant-mould"]);
  check("3. the notice text is the forum's own sourced redirectMessage", found !== "missing" && found?.forum.redirectMessage === OUT_OF_SCOPE_FORUMS.ltb.redirectMessage);
}

// 4. The AI reading: the rule runs before it.
const readingStandIn = JSON.stringify({
  summary: "You rent an apartment.", facts: [], matters: [{ title: "Your repairs", court: "small-claims", forum: "" }], mainCourt: "small-claims",
  side: "starting", stage: "", questions: [{ question: "When did the mould start?" }, { question: "Have you written to the landlord?" }, { question: "How much have you spent?" }],
  asksForPrediction: false, step: "", points: [],
});
async function readings() {
  let modelCalls = 0;
  const reason = async () => { modelCalls += 1; return readingStandIn; };
  const matched = await understandCase({ story: S["tenant-mould"], chosenCourt: "small-claims" }, { intakeOnly: true, reason });
  const u = matched.status === "understood" ? (matched.understanding as typeof matched.understanding & { tribunal?: { id: string; ended: boolean } | null }) : null;
  check("4. the reading names the LTB for the mould story", u?.tribunal?.id === "ltb", JSON.stringify(u?.tribunal ?? matched.status));
  check("4. and asks NO follow-up question first", u !== null && u.questions.length === 0, `questions: ${JSON.stringify(u?.questions)}`);
  check("4. and the model was not called for it", modelCalls === 0, `model calls: ${modelCalls}`);

  modelCalls = 0;
  const ended = await understandCase({ story: S["tenancy-ended"], chosenCourt: "small-claims" }, { intakeOnly: true, reason });
  const e = ended.status === "understood" ? (ended.understanding as typeof ended.understanding & { tribunal?: { id: string; ended: boolean } | null }) : null;
  check("4. tenancy ended: the reading carries the same LTB notice, marked ended", e?.tribunal?.id === "ltb" && e.tribunal.ended === true, JSON.stringify(e?.tribunal ?? ended.status));
  check("4. tenancy ended: the reading still runs and keeps its questions (a boundary, not a redirect)", modelCalls === 1 && (e?.questions.length ?? 0) > 0, `model calls ${modelCalls}, questions ${e?.questions.length}`);

  const plain = await understandCase({ story: S["own-car-rented"], chosenCourt: "small-claims" }, { intakeOnly: true, reason });
  const p = plain.status === "understood" ? (plain.understanding as typeof plain.understanding & { tribunal?: unknown }) : null;
  check("4. no tribunal: the reading is unchanged (no notice, its questions kept)", p !== null && !p.tribunal && p.questions.length === 3, JSON.stringify({ tribunal: p?.tribunal, questions: p?.questions.length }));
}

// 5. The screens.
const root = path.resolve(__dirname, "../..");
const read = (file: string) => { try { return readFileSync(path.join(root, file), "utf8"); } catch { return ""; } };
function screens() {
  const notice = read("app/_components/TribunalNotice.tsx");
  check("5. one notice component exists: app/_components/TribunalNotice.tsx", notice.length > 0);
  check("5. it shows the forum's own redirectMessage (no other wording of the law)", /redirectMessage/.test(notice));
  check("5. it keeps \"Continue ... anyway\" (a suggestion the person confirms, s. 4)", /anyway/.test(notice));

  const card = read("app/_components/CaseUnderstandingCard.tsx");
  const noticeAt = card.indexOf("<TribunalNotice");
  const questionsAt = card.indexOf('data-testid="case-understanding-questions"');
  check("5. the reading card shows the tribunal notice ABOVE its questions", noticeAt >= 0 && questionsAt >= 0 && noticeAt < questionsAt, `notice at ${noticeAt}, questions at ${questionsAt}`);

  for (const [file, what] of [
    ["app/_components/HomeLocationGate.tsx", "home page, before the AI reading"],
    ["app/builder/_components/GuidedFormChat.tsx", "builder chat (Family, Civil), before the first follow-up question"],
    ["app/builder/_components/GuidedSmallClaimsIntake.tsx", "Small Claims chat, before the first follow-up question"],
  ] as const) {
    const source = read(file);
    check(`5. ${what}: runs the shared rule and shows the one notice`, /exclusiveTribunalFor|useTribunalFirst/.test(source) && /TribunalNotice/.test(source), file);
  }
  const gate = read("app/_components/HomeLocationGate.tsx");
  const ruleAt = gate.search(/useTribunalFirst|exclusiveTribunalFor\(/);
  const continueAt = gate.indexOf("async function continueToIntake");
  const readingAt = gate.indexOf("if (await understandStory(answers))");
  const tribunalInContinue = gate.slice(continueAt, readingAt).search(/tribunal/i);
  check("5. home page: the rule is checked inside Continue BEFORE the AI reading is requested", ruleAt >= 0 && continueAt >= 0 && readingAt > continueAt && tribunalInContinue >= 0, `rule ${ruleAt}, continue ${continueAt}, reading ${readingAt}`);
}

// 6. The court-path classifier (the home page's check) agrees with the shared rule, offline: a tenancy word alone is
// not the LTB, and the tenancy disputes still are.
async function classifierAgrees() {
  for (const id of ["stranger-hit-car", "neighbour-dog", "cousin-car-sale"] as const) {
    const result = await classifyCourtPath({ story: S[id], allowExternalCognition: false });
    check(`6. classifier, ${id}: not sent to the LTB`, result.outOfScopeForum?.id !== "ltb", JSON.stringify({ path: result.primaryPath, forum: result.outOfScopeForum?.id }));
  }
  for (const id of ["tenant-mould", "tenant-repairs", "landlord-eviction", "tenant-property-manager-mould", "tenant-numbered-company-repairs", "tenancy-ended"] as const) {
    const result = await classifyCourtPath({ story: S[id], allowExternalCognition: false });
    check(`6. classifier, ${id}: the LTB`, result.outOfScopeForum?.id === "ltb", JSON.stringify({ path: result.primaryPath, forum: result.outOfScopeForum?.id }));
  }
}

readings()
  .then(classifierAgrees)
  .then(screens)
  .then(() => {
    console.log(failures ? `\n${failures} check(s) failed.` : "\nThe tribunal notice comes first, from one rule, on every screen.");
    process.exit(failures ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
