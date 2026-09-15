import type { CaseRisk, CaseTimelineEvent } from "./caseContextEngine";

import type { EvidenceItem } from "./evidenceEngine";

import type {
  CivilCaseType,
  CivilEvidenceProfile,
} from "./types/civil-case";

export type CivilEvidenceIssue =
  | "identity"
  | "publication"
  | "causation"
  | "damages"
  | "credibility"
  | "timeline"
  | "service"
  | "notice"
  | "contract"
  | "injury"
  | "financial-loss"
  | "state-action"
  | "procedural-history"
  | "authentication"
  | "unknown";

/*
 * `CivilEvidenceStrength` was here — "strong" | "moderate" | "weak" | "missing"
 * — with an `assessStrength()` that assigned one by keyword: "official",
 * "court", "record", "certified" or "signed" meant STRONG; "screenshot",
 * "email", "text" meant MODERATE; "heard", "told me", "maybe" meant WEAK.
 * Substring matching on the user's own description of their own evidence,
 * producing a merits grade (CLAUDE.md section 3).
 *
 * WHAT THE WHOLE LADDER EXISTED TO DO, traced before removing it: produce ONE
 * SENTENCE. "Strong documentary evidence exists.", pushed into
 * `strategicAdvantages` when any item graded "strong". Nothing else in src/ or
 * app/ read `.strength` at all.
 *
 * And no consumer read that sentence either. Its only downstream use was
 * `civilStrategyEngine:103`, which takes `.length` of the list it sits in and
 * never its contents — so the sentence's whole effect was to make a count
 * non-zero, in cases where "N evidence item(s) uploaded." had already done so.
 * Deleting it changes no observable behaviour.
 *
 * A type, a classifier, and a field computed on every item, for a string
 * nothing reads. Recorded in OUTSTANDING_ISSUES section 0h, because the next
 * section 3 structure may also be load-bearing only in appearance.
 */
export type CivilEvidenceLink = {
  evidenceId: string;
  linkedIssue: CivilEvidenceIssue;
  explanation: string;
};

export type CivilEvidenceGap = {
  issue: CivilEvidenceIssue;
  title: string;
  explanation: string;
  recommendedEvidence: string[];
  severity: "high" | "medium" | "low";
};

export type CivilEvidenceConcern = {
  title: string;
  explanation: string;
  severity: "high" | "medium" | "low";
};

export type CivilEvidenceInput = {
  caseTypes: CivilCaseType[];
  evidenceItems?: EvidenceItem[];
  timeline?: CaseTimelineEvent[];
  summary?: string;
};

