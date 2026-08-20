"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../src/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setRecoveryReady(true);
      setCheckingLink(false);
    });
    const timeout = window.setTimeout(() => setCheckingLink(false), 1_000);
    return () => {
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword() {
    if (!recoveryReady) {
      setMessage("This recovery link is invalid or expired. Request a new password-reset email.");
      return;
    }
    if (!password || password !== confirmPassword) {
      setMessage("Enter matching new passwords to continue.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("This recovery link is invalid or expired. Request a new password-reset email.");
        return;
      }
      setMessage("Your password has been updated. Returning to login...");
      window.setTimeout(() => router.replace("/login"), 1_000);
    } catch {
      setMessage("This recovery link is invalid or expired. Request a new password-reset email.");
    } finally {
      setLoading(false);
    }
  }

  const invalidLink = !checkingLink && !recoveryReady;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        {invalidLink ? (
          <>
            <p className="mt-4 text-slate-300">This recovery link is invalid or expired.</p>
            <Link href="/forgot-password" className="mt-5 block text-cyan-300 hover:text-cyan-200">Request a new reset email</Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-slate-400">Enter and confirm a new password after opening a valid recovery link.</p>
            <label className="mt-6 mb-2 block text-sm font-medium text-slate-300" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none focus:border-cyan-500" />
            <label className="mt-4 mb-2 block text-sm font-medium text-slate-300" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none focus:border-cyan-500" />
            {message ? <p className="mt-4 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{message}</p> : null}
            <button type="button" onClick={updatePassword} disabled={loading || checkingLink} className="mt-5 w-full rounded-2xl bg-cyan-500 px-4 py-4 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50">
              {checkingLink ? "Checking recovery link..." : loading ? "Updating password..." : "Set new password"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
