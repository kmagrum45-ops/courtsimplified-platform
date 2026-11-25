/**
 * AFTER CONFIRM, CHANGING A CONFIRMED FACT CANCELS THE CONFIRMATION, WHICHEVER BOX IT IS TYPED IN (Chrome check of
 * #544 on a8c8cf57, 7 Nov 2026, step 6 against step 16).
 *
 * Chrome, Small Claims: the amount was answered in the chat ($6,400) and confirmed. Typed as $7,250 in the whole form,
 * the case page said "nothing needs to be confirmed again"; a later change in the same box (step 16) asked to confirm
 * again. Cause: the rule after Confirm (intakeReview.ts confirmedAnswerChanged) compared each BOX with its value at
 * Confirm. The whole form's amount box was empty then (the amount lived in the chat's answer), so a value typed there
 * counted as a new answer, and its numbered record was skipped because the box said the same (repeatsAnswer).
 *
 * The property checked, through the real functions on each court: a fact the person had answered when they confirmed
 * (the case file's value, from any place), changed or removed afterwards through any box, cancels the confirmation;
 * a fact with no answer at Confirm getting its first value keeps it (an added answer), and so does the same amount
 * typed in another format. Small Claims: the chat's answer typed over in the whole form (step 6) and the whole form's
 * own box changed (step 16). Civil and Family: an answer given on the home page ("Here is what we understood") typed
 * over in the form's empty box, the same shape.
 *
 * WHAT FAILURE THIS CATCHES: a confirmed answer replaced after Confirm while the case says nothing needs confirming.
 *
 * Run: npm run test:confirmed-fact-change
 */
import { writeAnswer, writeFormBox, type CaseWriteRecovery } from "../../app/_components/caseWrite";
import { CASE_FILE_SECTION, caseFileOf, changesOf, followAnswer } from "../../src/lib/case-system/caseFile/caseFile";
import { applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";
import { afterSend, pendingWrites } from "../../src/lib/case-system/caseFile/pendingFacts";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { confirmedAnswerChanged, confirmedFactMarks } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Court = "small-claims" | "civil" | "family";
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000547";
const STORY = "Synthetic: I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid.";

/** A tab: IntakeRecovery's put as far as the record goes, and the 400 ms save to the real server numbering. */
function tab(court: Court, start: Sections = {}) {
  let checkpoint = { version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: STORY }, ...start } } as unknown as Checkpoint;
  let master: Record<string, unknown> = { intakeCheckpoint: checkpoint };
  const t: CaseWriteRecovery & { send(): void; checkpoint(): Checkpoint } = {
    read: (section, key) => checkpoint.sections[section]?.[key],
    put: (section, key, value, touched = true) => {
      const encoded: unknown = JSON.parse(JSON.stringify(value));
      const before = checkpoint.sections as Sections;
      let sections: Sections = { ...before, [section]: { ...before[section], [key]: encoded } };
      const followed = touched && section !== CASE_FILE_SECTION ? followAnswer(before, section, key, before[section]?.[key], encoded, new Date(), caseFileOf(checkpoint, master)) : null;
      if (followed) sections = { ...sections, [CASE_FILE_SECTION]: { ...sections[CASE_FILE_SECTION], changes: followed } };
      checkpoint = { ...checkpoint, sections } as Checkpoint;
    },
    getReview: () => ({ checkpoint }),
    getSavedMaster: () => master,
    checkpoint: () => checkpoint,
    send: () => {
      const sent = changesOf(checkpoint.sections);
      const writes = pendingWrites(sent);
      master = { ...master, intakeCheckpoint: checkpoint };
      if (!writes.length) return;
      const result = applyFactWrites(master, court, ID, writes, new Date());
      if (!result.ok) throw new Error(`server refused: ${result.reject}`);
      checkpoint = { ...checkpoint, sections: afterSend(checkpoint.sections as Sections, sent, { saved: result.saved, conflicts: result.conflicts, facts: result.facts }) } as Checkpoint;
      master = { ...result.master, intakeCheckpoint: checkpoint };
    },
  };
  return t;
}
const confirm = (t: ReturnType<typeof tab>) => ({ intakeReview: { version: 1, confirmedFacts: confirmedFactMarks(t.checkpoint()) } });
/** Whether the change made by `act` after Confirm cancels the confirmation, as the browser and the server both judge it. */
function cancels(t: ReturnType<typeof tab>, act: () => void): boolean {
  const workflow = confirm(t);
  const before = t.checkpoint();
  act();
  t.send();
  return confirmedAnswerChanged(workflow, before, t.checkpoint());
}

