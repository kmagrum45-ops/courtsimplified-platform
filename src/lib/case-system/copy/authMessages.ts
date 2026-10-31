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

/** Shown when someone signs in before confirming their address (Supabase "Email not confirmed"). */
export const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Please confirm your email first. Check your inbox for the confirmation link, then sign in.";

/**
 * Is this sign-in error Supabase's "Email not confirmed"? Newer Auth servers
 * send the code `email_not_confirmed`; older ones only the message.
 */
export function isEmailNotConfirmedError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message ?? "");
}
