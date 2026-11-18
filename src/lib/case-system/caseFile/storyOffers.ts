/**
 * THE ONE PLACE A FACT THE STORY STATES IS OFFERED FROM (site owner, 16 Nov 2026; Chrome milestone test of #550, rows 8,
 * 30 and 33: the story reading showed "$5,468.45" (S1), "REPLACEMENT QUOTE $1,500" (S4) and "Your friend Alex" (S5), and
 * the review and the Parties step offered none of them: an empty box, no offer).
 *
 * Cause found: three readers, each its own. The review's amount question read the strict claim-amount reader (no quote,
 * nothing when the story gives several amounts); the review's boxes read a looser one; the Parties step read only "I am
 * suing ..." sentences; and none read the story reading the person was shown (home.understood, saved with the case).
 *
 * Now every offer of the amount and the other party reads here: first what the story reading showed, when it is the
 * reading of this story and its value is in the person's own words (an amount written in the story, or the sum of
 * amounts written in it; a name written in it, never a witness), then the story's own readers. Each is only OFFERED
 * (Yes / No, that's not right / I'm not sure), never an answer until the person says Yes.
 *
 * Pure. States no law. No model (the reading was made earlier, and is only read here).
 */
import { amountOfferFromStory, oneClickQuote } from "../../../../app/builder/_components/storyAnswers";
import { otherPartyFromUnderstanding } from "./understoodOtherParty";
import { factOfAskedText } from "./factsOfQuestion";
import { factStatus } from "./factStatus";
import type { CaseFile } from "./caseFile";

export type ReadingFact = { label: string; value: string };
export type StoryOffer = { value: string; quote: string; from: "reading" | "story" };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/**
 * The story reading's facts, when the reading saved with the case is the reading of this story (home.readFrom is the
 * story the person wrote, which the case's story starts with: answers to the reading's questions may follow it).
 */
export function readingFactsOf(sections: Record<string, unknown> | undefined, story: string): ReadingFact[] {
  const home = object(object(sections).home);
  const readFrom = typeof home.readFrom === "string" ? home.readFrom.trim() : "";
  if (!readFrom || !story.trim().startsWith(readFrom)) return [];
  const facts = object(object(home.understood).understanding).facts;
  return (Array.isArray(facts) ? facts : []).flatMap((fact) => {
    const { label, value } = object(fact);
    return typeof label === "string" && typeof value === "string" ? [{ label, value }] : [];
  });
}

const AMOUNT_IN = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/;
const cents = (digits: string) => Math.round(Number(digits.replace(/,/g, "")) * 100);
/** Every dollar amount the story writes, in cents, once each. */
const storyAmounts = (story: string) => [...new Set([...story.matchAll(new RegExp(AMOUNT_IN.source, "g")), ...story.matchAll(/\b(?:quote[sd]?|quoted|estimate[sd]?)\b(?:\s+(?:of|for|was|is|came to|at))*\s+(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)\b/gi)].map((match) => cents(match[1])).filter((value) => value > 0))];

/** True when the amount is written in the story, or is the sum of two or more different amounts written in it. */
function inTheStory(amount: number, story: string): boolean {
  const written = storyAmounts(story).slice(0, 12);
  if (written.includes(amount)) return true;
  for (let mask = 1; mask < 1 << written.length; mask++) {
    if ((mask & (mask - 1)) === 0) continue; // one amount alone was checked above
    let sum = 0;
    for (let i = 0; i < written.length; i++) if (mask & (1 << i)) sum += written[i];
    if (sum === amount) return true;
  }
  return false;
}

