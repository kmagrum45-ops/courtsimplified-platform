/**
 * The checks every Case Law Map entry goes through before it is stored (scripts/content/buildCaseLawBatch1.ts), and
 * that the test re-runs (scripts/verification/verifyCaseLawBatch1.ts). None of them is loosened for these entries: the
 * outcome check is the pipeline's own predictsOutcome with its list of owner-authorized exact phrases, and the
 * case-strength check is validateCaseStrengthLanguage.
 *
 * WHAT THE MACHINE CHECK HERE CAN AND CANNOT SAY. No decision text comes from CanLII, and most of these decisions are
 * not saved anywhere in docs/sources. For the ones that ARE saved (from the courts' own sites), two things are checked
 * by code: every paragraph the summary cites exists in the saved text, and every phrase the summary puts in double
 * quotes is in the saved text word for word. For the statutes, each section the entry names is found in the saved
 * e-Laws or Justice Laws text and a phrase from it is looked for there. None of that checks that a summary's own
 * words say only what the paragraphs say: that was the owner's reading, recorded in owner_check_notes. So no entry is
 * labelled machine-verified.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { predictsOutcome, RULE_PHRASES_NOT_PREDICTIONS } from "./verifiedContentPipeline";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import { inProvision, norm } from "../law-map/checkLawMap";

const SOURCES = path.resolve(import.meta.dirname, "..", "..", "docs", "sources");

/** The first check that refuses a text, or null. */
export function predictionCheck(text: string): { phrase: string; rule: string } | null {
  const outcome = predictsOutcome(text);
  if (outcome) return { phrase: outcome, rule: "predictsOutcome (scripts/content/verifiedContentPipeline.ts, OUTCOME_MARKERS)" };
  // The same owner-authorized exact phrases, and only those, are skipped (Jason's decision 1, 2026-11-22).
  const strength = validateCaseStrengthLanguage(RULE_PHRASES_NOT_PREDICTIONS.reduce((t, phrase) => t.split(phrase).join(""), text));
  if (!strength.valid) {
    return { phrase: strength.matchedTerm ?? "", rule: "validateCaseStrengthLanguage (src/lib/case-system/intelligence/caseStrengthLanguageValidator.ts, BLOCKED_TERMS)" };
  }
  return null;
}

/**
 * A time period, form or fee in an entry's own words. Under CLAUDE.md s. 2a procedure comes only from the stage map, so
 * each is reported: shown with an entry later, it may only explain; the date, form or fee itself comes from the map.
 */
export function procedureMentions(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\b(?:\d+|one|two|three|four|five|six|ten|thirty)[- ](?:years?|months?|days?)\b/gi)) found.add(m[0]);
  for (const m of text.matchAll(/\bForm \d+[A-Z]?\b/g)) found.add(m[0]);
  for (const m of text.matchAll(/\bfees?\b/gi)) found.add(m[0]);
  for (const m of text.matchAll(/\bSince [A-Z][a-z]+ \d{1,2}, \d{4}\b/g)) found.add(m[0]);
  return [...found];
}

/**
 * Domains a link may go to without a decision: CLAUDE.md s. 2's acceptable sources, plus the two already used by the
 * site for these sources (canlii.ca, CanLII's own short links returned by its API; laws-lois.justice.gc.ca, the
 * federal Justice Laws site, used for the Divorce Act and the Federal Child Support Guidelines). Any other domain is
 * held as link_pending_source_decision and never shown.
 */
export const LINK_DOMAINS = ["canlii.org", "canlii.ca", "ontario.ca", "ontariocourts.ca", "ontariocourtforms.on.ca", "laws-lois.justice.gc.ca", "lso.ca"];

/**
 * Single URLs allowed although their domain is not, each by the site owner's decision. The exact URL only: any other
 * page on the same domain is still held. Shown, like every other link, only through caseLawDisplay's source-label rules.
 *   - The Canadian Judicial Council's Statement of Principles on Self-represented Litigants and Accused Persons (2006),
 *     for E01 Pintea v. Johns (Jason's decision 2, 2026-11-22).
 */
export const LINK_EXACT_URLS = ["https://cjc-ccm.ca/sites/default/files/documents/2020/Final-Statement-of-Principles-SRL.pdf"];

