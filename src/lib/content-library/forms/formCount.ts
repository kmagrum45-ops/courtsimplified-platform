/**
 * HOW MANY OFFICIAL FORMS A COURT HAS, FROM ONE SOURCE, AND ONE CARD PER FORM (Chrome check of production c38e69fd, B5).
 *
 * The Small Claims page said "All 46 official forms for this court" (counted from formSummaries.json) and the case's Forms
 * tab "48 official form(s)" (counted from the database catalogue, court_form_master_view). The official forms site lists
 * 46 Small Claims forms (officialFormLinks.json, fetched from ontariocourtforms.on.ca); the catalogue holds the same 46,
 * with two of them twice: Form 20F and Form 20R each have an empty copy and a copy whose title ends " - .". Changing those
 * rows needs a database change; until then each form is shown once, and every page counts from the official list.
 *
 * Pure. States no law.
 */
import links from "./officialFormLinks.json";

type Court = "small-claims" | "civil" | "family";

/** The number of official forms for a court, as the official forms site lists them. */
export function officialFormCount(court: Court): number {
  return (links as { forms: { court: string }[] }).forms.filter((form) => form.court === court).length;
}

/** "Form 20F" and "20F" are the same form. */
const numberOf = (value: unknown) => String(value ?? "").replace(/^Form\s+/i, "").trim().toUpperCase();

/**
 * One row per form number: the one with a PDF, else the one with a Word file, else the first; its title without a
 * trailing " - ." (the catalogue's duplicate copies).
 */
export function oneRowPerForm<T extends { form_number?: string | null; official_title?: string | null; pdf_path?: string | null; word_path?: string | null }>(rows: readonly T[]): T[] {
  const chosen = new Map<string, T>();
  const score = (row: T) => (row.pdf_path ? 2 : 0) + (row.word_path ? 1 : 0);
  for (const row of rows) {
    const key = numberOf(row.form_number);
    const held = chosen.get(key);
    if (!held || score(row) > score(held)) chosen.set(key, row);
  }
  return [...chosen.values()].map((row) => (typeof row.official_title === "string" ? { ...row, official_title: row.official_title.replace(/\s*-\s*\.\s*$/, "") } : row));
}
