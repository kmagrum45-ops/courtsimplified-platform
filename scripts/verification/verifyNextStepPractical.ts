/**
 * The next-step card's form, fee, filing and service lines are the law's own
 * words, for every step (content-library/nextStepPractical.ts, master plan
 * Phase 2, 2026-10-08).
 *
 * WHAT IT CATCHES:
 *   - a fee, filing or service line whose quote is not in the saved official
 *     text (docs/sources/corpus/) -- a remembered fee or rule cannot ship;
 *   - a fee whose amount is not the amount in its own quote;
 *   - a verified date that is not the date the source was saved;
 *   - a step in the stage map with no entry (so its card would silently show
 *     nothing), or an entry for a step that does not exist;
 *   - a form for a step that the step's own rules, deadlines and published
 *     answer never name, or that the court's forms index does not have;
 *   - a fee from another court on a step;
 *   - the card choosing the wrong portal: Toronto must get only the Toronto
 *     portal, a city outside Toronto only the other, and no city both;
 *   - a plain-words line that grades a case.
 *
 * COSTS NOTHING: reads files; no network, no model.
 *
 * Run: npm run test:next-step-practical
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { ALL_STAGES, isSpecialStage, pathwayOf } from "../../src/lib/case-system/stage-map/stageMap";
import type { RuleCitation } from "../../src/lib/case-system/stage-map/citations";
import { formGuideEntry } from "../../src/lib/content-library/forms/formGuide";
import {
  FAMILY_APPEAL_FEE_NOTE,
  FAMILY_FEE_NOTES,
  FEE_WAIVER,
  FEES,
  FILING,
  SERVICE,
  SOURCE_SAVED_ON,
  STEP_PRACTICAL,
  inTorontoRegion,
  practicalFor,
  type PlainLine,
  type PracticalCourt,
  FAMILY_NO_STEP_FEE,
  limitNotesFor,
} from "../../src/lib/content-library/nextStepPractical";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const flat = (text: string) => text.replace(/\s+/g, " ").trim();
const corpus = new Map<string, string>();
for (const file of readdirSync(CORPUS)) if (file.endsWith(".txt")) corpus.set(file.replace(/\.txt$/, ""), flat(readFileSync(path.join(CORPUS, file), "utf8")));

const COURTS: PracticalCourt[] = ["small-claims", "civil", "family"];
const lines: PlainLine[] = [
  ...FAMILY_FEE_NOTES,
  ...FAMILY_NO_STEP_FEE,
  ...limitNotesFor("civil", "a supplier sued my company"),
  FAMILY_APPEAL_FEE_NOTE,
  FEE_WAIVER,
  ...COURTS.flatMap((court) => [FILING[court].toronto, FILING[court].elsewhere, ...FILING[court].more]),
  ...COURTS.flatMap((court) => [
    ...SERVICE[court].originating,
    ...SERVICE[court].special,
    ...SERVICE[court].ordinary,
    ...SERVICE[court].summons,
    ...SERVICE[court].garnishment,
    SERVICE[court].proof,
  ]),
];
const citations: RuleCitation[] = [
  ...lines.map((line) => line.cite),
  ...Object.values(FEES).map((fee) => fee.cite),
  ...Object.values(STEP_PRACTICAL).flatMap((step) => step.also ?? []),
];

console.log("\n1. Every quote is in the saved official text");
const missing: string[] = [];
for (const citation of citations) {
  const text = corpus.get(citation.sourceId);
  if (!text) {
    missing.push(`${citation.sourceId}: no saved text`);
    continue;
  }
  for (const run of citation.quote.split(" ... ")) if (!text.includes(flat(run))) missing.push(`${citation.sourceId} ${citation.pinpoint}: "${run.slice(0, 90)}"`);
}
check(`${citations.length} quotes found word for word`, missing.length === 0, missing.join("\n      "));

console.log("\n2. Fees say their own amount; verified dates are the saved dates");
const wrongAmount = Object.values(FEES).filter((fee) => !fee.cite.quote.includes(`$${fee.amount}`));
check("each fee's amount is the amount in its quote", wrongAmount.length === 0, wrongAmount.map((fee) => fee.id).join(", "));
const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as { entries: { id: string; retrievedAt: string }[] };
const savedOn = new Map(manifest.entries.map((entry) => [entry.id, entry.retrievedAt.slice(0, 10)]));
const used = Array.from(new Set(citations.map((citation) => citation.sourceId)));
const wrongDate = used.filter((id) => SOURCE_SAVED_ON[id] !== savedOn.get(id));
check("each source's verified date is its saved date in manifest.json", wrongDate.length === 0, wrongDate.map((id) => `${id}: says ${SOURCE_SAVED_ON[id]}, saved ${savedOn.get(id)}`).join("; "));

console.log("\n3. Every step has an entry, and only real steps do");
const steps = ALL_STAGES.filter((stage) => !isSpecialStage(stage.id));
const noEntry = steps.filter((stage) => !STEP_PRACTICAL[stage.id]).map((stage) => stage.id);
check(`all ${steps.length} steps have an entry`, noEntry.length === 0, noEntry.join(", "));
const stray = Object.keys(STEP_PRACTICAL).filter((id) => !steps.some((stage) => stage.id === id));
check("no entry for a step that does not exist", stray.length === 0, stray.join(", "));

console.log("\n4. Forms are the step's own and exist; fees are the step's court's");
const published = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/published/stageAnswers.published.json"), "utf8")) as { blocks: Record<string, unknown>[] };
const strings = (value: unknown): string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
const unnamed: string[] = [];
const unknownForm: string[] = [];
const otherCourtFee: string[] = [];
for (const stage of steps) {
  const entry = STEP_PRACTICAL[stage.id];
  if (!entry) continue;
  const court = pathwayOf(stage) as PracticalCourt;
  const own = [
    ...stage.rules.map((rule) => rule.quote),
    ...stage.deadlines.flatMap((deadline) => [deadline.what, deadline.countFrom, deadline.rule.quote, ...deadline.exceptions.map((e) => e.quote)]),
    ...published.blocks.filter((block) => block.stageId === stage.id).flatMap(strings),
    // The rules the card itself quotes for this step count: the person sees
    // the rule that names the form right beside it.
    ...(practicalFor(stage.id, court) ? [...practicalFor(stage.id, court)!.also, ...practicalFor(stage.id, court)!.serving.map((line) => line.cite)].map((c) => c.quote) : []),
  ].join(" ");
  for (const form of entry.forms) {
    const [formCourt, number] = form.includes(":") ? form.split(":") : [court, form];
    if (!formGuideEntry(formCourt, number)) unknownForm.push(`${stage.id}: ${form}`);
    // "Form 61A.2 (Court of Appeal) or 61A.3 (Divisional Court)" names both.
    const named = new RegExp(`Forms?\\s+(?:[0-9A-Z.]+(?:\\s*\\([^)]*\\))?(?:,\\s*|\\s+(?:and|or)\\s+))*${number.replace(/\./g, "\\.")}(?![0-9A-Z.])`, "i");
    if (!named.test(own)) unnamed.push(`${stage.id}: Form ${number}`);
  }
  for (const id of entry.fees) {
    const fee = FEES[id];
    if (!fee) otherCourtFee.push(`${stage.id}: unknown fee ${id}`);
    else if (fee.court !== court) otherCourtFee.push(`${stage.id}: ${id} is a ${fee.court} fee`);
  }
}
check("every form is in its court's forms index", unknownForm.length === 0, unknownForm.join(", "));
check("every form is named in the step's own rules, deadlines or published answer", unnamed.length === 0, unnamed.join("\n      "));
check("every fee is the step's own court's", otherCourtFee.length === 0, otherCourtFee.join(", "));

console.log("\n5. The card picks the portal for the person's city");
check("Toronto and its former cities are the Toronto region", ["Toronto", "Scarborough", "north york", "Etobicoke"].every((city) => inTorontoRegion(city) === true));
check("Ottawa, Newmarket and York Region are not", ["Ottawa", "Newmarket", "York Region", "Markham"].every((city) => inTorontoRegion(city) === false));
for (const court of COURTS) {
  const stepId = steps.find((stage) => pathwayOf(stage) === court && STEP_PRACTICAL[stage.id]?.files)?.id ?? "";
  const toronto = practicalFor(stepId, court, "Toronto")?.filing ?? [];
  const ottawa = practicalFor(stepId, court, "Ottawa")?.filing ?? [];
  const nowhere = practicalFor(stepId, court, "")?.filing ?? [];
  check(
    `${court}: Toronto gets only the Toronto portal, Ottawa only the other, no city both`,
    toronto.includes(FILING[court].toronto) && !toronto.includes(FILING[court].elsewhere) &&
      ottawa.includes(FILING[court].elsewhere) && !ottawa.includes(FILING[court].toronto) &&
      nowhere.includes(FILING[court].toronto) && nowhere.includes(FILING[court].elsewhere),
  );
}
const served = steps.filter((stage) => STEP_PRACTICAL[stage.id]?.serve);
const emptyService = served.filter((stage) => (practicalFor(stage.id, pathwayOf(stage) as PracticalCourt)?.serving.length ?? 0) < 2).map((stage) => stage.id);
check("every step that serves a document shows how, and how to prove it", emptyService.length === 0, emptyService.join(", "));

const appealNotes = practicalFor("family:both:final-order-made", "family")?.feeNotes ?? [];
check("a family appeal shows the appeal fee note, not the no-fee notes for starting a case", appealNotes.includes(FAMILY_APPEAL_FEE_NOTE) && !appealNotes.some((line) => FAMILY_FEE_NOTES.includes(line)));

// A person responding to a motion sees their own forms first; nothing is removed (2026-10-09).
const asMover = practicalFor("civil:both:summary-judgment-motion", "civil", "")?.forms.map((form) => form.number) ?? [];
const asResponder = practicalFor("civil:both:summary-judgment-motion", "civil", "", true)?.forms.map((form) => form.number) ?? [];
check(
  "responding to a motion: the notice of motion is listed last, and every form is still there",
  asResponder.at(-1) === "37A" && [...asResponder].sort().join() === [...asMover].sort().join(),
  asResponder.join(","),
);
const responseStep = practicalFor("family:both:served-with-motion-to-change", "family")?.feeNotes ?? [];
check("a family step that files papers with no fee of its own says so", responseStep.length > 0);

check("a company in a civil case is told it needs a lawyer", limitNotesFor("civil", "a supplier sued my company").length === 1);
check("a person whose story mentions a company account is not", limitNotesFor("civil", "i sued my former business partner for 110000 he took from our company account").length === 0);

console.log("\n6. Nothing grades a case");
const grading = lines.filter((line) => /\b(strong|weak|likely|unlikely|chance|win|lose|merit)/i.test(line.say)).map((line) => line.say);
check("no plain-words line grades a case or predicts an outcome", grading.length === 0, grading.join(" | "));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
