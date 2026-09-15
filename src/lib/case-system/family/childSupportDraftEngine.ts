/**
 * Assembles a child support application draft from what the user recorded —
 * Family Law Act s. 33 path, initial application, parties never married.
 *
 * COSTS NOTHING. Deterministic string assembly. No AI, no network, no
 * arithmetic on the user's figures.
 *
 * *** THE TABLE AMOUNT IS NOT IN THIS DRAFT. ***
 *
 * Not as a figure, not as a range, not as "the table for one child at this
 * income is". Three reasons, each sufficient on its own:
 *
 *   - The table is a FORMULA — Basic Amount, plus a percentage of income over
 *     the band floor — not a cell to read.
 *   - It takes GUIDELINES income, which O. Reg. 391/97 s. 16 defines as T1
 *     "Total income" adjusted by Schedule III, not the figure the user stated.
 *   - ss. 17 to 20, and Schedule III items 9 and 12, let a court determine that
 *     income differently altogether.
 *
 * A draft carrying a number would be doing the single thing this whole design
 * says it cannot. What the reader gets instead is the rule, their own figures
 * as they gave them, and a plain statement of what the court decides.
 *
 * *** NO ARITHMETIC ON RECORDED FIGURES. ***
 *
 * No totalling of s. 7 expenses, no apportionment between the parties, no
 * annual-to-monthly division. `formatRecordedAmount` reformats a bare number
 * and returns anything carrying a qualifier untouched, so "about $60,000" stays
 * "about $60,000" in the document a court will read.
 */

import { formatRecordedAmount } from "../format/recordedAmount";
import {
  ONTARIO_GUIDELINES_URL,
  SUPPORT_ELEMENTS,
  type SupportElementId,
} from "./childSupportFlaPath";

/** A figure the user stated, with where they say it came from. */
export type StatedIncome = {
  /** Exactly what the user typed. Never normalised beyond display formatting. */
  stated: string;
  /** Where they say the figure comes from. Shown verbatim. */
  basisStated: string;
  /**
   * s. 15 (2) lets a court treat an income figure the parties agreed IN WRITING
   * as the person's income, if it thinks the amount reasonable having regard to
   * the s. 21 information. A figure one person asserts alone is a different
   * thing, and a court reading the draft needs to know which it is.
   */
  statedBy: "user" | "both-parties-in-writing" | "from-tax-return";
};

export type ChildSupportDraftInput = {
  applicantName?: string;
  applicantAddress?: string;
  respondentName?: string;
  respondentAddress?: string;

  /** Each child as the user described them. Never parsed into ages. */
  childrenDescribed?: string;
  parentingTimeDescribed?: string;

  incomeForTable?: StatedIncome;
  /**
   * OMITTED, not defaulted, where no s. 7 expenses are claimed or no spousal
   * support moves between the parties. Its absence is the answer.
   */
  incomeForSectionSeven?: StatedIncome;

  /** What the user says they pay, in their own words and amounts. */
  sectionSevenExpenses?: string[];
  insuranceShareDescribed?: string;

  /** Which s. 21 documents the user said they have. */
  incomeDocumentsHeld?: string[];

  /**
   * FLR r. 13 (1.2) selects Form 13.1 where there is a property or exclusive-
   * possession claim, r. 13 (1.1) selects Form 13 where there is not. Undefined
   * means the user has not said, and the draft must not pick.
   */
  propertyOrExclusivePossessionClaim?: boolean;

  /**
   * FLR r. 13 (1.3) — the exception that matters most to the commonest case.
   * Where the ONLY support claim is child support in the amount specified in
   * the table, and there is no property or exclusive-possession claim, the
   * party making the claim "is not required to file a financial statement".
   *
   * This is a recorded answer, not an inference. A s. 7 claim asks for an
   * amount ON TOP OF the table amount, and ss. 4, 9 and 10 are routes to an
   * amount OTHER than the table amount, so none of those is "the amount
   * specified in the table" — but which of them is in play is the user's to
   * say, not this engine's to deduce from the fields it happens to hold.
   */
  onlyClaimIsTableAmountChildSupport?: boolean;

  /** Elements the user answered "I can't provide this" to. */
  cannotProvide?: { elementId: SupportElementId; name: string }[];
};

