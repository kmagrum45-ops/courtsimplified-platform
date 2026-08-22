import { NextRequest, NextResponse } from "next/server";

import {
  runCivilIntakeCanonicalIntegration,
  type CivilCanonicalIntakeInput,
} from "@/src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import {
  getAuthenticatedOwnedCaseMasterResult,
  getAuthenticatedUser,
} from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 200_000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_SHORT_TEXT_LENGTH = 1_000;
const MAX_ARRAY_ITEMS = 50;
const allowedStages = new Set(["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"]);
const allowedRoles = new Set(["plaintiff", "defendant", "applicant", "respondent", "moving-party", "responding-party", "other", "not-sure"]);
const allowedIssues = new Set(["contract", "negligence", "institutional-negligence", "professional-negligence", "human-rights", "disability-accommodation", "employment-human-rights", "housing-human-rights", "education-human-rights", "charter", "government-public-authority", "police-conduct", "judicial-review", "tribunal-overlap", "defamation", "privacy", "property", "debt", "employment", "fraud-misrepresentation", "intentional-tort", "injunction", "estate", "motion", "appeal", "enforcement", "other"]);
const allowedDocuments = new Set(["statement-claim", "statement-defence", "notice-application", "notice-motion", "affidavit-service", "affidavit", "order", "judgment", "tribunal-application", "human-rights-application", "judicial-review-materials", "demand-letter", "discovery", "trial-record", "nothing", "not-sure"]);
const allowedFields = new Set(["caseId", "caseStage", "issues", "documents", "uploadedEvidenceFiles", "yourName", "otherParty", "yourRole", "courtLocation", "courtFileNumber", "amountClaimed", "limitationDeadline", "facts", "timeline", "evidence", "missingEvidence", "damagesBreakdown", "legalRemedy", "settlementEfforts", "serviceDetails", "urgent", "humanRightsGrounds", "discriminationFacts", "accommodationRequests", "governmentActor", "publicDecisionOrConduct", "institutionalFacts", "privacyRecordsFacts"]);
const longFields = new Set(["facts", "timeline", "evidence", "missingEvidence", "damagesBreakdown", "legalRemedy", "settlementEfforts", "serviceDetails", "urgent", "humanRightsGrounds", "discriminationFacts", "accommodationRequests", "publicDecisionOrConduct", "institutionalFacts", "privacyRecordsFacts"]);
const uploadFields = new Set(["id", "name", "size", "type", "lastModified", "title", "description", "relatedIssue", "evidenceDate", "createdBy", "whyItMatters"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function bounded(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isUpload(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).some((key) => !uploadFields.has(key))) return false;
  return Object.entries(value).every(([key, item]) => {
    if (key === "size" || key === "lastModified") return typeof item === "number" && Number.isFinite(item) && item >= 0;
    return bounded(item, key === "description" || key === "whyItMatters" ? MAX_TEXT_LENGTH : MAX_SHORT_TEXT_LENGTH);
  }) && uploadFields.size === Object.keys(value).length;
}

export function isCivilInput(value: unknown): value is CivilCanonicalIntakeInput {
  if (!isRecord(value) || Object.keys(value).some((key) => !allowedFields.has(key))) return false;
  if ([...allowedFields].some((key) => key !== "caseId" && !(key in value))) return false;
  if (!allowedStages.has(String(value.caseStage)) || !allowedRoles.has(String(value.yourRole))) return false;
  if (!Array.isArray(value.issues) || value.issues.length > MAX_ARRAY_ITEMS || !value.issues.every((item) => bounded(item, MAX_SHORT_TEXT_LENGTH) && allowedIssues.has(item))) return false;
  if (!Array.isArray(value.documents) || value.documents.length > MAX_ARRAY_ITEMS || !value.documents.every((item) => bounded(item, MAX_SHORT_TEXT_LENGTH) && allowedDocuments.has(item))) return false;
  if (!Array.isArray(value.uploadedEvidenceFiles) || value.uploadedEvidenceFiles.length > MAX_ARRAY_ITEMS || !value.uploadedEvidenceFiles.every(isUpload)) return false;
  return Object.entries(value).every(([key, item]) => {
    if (key === "issues" || key === "documents" || key === "uploadedEvidenceFiles") return true;
    return bounded(item, longFields.has(key) ? MAX_TEXT_LENGTH : MAX_SHORT_TEXT_LENGTH);
  });
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type CivilRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  loadOwnedMasterResult: typeof getAuthenticatedOwnedCaseMasterResult;
  analyze: typeof runCivilIntakeCanonicalIntegration;
  hasExternalAiKey: () => boolean;
};

export function createCivilAnalyzePost(
  overrides: Partial<CivilRouteDependencies> = {},
) {
  const dependencies: CivilRouteDependencies = {
    authenticate: getAuthenticatedUser,
    loadOwnedMasterResult: getAuthenticatedOwnedCaseMasterResult,
    analyze: runCivilIntakeCanonicalIntegration,
    hasExternalAiKey: hasConfiguredServerAi,
    ...overrides,
  };

  return async function civilAnalyzePost(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return errorResponse("The Civil intake is too large to analyze.", 413);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("A valid Civil intake payload is required.", 400); }
  if (!isRecord(body) || Object.keys(body).some((key) => key !== "input")) return errorResponse("A valid Civil intake payload is required.", 400);
  const serialized = JSON.stringify(body.input);
  if (!serialized) return errorResponse("A complete Civil intake is required.", 400);
  if (serialized.length > MAX_REQUEST_BYTES) return errorResponse("The Civil intake is too large to analyze.", 413);
  if (!isCivilInput(body.input)) return errorResponse("A complete Civil intake is required.", 400);

  try {
    const user = await dependencies.authenticate(request);
    const authenticated = Boolean(user);
    let existingMasterResult: unknown = {};
    if (user && body.input.caseId) {
      existingMasterResult = await dependencies.loadOwnedMasterResult(
        request,
        user,
        body.input.caseId,
      );
      if (existingMasterResult === null) {
        return errorResponse("The selected Civil case could not be found.", 404);
      }
    }
    const allowExternalCognition =
      authenticated && dependencies.hasExternalAiKey();
    const result = await dependencies.analyze(body.input, {
      allowExternalCognition,
      existingMasterResult,
    });
    const fallbackUsed = result.brain.intelligence.cognitionMode === "fallback";
    const analysisAvailable = allowExternalCognition && !fallbackUsed;
    return NextResponse.json({ ok: true, result, authenticated, reasoningMode: analysisAvailable ? "structured-ai" : "deterministic-fallback", analysisAvailable });
  } catch {
    console.error("Civil canonical intake analysis failed.");
    return errorResponse("Civil intake analysis could not be completed.", 500);
  }
  };
}

export const POST = createCivilAnalyzePost();
