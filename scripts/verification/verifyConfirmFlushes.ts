/**
 * EVERY CONFIRM SAVES WHAT IS TYPED FIRST, THROUGH ONE PATH (founder's Chrome check of #541 at 354e36fb, 2 Nov,
 * step 3: "5200" typed into an open "Change: Amount" box, "Confirm my initial information" pressed straight away;
 * the case kept $4,500 and 5200 was lost everywhere).
 *
 * Cause: ChangeAnswer.tsx keeps what is typed in its own state until its "Save" (saveTyped); nothing else could
 * reach it, so a Confirm pressed with the box still open confirmed without it. The rule: a box holding unsent
 * typing registers it (app/_components/openEdits.ts holdOpenEdit), and every Confirm control saves every open
 * edit first through flushOpenEdits: the review's Confirm inside recovery.transition (IntakeRecovery.tsx, action
 * "confirm"), every other one through saveOpenEditsBeforeConfirm. One that needs more first (a day without its
 * year) stops the Confirm with a message, never drops it.
 *
 * Checks:
 *   1. the registry: an open edit is saved by the flush; one that needs more is named and blocks; a closed box is
 *      no longer held; nothing open, nothing saved;
 *   2. the review's Confirm path saves open edits first, and confirms the revision that includes them;
 *   3. ChangeAnswer holds its typing while open and saves it through its own "Save" path;
 *   4. EVERY Confirm control on any screen (a button whose test id ends in "-confirm", or whose words start with
 *      "Confirm" or are "Use this"/"Record this" on a confirm test id) is in CONFIRM_CONTROLS, and each one's
 *      handler goes through the one path; a control listed but no longer found is reported (delete its line).
 *
 * WHAT FAILURE THIS CATCHES: a value typed and confirmed but lost; a new Confirm button that skips the flush.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { blockedMessage, flushOpenEdits, holdOpenEdit, openEditCount, saveOpenEditsBeforeConfirm } from "../../app/_components/openEdits";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const source = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

// 1. The registry.
{
  check("1. nothing open: nothing saved", JSON.stringify(flushOpenEdits()) === JSON.stringify({ saved: [], blocked: [] }) && openEditCount() === 0);
  let amount = "5200";
  let kept = "";
  const release = holdOpenEdit("amount-box", { label: "Amount", flush: () => { if (!amount) return "empty"; kept = amount; amount = ""; return "saved"; } });
  const day = holdOpenEdit("day-box", { label: "Day served", flush: () => "blocked" });
  const first = flushOpenEdits();
  check("1. an open edit is saved by the flush", kept === "5200" && first.saved.includes("Amount"), JSON.stringify(first));
  check("1. one that needs more is named and blocks", first.blocked.includes("Day served") && blockedMessage(first.blocked).includes("Day served"), JSON.stringify(first));
  let said = "";
  check("1. a Confirm outside the review stops and says so while one needs more", saveOpenEditsBeforeConfirm((message) => { said = message; }) === false && /Day served/.test(said), said);
  day();
  check("1. once nothing needs more, the Confirm goes ahead", saveOpenEditsBeforeConfirm(() => {}) === true);
  release();
  check("1. a closed box is no longer held", openEditCount() === 0);
}

// 2. The review's Confirm path.
{
  const recovery = source("app/_components/IntakeRecovery.tsx");
  const transition = recovery.slice(recovery.indexOf("transition: async (action, given) =>"), recovery.indexOf("await flush();", recovery.indexOf("transition: async (action, given) =>")));
  check("2. the review's Confirm saves open edits before its save (recovery.transition)", /action === "confirm" \? flushOpenEdits\(\)/.test(transition) && /blockedMessage\(unsent\.blocked\)/.test(transition), transition.slice(0, 400));
  check("2. it confirms the revision that includes what it saved", /const expectedInput = unsent\.saved\.length && given === before \? inputRevision\(snapshot\) : given;/.test(transition));
}

// 3. ChangeAnswer.
{
  const change = source("app/_components/ChangeAnswer.tsx");
  check("3. ChangeAnswer holds its typing while open", /holdOpenEdit\(editId, \{ label: label \?\? fact, flush: saveUnsent \}\)/.test(change));
  check("3. its own \"Save\" and the flush are one path", /const saveTyped = \(\) => \{ saveUnsent\(\); \};/.test(change));
}

// 4. Every Confirm control, found on the screens.
/** file -> the test id or words that find it, and how its handler goes through the one path. */
const CONFIRM_CONTROLS: { file: string; control: string; how: RegExp }[] = [
  { file: "app/_components/IntakeReviewPanel.tsx", control: "intake-confirm", how: /onClick=\{\(\) => void act\("confirm"\)\}/ },
  { file: "app/builder/_components/StageConfirmation.tsx", control: "stage-confirm", how: /if \(!saveOpenEditsBeforeConfirm\(setUnsaved\)\) return;/ },
  { file: "app/builder/_components/EventCandidateSurface.tsx", control: "event-candidate-confirm", how: /async function confirm\(candidate: ResolvedCandidate\) \{\n\s*\/\/[^\n]*\n\s*if \(!saveOpenEditsBeforeConfirm\(setError\)\) return;/ },
  { file: "app/cases/_components/CaseWorkspace.tsx", control: "Confirm", how: /if \(!saveOpenEditsBeforeConfirm\(setUnsaved\)\) return;\n\s*setUnsaved\(""\);\n\s*void onSave\(document\.id, \{\n\s*userDate: document\.date,/ },
];
function screens(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? screens(path) : path.endsWith(".tsx") ? [path.replace(/\\/g, "/")] : [];
  });
}
const found: { file: string; control: string }[] = [];
for (const file of screens("app")) {
  const lines = source(file).split("\n");
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/data-testid="([a-z-]*-confirm)"/g)) found.push({ file, control: match[1] });
    // A button's own words starting with "Confirm", on its line or the line inside the button.
    if (/<button\b[^>]*>\s*Confirm\b/.test(line) && !/data-testid="[a-z-]*-confirm"/.test(line)) found.push({ file, control: "Confirm" });
    if (/^\s*Confirm\b[^<{]*$/.test(line)) {
      // Inside a button: the nearest tag opened above it is a button.
      const opened = lines.slice(Math.max(0, index - 40), index).reverse().find((before) => /<[A-Za-z]/.test(before)) ?? "";
      const insideButton = /<(button|WorkingButton)\b/.test(opened);
      if (insideButton) found.push({ file, control: "Confirm" });
    }
  });
}
const key = (item: { file: string; control: string }) => `${item.file} :: ${item.control}`;
const listed = new Set(CONFIRM_CONTROLS.map(key));
const unlisted = found.filter((item) => !listed.has(key(item)));
check("4. every Confirm control on a screen is listed (and so checked below)", unlisted.length === 0, unlisted.map(key).join("; "));
const stale = CONFIRM_CONTROLS.filter((item) => !found.some((seen) => key(seen) === key(item)));
check("4. every listed Confirm control is still on its screen (delete a line that is not)", stale.length === 0, stale.map(key).join("; "));
const skipping = CONFIRM_CONTROLS.filter((item) => !item.how.test(source(item.file)));
check("4. each Confirm control saves open edits first, through the one path", skipping.length === 0, skipping.map(key).join("; "));
console.log(`      Confirm controls found: ${found.map(key).join("; ")}`);

console.log(failures ? `\n${failures} check(s) failed.` : "\nConfirm flushes: all checks pass.");
if (failures) process.exit(1);
