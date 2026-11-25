/**
 * NOTHING STARTS WORKING OUT NEXT STEPS WHILE THE INTAKE IS UNCONFIRMED, INCLUDING AFTER A RESTART
 * (Chrome check of #544, 6 Nov 2026, F5; site owner's decision the same day).
 *
 * Chrome, Small Claims: after "Start the questions again from my story" and "Send my story", with the review saying
 * "You changed an answer, so please review and confirm again", the chat area showed "Working out your next steps from
 * the court rules... (1 s)". Cause: when the chat finishes it hands its answers to the builder (handleGuidedComplete),
 * which switched the working note on and began the AI step (beforeIntakeAI) BEFORE asking the one gate
 * (usePrepareCaseGuidance: no next step while the intake is unconfirmed or its answers read an earlier story). The
 * gate then stopped it, so no next step was made, but the note showed and the AI step began.
 *
 * The property checked, on each Small Claims path that starts next steps (the chat's finish, the whole form's
 * Continue): the gate is asked first, before the working note is switched on or the AI step begins; and the gate
 * itself still refuses an unconfirmed intake (IntakeRecovery.tsx). Read from the code, so any reordering fails.
 * Civil and Family have the same order and are listed, not changed (outside the Small Claims demo path).
 *
 * WHAT FAILURE THIS CATCHES: "Working out your next steps" (or an AI step) while the person still has to confirm.
 *
 * Run: npm run test:no-next-step-unconfirmed
 */
import { readFileSync } from "node:fs";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const code = (file: string) => readFileSync(file, "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
/** The body of `async function <name>(`, to the next top-level `async function` or the end. */
function body(file: string, name: string): string {
  const text = code(file);
  const start = text.indexOf(`async function ${name}(`);
  if (start < 0) return "";
  const next = text.indexOf("\n  async function ", start + 10);
  return text.slice(start, next < 0 ? undefined : next);
}
// Each needle a pattern, so this file never holds a network call's text (test:canlii reads that text as a fetching script).
const firstOf = (text: string, needles: RegExp[]) => Math.min(...needles.map((needle) => { const at = text.search(needle); return at < 0 ? Infinity : at; }));

const PATHS: [string, string, string][] = [
  ["the chat's finish (handleGuidedComplete)", "app/builder/page.tsx", "handleGuidedComplete"],
  ["the whole form's Continue (SmallClaimsIntake handleAnalyze)", "app/builder/_components/SmallClaimsIntake.tsx", "handleAnalyze"],
];
for (const [what, file, name] of PATHS) {
  const text = body(file, name);
  const gate = text.indexOf("prepareCaseGuidance(");
  const starts = firstOf(text, [/setGuidedAnalyzing\(true\)/, /beforeIntakeAI\(/, /setLoading\(true\)/, /\bfetch\s*\(/]);
  check(`F5: ${what}: the gate is asked before the working note or the AI step`, text.length > 0 && gate >= 0 && gate < starts, `gate at ${gate}, first start at ${starts}`);
}
const recovery = code("app/_components/IntakeRecovery.tsx");
const gate = recovery.slice(recovery.indexOf("export function usePrepareCaseGuidance"), recovery.indexOf("export function intakeGuidanceHeaders"));
check("the gate refuses an intake that is not confirmed", /reviewPhase\([^)]*\)\s*!==\s*"user-confirmed"[\s\S]*?return false/.test(gate));
check("the gate refuses answers that read an earlier story", /storyAnswersOutdated\([^)]*\)\)\s*\{[\s\S]*?return false/.test(gate));

console.log(failures ? `\n${failures} check(s) failed.` : "\nNothing starts working out next steps while the intake is unconfirmed.");
process.exit(failures ? 1 : 0);
