export type ClaimDraftInput = {
  courtPath?: string;
  caseStage?: string;
  yourName?: string;
  otherParty?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
  extra?: Record<string, any>;
  analysis?: {
    detectedIssues?: string[];
    detectedClaimTypes?: string[];
    missingInformation?: string[];
    risksAndGaps?: string[];
    damagesIssues?: string[];
    proceduralRisks?: string[];
    defenceAttacks?: string[];
    judgeConcerns?: string[];
    suggestedFocus?: string[];
    guidance?: string[];
    summary?: string;
  };
};

export type ClaimDraftResult = {
  title: string;
  partySection: string[];
  claimOverview: string[];
  numberedClaimFacts: string[];
  damagesSection: string[];
  evidenceSection: string[];
  missingInformation: string[];
  defenceRisks: string[];
  judgeConcerns: string[];
  suggestedImprovements: string[];
  draftText: string;
};

function cleanList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function splitIntoSentences(text?: string) {
  if (!text) return [];

  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getExtraString(input: ClaimDraftInput, key: string) {
  const value = input.extra?.[key];

  if (typeof value === "string") return value.trim();

  return "";
}

function getAmountClaimed(input: ClaimDraftInput) {
  return (
    getExtraString(input, "amountClaimed") ||
    getExtraString(input, "damagesBreakdown") ||
    ""
  );
}

function getDefendantAddress(input: ClaimDraftInput) {
  return getExtraString(input, "defendantAddress");
}

function getPlaintiffAddress(input: ClaimDraftInput) {
  const address = getExtraString(input, "yourAddress");
  const city = getExtraString(input, "yourCity");
  const province = getExtraString(input, "yourProvince");
  const postal = getExtraString(input, "yourPostalCode");

  return cleanList([address, city, province, postal]).join(", ");
}

function buildNumberedFacts(input: ClaimDraftInput) {
  const facts = splitIntoSentences(input.facts);
  const timeline = splitIntoSentences(input.timeline);

  const combined = cleanList([...timeline, ...facts]);

  if (combined.length === 0) {
    return [
      "The Plaintiff has not yet provided enough facts to draft numbered claim paragraphs.",
    ];
  }

  return combined.map((fact, index) => `${index + 1}. ${fact}`);
}

function buildDamagesSection(input: ClaimDraftInput) {
  const amount = getAmountClaimed(input);
  const damagesBreakdown = getExtraString(input, "damagesBreakdown");

  const damages: string[] = [];

  if (amount) {
    damages.push(`The Plaintiff claims ${amount}.`);
  } else {
    damages.push("The amount claimed has not yet been clearly entered.");
  }

  if (damagesBreakdown && damagesBreakdown !== amount) {
    damages.push(`The claimed amount is described as follows: ${damagesBreakdown}`);
  }

  if (input.analysis?.damagesIssues?.length) {
    damages.push(...input.analysis.damagesIssues);
  }

  return cleanList(damages);
}

function buildEvidenceSection(input: ClaimDraftInput) {
  const evidence: string[] = [];

  if (input.evidence) {
    evidence.push(`The Plaintiff intends to rely on the following evidence: ${input.evidence}`);
  }

  if (input.extra?.uploadedEvidenceFiles && Array.isArray(input.extra.uploadedEvidenceFiles)) {
    const uploaded = input.extra.uploadedEvidenceFiles
      .map((file: any) => {
        const title = file.title || file.name || "Untitled evidence";
        const relevance = file.relevance ? ` — ${file.relevance}` : "";
        return `${title}${relevance}`;
      })
      .filter(Boolean);

    evidence.push(...uploaded);
  }

  if (evidence.length === 0) {
    evidence.push("No supporting evidence has been clearly listed yet.");
  }

  return cleanList(evidence);
}

export function draftSmallClaimsPlaintiffClaim(
  input: ClaimDraftInput
): ClaimDraftResult {
  const plaintiff = input.yourName || "Plaintiff name not entered";
  const defendant = input.otherParty || "Defendant name not entered";
  const plaintiffAddress = getPlaintiffAddress(input) || "Plaintiff address not entered";
  const defendantAddress = getDefendantAddress(input) || "Defendant address not entered";

  const partySection = [
    `Plaintiff: ${plaintiff}`,
    `Plaintiff address: ${plaintiffAddress}`,
    `Defendant: ${defendant}`,
    `Defendant address: ${defendantAddress}`,
  ];

  const detectedIssues = input.analysis?.detectedIssues || [];

  const claimOverview = [
    detectedIssues.length > 0
      ? `This claim appears to involve: ${detectedIssues.join(", ")}.`
      : "The legal issue has not yet been clearly identified.",
    input.goal
      ? `The Plaintiff asks the court for: ${input.goal}`
      : "The specific court order or result requested has not yet been entered.",
  ];

  const numberedClaimFacts = buildNumberedFacts(input);
  const damagesSection = buildDamagesSection(input);
  const evidenceSection = buildEvidenceSection(input);

  const missingInformation = cleanList([
    ...(input.analysis?.missingInformation || []),
    !input.yourName ? "Plaintiff name is missing." : "",
    !input.otherParty ? "Defendant name is missing." : "",
    !getAmountClaimed(input) ? "Amount claimed or damages breakdown is missing." : "",
    !input.facts ? "Facts explaining what happened are missing." : "",
    !input.timeline ? "Timeline is missing." : "",
  ]);

  const defenceRisks = cleanList(input.analysis?.defenceAttacks || []);
  const judgeConcerns = cleanList(input.analysis?.judgeConcerns || []);

  const suggestedImprovements = cleanList([
    ...(input.analysis?.suggestedFocus || []),
    ...(input.analysis?.guidance || []),
    "Use short numbered paragraphs.",
    "Avoid emotional labels unless they are directly supported by evidence.",
    "Connect each major fact to a document, message, photo, receipt, witness, or record.",
    "Make the damages calculation clear enough that a judge can follow it quickly.",
  ]);

  const draftText = [
    "DRAFT PLAINTIFF’S CLAIM — COURTSIMPLIFIED WORKING DRAFT",
    "",
    "PARTIES",
    ...partySection.map((item) => `- ${item}`),
    "",
    "CLAIM OVERVIEW",
    ...claimOverview.map((item) => `- ${item}`),
    "",
    "FACTS",
    ...numberedClaimFacts,
    "",
    "DAMAGES / AMOUNT CLAIMED",
    ...damagesSection.map((item) => `- ${item}`),
    "",
    "EVIDENCE TO SUPPORT THE CLAIM",
    ...evidenceSection.map((item) => `- ${item}`),
    "",
    "MISSING INFORMATION TO FIX BEFORE FINALIZING",
    ...(missingInformation.length
      ? missingInformation.map((item) => `- ${item}`)
      : ["- No major missing information detected."]),
    "",
    "LIKELY DEFENCE RISKS",
    ...(defenceRisks.length
      ? defenceRisks.map((item) => `- ${item}`)
      : ["- No major defence risks detected yet."]),
    "",
    "LIKELY JUDGE CONCERNS",
    ...(judgeConcerns.length
      ? judgeConcerns.map((item) => `- ${item}`)
      : ["- No major judge concerns detected yet."]),
  ].join("\n");

  return {
    title: "Draft Plaintiff’s Claim",
    partySection,
    claimOverview,
    numberedClaimFacts,
    damagesSection,
    evidenceSection,
    missingInformation,
    defenceRisks,
    judgeConcerns,
    suggestedImprovements,
    draftText,
  };
}