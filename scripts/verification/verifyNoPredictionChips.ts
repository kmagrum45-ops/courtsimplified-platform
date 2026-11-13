/**
 * NO CHIP OR SUGGESTED QUESTION ASKS FOR A PREDICTION OR A GRADE (site owner, 11 Nov 2026: the assistant chip "What
 * would a judge likely be concerned about?" asks for a prediction about a judge, which CLAUDE.md s. 3 forbids).
 *
 * Scans every list of ready-made questions the site offers a person to press (the assistant's quick actions and any
 * array named for chips, starter or suggested questions in app/ and src/) and checks each with the site's own case-
 * strength wording check (caseStrengthLanguageValidator.ts) and with a plain rule for a judge's likely view, a chance,
 * the odds, a win or a loss.
 *
 * WHAT FAILURE THIS CATCHES: a button that asks the assistant to predict or grade the person's case.
 *
 * Run: npm run test:no-prediction-chips
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

/** Words that ask for a prediction or a grade, beyond the case-strength check. */
const PREDICTION = /\bjudge\b[^.?]*\b(?:likely|think|decide|concern|rule|side)|\b(?:likely|chances?|odds|probability)\b[^.?]*\b(?:win|lose|succeed|success|outcome)|\bwill (?:i|we) (?:win|lose)\b|\bhow strong\b|\bstrong case\b|\bweak case\b/i;
/** Array names that hold questions a person presses. */
const LIST_NAMES = /\b(?:quickActions|chips|starterQuestions|suggestedQuestions|SUGGESTED_QUESTIONS|EXAMPLE_QUESTIONS|promptChips)\s*(?::[^=]*)?=\s*\[([\s\S]*?)\]/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

export function promptsIn(text: string): string[] {
  return [...text.matchAll(LIST_NAMES)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"|'([^']+)'|`([^`$]+)`/g)].map((item) => item[1] ?? item[2] ?? item[3]));
}

const found = [...walk("app"), ...walk("src")].flatMap((file) => promptsIn(readFileSync(file, "utf8")).map((prompt) => ({ file, prompt })));
check(`setup: the assistant's quick actions are read (${found.length} prompts)`, found.some((item) => /CourtAssistantChat/.test(item.file)));
const bad = found.filter(({ prompt }) => PREDICTION.test(prompt) || !validateCaseStrengthLanguage(prompt).valid);
check("no chip or suggested question asks for a prediction or a grade", bad.length === 0, bad.map((item) => `${item.file}: "${item.prompt}"`).join("\n      "));
check("self-test: the judge chip is caught", promptsIn('const quickActions = ["What would a judge likely be concerned about?"];').some((prompt) => PREDICTION.test(prompt)));
check("self-test: a plain question passes", !PREDICTION.test("What evidence am I missing?") && validateCaseStrengthLanguage("What evidence am I missing?").valid);

console.log(failures ? `\n${failures} check(s) failed.` : `\nNo chip asks for a prediction (${found.length} checked).`);
process.exit(failures ? 1 : 0);
