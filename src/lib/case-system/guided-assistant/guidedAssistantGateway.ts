import {
  runGuidedAssistantOrchestrator,
  GuidedAssistantOrchestratorInput,
  GuidedAssistantOrchestratorResult,
} from "./guidedAssistantOrchestrator";

export type GuidedAssistantGatewayVersion = "1.1.0";

export type GuidedAssistantGatewayInput =
  GuidedAssistantOrchestratorInput & {
    diagnosticId?: string;
  };

export type GuidedAssistantGatewayResult =
  GuidedAssistantOrchestratorResult & {
    gateway: {
      version: GuidedAssistantGatewayVersion;
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
      "guided assistant gateway failed.",
  ) as GatewayError;

  gatewayError.name = "GuidedAssistantGatewayError";
  gatewayError.stage =
    (original as GatewayError).stage || "gateway";
  gatewayError.diagnosticId = args.diagnosticId;
  gatewayError.cause = original;
  gatewayError.stack = original.stack || gatewayError.stack;

  return gatewayError;
}

export function runGuidedAssistantGateway(
  input: GuidedAssistantGatewayInput,
): GuidedAssistantGatewayResult {
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
    const result = runGuidedAssistantOrchestrator({
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
    console.error("guided assistant gateway failed", {
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
