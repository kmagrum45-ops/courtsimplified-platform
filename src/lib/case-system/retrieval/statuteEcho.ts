/**
 * A DECISION IS NOT THE SOURCE FOR A STATUTE'S OWN WORDS (Charter re-test 2026-10-26).
 *
 * The chat cited R. v. Morales, [1992] 3 S.C.R. 711 -- a bail case -- beside Charter ss. 8 and 9.
 * Its saved text reproduces s. 9 word for word, so a check found the statement's words "in" the
 * decision. A decision supports what the court decided, not the wording of an Act it quotes. When a
 * decision's quoted words are also in a statute the library holds, the decision is not a source
 * for that statement; a statement left with no source is not shown.
 *
 * Reads the saved statutes once (docs/sources/corpus, through the corpus index).
 */
import { loadCorpusIndex, sourcePassages } from "./corpusIndex";

const squash = (text: string) => text.toLowerCase().replace(/[“”"'’‘]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

let statutes: string | null = null;
/** Every saved statute's text, squashed, joined (loaded once). */
function statuteText(): string {
  if (statutes !== null) return statutes;
  const index = loadCorpusIndex();
  if (!index) return (statutes = "");
  statutes = Object.entries(index.meta.sources)
    .filter(([, source]) => source.tier === "legislation")
    .map(([id]) => sourcePassages(index, id).map((chunk) => squash(chunk.text)).join(" "))
    .join(" | ");
  return statutes;
}

/** Whether these words are a statute's own (at least eight words, found in a saved statute). */
export function isStatuteWording(quote: string, text: string = statuteText()): boolean {
  const words = squash(quote);
  return words.split(" ").length >= 8 && text.includes(words);
}

type Source = { kind: "legislation" | "guidance" | "decision"; quote: string };

/** The statements without a decision cited only for a statute's words; those left with no source move to not confirmed. */
export function withoutStatuteEchoes<S extends Source, T extends { text: string; sources: S[] }>(statements: readonly T[], text?: string): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const statement of statements) {
    const sources = statement.sources.filter((item) => !(item.kind === "decision" && isStatuteWording(item.quote, text)));
    if (statement.sources.length && !sources.length) dropped.push(statement);
    else kept.push({ ...statement, sources });
  }
  return { kept, dropped };
}
