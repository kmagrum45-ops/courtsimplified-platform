import Link from "next/link";

import { TOPIC_GUIDES, type GuideCourt } from "../../src/lib/content-library/guides/topicGuides";
import { FORM_SUMMARIES } from "../../src/lib/content-library/forms/formSummaries";

type Court = Exclude<GuideCourt, "all">;

/**
 * "Help for this court" on each court landing page (2026-09-30): the guides
 * that cover this court, its full forms list, the glossary and the courthouse
 * finder. Links only; every page linked carries its own sources.
 */
export default function CourtResourcesPanel({ court, courtName }: { court: Court; courtName: string }) {
  const guides = TOPIC_GUIDES.filter((guide) => guide.courts.includes(court));
  const formCount = Object.keys(FORM_SUMMARIES[court]).length;

  return (
    <section className="border-b border-[#d9e6df] bg-[#f8fcfa]" data-testid="court-resources">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold text-[#10231f]">Help for {courtName}</h2>
        <p className="mt-2 text-sm leading-6 text-[#4d675f]">
          Guides written from Ontario&apos;s rules and statutes, with every source named.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href={`/forms/guide?court=${court}`} className="rounded-2xl border border-[#d8e6df] bg-white p-5 hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Every form, explained</p>
            <p className="mt-1 text-sm text-[#4d675f]">All {formCount} official forms for this court and what each is for.</p>
          </Link>
          <Link href={`/courthouses?court=${court}`} className="rounded-2xl border border-[#d8e6df] bg-white p-5 hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Find a courthouse</p>
            <p className="mt-1 text-sm text-[#4d675f]">Addresses and contacts for this court across Ontario.</p>
          </Link>
          <Link href="/glossary" className="rounded-2xl border border-[#d8e6df] bg-white p-5 hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Legal terms explained</p>
            <p className="mt-1 text-sm text-[#4d675f]">What the rules mean by the words they use.</p>
          </Link>
        </div>
        <h3 className="mt-8 text-lg font-bold text-[#10231f]">Guides for this court ({guides.length})</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {guides.map((guide) => (
            <li key={guide.id}>
              <Link href={`/guides/${guide.id}`} className="text-sm font-semibold text-[#2f7d67] underline">
                {guide.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
