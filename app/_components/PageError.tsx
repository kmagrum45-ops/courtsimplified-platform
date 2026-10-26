"use client";

import Link from "next/link";

/**
 * WHAT A PERSON SEES WHEN A PAGE FAILS TO DRAW (#477 re-test, case 11).
 *
 * There was no error screen of our own: any fault while drawing a page left Next's bare
 * "This page couldn't load", with no way back to the case. This says what happened in
 * plain words, keeps every way forward open (try again, the case list, the home page),
 * and folds away the fault's own text so a person helping can report it. Nothing the
 * person entered is removed by any of these buttons.
 */
export default function PageError({ error, reset, where }: { error: Error & { digest?: string }; reset: () => void; where: "intake" | "case" | "page" }) {
  return (
    <main data-testid="page-error" className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-[#d8e6df] bg-white p-8">
        <h1 className="text-2xl font-bold text-[#10231f]">Something went wrong showing this page</h1>
        <p className="mt-3 text-[#4f685f]">
          {where === "intake" ? "What you entered is kept. " : where === "case" ? "Your case is kept. " : ""}
          Try again, or open your case from your list of cases.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" data-testid="page-error-retry" onClick={() => reset()} className="rounded-full bg-[#2f7d67] px-5 py-3 font-semibold text-white">Try again</button>
          <Link href="/dashboard" data-testid="page-error-cases" className="rounded-full border border-[#2f7d67] px-5 py-3 font-semibold text-[#2f7d67]">Go to my cases</Link>
          <Link href="/" className="px-2 py-3 font-semibold text-[#2f7d67] underline">Home</Link>
        </div>
        <details className="mt-6 text-sm text-[#4f685f]">
          <summary>Details to share if you report this</summary>
          <p data-testid="page-error-detail" className="mt-2 break-words font-mono text-xs">{error.message || "No details"}{error.digest ? ` (${error.digest})` : ""}</p>
        </details>
      </div>
    </main>
  );
}
