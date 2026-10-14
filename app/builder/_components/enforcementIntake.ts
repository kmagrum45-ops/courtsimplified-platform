/**
 * The Small Claims form intake for someone enforcing a judgment (walkthrough
 * run 38593464953, SJ). After the stage was recognised as enforcement, the
 * form still led with "So far this looks like: enforcement · kind of claim
 * not clear yet" and kept asking "What do you want the court to order?" and
 * "Breakdown of amount claimed" -- claim-building questions for someone whose
 * claim is already decided. Kept out of SmallClaimsIntake.tsx so
 * test:intake-sequencing can run it without the page's client imports.
 */

/** The heading once the story shows a judgment to enforce. */
export const ENFORCEMENT_DIRECTION = "You have a judgment; enforcing it";

/** The summary of the folded claim-building fields. */
export const CLAIM_FIELDS_FOLDED_SUMMARY = "About the original claim (optional: you already have a judgment)";

/*
 * A judgment won and not paid ("i won my small claims case against my old
 * roommate in may, the judge said he owes me 6500 plus costs. its been months
 * and he hasnt paid anything"). Both halves are needed: a win or an order,
 * and money not paid.
 */
// The person's own win, never the other side's ("the judge ordered me to pay" is not one).
const WON_OR_ORDERED =
  /\b(?:i|we) won\b|\bjudg(?:e)?ment (?:in (?:my|our) favou?r|for me|against (?:him|her|them))\b|\b(?:judge|court) (?:said|ordered|found) (?:that )?(?:he|she|they|him|her|them)\b[^.]*\b(?:owes?|pay) (?:me|us)\b|\bawarded (?:me|us)\b/i;
const NOT_PAID = /\b(?:hasn'?t|has not|haven'?t|have not|never|won'?t|will not|refuses? to|didn'?t|did not)\s+(?:paid|pay)\b|\bnot (?:been )?paid\b|\bunpaid\b/i;

/** Whether the person's words say they have a judgment or order that has not been paid. */
export function judgmentUnpaidFromStory(text: string): boolean {
  const words = text.replace(/[’‘]/g, "'");
  return WON_OR_ORDERED.test(words) && NOT_PAID.test(words);
}

/** What is still useful to add when enforcing: never evidence for the claim or how it was calculated. */
export function enforcementMissing(input: { yourName: string; otherParty: string; defendantAddress: string; timeline: string }): string[] {
  const has = (value: string) => value.trim().length > 0;
  const missing: string[] = [];
  if (!has(input.yourName)) missing.push("your legal name");
  if (!has(input.otherParty)) missing.push("the other party’s name");
  if (!has(input.defendantAddress)) missing.push("the other party’s address for service");
  if (!has(input.timeline)) missing.push("the date of the judgment");
  return missing;
}
