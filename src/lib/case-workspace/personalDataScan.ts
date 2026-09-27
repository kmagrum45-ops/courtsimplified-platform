/**
 * Finds sensitive identifiers in extracted document text, and reports FLAG NAMES
 * ONLY — never the thing it found.
 *
 * WHAT THIS CATCHES: a user including a document without realising what is printed
 * on it. A bank statement carries an account number; an insurance letter carries a
 * health card number; a pay stub carries a Social Insurance Number.
 *
 * *** WHY THE MATCH IS NEVER RETURNED OR STORED ***
 *
 * `workspace_document_text.pii_flags` is a `text[]` of flag names, and its column
 * comment says why: recording the match would put a SIN in the table that exists to
 * warn about SINs. This module is built to make that mistake impossible rather than
 * merely discouraged — `scan()` has no code path that copies matched text into its
 * result, and `test:workspace-pii` drives it with known identifiers and asserts
 * none of them appears anywhere in the output.
 *
 * *** WHY IT SAYS NOTHING ABOUT WHAT THE USER SHOULD DO ***
 *
 * The obvious wording — "court files are public, so consider redacting this" — is a
 * legal statement about Ontario court records, and CLAUDE.md §2 forbids writing one
 * without a retrieved, citable source. None is cited here, so no such claim is
 * made. Every message below is a statement about the DOCUMENT and nothing else:
 * what appears to be printed on it. The user decides what that means.
 *
 * That restraint is deliberate and should not be "improved" by adding the
 * consequence. If the consequence is worth stating, it needs a source first, and it
 * belongs in sourced content rather than in a scanner.
 *
 * *** WHY LUHN, AND WHY NOT EMAILS AND PHONE NUMBERS ***
 *
 * A Canadian SIN and a payment card both carry a Luhn check digit, so checking it
 * removes almost every false positive that a bare nine-digit pattern would produce
 * — an invoice total, a reference number, a date range. Without it this scanner
 * would flag most documents and be ignored, which is worse than not having it.
 *
 * Emails, phone numbers and postal addresses are deliberately NOT flagged. They
 * appear on nearly every letter, invoice and email in a litigant's file, so
 * flagging them would mean flagging everything. A warning that fires on all 40
 * documents tells the user nothing about which one is the pay stub.
 *
 * COSTS NOTHING. Pure functions. No model, no network. Nothing in this file calls
 * anything.
 */

export type PersonalDataFlag =
  | "social-insurance-number"
  | "payment-card-number"
  | "ontario-health-card-number"
  | "canadian-bank-account"
  | "ontario-drivers-licence"
  | "date-of-birth";

export type PersonalDataFinding = {
  flag: PersonalDataFlag;
  /** How many distinct matches. A count is not the matched text. */
  count: number;
  /** Shown to the user. States what is on the document and nothing more. */
  message: string;
};

