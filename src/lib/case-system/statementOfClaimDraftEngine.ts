/**
 * First working version of the Statement of Claim drafting feature --
 * organizes a completed guided intake's own facts into the numbered-
 * particulars prose structure a Statement of Claim requires. Not a
 * form-filler (that's /api/generate-form) and not a rebuild of
 * claimDraftEngine.ts (that file reads the static form's ClaimDraftInput
 * shape and numbers raw sentences with no claim-type or formal structure
 * -- read in full before writing this, and found not to be a usable
 * foundation for guided intake's actual data shape; see the session
 * report in docs/INTAKE_STATUS.md for the reasoning).
 *
 * Input shape is deliberately SmallClaimsIntelligenceInput -- the exact
 * type mapGuidedIntakeToSmallClaimsInput() produces and the fixture
 * harness's PipelineRun.mappedInput already is (pipelineRunner.ts) --
 * not a new shape invented for this file.
 *
 * HARD CONSTRAINT this file is built around: no AI call anywhere in this
 * function. Every other "engine" that formats confirmed facts in this
 * codebase (selectQuestions.ts, buildAuthoritativeRequiredForms,
 * resolveExactFormMapping) is a pure, deterministic function precisely so
 * its output can never contain anything the input didn't -- an LLM call
 * cannot make that guarantee even with caseStrengthLanguageValidator's
 * sanitizer wired over its output, since that sanitizer blocks case-
 * strength LANGUAGE, not fabricated FACTS (a wrong date, a invented
 * amount). Given the explicit instruction to never invent a date, amount,
 * name, or detail not present in the captured facts, a deterministic
 * template is the only design that can honestly satisfy it by
 * construction, not by hoping a downstream filter catches every leak.
 *
 * DELIBERATE NON-FEATURE: this does not paraphrase or convert the user's
 * own first-person prose ("I told him...") into third-person legal voice
 * ("the Plaintiff told the Defendant..."). Regex-based pronoun/tense
 * conversion is a well-known source of silently wrong output ("my
 * payment" -> "the Plaintiff's payment" is fine; "he owed me" ->
 * naive-swapped could invert who owed whom). The user's own words are
 * kept verbatim inside a formally-structured, numbered container instead
 * -- CLAUDE.md's "who does the applying" test is about not inventing
 * legal characterization or content, not about prose style, and the
 * draftText's own header says plainly that wording is the user's own and
 * still needs their review, consistent with the "suggest, never decide"
 * requirement that every draft is a proposal, not a finished document.
 */

import type { SmallClaimsIntelligenceInput } from "./intelligence/smallClaimsIntelligenceEngine";
import { sanitizeCognitionOutput } from "./intelligence/caseStrengthLanguageValidator";

export type MatchedClaimTypeForDraft = {
  claimTypeId: string;
  claimTypeName: string;
};

export type StatementOfClaimDraft = {
  claimTypeId: string;
  claimTypeName: string;
  /** Section headings interleaved with their numbered paragraphs (e.g. "PARTIES", "1. ...", "2. ...", "", "FACTS...", "3. ..."), one continuous paragraph count across sections -- parties, then nature of claim, then facts, then amount claimed. */
  numberedParticulars: string[];
  /** The prayer for relief -- fixed, non-case-specific boilerplate plus the confirmed amount. Never argues why the Defendant is liable. */
  reliefSought: string[];
  /** Every bracketed placeholder used in the particulars above, named plainly so the user knows exactly what to fill in before this is used. */
  missingParticulars: string[];
  /** Full assembled text, header through relief, with the review-before-use notice at both top and bottom. */
  draftText: string;
};

