/**
 * THE SHARED BEHAVIOURS AND WHERE EACH MAY BE WRITTEN (the guard, test:shared-behaviour).
 *
 * Each behaviour below has one module. Anywhere else in app/ or src/, a pattern
 * that re-implements it fails CI -- like the story-data registry and the storage
 * lint rule -- so a second copy cannot come back unnoticed (the #469-#471 re-tests
 * kept finding a bug fixed in one copy alive in another).
 *
 * `allowed` lists the only exceptions, each with why it is not a copy. An
 * exception that no longer matches anything fails too, so the list stays true.
 * Later steps add their behaviours here (Yes/No, amounts, side, story change,
 * evidence).
 */
export type Allowed = { file: string; contains: string; why: string };
export type Behaviour = {
  name: string;
  /** The one module that implements it. */
  module: string;
  /** Source patterns that mean "this file implements it again". Matched with comments removed. */
  forbidden: { pattern: RegExp; means: string }[];
  allowed: Allowed[];
};

export const BEHAVIOURS: Behaviour[] = [
  {
    name: "splitting text into sentences",
    module: "src/lib/case-system/sentences.ts",
    forbidden: [
      { pattern: /\(\?<=\[\.!\?/, means: "a sentence split on . ! ?" },
      { pattern: /split\(\s*\/\[\.!\?\]/, means: "a sentence split on . ! ?" },
      { pattern: /\b(?:ltd\|inc|Ltd", "Inc|"Inc", "Ltd)/i, means: "an abbreviation list for sentence ends" },
      // Step 1 reviewer: copies the first patterns missed.
      { pattern: /\bs\|ss\|r[|a-z]*\)\\.\$|\^\(s\|ss\|r/, means: "an abbreviation list for sentence ends" },
      { pattern: /\[\^\.!\?\]/, means: "text read up to the first . ! or ? instead of the end of its sentence" },
      { pattern: /split\(\s*\/\[\.;/, means: "a clause cut at the first full stop" },
      { pattern: /lastIndexOf\("\."\)|indexOf\("\.",/, means: "a sentence start or end found by the nearest full stop" },
    ],
    allowed: [
      { file: "app/builder/_components/childSupportPrefill.ts", contains: "\\\\b${CHILD}\\\\b[^.!?]{0,20}?", why: "a 20-character window between a child's word and their age, inside one sentence; matches, never quotes or cuts text" },
      { file: "app/builder/_components/childSupportPrefill.ts", contains: "\\b(?:lives?|living|stays?|staying|resides?|residing)\\b[^.!?]{0,40}\\bwith\\b", why: "a 40-character window between \"lives\" and \"with\"; matches, never quotes or cuts text" },
      { file: "app/builder/_components/storyAnswers.ts", contains: "const ONLY_WHEN = ", why: "ONLY_WHEN: tells a phrase that is only a time apart from a fact; a match window, not a sentence end" },
      { file: "src/lib/case-workspace/fileValidation.ts", contains: "name.lastIndexOf(\".\")", why: "a file name's extension, not a sentence" },
    ],
  },
  {
    name: "reading a date and asking for the year",
    module: "src/lib/case-system/dates.ts",
    forbidden: [
      { pattern: /jan\(\?:uary\)|jan\(uary\)|\bjanuary\|february|\bjan\|feb\b|"january",\s*"february"|"jan",\s*"feb"/i, means: "a list of month names" },
      { pattern: /\\d\{4\}-\\d\{1,2\}-\\d\{1,2\}|\\d\{1,2\}\[\/-\]\\d\{1,2\}/, means: "a date pattern" },
      { pattern: /getFullYear\(\)\s*[-+]\s*1\b/, means: "a year worked out for a date written without one" },
      { pattern: /yesterday\|today|monday\|tuesday/i, means: "a list of relative-date or weekday words" },
      { pattern: /\\d\{1,2\}\(\?:st\|nd\|rd\|th\)/, means: "an ordinal day (\"6th\")" },
      { pattern: /\b(?:needsYear|asksForDate)\(/, means: "a date box built from the parts instead of dateAnswerCheck" },
      // Step 1 reviewer: copies the first patterns missed.
      { pattern: /\\d\{4\}-\\d\{2\}-\\d\{2\}\$/, means: "a date checked for its shape only (\"2026-02-30\" passes); use isRealIsoDate" },
      { pattern: /\bDate\.parse\(/, means: "a date read by the JavaScript parser, which accepts impossible and partial dates" },
      { pattern: /timeZone:\s*"America\/Toronto"/, means: "today in Ontario worked out again; use todayInOntario" },
    ],
    allowed: [
      { file: "app/builder/_components/storyAnswers.ts", contains: "^(?:(?:yesterday|today|tonight|tomorrow|last|next|this|in|on|then|now|so", why: "LEAD_WORDS: words stripped from the front of a name (\"Yesterday Sam\"); reads names, not dates, and takes its month and weekday names from dates.ts" },
      { file: "app/builder/_components/storyAnswers.ts", contains: "const ONLY_WHEN = ", why: "ONLY_WHEN: tells a phrase that is only a time apart from a fact; reads which words are a fact, not a date" },
      { file: "src/lib/canlii/canliiServer.ts", contains: "Date.parse(data.fetched_at)", why: "a timestamp this site stored, not anything a person wrote" },
      { file: "src/lib/case-system/authority-intelligence/authorityRetrievalEngine.ts", contains: "Date.parse(value)", why: "a stored verification timestamp, not anything a person wrote" },
      { file: "src/lib/case-system/authority-intelligence/betaProcedureAuthority.ts", contains: "Date.parse(value)", why: "a stored checked-on timestamp, not anything a person wrote" },
      { file: "src/lib/case-system/drafts/caseDrafts.ts", contains: "Date.parse(input.createdAt)", why: "a draft's stored creation timestamp, not anything a person wrote" },
      { file: "src/lib/case-system/sources/statutoryProvisions.ts", contains: "Date.parse(`${provision.pendingReplacement.lastChecked}", why: "a source's last-checked date in this site's own data" },
    ],
  },
];
