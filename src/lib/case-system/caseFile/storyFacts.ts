/**
 * EACH FACT THE STORY GIVES, IN PLAIN WORDS (Charter re-test 27 Oct, root cause 1).
 *
 * "What we have so far" showed whole story sentences for rows like Witness, Lost pay and Children:
 * "Witness" was the whole list of evidence, "Lost pay" repeated the injury sentence, the children
 * were a sentence about the divorce. Each reader here takes one fact out of the story as a short
 * value (a witness, a loss and its period, the other side, a complaint and what came of it, an
 * injury and its effects, the evidence, a last payment), keeping the sentence it came from as its
 * quote. Nothing is read into the words: only what they say, with "my" and "our" read as "your".
 *
 * Pure: no React, no network. States no law.
 */
import { sentences } from "../sentences";
import { dateMentionsIn, MONTH_FULL_NAMES_PATTERN } from "../dates";

export type StoryFact = { value: string; quote: string };

const WORD_NUMBER = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a few|several)";
/** "my" and "our" are the person's: on the screen they are "your". */
export const yours = (text: string) => text.replace(/\b(?:my|our)\b/gi, (word) => (word[0] === word[0].toUpperCase() ? "Your" : "your")).replace(/\bI've\b/g, "you've");
const firstUpper = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** Trailing punctuation off, but not the full stop of "Corp." or "Inc.". */
const trimEnd = (text: string) => text.trim().replace(/[\s,;:]+$/, "").replace(/(?<!\b(?:Corp|Inc|Ltd|Co|St|Jr|Sr))\.+$/, "");
const found = (story: string, test: RegExp) => sentences(story).find((sentence) => test.test(sentence) && !/\?\s*$/.test(sentence))?.trim() ?? null;

// ---- the other side ------------------------------------------------------------------------

const ORG_SUFFIX = "(?:Corp\\.?|Corporation|Inc\\.?|Ltd\\.?|Limited|LLC|Co\\.|Company|Group|Services?|Police Service|Police|Recovery|Collections?|Bank|Insurance|Properties|Contracting|Construction|Motors|Sons)";
const ORG = new RegExp(`\\b((?:[A-Z][\\w'’.-]*|&)(?:\\s+(?:[A-Z][\\w'’.-]*|&|of|and)){0,5}\\s+${ORG_SUFFIX})(?=[\\s,.;:)!?']|$)`);
// Case matters in the names: "SMITH & SONS but no" is not one, nor "GUY OWES ME".
const CALLED_ORG = /\b(?:[Cc]ompany|[Bb]usiness|[Ff]irm|[Ss]hop|[Ss]tore) (?:is )?(?:called|named) ([A-Z][\w'’&.-]*(?:\s+(?:[A-Z][\w'’&.-]*|&|of|and)){0,4})(?=\s+(?:but|and|which|that|who)\b|[\s,.;:)!?]|$)/;
const PERSON = /\b(?:[Oo]wner|[Mm]anager|[Ll]andlord|[Bb]oss|[Cc]ontractor),\s+([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+)?)\b|\b(?:[Gg]uy|[Mm]an|[Ww]oman|[Pp]erson) (?:called|named) ([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+)?)\b/;
const ROLE = /\b(?:my|our) (ex(?:-(?:wife|husband|partner))?|wife|husband|spouse|partner|landlord|tenant|employer|former employer|neighbou?r|contractor|roommate|ex-?boyfriend|ex-?girlfriend)\b/i;
const NOT_A_NAME = /^(?:Ottawa|Toronto|Kingston|Brockville|Ontario|Canada|Small|Superior|Court|Statement|Application|Plaintiff|Defendant|The|This|That|He|She|They|I|We|It|My|Our|TEST)$/;

/**
 * A sentence in which the person it names (my neighbour, my landlord, my partner, a name) is a witness or bystander:
 * they saw, heard, remember, noticed, were there, or can confirm or speak to something. Never the other side.
 */
