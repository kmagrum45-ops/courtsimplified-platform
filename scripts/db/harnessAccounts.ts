/**
 * LEFTOVER BROWSER-HARNESS ACCOUNTS ON STAGING, AND ONLY THERE (site owner, 2026-10-28).
 *
 * The walkthrough and the real-session browser tests sign up a fresh account per run
 * (tests/browser/harness/realTestSession.ts): always @example.test, always flagged
 * courtSimplifiedHarness: true in user_metadata. Deleting it after the run is best-effort, and by
 * 28 Oct 538 were left on staging, with about 567 cases of roughly 1.7 MB each -- about 430 MB of
 * the free plan's 500 MB. Deleting an account removes its cases, chats, events and documents (every
 * case table cascades on the account), but not its uploaded files, so those are removed here first.
 *
 * What may be deleted, all three at once:
 *   - the email ends in @example.test;
 *   - user_metadata.courtSimplifiedHarness is exactly true;
 *   - it was made more than a day ago (a run in progress keeps its account).
 * Anything else is kept, and counted by the reason it was kept. Only staging: the target must be
 * the staging ref, and the production ref is refused outright, whatever else is true.
 *
 * Used by `npm run db:clean-staging` (dry run unless --confirm) and at the start of the walkthrough.
 * Prints counts only: never an email, an id or a key.
 */
import { createClient } from "@supabase/supabase-js";

export const STAGING_REF = "icpvzwxyjsdgyqfkwycw";
export const PRODUCTION_REF = "fddlpnibovkkkgboabqb";
export const HARNESS_EMAIL_DOMAIN = "@example.test";
export const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const FILE_BUCKET = "case-evidence";

export type AccountFacts = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null; created_at?: string | null };
export type KeptReason = "not-example-test" | "not-flagged" | "too-new";

/** Why an account is kept, or null when it is a leftover harness account that may be deleted. */
export function keptBecause(account: AccountFacts, now: number, minAgeMs = MIN_AGE_MS): KeptReason | null {
  if (!(account.email ?? "").toLowerCase().endsWith(HARNESS_EMAIL_DOMAIN)) return "not-example-test";
  if (account.user_metadata?.courtSimplifiedHarness !== true) return "not-flagged";
  const made = Date.parse(account.created_at ?? "");
  if (!Number.isFinite(made) || now - made <= minAgeMs) return "too-new";
  return null;
}

/** The accounts that may be deleted, and how many were kept for each reason. */
export function sortAccounts(accounts: AccountFacts[], now: number, minAgeMs = MIN_AGE_MS) {
  const leftover: AccountFacts[] = [];
  const kept: Record<KeptReason, number> = { "not-example-test": 0, "not-flagged": 0, "too-new": 0 };
  for (const account of accounts) {
    const reason = keptBecause(account, now, minAgeMs);
    if (reason) kept[reason] += 1;
    else leftover.push(account);
  }
  return { leftover, kept };
}

/** Null when the address is staging's; otherwise why it is refused. Production is refused first, whatever else is true. */
export function refusalFor(url: string | undefined): string | null {
  const address = url ?? "";
  if (address.includes(PRODUCTION_REF)) return "REFUSED: this is the PRODUCTION project. Nothing is deleted there, ever.";
  if (!address.includes(STAGING_REF)) return "REFUSED: the address is not the staging project, so nothing was read or deleted.";
  return null;
}

/** The parts of the Supabase admin client used here (the real client, or a check's double). */
export type AdminClient = {
  auth: { admin: {
    listUsers(args: { page: number; perPage: number }): Promise<{ data: { users: AccountFacts[] }; error: unknown }>;
    deleteUser(id: string): Promise<{ error: unknown }>;
  } };
  storage: { from(bucket: string): {
    list(prefix: string, options?: { limit?: number; offset?: number }): Promise<{ data: { name: string; id?: string | null }[] | null; error: unknown }>;
    remove(paths: string[]): Promise<{ error: unknown }>;
  } };
};

async function allAccounts(admin: AdminClient): Promise<AccountFacts[]> {
  const accounts: AccountFacts[] = [];
  for (let page = 1; page < 1000; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not list the accounts.");
    accounts.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return accounts;
}

/** Every file under one account's folder (<userId>/<caseId>/<file>). */
async function filesOf(admin: AdminClient, userId: string): Promise<string[]> {
  const bucket = admin.storage.from(FILE_BUCKET);
  const files: string[] = [];
  const { data: cases } = await bucket.list(userId, { limit: 1000 });
  for (const folder of cases ?? []) {
    const { data: inside } = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
    for (const file of inside ?? []) files.push(`${userId}/${folder.name}/${file.name}`);
  }
  return files;
}

export type CleanupReport = { accounts: number; leftover: number; kept: Record<KeptReason, number>; deleted: number; failed: number; filesRemoved: number; confirmed: boolean };

/** Counts, and with `confirm` deletes, the leftover harness accounts on staging (their files first). */
export async function cleanLeftoverHarnessAccounts(options: { url: string | undefined; serviceKey?: string; confirm: boolean; now?: number; admin?: AdminClient; minAgeMs?: number }): Promise<CleanupReport> {
  const refusal = refusalFor(options.url);
  if (refusal) throw new Error(refusal);
  const admin = options.admin ?? (createClient(options.url!, options.serviceKey ?? "", { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as AdminClient);
  const accounts = await allAccounts(admin);
  const { leftover, kept } = sortAccounts(accounts, options.now ?? Date.now(), options.minAgeMs);
  const report: CleanupReport = { accounts: accounts.length, leftover: leftover.length, kept, deleted: 0, failed: 0, filesRemoved: 0, confirmed: options.confirm };
  if (!options.confirm) return report;
  for (const account of leftover) {
    // Checked again just before the delete: nothing but a leftover harness account is ever deleted.
    if (keptBecause(account, options.now ?? Date.now(), options.minAgeMs)) continue;
    try {
      const files = await filesOf(admin, account.id);
      for (let i = 0; i < files.length; i += 100) {
        const { error } = await admin.storage.from(FILE_BUCKET).remove(files.slice(i, i + 100));
        if (!error) report.filesRemoved += files.slice(i, i + 100).length;
      }
      const { error } = await admin.auth.admin.deleteUser(account.id);
      if (error) report.failed += 1;
      else report.deleted += 1;
    } catch {
      report.failed += 1;
    }
  }
  return report;
}

/** The report in plain words: counts only. */
export function describe(report: CleanupReport): string[] {
  return [
    `Accounts on staging: ${report.accounts}`,
    `Leftover harness accounts (@example.test, flagged, over a day old): ${report.leftover}`,
    `Kept: ${report.kept["not-example-test"]} not @example.test, ${report.kept["not-flagged"]} @example.test without the harness flag, ${report.kept["too-new"]} made in the last day`,
    report.confirmed
      ? `Deleted: ${report.deleted} accounts (their cases, chats, events and documents with them), ${report.filesRemoved} uploaded files; failed: ${report.failed}`
      : "DRY RUN: nothing was deleted. Add --confirm to delete the leftover harness accounts.",
  ];
}
