/**
 * THE WHOLE FORM'S BOXES ARE FILLED FROM, AND SAVED TO, THE CASE RECORD (Chrome check of #544, 6 Nov 2026, F1 root cause).
 *
 * Chrome, Small Claims: the amount was changed five times across the chat, the review, the whole form and "Change".
 * After "Update my next steps" the whole form showed an older amount, and after "Start the questions again from my
 * story" the case showed $9,350, an older answer, while the person's newest was another. Chrome's saved row held 4
 * numbered facts for 5 changes. Two causes, both checked here:
 *   (a) the whole form's start values (caseRecord.ts storedIntakeValues) took the record's answer only when it was
 *       changed with "Change" (changedWords), else the analysis copy (master_result.intakeData), so a newer answer
 *       from the review or the form itself was replaced by the older copy when the form opened again;
 *   (b) a box typed in the whole form was saved as the form's own copy (IntakeRecovery put, caseFile.ts followAnswer),
 *       which numbers an answer only when it overrides an answer from another place: typing over the words the form
 *       was filled with (its own place) was never numbered, so a restart from the story, which sets the form's copy
 *       aside, brought the older answer back.
 *
 * The rule checked: every amount the person types in the whole form or the review, or gives with "Change", is sent
 * through the one writer and numbered by the server (five changes, five numbers), and every screen shows the newest:
 * the whole form's box when it opens (storedIntakeValues), the review's box, the chat's note (answerNow), the overview
 * (recordWords) and the case record (caseFileOf), also after a restart from the story.
 *
 * Replayed on Chrome's data shape through the real functions: the tab is a stand-in for IntakeRecovery's put (the same
 * followAnswer, story tagging and restart), the server is the real applyFactWrites, the send is the real pendingWrites
 * and afterSend, the form's typing is caseWrite.ts writeFormBox (what SmallClaimsIntake calls), the review's box is
 * writeAnswer and "Change" is writeChange. Synthetic data; no screen, no database.
 *
 * WHAT FAILURE THIS CATCHES: a form box filled from an older copy, or a typed answer that never reaches the record.
 *
 * Run: npm run test:whole-form-record
 */
