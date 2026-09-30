import Link from "next/link";

import {
  FORM_COURTS,
  FORM_COURT_LABELS,
  FORM_GUIDE,
  type FormCourt,
} from "../../../src/lib/content-library/forms/formGuide";
import { assertApprovedUserContent } from "../../../src/lib/content-library/outputGuard";
import FormGuideList, { type FormGuideItem } from "./FormGuideList";

/**
 * Every official form for each court, explained (2026-09-30).
 *
 * The explanations come from src/lib/content-library/forms/formGuide.ts, the
 * one place a form is explained: a plain sentence written from the rule that
 * names the form, with that rule quoted underneath. Each explanation passes
 * the output guard here, on the server, so only approved text is sent to the
 * browser.
 *
 * The forms themselves are downloaded from the official Ontario court forms
 * site; /forms is where a signed-in user works on forms for their own case.
 */

export const metadata = {
  title: "Guide to Ontario court forms | CourtSimplified",
  description: "Every official form for Small Claims, civil and family court in Ontario, with what each one is for.",
};

function asCourt(value: string | undefined): FormCourt {
  return value === "civil" || value === "family" ? value : "small-claims";
}

export default async function FormGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ court?: string }>;
}) {
  const court = asCourt((await searchParams).court);
  const entries = FORM_GUIDE[court];

  const items: FormGuideItem[] = entries.map((entry) => ({
    id: entry.id,
    number: entry.number,
    title: entry.title,
    dateOfForm: entry.dateOfForm,
    summary: assertApprovedUserContent(entry.summary, "FormGuidePage:summary"),
    rules: entry.rules,
  }));
  const regulation = entries[0]?.regulation;
  const officialFormsPage = entries[0]?.officialFormsPage;
  const verifiedAt = entries[0]?.verifiedAt;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2f7d67]">Court forms</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10231f] sm:text-4xl">
        Every {FORM_COURT_LABELS[court]} form, explained
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d675f]">
        This is the complete list of forms in the court&apos;s own rules, with a short explanation of each one
        and the words of the rule that names it. It explains what each form is; it does not say which forms
        fit a particular case.
      </p>

      <nav aria-label="Choose a court" className="mt-6 flex flex-wrap gap-2">
        {FORM_COURTS.map((option) => (
          <Link
            key={option}
            href={`/forms/guide?court=${option}`}
            aria-current={option === court ? "page" : undefined}
            className={
              option === court
                ? "rounded-full bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-[#bdd4ca] bg-white px-4 py-2 text-sm font-semibold text-[#1c473d] hover:bg-[#f1f8f4]"
            }
          >
            {FORM_COURT_LABELS[option]} ({FORM_GUIDE[option].length})
          </Link>
        ))}
      </nav>

      <div className="mt-6 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#4d675f]">
        <p>
          Source: the table of forms and the rules in{" "}
          {regulation ? (
            <a href={regulation.url} target="_blank" rel="noreferrer" className="font-semibold underline">
              {regulation.citation}
            </a>
          ) : null}
          , read {verifiedAt}. Download the forms themselves from the{" "}
          {officialFormsPage ? (
            <a href={officialFormsPage} target="_blank" rel="noreferrer" className="font-semibold underline">
              official Ontario court forms site
            </a>
          ) : (
            "official Ontario court forms site"
          )}
          . To work on forms for your own case, use{" "}
          <Link href={`/forms?path=${court}`} className="font-semibold underline">
            your case forms
          </Link>
          .
        </p>
      </div>

      <FormGuideList items={items} officialFormsPage={officialFormsPage || ""} />
    </div>
  );
}
