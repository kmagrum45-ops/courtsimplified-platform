/**
 * THE NEWEST ANSWER WINS, FROM WHATEVER PLACE IT IS GIVEN (founder, 1 Nov: one rule, not an amount-only
 * patch). Two answers to one fact from two places: the later one is the case file's value on every screen.
 *
 * Found by the founder's Chrome check of #536 (round 2, item 1): in the Small Claims review the amount was
 * answered $2,400 (the review's question), then changed to $2,650 in the review's summary box (the guided
 * facts). The case file keeps the first answer it reads (caseFile.ts `give`: a held slot is never
 * overwritten; the review answer is read before the guided facts' box for that question), so the list
 * ("Answered: $2,400.") and the case page ($2,400.00) kept the older amount after a reload.
 *
 * The rule, in its minimal form: an answer the person gives to a fact the case file already holds with a
 * different value is recorded in the change record with the time it was given (caseFile.ts followAnswer,
 * called by the one save path, IntakeRecovery put), and the change record is applied last, in time order.
 * The time is the browser's; the server's sequence number replaces it in G2(b).
 *
 * Checks (properties, any two sources): the later answer wins whichever place gave the first; the same value
 * again records nothing; a first answer records nothing; "not sure" or an emptied box records nothing; and
 * the founder's case (review question, then the review's summary box) ends with $2,650.
 *
 * WHAT FAILURE THIS CATCHES: an older answer from one place outranking a newer one from another, so two
 * screens (or one screen and the case page) show different values for one fact.
 */
import { caseFileOf, followAnswer, CASE_FILE_SECTION, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000401";
const cp = (court: Checkpoint["courtPath"], sections: Sections): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story.", location: { province: "Ontario", city: "Sudbury" } }, ...sections } } as unknown as Checkpoint);
const followAny = followAnswer as unknown as (sections: Sections, section: string, key: string, before: unknown, after: unknown, now?: Date, held?: CaseFile) => Record<string, unknown> | null;

/** One write through the save path's rule: the section's key set to `after`, and the change record it makes. */
function write(court: Checkpoint["courtPath"], sections: Sections, section: string, key: string, after: unknown, now: Date): Sections {
  const before = sections[section]?.[key];
  const held = caseFileOf(cp(court, sections));
  const changes = followAny(sections, section, key, before, after, now, held);
  const next: Sections = { ...sections, [section]: { ...(sections[section] ?? {}), [key]: after } };
  if (changes) next[CASE_FILE_SECTION] = { ...(next[CASE_FILE_SECTION] ?? {}), changes };
  return next;
}
const T1 = new Date("2026-11-01T10:00:00Z");
const T2 = new Date("2026-11-01T10:05:00Z");
const amountOf = (court: Checkpoint["courtPath"], sections: Sections) => caseFileOf(cp(court, sections)).amount.value;

// 1. Two sources, both orders: the later wins.
{
  let s: Sections = {};
  s = write("small-claims", s, "small-claims", "input", { amountClaimed: "$2,400" }, T1);
  s = write("small-claims", s, "builder", "initialAnswers", { "sc-amount-claimed": "$2,650" }, T2);
  check("the form's amount, then a later review answer: the review answer wins", amountOf("small-claims", s) === 2650, JSON.stringify(caseFileOf(cp("small-claims", s)).amount));
}
{
  let s: Sections = {};
  s = write("small-claims", s, "builder", "initialAnswers", { "sc-amount-claimed": "$2,400" }, T1);
  s = write("small-claims", s, "small-claims", "input", { amountClaimed: "$2,650" }, T2);
  check("a review answer, then a later form amount: the form's amount wins", amountOf("small-claims", s) === 2650, JSON.stringify(caseFileOf(cp("small-claims", s)).amount));
}
// The founder's case: the review's question, then the review's summary box (the guided facts).
{
  let s: Sections = { builder: { step: "guided" } };
  s = write("small-claims", s, "builder", "initialAnswers", { "sc-amount-claimed": "$2,400" }, T1);
  s = write("small-claims", s, "guided", "facts", { amountClaimedText: "$2,650" }, T2);
  check("the review's question $2,400, then its summary box $2,650: the case file holds $2,650", amountOf("small-claims", s) === 2650, JSON.stringify(caseFileOf(cp("small-claims", s)).amount));
}
// Another fact, another court: civil's remedy in the form, then the review's question.
{
  let s: Sections = {};
  s = write("civil", s, "civil", "input", { legalRemedy: "Synthetic: the deposit back" }, T1);
  s = write("civil", s, "civil", "input", { legalRemedy: "Synthetic: the machine delivered" }, T2);
  check("civil: the remedy changed in the form: the newest wins", caseFileOf(cp("civil", s)).wants.value === "Synthetic: the machine delivered", JSON.stringify(caseFileOf(cp("civil", s)).wants));
}
{
  // Family: answered on the home page's story reading, then in the form (a later, different answer).
  let s: Sections = { home: { understoodAnswers: [{ question: "What would you like the court to order?", answer: "Synthetic: sell the house" }] } };
  s = write("family", s, "family", "goal", "Synthetic: keep the house", T2);
  check("Family: the home page's answer, then a later form answer: the form's answer wins", caseFileOf(cp("family", s)).wants.value === "Synthetic: keep the house", JSON.stringify(caseFileOf(cp("family", s)).wants));
}

// 2. Nothing recorded where nothing is newer.
{
  const s: Sections = { "small-claims": { input: { amountClaimed: "$2,400" } } };
  const held = caseFileOf(cp("small-claims", s));
  check("the same value again records no change", followAny(s, "builder", "initialAnswers", undefined, { "sc-amount-claimed": "$2,400" }, T2, held) === null);
  check("\"not sure\" records no change", followAny(s, "builder", "initialAnswers", undefined, { "sc-amount-claimed": "not sure" }, T2, held) === null);
  check("an emptied box records no change", followAny(s, "builder", "initialAnswers", { "sc-amount-claimed": "$2,400" }, { "sc-amount-claimed": "" }, T2, held) === null);
  const fresh = caseFileOf(cp("small-claims", {}));
  check("a first answer to a fact nobody gave records no change", followAny({}, "builder", "initialAnswers", undefined, { "sc-amount-claimed": "$2,400" }, T1, fresh) === null);
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("the newest answer wins, from whatever place: every check passed.");
