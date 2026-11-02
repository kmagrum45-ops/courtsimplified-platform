/**
 * NO LIST OF WHAT THE PERSON ANSWERED IS HELD IN THE PAGE OR THE TAB (fault 1, site owner 31 Oct).
 *
 * The owner's rule: no list of what the person answered, has held, removed, was offered or turned
 * down may live in component state (useState / useRef) or in the tab (sessionStorage / localStorage).
 * Each comes from the saved record through the case file (caseFile.ts caseFileOf), so a reload, a
 * second tab and every screen (the review, the overview, the case page) show the same thing, in all
 * three courts. On d9b4dda4 the review kept the questions answered in it in `useState answeredHere`
 * and their order in `useRef seenOrder`: after a reload or in a second tab an answered question
 * vanished from its place (tests/browser/review-answered-kept.spec.ts shows it in the browser).
 *
 * WHAT IT CHECKS:
 *   1. the review (app/_components/IntakeReviewPanel.tsx) draws its one list from
 *      intakeReview.ts reviewQuestionList, records an answer through withAnsweredInReview into the case
 *      file's section, and holds no answered / order list of its own (no answeredHere, no seenOrder);
 *   2. reviewQuestionList reads caseFileOf's answeredInReview and sorts by reviewQuestionRank, and
 *      caseFileOf reads answeredInReview from the case file's section;
 *   3. behaviour, per court (Small Claims, civil, Family), on synthetic checkpoints: the list sorted by
 *      rank is the order it is first drawn in; a question answered in the review stays listed,
 *      marked answered, in the same place; a checkpoint read back from JSON (a reload, a second tab)
 *      gives the same list; an answered question whose answer was emptied is not listed as answered;
 *   4. a scan of app/ for useState / useRef whose name says it holds answered, heard, held, removed,
 *      offered, turned-down, declined, rejected, skipped, asked, seen, dismissed, picked, chosen or kept
 *      items: each match must be on KNOWN below with its class and reason, and every KNOWN entry must
 *      still match (a place moved to the saved record is deleted from KNOWN: a one-line deletion);
 *   5. self-test: a planted `useState answeredHere` list is caught by the scan.
 *
 * WHAT FAILURE IT EXISTS TO CATCH: a screen that keeps its own list of the person's answers (or of
 * what was held, offered or turned down) in the page or the tab, so a reload, a second tab or another
 * screen shows something different from the saved case.
 *
 * NO_PAGE_HELD_ROOT=<dir> scans another checkout's sources for checks 1, 2 and 4 (it fails on d9b4dda4).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { CASE_FILE_SECTION, caseFileOf, withAnsweredInReview } from "../../src/lib/case-system/caseFile/caseFile";
import { reviewQuestionList, reviewQuestionRank } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ROOT = path.resolve(process.env.NO_PAGE_HELD_ROOT || path.resolve(__dirname, "../.."));
let failures = 0;
const check = (ok: boolean, what: string, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${what}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const source = (file: string) => existsSync(path.join(ROOT, file)) ? readFileSync(path.join(ROOT, file), "utf8") : "";

// 1. The review.
const PANEL = "app/_components/IntakeReviewPanel.tsx";
const panel = source(PANEL);
check(/const shownQuestions = reviewQuestionList\(checkpoint, savedMaster/.test(panel), "the review draws its one list from reviewQuestionList with the saved case");
check(/put\(CASE_FILE_SECTION, "answeredInReview", withAnsweredInReview\(/.test(panel), "the review records an answered question in the case file's section (withAnsweredInReview)");
check(!/\banswered[A-Za-z]*\s*,\s*set[A-Za-z]*\]\s*=\s*useState/.test(panel) && !/\banswered[A-Za-z]*\s*=\s*useRef/.test(panel), "the review holds no answered list in useState / useRef", `found in ${PANEL}`);
check(!/\bseenOrder\b/.test(panel) && !/=\s*useRef<string\[\]>/.test(panel), "the review holds no order of its own (no seenOrder / useRef<string[]>)", `found in ${PANEL}`);
check(!/(sessionStorage|localStorage)/.test(panel), "the review keeps nothing in the tab");

// 2. The shared list and the case file.
const review = source("src/lib/case-system/intakeReview.ts");
const listBody = review.slice(review.indexOf("export function reviewQuestionList"), review.indexOf("export function reviewQuestionList") + 1600);
check(listBody.includes("caseFileOf(checkpoint, master)") && listBody.includes("file.answeredInReview") && listBody.includes("reviewQuestionRank"), "reviewQuestionList reads caseFileOf's answeredInReview and sorts by reviewQuestionRank");
const caseFile = source("src/lib/case-system/caseFile/caseFile.ts");
check(/object\(sections\[CASE_FILE_SECTION\]\)\.answeredInReview/.test(caseFile), "caseFileOf reads answeredInReview from the case file's section");

// 3. Behaviour on synthetic checkpoints.
type Court = "small-claims" | "civil" | "family";
const STORY: Record<Court, string> = {
  "small-claims": "Synthetic: a contractor I paid in April 2026 never finished my deck. The receipt is all I have.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The invoice is all I have.",
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house.",
};
const checkpoint = (court: Court, extra: Record<string, Record<string, unknown>> = {}): Checkpoint => ({
  version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: court, revision: "00000000-0000-4000-8000-000000000002",
  sections: { story: { text: STORY[court], location: { city: "Kingston", province: "ON" } }, ...extra },
} as unknown as Checkpoint);
/** The checkpoint after the person answered `id` in the review, as the panel writes it. */
function answered(court: Court, base: Checkpoint, id: string, value: string | string[]): Checkpoint {
  const sections = { ...base.sections } as Record<string, Record<string, unknown>>;
  sections[CASE_FILE_SECTION] = withAnsweredInReview(sections[CASE_FILE_SECTION], id);
  if (court === "small-claims") sections.builder = { ...sections.builder, initialAnswers: { ...(sections.builder?.initialAnswers as object), [id]: value } };
  else if (court === "civil") sections.civil = { ...sections.civil, input: { ...(sections.civil?.input as object), [id]: value } };
  else sections.family = { ...sections.family, [id]: value };
  return { ...base, sections } as Checkpoint;
}
for (const court of ["small-claims", "civil", "family"] as const) {
  const first = reviewQuestionList(checkpoint(court));
  check(first.length >= 2, `${court}: the review lists questions for the synthetic story`, JSON.stringify(first.map((q) => q.id)));
  const ranks = first.map((question) => reviewQuestionRank(court, question.id));
  check(ranks.every((rank, index) => rank !== Number.MAX_SAFE_INTEGER && (index === 0 || rank > ranks[index - 1])), `${court}: each listed question has its own fixed place, in the order drawn`, JSON.stringify(first.map((q, i) => `${q.id}:${ranks[i]}`)));
  const pick = first[1];
  const value = court === "small-claims" ? "Synthetic answer" : court === "civil" && pick.id === "issues" ? ["contract"] : court === "family" && pick.id === "issues" ? ["property-division"] : "Synthetic answer";
  const after = answered(court, checkpoint(court), pick.id, value);
  check(caseFileOf(after).answeredInReview?.includes(pick.id) === true, `${court}: caseFileOf holds the question answered in the review`);
  const list = reviewQuestionList(after);
  // An answer may bring in a question that depends on it (a side answered): each earlier question keeps its order.
  const kept = list.map((q) => q.id).filter((id) => first.some((q) => q.id === id));
  check(JSON.stringify(kept) === JSON.stringify(first.map((q) => q.id)), `${court}: answered, every earlier question is still listed, in the same order`, `${JSON.stringify(first.map((q) => q.id))} -> ${JSON.stringify(list.map((q) => q.id))}`);
  const shownAnswered = list.filter((q) => q.answered);
  check(shownAnswered.length === 1 && shownAnswered[0].id === pick.id && kept.indexOf(pick.id) === 1, `${court}: the answered one is marked answered, in its place`, JSON.stringify(list));
  const reloaded = JSON.parse(JSON.stringify(after)) as Checkpoint;
  check(JSON.stringify(reviewQuestionList(reloaded)) === JSON.stringify(list), `${court}: read back from the saved JSON (a reload, a second tab), the same list`);
  const emptied = answered(court, after, pick.id, court === "small-claims" ? "" : Array.isArray(value) ? [] : "");
  check(!reviewQuestionList(emptied).some((q) => q.id === pick.id && q.answered), `${court}: an answer emptied since is not listed as answered`);
}

