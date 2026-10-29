/**
 * Whether this browser holds a Supabase session, read synchronously.
 *
 * supabase-js keeps the session in localStorage under
 * `sb-<project ref>-auth-token` (the project ref is the first label of
 * NEXT_PUBLIC_SUPABASE_URL's host). CapabilityProvider needs to know at its
 * first render, before supabase-js's own asynchronous getSession() answers,
 * whether to hold the page until the server's capability answer arrives
 * (production only; review of PR #513). It only decides whether to WAIT; it
 * never decides what anyone may use, and it reads nothing of the token.
 *
 * Read-only: nothing here writes or clears the session (resetIntake.ts
 * deliberately leaves it alone too).
 */
export function storedAuthSessionExists(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined" ? window.localStorage : null,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): boolean {
  try {
    if (!storage || !supabaseUrl) return false;
    const key = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
    return Boolean(storage.getItem(key));
  } catch {
    return false;
  }
}