// Small Claims, step 6: the amount answered in the chat, confirmed, then typed over in the whole form's empty box.
{
  const t = tab("small-claims", { builder: { step: "guided" } });
  t.put("guided", "facts", { amountClaimedText: "$6,400" });
  t.put("guided", "earlierAnswers", [{ questionId: "sc-amount-claimed", answerText: "$6,400" }]);
  t.put("guided", "answeredIds", ["sc-amount-claimed"]);
  t.send();
  t.put("builder", "step", "form", false);
  check("Small Claims step 6: the whole form's $7,250 over the chat's confirmed $6,400 cancels the confirmation", cancels(t, () => writeFormBox(t, "small-claims", "amountClaimed", "$7,250")),
    `the amount is now ${String(caseFileOf(t.checkpoint()).amount.value)}`);
  // Step 16: the whole form's own box held the amount when confirmed, then changed.
  check("Small Claims step 16: the whole form's $9,400 over its own confirmed $7,250 cancels the confirmation", cancels(t, () => writeFormBox(t, "small-claims", "amountClaimed", "$9,400")));
  // Controls: the same amount in another format, and a first other party, keep it.
  check("Small Claims: the same amount typed as 9400 keeps the confirmation", !cancels(t, () => writeFormBox(t, "small-claims", "amountClaimed", "9400")));
  check("Small Claims: a first other party (none at Confirm) keeps the confirmation", !cancels(t, () => writeFormBox(t, "small-claims", "otherParty", "Jordan Testwood")));
  check("Small Claims: the amount removed after Confirm cancels the confirmation", cancels(t, () => writeFormBox(t, "small-claims", "amountClaimed", "")) || String(caseFileOf(t.checkpoint()).amount.value ?? "") !== "",
    `(an emptied box may leave the record's answer in place; if so nothing confirmed was removed) amount now ${String(caseFileOf(t.checkpoint()).amount.value ?? "")}`);
}

// Civil and Family: an answer given on the home page, confirmed, then typed over in the form's empty box.
const HOME: Record<Exclude<Court, "small-claims">, { question: string; answer: string; section: string; key: string | null; typed: string; first: [string, string | null, string] }> = {
  civil: { question: "How much are you claiming?", answer: "$20,000", section: "civil", key: "input", typed: "$25,000", first: ["civil", "input", "otherParty"] },
  family: { question: "Who is the other party?", answer: "Sam Synthetic", section: "family", key: null, typed: "Robin Synthetic", first: ["family", null, "childrenInfo"] },
};
for (const court of ["civil", "family"] as const) {
  const shape = HOME[court];
  const t = tab(court, { home: { understoodAnswers: [{ question: shape.question, answer: shape.answer }] } });
  const fact = court === "civil" ? "amountClaimed" : "otherParty";
  const typeIn = (section: string, key: string | null, field: string, value: string) => {
    if (key === null) { t.put(section, field, value); return; }
    const saved = (t.read(section, key) as Record<string, unknown> | undefined) ?? {};
    writeAnswer(t, section, key, { ...saved, [field]: value });
  };
  check(`${court}: the form's ${shape.typed} over the home page's confirmed ${shape.answer} cancels the confirmation`, cancels(t, () => typeIn(shape.section, shape.key, fact, shape.typed)),
    `${fact === "amountClaimed" ? "amount" : "otherParty"} is now ${JSON.stringify(caseFileOf(t.checkpoint())[fact === "amountClaimed" ? "amount" : "otherParty"].value)}`);
  check(`${court}: a first answer in an empty box with no fact at Confirm keeps the confirmation`, !cancels(t, () => typeIn(shape.first[0], shape.first[1], shape.first[2], "Synthetic note")));
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nA confirmed fact changed through any box cancels the confirmation; an added answer keeps it.");
process.exit(failures ? 1 : 0);
