/**
 * A FORM BOX FOLLOWS ANOTHER TAB'S NEWER SAVE OF THE SAME BOX; ITS OWN UNSAVED WORDS ARE NEVER OVERWRITTEN
 * (fact-two-tabs.spec.ts, 10 Nov 2026; owner's rule: after a reload the form shows the saved answer).
 *
 * Found by the two-tab test: tab 1 saved the amount 6000 from the Small Claims whole form; tab 2 saved 7000 from the
 * same box ("Save mine"). Reloaded, tab 1 kept 6000: on reload the tab's own stored copy of the form comes first
 * (IntakeRecovery, session checkpoint), and the box-follow rule (caseFile.ts followWords) left a box alone whenever the
 * newest answer came from that same box, taking for granted that the box already held it. Another tab typing in its
 * copy of the same box breaks that.
 *
 * Checks boxesToFollow, the pure function the whole forms of all three courts use (AskedField.tsx useBoxesFollow):
 *   1. the newest saved answer came from this box in another tab, this tab has no unsaved edit: the box follows it;
 *   2. this tab's own edit of the box is waiting (refused as "Not saved yet"): the box keeps the person's words;
 *   3. this tab's own edit of the box is on its way (not yet answered): the box keeps the person's words;
 *   4. the box already says the saved answer: nothing to do;
 *   5. the same for Civil's whole form and a Family box (each its own field).
 *
 * WHAT FAILURE THIS CATCHES: a value that was saved and then replaced by another tab's newer save coming back from the
 * tab's own stored copy; or the follow overwriting what the person typed and has not saved.
 */
import { caseFileOf, CASE_FILE_SECTION, changesOf } from "../../src/lib/case-system/caseFile/caseFile";
import { boxesToFollow } from "../../src/lib/case-system/caseFile/boxFollow";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const at = "2026-11-10T10:00:00.000Z";
const day = (iso: string) => iso;
const checkpoint = (court: string, sections: Record<string, unknown>): Checkpoint =>
  ({ version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: court, revision: "00000000-0000-4000-8000-000000000002", sections }) as unknown as Checkpoint;
const plan = (court: string, section: string, container: string | null, sections: Record<string, unknown>) => {
  const point = checkpoint(court, sections);
  const own = (point.sections as Record<string, Record<string, unknown>>)[section];
  const values = (container ? own[container] : own) as Record<string, unknown>;
  return boxesToFollow(caseFileOf(point), section, container, values, day, new Set(), changesOf(point.sections as Record<string, unknown>));
};
// The saved fact record: the amount saved from the whole form's box by the other tab, numbered 5.
const record = (fact: string, value: unknown, question: string, seq = 5) => ({ [fact]: { state: "answered", value, source: "person", at, seq, question } });

// 1. Tab 1's copy of the box still holds 6000; the newest save (7000) came from the same box in tab 2.
const one = plan("small-claims", "small-claims", "input", {
  "small-claims": { input: { amountClaimed: "6000" } },
  [CASE_FILE_SECTION]: { facts: record("amount", 7000, "small-claims:amountClaimed") },
});
check("1. Small Claims: the box follows the other tab's newer save of the same box", /7,?000/.test(one.amountClaimed ?? ""), JSON.stringify(one));

// 2. This tab's own edit (7000) refused as "Not saved yet" (held: the other tab's 6000, seq 3): the box keeps 7000.
const two = plan("small-claims", "small-claims", "input", {
  "small-claims": { input: { amountClaimed: "7000" } },
  [CASE_FILE_SECTION]: {
    facts: record("amount", 6000, "small-claims:amountClaimed", 3),
    changes: { amount: { state: "answered", value: "7000", at, seq: 1, seen: 1, place: "small-claims:amountClaimed", held: { state: "answered", value: 6000, seq: 3 } } },
  },
});
check("2. the person's own refused edit stays in the box", two.amountClaimed === undefined, JSON.stringify(two));

// 3. This tab's own edit (6500) on its way, made against seq 5: the box keeps 6500.
const three = plan("small-claims", "small-claims", "input", {
  "small-claims": { input: { amountClaimed: "6500" } },
  [CASE_FILE_SECTION]: {
    facts: record("amount", 7000, "small-claims:amountClaimed"),
    changes: { amount: { state: "answered", value: "6500", at, seq: 1, seen: 5, place: "small-claims:amountClaimed" } },
  },
});
check("3. the person's own edit on its way stays in the box", three.amountClaimed === undefined, JSON.stringify(three));

// 4. The box already says the saved answer.
const four = plan("small-claims", "small-claims", "input", {
  "small-claims": { input: { amountClaimed: "7000" } },
  [CASE_FILE_SECTION]: { facts: record("amount", 7000, "small-claims:amountClaimed") },
});
check("4. a box already saying the saved answer is left alone", four.amountClaimed === undefined, JSON.stringify(four));

// 5. Civil's whole form and a Family box, the other party saved from the same box in another tab.
const civil = plan("civil", "civil", "input", {
  civil: { input: { otherParty: "Acme Movers Ltd." } },
  [CASE_FILE_SECTION]: { facts: record("otherParty", "Beta Movers Ltd.", "civil:otherParty") },
});
check("5a. Civil: the box follows the other tab's newer save of the same box", civil.otherParty === "Beta Movers Ltd.", JSON.stringify(civil));
const family = plan("family", "family", null, {
  family: { otherParty: "Pat Testone" },
  [CASE_FILE_SECTION]: { facts: record("otherParty", "Pat Testtwo", "family:otherParty") },
});
check("5b. Family: the box follows the other tab's newer save of the same box", family.otherParty === "Pat Testtwo", JSON.stringify(family));

console.log(failures ? `\n${failures} check(s) failed.` : "\nA form box follows another tab's newer save; the person's own unsaved words stay.");
process.exit(failures ? 1 : 0);
