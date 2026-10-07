/**
 * A court decision the person downloaded from CanLII and keeps with their own
 * case: how it is attributed wherever it is shown, the caution that goes with
 * it, and the checks on any AI help with it.
 *
 * THE RULES (CanLII Terms of Use, 2026; recorded in docs/SOURCING_NOTES.md):
 *   - s. 4.2: decisions may be copied, printed and used free of charge,
 *     PROVIDED CanLII is identified as the source. So every display of an
 *     uploaded decision goes through `decisionAttribution`, which always says
 *     "Source: CanLII". The source is not a stored value anyone can blank.
 *   - s. 5.1: no masking the source, no systematic downloading (by programs or
 *     by people hired to download), no use beyond the person's own legal
 *     research. So an uploaded decision stays in its owner's case: it never
 *     enters the shared library, the corpus index, the research step, source
 *     requests, evals, fixtures, logs or anyone else's analysis
 *     (test:court-decisions asserts the code paths).
 *   - s. 4.3: courts may add conditions (publication bans, anonymised names).
 *     So nothing here fills in initials, guesses a redacted name or connects a
 *     decision to real people.
 *
 * The site never fetches decision text from canlii.org. The person downloads
 * it themselves and uploads it here.
 */

export const DECISION_SOURCE = "CanLII";

export type DecisionDetails = {
  caseName?: string | null;
  citation?: string | null;
  court?: string | null;
  decisionDate?: string | null;
};

/** The attribution line. Always starts "Source: CanLII", whatever is filled in. */
export function decisionAttribution(details: DecisionDetails): string {
  const parts = [details.caseName?.trim(), details.citation?.trim()].filter(Boolean);
  return parts.length ? `Source: ${DECISION_SOURCE} — ${parts.join(", ")}` : `Source: ${DECISION_SOURCE}`;
}

/** CanLII's own caution, in plain words. */
export const DECISION_CAUTION =
  "A decision may have been overturned or changed by a later decision. Check it on CanLII before you rely on it.";

/**
 * How to find decisions on CanLII yourself. Says nothing about downloading in
 * bulk or for anyone else (Terms s. 5.1).
 */
export const DECISION_SEARCH_HELP =
  "To find a decision, search canlii.org by the case name or citation, or by words that describe your situation, and filter by court (for example, the Small Claims Court or the Superior Court of Justice in Ontario). Download only the decisions you want to read for your own case.";

// ---- AI help with an uploaded decision --------------------------------------

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export type DecisionPassage = { quote: string; why: string };

/**
 * Keeps only passages whose quote is in the uploaded text, word for word
 * (case, quote marks and spacing aside), the same way library quotes are
 * checked. A quote under 15 characters proves nothing and is dropped.
 */
export function verifiedPassages(passages: readonly DecisionPassage[], decisionText: string): DecisionPassage[] {
  const haystack = normalize(decisionText);
  return passages.filter((passage) => {
    const quote = normalize(passage.quote ?? "");
    return quote.length >= 15 && haystack.includes(quote);
  });
}

/** Words that would judge the person's case or predict an outcome (CLAUDE.md section 3). */
const OUTCOME_WORDS =
  /\b(you (?:will|would|should|could) (?:likely )?(?:win|lose|succeed|fail)|your (?:case|claim|defence) is (?:strong|weak|good|bad)|chances?|likely to (?:win|succeed|lose|fail)|good case|strong case|weak case|will win|will lose)\b/i;

/**
 * A capitalised first-and-last name that is not in the decision itself. Used
 * to refuse an explanation that would put a name to an anonymised party
 * (Terms s. 4.3).
 */
const NOT_A_NAME = new Set(
  "Small Claims Court Superior Justice Ontario Canada Supreme Appeal Appeals Divisional Family Law Rules Rule Act Regulation Civil Procedure Statement Defence Defense Claim Plaintiff Defendant Applicant Respondent Judge Deputy Honour Justice The This That Section Part Form Limitations Courts Evidence Tribunal Board Landlord Tenant City Crown Queen King Province Provincial Federal Charter Human Rights Code Bench Division Registrar Clerk Master Associate Motion Order Judgment Reasons Decision CanLII".split(" "),
);

function namesNotInText(explanation: string, decisionText: string): string[] {
  const candidates = explanation.match(/\b[A-Z][a-z]+ (?:[A-Z]\. )?[A-Z][a-z]+\b/g) ?? [];
  const haystack = normalize(decisionText);
  return candidates.filter((name) => {
    const words = name.split(" ").filter((word) => !/^[A-Z]\.$/.test(word));
    if (words.some((word) => NOT_A_NAME.has(word))) return false;
    return !haystack.includes(normalize(name));
  });
}

export type DecisionHelp = { explanation: string; passages: DecisionPassage[] };

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
  if (OUTCOME_WORDS.test(explanation)) return null;
  if (namesNotInText(explanation, decisionText).length) return null;
  const passages = (Array.isArray(record.passages) ? record.passages : [])
    .filter((item): item is DecisionPassage => {
      const value = item as Record<string, unknown>;
      return typeof value?.quote === "string" && typeof value?.why === "string";
    })
    .filter((passage) => !OUTCOME_WORDS.test(passage.why) && namesNotInText(passage.why, decisionText).length === 0);
  return { explanation, passages: verifiedPassages(passages, decisionText) };
}