export type ChildSupportDraft = {
  /** Form 8, always — FLR r. 8 (1). */
  applicationForm: string;
  /** Form 13, Form 13.1, or an explicit "the rule decides" line. */
  financialStatementForm: string;
  financialStatementBasis: string;
  sections: { heading: string; lines: string[] }[];
  placeholders: string[];
  draftText: string;
};

const PLACEHOLDER = "[... to be confirmed]";

function value(raw: string | undefined, placeholders: string[], label: string): string {
  const text = (raw || "").trim();
  if (text) return text;
  placeholders.push(label);
  return PLACEHOLDER;
}

/**
 * How a stated income renders. Three lines, never one: the figure, where the
 * user says it came from, and who stated it.
 */
function incomeBlock(label: string, income: StatedIncome | undefined, purpose: string): string[] {
  if (!income || !income.stated.trim()) {
    return [
      `${label}: No figure recorded.`,
      `  ${purpose}`,
      "  Nothing has been filled in here. The documents listed under INCOME DOCUMENTS",
      "  below are what O. Reg. 391/97 s. 21 requires with the application, and are",
      "  where a figure would come from.",
    ];
  }

  const statedByLine =
    income.statedBy === "both-parties-in-writing"
      ? "  Stated by: both parties, in writing. O. Reg. 391/97 s. 15 (2) provides that where " +
        "both parties agree in writing on the annual income of a party, the court may consider " +
        "that amount to be their income if it thinks the amount is reasonable having regard to " +
        "the income information provided under s. 21."
      : income.statedBy === "from-tax-return"
        ? "  Stated by: the applicant, from a tax return or notice of assessment."
        : "  Stated by: the applicant.";

  return [
    `${label}: ${formatRecordedAmount(income.stated)}`,
    `  ${purpose}`,
    `  Basis stated: ${income.basisStated.trim() || PLACEHOLDER}`,
    statedByLine,
  ];
}

