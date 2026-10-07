/**
 * A court decision a person downloaded from CanLII and keeps with their own
 * case: how it is attributed wherever it is shown, the caution that goes with
 * it, what the site may say about finding decisions, and the checks on any AI
 * help with it. No imports beyond pure helpers: used by screens and routes.
 *
 * THE RULES (CanLII Terms of Use, 2026; recorded in docs/SOURCING_NOTES.md):
 *   - s. 4.2: decisions may be copied, printed and used free of charge,
 *     PROVIDED CanLII is identified as the source. So every display of an
 *     uploaded decision goes through `decisionAttribution`, which always
 *     begins "Source: CanLII". The source is not a stored value anyone can
 *     blank; the case name and citation are the person's own entries.
 *   - s. 5.1: no masking the source, no systematic downloading (by programs,
 *     or by people hired to download by hand), no storing, reproducing or
 *     using decisions beyond the person's own legal research. So an uploaded
 *     decision stays in its owner's case: it never enters the shared library,
 *     the corpus index, the research step, source requests, evals, fixtures,
 *     logs or anyone else's analysis (test:canlii asserts the code paths), and
 *     nothing here asks anyone to download decisions in bulk or for others.
 *   - s. 4.3: courts may add their own conditions (publication bans,
 *     anonymised names). So nothing here fills in initials, guesses a redacted
 *     name or connects a decision to real people.
 *
 * The site never fetches decision text from canlii.org. The person downloads
 * it themselves and uploads it here.
 */

import { validateCaseStrengthLanguage } from "../case-system/intelligence/caseStrengthLanguageValidator";
import { quoteAppearsIn } from "../case-system/intelligence/quoteMatch";

export const COURT_DECISION_TYPE = "court-decision";
export const DECISION_SOURCE = "CanLII";

export type DecisionDetails = {
  caseName?: string | null;
  citation?: string | null;
  court?: string | null;
  decisionDate?: string | null;
};

/** The attribution line. Always begins "Source: CanLII", whatever is filled in. */
export function decisionAttribution(details: DecisionDetails | null | undefined): string {
  const parts = [details?.caseName?.trim(), details?.citation?.trim()].filter(Boolean);
  return parts.length ? `Source: ${DECISION_SOURCE}. ${parts.join(", ")}` : `Source: ${DECISION_SOURCE}`;
}

/** CanLII's own caution, in plain words. */
export const DECISION_CAUTION =
  "A decision may have been overturned or changed by a later decision. Check it on CanLII before you rely on it.";

/**
 * How to find decisions on CanLII yourself. Never asks or nudges anyone to
 * download decisions in bulk or for someone else (Terms s. 5.1).
 */
export const DECISION_SEARCH_HELP =
  "To find a decision, go to canlii.org and search by the case name or citation, or by words that describe your situation, then narrow it to Ontario and the court your case is in. Download only the decisions you want to read for your own case, and add them here one at a time.";

/** Shown with any AI help: what it is, and what it is not. */
export const DECISION_HELP_BOUNDARY =
  "An AI suggestion to help you read this decision. Every quote below was checked against your copy. It does not say how your case will turn out.";

// ---- AI help with an uploaded decision --------------------------------------

export type DecisionPassage = { quote: string; why: string };
export type DecisionHelp = { explanation: string; passages: DecisionPassage[] };

/**
 * Keeps only passages whose quote is in the uploaded text, word for word
 * (case, quote marks and spacing aside) -- the SAME check library quotes pass
 * (quoteMatch.ts, used by groundedCognition.checkCitation).
 */
export function verifiedPassages(passages: readonly DecisionPassage[], decisionText: string): DecisionPassage[] {
  return passages.filter((passage) => typeof passage.quote === "string" && quoteAppearsIn(passage.quote, decisionText));
}

/** Words that would predict an outcome or grade the person's case (CLAUDE.md s. 3), on top of the shared validator. */
const OUTCOME_WORDS =
  /\b(you (?:will|would|should|could|might|may) (?:likely |probably )?(?:win|lose|succeed|fail)|your (?:case|claim|defence|defense|position) (?:is|looks|seems) (?:strong|weak|good|bad|solid|winnable)|(?:your|good|strong|high|low) chances?|likely to (?:win|succeed|lose|fail)|good case|strong case|weak case|will win|will lose|in your favou?r|against you)\b/i;

