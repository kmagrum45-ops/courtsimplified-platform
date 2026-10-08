"use client";

import { useState } from "react";

import CheckedAnswerPanel from "./CheckedAnswerPanel";
import type { CheckedAnswerView } from "@/src/lib/case-system/intelligence/intelligenceTypes";
import { supabase } from "@/src/lib/supabase/client";

/**
 * Case strategy (2026-10-08; retrieval/strategy.ts, /api/case/strategy). Shown
 * only when NEXT_PUBLIC_STRATEGY=on, and the route answers only when STRATEGY=on:
 * off for real users until the Law Society's A2I approval covers it. Runs on
 * the person's click, never on its own. Every statement is a checked answer;
 * the fixed lines here are written in code and grade nothing.
 */
type Section = { seat: string; title: string; answer: CheckedAnswerView };

export const STRATEGY_INTRO =
  "Your matter from every side of the courtroom: what has to be proven, what the law gives the other side and the answer to each, what the court must decide, and the steps and tools available. Every statement is checked against the official law. It never says how strong your case is or how it will turn out.";

export default function StrategyPanel({ story, courtPath, side }: { story: string; courtPath: string; side: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [sections, setSections] = useState<Section[]>([]);
  if (process.env.NEXT_PUBLIC_STRATEGY !== "on") return null;
  if (!story || story.trim().length < 20 || !["small-claims", "civil", "family"].includes(courtPath)) return null;
  const role = /defend|respond/i.test(side) ? "defendant" : "plaintiff";

  async function build() {
    setState("loading");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/case/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ story: story.slice(0, 8000), courtPath, side: role }),
      });
      const result = (await response.json()) as { sections?: Section[] };
      setSections(result.sections ?? []);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div data-testid="strategy-panel" className="text-sm leading-6 text-[#24463d]">
      <p className="mb-3 text-xs text-[#4d675f]">{STRATEGY_INTRO}</p>
      {state === "idle" ? (
        <button type="button" onClick={build} className="rounded-full bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white hover:bg-[#256553]">
          Build my case strategy
        </button>
      ) : null}
      {state === "loading" ? <p className="text-xs text-[#4d675f]">Working through each side and checking every statement against the official law. This can take up to two minutes.</p> : null}
      {state === "error" ? <p className="text-xs text-[#7a5418]">The strategy could not be built just now. Please try again.</p> : null}
      {state === "done" && sections.length === 0 ? <p className="text-xs text-[#7a5418]">Nothing could be confirmed against the official law this time.</p> : null}
      {sections.map((section) => (
        <section key={section.seat} className="mt-5">
          <h3 className="mb-2 text-base font-bold text-[#10231f]">{section.title}</h3>
          <CheckedAnswerPanel answer={section.answer} />
        </section>
      ))}
    </div>
  );
}
