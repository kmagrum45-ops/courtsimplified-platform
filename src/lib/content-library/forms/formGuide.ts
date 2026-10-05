/**
 * The guide to every official court form: one entry per form in each court's
 * own TABLE OF FORMS, with a plain-language explanation and the rule text that
 * names the form.
 *
 * *** WHY (2026-09-30) ***
 *
 * The forms page listed 356 forms from court_form_library, and the "purpose"
 * it showed was the form's title again, for every form in every court. No form
 * on the site was explained. The regulations themselves say what each form is
 * for, so this guide is built from them:
 *
 *   - formRuleIndex.json is GENERATED (scripts/forms/buildFormRuleIndex.ts) from
 *     the vendored e-Laws copies of O. Reg. 258/98, R.R.O. 1990, Reg. 194 and
 *     O. Reg. 114/99: the complete table of forms, and for each form up to
 *     three rule provisions that name it, quoted verbatim.
 *   - formSummaries.json holds one plain-language sentence per form, written
 *     from ONLY the title and those quotes, then checked by a second,
 *     independent read against the quotes (32 of 430 corrected).
 *
 * test:form-explanations keeps it honest: every quote must still be in the
 * regulation and name its form, every live form must have a summary, and a
 * summary may not use a number its sources do not contain or read as advice.
 *
 * THIS IS THE ONE PLACE A FORM IS EXPLAINED. The database's purpose column is
 * not shown to users as an explanation; anything that needs to describe a form
 * reads it from here. (formKnowledgeBase.ts, an older unsourced 12-form copy,
 * was deleted on 2026-10-04.)
 */

import index from "./formRuleIndex.json";
import { OFFICIAL_FORMS_FETCHED_AT, officialFormFor } from "./officialFormLink";
import { FORM_SUMMARIES, normalizeFormNumber } from "./formSummaries";

export { normalizeFormNumber };

export type FormCourt = "small-claims" | "civil" | "family";

export const FORM_COURTS: FormCourt[] = ["small-claims", "civil", "family"];

export const FORM_COURT_LABELS: Record<FormCourt, string> = {
  "small-claims": "Small Claims Court",
  civil: "Superior Court of Justice (civil)",
  family: "Family Court",
};

export type FormRuleQuote = { rule: string; quote: string };

export type FormGuideEntry = {
  id: string;
  court: FormCourt;
  number: string;
  /** Title as printed in the regulation's table of forms (upper case). */
  officialTitle: string;
  /** The same title in title case, for reading. */
  title: string;
  dateOfForm: string;
  /** Plain-language explanation, from the title and the quoted rules only. */
  summary: string;
  /** Rule provisions that name this form, verbatim. Empty for 4 civil forms no rule names. */
  rules: FormRuleQuote[];
  regulation: { citation: string; url: string };
  /** The official forms page for this court, where the form itself is downloaded. */
  officialFormsPage: string;
  /** Date the index was generated from the regulation text. */
  verifiedAt: string;
  /**
   * The form itself, as the official Ontario Court Forms site lists it today:
   * its version date and direct PDF and Word links (2026-10-04). Read from
   * the site by scripts/forms/fetchOfficialFormLinks.ts, never constructed —
   * the file names are dated and cannot be guessed. Null where the site does
   * not list the form, or offers only one format.
   */
  official: { date: string; pdf: string | null; docx: string | null; fetchedAt: string } | null;
};



type IndexFile = {
  generatedAt: string;
  sources: Record<FormCourt, { file: string; citation: string; url: string; formsPage: string }>;
  forms: Record<
    FormCourt,
    { number: string; title: string; dateOfForm: string; revoked: boolean; mentions: FormRuleQuote[] }[]
  >;
};

const INDEX = index as IndexFile;
const SUMMARIES = FORM_SUMMARIES;

const SMALL_WORDS = new Set(["of", "and", "or", "the", "to", "for", "in", "on", "under", "with", "a", "an", "by", "at", "from", "as"]);
const KEEP_UPPER = new Set(["II", "III", "RRSP", "CPL", "ID"]);

/** Title case for reading: "NOTICE OF MOTION" -> "Notice of Motion". */
export function readableTitle(upper: string): string {
  return upper
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      const bare = word.replace(/[^\p{L}]/gu, "").toUpperCase();
      if (KEEP_UPPER.has(bare)) return word.toUpperCase();
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      // Capitalise the first letter, including after an opening bracket.
      return word.replace(/\p{L}/u, (letter) => letter.toUpperCase());
    })
    .join(" ");
}

function build(): Record<FormCourt, FormGuideEntry[]> {
  const out = {} as Record<FormCourt, FormGuideEntry[]>;
  for (const court of FORM_COURTS) {
    const source = INDEX.sources[court];
    out[court] = INDEX.forms[court]
      .filter((form) => !form.revoked)
      .map((form) => ({
        id: `form-guide:${court}:${form.number}`,
        court,
        number: form.number,
        officialTitle: form.title,
        title: readableTitle(form.title),
        dateOfForm: form.dateOfForm,
        summary: SUMMARIES[court]?.[form.number] ?? "",
        rules: form.mentions,
        regulation: { citation: source.citation, url: source.url },
        officialFormsPage: source.formsPage,
        verifiedAt: INDEX.generatedAt,
        official: (() => {
          const found = officialFormFor(court, form.number);
          return found ? { date: found.date, pdf: found.pdf, docx: found.docx, fetchedAt: OFFICIAL_FORMS_FETCHED_AT } : null;
        })(),
      }));
  }
  return out;
}

export const FORM_GUIDE: Record<FormCourt, FormGuideEntry[]> = build();

export function formGuideEntry(court: string, number: string): FormGuideEntry | null {
  if (court !== "small-claims" && court !== "civil" && court !== "family") return null;
  const wanted = normalizeFormNumber(number);
  return FORM_GUIDE[court].find((entry) => normalizeFormNumber(entry.number) === wanted) ?? null;
}
