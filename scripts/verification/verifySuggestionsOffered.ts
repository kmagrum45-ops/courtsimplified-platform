/**
 * A SUGGESTION IS OFFERED, NEVER PRE-TICKED, WITH THE ONE CONTROL (owner's Chrome check, 31 Oct).
 *
 * The owner's rule: a suggestion read from the person's story, or made by the site, is OFFERED, never
 * pre-ticked, pre-selected or pre-filled, in all three courts. Everywhere it is offered with the same
 * one-click "Use the suggestion" control: ONE component (app/_components/UseSuggestion.tsx) and ONE copy
 * string (src/lib/case-system/copy/suggestionCopy.ts). The person uses it or ignores it (CLAUDE.md s. 4).
 *
 * What it checks, from the source:
 *   1. The component renders the shared copy and marks itself `data-use-suggestion`; no screen spells
 *      "Use the suggestion" itself (the words have one home).
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
import { USE_THE_SUGGESTION, suggestionLabel } from "../../src/lib/case-system/copy/suggestionCopy";

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
check("the copy's label starts with the one string, and names what is suggested", suggestionLabel("X").startsWith(USE_THE_SUGGESTION) && suggestionLabel("X").endsWith("X") && suggestionLabel(null) === USE_THE_SUGGESTION);
check("the component reads its words from the shared copy", /from "\.\.\/\.\.\/src\/lib\/case-system\/copy\/suggestionCopy"/.test(component) && /suggestionLabel\(what\)/.test(component));
check("the component marks every instance data-use-suggestion", /data-use-suggestion=""/.test(component));
const screens = [...filesUnder("app"), ...filesUnder("src")].filter((file) => file !== COPY && file !== COMPONENT);
const spelled = screens.filter((file) => code(read(file)).includes(USE_THE_SUGGESTION));
check("no screen spells the control's words itself (they live in the copy module)", spelled.length === 0, spelled.join(", "));

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
check("\"Here's what I understood\": an unticked row shows the offer, not a filled-in box", /\{!draft\.keep \? \(\s*<UseSuggestion/.test(card));

const chat = code(read("app/builder/_components/GuidedFormChat.tsx"));
check("the civil/Family chat: the part of an answer the story gives is not the box's value", /const boxValue = partial && !edited\.has\(current\.key\) \? "" :/.test(chat) && !/\? partial\.prefill :/.test(chat));
check("the civil/Family chat: it is offered, and filled in only on its use", /<UseSuggestion[^>]*onUse=\{\(\) => editBox\(partial\.prefill\)\}/.test(chat));
check("the civil/Family chat: the story's answer is offered with the one control", /<UseSuggestion\s+testId="guided-form-from-story-yes"/.test(chat));

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
const extract = /function extractFromStory\([\s\S]*?\n  \}/.exec(scForm)?.[0] ?? "";
check("the Small Claims form: a fact found in the story is listed with the offer, never written into a field", Boolean(extract) && !/next\[fact\.field\] =/.test(extract) && !/setInput\(/.test(extract));

const triage = code(read("app/builder/_components/FamilyStatusTriage.tsx"));
check("the Family triage: no choice is shown as the story's before the person presses it", !/data-from-story/.test(triage) && !/fromStory === value/.test(triage));

const review = code(read("app/_components/IntakeReviewPanel.tsx"));
check("the review's multi-choice boxes show only what the person ticked or saved", /checked=\{ticked\.includes\(option\.value\)\}/.test(review) && !/checked=\{[^}]*suggested/.test(review));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
