/**
 * The next-step analysis finishes inside the time the page and the server allow.
 *
 * What it checks: research's limit plus the main reasoning call's limit (plus a
 * margin for the rest) fit inside how long the page waits (ANALYSIS_TIMEOUT_MS),
 * and the page stops waiting before every area's analysis route reaches its
 * maxDuration; the reasoning call is actually sent with its limit; and when the
 * page stops waiting, Small Claims says it is taking longer, not that it could
 * not reach the server.
 *
 * Failure it exists to catch: the #468 re-test, where a new Small Claims case
 * failed three times running after about 2.5 minutes with "could not reach the
 * server". The page gave up at 120 s while the server (allowed 300 s) was still
 * waiting on a reasoning call with no limit of its own.
 *
 * Run: npm run test:analysis-time-budget
 */
import { readFileSync } from "node:fs";
import { ANALYSIS_TIMEOUT_MS } from "../../app/builder/_components/AnalysisProgress";
import { COGNITION_TIMEOUT_MS } from "../../src/lib/case-system/intelligence/courtSimplifiedBrain";
import { RESEARCH_TIMEOUT_MS } from "../../src/lib/case-system/retrieval/researchStory";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const MARGIN_MS = 20_000; // safety check, save, normalising, the response

check("research and the reasoning call fit inside the page's wait",
  RESEARCH_TIMEOUT_MS + COGNITION_TIMEOUT_MS + MARGIN_MS <= ANALYSIS_TIMEOUT_MS,
  `${RESEARCH_TIMEOUT_MS} + ${COGNITION_TIMEOUT_MS} + ${MARGIN_MS} > ${ANALYSIS_TIMEOUT_MS}`);
for (const court of ["small-claims", "civil", "family"]) {
  const route = readFileSync(`app/api/${court}/analyze/route.ts`, "utf8");
  const max = Number(/export const maxDuration = (\d+);/.exec(route)?.[1] ?? 0) * 1000;
  check(`${court}: the page stops waiting before the route's maxDuration`, max > 0 && ANALYSIS_TIMEOUT_MS < max, `maxDuration ${max / 1000} s`);
}
const brain = readFileSync("src/lib/case-system/intelligence/courtSimplifiedBrain.ts", "utf8");
check("the reasoning call is sent with its limit", brain.includes("}, { timeout: COGNITION_TIMEOUT_MS });"));
const form = readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8");
check("Small Claims: the page stopping its wait reads as taking longer, not as no connection",
  /error\.name === "TimeoutError" \|\| signal\?\.aborted\)\s*\n\s*\? "This is taking longer than it should\./.test(form));

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS analysis time budget: the next step finishes inside the page's wait and the server's limit");
