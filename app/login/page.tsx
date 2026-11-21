"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "../../src/lib/supabase/client";
import { readIntakeSession, writeIntakeSession } from "../../src/lib/case-system/intakeCheckpoint";
import { carryGuestIntake } from "../../src/lib/case-system/guestCarry";
import { openCaseFromAddress } from "../../src/lib/case-system/openCase";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";
import { WorkingButton } from "../_components/Working";
import { checkEmailMessage, confirmationRedirect, EMAIL_CONFIRMED, isUnconfirmedSignIn, RESEND_CONFIRMATION, resentMessage, signUpNext, UNCONFIRMED_SIGN_IN } from "../../src/lib/auth/signUpConfirmation";

/**
 * Supabase Auth returns a specific error code for most signup failures, but
 * the UI was previously discarding it and always showing the same generic
 * message -- so a real user hitting a config issue (e.g. the project's email
 * send rate limit) saw the same text as someone who typed a bad password,
 * with no way to tell which was actually wrong. Codes not covered here fall
 * back to the original generic message.
 */
function signUpErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "weak_password":
      return "That password is too short or too weak. Use at least 12 characters.";
    case "over_email_send_rate_limit":
      // Project-wide, not per user: Supabase's `rate_limit_email_sent` counts
      // every email the project sends in an hour, so this can fire for someone
      // who has done nothing at all.
      return "We're temporarily unable to send email — please try again in a few minutes.";
    case "email_exists":
    case "user_already_exists":
      return "An account with that email already exists — try signing in instead.";
    case "email_address_invalid":
      return "That email address isn't valid. Please check it and try again.";
    default:
      return "We could not create that account. Please check your details and try again.";
  }
}

/**
 * Where to go after signing in: the page that sent the user here (?next=), or
 * the dashboard. Only a path on this site is accepted — "//elsewhere.com" or a
 * full URL would make this an open redirect.
 */
