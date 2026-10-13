import { GLOSSARY } from "../../src/lib/content-library/glossary/glossary";
import { assertApprovedUserContent } from "../../src/lib/content-library/outputGuard";
import GlossaryList, { type GlossaryItem } from "./GlossaryList";

/**
 * Legal terms explained (rebuilt 2026-10-13). Each word says first what it
 * means wherever it is used, then what is different in Small Claims Court,
 * the civil courts or family court, with its sources and the law's own
 * definition underneath. Built from src/lib/content-library/glossary;
 * checked by test:glossary.
 */

export const metadata = {
  title: "Legal terms explained | CourtSimplified",
  description:
    "Words you will meet in Ontario's Small Claims, civil and family courts, in plain language, with the official source for each.",
};

export default function GlossaryPage() {
  const items: GlossaryItem[] = GLOSSARY.map((entry) => ({
    id: entry.id,
    term: entry.term,
    kind: entry.kind,
    also: entry.also,
    meaning: assertApprovedUserContent(entry.meaning, "GlossaryPage:meaning"),
    courts: entry.courts.map((note) => ({
      label: note.label,
      text: assertApprovedUserContent(note.text, "GlossaryPage:court-note"),
    })),
    sources: entry.sources.map((source) => ({
      title: source.title,
      citation: source.citation,
      pinpoint: source.pinpoint,
      url: source.url,
    })),
    definitions: entry.definitions.map((definition) => ({
      citation: definition.citation,
      pinpoint: definition.pinpoint,
      url: definition.url,
      definition: definition.definition,
    })),
  }));
  const verifiedAt = GLOSSARY[0]?.verifiedAt;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2f7d67]">Glossary</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10231f] sm:text-4xl">Legal terms explained</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d675f]">
        Words you will meet in Small Claims Court, the civil courts and family court. Each one says first what it
        means wherever it is used, and then what is different in a particular court. Under each word are the
        official sources it comes from and, where a rule or statute defines the word, that definition exactly as
        the law writes it.
      </p>
      <p className="mt-3 max-w-3xl text-sm text-[#4d675f]">
        Ontario&rsquo;s rules use plain English instead of Latin, but judges, lawyers and court decisions still use a
        few Latin phrases. The ones you are most likely to hear are included and marked &ldquo;Latin&rdquo;.
      </p>
      {verifiedAt ? <p className="mt-3 text-sm text-[#4d675f]">Checked against the saved sources on {verifiedAt}.</p> : null}
      <GlossaryList items={items} />
    </div>
  );
}
