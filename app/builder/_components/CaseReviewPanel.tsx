"use client";

import { useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";
import type { CaseReviewFinding } from "../../../src/lib/case-system/caseReview/caseReview";
import { publicSourceUrl } from "../../../src/lib/content-library/publicSourceUrl";

/**
 * Case review panel. Shows what the review found in the user's own record and
 * lets them mark each item done or not relevant.
 *
 * Nothing here changes the case: marking an item only hides it on this screen
 * (CLAUDE.md section 4). Items an AI located carry the "AI suggestion" label
 * the A2I application committed to. No count is framed as progress or a score.
 */
export default function CaseReviewPanel({ caseId }: { caseId: string | null }) {
  const [findings, setFindings] = useState<CaseReviewFinding[] | null>(null);
  const [aiRan, setAiRan] = useState(false);
  const [hidden, setHidden] = useState<Record<string, "done" | "not-relevant">>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runReview() {
    if (!caseId) return;
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/case/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ caseId }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError(json.error || "The review could not run right now.");
        return;
      }
      setFindings(json.result.findings as CaseReviewFinding[]);
      setAiRan(json.result.aiRan === true);
      setHidden({});
    } catch {
      setError("The review could not run right now.");
    } finally {
      setLoading(false);
    }
  }

  const visible = (findings || []).filter((finding) => !hidden[finding.id]);

  return (
    <section data-testid="case-review" className="rounded-3xl border border-[#d8e6df] bg-white p-6">
      <h2 className="text-xl font-bold text-[#10231f]">Check my case file</h2>
      <p className="mt-2 text-sm text-[#4d675f]">
        Reads everything you&apos;ve entered and points out what&apos;s missing, unclear or doesn&apos;t
        match. It doesn&apos;t judge your case or tell you what to do.
      </p>

      {!caseId ? (
        <p className="mt-3 text-sm text-[#4d675f]">Save your case first, then you can run a check.</p>
      ) : (
        <button
          type="button"
          onClick={() => void runReview()}
          disabled={loading}
          className="mt-4 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : findings ? "Check again" : "Check my case file"}
        </button>
      )}

      {error ? <p className="mt-3 text-sm font-semibold text-[#a63b3b]">{error}</p> : null}

      {findings ? (
        <div className="mt-5">
          {!aiRan ? (
            <p className="mb-3 text-xs text-[#6b8078]">
              Only the basic checks ran this time; the full read of your story wasn&apos;t available.
            </p>
          ) : null}
          {visible.length === 0 ? (
            <p className="text-sm text-[#4d675f]">Nothing to check right now.</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((finding) => (
                <li key={finding.id} className="rounded-2xl border border-[#d8e6df] p-4 text-sm text-[#16302b]">
                  {finding.aiLocated ? (
                    <span className="mb-2 inline-block rounded-full bg-[#eef6f2] px-2 py-0.5 text-xs font-semibold text-[#2f7d67]">
                      AI suggestion
                    </span>
                  ) : null}
                  <p>{finding.text}</p>
                  {finding.source ? (
                    <a
                      href={publicSourceUrl(finding.source.sourceUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-[#2f7d67] underline"
                    >
                      {finding.source.sourceName}
                    </a>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHidden((current) => ({ ...current, [finding.id]: "done" }))}
                      className="rounded-full bg-[#2f7d67] px-4 py-1.5 text-xs font-bold text-white"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => setHidden((current) => ({ ...current, [finding.id]: "not-relevant" }))}
                      className="rounded-full border border-[#d8e6df] bg-white px-4 py-1.5 text-xs font-bold text-[#4d675f]"
                    >
                      Not relevant
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