// 4. The scan of app/.
const VOCAB = "answered|heard|held|removed|offered|turnedDown|declined|rejected|skipped|asked|seen|dismissed|picked|chosen|kept";
const STATE = new RegExp(`const \\[\\s*((?:${VOCAB})[A-Za-z]*)\\s*,\\s*set[A-Za-z]*\\s*\\]\\s*=\\s*useState\\b|const ((?:${VOCAB})[A-Za-z]*)\\s*=\\s*useRef\\b`, "g");
/** Every match of a held-list name in useState / useRef, as "file:name". */
function scan(text: string, file: string): string[] {
  return [...text.matchAll(STATE)].map((match) => `${file}:${match[1] ?? match[2]}`);
}
/**
 * Each page-held value the scan finds, with its class: (b) a transient input or UI flag, (c) a copy of a
 * value already saved (shown at once, the saved record read after a reload), (a) a person's record kept
 * only in the page, NOT fixed in this change, with why. Delete an entry when its place reads the saved case.
 */
const KNOWN: Record<string, string> = {
  "app/builder/_components/IntelligenceOverviewPanel.tsx:pickedHere": "(c) the kind picked on the overview, shown at once after savePositionQueued saved it to the case position; read through caseFileOf on the next load",
  "app/builder/_components/SourcedQuestions.tsx:askedFor": "(c) mirrors the saved sourced.askedFor (useIntakeState), written back to the checkpoint every render",
  "app/builder/_components/StageAnswerPanel.tsx:chosenHere": "(b) wording only: names the step the person chose on this visit as theirs, not as a suggestion; the step itself is saved to the case position",
  "app/builder/_components/StageAnswerPanel.tsx:rejected": "(a) NOT FIXED: a story date turned down with \"No, change it\" on the step page, before it was kept; the step page saves to the case position (casePosition.ts has no field for it) and story dates are kept (saved) on arrival, so the path is only reachable before that save",
  "app/builder/_components/StageAnswerPanel.tsx:keptFromStory": "(a) NOT FIXED: the note saying a saved date came from the story; the date is saved, the note is lost on reload (the case position has no field for where a date came from)",
  "app/forms/FormsWorkspace.tsx:keptFromCase": "(a) NOT FIXED: the note saying a saved form answer was kept from the case; the answer is saved (formApplicability), the note is lost on reload (the form-applicability route stores no basis)",
};
const files: string[] = [];
const walk = (dir: string) => { for (const name of readdirSync(dir)) { const full = path.join(dir, name); if (statSync(full).isDirectory()) { if (name !== "node_modules" && !name.startsWith(".")) walk(full); } else if (/\.tsx?$/.test(name)) files.push(full); } };
walk(path.join(ROOT, "app"));
const found = files.flatMap((full) => scan(readFileSync(full, "utf8"), path.relative(ROOT, full).split(path.sep).join("/")));
const unknown = found.filter((entry) => !(entry in KNOWN));
check(unknown.length === 0, "every useState / useRef holding answered, held, offered or turned-down items is classed (none new)", unknown.join("\n      "));
const stale = Object.keys(KNOWN).filter((entry) => !found.includes(entry));
check(stale.length === 0, "every classed place still exists (delete an entry once its place reads the saved case)", stale.join("\n      "));
const tabUses = files.filter((full) => /answered|initialAnswers|answeredInReview/.test(readFileSync(full, "utf8")) && /(sessionStorage|localStorage)\.setItem\([^)]*(answered|offered|turnedDown|declined|rejected)/i.test(readFileSync(full, "utf8")));
check(tabUses.length === 0, "no answered / offered / turned-down list is written to sessionStorage or localStorage by name", tabUses.join(", "));

// 5. Self-test.
check(scan("const [answeredHere, setAnsweredHere] = useState<string[]>([]);\nconst seenOrder = useRef<string[]>([]);", "planted.tsx").includes("planted.tsx:answeredHere"), "self-test: a planted useState answeredHere list is caught by the scan");

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll no-page-held-answers checks passed.");
process.exit(failures ? 1 : 0);
