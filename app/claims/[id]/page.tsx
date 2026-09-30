import Link from "next/link";
import { notFound } from "next/navigation";

import {
  LIBRARY_COURT_LABELS,
  LIBRARY_MATTER_TYPES,
  defencesFor,
  libraryMatterType,
  remediesFor,
} from "../../../src/lib/content-library/claimLibrary";
import { assertApprovedUserContent } from "../../../src/lib/content-library/outputGuard";

/**
 * One claim or matter type. Every sentence is the catalogue's own sourced
 * text, passed through the output guard; each part links its source.
 */

export function generateStaticParams() {
  return LIBRARY_MATTER_TYPES.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const entry = libraryMatterType((await params).id);
  return { title: entry ? `${entry.name} | CourtSimplified` : "Types of claims | CourtSimplified" };
}

function Source({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#4d675f] underline">
      Source
    </a>
  );
}

export default async function ClaimTypePage({ params }: { params: Promise<{ id: string }> }) {
  const entry = libraryMatterType((await params).id);
  if (!entry) notFound();
  const ok = (text: string, where: string) => assertApprovedUserContent(text, `ClaimTypePage:${entry.id}:${where}`);
  const defences = defencesFor(entry);
  const remedies = remediesFor(entry);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/claims" className="text-sm font-semibold text-[#2f7d67] underline">
        All types of claims
      </Link>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#2f7d67]">{LIBRARY_COURT_LABELS[entry.courtArea]}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#10231f]">{entry.name}</h1>
      <p className="mt-3 text-base leading-7 text-[#4d675f]">{ok(entry.broughtBy, "broughtBy")}</p>
      <p className="mt-3 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#4d675f]">
        This page explains, in general, what situations like this involve. It does not say whether a particular case
        has these elements or how it would turn out; a licensed lawyer or paralegal can.
      </p>

      <section className="mt-8">
        <h2 className="text-2xl font-bold text-[#10231f]">What someone bringing this kind of claim generally has to show</h2>
        <ol className="mt-4 space-y-4">
          {entry.plaintiffElements.map((element) => (
            <li key={element.id} className="rounded-2xl border border-[#d8e6df] bg-white p-5">
              <h3 className="font-bold text-[#10231f]">{ok(element.name, "element-name")}</h3>
              <p className="mt-2 text-sm leading-6 text-[#24463d]">{ok(element.plainExplanation, "element")}</p>
              <Source url={element.sourceUrl} />
              {element.evidenceCategories.length > 0 ? (
                <details className="mt-3 text-sm text-[#4d675f]">
                  <summary className="cursor-pointer font-semibold text-[#1c473d]">Records that tend to matter</summary>
                  <ul className="mt-2 space-y-2">
                    {element.evidenceCategories.map((category) => (
                      <li key={category.name}>
                        <span className="font-semibold text-[#16302b]">{ok(category.name, "evidence")}</span>: {ok(category.why, "evidence")}
                        <span className="block text-xs">For example: {category.examples.map((example) => ok(example, "evidence")).filter(Boolean).join("; ")}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {entry.defendantConsiderations.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-[#10231f]">For the person responding</h2>
          <ul className="mt-4 space-y-3">
            {entry.defendantConsiderations.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#d8e6df] bg-white p-5 text-sm leading-6">
                <h3 className="font-bold text-[#10231f]">{ok(item.name, "defendant")}</h3>
                <p className="mt-1 text-[#24463d]">{ok(item.plainExplanation, "defendant")}</p>
                <p className="mt-1 text-[#4d675f]">{ok(item.whenThisComesUp, "defendant")}</p>
                <Source url={item.sourceUrl} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {defences.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-[#10231f]">Defences that can come up</h2>
          <ul className="mt-4 space-y-3">
            {defences.map((concept) => (
              <li key={concept.id} className="rounded-2xl border border-[#d8e6df] bg-white p-5 text-sm leading-6">
                <h3 className="font-bold text-[#10231f]">{ok(concept.name, "defence")}</h3>
                <p className="mt-1 text-[#24463d]">{ok(concept.plainExplanation, "defence")}</p>
                <Source url={concept.sourceUrl} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {remedies.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-[#10231f]">What the court can order</h2>
          <ul className="mt-4 space-y-3">
            {remedies.map((remedy) => (
              <li key={remedy.id} className="rounded-2xl border border-[#d8e6df] bg-white p-5 text-sm leading-6">
                <h3 className="font-bold text-[#10231f]">{remedy.title}</h3>
                <p className="mt-1 text-[#24463d]">{ok(remedy.plainExplanation, "remedy")}</p>
                <Source url={remedy.citations[0]?.officialUrl} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {entry.proceduralNotes.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-[#10231f]">Procedure notes</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
            {entry.proceduralNotes.map((note, index) => (
              <li key={index}>
                {ok(note.note, "note")} <Source url={note.sourceUrl} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <h2 className="text-lg font-bold text-[#10231f]">Sources</h2>
        <ul className="mt-3 space-y-2 text-sm text-[#4d675f]">
          {entry.citations.map((citation) => (
            <li key={`${citation.sourceName}-${citation.pinpoint ?? ""}`}>
              <a href={citation.officialUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                {citation.sourceName}
              </a>
              {citation.pinpoint ? `, ${citation.pinpoint}` : ""} (checked {citation.verifiedAt})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
