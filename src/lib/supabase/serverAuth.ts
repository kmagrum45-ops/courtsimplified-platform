import { createClient, type User } from "@supabase/supabase-js";

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
export async function getAuthenticatedOwnedCaseMasterResult(
  request: Request,
  user: User,
  caseId: string,
): Promise<unknown | null> {
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
      .select("id,master_result")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .maybeSingle();
    return !error && data?.id === caseId ? data.master_result || {} : null;
  } catch {
    return null;
  }
}
