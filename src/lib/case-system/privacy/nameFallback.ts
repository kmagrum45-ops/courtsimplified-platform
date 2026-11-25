/**
 * THE CONSERVATIVE NAME FALLBACK (site owner, 25 Nov 2026: "behind the pattern-based name hiding, add a conservative
 * fallback: any capitalised two-word sequence not on an allowlist (courts, places, months, legal terms) is hidden before
 * text goes to the AI").
 *
 * The pattern-based reader (app/builder/_components/storyAnswers.ts STORY_NAME_PATTERNS) finds a name by the words
 * around it ("my friend Alex", "Jordan Testowner says"), and a name written in a way no pattern knows goes to the model
 * as typed. This runs after it, on the same words: every run of two or more capitalised words ("Quorra Blissett",
 * "Fakebuild Contracting") is hidden unless one of its words is on the allowlist below. It errs towards hiding: a
 * business, a product or a street name may be hidden too (the false positives across the story pack are listed by
 * scripts/privacy/nameFallbackReport.ts); a hidden word is put back in whatever the model answers, so the person never
 * sees a label.
 *
 * Pure: no AI, no network. Checked by test:story-names-never-sent (a name no pattern knows is hidden on every AI route;
 * nothing on the allowlist is hidden).
 */

import { MONTH_NAMES_PATTERN, WEEKDAY_NAMES_PATTERN } from "../dates";

/** Words that make a capitalised run not a person's name. Lower case; matched whole, one word at a time. */
export const FALLBACK_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  "courts and tribunals": [
    "court", "courts", "small", "claims", "superior", "divisional", "family", "appeal", "appeals", "supreme", "tribunal", "tribunals",
    "board", "landlord", "tenant", "human", "rights", "labour", "relations", "registrar", "clerk", "judge", "justice", "justices",
    "master", "associate", "deputy", "enforcement", "office", "registry", "courthouse",
  ],
  "legal terms": [
    "plaintiff", "plaintiffs", "defendant", "defendants", "applicant", "applicants", "respondent", "respondents", "claim", "statement",
    "defence", "defense", "reply", "motion", "order", "orders", "notice", "affidavit", "form", "forms", "act", "acts", "rules", "rule",
    "regulation", "regulations", "schedule", "section", "subsection", "legal", "aid", "law", "laws", "society", "lawyer", "paralegal",
    "police", "crown", "attorney", "general", "service", "services", "limitations", "construction", "residential", "tenancies",
    "divorce", "evidence", "interest", "children's", "child", "support", "guidelines", "settlement", "conference", "trial", "hearing",
    "judgment", "judgement", "default", "garnishment", "writ", "seizure", "sale", "lien", "liens", "parenting", "custody", "access",
    "equalization", "property", "spousal", "marriage", "contract", "agreement", "invoice", "receipt", "demand", "letter", "exhibit",
  ],
  "places": [
    "ontario", "canada", "canadian", "quebec", "québec", "manitoba", "saskatchewan", "alberta", "british", "columbia", "nova",
    "scotia", "new", "brunswick", "prince", "edward", "island", "newfoundland", "labrador", "yukon", "nunavut", "northwest",
    "territories", "toronto", "ottawa", "mississauga", "brampton", "hamilton", "london", "markham", "vaughan", "kitchener",
    "windsor", "burlington", "oshawa", "barrie", "catharines", "cambridge", "kingston", "guelph", "waterloo", "pickering",
    "niagara", "falls", "sarnia", "peterborough", "north", "south", "east", "west", "bay", "sault", "ste", "marie", "sudbury",
    "thunder", "gatineau", "montreal", "montréal", "vancouver", "calgary", "edmonton", "winnipeg", "halifax", "gta", "region",
    "county", "city", "town", "township", "village", "street", "road", "avenue", "drive", "crescent", "boulevard", "lane", "way",
    "place", "square", "park", "highway", "parkway", "trail", "united", "states", "usa", "america", "americas",
  ],
  // The month and weekday names are dates.ts's own (the one place a month list may live: test:shared-behaviour).
  "months and days": [
    ...MONTH_NAMES_PATTERN.split("|"), ...WEEKDAY_NAMES_PATTERN.split("|"),
    "christmas", "easter", "thanksgiving", "boxing", "day", "year", "eve", "holiday",
  ],
  "titles": ["mr", "mrs", "ms", "miss", "mx", "dr", "sir", "madam", "honourable", "hon"],
  "words that start a sentence": [
    "i", "in", "on", "at", "by", "for", "from", "to", "of", "with", "after", "before", "during", "since", "until", "when", "while",
    "if", "as", "the", "a", "an", "my", "our", "your", "their", "his", "her", "its", "this", "that", "these", "those", "there", "here",
    "then", "now", "so", "but", "and", "or", "yes", "no", "please", "also", "last", "next", "every", "each", "some", "all", "both",
    "we", "he", "she", "they", "it", "you", "me", "us", "them", "what", "who", "which", "where", "why", "how", "today", "yesterday",
    "tomorrow", "dear", "hi", "hello", "thanks", "thank", "ok", "okay", "because", "although", "however", "meanwhile", "finally",
    "first", "second", "third", "not", "never", "always", "just", "still", "only", "even", "about", "around", "over", "under",
    "into", "out", "up", "down", "is", "was", "are", "were", "has", "had", "have", "did", "do", "does", "can", "could", "will",
    "would", "should", "may", "might", "must", "let", "got", "went", "paid", "sent", "said", "told", "asked", "lent", "hired",
  ],
};

const ALLOWED = new Set(Object.values(FALLBACK_ALLOWLIST).flat());

/** A capitalised word: an upper-case letter then lower-case letters (apostrophes and hyphens inside). Not all capitals. */
const WORD = "\\p{Lu}\\p{Ll}+(?:[-'’]\\p{L}+)*";
/** Two or more capitalised words in a row, separated by single spaces. */
const RUN = new RegExp(`(?<![\\p{L}\\p{N}])${WORD}(?:\\s${WORD})+(?![\\p{L}\\p{N}])`, "gu");

/** A word is allowed when it, or it without a trailing possessive, is on the allowlist. */
export function allowedWord(word: string): boolean {
  const plain = word.toLowerCase().replace(/[’']s$/, "");
  return ALLOWED.has(plain) || ALLOWED.has(word.toLowerCase());
}

/**
 * Every stretch of two or more capitalised words with none of them on the allowlist, each once, longest first (so "Mary
 * Ann Quill" is hidden whole, before any part of it). A run is split at its allowed words: in "Then Quorra Blissett
 * took", "Then" is allowed and "Quorra Blissett" is still hidden; "Superior Court" and "Ottawa Ontario" leave nothing.
 */
export function fallbackNames(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(RUN)) {
    let stretch: string[] = [];
    const keep = () => { if (stretch.length >= 2) found.add(stretch.join(" ").replace(/[’']s$/, "")); stretch = []; };
    for (const word of match[0].split(/\s/)) {
      if (allowedWord(word)) keep();
      else stretch.push(word);
    }
    keep();
  }
  return [...found].sort((a, b) => b.length - a.length);
}
