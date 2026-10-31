/**
 * WHAT SIGN-UP AND SIGN-IN SAY ABOUT CONFIRMING AN EMAIL, ONCE (site owner, 30 Oct).
 *
 * Production requires email confirmation (`mailer_autoconfirm` false, see
 * CLAUDE.md s. 6), so a new sign-up there gets no session: Supabase sends a
 * confirmation link and the person cannot sign in until they open it. The login
 * page used to say "Account created. You can sign in with those details now."
 * in that case, and the sign-in that followed failed with "Email not
 * confirmed". Staging keeps autoconfirm on, so sign-up there returns a session
 * and never reaches these messages.
 *
 * Every sign-up place uses these texts (`npm run test:signup-confirm-message`
 * fails when one says the person can sign in now, or carries its own copy).
 *
 * Supabase behaviour relied on (installed @supabase/auth-js 2.105.4, and the
 * Supabase Auth server source, internal/api/signup.go and token.go):
 *   - A password sign-in for an unconfirmed address, with the right password,
 *     fails with code `email_not_confirmed`. A wrong password and an unknown
 *     address both fail with the same `invalid_credentials`, so the generic
 *     message for those reveals nothing about whether an account exists.
 *     auth-js sends `X-Supabase-Api-Version: 2024-01-01` and reads the code
 *     from the response (lib/fetch.js handleError) into AuthError.code
 *     (lib/errors.d.ts), so the code is matched, not the message.
 *   - Signing up again with an already-confirmed address, with confirmation on
 *     (neither email nor phone autoconfirm), returns no error and no session,
 *     sends nothing, and returns a "sanitized" user whose `identities` is empty
 *     (GoTrueClient.d.ts signUp remarks: "an obfuscated/fake user object is
 *     returned"; signup.go sanitizeUser: `u.Identities = make([]models.Identity, 0)`).
 *     A real new user always has its email identity. With autoconfirm on the
 *     server answers `user_already_exists` instead, handled the same way.
 */

/**
 * Shown when sign-up succeeds but returns no session: the address must be
 * confirmed first. `email` is the address the person typed (or Supabase echoed
 * back); without one the message names no address.
 */
export function signUpConfirmEmailMessage(email?: string | null): string {
  const address = email?.trim();
  const where = address ? `to ${address}` : "to your email address";
  return `Account created. We sent a confirmation link ${where}. Open it to confirm your address, then sign in.`;
}

/** Shown when someone signs in before confirming their address (Supabase `email_not_confirmed`). */
export const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Please confirm your email first. Check your inbox for the confirmation link, then sign in.";

/** Shown when sign-up is tried with an address that already has an account. */
export const ACCOUNT_EXISTS_MESSAGE = "An account with this email already exists. Sign in, or reset your password.";

/** Shown for every other password sign-in failure, a wrong password and an unknown address alike. */
export const SIGN_IN_FAILED_MESSAGE = "We could not sign you in with those details. Please try again.";

/**
 * Is this sign-in error Supabase's "Email not confirmed"? Matched on the code
 * only: auth-js 2.105.4 always sets AuthError.code from the server's answer.
 */
export function isEmailNotConfirmedError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "email_not_confirmed";
}

/**
 * Did sign-up answer for an address that already has a confirmed account? With
 * confirmation on, Supabase returns no session and a user with no identities
 * (see the header). A real new account always has one identity.
 */
export function isExistingAccountSignUp(data: { session?: unknown; user?: { identities?: unknown[] | null } | null } | null | undefined): boolean {
  if (!data || data.session) return false;
  const identities = data.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}

/**
 * Where the confirmation link brings the person back to: the dashboard on the
 * same site they signed up on (live, staging or a preview), as the sign-in link
 * does. Opening the link signs them in there (detectSessionInUrl).
 */
export const SIGN_UP_CONFIRM_LANDING = "/dashboard";
export function signUpEmailRedirectTo(origin: string): string {
  return `${origin}${SIGN_UP_CONFIRM_LANDING}`;
}
