/**
 * A recorded amount is formatted when it is a plain number, and returned
 * untouched when it is not.
 *
 * COSTS NOTHING. Pure function calls.
 *
 * WHY THE SECOND HALF MATTERS MORE THAN THE FIRST. Formatting "10000.00" as
 * "$10,000.00" is cosmetic. Formatting "about $10,000 plus costs" as
 * "$10,000.00" would delete "about" and "plus costs" — a change to what the
 * user said about their own claim, made by display code, with no way for them
 * to see it happened. The strict-parse behaviour is the thing being defended
 * here; the pretty output is incidental.
 *
 * Run: node --import tsx scripts/verification/verifyRecordedAmount.ts
 */

import { pathToFileURL } from "node:url";

import {
  formatRecordedAmount,
  parseRecordedAmount,
} from "../../src/lib/case-system/format/recordedAmount";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function expectFormat(input: string, expected: string): void {
  const actual = formatRecordedAmount(input);
  check(
    `${JSON.stringify(input)} -> ${JSON.stringify(expected)}`,
    actual === expected,
    `got ${JSON.stringify(actual)}`,
  );
}

function main(): void {
  // ---- The same number, written several ways, renders identically ----

  const sameNumber = ["10000.00", "$10,000", "10,000.00", "10000", "$10,000.00"];
  const rendered = sameNumber.map((value) => formatRecordedAmount(value));

  check(
    "every spelling of ten thousand renders identically",
    new Set(rendered).size === 1 && rendered[0] === "$10,000.00",
    `got ${JSON.stringify(rendered)}`,
  );

  expectFormat("10000.00", "$10,000.00");
  expectFormat("$10000.5", "$10,000.50");
  expectFormat("  $1 234.56  ", "$1,234.56");
  expectFormat("0.75", "$0.75");
  expectFormat("1000000", "$1,000,000.00");

  // ---- Anything carrying a qualifier is returned EXACTLY as typed ----
  //
  // Each of these contains a parseable number. Formatting it would drop the
  // words around it, which is the defect.

  const qualified = [
    "about $10,000 plus costs",
    "approximately 10000",
    "$10,000 to $12,000",
    "10000 CAD plus interest",
    "at least $5,000",
    "ten thousand",
    "unknown",
    "TBD",
  ];

  for (const value of qualified) {
    check(
      `${JSON.stringify(value)} is returned untouched`,
      formatRecordedAmount(value) === value,
      `got ${JSON.stringify(formatRecordedAmount(value))}`,
    );
  }

  // ---- Nothing in, nothing out ----

  check("an empty string stays empty", formatRecordedAmount("") === "");
  check("whitespace only stays empty", formatRecordedAmount("   ") === "");
  check("a non-string is empty", formatRecordedAmount(undefined) === "");
  check("a number input is empty, not coerced", formatRecordedAmount(10000 as never) === "");

  // A non-empty input NEVER yields an empty output. Losing the user's text
  // entirely is worse than showing it unformatted.
  for (const value of [...sameNumber, ...qualified, "$", "-", "1,2,3"]) {
    check(
      `${JSON.stringify(value)} never renders as empty`,
      formatRecordedAmount(value).length > 0,
    );
  }

  // ---- The parse agrees with the format ----

  check("parse returns null exactly when format passes through",
    qualified.every((value) => parseRecordedAmount(value) === null) &&
      sameNumber.every((value) => parseRecordedAmount(value) === 10000),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
