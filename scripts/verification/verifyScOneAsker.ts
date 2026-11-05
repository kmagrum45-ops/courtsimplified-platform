/**
 * ONE ASKER FOR EVERY SMALL CLAIMS SCREEN (founder's plan step 5, 1 Nov: "the one asker, not per screen:
 * check caseFileOf before any question is shown"). The permanent check that keeps it so.
 *
 * What it checks, as properties of the code (never a list of today's boxes or calls):
 *   1. every call of the question engine (selectQuestions) outside the engine passes the case file
 *      (`held`), so no caller can pick Small Claims questions without asking the case file;
 *   2. every Small Claims screen that shows a question (a file that renders a Small Claims question
 *      marker: the chat's messages and story proposals, the review's questions and boxes, the form's
 *      boxes) decides through the asker: it imports none of caseFile.ts's per-screen gates (alreadyAsked,
 *      nextQuestion, askable, chatMayAsk) -- those decisions are the asker's;
 *   3. every box of the Small Claims form whose key asks for a case-file fact (asker.ts askedFacts) sits
 *      inside <AskedField field="<its key>">, so a box added later for a held fact is caught;
 *   4. every request to the chat's turn (/api/intake/guided-turn) sends the case file (caseFile:
 *      heldForEngine(...)), and the route hands it to the engine (heldFromRequest -> held);
 *   5. the review's boxes decide by the asker: for every Small Claims review box with a case-file fact,
 *      reviewBoxState agrees with askOf (held answered -> "held", not sure -> "not-yet", a story guess -> "ask").
 * Each structural check has a self-test with a planted violation, so it cannot pass by matching nothing.
 *
 * WHAT FAILURE THIS CATCHES: a Small Claims screen showing a question or a box without going through the
 * asker -- a new engine call without the case file, a screen deciding held questions itself, a new form
 * box for a held fact outside AskedField, a chat request without the case file, or a review box deciding
 * on its own (a story guess shown as the person's answer).
 */
import fs from "node:fs";
import path from "node:path";
import { askedFacts, askOf } from "../../src/lib/case-system/intake/asker";
import { emptyCaseFile, type CaseFile, type Slot, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { reviewBoxState, reviewEntries, type ReviewEntry } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(__dirname, "../..");
const walk = (dir: string): string[] => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
  const rel = path.posix.join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : walk(rel);
  return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
});
/** Code only: comments (which name functions in words, "selectQuestions()") are blanked, keeping positions. */
const code = (text: string) => text
  .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, (line, lead: string) => lead + " ".repeat(line.length - lead.length));
const SOURCES = [...walk("src"), ...walk("app")].map((file) => ({ file, text: code(fs.readFileSync(path.join(ROOT, file), "utf8")) }));

