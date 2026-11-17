/**
 * THE MILESTONE TEST'S SCREEN FAULTS STAY FIXED (site owner, 16 Nov 2026; Chrome milestone test of #550, rows 4, 11, 12
 * and "anything else wrong": S8's period and its dashboard title).
 *
 * What it checks:
 *   (a) one continue rule: the review's Continue and its "Still needed" line read intakeReview.ts continueNeeds, and every
 *       route's "Continue to your next steps" (the Small Claims chat and form, Civil, Family, the guided form) says the
 *       same line beside itself when pressed (ReviewNeededNotice) and stays pressable (pressing it is what says why, L26);
 *       a new continue button with no notice beside it, or greyed out by the review's needs, fails; continueNeeds names
 *       what is still needed while the review is open, and nothing before it opens;
 *   (b) every save on blur in app/ goes through app/_components/afterPointer.ts, so the click that took the focus is never
 *       lost to the redraw (a new onBlur that does not, fails); the browser side is first-click-after-typing.spec.ts;
 *   (c) the "Before you start" notice says where the agreement is kept, for a guest and for a signed-in person;
 *   (d) a company's own period stays ("Testgoods Ltd."), through every reader that names the other party;
 *   (e) the placeholder a case row is created with ("Unfinished intake") is never shown as its title.
 *
 * What failure it catches: any of the five coming back, or a new screen that does not follow them.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { continueNeeds } from "../../src/lib/case-system/intakeReview";
import { otherPartyFromUnderstanding } from "../../src/lib/case-system/caseFile/understoodOtherParty";
import { otherSideIn } from "../../src/lib/case-system/caseFile/storyFacts";
import { civilGuidedFields } from "../../app/builder/_components/guidedFields";
import { storyNames } from "../../src/lib/security/requestNames";
import { storyPartyOffers } from "../../src/lib/case-system/parties/parties";
import { isGeneratedTitle, caseTitleFromIntake } from "../../src/lib/case-system/caseTitle";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}
function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return ["node_modules", ".next"].includes(entry.name) ? [] : files(rel);
    return /\.tsx$/.test(entry.name) ? [rel] : [];
  });
}
const tsx = files("app");

// (a)
const checkpoint = (sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000002", sections } as unknown as Checkpoint);
const open = checkpoint({ story: { text: "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done." }, location: { province: "Ontario", city: "Ottawa" } });
const revision = (open as unknown as { revision: string }).revision;
const reviewing = { intakeCompleted: false, intakeReview: { version: 1, reviewedRevision: revision } };
check("(a) continueNeeds holds the buttons while the review is open and still needs something", continueNeeds(open, reviewing).length > 0, JSON.stringify(continueNeeds(open, reviewing)));
check("(a) and never before the review opens (the route's continue is what opens it)", continueNeeds(open, { intakeCompleted: false, intakeReview: { version: 1 } }).length === 0);
const panel = read("app/_components/IntakeReviewPanel.tsx");
check("(a) the review's Continue and its \"Still needed\" line read the one rule", /const needs = continueNeeds\(checkpoint, workflowStatus/.test(panel) && /disabled=\{busy \|\| needs\.length > 0\}/.test(panel) && /\{continueNeedsLine\(needs\)\}/.test(panel));
const reviewNotice = read("app/_components/ReviewNeededNotice.tsx");
check("(a) the notice beside every route's continue says the one rule's line, inside the notice a press brings", /const needs = useContinueNeeds\(\);/.test(reviewNotice) && /data-testid="review-needed-beside-button"[\s\S]*\{continueNeedsLine\(needs\)\}[\s\S]*<\/p>/.test(reviewNotice));
// Every button whose words are "Continue to your next steps" has the notice beside it (its own file renders
// ReviewNeededNotice or, for the guided form, every route that shows the guided form does) and is never greyed out by the
// review's needs: the press is what says why (L26; the full local run of 3774a858 caught 7 tests broken by greying out).
const unheld: string[] = [];
const rendersNotice = (file: string) => /<ReviewNeededNotice from=/.test(read(file));
function noticeBeside(file: string): boolean {
  if (rendersNotice(file)) return true;
  const name = path.basename(file, ".tsx");
  const users = tsx.filter((other) => other !== file && new RegExp(`<${name}\\b`).test(read(other)));
  return users.length > 0 && users.every(rendersNotice);
}
let continueButtons = 0;
/** Each <button ...>words</button>: its attributes (read to the ">" outside braces, so "=>" is not the end) and its words. */
function buttons(text: string): { attributes: string; words: string }[] {
  const out: { attributes: string; words: string }[] = [];
  for (const start of text.matchAll(/<(button|WorkingButton)\b/g)) {
    let depth = 0;
    let at = (start.index ?? 0) + start[0].length;
    for (; at < text.length; at++) {
      const c = text[at];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const close = text.indexOf(`</${start[1]}>`, at);
    if (close > at) out.push({ attributes: text.slice((start.index ?? 0) + start[0].length, at), words: text.slice(at + 1, close) });
  }
  return out;
}
for (const file of tsx) {
  for (const button of buttons(read(file))) {
    if (!/Continue to your next steps|doneLabel\}/.test(button.words)) continue;
    continueButtons++;
    // A bare "disabled" is a placeholder button that never continues.
    if (/\sdisabled(?=\s|$)/.test(button.attributes)) continue;
    if (!noticeBeside(file)) unheld.push(`${file}: no notice beside it`);
    if (/disabled=\{[^\n]*(?:continueHeld|useContinueNeeds|continueNeeds)/.test(button.attributes)) unheld.push(`${file}: greyed out by the review's needs`);
  }
}
check(`(a) every route's "Continue to your next steps" says the one rule beside itself when pressed (${continueButtons} found)`, continueButtons >= 6 && unheld.length === 0, unheld.join("\n      "));

// (b)
const blurs: string[] = [];
let blurCount = 0;
for (const file of tsx) {
  for (const match of read(file).matchAll(/onBlur=\{([^\n]{0,40})/g)) {
    blurCount++;
    if (!/^\(\) => afterPointer\(/.test(match[1])) blurs.push(`${file}: onBlur={${match[1]}`);
  }
}
check(`(b) every save on blur waits for the click that took the focus (afterPointer; ${blurCount} found)`, blurCount > 0 && blurs.length === 0, blurs.join("\n      "));
const helper = read("app/_components/afterPointer.ts");
check("(b) the helper runs the waiting saves at the click itself, before the clicked button's handler (capture)", /addEventListener\("click", onClick, true\)/.test(helper) && /addEventListener\("pointerdown", \(\) => \{ pressed = true; \}, true\)/.test(helper));
// The helper run for real, on a stand-in window. A tick box or radio button has already changed when its click is
// delivered; a save run then redraws the page from the record before the box's own change handler, puts the box back and
// the change is lost (full local run of 4d1ae680: 15 story-pack and 2 carry ticks "did not change its state", the
// Defendant's Claim and "Were you married?" answers lost and asked again). So for those the waiting save runs after the
// click; for a button it still runs first, so "Continue" right after typing confirms what was typed.
const standInChecks = (async () => {
  const listeners: Record<string, ((event: { target: unknown }) => void)[]> = {};
  const standIn = { addEventListener: (type: string, listener: (event: { target: unknown }) => void) => { (listeners[type] ??= []).push(listener); } };
  (globalThis as { window?: unknown }).window = standIn;
  const { afterPointer } = await import("../../app/_components/afterPointer");
  const fire = (type: string, target: unknown = null) => { for (const listener of listeners[type] ?? []) listener({ target }); };
  const pressThenClick = async (target: unknown) => {
    const ran: string[] = [];
    fire("pointerdown", target);
    afterPointer(() => ran.push("save"));
    fire("pointerup", target);
    fire("click", target);
    ran.push("clicked element's handler");
    await new Promise((resolve) => setTimeout(resolve, 10));
    return ran.join(" -> ");
  };
  for (const type of ["checkbox", "radio"]) {
    const order = await pressThenClick({ tagName: "INPUT", type });
    check(`(b) a ${type} pressed right after typing: the waiting save runs after the ${type}'s own change, never before it`, order === "clicked element's handler -> save", order);
  }
  const buttonOrder = await pressThenClick({ tagName: "BUTTON", type: "button" });
  check("(b) a button pressed right after typing: the waiting save runs first (Continue confirms what was typed)", buttonOrder === "save -> clicked element's handler", buttonOrder);
  // The save runs, and the page is redrawn, at the release itself, not a task later: Chrome delivered no click for a
  // Continue pressed straight from a box while the page waited unredrawn through the press (full local run of 4d1ae680,
  // story pack root cause 3; it confirmed once the save ran during the press).
  {
    const ran: string[] = [];
    const button = { tagName: "BUTTON", type: "button" };
    fire("pointerdown", button);
    afterPointer(() => ran.push("save"));
    fire("pointerup", button);
    check("(b) a button pressed right after typing: the waiting save has run by the release, before any click", ran.join() === "save", ran.join() || "not yet");
    fire("click", button);
  }
  delete (globalThis as { window?: unknown }).window;
})();
// A save that waits for the click and the clicked button's own change both write the parties record: each is made to the
// record as it is when it runs, never to the copy the screen was drawn with, or the second undoes the first (full local
// run of 3774a858: "A person" and "Add another" lost to the name typed just before). Every whole-record write in app/.
const wholeWrites = tsx.flatMap((file) => [...read(file).matchAll(/writeParties\(recovery, ([^;\n]{0,80})/g)].map((match) => ({ file, arg: match[1] })));
check(`(b) every parties write is made to the record as it is now (${wholeWrites.length} found)`, wholeWrites.length > 0 && wholeWrites.every((write) => /^change\(latest\(\)\)/.test(write.arg)), JSON.stringify(wholeWrites));
const partiesStep = read("app/_components/PartiesStep.tsx");
const fromDrawnCopy = [...partiesStep.matchAll(/save\(\{ \.\.\.record/g)].length;
check("(b) and no change in the Parties step is built from the drawn copy (save({ ...record ...))", fromDrawnCopy === 0 && /save\(\(current\) =>/.test(partiesStep), `${fromDrawnCopy} found`);
// The filled form is made from the saved case: what was just typed is saved before the download is asked for (full local
// run of 3774a858: the parties typed a moment before were missing from the PDF, every box empty).
const filledForm = read("app/_components/FilledForm.tsx");
check("(b) the filled-form download saves what was just typed first", /await recovery\?\.begin\(\);[\s\S]*?fetch\("\/api\/cases\/forms\/filled"/.test(filledForm));
// The empty other party shown before any is saved keeps one id while the step is on screen, in the drawn record and the
// latest one: a new id on every draw remade its entry each time (the browser diagnostic of 16 Nov saw it removed and added
// on every redraw) and a change to it could find no party.
check("(b) the Parties step's placeholder keeps one id while shown, in the drawn and the latest record", /const placeholder = useRef\(newId\(\)\);/.test(partiesStep) && /recordOf\(file\.parties\.list, savedDeclined, placeholderId\)/.test(partiesStep) && /parties\.list, Array\.isArray\(saved\?\.declined\) \? saved!\.declined : \[\], placeholderId\)/.test(partiesStep) && /id: placeholderId \?\? newId\(\)/.test(partiesStep));

// (c)
const notice = read("app/_components/FirstUseAcknowledgement.tsx");
check("(c) the notice says where the agreement is kept: this device for a guest, this device for the account when signed in", /ACKNOWLEDGEMENT_RECORDED_GUEST = "Your agreement is recorded on this device with the date and time\."/.test(notice) && /ACKNOWLEDGEMENT_RECORDED_SIGNED_IN = "Your agreement is recorded on this device for your account, with the date and time\."/.test(notice) && /\{userId \? ACKNOWLEDGEMENT_RECORDED_SIGNED_IN : ACKNOWLEDGEMENT_RECORDED_GUEST\}/.test(notice));
check("(c) it never says the agreement is kept with the account itself (it is kept in this browser: acknowledgement.ts)", !/recorded with your account/.test(notice) && /window\.localStorage/.test(read("src/lib/content-library/acknowledgement.ts")));

// (d)
const S8 = "Synthetic: I sold $85,000 of equipment to Testgoods Ltd. in Ottawa. Payment was due September 30, 2026 and nothing has been paid.";
check("(d) the story reading's other party keeps \"Ltd.\"", otherPartyFromUnderstanding([{ label: "Other party", value: "Testgoods Ltd., the buyer" }], S8) === "Testgoods Ltd.");
check("(d) the story's own reader keeps \"Ltd.\"", otherSideIn(S8)?.value === "Testgoods Ltd.", otherSideIn(S8)?.value);
check("(d) the Parties step's offer keeps \"Inc.\"", storyPartyOffers("Synthetic: I am suing Northern Testroofing Inc., 1 Main St, Ottawa ON K1A 0A1.", { version: 1, list: [], declined: [] }).some((offer) => offer.value === "Northern Testroofing Inc."));
// The Civil chat's "Who is the other side" and the names kept from the model read the business the story names too (full
// local run of 4d1ae680, ask-once civil-milestone-s8: the chat asked cold, its own reader found no one in "I sold ... to
// Testgoods Ltd."), and never a role word the stricter chat reader turns down ("can i sue my landlord?").
const civilOther = civilGuidedFields({ issues: [], documents: [] }).find((field) => field.key === "otherParty");
const civilOffer = (story: string) => civilOther?.fromStory?.({ facts: story })?.value ?? null;
check("(d) S8: the Civil chat offers \"Testgoods Ltd.\" from the story, never asks cold", civilOffer(S8) === "Testgoods Ltd.", String(civilOffer(S8)));
check("(d) and still offers nothing for a question or a bystander (\"can i sue my landlord?\", \"the city sued my neighbour\")", civilOffer("can i sue my landlord?") === null && civilOffer("the city sued my neighbour") === null, `${civilOffer("can i sue my landlord?")} / ${civilOffer("the city sued my neighbour")}`);
check("(d) S8: the company is among the names kept from the model (requestNames storyNames)", storyNames(S8).includes("Testgoods Ltd."), JSON.stringify(storyNames(S8)));
check("(d) no period is added where none was written", otherPartyFromUnderstanding([{ label: "Other party", value: "Testgoods Ltd" }], "Synthetic: I sold equipment to Testgoods Ltd and it never paid.") === "Testgoods Ltd");

// (e)
check("(e) \"Unfinished intake\" is a placeholder, never the title shown", isGeneratedTitle("Unfinished intake") && caseTitleFromIntake("Testgoods Ltd.", "civil") === "Your case with Testgoods Ltd.");

void standInChecks.then(() => {
  console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll screen-fault checks passed.");
  process.exit(failed ? 1 : 0);
});
