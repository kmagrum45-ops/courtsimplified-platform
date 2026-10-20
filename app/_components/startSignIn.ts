import { signInAddress } from "../../src/lib/case-system/guestCarry";

/**
 * Every "Sign in" and "create an account" link on the site goes through here: it
 * marks the guest intake open in this tab to come with the person and returns
 * them to it after login (guestCarry.ts). A link to /login that skips this wipes
 * a guest's intake at sign-in and lands them on My cases (re-test 2026-10-19).
 */
export function startSignIn() {
  let next: string | null = null;
  try { next = signInAddress(sessionStorage, window.location.pathname, window.location.search); } catch { /* storage unavailable: nothing to carry */ }
  window.location.assign(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