const BYSTANDER_VERB = "(?:remembers?|remembered|recalls?|recalled|saw|sees|has seen|had seen|witnessed|witnesses|heard|hears|noticed|notices|watched|was there|were there|was present|were present|was with me|can (?:confirm|vouch|back (?:me|this) up|testify|speak to)|could (?:confirm|testify)|will (?:confirm|testify|vouch)|confirmed|took (?:photos|pictures|a video|videos))";
const BYSTANDER = new RegExp(`${ROLE.source}(?:'s?)?(?:,?\\s+[A-Z][a-z'-]+(?:\\s+[A-Z][a-z'-]+)*,?)?\\s+(?:who\\s+)?(?:also\\s+|even\\s+)?${BYSTANDER_VERB}\\b`, "i");
export function bystanderSentence(sentence: string): boolean {
  return BYSTANDER.test(sentence);
}

/** The other side, as the story names it: a business, the person behind it, or who they are to the person. */
/** A sentence about the claim against the person: they were served, or sued. */
const AGAINST_THEM = /\bserv(?:e|es|ed|ing)\s+(?:me|him|her|them|us)\b|\b(?:i|he|she|we|they) (?:was|were|got|have been|has been) served\b|\bsu(?:ed|ing|es) (?:me|him|her|us|them)\b|\bclaim against (?:me|him|her|us|them)\b|\b(?:says?|said|claims?|claimed|alleges?|alleged|insists?) (?:that )?(?:i|we) owe\b|\b(?:disagree|dispute|deny|denied) (?:that )?(?:i|we) owe\b|\bwants? (?:me|us) to pay\b/i;

/**
 * The story's sentences about the claim against the person, joined; empty when there are none. What
 * someone responding is asked or shown about "the claim" is read from these only, never from the claim
 * they once meant to bring (26 Oct re-test, case 19 after the side change: the repair's $1,650 and
 * "Work or a service you paid for" shown on the defamation claim against him).
 */
export function againstThemIn(story: string): string {
  return sentences(story).filter((sentence) => AGAINST_THEM.test(sentence)).join(" ");
}

export function otherSideIn(story: string): StoryFact | null {
  const business = businessOtherSideIn(story);
  if (business) return business;
  return roleOtherSideIn(story);
}

/**
 * The business the story names ("Testgoods Ltd.", "a company called Brightline"), with the person behind it: the part of
 * otherSideIn that is a proper name, never a role word. The Civil chat and the names kept from the model read it after
 * their own stricter reader (full local run of 4d1ae680: "I sold ... to Testgoods Ltd." was asked cold).
 */
