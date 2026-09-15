/**
 * A loaded case restores what it recorded, and invents nothing when it did not.
 *
 * COSTS NOTHING. Reads `app/builder/page.tsx` and the engine that writes the
 * keys it reads. No browser, no network, no database.
 *
 * WHY THIS EXISTS. Section 0d: the existing-case load never set
 * `confirmedLocation`, so a returning user met the intake location gate again
 * and everything behind it was unreachable — the family triage and intake, the
 * child support screen and table card, the Small Claims mode chooser and both
 * its intakes, the civil intake. `setConfirmedLocation` had three callers and
 * the load path was not one of them.
 *
 * WHAT MAKES THIS FRAGILE ENOUGH TO CHECK. The restore reads two keys out of a
 * JSON blob — `master_result.intakeData.extra.yourProvince` and `.yourCity` —
 * that are written four steps away, by a spread (`...input`) in
 * smallClaimsIntelligenceEngine. Nothing in TypeScript connects the read to the
 * write: rename the input field, or stop spreading it, and the restore silently
 * stops working while everything compiles. The user then meets the gate again
 * and nothing anywhere goes red.
 *
 * That is the shape this codebase keeps finding — a reader and a writer that
 * agree only by convention — so the check asserts they still agree.
 *
 * Run: node --import tsx scripts/verification/verifyCaseLoadRestore.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BUILDER = path.resolve(process.cwd(), "app", "builder", "page.tsx");
const ENGINE = path.resolve(
  process.cwd(),
  "src",
  "lib",
  "case-system",
  "intelligence",
  "smallClaimsIntelligenceEngine.ts",
);
const INTAKE = path.resolve(
  process.cwd(),
  "app",
  "builder",
  "_components",
  "SmallClaimsIntake.tsx",
);

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function source(file: string): string {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

function main(): void {
  const builder = source(BUILDER);
  const engine = source(ENGINE);
  const intake = source(INTAKE);

  // ---- THE WRITE SIDE still puts the location where the read expects it ----

  check(
    "the intake sets yourProvince/yourCity from the confirmed location",
    /yourProvince:\s*location\.province/.test(intake) &&
      /yourCity:\s*location\.city/.test(intake),
    "SmallClaimsIntake is where the location enters the input. If these stop " +
      "being set, nothing downstream has a location to store or restore",
  );

  check(
    "the engine spreads the whole input into payload.extra",
    /extra:\s*\{\s*\.\.\.input/.test(engine),
    "the restore reads master_result.intakeData.extra.yourCity, which exists " +
      "only because the engine spreads ...input into extra. A narrowed spread " +
      "would drop it silently and the restore would stop working",
  );

  check(
    "the builder stores the completed intake as master_result.intakeData",
    /intakeData:\s*caseData/.test(builder),
    "the read path is master_result.intakeData.extra — if the key is renamed " +
      "here, the restore finds nothing",
  );

  // ---- THE READ SIDE ----

  check(
    "the case load restores confirmedLocation",
    /setConfirmedLocation\(\{\s*province:\s*"Ontario",\s*city:\s*storedCity\s*\}\)/.test(
      builder,
    ),
    "this is the fix for section 0d — without it a returning user meets the " +
      "location gate again and everything behind it is unreachable",
  );

  check(
    "it reads the two keys the write side produces",
    /intakeData\)\.extra/.test(builder) &&
      /yourCity/.test(builder) &&
      /yourProvince/.test(builder),
  );

  check(
    "the story is restored too, not only the location",
    /setHomeStory\(storedFacts\.trim\(\)\)/.test(builder),
    "the gate collects province, city AND the story. Restoring the location " +
      "alone skips the gate while leaving the intake's prefill empty",
  );

  // ---- IT INVENTS NOTHING ----
  //
  // The property that matters most. A case with no recorded location must fall
  // through to the gate, because there is genuinely no location and attaching
  // a guessed city to a court document is worse than asking again.

  check(
    "the restore is conditional on a recorded city",
    /if \(storedProvince === "Ontario" && storedCity\)/.test(builder),
    "an unconditional restore would set an empty or partial location",
  );

  check(
    "the restore does not read a local draft belonging to another case",
    !/loadCompactBuilderDraft[\s\S]{0,400}setConfirmedLocation[\s\S]{0,200}storedCity/.test(
      builder,
    ),
    "saveCompactBuilderDraft stores ONE draft per user, not per case — it holds " +
      "whichever case was worked last. Using it here would attach another " +
      "case's city to this one",
  );

  // ---- THE GATE STAYS REACHABLE ----

  check(
    "a restored location can be changed",
    /data-testid="change-recorded-location"/.test(builder) &&
      /setConfirmedLocation\(null\)/.test(builder),
    "a location restored from a case says where the case was started, not " +
      "where the user is now. Before the restore, the gate re-appearing was " +
      "the only way to change it",
  );

  check(
    "the change control is shown only for a restored location",
    /locationRestoredFromCase && confirmedLocation/.test(builder),
    "a user who just answered the gate does not need to be told they can " +
      "answer it again",
  );

  // ---- SELF-TEST ----
  //
  // Every assertion above is a regex over a file. One that silently matched
  // nothing — a moved file, an empty read — would let all of them pass while
  // establishing nothing, which is the vacuous shape recorded in section 0.
  check(
    "self-test: the sources were actually read",
    builder.length > 10_000 && engine.length > 5_000 && intake.length > 5_000,
    `builder=${builder.length} engine=${engine.length} intake=${intake.length}`,
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
