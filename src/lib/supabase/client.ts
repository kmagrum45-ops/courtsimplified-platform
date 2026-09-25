import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * The signed-in client. Carries the user's session on every request.
 *
 * Use it for anything that depends on who the user is: their cases, their
 * intake, their documents.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/**
 * A client that NEVER carries a user session. For public reference data.
 *
 * *** WHY THIS EXISTS — A REAL FAILURE ***
 *
 * The forms page went blank with "Could not load forms — JWT issued in the
 * future". The court form catalogue is public reference data: a read-only probe
 * with the anon key alone returned rows from all three tables. Nothing about
 * it depends on who is asking.
 *
 * But supabase-js attaches the stored session's access token to EVERY
 * PostgREST request made through a client that has one. So when a session
 * token was rejected — here because of clock skew, but a revoked or corrupted
 * token does the same — the rejection took down a query that never needed the
 * session at all. A broken login blanked the form library.
 *
 * Public data is therefore read through a client with no session to attach.
 * The failure cannot propagate, because there is nothing to propagate.
 *
 * `persistSession: false` and `autoRefreshToken: false` keep it from touching
 * the stored session, and the distinct `storageKey` keeps the two clients from
 * sharing a slot in localStorage.
 */
export const supabasePublic = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "cs-public-no-session",
    },
  },
);

/**
 * Is this error a rejected session token rather than a real data problem?
 *
 * The messages come from the JWT layer, not from PostgREST's own vocabulary:
 * "token used before issued" is what a validator says when a token's `iat` is
 * ahead of its clock, which is clock skew, and it reads to a user as though
 * the data were missing. Matching the shape lets a caller tell "your login is
 * stale" apart from "this table is empty" and say the useful one.
 */
export function isSessionTokenError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /jwt|token used before issued|issued in the future|invalid claim|bad_jwt|expired/i.test(
    message,
  );
}
