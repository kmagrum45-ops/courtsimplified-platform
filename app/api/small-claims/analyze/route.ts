import { NextRequest, NextResponse } from "next/server";

import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsIntelligenceOutput,
  type SmallClaimsIntelligenceInput,
} from "@/src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 200_000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_SHORT_TEXT_LENGTH = 1_000;

const allowedStages = new Set([
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "appeal",
  "urgent",
  "settlement",
  "not-sure",
]);

const allowedIssues = new Set([
  "unpaid-money",
  "contract-dispute",
  "property-damage",
  "loan-or-debt",
  "work-or-services",
  "deposit-refund",
  "consumer-purchase",
  "vehicle-dispute",
  "defamation-reputation",
  "harassment-communications",
  "defending-claim",
  "settlement",
  "enforcement",
  "other",
]);

const allowedFiledDocuments = new Set([
  "plaintiffs-claim",
  "defence",
  "affidavit-service",
  "offer-settle",
  "settlement-conference",
  "default-judgment",
  "witness-list",
  "enforcement-documents",
  "nothing",
  "not-sure",
]);

const evidenceStringFields = [
  "id",
  "name",
  "type",
  "title",
  "description",
  "category",
  "evidenceDate",
  "source",
  "relevance",
] as const;

const requiredStringFields: Array<keyof SmallClaimsIntelligenceInput> = [
  "caseStage",
  "yourName",
  "yourAddress",
  "yourCity",
  "yourProvince",
  "yourPostalCode",
  "yourPhone",
  "yourEmail",
  "otherParty",
  "otherPartyPhone",
  "otherPartyEmail",
  "yourRole",
  "courtLocation",
  "claimNumber",
  "amountClaimed",
  "defendantAddress",
  "agreementDetails",
  "paymentHistory",
  "damagesBreakdown",
  "serviceDetails",
  "deadlineDetails",
  "facts",
  "timeline",
  "evidence",
  "missingEvidence",
  "settlementEfforts",
  "defenceResponse",
  "goal",
  "urgent",
];

const longTextFields = new Set<keyof SmallClaimsIntelligenceInput>([
  "agreementDetails",
  "paymentHistory",
  "damagesBreakdown",
  "serviceDetails",
  "deadlineDetails",
  "facts",
  "timeline",
  "evidence",
  "missingEvidence",
  "settlementEfforts",
  "defenceResponse",
  "goal",
  "urgent",
]);

const allowedInputFields = new Set<keyof SmallClaimsIntelligenceInput>([
  "issues",
  "filedDocuments",
  "uploadedEvidenceFiles",
  ...requiredStringFields,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isStringArray(value: unknown, limit: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= limit &&
    value.every(
      (item) =>
        typeof item === "string" && item.length <= MAX_SHORT_TEXT_LENGTH,
    )
  );
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isEvidenceFile(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((field) => !evidenceStringFields.includes(field as never) && field !== "size" && field !== "lastModified")) {
    return false;
  }

  return (
    Object.keys(value).length === evidenceStringFields.length + 2 &&
    evidenceStringFields.every((field) =>
      isBoundedString(
        value[field],
        field === "description" || field === "relevance"
          ? MAX_TEXT_LENGTH
          : MAX_SHORT_TEXT_LENGTH,
      ),
    ) &&
    typeof value.size === "number" &&
    Number.isFinite(value.size) &&
    value.size >= 0 &&
    typeof value.lastModified === "number" &&
    Number.isFinite(value.lastModified)
  );
}

export function isSmallClaimsInput(
  value: unknown,
): value is SmallClaimsIntelligenceInput {
  if (!isRecord(value)) return false;
  if (
    Object.keys(value).some(
      (field) => !allowedInputFields.has(field as keyof SmallClaimsIntelligenceInput),
    )
  ) {
    return false;
  }

  if (!isStringArray(value.issues, 20)) return false;
  if (!isStringArray(value.filedDocuments, 20)) return false;
  if (!allowedStages.has(String(value.caseStage))) return false;
  if (!value.issues.every((issue) => allowedIssues.has(issue))) return false;
  if (
    !value.filedDocuments.every((document) =>
      allowedFiledDocuments.has(document),
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(value.uploadedEvidenceFiles) ||
    value.uploadedEvidenceFiles.length > 50 ||
    !value.uploadedEvidenceFiles.every(isEvidenceFile)
  ) {
    return false;
  }

  return requiredStringFields.every((field) =>
    isBoundedString(
      value[field],
      longTextFields.has(field) ? MAX_TEXT_LENGTH : MAX_SHORT_TEXT_LENGTH,
    ),
  );
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type SmallClaimsRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  analyze: typeof analyzeSmallClaimsWithBrain;
  hasExternalAiKey: () => boolean;
};

export function createSmallClaimsAnalyzePost(
  overrides: Partial<SmallClaimsRouteDependencies> = {},
) {
  const dependencies: SmallClaimsRouteDependencies = {
    authenticate: getAuthenticatedUser,
    analyze: analyzeSmallClaimsWithBrain,
    hasExternalAiKey: hasConfiguredServerAi,
    ...overrides,
  };

  return async function smallClaimsAnalyzePost(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return errorResponse("The Small Claims intake is too large to analyze.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("A valid Small Claims intake payload is required.", 400);
  }

  if (!isRecord(body) || Object.keys(body).some((key) => key !== "input")) {
    return errorResponse("A valid Small Claims intake payload is required.", 400);
  }

  const serializedInput = JSON.stringify(body.input);
  if (!serializedInput) {
    return errorResponse("A complete Small Claims intake is required.", 400);
  }
  if (serializedInput.length > MAX_REQUEST_BYTES) {
    return errorResponse("The Small Claims intake is too large to analyze.", 413);
  }

  if (!isSmallClaimsInput(body.input)) {
    return errorResponse("A complete Small Claims intake is required.", 400);
  }

  try {
    const authenticated = Boolean(await dependencies.authenticate(request));
    const allowExternalCognition =
      authenticated && dependencies.hasExternalAiKey();

    const internalResult = await dependencies.analyze(body.input, {
      allowExternalCognition,
    });

    const fallbackUsed =
      internalResult.analysis.intelligence?.cognitionMode === "fallback";

    const result = internalResult;

    const structuredReasoningUsed = allowExternalCognition && !fallbackUsed;

    return NextResponse.json({
      ok: true,
      result,
      reasoningMode: structuredReasoningUsed
        ? "structured-ai"
        : "deterministic-fallback",
      analysisAvailable: structuredReasoningUsed,
      authenticated,
    });
  } catch {
    console.error("Small Claims analysis route failed.");
    return errorResponse(
      "CourtSimplified could not analyze this intake right now.",
      500,
    );
  }
  };
}

export const POST = createSmallClaimsAnalyzePost();
