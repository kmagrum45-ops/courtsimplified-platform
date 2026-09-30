import { GLOSSARY } from "../../src/lib/content-library/glossary/glossary";
import { assertApprovedUserContent } from "../../src/lib/content-library/outputGuard";
import GlossaryList, { type GlossaryItem } from "./GlossaryList";

/**
 * Legal terms, defined (2026-09-30). Each term shows a plain explanation and
 * the definition itself, quoted from the rule or statute that defines it.
 * Built from src/lib/content-library/glossary; checked by test:glossary.
 */

export const metadata = {
  title: "Legal terms explained | CourtSimplified",
  description: "Terms the Ontario court rules and statutes define, in plain words and in the law's own words.",
};

export default function GlossaryPage() {
  const items: GlossaryItem[] = GLOSSARY.map((entry) => ({
    id: entry.id,
    term: entry.term,
    explanation: assertApprovedUserContent(entry.explanation, "GlossaryPage:explanation"),
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
        These are the words the Ontario court rules and statutes define for themselves. Each one has a short
        explanation in plain words, and underneath it the definition exactly as the law writes it. When the
        Small Claims, civil and family rules define a word differently, each definition is shown.
      </p>
      <p className="mt-3 text-sm text-[#4d675f]">
        Definitions read from the e-Laws text of each rule or Act on {verifiedAt}.
      </p>
      <GlossaryList items={items} />
    </div>
  );
}
