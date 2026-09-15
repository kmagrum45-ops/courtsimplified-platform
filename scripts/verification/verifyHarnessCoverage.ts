/**
 * Which values of a branch-selecting harness parameter have actually been run.
 *
 * COSTS NOTHING. Reads the spec and harness sources off disk. No browser, no
 * network.
 *
 * WHY THIS EXISTS — TWICE IN ONE SESSION (OUTSTANDING_ISSUES section 0e)
 *
 *   1. The builder's location gate. Eight browser specs, none of which had ever
 *      crossed it, so every screen behind `confirmedLocation` was unreachable
 *      from a test — on all three paths.
 *   2. `builderGate.openBuilder(page, path)`, whose signature offers three
 *      paths. It had only ever been called with "family". The "small-claims"
 *      branch used the wrong button text — the gate renders "Continue" there
 *      and "Continue with X questions" elsewhere — and was wrong from the
 *      moment it was written. Found by the first spec that used it.
 *
 * Both are the same thing: **a capability asserted in code with no evidence
 * behind it.** Nothing downstream fails when a helper is merely never called
 * with a particular argument, and when it finally is, the harness's bug
 * surfaces as a failure in whichever spec used it — which reads as a problem
 * with the spec.
 *
 * WHY A DECLARED LIST RATHER THAN INFERENCE FROM THE TYPES
 *
 * Inferring "this parameter is branch-selecting" from a TypeScript union would
 * flag every `Severity`, every option bag, every string literal type that
 * selects nothing. The distinction is semantic: a union whose values take
 * DIFFERENT CODE PATHS matters; one that is just a label does not. A heuristic
 * guessing at it would flag correct code, which is the failure mode CLAUDE.md
 * section 5 exists to prevent. So the author declares it, and the check holds
 * them to it — the same shape as verifyMountConditions and verifyReachability's
 * dormant list.
 *
 * WHAT IT CANNOT SEE: a call whose argument is a variable rather than a
 * literal. Those are reported as `unknown` rather than counted as exercised or
 * unexercised, because claiming either would be a guess.
 *
 * Run: node --import tsx scripts/verification/verifyHarnessCoverage.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SPEC_DIR = path.resolve(process.cwd(), "tests", "browser");

type BranchParameter = {
  /** Exported helper name, as specs call it. */
  helper: string;
  /** Which argument position selects the branch, 0-based. */
  argIndex: number;
  /** Every value the signature accepts. */
  values: string[];
  /** Why these values take different code paths. Required. */
  why: string;
};

/**
 * Parameters where the value changes what the helper DOES, not just what it is
 * labelled. Add one when a helper gains a branch; the check then reports which
 * values no spec has run.
 */
const BRANCH_PARAMETERS: BranchParameter[] = [
  {
    helper: "openBuilder",
    argIndex: 1,
    values: ["family", "small-claims", "civil"],
    why:
      "The gate's Continue button text differs by path — 'Continue' on " +
      "small-claims, 'Continue with X questions' elsewhere — and the story " +
      "field is only rendered off small-claims. Each value takes a different " +
      "path through the helper, and the small-claims branch was wrong for as " +
      "long as it went unrun.",
  },
];

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/**
 * Every spec AND every harness file, with comments stripped.
 *
 * HARNESS FILES ARE INCLUDED DELIBERATELY, and the first run of this check is
 * why. Scanning specs alone reported `openBuilder("small-claims")` as NEVER
 * RUN — but `openSmallClaimsForm` calls it, from inside the harness, and four
 * specs call that. A branch reached through one helper calling another is
 * exercised just as much as one reached directly, and reporting it unexercised
 * would send someone to write a spec that already exists.
 *
 * The irony was worth keeping: a check written to find capabilities asserted
 * without evidence, whose own first output was a claim it had no evidence for.
 */
