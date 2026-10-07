"use client";

/**
 * What CanLII's API says about a case: a link to it with its proper title,
 * citation and date, and how many later decisions cite it. Renders nothing
 * until it has an answer, and nothing at all when the CanLII key is not set
 * or CanLII does not answer -- so a page never waits on it.
 */

import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase/client";

type Answer = {
  enabled: boolean;
  case?: { title: string; citation: string; url: string; decisionDate: string | null } | null;
  citing?: { count: number; examples: { title: string; citation: string; url: string | null }[] } | null;
};

export default function CanliiCaseInfo({ citation }: { citation: string }) {
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (!citation.trim()) return;
    let live = true;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch(`/api/canlii/case?citation=${encodeURIComponent(citation)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
      const body = response?.ok ? ((await response.json()) as Answer) : null;
      if (live) setAnswer(body);
    })();
    return () => {
      live = false;
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
        {found.decisionDate ? ` (decided ${found.decisionDate})` : ""}
      </p>
      {answer.citing && answer.citing.count > 0 ? (
        <p className="mt-1">
          Cited by {answer.citing.count} later decision{answer.citing.count === 1 ? "" : "s"} on CanLII
          {answer.citing.examples.length ? ", including " : "."}
          {answer.citing.examples.map((example, index) => (
            <span key={example.citation}>
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
          {answer.citing.examples.length ? "." : ""} Being cited is not the same as being followed or upheld.
        </p>
      ) : null}
    </div>
  );
}
