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

/**
 * A FRESH USER PER RUN, deliberately, rather than one reused user cleaned up
 * between runs.
 *
 * Teardown that fails leaves rows behind, and the next run then passes on the
 * previous run's data. That is the exact shape of every silent-pass defect
 * found in this codebase: the candidate surface returning [] forever, the
 * staleness banner that could never fire, the analysis that never saw a
 * confirmed event. In each one the check was fine and what fed it was stale
 * or absent, and nothing failed.
 *
 * A user created seconds ago owns no cases, no case_events and no dismissals,
 * so an assertion like "the candidate list is non-empty" cannot be satisfied
 * by anything except this run. There is nothing to inherit.
 *
 * The cost is accumulating users in the dev project. They are all
 * @example.test, all carry courtSimplifiedHarness: true in user_metadata, and
 * deleteHarnessUser() below removes the one a run made. If that cleanup fails
 * the run still reported honestly, which is the trade being made.
 */
function freshHarnessEmail(): string {
  return `courtsimplified.harness+${Date.now()}.${crypto.randomBytes(6).toString("hex")}@example.test`;
}

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

async function createHarnessUser(
  admin: SupabaseClient<any, any, any>,
  email: string,
  password: string,
): Promise<string> {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { courtSimplifiedHarness: true },
  });

  if (!created.error && created.data.user) return created.data.user.id;

  throw new Error(`Could not create a harness test user: ${created.error?.message}`);
}

/**
 * Creates a brand-new harness user and returns a real Supabase session for it.
 *
 * Returns the user id as well, so a spec can delete the user it made.
 */
export async function mintRealTestSession(): Promise<{
  session: Session;
  supabaseUrl: string;
  userId: string;
  email: string;
}> {
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

  const email = freshHarnessEmail();
  const userId = await createHarnessUser(admin, email, password);

  const signInClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await signInClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Could not sign in as the harness test user: ${error?.message || "no session returned"}`);
  }

  return { session: data.session, supabaseUrl, userId, email };
}

/**
 * Removes a user a run created, and everything cascading from it.
 *
 * Best-effort on purpose. A failure here must never fail a spec: the run has
 * already reported, and the next run makes its own user regardless. Leftovers
 * are all @example.test with courtSimplifiedHarness: true in user_metadata.
 */
export async function deleteHarnessUser(userId: string): Promise<void> {
  const supabaseUrl = readEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !userId) return;

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Deliberately swallowed. See the note above.
  }
}
