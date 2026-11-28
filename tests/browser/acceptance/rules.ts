/**
 * THE ACCEPTANCE SCRIPT'S RULES, PURE (site owner, 27 Nov 2026, item J): the doc's stories (read from
 * docs/acceptance/small-claims-journeys.md) and the rules applied to one screen's visible text. Used by the browser
 * script (small-claims-journeys.spec.ts) and checked without a browser by test:acceptance-rules.
 */
export type Journey = { id: string; name: string; city: string; start: string; story: string; stated: Record<string, string>; neverShown: string[]; notStillToAdd?: string[]; answers?: { outcome?: string; ownDetails?: boolean } };
export const DOC = "docs/acceptance/small-claims-journeys.md";

/** The stories, from the doc's own `json` blocks. */
export function journeysOf(markdown: string): Journey[] {
  return [...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1]) as Journey);
}

/** Strings no screen may show, for every story (the doc's rule (c)). The last seven are raw errors and internal names
 *  (site owner, 27 Nov 2026, item D): a timeout's own message must never reach the person. */
export const NEVER_SHOWN_ANYWHERE = ["Not given", " -- ", "signal timed out", "AbortError", "Error:", "undefined", "[object", "null", "elementStateMap",
  // Site owner, 27 Nov 2026 (after the baseline).
  "This card doesn't list", "Your next steps come after the summary", "Initial questions establish your situation"];
/** Strings no screen may show when nothing has been filed (the doc's rule (c); site owner, 27 Nov 2026). */
export const NEVER_SHOWN_NOTHING_FILED = ["Claim served", "Claim filed", "Suggested step"];
/** Rule (c)'s whole list for one story. */
export const neverShownFor = (journey: Journey) => [...NEVER_SHOWN_ANYWHERE, ...(journey.start === "nothing-filed" ? NEVER_SHOWN_NOTHING_FILED : []), ...journey.neverShown];

/** Rule (j): notices that may show at most once on a screen's body (the footer is not counted). */
export const ONE_NOTICE = ["not a law firm", "How AI is used here", "built by people who have represented themselves"];
export function noticeProblems(bodyWithoutFooter: string): string[] {
  const text = bodyWithoutFooter.toLowerCase();
  return ONE_NOTICE.flatMap((notice) => {
    const n = text.split(notice.toLowerCase()).length - 1;
    return n > 1 ? [`"${notice}" ${n} times`] : [];
  });
}

/** Rule (k): a question or an empty field that asks the person's own name, address, phone or email. */
export const OWN_DETAILS = /\byour (?:full |legal )?name\b|\byour (?:mailing |street |home )?address\b|\byour (?:phone|telephone)(?: number)?\b|\byour e-?mail\b|\(you\):\s*(?:first name|second name|last name|name|street|city|province|postal|phone|email)/i;

/** What a screen asks, without its "Why we ask" explanation (a script defect in the baseline: T5-01 read one as a question). */
export const askedPart = (question: string) => question.split(/Why we ask/i)[0].trim();

/** Rule (l): checklist items the story already covers are not "still to add". `checklist` is the whole Form 7A section's text. */
export function prefilledProblems(journey: Journey, stillToAdd: string[], checklist: string): string[] {
  return (journey.notStillToAdd ?? []).flatMap((item) => {
    const key = item.toLowerCase();
    if (!checklist.toLowerCase().includes(key)) return [`"${item}" is not on the checklist at all (renamed or missing: checked, not passed)`];
    return stillToAdd.some((row) => row.toLowerCase().includes(key)) ? [`"${item}" is listed as still to add`] : [];
  });
}

/** Rule (m): seconds from "Show my next step" to the overview. */
export const QUICK_SECONDS = 20;

/** Rule (c) on one screen: which forbidden strings it shows. A plain word ("null", "undefined") counts only as a whole
 *  word, so "annulled" is not "null"; the rest count anywhere. */
export function forbiddenOn(text: string, list: string[]): string[] {
  return list.filter((s) => (/^\w+$/.test(s) ? new RegExp(`\\b${s}\\b`).test(text) : text.includes(s)));
}
export const NOT_SURE = "I do not know yet";

