/**
 * Every entry point reads a date the same way (step 1, gate A: the same-behaviour check).
 *
 * What it checks: at least 40 real-world phrasings ("Oct 6", "6 Oct 2026", "2026-10-06",
 * "last Tuesday", "10/06/2026", "Feb 30, 2026", "6 octobre 2026" ...) are fed,
 * unchanged, through every place that reads a date the person typed or wrote:
 *   - the date boxes: the civil and Family questions one at a time, the review
 *     panel's questions and served-date box, and the Small Claims questions one
 *     at a time (all through dateAnswerCheck) -- asked for the year, the date, or
 *     the month in words, or kept;
 *   - what is counted from: the deadline engine (parseUserDate), on the results
 *     and case pages;
 *   - what is offered from the person's words: the story's dates (storyHintsForDates),
 *     the Small Claims guided answers (suggestedDatesFromAnswers), the case
 *     reader (datesFromPicture), the date in a quoted sentence (dateInSentence),
 *     Family's served date (servedDateFromStory), the review's "when it happened"
 *     (suggestInitialAnswers), the proposal card (dayOf), the Small Claims form's
 *     timeline (extractNarrativePrefill);
 *   - the chat (extractDateSignals) and every "is a date mentioned" check (mentionsDate).
 * Each must give the reading the table expects, and all must agree with each other:
 * one counted date, the same two years offered for a date with no year, never a
 * year added. Then each place the independent reviewer found (gate D) is held to
 * the same rule: the case reader, AI-drafted answers, Family's quote, the prefill,
 * one real-date check and one Ontario day.
 *
 * Failure it exists to catch: the #469-#471 re-tests, where "October 6" was asked
 * for its year in Family but not civil or Small Claims, guessed on the results page,
 * dropped by the Small Claims questions and missed by the chat.
 *
 * Run: npm run test:date-entry-points
 */
import { dateAnswerCheck, yearChoices, ADD_THE_YEAR, GIVE_THE_DATE, MONTH_IN_WORDS, mentionsDate, isRealIsoDate, todayInOntario, ONE_DATE, dateMentionsIn } from "../../src/lib/case-system/dates";
import { validateStoryProposals } from "../../src/lib/case-system/intake/storyAnswerProposals";
import { existingFamilyOrderQuote } from "../../src/lib/case-system/familyStoryReading";
import { parseUserDate } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { storyHintsForDates, suggestedDatesFromAnswers, dateInSentence } from "../../src/lib/case-system/casePosition";
import { datesFromPicture, validateCasePicture } from "../../src/lib/case-system/intake/caseReader";
import { servedDateFromStory } from "../../app/builder/_components/storyAnswers";
import { suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";
import { dayOf } from "../../app/builder/_components/proposalCard";
import { extractNarrativePrefill } from "../../src/lib/case-system/intelligence/narrativePrefill";
import { extractDateSignals } from "../../src/lib/case-system/guided-assistant/conversationIntelligenceEngine";
import { answerNeedsMore } from "../../app/builder/_components/GuidedFormChat";
import { sentences } from "../../src/lib/case-system/sentences";
import { civilGuidedFields, familyGuidedFields, CIVIL_DOCUMENT_OPTIONS, CIVIL_ISSUE_OPTIONS, FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS } from "../../app/builder/_components/guidedFields";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) { console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); failures += 1; }
};