function afterSignIn(): string {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next") || "";
  return /^\/(?![\/\\])[^\s]*$/.test(next) ? next : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  // The sign-in link's own work, so pressing Login does not make the link say it is sending (fresh review, 28 Oct).
  const [sendingLink, setSendingLink] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // What a sign-up or sign-in said Supabase answered (signUpConfirmation.ts): the email to confirm, or a sign-in refused
  // because it is not confirmed yet (with the link sent again on request).
  const [checkEmail, setCheckEmail] = useState("");
  const [unconfirmed, setUnconfirmed] = useState("");
  const [resent, setResent] = useState("");
  const [resending, setResending] = useState(false);
  // The confirmation link lands here (?confirmed=1).
  const [confirmed] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("confirmed") === "1");

  async function handleSubmit() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setCheckEmail("");
      setUnconfirmed("");
      setResent("");

      if (!email.trim() || !password.trim()) {
        setError("Email and password are required.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // The confirmation link lands on this site's own address (the live site's, on the live site).
          options: { emailRedirectTo: confirmationRedirect(window.location.origin) },
        });

        if (error) {
          setError(signUpErrorMessage(error));
          return;
        }

        // Read from what the sign-up returned, never from an assumption about the Supabase setting (site owner,
        // 21 Nov 2026): a session means signed in now; none means a confirmation email was sent, and the person
        // must click it before they can sign in. (Production requires it: CLAUDE.md s. 6. Until 21 Nov this said
        // that the account could be signed in to straight away, and that sign-in then failed.)
        if (signUpNext(data) === "signed-in") {
          // A new account starts with nothing from this browser, except the guest
          // intake this person chose to bring with them (guestCarry.ts).
          const carried = data.user ? carryGuestIntake(sessionStorage, afterSignIn(), data.user.id) : null;
          resetIntakeInBrowser({ signingIn: true });
          if (carried) writeIntakeSession(sessionStorage, carried.session);
          router.push(carried?.destination ?? afterSignIn());
          return;
        }

        setCheckEmail(checkEmailMessage(email.trim()));
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Refused because the email is not confirmed yet: said so, with the link sent again on request.
        if (isUnconfirmedSignIn(error)) { setUnconfirmed(email.trim()); return; }
        setError("We could not sign you in with those details. Please try again.");
        return;
      }

      /* Clean shared and other-account browser state before navigation. Only an
       * explicit return to this verified owner's exact intake flow keeps its
       * tab checkpoint; the builder rechecks ownership of the saved case. */
      const destination = afterSignIn();
      // The case it returns to is the one its address names (openCase.ts, rule 1).
      const returningTo = openCaseFromAddress(new URL(destination, window.location.origin).searchParams);
      const court = returningTo.court;
      const flow = returningTo.caseId || returningTo.intake;
      // Only this exact flow belonging to the authenticated owner survives cleanup.
      const own = data.user && flow && (court === "family" || court === "civil" || court === "small-claims")
        ? readIntakeSession(sessionStorage, flow, data.user.id, court) : null;
      // Or the guest intake this person chose to bring into their account, under a new id (guestCarry.ts).
      const carried = !own && data.user ? carryGuestIntake(sessionStorage, destination, data.user.id) : null;
      const returning = own ?? carried?.session ?? null;
      resetIntakeInBrowser({ signingIn: true });
      if (returning && !writeIntakeSession(sessionStorage, returning)) {
        setError("Signed in, but this tab could not retain pending text. Please return to your intake and copy it before retrying.");
        return;
      }
      router.push(carried?.destination ?? destination);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!unconfirmed) return;
    try {
      setResending(true);
      setResent("");
      const { error } = await supabase.auth.resend({ type: "signup", email: unconfirmed, options: { emailRedirectTo: confirmationRedirect(window.location.origin) } });
      if (error) { setError(error.code === "over_email_send_rate_limit" ? "We're temporarily unable to send email — please try again in a few minutes." : "We could not send the link again. Please try again in a few minutes."); return; }
      setResent(resentMessage(unconfirmed));
    } catch {
      setError("We could not send the link again. Please try again in a few minutes.");
    } finally {
      setResending(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError("Enter your email address to continue.");
      return;
    }

    try {
      setLoading(true);
      setSendingLink(true);
      setError("");
      setSuccess("");
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      setSuccess("If that email can sign in, we sent a sign-in link. Check your email.");
    } catch {
      setSuccess("If that email can sign in, we sent a sign-in link. Check your email.");
    } finally {
      setLoading(false);
      setSendingLink(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">CourtSimplified</h1>
          <p className="mt-3 text-slate-400">
            Secure legal workspace for managing your case, evidence, forms, and
            generated court documents.
          </p>
          <p className="mt-3 text-sm text-cyan-200">Your email is your sign-in ID.</p>
        </div>

        <div className="mb-6 flex rounded-2xl bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "login" ? "bg-cyan-500 text-black" : "text-slate-300"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "signup" ? "bg-cyan-500 text-black" : "text-slate-300"
            }`}
          >
            Create Account
          </button>

        </div>

        {mode === "login" ? (
          <div className="mb-6 flex items-center justify-between gap-4 text-sm">
            <Link href="/forgot-password" className="text-cyan-300 hover:text-cyan-200">
              Forgot password?
            </Link>
            <WorkingButton
              onClick={handleMagicLink}
              disabled={loading}
              working={sendingLink}
              workingLabel="Sending the link…"
              className="text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
            >
              Email me a sign-in link
            </WorkingButton>
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {confirmed && !checkEmail && !unconfirmed ? (
            <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300" data-testid="signup-confirmed">
              {EMAIL_CONFIRMED}
            </div>
          ) : null}

          {checkEmail ? (
            <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300" role="status" data-testid="signup-check-email">
              {checkEmail}
            </div>
          ) : null}

          {unconfirmed ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" role="alert" data-testid="signin-unconfirmed">
              <p>{UNCONFIRMED_SIGN_IN}</p>
              {resent ? (
                <p className="mt-2 text-green-300" data-testid="signin-resent">{resent}</p>
              ) : (
                <WorkingButton onClick={resendConfirmation} working={resending} workingLabel="Sending the link…" data-testid="signin-resend-confirmation" className="mt-2 font-semibold text-cyan-300 underline hover:text-cyan-200">
                  {RESEND_CONFIRMATION}
                </WorkingButton>
              )}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {success}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-500 px-4 py-4 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create Secure Account"
                : "Login"}
          </button>
        </div>
      </div>
    </main>
  );
}
