/**
 * Every court path that accepts a free-text narrative runs the safety pass
 * before extraction.
 *
 *   npm run test:safety-coverage
 *
 * COSTS NOTHING. Source scanning and one pure import. No model call.
 *
 * WHY THIS EXISTS
 *
 * For months the safety pass ran on ONE path out of three. Small Claims called
 * it; Family and Civil did not. The path most likely to carry a real
 * disclosure of danger — family — was one of the two where nothing read it.
 *
 * Nothing caught it, and nothing could have. `verifySafetyPassRegression`
 * tests how the classifier behaves GIVEN that it runs. `verifyIntakeCoverage`
 * tests content coverage. Neither asks the question this file asks: ON WHICH
 * PATHS DOES THE SAFETY PASS RUN AT ALL.
 *
 * The cause is recorded in OUTSTANDING_ISSUES section 0k. In short, a cost
 * constraint ("it calls a paid model, so the route needs auth") became a
 * safety constraint ("so paths without accounts get no check") through four
 * individually-sound steps that nobody ever stated as one sentence.
 *
 * THE PROPERTY, and why it is a property rather than a list:
 *
 *   An intake component that collects a free-text narrative must call
 *   runClientSafetyCheck (or orchestrateIntakeTurn, which calls runSafetyPass
 *   server-side) before it submits that narrative for analysis.
 *
 * It fails when a NEW path is added without the check, which is exactly how
 * this gap appeared. It does not pin today's three paths, and adding a fourth
 * intake will fail it until that intake is wired — which is the point.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT:
 *   - That the classification is correct. That is verifySafetyPassRegression.
 *   - HOW a path responds. Small Claims and Civil halt on immediate-danger;
 *     family shows resources and continues, by an explicit product decision
 *     recorded in FamilyIntake.tsx. Divergence there is intended, and pinning
 *     it would make a deliberate change look like a regression.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const INTAKE_DIR = path.join("app", "builder", "_components");

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function read(relative: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

/**
 * An intake component is one that submits a narrative for analysis. Detected
 * by behaviour rather than by a hardcoded filename list, so a new intake is
 * picked up automatically.
 *
 * The two markers together are what make this specific: a file that merely
 * mentions `facts` is not an intake, and a file that posts somewhere is not
 * necessarily submitting a narrative.
 */
function narrativeIntakeComponents(): string[] {
  const dir = path.join(REPO_ROOT, INTAKE_DIR);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => /Intake\.tsx$/.test(name))
    .filter((name) => {
      const text = fs.readFileSync(path.join(dir, name), "utf8");
      // Collects a free-text narrative AND submits it somewhere.
      const collectsNarrative = /\bfacts\b/.test(text) || /storyText/.test(text);
      const submits = /handleAnalyze|onComplete\(|\/api\//.test(text);
      return collectsNarrative && submits;
    })
    .map((name) => path.join(INTAKE_DIR, name));
}

/** The two legitimate ways to reach the pass. */
const CLIENT_CALL = /runClientSafetyCheck\s*\(/;
const SERVER_TURN = /orchestrateIntakeTurn|\/api\/intake\/guided-turn/;

function main(): void {
  const components = narrativeIntakeComponents();

  check(
    "at least one narrative intake component was found (the scan is not silently empty)",
    components.length > 0,
    `looked in ${INTAKE_DIR} for *Intake.tsx that collect a narrative and submit it`,
  );

  console.log(`\nnarrative intakes found: ${components.length}`);
  for (const component of components) console.log(`  ${component}`);
  console.log("");

  for (const component of components) {
    const text = read(component);
    const viaClient = CLIENT_CALL.test(text);
    const viaServer = SERVER_TURN.test(text);

    check(
      `${path.basename(component)} runs the safety pass before analysis`,
      viaClient || viaServer,
      "No call to runClientSafetyCheck and no server-orchestrated turn. A path " +
        "that takes a user's account of what happened and never runs it past " +
        "the safety pass is the defect this check exists for. See " +
        "src/lib/case-system/intake/clientSafetyCheck.ts.",
    );
  }

  // ---- The route must not have regained an auth requirement ----
  //
  // This is the specific regression that created the gap. If the route starts
  // refusing anonymous callers again, every path that lacks an account
  // requirement silently stops being checked -- exactly as before, and just as
  // invisibly.
  {
    const route = read(path.join("app", "api", "intake", "safety-check", "route.ts"));
    const refusesAnonymous =
      /Sign in required/.test(route) || /\bauthenticate\s*\(/.test(route);

    check(
      "the safety-check route still accepts anonymous callers",
      !refusesAnonymous,
      "The route appears to require a session again. That requirement is what " +
        "silently removed the safety pass from Family and Civil: a constraint " +
        "about model cost became a constraint about who gets protected. If an " +
        "auth requirement is genuinely wanted, every intake path must adopt it " +
        "at the same time, and this check should be updated deliberately.",
    );
  }

  // ---- The shared helper must fail open ----
  //
  // A safety classifier that throws and blocks submission would stop people
  // reaching their own case because of a network fault. The helper's contract
  // is that every failure path returns "clear".
  {
    const helper = read(
      path.join("src", "lib", "case-system", "intake", "clientSafetyCheck.ts"),
    );
    check(
      "the client safety helper catches its own failures",
      /catch\s*{/.test(helper) && /return CLEAR/.test(helper),
      "runClientSafetyCheck must return a clear result on any failure rather " +
        "than throwing into the caller's submit path.",
    );
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