/**
 * The explanation describes the DECISION, where a judge finding evidence
 * "credible" is simply what happened, so it is held to OUTCOME_WORDS: nothing
 * about how the person's own case will go. Each passage's "why" connects the
 * decision to the person's situation, so it is also held to the shared
 * case-strength validator (caseStrengthLanguageValidator.ts).
 */
export function predictsTheirOutcome(text: string): boolean {
  return OUTCOME_WORDS.test(text);
}

export function judgesTheCase(text: string): boolean {
  return OUTCOME_WORDS.test(text) || !validateCaseStrengthLanguage(text).valid;
}

const wordsOf = (text: string) => new Set(text.toLowerCase().match(/[a-z]+/g) ?? []);

/**
 * Names in AI wording that the decision does not itself use. That is what
 * filling in an anonymised party, or connecting the decision to a real person,
 * looks like (Terms s. 4.3). Flagged:
 *   - a name-like pair ("Jane Kowalski") that is not in the decision as a
 *     phrase and has a word the decision never uses;
 *   - a titled name ("Ms. Kowalski", "Mr Patel") whose surname the decision
 *     never uses.
 * The decision's own names, and ordinary words, are in its text and pass.
 */
export function namesNotInDecision(text: string, decisionText: string): string[] {
  const known = wordsOf(decisionText);
  const flat = decisionText.replace(/\s+/g, " ").toLowerCase();
  const pairs = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z]\.)?\s+[A-Z][a-z]+\b/g) ?? []).filter((pair) => {
    if (flat.includes(pair.replace(/\s+/g, " ").toLowerCase())) return false;
    const words = pair.split(/\s+/).filter((word) => !/^[A-Z]\.$/.test(word)).map((word) => word.toLowerCase());
    return words.some((word) => !known.has(word));
  });
  const titled = (text.match(/\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]+\b/g) ?? []).filter((match) => {
    const surname = match.split(/\s+/).pop()?.toLowerCase() ?? "";
    return !known.has(surname);
  });
  return [...pairs, ...titled];
}

/**
 * Words the AI puts in quotation marks inside its own explanation are checked
 * too: anything quoted and long enough to be a quote must be in the decision.
 */
export function unverifiedQuotesIn(text: string, decisionText: string): string[] {
  const quoted = [...text.matchAll(/["“]([^"”]{15,})["”]/g)].map((match) => match[1]);
  return quoted.filter((quote) => !quoteAppearsIn(quote, decisionText));
}

/**
 * The checks every piece of AI help passes before a person sees it: only
 * verified passages, nothing that judges their case, no name the decision
 * does not itself contain. Returns null when the explanation fails, so the
 * person sees nothing rather than something unchecked.
 */
export function checkedDecisionHelp(raw: unknown, decisionText: string): DecisionHelp | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const explanation = typeof record.explanation === "string" ? record.explanation.trim() : "";
  if (!explanation || explanation.length > 4000) return null;
  if (predictsTheirOutcome(explanation)) return null;
  if (namesNotInDecision(explanation, decisionText).length) return null;
  if (unverifiedQuotesIn(explanation, decisionText).length) return null;
  const passages = (Array.isArray(record.passages) ? record.passages : [])
    .filter((item): item is DecisionPassage => {
      const value = item as Record<string, unknown> | null;
      return typeof value?.quote === "string" && typeof value?.why === "string";
    })
    .map((passage) => ({ quote: passage.quote.trim(), why: passage.why.trim() }))
    .filter(
      (passage) =>
        !judgesTheCase(passage.why) &&
        namesNotInDecision(passage.why, decisionText).length === 0 &&
        unverifiedQuotesIn(passage.why, decisionText).length === 0,
    )
    .slice(0, 5);
  return { explanation, passages: verifiedPassages(passages, decisionText) };
}
