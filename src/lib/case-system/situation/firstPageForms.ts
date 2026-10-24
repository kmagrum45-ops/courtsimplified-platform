/**
 * The documents that start a case, by court: the papers a person served with a case,
 * or responding to one, can pick from by the top of their first page (step 2). Titles,
 * dates and pictures come from firstPageTops.json, taken from the official PDFs
 * (scripts/forms/captureFirstPageTops.ts); this list only says which forms, and how
 * much of the first page to show.
 */
export type SituationCourt = "small-claims" | "civil" | "family";

export const FIRST_PAGE_FORMS: { court: SituationCourt; number: string; keep: number }[] = [
  { court: "small-claims", number: "7A", keep: 0.3 },
  { court: "small-claims", number: "10A", keep: 0.3 },
  { court: "civil", number: "14A", keep: 0.3 },
  { court: "civil", number: "14B", keep: 0.3 },
  { court: "civil", number: "14C", keep: 0.3 },
  { court: "civil", number: "14D", keep: 0.3 },
  { court: "civil", number: "14E", keep: 0.3 },
  { court: "family", number: "8", keep: 0.3 },
  { court: "family", number: "8A", keep: 0.3 },
  { court: "family", number: "8B", keep: 0.3 },
  { court: "family", number: "15", keep: 0.3 },
];
