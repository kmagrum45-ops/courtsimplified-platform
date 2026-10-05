/**
 * The name a case is listed under: who it is with, in the user's own words.
 *
 * WHY (2026-10-04). Cases were titled with the first 80 characters of the
 * engine's summary, so the case page and the case list read "Current case
 * status: Responding to a case. Case story I was served a plaintiff" (page
 * walkthrough). A title should tell the user which case this is at a glance;
 * the other party's name does that, and it is something they typed.
 */

const COURT_NAMES: Record<string, string> = {
  "small-claims": "Small Claims case",
  civil: "Civil case",
  family: "Family case",
};

/** A stored title that is really engine output (or the placeholder), not a name. */
export function isGeneratedTitle(title: string | null | undefined): boolean {
  const value = (title || "").trim();
  return (
    !value ||
    /^(new|untitled) courtsimplified case$/i.test(value) ||
    /^current case status:/i.test(value) ||
    /\bcase story\b/i.test(value) ||
    value.length > 70
  );
}

export function caseTitleFromIntake(otherParty: unknown, courtPath: string | null | undefined): string {
  const other = typeof otherParty === "string" ? otherParty.trim().replace(/\s+/g, " ") : "";
  if (other && other.length <= 60) return `Your case with ${other}`;
  return (courtPath && COURT_NAMES[courtPath]) || "Your case";
}
