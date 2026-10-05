"use client";

import { useState } from "react";

/**
 * "Explain in plain words" for one provision under "The law behind this".
 *
 * Asks /api/law/explain by passage id. What comes back was written by one
 * model call and checked against the provision by an independent second call
 * and by code (retrieval/explainProvision.ts); if either found anything, no
 * explanation comes back and this says to read the provision itself. Shown
 * as a reading aid beside the official words, never in place of them.
 */
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; explanation: string }
  | { status: "unavailable" };

export default function ExplainProvision({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function explain() {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/law/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await response.json()) as { ok?: boolean; explanation?: string };
      setState(body.ok && body.explanation ? { status: "done", explanation: body.explanation } : { status: "unavailable" });
    } catch {
      setState({ status: "unavailable" });
    }
  }

  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={explain}
        className="mt-2 mr-3 text-xs font-semibold text-[#2f7d67] underline"
        data-testid="explain-provision"
      >
        Explain in plain words
      </button>
    );
  }
  if (state.status === "loading") {
    return <p className="mt-2 text-xs text-[#4d675f]">Writing and checking an explanation…</p>;
  }
  if (state.status === "unavailable") {
    return (
      <p className="mt-2 text-xs text-[#4d675f]">
        We could not produce an explanation that passed our check against the provision, so we are not showing one.
        Please read the provision itself.
      </p>
    );
  }
  return (
    <div className="mt-2 rounded-xl bg-white p-3 text-sm text-[#24463d]" data-testid="plain-explanation">
      <p className="text-xs font-semibold text-[#16302b]">In plain words</p>
      <p className="mt-1">{state.explanation}</p>
      <p className="mt-2 text-xs text-[#4d675f]">
        Written by AI and checked against the provision by a second, separate AI check. The provision&apos;s own words
        above are what count.
      </p>
    </div>
  );
}
