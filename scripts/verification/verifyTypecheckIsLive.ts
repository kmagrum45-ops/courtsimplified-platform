/**
 * The project's typecheck can actually fail.
 *
 * WHAT THIS CATCHES: a typecheck that reports success while checking nothing.
 *
 * On 2026-09-26 `npx tsc --noEmit` emitted only syntax errors from
 * `.next/dev/types/validator.ts`, a generated dev-server file. Those were filtered
 * out as noise — reasonably, they are not our code — and the remaining count of
 * zero was read as "types are fine". It was not. **When a TypeScript program
 * contains parse errors, tsc reports syntactic diagnostics and skips semantic
 * checking for the entire program.** Every type error in `src/` was invisible for
 * as long as that generated file stayed malformed, and four real errors were in
 * fact sitting in `citations.ts` at the time.
 *
 * The shape of that failure is the dangerous part: it did not look like a broken
 * check. It looked like a passing one.
 *
 * So this asserts the property directly — a deliberate type error MUST be
 * reported. It runs the same command the project runs, because checking a
 * different command would prove nothing about the one people use.
 *
 * COSTS: one tsc run. No network, no model, no database.
 *
 * Run: node --import tsx scripts/verification/verifyTypecheckIsLive.ts
 */

import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

/*
 * Inside src/ so it is picked up by the same include globs as real code. A canary
 * placed somewhere the config does not look would pass while proving nothing,
 * which is the exact failure being guarded against.
 */
const CANARY = path.join(ROOT, "src", "__typecheck_canary__.ts");

const CANARY_SOURCE = `/**
 * TEMPORARY. Written and deleted by scripts/verification/verifyTypecheckIsLive.ts.
 * If you are reading this in a commit, that suite crashed and this needs deleting.
 */
export const deliberatelyWrong: number = "this is not a number";
`;

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("TYPECHECK IS LIVE");
console.log("");

function runTypecheck(): { code: number; output: string } {
  const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.verify.json"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: 10 * 60 * 1000,
  });
  return { code: r.status ?? -1, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

try {
  // 1. Clean, the typecheck must pass. Otherwise step 2 proves nothing: a
  //    typecheck that always fails would "detect" the canary for the wrong reason.
  const clean = runTypecheck();
  if (clean.code === 0) {
    pass("the project typechecks clean before the canary is introduced");
  } else {
    fail(
      "the project does not typecheck clean, so this suite cannot prove anything",
      clean.output.split("\n").filter(Boolean).slice(0, 8).join("\n"),
    );
  }

  // 2. With a deliberate error, it must fail AND name the canary.
  writeFileSync(CANARY, CANARY_SOURCE, "utf8");
  const dirty = runTypecheck();

  if (dirty.code === 0) {
    fail(
      "A DELIBERATE TYPE ERROR WAS NOT REPORTED — the typecheck is checking nothing",
      "This is the 2026-09-26 failure returning: a parse error somewhere in the\n" +
        "program makes tsc skip semantic checking for every file, and the run then\n" +
        "looks like a pass. Find the file with the syntax error.",
    );
  } else if (!dirty.output.includes("__typecheck_canary__")) {
    fail(
      "the typecheck failed, but not because of the canary",
      "Something else is broken, so this run cannot confirm semantic checking:\n" +
        dirty.output.split("\n").filter(Boolean).slice(0, 8).join("\n"),
    );
  } else {
    pass("a deliberate type error IS reported — semantic checking is in effect");
  }
} finally {
  if (existsSync(CANARY)) unlinkSync(CANARY);
  if (existsSync(CANARY)) {
    fail("the canary file could not be deleted", CANARY);
  } else {
    pass("the canary file was removed");
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
