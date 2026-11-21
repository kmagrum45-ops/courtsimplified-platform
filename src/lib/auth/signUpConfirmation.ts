/**
 * WHAT A SIGN-UP OR A SIGN-IN SAYS NEXT, READ FROM WHAT SUPABASE AUTH RETURNED (site owner, 21 Nov 2026).
 *
 * Production requires the person to confirm their email before they can sign in (CLAUDE.md s. 6, mailer_autoconfirm
 * false). The login page assumed it did not: with no session back it said "Account created. You can sign in with those
 * details now.", and the sign-in that followed failed as "We could not sign you in with those details". Nothing here
 * assumes the Supabase setting: a sign-up that returns a session is signed in; one that returns none must be confirmed.
 *
 * The one copy of these words and rules. The login page (app/login/page.tsx) is the only page that creates an account or
 * signs in; every "Sign in" prompt leads there (test:signup-confirmation).
 */

/** A sign-up's answer: a session means signed in now; none means the email must be confirmed first. */
export function signUpNext(result: { session: unknown }): "signed-in" | "confirm-email" {
  return result.session ? "signed-in" : "confirm-email";
}

export function checkEmailMessage(email: string): string {
  return `Check your email: we sent a confirmation link to ${email}. Click it, then sign in.`;
}

/** Supabase Auth's code for a sign-in refused because the email is not confirmed yet. */
export function isUnconfirmedSignIn(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "email_not_confirmed";
}

export const UNCONFIRMED_SIGN_IN = "Your email address is not confirmed yet. Click the confirmation link we emailed you, then sign in.";
export const RESEND_CONFIRMATION = "Send the confirmation link again";

export function resentMessage(email: string): string {
  return `We sent a new confirmation link to ${email}. Click it, then sign in.`;
}

/**
 * Where the confirmation link lands: this site's own address (the live site's on the live site), on the login page, which
 * then says the email is confirmed. Supabase sends the link there only when the address is on the project's list of
 * allowed redirect addresses; otherwise it uses the project's Site URL.
 */
export function confirmationRedirect(origin: string): string {
  return `${origin}/login?confirmed=1`;
}

export const EMAIL_CONFIRMED = "Your email is confirmed. You can sign in now.";

/**
 * Told to a person who is not signed in, before they write their story, on every page that starts a case (the intake's
 * own frame, IntakeRecovery.tsx): what an account is for, and that signing up sends an email to confirm. Words only:
 * nothing about how a guest's case is kept changes (site owner, 21 Nov 2026).
 */
export const GUEST_ACCOUNT_NOTICE = "You can start without an account. To save your case and see your next steps, you need a free account. When you sign up, we email you a link to confirm your address.";
