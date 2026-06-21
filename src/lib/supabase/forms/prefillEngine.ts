type CourtPath = "family" | "small-claims" | "civil";

type PrefillResult = {
  formNumber: string;
  formName: string;
  documentType: "court-form" | "draft-document" | "evidence-package";
  fields: Record<string, any>;
  missingFields: string[];
  warnings: string[];
};

type PrefillInput = {
  courtPath?: CourtPath;
  fullName?: string;
  otherParty?: string;
  children?: string[];
  stage: string;
  issues: string[];
  facts: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
  amountClaimed?: string;
  courtLocation?: string;
  claimNumber?: string;
  otherPartyAddress?: string;
  damagesBreakdown?: string;
  settlementEfforts?: string;
};

function textIncludes(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function cleanList(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function missing(value: unknown) {
  return !value || String(value).trim().length < 2;
}

function buildCivilClaimTheory(input: PrefillInput) {
  const combined = [
    input.issues.join(" "),
    input.facts,
    input.timeline,
    input.evidence,
    input.goal,
    input.damagesBreakdown,
  ].join(" ");

  if (
    textIncludes(combined, [
      "defamation",
      "reputation",
      "pedophile",
      "false statement",
      "false statements",
      "slander",
      "libel",
    ])
  ) {
    return {
      issue: "Defamation / reputational harm",
      causeOfAction: "Defamation",
      legalElements:
        "The claim may need facts showing the words used, who received or saw them, when they were communicated, why they were false, and what harm resulted.",
    };
  }

  if (
    textIncludes(combined, [
      "contract",
      "agreement",
      "quote",
      "invoice",
      "services",
      "renovation",
      "payment",
    ])
  ) {
    return {
      issue: "Contract / payment dispute",
      causeOfAction: "Breach of contract",
      legalElements:
        "The claim should explain the agreement, who made it, what each side promised, what was breached, and the loss caused.",
    };
  }

  if (
    textIncludes(combined, [
      "negligence",
      "injury",
      "damage",
      "unsafe",
      "failed to",
      "loss caused",
    ])
  ) {
    return {
      issue: "Negligence / damages",
      causeOfAction: "Negligence",
      legalElements:
        "The claim should explain the duty owed, what was done wrong, how it caused harm, and the damages claimed.",
    };
  }

  return {
    issue: "Civil claim",
    causeOfAction: "To be determined from facts",
    legalElements:
      "More detail may be needed to identify the strongest legal basis for the claim.",
  };
}

export function generatePrefillData(input: PrefillInput): PrefillResult[] {
  const results: PrefillResult[] = [];
  const courtPath = input.courtPath || "family";
  const stage = input.stage;
  const issues = cleanList(input.issues || []);
  const warnings: string[] = [];

  const baseMissing: string[] = [];
  if (missing(input.fullName)) baseMissing.push("Your full legal name");
  if (missing(input.otherParty)) baseMissing.push("Other party full legal name");
  if (missing(input.facts)) baseMissing.push("Detailed facts");
  if (missing(input.goal)) baseMissing.push("What you want the court to order");

  if (input.urgent) {
    warnings.push("Urgent issues should be reviewed carefully before filing.");
  }

  // =========================
  // FAMILY
  // =========================
  if (courtPath === "family") {
    if (stage === "conference") {
      results.push({
        formNumber: "Form 17A",
        formName: "Case Conference Brief",
        documentType: "court-form",
        fields: {
          applicant: input.fullName || "",
          respondent: input.otherParty || "",
          children: input.children?.join(", ") || "",
          issues: issues.join(", "),
          facts: input.facts || "",
          requestedOrders: input.goal || "",
          evidence: input.evidence || "",
        },
        missingFields: baseMissing,
        warnings,
      });
    }

    if (stage === "responding") {
      results.push({
        formNumber: "Form 10",
        formName: "Answer",
        documentType: "court-form",
        fields: {
          respondent: input.fullName || "",
          applicant: input.otherParty || "",
          responsePosition: input.facts || "",
          issuesInDispute: issues.join(", "),
          requestedOrders: input.goal || "",
        },
        missingFields: baseMissing,
        warnings,
      });
    }

    if (stage === "starting" || stage === "starting-case") {
      results.push({
        formNumber: "Form 8",
        formName: "Application",
        documentType: "court-form",
        fields: {
          applicant: input.fullName || "",
          respondent: input.otherParty || "",
          claims: issues.join(", "),
          facts: input.facts || "",
          requestedOrders: input.goal || "",
        },
        missingFields: baseMissing,
        warnings,
      });
    }

    return results;
  }

  // =========================
  // SMALL CLAIMS
  // =========================
  if (courtPath === "small-claims") {
    const smallClaimsMissing = [...baseMissing];

    if (missing(input.amountClaimed)) {
      smallClaimsMissing.push("Amount claimed or disputed");
    }

    if (stage === "starting-case" || stage === "starting") {
      results.push({
        formNumber: "Form 1B",
        formName: "Plaintiff’s Claim",
        documentType: "court-form",
        fields: {
          plaintiff: input.fullName || "",
          defendant: input.otherParty || "",
          defendantAddress: input.otherPartyAddress || "",
          courtLocation: input.courtLocation || "",
          amountClaimed: input.amountClaimed || "",
          facts: input.facts || "",
          timeline: input.timeline || "",
          damagesBreakdown: input.damagesBreakdown || "",
          evidence: input.evidence || "",
          remedyRequested: input.goal || "",
        },
        missingFields: smallClaimsMissing,
        warnings,
      });
    }

    if (stage === "responding") {
      results.push({
        formNumber: "Form 7A",
        formName: "Defence",
        documentType: "court-form",
        fields: {
          defendant: input.fullName || "",
          plaintiff: input.otherParty || "",
          claimNumber: input.claimNumber || "",
          responseFacts: input.facts || "",
          evidence: input.evidence || "",
          remedyRequested: input.goal || "",
        },
        missingFields: baseMissing,
        warnings,
      });
    }

    if (stage === "conference") {
      results.push({
        formNumber: "Document",
        formName: "Settlement Conference Preparation Package",
        documentType: "draft-document",
        fields: {
          party: input.fullName || "",
          otherParty: input.otherParty || "",
          claimNumber: input.claimNumber || "",
          issues: issues.join(", "),
          facts: input.facts || "",
          timeline: input.timeline || "",
          evidence: input.evidence || "",
          settlementEfforts: input.settlementEfforts || "",
          settlementPosition: input.goal || "",
        },
        missingFields: cleanList([
          ...baseMissing,
          missing(input.evidence) ? "Evidence list / documents" : "",
          missing(input.settlementEfforts) ? "Settlement efforts or offer history" : "",
        ]),
        warnings,
      });
    }

    results.push({
      formNumber: "Evidence Package",
      formName: "Small Claims Evidence Index",
      documentType: "evidence-package",
      fields: {
        party: input.fullName || "",
        issue: issues.join(", "),
        timeline: input.timeline || "",
        evidence: input.evidence || "",
        missingEvidence: input.missingEvidence || "",
      },
      missingFields: missing(input.evidence) ? ["Evidence list"] : [],
      warnings,
    });

    return results;
  }

  // =========================
  // CIVIL
  // =========================
  if (courtPath === "civil") {
    const theory = buildCivilClaimTheory(input);
    const civilMissing = [...baseMissing];

    if (missing(input.courtLocation)) civilMissing.push("Court location");
    if (missing(input.damagesBreakdown)) civilMissing.push("Damages / loss breakdown");

    if (stage === "starting-case" || stage === "starting") {
      results.push({
        formNumber: "Form 14A",
        formName: "Statement of Claim",
        documentType: "court-form",
        fields: {
          plaintiff: input.fullName || "",
          defendant: input.otherParty || "",
          courtLocation: input.courtLocation || "",
          amountClaimed: input.amountClaimed || "",
          claimTheory: theory.issue,
          causeOfAction: theory.causeOfAction,
          legalElementsToAddress: theory.legalElements,
          materialFacts: input.facts || "",
          timeline: input.timeline || "",
          damagesBreakdown: input.damagesBreakdown || "",
          evidence: input.evidence || "",
          reliefRequested: input.goal || "",
        },
        missingFields: civilMissing,
        warnings,
      });

      results.push({
        formNumber: "Form 4A",
        formName: "General Heading",
        documentType: "court-form",
        fields: {
          courtLocation: input.courtLocation || "",
          plaintiff: input.fullName || "",
          defendant: input.otherParty || "",
        },
        missingFields: cleanList([
          missing(input.courtLocation) ? "Court location" : "",
          missing(input.fullName) ? "Plaintiff name" : "",
          missing(input.otherParty) ? "Defendant name" : "",
        ]),
        warnings: [],
      });

      results.push({
        formNumber: "Form 4C",
        formName: "Backsheet",
        documentType: "court-form",
        fields: {
          title: "Statement of Claim",
          party: input.fullName || "",
          contact: "",
        },
        missingFields: ["Address/contact information for backsheet"],
        warnings: [],
      });
    }

    if (stage === "responding") {
      results.push({
        formNumber: "Form 18A",
        formName: "Statement of Defence",
        documentType: "court-form",
        fields: {
          defendant: input.fullName || "",
          plaintiff: input.otherParty || "",
          courtFileNumber: input.claimNumber || "",
          responseFacts: input.facts || "",
          issuesInDispute: issues.join(", "),
          evidence: input.evidence || "",
          reliefRequested: input.goal || "",
        },
        missingFields: baseMissing,
        warnings,
      });
    }

    if (stage === "motion") {
      results.push({
        formNumber: "Form 37A",
        formName: "Notice of Motion",
        documentType: "court-form",
        fields: {
          movingParty: input.fullName || "",
          respondingParty: input.otherParty || "",
          courtFileNumber: input.claimNumber || "",
          orderRequested: input.goal || "",
          groundsForMotion: input.facts || "",
          evidence: input.evidence || "",
        },
        missingFields: baseMissing,
        warnings,
      });
    }

    results.push({
      formNumber: "Evidence Package",
      formName: "Civil Evidence Index",
      documentType: "evidence-package",
      fields: {
        party: input.fullName || "",
        caseTheory: theory.issue,
        timeline: input.timeline || "",
        evidence: input.evidence || "",
        missingEvidence: input.missingEvidence || "",
        damagesBreakdown: input.damagesBreakdown || "",
      },
      missingFields: missing(input.evidence) ? ["Evidence list"] : [],
      warnings,
    });

    return results;
  }

  return results;
}