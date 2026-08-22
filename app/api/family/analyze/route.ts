import { NextRequest, NextResponse } from "next/server";

import { runFamilyIntakeCanonicalIntegration } from "@/src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import type { FamilyMasterCaseInput } from "@/src/lib/case-system/familyMasterCaseEngine";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 200_000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_SHORT_TEXT_LENGTH = 1_000;
const MAX_ARRAY_ITEMS = 50;
const MAX_UPLOADS = 50;

const allowedStages = new Set([
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "urgent",
  "not-sure",
]);

const allowedRoles = new Set([
  "applicant",
  "respondent",
  "joint-applicant",
  "third-party-caregiver",
  "not-sure",
]);

const allowedInputFields = new Set([
  "caseStage",
  "role",
  "relationshipStatus",
  "issues",
  "filedDocuments",
  "completedForms",
  "receivedForms",
  "yourName",
  "otherParty",
  "childrenInfo",
  "currentLivingSituation",
  "pastLivingHistory",
  "facts",
  "timeline",
  "evidence",
  "missingEvidence",
  "goal",
  "urgent",
  "safetyConcerns",
  "propertyHomeDetails",
  "upcomingCourtDate",
  "adoptionDetails",
  "financialDisclosure",
  "parentingSchedule",
  "communicationHistory",
  "policeInvolvement",
  "childProtectionInvolvement",
  "schoolIssues",
  "medicalIssues",
  "relocationDetails",
  "existingOrders",
  "settlementHistory",
  "adoptionDetails",
  "uploadedFiles",
]);

const longTextFields = new Set([
  "childrenInfo",
  "currentLivingSituation",
  "pastLivingHistory",
  "facts",
  "timeline",
  "evidence",
  "missingEvidence",
  "goal",
  "urgent",
  "safetyConcerns",
  "propertyHomeDetails",
  "financialDisclosure",
  "parentingSchedule",
  "communicationHistory",
  "policeInvolvement",
  "childProtectionInvolvement",
  "schoolIssues",
  "medicalIssues",
  "relocationDetails",
  "existingOrders",
  "settlementHistory",
]);

const arrayFields = new Set([
  "issues",
  "filedDocuments",
  "completedForms",
  "receivedForms",
]);

const allowedUploadFields = new Set([
  "id",
  "fileName",
  "originalName",
  "mimeType",
  "sizeBytes",
  "title",
  "description",
  "category",
  "source",
  "notes",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_ARRAY_ITEMS &&
    value.every((item) => isBoundedString(item, MAX_SHORT_TEXT_LENGTH))
  );
}

function isUpload(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((field) => !allowedUploadFields.has(field))) {
    return false;
  }
  if (
    !isBoundedString(value.id, MAX_SHORT_TEXT_LENGTH) ||
    !isBoundedString(value.fileName, MAX_SHORT_TEXT_LENGTH) ||
    !isBoundedString(value.mimeType, MAX_SHORT_TEXT_LENGTH) ||
    typeof value.sizeBytes !== "number" ||
    !Number.isFinite(value.sizeBytes) ||
    value.sizeBytes < 0
  ) {
    return false;
  }

  return Object.entries(value).every(([field, fieldValue]) => {
    if (field === "sizeBytes") {
      return (
        typeof fieldValue === "number" &&
        Number.isFinite(fieldValue) &&
        fieldValue >= 0
      );
    }

    return isBoundedString(
      fieldValue,
      field === "description" || field === "notes"
        ? MAX_TEXT_LENGTH
        : MAX_SHORT_TEXT_LENGTH,
    );
  });
}

export function isFamilyInput(value: unknown): value is FamilyMasterCaseInput {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((field) => !allowedInputFields.has(field))) {
    return false;
  }
  if (!allowedStages.has(String(value.caseStage))) return false;
  if (value.role !== undefined && !allowedRoles.has(String(value.role))) {
    return false;
  }

  for (const [field, fieldValue] of Object.entries(value)) {
    if (field === "uploadedFiles") {
      if (
        !Array.isArray(fieldValue) ||
        fieldValue.length > MAX_UPLOADS ||
        !fieldValue.every(isUpload)
      ) {
        return false;
      }
    } else if (arrayFields.has(field)) {
      if (!isStringArray(fieldValue)) return false;
    } else if (
      !isBoundedString(
        fieldValue,
        longTextFields.has(field) ? MAX_TEXT_LENGTH : MAX_SHORT_TEXT_LENGTH,
      )
    ) {
      return false;
    }
  }

  return true;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return errorResponse("The Family intake is too large to analyze.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("A valid Family intake payload is required.", 400);
  }

  if (!isRecord(body) || Object.keys(body).some((key) => key !== "input")) {
    return errorResponse("A valid Family intake payload is required.", 400);
  }

  const serializedInput = JSON.stringify(body.input);
  if (!serializedInput) {
    return errorResponse("A complete Family intake is required.", 400);
  }
  if (serializedInput.length > MAX_REQUEST_BYTES) {
    return errorResponse("The Family intake is too large to analyze.", 413);
  }

  if (!isFamilyInput(body.input)) {
    return errorResponse("A complete Family intake is required.", 400);
  }

  try {
    const authenticated = Boolean(await getAuthenticatedUser(request));
    const allowExternalCognition =
      authenticated && hasConfiguredServerAi();
    const result = await runFamilyIntakeCanonicalIntegration(body.input, {
      allowExternalCognition,
    });
    const fallbackUsed = result.brain.intelligence.cognitionMode === "fallback";

    return NextResponse.json({
      ok: true,
      result,
      authenticated,
      reasoningMode:
        allowExternalCognition && !fallbackUsed
          ? "structured-ai"
          : "deterministic-fallback",
      analysisAvailable: allowExternalCognition && !fallbackUsed,
    });
  } catch {
    console.error("Family canonical intake analysis failed.");
    return errorResponse("Family intake analysis could not be completed.", 500);
  }
}
