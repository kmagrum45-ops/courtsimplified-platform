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
  SC_NO_STEP_FEE,
  limitNotesFor,
  MORE_CARD_LINES,
  MIP_SUPPORT_ONLY_CHANGE,
  claimFit,
  familyClaimsIn,
  notABarExceptions,
} from "../../src/lib/content-library/nextStepPractical";
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
  check("reordering never removes a fee", [parenting, property, plain].every((view) => view?.fees.length === STEP_PRACTICAL["family:respondent:served-time-to-answer-running"].fees.length));

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
  check(
    "parenting-only words: the support financial statement is folded under r. 13 (1)",
    !parenting?.forms.some((form) => form.number === "13") && Boolean(parenting?.formsIfClaimed.some((form) => form.number === "13" && form.when.cite.pinpoint === "r. 13 (1)")),
  );
  const support = practicalFor("family:both:asking-to-change-final-order", "family", "Sudbury", false, "i pay 900 a month child support and want it lowered");
  check("support words: the financial statement stays a form for the step", Boolean(support?.forms.some((form) => form.number === "13")) && support?.formsIfClaimed.length === 0);
  check("no words: nothing is folded", steps.every((stage) => (practicalFor(stage.id, pathwayOf(stage) as PracticalCourt)?.formsIfClaimed.length ?? 0) === 0));

  // C6: the information program and a support-only motion to change.
  const mip = { id: "deadline:family:mip-45-days:motion-to-change", what: "Attend the mandatory information program" };
  check("a support-only motion to change does not lead with the information program", claimFit(mip, "i pay child support and want it lowered") === "not");
  check("a motion to change that touches parenting still does", claimFit(mip, "i want to change child support and the parenting schedule") === "fits");
  check("a respondent's information program is not folded by this test", claimFit({ id: "deadline:family:mip-45-days:respondent", what: mip.what }, "i pay child support") === "fits");
  check("the note quotes r. 8.1 (1) para. 6's exception", /except motions that deal only with changing child or spousal support/.test(MIP_SUPPORT_ONLY_CHANGE.cite.quote));
  check("unknown words fold nothing", claimFit({ what: "If the application or your answer has a property claim, serve the property papers" }, "something happened") === "fits");
  check("the claims reader does not take 'never married' as a divorce", !familyClaimsIn("we were never married").divorce && familyClaimsIn("my wife and i are getting a divorce").divorce);

  // F1: every office the card names is on the courts' own location lists, and
  // a family step with a city that has one names it; before a case, none.
  const named = steps
    .filter((stage) => pathwayOf(stage) === "family")
    .flatMap((stage) => ["Barrie", "Sudbury", "Toronto", "Ottawa"].flatMap((city) => practicalFor(stage.id, "family", city)?.courtOffices?.offices ?? []));
  const unknownOffice = named.filter((office) => !COURT_LOCATIONS.some((location) => location.name === office.name) && !OCJ_COURTHOUSES.some((courthouse) => office.name === `Ontario Court of Justice, ${courthouse.city}`));
  check("every court office named is on the courts' location lists", named.length > 0 && unknownOffice.length === 0, unknownOffice.map((office) => office.name).join(", "));
  const barrie = practicalFor("family:respondent:served-time-to-answer-running", "family", "Barrie", true)?.courtOffices;
  check("a Barrie respondent is shown the Barrie family court and the r. 5 (4) rule", Boolean(barrie?.offices.some((office) => /Barrie/.test(office.name))) && barrie?.place[0]?.cite.pinpoint === "r. 5 (4)");
  check("a motion to change is told where it starts (r. 15 (4))", practicalFor("family:both:asking-to-change-final-order", "family", "Sudbury")?.courtOffices?.place[0]?.cite.pinpoint === "r. 15 (4)");
  check("no court office before a case exists", steps.filter((stage) => stage.id.startsWith("family:before-filing:")).every((stage) => !practicalFor(stage.id, "family", "Barrie")?.courtOffices));

  // F4: an enforcement step that serves a notice of garnishment says how to
  // serve the garnishee, and the debtor within five days of it.
  const garnishing = steps.filter((stage) => STEP_PRACTICAL[stage.id]?.serve === "garnishment" && pathwayOf(stage) === "small-claims");
  const noGarnishee = garnishing.filter((stage) => {
    const pins = (practicalFor(stage.id, "small-claims")?.serving ?? []).map((line) => line.cite.pinpoint);
    return !pins.includes("r. 8.01 (8) (b)") || !pins.includes("r. 20.08 (6.1)");
  });
  check("every garnishment step says how to serve the garnishee, and the debtor after it", garnishing.length > 0 && noGarnishee.length === 0, noGarnishee.map((stage) => stage.id).join(", "));

  // F5: serving a city (r. 16.02 (1) (b)) for a claim against one; not for a neighbour; with no words, shown.
  const pins = (words: string) => (practicalFor("civil:plaintiff:claim-drafted-not-issued", "civil", "Toronto", false, words)?.serving ?? []).map((line) => line.cite.pinpoint);
  check("a claim against the city shows how to serve a municipality", pins("i slipped on the sidewalk and want to sue the city").includes("r. 16.02 (1) (b)"));
  check("a claim against a neighbour does not", !pins("my neighbour's tree fell on my car").includes("r. 16.02 (1) (b)"));
  check("with no words every service line shows", pins("").includes("r. 16.02 (1) (b)"));

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

  check("no new plain line grades a case", MORE_CARD_LINES.every((line) => !/\b(strong|weak|likely|unlikely|chance|win|lose|merit)/i.test(line.say)));
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
