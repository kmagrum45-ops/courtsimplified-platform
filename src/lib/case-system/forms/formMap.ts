/**
 * ONE MAP PER FORM: EACH BOX OF THE OFFICIAL FORM, AND THE FACT IN THE CASE RECORD THAT FILLS IT (site owner, 14 Nov
 * 2026, rule 5). Form 7A is the first (maps/form7A.ts), with Form 1A for the parties after the first on each side
 * (maps/form1A.ts, rule 2). The other forms are added in the same format, one file each.
 *
 * A box is one of:
 *   - "fill": filled from the record by `read`. When the record does not hold it, the box stays empty on the official
 *     form and the screen says what is missing and links to the one place to add it (`missing.addAt`); a box marked
 *     `optional` says it was not given and is never counted as missing (rule 4);
 *   - "blank": left blank on purpose, with the reason: the court office fills it, it is signed by hand, or the site has
 *     no wording for it (`needsWording`, listed for the legal review chat, rule 6).
 * Every box of the official PDF has an entry; test:form-maps fails on a box with none (rule 5).
 *
 * The words that fill a box come only from the person's own words and the case record (rule 6): no box is written by a
 * model and none carries wording of the site's own. Pure: no React, no network, no model. States no law.
 */
import type { CaseFile } from "../caseFile/caseFile";
import type { Party } from "../parties/parties";

/** The one place each missing thing is added, as the screens link to it. */
export type AddPlace = "parties" | "amount" | "story";

export type FormContext = {
  file: CaseFile;
  /** Each side's parties, in order, each its own entry (parties.ts partiesByRole). */
  plaintiffs: Party[];
  defendants: Party[];
  /** The amount the case record holds, if answered. */
  amount: number | null;
  /** The person's own words for the reasons for the claim (no site question, no party-detail sentence). */
  reasons: string;
  /** Form 1A only: the parties on this copy (three to a copy), each with its side and its number on that side. */
  additional?: AdditionalParty[];
};

/** A party after the first on its side: its own entry on Form 1A ("Defendant No. 2"). */
export type AdditionalParty = { party: Party; side: "plaintiff" | "defendant"; number: number };

export type BoxValue = string | boolean;

export type FillBox = {
  kind: "fill";
  /** The fact in the case record, in words a reader of the map follows ("defendants[0].street"). */
  fact: string;
  read: (ctx: FormContext) => BoxValue | null | undefined;
  /** What the screen says when the record does not hold it, and the one place to add it. */
  missing: { what: string; addAt: AddPlace };
  /** Not asked: filled when given, otherwise left empty and said to be not given (never counted as missing). */
  optional?: true;
  /** When this box is not used for this case (a company has no first name): the reason, and the box stays blank. */
  blankWhen?: (ctx: FormContext) => string | null;
};

export type BlankBox = {
  kind: "blank";
  /** Why it is blank, in plain words, shown beside the box. */
  why: string;
  /** No wording the site may write is held for this box: listed for the legal review chat (rule 6). */
  needsWording?: true;
};

export type BoxEntry = FillBox | BlankBox;

export type FormMapDefinition = {
  /** "small-claims/7A". */
  id: string;
  court: "small-claims" | "civil" | "family";
  number: string;
  title: string;
  /** The official PDF, saved under docs/sources/forms/ (README there: where it came from, when, its sha256). */
  pdf: { file: string; url: string; sha256: string; fetched: string };
  /** The official PDF's own box names, each mapped. A name the PDF uses twice is one entry. */
  boxes: Record<string, BoxEntry>;
};

export type BoxResult =
  | { box: string; state: "filled"; fact: string; value: BoxValue }
  | { box: string; state: "missing"; fact: string; what: string; addAt: AddPlace }
  | { box: string; state: "not-given"; fact: string; what: string; addAt: AddPlace }
  | { box: string; state: "blank"; why: string; needsWording: boolean };

const present = (value: BoxValue | null | undefined): value is BoxValue => typeof value === "boolean" || (typeof value === "string" && value.trim().length > 0);

/** Every box of a form, filled from the record or said to be missing or blank, in the map's order. */
export function fillForm(map: FormMapDefinition, ctx: FormContext): BoxResult[] {
  return Object.entries(map.boxes).map(([box, entry]): BoxResult => {
    if (entry.kind === "blank") return { box, state: "blank", why: entry.why, needsWording: Boolean(entry.needsWording) };
    const notUsed = entry.blankWhen?.(ctx);
    if (notUsed) return { box, state: "blank", why: notUsed, needsWording: false };
    const value = entry.read(ctx);
    if (present(value)) return { box, state: "filled", fact: entry.fact, value: typeof value === "string" ? value.trim() : value };
    return { box, state: entry.optional ? "not-given" : "missing", fact: entry.fact, what: entry.missing.what, addAt: entry.missing.addAt };
  });
}

/** The values to write into the official PDF: filled boxes only (a missing or blank box stays empty on the form). */
export function pdfValues(results: readonly BoxResult[]): Record<string, BoxValue> {
  const out: Record<string, BoxValue> = {};
  for (const result of results) if (result.state === "filled") out[result.box] = result.value;
  return out;
}