export function draftChildSupportApplication(
  input: ChildSupportDraftInput,
): ChildSupportDraft {
  const placeholders: string[] = [];

  // ---- Which financial statement, decided by the rule ----
  let financialStatementForm: string;
  let financialStatementBasis: string;

  if (input.propertyOrExclusivePossessionClaim === true) {
    financialStatementForm = "Form 13.1";
    financialStatementBasis =
      "Family Law Rules r. 13 (1.2): if the application contains a property claim or a claim for " +
      "exclusive possession of the matrimonial home and its contents, the financial statement " +
      "\"shall be in Form 13.1, whether a claim for support is also included or not\". Recorded " +
      "here: there is such a claim. Note that r. 13 (1.3)'s exception is expressly unavailable " +
      "where there is a property or exclusive-possession claim.";
  } else if (
    input.propertyOrExclusivePossessionClaim === false &&
    input.onlyClaimIsTableAmountChildSupport === true
  ) {
    financialStatementForm = "None required — Family Law Rules r. 13 (1.3)";
    financialStatementBasis =
      "Family Law Rules r. 13 (1.3): if the only claim for support contained in the application " +
      "\"is a claim for child support in the amount specified in the table of the applicable child " +
      "support guidelines, the party making the claim is not required to file a financial " +
      "statement, unless the application ... also contains a property claim or a claim for " +
      "exclusive possession of the matrimonial home and its contents\". Recorded here: the only " +
      "support claim is child support in the table amount, and there is no property or " +
      "exclusive-possession claim. The respondent's obligation under r. 13 (1) (b) is a separate " +
      "question and is not answered by this.";
  } else if (input.propertyOrExclusivePossessionClaim === false) {
    financialStatementForm = "Form 13";
    financialStatementBasis =
      "Family Law Rules r. 13 (1.1): if the application contains a claim for support but does not " +
      "contain a property claim or a claim for exclusive possession of the matrimonial home and " +
      "its contents, the financial statement \"shall be in Form 13\"." +
      (input.onlyClaimIsTableAmountChildSupport === false
        ? " r. 13 (1.3)'s exception does not apply: it is limited to an application whose only " +
          "support claim is child support in the amount specified in the table, and that has been " +
          "recorded as not the case here."
        : " Whether r. 13 (1.3) removes the requirement altogether has not been recorded — that " +
          "exception applies only where the only support claim is child support in the amount " +
          "specified in the table.");
  } else {
    // The site does not pick. Both subrules are quoted and the reader applies
    // the one that describes their application.
    financialStatementForm = "Form 13 or Form 13.1 — not yet determined";
    financialStatementBasis =
      "Which form applies depends on whether this application also contains a property claim or a " +
      "claim for exclusive possession of the matrimonial home and its contents. Family Law Rules " +
      "r. 13 (1.1): support without a property or exclusive-possession claim is \"in Form 13\". " +
      "r. 13 (1.2): with such a claim it is \"in Form 13.1, whether a claim for support is also " +
      "included or not\". That has not been recorded here. A third subrule may remove the " +
      "requirement entirely: r. 13 (1.3) provides that where the only support claim is child " +
      "support in the amount specified in the table, and there is no property or " +
      "exclusive-possession claim, the party making the claim \"is not required to file a " +
      "financial statement\".";
    placeholders.push("whether this application also makes a property or exclusive-possession claim");
  }

  const sections: { heading: string; lines: string[] }[] = [];

  sections.push({
    heading: "PARTIES",
    lines: [
      `Applicant: ${value(input.applicantName, placeholders, "the applicant's full legal name")}`,
      `Applicant's address: ${value(input.applicantAddress, placeholders, "the applicant's address for service")}`,
      `Respondent: ${value(input.respondentName, placeholders, "the respondent's full legal name")}`,
      `Respondent's address: ${value(input.respondentAddress, placeholders, "the respondent's address for service")}`,
    ],
  });

  sections.push({
    heading: "THE CHILDREN",
    lines: [
      value(input.childrenDescribed, placeholders, "each child's age and what they are doing now"),
    ],
  });

  sections.push({
    heading: "PARENTING TIME, AS RECORDED",
    lines: [
      value(input.parentingTimeDescribed, placeholders, "how the children's time is divided"),
      "",
      "Recorded as described. O. Reg. 391/97 s. 8 applies where there are two or more children and",
      "each parent has the majority of parenting time with one or more of them; s. 9 applies where",
      "each parent exercises not less than 40% of parenting time with a child over the course of a",
      "year. Whether either applies here is for the court.",
    ],
  });

  // ---- Income ----
  const incomeLines = incomeBlock(
    "Annual income for the table amount",
    input.incomeForTable,
    "Used for the amount under the applicable table — O. Reg. 391/97 s. 3 (1) (a).",
  );

  if (input.incomeForSectionSeven) {
    incomeLines.push("");
    incomeLines.push(
      ...incomeBlock(
        "Annual income for special or extraordinary expenses",
        input.incomeForSectionSeven,
        "Used for an amount under s. 7 — O. Reg. 391/97 s. 3 (1) (b).",
      ),
    );
    incomeLines.push("");
    incomeLines.push(
      "These are two different figures because Schedule III treats spousal support differently",
      "depending on what is being calculated. Item 3, for the table amount, deducts the spousal",
      "support RECEIVED from the other party. Item 3.1, for section 7, deducts the spousal support",
      "PAID to the other party.",
    );
  }

  incomeLines.push(
    "",
    "No amount of support is calculated in this document. O. Reg. 391/97 s. 16 determines annual",
    "income using the sources under \"Total income\" in the T1 General form, adjusted in accordance",
    "with Schedule III, and ss. 17 to 20 set out circumstances in which the court determines the",
    "figure differently. The figures above are as recorded by the applicant.",
  );

  sections.push({ heading: "INCOME, AS RECORDED", lines: incomeLines });

  // ---- s. 7 ----
  const expenses = (input.sectionSevenExpenses || []).map((e) => e.trim()).filter(Boolean);
  if (expenses.length > 0 || (input.insuranceShareDescribed || "").trim()) {
    const lines = expenses.map((e) => `- ${e}`);
    if ((input.insuranceShareDescribed || "").trim()) {
      lines.push(`- Children's share of medical or dental insurance premiums: ${input.insuranceShareDescribed!.trim()}`);
    }
    lines.push(
      "",
      "Recorded in the applicant's own words and amounts, not totalled and not apportioned.",
      "O. Reg. 391/97 s. 7 (1) provides that the court may provide for an amount covering all or",
      "part of the listed expenses, taking into account the necessity of the expense in relation to",
      "the child's best interests and its reasonableness in relation to the means of the parties and",
      "the family's spending pattern before separation. s. 7 (1.1) defines what makes an expense",
      "\"extraordinary\". Those assessments are the court's.",
    );
    sections.push({ heading: "SPECIAL OR EXTRAORDINARY EXPENSES CLAIMED", lines });
  }

  // ---- s. 21 documents ----
  const docs = (input.incomeDocumentsHeld || []).map((d) => d.trim()).filter(Boolean);
  sections.push({
    heading: "INCOME DOCUMENTS",
    lines:
      docs.length > 0
        ? [
            ...docs.map((d) => `- ${d}`),
            "",
            "O. Reg. 391/97 s. 21 (1) requires an applicant whose income information is necessary to",
            "determine the amount to include specified documents with the application, including",
            "personal income tax returns and notices of assessment for each of the three most recent",
            "taxation years, and further documents depending on the person's circumstances.",
          ]
        : [
            "None recorded.",
            "",
            "O. Reg. 391/97 s. 21 (1) requires an applicant whose income information is necessary to",
            "determine the amount to include specified documents with the application, including",
            "personal income tax returns and notices of assessment for each of the three most recent",
            "taxation years, and further documents depending on whether the person is an employee,",
            "self-employed, a partner in a partnership, a person who controls a corporation, or a",
            "beneficiary under a trust.",
          ],
  });

  // ---- Recorded as not held ----
  const notHeld = input.cannotProvide || [];
  if (notHeld.length > 0) {
    sections.push({
      heading: "RECORDED AS NOT HELD",
      lines: [
        "The applicant recorded that they do not have anything for the following. They are listed",
        "here so they are visible in the document rather than left out of it. Nothing has been",
        "written in for them.",
        "",
        ...notHeld.map((item) => `- ${item.name}`),
      ],
    });
  }

  const notice =
    "DRAFT FOR REVIEW. Assembled from what was recorded, without calculating any amount. " +
    "Review and complete every bracketed item before this is used.";

  const draftText = [
    notice,
    "",
    "Application: Form 8 (Application (General)).",
    "  Family Law Rules r. 8 (1): \"To start a case, a person shall file an application (Form 8,",
    "  8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 34L or 34N).\" The Table of Forms to O. Reg. 114/99 titles",
    "  the alternatives: 8A is Application (Divorce), 8B and 8B.1 child protection and status",
    "  review, 8B.2 other Child, Youth and Family Services Act, 2017 cases, 8C secure treatment,",
    "  8D and 8D.1 adoption, 34L and 34N openness orders. Form 8 is the general application.",
    `Financial statement: ${financialStatementForm}`,
    `  ${financialStatementBasis}`,
    "",
    ...sections.flatMap((section) => [section.heading, ...section.lines, ""]),
    `Source: O. Reg. 391/97 (Child Support Guidelines, Family Law Act) — ${ONTARIO_GUIDELINES_URL}`,
    "",
    notice,
  ].join("\n");

  return {
    applicationForm: "Form 8",
    financialStatementForm,
    financialStatementBasis,
    sections,
    placeholders: Array.from(new Set(placeholders)),
    draftText,
  };
}

/** The elements this engine draws on, for a caller wiring the gate. */
export const DRAFT_ELEMENT_IDS: SupportElementId[] = SUPPORT_ELEMENTS.map((e) => e.id);
