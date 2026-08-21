export type WorkflowGate = {
  ready: boolean;
  unavailable: boolean;
  nextActionLabel?: "Complete case details" | "Organize evidence" | "Review strategy";
  nextActionRoute?: "/builder" | "/evidence" | "/litigation-strategy";
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function resolveWorkflowGate(args: { caseData: Record<string, unknown> | null; evidencePackage: { exhibitCount: number } | null }): WorkflowGate {
  if (!args.caseData) return { ready: false, unavailable: true };
  const analysis = record(args.caseData.analysis);
  if (!args.caseData.facts && !analysis.summary) return { ready: false, unavailable: false, nextActionLabel: "Complete case details", nextActionRoute: "/builder" };
  if (!args.evidencePackage?.exhibitCount) return { ready: false, unavailable: false, nextActionLabel: "Organize evidence", nextActionRoute: "/evidence" };
  if (!Array.isArray(analysis.caseStrategy) || analysis.caseStrategy.length === 0) return { ready: false, unavailable: false, nextActionLabel: "Review strategy", nextActionRoute: "/litigation-strategy" };
  return { ready: true, unavailable: false };
}