export function linkAllowed(url: string): boolean {
  if (LINK_EXACT_URLS.includes(url)) return true;
  const host = new URL(url).hostname.replace(/^www\./, "");
  return LINK_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** The decisions saved under docs/sources/decisions (from the courts' own sites), by entry slug. */
export const SAVED_DECISIONS: Record<string, string> = {
  "pintea-v-johns": "pintea-v-johns-2017-SCC-23.html.txt",
  "grant-thornton-v-new-brunswick": "grant-thornton-v-new-brunswick-2021-SCC-31.english.txt",
  "hryniak-v-mauldin": "hryniak-v-mauldin-2014-SCC-7.html.txt",
  "mountain-view-farms-v-mcqueen": "mountain-view-farms-v-mcqueen-2014-ONCA-194.txt",
  "rjr-macdonald": "rjr-macdonald-v-canada-1994-1-SCR-311.html.txt",
  "michel-v-graydon": "michel-v-graydon-2020-SCC-24.html.txt",
  "colucci-v-colucci": "colucci-v-colucci-2021-SCC-24.html.txt",
  "barendregt-v-grebliunas": "barendregt-v-grebliunas-2022-SCC-22.html.txt",
  "carey-v-laiken": "carey-v-laiken-2015-SCC-17.html.txt",
};

/** Paragraph numbers a summary cites: "(para 4)", "(paras 1–3)", "(paras 63–64, 76)". */
export function citedParagraphs(summary: string): number[] {
  const out = new Set<number>();
  for (const m of summary.matchAll(/\bparas? ([0-9–, ]+)/g)) {
    for (const part of m[1].split(",")) {
      const [a, b] = part.trim().split("–").map((n) => Number.parseInt(n, 10));
      if (!Number.isFinite(a)) continue;
      for (let n = a; n <= (Number.isFinite(b) ? b : a); n += 1) out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

/** Phrases a summary puts in double quotes. */
export const quotedPhrases = (summary: string) => [...summary.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

export type DecisionTextCheck = {
  file: string;
  paragraphsCited: number[];
  paragraphsMissing: number[];
  quotesChecked: string[];
  quotesMissing: string[];
};

export function decisionTextCheck(slug: string, summary: string): DecisionTextCheck | null {
  const file = SAVED_DECISIONS[slug];
  if (!file) return null;
  const raw = readFileSync(path.join(SOURCES, "decisions", file), "utf8");
  const text = norm(raw);
  const paragraphsCited = citedParagraphs(summary);
  const paragraphsMissing = paragraphsCited.filter((n) => !new RegExp(`(^|\\n)\\s*\\[${n}\\]`).test(raw));
  const quotesChecked = quotedPhrases(summary);
  // A phrase the summary quotes from a statute or rule rather than the decision ("effective notice" is the Court's own
  // term) is still looked for in the decision, which quotes it.
  const quotesMissing = quotesChecked.filter((q) => !text.includes(norm(q)));
  return { file: `docs/sources/decisions/${file}`, paragraphsCited, paragraphsMissing, quotesChecked, quotesMissing };
}

/**
 * Statute and rule sections the entries name, each with a phrase from the section's own text, looked for in the saved
 * official text (docs/sources/corpus). The phrase is a search term chosen here, not wording shown to anyone.
 */
export const STATUTE_PINPOINTS: { entry: string; corpusId: string; pinpoint: string; phrase: string }[] = [
  { entry: "E02", corpusId: "limitations-act-2002", pinpoint: "s. 4", phrase: "second anniversary of the day on which the claim was discovered" },
  { entry: "E02", corpusId: "limitations-act-2002", pinpoint: "s. 5 (1) (a) (iv)", phrase: "a proceeding would be an appropriate means" },
  { entry: "E02", corpusId: "limitations-act-2002", pinpoint: "s. 5 (2)", phrase: "presumed to have known" },
  { entry: "E04", corpusId: "oreg-258-98-small-claims-rules", pinpoint: "r. 12.02 (1)", phrase: "inflammatory, a waste of time, a nuisance" },
  { entry: "E05", corpusId: "oreg-258-98-small-claims-rules", pinpoint: "r. 11.06", phrase: "meritorious defence and a reasonable explanation for the default" },
  { entry: "E06", corpusId: "cja-courts-of-justice-act", pinpoint: "s. 29", phrase: "15 per cent" },
  { entry: "E07", corpusId: "cja-courts-of-justice-act", pinpoint: "s. 27 (1)", phrase: "unduly repetitious" },
  { entry: "E07", corpusId: "cja-courts-of-justice-act", pinpoint: "s. 27 (3)", phrase: "by reason of any privilege" },
  { entry: "E07", corpusId: "cja-courts-of-justice-act", pinpoint: "s. 27 (5)", phrase: "satisfied as to its authenticity" },
  { entry: "E20", corpusId: "federal-child-support-guidelines-full", pinpoint: "s. 14", phrase: "would result in a different child support order" },
  { entry: "E20", corpusId: "ontario-child-support-guidelines-full", pinpoint: "s. 14", phrase: "would result in a different" },
  { entry: "E20", corpusId: "divorce-act", pinpoint: "s. 17 (4.1)", phrase: "spousal support order" },
  { entry: "E24", corpusId: "divorce-act", pinpoint: "s. 16.93", phrase: "burden of proof" },
  { entry: "E24", corpusId: "childrens-law-reform-act", pinpoint: "s. 39.1", phrase: "relocation" },
];

const corpus = new Map<string, string>();
function corpusText(id: string): string {
  if (!corpus.has(id)) {
    const manifest = JSON.parse(readFileSync(path.join(SOURCES, "corpus", "manifest.json"), "utf8")) as { entries: { id: string; file: string }[] };
    const entry = manifest.entries.find((e) => e.id === id);
    corpus.set(id, entry ? norm(readFileSync(path.join(SOURCES, "corpus", entry.file), "utf8")) : "");
  }
  return corpus.get(id) ?? "";
}

export function statutePinpointFound(item: (typeof STATUTE_PINPOINTS)[number]): boolean {
  const text = corpusText(item.corpusId);
  return Boolean(text) && inProvision(text, item.pinpoint, norm(item.phrase));
}
