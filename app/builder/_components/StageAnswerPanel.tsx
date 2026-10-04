"use client";

import { useEffect, useState } from "react";

import { stagesForPathway, type StagePathway } from "@/src/lib/case-system/stage-map/stageMap";

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

const GROUPS: Record<StagePathway, { side: string; label: string }[]> = {
  "small-claims": [
    { side: "before-filing", label: "Before a case is started" },
    { side: "plaintiff", label: "I am bringing the claim (plaintiff)" },
    { side: "defendant", label: "I am responding to a claim (defendant)" },
    { side: "both", label: "Either side — something went wrong" },
  ],
  civil: [
    { side: "plaintiff", label: "I am suing (plaintiff)" },
    { side: "defendant", label: "I am being sued (defendant)" },
    { side: "both", label: "Either side" },
  ],
  family: [
    { side: "applicant", label: "I started the case (applicant)" },
    { side: "respondent", label: "The case was started against me (respondent)" },
    { side: "both", label: "Either side" },
  ],
};

/*
 * Before-filing stages are Small Claims ids with side "plaintiff"; they are
 * grouped by their id prefix so a reader who has filed nothing finds them.
 */
function groupOf(stage: { id: string; side: string }): string {
  return stage.id.startsWith("before-filing:") ? "before-filing" : stage.side;
}

/**
 * The step this user most likely means, from the stage they confirmed and the
 * side they are on. A SUGGESTION: it is pre-selected and its answer shown, and
 * the list stays open for them to pick another (CLAUDE.md section 4).
 *
 * Page walkthrough, 2026-10-04: a served Small Claims defendant confirmed "I
 * was served and need to respond" and still saw nothing about the time to
 * defend, because this panel showed nothing until they found the right
 * question in a list that opened with plaintiff and injury-notice questions.
 *
 * Small Claims only, where the stage answers are published; "" means no
 * suggestion, and the panel waits for the user to choose, as before.
 */
export function suggestedStageFor(
  courtPath: StagePathway,
  confirmedStage: string | null,
  responding: boolean,
): string {
  if (courtPath !== "small-claims") return "";
  const side = responding ? "defendant" : "plaintiff";
  switch (confirmedStage) {
    case "responding":
      return "defendant:served-defence-period-running";
    case "starting-case":
      return responding ? "defendant:served-defence-period-running" : "plaintiff:claim-drafted-not-filed";
    case "conference":
      return `${side}:awaiting-settlement-conference`;
    case "trial":
      return `${side}:trial-date-set`;
    case "enforcement":
      return responding ? "defendant:judgment-against-me" : "plaintiff:judgment-in-my-favour-unpaid";
    default:
      return "";
  }
}

/** The user's own side's groups first, then "either side", then the rest. */
export function orderGroupsForReader<T extends { side: string; label: string }>(
  groups: readonly T[],
  responding: boolean,
): T[] {
  const own = responding ? ["defendant", "respondent"] : ["before-filing", "plaintiff", "applicant"];
  return [
    ...groups.filter((group) => own.includes(group.side)),
    ...groups.filter((group) => group.side === "both"),
    ...groups
      .filter((group) => !own.includes(group.side) && group.side !== "both")
      .map((group) => ({ ...group, label: `Other situations — ${group.label}` })),
  ];
}

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
        Written from the official sources above. CourtSimplified guides you through the process
        but is not your lawyer, so check the source before you rely on it.
      </p>
    </div>
  );
}

export default function StageAnswerPanel({
  courtPath,
  confirmedStage = null,
  responding = false,
}: {
  courtPath: StagePathway;
  confirmedStage?: string | null;
  responding?: boolean;
}) {
  const suggested = suggestedStageFor(courtPath, confirmedStage, responding);
  const options = stagesForPathway(courtPath).map((stage) => ({
    id: stage.id,
    group: groupOf(stage),
    label: stage.userQuestion,
  }));
  const [stageId, setStageId] = useState(suggested);
  const [result, setResult] = useState<Response | null>(null);
  const [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Show the suggested step's answer straight away; the user can change it.
  useEffect(() => {
    setStageId(suggested);
    if (suggested) void load(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

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
        {suggested
          ? "Based on what you told us, this is your step. If it is not right, choose the question closest to where your case is."
          : "Choose the question closest to where your case is. We will show what the court rules and official guides say about that step, with the sources."}
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
          {orderGroupsForReader(GROUPS[courtPath], responding).map((group) => (
            <optgroup key={group.side} label={group.label}>
              {options.filter((option) => option.group === group.side).map((option) => (
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
