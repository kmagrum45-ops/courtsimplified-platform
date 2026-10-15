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
 *   - a plain-words line that grades a case;
 *   - (2026-10-13 walkthrough) a family step that files papers but says nothing
 *     about the fee; a parenting-only case whose fee exemption does not lead;
 *     a form folded away and lost, or folded with no words to justify it; a
 *     support-only motion to change led by the information program; a court
 *     office not on the courts' own lists; a garnishment step silent on the
 *     garnishee; a claim against a city with no line on serving one; a notice
 *     step with no "how to give the notice", or one stating an address no
 *     saved source gives; a passed bar's exceptions that are not "is not a bar".
 *   - (2026-10-13 review) a parenting-only case whose leading fee notes do not
 *     start with the s. 1.2 (2) exemption, or carry the $10 divorce note; the
 *     Case file and Timeline counting notices the Overview card drops; the
 *     Forms tab built without the person's words or notice step; the site's
 *     own follow-up question text read as the person's words.
 *   - (walkthrough run 38500825561) a notice-before-suing step that does not
 *     name the form that starts the court case after it, with its fee, or
 *     names it before the notice.
 *   - (walkthrough 2026-10-14) a notice step's "then" lines without where to
 *     file the claim for the person's city, or without how to serve a
 *     municipality when the notice kept is to one (or with it when not);
 *     Form 13 folded for words about support, money or property, or for no
 *     words;
 *     a case's Forms tab catalogue not led by the step's own forms (and the
 *     claim form after a notice step), or losing or reordering the rest.
 *   - (legal review 2026-10-14) Form 13 folded on a responding step, or
 *     shown there without r. 13 (1) (b)'s condition (with "within your time
 *     to respond" on a motion to change); the claim form after a notice
 *     labelled "For your step".
 *   - (walkthrough run 38525903567, SD) "file online" shown beside a counted
 *     last day 3 business days away or less (counted as the guide's own
 *     February example counts), or a too-close line naming a filing way the
 *     guide does not; no warning that mail counts on the fifth day when the
 *     last day is near; the defendant's claim fee missing from a defence step.
 *     (review of bee9daf) these lines timed against anything but the person's
 *     own serve-or-file deadline (PERSON_SERVE_OR_FILE: never the court's
 *     settlement-conference target, a leave threshold or an issue-only
 *     limit); "do not file online" for a passed day; a too-close line not
 *     hedged when only one holiday calendar's day decided it.
 *     (SJ) an employer named only vaguely ("a car dealership ... i think")
 *     with no word that the garnishee must be named, or of the examination
 *     that is the rules' way to find out more; a line choosing or predicting.
 *
 * COSTS NOTHING: reads files; no network, no model.
 *
 * (walkthrough run 38525903567, FR) A parenting-only answer shown fee
 * amounts beside the no-fee rule with nothing saying which applies, or a fee
 * dropped when folded; Form 35.1 missing for an answer claiming parenting
 * (r. 35.1 (1)).
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
  FEES_IF_CLAIMED_LABEL,
  FILING,
  SERVICE,
  SOURCE_SAVED_ON,
  STEP_PRACTICAL,
  inTorontoRegion,
  practicalFor,
  type PlainLine,
  type PracticalCourt,
  FAMILY_NO_STEP_FEE,
  SC_NO_STEP_FEE,
  limitNotesFor,
  MORE_CARD_LINES,
  MIP_SUPPORT_ONLY_CHANGE,
  claimFit,
  familyClaimsIn,
  notABarExceptions,
  respondingStep,
  familyCourtOfficesIn,
  civilCourtOfficesIn,
  keptForNotices,
  noticeFit,
  claimAfterNotice,
  CLAIM_AFTER_NOTICE,
  RESPONDING_VIEW,
  SC_MAIL_RULE,
  SC_SOONER_WAYS,
  GARNISHEE_NOT_NAMED,
  vagueEmployerSentence,
  businessDaysAway,
  isCourtBusinessDay,
  PERSON_SERVE_OR_FILE,
  personDeadlineOf,
  tooCloseOnlyByHoliday,
  NOT_TIMED,
  DIVISIONAL_COURT_ONLY,
  filingDeadlineDivisionalOnly,
  mailTimingLines,
  tooCloseFilingLine,
  tooCloseToFileOnline,
} from "../../src/lib/content-library/nextStepPractical";
import { addDays, dayOfWeek, formatLongDate, holidayFor } from "../../src/lib/case-system/deadlines/holidays";
import { computedDeadlinesFor } from "../../src/lib/content-library/computedDeadline";
import { DEADLINE_EVENTS, caseDatesFrom } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { userWordsOf } from "../../src/lib/content-library/forms/formsInText";
import { formKey, formsStageNote, leadFormsFirst } from "../../src/lib/content-library/forms/caseFormOrder";
import { PERSONAS } from "../../tests/browser/walkthrough/personas";
import { COURT_LOCATIONS, OCJ_COURTHOUSES } from "../../src/lib/content-library/courts/courtLocations";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";

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
  ...MORE_CARD_LINES,
  ...FAMILY_FEE_NOTES,
  ...FAMILY_NO_STEP_FEE,
  ...SC_NO_STEP_FEE,
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
  // The responding wording's own rules (reviewer 2026-10-14).
  ...Object.values(RESPONDING_VIEW).flatMap((view) => [view.note.cite, ...view.alsoRules]),
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
    // "Form 61A.2 (Court of Appeal) or 61A.3 (Divisional Court)" names both. A
    // full stop that ends the sentence ("... may be in Form 14C.") is not part
    // of the number; one followed by more of the number ("61A.3") is.
    const named = new RegExp(`Forms?\\s+(?:[0-9A-Z.]+(?:\\s*\\([^)]*\\))?(?:,\\s*|\\s+(?:and|or)\\s+))*${number.replace(/\./g, "\\.")}(?![0-9A-Z]|\\.[0-9A-Z])`, "i");
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
// Walkthrough run 38525903567: "file online through the Justice Services
// Online portal" was backed by a sentence about paying fees. A line that says
// to file online must quote a sentence that speaks of filing online.
const filesOnline = /\b(?:file|filings?)\b[^.]*\bonline\b|\bonline\b[^.]*\bfilings?\b/i;
const unbacked = COURTS.flatMap((court) => [FILING[court].toronto, FILING[court].elsewhere])
  .filter((line) => /\bfile online\b/i.test(line.say) && !line.cite.quote.split(/(?<=\.)\s+| \.\.\. /).some((sentence) => filesOnline.test(sentence)))
  .map((line) => line.say);
check("every 'file online' line quotes a sentence about filing online", unbacked.length === 0, unbacked.join(" | "));
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

console.log("\n7. A Small Claims step with no fee says so (2026-10-13)");
{
  const conference = practicalFor("plaintiff:awaiting-settlement-conference", "small-claims", "Kingston", false);
  check("the settlement conference card says the fee list has no fee for it", conference?.feeNotes[0] === SC_NO_STEP_FEE[0]);
  const claim = practicalFor("plaintiff:claim-drafted-not-filed", "small-claims", "Kingston", false);
  check("a step with a fee shows the fee, not the no-fee note", Boolean(claim?.fees.length) && claim?.feeNotes.length === 0);
}

console.log("\nNotices narrowed to the person's words");
// Property, not today's list: narrowing never leaves a step with no notice
// rule, and a story that names one public body shows that body's notice.
const STORIES = ["", "i slipped on ice on the sidewalk on queen street in toronto and want to sue the city", "my car hit a pothole on a city road in ottawa", "i fell on ice in a store parking lot", "the province's ministry was negligent", "a newspaper wrote lies about me", "something happened"];
const emptied = ALL_STAGES.flatMap((stage) => {
  const court = pathwayOf(stage) as PracticalCourt;
  const full = practicalFor(stage.id, court)?.also.length ?? 0;
  return full === 0 ? [] : STORIES.filter((story) => (practicalFor(stage.id, court, "Toronto", false, story)?.also.length ?? 0) === 0).map((story) => `${stage.id}: "${story}"`);
});
check("narrowing a step's notices to the story never leaves it with none", emptied.length === 0, emptied.join("; "));
const toronto = practicalFor("civil:before-filing:notice-required-before-suing", "civil", "Toronto", false, STORIES[1])?.also.map((cite) => cite.sourceId) ?? [];
check("a fall on a Toronto sidewalk shows the City of Toronto notice and not the Crown's", toronto.includes("city-of-toronto-act-2006") && !toronto.includes("crown-liability-and-proceedings-act-2019"), toronto.join(", "));