/** Words that make a question ask a fact (rule (b)): the fact's question, in the words screens use. */
export const ASKS: Record<string, RegExp> = {
  amount: /\bhow much\b|\bamount\b|\$\s?\d/i,
  whenHappened: /\bwhen\b|\bwhat date\b|\bdate\b/i,
  // Asks WHO the other side is (a script defect in the baseline: T6-08 "Has the other party been formally served" is not that).
  otherParty: /\bwho (?:is|are|was|were|did)\b|\bname of\b|\bother (?:party|side|person)(?:'s| is called)\b|\bwho (?:you are|are you) (?:suing|claiming against)\b/i,
  wants: /\basking the court\b|\bwant the court\b|\boutcome\b|\bwhat do you want\b/i,
  servedDate: /\bwhen (?:were|was) (?:you|it|the claim|the papers)\b[^?]*\bserved\b|\b(?:date|day) (?:you were|of) serv|\bserved on what\b/i,
  contractPrice: /\bcontract (?:price|amount)\b|\bagreed price\b|\bhow much was the (?:contract|job|work|renovation)\b|\bprice (?:of|for) the (?:contract|job|work)\b/i,
  // Every fact a story states has its question words here (test:acceptance-rules fails on a stated fact without them).
  whatFor: /\bwhat (?:was|were) (?:the )?(?:work|job|service|repair|loan|money|damage) (?:for|about)?\b|\bwhat (?:did you|was it) (?:pay|paid|hire|lend|lent)\b|\bwhat is (?:the claim|it) (?:for|about)\b/i,
  paymentMethod: /\bhow did you (?:pay|send)\b|\bpayment method\b|\bhow (?:was it|were they) paid\b/i,
  workDone: /\bwas (?:the|any) work (?:done|started|finished)\b|\bhow much (?:of the )?work\b|\bdid they (?:start|finish|do)\b/i,
  demand: /\bdemand\b|\bdid you ask (?:them|him|her)\b|\bhave you (?:asked|contacted|told) (?:them|him|her)\b/i,
  interestCosts: /\binterest\b|\bcourt costs\b/i,
  relationship: /\brelationship\b|\bhow do you know\b/i,
  dueDate: /\bdue\b|\bpromised to (?:pay|repay)\b|\b(?:pay|repay)(?:ment)? (?:date|by)\b|\bwhen (?:was|were) (?:it|he|she|they) (?:to|supposed to) (?:pay|repay)\b/i,
  paidBack: /\b(?:paid|repaid) (?:anything|any of it|back|you)\b|\bpartial payment\b|\bhow much (?:has|have) (?:been )?(?:paid|repaid)\b/i,
  whatSaid: /\bwhat (?:did|was) (?:she|he|they|it) say\b|\bwhat (?:was|were) (?:the )?words?\b|\bwhat was said\b/i,
  howSaid: /\bhow (?:was it|did (?:she|he|they)) (?:said|say|publish|post|send|spread)\b|\btext message\b|\bin writing or\b/i,
  whoHeard: /\bwho (?:saw|heard|received|read|was told)\b|\bto whom\b/i,
  evidence: /\bwhat (?:evidence|proof|documents|records)\b|\bdo you have (?:any )?(?:proof|evidence|documents|records|screenshots|receipts|photos|pictures)\b/i,
  filed: /\bhave you (?:already )?filed\b|\bhas anything been filed\b|\banything filed\b|\bfiled (?:a|any|the) claim\b/i,
  filedWhere: /\bwhere (?:did you|was it|was the claim|have you) file/i,
  rightPlace: /\bwhich (?:court|courthouse|office|place)\b|\bwhere (?:should|will|do) you file\b/i,
  agreementInWriting: /\bin writing\b|\bwritten (?:contract|agreement)\b|\bsign(?:ed)? (?:a|the|any) (?:contract|agreement)\b/i,
  finishDate: /\bfinish (?:date|by)\b|\bcomplet(?:e|ed|ion) (?:date|by)\b|\bwhen (?:was|were) (?:it|they|the work) (?:to be|supposed to be) (?:done|finished)\b/i,
  paidUpFront: /\bhow much (?:did|have) you (?:already )?paid\b|\bamount (?:you )?(?:already )?paid\b|\bpaid (?:up front|so far|already)\b|\bdeposit\b/i,
};

export type Row = { step: string; screen: string; rule: string; pass: boolean; seen: string };

/** Sentences of 60+ characters and citations, each counted on one screen's text (rule (f)). */
export function duplicatesOn(text: string): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 60);
  const counts = new Map<string, number>();
  for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  for (const [sentence, n] of counts) if (n > 1) out.push(`${n}x sentence: "${sentence.slice(0, 120)}"`);
  const CITATION = /\bO\. Reg\. \d+\/\d+(?:,? r(?:ule)?s?\.? ?\d+(?:\.\d+)*(?:\s?\(\d+(?:\.\d+)?\))*)?|\b\d{4} (?:SCC|ONCA|ONSC) \d+\b|\b(?:R\.S\.O\.|S\.O\.) \d{4}, c\. [A-Z]?\.?\s?\d+(?:\.\d+)?|\bs(?:ection)?s?\. \d+(?:\.\d+)?(?:\s?\(\d+(?:\.\d+)?\))+(?: of the [A-Z][A-Za-z ,]+Act)?/g;
  const cites = new Map<string, number>();
  for (const cite of text.match(CITATION) ?? []) cites.set(cite, (cites.get(cite) ?? 0) + 1);
  for (const [cite, n] of cites) if (n > 1) out.push(`${n}x citation: ${cite}`);
  return out;
}