type Kind = "full" | "noYear" | "numericNoYear" | "numeric" | "relative" | "impossible" | "monthYear" | "year" | "monthOnly" | "none";
// [phrasing, what it is, its date when full, month and day when written without a year]
const ROWS: [string, Kind, string?, [number, number]?][] = [
  ["Oct 6", "noYear", undefined, [10, 6]],
  ["October 6", "noYear", undefined, [10, 6]],
  ["oct 6", "noYear", undefined, [10, 6]],
  ["October 6th", "noYear", undefined, [10, 6]],
  ["6 Oct", "noYear", undefined, [10, 6]],
  ["6th of October", "noYear", undefined, [10, 6]],
  ["Sept 30", "noYear", undefined, [9, 30]],
  ["Dec 25", "noYear", undefined, [12, 25]],
  ["May 5", "noYear", undefined, [5, 5]],
  ["6 Oct 2026", "full", "2026-10-06"],
  ["October 6, 2026", "full", "2026-10-06"],
  ["Oct. 6, 2026", "full", "2026-10-06"],
  ["October 6th, 2026", "full", "2026-10-06"],
  ["the 6th of October 2026", "full", "2026-10-06"],
  ["OCTOBER 6, 2026", "full", "2026-10-06"],
  ["Oct 6 2026", "full", "2026-10-06"],
  ["2026-10-06", "full", "2026-10-06"],
  ["2026-4-3", "full", "2026-04-03"],
  ["30 September 2026", "full", "2026-09-30"],
  ["January 1st, 2027", "full", "2027-01-01"],
  ["1 Jan 2027", "full", "2027-01-01"],
  ["Feb 29, 2028", "full", "2028-02-29"],
  ["6 octobre 2026", "full", "2026-10-06"],
  ["Feb 30, 2026", "impossible"],
  ["31 June 2026", "impossible"],
  ["10/06/2026", "numeric"],
  ["17/04/2026", "numeric"],
  ["6-10-2026", "numeric"],
  ["17-04-2026", "numeric"],
  ["2026-02-30", "impossible"],
  ["31/02/2026", "impossible"],
  ["10/06", "numericNoYear"],
  ["October 2026", "monthYear"],
  ["in May 2026", "monthYear"],
  ["fall 2026", "year"],
  ["2026", "year"],
  ["last Tuesday", "relative"],
  ["yesterday", "relative"],
  ["two weeks ago", "relative"],
  ["on Monday", "relative"],
  ["next Friday", "relative"],
  ["tomorrow", "relative"],
  ["a few days ago", "relative"],
  ["March 3 weeks ago", "relative"],
  ["early March", "monthOnly"],
  ["it may be", "none"],
  ["about $6,000", "none"],
  ["I paid 2000 dollars", "none"],
  ["it cost $2026", "none"],
  ["I don't know", "none"],
];

const NOW = new Date("2026-10-23T12:00:00");
const ASK: Record<Kind, string | null> = { full: null, noYear: ADD_THE_YEAR, numericNoYear: ADD_THE_YEAR, numeric: MONTH_IN_WORDS, relative: GIVE_THE_DATE, impossible: GIVE_THE_DATE, monthYear: null, year: null, monthOnly: null, none: null };
const civilServed = civilGuidedFields({ issues: CIVIL_ISSUE_OPTIONS, documents: CIVIL_DOCUMENT_OPTIONS }).find((field) => field.key === "serviceDetails")!;
const familyServed = familyGuidedFields({ issues: FAMILY_ISSUE_OPTIONS, filed: FAMILY_FILED_OPTIONS }).find((field) => field.key === "servedDate")!;
const SC_DATE_QUESTION = "Roughly when did the situation that led to this claim happen?";