console.log("\n8. Walkthrough fixes, 2026-10-13 (each a property, not today's list)");
{
  const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
  const component = read("app/_components/NextStepPractical.tsx");

  // F3: a family step that files papers always says what it costs -- a fee,
  // or the fee list's own words that it has none -- and the card shows the
  // fee block for either (a motion to change showed no "What it costs").
  const familyFiling = steps.filter((stage) => pathwayOf(stage) === "family" && STEP_PRACTICAL[stage.id]?.files);
  const silent = familyFiling.filter((stage) => {
    const view = practicalFor(stage.id, "family", "Sudbury");
    return !view || (view.fees.length === 0 && view.feeNotes.length === 0);
  });
  check("every family step that files papers says what it costs (a fee or the no-fee note)", silent.length === 0, silent.map((stage) => stage.id).join(", "));
  check("the card shows 'What it costs' for a fee note alone", /view\.fees\.length > 0 \|\| view\.feeNotes\.length > 0/.test(component));

  // F2: for words naming only parenting, the fee exemption leads; with a
  // property claim it does not. Nothing is dropped either way.
  const PARENTING = 'my ex took me to court for custody of our daughter {"issues":["decision-making-responsibility","parenting-time","relocation"]}';
  const PROPERTY = "my wife wants the house and half my pension and custody";
  const parenting = practicalFor("family:respondent:served-time-to-answer-running", "family", "Barrie", true, PARENTING);
  const property = practicalFor("family:respondent:served-time-to-answer-running", "family", "Barrie", true, PROPERTY);
  const plain = practicalFor("family:respondent:served-time-to-answer-running", "family", "Barrie", true);
  check("parenting-only words: the fee exemption leads the fees", parenting?.feeNotesFirst === true && parenting.feeNotes.some((line) => line.cite.pinpoint === "s. 1.2 (2)"));
  check("property words, or no words: the fees lead as before", property?.feeNotesFirst === false && plain?.feeNotesFirst === false);
  // Folded (feesIfClaimed) counts as kept: a fold never removes.
  check(
    "reordering or folding never removes a fee",
    [parenting, property, plain].every((view) => (view?.fees.length ?? 0) + (view?.feesIfClaimed?.fees.length ?? 0) === STEP_PRACTICAL["family:respondent:served-time-to-answer-running"].fees.length),
  );

  // Review 2026-10-13 (5): for the family-respondent-parenting persona's own
  // words, the exemption that applies (s. 1.2 (2)) is the FIRST note, and the
  // federal $10 divorce note is left out (no divorce or marriage named). With
  // a divorce named, that note comes after the fees, never leading them.
  {
    const persona = PERSONAS.find((candidate) => candidate.id === "family-respondent-parenting")!;
    const words = [persona.story, JSON.stringify({ issues: persona.issues, yourRole: persona.role, city: persona.city })].join(" ");
    const view = practicalFor("family:respondent:served-time-to-answer-running", "family", persona.city, true, words)!;
    const isDivorceNote = (line: PlainLine) => /\$10\b/.test(line.say);
    check("persona family-respondent-parenting: the s. 1.2 (2) exemption is the first fee note, and the notes lead", view.feeNotesFirst && view.feeNotes[0]?.cite.pinpoint === "s. 1.2 (2)", view.feeNotes.map((line) => line.cite.pinpoint).join(", "));
    check("persona family-respondent-parenting: no $10 divorce note (no divorce or marriage named)", !view.feeNotes.some(isDivorceNote));
    const divorce = practicalFor("family:respondent:served-time-to-answer-running", "family", "Barrie", true, "my wife filed for divorce and wants custody")!;
    check("words naming a divorce: the $10 note is kept, after the fees", !divorce.feeNotesFirst && divorce.feeNotes.some(isDivorceNote) && isDivorceNote(divorce.feeNotes[divorce.feeNotes.length - 1]));
    check("no words: every family fee note is still shown", (plain?.feeNotes.length ?? 0) === FAMILY_FEE_NOTES.length);
    // Property, across every family step with first-instance fees: whenever
    // the notes lead, the exemption is first and no divorce note is among them.
    const misordered = steps
      .filter((stage) => pathwayOf(stage) === "family")
      .map((stage) => practicalFor(stage.id, "family", "Barrie", true, words))
      .filter((v): v is NonNullable<typeof v> => Boolean(v && v.feeNotesFirst))
      .filter((v) => v.feeNotes[0]?.cite.pinpoint !== "s. 1.2 (2)" || v.feeNotes.some(isDivorceNote));
    check("on every family step, leading fee notes start with the exemption and carry no divorce note", misordered.length === 0);
  }

  // Review 2026-10-13 (2): the one notice filter (keptForNotices) used by the
  // Overview card, its passed box, the Case file and the Timeline.
  {
    const notices = [
      { what: "The general deadline to start a court case" },
      { what: "If a municipality did not keep a highway (road) or bridge in repair and you claim damages, give written notice of the claim to the municipal clerk" },
      { what: "If the City of Toronto did not keep a highway (road) or bridge in repair and you claim damages, give written notice of the claim to the city clerk" },
      { what: "If you are claiming damages from the Ontario Crown, serve a notice of claim on the Crown" },
    ];
    const sidewalk = "i slipped on ice on the sidewalk on queen street in toronto on september 30 and broke my wrist. i want to sue the city";
    const kept = keptForNotices(notices, sidewalk, "Toronto").map((item) => item.what);
    check("a Toronto fall keeps the City of Toronto notice and the general limit", kept.some((w) => /City of Toronto/.test(w)) && kept.some((w) => /general deadline/.test(w)));
    check("and drops the notices that do not fit", !kept.some((w) => /a municipality|Ontario Crown/.test(w)));
    check("words that fit no notice keep every limit", keptForNotices(notices, "something happened to me", "Ottawa").length === notices.length);
    const route = readFileSync(path.join(ROOT, "app", "api", "workspace", "organisation", "route.ts"), "utf8");
    check(
      "the Case file and Timeline count only the kept notices, with the person's words and city",
      /keptForNotices\(stage\.deadlines, userWordsOf\(intakeDataOf\(ownedCase\.master_result\)\), record\.city\)/.test(route) &&
        /computedDeadlinesFor\(stepLimits,/.test(route) &&
        !/computedDeadlinesFor\(stage\.deadlines/.test(route),
    );
    const panelSource = readFileSync(path.join(ROOT, "app", "builder", "_components", "StageAnswerPanel.tsx"), "utf8");
    check("the Overview card uses the same filter", /keptForNotices\(\[\.\.\.summary\.deadlines, \.\.\.summary\.periods\], story, city\)/.test(panelSource));
  }

  // Review 2026-10-13 (6): the Forms tab passes the person's words and the
  // case's notice step, as the Overview card does, so both show the same.
  {
    const formsPage = readFileSync(path.join(ROOT, "app", "cases", "[id]", "forms", "page.tsx"), "utf8");
    check(
      "the Forms tab's practicalFor gets the person's words and the notice step",
      /practicalFor\(stepId, courtPath as PracticalCourt, city, responding, userWords, noticeStepId\)/.test(formsPage) && /noticeStepForCase\(caseRecord\.master_result/.test(formsPage),
    );
    check("the Forms tab's card gets them too", /<NextStepPractical[\s\S]{0,200}story=\{userWords\}[\s\S]{0,80}noticeStepId=\{noticeStepId\}/.test(formsPage));
    const persona = PERSONAS.find((candidate) => candidate.id === "family-respondent-parenting")!;
    const intake = { facts: persona.story, extra: { issues: persona.issues, yourCity: persona.city } };
    const words = userWordsOf(intake);
    const overview = practicalFor("family:respondent:served-time-to-answer-running", "family", persona.city, true, words, "");
    check("for the same words the Forms tab and Overview views are the same", JSON.stringify(overview) === JSON.stringify(practicalFor("family:respondent:served-time-to-answer-running", "family", persona.city, true, userWordsOf(intake), "")));
  }

  // Review 2026-10-13 (4): the person's words never include the site's own
  // follow-up question text, only their answers.
  {
    const question = "Did a municipality or the City of Toronto fail to keep a road in repair, or was there a newspaper libel or a divorce?";
    const intake = { facts: "my landlord kept my deposit", extra: { sourcedAnswers: [{ question, answer: "no, it was my landlord" }], yourCity: "Ottawa" } };
    const words = userWordsOf(intake);
    check("userWordsOf keeps each follow-up answer", /no, it was my landlord/.test(words));
    check("userWordsOf leaves out each follow-up question", !/municipality|newspaper|divorce|City of Toronto/i.test(words), words);
    const inFacts = userWordsOf({ facts: `my landlord kept my deposit\n\nAnswers to follow-up questions about the law that applies:\nQ: ${question}\nA: no, it was my landlord` });
    check("the same question added to the story as a Q: line is left out too, its answer kept", !/municipality|newspaper|divorce/i.test(inFacts) && /no, it was my landlord/.test(inFacts));
    check("so the question's words fit no notice and no family claim", noticeFit("If the City of Toronto did not keep a highway (road) or bridge in repair", words, "Ottawa") !== "fits" && !familyClaimsIn(words).divorce);
  }

  // C7: a form a rule ties to a claim the words do not name is folded with
  // that rule, never removed; with no words, nothing is folded.
  const foldedLost = steps
    .filter((stage) => pathwayOf(stage) === "family")
    .flatMap((stage) =>
      [PARENTING, "i pay child support and want it lowered", ""].flatMap((words) => {
        const view = practicalFor(stage.id, "family", "", false, words);
        if (!view) return [];
        const shown = [...view.forms, ...view.formsIfClaimed].map((form) => form.number).sort().join();
        const all = (STEP_PRACTICAL[stage.id].forms.map((form) => form.split(":").pop()) as string[]).sort().join();
        return shown === all ? [] : [`${stage.id} "${words}"`];
      }),
    );
  check("folding a form never loses it (every family step, three stories)", foldedLost.length === 0, foldedLost.join("; "));
  // Legal review 2026-10-14: on a responding step, whether r. 13 (1) (b)
  // binds the person turns on what the other side's papers CLAIM, which the
  // intake does not record -- so Form 13 is never folded there, whatever the
  // words, and r. 13 (1) (b)'s condition is beside it; on a motion to change
  // it says "within your time to respond".
  const respondingSteps = steps.filter((stage) => pathwayOf(stage) === "family" && respondingStep(stage.id, false) && STEP_PRACTICAL[stage.id].forms.some((form) => /^(?:family:)?13(?:\.1)?$/.test(form)));
  const respondingWrong: string[] = [];
  for (const stage of respondingSteps) {
    for (const responding of [false, true]) {
      for (const words of [PARENTING, "", "she wants child support from me too", "he is asking for the house", "something happened"]) {
        const view = practicalFor(stage.id, "family", "", responding, words);
        const shown = (view?.forms ?? []).filter((form) => form.number === "13" || form.number === "13.1");
        if (shown.length === 0 || (view?.formsIfClaimed ?? []).some((form) => form.number === "13" || form.number === "13.1")) respondingWrong.push(`${stage.id}: folded for "${words}"`);
        const motion = /motion-to-change|change-final-order/.test(stage.id);
        if (
          !shown.every(
            (form) =>
              form.note?.cite.pinpoint === "r. 13 (1) (b)" &&
              /the party against whom the claim is made/.test(form.note.cite.quote) &&
              /only if/.test(form.note.say) &&
              (motion ? /within your time to respond/.test(form.note.say) : /within your time to answer/.test(form.note.say)),
          )
        )
          respondingWrong.push(`${stage.id}: condition missing or wrong words`);
      }
    }
  }
  check("on every responding step Form 13 stays a form for the step, with r. 13 (1) (b)'s condition beside it, whatever the words", respondingSteps.length > 0 && respondingWrong.length === 0, [...new Set(respondingWrong)].slice(0, 6).join("; "));
  {
    const persona = PERSONAS.find((candidate) => candidate.id === "family-respondent-parenting")!;
    const words = userWordsOf({ facts: [persona.story, ...Object.values(persona.fields ?? {})].join("\n"), extra: { issues: persona.issues, yourCity: persona.city } });
    const view = practicalFor("family:respondent:served-time-to-answer-running", "family", persona.city, true, words);
    check("persona family-respondent-parenting: Form 13 is in the list with its r. 13 (1) (b) condition", Boolean(view?.forms.some((form) => form.number === "13" && form.note?.cite.pinpoint === "r. 13 (1) (b)")));
  }
  check("the card shows a form's condition beside it", /form\.note \?/.test(readFileSync(path.join(ROOT, "app", "_components", "NextStepPractical.tsx"), "utf8")));
  // Re-check 2026-10-14: the person's side on an either-side step counts too.
  check(
    "on an either-side step the financial-statement limit folds for the mover's parenting words, never for the one responding",
    claimFit({ what: "Serve and file a financial statement" }, PARENTING, "family:both:asking-to-change-final-order", true) === "fits" &&
      claimFit({ what: "Serve and file a financial statement" }, PARENTING, "family:both:asking-to-change-final-order", false) === "not",
  );
  check("the card passes the person's side to claimFit", /claimFit\(item, story, stepId, responding\)/.test(readFileSync(path.join(ROOT, "app", "builder", "_components", "StageAnswerPanel.tsx"), "utf8")));
  check("the financial-statement time limit is not folded on a responding step",claimFit({ what: "Serve and file a financial statement" }, PARENTING, "family:respondent:served-time-to-answer-running") === "fits");
  const startParenting = practicalFor("family:before-filing:deciding-where-to-start", "family", "", false, PARENTING);
  check(
    "starting a parenting-only case: Form 13 is folded with r. 13 (1) (a) and (b)",
    !startParenting?.forms.some((form) => form.number === "13") &&
      Boolean(startParenting?.formsIfClaimed.some((form) => form.number === "13" && /\(b\) the party against whom the claim is made/.test(form.when.cite.quote))),
  );
  const moneyWords = ["i want to lower what I pay for my kids and change the weekend schedule", "he owes me money", "the amount is $900"];
  const moneyFolded = moneyWords.filter((words) =>
    ["family:before-filing:deciding-where-to-start", "family:both:asking-to-change-final-order"].some((id) => practicalFor(id, "family", "", false, words)?.formsIfClaimed.some((form) => form.number === "13")),
  );
  check("words that show support or money never fold the financial statement", moneyFolded.length === 0, moneyFolded.join(" | "));
  const support = practicalFor("family:both:asking-to-change-final-order", "family", "Sudbury", false, "i pay 900 a month child support and want it lowered");
  check("support words: the financial statement stays a form for the step", Boolean(support?.forms.some((form) => form.number === "13")) && support?.formsIfClaimed.length === 0);
  check("no words: nothing is folded", steps.every((stage) => (practicalFor(stage.id, pathwayOf(stage) as PracticalCourt)?.formsIfClaimed.length ?? 0) === 0));

  // C6: the information program and a support-only motion to change.
  const mip = { id: "deadline:family:mip-45-days:motion-to-change", what: "Attend the mandatory information program" };
  check("a support-only motion to change does not lead with the information program", claimFit(mip, "i pay child support and want it lowered") === "not");
  check("a motion to change that touches parenting still does", claimFit(mip, "i want to change child support and the parenting schedule") === "fits");
  check("a respondent's information program is not folded by this test", claimFit({ id: "deadline:family:mip-45-days:respondent", what: mip.what }, "i pay child support") === "fits");
  check("the note quotes r. 8.1 (1) para. 6's exception", /except motions that deal only with changing child or spousal support/.test(MIP_SUPPORT_ONLY_CHANGE.cite.quote));
  check("the note says the program applies to any change other than child or spousal support", /anything other than child or spousal support/.test(MIP_SUPPORT_ONLY_CHANGE.say) && !/also asks to change parenting/.test(MIP_SUPPORT_ONLY_CHANGE.say));
  check("unknown words fold nothing", claimFit({ what: "If the application or your answer has a property claim, serve the property papers" }, "something happened") === "fits");
  check("the claims reader does not take 'never married' as a divorce", !familyClaimsIn("we were never married").divorce && familyClaimsIn("my wife and i are getting a divorce").divorce);

  // F1: every office the card names is on the courts' own location lists, and
  // a family step with a city that has one names it; before a case, none.
  const named = steps
    .filter((stage) => pathwayOf(stage) === "family")
    .flatMap((stage) => ["Barrie", "Sudbury", "Toronto", "Ottawa"].flatMap((city) => practicalFor(stage.id, "family", city)?.courtOffices?.offices ?? []));
  const unknownOffice = named.filter((office) => !COURT_LOCATIONS.some((location) => location.slug === office.from) && !OCJ_COURTHOUSES.some((courthouse) => courthouse.city === office.from));
  check("every court office named is on the courts' location lists", named.length > 0 && unknownOffice.length === 0, unknownOffice.map((office) => office.name).join(", "));
  // Review 2026-10-13: criminal and bail courthouses (Toronto Regional Bail
  // Centre, Ottawa.criminal@, yorkcrim@, Milton's "- Criminal" email, the
  // Criminal Trial Office line) were listed as family courts.
  const everyCity = Array.from(new Set([...COURT_LOCATIONS.map((location) => location.address.map((line) => /^([^,]+),\s*Ontario/.exec(line)?.[1] ?? "").find(Boolean) ?? ""), ...OCJ_COURTHOUSES.map((courthouse) => courthouse.city), "Toronto"])).filter(Boolean);
  const listed = everyCity.flatMap((city) => familyCourtOfficesIn(city));
  const criminal = listed.filter((office) => /criminal|crim@|\bbail\b|trbc/i.test([office.name, ...office.emails, ...office.address].join(" ")));
  check("no family court office listed has criminal or bail in its name, email or address (every saved city)", listed.length > 0 && criminal.length === 0, criminal.map((office) => `${office.name} ${office.emails.join(",")}`).join(" | "));
  const torontoOffices = familyCourtOfficesIn("Toronto").map((office) => office.name).join(" | ");
  check("Toronto lists the Ontario Court of Justice family courthouses (311 Jarvis, 47 Sheppard)", /311 Jarvis Family/.test(torontoOffices) && /47 Sheppard Family/.test(torontoOffices), torontoOffices);
  const ocjUnmarked = listed.filter((office) => office.court === "Ontario Court of Justice" && !OCJ_COURTHOUSES.some((courthouse) => courthouse.city === office.from && (/family/i.test(courthouse.city) || courthouse.emails.some((email) => /family/i.test(email)))));
  check("an Ontario Court of Justice entry is listed only where the saved list marks it family", ocjUnmarked.length === 0, ocjUnmarked.map((office) => office.name).join(", "));
  const scjAddress = listed.filter((office) => office.court === "Superior Court of Justice" && office.address.some((line) => !COURT_LOCATIONS.find((location) => location.slug === office.from)?.services.some((service) => service.court === "family" && service.address.includes(line))));
  check("a Superior Court office shows only its family address", scjAddress.length === 0, scjAddress.map((office) => office.name).join(", "));
  const barrie = practicalFor("family:respondent:served-time-to-answer-running", "family", "Barrie", true)?.courtOffices;
  check("a Barrie respondent is shown the Barrie family court and the r. 5 (4) rule", Boolean(barrie?.offices.some((office) => /Barrie/.test(office.name))) && barrie?.place[0]?.cite.pinpoint === "r. 5 (4)");
  const changePlace = practicalFor("family:both:asking-to-change-final-order", "family", "Sudbury")?.courtOffices?.place ?? [];
  check("a motion to change is told where it starts (r. 15 (4))", changePlace[0]?.cite.pinpoint === "r. 15 (4)");
  check(
    "r. 5 (1) is quoted with its Family Court opening, and CJA s. 21.8 (1) says the Family Court takes the case where it sits",
    changePlace.some((line) => line.cite.quote.startsWith("Subject to sections 21.8 and 21.11 of the Courts of Justice Act")) && changePlace.some((line) => line.cite.sourceId === "cja-courts-of-justice-act" && line.cite.pinpoint.startsWith("s. 21.8 (1)")),
  );
  check("no court office before a case exists", steps.filter((stage) => stage.id.startsWith("family:before-filing:")).every((stage) => !practicalFor(stage.id, "family", "Barrie")?.courtOffices));

  // F1b: the same, for Small Claims and civil (owner walkthrough 2026-10-14:
  // a real Ottawa Small Claims case was given only the generic online-portal
  // lines, never the Ottawa courthouse itself, although that city's data was
  // already saved and already verified for the family lookup above).
  const scOffices = practicalFor("plaintiff:claim-drafted-not-filed", "small-claims", "Ottawa")?.courtOffices;
  check(
    "an Ottawa Small Claims plaintiff is shown the Ottawa courthouse, with its address",
    Boolean(scOffices?.offices.some((office) => /Ottawa/.test(office.name) && office.address.some((line) => /161 Elgin/.test(line)))),
    scOffices?.offices.map((office) => `${office.name}: ${office.address.join(", ")}`).join(" | "),
  );
  const civOffices = practicalFor("civil:plaintiff:claim-drafted-not-issued", "civil", "Ottawa")?.courtOffices;
  check(
    "an Ottawa civil plaintiff is shown the Ottawa courthouse",
    Boolean(civOffices?.offices.some((office) => /Ottawa/.test(office.name))),
    civOffices?.offices.map((office) => office.name).join(" | "),
  );
  check(
    "neither Small Claims nor civil ever names an Ontario Court of Justice office (never heard there)",
    [...(scOffices?.offices ?? []), ...(civOffices?.offices ?? [])].every((office) => office.court === "Superior Court of Justice"),
  );
  check(
    "no Small Claims or civil office before a case exists",
    steps
      .filter((stage) => stage.id.startsWith("before-filing:") || stage.id.startsWith("civil:before-filing:"))
      .every((stage) => !practicalFor(stage.id, pathwayOf(stage) as PracticalCourt, "Ottawa")?.courtOffices),
  );
  const everySmallClaimsCivilOffice = everyCity.flatMap((city) => [...civilCourtOfficesIn("small-claims", city), ...civilCourtOfficesIn("civil", city)]);
  const unknownScCiv = everySmallClaimsCivilOffice.filter((office) => !COURT_LOCATIONS.some((location) => location.slug === office.from));
  check(
    "every Small Claims / civil office named is on the courts' own location list",
    everySmallClaimsCivilOffice.length > 0 && unknownScCiv.length === 0,
    unknownScCiv.map((office) => office.name).join(", "),
  );

  // F4: an enforcement step that serves a notice of garnishment says how to
  // serve the garnishee, and the debtor within five days of it.
  const garnishing = steps.filter((stage) => STEP_PRACTICAL[stage.id]?.serve === "garnishment" && pathwayOf(stage) === "small-claims");
  const noGarnishee = garnishing.filter((stage) => {
    const pins = (practicalFor(stage.id, "small-claims")?.serving ?? []).map((line) => line.cite.pinpoint);
    return !pins.includes("r. 8.01 (8) (b)") || !pins.includes("r. 20.08 (6.1)") || !pins.includes("r. 20.08 (9)");
  });
  check("no service line calls a form 'blank' (the rule does not say so)", Object.values(SERVICE).every((lines) => [...lines.originating, ...lines.ordinary, ...lines.special, ...lines.summons, ...lines.garnishment].every((line) => !/\bblank\b/i.test(line.say))));
  check("every garnishment step says how to serve the garnishee, the debtor after it, and the wage limit (r. 20.08 (9))", garnishing.length > 0 && noGarnishee.length === 0, noGarnishee.map((stage) => stage.id).join(", "));

  // F5: serving a city (r. 16.02 (1) (b)) for a claim against one; not for a neighbour; with no words, shown.
  const pins = (words: string) => (practicalFor("civil:plaintiff:claim-drafted-not-issued", "civil", "Toronto", false, words)?.serving ?? []).map((line) => line.cite.pinpoint);
  check("a claim against the city shows how to serve a municipality", pins("i slipped on the sidewalk and want to sue the city").includes("r. 16.02 (1) (b)"));
  check("a claim against a neighbour does not", !pins("my neighbour's tree fell on my car").includes("r. 16.02 (1) (b)"));
  check("with no words every service line shows", pins("").includes("r. 16.02 (1) (b)"));
  // Review 2026-10-13: a named municipality, and a municipal notice step on the case, keep it too; Small Claims has its own rule.
  check("suing a named municipality shows it ('I'm suing Brampton for flooding my basement')", pins("I'm suing Brampton for flooding my basement").includes("r. 16.02 (1) (b)"));
  check(
    "a municipal notice step on the case keeps it whatever the words; a non-municipal one does not",
    (practicalFor("plaintiff:claim-drafted-not-filed", "small-claims", "Ottawa", false, "it happened in march", "before-filing:notice-municipality")?.serving ?? []).some((line) => line.cite.pinpoint === "r. 8.02 (b)") &&
      !(practicalFor("plaintiff:claim-drafted-not-filed", "small-claims", "Ottawa", false, "it happened in march", "before-filing:notice-snow-ice-private")?.serving ?? []).some((line) => line.cite.pinpoint === "r. 8.02 (b)"),
  );
  const scPins = (words: string) => (practicalFor("plaintiff:claim-drafted-not-filed", "small-claims", "Brampton", false, words)?.serving ?? []).map((line) => line.cite.pinpoint);
  check("Small Claims: serving a municipality is r. 8.02 (b), shown for a claim against one, not for a neighbour", scPins("i am suing the town for my flooded basement").includes("r. 8.02 (b)") && !scPins("my neighbour owes me money").includes("r. 8.02 (b)") && scPins("").includes("r. 8.02 (b)"));

  // C1: the notice step says what the notice must contain and who gets it,
  // from the section itself, and names no address (no saved source gives one).
  const notice = practicalFor("civil:before-filing:notice-required-before-suing", "civil", "Toronto", false, STORIES[1]);
  check("a Toronto fall is told how to give the notice, from s. 42 (6)", Boolean(notice?.noticeHow.length) && notice!.noticeHow.every((line) => line.cite.sourceId === "city-of-toronto-act-2006"));
  const address = MORE_CARD_LINES.filter((line) => /\b\d{1,5}\s+[A-Z][a-z]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?)\b|\bM\d[A-Z]\s?\d[A-Z]\d\b/.test(line.say));
  check("no notice line states a clerk's address", address.length === 0, address.map((line) => line.say).join(" | "));
  check("every notice rule a step can show has its how-to lines", ["city-of-toronto-act-2006", "municipal-act-2001", "occupiers-liability-act"].every((id) => MORE_CARD_LINES.some((line) => line.cite.sourceId === id)));

  // C4: a bar's own "is not a bar" exceptions are what the card shows once it has passed.
  const toronto = findStage("civil:before-filing:notice-required-before-suing")?.deadlines.find((deadline) => deadline.id === "deadline:civil:toronto-notice-10-days");
  const excuses = toronto ? notABarExceptions(toronto.exceptions).map((rule) => rule.pinpoint) : [];
  check("the Toronto notice's passed-date exceptions are s. 42 (7) and (8)", excuses.join() === "s. 42 (7),s. 42 (8)", excuses.join());
  check("every 'is not a bar' line picked is one", notABarExceptions(ALL_STAGES.flatMap((stage) => stage.deadlines.flatMap((deadline) => deadline.exceptions))).every((rule) => /is not a bar/.test(rule.quote)));

  // F3: every family step with a first-instance fee note also says what the
  // Family Court branch charges, from O. Reg. 417/95 itself (saved 2026-10-14;
  // before that the note only said to ask the office).
  const branchSilent = steps
    .filter((stage) => pathwayOf(stage) === "family")
    .filter((stage) => {
      const view = practicalFor(stage.id, "family");
      return view && view.feeNotes.length > 0 && !view.feeNotes.includes(FAMILY_APPEAL_FEE_NOTE) && !view.feeNotes.some((line) => line.cite.sourceId === "oreg-417-95-family-court-fees");
    });
  check("every family step with a first-instance fee note also gives the Family Court branch's fees from O. Reg. 417/95", branchSilent.length === 0, branchSilent.map((stage) => stage.id).join(", "));
  check("no family fee note still says to ask the office for want of the regulation", ![...FAMILY_FEE_NOTES, ...FAMILY_NO_STEP_FEE].some((line) => /not saved|ask that court office/i.test(line.say)));
  const unscoped = [...FAMILY_FEE_NOTES, ...FAMILY_NO_STEP_FEE].filter((line) => !/Superior Court of Justice|Ontario Court of Justice|Family Court branch|federal/.test(line.say));
  check("each family fee line names the court it speaks for", unscoped.length === 0, unscoped.map((line) => line.say).join(" | "));

  // Walkthrough run 38500825561, SW: a notice step names the court case that
  // follows it -- the court's start rule and its fee, quoted -- and only a
  // notice step does.
  {
    const NOTICE_IDS = new Set(["municipal-act-2001", "city-of-toronto-act-2006", "occupiers-liability-act", "crown-liability-and-proceedings-act-2019", "insurance-act"]);
    const wrong: string[] = [];
    for (const [stepId, step] of Object.entries(STEP_PRACTICAL)) {
      const court: PracticalCourt = stepId.startsWith("civil:") ? "civil" : stepId.startsWith("family:") ? "family" : "small-claims";
      const isNotice = court !== "family" && step.forms.length === 0 && (step.also ?? []).some((rule) => NOTICE_IDS.has(rule.sourceId));
      const after = claimAfterNotice(stepId, court);
      if (isNotice !== after.length > 0) wrong.push(stepId);
      if (isNotice) {
        const plan = CLAIM_AFTER_NOTICE[court as "civil" | "small-claims"];
        if (!after.includes(plan.start)) wrong.push(`${stepId}: start line`);
        // Every claim fee the court charges for that document, each quoted (review 2026-10-13: $228 was missing).
        const feeLines = after.filter((line) => line.cite.sourceId === (court === "civil" ? "oreg-293-92-superior-court-fees" : "oreg-332-16-small-claims-fees"));
        if (feeLines.length !== plan.fees.length || !plan.fees.every((id) => feeLines.some((line) => line.say.includes(`$${FEES[id].amount}`)))) wrong.push(`${stepId}: fees`);
        // The start of the case comes after the notice and any wait it needs.
        if (after.indexOf(plan.start) < after.findIndex((line) => line.cite.sourceId === "crown-liability-and-proceedings-act-2019")) wrong.push(`${stepId}: order`);
      }
    }
    check("every notice step, and only those, names the form that starts the court case and its fee", wrong.length === 0, wrong.join(", "));
    check("the civil start line names Form 14A from r. 14.03 (1)", /Form 14A/.test(CLAIM_AFTER_NOTICE.civil.start.say) && /^r\. 14\.03 \(1\)/.test(CLAIM_AFTER_NOTICE.civil.start.cite.pinpoint) && /Form 14A/.test(CLAIM_AFTER_NOTICE.civil.start.cite.quote));
    const view = practicalFor("civil:before-filing:notice-required-before-suing", "civil", "Toronto", false, STORIES[1]);
    check("the Toronto notice card shows it, with the $243 issuing fee", Boolean(view?.afterNotice.some((line) => /\$243/.test(line.say))));
    check("a Small Claims notice shows both claim fees, $108 and $228", ["$108", "$228"].every((fee) => claimAfterNotice("before-filing:notice-toronto", "small-claims").some((line) => line.say.includes(fee))));
    // Review 2026-10-13 (7): the Crown's notice is 60 days BEFORE the claim (CLPA s. 18 (1)).
    const crownLines = claimAfterNotice("civil:before-filing:notice-required-before-suing", "civil", STORIES[4]);
    check("a claim against the Crown: the line says to wait 60 days after the notice, from s. 18 (1)", crownLines.some((line) => /60 days after/.test(line.say) && line.cite.pinpoint === "s. 18 (1)" && /at least 60 days before/.test(line.cite.quote)));
    check("a Toronto fall: no Crown wait line", !(view?.afterNotice ?? []).some((line) => line.cite.sourceId === "crown-liability-and-proceedings-act-2019"));
    check("with every notice shown, the Crown wait is said for a claim against the Crown only", claimAfterNotice("civil:before-filing:notice-required-before-suing", "civil").some((line) => /^If your claim is against the Ontario Crown/.test(line.say)));
    // Walkthrough 2026-10-14, SW: the $243 fee but not where to file the
    // claim or how to serve the City. Property: every notice step's "then"
    // lines carry its court's filing lines for the person's city, and the
    // court's municipal-corporation service rule exactly when every notice
    // the words keep is to a municipality.
    const fileMisses: string[] = [];
    const serveMisses: string[] = [];
    for (const [stepId] of Object.entries(STEP_PRACTICAL)) {
      const court: PracticalCourt = stepId.startsWith("civil:") ? "civil" : stepId.startsWith("family:") ? "family" : "small-claims";
      for (const city of ["Toronto", "Ottawa", ""]) {
        for (const story of STORIES) {
          const after = claimAfterNotice(stepId, court, story, city);
          if (after.length === 0) continue;
          const filing = FILING[court];
          const wanted = city === "Toronto" ? [filing.toronto] : city ? [filing.elsewhere] : [filing.toronto, filing.elsewhere];
          if (![...wanted, ...filing.more].every((line) => after.includes(line))) fileMisses.push(`${stepId} ${city || "(no city)"}`);
          const kept = (practicalFor(stepId, court, city, false, story)?.also ?? []).filter((rule) => NOTICE_IDS.has(rule.sourceId));
          const municipal = kept.length > 0 && kept.every((rule) => rule.sourceId === "municipal-act-2001" || rule.sourceId === "city-of-toronto-act-2006");
          const servesCity = after.some((line) => /^r\. (?:16\.02 \(1\) \(b\)|8\.02 \(b\))$/.test(line.cite.pinpoint) && /municipal corporation/.test(line.cite.quote));
          if (municipal !== servesCity) serveMisses.push(`${stepId} "${story}" ${city}`);
        }
      }
    }
    check("every notice step's 'then' lines say where to file the claim, for the person's city", fileMisses.length === 0, fileMisses.slice(0, 5).join("; "));
    check("and how to serve a municipality exactly when the notice kept is to one", serveMisses.length === 0, serveMisses.slice(0, 5).join("; "));
    check("the Toronto fall names r. 16.02 (1) (b)", Boolean(view?.afterNotice.some((line) => line.cite.pinpoint === "r. 16.02 (1) (b)")));
    const component = readFileSync(path.join(ROOT, "app", "_components", "NextStepPractical.tsx"), "utf8");
    const noticeAt = component.indexOf('data-testid="next-step-notice-how"');
    const ruleAt = component.indexOf('data-testid="next-step-also"');
    const afterAt = component.indexOf('data-testid="next-step-after-notice"');
    check("the card keeps the notice first: the start of the court case comes after it", noticeAt > 0 && ruleAt > noticeAt && afterAt > ruleAt);
  }

  check("no new plain line grades a case", MORE_CARD_LINES.every((line) => !/\b(strong|weak|likely|unlikely|chance|win|lose|merit)/i.test(line.say)));
}

console.log("\nThe responding wording carries its own rules (reviewer 2026-10-14)");
{
  // Every responding wording that names a form cites a rule naming it, and
  // a note about where the person lives speaks to "you", with its rule.
  const wrong = Object.entries(RESPONDING_VIEW).flatMap(([id, view]) => {
    const quotes = [view.note.cite, ...view.alsoRules].map((rule) => rule.quote).join(" ");
    const forms = [...view.what.matchAll(/Form (\d+[A-Z]?)/g)].map((match) => match[1]);
    const out: string[] = [];
    for (const form of forms) if (!quotes.includes(`(Form ${form})`)) out.push(`${id}: Form ${form} not in a cited rule`);
    if (/\bsigned consent\b/.test(view.what) && !/return a signed copy of the consent/.test(quotes)) out.push(`${id}: signed consent not in a cited rule`);
    if (/\bthey\b|\btheir\b/i.test(view.note.say)) out.push(`${id}: note speaks of "they"`);
    return out;
  });
  check("each responding wording's forms and signed consent are named in a cited rule, and its note says 'you'", wrong.length === 0, wrong.join("; "));
  const view = RESPONDING_VIEW["deadline:family:motion-to-change-response:moving-party-view"];
  check("the motion-to-change response: r. 15 (9) cited, and 'It is 60 days if you do not live in Canada or the United States' with r. 15 (10) (b)", view.alsoRules.some((rule) => rule.pinpoint.startsWith("r. 15 (9)")) && view.note.say === "It is 60 days if you do not live in Canada or the United States." && view.note.cite.pinpoint === "r. 15 (10) (b)");
}

console.log("\n9. The case's Forms tab: the step's forms lead the catalogue (walkthrough 2026-10-14)");
{
  // SW: Form 1A and the rule 2.1 dismissal forms led a sidewalk-fall
  // plaintiff's Forms tab. Property of the ordering: nothing lost, every lead
  // form before every other, the rest in their own order.
  const catalogue = ["1A", "2.1A", "2.1B", "4A", "7A", "14A", "14B", "16B", "37A", "59A"];
  let orderMisses = 0;
  for (let mask = 0; mask < 1 << catalogue.length; mask += 37) {
    const lead = catalogue.filter((_, index) => mask & (1 << index)).reverse().map((number) => `Form ${number.toLowerCase()}`);
    const out = leadFormsFirst(catalogue, (number) => number, lead);
    const isLead = (number: string) => lead.some((item) => formKey(item) === formKey(number));
    const firstOther = out.findIndex((number) => !isLead(number));
    const rest = out.filter((number) => !isLead(number));
    if (
      out.length !== catalogue.length ||
      new Set(out).size !== catalogue.length ||
      (firstOther >= 0 && out.slice(firstOther).some(isLead)) ||
      rest.join() !== catalogue.filter((number) => !isLead(number)).join()
    )
      orderMisses += 1;
  }
  check("leading forms move up, nothing is lost, the rest keep their order", orderMisses === 0, `misses ${orderMisses}`);

  // Every step: the lead forms are the step's own unfolded forms of its court,
  // plus the claim form after a notice -- never a folded one.
  const leadWrong: string[] = [];
  for (const stage of steps) {
    const court = pathwayOf(stage) as PracticalCourt;
    for (const words of ["", STORIES[1], 'my ex took me to court for custody {"issues":["parenting-time"]}']) {
      const view = practicalFor(stage.id, court, "Toronto", false, words);
      if (!view) continue;
      const own = view.forms.filter((form) => form.court === court).map((form) => form.number);
      const claim = view.afterNotice.length > 0 && court !== "family" ? [CLAIM_AFTER_NOTICE[court].form] : [];
      const want = [...own.map((number) => `${number}:For your step`), ...claim.map((number) => `${number}:After the notice`)];
      if (view.leadForms.map((lead) => `${lead.number}:${lead.label}`).join() !== want.join()) leadWrong.push(`${stage.id}`);
      if (view.formsIfClaimed.some((form) => view.leadForms.some((lead) => lead.number === form.number))) leadWrong.push(`${stage.id}: folded form leads`);
    }
  }
  check("on every step the catalogue is led by the step's own forms, then the claim form after a notice", leadWrong.length === 0, [...new Set(leadWrong)].slice(0, 5).join("; "));
  const sidewalk = practicalFor("civil:before-filing:notice-required-before-suing", "civil", "Toronto", false, STORIES[1]);
  check("the Toronto sidewalk notice step leads with Form 14A, labelled 'After the notice' (never 'For your step')", sidewalk?.leadForms[0]?.number === "14A" && sidewalk.leadForms[0].label === "After the notice");
  check("the catalogue shows each leading form's own label", /leadLabels\.get\(/.test(readFileSync(path.join(ROOT, "app", "forms", "FormsWorkspace.tsx"), "utf8")));
  check("Form 14A's start line names it", /Form 14A/.test(CLAIM_AFTER_NOTICE.civil.start.say) && /Form 7A/.test(CLAIM_AFTER_NOTICE["small-claims"].start.say));

  const formsPage = readFileSync(path.join(ROOT, "app", "cases", "[id]", "forms", "page.tsx"), "utf8");
  const workspace = readFileSync(path.join(ROOT, "app", "forms", "FormsWorkspace.tsx"), "utf8");
  check("the Forms tab passes the step's lead forms to the catalogue", /<FormsWorkspace\b[^>]*leadForms=\{practical\?\.leadForms/.test(formsPage));
  check("and shows the step section for a notice step too (afterNotice)", /practical\.afterNotice\.length > 0/.test(formsPage));
  check("the catalogue orders what it shows with leadFormsFirst", /leadFormsFirst\(kept,/.test(workspace) && /return leadFormsFirst/.test(workspace));
}

console.log("\nWalkthrough run 38525903567, FR: the fees for a parenting-only answer, and Form 35.1");
{
  const FR = "my ex gf took me to court for custody of our daugter, i got served the papers last week. she wants sole custody and wants to move to ottawa with her. i want joint custody and to keep my time with her.";
  const STEP = "family:respondent:served-time-to-answer-running";
  const fr = practicalFor(STEP, "family", "Barrie", true, FR)!;
  const flat = (text: string) => text.replace(/\s+/g, " ");
  const fees293 = flat(readFileSync(path.join(ROOT, "docs", "sources", "corpus", "oreg-293-92-superior-court-fees.txt"), "utf8"));
  const fees417 = flat(readFileSync(path.join(ROOT, "docs", "sources", "corpus", "oreg-417-95-family-court-fees.txt"), "utf8"));
  check(
    "the no-fee rules are in the saved regulations: O. Reg. 293/92 s. 1.2 (2) (a) and O. Reg. 417/95 s. 2 (a)",
    fees293.includes("no fees are payable for the filing of an application, the filing of an answer or the placing of an application on the list for hearing in respect of, (a) proceedings under the Children’s Law Reform Act, the Family Law Act (except Parts I and II)") &&
      fees417.includes("(a) proceedings under the Child, Youth and Family Services Act, 2017, the Children’s Law Reform Act, the Family Law Act (except Parts I and II)"),
  );
  check("FR: the no-fee rules lead, both regulations", fr.feeNotesFirst && fr.feeNotes.some((line) => line.cite.pinpoint === "s. 1.2 (2)") && fr.feeNotes.some((line) => line.cite.pinpoint === "s. 2 (a)"));
  check("FR: nothing leading the fees states an amount", fr.fees.length === 0 && fr.feeNotes.every((line) => !/\$\d/.test(line.say)));
  check(
    "FR: the amounts are folded, every one kept (the answer fee, the branch's fees, the divorce fee, the waiver)",
    Boolean(fr.feesIfClaimed) &&
      fr.feesIfClaimed!.fees.length === STEP_PRACTICAL[STEP].fees.length &&
      fr.feesIfClaimed!.notes.some((line) => /\$214/.test(line.say)) &&
      fr.feesIfClaimed!.waiver !== null,
  );
  check(
    "the fold's condition is what the exemption leaves out (a divorce, property, the home), never support",
    /divorce/.test(FEES_IF_CLAIMED_LABEL) && /property/.test(FEES_IF_CLAIMED_LABEL) && /matrimonial home/.test(FEES_IF_CLAIMED_LABEL) && !/support/.test(FEES_IF_CLAIMED_LABEL),
  );
  for (const [why, words] of [["property", "she wants the house and my pension and custody"], ["a divorce", "my wife wants a divorce and custody"], ["no words", ""], ["support", "custody and child support"]] as const) {
    const view = practicalFor(STEP, "family", "Barrie", true, words)!;
    check(`with ${why}: nothing is folded and every fee shows`, view.feesIfClaimed === null && view.fees.length === STEP_PRACTICAL[STEP].fees.length);
  }
  const component = readFileSync(path.join(ROOT, "app", "_components", "NextStepPractical.tsx"), "utf8");
  check("the card shows the folded fees under the condition", /data-testid="next-step-fees-if-claimed"[\s\S]{0,300}\{FEES_IF_CLAIMED_LABEL\}/.test(component));
  // 8: Form 35.1 with a parenting answer, r. 35.1 (1).
  const flr = flat(readFileSync(path.join(ROOT, "docs", "sources", "corpus", "family-law-rules.txt"), "utf8"));
  check(
    "r. 35.1 (1) in the saved rules: an answer claiming parenting comes with an affidavit in Form 35.1",
    flr.includes("If an application, answer or motion to change a final order contains a claim respecting decision-making responsibility, parenting time or contact with respect to a child, the party making the claim shall serve and file with the document that contains the claim, (a) an affidavit in Form 35.1"),
  );
  const affidavit = fr.forms.find((form) => form.number === "35.1");
  check("FR: Form 35.1 is a form for his answer, with r. 35.1 (1) beside it", Boolean(affidavit) && affidavit!.note?.cite.pinpoint === "r. 35.1 (1)");
  check("FR: Form 13 stays, with r. 13 (1) (b) beside it", fr.forms.some((form) => form.number === "13" && form.note?.cite.pinpoint === "r. 13 (1) (b)"));
  const supportOnly = practicalFor(STEP, "family", "Barrie", true, "she wants more child support")!;
  check("words with no parenting claim: Form 35.1 is folded with its rule, never dropped", !supportOnly.forms.some((form) => form.number === "35.1") && supportOnly.formsIfClaimed.some((form) => form.number === "35.1" && form.when.cite.pinpoint === "r. 35.1 (1)"));
  // The shared reading is unchanged by the information program's stricter test (re-review of 7f2868f).
  for (const words of ["i want my daughter to live with me", "she won't let me see my son"]) {
    const view = practicalFor(STEP, "family", "Barrie", true, words)!;
    check(`'${words}': Form 35.1 is a form for the answer, the fees are folded, Form 13 stays`, view.forms.some((form) => form.number === "35.1") && Boolean(view.feesIfClaimed) && view.forms.some((form) => form.number === "13"));
  }
  check("no words: Form 35.1 is listed", Boolean(practicalFor(STEP, "family", "Barrie", true)?.forms.some((form) => form.number === "35.1")));
}

console.log("\n10. A deadline too close to file online, and mail near the deadline (walkthrough run 38525903567, SD)");
{
  // The quotes these lines carry are in the saved text, word for word.
  const timedLines: PlainLine[] = [
    ...mailTimingLines("2026-10-14", "2026-10-19"),
    tooCloseFilingLine("small-claims", "2026-10-14", "2026-10-19")!,
    tooCloseFilingLine("civil", "2026-10-14", "2026-10-19")!,
  ];
  const absent = timedLines.flatMap((line) =>
    line.cite.quote.split(" ... ").filter((run) => !(corpus.get(line.cite.sourceId) ?? "").includes(flat(run))).map((run) => `${line.cite.pinpoint}: ${run.slice(0, 60)}`),
  );
  check("every timing line's quote is in the saved text", absent.length === 0, absent.join("; "));
  check("each timing line's source has its saved date", timedLines.every((line) => SOURCE_SAVED_ON[line.cite.sourceId] === savedOn.get(line.cite.sourceId)));

  // How "away" is counted, worked from the guide's own example: outside
  // Toronto, a court date on Tuesday February 9 cannot be met online after
  // Wednesday February 3. Every year in which February 9 is a Tuesday must
  // give exactly that: open on the 3rd, closed from the 4th.
  const smallClaimsGuide = corpus.get("ontario-file-small-claims-online") ?? "";
  check(
    "the guide's example is in the saved text",
    smallClaimsGuide.includes("if your court date is on Tuesday, February 9 , you cannot submit documents online after Wednesday, February 3"),
  );
  const tuesdays = Array.from({ length: 30 }, (_, index) => 2020 + index).filter((year) => dayOfWeek(`${year}-02-09`) === 2);
  const exampleMisses = tuesdays.filter(
    (year) => tooCloseToFileOnline(`${year}-02-03`, `${year}-02-09`) || !tooCloseToFileOnline(`${year}-02-04`, `${year}-02-09`),
  );
  check(`the count fits the guide's example in all ${tuesdays.length} such years`, tuesdays.length > 0 && exampleMisses.length === 0, exampleMisses.join(", "));

  // A business day is never a weekend, a holiday in either calendar, or an announced closure.
  const notBusiness: string[] = [];
  for (let day = "2026-01-01"; day <= "2027-12-31"; day = addDays(day, 1)) {
    const closed = dayOfWeek(day) === 0 || dayOfWeek(day) === 6 || holidayFor(day, "small-claims-rules") || holidayFor(day, "legislation-act");
    if (closed && isCourtBusinessDay(day)) notBusiness.push(day);
  }
  check("no weekend or holiday (either calendar) is a business day, 2026-2027", notBusiness.length === 0, notBusiness.slice(0, 5).join(", "));
  check("an announced court closure (30 September 2026) is not a business day", !isCourtBusinessDay("2026-09-30"));

  // The SD case: Wednesday 14 October, last day Monday 19 October.
  const sd = practicalFor("defendant:served-defence-period-running", "small-claims", "", true, "i got the plaintiffs claim in the mail on september 28", "", { deadline: "2026-10-19", serveBy: "2026-10-19", today: "2026-10-14" });
  const sdFiling = sd?.filing ?? [];
  check(
    "SD: 3 business days away -- no online-portal line, one line saying not to file online",
    businessDaysAway("2026-10-14", "2026-10-19") === 3 &&
      sdFiling.length === 1 &&
      !sdFiling.some((line) => line === FILING["small-claims"].toronto || line === FILING["small-claims"].elsewhere) &&
      /cannot file online/.test(sdFiling[0].say),
    sdFiling.map((line) => line.say).join(" | "),
  );
  // Only the ways the guide names, each in its quote.
  const ways = ["in person", "by mail", "by email"];
  check(
    "SD: the other ways named are exactly the guide's, and each is in its quote",
    ways.every((way) => sdFiling[0]?.say.includes(way) && sdFiling[0].cite.quote.includes(way.replace("in person", "in person at the courthouse"))),
  );

  // A property over many pairs: too close (or passed) never shows a portal line; otherwise it does.
  const portalWrong: string[] = [];
  for (const court of ["small-claims", "civil"] as PracticalCourt[]) {
    const stepId = steps.find((stage) => pathwayOf(stage) === court && STEP_PRACTICAL[stage.id]?.files)?.id ?? "";
    for (let today = "2026-09-20"; today <= "2026-12-31"; today = addDays(today, 3)) {
      for (const ahead of [-2, 0, 1, 2, 3, 4, 5, 6, 8, 12]) {
        const deadline = addDays(today, ahead);
        const filing = practicalFor(stepId, court, "Ottawa", false, "", "", { deadline, today })?.filing ?? [];
        const portal = filing.includes(FILING[court].elsewhere);
        // A passed day is not "3 business days or less away" (review of bee9daf): the portal lines stay.
        const close = deadline >= today && businessDaysAway(today, deadline) <= 3;
        if (close === portal) portalWrong.push(`${court} ${today}->${deadline}`);
      }
    }
  }
  check("too close: no portal line; otherwise (passed included) the portal line (two courts, ~1000 date pairs)", portalWrong.length === 0, portalWrong.slice(0, 4).join("; "));
  const familyFiling = practicalFor("family:respondent:served-time-to-answer-running", "family", "Ottawa", true, "", "", { deadline: "2026-10-15", today: "2026-10-14" })?.filing ?? [];
  check("family: no saved business-day rule, so the family filing lines are unchanged", familyFiling.includes(FILING.family.elsewhere));
  const untimed = practicalFor("defendant:served-defence-period-running", "small-claims", "Ottawa", true)?.filing ?? [];
  check("no counted date: the portal lines are unchanged", untimed.includes(FILING["small-claims"].elsewhere));

  // Mail near the deadline.
  const sdServing = sd?.serving ?? [];
  const mail = sdServing.find((line) => line.cite.pinpoint === "r. 8.07 (2)" && /fifth day/.test(line.say) && /last day/.test(line.say));
  // 14 October + 5 = 19 October, the last day itself: today is the last day to mail it.
  check(
    "SD: the mail line says the fifth day rule and that today is the last day to mail it",
    Boolean(mail) && mail!.say.includes(`no later than today, ${formatLongDate("2026-10-14")}`) && mail!.say.includes(formatLongDate("2026-10-19")),
    mail?.say,
  );
  check(
    "a day later, mail counts after the last day, with the dates",
    /after your last day/.test(mailTimingLines("2026-10-15", "2026-10-19")[0]?.say ?? "") && (mailTimingLines("2026-10-15", "2026-10-19")[0]?.say ?? "").includes(formatLongDate("2026-10-20")),
  );
  check(
    "SD: the sooner ways (email, in person) are shown, each with its rule",
    SC_SOONER_WAYS.every((line) => sdServing.includes(line)) && sdServing.some((line) => line.cite.pinpoint === "r. 8.07.1 (2)"),
  );
  // Property: "after your last day" exactly when the fifth day after today is past the deadline; the last mailing day is five days before.
  const mailWrong: string[] = [];
  for (let today = "2026-10-01"; today <= "2026-11-30"; today = addDays(today, 1)) {
    for (const ahead of [0, 3, 5, 6, 10, 20]) {
      const deadline = addDays(today, ahead);
      const first = mailTimingLines(today, deadline)[0];
      const late = addDays(today, 5) > deadline;
      if (!first || /after your last day/.test(first.say) !== late) mailWrong.push(`${today}->${deadline}`);
      if (first && !late && !first.say.includes(formatLongDate(addDays(deadline, -5)))) mailWrong.push(`${today}->${deadline} last mailing day`);
    }
  }
  check("mail timing: late exactly when mailed today counts after the last day (60 days x 6)", mailWrong.length === 0, mailWrong.slice(0, 4).join("; "));
  check("a passed deadline gets no mail timing", mailTimingLines("2026-10-20", "2026-10-19").length === 0);
  const mailOnly = (stepId: string, court: PracticalCourt) =>
    (practicalFor(stepId, court, "Ottawa", false, "", "", { deadline: "2026-10-19", serveBy: "2026-10-19", today: "2026-10-14" })?.serving ?? []).some((line) => line.cite === SC_MAIL_RULE && /fifth day/.test(line.say) && /last day/.test(line.say));
  const wrongPlace = steps
    .filter((stage) => mailOnly(stage.id, pathwayOf(stage) as PracticalCourt) !== (pathwayOf(stage) === "small-claims" && STEP_PRACTICAL[stage.id]?.serve === "ordinary"))
    .map((stage) => stage.id);
  check("mail timing only on Small Claims steps served the ordinary way", wrongPlace.length === 0, wrongPlace.slice(0, 5).join(", "));

  // A passed day never says "do not file online" (review of bee9daf).
  check("a passed deadline gets no too-close line", tooCloseFilingLine("small-claims", "2026-10-20", "2026-10-19") === null && tooCloseFilingLine("civil", "2026-10-20", "2026-10-19") === null);
  // Hedged whenever a weekday holiday decided it (re-review of 6a0fce6):
  // Civic Holiday (one calendar) and Easter 2027 (both calendars).
  const civic = tooCloseFilingLine("small-claims", "2026-07-30", "2026-08-05");
  const easter = tooCloseFilingLine("small-claims", "2027-03-24", "2027-03-31");
  check(
    "a result that turns on a weekday holiday is hedged ('may be'), in either calendar or both; SD is not",
    tooCloseOnlyByHoliday("2026-07-30", "2026-08-05") && /\bmay be 3 business days away or less\b/.test(civic?.say ?? "") &&
      /\bmay be 3 business days away or less\b/.test(easter?.say ?? "") && /If so, file it in person at the courthouse, by mail or by email instead\./.test(easter?.say ?? "") &&
      !/\bmay be\b/.test(sdFiling[0]?.say ?? ""),
    `${civic?.say} | ${easter?.say}`,
  );
  const hedgeWrong: string[] = [];
  for (let today = "2026-01-01"; today <= "2027-12-31"; today = addDays(today, 2)) {
    for (const ahead of [1, 3, 4, 5, 6, 7]) {
      const deadline = addDays(today, ahead);
      const line = tooCloseFilingLine("small-claims", today, deadline);
      const hedged = Boolean(line && /\bmay be\b/.test(line.say));
      if (line && hedged !== (businessDaysAway(today, deadline, false) > 3)) hedgeWrong.push(`${today}->${deadline}`);
    }
  }
  check("hedged exactly when counting every weekday (closures aside) would put it past 3 (2026-2027)", hedgeWrong.length === 0, hedgeWrong.slice(0, 4).join("; "));
  check(
    "the in-person line says 'if they are an individual', and r. 8.02 (c) gives a corporation's way",
    SC_SOONER_WAYS.some((line) => line.cite.pinpoint === "r. 8.02 (a)" && /if they are an individual/.test(line.say)) &&
      SC_SOONER_WAYS.some((line) => line.cite.pinpoint === "r. 8.02 (c)" && /corporation/.test(line.say)),
  );

  // Only the person's own serve-or-file deadlines time these lines (review of bee9daf).
  const listedWrong: string[] = [];
  // A listed deadline whose own words do not say "file", and the saved rule that says the document is filed.
  const FILES_BY_RULE: Record<string, { sourceId: string; quote: string }> = {
    "deadline:civil:after-lawyer-removed-30-days": {
      sourceId: "rules-of-civil-procedure",
      quote: "A party acting in person may appoint a lawyer of record by serving on every other party and filing, with proof of service, a notice of appointment of lawyer (Form 15B)",
    },
  };
  const ruleMissing = Object.entries(FILES_BY_RULE).filter(([, rule]) => !(corpus.get(rule.sourceId) ?? "").includes(flat(rule.quote))).map(([id]) => id);
  check("r. 15.03 (2): the Form 15B notice is served and filed with proof of service (saved text)", ruleMissing.length === 0 && (corpus.get("rules-of-civil-procedure") ?? "").includes(flat("elect to act in person by serving on the lawyer and every other party and filing, with proof of service, a notice of intention to act in person (Form 15C)")), ruleMissing.join(", "));
  const scDeadlines = steps.filter((stage) => pathwayOf(stage) === "small-claims" || pathwayOf(stage) === "civil").flatMap((stage) => stage.deadlines);
  for (const [id, kind] of Object.entries(PERSON_SERVE_OR_FILE)) {
    const found = scDeadlines.filter((deadline) => deadline.id === id);
    if (found.length === 0) listedWrong.push(`${id}: not a Small Claims or civil deadline`);
    for (const deadline of found) {
      if ((deadline.actor ?? "reader") !== "reader") listedWrong.push(`${id}: binds ${deadline.actor}`);
      if (deadline.threshold) listedWrong.push(`${id}: a leave threshold`);
      if (kind.serves && !/\bserv(?:e|ed|ing)\b/i.test(deadline.what)) listedWrong.push(`${id}: its words do not say serve`);
      if (kind.files && !FILES_BY_RULE[id] && !/\b(?:file|filing|start a court case|start the action|deliver|motion|request|registrar|set (?:it|the action) down|restored? to a trial list|issued?|respond)\b/i.test(deadline.what)) listedWrong.push(`${id}: its words do not say file, deliver, issue, a motion or a request`);
      if (kind.serves && /\b(?:claim \(Form 7A|summons)\b/i.test(deadline.what)) listedWrong.push(`${id}: a claim or summons is not mailed`);
    }
  }
  check("every listed deadline is the person's own, not a threshold, and says serve or file in its own words", listedWrong.length === 0, listedWrong.join("; "));
  // Completeness (re-review of 6a0fce6): every Small Claims and civil deadline is classified, once.
  const unclassified = [...new Set(scDeadlines.map((deadline) => deadline.id))].filter((id) => Boolean(PERSON_SERVE_OR_FILE[id]) === Boolean(NOT_TIMED[id]));
  check(
    `every Small Claims and civil deadline is listed or declared not timed, with a reason, never both (${new Set(scDeadlines.map((deadline) => deadline.id)).size} deadlines)`,
    unclassified.length === 0 && Object.values(NOT_TIMED).every((reason) => reason.trim().length > 20),
    unclassified.join(", "),
  );
  const stray = Object.keys(NOT_TIMED).filter((id) => !scDeadlines.some((deadline) => deadline.id === id));
  check("no reason is kept for a deadline that no longer exists", stray.length === 0, stray.join(", "));
  const civilServes = Object.entries(PERSON_SERVE_OR_FILE).filter(([id, kind]) => id.startsWith("deadline:civil:") && kind.serves).map(([id]) => id);
  check("civil deadlines time only the filing line (mail timing is Small Claims only)", civilServes.length === 0, civilServes.join(", "));
  // The probe: learned of the judgment 16 September, today 14 October; r. 17.01 (5) (a) gives 30 days.
  const missedTrial = findStage("both:missed-trial")!.deadlines.find((deadline) => deadline.id === "deadline:set-aside-after-missed-trial")!;
  const counted = computedDeadlinesFor([missedTrial], caseDatesFrom({ [DEADLINE_EVENTS[missedTrial.countFromEvent as keyof typeof DEADLINE_EVENTS]?.questionId ?? ""]: "2026-09-16" }), "probe");
  const probeLine = practicalFor("both:missed-trial", "small-claims", "Ottawa", true, "", "", { deadline: personDeadlineOf(counted.map((entry) => ({ id: entry.deadlineId, date: entry.date })), "files"), today: "2026-10-14" })?.filing ?? [];
  check(
    "probe: a missed trial learned of on 16 September, today 14 October: last day Friday 16 October, and the card says not to file online",
    counted[0]?.date === "2026-10-16" && probeLine.length === 1 && /cannot file online/.test(probeLine[0].say),
    `${counted[0]?.date} | ${probeLine.map((line) => line.say).join(" | ")}`,
  );
  // For every Small Claims step: whatever is counted, the timed deadline is a serve-or-file deadline of the person.
  const timedWrong: string[] = [];
  for (const stage of steps.filter((candidate) => pathwayOf(candidate) === "small-claims")) {
    const counted = stage.deadlines.map((deadline, index) => ({ id: deadline.id, date: addDays("2026-10-15", index) }));
    for (const kind of ["files", "serves"] as const) {
      const picked = personDeadlineOf(counted, kind);
      if (!picked) continue;
      const deadline = stage.deadlines[counted.findIndex((item) => item.date === picked)];
      // Issuing is filing (third review), never serving.
      if ((deadline.actor ?? "reader") !== "reader" || deadline.threshold || (kind === "serves" && /\bissued?\b/i.test(deadline.what) && !/\bserv/i.test(deadline.what)) || /\bcourt holds\b/i.test(deadline.what))
        timedWrong.push(`${stage.id}: ${kind} timed by ${deadline.id}`);
    }
  }
  check("on every Small Claims step the timed deadline, if any, is a serve-or-file deadline of the person", timedWrong.length === 0, timedWrong.join("; "));
  const court90 = steps.find((stage) => stage.id === "plaintiff:defence-filed")!.deadlines.map((deadline) => ({ id: deadline.id, date: "2026-10-15" }));
  check("plaintiff:defence-filed: the court's 90-day target times neither line", personDeadlineOf(court90.filter((item) => /settlement-conference-90/.test(item.id)), "files") === "" && personDeadlineOf(court90.filter((item) => /settlement-conference-90/.test(item.id)), "serves") === "");
  const issueOnly = steps.find((stage) => stage.id === "defendant:defence-filed")!.deadlines.filter((deadline) => /issue-defendants-claim/.test(deadline.id)).map((deadline) => ({ id: deadline.id, date: "2026-10-15" }));
  check("defendant:defence-filed: a defendant's claim (filed to be issued) times the filing line, never the mail timing", issueOnly.length > 0 && personDeadlineOf(issueOnly, "files") === "2026-10-15" && personDeadlineOf(issueOnly, "serves") === "");
  const nowFiles = ["deadline:issue-defendants-claim-20-days", "deadline:issue-defendants-claim-20-days:defence-filed", "deadline:civil:third-party-claim-10-days", "deadline:civil:third-party-claim-10-days:defence-delivered", "deadline:civil:after-lawyer-removed-30-days", "deadline:civil:respond-to-amended-pleading"];
  check("the defendant's claim, a third party claim, the notice after a lawyer's removal and a response to an amended pleading are filing deadlines, not mail-timed", nowFiles.every((id) => PERSON_SERVE_OR_FILE[id]?.files === true && PERSON_SERVE_OR_FILE[id]?.serves === false && !NOT_TIMED[id]));
  // Appeals: the guide covers the Divisional Court, not the Court of Appeal.
  const appealIds = [...DIVISIONAL_COURT_ONLY];
  check("the r. 61 appeal deadlines are marked Divisional Court only; the r. 61.03.1 and r. 62.01 ones are not", appealIds.length === 6 && appealIds.every((id) => PERSON_SERVE_OR_FILE[id]?.files) && !DIVISIONAL_COURT_ONLY.has("deadline:civil:leave-motion-response-25-days") && !DIVISIONAL_COURT_ONLY.has("deadline:civil:associate-judge-appeal-record-7-days"));
  const appealItems = [{ id: "deadline:civil:file-notice-of-appeal-10-days", date: "2026-10-16" }];
  const appealFiling = practicalFor("civil:both:judgment-given", "civil", "Ottawa", false, "", "", { deadline: "2026-10-16", today: "2026-10-14", divisionalOnly: filingDeadlineDivisionalOnly(appealItems) })?.filing ?? [];
  check(
    "an appeal deadline too close says 'If your appeal is in the Divisional Court', and keeps the portal line",
    filingDeadlineDivisionalOnly(appealItems) && appealFiling.includes(FILING.civil.elsewhere) && appealFiling.some((line) => /^If your appeal is in the Divisional Court, your last day/.test(line.say)),
    appealFiling.map((line) => line.say).join(" | "),
  );
  check("a non-appeal civil deadline is not hedged to the Divisional Court", !filingDeadlineDivisionalOnly([{ id: "deadline:civil:defence", date: "2026-10-16" }]));

  // The defendant's claim fee, only if they make one (walkthrough run 38525903567, SD).
  const sdFees = sd?.fees ?? [];
  const dc = sdFees.find((fee) => /defendant's claim/i.test(fee.label));
  check(
    "SD: the defendant's claim fee is shown, conditional, with para. 3's amount",
    Boolean(dc) && /^Only if\b/.test(dc!.label) && dc!.cite.pinpoint === "s. 1 (2), para. 3" && dc!.cite.quote.includes(`$${dc!.amount}`),
    dc ? `${dc.label} $${dc.amount}` : "none",
  );
}

console.log("\n9b. The Forms tab never says it could not match forms while it lists forms for the step (walkthrough run 38525903567, SJ)");
{
  const unsupported = [{ supported: false, reason: "no-rules-for-stage", stage: "enforcement" }, { supported: false, reason: "no-stage-supplied" }];
  const contradicts: string[] = [];
  for (const support of unsupported) {
    for (const leadCount of [0, 1, 9]) {
      const note = formsStageNote(support, leadCount);
      if (!note) contradicts.push(`${support.reason}/${leadCount}: no note`);
      else if (leadCount > 0 && (/could not match|No form-routing rules|no form-routing rules have been checked/i.test(`${note.note} ${note.help ?? ""}`) || !/for your step/i.test(note.note)))
        contradicts.push(`${support.reason}/${leadCount}: ${note.note}`);
      else if (leadCount === 0 && !note.help) contradicts.push(`${support.reason}/0: no help line`);
      if (note && /no forms? appl(?:y|ies) to you(?!\s*[—-])/i.test(note.note.replace(/not a finding that no forms apply to you/, ""))) contradicts.push("says no form applies");
    }
  }
  check("with the step's forms listed, the note points to them and never says it could not match; without, it says so and offers help", contradicts.length === 0, contradicts.join(" | "));
  check("a stage the rules cover gets no note", formsStageNote({ supported: true }, 0) === null);
  const workspace = readFileSync(path.join(ROOT, "app", "forms", "FormsWorkspace.tsx"), "utf8");
  check("the Forms tab takes its note from formsStageNote with the lead forms", /formsStageNote\(stageSupport, leadForms\.length\)/.test(workspace) && !/We could not match forms/.test(workspace));
}

console.log("\n11. An employer named only vaguely: the garnishee and the examination (walkthrough run 38525903567, SJ)");
{
  const sjStory = "I won my small claims case against my old roommate in May. The judge said he owes me 6500 plus costs. It's been months, and he hasn't paid anything. He works at a car dealership in Kanata, I think.";
  const sj = practicalFor("plaintiff:judgment-in-my-favour-unpaid", "small-claims", "Ottawa", false, sjStory);
  check(
    "SJ: the card quotes his sentence and sets out naming the garnishee and the examination",
    sj?.garnishee?.quote === "He works at a car dealership in Kanata, I think." &&
      sj.garnishee.lines.some((line) => /r\. 20\.08 \(3\)/.test(line.cite.pinpoint) && /name and address of the named garnishee/.test(line.cite.quote)) &&
      sj.garnishee.lines.some((line) => /r\. 20\.10 \(1\)/.test(line.cite.pinpoint) && /Form 20H/.test(line.say)),
    JSON.stringify(sj?.garnishee?.quote),
  );
  // What the rules provide, never a pick and never a prediction of collecting.
  const pushy = GARNISHEE_NOT_NAMED.filter((line) => /\b(?:should|best|recommend|will (?:get|collect|recover)|likely|chance|guarantee|collect(?:ed)? the|get paid)\b/i.test(line.say)).map((line) => line.say);
  check("the garnishee lines neither choose for the person nor predict collecting", pushy.length === 0, pushy.join(" | "));
  const vague = [
    "he works at a car dealership in kanata i think",
    "She works for some company downtown.",
    "I believe he is employed at a restaurant in Barrie.",
  ];
  const named = ["He works at Kanata Toyota on Hazeldean Road.", "my roommate never paid me back", "he is a mechanic"];
  check("vague workplaces are read as vague", vague.every((story) => vagueEmployerSentence(story) !== null));
  check("a named employer, or no job at all, is not", named.every((story) => vagueEmployerSentence(story) === null));
  const notGarnishing = steps.filter((stage) => STEP_PRACTICAL[stage.id]?.serve !== "garnishment").filter((stage) => practicalFor(stage.id, pathwayOf(stage) as PracticalCourt, "Ottawa", false, sjStory)?.garnishee).map((stage) => stage.id);
  check("only a garnishment step shows them", notGarnishing.length === 0, notGarnishing.join(", "));
  const nextStepPracticalUi = readFileSync(path.join(ROOT, "app", "_components", "NextStepPractical.tsx"), "utf8");
  check("the card renders them with the person's own words", /data-testid="next-step-garnishee"/.test(nextStepPracticalUi) && /You wrote: “\{view\.garnishee\.quote\}”/.test(nextStepPracticalUi));
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
