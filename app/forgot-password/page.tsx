"use client";

import Link from "next/link";
import { useState } from "react";

import { supabase } from "../../src/lib/supabase/client";

const confirmationMessage =
  "If that email can sign in, we sent password-reset instructions. Check your email.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestReset() {
    if (!email.trim()) {
      setMessage("Enter your email address to continue.");
      return;
    }

    try {
      setLoading(true);
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // The confirmation remains the same so this flow does not reveal account status.
    } finally {
      setMessage(confirmationMessage);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Reset your password</h1>
        <p className="mt-3 text-slate-400">Your email is your sign-in ID.</p>
        <label className="mt-6 mb-2 block text-sm font-medium text-slate-300" htmlFor="recovery-email">
          Email
        </label>
        <input
          id="recovery-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition focus:border-cyan-500"
        />
        {message ? <p className="mt-4 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{message}</p> : null}
        <button
          type="button"
          onClick={requestReset}
          disabled={loading}
          className="mt-5 w-full rounded-2xl bg-cyan-500 px-4 py-4 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Please wait..." : "Email reset instructions"}
        </button>
        <Link href="/login" className="mt-5 block text-center text-sm text-cyan-300 hover:text-cyan-200">
          Back to login
        </Link>
      </div>
    </main>
  );
}
