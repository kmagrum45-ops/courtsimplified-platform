/**
 * "FINISH THE STEP SHOWN BELOW FIRST" ENDS WHEN A QUEUED START NEVER RUNS (Chrome check of #544 on a8c8cf57, 7 Nov 2026,
 * the site owner's item 6).
 *
 * The review shows the line when "Show my next step" (or the case page's link) starts the next step and the route that
 * works it out is not on the page yet: the start is queued (IntakeReviewPanel.tsx, `setWaiting(!continueToGuidance())`).
 * The question was whether a start that never runs leaves the line, and the working button, on screen for good.
 *
 * What it checks:
 *   1. a press no screen takes up ends by itself: the panel's working state (NextStepStatus.tsx, from nextStepPressed)
 *      reads true at once and false after PRESS_WAITS_MS (15 s), with no screen reporting work;
 *   2. the panel ends the waiting line when that working state ends, having been seen (the rule that also ends it after
 *      the work, or after a save error that follows it: tests/browser/waiting-line-ends.spec.ts), read from the source;
 *   3. every place that queues a start also marks the press, so (1) applies to it.
 *
 * WHAT FAILURE THIS CATCHES: a waiting line or a working button left on screen by a start that never ran.
 *
 * Run: npm run test:waiting-line-ends
 */
import { readFileSync } from "node:fs";
import { nextStepPressed, nextStepReadingNow } from "../../app/_components/NextStepStatus";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

async function main() {
  nextStepPressed();
  check("1. a press reads as working at once", nextStepReadingNow());
  await new Promise((resolve) => setTimeout(resolve, 15_500));
  check("1. a press no screen took up has ended after 15 s", !nextStepReadingNow());

  const panel = readFileSync("app/_components/IntakeReviewPanel.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  check("2. the waiting line ends when the working state it saw ends", /if \(working\)[\s\S]{0,80}workSeen\.current = true[\s\S]{0,200}setWaiting\(false\)/.test(panel));
  const queues = [...panel.matchAll(/setWaiting\(!recovery\.continueToGuidance\(\)\)/g)].map((match) => match.index ?? 0);
  check("3. a start is queued somewhere (the case this test is about)", queues.length > 0);
  for (const at of queues) check(`3. the queued start at offset ${at} marks the press first`, panel.slice(Math.max(0, at - 120), at).includes("nextStepPressed()"), panel.slice(Math.max(0, at - 120), at + 50));

  console.log(failures ? `\n${failures} check(s) failed.` : "\nA queued start that never runs leaves no waiting line and no working button.");
  process.exit(failures ? 1 : 0);
}
void main();
