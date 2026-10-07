"use client";

/**
 * What CanLII's API says about a case: a link to it on CanLII with its proper
 * title, citation, court and date, and how many later decisions cite it.
 * Renders nothing until it has an answer, and nothing at all when the CanLII
 * key is not set or CanLII does not answer -- so a page never waits on it.
 *
 * Being cited is a pointer, not a verdict: a later decision may cite a case to
 * follow it, to distinguish it, or to depart from it. The line under the count
 * says so (2026-10-07 brief, Part 2 4(c)).
 */

import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase/client";

export type CanliiCase = {
  title: string;
  citation: string;
  url: string;
  decisionDate: string | null;
  court: string | null;
};

type Answer = {
  enabled: boolean;
  case?: CanliiCase | null;
  citing?: { count: number; examples: { title: string; citation: string; url: string | null }[] } | null;
};

export const CITED_IS_NOT_UPHELD = "Being cited by a later decision is not the same as being followed or upheld.";

export default function CanliiCaseInfo({
  citation,
  onUseDetails,
}: {
  citation: string;
  /** Offered on a person's own uploaded decision: fill in CanLII's details for them to save. */
  onUseDetails?: (found: CanliiCase) => void;
}) {
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    const wanted = citation.trim();
    if (!wanted) return;
    let live = true;
    const timer = setTimeout(() => {
      void (async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`/api/canlii/case?citation=${encodeURIComponent(wanted)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => null);
        const body = response?.ok ? ((await response.json().catch(() => null)) as Answer | null) : null;
        if (live) setAnswer(body);
      })();
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [citation]);

  if (!answer?.enabled || !answer.case) return null;
  const found = answer.case;
  return (
    <div data-testid="canlii-case-info" className="mt-2 text-xs leading-5 text-[#4d675f]">
      <p>
        On CanLII:{" "}
        <a href={found.url} target="_blank" rel="noreferrer" className="font-semibold text-[#2f7d67] underline">
          {found.title}, {found.citation}
        </a>
        {found.court ? `, ${found.court}` : ""}
        {found.decisionDate ? ` (decided ${found.decisionDate})` : ""}
      </p>
      {onUseDetails ? (
        <button
          type="button"
          onClick={() => onUseDetails(found)}
          className="mt-1 rounded-full border border-[#cfe3dd] px-3 py-0.5 text-xs hover:bg-[#f1f8f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
        >
          Use CanLII&apos;s details
        </button>
      ) : null}
      {answer.citing && answer.citing.count > 0 ? (
        <p className="mt-1">
          Cited by {answer.citing.count} later decision{answer.citing.count === 1 ? "" : "s"} on CanLII
          {answer.citing.examples.length ? ", including " : "."}
          {answer.citing.examples.map((example, index) => (
            <span key={`${example.citation}-${index}`}>
              {index > 0 ? "; " : ""}
              {example.url ? (
                <a href={example.url} target="_blank" rel="noreferrer" className="underline">
                  {example.title}, {example.citation}
                </a>
              ) : (
                `${example.title}, ${example.citation}`
              )}
            </span>
          ))}
          {answer.citing.examples.length ? "." : ""} {CITED_IS_NOT_UPHELD}
        </p>
      ) : null}
    </div>
  );
}
