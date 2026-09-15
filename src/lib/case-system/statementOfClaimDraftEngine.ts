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
import { parseRecordedAmount, formatRecordedAmount } from "./format/recordedAmount";

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

/**
 * Small, explicit set of abbreviations that end in a period but aren't
 * sentence boundaries -- titles, common business suffixes, and a couple of
 * address abbreviations most likely to appear in an intake narrative. Not a
 * full sentence-boundary detector (out of scope, per the task that added
 * this constant) -- just enough that the naive [.!?]-followed-by-whitespace
 * split doesn't cut "Cedar & Co. never paid me" into two fragments at "Co.".
 */
const SENTENCE_SPLIT_EXCEPTIONS = [
  "Mr", "Mrs", "Ms", "Dr", "Prof", "Rev", "Hon", "Jr", "Sr",
  "St", "Ave", "Blvd", "Rd",
  "Co", "Inc", "Ltd", "Corp",
  "vs", "etc", "No",
];

/**
 * Same split points as before ([.!?] followed by whitespace, or a newline)
 * except it never splits right after one of SENTENCE_SPLIT_EXCEPTIONS --
 * the negative lookbehind checks whether the text ending at the split point
 * (the whitespace immediately after the [.!?]) matches "<exception>.", and
 * if so, skips that split point.
 */
const SENTENCE_SPLIT_REGEX = new RegExp(
  `(?<!\\b(?:${SENTENCE_SPLIT_EXCEPTIONS.join("|")})\\.)(?<=[.!?])\\s+|\\n+`,
  "gi",
);

function splitIntoSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_REGEX)
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

/**
 * Elements the user said they cannot supply, in the claim type's own words.
 *
 * These appear IN THE DOCUMENT, not only in the UI that produced it (readiness
 * design section 4). A substantive gap that is visible only on the screen where
 * it was recorded is a gap the user will not see again when they read the
 * draft, and this draft is the thing they act on.
 *
 * They are NOT filled in and NOT silently omitted. Both failure modes matter:
 * inventing content for an unrecorded element would fabricate a fact, and
 * dropping it would hide one.
 */
export type UnrecordedElementForDraft = {
  elementId: string;
  /** The element's own `name` from claimTypes.ts. Never reworded here. */
  name: string;
};

export function draftStatementOfClaimParticulars(
  input: SmallClaimsIntelligenceInput,
  matchedClaimType: MatchedClaimTypeForDraft | null,
  unrecordedElements: UnrecordedElementForDraft[] = [],
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
  // NOT `Boolean(amountClaimed)`. That asked whether the user typed anything,
  // so "I don't know what it would come to." satisfied it and the draft
  // reported nothing missing while claiming that sentence as a sum. The
  // question a pleading needs answered is whether the text names a figure, and
  // parseRecordedAmount is the existing, tested answer to exactly that — its
  // own header says it is exported so callers can branch on it.
  track("Exact amount claimed", parseRecordedAmount(amountClaimed) !== null);
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
  //
  // A PLEADING NEEDS A SUM. THE INTAKE ANSWER IS FREE TEXT.
  //
  // `sc-amount-claimed` captures whatever the user types, verbatim and by
  // design — recordedAmount.ts exists because deleting "about" or "plus costs"
  // would change what someone said about their own claim. That is right for
  // DISPLAY and wrong for a document that states a sum to a court.
  //
  // Interpolating the raw answer produced, live:
  //   "The Plaintiff claims I don't know what it would come to. from the Defendant."
  //   "The Plaintiff claims $460 plus the storage, so about $540. from the Defendant."
  // The second is a description of an amount. The first is not an amount at
  // all, and the draft reported nothing missing, because the old check was
  // `Boolean(amountClaimed)` — which asks "did the user type something", not
  // "is this a sum".
  //
  // So the figure position takes the parsed amount or the placeholder, and
  // NOTHING IS DISCARDED: when the answer will not parse, the user's own
  // wording is preserved in its own paragraph. Dropping "plus the storage"
  // silently would be the same defect mirrored — this engine never deletes
  // what the user said, it declines to promote it to a figure it is not.
  const parsedAmount = parseRecordedAmount(amountClaimed);
  const amountIsSum = parsedAmount !== null;
  const amountForPleading = amountIsSum ? formatRecordedAmount(amountClaimed) : MISSING_AMOUNT;

  const amountParagraphs = [`The Plaintiff claims ${amountForPleading} from the Defendant.`];

  if (!amountIsSum && amountClaimed) {
    amountParagraphs.push(
      `During intake the Plaintiff described the amount as: "${amountClaimed}". ` +
        `An exact figure is still needed here.`,
    );
  }

  // The remedy answer is the user's own words about what they want, not a
  // statement about the amount — it was being numbered into this section as
  // though it were one, which produced "9. I don't know what I can even ask
  // for." sitting under AMOUNT CLAIMED. It gets its own heading.
  ({ nextNumber } = appendSection(sections, "AMOUNT CLAIMED", numberFrom(nextNumber, amountParagraphs)));

  if (goal) {
    ({ nextNumber } = appendSection(
      sections,
      "WHAT THE PLAINTIFF IS ASKING FOR (in the Plaintiff's own words)",
      numberFrom(nextNumber, [goal]),
    ));
  }

  const numberedParticulars = sections;

  // Relief sought -- fixed, non-case-specific prayer for relief. Never
  // asserts a specific statute (no source for one was verified this
  // session -- see remedyTypes.ts's own sc-remedy-interest-and-costs entry,
  // which is deliberately general for the same reason) and never argues
  // why the Defendant is liable, only states what the Plaintiff is asking
  // the court for.
  const reliefSought = [
    // Same rule as the AMOUNT CLAIMED paragraph: the relief a court is asked to
    // grant is a sum or it is a placeholder. It is never the user's description
    // of a sum — "(a) payment of about $540;" asks for something unquantified.
    `(a) payment of ${amountForPleading};`,
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

  // Recorded as not held, in the claim type's own words. Stated as a fact
  // about the case file -- "nothing is recorded for this" -- and never as a
  // conclusion about the claim. Saying an element is unproven, weak, or fatal
  // would be assessment (CLAUDE.md section 3); saying nothing is recorded for
  // it is a description of the file.
  const unrecordedLines = unrecordedElements.length
    ? [
        "",
        "RECORDED AS NOT HELD:",
        "You told us you do not have anything for the following. They are listed here so they are " +
          "visible in the document, not left out of it. Nothing has been written in for them.",
        ...unrecordedElements.map((element) => `- ${element.name}`),
      ]
    : [];

  const footer = [
    ...unrecordedLines,
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
