/**
 * A SUGGESTION IS OFFERED, NEVER PRE-TICKED, WITH THE ONE CONTROL (owner's Chrome check, 31 Oct).
 *
 * The owner's rule: a suggestion read from the person's story, or made by the site, is OFFERED, never
 * pre-ticked, pre-selected or pre-filled, in all three courts. Everywhere it is offered with the same
 * control, three choices since 14 Nov 2026 (Chrome check of #550, 2.4 and 8.3: what is offered, then "Yes", "No,
 * that's not right", "I'm not sure"; "Use the suggestion" is no longer a label): ONE component
 * (app/_components/UseSuggestion.tsx) and ONE copy (src/lib/case-system/copy/suggestionCopy.ts). The person uses it or
 * ignores it (CLAUDE.md s. 4).
 *
 * What it checks, from the source:
 *   1. The component renders the shared copy (the three choices) and marks its Yes `data-use-suggestion`; no screen
 *      marks a Yes of its own, and "Use the suggestion" is gone from every screen. Every offer passes its target
 *      (offer=...) and its No and Not sure go through the one handler (offerChoiceSave.ts), unless its screen keeps
 *      them in a record of its own (declared, RECORDED_BY_SCREEN, with both onNo and onUnsure); none is set aside on
 *      the page only (site owner, 14 Nov 2026; this replaced the SET_ASIDE_ONLY list).
 *   2. Every suggestion place in SUGGESTION_PLACES imports and renders <UseSuggestion>.
 *   3. No screen offers a suggestion with words of its own ("Use suggested", "Use “…” (from your
 *      story)", "(suggested from your story)", "Yes, save this date", "Count my deadline from",
 *      "Save this answer", "— as you wrote").
 *   4. Nothing is pre-ticked, pre-selected or pre-filled from a suggestion: no `checked` /
 *      `defaultChecked` / `defaultValue` / `value` bound to a suggestion, no state initialised from one
 *      (except DECLARED, each with its reason), and each place's own way of pre-ticking is gone (the
 *      story card's rows start `keep: false`; the chat's partial answer is not the box's value; the
 *      Timeline's kind of step starts empty; the stage list starts on "Choose one"; the forms page
 *      counts a suggestion as no answer; the Small Claims form writes no story fact into a field; the
 *      Family triage marks no choice as the story's).
 *
 * WHAT FAILURE THIS CATCHES: a new or changed screen that shows a story suggestion ticked, selected or
 * typed into a box before the person chose it, or offers it with a button worded its own way. On
 * 2be6a4c1 it fails: the story card's rows started ticked (`keep: true`), the Family chat filled the
 * children box with the story's words, the Timeline pre-selected the kind of step, the forms page saved
 * an unchosen suggestion with "Save confirmations", and five screens worded the offer five ways.
 *
 * A place is listed, not discovered: a new suggestion place is added to SUGGESTION_PLACES (one line).
 * Removing a place's suggestion entirely (so it no longer offers one) means deleting its line, which
 * the check says plainly.
 *
 * Run: npm run test:suggestions-offered
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { OFFER_CHOICES, suggestionLabel } from "../../src/lib/case-system/copy/suggestionCopy";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const root = process.cwd();
const read = (file: string) => {
  try {
    return readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return "";
  }
};
/** The code without its comments, so a comment quoting old words is not read as a screen's words. */
const code = (text: string) =>
  text
    // A JSX comment opens on its brace's line ("{\n  /** ..." is a type, not a comment).
    .replace(/\{[ \t]*\/\*[\s\S]*?\*\/[ \t]*\}/g, "")
    // Only a block comment that opens a line: "image/*" in a string is not one (it ate whole files).
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/([^:"'`])\/\/[^\n"'`]*$/gm, "$1");

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(path.join(root, rel)).isDirectory()) filesUnder(rel, out);
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

// ---- 1. One component, one copy string ---------------------------------------------------------
const COMPONENT = "app/_components/UseSuggestion.tsx";
const COPY = "src/lib/case-system/copy/suggestionCopy.ts";
const component = read(COMPONENT);
check("the copy's three choices are the site owner's words, and Yes is named with what is offered", OFFER_CHOICES.yes === "Yes" && OFFER_CHOICES.no === "No, that's not right" && OFFER_CHOICES.unsure === "I'm not sure" && suggestionLabel("X") === "Yes: X" && suggestionLabel(null) === "Yes");
check("the component reads its words from the shared copy and renders all three", /from "\.\.\/\.\.\/src\/lib\/case-system\/copy\/suggestionCopy"/.test(component) && /suggestionLabel\(what\)/.test(component) && /\{OFFER_CHOICES\.yes\}/.test(component) && /\{OFFER_CHOICES\.no\}/.test(component) && /\{OFFER_CHOICES\.unsure\}/.test(component));
check("the component marks every Yes data-use-suggestion", /data-use-suggestion=""/.test(component));
const screens = [...filesUnder("app"), ...filesUnder("src")].filter((file) => file !== COPY && file !== COMPONENT);
const spelled = screens.filter((file) => code(read(file)).includes("Use the suggestion"));
check("\"Use the suggestion\" is no longer a label anywhere (site owner, 14 Nov 2026)", spelled.length === 0, spelled.join(", "));
const ownYes = screens.filter((file) => /data-use-suggestion=/.test(code(read(file))));
check("no screen marks a Yes of its own: every offer's Yes is the component's", ownYes.length === 0, ownYes.join(", "));

// ---- 2. Every suggestion place uses the component -----------------------------------------------
const SUGGESTION_PLACES: { file: string; place: string }[] = [
  { file: "app/_components/IntakeReviewPanel.tsx", place: "the review: choices, typed answers, the multi-choice boxes and the story's words" },
  { file: "app/builder/_components/GuidedSmallClaimsIntake.tsx", place: "Small Claims questions: \"Here's what I understood\" and the kind-of-claim card" },
  { file: "app/builder/_components/GuidedFormChat.tsx", place: "civil/Family questions: the story's answer and the part of an answer the story gives" },
  { file: "app/builder/_components/StageConfirmation.tsx", place: "the stage suggested for the case" },
  { file: "app/builder/_components/StageAnswerPanel.tsx", place: "the step suggested and the dates from the story" },
  { file: "app/builder/_components/EventCandidateSurface.tsx", place: "\"Things that may have happened in your case\": the kind of step" },
  { file: "app/builder/_components/FamilyStatusTriage.tsx", place: "the Family triage's answer from the story" },
  { file: "app/forms/FormsWorkspace.tsx", place: "the forms page's answers suggested from the case" },
  { file: "app/builder/_components/IntelligenceOverviewPanel.tsx", place: "the overview's kind of claim the story matches" },
  { file: "app/_components/CaseUnderstandingCard.tsx", place: "the court the story seems to belong in" },
  { file: "app/builder/_components/TidyWordingReview.tsx", place: "the spelling and wording fixes" },
  { file: "app/builder/_components/SmallClaimsIntake.tsx", place: "the Small Claims form's facts found in the story" },
];
for (const { file, place } of SUGGESTION_PLACES) {
  const source = code(read(file));
  check(
    `${place} (${file}) offers it with <UseSuggestion>`,
    /import \{ UseSuggestion \} from "[^"]*UseSuggestion"/.test(source) && /<UseSuggestion\b/.test(source),
    source ? "no <UseSuggestion> here: offer the suggestion with it, or delete this line if the place no longer offers one" : "file not found: delete this line",
  );
}

