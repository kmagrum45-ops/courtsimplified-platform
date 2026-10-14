/**
 * Answers the person's own story already gives, with the words they came from
 * (2026-10-13). Used by the one-question-at-a-time chat to offer an answer
 * for one click ("From what you told us: ... Is that right?") instead of
 * asking for it cold. Each reader returns null unless the words say it
 * plainly; nothing here is ever applied without being shown.
 *
 * Widened 2026-10-13 (walkthrough, R2/V2): the chat asked "Are you suing
 * someone?" and "Who is the other side?" after "i want to sue the city", and
 * "What would you like to happen?" after "how do i get it lowered". Each
 * reader is checked against every walkthrough story, and against questions
 * and hypotheticals it must leave alone, by scripts/verification/verifyStoryAnswers.ts.
 *
 * Pure: no browser, no network, no model.
 */

export type StoryAnswer = { value: string; quote: string };

function sentences(story: string): string[] {
  return story
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/*
 * Words that make what follows a question, a doubt or a "what if" rather than
 * something the person says is so: "if someone sues me", "i dont know if i
 * want to sue", "should i sue", "what do i need".
 */
const HEDGE_BEFORE =
  /\b(?:if|whether|what|how|when|where|why|which|who|know|sure|wonder(?:ing)?|thinking (?:about|of)|think|believe|guess|suppose|assume|probably|considering|should|could|would|might|can|do|does|did|worried|afraid|scared|maybe|unless)\b[^,;]*$/i;

/** The clause the match sits in, up to the match: from the last comma, semicolon, "and", "but" or "so". */
function clauseBefore(sentence: string, index: number): string {
  const before = sentence.slice(0, index);
  const cut = Math.max(
    before.lastIndexOf(","),
    before.lastIndexOf(";"),
    ...[...before.matchAll(/\b(?:and|but|so|then|because|now)\b/gi)].map((match) => (match.index ?? 0) + match[0].length),
  );
  return before.slice(cut + 1);
}

/*
 * Words that turn what follows into something that did not happen, has not
 * happened yet, or is only reported: "i never got served", "i havent been
 * served yet", "i will be served", "they told me i was served", "i'd never
 * sue my boss" (review, 2026-10-13).
 */
const NOT_SO_BEFORE =
  /\b(?:not|never|no|dont|don't|didnt|didn't|havent|haven't|hasnt|hasn't|wont|won't|will|going to|gonna|i'd|isnt|isn't|wasnt|wasn't|arent|aren't|told me|said|says|heard|supposedly|apparently)\b/i;
/** After the words: "not me", "by me", "yet", "but i never got anything". */
const NOT_SO_AFTER =
  /^\s*yet\b|\b(?:not me|by me|never (?:got|received|saw) (?:it|them|anything|any(?: court)? papers|the papers)|did ?n'?t (?:get|receive) (?:it|them|anything|any(?: court)? papers|the papers)|did not (?:get|receive) (?:it|them|anything|any(?: court)? papers|the papers))\b/i;

/** The first place the pattern matches as something the person says is so, not asks or wonders. */
function plainMatch(sentence: string, pattern: RegExp): RegExpExecArray | null {
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of sentence.matchAll(global)) {
    const clause = clauseBefore(sentence, match.index ?? 0);
    if (HEDGE_BEFORE.test(clause)) continue;
    if (NOT_SO_BEFORE.test(clause)) continue;
    if (NOT_SO_AFTER.test(sentence.slice((match.index ?? 0) + match[0].length))) continue;
    // "can i sue him?": a question, whatever its words.
    if (/\?\s*$/.test(sentence) && /^\s*(?:can|could|should|would|will|do|does|did|is|are|am|was|were|have|has|had|what|how|when|who)\b/i.test(clause)) continue;
    return match as RegExpExecArray;
  }
  return null;
}

function firstPlain(story: string, pattern: RegExp): string | null {
  return sentences(story).find((sentence) => plainMatch(sentence, pattern)) ?? null;
}

const OTHER_PERSON = "(?:he|she|they|my (?:ex(?:[- ]?(?:wife|husband|gf|bf|girlfriend|boyfriend|partner))?|wife|husband|partner|spouse|former \\w+|old \\w+|\\w+'?s? (?:mom|mother|dad|father)|landlord|boss|employer|tenant)|the (?:other \\w+|plaintiff|applicant|landlord|city|company))";

/** They are the one being sued, or answering a case someone else started. */
const SUED_ME = new RegExp(
  [
    "\\bsu(?:ing|ed|es) me\\b",
    // "i got served", "i've been served", "we were served": the person is the one
    // served, never "he was served" or "my ex got served by me" (review, 2026-10-13).
    "\\b(?:i|we)(?:'ve|ve| have| had)?(?: just)?(?: (?:got|get|was|were|been|getting))+(?: just)? served\\b",
    "\\bi(?:'m| am|m) being (?:sued|served)\\b",
    "\\bserved me\\b",
    "\\btook me to court\\b",
    "\\btaking me to court\\b",
    "\\bstarted a (?:court |family )?case against me\\b",
    `\\b${OTHER_PERSON} (?:started|opened|filed|brought) (?:a |an )?(?:court |family )?(?:case|application|claim)\\b`,
    "\\b(?:filed|brought) (?:a |an )?(?:claim|case|application) against me\\b",
    "\\bi got served\\b",
    "\\bi (?:just )?(?:got|received) (?:a |the )?statement of claim\\b",
    "\\b(?:a )?process server (?:gave|handed|served|brought) me\\b",
    "\\b(?:gave|handed) me (?:the |some )?(?:court )?(?:papers|application|claim)\\b",
    "\\bi (?:filed|served|did) my (?:answer|statement of defen[cs]e|defen[cs]e)\\b",
  ].join("|"),
  "i",
);

/** They start the case (or have started it): a plain statement, so it wins over a want. */
const I_START = new RegExp(
  [
    "\\bi (?:want|need|would like|plan|am going|'m going|m going) to (?:sue|take (?:him|her|them|my \\w+(?: \\w+)?) to court|start a (?:court |family )?case|file (?:a |an )?(?:claim|application)|apply to (?:the )?court|apply for (?:a |an )?(?:divorce|custody|(?:child |spousal )?support|order|decision-making(?: responsibility)?|parenting(?: time)?))\\b",
    "\\bi(?:'m| am|m) suing\\b",
    "\\bim suing\\b",
    "\\bi sued\\b",
    "\\bi (?:filed|started|opened|brought) (?:a |an |my )?(?:court |family )?(?:claim|application|case)\\b",
  ].join("|"),
  "i",
);

/** Family: what only the person starting a case (or changing an order) asks the court for. */
const FAMILY_WANT_ORDER = new RegExp(
  [
    "\\bi (?:want|need|would like) (?:a |to get a |to get an )?(?:divorce|court order|order)\\b",
    "\\bi (?:want|need|would like) to get (?:\\w+ )?(?:support|custody|parenting time|access) ordered\\b",
    "\\bi (?:want|need|would like) (?:to get )?(?:something|help|protection|an order) from (?:the )?court\\b",
    "\\bhow (?:do|can|would) i (?:get|have) (?:it|my \\w+(?: \\w+)?|the \\w+(?: \\w+)?) (?:lowered|changed|reduced|varied|increased|stopped|cancelled|canceled)\\b",
    "\\bi (?:want|need|would like) to (?:lower|change|reduce|vary) (?:my|the|our) (?:\\w+ )?(?:support|order|payments?)\\b",
  ].join("|"),
  "i",
);

/** Civil: wanting money back from someone is wanting to be the one claiming it. */
const CIVIL_WANT_MONEY = /\bi (?:want|need|would like) (?:my money back|(?:him|her|them) to (?:pay|give)|to get (?:my money|paid|it) back|to be paid)\b/i;

/*
 * The role from three kinds of words: the person was sued or served (SUED_ME),
 * the person says they start the case (I_START), and, weakest, the person
 * says what they want the court to give them. Served wins over a want (a
 * served parent still says "i want joint custody"); served and starting
 * together say nothing for sure, so the question is asked.
 */
function roleFromStory(story: string, wants: RegExp, sides: { sued: string; starting: string }): StoryAnswer | null {
  const sued = firstPlain(story, SUED_ME);
  const starting = firstPlain(story, I_START);
  if (sued && starting) return null;
  if (sued) return { value: sides.sued, quote: sued };
  if (starting) return { value: sides.starting, quote: starting };
  const wanting = firstPlain(story, wants);
  return wanting ? { value: sides.starting, quote: wanting } : null;
}

/** Civil: "plaintiff" or "defendant", when the story says which plainly. */
export function civilRoleFromStory(story: string): StoryAnswer | null {
  return roleFromStory(story, CIVIL_WANT_MONEY, { sued: "defendant", starting: "plaintiff" });
}

/**
 * Family: "applicant" or "respondent", when the story says which plainly. A
 * person asking to change their own order is the one bringing it, which the
 * family form's "applicant" option ("I'm starting it (or I want to)") holds.
 */
export function familyRoleFromStory(story: string): StoryAnswer | null {
  return roleFromStory(story, FAMILY_WANT_ORDER, { sued: "respondent", starting: "applicant" });
}

const MONEY = /\$\s?\d[\d,]*(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+(?:\.\d+)?\s?k\b|\b\d{3,7}\s?dollars\b|\b(?:for|owe[sd]?|of|paid|lent|worth|costs?|claim(?:ing)?)\s+\$?\d{3,7}\b|\b\d{4,7}\b/gi;

/** The first amount of money the story names ("75,000", "$5,200", "for 68000"); never a year. */
export function amountFromStory(story: string): StoryAnswer | null {
  for (const sentence of sentences(story)) {
    // Every number in the sentence, not only the first: "in march 2025 i
    // sued them for 175000" has a year before the amount (2026-10-13).
    for (const match of sentence.matchAll(MONEY)) {
      const digits = match[0].replace(/[^\d.k]/gi, "");
      const number = /k$/i.test(digits) ? Number(digits.slice(0, -1)) * 1000 : Number(digits);
      if (!Number.isFinite(number) || number <= 0) continue;
      // "in 2022", "since 2019": a year, not money.
      if (number >= 1900 && number <= 2100 && !/[$,]|dollars/i.test(match[0])) continue;
      return { value: `$${number.toLocaleString("en-CA")}`, quote: sentence };
    }
  }
  return null;
}

const TYPOS: [RegExp, string][] = [
  [/\bbuisness\b/gi, "business"],
  [/\bbusness\b/gi, "business"],
  [/\bcontracter\b/gi, "contractor"],
  [/\blandord\b/gi, "landlord"],
  [/\bsuport\b/gi, "support"],
  [/\bcustidy\b/gi, "custody"],
];
const tidy = (text: string) => TYPOS.reduce((out, [typo, right]) => out.replace(typo, right), text);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const HARM = /\b(?:die|dead|death|kill|killing|murder|hurt|harm|suicide|end it|end it all|end my life|end things|beat (?:him|her|them)|shoot|stab|revenge|punch)\b/i;

/** What the person says they want ("i want my money back", "I want joint custody"). */
export function goalFromStory(story: string): StoryAnswer | null {
  const all = sentences(story);
  for (const sentence of all) {
    const want = plainMatch(sentence, /\bi (?:want|need|would like|am asking for|just want|only want)\b/i);
    if (want) {
      const value = sentence.slice(want.index).replace(/^i /i, "I ").replace(/[.!?]+$/, "").trim();
      // Never offered as something to put in court papers: harm to anyone
      // (the safety pass reads these words; this reader leaves them alone).
      if (HARM.test(value)) continue;
      // "no i want to": nothing after the verb is not a goal.
      if (/^I (?:want|need|would like|just want|only want|am asking for)(?: to)?$/i.test(value)) continue;
      // Answering or getting help is the step, not the outcome; "apply" only for a court order.
      if (/^I (?:want|need|would like|just want|only want) (?:nothing|to (?:answer|respond|reply|help|defend|fight)\b|to apply\b(?! (?:to (?:the )?court|for (?:a |an )?(?:divorce|custody|(?:child |spousal )?support|order))))/i.test(value)) continue;
      // "I want to sue the city" is how, not what they want ordered; "I need
      // a lawyer" or "I need to know" is help with the case, not an outcome.
      if (/^I (?:want|need|would like|just want) to (?:sue|take|file|start|know|understand|ask|bring|do|figure|find|go|see|talk|speak|get advice|get help|learn)\b/i.test(value)) continue;
      if (/^I (?:want|need|would like|just want) (?:a lawyer|help|advice|some help|some advice|information|info)\b/i.test(value)) continue;
      if (value.length >= 8) return { value, quote: sentence };
    }
    // "how do i get it lowered": what they want, said as a question about how.
    const how = /\bhow (?:do|can|would) i (?:get|have) (it|my \w+(?: \w+)?|the \w+(?: \w+)?) (lowered|changed|reduced|varied|increased|stopped|cancelled|canceled|back)\b/i.exec(sentence);
    if (how) {
      let thing = how[1].toLowerCase();
      if (thing === "it") {
        // "it" is what the earlier sentences are about, when they name one thing.
        const before = all.slice(0, all.indexOf(sentence) + 1).join(" ");
        const named = /\b(child support|spousal support|support|court order|order|payments?)\b/i.exec(before);
        if (!named) continue;
        thing = `the ${named[1].toLowerCase()}`;
      }
      return { value: tidy(`To get ${thing} ${how[2].toLowerCase()}`), quote: sentence };
    }
  }
  return null;
}

/** The children, when the story says how old they are. */
export function childrenFromStory(story: string): StoryAnswer | null {
  const AGE = "(?:\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)";
  // "on september 29" is a day of the month, not an age (2026-10-13).
  const NOT_A_DAY = `(?<!${MONTH_WORD}\\s)(?<!${MONTH_WORD}\\s\\d)`;
  const pattern = new RegExp(
    `\\b(?:daughters?|sons?|kids?|children|child|baby|boys?|girls?)\\b[^.]{0,30}?\\b(?:is|are|aged|age)?\\s*${NOT_A_DAY}${AGE}\\b(?!\\s*(?:years?|yrs?)\\s+ago)(?!\\s*(?:st|nd|rd|th)\\b)|\\b${AGE}[- ](?:year|yr)s?[- ]old\\b`,
    "i",
  );
  const sentence = sentences(story).find((candidate) => pattern.test(candidate)) ?? null;
  return sentence ? { value: sentence, quote: sentence } : null;
}

/*
 * The children the story names without their ages (walkthrough run
 * 38525903567, FR: "custody of our daugter" was followed by "Tell us about
 * the children: how many, how old, and who they live with now"). What the
 * words give -- how many and which -- is filled in for the person to check,
 * and only the rest is asked. Only the person's own children ("our", "my"),
 * never someone else's ("her daughter from before", "my sister's son"), never
 * a negation ("we have no kids"), and never with an age given: then
 * childrenFromStory offers the whole sentence instead.
 */
const COUNT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6 };
const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six"];
const OWN_CHILD = new RegExp(
  "\\b(?:our|my)\\s+(?:(one|two|three|four|five|six|[1-6])\\s+)?(?:(?:little|baby|young|youngest|oldest|eldest|only)\\s+)?" +
    "(daughters?|daugh?ters?|daugters?|sons?|kids?|children|childs?|boys?|girls?)\\b(?!\\s*friend)(?!['’]s\\b)" +
    // "my son from my first marriage", "her daughter from before": a child of another relationship (review of 70b717b).
    "(?!\\s+(?:of|from)\\s+(?:her|his|their|before|(?:my |a |an |her |his |our )?(?:first|last|previous|old|former|other|another|earlier|past|prior)\\b))",
  "i",
);

export type PartialStoryAnswer = { prefill: string; question: string; quote: string };

/** Every kind of child the story names ("our daughter and my son": two kinds). */
const CHILD_KINDS: [string, RegExp][] = [
  ["daughter", /\bdaugh?t?ers?\b|\bdaugters?\b/i],
  ["son", /\bsons?\b/i],
  ["child", /\b(?:kids?|children|child)\b/i],
  ["boy", /\bboys?\b(?!\s*friend)/i],
  ["girl", /\bgirls?\b(?!\s*friend)/i],
];

export function childrenPartialFromStory(story: string): PartialStoryAnswer | null {
  if (childrenFromStory(story)) return null;
  // More than one kind of child named: not filled in, the whole question is asked (review of 70b717b).
  if (CHILD_KINDS.filter(([, pattern]) => pattern.test(story)).length > 1) return null;
  for (const sentence of sentences(story)) {
    if (/\b(?:no|not any|don'?t have any|never had)\s+(?:kids|children)\b/i.test(sentence)) return null;
    const match = plainMatch(sentence, OWN_CHILD);
    if (!match) continue;
    // "my sister's son": the possessive is someone else's.
    if (/\b\w+['’]s\s*$/.test(sentence.slice(0, match.index ?? 0)) && !/\b(?:our|my)\s*$/i.test(sentence.slice(0, match.index ?? 0))) continue;
    const noun = match[2].toLowerCase();
    const plural = noun === "children" || /s$/.test(noun);
    const count = match[1] ? COUNT_WORDS[match[1].toLowerCase()] : plural ? null : 1;
    const kind = /^daug/.test(noun) ? "daughter" : /^son/.test(noun) ? "son" : /^boy/.test(noun) ? "boy" : /^girl/.test(noun) ? "girl" : "child";
    // "me and my boy" is not plainly a child of the case: boy or girl only with a count ("our two girls").
    if ((kind === "boy" || kind === "girl") && !match[1]) return null;
    if (count === 1) {
      const pronoun = kind === "daughter" || kind === "girl" ? "she" : kind === "son" || kind === "boy" ? "he" : "they";
      const question = pronoun === "they" ? "How old are they, and who do they live with now?" : `How old is ${pronoun}, and who does ${pronoun} live with now?`;
      return { prefill: `One ${kind}. `, question, quote: sentence };
    }
    if (count && count > 1) {
      const plural = kind === "child" ? "children" : `${kind}s`;
      return { prefill: `${NUMBER_WORDS[count].charAt(0).toUpperCase()}${NUMBER_WORDS[count].slice(1)} ${plural}. `, question: "How old are they, and who do they live with now?", quote: sentence };
    }
    // "our kids": how many is not given, so the whole question is asked.
    return null;
  }
  return null;
}

/*
 * Who the other side is, civil (2026-10-13). Only a named kind of person or
 * business, or a capitalised name, in words that make them the other side:
 * "sue the city", "my old boss sued me", "a statement of claim from my old
 * business partner", "i hired a contractor". Never a guess from who else
 * the story mentions.
 */
const PARTY_NOUN =
  "(?:city|town|township|municipality|region|province|landlord|tenant|contractor|contracter|sub-?contractor|builder|renovator|plumber|electrician|roofer|mechanic|dealer(?:ship)?|garage|business partner|buisness partner|partner|supplier|vendor|boss|employer|manager|company|corporation|brokerage|store|shop|restaurant|bank|insurer|insurance company|seller|sellers|vendors|buyer|buyers|neighbou?r|client|customer|roommate|school|hospital|clinic|condo corporation|condo board|property manager|moving company|trucking company|airline)";
const PARTY_PHRASE = `(?:the|my|a|an|our|his|her|their)\\s+(?:(?:old|former|ex|previous|own|new|local|next door)\\s+)?(?:[a-z]+\\s+)?${PARTY_NOUN}\\b`;
const NAME = "[A-Z][a-zA-Z'&.-]+(?:\\s+(?:[A-Z][a-zA-Z'&.-]+|Inc\\.?|Ltd\\.?|Corp\\.?))*";

const CITIES: Record<string, string> = {
  toronto: "City of Toronto", ottawa: "City of Ottawa", mississauga: "City of Mississauga", brampton: "City of Brampton",
  hamilton: "City of Hamilton", london: "City of London", markham: "City of Markham", vaughan: "City of Vaughan",
  kitchener: "City of Kitchener", windsor: "City of Windsor", burlington: "City of Burlington", oshawa: "City of Oshawa",
  barrie: "City of Barrie", "st catharines": "City of St. Catharines", "st. catharines": "City of St. Catharines",
  cambridge: "City of Cambridge", kingston: "City of Kingston", guelph: "City of Guelph", waterloo: "City of Waterloo",
  pickering: "City of Pickering", "niagara falls": "City of Niagara Falls", sarnia: "City of Sarnia",
  peterborough: "City of Peterborough", "north bay": "City of North Bay", "sault ste marie": "City of Sault Ste. Marie",
  belleville: "City of Belleville", brantford: "City of Brantford", cornwall: "City of Cornwall", timmins: "City of Timmins",
  "thunder bay": "City of Thunder Bay",
};

function partyValue(phrase: string, story: string): string {
  const words = tidy(phrase.trim().replace(/\s+/g, " "));
  // "the city", with one city named in the story: that city.
  if (/^(?:the|a)\s+city$/i.test(words)) {
    const named = Object.keys(CITIES).filter((city) => new RegExp(`\\b${city.replace(/\./g, "\\.")}\\b`, "i").test(story));
    if (named.length === 1) return CITIES[named[0]];
    return "The city";
  }
  return capital(words);
}

const WHEN = "(?:\\s+(?:in|on|last|this)\\s+\\w+(?:\\s+\\d{1,2})?)?";
const PARTY_TEMPLATES: ((target: string) => string)[] = [
  // "i want to sue the city", "im suing my former business partner", "i sued
  // the trucking company": the person is the one suing (review, 2026-10-13:
  // "the city sued my neighbour" named the neighbour).
  (target) => `\\b[Ii](?:'m|m| am)?(?: (?:want|need|would like|plan|am going|'m going|m going|have|decided) to| will| also| just)? (?:sue|suing|sued|make a claim against|start a claim against|file a claim against)\\s+(${target})`,
  // "i want to take my landlord to court": take only with "to court".
  (target) => `\\b[Ii](?:'m|m| am)?(?: (?:want|need|would like|plan|am going|'m going|m going|have|decided) to| will)? (?:take|taking|took) (${target}) to (?:court|small claims(?: court)?)\\b`,
  // "my old boss sued me", "the landlord is suing me", "John Smith took me to court"
  (target) => `(${target})\\s+(?:sued|is suing|are suing|has sued|took|is taking|started a (?:court )?case against|filed a claim against|served) me\\b`,
  // "a statement of claim in august from a supplier"
  (target) => `\\b(?:claim|papers|statement of claim|letter|lawsuit|demand)${WHEN}\\s+from\\s+(${target})`,
  // "i hired a contractor", "i paid a roofer"
  (target) => `\\b[Ii] (?:hired|paid|rented from|bought (?:it |a \\w+ )?from|lent money to|loaned money to)\\s+(${target})`,
];
/*
 * Each pattern twice: a kind of party in any case ("the city", "My landlord"),
 * and a name only in capitals ("John Smith"), so "now my old boss" is never
 * read as a name.
 */
const PARTY_PATTERNS: RegExp[] = PARTY_TEMPLATES.flatMap((template) => [
  new RegExp(template(PARTY_PHRASE), "gi"),
  new RegExp(template(NAME), "g"),
]);

/** Civil: who the other side is, when the story names them as the other side. */
export function otherPartyFromStory(story: string): StoryAnswer | null {
  for (const pattern of PARTY_PATTERNS) {
    for (const sentence of sentences(story)) {
      const match = plainMatch(sentence, pattern);
      if (!match) continue;
      // "Yesterday Bob sued me", "Last Tuesday Mark Lee": the words before the name are not it.
      const phrase = match[1].replace(LEAD_WORDS, "");
      if (!phrase) continue;
      // "He sued me", "Then the city": a pronoun or a sentence's first word is not a name.
      const kind = new RegExp(`^${PARTY_PHRASE}$`, "i").test(phrase);
      if (!kind && (/^(?:I|My|The|A|An|He|She|They|We|It|Then|Now|So|And|But|This|That|Someone|Somebody|Everyone|Nobody)\b/.test(phrase) || MONTH_NAMES.test(phrase))) continue;
      return { value: partyValue(phrase, story), quote: sentence };
    }
  }
  return null;
}

const LEAD_WORDS =
  /^(?:(?:yesterday|today|tonight|tomorrow|last|next|this|in|on|then|now|so|ok|okay|and|but|also|recently|later|after|before|when|once|early|late|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|week|month|year|morning|night)\s+)+/i;

const MONTH_NAMES = /^(?:january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|ontario|canada)\b/i;

/**
 * Family: the other person's name, only when the story gives one ("my ex,
 * Sarah Jones,", "my husband Mark"). The question asks for a name, so "my ex
 * gf" is not an answer to it.
 */
const NOT_A_NAME =
  /^(?:I|Is|He|She|They|We|The|A|An|My|His|Her|It|Was|Has|Had|And|But|So|Then|Now|Divorce|Custody|Support|Court|Police|Lawyer|Judge|Mom|Dad|Ontario|Canada)\b/;

export function otherPartyNameFromStory(story: string): StoryAnswer | null {
  // Only "my ex, Sarah Jones," / "my husband Mark." (a name set off and closed
  // by a comma or the end) or "named / called / 's name is" (review,
  // 2026-10-13: "my husband Is abusive" gave "Is"). The other parent of a
  // child only: "my mom's dad" is not the other side.
  const relation = "[Mm]y (?:ex(?:[- ]?(?:wife|husband|gf|bf|girlfriend|boyfriend|partner))?|wife|husband|partner|spouse|common[- ]law (?:wife|husband|partner)|(?:sons?|daughters?|kids?|child|children|baby|boy|girl)'?s? (?:mom|mother|dad|father))";
  const person = "([A-Z][a-z'-]+(?: [A-Z][a-z'-]+){0,2})";
  const patterns = [
    new RegExp(`\\b${relation}(?:'s name is|\\s+(?:is )?named|\\s+(?:is )?called)\\s+${person}\\b`),
    new RegExp(`\\b${relation},?\\s+${person}(?=\\s*(?:,|\\.|;|$))`),
  ];
  for (const sentence of sentences(story)) {
    for (const pattern of patterns) {
      const match = pattern.exec(sentence);
      if (!match) continue;
      const name = match[1].trim();
      if (NOT_A_NAME.test(name) || MONTH_NAMES.test(name) || Object.keys(CITIES).includes(name.toLowerCase())) continue;
      return { value: name, quote: sentence };
    }
  }
  return null;
}

const MONTH_WORD = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
// "march 2 weeks ago" is not March 2 (review, 2026-10-13).
const SERVED_DATE = new RegExp(`\\b(${MONTH_WORD})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\s*(?:weeks?|days?|months?|years?|hours?|wks?|yrs?)\\b)(?:,?\\s+(\\d{4}))?\\b|\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b`, "gi");
// The person is the one served (review, 2026-10-13: "he was served on may 5"
// and "i served my ex on september 3" were offered as their own service date).
const SERVED_WORDS =
  /\b(?:(?:i|we)(?:'ve|ve| have| had)?(?: just)?(?: (?:got|was|were|been))+(?: just)? served|served me|(?:a )?process server (?:gave|handed|served|brought) me|(?:gave|handed) me (?:the |some )?(?:court )?(?:papers|application|claim)|i (?:just )?(?:got|received) (?:the |a |some )?(?:court )?(?:papers|application|statement of claim))\b/i;
/** Words of a different moment: between the served words and a date, the date is that moment's. */
const OTHER_MOMENT =
  /\b(?:filed|issued|hearing|conference|trial|mediation|scheduled|court date|motion date|questioning|discovery|moved|separated|married|split|bought|sold|signed|born|happened|rented|hired|started|ended|fired|paid|lent|closed|died|turns?)\b/i;

/** A real calendar day: no June 31, May 99 or 2026-09-31. */
function realDay(month: number, day: number, year?: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  // Without a year, 2024 (a leap year) keeps February 29 possible.
  const last = new Date(Date.UTC(year ?? 2024, month, 0)).getUTCDate();
  return day <= last;
}
const HOW_SERVED = /\b(?:in person|by (?:registered )?mail|by email|by courier|by a process server|at my (?:house|home|door|work|office))\b/i;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/**
 * The day the person was served, when the story gives one in the same words
 * ("i was served on september 20", "on september 29 a process server gave me
 * court papers"). "Last week" is not a usable date and gives nothing; a date
 * without a year is offered as written, never with a year added.
 */
export function servedDateFromStory(story: string): StoryAnswer | null {
  for (const sentence of sentences(story)) {
    // The served words plainMatch accepted, not merely the first ones.
    const served = plainMatch(sentence, SERVED_WORDS);
    if (!served) continue;
    const servedAt = served.index ?? 0;
    let best: { text: string; distance: number } | null = null;
    for (const match of sentence.matchAll(SERVED_DATE)) {
      const at = match.index ?? 0;
      const end = at + match[0].length;
      const between = at > servedAt ? sentence.slice(servedAt + served[0].length, at) : sentence.slice(end, servedAt);
      if (OTHER_MOMENT.test(between)) continue;
      // "the house we bought on june 3": the words just before the date name its moment.
      if (OTHER_MOMENT.test(clauseBefore(sentence, at).slice(-40))) continue;
      const month = match[1] ? MONTHS.findIndex((name) => name.startsWith(match[1].toLowerCase().slice(0, 3))) + 1 : Number(match[5]);
      const day = Number(match[1] ? match[2] : match[6]);
      const year = match[1] ? (match[3] ? Number(match[3]) : undefined) : Number(match[4]);
      if (!realDay(month, day, year)) continue;
      if (at < servedAt) {
        // "we separated on march 3 2024 and i got served last week": a date
        // whose clause closes with "and" before the served words is that
        // clause's, and so is one inside "the hearing is on november 20".
        if (/^[\s,.]*(?:and|then|but|later|so)\b/i.test(between)) continue;
        if (OTHER_MOMENT.test(clauseBefore(sentence, at))) continue;
      }
      const text = match[1]
        ? `${capital(MONTHS.find((month) => month.startsWith(match[1].toLowerCase().slice(0, 3))) ?? match[1])} ${Number(match[2])}${match[3] ? `, ${match[3]}` : ""}`
        : `${match[4]}-${match[5].padStart(2, "0")}-${match[6].padStart(2, "0")}`;
      const distance = Math.abs(at - servedAt);
      if (!best || distance < best.distance) best = { text, distance };
    }
    if (!best) continue;
    const how = HOW_SERVED.exec(sentence);
    return { value: how ? `${best.text}, ${how[0].toLowerCase()}` : best.text, quote: sentence };
  }
  return null;
}

/*
 * What has been filed or served, from the person's own words (walkthrough
 * 2026-10-13, FR/SW): after "i got served the papers last week" the chat
 * asked "Has anything been filed with the court or given to you yet?".
 * Each value is one of the form's own options, offered only for a plain
 * statement (plainMatch: never a question, a doubt, a negation, someone
 * else served, or "i served my ex"). The person confirms it or answers
 * themselves; nothing is applied unseen.
 */
/*
 * The family reader is for a family case only (review 2026-10-13): the other
 * side is the person's ex, spouse or the child's other parent -- never "the
 * landlord filed an application at the ltb", "the company filed an
 * application against my friend".
 */
const FAMILY_PERSON =
  "(?:he|she|my (?:ex(?:[- ]?(?:wife|husband|gf|bf|girlfriend|boyfriend|partner|spouse))?|wife|husband|partner|spouse|common[- ]law (?:wife|husband|partner)|(?:sons?|daughters?|kids?|child|children|baby)'?s? (?:mom|mother|dad|father))|the other parent|the (?:child'?s|kids'?|children'?s) (?:mom|mother|dad|father))";
const FAMILY_STARTED = new RegExp(
  [
    "\\btook me to court\\b",
    "\\btaking me to court\\b",
    "\\bstarted a (?:court |family )?case against me\\b",
    `\\b${FAMILY_PERSON} (?:started|opened|filed|brought) (?:a |an )?(?:court |family )?(?:case|application)\\b`,
    `\\b${FAMILY_PERSON} filed for (?:divorce|custody|support|child support|spousal support)\\b`,
    "\\b(?:filed|brought) (?:a |an )?(?:case|application) against me\\b",
  ].join("|"),
  "i",
);
/** Not a family court case: a tribunal, an eviction, someone else's case. */
const NOT_FAMILY_COURT =
  /\b(?:ltb|lrb|board|tribunal|hrto|evict\w*|jury|summons|complaint|statement of claim|plaintiff'?s? claim|plaintifs claim|small claims)\b|\bagainst my (?!self\b)\w+|\bby (?:the|a|my) (?:bank|company|city|landlord|employer|boss|contractor|business|store|insurer)\b/i;
/** A court paper named after the served words: "the papers", "an application", "divorce papers". */
const COURT_PAPER = /\b(?:papers?|application|claim|documents?|court|divorce|custody|support|motion|forms?)\b/i;
/** Only when, after the served words: "last week", "yesterday", "on october 2". */
const ONLY_WHEN = /^[\s,]*(?:(?:last|this|on|in|yesterday|today|a few|two|three|four|\d+|about|around|just|already|at home|at my (?:house|home|door))\b[^.!?]*)?[.!]?\s*$/i;

/** The sentence saying the person was served with family papers, or the other parent started a case. */
function familyApplicationQuote(story: string): string | null {
  for (const sentence of sentences(story)) {
    if (NOT_FAMILY_COURT.test(sentence)) continue;
    if (plainMatch(sentence, FAMILY_STARTED)) return sentence;
    const served = plainMatch(sentence, SERVED_WORDS);
    if (!served) continue;
    const after = sentence.slice((served.index ?? 0) + served[0].length);
    // "i received the papers from my lawyer" is their own lawyer's copy, not service.
    if (/\bfrom (?:my|our) (?:own )?(?:lawyer|paralegal|legal aid|duty counsel)\b/i.test(sentence)) continue;
    // Served with what: a court paper named in the words themselves or right
    // after them, or nothing but when ("i got served last week").
    if (COURT_PAPER.test(served[0]) || COURT_PAPER.test(after.slice(0, 60)) || ONLY_WHEN.test(after)) return sentence;
  }
  return null;
}

const FAMILY_ANSWER_FILED = /\bi (?:filed|served|did|sent in|submitted) my (?:answer|response)\b/i;
const CIVIL_CLAIM_RECEIVED =
  /\b(?:(?:i|we)(?:'ve|ve| have| had)?(?: just)?(?: (?:got|get|was|were|been|getting))+(?: just)?(?: served)?(?: with)? (?:a |the |his |her |their )?statement of claim|served me (?:with )?(?:a |the )?statement of claim|i (?:just )?received (?:a |the )?statement of claim)\b/i;
/*
 * "Nothing filed yet" only when the story says the person wants to start a
 * case and says nothing at all about any paper, filing, service, court date
 * or letter: "i want to sue the city". "i sued", "im suing", or a story that
 * mentions a claim, letter, notice or order gives nothing (the person says).
 */
const WANT_TO_START = /\bi (?:want|need|would like|plan|am going|'m going|m going) to (?:sue|take (?:him|her|them|my \w+(?: \w+)?|the \w+(?: \w+)?) to court|start a (?:court |family )?case|file (?:a |an )?(?:claim|application)|apply to (?:the )?court)\b/i;
/*
 * Any word of a paper or a legal process, outside the "i want to sue" words
 * (review 2026-10-13: "we were in court last year", "the court already
 * dismissed my first case", "my ex already has a case open", "we were at the
 * ltb", "there's a cas file open", "he sent me a demand", "change the custody
 * arrangement from 2022"). Any one of them, and "nothing filed" is not offered.
 */
const ANY_PAPER =
  /\b(?:filed|filing|files?|served|serve|issued|papers?|claims?|statement|application|answer|defen[cs]e|notice|letter|orders?|judg(?:e)?ment|judge|hearing|court|cases?|dismissed|tribunal|board|ltb|lrb|hrto|cas|children'?s aid|demand|arrangement|change|changed|agreement|conference|motion|mediation|lawyer|paralegal|summons|police|charged|forms?|sued|suing|started|court file)\b/i;

type FiledAnswer = { value: string[]; quote: string };

const TRAILING_DOUBT = /\b(?:i think|i guess|i believe|i suppose|not sure|maybe|probably|i'?m not certain)\b/i;

function filedFromStory(story: string, court: "family" | "civil"): FiledAnswer | null {
  const values: string[] = [];
  const quotes: string[] = [];
  const add = (value: string, quote: string | null) => {
    // A question or a doubt anywhere in the sentence is not a statement:
    // "i filed my answer late? not sure", "i got served i think".
    if (!quote || /\?/.test(quote) || TRAILING_DOUBT.test(quote)) return;
    values.push(value);
    if (!quotes.includes(quote)) quotes.push(quote);
  };
  if (court === "family") {
    add("application", familyApplicationQuote(story));
    add("answer", firstPlain(story, FAMILY_ANSWER_FILED));
  } else {
    add("statement-claim", firstPlain(story, CIVIL_CLAIM_RECEIVED));
  }
  if (values.length) return { value: values, quote: quotes.join(" ") };
  const wanting = firstPlain(story, WANT_TO_START);
  // "i want to sue him? or should i wait": a question is not a statement.
  if (!wanting || /\?/.test(wanting)) return null;
  // Any other word about papers, once the "i want to sue" words are taken out.
  const rest = story.replace(new RegExp(WANT_TO_START.source, "gi"), " ");
  if (ANY_PAPER.test(rest) || /\bi(?:'m| am|m)? (?:sued|suing)\b|\bim suing\b/i.test(rest)) return null;
  return { value: ["nothing"], quote: wanting };
}

/**
 * Family: the filed-documents options the story gives ("application" for
 * "i got served the papers", "answer" for "i filed my answer", "nothing"
 * for "i want to apply to the court" with no paper mentioned at all).
 * Null when the story does not say.
 */
export function familyFiledFromStory(story: string): FiledAnswer | null {
  return filedFromStory(story, "family");
}

/** Civil: "statement-claim" for "i got served a statement of claim", "nothing" for "i want to sue the city". */
export function civilFiledFromStory(story: string): FiledAnswer | null {
  return filedFromStory(story, "civil");
}
