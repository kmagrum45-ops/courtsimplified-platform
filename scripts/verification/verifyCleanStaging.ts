/**
 * THE STAGING CLEANUP DELETES ONLY LEFTOVER HARNESS ACCOUNTS, AND ONLY ON STAGING (2026-10-28).
 *
 * Checks, as properties (scripts/db/harnessAccounts.ts), against a fake admin client:
 *   - the production address is refused, whatever else is true, before anything is read;
 *   - any address that is not staging's is refused;
 *   - an account is deleted only when it is @example.test AND flagged courtSimplifiedHarness: true
 *     AND over a day old; one missing any of the three is kept, counted by its reason;
 *   - the dry run deletes nothing and removes no file;
 *   - with --confirm, exactly the leftover accounts are deleted, each one's files first, and no
 *     other account's files are touched;
 *   - the report holds counts only (no email or id in its words).
 *
 * Failure it exists to catch: a cleanup that deletes a real person's account, runs against
 * production, or deletes an account a run in progress is still using.
 */
import { MIN_AGE_MS, PRODUCTION_REF, STAGING_REF, cleanLeftoverHarnessAccounts, describe, keptBecause, refusalFor, type AccountFacts, type AdminClient } from "../db/harnessAccounts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const NOW = Date.parse("2026-10-28T12:00:00Z");
const old = new Date(NOW - MIN_AGE_MS - 60_000).toISOString();
const fresh = new Date(NOW - 60_000).toISOString();
const harness = { courtSimplifiedHarness: true };

const ACCOUNTS: AccountFacts[] = [
  { id: "a1", email: "courtsimplified.harness+1@example.test", user_metadata: harness, created_at: old },
  { id: "a2", email: "COURTSIMPLIFIED.HARNESS+2@EXAMPLE.TEST", user_metadata: harness, created_at: old },
  { id: "k-real", email: "someone@gmail.com", user_metadata: harness, created_at: old },
  { id: "k-owner", email: "owner@courtsimplified.com", user_metadata: {}, created_at: old },
  { id: "k-unflagged", email: "person@example.test", user_metadata: {}, created_at: old },
  { id: "k-flag-string", email: "x@example.test", user_metadata: { courtSimplifiedHarness: "true" }, created_at: old },
  { id: "k-new", email: "courtsimplified.harness+3@example.test", user_metadata: harness, created_at: fresh },
  { id: "k-no-date", email: "courtsimplified.harness+4@example.test", user_metadata: harness, created_at: null },
  { id: "k-lookalike", email: "a@example.test.evil.com", user_metadata: harness, created_at: old },
];

function fakeAdmin() {
  const deleted: string[] = [];
  const removed: string[] = [];
  const files: Record<string, string[]> = { a1: ["c1/f1", "c1/f2"], a2: [], "k-real": ["c9/f9"] };
  const admin: AdminClient = {
    auth: { admin: {
      listUsers: async ({ page }) => ({ data: { users: page === 1 ? ACCOUNTS : [] }, error: null }),
      deleteUser: async (id) => { deleted.push(id); return { error: null }; },
    } },
    storage: { from: () => ({
      list: async (prefix) => {
        const [user, folder] = prefix.split("/");
        const mine = files[user] ?? [];
        return { data: folder ? mine.filter((path) => path.startsWith(`${folder}/`)).map((path) => ({ name: path.split("/")[1] })) : [...new Set(mine.map((path) => path.split("/")[0]))].map((name) => ({ name })), error: null };
      },
      remove: async (paths) => { removed.push(...paths); return { error: null }; },
    }) },
  };
  return { admin, deleted, removed };
}

async function main() {
  const prodUrl = `https://${PRODUCTION_REF}.supabase.co`;
  const stagingUrl = `https://${STAGING_REF}.supabase.co`;
  check("the production address is refused", Boolean(refusalFor(prodUrl)?.includes("PRODUCTION")));
  check("an address naming both refs is refused as production", Boolean(refusalFor(`${stagingUrl}?x=${PRODUCTION_REF}`)?.includes("PRODUCTION")));
  check("an address that is not staging is refused", Boolean(refusalFor("https://other.supabase.co")) && Boolean(refusalFor(undefined)));
  check("staging's address is allowed", refusalFor(stagingUrl) === null);

  const prod = fakeAdmin();
  const refused = await cleanLeftoverHarnessAccounts({ url: prodUrl, confirm: true, admin: prod.admin, now: NOW }).then(() => false, () => true);
  check("against production, the cleanup stops before reading or deleting anything", refused && prod.deleted.length === 0 && prod.removed.length === 0);

  const leftovers = ACCOUNTS.filter((account) => keptBecause(account, NOW) === null).map((account) => account.id).sort();
  check("only @example.test, flagged exactly true, over a day old may be deleted", JSON.stringify(leftovers) === JSON.stringify(["a1", "a2"]), leftovers.join(","));

  const dry = fakeAdmin();
  const dryReport = await cleanLeftoverHarnessAccounts({ url: stagingUrl, confirm: false, admin: dry.admin, now: NOW });
  check("the dry run deletes nothing and removes no file", dry.deleted.length === 0 && dry.removed.length === 0 && dryReport.leftover === 2);
  check("the dry run counts each kept account by its reason", dryReport.kept["not-example-test"] === 3 && dryReport.kept["not-flagged"] === 2 && dryReport.kept["too-new"] === 2, JSON.stringify(dryReport.kept));

  const real = fakeAdmin();
  const report = await cleanLeftoverHarnessAccounts({ url: stagingUrl, confirm: true, admin: real.admin, now: NOW });
  check("with --confirm, exactly the leftover accounts are deleted", JSON.stringify([...real.deleted].sort()) === JSON.stringify(["a1", "a2"]) && report.deleted === 2 && report.failed === 0);
  check("each one's files are removed, and no other account's", JSON.stringify(real.removed.sort()) === JSON.stringify(["a1/c1/f1", "a1/c1/f2"]) && report.filesRemoved === 2);
  const words = describe(report).join("\n");
  check("the report holds counts only: no account's email or id", ACCOUNTS.every((account) => !words.toLowerCase().includes((account.email ?? "").toLowerCase()) && !new RegExp(String.raw`\b${account.id}\b`).test(words)), words);

  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exit(failures ? 1 : 0);
}

void main();
