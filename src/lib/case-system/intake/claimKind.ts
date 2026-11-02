/**
 * THE KIND OF CLAIM SHOWN FOR A CASE: ONE RULE, EVERY SCREEN (step 2b).
 *
 * Every place that names a kind of claim -- the guided route's "This sounds like it
 * may be about..." card, the results page, the case page, and the content each of
 * them draws from that kind -- asks this module what to show:
 *
 *   - a KIND OF CLAIM only (an `sc-claim-*` entry). The defendant-side entries
 *     (`sc-defence-*`, "Being served and not understanding the papers") describe the
 *     person's situation, not the claim, and are never shown as a kind of claim;
 *   - with its SOURCE: the person's own choice, or the exact words of their story that
 *     show it (a signal phrase found whole in the story, or the words the classifier
 *     quoted, checked to be in the story). A kind with neither is not shown;
 *   - otherwise "not sure", and the person is asked. There is no default kind: a
 *     story whose words only scatter across a kind's phrases ("never paid me back"
 *     from "paid ... never came back") matches nothing.
 *
 * Failures it exists to stop (Jason's walkthrough, findings 4 and 5): a kitchen
 * renovation and a roofer who never came back both shown as "Personal loan between
 * individuals"; a plaintiff, and a defendant served over utilities, labelled "Being
 * served and not understanding the papers".
 *
 * Pure: no React, no network. States no law; the names are the catalogue's own.
 */
import type { ClaimType } from "./claimTypes";
import { matchClaimType } from "./claimTypeMatcher";

/**
 * Words that describe a loan in the person's own story (step 2b). "A loan or debt" and the
 * personal-loan kind are never a fallback: without these words, neither is suggested or kept.
 */
export const LOAN_WORDS = /\b(?:lent|lend(?:ing)?|loan(?:ed|s)?|borrow(?:ed|ing|s)?|i\s*o\s*u|promissory)\b/i;

/** Whether the person's words describe a loan. */
export function describesLoan(text: string): boolean {
  return LOAN_WORDS.test(text);
}

/** A kind of claim (what the claim is about), not a defendant-side situation. */
export function isKindOfClaim(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("sc-claim-");
}

/** The catalogue's kinds of claim, without the defendant-side situations. */
export function kindsOfClaim<T extends { id: string }>(claimTypes: readonly T[]): T[] {
  return claimTypes.filter((claimType) => isKindOfClaim(claimType.id));
}

/** The story lowercased with punctuation and apostrophes dropped, and each kept character's place in the story. */
function normalizedWithMap(text: string): { text: string; at: number[] } {
  let out = "";
  const at: number[] = [];
  let space = true;
  for (let index = 0; index < text.length; index += 1) {
    const raw = text[index];
    if (raw === "'" || raw === "‘" || raw === "’") continue;
    const lower = raw.toLowerCase();
    if (/[a-z0-9]/.test(lower)) {
      out += lower;
      at.push(index);
      space = false;
    } else if (!space) {
      out += " ";
      at.push(index);
      space = true;
    }
  }
  if (out.endsWith(" ")) { out = out.slice(0, -1); at.pop(); }
  return { text: out, at };
}

const normalized = (text: string) => normalizedWithMap(text).text;

/**
 * The story's own words for a phrase: the span of the story where the phrase appears
 * whole (ignoring case and punctuation), on word boundaries, or null. At least two words.
 */
export function wordsInStory(story: string, phrase: string): string | null {
  const wanted = normalized(phrase);
  if (!wanted || wanted.split(" ").length < 2) return null;
  const source = normalizedWithMap(story);
  let from = 0;
  for (;;) {
    const found = source.text.indexOf(wanted, from);
    if (found < 0) return null;
    const end = found + wanted.length;
    const startsWord = found === 0 || source.text[found - 1] === " ";
    const endsWord = end === source.text.length || source.text[end] === " ";
    if (startsWord && endsWord) return story.slice(source.at[found], source.at[end - 1] + 1);
    from = found + 1;
  }
}

/**
 * Phrases too general to show a kind of claim on their own: "owes me money" is said of a
 * loan, an unpaid invoice and a deposit alike (messy pack case 20 was shown as an unpaid
 * invoice on those words alone). They still count toward a match; they are never its quote.
 */
const GENERAL_PHRASES = new Set(["owes me money", "owe me money", "non-payment", "money owed"]);

/** The story's words that show this kind: its longest signal phrase found whole in the story, or null. */
export function storyQuoteFor(story: string, claimType: Pick<ClaimType, "signals">): string | null {
  const quotes = claimType.signals.filter((signal) => !GENERAL_PHRASES.has(signal.toLowerCase().trim())).map((signal) => wordsInStory(story, signal)).filter((quote): quote is string => Boolean(quote));
  return quotes.sort((a, b) => b.length - a.length)[0] ?? null;
}

/**
 * The kind the story shows by itself: one kind of claim whose signal phrase appears whole
 * in the story and beats every other kind outright (claimTypeMatcher.ts), with that
 * phrase. Scattered words are not enough. Null when nothing fits.
 */
export function kindFromStory<T extends ClaimType>(story: string, claimTypes: readonly T[]): { claimType: T; quote: string } | null {
  const match = matchClaimType(story, kindsOfClaim(claimTypes));
  if (!match || !match.exactPhraseMatched) return null;
  if (/loan/.test(match.claimType.id) && !describesLoan(story)) return null;
  const quote = storyQuoteFor(story, match.claimType);
  return quote ? { claimType: match.claimType as T, quote } : null;
}

/*
 * What to show as the kind of claim for a case (the person's answer with its source, a proposal
 * from the story, or "not sure") is the case file's: caseFile.ts claimKindOf and claimKindLine (site
 * owner, 29 Oct). This module keeps the one rule for which kinds may be shown and read from a story.
 */

/** The guided route's automatic match: the same rule as kindFromStory, as a matcher result. */
export function settledKindMatch(story: string, claimTypes: readonly ClaimType[]): ReturnType<typeof matchClaimType> {
  const kind = kindFromStory(story, claimTypes);
  if (!kind) return null;
  const match = matchClaimType(story, kindsOfClaim(claimTypes));
  return match && match.claimType.id === kind.claimType.id ? match : null;
}
