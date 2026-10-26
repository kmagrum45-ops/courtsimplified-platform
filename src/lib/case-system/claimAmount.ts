import { sentences as splitSentences } from "./sentences";
/**
 * THE AMOUNT OFFERED AS "THE AMOUNT CLAIMED", READ FROM THE STORY (#470 re-test).
 *
 * One reading for every place that offers an amount from the story (the review
 * panel's suggestion, the guided civil question, the Small Claims form's own
 * box), so they cannot disagree. Each amount is read with the part of its
 * sentence it sits in, not the sentence as a whole:
 *
 *   "I paid $2,000 and $6,000 is still owed"      -> $6,000 (the $2,000 was paid)
 *   "charged me a $3,800 fee and did $2,500 of damage" -> $2,500 (a fee is not the claim)
 *   "a deck for $8,000 ... I paid $2,000"          -> nothing: the price and a payment,
 *                                                     and no amount owed, so it is asked
 *
 * The rule: an amount the story says is owed, claimed or the damage is offered.
 * Without one, a story that names a single amount (not a fee) offers that one --
 * "I paid a contractor $9,000 and he never came back" is what is being claimed.
 * Anything else is unclear and nothing is offered: the question is asked
 * instead. An amount already paid, a fee and a price are never offered over an
 * amount owed or claimed.
 *
 * Before, one reader took the first amount in each sentence (so "I paid $2,000
 * and $6,000 is still owed" gave $2,000) and the Small Claims form took the
 * first dollar amount in the whole story ($8,000, the deck's price).
 *
 * Pure: no I/O. Practical reading, not law: it only proposes an answer the
 * person confirms or changes (CLAUDE.md s. 4).
 */

export type ClaimAmount = { value: string; quote: string };

type Kind = "against" | "owed" | "claim" | "damage" | "fee" | "rent" | "paid" | "price" | "plain";