export type CivilEvidenceResult = {
  linkedEvidence: CivilEvidenceLink[];
  missingEvidence: CivilEvidenceGap[];
  contradictionConcerns: CivilEvidenceConcern[];
  credibilityConcerns: CivilEvidenceConcern[];
  authenticationConcerns: CivilEvidenceConcern[];
  /** What is recorded in the file. Was `strategicAdvantages`. */
  recordedEvidenceNotes: string[];
  /** What has nothing recorded behind it. Was `strategicWeaknesses`. */
  assertionsWithoutRecordedSupport: string[];
  evidenceProfile: CivilEvidenceProfile;
  risks: CaseRisk[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function getEvidenceId(item: EvidenceItem, index: number): string {
  return String(
    item.id ||
      item.label ||
      item.exhibitNumber ||
      item.title ||
      `civil_evidence_${index + 1}`,
  );
}

function evidenceText(item: EvidenceItem): string {
  return normalize(
    [
      item.title,
      item.description,
      item.relevance,
      item.relatedIssue,
      item.relatedLegalElement,
      item.category,
      item.content,
      item.source,
      item.date,
    ].join(" "),
  );
}

function detectIssueFromEvidence(item: EvidenceItem): CivilEvidenceIssue {
  const text = evidenceText(item);

  if (includesAny(text, ["defamation", "publication", "sent to", "shared", "posted"])) {
    return "publication";
  }

  if (includesAny(text, ["damage", "loss", "expense", "invoice", "receipt", "bank"])) {
    return "financial-loss";
  }

  if (includesAny(text, ["injury", "medical", "pain", "treatment"])) {
    return "injury";
  }

  if (includesAny(text, ["timeline", "date", "chronology"])) {
    return "timeline";
  }

  if (includesAny(text, ["contract", "agreement", "signed"])) {
    return "contract";
  }

  if (includesAny(text, ["government", "crown", "police", "charter", "ministry"])) {
    return "state-action";
  }

  if (includesAny(text, ["email", "text", "screenshot", "social media"])) {
    return "authentication";
  }

  return "unknown";
}

function buildMissingEvidence(
  caseTypes: CivilCaseType[],
  evidenceItems: EvidenceItem[],
): CivilEvidenceGap[] {
  const text = normalize(
    evidenceItems.map((item) => evidenceText(item)).join(" "),
  );

  const gaps: CivilEvidenceGap[] = [];

  if (
    caseTypes.includes("defamation") &&
    !includesAny(text, ["screenshot", "publication", "recipient"])
  ) {
    gaps.push({
      issue: "publication",
      title: "Missing publication proof for defamation theory",
      explanation: "Defamation claims require proof of publication to another person.",
      recommendedEvidence: ["Screenshots", "Recipient evidence", "Witnesses", "Posts/messages"],
      severity: "high",
    });
  }

  if (
    caseTypes.includes("negligence") &&
    !includesAny(text, ["invoice", "medical", "damage", "repair"])
  ) {
    gaps.push({
      issue: "damages",
      title: "Damages evidence appears incomplete",
      explanation: "Negligence claims require proof of actual damages or loss.",
      recommendedEvidence: ["Invoices", "Medical records", "Repair estimates", "Financial records"],
      severity: "high",
    });
  }

  if (!includesAny(text, ["date", "timeline", "chronology"])) {
    gaps.push({
      issue: "timeline",
      title: "Timeline evidence is weak",
      explanation: "Civil claims require clear chronology and dated events.",
      recommendedEvidence: ["Timeline", "Dated screenshots", "Court records", "Communications"],
      severity: "medium",
    });
  }

  return gaps;
}

function buildRiskFromGap(gap: CivilEvidenceGap): CaseRisk {
  return {
    id: `civil_evidence_risk_${gap.issue}_${gap.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}`,
    title: gap.title,
    description: gap.explanation,
    severity: gap.severity,
    source: "evidence",
    suggestedFix: gap.recommendedEvidence.join(", "),
  };
}

export function runCivilEvidenceEngine(
  input: CivilEvidenceInput,
): CivilEvidenceResult {
  const evidenceItems = input.evidenceItems || [];

  const linkedEvidence: CivilEvidenceLink[] = evidenceItems.map((item, index) => ({
    evidenceId: getEvidenceId(item, index),
    linkedIssue: detectIssueFromEvidence(item),
    explanation: "Evidence item analyzed and linked to civil issue structure.",
  }));

  const missingEvidence = buildMissingEvidence(input.caseTypes, evidenceItems);

  const contradictionConcerns: CivilEvidenceConcern[] = [];
  const credibilityConcerns: CivilEvidenceConcern[] = [];
  const authenticationConcerns: CivilEvidenceConcern[] = [];

  const text = normalize(
    [
      input.summary,
      evidenceItems.map((item) => evidenceText(item)).join(" "),
    ].join(" "),
  );

  if (includesAny(text, ["always", "never", "everyone", "obviously"])) {
    credibilityConcerns.push({
      title: "Absolute wording concern",
      explanation: "Overstated or absolute wording may weaken credibility.",
      severity: "medium",
    });
  }

  if (includesAny(text, ["screenshot", "text", "email", "social media"])) {
    authenticationConcerns.push({
      title: "Digital evidence authentication review",
      explanation: "Digital evidence should show dates, sender, recipient, and context.",
      severity: "medium",
    });
  }

  // RENAMED, not rewritten. Both lists already held recorded-vs-not content;
  // only the names graded. `strategicAdvantages` / `strategicWeaknesses` read
  // as an assessment of the case, and a reader scanning for section 3 problems
  // would stop on them — which is the whole point of the rename.
  //
  // The removed second entry is the "Strong documentary evidence exists."
  // string described in the header. What remains says how many items were
  // uploaded, which is a fact about the file.
  const recordedEvidenceNotes = cleanList([
    evidenceItems.length > 0 ? `${evidenceItems.length} evidence item(s) uploaded.` : "",
  ]);

  // Contents unchanged. Gap titles and credibility-concern titles are already
  // statements about what is not recorded, and its only consumer —
  // civilNarrativeEngine's buildUnsupportedAssertions — already frames them as
  // assertions without recorded support. The name now matches both.
  const assertionsWithoutRecordedSupport = cleanList([
    ...missingEvidence.map((gap) => gap.title),
    ...credibilityConcerns.map((concern) => concern.title),
  ]);

  const risks = missingEvidence.map(buildRiskFromGap);

  const evidenceProfile: CivilEvidenceProfile = {
    evidenceItems,
    keyEvidenceStrengths: recordedEvidenceNotes,
    contradictionWarnings: contradictionConcerns.map((item) => item.title),
    credibilityConcerns: credibilityConcerns.map((item) => item.title),
    missingEvidence: missingEvidence.map((item) => item.title),
    authenticationConcerns: authenticationConcerns.map((item) => item.title),
    expertEvidenceNeeded: [],
    witnessConcerns: [],
  };

  return {
    linkedEvidence,
    missingEvidence,
    contradictionConcerns,
    credibilityConcerns,
    authenticationConcerns,
    recordedEvidenceNotes,
    assertionsWithoutRecordedSupport,
    evidenceProfile,
    risks,
    summary:
      missingEvidence.length > 0
        ? "Civil evidence analysis detected important proof gaps."
        : "Civil evidence analysis completed successfully.",
  };
}