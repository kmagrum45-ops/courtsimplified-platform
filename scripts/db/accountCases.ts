/**
 * Delete one staging account's cases made on given days, keeping the account and its newest cases
 * (site owner, 2026-10-28: the test account's 115 cases, those made 18 to 23 Oct, keeping its 5 newest).
 *
 * Staging only: the same refusal as the harness cleanup (refusalFor), before anything is read.
 * Days are Toronto days, both ends included. The newest `keepNewest` cases of the account are
 * kept whatever day they were made. Deleting a case deletes its chats, events, documents and
 * intakes with it (every table that points at a case is ON DELETE CASCADE); its uploaded files
 * (<userId>/<caseId>/...) are removed first. Counts only are reported, never an email or an id.
 */
import { createClient } from "@supabase/supabase-js";
import { refusalFor, type AccountFacts } from "./harnessAccounts";

const FILE_BUCKET = "case-evidence";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type CaseFacts = { id: string; created_at: string | null };

/** The Toronto day a moment falls on (YYYY-MM-DD). */
export function torontoDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export type CaseSelection = { total: number; inRange: number; keptNewestInRange: number; toDelete: string[] };

/** Which of an account's cases go: made on a day from `from` to `to` (Toronto), and not among the newest `keepNewest`. */
export function selectCases(cases: CaseFacts[], window: { from: string; to: string; keepNewest: number }): CaseSelection {
  if (!DAY.test(window.from) || !DAY.test(window.to) || window.from > window.to) throw new Error("The days must be YYYY-MM-DD, from no later than to.");
  if (!Number.isInteger(window.keepNewest) || window.keepNewest < 0) throw new Error("--keep-newest must be a whole number.");
  // A case with no creation time is never deleted (its day is unknown).
  const dated = cases.filter((item) => item.created_at && !Number.isNaN(Date.parse(item.created_at)));
  const newestFirst = [...dated].sort((a, b) => Date.parse(b.created_at!) - Date.parse(a.created_at!));
  const kept = new Set(newestFirst.slice(0, window.keepNewest).map((item) => item.id));
  const inRange = dated.filter((item) => { const day = torontoDay(item.created_at!); return day >= window.from && day <= window.to; });
  return {
    total: cases.length,
    inRange: inRange.length,
    keptNewestInRange: inRange.filter((item) => kept.has(item.id)).length,
    toDelete: inRange.filter((item) => !kept.has(item.id)).map((item) => item.id),
  };
}

/** The parts of the Supabase client used here (the real client, or a check's double). */
export type CasesClient = {
  auth: { admin: { listUsers(args: { page: number; perPage: number }): Promise<{ data: { users: AccountFacts[] }; error: unknown }> } };
  from(table: "cases"): {
    select(columns: string): { eq(column: string, value: string): Promise<{ data: CaseFacts[] | null; error: unknown }> };
    delete(): { eq(column: string, value: string): { eq(column: string, value: string): Promise<{ error: unknown }> } };
  };
  storage: { from(bucket: string): {
    list(prefix: string, options?: { limit?: number }): Promise<{ data: { name: string }[] | null; error: unknown }>;
    remove(paths: string[]): Promise<{ error: unknown }>;
  } };
};

export type AccountCasesReport = { found: boolean; total: number; inRange: number; keptNewestInRange: number; toDelete: number; deleted: number; failed: number; filesRemoved: number; confirmed: boolean; window: { from: string; to: string; keepNewest: number } };

export async function cleanAccountCases(options: { url: string | undefined; serviceKey?: string; email: string; from: string; to: string; keepNewest: number; confirm: boolean; client?: CasesClient }): Promise<AccountCasesReport> {
  const refusal = refusalFor(options.url);
  if (refusal) throw new Error(refusal);
  const window = { from: options.from, to: options.to, keepNewest: options.keepNewest };
  selectCases([], window); // the window is checked before anything is read
  const client = options.client ?? (createClient(options.url!, options.serviceKey ?? "", { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as CasesClient);
  const wanted = options.email.trim().toLowerCase();
  let account: AccountFacts | undefined;
  for (let page = 1; page < 1000 && !account; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not list the accounts.");
    account = data.users.find((user) => (user.email ?? "").trim().toLowerCase() === wanted);
    if (data.users.length < 1000) break;
  }
  const empty = { total: 0, inRange: 0, keptNewestInRange: 0, toDelete: 0, deleted: 0, failed: 0, filesRemoved: 0, confirmed: options.confirm, window };
  if (!account) return { found: false, ...empty };
  const { data, error } = await client.from("cases").select("id, created_at").eq("user_id", account.id);
  if (error) throw new Error("Could not read the account's cases.");
  const selection = selectCases(data ?? [], window);
  const report: AccountCasesReport = { found: true, ...empty, total: selection.total, inRange: selection.inRange, keptNewestInRange: selection.keptNewestInRange, toDelete: selection.toDelete.length };
  if (!options.confirm) return report;
  const bucket = client.storage.from(FILE_BUCKET);
  for (const caseId of selection.toDelete) {
    try {
      const folder = `${account.id}/${caseId}`;
      const { data: files } = await bucket.list(folder, { limit: 1000 });
      const paths = (files ?? []).map((file) => `${folder}/${file.name}`);
      if (paths.length && !(await bucket.remove(paths)).error) report.filesRemoved += paths.length;
      // Only this account's case: both the id and the owner must match.
      const { error: deleteError } = await client.from("cases").delete().eq("id", caseId).eq("user_id", account.id);
      if (deleteError) report.failed += 1;
      else report.deleted += 1;
    } catch {
      report.failed += 1;
    }
  }
  return report;
}

/** The report in plain words: counts only. */
export function describeAccountCases(report: AccountCasesReport): string[] {
  const { from, to, keepNewest } = report.window;
  if (!report.found) return ["No account on staging has that address. Nothing was read or deleted."];
  return [
    `The account's cases: ${report.total}`,
    `Made ${from} to ${to} (Toronto days): ${report.inRange}`,
    `Of those, kept as among the ${keepNewest} newest: ${report.keptNewestInRange}`,
    `To delete: ${report.toDelete}; the account and its other ${report.total - report.toDelete} cases are kept`,
    report.confirmed
      ? `Deleted: ${report.deleted} cases (their chats, events, documents and intakes with them), ${report.filesRemoved} uploaded files; failed: ${report.failed}`
      : "DRY RUN: nothing was deleted. Add --confirm to delete them.",
  ];
}
