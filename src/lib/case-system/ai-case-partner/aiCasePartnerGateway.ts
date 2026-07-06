import {
  runAiCasePartnerOrchestrator,
  AiCasePartnerOrchestratorInput,
  AiCasePartnerOrchestratorResult,
} from "./aiCasePartnerOrchestrator";

export type AiCasePartnerGatewayVersion = "1.0.0";

export type AiCasePartnerGatewayInput = AiCasePartnerOrchestratorInput;

export type AiCasePartnerGatewayResult = AiCasePartnerOrchestratorResult & {
  gateway: {
    version: AiCasePartnerGatewayVersion;
    modelProvider: "internal-orchestrator";
    externalModelUsed: false;
    generatedAt: string;
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function runAiCasePartnerGateway(
  input: AiCasePartnerGatewayInput,
): AiCasePartnerGatewayResult {
  const message = clean(input.message);

  const result = runAiCasePartnerOrchestrator({
    ...input,
    message,
  });

  return {
    ...result,
    gateway: {
      version: "1.0.0",
      modelProvider: "internal-orchestrator",
      externalModelUsed: false,
      generatedAt: nowIso(),
    },
  };
}