const MISSING_PLAINTIFF_NAME = "[Plaintiff name to be confirmed]";
const MISSING_DEFENDANT_NAME = "[Defendant name to be confirmed]";
const MISSING_PLAINTIFF_ADDRESS = "[Plaintiff address to be confirmed]";
const MISSING_DEFENDANT_ADDRESS = "[Defendant address to be confirmed]";
const MISSING_AMOUNT = "[amount claimed to be confirmed]";

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function trimmed(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Numbers every entry continuously starting from `startAt`, returning both
 * the numbered strings and the next free number -- so multiple sections
 * (parties, then facts, then amount/relief) share one running sequence,
 * the way a real Statement of Claim's paragraphs are numbered end to end
 * rather than restarting per heading.
 */
function numberFrom(startAt: number, items: string[]): { numbered: string[]; nextNumber: number } {
  const numbered = items.map((item, index) => `${startAt + index}. ${item}`);
  return { numbered, nextNumber: startAt + items.length };
}

export function draftStatementOfClaimParticulars(
  input: SmallClaimsIntelligenceInput,
  matchedClaimType: MatchedClaimTypeForDraft | null,
): StatementOfClaimDraft {
  const yourName = trimmed(input.yourName);
  const yourAddress = trimmed(input.yourAddress);
  const otherParty = trimmed(input.otherParty);
  const defendantAddress = trimmed(input.defendantAddress);
  const amountClaimed = trimmed(input.amountClaimed);
  const facts = trimmed(input.facts);
  const timeline = trimmed(input.timeline);
  const goal = trimmed(input.goal);

  const missingParticulars: string[] = [];
  const track = (label: string, present: boolean) => {
    if (!present) missingParticulars.push(label);
  };
  track("Plaintiff's full legal name", Boolean(yourName));
  track("Plaintiff's address for court forms", Boolean(yourAddress));
  track("Defendant's full legal name", Boolean(otherParty));
  track("Defendant's address for service", Boolean(defendantAddress));
  track("Exact amount claimed", Boolean(amountClaimed));
  track("Facts explaining what happened", Boolean(facts) || Boolean(timeline));

  let nextNumber = 1;
  const sections: string[] = [];

  // 1. Parties
  const partyParagraphs = [
    `The Plaintiff is ${yourName || MISSING_PLAINTIFF_NAME}, of ${yourAddress || MISSING_PLAINTIFF_ADDRESS}.`,
    `The Defendant is ${otherParty || MISSING_DEFENDANT_NAME}, of ${defendantAddress || MISSING_DEFENDANT_ADDRESS}.`,
  ];
  ({ nextNumber } = appendSection(sections, "PARTIES", numberFrom(nextNumber, partyParagraphs)));

  // 2. Nature of the claim -- names the matched claim type, never argues it
  if (matchedClaimType) {
    const natureParagraph = `This is a claim for ${matchedClaimType.claimTypeName.toLowerCase()}.`;
    ({ nextNumber } = appendSection(sections, "NATURE OF THE CLAIM", numberFrom(nextNumber, [natureParagraph])));
  }

  // 3. Facts -- the Plaintiff's own words, verbatim, split into numbered
  // particulars but never paraphrased or reworded. Timeline and the
  // opening story are presented as two separately labeled groups rather
  // than merged, since this function has no safe way to tell whether they
  // overlap or should be reordered against each other.
  const factsParagraphs: string[] = [];
  if (timeline) factsParagraphs.push(...splitIntoSentences(timeline));
  if (facts) factsParagraphs.push(...splitIntoSentences(facts));
  if (factsParagraphs.length === 0) {
    factsParagraphs.push(
      "[Facts to be confirmed -- no story or timeline was captured during intake for this claim.]",
    );
  }
  ({ nextNumber } = appendSection(
    sections,
    "FACTS (in the Plaintiff's own words, as provided during intake)",
    numberFrom(nextNumber, factsParagraphs),
  ));

  // 4. Amount claimed and what the Plaintiff is asking for
  const amountParagraphs = [
    `The Plaintiff claims ${amountClaimed || MISSING_AMOUNT} from the Defendant.`,
  ];
  if (goal) amountParagraphs.push(goal);
  ({ nextNumber } = appendSection(sections, "AMOUNT CLAIMED", numberFrom(nextNumber, amountParagraphs)));

  const numberedParticulars = sections;

  // Relief sought -- fixed, non-case-specific prayer for relief. Never
  // asserts a specific statute (no source for one was verified this
  // session -- see remedyTypes.ts's own sc-remedy-interest-and-costs entry,
  // which is deliberately general for the same reason) and never argues
  // why the Defendant is liable, only states what the Plaintiff is asking
  // the court for.
  const reliefSought = [
    `(a) payment of ${amountClaimed || MISSING_AMOUNT};`,
    "(b) interest and costs of this proceeding, as the court may allow.",
  ];

  const header = [
    "DRAFT STATEMENT OF CLAIM -- PROPOSAL ONLY, NOT A FINAL DOCUMENT",
    "",
    "This draft was assembled from the facts you provided during intake. It is a starting point " +
      "for you to review, correct, and complete -- CourtSimplified has not verified these facts, " +
      "has not decided whether this claim is appropriate to file, and this is not ready to file as " +
      "written. Replace every bracketed placeholder, check every paragraph against what actually " +
      "happened, and have the final version reviewed before it is used.",
    "",
  ];

  const footer = [
    "",
    missingParticulars.length
      ? "PARTICULARS STILL NEEDED BEFORE THIS COULD BE FILED:"
      : "",
    ...missingParticulars.map((item) => `- ${item}`),
    "",
    "This is a proposal for your review, not a final document. Confirm every fact above before using it.",
  ].filter((line, index, all) => !(line === "" && all[index - 1] === ""));

  const draftText = [...header, ...numberedParticulars, "", "RELIEF SOUGHT", ...reliefSought, ...footer].join("\n");

  const draft: StatementOfClaimDraft = {
    claimTypeId: matchedClaimType?.claimTypeId || "",
    claimTypeName: matchedClaimType?.claimTypeName || "",
    numberedParticulars,
    reliefSought,
    missingParticulars,
    draftText,
  };

  // Required choke point: reuse the exact sanitizer added in d1fa87c,
  // never a second, independently-maintained validator. Recursively blanks
  // any case-strength/prediction language anywhere in this object.
  return sanitizeCognitionOutput(draft, "statementOfClaimDraft");
}

function appendSection(
  sections: string[],
  heading: string,
  numbered: { numbered: string[]; nextNumber: number },
): { nextNumber: number } {
  if (sections.length > 0) sections.push("");
  sections.push(heading, ...numbered.numbered);
  return { nextNumber: numbered.nextNumber };
}
