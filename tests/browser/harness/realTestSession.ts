/**
 * Mints a real, server-verifiable Supabase session for a dedicated harness
 * test user.
 *
 * getAuthenticatedUser (src/lib/supabase/serverAuth.ts) validates the
 * Authorization: Bearer token directly against Supabase from the Next.js
 * server -- a server-to-server call Playwright cannot intercept. The old
 * approach (patching Storage.prototype.getItem and routing the Supabase
 * auth/v1/user endpoint to a fake user) only ever fooled the browser; the
 * server always saw no
 * valid token, so authenticated was always false and the analyze routes
 * always fell back to the deterministic engine. A real session closes that
 * gap because the token this mints is one Supabase itself issued and will
 * actually validate.
 *
 * The test user's password is generated fresh on every call and never
 * persisted or logged -- it exists only long enough to sign in once.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const HARNESS_TEST_EMAIL = "courtsimplified.harness@example.test";

function readEnvVar(name: string): string {
  if (process.env[name]) return process.env[name] as string;

  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return "";

  const pattern = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`);
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

/** The localStorage key the app's Supabase client reads/writes the session under. */
export function authStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

async function ensureHarnessUserId(
  admin: SupabaseClient<any, any, any>,
  password: string,
): Promise<string> {
  const created = await admin.auth.admin.createUser({
    email: HARNESS_TEST_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { courtSimplifiedHarness: true },
  });

  if (!created.error && created.data.user) return created.data.user.id;

  // Most likely cause of failure: the harness user already exists from a
  // prior run. Find it and reset its password rather than treating this as
  // fatal.
  for (let pageNumber = 1; pageNumber <= 20; pageNumber += 1) {
    const page = await admin.auth.admin.listUsers({ page: pageNumber, perPage: 200 });
    if (page.error) break;

    const existing = page.data.users.find((user) => user.email === HARNESS_TEST_EMAIL);
    if (existing) {
      const updated = await admin.auth.admin.updateUserById(existing.id, { password });
      if (updated.error) {
        throw new Error(`Could not reset the harness test user's password: ${updated.error.message}`);
      }
      return existing.id;
    }

    if (page.data.users.length < 200) break;
  }

  throw new Error(
    `Could not create or locate the harness test user (${HARNESS_TEST_EMAIL}): ${created.error?.message}`,
  );
}

/** Signs in as the harness test user and returns a real Supabase session. */
export async function mintRealTestSession(): Promise<{ session: Session; supabaseUrl: string }> {
  const supabaseUrl = readEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey =
    readEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") || readEnvVar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = readEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are all required " +
        "(environment or .env.local) to mint a real harness session.",
    );
  }

  const password = crypto.randomBytes(24).toString("base64url");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureHarnessUserId(admin, password);

  const signInClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await signInClient.auth.signInWithPassword({
    email: HARNESS_TEST_EMAIL,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Could not sign in as the harness test user: ${error?.message || "no session returned"}`);
  }

  return { session: data.session, supabaseUrl };
}
