import { NextRequest, NextResponse } from "next/server";
import { CLAIM_TYPES } from "@/src/lib/case-system/intake/claimTypes";
import { withAiCallIdentity } from "../../../../src/lib/audit/aiCallLog";

import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsIntelligenceOutput,
  type SmallClaimsIntelligenceInput,
} from "@/src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import {
  getAuthenticatedOwnedCaseEvents,
  getAuthenticatedUser,
} from "@/src/lib/supabase/serverAuth";
import {
  liveCaseEvents,
  toProceduralEvents,
} from "@/src/lib/case-system/events/caseEventAdapter";
import { UUID_PATTERN } from "@/src/lib/case-system/events/caseEventRequest";
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

/*
 * "name" was here until 2026-09-23. This is a STRICT allowlist -- isEvidenceFile
 * rejects any unknown key and requires an exact field count -- so leaving it
 * would have done two wrong things at once: rejected every payload carrying the
 * new neutral `reference`, and accepted one carrying a file name.
 *
 * With it replaced, the route refuses a body that still sends a name. That
 * makes it a second control behind the structural one in
 * src/lib/case-system/evidence/evidenceReference.ts, the same way
 * app/api/civil/analyze/route.ts is.
 */
const evidenceStringFields = [
  "id",
  "reference",
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
  "confirmedClaimTypeId",
  "elementStates",
  ...requiredStringFields,
]);

const ELEMENT_RECORD_STATES = new Set(["provided", "cannot-provide", "not-yet"]);

/**
 * The two optional catalogue fields (2026-09-29). Both absent is valid. When
 * present, the claim type must be a real catalogue id, and every element state
 * must name one of THAT claim type's elements with one of the three states --
 * never free text, so nothing new reaches the model or the case file this way.
 */
function isValidCatalogueClaim(value: Record<string, unknown>): boolean {
  const id = value.confirmedClaimTypeId;
  const states = value.elementStates;
  if (id === undefined) return states === undefined;
  if (typeof id !== "string") return false;
  const claimType = CLAIM_TYPES.find((item) => item.id === id);
  if (!claimType) return false;
  if (states === undefined) return true;
  if (!isRecord(states)) return false;
  const elementIds = new Set(claimType.plaintiffElements.map((element) => element.id));
  return Object.entries(states).every(
    ([elementId, state]) => elementIds.has(elementId) && typeof state === "string" && ELEMENT_RECORD_STATES.has(state),
  );
}

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

  if (!isValidCatalogueClaim(value)) return false;
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
  loadCaseEvents: typeof getAuthenticatedOwnedCaseEvents;
};

export function createSmallClaimsAnalyzePost(
  overrides: Partial<SmallClaimsRouteDependencies> = {},
) {
  const dependencies: SmallClaimsRouteDependencies = {
    authenticate: getAuthenticatedUser,
    analyze: analyzeSmallClaimsWithBrain,
    hasExternalAiKey: hasConfiguredServerAi,
    loadCaseEvents: getAuthenticatedOwnedCaseEvents,
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

  if (
    !isRecord(body) ||
    Object.keys(body).some((key) => key !== "input" && key !== "caseId")
  ) {
    return errorResponse("A valid Small Claims intake payload is required.", 400);
  }

  // Optional. When present it is the case whose confirmed events the analysis
  // should see. It is never trusted as identity: the events are loaded through
  // the ownership check, and a caseId the caller does not own yields [].
  const caseId =
    typeof body.caseId === "string" && UUID_PATTERN.test(body.caseId)
      ? body.caseId
      : "";

  if (body.caseId !== undefined && !caseId) {
    return errorResponse("A valid selected case is required.", 400);
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

  // Bound here rather than read inside the closure below: the narrowing from
  // isSmallClaimsInput does not survive into an arrow function.
  const validatedInput = body.input;

  try {
    const user = await dependencies.authenticate(request);
    const authenticated = Boolean(user);
    const allowExternalCognition =
      authenticated && dependencies.hasExternalAiKey();

    // The events the user has CONFIRMED, threaded into the analysis.
    //
    // Before this, nothing in app/ supplied `confirmedEvents`: the parameter
    // existed the whole way down to buildProceduralState and every run
    // received []. Confirming an event changed the timeline screen and nothing
    // else — not form routing, not stage, not deadlines.
    //
    // Retracted and superseded rows are filtered out here rather than passed
    // on. `liveCaseEvents` is the single definition of what still stands, and
    // an analysis must not route off an event the user took back.
    const confirmedEvents =
      user && caseId
        ? toProceduralEvents(
            liveCaseEvents(
              await dependencies.loadCaseEvents(request, user, caseId),
            ),
          )
        : [];

    /*
     * LSO Step 7, corrected 2026-09-23.
     *
     * Every audit row was landing with user_id and case_id NULL, because the
     * six call sites that open an audit context are library functions two or
     * three layers below here and none of them knows who is asking. This route
     * does. `withAiCallIdentity` puts it in scope for every model call made
     * underneath, at any depth, without threading the ids through functions
     * that have no use for them.
     *
     * Both may legitimately be null: this route serves unauthenticated callers
     * (they just get the deterministic path), and a case id is optional.
     */
    const internalResult = await withAiCallIdentity(
      { userId: user?.id ?? null, caseId },
      () =>
        dependencies.analyze(validatedInput, {
          allowExternalCognition,
          confirmedEvents,
        }),
    );

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