function scannedSources(): { file: string; source: string }[] {
  const strip = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  const specs = fs
    .readdirSync(SPEC_DIR)
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => ({
      file: name,
      source: strip(fs.readFileSync(path.join(SPEC_DIR, name), "utf8")),
    }));

  const harnessDir = path.join(SPEC_DIR, "harness");
  const harness = fs.existsSync(harnessDir)
    ? fs
        .readdirSync(harnessDir)
        .filter((name) => name.endsWith(".ts"))
        .map((name) => ({
          file: `harness/${name}`,
          source: strip(fs.readFileSync(path.join(harnessDir, name), "utf8")),
        }))
    : [];

  return [...specs, ...harness];
}

/**
 * The literal argument at `argIndex` in each call to `helper`, across all
 * specs. A non-literal argument yields `null`, reported separately.
 */
function argumentsPassed(
  helper: string,
  argIndex: number,
): { literals: Map<string, string[]>; nonLiteral: string[] } {
  const literals = new Map<string, string[]>();
  const nonLiteral: string[] = [];

  for (const { file, source } of scannedSources()) {
    const call = new RegExp(`\\b${helper}\\s*\\(([^)]*)\\)`, "g");
    let match: RegExpExecArray | null;

    while ((match = call.exec(source)) !== null) {
      const args = match[1].split(",").map((part) => part.trim());
      const arg = args[argIndex];
      if (arg === undefined) continue;

      const literal = /^["'`]([^"'`]*)["'`]$/.exec(arg);
      if (literal) {
        const seen = literals.get(literal[1]) || [];
        if (!seen.includes(file)) seen.push(file);
        literals.set(literal[1], seen);
      } else {
        nonLiteral.push(`${file}: ${arg.slice(0, 40)}`);
      }
    }
  }

  return { literals, nonLiteral };
}

function main(): void {
  check("there are specs to scan", scannedSources().length > 0);
  check("there are declared branch parameters", BRANCH_PARAMETERS.length > 0);

  const unexercised: string[] = [];

  for (const parameter of BRANCH_PARAMETERS) {
    check(
      `${parameter.helper}: a reason is recorded`,
      parameter.why.trim().length >= 80,
      "say why these values take different code paths, so the next reader can " +
        "disagree with something specific",
    );

    const { literals, nonLiteral } = argumentsPassed(parameter.helper, parameter.argIndex);

    check(
      `${parameter.helper}: is called by at least one spec`,
      literals.size > 0 || nonLiteral.length > 0,
      "declared as a branch parameter on a helper no spec calls — either the " +
        "helper is dead, or the declaration is stale",
    );

    console.log(`\n  ${parameter.helper}(arg ${parameter.argIndex}):`);
    for (const value of parameter.values) {
      const files = literals.get(value);
      if (files) {
        console.log(`    ${value.padEnd(14)} run by ${files.join(", ")}`);
      } else {
        console.log(`    ${value.padEnd(14)} NEVER RUN`);
        unexercised.push(`${parameter.helper}(${JSON.stringify(value)})`);
      }
    }
    for (const entry of nonLiteral) {
      console.log(`    (non-literal argument, cannot tell: ${entry})`);
    }

    // Values passed that the declaration does not list — the declaration has
    // gone stale, which matters because the report above would then be
    // silently incomplete.
    for (const [value, files] of literals) {
      check(
        `${parameter.helper}: "${value}" is a declared value`,
        parameter.values.includes(value),
        `passed by ${files.join(", ")} but not in the declared list — update ` +
          "BRANCH_PARAMETERS, or the coverage report above is missing a branch",
      );
    }
    console.log("");
  }

  // ---- The report, not a red line ----
  //
  // Same reasoning as verifyAmendmentTrails: exercising a branch means writing
  // a spec, and a check that stays red until someone does is a check people
  // switch off. It fails only on a stale declaration or a dead helper.
  console.log("--- Branch values no spec has run ---");
  if (unexercised.length === 0) {
    console.log("none");
  } else {
    for (const entry of unexercised) console.log(`  ${entry}`);
    console.log(
      `\n${unexercised.length} unexercised branch(es). Each is a capability the ` +
        "signature claims with nothing behind it. Twice in one session that " +
        "shape turned out to be a real defect that surfaced as a failure in " +
        "whichever spec first used it.",
    );
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
