/**
 * THE MILESTONE TEST'S SCREEN FAULTS STAY FIXED (site owner, 16 Nov 2026; Chrome milestone test of #550, rows 4, 11, 12
 * and "anything else wrong": S8's period and its dashboard title).
 *
 * What it checks:
 *   (a) one continue rule: the review's Continue and its "Still needed" line read intakeReview.ts continueNeeds, and every
 *       route's "Continue to your next steps" (the Small Claims chat and form, Civil, Family, the guided form) is held by
 *       it (a new continue button that is not, fails); continueNeeds holds a button while the review still needs something
 *       and never before the review opens;
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
check("(a) the notice beside every route's continue says the same line while held", /const needs = useContinueNeeds\(\);/.test(read("app/_components/ReviewNeededNotice.tsx")) && /\{continueNeedsLine\(needs\)\}/.test(read("app/_components/ReviewNeededNotice.tsx")));
// Every button whose words are "Continue to your next steps" is held by continueHeld (its own disabled, the same element).
const unheld: string[] = [];
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
    // Held by the rule, or always held (a bare "disabled": a placeholder button that never continues).
    if (!/disabled=\{[^\n]*continueHeld\.length > 0/.test(button.attributes) && !/\sdisabled(?=\s|$)/.test(button.attributes)) unheld.push(`${file}: ${button.attributes.replace(/\s+/g, " ").slice(0, 80)}`);
  }
}
check(`(a) every route's "Continue to your next steps" is held by the one rule (${continueButtons} found)`, continueButtons >= 6 && unheld.length === 0, unheld.join("\n      "));

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
check("(b) the helper runs the waiting saves at the click itself, before the clicked button's handler (capture)", /addEventListener\("click", runWaiting, true\)/.test(helper) && /addEventListener\("pointerdown", \(\) => \{ pressed = true; \}, true\)/.test(helper));

// (c)
const notice = read("app/_components/FirstUseAcknowledgement.tsx");
check("(c) the notice says where the agreement is kept: this device for a guest, this device for the account when signed in", /ACKNOWLEDGEMENT_RECORDED_GUEST = "Your agreement is recorded on this device with the date and time\."/.test(notice) && /ACKNOWLEDGEMENT_RECORDED_SIGNED_IN = "Your agreement is recorded on this device for your account, with the date and time\."/.test(notice) && /\{userId \? ACKNOWLEDGEMENT_RECORDED_SIGNED_IN : ACKNOWLEDGEMENT_RECORDED_GUEST\}/.test(notice));
check("(c) it never says the agreement is kept with the account itself (it is kept in this browser: acknowledgement.ts)", !/recorded with your account/.test(notice) && /window\.localStorage/.test(read("src/lib/content-library/acknowledgement.ts")));

// (d)
const S8 = "Synthetic: I sold $85,000 of equipment to Testgoods Ltd. in Ottawa. Payment was due September 30, 2026 and nothing has been paid.";
check("(d) the story reading's other party keeps \"Ltd.\"", otherPartyFromUnderstanding([{ label: "Other party", value: "Testgoods Ltd., the buyer" }], S8) === "Testgoods Ltd.");
check("(d) the story's own reader keeps \"Ltd.\"", otherSideIn(S8)?.value === "Testgoods Ltd.", otherSideIn(S8)?.value);
check("(d) the Parties step's offer keeps \"Inc.\"", storyPartyOffers("Synthetic: I am suing Northern Testroofing Inc., 1 Main St, Ottawa ON K1A 0A1.", { version: 1, list: [], declined: [] }).some((offer) => offer.value === "Northern Testroofing Inc."));
check("(d) no period is added where none was written", otherPartyFromUnderstanding([{ label: "Other party", value: "Testgoods Ltd" }], "Synthetic: I sold equipment to Testgoods Ltd and it never paid.") === "Testgoods Ltd");

// (e)
check("(e) \"Unfinished intake\" is a placeholder, never the title shown", isGeneratedTitle("Unfinished intake") && caseTitleFromIntake("Testgoods Ltd.", "civil") === "Your case with Testgoods Ltd.");

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll screen-fault checks passed.");
process.exit(failed ? 1 : 0);
