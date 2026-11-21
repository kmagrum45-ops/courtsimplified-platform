/**
 * EVERY PLACE THAT ASKS, OFFERS OR SAYS A FACT IS MISSING GETS THAT FROM THE ONE FUNCTION (site owner, 11 Nov 2026:
 * "any screen that asks, reads or writes facts another way fails the build"; the target is zero exceptions).
 *
 * The one function is src/lib/case-system/caseFile/factStatus.ts (factStatus, mayAskWords, stillNeeded). An ASKER is any
 * file in app/ or src/ that
 *   (a) renders a question, a story offer, an input shown as needing an answer, a confirm request or a "not answered"
 *       / "not entered" / "still needed" label (found by the markers below, in CODE: a marker in a comment is not an
 *       asker, rule b), or
 *   (b) decides what to ask or what is missing without rendering it (the named list below, from the 11 Nov inventory).
 * Each asker must import the one function, or meet one of six rules, each proved here by a build check with a planted
 * control that fails (site owner, 18 Nov 2026, decision 3 on 2d0ebd53; no unchecked exemption):
 *   a. a PRODUCER (it writes questions it does not show) counts only when every file that imports it is enumerated with
 *      its role, and every screen that shows its questions filters them through the one function; a new importer fails;
 *   b. markers count in code, never in comments;
 *   c. a WORDING file is exempt only when it holds string constants and nothing else (no function, no JSX);
 *   d. a WRAPPER counts only when a static check proves the wrapper it calls calls the one function;
 *   e. a SCREEN OF AN ASKER counts only when its questions come from an asker on the one function and it renders no
 *      question text of its own (no words ending in "?");
 *   f. the DEPTH questions: every depth question is its element's answer (a fact), and asked once (an element answered
 *      or "cannot provide" is never asked again); "asked in full" means every question is available, each asked once.
 * The list of askers not moved yet (scripts/verification/askersNotYetOnFactStatus.json) must be EMPTY.
 *
 * WHAT FAILURE THIS CATCHES: a screen that keeps its own list of what to ask, so a fact the person gave is asked again.
 *
 * Run: npm run test:askers-fact-status
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { selectDepthQuestions } from "../../src/lib/case-system/intake/depth/selectDepthQuestions";
import { DEPTH_QUESTIONS as ELEMENT_QUESTIONS } from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { SUPPORT_ELEMENTS } from "../../src/lib/case-system/family/childSupportFlaPath";

const ONE_FUNCTION = "src/lib/case-system/caseFile/factStatus.ts";
const LIST_PATH = "scripts/verification/askersNotYetOnFactStatus.json";
/** The case file module itself is the one place facts are kept; it is not an asker of its own. */
const OWN = (file: string) => file === ONE_FUNCTION || file === "src/lib/case-system/caseFile/caseFile.ts";

/** What a page shows when it asks, offers or says something is missing. */
const MARKERS: RegExp[] = [
  /data-testid="(?:guided-form-question|story-proposals|story-proposal-row|intake-initial-question|intake-entry|claim-type-suggestion|stage-answer-date-question|triage-question|sourced-question-current|case-understanding-questions|not-answered-yet|intake-not-answered-yet)"/,
  /isQuestion: true/,
  /Not answered yet|not yet been clearly entered|has not yet been entered|name not entered|Still useful to add|What we still need to know|What to confirm next|needs confirming/,
];
/** Askers that decide without rendering (the 11 Nov inventory). */
export const DECIDING = [
  "src/lib/case-system/intake/depth/selectDepthQuestions.ts",
  "src/lib/case-system/intake/selectQuestions.ts",
  "src/lib/case-system/intake/asker.ts",
  "src/lib/case-system/intakeReview.ts",
  "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts",
  "src/lib/case-system/statementOfClaimDraftEngine.ts",
  "src/lib/case-system/claimDraftEngine.ts",
  "app/api/generate-form/route.ts",
  "src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts",
  "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts",
  "src/lib/case-system/understanding/understandCase.ts",
  "src/lib/case-system/retrieval/sourcedQuestions.ts",
  // Producers of AI-written questions that show nothing themselves (rule a checks every consumer).
  "app/builder/_components/civilAnalysis.ts",
  "app/builder/_components/familyAnalysis.ts",
  "src/lib/case-system/intelligence/answeredQuestions.ts",
];

