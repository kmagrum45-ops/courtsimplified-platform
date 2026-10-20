import { withConfirmedGuidance } from "@/src/lib/security/intakeGuidanceGate";
import { NextRequest, NextResponse } from "next/server";
import { aiLimitResponse } from "@/src/lib/security/aiRouteGuard";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { readCasePosition } from "@/src/lib/case-system/casePosition";

import { runGuidedAssistantGateway } from "@/src/lib/case-system/guided-assistant/guidedAssistantGateway";
import type { GuidedAssistantCourtContextInput } from "@/src/lib/case-system/guided-assistant/guidedAssistantOrchestrator";
import { CasePartnerConversationMessage } from "@/src/lib/case-system/guided-assistant/conversationIntelligenceEngine";

export const runtime = "nodejs";

type RequestBody = {
  caseId?: string;
  message?: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  courtContext?: GuidedAssistantCourtContextInput;
  mode?: string;
};

type ErrorWithDetails = Error & {
  code?: string;
  stage?: string;
  diagnosticId?: string;
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createDiagnosticId(): string {
  return `guided_assistant_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function estimateJsonSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return -1;
  }
}

function sanitizeConversation(
  conversation: unknown,
): CasePartnerConversationMessage[] {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation
    .filter(
      (item): item is CasePartnerConversationMessage =>
        Boolean(
          item &&
            typeof item === "object" &&
            "role" in item &&
            "content" in item &&
            (item.role === "user" ||
              item.role === "assistant" ||
              item.role === "system") &&
            typeof item.content === "string" &&
            item.content.trim().length > 0,
        ),
    )
    .slice(-20)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 6000),
    }));
}

/** The same owned-case handler supports dependency-injected offline contract tests. */
export function createGuidedAssistantPost(overrides: Partial<{ authenticate: typeof getAuthenticatedUser; owned: typeof getAuthenticatedOwnedCase }> = {}) {
const dependencies = { authenticate: getAuthenticatedUser, owned: getAuthenticatedOwnedCase, ...overrides };
return async function postGuidance(request: NextRequest) {
  // Per-visitor and daily AI limits (2026-10-14 audit, aiRateLimit.ts).
  const limited = await aiLimitResponse(request, "light");
  if (limited) return limited;

  const diagnosticId = createDiagnosticId();
  const requestStartedAt = Date.now();

  try {
    const body = (await request.json()) as RequestBody;

    const message = cleanString(body.message);
    const caseId = cleanString(body.caseId);
    const mode = cleanString(body.mode);
    const conversation = sanitizeConversation(body.conversation);

    if (!message) {
      return jsonResponse(
        {
          ok: false,
          error: "Message is required.",
          diagnosticId,
        },
        400,
      );
    }

    const requestDiagnostics = {
      diagnosticId,
      receivedAt: new Date().toISOString(),
      messageCharacters: message.length,
      conversationMessages: conversation.length,
      conversationCharacters: conversation.reduce(
        (total, item) => total + item.content.length,
        0,
      ),
      caseMemoryBytes: estimateJsonSize(body.caseMemory),
      courtContextPresent: Boolean(body.courtContext),
      mode: mode || "unspecified",
      caseIdPresent: Boolean(caseId),
    };

    const gatewayStartedAt = Date.now();
    const user = await dependencies.authenticate(request);
    const owned = user ? await dependencies.owned(request, user, caseId) : null;
    if (!owned) return jsonResponse({ ok: false, error: "The selected case is unavailable." }, 404);
    const master = owned.master_result && typeof owned.master_result === "object" ? owned.master_result as Record<string, unknown> : {};
    const intake = master.intakeData && typeof master.intakeData === "object" ? master.intakeData as Record<string, unknown> : {};

    const result = runGuidedAssistantGateway({
      caseId: caseId || undefined,
      message,
      conversation,
      caseMemory: { caseData: intake, masterResult: master, path: owned.court_path },
      courtContext: { courtPath: owned.court_path ?? undefined, jurisdiction: "Ontario", stage: readCasePosition(master, owned.court_path).confirmedStage ?? String(intake.caseStage ?? "not-sure") },
      mode: mode || undefined,
      diagnosticId,
    });

    const gatewayDurationMs = Date.now() - gatewayStartedAt;

    /*
     * Do not return the complete gateway result again under a nested `result`
     * property. That duplicated the intelligence, memory, investigation and
     * reasoning packages and caused the response to grow unnecessarily large.
     */
    const responsePayload = {
      ok: true,

      userFacingAnswer: result.userFacingAnswer,
      answer: result.answer,

      courtContext: result.courtContext,
      caseMemory: result.caseMemory,

      conversationIntelligence: result.conversationIntelligence,
      conversationMemory: result.conversationMemory,
      caseInvestigation: result.caseInvestigation,

      gateway: result.gateway,

      diagnostics: {
        ...requestDiagnostics,
        gatewayDurationMs,
        totalDurationMs: Date.now() - requestStartedAt,
        responseBytes: 0,
      },
    };

    responsePayload.diagnostics.responseBytes =
      estimateJsonSize(responsePayload);

    console.info("guided assistant request completed", {
      diagnosticId,
      gatewayDurationMs,
      totalDurationMs: responsePayload.diagnostics.totalDurationMs,
      responseBytes: responsePayload.diagnostics.responseBytes,
      conversationMessages: conversation.length,
      conversationCharacters:
        requestDiagnostics.conversationCharacters,
    });

    return jsonResponse(responsePayload);
  } catch (error) {
    const detailedError = error as ErrorWithDetails;

    console.error("guided assistant route error", {
      diagnosticId,
      stage: detailedError?.stage || "route-or-gateway",
      durationMs: Date.now() - requestStartedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: detailedError?.code || "unknown",
    });

    return jsonResponse(
      {
        ok: false,
        error: "Your case details were saved. Continue with the next review step while analysis is unavailable.",
      },
      500,
    );
  }
}

}
export const POST = withConfirmedGuidance(createGuidedAssistantPost(), { currentAnalysis: true });
