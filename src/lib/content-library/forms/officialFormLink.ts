/**
 * The official Ontario Court Forms site's own entry for a form: its title,
 * current version date and direct PDF and Word links.
 *
 * Read from officialFormLinks.json, which scripts/forms/fetchOfficialFormLinks.ts
 * writes from ontariocourtforms.on.ca (monthly, by courtsimplified-change-watch.yml).
 * The links are read from the site, never constructed: the file names are
 * dated and cannot be guessed (docs/SOURCING_NOTES.md).
 *
 * Small and data-only, so the client-side forms page can use it without
 * pulling in the forms guide's rule quotes.
 */

import officialLinks from "./officialFormLinks.json";
import { normalizeFormNumber } from "./formSummaries";

export type OfficialFormEntry = {
  court: string;
  number: string;
  title: string;
  date: string;
  pdf: string | null;
  docx: string | null;
};

type OfficialLinksFile = { fetchedAt: string; forms: OfficialFormEntry[] };

const OFFICIAL = officialLinks as OfficialLinksFile;

export const OFFICIAL_FORMS_FETCHED_AT = OFFICIAL.fetchedAt.slice(0, 10);

/** "8.0.1" and "8.01" are the same form written two ways (the site uses the second). */
export function officialFormKey(court: string, number: string): string {
  return `${court}:${normalizeFormNumber(number).replace(/\.0\./g, ".0")}`;
}

const BY_KEY = new Map(OFFICIAL.forms.map((form) => [officialFormKey(form.court, form.number), form]));

export function officialFormFor(court: string, number: string): OfficialFormEntry | null {
  return BY_KEY.get(officialFormKey(court, number)) ?? null;
}
