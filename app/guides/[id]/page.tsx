import Link from "next/link";
import { notFound } from "next/navigation";

import {
  GUIDE_COURT_LABELS,
  TOPIC_GUIDES,
  topicGuide,
} from "../../../src/lib/content-library/guides/topicGuides";
import { assertApprovedUserContent } from "../../../src/lib/content-library/outputGuard";

/** One in-depth guide. All text is library content, passed through the output guard. */

export function generateStaticParams() {
  return TOPIC_GUIDES.map((guide) => ({ id: guide.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const guide = topicGuide((await params).id);
  return { title: guide ? `${guide.title} | CourtSimplified` : "Guide | CourtSimplified" };
}

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const guide = topicGuide((await params).id);
  if (!guide) notFound();
  const approved = (text: string, where: string) => assertApprovedUserContent(text, `GuidePage:${guide.id}:${where}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/guides" className="text-sm font-semibold text-[#2f7d67] underline">
        All guides
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#10231f] sm:text-4xl">{approved(guide.title, "title")}</h1>
      <p className="mt-3 text-base leading-7 text-[#4d675f]">{approved(guide.intro, "intro")}</p>
      <p className="mt-3 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#4d675f]">
        This guide explains what the rules and statutes say in general. It does not say how they apply to a
        particular case; a licensed lawyer or paralegal can.
      </p>

      <nav aria-label="In this guide" className="mt-6">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-[#1c473d]">
          {guide.sections.map((section, index) => (
            <li key={section.heading}>
              <a href={`#s${index + 1}`} className="underline">
                {approved(section.heading, "heading")}
              </a>{" "}
              <span className="text-[#6b7f78]">({GUIDE_COURT_LABELS[section.court]})</span>
            </li>
          ))}
        </ol>
      </nav>

      {guide.sections.map((section, index) => (
        <section key={section.heading} id={`s${index + 1}`} className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f7d67]">{GUIDE_COURT_LABELS[section.court]}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#10231f]">{approved(section.heading, "heading")}</h2>
          <div className="mt-3 space-y-3">
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} className="text-base leading-7 text-[#24463d]">
                {approved(paragraph, "paragraph")}
              </p>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <h2 className="text-lg font-bold text-[#10231f]">Sources</h2>
        <ul className="mt-3 space-y-2 text-sm text-[#4d675f]">
          {guide.sources.map((source) => (
            <li key={source.localText}>
              {source.officialUrl ? (
                <a href={source.officialUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                  {source.sourceName}
                </a>
              ) : (
                <span className="font-semibold">{source.sourceName}</span>
              )}
              {source.pinpoints ? ` — ${source.pinpoints}` : ""}
              {source.retrievedAt ? ` (text read ${source.retrievedAt})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