// 1. Every engine call passes the case file.
/** The argument text of each `selectQuestions(` call, by balanced parentheses. */
function engineCalls(text: string): string[] {
  const calls: string[] = [];
  const re = /\bselectQuestions\(/g;
  for (let match = re.exec(text); match; match = re.exec(text)) {
    if (/function\s+$/.test(text.slice(Math.max(0, match.index - 20), match.index))) continue;
    let depth = 1; let i = match.index + match[0].length;
    for (; i < text.length && depth; i++) { if (text[i] === "(") depth++; else if (text[i] === ")") depth--; }
    calls.push(text.slice(match.index + match[0].length, i - 1));
  }
  return calls;
}
const withoutHeld = (text: string) => engineCalls(text).filter((args) => !/\bheld\b/.test(args));
const engineFile = "src/lib/case-system/intake/selectQuestions.ts";
const callers = SOURCES.filter((source) => source.file !== engineFile && engineCalls(source.text).length);
check("the question engine is called from somewhere (check 1 is not vacuous)", callers.length > 0);
for (const source of callers) check(`engine: every selectQuestions call in ${source.file} passes the case file (held)`, withoutHeld(source.text).length === 0, withoutHeld(source.text).map((args) => args.replace(/\s+/g, " ").slice(0, 120)).join(" | "));
check("self-test: a planted engine call without the case file is caught", withoutHeld(`const ids = selectQuestions(facts, answered, QUESTION_BANK, "small-claims", "initial");`).length === 1);
check("self-test: a call with the case file passes", withoutHeld(`selectQuestions(facts, answered, bank, area, "initial", { held: file })`).length === 0);

// 2. Small Claims screens decide through the asker.
const MARKERS = [/data-testid="sc-intake-/, /data-testid="guided-message"/, /data-testid="story-proposal-row"/, /data-testid="intake-initial-question"/, /data-testid="intake-entry"/];
const isScreen = (text: string) => MARKERS.some((marker) => marker.test(text));
const GATES = ["alreadyAsked", "nextQuestion", "askable", "chatMayAsk"];
/** The per-screen gates a file imports from caseFile.ts. */
const gatesImported = (text: string) => [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*caseFile\/caseFile["']/g)].flatMap((match) => match[1].split(",").map((name) => name.trim().split(/\s+as\s+/)[0])).filter((name) => GATES.includes(name));
const screens = SOURCES.filter((source) => source.file.startsWith("app/") && isScreen(source.text));
check("Small Claims question screens are found (check 2 is not vacuous)", screens.length >= 3, screens.map((source) => source.file).join(", "));
for (const source of screens) check(`screen ${source.file}: decides through the asker (imports none of caseFile's per-screen gates)`, gatesImported(source.text).length === 0, gatesImported(source.text).join(", "));
check("self-test: a planted screen importing alreadyAsked is caught", gatesImported(`import { caseFileOf, alreadyAsked } from "../../src/lib/case-system/caseFile/caseFile";`).length === 1);

// 3. Every Small Claims form box for a case-file fact sits inside its AskedField.
/** The form boxes (data-testid="sc-intake-<key>") that ask a case-file fact and are not inside <AskedField field="<key>">. */
function unwrappedBoxes(text: string): string[] {
  const open: { field: string; at: number }[] = [];
  const regions: { field: string; from: number; to: number }[] = [];
  const re = /<AskedField\s+field="([^"]+)"|<\/AskedField>/g;
  for (let match = re.exec(text); match; match = re.exec(text)) {
    if (match[1]) open.push({ field: match[1], at: match.index });
    else { const last = open.pop(); if (last) regions.push({ field: last.field, from: last.at, to: match.index }); }
  }
  return [...text.matchAll(/data-testid="sc-intake-([A-Za-z]+)"/g)]
    .filter((match) => askedFacts(match[1]).length > 0)
    .filter((match) => !regions.some((region) => region.field === match[1] && region.from < match.index! && match.index! < region.to))
    .map((match) => match[1]);
}
const boxFiles = SOURCES.filter((source) => /data-testid="sc-intake-/.test(source.text));
const boxesAsking = boxFiles.flatMap((source) => [...source.text.matchAll(/data-testid="sc-intake-([A-Za-z]+)"/g)].map((match) => match[1]).filter((key) => askedFacts(key).length > 0));
check("the Small Claims form has boxes that ask case-file facts (check 3 is not vacuous)", boxesAsking.length >= 4, boxesAsking.join(", "));
for (const source of boxFiles) check(`form ${source.file}: every box for a case-file fact is inside its AskedField`, unwrappedBoxes(source.text).length === 0, unwrappedBoxes(source.text).join(", "));
check("self-test: a planted box for the amount outside AskedField is caught", unwrappedBoxes(`<label><input data-testid="sc-intake-amountClaimed" /></label>`).join() === "amountClaimed");
check("self-test: a box inside another box's AskedField is caught", unwrappedBoxes(`<AskedField field="goal" value=""><input data-testid="sc-intake-amountClaimed" /></AskedField>`).join() === "amountClaimed");
check("self-test: a box inside its own AskedField passes", unwrappedBoxes(`<AskedField field="amountClaimed" value=""><input data-testid="sc-intake-amountClaimed" /></AskedField>`).length === 0);
check("self-test: a box for no case-file fact needs no AskedField", unwrappedBoxes(`<input data-testid="sc-intake-yourName" />`).length === 0);

// 4. Every chat turn request sends the case file; the route hands it to the engine.
/** Each request body to the turn route that does not send the case file through the asker. */
function turnRequestsWithoutFile(text: string): number {
  const requests = [...text.matchAll(/fetch\(\s*["'`]\/api\/intake\/guided-turn["'`]/g)];
  return requests.filter((match) => !/caseFile:\s*heldForEngine\(/.test(text.slice(match.index!, match.index! + 2_500))).length;
}
const turnCallers = SOURCES.filter((source) => /\/api\/intake\/guided-turn["'`]/.test(source.text) && source.file.startsWith("app/") && !source.file.startsWith("app/api/"));
check("the chat's turn is requested from somewhere (check 4 is not vacuous)", turnCallers.length > 0);
for (const source of turnCallers) check(`chat ${source.file}: every turn request sends the case file (caseFile: heldForEngine(...))`, turnRequestsWithoutFile(source.text) === 0);
check("self-test: a planted turn request without the case file is caught", turnRequestsWithoutFile(`await fetch("/api/intake/guided-turn", { method: "POST", body: JSON.stringify({ facts, answeredIds }) });`) === 1);
const route = fs.readFileSync(path.join(ROOT, "app/api/intake/guided-turn/route.ts"), "utf8");
const routeCalls = [...route.matchAll(/\{ intakeOnly: true[^}]*\}/g)].map((match) => match[0]);
check("route: every turn it runs is handed the case file (held: heldFromRequest(body.caseFile))", routeCalls.length >= 2 && routeCalls.every((call) => /held:\s*heldFromRequest\(body\.caseFile\)/.test(call)), routeCalls.join(" | "));

// 5. The review's boxes decide by the asker.
const ID = "00000000-0000-4000-8000-000000000106";
// The saved form holding every box the Small Claims form draws (its keys read from the form itself), each empty.
const formKeys = [...new Set(boxFiles.flatMap((source) => [...source.text.matchAll(/data-testid="sc-intake-([A-Za-z]+)"/g)].map((match) => match[1])))];
const stored: Checkpoint = { version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: "Synthetic story: a deck was never finished in March 2026.", location: { province: "Ontario", city: "Kingston" } }, "small-claims": { input: Object.fromEntries(formKeys.map((key) => [key, ""])) } } };
const boxes = reviewEntries(stored).filter((entry) => !entry.fromStart && askedFacts(entry.field).length > 0);
check("the Small Claims review has boxes for case-file facts (check 5 is not vacuous)", boxes.length >= 3, boxes.map((entry) => entry.field).join(", "));
const fileWith = (facts: readonly SlotFact[], slot: Slot): CaseFile => { const file = emptyCaseFile(); for (const fact of facts) file[fact] = slot; return file; };
const SLOTS: Record<string, Slot> = {
  answered: { state: "answered", value: "Synthetic answer", confirmed: true, source: { kind: "answer", question: "test" } },
  unsure: { state: "unsure", confirmed: true, source: { kind: "answer", question: "test" } },
  guess: { state: "answered", value: "Guessed", confirmed: false, source: { kind: "story", quote: "Synthetic story" } },
};
const EXPECT: Record<string, string> = { answered: "held", unsure: "not-yet", guess: "ask" };
for (const entry of boxes) {
  const empty: ReviewEntry = { ...entry, value: Array.isArray(entry.value) ? [] : "" };
  for (const [kind, slot] of Object.entries(SLOTS)) {
    const file = fileWith(askedFacts(entry.field), slot);
    const decision = askOf(file, entry.field);
    const agrees = kind === "guess" ? decision.ask : !decision.ask;
    check(`review box ${entry.field}, ${kind}: the box (${reviewBoxState(empty, file)}) follows the asker`, agrees && reviewBoxState(empty, file) === EXPECT[kind], `asker: ${JSON.stringify(decision.ask ? { ask: true } : { held: decision.held })}`);
  }
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("one asker for every Small Claims screen: every check passed.");
