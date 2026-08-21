import { createClient, type User } from "@supabase/supabase-js";

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

/** Loads a selected case only when it belongs to the bearer-authenticated user. */
export async function getAuthenticatedOwnedCase(
  request: Request,
  user: User,
  caseId: string,
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
      .select("id,court_path,master_result")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .maybeSingle();
    return !error && data?.id === caseId
      ? {
          id: data.id,
          court_path: data.court_path || null,
          master_result: data.master_result || {},
        }
      : null;
  } catch {
    return null;
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