// ---- 3. No offer worded its own way --------------------------------------------------------------
const OWN_WORDS: [string, RegExp][] = [
  ["Use suggested", />\s*Use suggested\s*</],
  ["Use “…” (from your story)", /Use (?:“|&ldquo;)[^<]*(?:”|&rdquo;) \(from your story\)/],
  ["(suggested from your story)", /\(suggested from your story\)/],
  ["Yes, save this date", /Yes, save this date/],
  ["Count my deadline from", /Count my deadline from/],
  ["Save this answer", /Save this answer/],
  ["— as you wrote", /— as you wrote/],
  ["Looks right, continue", /Looks right, continue/],
];
for (const [words, pattern] of OWN_WORDS) {
  const found = screens.filter((file) => file.endsWith(".tsx") && pattern.test(code(read(file))));
  check(`no screen offers a suggestion as "${words}"`, found.length === 0, found.join(", "));
}

// ---- 4. Nothing pre-ticked, pre-selected or pre-filled -------------------------------------------
/** State that starts from something the person gave, not from a suggestion. Each with its reason. */
const DECLARED: { file: string; pattern: RegExp; why: string }[] = [
  {
    file: "app/builder/_components/ChildSupportIntake.tsx",
    pattern: /useState\(suggested\)/,
    why: "the child-support builder starts from the person's own family-intake answers (their name, the other party, their children answer), classed own-answer in verifyFactSources; carried, not suggested (never ask twice)",
  },
];
const tsx = screens.filter((file) => file.endsWith(".tsx"));
const boundToSuggestion = /(?:checked|defaultChecked|defaultValue|value)=\{[^}]*(?:[Ss]uggest|fromStory|[Pp]roposal)/;
const stateFromSuggestion = /useState(?:<[^>]*>)?\([^)]*(?:[Ss]uggest|fromStory|[Pp]roposal)/;
const prefilled = tsx.flatMap((file) =>
  code(read(file))
    .split("\n")
    .filter((line) => (boundToSuggestion.test(line) || stateFromSuggestion.test(line)) && !DECLARED.some((entry) => entry.file === file && entry.pattern.test(line)))
    .map((line) => `${file}: ${line.trim().slice(0, 140)}`),
);
check("no box, tick or selection is bound to a suggestion, and no state starts from one", prefilled.length === 0, prefilled.join("\n      "));
for (const entry of DECLARED) check(`declared: ${entry.file} still has what it declares (delete the entry if not)`, entry.pattern.test(read(entry.file)), entry.why);