export function businessOtherSideIn(story: string): StoryFact | null {
  for (const sentence of sentences(story)) {
    const org = ORG.exec(sentence)?.[1] ?? CALLED_ORG.exec(sentence)?.[1] ?? null;
    if (!org) continue;
    const clean = trimEnd(org).replace(/^TEST\s+/, "TEST ");
    // The person behind the business, named in the same story ("its owner, Wei Chen").
    const named = sentences(story).map((line) => PERSON.exec(line)).find(Boolean);
    const person = named ? (named[1] ?? named[2]) : null;
    const badges = /\bbadges?(?: numbers?)?\s+((?:#?\d+)(?:\s*(?:,|and|&)\s*#?\d+)*)/i.exec(story)?.[1];
    const officers = new RegExp(`\\b(${WORD_NUMBER}) (?:police )?officers?\\b`, "i").exec(story)?.[0];
    const extra = [person && !NOT_A_NAME.test(person) && !clean.includes(person) ? person : null, officers ? `${officers}${badges ? `, badges ${badges}` : ""}` : badges ? `badges ${badges}` : null].filter(Boolean);
    return { value: extra.length ? `${clean} (${extra.join("; ")})` : clean, quote: sentence.trim() };
  }
  return null;
}

/** Who the other side is to the person ("Your landlord (Peter Jones)"), or a friend or relative tied to what is owed. */
function roleOtherSideIn(story: string): StoryFact | null {
  // A sentence where that person only saw, heard, remembers or can confirm something names a witness, never the other
  // side: not read (Chrome check of #544, 6 Nov, F2: "My neighbour remembers their teal-orange van." gave "The other
  // party: Your neighbour"). Unclear is left unset, never guessed (site owner, 6 Nov).
  const role = sentences(story).filter((sentence) => !bystanderSentence(sentence)).map((sentence) => ({ sentence, match: ROLE.exec(sentence) })).find((item) => item.match);
  if (role?.match) {
    // Their name, where the story gives it beside the role ("my landlord, Peter Jones", "John Smith,
    // my ex-husband"; reviewer, 26 Oct: only "Your ex-husband" was shown).
    const after = /^,?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/.exec(role.sentence.slice((role.match.index ?? 0) + role.match[0].length))?.[1];
    const before = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?\s+$/.exec(role.sentence.slice(0, role.match.index ?? 0))?.[1];
    const name = [after, before].find((candidate) => candidate && !candidate.split(/\s+/).some((word) => NOT_A_NAME.test(word)));
    const who = firstUpper(`your ${role.match[1].toLowerCase()}`);
    return { value: name ? `${who} (${name})` : who, quote: role.sentence.trim() };
  }
  // A friend or relative, only where the same sentence ties them to what is owed (Chrome check of #544 on 9b960f7,
  // F14: "I lent my friend Alex Testwood $4,500" gave no other party). Being there, seeing or confirming never counts.
  for (const sentence of sentences(story)) {
    if (bystanderSentence(sentence)) continue;
    const tied = OWED_TO_RELATION.exec(sentence) ?? RELATION_OWES.exec(sentence);
    if (!tied) continue;
    const name = tied[2] && !tied[2].split(/\s+/).some((word) => NOT_A_NAME.test(word)) ? tied[2] : null;
    const who = firstUpper(`your ${tied[1].toLowerCase()}`);
    return { value: name ? `${who} (${name})` : who, quote: sentence.trim() };
  }
  return null;
}

/** Who a friend or relative is to the person: read as the other side only through OWED_TO_RELATION or RELATION_OWES. */
const RELATION = "(friend|best friend|close friend|old friend|brother|sister|cousin|uncle|aunt|nephew|niece|mother|father|mom|dad|son|daughter|stepson|stepdaughter|stepfather|stepmother|grandfather|grandmother|brother-in-law|sister-in-law|father-in-law|mother-in-law|relative|co-?worker|colleague|classmate|acquaintance|ex-?friend|former friend)";
const RELATION_NAME = "(?:,?\\s+([A-Z][a-z'’-]+(?:\\s+[A-Z][a-z'’-]+)+),?)?";
/** The person lent, gave, paid, sold or rented to them: "I lent my friend Alex Testwood $4,500". */
const OWED_TO_RELATION = new RegExp(`\\b(?:lent|loaned|gave|paid|sold|rented|advanced|transferred|e-?transferred|sent)\\s+(?:\\$[\\d,.]+\\s+)?(?:to\\s+)?(?:my|our)\\s+${RELATION}${RELATION_NAME}`, "i");
/** They owe, borrowed, kept, never paid or refuse to pay: "My cousin Dana Testfield borrowed $800 from me". */
const RELATION_OWES = new RegExp(`\\b(?:my|our)\\s+${RELATION}${RELATION_NAME}\\s+(?:still\\s+)?(?:owes|owed|borrowed|took|kept|never\\s+(?:paid|repaid|returned|gave)|has\\s+not\\s+(?:paid|repaid|returned)|hasn['’]t\\s+(?:paid|repaid|returned)|did\\s+not\\s+(?:pay|repay|return)|didn['’]t\\s+(?:pay|repay|return)|refuses?\\s+to\\s+(?:pay|repay|return)|refused\\s+to\\s+(?:pay|repay|return)|won['’]t\\s+(?:pay|repay|return))\\b`, "i");

// ---- losses ----------------------------------------------------------------------------------

/** Words that make an amount money spent on something, not pay: "paid", "spent", "bought", "cost" before it; "for/on <thing>" after. */
const SPENT_BEFORE = /\b(?:paid|pay|spent|spend|spending|bought|buy|buying|cost|costs|costing|charged)\b(?:\s+\w+){0,3}\s*(?:for\s+)?$/i;
const SPENT_AFTER = /^\s*(?:for|on)\s+(?!(?:my\s+|the\s+)?(?:lost|missed)\s+(?:wages|pay|income|work)\b|(?:my\s+|the\s+)?(?:wages|pay|income|work)\b)/i;
/** Whether the amount at `at` in `text` is money spent on something (a cost), never pay lost. */
function spentAt(text: string, at: number, length: number): boolean {
  return SPENT_BEFORE.test(text.slice(Math.max(0, at - 40), at)) || SPENT_AFTER.test(text.slice(at + length, at + length + 40));
}

/**
 * Money the person paid out because of what happened, each as said ("Medicine $18.45"): what they paid or spent, and on
 * what. Shown beside lost pay, never inside it (Chrome milestone test of #550, row 22).
 */
export function costsIn(story: string): StoryFact | null {
  const parts: string[] = [];
  const quotes: string[] = [];
  for (const sentence of sentences(story)) {
    for (const match of sentence.matchAll(/\b(?:paid|spent|spend|bought|buy)\s+(\$\s?\d[\d,]*(?:\.\d{2})?)\s+(?:for|on)\s+(?:a\s+|an\s+|the\s+|my\s+)?([a-z][a-z' -]{1,40}?)(?=[,.;]|\s+and\b|$)|\b(?:paid|spent|bought|buy|had to buy)\s+(?:a\s+|an\s+|the\s+|my\s+)?([a-z][a-z' -]{1,40}?)\s+for\s+(\$\s?\d[\d,]*(?:\.\d{2})?)/gi)) {
      const amount = (match[1] ?? match[4]).replace(/^\$\s+/, "$");
      const thing = (match[2] ?? match[3]).trim();
      if (/\b(?:wages|pay|income|work|rent|deposit|loan|invoice|contractor)\b/i.test(thing)) continue;
      parts.push(`${firstUpper(thing)} ${amount}`);
      if (!quotes.includes(sentence.trim())) quotes.push(sentence.trim());
    }
  }
  return parts.length ? { value: parts.join("; "), quote: quotes.join(" ") } : null;
}

/** Pay lost: the amount and the time off, as the story gives them ("$2,640 (2 weeks of work)"). */
export function lostPayIn(story: string): StoryFact | null {
  const sentence = found(story, /\b(?:missed|lost|losing|off)\b[^.]*\b(?:work|pay|wages|income|shifts?)\b/i);
  if (!sentence) return null;
  const period = new RegExp(`\\b(${WORD_NUMBER}\\s+(?:weeks?|days?|months?|shifts?)(?:\\s+of\\s+(?:work|pay|wages))?)\\b`, "i").exec(sentence.slice(Math.max(0, sentence.search(/\b(?:missed|lost|losing|off)\b/i))))?.[1];
  // A rate ("$150 per day") is never the loss, and never replaces a total the person gave ("$450 total"): Chrome check
  // of #550, S1 showed "Lost pay $150 (3 days of work)" for "$150 per day; $450 total".
  // An amount said for the loss itself ("$450 in lost wages") is the loss; the next amount in the sentence ("and $18.45
  // for medicine") is something else (Chrome forms test on #550, row 6: "Lost pay $18.45").
  // "lost $450 in wages", "$450 in wages I lost", "$450 in lost wages": the loss in the person's words, wherever it sits.
  // Looked for in the whole story, not only the sentence about the time off: Chrome pass 2 on #550 (S1, 17 Nov) had the
  // time off in one sentence and "I want to claim … $450 lost wages" in the next, and showed "Lost pay $18.45".
  const namedIn = (text: string) => /(\$\s?\d[\d,]*(?:\.\d{2})?)\s+(?:(?:in|for|of)\s+)?(?:lost|missed)\s+(?:wages|pay|income|work)\b/i.exec(text)?.[1]
    ?? /\blost\s+(\$\s?\d[\d,]*(?:\.\d{2})?)\s+(?:in|of)\s+(?:wages|pay|income)\b/i.exec(text)?.[1]
    ?? /\b(?:lost|missed)\s+(?:wages|pay|income)\s+(?:of|totall?ing|totaling|was|were)\s+(\$\s?\d[\d,]*(?:\.\d{2})?)/i.exec(text)?.[1]
    ?? /(\$\s?\d[\d,]*(?:\.\d{2})?)\s+(?:in|of)\s+(?:wages|pay|income)\b/i.exec(text)?.[1];
  const namedSentence = namedIn(sentence) ? sentence : sentences(story).map((each) => each.trim()).find((each) => namedIn(each));
  const named = namedSentence ? namedIn(namedSentence) : undefined;
  if (named) return { value: [named.replace(/^\$\s+/, "$"), period ? `(${period})` : null].filter(Boolean).join(" "), quote: namedSentence === sentence ? sentence : `${sentence} ${namedSentence}` };
  // What follows "and bought / paid / spent" is a cost, never pay ("at $150 a day and bought Tylenol and an ice pack for
  // $18.45": Chrome pass 2 on #550, S1).
  const lost = sentence.slice(Math.max(0, sentence.search(/\b(?:missed|lost|losing|off)\b/i)));
  const spentClause = lost.search(/\b(?:and|then|also)\s+(?:I\s+)?(?:had to\s+)?(?:bought|buy|paid|pay for|spent|purchased)\b/i);
  const from = spentClause > 0 ? lost.slice(0, spentClause) : lost;
  // An amount spent on something ("paid $18.45 for medicine", "buy medicine for $18.45") is a cost, never pay (Chrome
  // milestone test of #550, row 22: "Lost pay $18.45 (3 days of work)" for "$450" lost and "$18.45 for medicine").
  const amounts = [...from.matchAll(/\$\s?\d[\d,]*(?:\.\d{2})?(\s*(?:per|a|an|\/)\s*(?:day|hour|week|shift|month)\b)?/gi)].filter((match) => !spentAt(from, match.index ?? 0, match[0].length));
  const total = amounts.find((match) => !match[1]);
  const rate = amounts.find((match) => match[1]);
  const amount = total ? total[0] : rate ? `${rate[0].replace(/\s*\/\s*/, " per ").replace(/^\$\s/, "$").replace(/\s+/g, " ").trim()}` : undefined;
  if (!period && !amount) return null;
  return { value: [amount?.replace(/^\$\s+/, "$"), period ? (amount ? `(${period})` : period) : null].filter(Boolean).join(" "), quote: sentence };
}

// ---- injury ----------------------------------------------------------------------------------

const BODY = "(?:wrist|arm|hand|finger|thumb|leg|knee|ankle|foot|back|neck|head|shoulder|hip|rib|face|eye|nose|jaw)s?";
const HARM = "(?:bruised|swollen|broken|fractured|sprained|injured|cut|numb|scraped|burned|dislocated|hurt|sore)";
/** The injury and its effects, as said ("Left wrist bruised and swollen; finger numbness"). */
export function injuryIn(story: string): StoryFact | null {
  const sentence = found(story, new RegExp(`\\b${BODY}\\b[^.]*\\b${HARM}\\b|\\b${HARM}\\b[^.]*\\b${BODY}\\b|\\bconcussion\\b|\\bnumbness\\b`, "i"));
  if (!sentence) return null;
  const parts: string[] = [];
  const hurt = new RegExp(`\\b((?:(?:left|right|lower|upper)\\s+)?${BODY})\\s+(?:was|were|is|are|got)\\s+(${HARM}(?:\\s+and\\s+${HARM})?)`, "i").exec(sentence);
  if (hurt) parts.push(`${firstUpper(hurt[1].toLowerCase())} ${hurt[2].toLowerCase()}`);
  for (const effect of sentence.match(/\b(?:numbness in (?:my|the) \w+|\w+ numbness|concussion|stitches|a cast|a sling)\b/gi) ?? []) parts.push(yours(effect.toLowerCase()));
  const doctor = /\bsaw (?:a|my|the) (doctor|physician|nurse|physiotherapist|dentist)(?: on ([A-Z][a-z]+ \d{1,2}))?/i.exec(sentence);
  if (doctor) parts.push(`saw a ${doctor[1].toLowerCase()}${doctor[2] ? ` (${doctor[2]})` : ""}`);
  return parts.length ? { value: firstUpper(parts.join("; ")), quote: sentence } : null;
}

// ---- property --------------------------------------------------------------------------------

const THING = "(?:phone|laptop|computer|car|vehicle|truck|bike|bicycle|tablet|camera|watch|furniture|belongings|property|tv|television|fridge|washer|dryer)";
/** What happened to their things ("Phone kept for 6 weeks; came back with a cracked screen"). */
export function propertyIn(story: string): StoryFact | null {
  const sentence = found(story, new RegExp(`\\b${THING}\\b[^.]*\\b(?:damag\\w*|cracked|broken|kept|seized|taken|lost|stolen|worse|flickering|stopped working|scratched)\\b`, "i"));
  if (!sentence) return null;
  const thing = new RegExp(`\\b(${THING})\\b`, "i").exec(sentence)?.[1].toLowerCase();
  if (!thing) return null;
  const parts: string[] = [];
  const kept = /\b(?:kept|held|seized|took) (?:my|our|the|his|her) \w+ (?:for|over) ([^,.;]+?)(?=\s+and\b|[,.;]|$)/i.exec(sentence);
  if (kept) parts.push(`kept for ${kept[1].trim()}`);
  const damage = /\b(came back (?:with )?)?(?:with )?(a |an )?(cracked screen|cracked|damaged|broken|scratched|dented|worse)\b(?:\s*\(([^)]+)\))?/i.exec(sentence);
  if (damage) {
    const said = `${damage[1] ? damage[1].toLowerCase() : ""}${damage[2] && damage[1] ? damage[2].toLowerCase() : ""}${damage[3].toLowerCase()}`;
    parts.push(damage[4] ? `${said}: ${damage[4].trim()}` : said);
  }
  for (const fault of sentence.match(/\b(?:screen flickering|stopped working|won'?t turn on|keyboard stopped working)\b/gi) ?? []) if (!parts.join(" ").includes(fault.toLowerCase())) parts.push(fault.toLowerCase());
  return parts.length ? { value: `${firstUpper(thing)}: ${parts.join("; ")}`, quote: sentence } : null;
}

// ---- a complaint -----------------------------------------------------------------------------

/** The month names, from the one date module (dates.ts). */
const MONTHS = MONTH_FULL_NAMES_PATTERN;
/** A month, with a day and year when given: "November 2019" is never "November 20". */
const A_DATE = `(?:${MONTHS})(?: \\d{1,2}(?!\\d))?(?:,? \\d{4})?`;
/** A complaint they made, to whom, when, and what came of it, in their words. */
export function complaintIn(story: string): StoryFact | null {
  const sentence = found(story, /\bcomplaint\b/i);
  if (!sentence) return null;
  const kind = /\b((?:a |an |my )?(?:\w+ )?complaint(?: to (?:the )?[A-Za-z' ]{3,40}?)?)(?=\s+(?:in|on|with|about|and|,)|[.,]|$)/i.exec(sentence)?.[1] ?? "complaint";
  const when = new RegExp(`\\bcomplaint\\b[^.]*?\\b(?:in|on) (${A_DATE})`, "i").exec(sentence)?.[1];
  const outcome = new RegExp(`\\b(screened out|dismissed|rejected|refused|upheld|closed|no (?:reply|response|answer)|still open)\\b(?:[^.]*?\\b(?:in|on) (${A_DATE}))?(?:[^.]*?\\b(with no reasons?|without reasons?))?`, "i").exec(sentence);
  const said = [`${firstUpper(yours(kind.replace(/^(?:a|an)\s+/i, "")))}${when ? `, ${when}` : ""}`];
  if (outcome) said.push(`${outcome[1].toLowerCase()}${outcome[2] ? `, ${outcome[2]}` : ""}${outcome[3] ? ` (${outcome[3].toLowerCase()})` : ""}`);
  return { value: said.join("; "), quote: sentence };
}

// ---- a witness and the evidence ----------------------------------------------------------------

/** Just the witness: who saw it. */
export function witnessIn(story: string): StoryFact | null {
  for (const sentence of sentences(story)) {
    const named = /\b((?:my|our|a|one|two|the) (?:[a-z-]+ )?(?:witness(?:es)?|neighbou?rs?|friends?|co-?workers?|coworkers?|colleagues?|brother|sister|mother|father|partner|wife|husband|son|daughter|passer-?by|bystanders?)(?: [A-Z][a-z]+)?) (?:who )?(?:saw|watched|witnessed|was there|heard)\b(?: (?:it|what happened|the whole thing|everything))?/i.exec(sentence);
    if (named) return { value: firstUpper(yours(named[0].trim())), quote: sentence.trim() };
    const listed = /\b(?:a|one|two) witness(?:es)?\b(?: who [a-z ]{2,40}?)?(?=[,.;]|\s+and\b|$)/i.exec(sentence);
    if (listed) return { value: firstUpper(listed[0].trim()), quote: sentence.trim() };
  }
  return null;
}

/** "I have …" naming things they hold, never "I have to respond" or "We have a case going". */
const HAVE = /\b(?:I have|I've got|I kept|I still have|we have|I took|I saved|I've kept)\b\s+(?!to\b|no\b|not\b|been\b|a (?:case|lawyer|court)\b|an? (?:hearing|appointment)\b)(.+)$/i;
/** A kind of record a person can show. */
const EVIDENCE_WORDS = /\b(?:photos?|pictures?|screenshots?|texts?|text messages?|messages?|emails?|e-mails?|receipts?|invoices?|contracts?|agreements?|notes?|letters?|records?|reports?|videos?|recordings?|statements?|documents?|papers?|certificates?|bills?|estimates?|quotes?|cheques?|checks?|bank statements?|transcripts?|logs?|warranty|ticket|footage|proof|copies|copy|x-rays?|xrays?|scans?|prescriptions?)\b/i;
/** Children, a partner or an arrangement had, never a record: "we have two kids", "joint custody". */
const PEOPLE_OR_ARRANGEMENT = /^\s*(?:(?:two|three|four|\d+|a|one|our|my) )?(?:kids?|children|child|sons?|daughters?|baby|custody|joint custody|shared custody|parenting)\b/i;
/** The evidence they say they have, each item in plain words ("The clinic note; photos of the wrist"). */
export function evidenceIn(story: string): StoryFact | null {
  for (const sentence of sentences(story)) {
    const list = HAVE.exec(sentence.replace(/\.\s*$/, ""))?.[1];
    // Only a record of some kind: "we have two kids" and "I have custody of our daughter" are not
    // evidence (reviewer, 26 Oct: "Evidence you have: Two kids; Maya who is 7").
    if (!list || !EVIDENCE_WORDS.test(list) || PEOPLE_OR_ARRANGEMENT.test(list)) continue;
    const items = list.split(/\s*(?:,|;|\band\b)\s*/i).map((item) => trimEnd(item)).filter((item) => item.length > 2 && !/\bwitness/i.test(item) && !/^(?:no|nothing|none)\b/i.test(item));
    if (!items.length) continue;
    return { value: items.map((item) => firstUpper(yours(item.replace(/^(?:the|a|an) /i, (word) => word)))).join("; "), quote: sentence.trim() };
  }
  return null;
}

// ---- a debt's last payment -------------------------------------------------------------------

/** The last payment on a debt, when the story gives it ("November 2019"). */
export function lastPaymentIn(story: string): StoryFact | null {
  const sentence = found(story, /\blast (?:payment|paid)\b/i);
  const when = sentence ? new RegExp(`\\blast (?:payment|paid)\\b[^.]*?\\b(?:in|on|was) (${A_DATE}|\\d{4})`, "i").exec(sentence)?.[1] : null;
  return sentence && when ? { value: when, quote: sentence } : null;
}

/** Whether they say they acknowledged the debt in writing since, in their words. */
export function acknowledgedIn(story: string): StoryFact | null {
  const sentence = found(story, /\backnowledg\w*\b[^.]*\bwriting\b|\bin writing\b[^.]*\backnowledg\w*/i);
  if (!sentence) return null;
  const never = /\b(?:never|not|didn'?t|did not|haven'?t|have not)\b[^.]*\backnowledg/i.test(sentence);
  return { value: never ? "No, not in writing (your words)" : "Yes, in writing (your words)", quote: sentence };
}

// ---- what the other side says --------------------------------------------------------------

/** What the other side says or claims, as the person reports it (the words they report). */
export function otherSideSaysIn(story: string): StoryFact | null {
  const sentence = found(story, /\b(?:he|she|they)\s+(?:says|said|claims|claimed|alleges|alleged|accuses)\b/i);
  if (!sentence) return null;
  const said = [...sentence.matchAll(/\b(?:he|she|they)\s+(?:says|said|claims|claimed|alleges|alleged)\s+(?:that\s+)?([^.;]+?)(?=\s+and\s+(?:he|she|they)\b|[.;]|$)/gi)].map((match) => trimEnd(match[1]));
  return said.length ? { value: said.map((item) => `“${item}”`).join("; "), quote: sentence } : null;
}

// ---- the civil review's boxes (Charter re-test 27 Oct: empty although the story had them) ----

const PUBLIC = /\b(?:police|city|town|municipal\w*|ministry|crown|government|province|ontario|hospital|school board|public|agency|commission|board)\b/i;
/** The public body or official involved, when the other side is one. */
export function publicBodyIn(story: string): StoryFact | null {
  const side = otherSideIn(story);
  return side && PUBLIC.test(side.value) ? side : null;
}

/** What the losses are made up of: lost pay, the costs paid out, damaged property and the injury, each as said. */
export function lossesIn(story: string): StoryFact | null {
  const parts = [["Lost pay", lostPayIn(story)], ["Costs you paid", costsIn(story)], ["Property", propertyIn(story)], ["Injury", injuryIn(story)]] as const;
  const said = parts.filter(([, fact]) => fact);
  if (!said.length) return null;
  return { value: said.map(([label, fact]) => `${label}: ${fact!.value}`).join("; "), quote: [...new Set(said.map(([, fact]) => fact!.quote))].join(" ") };
}

/** The story's dated sentences, in the order told: the person's own timeline. */
export function timelineIn(story: string): StoryFact | null {
  // A month and year is a line of a timeline too ("delivered in August 2026", "separated in June 2026"): it has no day to
  // count a deadline from, so dateMentionsIn leaves it out, but it is when something happened (Chrome milestone pass 2,
  // findings 9 and 11: the review's Timeline stayed empty for S7 and S8).
  const monthYear = new RegExp(`\\b(?:${MONTH_FULL_NAMES_PATTERN})\\.?,?\\s+\\d{4}\\b`, "i");
  const dated = sentences(story).map((sentence) => sentence.trim()).filter((sentence) => (dateMentionsIn(sentence).length > 0 || monthYear.test(sentence)) && !/\?\s*$/.test(sentence));
  return dated.length ? { value: dated.join("\n"), quote: dated.join(" ") } : null;
}
