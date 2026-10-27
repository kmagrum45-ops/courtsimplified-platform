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

/** The other side, as the story names it: a business, the person behind it, or who they are to the person. */
/** A sentence about the claim against the person: they were served, or sued. */
const AGAINST_THEM = /\bserv(?:e|es|ed|ing)\s+(?:me|him|her|them|us)\b|\b(?:i|he|she|we|they) (?:was|were|got|have been|has been) served\b|\bsu(?:ed|ing|es) (?:me|him|her|us|them)\b|\bclaim against (?:me|him|her|us|them)\b/i;

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
  const role = sentences(story).map((sentence) => ({ sentence, match: ROLE.exec(sentence) })).find((item) => item.match);
  if (role?.match) {
    // Their name, where the story gives it beside the role ("my landlord, Peter Jones", "John Smith,
    // my ex-husband"; reviewer, 26 Oct: only "Your ex-husband" was shown).
    const after = /^,?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/.exec(role.sentence.slice((role.match.index ?? 0) + role.match[0].length))?.[1];
    const before = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?\s+$/.exec(role.sentence.slice(0, role.match.index ?? 0))?.[1];
    const name = [after, before].find((candidate) => candidate && !candidate.split(/\s+/).some((word) => NOT_A_NAME.test(word)));
    const who = firstUpper(`your ${role.match[1].toLowerCase()}`);
    return { value: name ? `${who} (${name})` : who, quote: role.sentence.trim() };
  }
  return null;
}

// ---- losses ----------------------------------------------------------------------------------

/** Pay lost: the amount and the time off, as the story gives them ("$2,640 (2 weeks of work)"). */
export function lostPayIn(story: string): StoryFact | null {
  const sentence = found(story, /\b(?:missed|lost|losing|off)\b[^.]*\b(?:work|pay|wages|income|shifts?)\b/i);
  if (!sentence) return null;
  const period = new RegExp(`\\b(${WORD_NUMBER}\\s+(?:weeks?|days?|months?|shifts?)(?:\\s+of\\s+(?:work|pay|wages))?)\\b`, "i").exec(sentence.slice(Math.max(0, sentence.search(/\b(?:missed|lost|losing|off)\b/i))))?.[1];
  const amount = /\$\s?\d[\d,]*(?:\.\d{2})?/.exec(sentence.slice(Math.max(0, sentence.search(/\b(?:missed|lost|losing|off)\b/i))))?.[0];
  if (!period && !amount) return null;
  return { value: [amount?.replace(/\s/g, ""), period ? (amount ? `(${period})` : period) : null].filter(Boolean).join(" "), quote: sentence };
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
const EVIDENCE_WORDS = /\b(?:photos?|pictures?|screenshots?|texts?|text messages?|messages?|emails?|e-mails?|receipts?|invoices?|contracts?|agreements?|notes?|letters?|records?|reports?|videos?|recordings?|statements?|documents?|papers?|certificates?|bills?|estimates?|quotes?|cheques?|checks?|bank statements?|transcripts?|logs?|warranty|ticket|footage|proof|copies|copy)\b/i;
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

/** What the losses are made up of: lost pay, damaged property and the injury, each as said. */
export function lossesIn(story: string): StoryFact | null {
  const parts = [["Lost pay", lostPayIn(story)], ["Property", propertyIn(story)], ["Injury", injuryIn(story)]] as const;
  const said = parts.filter(([, fact]) => fact);
  if (!said.length) return null;
  return { value: said.map(([label, fact]) => `${label}: ${fact!.value}`).join("; "), quote: [...new Set(said.map(([, fact]) => fact!.quote))].join(" ") };
}

/** The story's dated sentences, in the order told: the person's own timeline. */
export function timelineIn(story: string): StoryFact | null {
  const dated = sentences(story).map((sentence) => sentence.trim()).filter((sentence) => dateMentionsIn(sentence).length > 0 && !/\?\s*$/.test(sentence));
  return dated.length ? { value: dated.join("\n"), quote: dated.join(" ") } : null;
}