import { writeAnswer, writeChange, writeFormBox, type CaseWriteRecovery } from "../../app/_components/caseWrite";
import { answerNow, CASE_FILE_SECTION, caseFileOf, changesOf, followAnswer, recordWords } from "../../src/lib/case-system/caseFile/caseFile";
import { applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";
import { afterSend, pendingWrites } from "../../src/lib/case-system/caseFile/pendingFacts";
import { storedIntakeValues } from "../../src/lib/case-system/caseRecord";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { reviewBoxState, reviewEntries } from "../../src/lib/case-system/intakeReview";
import { STORY_INPUT_KEYS } from "../../src/lib/case-system/intakeStory";
import { BASIS_SECTION, discardStale, onStoryChange, STORY_TEXT_FIELD, tagAnswers } from "../../src/lib/case-system/storyBasis";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000545";
const STORY = "Synthetic: I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid.";
const STORY_2 = "Synthetic: I hired a deck builder in March 2026 to build a deck at my cottage. They left after two days and kept my deposit.";

/** A tab: IntakeRecovery's put, as far as the record goes (followAnswer, the story tags, a story change). */
function tab() {
  let checkpoint = { version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: {} } as unknown as Checkpoint;
  let master: Record<string, unknown> = {};
  const numbered: number[] = [];
  const recovery: CaseWriteRecovery & { restart(story: string): void; send(): void; analyse(copy: string): void; master(): Record<string, unknown>; checkpoint(): Checkpoint; numbered: number[] } = {
    read: (section, key) => checkpoint.sections[section]?.[key],
    put: (section, key, value, touched = true) => {
      const encoded: unknown = JSON.parse(JSON.stringify(value));
      const before = checkpoint.sections as Sections;
      let sections: Sections = { ...before, [section]: { ...before[section], [key]: encoded } };
      if (`${section}:${key}` === STORY_TEXT_FIELD) sections = onStoryChange(sections, before) as Sections;
      const followed = touched && section !== CASE_FILE_SECTION ? followAnswer(before, section, key, before[section]?.[key], encoded, new Date(), caseFileOf(checkpoint, recovery.master())) : null;
      if (followed) sections = { ...sections, [CASE_FILE_SECTION]: { ...sections[CASE_FILE_SECTION], changes: followed } };
      if (touched) sections[BASIS_SECTION] = tagAnswers(sections, section, key, before[section]?.[key], encoded);
      checkpoint = { ...checkpoint, sections } as Checkpoint;
    },
    getReview: () => ({ checkpoint }),
    getSavedMaster: () => master,
    master: () => master,
    checkpoint: () => checkpoint,
    numbered,
    // The 400 ms save: the change record sent, numbered by the server, the reply taken in.
    send: () => {
      const sent = changesOf(checkpoint.sections);
      const writes = pendingWrites(sent);
      master = { ...master, intakeCheckpoint: checkpoint };
      if (!writes.length) return;
      const result = applyFactWrites(master, "small-claims", ID, writes, new Date());
      if (!result.ok) throw new Error(`server refused: ${result.reject}`);
      for (const saved of result.saved) if (saved.fact === "amount") numbered.push(saved.seq);
      checkpoint = { ...checkpoint, sections: afterSend(checkpoint.sections as Sections, sent, { saved: result.saved, conflicts: result.conflicts, facts: result.facts }) } as Checkpoint;
      master = { ...result.master, intakeCheckpoint: checkpoint };
    },
    // "Show my next step" / "Update my next steps": the analysis saves its copy of the answers (intakeData).
    analyse: (copy) => {
      master = { ...master, intakeCheckpoint: checkpoint, intakeData: { courtPath: "small-claims", userStory: STORY, extra: { amountClaimed: copy } } };
    },
    // "Start the questions again from my story" after the story changed (storyBasis.ts discardStale).
    restart: (story) => {
      recovery.put("story", "text", story);
      checkpoint = discardStale(checkpoint);
      master = { ...master, intakeCheckpoint: checkpoint };
    },
  };
  recovery.put("story", "text", STORY);
  recovery.put("builder", "step", "guided", false);
  return recovery;
}

/** The whole form opening on a saved case: its boxes start from storedIntakeValues (app/builder/page.tsx). */
function openForm(t: ReturnType<typeof tab>): Record<string, unknown> {
  const stored = storedIntakeValues(t.master());
  const input = Object.fromEntries(Object.entries({ ...((t.read("small-claims", "input") as Record<string, unknown>) ?? {}), ...stored }).filter(([key]) => !STORY_INPUT_KEYS.has(key) && key !== "documentStatus"));
  t.put("builder", "step", "form", false);
  t.put("small-claims", "input", input, false);
  return input;
}
const typeInForm = (t: ReturnType<typeof tab>, field: string, value: string) => writeFormBox(t, "small-claims", field, value);

/** The amount every screen shows now. */
function screens(t: ReturnType<typeof tab>) {
  const checkpoint = t.checkpoint();
  const file = caseFileOf(checkpoint, t.master());
  const entry = reviewEntries(checkpoint).find((item) => (item.section === "small-claims" && item.field === "amountClaimed") || (item.section === "guided" && item.field === "amountClaimedText"));
  const review = !entry ? "(no box)" : reviewBoxState(entry, file) === "held" ? String(file.amount.value) : String(entry.value);
  const chat = answerNow(file, "sc-amount-claimed", "$6,400");
  return {
    record: String(file.amount.value ?? ""),
    review,
    chat: chat.changed ? String(chat.value) : "$6,400",
    overview: String(recordWords(file, "amount") ?? ""),
    form: String(storedIntakeValues(t.master()).amountClaimed ?? ""),
  };
}
const shows = (value: string, amount: number) => value.replace(/[$,\s]|\.00$/g, "") === String(amount);
function allShow(label: string, t: ReturnType<typeof tab>, amount: number) {
  const now = screens(t);
  for (const [screen, value] of Object.entries(now)) check(`${label}: ${screen} shows $${amount.toLocaleString("en-CA")}`, shows(value, amount), `shows "${value}"; every screen: ${JSON.stringify(now)}`);
}

// Chrome's sequence.
const t = tab();
// 1. The chat: "$6,400" (the chat's own answer, as GuidedSmallClaimsIntake saves it).
t.put("guided", "facts", { amountClaimedText: "$6,400" });
t.put("guided", "earlierAnswers", [{ questionId: "sc-amount-claimed", answerText: "$6,400" }]);
t.put("guided", "answeredIds", ["sc-amount-claimed"]);
t.send();
// 2. "Show my next step": the analysis keeps its copy, $6,400.
t.analyse("6400");
// 3. The whole form opens and the person types $9,400 over the box (change 1).
openForm(t);
typeInForm(t, "amountClaimed", "$9,400");
t.send();
check("change 1 (whole form, $9,400) is numbered by the server", t.numbered.length === 1, `numbered so far: ${JSON.stringify(t.numbered)}`);
allShow("after the whole form's $9,400", t, 9400);
// 4. The review: $7,250 (change 2).
const reviewEntry = reviewEntries(t.checkpoint()).find((item) => item.section === "small-claims" && item.field === "amountClaimed");
if (reviewEntry) writeAnswer(t, "small-claims", "input", { ...(t.read("small-claims", "input") as Record<string, unknown>), amountClaimed: "$7,250" }, { external: true, fromReview: true, reaffirm: "amountClaimed" });
else writeAnswer(t, "guided", "facts", { ...(t.read("guided", "facts") as Record<string, unknown>), amountClaimedText: "$7,250" }, { external: true, fromReview: true, reaffirm: "amountClaimedText" });
t.send();
// 5. "Update my next steps": the analysis copy is left older ($6,400), and the whole form opens again.
t.analyse("6400");
const reopened = openForm(t);
check("(a) the whole form opens on the record's newest amount ($7,250), never the analysis copy ($6,400)", shows(String(reopened.amountClaimed ?? ""), 7250), `the box opened with "${String(reopened.amountClaimed)}"`);
allShow("after the review's $7,250 and the form reopening", t, 7250);
// 6. The whole form: $9,350 (change 3).
typeInForm(t, "amountClaimed", "$9,350");
t.send();
// 7. "Change": $8,150 (change 4).
writeChange(t, "amount", { state: "answered", value: 8150 });
t.send();
// 8. The whole form: $9,900 (change 5).
typeInForm(t, "amountClaimed", "$9,900");
t.send();
check("(b) five amount changes give five numbered facts", t.numbered.length === 5 && new Set(t.numbered).size === 5, `numbered: ${JSON.stringify(t.numbered)}`);
allShow("after five changes", t, 9900);
// 9. The story is edited and the questions start again from it; then "Update my next steps".
t.restart(STORY_2);
t.analyse("9350");
allShow("after a restart from the story", t, 9900);
const again = openForm(t);
check("after the restart, the whole form opens on $9,900, never an older copy", shows(String(again.amountClaimed ?? ""), 9900), `the box opened with "${String(again.amountClaimed)}"`);

// Chrome's $9,350: the analysis copy holds an older amount, the whole form's newest is typed over the box, and the
// questions start again from the story straight after.
{
  const b = tab();
  b.put("guided", "facts", { amountClaimedText: "$6,400" });
  b.put("guided", "earlierAnswers", [{ questionId: "sc-amount-claimed", answerText: "$6,400" }]);
  b.send();
  b.analyse("9350");
  const opened = openForm(b);
  check("Chrome's shape: the whole form opens on the record's $6,400, never the analysis copy's $9,350", shows(String(opened.amountClaimed ?? ""), 6400), `the box opened with "${String(opened.amountClaimed)}"`);
  typeInForm(b, "amountClaimed", "$9,400");
  b.send();
  b.restart(STORY_2);
  b.analyse("9350");
  allShow("Chrome's shape, after a restart straight after the whole form's $9,400", b, 9400);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe whole form's boxes start from and save to the case record; every screen shows the newest amount.");
process.exit(failures ? 1 : 0);
