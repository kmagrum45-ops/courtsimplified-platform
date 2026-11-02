/**
 * AN ANSWER CLEARED IN A BOX STAYS REMOVED, EVEN WHEN THE CHANGE RECORD NEVER HELD IT (founder, 2 Nov;
 * a failing test only: the fix belongs to G2(d), "every fact gets a record; an emptied box is always a removal").
 *
 * The case: a box shows an answer the case file holds from ANOTHER place (the chat, the review's question,
 * the home page's reading, the saved copy), not from the change record; the person clears the box. The removal
 * must stick on every screen. Today (9824623d) caseFile.ts followAnswer records a removal only when the change
 * record holds the fact (the emptied-box branch), so the other place's copy is read again and the answer
 * comes back.
 *
 * Checks (per court where a box can show an answer from another place):
 *   - Small Claims: the review's question answered (builder.initialAnswers), its summary box (guided.facts)
 *     cleared; the chat's answer (guided.earlierAnswers) and the form's box with the same words, the box cleared;
 *     the saved copy (intakeAnswers) and the form's box, the box cleared;
 *   - civil: the home page's reading answered, the form's box with the same words, cleared;
 *   - Family: the same, for what they want.
 * Each: after the box is cleared through the save path's rule (followAnswer), the case file does not hold the
 * fact answered with the cleared value.
 *
 * WHAT FAILURE THIS CATCHES: an answer the person cleared shown again because another place still holds it.
 * Expected to FAIL until G2(d); it is not in the CI list.
 */
import { caseFileOf, followAnswer, CASE_FILE_SECTION, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000601";
const cp = (court: Checkpoint["courtPath"], sections: Sections): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story.", location: { province: "Ontario", city: "Sudbury" } }, ...sections } } as unknown as Checkpoint);
const followAny = followAnswer as unknown as (sections: Sections, section: string, key: string, before: unknown, after: unknown, now?: Date, held?: CaseFile) => Record<string, unknown> | null;
const T = new Date("2026-11-02T10:00:00Z");

/** One write through the save path's rule: the section's key set to `after`, and the change record it makes. */
function write(court: Checkpoint["courtPath"], sections: Sections, section: string, key: string, after: unknown, master?: unknown): Sections {
  const before = sections[section]?.[key];
  const changes = followAny(sections, section, key, before, after, T, caseFileOf(cp(court, sections), master));
  const next: Sections = { ...sections, [section]: { ...(sections[section] ?? {}), [key]: after } };
  if (changes) next[CASE_FILE_SECTION] = { ...(next[CASE_FILE_SECTION] ?? {}), changes };
  return next;
}
const cleared = (court: Checkpoint["courtPath"], sections: Sections, fact: keyof CaseFile, words: RegExp, master?: unknown) => {
  const slot = caseFileOf(cp(court, sections), master)[fact] as { state?: string; value?: unknown };
  return { ok: !(slot.state === "answered" && words.test(String(slot.value ?? ""))), detail: JSON.stringify(slot) };
};

// Small Claims: the review's question answered $2,400, its summary box (drawn from that answer) cleared.
{
  let s: Sections = { builder: { step: "guided", initialAnswers: { "sc-amount-claimed": "$2,400" } } };
  s = write("small-claims", s, "guided", "facts", { amountClaimedText: "$2,400" });
  s = write("small-claims", s, "guided", "facts", { amountClaimedText: "" });
  const r = cleared("small-claims", s, "amount", /2400|2,400/);
  check("Small Claims: the review's answer shown in its summary box, the box cleared: the amount is not held", r.ok, r.detail);
}
// Small Claims: the chat's answer for the other party, the form's box with the same words, the box cleared.
{
  let s: Sections = { guided: { earlierAnswers: [{ questionId: "chat:other-party", answerText: "Jordan Testwood" }] } };
  s = write("small-claims", s, "small-claims", "input", { otherParty: "Jordan Testwood" });
  s = write("small-claims", s, "small-claims", "input", { otherParty: "" });
  const r = cleared("small-claims", s, "otherParty", /Testwood/);
  check("Small Claims: the chat's other party in the form's box, the box cleared: not held", r.ok, r.detail);
}
// Small Claims: the saved copy (a reload), the form's box with the same words, the box cleared.
{
  const master = { intakeAnswers: [{ questionId: "sc-remedy-sought", answerText: "Synthetic: the deposit back" }] };
  let s: Sections = {};
  s = write("small-claims", s, "small-claims", "input", { goal: "Synthetic: the deposit back" }, master);
  s = write("small-claims", s, "small-claims", "input", { goal: "" }, master);
  const r = cleared("small-claims", s, "wants", /deposit back/, master);
  check("Small Claims: the saved copy's goal in the form's box, the box cleared: not held", r.ok, r.detail);
}
// civil and Family: the home page's reading answered, the form's box with the same words, cleared.
for (const [court, section, key] of [["civil", "civil", "input"], ["family", "family", "goal"]] as const) {
  let s: Sections = { home: { understoodAnswers: [{ question: "What would you like the court to order?", answer: "Synthetic: the deposit back" }] } };
  s = court === "civil" ? write(court, s, section, key, { legalRemedy: "Synthetic: the deposit back" }) : write(court, s, section, key, "Synthetic: the deposit back");
  s = court === "civil" ? write(court, s, section, key, { legalRemedy: "" }) : write(court, s, section, key, "");
  const r = cleared(court, s, "wants", /deposit back/);
  check(`${court}: the home page's answer in the form's box, the box cleared: what they want is not held`, r.ok, r.detail);
}
// Control: an answer given once, only in the box, then cleared: not held (passes today; the rule is not broken everywhere).
{
  let s: Sections = {};
  s = write("small-claims", s, "small-claims", "input", { otherParty: "Jordan Testwood" });
  s = write("small-claims", s, "small-claims", "input", { otherParty: "" });
  const r = cleared("small-claims", s, "otherParty", /Testwood/);
  check("control: an answer given once in the box, then cleared: not held", r.ok, r.detail);
}

if (failures) { console.log(`${failures} check(s) failed (expected until G2(d)).`); process.exit(1); }
console.log("an answer cleared in a box stays removed: every check passed.");