let rows = 0;
for (const [phrase, kind, iso, dayMonth] of ROWS) {
  rows += 1;
  const at = `"${phrase}" (${kind})`;
  // 1. Every date box: the same question asked, or kept.
  const boxes: [string, string | null][] = [
    ["civil questions (served)", answerNeedsMore(civilServed, phrase)],
    ["Family questions (served)", answerNeedsMore(familyServed, phrase)],
    ["review panel question / Small Claims questions (a date question)", dateAnswerCheck(SC_DATE_QUESTION, phrase, { dateQuestion: true })],
    ["review panel served-date box", dateAnswerCheck("Day you were served", phrase, { dateQuestion: true })],
  ];
  for (const [where, got] of boxes) check(`${at}: ${where} asks ${JSON.stringify(ASK[kind])}`, got === ASK[kind], `got ${JSON.stringify(got)}`);

  // 2. What is counted from: only a full date in words or ISO.
  const counted = parseUserDate(phrase);
  check(`${at}: the deadline engine counts ${iso ?? "nothing"}`, counted === (kind === "full" ? iso ?? null : null), `got ${counted}`);

  // 3. What is offered from the person's words: the full date, or the nearer of the two years (asked, never counted).
  const offerExpected = kind === "full" ? { value: iso!, yearAssumed: false } : kind === "noYear" ? { value: yearChoices(dayMonth![0], dayMonth![1], { now: NOW })[0], yearAssumed: true } : null;
  const fromAnswer = suggestedDatesFromAnswers([{ questionId: "sc-date-claim-served", answerText: phrase }], NOW)["sc-date-claim-served"];
  check(`${at}: the Small Claims guided answer offers ${JSON.stringify(offerExpected)}`, JSON.stringify(fromAnswer ? { value: fromAnswer.value, yearAssumed: Boolean(fromAnswer.yearAssumed) } : null) === JSON.stringify(offerExpected), JSON.stringify(fromAnswer ?? null));
  const story = `I was served with the plaintiff's claim on ${phrase}.`;
  const hint = storyHintsForDates(story, NOW)["sc-date-claim-served"];
  check(`${at}: the story's date (results and case pages) offers the same`, JSON.stringify(hint?.value ? { value: hint.value, yearAssumed: Boolean(hint.yearAssumed) } : null) === JSON.stringify(offerExpected), JSON.stringify(hint ?? null));
  if (dayMonth && kind === "noYear") {
    const picture = datesFromPicture({ dates: [{ questionId: "sc-date-claim-served", month: dayMonth[0], day: dayMonth[1], quote: phrase }] } as never, NOW)["sc-date-claim-served"];
    check(`${at}: the case reader offers the same two years, nearest first`, picture?.value === offerExpected?.value && picture?.yearAssumed === true, JSON.stringify(picture ?? null));
  }
  const inSentence = dateInSentence(`The hearing is on ${phrase}.`);
  check(`${at}: the date in a quoted sentence counts ${kind === "full" ? iso : "nothing"}`, (inSentence?.iso ?? null) === (kind === "full" ? iso : null), JSON.stringify(inSentence));
  check(`${at}: the proposal card reads the same day`, dayOf(phrase) === (kind === "full" ? iso : null), String(dayOf(phrase)));

  // 4. Family's served date: offered as written, with the year only when written.
  const served = servedDateFromStory(`I was served on ${phrase}.`);
  const offersServed = kind === "full" || kind === "noYear";
  check(`${at}: Family's served date is ${offersServed ? "offered" : "not offered"}`, Boolean(served) === offersServed, JSON.stringify(served));
  if (served && kind === "noYear") check(`${at}: Family's served date adds no year`, !/\d{4}/.test(served.value), served.value);

  // 5. The review's "when it happened": a full date, or a month and year; never a day with a guessed year.
  const when = suggestInitialAnswers({ courtPath: "small-claims", sections: { story: { text: `It happened on ${phrase}. They never paid.` } } } as never)["sc-orient-when-happened"];
  const whenExpected = kind === "full" ? iso : kind === "monthYear" ? phrase.replace(/^in /, "").replace(/^(\w)/, (c) => c.toUpperCase()) : undefined;
  check(`${at}: the review's "when it happened" offers ${whenExpected ?? "nothing"}`, when === whenExpected, String(when));

  // 6. The Small Claims form's timeline: only full dates.
  const timeline = extractNarrativePrefill({ narrative: `The work stopped on ${phrase}.`, courtPath: "small-claims" }).facts.find((fact) => fact.field === "timeline");
  check(`${at}: the Small Claims form's timeline ${kind === "full" ? "has" : "has no"} date`, Boolean(timeline) === (kind === "full"), JSON.stringify(timeline ?? null));

  // 7. The chat, and every "is a date mentioned" check.
  const mentioned = kind !== "none";
  check(`${at}: a date is ${mentioned ? "" : "not "}mentioned`, mentionsDate(phrase) === mentioned);
  const chatSees = mentioned;
  check(`${at}: the chat ${chatSees ? "sees" : "does not see"} a date`, (extractDateSignals(phrase).length > 0) === chatSees, JSON.stringify(extractDateSignals(phrase)));
}