/** Luhn check, as used by both SINs and payment cards. */
function passesLuhn(digits: string): boolean {
  if (digits.length < 9) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = digits.charCodeAt(index) - 48;
    if (value < 0 || value > 9) return false;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

type Rule = {
  flag: PersonalDataFlag;
  message: string;
  /**
   * Returns the matches as OPAQUE KEYS used only for de-duplicating a count.
   * A key may be any stable token — it is never returned to a caller and never
   * stored. Kept local to this function so no match escapes it.
   */
  find: (text: string) => Set<string>;
};

/*
 * A SIN is nine digits, optionally grouped in threes, and Luhn-valid.
 *
 * The boundary is written with an explicit non-digit lookaround rather than \b,
 * because \b sits between a digit and a space but ALSO between a digit and a
 * letter — so "INV123456782" would match. A reference number that happens to be
 * Luhn-valid is exactly the false positive this scanner cannot afford.
 */
const SIN_PATTERN = /(?<![\d-])(\d{3}[ -]?\d{3}[ -]?\d{3})(?![\d-])/g;

/*
 * 13 to 19 digits, in groups of four or unbroken, Luhn-valid. The leading digit is
 * not restricted to a known network: this is a warning, not a payment system, and
 * a card the rules do not recognise is still a card number printed on a document.
 */
const CARD_PATTERN = /(?<![\d-])(\d{4}(?:[ -]?\d{4}){2,4}|\d{13,19})(?![\d-])/g;

/*
 * An Ontario health card number is ten digits plus a two-letter version code. The
 * version code is what makes this safely distinguishable from any other ten-digit
 * number, so it is REQUIRED — a bare ten digits is not flagged. That means a health
 * card written without its version code is missed, which is the right trade: the
 * alternative flags every phone number written without punctuation.
 */
const HEALTH_CARD_PATTERN = /(?<![\d-])(\d{4}[ -]?\d{3}[ -]?\d{3})[ -]([A-Z]{2})(?![A-Za-z])/g;

/*
 * Requires a LABEL, not just the digits. A Canadian account is a 5-digit transit, a
 * 3-digit institution and a 7-to-12-digit account, and unlabelled digit runs of
 * those lengths are indistinguishable from invoice numbers. So this fires on the
 * words a bank statement actually prints.
 */
/*
 * *** WHY THE DIGITS ARE COUNTED RATHER THAN MATCHED AS A RUN ***
 *
 * The first version required five CONSECUTIVE digits after the label, and it missed
 * `IBAN GB29 1234 5678 9012`. The check found that; reading the pattern did not.
 * Account numbers are routinely printed in groups — on statements as much as on an
 * IBAN — so a consecutive run is the wrong shape. The label is matched here and the
 * digits in the window after it are counted in `find`, which a regex cannot do.
 */
const BANK_LABEL_PATTERN =
  /\b(?:account\s*(?:no\.?|number|#)|transit\s*(?:no\.?|number|#)?|institution\s*(?:no\.?|number|#)?|IBAN)\b/gi;

/** How far past the label to look. One line's worth, not the whole page. */
const BANK_WINDOW = 28;

/** At least this many digits in that window, in any grouping. */
const BANK_MIN_DIGITS = 5;

/*
 * Ontario driver's licence: one letter then 14 digits, conventionally written
 * A1234-56789-01234.
 */
const LICENCE_PATTERN = /(?<![A-Za-z0-9])([A-Za-z]\d{4}[ -]?\d{5}[ -]?\d{5})(?![A-Za-z0-9])/g;

/*
 * A date of birth is flagged only where the document SAYS it is one. Any other
 * approach flags every date in a litigant's file, and a litigant's file is mostly
 * dates.
 */
const DOB_PATTERN =
  /\b(?:date\s+of\s+birth|d\.?o\.?b\.?|birth\s*date|born\s+on)\b[^\n]{0,30}?\d/gi;

const RULES: Rule[] = [
  {
    flag: "social-insurance-number",
    message: "This document appears to contain a Social Insurance Number.",
    find: (text) => {
      const found = new Set<string>();
      for (const match of text.matchAll(SIN_PATTERN)) {
        const digits = digitsOnly(match[1]);
        if (digits.length === 9 && passesLuhn(digits)) found.add(digits);
      }
      return found;
    },
  },
  {
    flag: "payment-card-number",
    message: "This document appears to contain a credit or debit card number.",
    find: (text) => {
      const found = new Set<string>();
      for (const match of text.matchAll(CARD_PATTERN)) {
        const digits = digitsOnly(match[1]);
        if (digits.length >= 13 && digits.length <= 19 && passesLuhn(digits)) {
          found.add(digits);
        }
      }
      return found;
    },
  },
  {
    flag: "ontario-health-card-number",
    message: "This document appears to contain a health card number.",
    find: (text) => {
      const found = new Set<string>();
      for (const match of text.matchAll(HEALTH_CARD_PATTERN)) {
        found.add(digitsOnly(match[1]) + match[2].toUpperCase());
      }
      return found;
    },
  },
  {
    flag: "canadian-bank-account",
    message: "This document appears to contain a bank account number.",
    find: (text) => {
      const found = new Set<string>();
      for (const match of text.matchAll(BANK_LABEL_PATTERN)) {
        const start = (match.index ?? 0) + match[0].length;
        /*
         * Stopped at a newline: a label at the end of one line and a number at the
         * start of the next are usually unrelated, and crossing the break is how a
         * scanner starts flagging invoice totals that happen to follow the word
         * "account".
         */
        const window = text.slice(start, start + BANK_WINDOW).split("\n")[0];
        if (digitsOnly(window).length >= BANK_MIN_DIGITS) {
          found.add((match[0] + window).toLowerCase());
        }
      }
      return found;
    },
  },
  {
    flag: "ontario-drivers-licence",
    message: "This document appears to contain a driver's licence number.",
    find: (text) => {
      const found = new Set<string>();
      for (const match of text.matchAll(LICENCE_PATTERN)) {
        found.add(match[1].replace(/[ -]/g, "").toUpperCase());
      }
      return found;
    },
  },
  {
    flag: "date-of-birth",
    message: "This document appears to contain a date of birth.",
    find: (text) => new Set([...text.matchAll(DOB_PATTERN)].map((m) => m[0].toLowerCase())),
  },
];

export type PersonalDataScanResult = {
  findings: PersonalDataFinding[];
  /** Exactly what goes into `workspace_document_text.pii_flags`. */
  flags: PersonalDataFlag[];
};

export function scanForPersonalData(text: string | null | undefined): PersonalDataScanResult {
  if (typeof text !== "string" || text.length === 0) {
    return { findings: [], flags: [] };
  }

  const findings: PersonalDataFinding[] = [];

  for (const rule of RULES) {
    const matches = rule.find(text);
    if (matches.size > 0) {
      /*
       * `matches` goes out of scope here and is never read again. Only its SIZE
       * crosses into the result. This is the one place the rule about not
       * returning matched text is actually kept, so it is kept structurally.
       */
      findings.push({ flag: rule.flag, count: matches.size, message: rule.message });
    }
  }

  return { findings, flags: findings.map((finding) => finding.flag) };
}

/** Every flag this scanner can produce. For the schema and for the checks. */
export function allPersonalDataFlags(): PersonalDataFlag[] {
  return RULES.map((rule) => rule.flag);
}
