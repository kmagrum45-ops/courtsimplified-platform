import { NextRequest, NextResponse } from "next/server";

import { runAiCasePartnerGateway } from "@/src/lib/case-system/ai-case-partner/aiCasePartnerGateway";
import { CasePartnerConversationMessage } from "@/src/lib/case-system/ai-case-partner/conversationIntelligenceEngine";

export const runtime = "nodejs";

type RequestBody = {
  caseId?: string;
  message?: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  mode?: string;
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeConversation(
  conversation: unknown,
): CasePartnerConversationMessage[] {
  if (!Array.isArray(conversation)) return [];

  return conversation
    .filter(
      (item): item is CasePartnerConversationMessage =>
        item &&
        typeof item === "object" &&
        "role" in item &&
        "content" in item &&
        (item.role === "user" ||
          item.role === "assistant" ||
          item.role === "system") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-20)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 6000),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    const message = cleanString(body.message);
    const caseId = cleanString(body.caseId);
    const mode = cleanString(body.mode);

    if (!message) {
      return jsonResponse(
        {
          ok: false,
          error: "Message is required.",
        },
        400,
      );
    }

    const conversation = sanitizeConversation(body.conversation);

    const result = runAiCasePartnerGateway({
      caseId: caseId || undefined,
      message,
      conversation,
      caseMemory: body.caseMemory,
      mode: mode || undefined,
    });

    return jsonResponse({
      ok: true,

      userFacingAnswer: result.userFacingAnswer,
      answer: result.answer,

      caseMemory: result.caseMemory,

      conversationIntelligence: result.conversationIntelligence,
      conversationMemory: result.conversationMemory,
      caseInvestigation: result.caseInvestigation,

      gateway: result.gateway,

      result,
    });
  } catch (error) {
    console.error("AI Case Partner route error:", error);

    return jsonResponse(
      {
        ok: false,
        error: "Unexpected AI Case Partner error.",
      },
      500,
    );
  }
}