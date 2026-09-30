/**
 * The glossary: every term the court rules and core statutes define, in the
 * law's own words, with a plain-language explanation beside it (2026-09-30).
 *
 * glossaryIndex.json is GENERATED (scripts/glossary/buildGlossary.ts) from the
 * definitions provisions of the Small Claims, civil and family rules, the
 * Courts of Justice Act, the Limitations Act, 2002 and the Family Law Act.
 * glossaryExplanations.json was written from those definitions only and
 * re-read against them independently (8 of 96 corrected). test:glossary
 * checks both.
 */
import index from "./glossaryIndex.json";
import explanations from "./glossaryExplanations.json";

export type GlossaryDefinition = {
  source: string;
  citation: string;
  pinpoint: string;
  url: string;
  definition: string;
};

export type GlossaryEntry = {
  id: string;
  term: string;
  explanation: string;
  definitions: GlossaryDefinition[];
  verifiedAt: string;
};

const INDEX = index as { generatedAt: string; terms: { term: string; definitions: GlossaryDefinition[] }[] };
const EXPLANATIONS = explanations as Record<string, string>;

export function glossaryId(term: string): string {
  return `glossary:${term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export const GLOSSARY: GlossaryEntry[] = INDEX.terms.map((entry) => ({
  id: glossaryId(entry.term),
  term: entry.term,
  explanation: EXPLANATIONS[entry.term] ?? "",
  definitions: entry.definitions,
  verifiedAt: INDEX.generatedAt,
}));
