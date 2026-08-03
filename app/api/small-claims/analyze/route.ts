import { NextRequest, NextResponse } from "next/server";

import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsIntelligenceInput,
} from "@/src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 200_000;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isStringArray(value: unknown, limit: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= limit &&
    value.every((item) => typeof item === "string")
  );
}

function isEvidenceFile(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    evidenceStringFields.every((field) => typeof value[field] === "string") &&
    typeof value.size === "number" &&
    Number.isFinite(value.size) &&
    value.size >= 0 &&
    typeof value.lastModified === "number" &&
    Number.isFinite(value.lastModified)
  );
}

function isSmallClaimsInput(
  value: unknown,
): value is SmallClaimsIntelligenceInput {
  if (!isRecord(value)) return false;

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

  return requiredStringFields.every(
    (field) => typeof value[field] === "string",
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "The Small Claims intake is too large to analyze.",
        },
        { status: 413 },
      );
    }

    const body = (await request.json()) as { input?: unknown };

    if (!isSmallClaimsInput(body.input)) {
      return NextResponse.json(
        {
          ok: false,
          error: "A complete Small Claims intake is required.",
        },
        { status: 400 },
      );
    }

    if (JSON.stringify(body.input).length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "The Small Claims intake is too large to analyze.",
        },
        { status: 413 },
      );
    }

    const authenticated = Boolean(await getAuthenticatedUser(request));
    const allowExternalCognition =
      authenticated && Boolean(process.env.OPENAI_API_KEY);

    const result = await analyzeSmallClaimsWithBrain(body.input, {
      allowExternalCognition,
    });

    const fallbackUsed = (result.analysis.intelligenceWarnings || []).some(
      (warning) =>
        warning.toLowerCase().includes("structured gpt cognition was unavailable"),
    );

    return NextResponse.json({
      ok: true,
      result,
      reasoningMode:
        allowExternalCognition && !fallbackUsed
          ? "structured-ai"
          : "deterministic-fallback",
      authenticated,
    });
  } catch (error) {
    console.error("Small Claims analysis route failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "CourtSimplified could not analyze this intake right now.",
      },
      { status: 500 },
    );
  }
}