// The one sentence splitter, on the words that cut sentences short before (#463, #471 re-tests).
const SENTENCES: [string, string[]][] = [
  ["I paid Test Roofing Ltd. $9,000 for the roof. They never came back.", ["I paid Test Roofing Ltd. $9,000 for the roof.", "They never came back."]],
  ["I want Test Builder Inc. to finish the work. Nothing happened.", ["I want Test Builder Inc. to finish the work.", "Nothing happened."]],
  ["I was served on Oct. 6, 2026. I have a defence.", ["I was served on Oct. 6, 2026.", "I have a defence."]],
  ["Rule 14.05 and s. 24 (1) apply. Read R. v. Jordan, para. 12.", ["Rule 14.05 and s. 24 (1) apply.", "Read R. v. Jordan, para. 12."]],
  ["It was paid in Oct. Then it stopped.", ["It was paid in Oct.", "Then it stopped."]],
  ["Dr. Lee wrote a report!\nIt says I can't work?", ["Dr. Lee wrote a report!", "It says I can't work?"]],
  // The readability gate caught these: "’s." is not "s.", and "Part V." is not "v.".
  ["You book your own appointment and the respondent’s. Serve notice with it.", ["You book your own appointment and the respondent’s.", "Serve notice with it."]],
  ["It applies to the Family Law Act, except Part V. It also applies to others.", ["It applies to the Family Law Act, except Part V.", "It also applies to others."]],
  ["I asked Sam's. Then I left.", ["I asked Sam's.", "Then I left."]],
  // The reviewer's second pass: a line break always ends a sentence; a company ending continues only into a small word, a number or an amount; a full month name ends one.
  ["I live at 12 Main St.\nHe served me.", ["I live at 12 Main St.", "He served me."]],
  ["I sued Bob Co. He lost.", ["I sued Bob Co.", "He lost."]],
  ["It started in March. 2 days later it stopped.", ["It started in March.", "2 days later it stopped."]],
  ["I want Test Builder Inc. to finish. Then pay.", ["I want Test Builder Inc. to finish.", "Then pay."]],
  ["The days are not counted (r. 3 (2)). Read R. v. Jordan.", ["The days are not counted (r. 3 (2)).", "Read R. v. Jordan."]],
];
for (const [text, expected] of SENTENCES) {
  const got = sentences(text);
  check(`sentences: ${JSON.stringify(text)}`, JSON.stringify(got) === JSON.stringify(expected), JSON.stringify(got));
}
const ltdQuote = storyHintsForDates("I was served by Test Roofing Ltd. on October 6, 2026. I disagree.", NOW)["sc-date-claim-served"];
check("the story's date is quoted from the whole sentence, past \"Ltd.\"", ltdQuote?.quote === "I was served by Test Roofing Ltd. on October 6, 2026." && ltdQuote.value === "2026-10-06", JSON.stringify(ltdQuote));