const MONEY = /\$\s?\d[\d,]*(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+(?:\.\d+)?\s?k\b|\b\d{3,7}\s?dollars\b|\b(?:for|owe[sd]?|of|paid|lent|worth|costs?|claim(?:ing)?)\s+\$?(?:\d{1,3}(?:,\d{3})+|\d{3,7})(?:\.\d{2})?\b|\b\d{4,7}\b/gi;

// What a part of a sentence says about its amount (the first that fits).
const KINDS: [Kind, RegExp][] = [
  // A claim the other side makes against the person ("serves him with a claim for $3,200",
  // "is suing me for $6,000") is never the person's own amount (messy pack case 19).
  ["against", /\b(?:serve[sd]? (?:me|him|her|them|us) with (?:a|their|his|her) claim|su(?:e|es|ed|ing) (?:me|him|her|us)\b|claim(?:s|ed)? against (?:me|him|her|us)\b)/i],
  ["owed", /\b(?:invoiced?|billed|still owe[sd]?|owe[sd]?|owing|is owed|are owed|outstanding|unpaid|balance|remaining|left to pay|still due|never paid (?:me|us)|(?:didn'?t|did not|won'?t|will not|refuses? to|refused to) pay (?:me|us)(?: back)?)\b/i],
  ["claim", /\b(?:claim(?:ing|ed)?|su(?:e|ing) (?:\w+ )?for|(?:want(?:s|ed)?|get|recover) [^.]{0,30}?\bback|money back|lost|total)\b/i],
  // A fee before the damage: "a $3,800 repair fee" is a fee (#470 re-test).
  ["fee", /\bfees?\b|\bcharge[sd]?\b|\binterest\b|\bfines?\b|\bpenalt(?:y|ies)\b|\bcommission\b/i],
  ["damage", /\bdamage[sd]?\b|\brepair\w*\b|\breplac\w*\b|\bestimate[sd]?\b/i],
  // A rent or wage is a rate, never the claim on its own (#471 re-test: "Use $1,800" was the
  // monthly rent); rent still owed is read above, as owed.
  ["rent", /\b(?:rent|per month|a month|monthly|per week|a week|weekly|per hour|an hour|hourly|salary|wages?)\b/i],
  ["paid", /\b(?:already paid|paid (?:me |us )?back|repaid|refund(?:ed)?|returned|gave (?:me |us )?back|paid|deposit)\b/i],
  ["price", /\b(?:for|quoted?|price[sd]?|contract(?:ed)?|agreed|cost)\b/i],
];
const WORTH =/\bworth\b|\bvalued?\b|\bvalue of\b/i;
const HARMED = /\b(?:broke|broken|break|damag\w*|destroy\w*|ruin\w*|smash\w*|crack\w*|stole|stolen|lost|missing)\b/i;
// What the person says they claim or want back comes first ("I owe $500 ... I want the
// $1,800 back"), then what is owed, then the damage.
const CLAIMABLE: Kind[] = ["claim", "owed", "damage"];

const BOUNDARY = /[,;:]|\b(?:and|but|while|although|though|then|so|which|because)\b/gi;

function sentences(story: string): string[] {
  return splitSentences(story);
}

/** The part of the sentence an amount sits in: from the boundary before it to the one after. */
function clauseAround(sentence: string, start: number, end: number): string {
  let from = 0;
  let to = sentence.length;
  for (const boundary of sentence.matchAll(BOUNDARY)) {
    const at = boundary.index ?? 0;
    if (at + boundary[0].length <= start) from = at + boundary[0].length;
    else if (at >= end) { to = at; break; }
  }
  return sentence.slice(from, to);
}

type Mention = ClaimAmount & { number: number; kind: Kind };

/** Every amount of money in the story, with its sentence and what its part of the sentence says it is. */
export function moneyMentions(story: string): Mention[] {
  const found: Mention[] = [];
  for (const sentence of sentences(story)) {
    for (const match of sentence.matchAll(MONEY)) {
      const digits = match[0].replace(/[^\d.k]/gi, "");
      const number = /k$/i.test(digits) ? Number(digits.slice(0, -1)) * 1000 : Number(digits);
      if (!Number.isFinite(number) || number <= 0) continue;
      // "in 2022", "since 2019": a year, not money.
      if (number >= 1900 && number <= 2100 && !/[$,]|dollars/i.test(match[0])) continue;
      const start = match.index ?? 0;
      const clause = clauseAround(sentence, start, start + match[0].length);
      const read = KINDS.find(([, test]) => test.test(clause))?.[0] ?? "plain";
      // What something lost or broken was worth is the damage ("They broke my table and TV,
      // worth $2,500 together", #470 re-test), never a price or a payment.
      const kind: Kind = (read === "plain" || read === "price") && WORTH.test(clause) && HARMED.test(sentence) ? "damage" : read;
      found.push({ value: `$${number.toLocaleString("en-CA")}`, quote: sentence, number, kind });
    }
  }
  return found;
}

/** The amount to offer as the amount claimed, with the sentence it came from, or null when the story leaves it unclear. */
export function claimAmountFromStory(story: string): ClaimAmount | null {
  // What they say they want as one sum of two amounts ("a refund of $450 plus the $1,200 he
  // paid to replace it"): the total, offered with their words (#477 re-test, case 19: no
  // one-click amount). Only "plus", said as what they want: an "and" may list prices.
  for (const sentence of sentences(story)) {
    const sum = /\b(?:want(?:s|ed)?|claim(?:s|ing)?|asking for|seek(?:s|ing)?|sue (?:\w+ )?for)\b[^.]*?\$\s?(\d[\d,]*(?:\.\d{2})?)\s+plus\s+(?:the\s+|another\s+)?\$\s?(\d[\d,]*(?:\.\d{2})?)/i.exec(sentence);
    if (!sum) continue;
    const total = Number(sum[1].replace(/,/g, "")) + Number(sum[2].replace(/,/g, ""));
    if (Number.isFinite(total) && total > 0) return { value: `$${total.toLocaleString("en-CA")}`, quote: sentence };
  }
  const mentions = moneyMentions(story);
  const distinct = (list: Mention[]) => [...new Set(list.map((mention) => mention.number))];
  for (const kind of CLAIMABLE) {
    const said = mentions.filter((mention) => mention.kind === kind);
    if (said.length === 0) continue;
    // Two different amounts both said to be owed (or both damage): which one is unclear.
    if (distinct(said).length > 1) return null;
    return { value: said[0].value, quote: said[0].quote };
  }
  // No amount said to be owed, claimed or damage: only a story with one amount, not a fee.
  const only = distinct(mentions);
  if (only.length !== 1) return null;
  const first = mentions[0];
  // Only an amount the story says nothing about: never a rent, fee, price or amount already
  // paid as a one-click amount (#471 re-test); those are asked instead.
  return first.kind === "plain" ? { value: first.value, quote: first.quote } : null;
}
