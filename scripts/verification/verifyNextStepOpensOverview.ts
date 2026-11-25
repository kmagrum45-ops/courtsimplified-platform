/**
 * THE CASE PAGE'S "SHOW MY NEXT STEP" AND "UPDATE MY NEXT STEPS" OPEN THE OVERVIEW, NOT THE LAST ROUTE USED (Chrome
 * check of #544, 6 Nov 2026, F6).
 *
 * Chrome: both buttons opened the Small Claims whole form, and the line "Finish the step shown below first; your next
 * step will then appear." stayed after the work ended. Cause: the link (CaseHomeContext.tsx builderHref, startNextStep)
 * opened the builder with no route, so the builder reopened the route last used and started the next step there; when
 * that route had not mounted yet the start was queued, the line was shown, and nothing cleared it once the queued work ran.
 *
 * What it checks (the parts that are code, not screen; the screen is tests/browser/next-step-opens-overview.spec.ts):
 *   1. builderHref with startNextStep opens the overview (?step=results) and starts the next step once (?next=start),
 *      in each court the builder knows; without it, neither;
 *   2. IntakeRecovery's continueToGuidance works the next step out on the overview from the route the answers came
 *      from (the saved builder step), never by opening the whole form or the chooser;
 *   3. the store, opening the builder on the overview, keeps it there when the address asks for the next step (it rewrote
 *      the address to the last route used, meant for resuming an interrupted analysis);
 *   4. IntakeReviewPanel clears the waiting line when the work it waited for ends.
 * 2 to 4 are read from the source (they live inside React components); the browser spec checks the behaviour.
 *
 * WHAT FAILURE THIS CATCHES: a next-step button that lands on a form instead of the step, or a waiting line left on screen.
 *
 * Run: npm run test:next-step-opens-overview
 */
import { readFileSync } from "node:fs";
import { builderHref } from "../../app/cases/_components/CaseHomeContext";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000546";

for (const court of ["small-claims", "civil", "family"]) {
  const href = builderHref({ id: ID, court_path: court }, { startNextStep: true });
  const params = new URL(href, "https://example.invalid").searchParams;
  check(`${court}: the next-step link opens the overview and starts the step once`, params.get("step") === "results" && params.get("next") === "start" && params.get("caseId") === ID, href);
  const plain = new URL(builderHref({ id: ID, court_path: court }), "https://example.invalid").searchParams;
  check(`${court}: the plain builder link neither opens the overview nor starts a step`, !plain.has("step") && !plain.has("next"), plain.toString());
}

const code = (file: string) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const recovery = code("app/_components/IntakeRecovery.tsx");
const continueBody = recovery.slice(recovery.indexOf("continueToGuidance: () => {"), recovery.indexOf("begin: async"));
check("continueToGuidance on the overview runs the route the answers came from (the saved builder step)", /step === "results"/.test(continueBody) && /builder\?\.\s*step|sections\.builder/.test(continueBody), continueBody.slice(0, 600));

const opening = recovery.slice(recovery.indexOf('address.searchParams.get("step") === "results"'), recovery.indexOf('address.searchParams.get("step") === "results"') + 1200);
check("opening the overview with ?next=start keeps the overview (the address is not rewritten to the last route used)", opening.includes('searchParams.get("next") !== "start"'), opening.slice(0, 500));

const panel = code("app/_components/IntakeReviewPanel.tsx");
check("the review clears the waiting line when the work it waited for ends", /if \(working\)[\s\S]{0,80}workSeen\.current = true[\s\S]{0,200}setWaiting\(false\)/.test(panel), "no effect clears `waiting` when `working` ends");

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe next-step buttons open the overview, and the waiting line ends with the work.");
process.exit(failures ? 1 : 0);
