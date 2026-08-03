import { NextRequest, NextResponse } from "next/server";

import { runAiCasePartnerGateway } from "@/src/lib/case-system/ai-case-partner/aiCasePartnerGateway";
import type { AiCasePartnerCourtContextInput } from "@/src/lib/case-system/ai-case-partner/aiCasePartnerOrchestrator";
import { CasePartnerConversationMessage } from "@/src/lib/case-system/ai-case-partner/conversationIntelligenceEngine";

export const runtime = "nodejs";

type RequestBody = {
  caseId?: string;
  message?: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  courtContext?: AiCasePartnerCourtContextInput;
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
  return `ai_case_partner_${Date.now()}_${Math.random()
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

function buildDevelopmentError(error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }

  if (error instanceof Error) {
    const detailedError = error as ErrorWithDetails;

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: detailedError.code,
      stage: detailedError.stage,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export async function POST(request: NextRequest) {
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

    const result = runAiCasePartnerGateway({
      caseId: caseId || undefined,
      message,
      conversation,
      caseMemory: body.caseMemory,
      courtContext: body.courtContext,
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

    console.info("AI Case Partner request completed", {
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

    console.error("AI Case Partner route error", {
      diagnosticId,
      stage: detailedError?.stage || "route-or-gateway",
      durationMs: Date.now() - requestStartedAt,
      error,
    });

    return jsonResponse(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? detailedError?.message ||
              "Unexpected AI Case Partner error."
            : "CourtSimplified could not complete this request.",
        diagnosticId,
        failedStage:
          detailedError?.stage || "route-or-gateway",
        developmentDetails: buildDevelopmentError(error),
      },
      500,
    );
  }
}
