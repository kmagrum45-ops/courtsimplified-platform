import Link from "next/link";

import { GUIDE_COURT_LABELS, TOPIC_GUIDES } from "../../src/lib/content-library/guides/topicGuides";
import { assertApprovedUserContent } from "../../src/lib/content-library/outputGuard";

/** Index of the in-depth guides (2026-09-30). The stage cards stay at /legal-principles. */

export const metadata = {
  title: "In-depth guides | CourtSimplified",
  description: "Appeals, costs, default judgment, motions, trials, limitation periods, enforcement and more, from Ontario's rules and statutes.",
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2f7d67]">Guides</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10231f] sm:text-4xl">In-depth guides</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d675f]">
        Each guide explains what Ontario&apos;s court rules and statutes say about one part of a case, in every
        court it applies to. Every paragraph names the rule or section it comes from, and words in quotation marks
        are the law&apos;s own. For the steps of a case in each court, see the{" "}
        <Link href="/legal-principles" className="font-semibold underline">
          court procedure cards
        </Link>
        ; for what a word means, see the{" "}
        <Link href="/glossary" className="font-semibold underline">
          glossary
        </Link>
        .
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOPIC_GUIDES.map((guide) => (
          <li key={guide.id}>
            <Link
              href={`/guides/${guide.id}`}
              className="block h-full rounded-2xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]"
            >
              <h2 className="text-lg font-bold text-[#10231f]">
                {assertApprovedUserContent(guide.title, "GuidesIndex:title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                {assertApprovedUserContent(guide.intro, "GuidesIndex:intro")}
              </p>
              <p className="mt-3 text-xs font-semibold text-[#2f7d67]">
                {guide.courts.map((court) => GUIDE_COURT_LABELS[court]).join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
