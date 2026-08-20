import {
  runAiCasePartnerOrchestrator,
  AiCasePartnerOrchestratorInput,
  AiCasePartnerOrchestratorResult,
} from "./aiCasePartnerOrchestrator";

export type AiCasePartnerGatewayVersion = "1.1.0";

export type AiCasePartnerGatewayInput =
  AiCasePartnerOrchestratorInput & {
    diagnosticId?: string;
  };

export type AiCasePartnerGatewayResult =
  AiCasePartnerOrchestratorResult & {
    gateway: {
      version: AiCasePartnerGatewayVersion;
      modelProvider: "internal-orchestrator";
      externalModelUsed: false;
      generatedAt: string;
      diagnosticId: string;
      durationMs: number;
      inputMetrics: {
        messageCharacters: number;
        conversationMessages: number;
        conversationCharacters: number;
        caseMemoryBytes: number;
      };
    };
  };

type GatewayError = Error & {
  stage?: string;
  diagnosticId?: string;
  cause?: unknown;
};

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createDiagnosticId(): string {
  return `gateway_${Date.now()}_${Math.random()
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

function buildGatewayError(args: {
  error: unknown;
  diagnosticId: string;
}): GatewayError {
  const original =
    args.error instanceof Error
      ? args.error
      : new Error(String(args.error));

  const gatewayError = new Error(
    original.message ||
      "AI Case Partner gateway failed.",
  ) as GatewayError;

  gatewayError.name = "AiCasePartnerGatewayError";
  gatewayError.stage =
    (original as GatewayError).stage || "gateway";
  gatewayError.diagnosticId = args.diagnosticId;
  gatewayError.cause = original;
  gatewayError.stack = original.stack || gatewayError.stack;

  return gatewayError;
}

export function runAiCasePartnerGateway(
  input: AiCasePartnerGatewayInput,
): AiCasePartnerGatewayResult {
  const diagnosticId =
    clean(input.diagnosticId) || createDiagnosticId();

  const startedAt = Date.now();
  const message = clean(input.message);
  const conversation = input.conversation || [];

  const inputMetrics = {
    messageCharacters: message.length,
    conversationMessages: conversation.length,
    conversationCharacters: conversation.reduce(
      (total, item) => total + clean(item.content).length,
      0,
    ),
    caseMemoryBytes: estimateJsonSize(input.caseMemory),
  };

  try {
    const result = runAiCasePartnerOrchestrator({
      caseId: input.caseId,
      message,
      conversation,
      caseMemory: input.caseMemory,
      courtContext: input.courtContext,
      mode: input.mode,
      diagnosticId,
    });

    return {
      ...result,

      gateway: {
        version: "1.1.0",
        modelProvider: "internal-orchestrator",
        externalModelUsed: false,
        generatedAt: nowIso(),
        diagnosticId,
        durationMs: Date.now() - startedAt,
        inputMetrics,
      },
    };
  } catch (error) {
    console.error("AI Case Partner gateway failed", {
      diagnosticId,
      durationMs: Date.now() - startedAt,
      inputMetrics,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    throw buildGatewayError({
      error,
      diagnosticId,
    });
  }
}