/** The reading's line for the amount claimed, most direct first: a total or the amount sought, then a quote or estimate. */
const AMOUNT_LABELS = [
  /\b(?:total|amount (?:sought|claimed|you(?:'re| are) claiming|owed|of (?:the )?claim)|claim(?:ed)? amount|claiming|sought)\b/i,
  /\b(?:quote|estimate|replacement|repair cost)\b/i,
  /\b(?:loan|debt|owed|deposit|unpaid|invoice)\b/i,
];

const shown = (amount: number) => `$${(amount / 100).toLocaleString("en-CA", { minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The amount to offer: the story reading's, when the story writes it (or its parts), else the story's own reader's. */
export function offeredAmount(story: string, reading: readonly ReadingFact[], options: { oneClick?: boolean } = {}): StoryOffer | null {
  for (const label of AMOUNT_LABELS) {
    for (const fact of reading) {
      if (!label.test(fact.label)) continue;
      const found = AMOUNT_IN.exec(fact.value);
      if (!found) continue;
      const amount = cents(found[1]);
      // One click: a quote or estimate only when it is the story's only amount (storyAnswers.ts oneClickQuote).
      if (options.oneClick && label === AMOUNT_LABELS[1] && !oneClickQuote(story, amount / 100)) continue;
      if (amount > 0 && inTheStory(amount, story)) return { value: shown(amount), quote: `${fact.label}: ${fact.value}`, from: "reading" };
    }
  }
  // The review's one-click suggestion keeps the strict reader: never an amount already paid (#471 re-test); the chat and
  // the forms offer what the story states (amountOfferFromStory).
  const own = amountOfferFromStory(story, options);
  return own ? { value: own.value, quote: own.quote, from: "story" } : null;
}

/** The other party's name to offer: the reading's, when the story writes it and it is not a witness (understoodOtherParty.ts). */
export function offeredOtherParty(story: string, reading: readonly ReadingFact[]): StoryOffer | null {
  const name = otherPartyFromUnderstanding(reading, story);
  return name ? { value: name, quote: reading.find((fact) => fact.value.includes(name))?.value ?? name, from: "reading" } : null;
}

/**
 * What the story already gives for a question known only by its words (the home page's reading card), to offer with it,
 * never asked with an empty box: the amount and the other party, from this one place. Null when the question asks
 * neither, or the case already holds the fact (known or settled: mayAskWords does not show it), or the story gives none.
 * Chrome's stories on the real AI: S2 reading r3 asked "How much money are you seeking in total, including the deposit?"
 * after "kept my $1,200 deposit"; S8 reading r2 asked "Is Testgoods Ltd. the buyer who owes the money, or the seller who
 * supplied the goods?" after "The company is Testgoods Ltd.", each with an empty box.
 */
export function offerForAskedWords(file: CaseFile | null | undefined, words: string, story: string, reading: readonly ReadingFact[], options: { responding?: boolean } = {}): (StoryOffer & { fact: "amount" | "otherParty" }) | null {
  // The side: the case file's, else the role the reading showed ("Your role: Defendant").
  const responding = options.responding ?? ((file?.side.state === "answered" && file.side.value === "responding") || reading.some((item) => /\brole\b/i.test(item.label) && /\b(?:defend\w*|respond\w*|being sued|sued)\b/i.test(item.value)));
  const fact = factOfAskedText(words, { responding });
  if (fact !== "amount" && fact !== "otherParty") return null;
  // Show less rather than invent (real reading S6 r1, 18 Nov 2026): a person defending was offered the $4,200 claimed
  // against them for "If you want money from the contractor, how much are you seeking?". Their own amount is not in the
  // story's amount, so nothing is offered.
  if (fact === "amount" && responding) return null;
  if (file && factStatus(file, fact) !== "ask" && factStatus(file, fact) !== "offer") return null;
  const offer = fact === "amount" ? offeredAmount(story, reading) : offeredOtherParty(story, reading);
  // A question that already names the party ("Is Testgoods Ltd. the buyer ...?") asks something else about it.
  if (offer && fact === "otherParty" && words.toLowerCase().includes(offer.value.toLowerCase().replace(/\.$/, ""))) return null;
  return offer ? { ...offer, fact } : null;
}
