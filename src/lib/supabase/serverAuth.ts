import { createClient, type User } from "@supabase/supabase-js";

import {
  CASE_EVENT_SELECT_COLUMNS,
  type CaseEventRow,
} from "../case-system/events/caseEventAdapter";

export type AuthenticatedOwnedCase = {
  id: string;
  court_path: string | null;
  master_result: unknown;
};

function readBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

/**
 * Verifies a browser Supabase access token on the server. This helper never
 * accepts a user id supplied in a request body or query string as proof of
 * identity.
 */
export async function getAuthenticatedUser(
  request: Request,
): Promise<User | null> {
  const accessToken = readBearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl || !publicKey) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, publicKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(accessToken);
    return error ? null : data.user;
  } catch {
    return null;
  }
}

/**
 * The columns to read: the whole master_result, or (masterKeys) only those
 * top-level keys of it, each by a PostgREST JSON path. Exported for
 * test:case-write-queue.
 */
export function ownedCaseColumns(masterKeys?: readonly string[]): string {
  if (!masterKeys) return "id,court_path,master_result";
  for (const key of masterKeys) if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) throw new Error(`Not a master_result key: ${key}`);
  return ["id", "court_path", ...masterKeys.map((key) => `mr_${key}:master_result->${key}`)].join(",");
}

/** Builds master_result back from the keys read by JSON path (absent and null keys left out). */
export function masterFromPaths(row: Record<string, unknown>, masterKeys: readonly string[]): Record<string, unknown> {
  const master: Record<string, unknown> = {};
  for (const key of masterKeys) {
    const value = row[`mr_${key}`];
    if (value !== null && value !== undefined) master[key] = value;
  }
  return master;
}

/**
 * Loads a selected case only when it belongs to the bearer-authenticated user.
 *
 * `masterKeys` (2026-10-14, run 38525903567: GET /rest/v1/cases 500 57014
 * while a case opened): a route that needs only a few parts of master_result
 * names them, and only those are read, instead of the whole record (the
 * analysis, the intake, the reading and their copies) on every request. Left
 * out, the whole record is read as before.
 */
export async function getAuthenticatedOwnedCase(
  request: Request,
  user: User,
  caseId: string,
  options: { masterKeys?: readonly string[] } = {},
): Promise<AuthenticatedOwnedCase | null> {
  const accessToken = readBearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl || !publicKey || !caseId) return null;

  try {
    const supabase = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("cases")
      .select(ownedCaseColumns(options.masterKeys))
      .eq("id", caseId)
      .eq("user_id", user.id)
      .maybeSingle();
    const row = (data ?? null) as unknown as Record<string, unknown> | null;
    return !error && row?.id === caseId
      ? {
          id: row.id as string,
          court_path: (row.court_path as string | null) || null,
          master_result: options.masterKeys ? masterFromPaths(row, options.masterKeys) : row.master_result || {},
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * The case's recorded events, for a bearer-authenticated owner.
 *
 * Returns every row, retracted and superseded included — filtering is the
 * caller's decision, and `liveCaseEvents` is the filter. Returns [] rather
 * than throwing on any failure: an analysis run must not be blocked by the
 * event table being unreadable, and an empty list is what the analysis saw
 * before events existed at all.
 */
export async function getAuthenticatedOwnedCaseEvents(
  request: Request,
  user: User,
  caseId: string,
): Promise<CaseEventRow[]> {
  const accessToken = readBearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl || !publicKey || !caseId) return [];

  // Ownership is checked before the events are read. RLS enforces it too, but
  // this helper never relies on RLS alone for a caseId that arrived in a body.
  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!ownedCase) return [];

  try {
    const supabase = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("case_events")
      .select(CASE_EVENT_SELECT_COLUMNS)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    return error ? [] : ((data || []) as unknown as CaseEventRow[]);
  } catch {
    return [];
  }
}

export async function getAuthenticatedOwnedCaseMasterResult(
  request: Request,
  user: User,
  caseId: string,
): Promise<unknown | null> {
  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  return ownedCase?.master_result ?? null;
}
