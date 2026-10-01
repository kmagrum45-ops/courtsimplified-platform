"use client";

import { useState } from "react";

import { CASE_STAGES, isSpecialStage } from "@/src/lib/case-system/stage-map/stageMap";

/**
 * "Where exactly is your case?" — the reviewed answer for the position the
 * user picks.
 *
 * *** WHY THE USER PICKS ***
 *
 * The 35 Small Claims stage answers are reviewed text tied to one precise
 * position. Choosing that position for someone is a decision about their case,
 * so this panel asks them to choose it from the stage list, in their own
 * words (each stage's `userQuestion`), and shows nothing until they have
 * (CLAUDE.md §4). No model is involved; /api/case/stage-answer renders the
 * published block through the same gates as every other door.
 *
 * Added 2026-10-01, when it was found that no page showed these answers.
 */

type RenderedAnswer = {
  stageId: string;
  question: string;
  sections: { heading: string; text: string }[];
  sources: { name: string; pinpoint: string; url: string }[];
  status: string;
  release: { runId: string; promotedAt: string };
};

type Response =
  | { outcome: "rendered"; answer: RenderedAnswer }
  | { outcome: "needs-a-fact"; question: string; answer: RenderedAnswer | null }
  | { outcome: "unavailable"; message: string };

const GROUPS: { side: string; label: string }[] = [
  { side: "before-filing", label: "Before a case is started" },
  { side: "plaintiff", label: "I am bringing the claim (plaintiff)" },
  { side: "defendant", label: "I am responding to a claim (defendant)" },
  { side: "both", label: "Either side — something went wrong" },
];

const OPTIONS = CASE_STAGES.filter((stage) => !isSpecialStage(stage.id)).map((stage) => ({
  id: stage.id,
  side: stage.side as string,
  label: stage.userQuestion,
}));

function AnswerView({ answer }: { answer: RenderedAnswer }) {
  return (
    <div className="mt-4 space-y-4" data-testid="stage-answer">
      <h4 className="text-base font-bold text-[#10231f]">{answer.question}</h4>
      {answer.sections.map((section) => (
        <div key={section.heading}>
          <p className="text-sm font-semibold text-[#16302b]">{section.heading}</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#2b4640]">{section.text}</p>
        </div>
      ))}
      {answer.sources.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#16302b]">Sources</p>
          <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-[#2b4640]">
            {answer.sources.map((source) => (
              <li key={`${source.name}-${source.pinpoint}`}>
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                  {source.name}
                </a>
                {source.pinpoint ? `, ${source.pinpoint}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs leading-5 text-[#4d675f]">
        This is general legal information written from the sources above, not advice about your
        case. A licensed paralegal or lawyer can tell you how it applies to you.
      </p>
    </div>
  );
}

export default function StageAnswerPanel({ courtPath }: { courtPath: string }) {
  const [stageId, setStageId] = useState("");
  const [result, setResult] = useState<Response | null>(null);
  const [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load(id: string, facts: Record<string, string> = {}) {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/case/stage-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: id, courtPath, confirmedFacts: facts }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setResult((await response.json()) as Response);
    } catch {
      setResult(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      data-testid="stage-answer-panel"
      className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#10231f]">What happens next at your exact step</h3>
      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        Choose the question closest to where your case is. We will show what the court rules and
        official guides say about that step, with the sources.
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#16302b]">Where is your case?</span>
        <select
          aria-label="Where is your case?"
          data-testid="stage-answer-select"
          value={stageId}
          onChange={(event) => {
            const id = event.target.value;
            setStageId(id);
            setResult(null);
            setMunicipality("");
            // Choosing the Toronto question IS the person saying it was in
            // Toronto — the fact comes from them, which is what the stage's
            // confirmed-fact rule requires. Every other municipality has its
            // own question.
            if (id) void load(id, id === "before-filing:notice-toronto" ? { municipality: "Toronto" } : {});
          }}
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
        >
          <option value="">Choose one…</option>
          {GROUPS.map((group) => (
            <optgroup key={group.side} label={group.label}>
              {OPTIONS.filter((option) => option.side === group.side).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {loading && <p className="mt-3 text-sm text-[#4d675f]">Loading…</p>}
      {failed && (
        <p className="mt-3 text-sm text-[#7a4b12]">
          We could not load this just now. Please try again.
        </p>
      )}

      {result?.outcome === "rendered" && <AnswerView answer={result.answer} />}

      {result?.outcome === "needs-a-fact" && (
        <div className="mt-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#16302b]">{result.question}</span>
            <input
              data-testid="stage-answer-fact"
              value={municipality}
              onChange={(event) => setMunicipality(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            />
          </label>
          <button
            type="button"
            disabled={!municipality.trim()}
            onClick={() => void load(stageId, { municipality })}
            className="mt-3 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            Show the steps for that place
          </button>
          {result.answer && <AnswerView answer={result.answer} />}
        </div>
      )}

      {result?.outcome === "unavailable" && (
        <p className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#7a4b12]">
          {result.message}
        </p>
      )}
    </section>
  );
}
