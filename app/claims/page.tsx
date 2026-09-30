import Link from "next/link";

import { LIBRARY_COURT_LABELS, LIBRARY_MATTER_TYPES } from "../../src/lib/content-library/claimLibrary";
import { assertApprovedUserContent } from "../../src/lib/content-library/outputGuard";

/** The library of claim and matter types (2026-09-30). See claimLibrary.ts. */

export const metadata = {
  title: "Types of claims | CourtSimplified",
  description: "Common kinds of Small Claims, civil and family matters in Ontario, and what the law generally requires for each.",
};

export default function ClaimsLibraryPage() {
  const courts = ["small-claims", "civil", "family"];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2f7d67]">Types of claims</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10231f] sm:text-4xl">Kinds of cases, and what they involve</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d675f]">
        Situations like these come up often. For each one, this library sets out what someone bringing that kind of
        claim generally has to show, the kinds of records that tend to matter, what a person responding should know,
        and the sources. It is information to read and compare with your own situation; it does not say whether any
        particular case fits, or how it would turn out.
      </p>
      {courts.map((court) => {
        const entries = LIBRARY_MATTER_TYPES.filter((entry) => entry.courtArea === court);
        return (
          <section key={court} className="mt-8">
            <h2 className="text-2xl font-bold text-[#10231f]">
              {LIBRARY_COURT_LABELS[court]} ({entries.length})
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/claims/${entry.id}`} className="block h-full rounded-2xl border border-[#d8e6df] bg-white p-4 hover:border-[#2f7d67]">
                    <p className="font-bold text-[#10231f]">{entry.name}</p>
                    <p className="mt-1 text-sm text-[#4d675f]">{assertApprovedUserContent(entry.broughtBy, "ClaimsLibrary:broughtBy")}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
