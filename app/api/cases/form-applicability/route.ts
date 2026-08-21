import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  resolveExactFormMapping,
  type BetaProcedureAuthorityMetadata,
  type ExactCatalogFormProvenance,
} from "../../../../src/lib/case-system/authority-intelligence/betaProcedureAuthority";
import { getCanonicalFormLookup, type FormsCourtPath } from "../../../../src/lib/case-system/formsSelectedCase";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../../../../src/lib/supabase/serverAuth";

type FormApplicability = Record<string, unknown>;
type ScalarAnswer = boolean | string;
export type ApplicabilityQuestion = {
  field_path: string;
  question: string;
  value_type: "boolean" | "string";
  choices: Array<{ value: ScalarAnswer; label: string }>;
  explanation?: string;
};
type FormApplicabilityRequest = { caseId?: unknown; formApplicability?: unknown };
type CleanCatalogForm = ExactCatalogFormProvenance & { canonical_form_id: string; court_type: FormsCourtPath; official_title: string | null };
type MappingRow = BetaProcedureAuthorityMetadata & { applicability_questions?: unknown };

const CASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 5_000;
const ALLOWED_KEYS = new Set(["caseId", "formApplicability"]);
const FORM_PATH = /^formApplicability\.(smallClaims|family|civil)\.([A-Za-z][A-Za-z0-9]*)$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function courtPath(value: unknown): FormsCourtPath | null { return value === "family" || value === "small-claims" || value === "civil" ? value : null; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean { return Object.keys(value).every((key) => keys.includes(key)); }
function applicabilityKey(area: FormsCourtPath): string { return area === "small-claims" ? "smallClaims" : area; }
function fieldParts(fieldPath: string, area: FormsCourtPath): [string, string] | null {
  const match = fieldPath.match(FORM_PATH);
  return match && match[1] === applicabilityKey(area) ? [match[1], match[2]] : null;
}
function mappingHasCondition(mapping: MappingRow, fieldPath: string): boolean {
  const conditions = asRecord(mapping.applicability_conditions);
  const all = Array.isArray(conditions?.all) ? conditions.all : [];
  return all.some((condition) => asRecord(condition)?.path === fieldPath);
}

export function parseApplicabilityQuestions(value: unknown, area: FormsCourtPath, mapping?: MappingRow): ApplicabilityQuestion[] | null {
  if (!Array.isArray(value)) return null;
  const questions: ApplicabilityQuestion[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const record = asRecord(item);
    const choices = Array.isArray(record?.choices) ? record.choices : null;
    const fieldPath = text(record?.field_path);
    const question = text(record?.question);
    const valueType = record?.value_type;
    const explanation = record?.explanation === undefined ? undefined : text(record.explanation);
    if (!record || !choices || !exactKeys(record, ["field_path", "question", "value_type", "choices", "explanation"]) || !fieldParts(fieldPath, area) || !question || (valueType !== "boolean" && valueType !== "string") || (record.explanation !== undefined && !explanation) || seen.has(fieldPath) || (mapping && !mappingHasCondition(mapping, fieldPath))) return null;
    const cleanChoices: ApplicabilityQuestion["choices"] = [];
    const seenValues = new Set<string>();
    for (const choice of choices) {
      const choiceRecord = asRecord(choice);
      const choiceValue = choiceRecord?.value;
      const label = text(choiceRecord?.label);
      if (!choiceRecord || !exactKeys(choiceRecord, ["value", "label"]) || !label || (typeof choiceValue !== "boolean" && typeof choiceValue !== "string") || (valueType === "boolean" && typeof choiceValue !== "boolean" && choiceValue !== "not-sure") || (valueType === "string" && typeof choiceValue !== "string")) return null;
      const key = `${typeof choiceValue}:${choiceValue}`;
      if (seenValues.has(key)) return null;
      seenValues.add(key);
      cleanChoices.push({ value: choiceValue, label });
    }
    if (!cleanChoices.length) return null;
    seen.add(fieldPath);
    questions.push({ field_path: fieldPath, question, value_type: valueType, choices: cleanChoices, ...(explanation ? { explanation } : {}) });
  }
  return questions;
}

function questionsForMappings(mappings: MappingRow[], area: FormsCourtPath, stage: string): ApplicabilityQuestion[] {
  const byPath = new Map<string, ApplicabilityQuestion>();
  for (const mapping of mappings) {
    if (!Array.isArray(mapping.authority_stage_applicability) || !mapping.authority_stage_applicability.includes(stage)) continue;
    const questions = parseApplicabilityQuestions(mapping.applicability_questions, area, mapping);
    if (!questions) continue;
    for (const question of questions) {
      const existing = byPath.get(question.field_path);
      if (existing && JSON.stringify(existing) !== JSON.stringify(question)) return [];
      byPath.set(question.field_path, question);
    }
  }
  return [...byPath.values()];
}

function verifiedUseDescription(mapping: MappingRow, area: FormsCourtPath): string | null {
  const conditions = asRecord(mapping.applicability_conditions);
  const confirmed = Array.isArray(conditions?.all)
    ? conditions.all.map(asRecord).find((condition) => {
      const path = text(condition?.path);
      return path.startsWith("formApplicability.") && (typeof condition?.equals === "string" || typeof condition?.equals === "boolean");
    })
    : null;
  const fieldPath = text(confirmed?.path);
  const value = confirmed?.equals;
  const question = parseApplicabilityQuestions(mapping.applicability_questions, area, mapping)?.find((item) => item.field_path === fieldPath);
  const choice = question?.choices.find((item) => item.value === value);
  return choice ? `Use this form when: ${choice.label}` : null;
}

function setAtPath(target: Record<string, unknown>, fieldPath: string, value: ScalarAnswer): void {
  const [, group, field] = fieldPath.split(".");
  const existing = asRecord(target[group]) || {};
  target[group] = { ...existing, [field]: value };
}

export function parseFormApplicability(value: unknown, area: FormsCourtPath, questions: ApplicabilityQuestion[]): FormApplicability | null {
  const root = asRecord(value);
  if (!root || !exactKeys(root, ["smallClaims", "family", "civil"])) return null;
  const allowedPaths = new Map(questions.map((question) => [question.field_path, question]));
  const patch: FormApplicability = {};
  for (const [group, groupValue] of Object.entries(root)) {
    const answers = asRecord(groupValue);
    if (!answers || group !== applicabilityKey(area)) return null;
    for (const [field, answer] of Object.entries(answers)) {
      const fieldPath = `formApplicability.${group}.${field}`;
      const question = allowedPaths.get(fieldPath);
      if (!question || !question.choices.some((choice) => choice.value === answer)) return null;
      setAtPath(patch, fieldPath, answer as ScalarAnswer);
    }
  }
  return Object.keys(patch).length ? patch : null;
}

export function mergeFormApplicability(masterResult: unknown, patch: FormApplicability): Record<string, unknown> {
  const master = asRecord(masterResult) || {};
  const existing = asRecord(master.formApplicability) || {};
  const next = { ...existing };
  for (const [group, answers] of Object.entries(patch)) next[group] = { ...(asRecord(existing[group]) || {}), ...(asRecord(answers) || {}) };
  return { ...master, formApplicability: next };
}
function procedureStage(masterResult: Record<string, unknown>): string {
  const masterCase = asRecord(masterResult.masterCase) || {};
  const assembly = asRecord(masterResult.caseSystemAssembly) || asRecord(masterResult.assembly) || {};
  const proceduralState = asRecord(assembly.proceduralState) || {};
  for (const source of [masterResult, masterCase, proceduralState]) for (const key of ["stage", "proceduralStage", "currentStage"]) { const value = text(source[key]); if (value) return value; }
  return "";
}
function caseFacts(masterResult: Record<string, unknown>, area: FormsCourtPath): Record<string, unknown> {
  const masterCase = asRecord(masterResult.masterCase) || {};
  return { ...masterResult, courtPath: masterResult.courtPath ?? masterCase.courtPath ?? area, province: masterResult.province ?? masterCase.province, stage: procedureStage(masterResult) };
}
function bearerToken(request: Request): string { return (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || ""; }
function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = bearerToken(request);
  return url && key && token ? createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

async function readinessForOwnedCase(request: Request, caseId: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: "Authentication is required.", status: 401 } as const;
  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  const area = courtPath(ownedCase?.court_path);
  const masterResult = asRecord(ownedCase?.master_result);
  if (!ownedCase || !area || !masterResult || (masterResult.courtPath !== undefined && masterResult.courtPath !== area)) return { error: "The selected case could not be used for form recommendations.", status: 404 } as const;
  const supabase = authenticatedClient(request);
  if (!supabase) return { error: "Authentication is required.", status: 401 } as const;
  const { data: mappings, error: mappingsError } = await supabase.from("legal_form_mapping_rules").select("authority_source_id,authority_source_type,official_source_url,authority_citation,authority_pinpoint,authority_issuing_body,authority_checked_at,authority_review_status,authority_court_area,authority_topic,authority_stage_applicability,canonical_form_id,canonical_form_court_type,form_revision_or_effective_at,form_review_status,applicability_conditions,applicability_questions").eq("court_area", area).eq("is_active", true).eq("authority_review_status", "verified-for-workflow").eq("form_review_status", "verified-for-workflow").eq("authority_bundle_version", "ontario-beta-form-mapping-v1");
  if (mappingsError) return { error: "Could not load verified form mappings.", status: 500 } as const;
  const activeMappings = (mappings || []) as MappingRow[];
  const stage = procedureStage(masterResult);
  const applicabilityQuestions = questionsForMappings(activeMappings, area, stage);
  const ids = activeMappings.map((mapping) => text(mapping.canonical_form_id)).filter(Boolean);
  if (!ids.length) return { area, masterResult, applicabilityQuestions, recommendations: [] } as const;
  const { data: catalog, error: catalogError } = await supabase.from("court_form_library").select("canonical_form_id,court_type,official_title,form_source_id,official_source_url,form_revision_or_effective_at,form_checked_at,form_review_status").eq("court_type", area).eq("is_active", true).in("canonical_form_id", ids);
  if (catalogError) return { error: "Could not load verified form catalogue records.", status: 500 } as const;
  const catalogById = new Map<string, CleanCatalogForm>();
  for (const form of (catalog || []) as CleanCatalogForm[]) if (!catalogById.has(form.canonical_form_id)) catalogById.set(form.canonical_form_id, form);
  const facts = caseFacts(masterResult, area);
  const recommendations = activeMappings.flatMap((mapping) => {
    const resolved = resolveExactFormMapping(mapping, { courtArea: area, procedureStage: stage, caseFacts: facts, catalogRecord: catalogById.get(text(mapping.canonical_form_id)) || null });
    const lookup = getCanonicalFormLookup({ canonicalFormId: resolved.canonicalFormId, courtType: resolved.canonicalFormCourtType });
    const form = lookup ? catalogById.get(lookup.canonicalFormId) : null;
    const description = verifiedUseDescription(mapping, area);
    return lookup && form ? [{ canonicalFormId: lookup.canonicalFormId, courtType: lookup.courtType, officialTitle: form.official_title, officialSourceUrl: text(form.official_source_url), revisionOrEffectiveAt: text(form.form_revision_or_effective_at), ...(description ? { verifiedUseDescription: description } : {}) }] : [];
  });
  return { area, masterResult, applicabilityQuestions, recommendations } as const;
}

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("caseId") || "";
  if (!CASE_ID_PATTERN.test(caseId)) return NextResponse.json({ error: "A valid selected case is required." }, { status: 400 });
  const result = await readinessForOwnedCase(request, caseId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ courtPath: result.area, formApplicability: asRecord(result.masterResult.formApplicability) || {}, applicabilityQuestions: result.applicabilityQuestions, recommendations: result.recommendations });
}
export async function PATCH(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return NextResponse.json({ error: "The request is too large." }, { status: 413 });
  let body: FormApplicabilityRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "A valid request body is required." }, { status: 400 }); }
  const raw = asRecord(body);
  const caseId = text(raw?.caseId);
  if (!raw || !exactKeys(raw, Array.from(ALLOWED_KEYS)) || !CASE_ID_PATTERN.test(caseId)) return NextResponse.json({ error: "A valid selected case and form applicability answers are required." }, { status: 400 });
  const current = await readinessForOwnedCase(request, caseId);
  if ("error" in current) return NextResponse.json({ error: current.error }, { status: current.status });
  const patch = parseFormApplicability(raw.formApplicability, current.area, current.applicabilityQuestions);
  if (!patch) return NextResponse.json({ error: "Form applicability answers are not declared for this selected case." }, { status: 400 });
  const supabase = authenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const masterResult = mergeFormApplicability(current.masterResult, patch);
  const { data, error } = await supabase.from("cases").update({ master_result: masterResult }).eq("id", caseId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save form applicability answers." }, { status: 500 });
  if (!data?.id) return NextResponse.json({ error: "The selected case could not be updated." }, { status: 404 });
  const updated = await readinessForOwnedCase(request, caseId);
  if ("error" in updated) return NextResponse.json({ error: updated.error }, { status: updated.status });
  return NextResponse.json({ courtPath: updated.area, formApplicability: asRecord(updated.masterResult.formApplicability) || {}, applicabilityQuestions: updated.applicabilityQuestions, recommendations: updated.recommendations });
}
