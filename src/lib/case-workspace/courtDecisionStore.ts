/**
 * Reading and writing a court decision's details on its own workspace row.
 *
 * Separate from the main document select on purpose: the columns arrive with
 * migration 20261007090000, and until the site owner applies it, asking for
 * them would break the whole documents list. So the details are read in a
 * second query whose failure is ignored -- the attribution "Source: CanLII"
 * never depends on them (courtDecision.ts decisionAttribution).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DecisionDetails } from "./courtDecision";

export const COURT_DECISION_TYPE = "court-decision";

type Row = { id: string; user_type: string | null };

export async function decisionDetailsFor(
  supabase: SupabaseClient,
  rows: readonly Row[],
): Promise<Map<string, DecisionDetails>> {
  const ids = rows.filter((row) => row.user_type === COURT_DECISION_TYPE).map((row) => row.id);
  const out = new Map<string, DecisionDetails>();
  if (!ids.length) return out;
  const { data, error } = await supabase
    .from("workspace_documents")
    .select("id,decision_case_name,decision_citation,decision_court,decision_date")
    .in("id", ids);
  if (error || !data) return out;
  for (const row of data as Record<string, string | null>[]) {
    out.set(String(row.id), {
      caseName: row.decision_case_name,
      citation: row.decision_citation,
      court: row.decision_court,
      decisionDate: row.decision_date,
    });
  }
  return out;
}

/** The PATCH body's decision fields, cleaned; null when none were sent. */
export function decisionUpdate(body: Record<string, unknown>): Record<string, string | null> | null {
  const fields: Array<[string, string, number]> = [
    ["decisionCaseName", "decision_case_name", 300],
    ["decisionCitation", "decision_citation", 200],
    ["decisionCourt", "decision_court", 200],
  ];
  const update: Record<string, string | null> = {};
  for (const [from, to, max] of fields) {
    if (body[from] === undefined) continue;
    const value = body[from] === null ? "" : String(body[from]).trim().slice(0, max);
    update[to] = value || null;
  }
  if (body.decisionDate !== undefined) {
    const value = body.decisionDate === null ? "" : String(body.decisionDate).trim();
    update.decision_date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }
  return Object.keys(update).length ? update : null;
}
