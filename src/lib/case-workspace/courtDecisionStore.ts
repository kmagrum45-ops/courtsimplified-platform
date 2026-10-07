/**
 * Reading and writing a court decision's details (case name, citation, court,
 * date) on its own workspace row. Server only.
 *
 * SEPARATE FROM THE MAIN DOCUMENT SELECT, ON PURPOSE. The columns arrive with
 * migration 20261007090000. Until the site owner applies it, asking for them
 * in the main documents query would break the whole documents list. So they
 * are read in a second query whose failure is ignored, and written in a
 * second update whose failure is reported on its own. The attribution
 * "Source: CanLII" never depends on them (courtDecision.ts decisionAttribution).
 * test:canlii checks that no main documents select names these columns.
 */

import { COURT_DECISION_TYPE, type DecisionDetails } from "./courtDecision";

export { COURT_DECISION_TYPE };

export const DECISION_COLUMNS = "id,decision_case_name,decision_citation,decision_court,decision_date";

/**
 * Reads the decision columns for these rows. The caller supplies the query
 * (scoped to the signed-in user), so this file needs no database client type.
 */
export type DecisionColumnsQuery = (ids: string[]) => PromiseLike<{ data: unknown; error: unknown }>;

/** The owner's own decisions' details. Empty on any error, including "column does not exist". */
export async function decisionDetailsFor(
  query: DecisionColumnsQuery,
  rows: readonly { id: string; user_type: string | null }[],
): Promise<Map<string, DecisionDetails>> {
  const ids = rows.filter((row) => row.user_type === COURT_DECISION_TYPE).map((row) => row.id);
  const out = new Map<string, DecisionDetails>();
  if (!ids.length) return out;
  try {
    const { data, error } = await query(ids);
    if (error || !Array.isArray(data)) return out;
    for (const row of data as Record<string, string | null>[]) {
      out.set(String(row.id), {
        caseName: row.decision_case_name,
        citation: row.decision_citation,
        court: row.decision_court,
        decisionDate: row.decision_date,
      });
    }
  } catch {
    // The details are extras; the decision still shows "Source: CanLII".
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
    const value = body[from] === null ? "" : String(body[from]).replace(/\s+/g, " ").trim().slice(0, max);
    update[to] = value || null;
  }
  if (body.decisionDate !== undefined) {
    const value = body.decisionDate === null ? "" : String(body.decisionDate).trim();
    update.decision_date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }
  return Object.keys(update).length ? update : null;
}
