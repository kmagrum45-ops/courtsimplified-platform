import {
  buildCaseContext,
  buildCaseContextStoragePayload,
  restoreCaseContextFromPayload,
  type BuildCaseContextInput,
  type CaseContext,
} from "./caseContextEngine";

export type { BuildCaseContextInput, CaseContext };

const LOCAL_STORAGE_KEY = "courtSimplifiedCaseContexts";
const ACTIVE_CONTEXT_KEY = "courtSimplifiedCaseContext";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeParse(value: string | null): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function restoreStoredContext(raw: unknown): CaseContext | null {
  if (!raw || typeof raw !== "object") return null;

  try {
    const item = raw as any;

    return restoreCaseContextFromPayload({
      id: item.caseId || item.id,
      user_id: item.userId || item.user_id || null,
      case_path: item.casePath || item.case_path || "unknown",
      stage: item.stage || "not-sure",
      party_role: item.partyRole || item.party_role || "unknown",
      title: item.title || "Untitled case",
      summary: item.summary || "",
      facts: item.facts || [],
      issues: item.issues || [],
      timeline: item.timeline || [],
      evidence_items: item.evidenceItems || item.evidence_items || [],
      evidence_analysis: item.evidenceAnalysis || item.evidence_analysis,
      legal_theory_analysis:
        item.legalTheoryAnalysis || item.legal_theory_analysis,
      procedural_intelligence:
        item.proceduralIntelligence || item.procedural_intelligence,
      readiness: item.readiness,
      form_needs: item.formNeeds || item.form_needs || [],
      risks: item.risks || [],
      strengths: item.strengths || [],
      weaknesses: item.weaknesses || [],
      missing_information:
        item.missingInformation || item.missing_information || [],
      next_steps: item.nextSteps || item.next_steps || [],
      strategy_notes: item.strategyNotes || item.strategy_notes || [],
      court_package_notes:
        item.courtPackageNotes || item.court_package_notes || [],
      master_case_file: item.masterCaseFile || item.master_case_file,
      created_at: item.createdAt || item.created_at,
      updated_at: item.updatedAt || item.updated_at,
    });
  } catch {
    return null;
  }
}

function readLocalCaseContexts(): CaseContext[] {
  if (!canUseLocalStorage()) return [];

  const parsed = safeParse(localStorage.getItem(LOCAL_STORAGE_KEY));

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => restoreStoredContext(item))
    .filter((item): item is CaseContext => Boolean(item));
}

function writeLocalCaseContexts(contexts: CaseContext[]) {
  if (!canUseLocalStorage()) return;

  const payloads = contexts.map(buildCaseContextStoragePayload);

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payloads));
}

function writeActiveCaseContext(context: CaseContext) {
  if (!canUseLocalStorage()) return;

  localStorage.setItem(
    ACTIVE_CONTEXT_KEY,
    JSON.stringify(buildCaseContextStoragePayload(context))
  );
}

export function saveCaseContextLocal(
  input: BuildCaseContextInput
): CaseContext {
  const contexts = readLocalCaseContexts();
  const context = buildCaseContext(input);

  const nextContexts = [
    context,
    ...contexts.filter((item) => item.caseId !== context.caseId),
  ];

  writeLocalCaseContexts(nextContexts);
  writeActiveCaseContext(context);

  return context;
}

export function updateCaseContextLocal(context: CaseContext): CaseContext {
  const contexts = readLocalCaseContexts();

  const nextContext = restoreCaseContextFromPayload({
    ...buildCaseContextStoragePayload(context),
    updated_at: new Date().toISOString(),
  });

  const nextContexts = [
    nextContext,
    ...contexts.filter((item) => item.caseId !== context.caseId),
  ];

  writeLocalCaseContexts(nextContexts);
  writeActiveCaseContext(nextContext);

  return nextContext;
}

export function getCaseContextsLocal(): CaseContext[] {
  return readLocalCaseContexts();
}

export function getCaseContextByIdLocal(caseId: string): CaseContext | null {
  const contexts = readLocalCaseContexts();

  return contexts.find((item) => item.caseId === caseId) || null;
}

export function getActiveCaseContextLocal(): CaseContext | null {
  if (!canUseLocalStorage()) return null;

  const parsed = safeParse(localStorage.getItem(ACTIVE_CONTEXT_KEY));

  return restoreStoredContext(parsed);
}

export function setActiveCaseContextLocal(caseId: string): CaseContext | null {
  const context = getCaseContextByIdLocal(caseId);

  if (!context) return null;

  writeActiveCaseContext(context);

  return context;
}

export function deleteCaseContextLocal(caseId: string): boolean {
  const contexts = readLocalCaseContexts();
  const nextContexts = contexts.filter((item) => item.caseId !== caseId);

  writeLocalCaseContexts(nextContexts);

  const active = getActiveCaseContextLocal();

  if (active?.caseId === caseId && canUseLocalStorage()) {
    localStorage.removeItem(ACTIVE_CONTEXT_KEY);
  }

  return nextContexts.length !== contexts.length;
}

export function clearCaseContextsLocal() {
  if (!canUseLocalStorage()) return;

  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_CONTEXT_KEY);
}

export function buildCaseContextSupabasePayload(context: CaseContext) {
  return buildCaseContextStoragePayload(context);
}

export function restoreCaseContextSupabasePayload(payload: any): CaseContext {
  return restoreCaseContextFromPayload(payload);
}