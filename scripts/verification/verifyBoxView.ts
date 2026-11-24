/**
 * WHAT A FORM BOX SHOWS, IN EVERY FACT STATE (site owner, 24 Nov 2026: "ONE pure function, boxView(factState, ownAnswer), in
 * the shared asker code. Every form box uses it, and no screen decides this on its own").
 *
 * The table it holds (caseFile/boxView.ts):
 *   not asked yet      an empty box, no offer;
 *   found in the story the box, still empty and typeable, "From your story: X" above it with Yes / No, that's not right /
 *                      I'm not sure; the story's value is never typed into the box for the person;
 *   answered anywhere  the SAME box, pre-filled with that answer, still typeable, with Change; never empty, never text;
 *   not sure           the box, plus "Not sure yet (not asked again)";
 *   removed            the same, and it stays removed (never filled again).
 * In every state the box exists. What the person typed in the box is theirs: never replaced, never hidden.
 *
 * WHAT FAILURE THIS CATCHES: a box hidden in some state (the run of 7311d340: 30 tests could not type into the amount box
 * hidden behind its offer), an answered fact shown as an empty box (the carry runs: the other party held, the box empty),
 * or the story's value typed into a box for the person.
 *
 * Run: npm run test:box-view
 */
import fs from "node:fs";
import { boxView, type BoxFact } from "../../src/lib/case-system/caseFile/boxView";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const show = (value: unknown) => JSON.stringify(value);

const STATES: Record<string, BoxFact> = {
  "not asked yet": { state: "ask" },
  "found in the story": { state: "offer", value: "$5,000", quote: "I paid $5,000." },
  "answered anywhere": { state: "answered", words: "$5,468.45" },
  "not sure": { state: "unsure" },
  removed: { state: "removed" },
};

// 1. The box exists in every state, empty or typed.
for (const [name, fact] of Object.entries(STATES)) {
  for (const own of ["", "What I typed"]) check(`1. ${name}, box ${own ? "typed in" : "empty"}: the box is shown and typeable`, boxView(fact, own).box === true, show(boxView(fact, own)));
}

// 2. Each row of the table, with the box empty.
const ask = boxView(STATES["not asked yet"], "");
check("2. not asked yet: an empty box, no offer, no note, no Change", ask.fill === null && ask.offer === null && ask.note === null && ask.change === false, show(ask));
const offer = boxView(STATES["found in the story"], "");
check("2. found in the story: the box stays empty (the story's value is never typed in for the person)", offer.fill === null, show(offer));
check("2. found in the story: \"From your story\" with its value and quote, and the three choices", offer.offer?.value === "$5,000" && offer.offer.quote === "I paid $5,000." && offer.offer.choices.join("|") === "yes|no|unsure", show(offer));
const answered = boxView(STATES["answered anywhere"], "");
check("2. answered anywhere: the same box, pre-filled with the answer, with Change", answered.fill === "$5,468.45" && answered.change === true && answered.offer === null && answered.note === null, show(answered));
const unsure = boxView(STATES["not sure"], "");
check("2. not sure: the box, plus \"Not sure yet (not asked again)\"", unsure.note === "Not sure yet (not asked again)" && unsure.fill === null && unsure.offer === null, show(unsure));
const removed = boxView(STATES.removed, "");
check("2. removed: the same note, never filled again, no offer", removed.note === "Not sure yet (not asked again)" && removed.fill === null && removed.offer === null, show(removed));

// 3. What the person typed in the box is theirs, in every state.
for (const [name, fact] of Object.entries(STATES)) {
  const view = boxView(fact, "What I typed");
  check(`3. ${name}, typed in: nothing replaces it (no fill) and no offer over it`, view.fill === null && view.offer === null, show(view));
}
check("3. answered elsewhere and typed here: Change stays (the answer is held)", boxView(STATES["answered anywhere"], "What I typed").change === true);

// 4. Pure: the same input gives the same answer, and the input is not changed.
const frozen = Object.freeze({ state: "offer", value: "x", quote: "y" }) as BoxFact;
check("4. pure: the same view each time, the fact not changed", show(boxView(frozen, "")) === show(boxView(frozen, "")));

// 5. Every Small Claims form box goes through it (AskedField reads boxView; no screen decides on its own).
const asked = fs.readFileSync("app/_components/AskedField.tsx", "utf8");
check("5. the form's box component decides through boxView", /boxView\(/.test(asked) && /from "[^"]*caseFile\/boxView"/.test(asked));
check("5. the box component never returns without its box (no early return of nothing, no text in its place)", !/return null;/.test(asked.slice(asked.indexOf("export function AskedField"), asked.indexOf("export function useBoxesFollow"))));

// 6. EVERY typed box of the Small Claims form is wrapped in its own AskedField, or is on the exempt list with its reason
// (site owner, 24 Nov 2026: four boxes -- paymentHistory, defenceResponse, settlementEfforts, deadlineDetails -- were not,
// and a new unwrapped box must fail the build). A box is a textarea, input or select whose data-testid is "sc-intake-<field>".
export const EXEMPT_FORM_BOXES: Readonly<Record<string, string>> = {
  // No box is exempt today. A box that holds no fact (a free note) goes here, with why.
};
export function unwrappedFormBoxes(source: string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  const token = /<AskedField\s+field="([A-Za-z]+)"|<\/AskedField>|<(textarea|input|select)\b[^>]*?data-testid="sc-intake-([A-Za-z]+)"/g;
  for (let m = token.exec(source); m; m = token.exec(source)) {
    if (m[1]) open.push(m[1]);
    else if (m[0] === "</AskedField>") open.pop();
    else if (open[open.length - 1] !== m[3] && !(m[3] in EXEMPT_FORM_BOXES)) out.push(m[3]);
  }
  return out;
}
const form = fs.readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8");
const unwrapped = unwrappedFormBoxes(form);
check("6. every Small Claims form box is in its own AskedField (boxView), or exempt with a reason", unwrapped.length === 0, `not wrapped: ${unwrapped.join(", ")}`);
check("6. the scan finds the form's boxes (it read at least 12)", (form.match(/data-testid="sc-intake-[A-Za-z]+"/g) ?? []).length >= 12);
check("6. self-test: a planted box outside any AskedField is found", unwrappedFormBoxes(`<AskedField field="goal"><textarea data-testid="sc-intake-goal" /></AskedField><textarea data-testid="sc-intake-planted" />`).join() === "planted");
check("6. self-test: a box inside ANOTHER box's AskedField is found", unwrappedFormBoxes(`<AskedField field="goal"><textarea data-testid="sc-intake-other" /></AskedField>`).join() === "other");

console.log(failures ? `\n${failures} check(s) failed.` : "\nEvery form box: one table, one function, the box in every state.");
process.exit(failures ? 1 : 0);
