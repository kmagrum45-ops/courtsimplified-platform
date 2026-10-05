/**
 * The official Small Claims Court forms, parsed from the vendored table.
 *
 * *** WHY THIS IS PARSED AND NOT TYPED OUT ***
 *
 * A form number and name are the single most checkable thing a block says, and
 * the single easiest to get wrong — "Form 1A is a continuation sheet, not a
 * joinder form" was live on the site for months, and Form 14A is "Offer to
 * Settle" in Small Claims and "Statement of Claim" in Civil.
 *
 * So the list is read from `docs/sources/corpus/small-claims-forms-table.txt`,
 * which `rules:fetch` vendored from ontariocourtforms.on.ca. A block naming a
 * form is checked against this, and a form the court withdraws stops being
 * recommended the next time the corpus is re-fetched instead of the next time
 * somebody notices.
 *
 * *** WHAT IT DELIBERATELY DOES NOT DO ***
 *
 * It does not say what a form is FOR. That is legal content, it belongs in a
 * reviewed block with a citation, and the table does not carry it — the
 * "Form Title" column is a name, not a purpose. What a form is for lives in
 * forms/formGuide.ts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export type SmallClaimsForm = {
  /** "7A", "9A", "1A.1" — exactly as the court's table spells it. */
  number: string;
  /** The official title, exactly as the table spells it. */
  title: string;
  /** The version date the table carries, when it carries one. */
  versionDate: string;
};

/**
 * Where the vendored table lives.
 *
 * Read at call time rather than bundled, so a re-fetch takes effect without a
 * rebuild — the same reasoning as `contentInventory` reading live registries.
 */
const TABLE = path.join(
  process.cwd(),
  "docs",
  "sources",
  "corpus",
  "small-claims-forms-table.txt",
);

/**
 * Parses the vendored table.
 *
 * Row shape, after the HTML-to-text extraction in `fetchCorpus`:
 *
 *     " 1A\t Additional Parties\t Jan. 1, 2021"
 *
 * A row is recognised by a leading form number followed by a tab. The header
 * row ("Form Number\tForm Title\t…") fails that test because "Form Number" is
 * not a form number, so it drops out without needing to be special-cased.
 */
export function parseFormsTable(text: string): SmallClaimsForm[] {
  const forms: SmallClaimsForm[] = [];

  for (const line of text.split("\n")) {
    const match = /^\s*(\d{1,2}(?:\.\d)?[A-Z]?(?:\.\d)?)\t\s*([^\t]+?)\s*(?:\t\s*([^\t]*?)\s*)?$/.exec(
      line,
    );
    if (!match) continue;

    const [, number, title, versionDate] = match;
    // A title that is empty or itself numeric is a stray cell, not a form.
    if (!title || /^\d/.test(title)) continue;

    forms.push({ number, title, versionDate: (versionDate ?? "").trim() });
  }

  return forms;
}

let cache: SmallClaimsForm[] | null = null;

export function smallClaimsForms(): SmallClaimsForm[] {
  if (cache) return cache;
  cache = parseFormsTable(readFileSync(TABLE, "utf8"));
  return cache;
}

/** The official title for a form number, or null if the court has no such form. */
export function formTitle(number: string): string | null {
  const normalized = number.trim().toUpperCase().replace(/^FORM\s+/, "");
  return smallClaimsForms().find((form) => form.number === normalized)?.title ?? null;
}

/** Test seam: clears the memoised table after a re-fetch. */
export function resetFormsCache(): void {
  cache = null;
}
