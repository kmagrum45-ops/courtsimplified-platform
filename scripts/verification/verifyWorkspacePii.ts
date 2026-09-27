/**
 * The personal-data scanner finds sensitive identifiers and never repeats one back.
 *
 * WHAT THIS CATCHES: the scanner that warns about Social Insurance Numbers putting
 * a Social Insurance Number in the warning.
 *
 * *** THE CENTRAL CHECK, AND WHY IT IS WRITTEN THE WAY IT IS ***
 *
 * `workspace_document_text.pii_flags` stores flag names only. The reason is in the
 * column comment: recording the match would put a SIN in the table that exists to
 * warn about SINs. The same applies to the scan RESULT, which travels to the
 * browser and into logs if anybody logs it.
 *
 * So check 1 does not inspect the code. It serialises the whole result to JSON and
 * requires that no identifier from the input appears anywhere in it, in any of the
 * forms it was written in — spaced, hyphenated and bare. That catches a leak
 * through a field nobody thought about, including one added later, which reading
 * the source would not.
 *
 * *** WHY THE FIXTURES ARE COMPUTED AND NOT WRITTEN DOWN ***
 *
 * A SIN and a card number must pass a Luhn check to be flagged at all. A
 * hard-coded fixture that stops being Luhn-valid — mistyped in an edit, or
 * "tidied" — would make these checks pass while asserting nothing, because the
 * scanner would correctly ignore it and "no leak" would be trivially true.
 *
 * So the check digit is COMPUTED here, by an implementation deliberately written
 * differently from the scanner's. The numbers are fabricated and belong to nobody.
 *
 * *** WHY FALSE POSITIVES ARE CHECKED AS HARD AS TRUE ONES ***
 *
 * A litigant's file is full of invoice numbers, reference numbers, totals and
 * dates. If the scanner flags those, every document gets a warning, and a warning
 * on all forty documents tells the user nothing about which one is the pay stub.
 * A scanner nobody reads is worse than no scanner, so check 3 is not a nicety.
 *
 * COSTS NOTHING. Pure functions. No model, no network, no database.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspacePii.ts
 */

import {
  allPersonalDataFlags,
  scanForPersonalData,
  type PersonalDataFlag,
} from "../../src/lib/case-workspace/personalDataScan";

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE PERSONAL-DATA SCAN");
console.log("");

/**
 * Appends a Luhn check digit. Written as a forward sum over the reversed string,
 * where the scanner walks backwards over the original — the same arithmetic
 * reached differently, so a bug in one is unlikely to be mirrored in the other.
 */
function withLuhnCheckDigit(prefix: string): string {
  const reversed = [...prefix].reverse();
  let sum = 0;
  reversed.forEach((character, index) => {
    let value = Number(character);
    // The check digit will sit at position 0, so the prefix's positions shift by one.
    if (index % 2 === 0) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  });
  return prefix + String((10 - (sum % 10)) % 10);
}

// Fabricated. Nine digits for a SIN, sixteen for a card.
const FAKE_SIN = withLuhnCheckDigit("04645428");
const FAKE_CARD = withLuhnCheckDigit("453212345678901");

/**
 * Nine digits that are NOT Luhn-valid, built by moving the check digit of one that
 * is. Changing only the last digit guarantees the result fails the check.
 *
 * *** WHY THIS EXISTS: A MUTATION GOT THROUGH WITHOUT IT ***
 *
 * Removing the Luhn check entirely — flagging any nine digits as a SIN — left this
 * suite GREEN. Every "ordinary document" fixture happened to contain no bare
 * nine-digit run: phone numbers are 3-3-4, the court file number has hyphens, the
 * reference numbers are ten or twelve digits. So the check that was supposed to
 * prove Luhn earns its place proved nothing about it.
 *
 * A reference number of exactly nine digits is the commonest false positive there
 * is, so it is now in the fixtures, and it is computed rather than written down for
 * the same reason the valid ones are: a hard-coded number that turned out to be
 * Luhn-valid would make this check assert the opposite of what it says.
 */
const NOT_LUHN_NINE = FAKE_SIN.slice(0, 8) + String((Number(FAKE_SIN[8]) + 5) % 10);

const spaced = (digits: string, size: number) =>
  (digits.match(new RegExp(`.{1,${size}}`, "g")) || []).join(" ");
const hyphenated = (digits: string, size: number) =>
  (digits.match(new RegExp(`.{1,${size}}`, "g")) || []).join("-");

