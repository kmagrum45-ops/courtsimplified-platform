"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function isSafeRelativePath(value: string | null): value is string {
  return Boolean(value) && value!.startsWith("/") && !value!.startsWith("//") && !value!.includes("://");
}

function SiteAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!password) {
      setError("Enter the site access password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError("Incorrect password.");
        return;
      }

      const rawNext = searchParams.get("next");
      const next = isSafeRelativePath(rawNext) ? rawNext : "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">CourtSimplified</h1>
        <p className="mt-3 text-slate-400">
          This is a pre-launch deployment. Enter the site access password to continue.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
            placeholder="Site access password"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-black transition disabled:opacity-50"
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SiteAccessPage() {
  return (
    <Suspense fallback={null}>
      <SiteAccessForm />
    </Suspense>
  );
}