/** A file's code without its comments (rule b: a marker in a comment is not an asker). URLs in strings are kept. */
export function codeOf(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1").replace(/\{\s*\}/g, "{}");
}
const IMPORTS_ONE_FUNCTION = /import\s+(?!type\b)[^;]*?from ["'][^"']*caseFile\/factStatus["']/;
// homeAsks (caseFile/factQuestions.ts) is the home page's one decision, itself made by factStatus: accepted as a filter
// only while that holds (checked here, 19 Nov 2026).
const FACT_QUESTIONS = readFileSync("src/lib/case-system/caseFile/factQuestions.ts", "utf8");
const HOME_ASKS_ON_FACT_STATUS = /import \{ factStatus \} from "\.\/factStatus"/.test(FACT_QUESTIONS)
  && /factStatus\(file, fact as SlotFact, stated\) === "ask"/.test((FACT_QUESTIONS.split("export function homeAsks")[1] ?? "").split("\n}")[0]);
const FILTERS = HOME_ASKS_ON_FACT_STATUS ? /\b(?:mayAskWords|mayShowQuestion|stillNeeded|homeAsks)\(/ : /\b(?:mayAskWords|mayShowQuestion|stillNeeded)\(/;
const rendersAQuestion = (text: string) => MARKERS.some((marker) => marker.test(codeOf(text)));

// ---- Rule a: producers, every importer enumerated with its role ----------------------------------------------------
/**
 * filters: shows the producer's questions and filters each through the one function. hands-on: shows no question, passes
 * the result to a screen (`to`) that filters. library / route / producer: shows nothing (a .ts module, an API route, or
 * another producer listed here). asker: an asker of its own on the one function.
 */
type Role = { role: "filters" } | { role: "hands-on"; to: string } | { role: "library" } | { role: "route" } | { role: "producer" } | { role: "asker" };
export const PRODUCERS: Record<string, { why: string; importers: Record<string, Role>; routes?: Record<string, Record<string, Role>> }> = {
  "app/builder/_components/civilAnalysis.ts": {
    why: "the civil analysis's AI-written questions",
    importers: { "app/builder/_components/CivilIntake.tsx": { role: "hands-on", to: "app/builder/_components/IntelligenceOverviewPanel.tsx" } },
  },
  "app/builder/_components/familyAnalysis.ts": {
    why: "the Family analysis's AI-written questions and missing-information lines",
    importers: { "app/builder/_components/FamilyIntake.tsx": { role: "hands-on", to: "app/builder/_components/IntelligenceOverviewPanel.tsx" } },
  },
  "src/lib/case-system/intelligence/answeredQuestions.ts": {
    why: "filters over AI-written questions, run before the screen's own mayAskWords",
    importers: {
      "app/builder/page.tsx": { role: "asker" },
      "app/builder/_components/civilAnalysis.ts": { role: "producer" },
      "app/builder/_components/IntelligenceOverviewPanel.tsx": { role: "filters" },
      "src/lib/case-system/caseRecord.ts": { role: "library" },
      "src/lib/case-system/intelligence/courtSimplifiedBrain.ts": { role: "library" },
      "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts": { role: "producer" },
    },
  },
  "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts": {
    why: "the Small Claims analysis's \"What to confirm next\" lines (server)",
    importers: {
      "app/api/small-claims/analyze/route.ts": { role: "route" },
      "app/builder/_components/guidedIntakeToSmallClaimsInput.ts": { role: "library" },
      "app/builder/_components/SmallClaimsIntake.tsx": { role: "asker" },
      "src/lib/case-system/statementOfClaimDraftEngine.ts": { role: "asker" },
    },
    routes: { "/api/small-claims/analyze": { "app/builder/_components/SmallClaimsIntake.tsx": { role: "asker" }, "app/builder/page.tsx": { role: "asker" } } },
  },
  "src/lib/case-system/retrieval/sourcedQuestions.ts": {
    why: "the law questions the AI writes (server)",
    importers: { "app/api/intake/sourced-questions/route.ts": { role: "route" } },
    routes: { "/api/intake/sourced-questions": { "app/builder/_components/SourcedQuestions.tsx": { role: "filters" } } },
  },
  "src/lib/case-system/understanding/understandCase.ts": {
    why: "the home page reading's questions (server)",
    importers: {
      "app/api/case/understand/route.ts": { role: "route" },
      "app/_components/CaseUnderstandingCard.tsx": { role: "filters" },
      "src/lib/case-system/understanding/betterDestination.ts": { role: "library" },
    },
    routes: { "/api/case/understand": { "app/_components/HomeLocationGate.tsx": { role: "hands-on", to: "app/_components/CaseUnderstandingCard.tsx" } } },
  },
};

const baseName = (file: string) => file.replace(/^.*\//, "").replace(/\.(ts|tsx)$/, "");
const importersOf = (producer: string, files: Record<string, string>) => Object.keys(files).filter((file) => file !== producer && new RegExp(`from ["'][^"']*/${baseName(producer)}["']`).test(files[file])).sort();
const fetchersOf = (url: string, files: Record<string, string>) => Object.keys(files).filter((file) => !file.startsWith("app/api/") && codeOf(files[file]).includes(url)).sort();

/** Every problem with a producer's consumers (empty: it counts as on the one function). */
export function producerProblems(producer: string, files: Record<string, string>): string[] {
  const declared = PRODUCERS[producer];
  if (!declared) return [`${producer} is not a declared producer`];
  const problems: string[] = [];
  const roleProblem = (file: string, role: Role): string | null => {
    const text = files[file];
    if (text === undefined) return `${file} does not exist`;
    if (role.role === "filters") return IMPORTS_ONE_FUNCTION.test(text) && FILTERS.test(codeOf(text)) ? null : `${file} shows the questions but does not filter them through the one function`;
    if (role.role === "asker") return IMPORTS_ONE_FUNCTION.test(text) ? null : `${file} is declared an asker on the one function and does not import it`;
    if (role.role === "hands-on") {
      if (rendersAQuestion(text)) return `${file} is declared to show no question but renders one`;
      const to = files[role.to];
      if (!to || !IMPORTS_ONE_FUNCTION.test(to) || !FILTERS.test(codeOf(to))) return `${file} hands its result to ${role.to}, which does not filter through the one function`;
      return null;
    }
    if (role.role === "library" || role.role === "producer") return /\.tsx$/.test(file) || rendersAQuestion(text) ? `${file} is declared to show nothing but renders` : null;
    if (role.role === "route") return /^app\/api\/.+\/route\.ts$/.test(file) ? null : `${file} is declared a route but is not one`;
    return null;
  };
  const found = importersOf(producer, files);
  const listed = Object.keys(declared.importers).sort();
  for (const file of found.filter((file) => !listed.includes(file))) problems.push(`${file} imports ${producer} and is not enumerated with its role`);
  for (const file of listed.filter((file) => !found.includes(file))) problems.push(`${file} is enumerated but no longer imports ${producer}`);
  for (const [file, role] of Object.entries(declared.importers)) { const problem = roleProblem(file, role); if (problem) problems.push(problem); }
  for (const [url, fetchers] of Object.entries(declared.routes ?? {})) {
    const fetching = fetchersOf(url, files);
    for (const file of fetching.filter((file) => !(file in fetchers))) problems.push(`${file} fetches ${url} and is not enumerated with its role`);
    for (const [file, role] of Object.entries(fetchers)) { const problem = roleProblem(file, role); if (problem) problems.push(problem); }
  }
  return problems;
}

// ---- Rule c: wording files -----------------------------------------------------------------------------------------
export const WORDING_FILES = ["src/lib/case-system/copy/askCopy.ts"];
/** Only `export const NAME = "words";` lines (comments aside): no function, no JSX, no logic. */
export function wordingOnly(text: string): boolean {
  const lines = codeOf(text).split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((line) => /^export const [A-Z][A-Z0-9_]* = (?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*');$/.test(line));
}

// ---- Rule d: wrappers ----------------------------------------------------------------------------------------------
/** The wrapper each caller uses, the module it is in, and the one function's call it must contain. */
export const WRAPPERS: Record<string, { wrapper: string; module: string; calls: string }> = {
  "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts": { wrapper: "chatQuestionToAsk", module: "src/lib/case-system/caseFile/caseFile.ts", calls: "chatMayAsk" },
};
/** The body of `export function <name>(...)` in a module's text, to its closing brace at column 0. */
export function functionBody(text: string, name: string): string | null {
  const start = text.search(new RegExp(`export function ${name}\\(`));
  if (start < 0) return null;
  // Either line ending: a Windows checkout (core.autocrlf) has "\r\n", and the body was then never found (18 Nov).
  const close = /\r?\n\}\r?\n/.exec(text.slice(start));
  return close ? text.slice(start, start + close.index + close[0].length - 1) : null;
}
export function wrapperProblems(caller: string, files: Record<string, string>): string[] {
  const declared = WRAPPERS[caller];
  if (!declared) return [`${caller} has no declared wrapper`];
  const problems: string[] = [];
  const callerCode = codeOf(files[caller] ?? "");
  if (!new RegExp(`\\b${declared.wrapper}\\(`).test(callerCode)) problems.push(`${caller} does not call ${declared.wrapper}`);
  const module = files[declared.module] ?? "";
  const body = functionBody(module, declared.wrapper);
  if (!body || !new RegExp(`\\b${declared.calls}\\(`).test(codeOf(body))) problems.push(`${declared.wrapper} (${declared.module}) does not call ${declared.calls}`);
  if (!new RegExp(`import\\s+\\{[^}]*\\b${declared.calls}\\b[^}]*\\}\\s+from ["']\\./factStatus["']`).test(module)) problems.push(`${declared.module} does not import ${declared.calls} from the one function`);
  return problems;
}

// ---- Rule e: screens of an asker -----------------------------------------------------------------------------------
export const SCREENS_OF_ASKERS: Record<string, { asker: string; uses: string }> = {
  "app/builder/_components/FamilyStatusTriage.tsx": { asker: "src/lib/case-system/family/statusTriage.ts", uses: "selectNextTriageQuestion" },
};
/** Words of the screen's own that end in "?" (a string, or JSX text), comments aside. */
export function ownQuestionText(text: string): string[] {
  return [...codeOf(text).matchAll(/["'`][^"'`\n]*\?["'`]|>[^<>{}\n]*\?\s*</g)].map((match) => match[0]).filter((words) => !/^["'`]\?["'`]$/.test(words));
}
export function screenProblems(screen: string, files: Record<string, string>): string[] {
  const declared = SCREENS_OF_ASKERS[screen];
  if (!declared) return [`${screen} is not a declared screen of an asker`];
  const problems: string[] = [];
  const text = files[screen] ?? "";
  if (!new RegExp(`\\b${declared.uses}\\(`).test(codeOf(text))) problems.push(`${screen} does not take its questions from ${declared.uses}`);
  if (!IMPORTS_ONE_FUNCTION.test(files[declared.asker] ?? "")) problems.push(`${declared.asker} does not use the one function`);
  const own = ownQuestionText(text);
  if (own.length) problems.push(`${screen} renders question text of its own: ${own.join(" | ")}`);
  return problems;
}

// ---- Rule f: the depth questions -----------------------------------------------------------------------------------
export const DEPTH = "src/lib/case-system/intake/depth/selectDepthQuestions.ts";
export function depthProblems(select: typeof selectDepthQuestions = selectDepthQuestions): string[] {
  const problems: string[] = [];
  // The claim kinds' elements, and Family child support's (childSupportFlaPath.ts): each depth question is one of their answers.
  const elements = new Set([...CLAIM_TYPES.flatMap((type) => type.plaintiffElements.map((element) => element.id)), ...SUPPORT_ELEMENTS.map((element) => element.id)]);
  const orphan = ELEMENT_QUESTIONS.filter((question) => !elements.has(question.elementId));
  if (orphan.length) problems.push(`depth questions with no element (no fact): ${orphan.map((question) => question.id).join(", ")}`);
  // Asked once, run on a real claim kind: an element answered, or "cannot provide", is not asked again; one not yet is.
  const type = CLAIM_TYPES.find((candidate) => candidate.plaintiffElements.some((element) => ELEMENT_QUESTIONS.some((question) => question.elementId === element.id && question.status === "reviewed")));
  if (!type) return [...problems, "no claim kind with a reviewed depth question to run"];
  const input = { elements: type.plaintiffElements, userTexts: [], slotValues: {} };
  const first = select(input).asked;
  if (!first.length) return [...problems, `${type.id}: no depth question asked at all`];
  const target = first[0];
  const answered = select({ ...input, held: { [target.elementId]: { elementId: target.elementId, elementName: "", state: "provided", providedVia: "depth-answer", userText: "Synthetic.", questionId: target.question.id } } }).asked;
  if (answered.some((item) => item.elementId === target.elementId)) problems.push(`${type.id}: an answered element (${target.elementId}) is asked again`);
  const cannot = select({ ...input, held: { [target.elementId]: { elementId: target.elementId, elementName: "", state: "cannot-provide", questionId: target.question.id } } }).asked;
  if (cannot.some((item) => item.elementId === target.elementId)) problems.push(`${type.id}: a "cannot provide" element (${target.elementId}) is asked again`);
  const notYet = select({ ...input, held: { [target.elementId]: { elementId: target.elementId, elementName: "", state: "not-yet" } } }).asked;
  if (!notYet.some((item) => item.elementId === target.elementId)) problems.push(`${type.id}: an element not yet answered (${target.elementId}) is not asked`);
  return problems;
}

// ---- The askers ----------------------------------------------------------------------------------------------------
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full.split(path.sep).join("/"));
  }
  return out;
}

/** Every asker, whether it is on the one function, and how (an import, or a rule whose check passed). */
export function askers(files: Record<string, string>): { file: string; uses: boolean; by: string; problems: string[] }[] {
  return Object.entries(files)
    .filter(([file, text]) => !OWN(file) && (DECIDING.includes(file) || rendersAQuestion(text)))
    .map(([file, text]) => {
      // A value import: a type-only import ("import type") uses none of the one function's decisions.
      if (IMPORTS_ONE_FUNCTION.test(text)) return { file, uses: true, by: "imports the one function", problems: [] };
      if (PRODUCERS[file]) { const problems = producerProblems(file, files); return { file, uses: !problems.length, by: "rule a (producer)", problems }; }
      if (WORDING_FILES.includes(file)) { const ok = wordingOnly(text); return { file, uses: ok, by: "rule c (wording only)", problems: ok ? [] : [`${file} holds more than string constants`] }; }
      if (WRAPPERS[file]) { const problems = wrapperProblems(file, files); return { file, uses: !problems.length, by: "rule d (wrapper)", problems }; }
      if (SCREENS_OF_ASKERS[file]) { const problems = screenProblems(file, files); return { file, uses: !problems.length, by: "rule e (screen of an asker)", problems }; }
      if (file === DEPTH) { const problems = depthProblems(); return { file, uses: !problems.length, by: "rule f (depth: each asked once)", problems }; }
      return { file, uses: false, by: "none", problems: [] };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

type Entry = { file: string; reason: string };
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const files = Object.fromEntries([...walk("app"), ...walk("src")].map((file) => [file, readFileSync(file, "utf8")]));
const found = askers(files);
const list = (JSON.parse(readFileSync(LIST_PATH, "utf8")).entries ?? []) as Entry[];
console.log(`Askers: ${found.length}; on the one function: ${found.filter((item) => item.uses).length}; not moved yet: ${found.filter((item) => !item.uses).length}`);
for (const item of found.filter((entry) => entry.by.startsWith("rule"))) console.log(`  ${item.uses ? "ok  " : "NOT "} ${item.file}: ${item.by}`);

check(`setup: the deciding askers exist (${DECIDING.length})`, DECIDING.every((file) => existsSync(file)), DECIDING.filter((file) => !existsSync(file)).join(", "));
const off = found.filter((item) => !item.uses);
check("every asker uses the one function, or meets a rule whose check passes (zero not moved)", off.length === 0, off.map((item) => `${item.file}: ${item.problems.join("; ") || "ask through factStatus"}`).join("\n      "));
check("the list of askers not moved yet is empty", list.length === 0, list.map((entry) => entry.file).join(", "));
const ruleFiles = [...Object.keys(PRODUCERS), ...WORDING_FILES, ...Object.keys(WRAPPERS), ...Object.keys(SCREENS_OF_ASKERS), DEPTH];
const notAskers = ruleFiles.filter((file) => !found.some((item) => item.file === file));
check("every file a rule names is still an asker (a rule for a file that no longer asks is deleted)", notAskers.length === 0, notAskers.join(", "));

// ---- Planted controls: each rule fails on a file that breaks it ----------------------------------------------------
// b. A marker only in a comment is not an asker; a real one beside a comment still is.
const commentOnly = askers({ "app/__planted__/CommentOnly.tsx": "// needs confirming, said in a comment only\nexport const x = 1;" });
const realAsker = askers({ "app/__planted__/Real.tsx": "// a comment\n<p data-testid=\"not-answered-yet\">Not answered yet</p>" });
check("planted (b): a marker only in a comment is not an asker", commentOnly.length === 0);
check("planted (b): a real asker beside a comment is still caught", realAsker.length === 1 && !realAsker[0].uses);
// a. A new screen importing a producer, showing its questions without the one function, fails the producer.
const plantedConsumer = { ...files, "app/__planted__/ShowsCivil.tsx": 'import { buildCivilGeneratedQuestions } from "../builder/_components/civilAnalysis";\n<p>What to confirm next</p>' };
check("planted (a): a new consumer of a producer that does not filter fails it", producerProblems("app/builder/_components/civilAnalysis.ts", plantedConsumer).some((problem) => problem.includes("__planted__/ShowsCivil.tsx")));
const plantedFetcher = { ...files, "app/__planted__/FetchesUnderstand.tsx": 'const route = "/api/case/understand";\n<p>{questions[0]}</p>' };
check("planted (a): a new screen fetching a producer's route, not enumerated, fails it", producerProblems("src/lib/case-system/understanding/understandCase.ts", plantedFetcher).some((problem) => problem.includes("FetchesUnderstand")));
const notFiltering = { ...files, "app/builder/_components/IntelligenceOverviewPanel.tsx": (files["app/builder/_components/IntelligenceOverviewPanel.tsx"] ?? "").replace(/\b(mayAskWords|mayShowQuestion|stillNeeded)\(/g, "theirOwnFilter(") };
check("planted (a): a declared filtering screen that stops filtering fails the producer", producerProblems("app/builder/_components/familyAnalysis.ts", notFiltering).length > 0);
// c. A wording file that holds a function is not exempt.
check("planted (c): a wording file with a function is not wording only", !wordingOnly('export const A = "words";\nexport function ask() { return "Are you sure?"; }'));
check("planted (c): one with JSX is not wording only", !wordingOnly('export const A = <p>Are you sure?</p>;'));
check("self-test (c): string constants only are wording only", wordingOnly('/** words */\nexport const A = "Not answered yet";\nexport const B = \'Add it\';'));
// d. A wrapper that does not call the one function fails.
const plantedWrapper = { ...files, "src/lib/case-system/caseFile/caseFile.ts": (files["src/lib/case-system/caseFile/caseFile.ts"] ?? "").replace(/\bchatMayAsk\(/g, "ownGate(") };
check("planted (d): a wrapper that does not call the one function fails", wrapperProblems("src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts", plantedWrapper).length > 0);
// e. A screen with question text of its own fails.
const plantedScreen = { ...files, "app/builder/_components/FamilyStatusTriage.tsx": `${files["app/builder/_components/FamilyStatusTriage.tsx"] ?? ""}\nconst extra = "Are you married?";` };
check("planted (e): a screen of an asker with a question of its own (\"Are you married?\") fails", screenProblems("app/builder/_components/FamilyStatusTriage.tsx", plantedScreen).some((problem) => problem.includes("Are you married?")));
// f. Asked once is a property of the selector, run above; a selector that ignores what is held fails it.
const ignoresHeld: typeof selectDepthQuestions = (input) => selectDepthQuestions({ ...input, held: undefined });
check("planted (f): a depth selector that asks an answered element again fails", depthProblems(ignoresHeld).some((problem) => problem.includes("asked again")), JSON.stringify(depthProblems(ignoresHeld)));

// Self-test: a new screen that asks on its own fails; one that uses the one function passes.
const planted = askers({ "app/__planted__/Asks.tsx": '<p data-testid="not-answered-yet">Not answered yet</p>', "app/__planted__/Uses.tsx": 'import { stillNeeded } from "@/src/lib/case-system/caseFile/factStatus";\n<p>Not answered yet</p>' });
check("self-test: a new asker without the one function is found, one with it is not", planted.length === 2 && !planted[0].uses && planted[1].uses);

console.log(failures ? `\n${failures} check(s) failed.` : `\nAskers on the one function: ${found.filter((item) => item.uses).length} of ${found.length}; not moved: 0.`);
process.exit(failures ? 1 : 0);
