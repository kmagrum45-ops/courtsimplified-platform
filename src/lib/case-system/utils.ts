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