const card = code(read("app/builder/_components/GuidedSmallClaimsIntake.tsx"));
const keeps = [...card.matchAll(/keep: (true|false), original:/g)].map((match) => match[1]);
check("\"Here's what I understood\": every row starts unticked (keep: false)", keeps.length > 0 && keeps.every((keep) => keep === "false"), `keep: ${keeps.join(", ")}`);
// Site owner, 11 Nov 2026: an offer has three explicit choices (Yes / No, that's not right / I'm not sure) in place of the
// one "Use the suggestion" control; the rule guarded stays: nothing is chosen or filled in for the person until Yes.
check("\"Here's what I understood\": a row offers the three choices with the one control, none chosen, no box filled in until Yes", /<UseSuggestion\s+offer=\{[^\n]*?\}\s+testId="story-proposal-yes"\s+noTestId="story-proposal-no"\s+unsureTestId="story-proposal-unsure"\s+pressed=\{draft\.choice\}/.test(card) && /\{!draft\.keep \? null :/.test(card) && /keep: false, choice: null|choice: null, keep: false/.test(card));
check("the kind-of-claim card (2.4): Yes, No, that's not right and I'm not sure from the one control, recorded by the card", /<UseSuggestion\s+offer=\{[^\n]*?\}\s+testId="claim-type-use-suggestion"\s+noTestId="claim-type-not-that-one"\s+unsureTestId="claim-type-not-sure"[\s\S]{0,400}onNo=\{\(\) => void resolveSuggestion\("reject"\)\}\s+onUnsure=/.test(card));
const reviewPanel = code(read("app/_components/IntakeReviewPanel.tsx"));
check("the review's offers (8.3): every one through the one control, its No and Not sure the review's own choices", !/<UseSuggestion testId=/.test(reviewPanel) && /noTestId="review-offer-no" unsureTestId="review-offer-unsure" onNo=\{\(\) => chooseOffer\(key, "no", questionId\)\} onUnsure=\{\(\) => chooseOffer\(key, "unsure", questionId\)\}/.test(reviewPanel) && (reviewPanel.match(/reviewOffer\(/g) ?? []).length >= 5);

const chat = code(read("app/builder/_components/GuidedFormChat.tsx"));
check("the civil/Family chat: the part of an answer the story gives is not the box's value", /const boxValue = partial && !edited\.has\(current\.key\) \? "" :/.test(chat) && !/\? partial\.prefill :/.test(chat));
check("the civil/Family chat: it is offered, and filled in only on its use", /<UseSuggestion[^>]*onUse=\{\(\) => editBox\(partial\.prefill\)\}/.test(chat));
check("the civil/Family chat: the story's answer is offered with the one control's three choices, each recorded by the chat", /<UseSuggestion\s+offer=\{[^\n]*?\}\s+testId="guided-form-from-story-yes"\s+noTestId="guided-form-from-story-no"\s+unsureTestId="guided-form-from-story-unsure"[\s\S]{0,300}onNo=[\s\S]{0,120}onUnsure=/.test(chat));

// ---- 5. Every offer's No and Not sure are recorded, through the one handler ------------------------------------
/**
 * Site owner, 14 Nov 2026 (decision 2 on the batch report): no offer's No or Not sure is set aside on the page only. Every
 * <UseSuggestion> passes `offer` (its key and the case file's fact, offerChoice.ts), and the control sends each No and Not
 * sure to the one handler (offerChoiceSave.ts), which keeps it, so neither is asked again anywhere. This replaces the
 * SET_ASIDE_ONLY list of 14 Nov, which declared the twelve offers that recorded nothing; there is now no such list.
 * test:offer-choices checks what each of the 13 records.
 *
 * Two kinds of offer are declared, each with why:
 *   - RECORDED_BY_SCREEN: the screen keeps the choice in a record of its own (offer.recordedBy "screen") and must pass
 *     both onNo and onUnsure;
 *   - NO_FACT: the offer fills no case-file fact (offer.fact null): its choice is kept under its key only.
 */
const RECORDED_BY_SCREEN: Record<string, string> = {
  "IntakeReviewPanel.tsx": "the review keeps each story offer's choice in builder.reviewOfferChoices, and its Not sure ticks the question's own \"I do not know yet\"",
  "PartiesStep.tsx": "the Parties step keeps a declined offer and an unsure detail in the parties record (parties.ts declined, unsure)",
  "story-proposal-yes": "the story card keeps each row's choice until its own Continue, which records it with the row's answer",
};
const NO_FACT: Record<string, string> = {
  "IntakeReviewPanel.tsx": "recorded by the review itself (above)",
  "PartiesStep.tsx": "the parties record is its own record, not a case-file fact",
  "story-proposal-yes": "recorded by the card itself (above)",
  "guided-form-from-story-yes": "the chat's own Not sure answers the question (recorded \"not sure\"); the key keeps the No",
  "event-candidate-use-suggestion": "the Timeline's kind of step is the event's own answer, no case-file fact",
  "stage-answer-date-suggestion-": "a date question settles itself only (caseFile.ts unsureDates, key date:<question>): one fact can have several date questions",
  "stage-accept": "the card confirms its own \"I am not sure\" stage on Not sure, and opens its list on No",
  "tidy-wording-use": "a wording fix is no case-file fact",
  "forms-suggested-save": "the forms page's applicability answer is its own record",
  "case-understanding-continue-suggested": "the person still chooses a court to go on, so Not sure settles no fact",
};
const offers = screens.filter((file) => file.endsWith(".tsx")).flatMap((file) => [...code(read(file)).matchAll(/<UseSuggestion\b([\s\S]*?)\/>/g)].map((match) => ({ file, props: match[1], id: /testId=\{?[`"]([^`"$]+)/.exec(match[1])?.[1] ?? path.basename(file) })));
const declaredFor = (list: Record<string, string>, offer: { file: string; id: string }) => Object.keys(list).some((declared) => offer.id.startsWith(declared) || path.basename(offer.file) === declared);
const noTarget = offers.filter((offer) => !/\boffer=\{/.test(offer.props));
check("every offer passes its target (offer=...) to the one control", noTarget.length === 0, noTarget.map((offer) => `${offer.file}: ${offer.id}`).join(", "));
const byScreen = offers.filter((offer) => /recordedBy: "screen"/.test(offer.props));
const byScreenUndeclared = byScreen.filter((offer) => !declaredFor(RECORDED_BY_SCREEN, offer));
check("an offer kept by its own screen is declared, with why (RECORDED_BY_SCREEN)", byScreenUndeclared.length === 0, byScreenUndeclared.map((offer) => `${offer.file}: ${offer.id}`).join(", "));
const byScreenWithout = byScreen.filter((offer) => !(/onNo=/.test(offer.props) && /onUnsure=/.test(offer.props)));
check("an offer kept by its own screen records both its No and its Not sure there (onNo and onUnsure)", byScreenWithout.length === 0, byScreenWithout.map((offer) => `${offer.file}: ${offer.id}`).join(", "));
const noFact = offers.filter((offer) => /fact: null/.test(offer.props));
const noFactUndeclared = noFact.filter((offer) => !declaredFor(NO_FACT, offer));
check("an offer that fills no case-file fact is declared, with why (NO_FACT)", noFactUndeclared.length === 0, noFactUndeclared.map((offer) => `${offer.file}: ${offer.id}`).join(", "));
const control = code(read("app/_components/UseSuggestion.tsx"));
check("the one control sends every No and Not sure to the one handler, unless the screen keeps it", /offer: OfferTarget;/.test(control) && /const shared = offer\.recordedBy !== "screen";/.test(control) && /if \(shared\) void choices\.record\(offer, choice\);/.test(control));
check("nothing else saves an offer's choice: only the one handler calls writeOfferChoice", screens.filter((file) => /writeOfferChoice\(/.test(code(read(file)))).every((file) => /offerChoiceSave\.ts$|caseWrite\.ts$/.test(file)));
console.log(`note  ${offers.length} offers; ${byScreen.length} kept by their own screen, ${noFact.length} for no case-file fact, none set aside on the page only`);

const events = code(read("app/builder/_components/EventCandidateSurface.tsx"));
check("the Timeline's kind of step starts empty, the suggestion offered beside it", /eventType: "",/.test(events) && !/eventType: suggestion/.test(events) && /suggestedType: suggestion\.eventType/.test(events));

const stage = code(read("app/builder/_components/StageConfirmation.tsx"));
check("the stage list starts on \"Choose one\", never on the suggestion", !/useState<UniversalStage[^>]*>\(suggestedStage\)/.test(stage) && !/setChoice\(suggestedStage\)/.test(stage));

const step = code(read("app/builder/_components/StageAnswerPanel.tsx"));
check("a step the site suggested is named as a suggestion until the person uses it or chooses", /"Suggested step: " : "Your step: "/.test(step) && /testId="stage-answer-use-suggestion"/.test(step));

const forms = code(read("app/forms/FormsWorkspace.tsx"));
const answerFor = /function answerFor\([^)]*\)[^{]*\{([\s\S]*?)\n  \}/.exec(forms)?.[1] ?? "";
check("the forms page: a suggestion is no answer (nothing unchosen is selected or saved by \"Save confirmations\")", Boolean(answerFor) && !/suggestionFor/.test(answerFor));

const scForm = code(read("app/builder/_components/SmallClaimsIntake.tsx"));
// The form's story offers come from the one asker (caseFile/missingFacts.ts, pure: it returns offers and writes nothing),
// read from the record's story on every render (23 Nov 2026; extractFromStory, the form's own reader, is deleted). A box is
// written only when the person uses an offer (the offer's onUse), never by the reading itself.
const offerList = /const foundToOffer = missingFacts\([^;]*;/.exec(scForm)?.[0] ?? "";
const offerUse = /foundToOffer\.map\(\(fact\) => \{[\s\S]*?onUse=\{\(\) => updateField\(fact\.field/.test(scForm);
check("the Small Claims form: a fact found in the story is listed with the offer, never written into a field", Boolean(offerList) && !/setInput|updateField/.test(offerList) && offerUse && !/extractFromStory|setExtractedFacts/.test(scForm));

const triage = code(read("app/builder/_components/FamilyStatusTriage.tsx"));
check("the Family triage: no choice is shown as the story's before the person presses it", !/data-from-story/.test(triage) && !/fromStory === value/.test(triage));

const review = code(read("app/_components/IntakeReviewPanel.tsx"));
check("the review's multi-choice boxes show only what the person ticked or saved", /checked=\{ticked\.includes\(option\.value\)\}/.test(review) && !/checked=\{[^}]*suggested/.test(review));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