// Gate D (the independent reviewer, step 1): each place it found, held to the same rule.
{
  // The case reader: the model's month and day must be a date the person wrote, in words or ISO.
  const read = (quote: string, month: number, day: number, year?: number) =>
    validateCasePicture({ dates: [{ questionId: "sc-date-claim-served", month, day, year, quote }] }, `Synthetic story. ${quote} The end.`).dates[0] ?? null;
  check("case reader: an all-numbers date is not settled by the model", read("I was served on 10/06/2026", 10, 6, 2026) === null && read("I was served on 10/06/2026", 6, 10, 2026) === null);
  check("case reader: a day that does not exist is not offered", read("I was served on February 30 2026", 2, 30, 2026) === null);
  check("case reader: a day the person never wrote is not read from an amount", read("In October 2026 I paid $6", 10, 6, 2026) === null);
  check("case reader: a full date written is offered with its year", read("I was served on October 6, 2026", 10, 6, 2026)?.date === "2026-10-06");
  check("case reader: a date without a year keeps no year, even if the model gives one", (() => { const got = read("I was served on October 6", 10, 6, 2026); return got !== null && got.date === null; })());

  // AI-drafted answers: the same year rule, and a full date only as the person wrote it.
  const question = { id: "sc-date-claim-served", courtArea: "small-claims", text: "When were you served with the claim?", answerType: "text" } as never;
  const story = "I was served with the claim on Oct 6. I paid $9,000 on October 1, 2026.";
  const propose = (answer: string, storyQuote: string) => validateStoryProposals({ proposals: [{ questionId: "sc-date-claim-served", answer, storyQuote }] }, story, [question]).length === 1;
  check("drafted answer: a year the person did not write is not offered", !propose("October 6, 2026", "served with the claim on Oct 6"));
  check("drafted answer: a date without its year is not offered (the question asks)", !propose("Oct 6", "served with the claim on Oct 6"));
  check("drafted answer: a full date the person wrote is offered", propose("October 1, 2026", "I paid $9,000 on October 1, 2026"));

  // Family's quote and the prefill run to the end of the sentence.
  check("Family: the existing-order quote is the whole sentence, past \"Dr.\"", existingFamilyOrderQuote("My lawyer is Dr. Patel and there is a court order for support. We split up.") === "My lawyer is Dr. Patel and there is a court order for support.");
  const prefill = (narrative: string, field: string) => extractNarrativePrefill({ narrative, courtPath: "small-claims" }).facts.find((fact) => fact.field === field)?.value;
  check("prefill: the goal is not cut at \"Ltd.\"", prefill("I want Test Builder Ltd. to refund me. They refused.", "goal") === "Test Builder Ltd. to refund me", String(prefill("I want Test Builder Ltd. to refund me. They refused.", "goal")));
  check("prefill: a breakdown keeps its cents", String(prefill("The damages are made up of $1,250.75 for repairs. That is all.", "damagesBreakdown")).includes("$1,250.75"));

  // What a date box keeps is what is counted (the reviewer's second pass): an answer the
  // box accepts either gives the one date the deadline engine counts, or holds no day at all.
  const ASKED: [string, string][] = [
    ["served Oct 6, hearing is October 20, 2026", ONE_DATE],
    ["October 20, 2026 and last Tuesday", ONE_DATE],
    ["10/06/2026 or October 7, 2026", ONE_DATE],
    ["02/30/26", GIVE_THE_DATE], ["31/02/26", GIVE_THE_DATE], ["2026/10/06", GIVE_THE_DATE], ["20261006", GIVE_THE_DATE], ["2026-10-06T00:00", GIVE_THE_DATE],
    ["sept 31", GIVE_THE_DATE], ["the 6th", GIVE_THE_DATE], ["on the 6th", GIVE_THE_DATE], ["6-Oct-2026", GIVE_THE_DATE], ["Oct-6-2026", GIVE_THE_DATE],
    ["17-04-26", MONTH_IN_WORDS],
  ];
  for (const [answer, ask] of ASKED) {
    const got = dateAnswerCheck("What day were you served?", answer, { oneDate: true });
    check(`date box: ${JSON.stringify(answer)} asks ${JSON.stringify(ask)}`, got === ask, `got ${JSON.stringify(got)}`);
  }
  for (const answer of [...ROWS.map(([phrase]) => phrase), ...ASKED.map(([answer]) => answer), "October 6, 2026 in person", "I was served on October 6, 2026"]) {
    const kept = dateAnswerCheck("What day were you served?", answer, { oneDate: true }) === null;
    const counted = parseUserDate(answer) !== null;
    const hasDay = /\d/.test(answer) && (dateMentionsIn(answer).length > 0 || /\b\d{1,2}(?:st|nd|rd|th)?\b/.test(answer.replace(/\b(?:19|20)\d{2}\b|\$[\d,]+/g, "")));
    check(`date box keeps only what is counted: ${JSON.stringify(answer)}`, !kept || counted || !hasDay, `kept ${kept}, counted ${counted}`);
  }
  // A box that only asks roughly when, counted from nowhere, may name two full dates (the story pack's
  // Small Claims "Roughly when did it happen?"); the year rule still holds there.
  const ROUGHLY = "Roughly when did the situation that led to this claim happen?";
  check("roughly-when box: two full dates are kept as words", dateAnswerCheck(ROUGHLY, "I lent it on March 3, 2026 and it was due June 1, 2026.") === null);
  check("roughly-when box: a date without its year is still asked", dateAnswerCheck(ROUGHLY, "I lent it on March 3 and it was due June 1, 2026.") === ADD_THE_YEAR);
  check("roughly-when box: a month and year is kept", dateAnswerCheck(ROUGHLY, "in January 2026") === null);
  check("the deadline count never counts two dates", parseUserDate("I lent it on March 3, 2026 and it was due June 1, 2026.") === null);

  // One real-date check, one Ontario day.
  check("a date that does not exist is not a date", !isRealIsoDate("2026-02-30") && isRealIsoDate("2028-02-29") && !isRealIsoDate("2026-2-3"));
  check("today is Ontario's day: 03:30 UTC on Jan 1 is still Dec 31 in Toronto", todayInOntario(new Date("2027-01-01T03:30:00Z")) === "2026-12-31");
  check("the years offered count from Ontario's day", yearChoices(12, 31, { now: new Date("2027-01-01T03:30:00Z") })[0] === "2026-12-31");
}

if (failures) { console.log(`${failures} check(s) failed across ${rows} phrasings.`); process.exit(1); }
console.log(`PASS date entry points: ${rows} phrasings read the same way at every entry point`);
