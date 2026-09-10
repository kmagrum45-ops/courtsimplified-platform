import { NextRequest, NextResponse } from "next/server";

import {
  resolveClaimTypeSuggestion,
  type ClaimTypeSuggestionResolution,
} from "@/src/lib/case-system/intake/claimTypeSuggestionResolution";
import { KNOWN_FACT_FIELDS } from "@/src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES, type ClaimType } from "@/src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "@/src/lib/case-system/intake/selectQuestions";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * Session 37 (f034748 follow-up). Resolves a pending AI claim-type
 * suggestion (orchestrateIntakeTurn.ts's `suggestedClaimType`) after the
 * user confirms or rejects it -- see claimTypeSuggestionResolution.ts for
 * why this is its own dedicated step rather than another guided-turn
 * field: confirming/rejecting doesn't re-run the safety pass, extraction,
 * or question selection, it only resolves the one pending suggestion
 * against the same story text it was made from.
 *
 * Same auth/validation/dependency-injection conventions as
 * app/api/intake/guided-turn/route.ts -- not a new pattern.
 */

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 50_000;
const MAX_STORY_TEXT_LENGTH = 8_000;
const MAX_FACT_STRING_LENGTH = 1_200;
const MAX_ID_LENGTH = 200;

const KNOWN_FACT_FIELD_SET = new Set<string>(KNOWN_FACT_FIELDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isIntakeFacts(value: unknown): value is IntakeFacts {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, fieldValue]) => {
    if (!KNOWN_FACT_FIELD_SET.has(key)) return false;
    if (typeof fieldValue === "boolean" || typeof fieldValue === "number") return true;
    return typeof fieldValue === "string" && fieldValue.length <= MAX_FACT_STRING_LENGTH;
  });
}

const SUPPORTED_COURT_AREAS = ["small-claims"] as const;
type SupportedCourtArea = (typeof SUPPORTED_COURT_AREAS)[number];

function isSupportedCourtArea(value: unknown): value is SupportedCourtArea {
  return typeof value === "string" && (SUPPORTED_COURT_AREAS as readonly string[]).includes(value);
}

const COURT_AREA_CONTENT: Record<SupportedCourtArea, { claimTypes: readonly ClaimType[] }> = {
  "small-claims": { claimTypes: CLAIM_TYPES },
};

type ClassifyClaimTypeRequestBody = {
  storyText: string;
  facts: IntakeFacts;
  action: "confirm" | "reject";
  claimTypeId: string;
  priorRejectedIds?: string[];
  courtArea?: SupportedCourtArea;
};

function isClassifyClaimTypeRequestBody(value: unknown): value is ClassifyClaimTypeRequestBody {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(["storyText", "facts", "action", "claimTypeId", "priorRejectedIds", "courtArea"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;

  if (typeof value.storyText !== "string" || value.storyText.length === 0 || value.storyText.length > MAX_STORY_TEXT_LENGTH) {
    return false;
  }
  if (!isIntakeFacts(value.facts)) return false;
  if (value.action !== "confirm" && value.action !== "reject") return false;
  if (typeof value.claimTypeId !== "string" || value.claimTypeId.length === 0 || value.claimTypeId.length > MAX_ID_LENGTH) {
    return false;
  }
  if (value.priorRejectedIds !== undefined) {
    if (
      !Array.isArray(value.priorRejectedIds) ||
      value.priorRejectedIds.length > 5 ||
      !value.priorRejectedIds.every((id) => typeof id === "string" && id.length <= MAX_ID_LENGTH)
    ) {
      return false;
    }
  }
  if (value.courtArea !== undefined && !isSupportedCourtArea(value.courtArea)) return false;

  return true;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type ClassifyClaimTypeRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  resolve: typeof resolveClaimTypeSuggestion;
  hasExternalAiKey: () => boolean;
};

export function createClassifyClaimTypePost(overrides: Partial<ClassifyClaimTypeRouteDependencies> = {}) {
  const dependencies: ClassifyClaimTypeRouteDependencies = {
    authenticate: getAuthenticatedUser,
    resolve: resolveClaimTypeSuggestion,
    hasExternalAiKey: hasConfiguredServerAi,
    ...overrides,
  };

  return async function classifyClaimTypePost(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return errorResponse("The claim-type confirmation payload is too large.", 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("A valid claim-type confirmation payload is required.", 400);
    }

    if (!isClassifyClaimTypeRequestBody(body)) {
      return errorResponse("A valid claim-type confirmation payload is required.", 400);
    }

    try {
      const authenticated = Boolean(await dependencies.authenticate(request));
      if (!authenticated) {
        return errorResponse("Sign in required to confirm a claim-type suggestion.", 401);
      }

      if (!dependencies.hasExternalAiKey()) {
        return errorResponse("Claim-type confirmation is not available right now.", 503);
      }
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return errorResponse("Claim-type confirmation is not available right now.", 503);
      }

      const courtArea = body.courtArea ?? "small-claims";
      const { claimTypes } = COURT_AREA_CONTENT[courtArea];

      const result: ClaimTypeSuggestionResolution = await dependencies.resolve(
        body.action,
        body.storyText,
        claimTypes,
        body.facts,
        apiKey,
        body.claimTypeId,
        body.priorRejectedIds ?? [],
      );

      return NextResponse.json({ ok: true, result, authenticated });
    } catch {
      console.error("Claim-type confirmation route failed.");
      return errorResponse("CourtSimplified could not process this claim-type confirmation right now.", 500);
    }
  };
}

export const POST = createClassifyClaimTypePost();