// The story's own words, written two ways the site writes them back: an amount with or without "$", commas or ".00",
// and a month by its first three letters ("sept 14 2025" is "September 14, 2025"). A script defect in the baseline
// (story 3: "$10,000.00" and "September 14, 2025" were flagged as not in the story).
const MONTH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?/g;
const norm = (value: string) => value.toLowerCase().replace(/[“”"‘’']/g, "").replace(/\$(\d{1,3}(?:,\d{3})+|\d+)(?:\.00)?\b|\b(\d{1,3}(?:,\d{3})+)(?:\.00)?\b|\b(\d+) dollars\b/g, (_m, a?: string, b?: string, c?: string) => `$${(a ?? b ?? c ?? "").replace(/,/g, "")}`).replace(MONTH, "$1").replace(/(\d),(?= \d{4})/g, "$1").replace(/\s+/g, " ").trim();
const STOP = new Set(["that", "this", "with", "from", "your", "have", "want", "they", "them", "their", "what", "were", "been", "back", "only", "will", "would", "about", "into", "also", "case"]);
const tokens = (value: string) => norm(value).split(/[^a-z0-9$,]+/).map((t) => t.replace(/,$/, "")).filter((t) => /\d/.test(t) || (t.length >= 4 && !STOP.has(t)));

/** Rule (g): what fails ("invented") and what passes as a paraphrase of a stated fact, on one screen. */
export function storyLabelSplit(text: string, story: string): { invented: string[]; paraphrase: string[] } {
  const invented: string[] = [];
  const paraphrase: string[] = [];
  const said = norm(story);
  const quotes = [...text.matchAll(/From your story(?: we found)?:\s*[“"]([^”"]+)[”"]/g)].map((match) => match[1]);
  for (const quote of quotes) if (!said.includes(norm(quote))) invented.push(`quote not in the story: "${quote.slice(0, 100)}"`);
  const block = text.match(/Confirmed from the story:\s*\n((?:\s*•[^\n]*\n?)+)/);
  if (block) for (const line of block[1].split("\n").map((l) => l.replace(/^\s*•\s*/, "").trim()).filter(Boolean)) {
    const label = line.includes(":") ? line.slice(0, line.indexOf(":")) : "";
    const value = line.includes(":") ? line.slice(line.indexOf(":") + 1) : line;
    const phrase = norm(value).replace(/[.!?]+$/, "");
    const shown = `"Confirmed from the story: ${line.slice(0, 100)}"`;
    // The person's own words: always fine.
    if (said.includes(phrase)) continue;
    // A goal, a kind of claim, or a question shown as a fact: the site's words, never the person's (site owner, 27 Nov).
    if (/asking the court|want|order|outcome/i.test(label)) {
      const stated = story.split(/(?<=[.!?])\s+/).find((sentence) => /\bI want\b|\bI(?:'m| am) asking\b/i.test(sentence));
      invented.push(stated ? `${shown}: the goal in the site's words, labelled as the story's (the story says "${stated.slice(0, 80)}")` : `${shown}: a goal the story never states`);
      continue;
    }
    if (/what it'?s about|kind of (?:claim|dispute)/i.test(label)) { invented.push(`${shown}: a kind of claim the story never states`); continue; }
    if (/\?\s*$/.test(value) || /^\s*in your own words\b/i.test(value) || /\?/.test(label)) { invented.push(`${shown}: a question shown as a fact`); continue; }
    // A paraphrase of a stated fact: every number, date and name in it is in a quote shown with it (or, with none
    // shown, a sentence of the story) that is itself in the story.
    const exact = (value.match(/\$?\d[\d,]*(?:\.\d+)?/g) ?? []).map(norm).concat((value.match(MONTH) ?? []).map((m) => m.toLowerCase().slice(0, 3)));
    const names = (value.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) ?? []).filter((n, i) => i > 0 || !/^(?:When|The|A|An|You|Your|He|She|They|It|Nothing|No|Not)$/.test(n)).map((n) => n.toLowerCase());
    const sources = [...quotes.filter((q) => said.includes(norm(q))), ...story.split(/(?<=[.!?])\s+/)].map(norm);
    const covered = (exact.length || names.length) && sources.some((source) => exact.every((t) => source.includes(t)) && names.every((n) => source.includes(n)));
    if (covered) paraphrase.push(`${shown}: a paraphrase; its numbers, dates and names are in the story`);
    else invented.push(`${shown}: the story never says "${phrase.slice(0, 80)}"`);
  }
  return { invented, paraphrase };
}

/** Rule (g): only what is invented fails; a paraphrase of a stated fact passes (storyLabelSplit). */
export function storyLabelProblems(text: string, story: string): string[] {
  return storyLabelSplit(text, story).invented;
}


/**
 * One saved screen (screens.json): what the live run read, kept so any rule change is re-checked offline
 * (reevaluate.ts) without the AI. `text` is the body's visible text, `bodyWithoutFooter` the same with the footer's
 * text taken out, `questions` what the screen asked, `emptyFields` the labels of empty boxes on it.
 */
export type SavedScreen = { step: string; screen: string; text: string; bodyWithoutFooter: string; questions: string[]; emptyFields: string[]; console: string[]; fieldValues?: string[]; flow?: string };

/** The rules applied to one screen's text: (c), (f), (g), (j), (b) on its questions, (e). Live and offline alike. */
export function screenRows(journey: Journey, saved: SavedScreen): Row[] {
  const row = (rule: string, problems: string[]): Row => ({ step: saved.step, screen: saved.screen, rule, pass: problems.length === 0, seen: problems.join("; ").slice(0, 600) || "ok" });
  const firstScreen = /-01$/.test(saved.step) || saved.screen === "Builder: start";
  const forbidden = [...neverShownFor(journey), ...(firstScreen ? NEVER_SHOWN_FIRST_SCREEN : []), ...(saved.flow === "v2" ? NEVER_SHOWN_NEW_FLOW : [])];
  const rows = [
    row("(c) never shown", forbiddenOn(saved.text, forbidden).map((s) => `shows "${s.trim()}"`)),
    row("(n) not answered yet", notAnsweredButAnswered(saved.text)),
    row("(o) question twice", questionTwice(saved.text)),
    row("(p) story once", storyTwice(journey.story, saved.text, saved.fieldValues)),
    row("(q) one control", doubleControls(saved.text)),
    row("(f) duplicates", duplicatesOn(saved.text)),
    row("(g) from your story", storyLabelProblems(saved.text, journey.story)),
    row("(j) one notice", noticeProblems(saved.bodyWithoutFooter)),
  ];
  // A Yes / No / I'm not sure card is a question too, wherever it shows (cardsOn: a script defect in the baseline read
  // the chat's cards as an empty list, so I1a and I1b were never checked).
  // A card is judged by its label (what it asks), not the value it offers ("Return of my $12,500 deposit" asks the outcome).
  const cards = cardsOn(saved.text);
  // A card's whole text passed as a question is the same card cardsOn reads: counted once (a script defect, 27 Nov).
  const asked = [...saved.questions.filter((q) => !BUTTON_LINE.test(q)).map(askedPart), ...cards].filter(Boolean);
  const asks = (q: string) => (cards.includes(q) ? q.split(": ")[0] : q);
  if (asked.length) rows.push(row("(b) never asked", asked.flatMap((q) => Object.entries(ASKS).filter(([fact, words]) => journey.stated[fact] && words.test(asks(q))).map(([fact]) => `asks ${fact} (the story says it): "${q.replace(/\s+/g, " ").slice(0, 140)}"`))));
  if (asked.length) rows.push(row("(a) once", askedTwice(ASKS, asked, asks)));
  rows.push(row("(e) console", saved.console));
  return rows;
}

/** Rule (i): an answer the person gave, and where it was given. */
export type Given = { what: string; value: string; where: "chat-yes" | "checklist-have" | "checklist-not" | "typed" | "own" };
/** Whether `text` shows `value`, read the way rule (g) reads the story (amounts and months written either way). */
export const shows = (text: string, value: string) => norm(text).includes(norm(value).replace(/[.!?]+$/, ""));
/** Rule (i) on one screen: every answer given before it is still shown there. */
export function keptProblems(given: Given[], text: string): string[] {
  // A button's own words are never an answer the person gave (a script defect, 27 Nov: "No, that's not right").
  return given.filter((answer) => answer.value && !BUTTON_ONLY.test(answer.value.trim()) && !shows(text, answer.value)).map((answer) => `"${answer.what}" (${answer.value.slice(0, 60)}) is not shown`);
}
/** The value a "from your story" row offers: the words after its label, without the buttons. */
export function offeredValue(row: string): { what: string; value: string } {
  const line = row.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !BUTTON_ONLY.test(l) && !/^From your story\b/i.test(l));
  const first = line[0] ?? "";
  const colon = first.indexOf(":");
  return colon > 0 ? { what: first.slice(0, colon).trim(), value: (first.slice(colon + 1).trim() || line[1] || "").trim() } : { what: first.slice(0, 60), value: line[1] ?? first };
}

/** Rule (k): what a later case in the same account asks of the person's own details, that the first case also asked. */
export function ownDetailsAgain(first: SavedScreen[], second: SavedScreen[]): string[] {
  const asks = (screens: SavedScreen[]) => [...new Set(screens.flatMap((s) => [...s.questions.map(askedPart), ...s.emptyFields]).filter((q) => OWN_DETAILS.test(q)).map((q) => q.replace(/\s+/g, " ").slice(0, 100)))];
  const before = asks(first);
  // Only what the first case asked counts as "again"; a detail first asked in the second case is not a repeat.
  return asks(second).filter((q) => before.some((b) => OWN_KIND(b) === OWN_KIND(q))).map((q) => `asks again: "${q}"`);
}
const OWN_KIND = (q: string) => (/mail/i.test(q) ? "email" : /phone/i.test(q) ? "phone" : /address|street|city|province|postal/i.test(q) ? "address" : /name/i.test(q) ? "name" : q);
export function ownDetailsAsked(screens: SavedScreen[]): string[] {
  return [...new Set(screens.flatMap((s) => [...s.questions.map(askedPart), ...s.emptyFields]).filter((q) => OWN_DETAILS.test(q)).map(OWN_KIND))];
}

/**
 * The Yes / No / I'm not sure cards on a screen, read from its visible text: each card's label and the value it offers
 * ("When it happened: January 2026"). The chat's cards (story-proposal-row) and any other card with those three buttons.
 */
export function cardsOn(text: string): string[] {
  const out: string[] = [];
  const BUTTONS = /\n\s*Yes\s*\n\s*No(?:, that's not right)?\s*\n\s*I'm not sure\b/g;
  let from = 0;
  for (const match of text.matchAll(BUTTONS)) {
    // A card's own story quote and the AI note sit around it; neither is the next card's label.
    const before = text.slice(from, match.index).split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !/^(?:From your story|Suggested by AI|AI suggestion|Here's what I understood|•|Confirmed from the story)/i.test(l));
    from = (match.index ?? 0) + match[0].length;
    const [label, value] = before.length >= 2 && !/[.:?]$/.test(before[before.length - 2]) ? [before[before.length - 2], before[before.length - 1]] : [before[before.length - 1] ?? "", ""];
    if (label) out.push(value ? `${label}: ${value}` : label);
  }
  return out;
}

/** Rule (c), first screen of each story (I2i): nothing has been entered, so nothing can have been saved yet. */
export const NEVER_SHOWN_FIRST_SCREEN = ["Intake saved to your account"];
/** Rule (c), the new Small Claims flow (I2k): the story is sent once, by itself. */
export const NEVER_SHOWN_NEW_FLOW = ["Send my story"];

/** Rule (a): a fact asked more than once on one screen (an empty box and a card for the same date, I1c). */
export function askedTwice(journeyAsks: Record<string, RegExp>, asked: string[], labelOf: (q: string) => string): string[] {
  const counts = new Map<string, string[]>();
  for (const q of asked) for (const [fact, words] of Object.entries(journeyAsks)) if (words.test(labelOf(q))) counts.set(fact, [...(counts.get(fact) ?? []), q]);
  return [...counts].filter(([, qs]) => qs.length > 1).map(([fact, qs]) => `${fact} asked ${qs.length} times: ${qs.map((q) => `"${q.replace(/\s+/g, " ").slice(0, 60)}"`).join(", ")}`);
}

/**
 * Rule (o): a question twice on one screen, whatever its length (I1c): the same normalised text ending in "?" twice; and a
 * fact shown as "not asked again" while the same screen asks it ("Kind of claim: … it is not asked again" above "What
 * kind of dispute is this?").
 */
export function questionTwice(text: string): string[] {
  const out: string[] = [];
  const asked = [...text.matchAll(/[^\n.!?]*\?/g)].map((m) => m[0].trim()).filter((q) => q.length > 3 && !/^Is this right\?$/i.test(q));
  const counts = new Map<string, number>();
  for (const q of asked) counts.set(norm(q), (counts.get(norm(q)) ?? 0) + 1);
  for (const [q, n] of counts) if (n > 1) out.push(`${n}x question: "${q.slice(0, 100)}"`);
  for (const line of text.split("\n")) {
    if (!/not asked again/i.test(line)) continue;
    const label = line.split(":")[0].trim();
    const key = label.split(/\s+/)[0]?.toLowerCase() ?? "";
    const word = key.length >= 4 && !["when", "what", "your", "this", "that"].includes(key) ? key : label.toLowerCase();
    if (label && asked.some((q) => q.toLowerCase().includes(word))) out.push(`"${label}" is shown as not asked again, and the screen asks it: "${asked.find((q) => q.toLowerCase().includes(word))!.slice(0, 80)}"`);
  }
  return out;
}

/** Rule (n): "Not answered yet" / "add it when you know" for a fact the same screen shows as answered (I2c). */
export function notAnsweredButAnswered(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/([A-Z][^\n:]{2,60}):?\s*\n?\s*(?:Not answered yet|[^\n]*add it when you know)/g)) {
    const label = match[1].trim();
    const at = match.index ?? 0;
    const rest = text.slice(0, at) + text.slice(at + match[0].length);
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // The label must start its line ("Amount" inside a sentence is not the fact shown as answered).
    const answered = new RegExp(`(?:^|\\n)[\\s•]*${escaped}\\s*:?\\s*\\n?\\s*(?!Not answered yet|Not sure|add it)([^\\n]{2,})`, "i").exec(rest);
    const near = /Answered:\s*[^\n]+/.exec(text.slice(at, at + 400));
    if (near) out.push(`"${label}: Not answered yet" next to "${near[0].slice(0, 60)}"`);
    // "I do not know yet" is not an answer: "Not answered yet" beside it is true.
    else if (answered && !/^\s*(?:Add it|Change|I do not know yet|I don't know|Not sure)\b/i.test(answered[1])) out.push(`"${label}: Not answered yet" while the screen shows "${label}: ${answered[1].trim().slice(0, 60)}"`);
  }
  return out;
}

/** Rule (p): the story's first sentence at most once on a screen, counting what is typed in boxes (I1f). */
export function storyTwice(story: string, text: string, fieldValues: string[] = []): string[] {
  const first = norm(story.split(/(?<=[.!?])\s/)[0] ?? story);
  if (first.length < 12) return [];
  const all = norm([text, ...fieldValues].join("\n"));
  const n = all.split(first).length - 1;
  return n > 1 ? [`the story's first sentence ${n} times ("${first.slice(0, 60)}")`] : [];
}

/** Rule (q): a card with an "Is this right? Yes" control has no separate "Not right" button too (I1j). */
export function doubleControls(text: string): string[] {
  return [...text.matchAll(/From your story we found:[\s\S]*?Yes, that's right/g)].filter((m) => /\n\s*Not right\s*\n/.test(m[0])).map((m) => `a card has "Yes, that's right" and "Not right": "${m[0].replace(/\s+/g, " ").slice(0, 90)}"`);
}

/** Rule (r): the labels of "Here is what we understood" (I2d), in order. */
export function understoodLabels(text: string): string[] {
  const block = text.split("Here is what we understood")[1]?.split(/This is our reading|What we still need to know/)[0] ?? "";
  return block.split("\n").map((l) => l.trim()).filter((l) => l.length > 2 && l === l.toUpperCase() && /[A-Z]/.test(l));
}

/** The card buttons' own words (never a question's label, never an answer the person gave). */
const BUTTON_ONLY = /^(?:Yes|No|No, that's not right|I'm not sure|Change|Yes, that's right|Not right)$/i;
/** A question's text that is a whole card (its buttons inside it). */
const BUTTON_LINE = /\bNo, that's not right\b|\nYes\n/;
