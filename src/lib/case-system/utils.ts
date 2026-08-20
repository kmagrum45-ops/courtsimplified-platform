export function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0),
    ),
  );
}

export function normalize(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function includesAny(text: string | null | undefined, terms: string[]): boolean {
  const normalizedText = normalize(text);

  return terms.some((term) => normalizedText.includes(normalize(term)));
}

export function hasText(value: string | null | undefined): boolean {
  return normalize(value).length > 3;
}

export function extractDollarAmounts(text: string | null | undefined): number[] {
  const matches = String(text || "").match(
    /\$?\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/g,
  );

  if (!matches) return [];

  return matches
    .map((match) => Number(match.replace(/[^0-9.]/g, "")))
    .filter((value) => Number.isFinite(value));
}

export function detectLimitationRisk(text: string | null | undefined): string | null {
  const normalized = normalize(text);

  if (!normalized) return null;

  if (normalized.includes("statute barred")) {
    return "There may be a limitation-period risk because the intake mentions the claim may be statute-barred.";
  }

  if (normalized.includes("expired")) {
    return "There may be a limitation-period or deadline risk because the intake mentions something may have expired.";
  }

  if (normalized.includes("years ago")) {
    return "There may be a limitation-period risk because the events may have happened years ago.";
  }

  if (normalized.includes("long time ago")) {
    return "There may be a limitation-period risk because the intake says the events happened a long time ago.";
  }

  if (normalized.includes("old claim")) {
    return "There may be a limitation-period risk because the intake describes the matter as an old claim.";
  }

  return null;
}

export function hasLimitationRisk(text: string | null | undefined): boolean {
  return detectLimitationRisk(text) !== null;
}

export function detectUrgency(text: string | null | undefined): boolean {
  const normalized = normalize(text);

  return includesAny(normalized, [
    "urgent",
    "emergency",
    "deadline",
    "tomorrow",
    "immediately",
    "eviction",
    "freeze account",
    "default judgment",
    "trial tomorrow",
  ]);
}

// =========================================================
// COURT FORM NUMBERS
// =========================================================
// Form numbers must never be compared with substring matching. The same
// number means different things across court paths (14A is Offer to Settle
// in Small Claims, Statement of Claim in Civil, Affidavit in Family), and
// short numbers nest inside longer ones ("7A" inside "17A", "8A" inside
// "18A", "8" inside "2018"). Always parse the number, then compare exactly.

const FORM_NUMBER = "[0-9]+(?:\\.[0-9]+)?[a-z]?";

/** "Form 18A" / "18-A" / " 18a " -> "18a" */
export function normalizeFormNumber(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*form\s*/, "")
    .replace(/[^a-z0-9.]/g, "");
}

/**
 * Form numbers written explicitly as "Form N" somewhere in free text.
 * Requires the "form" keyword, so a stray digit in a sentence
 * ("sworn 8 March 2018") is not mistaken for Form 8.
 */
export function extractLabelledFormNumbers(
  text: string | null | undefined,
): string[] {
  const matches = Array.from(
    String(text || "").matchAll(new RegExp(`\\bform\\s*(${FORM_NUMBER})\\b`, "gi")),
  );

  return Array.from(new Set(matches.map((match) => normalizeFormNumber(match[1]))));
}

/**
 * Split a form label into its number and title:
 * "Form 18A — Statement of Defence" -> { number: "18a", title: "statement of defence" }
 * "Statement of Defence"            -> { number: "",    title: "statement of defence" }
 */
export function parseFormLabel(label: string | null | undefined): {
  number: string;
  title: string;
} {
  const raw = normalize(label);

  const match = raw.match(
    new RegExp(`^(?:form\\s*)?(${FORM_NUMBER})\\b\\s*[-–—:.]?\\s*(.*)$`),
  );

  if (!match) return { number: "", title: raw };

  return { number: normalizeFormNumber(match[1]), title: match[2].trim() };
}

/** Exact form-number equality, ignoring "Form " prefixes and punctuation. */
export function isSameFormNumber(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeFormNumber(a);
  return left.length > 0 && left === normalizeFormNumber(b);
}

/** True when a label's parsed form number is exactly the one wanted. */
export function labelHasFormNumber(
  label: string | null | undefined,
  formNumber: string | null | undefined,
): boolean {
  const wanted = normalizeFormNumber(formNumber);
  if (!wanted) return false;

  if (parseFormLabel(label).number === wanted) return true;

  return extractLabelledFormNumbers(label).includes(wanted);
}
