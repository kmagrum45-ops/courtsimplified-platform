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

/** The story's words that show this kind: its longest signal phrase found whole in the story, or null. */
export function storyQuoteFor(story: string, claimType: Pick<ClaimType, "signals">): string | null {
  const quotes = claimType.signals.map((signal) => wordsInStory(story, signal)).filter((quote): quote is string => Boolean(quote));
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
  const quote = storyQuoteFor(story, match.claimType);
  return quote ? { claimType: match.claimType as T, quote } : null;
}

export type ClaimKindShown =
  | { status: "fits"; claimTypeId: string; name: string; source: "story"; quote: string; confirmed: boolean }
  | { status: "fits"; claimTypeId: string; name: string; source: "person"; quote: null; confirmed: true }
  | { status: "not-sure" };

/**
 * What to show as the kind of claim, from what the case holds:
 *   chosen      the kind the person chose themselves (or "not-sure"), which wins;
 *   matchedId   the kind recorded by the intake (an exact story match, or a suggestion
 *               the person said yes to); null when none was; undefined for a case
 *               saved before this was recorded (the story is read instead);
 *   confirmed   whether the person said yes to it;
 *   quote       the story words recorded with it (the classifier's, checked).
 */
export function claimKindShown(args: {
  story: string;
  claimTypes: readonly ClaimType[];
  chosen?: string | null;
  matchedId?: string | null;
  confirmed?: boolean;
  quote?: string | null;
}): ClaimKindShown {
  const { story, claimTypes } = args;
  const named = (id: string) => claimTypes.find((claimType) => claimType.id === id && isKindOfClaim(id));
  if (args.chosen === "not-sure") return { status: "not-sure" };
  if (args.chosen) {
    const kind = named(args.chosen);
    if (kind) return { status: "fits", claimTypeId: kind.id, name: kind.name, source: "person", quote: null, confirmed: true };
  }
  if (typeof args.matchedId === "string") {
    const kind = named(args.matchedId);
    if (!kind) return { status: "not-sure" };
    const quote = (args.quote ? wordsInStory(story, args.quote) : null) ?? storyQuoteFor(story, kind);
    if (quote) return { status: "fits", claimTypeId: kind.id, name: kind.name, source: "story", quote, confirmed: args.confirmed === true };
    // Said yes to by the person, with no words of the story kept for it (a case saved before quotes were): their answer is the source.
    return args.confirmed === true ? { status: "fits", claimTypeId: kind.id, name: kind.name, source: "person", quote: null, confirmed: true } : { status: "not-sure" };
  }
  if (args.matchedId === null) return { status: "not-sure" };
  const fromStory = kindFromStory(story, claimTypes);
  return fromStory
    ? { status: "fits", claimTypeId: fromStory.claimType.id, name: fromStory.claimType.name, source: "story", quote: fromStory.quote, confirmed: false }
    : { status: "not-sure" };
}
