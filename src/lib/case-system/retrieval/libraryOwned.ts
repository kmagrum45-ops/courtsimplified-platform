/**
 * STATEMENTS THE LIBRARY OWNS, IN THE CHAT AS ON THE PAGES (Charter re-test 2026-10-26).
 *
 * The chat's checked answer is written by a model and checked statement by statement against the
 * official text. A check can confirm words without the conditions around them: the chat told a
 * person suing a municipal police service about the Crown's 60-day notice without saying it is a
 * notice to the Crown, and said a $75,000 claim "must follow simplified procedure" when the claim
 * also asked for a declaration. For these topics the model's sentence is never shown: the library's
 * own statement is, built only from the Acts' and Rules' words (stage-map/citations.ts, each quote
 * checked against the saved text by test:stage-map) -- the same words the amount card uses.
 *
 * Pure.
 */
import {
  RCP_76_02_1_MANDATORY,
  S_CLPA_18_1_NOTICE,
  S_CLPA_1_CROWN,
  S_CSPA_47_1_BOARD_LIABLE,
  S_CSPA_63_1_OPP_CROWN,
  officialUrl,
  sourceName,
  type RuleCitation,
} from "../stage-map/citations";

type Source = { passageId: string; citation: string; sourceUrl: string; quote: string; kind: "legislation" | "guidance" | "decision" };
type Statement = { text: string; sources: Source[] };

const source = (citation: RuleCitation): Source => ({
  passageId: `library:${citation.sourceId}:${citation.pinpoint}`,
  citation: `${sourceName(citation)}, ${citation.pinpoint}`,
  sourceUrl: officialUrl(citation),
  quote: citation.quote,
  kind: "legislation",
});

/** The Crown's 60-day notice, in the model's words: "60-day notice", "notice of claim to the Crown", s. 18. */
const CROWN_NOTICE = /\b(?:60|sixty)[- ]days?\b[^.]*\bnotice\b|\bnotice\b[^.]*\b(?:60|sixty)[- ]days?\b|\bnotice of (?:the )?claim\b[^.]*\bcrown\b|\bcrown liability and proceedings act\b[^.]*\b(?:s\.|section)\s*18\b|\b(?:s\.|section)\s*18\b[^.]*\bcrown liability\b/i;
/** Simplified procedure said as a rule for this claim: "must follow / must use / is required to use simplified procedure". */
const SIMPLIFIED_MUST = /\b(?:must|shall|has to|have to|is required to|are required to|needs? to)\b[^.]*\bsimplified procedure\b|\bsimplified procedure\b[^.]*\b(?:must|shall|is required|applies|is mandatory)\b/i;

/**
 * Who the Crown's notice is for, in the Acts' own words (CLPA s. 1 and s. 18 (1); the Community
 * Safety and Policing Act ss. 63 (1) and 47 (1)), and what the library cannot tell them.
 */
export function crownNoticeStatements(): Statement[] {
  // Each sentence is the Act's own words with its section, nothing added (site owner, 2026-10-26).
  return [
    { text: actWords(S_CLPA_18_1_NOTICE), sources: [source(S_CLPA_18_1_NOTICE)] },
    { text: actWords(S_CLPA_1_CROWN), sources: [source(S_CLPA_1_CROWN)] },
    { text: actWords(S_CSPA_63_1_OPP_CROWN), sources: [source(S_CSPA_63_1_OPP_CROWN)] },
    { text: actWords(S_CSPA_47_1_BOARD_LIABLE), sources: [source(S_CSPA_47_1_BOARD_LIABLE)] },
    // Not a statement of law: what the library cannot answer, said instead of a guess.
    { text: LIBRARY_CANNOT_ANSWER_POLICE_NOTICE, sources: [] },
  ];
}

/** The library's limit on police notice, as the chat says it (not a statement of law). */
export const LIBRARY_CANNOT_ANSWER_POLICE_NOTICE = "Our library does not hold a rule that says whether notice is needed before suing a municipal police service board, so we cannot tell you that here.";

/** An Act's own words, quoted, with the Act and section: “...” (Name, s. N). */
export function actWords(citation: RuleCitation): string {
  // A quotation mark inside the Act's words ("Crown" means ...) becomes a single one inside ours.
  const words = citation.quote.replace(/"([^"]+)"/g, "‘$1’");
  return `“${words}” (${sourceName(citation)}, ${citation.pinpoint})`;
}

/** The simplified procedure, in the amount card's words (amountNotes.ts) and with its rule. */
export function simplifiedProcedureStatement(): Statement {
  return { text: "If your claim is only for money or property, $200,000 or less means it must go under the simplified procedure (Rule 76).", sources: [source(RCP_76_02_1_MANDATORY)] };
}

/**
 * The statements with every library-owned topic said in the library's words: a model sentence on
 * the Crown's notice is replaced by who the notice is for (once), and one saying the simplified
 * procedure must be used is replaced by the amount card's conditional sentence (once).
 */
export function withLibraryOwned<T extends Statement>(statements: readonly T[]): Statement[] {
  const out: Statement[] = [];
  let crown = false;
  let simplified = false;
  for (const statement of statements) {
    if (CROWN_NOTICE.test(statement.text) || statement.sources.some((item) => /crown liability and proceedings act/i.test(item.citation) && /\b18\b/.test(item.citation + item.quote))) {
      if (!crown) out.push(...crownNoticeStatements());
      crown = true;
      continue;
    }
    if (SIMPLIFIED_MUST.test(statement.text)) {
      if (!simplified) out.push(simplifiedProcedureStatement());
      simplified = true;
      continue;
    }
    out.push(statement);
  }
  return out;
}