// ---------------------------------------------------------------------------
// 0. The fixtures are actually valid, or nothing below means anything
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (FAKE_SIN.length !== 9) problems.push(`the SIN fixture is ${FAKE_SIN.length} digits, not 9`);
  if (FAKE_CARD.length !== 16) problems.push(`the card fixture is ${FAKE_CARD.length} digits, not 16`);

  /*
   * Proved by the scanner agreeing they are findable. If it does not flag them,
   * every "no leak" check below would pass vacuously, so this is asserted first and
   * its failure message says exactly that.
   */
  if (scanForPersonalData(`SIN: ${FAKE_SIN}`).flags.length === 0) {
    problems.push(
      "the computed SIN fixture is not flagged, so every leak check below would " +
        "pass without testing anything",
    );
  }
  if (scanForPersonalData(`Card: ${FAKE_CARD}`).flags.length === 0) {
    problems.push("the computed card fixture is not flagged — same problem");
  }

  if (problems.length === 0) {
    pass("the computed Luhn fixtures are valid and the scanner finds them");
  } else {
    fail("the fixtures are not usable, so nothing else here is evidence", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 1. Nothing the scanner finds appears anywhere in what it returns
// ---------------------------------------------------------------------------

{
  const identifiers = [
    FAKE_SIN,
    spaced(FAKE_SIN, 3),
    hyphenated(FAKE_SIN, 3),
    FAKE_CARD,
    spaced(FAKE_CARD, 4),
    hyphenated(FAKE_CARD, 4),
    "1234567890 AB",
    "A1234-56789-01234",
    "0123456789",
  ];

  const document = [
    "PAY STATEMENT — period ending 3 March 2026",
    `Social Insurance Number: ${spaced(FAKE_SIN, 3)}`,
    `Payment card on file: ${hyphenated(FAKE_CARD, 4)}`,
    "Health card: 1234567890 AB",
    "Driver's licence: A1234-56789-01234",
    "Account number: 0123456789 at transit 00412",
    "Date of birth: 14 June 1981",
  ].join("\n");

  const result = scanForPersonalData(document);
  const serialised = JSON.stringify(result);

  const problems: string[] = [];

  for (const identifier of identifiers) {
    if (serialised.includes(identifier)) {
      /*
       * The leaked value is NOT printed in this failure message, for the same
       * reason the scanner must not return it. The flag name is enough to find it.
       */
      problems.push(
        `an identifier appears in the scan result — ${identifier.length} characters, ` +
          `matching the fixture. The result must carry flag names only.`,
      );
    }
    const digits = identifier.replace(/\D/g, "");
    if (digits.length >= 9 && serialised.includes(digits)) {
      problems.push(`an identifier appears in the result with its separators stripped`);
    }
  }

  if (result.findings.length === 0) {
    problems.push("nothing at all was flagged in a document full of identifiers");
  }

  if (problems.length === 0) {
    pass(
      `${result.findings.length} flags raised on a document carrying ${identifiers.length} ` +
        `identifier forms, and not one of them appears in the result`,
    );
  } else {
    fail("the scanner repeated back what it found", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. Each identifier type is found, in the forms documents actually print
// ---------------------------------------------------------------------------

{
  const expectations: { flag: PersonalDataFlag; texts: string[] }[] = [
    {
      flag: "social-insurance-number",
      texts: [
        `SIN ${spaced(FAKE_SIN, 3)}`,
        `Social Insurance No. ${hyphenated(FAKE_SIN, 3)}`,
        `${FAKE_SIN} is the number`,
      ],
    },
    {
      flag: "payment-card-number",
      texts: [`Visa ${spaced(FAKE_CARD, 4)}`, `card ${FAKE_CARD} expiring 09/29`],
    },
    {
      flag: "ontario-health-card-number",
      texts: ["Health card 1234-567-890 AB", "HC: 1234567890 XY"],
    },
    {
      flag: "canadian-bank-account",
      texts: ["Account Number: 0123456789", "transit no. 00412", "IBAN GB29 1234 5678 9012"],
    },
    {
      flag: "ontario-drivers-licence",
      texts: ["Licence A1234-56789-01234", "DL M4567 89012 34567"],
    },
    {
      flag: "date-of-birth",
      texts: ["Date of Birth: 14 June 1981", "D.O.B. 1981-06-14", "born on 14/06/1981"],
    },
  ];

  const problems: string[] = [];

  for (const expectation of expectations) {
    for (const text of expectation.texts) {
      const flags = scanForPersonalData(text).flags;
      if (!flags.includes(expectation.flag)) {
        problems.push(
          `${expectation.flag} was not flagged in a document that prints it in a ` +
            `form a real document uses (${text.length} characters, flags: ` +
            `${flags.length === 0 ? "none" : flags.join(", ")})`,
        );
      }
    }
  }

  /*
   * A property, not a list: every flag the scanner declares must be reachable. A
   * rule added without a case here is a rule nobody has ever seen fire.
   */
  const covered = new Set(expectations.map((expectation) => expectation.flag));
  for (const flag of allPersonalDataFlags()) {
    if (!covered.has(flag)) {
      problems.push(`the scanner declares "${flag}" but nothing here exercises it`);
    }
  }

  if (problems.length === 0) {
    pass(
      `all ${allPersonalDataFlags().length} flags fire on realistic text, ` +
        `${expectations.reduce((n, e) => n + e.texts.length, 0)} cases`,
    );
  } else {
    fail("the scanner misses identifiers it claims to find", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. Ordinary litigation documents are not flagged
// ---------------------------------------------------------------------------

{
  /*
   * Every string here is something that genuinely appears in a self-represented
   * litigant's file. If any of them flags, the scanner fires on nearly every
   * document and stops carrying information.
   */
  const ordinary: [string, string][] = [
    ["an invoice with a total", "Invoice 4471. Total due: $4,200.00. Terms 30 days."],
    ["a phone number", "Call me on 416-555-0182 or 647 555 0199."],
    ["an email and a postcode", "j.okonkwo@example.com, 42 Main St, Toronto M5V 2T6"],
    ["a court file number", "Court File No. SC-26-00004471-0000"],
    ["dates without a birth label", "Served 3 March 2026. Filed 2026-03-11. Due 14/06/2026."],
    ["a cheque and reference number", "Cheque 000482, reference 998877665544"],
    ["an amount that looks like digits", "The balance was 1250000 cents."],
    ["a tracking number", "Tracking 1Z999AA10123456784 delivered 9 March."],
    ["a ten-digit number with no version code", "Ref 1234567890 relates to the claim."],
    ["a statute citation", "Municipal Act, 2001, S.O. 2001, c. 25, s. 44 (10)"],
    // The case that Luhn exists for. Nine bare digits, not a SIN.
    ["a nine-digit reference number", `Purchase order ${NOT_LUHN_NINE} shipped 9 March.`],
    ["nine digits spaced in threes", `Our ref ${spaced(NOT_LUHN_NINE, 3)} refers.`],
  ];

  const problems: string[] = [];

  /*
   * The fixture has to be genuinely Luhn-invalid or the two cases above are
   * asserting the opposite of what they claim. Proved against the scanner itself:
   * presented as a SIN, it must NOT be flagged.
   */
  if (NOT_LUHN_NINE === FAKE_SIN || NOT_LUHN_NINE.length !== 9) {
    problems.push("the Luhn-invalid fixture is not a distinct nine-digit number");
  } else if (scanForPersonalData(`SIN: ${NOT_LUHN_NINE}`).flags.includes("social-insurance-number")) {
    problems.push(
      "the supposedly Luhn-invalid fixture WAS flagged as a SIN, so the two " +
        "false-positive cases below prove nothing",
    );
  }

  for (const [label, text] of ordinary) {
    const flags = scanForPersonalData(text).flags;
    if (flags.length > 0) {
      problems.push(`${label} was flagged as ${flags.join(", ")} — it is an ordinary document line`);
    }
  }

  if (problems.length === 0) {
    pass(`${ordinary.length} ordinary litigation lines produce no flags at all`);
  } else {
    fail("the scanner fires on ordinary documents, so it will be ignored", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. Empty and absent input
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  for (const input of [null, undefined, "", "   \n\n  "]) {
    const result = scanForPersonalData(input);
    if (result.findings.length !== 0 || result.flags.length !== 0) {
      problems.push(`input ${JSON.stringify(input)} produced flags`);
    }
  }

  // A document that is clean must be distinguishable from one never scanned, and
  // that distinction lives in extraction_status, not in an empty flag list.
  const clean = scanForPersonalData("A letter about a fence, dated 3 March 2026.");
  if (clean.flags.length !== 0) problems.push("a clean document was flagged");

  // Counts are de-duplicated: the same number twice is one finding, not two.
  const twice = scanForPersonalData(`SIN ${FAKE_SIN} and again ${FAKE_SIN}`);
  const sin = twice.findings.find((f) => f.flag === "social-insurance-number");
  if (!sin) {
    problems.push("a repeated SIN was not flagged at all");
  } else if (sin.count !== 1) {
    problems.push(`the same SIN twice was counted ${sin.count} times, not de-duplicated`);
  }

  if (problems.length === 0) {
    pass("empty, null and clean input produce no flags, and a repeated identifier counts once");
  } else {
    fail("edge cases are handled wrongly", problems.join("\n"));
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
