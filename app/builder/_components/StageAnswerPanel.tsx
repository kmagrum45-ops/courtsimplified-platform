"use client";

import { useEffect, useState } from "react";

import { stagesForPathway, type StagePathway } from "@/src/lib/case-system/stage-map/stageMap";
import type { DateQuestion, StoryHint, SuggestedDate } from "@/src/lib/case-system/casePosition";
import FormsNamedHere from "../../_components/FormsNamedHere";

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
  | { outcome: "rendered"; answer: RenderedAnswer; dateQuestions?: DateQuestion[] }
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
  /*
   * Civil and family were left to choose for themselves until 2026-10-06,
   * because their steps had no written answers. Every step now shows at least
   * its deadlines and rules (stageRules.ts), so each court suggests the step
   * its confirmed stage points to, the same way Small Claims does.
   */
  if (courtPath === "civil") {
    switch (confirmedStage) {
      case "starting-case":
        return responding ? "civil:defendant:served-defence-period-running" : "civil:plaintiff:claim-drafted-not-issued";
      case "responding":
        return "civil:defendant:served-defence-period-running";
      case "conference":
        return "civil:both:pretrial-scheduled";
      case "motion":
        return "civil:both:motion-scheduled";
      case "trial":
        return "civil:both:trial-date-set";
      case "enforcement":
        return responding ? "civil:defendant:judgment-being-enforced" : "civil:plaintiff:judgment-unpaid";
      default:
        return "";
    }
  }
  if (courtPath === "family") {
    switch (confirmedStage) {
      case "starting-case":
        return responding ? "family:respondent:served-time-to-answer-running" : "family:before-filing:deciding-where-to-start";
      case "responding":
        return "family:respondent:served-time-to-answer-running";
      case "conference":
        return "family:both:case-conference-scheduled";
      case "motion":
        return responding ? "family:both:responding-to-a-motion" : "family:both:bringing-a-motion";
      case "trial":
        return "family:both:trial-scheduled";
      case "enforcement":
        return "family:both:support-order-not-paid";
      default:
        return "";
    }
  }
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

function AnswerView({ answer, court, userWords = "" }: { answer: RenderedAnswer; court: string; userWords?: string }) {
  return (
    <div className="mt-4 space-y-4" data-testid="stage-answer">
      <h4 className="text-base font-bold text-[#10231f]">{answer.question}</h4>
      {answer.status === "rules-only" ? (
        <p data-testid="stage-rules-only" className="text-xs leading-5 text-[#4d675f]">
          We have not written a step-by-step answer for this step yet. These are its deadlines and
          the rules that apply to it, in the official words.
        </p>
      ) : null}
      {answer.sections.map((section) => (
        <div key={section.heading}>
          <p className="text-sm font-semibold text-[#16302b]">{section.heading}</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#2b4640]">{section.text}</p>
        </div>
      ))}
      <FormsNamedHere texts={answer.sections.map((section) => section.text)} court={court} userWords={userWords} />
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
        {answer.status === "rules-only" ? "Quoted from" : "Written from"} the official sources above. CourtSimplified guides you through the process
        but is not your lawyer, so check the source before you rely on it.
      </p>
    </div>
  );
}

/** Saves the user's own choice to the case. Never called for a suggestion they have not acted on. */
async function savePosition(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    // Imported on use: verifyRespondingSide imports this module's pure helpers,
    // and the Supabase client must not be constructed just to read them.
    const { supabase } = await import("@/src/lib/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    const response = await fetch("/api/cases/position", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ caseId, ...patch }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function formatIso(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function StageAnswerPanel({
  courtPath,
  confirmedStage = null,
  responding = false,
  caseId = null,
  initialStepId = null,
  initialDateAnswers = {},
  suggestedDates = {},
  storyHints = {},
  noticeStepId = null,
  userWords = "",
}: {
  courtPath: StagePathway;
  confirmedStage?: string | null;
  responding?: boolean;
  /**
   * With a case, the step the user picks and the dates they enter are saved
   * to it (master_result.position), so the case page and a return visit show
   * the same step. Without one, nothing is saved.
   */
  caseId?: string | null;
  /** The step this user picked before, from the case. Wins over the suggestion. */
  initialStepId?: string | null;
  initialDateAnswers?: Record<string, string>;
  /** Exact dates the user recorded elsewhere, offered — never applied — as answers. */
  suggestedDates?: Record<string, SuggestedDate>;
  /** Sentences from the user's story about each moment, quoted beside its question. */
  storyHints?: Record<string, StoryHint>;
  /**
   * A written-notice step the person's claim and story point to
   * (claim-types/noticeStep.ts). Suggested first when nothing is filed yet,
   * because its deadline runs from the incident and comes before filing.
   */
  noticeStepId?: string | null;
  /** The user's own words, so a family step lists only the forms for their kind of case. */
  userWords?: string;
}) {
  const options = stagesForPathway(courtPath).map((stage) => ({
    id: stage.id,
    group: groupOf(stage),
    label: stage.userQuestion,
  }));
  const noticeFirst =
    courtPath !== "family" &&
    !responding &&
    (confirmedStage === "starting-case" || !confirmedStage) &&
    Boolean(noticeStepId) &&
    options.some((option) => option.id === noticeStepId);
  const suggested = noticeFirst ? (noticeStepId as string) : suggestedStageFor(courtPath, confirmedStage, responding);
  const savedStep = initialStepId && options.some((option) => option.id === initialStepId) ? initialStepId : "";
  const startingStep = savedStep || suggested;
  const [stageId, setStageId] = useState(startingStep);
  const [result, setResult] = useState<Response | null>(null);
  const [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dateAnswers, setDateAnswers] = useState<Record<string, string>>(initialDateAnswers);
  const [dateDraft, setDateDraft] = useState<Record<string, string>>(initialDateAnswers);
  const [dateStatus, setDateStatus] = useState<"" | "saving" | "saved" | "not-saved">("");

  // Show the saved (or suggested) step's answer straight away; the user can change it.
  useEffect(() => {
    setStageId(startingStep);
    if (startingStep) void load(startingStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingStep]);

  async function load(id: string, facts: Record<string, string> = {}, answers: Record<string, string> = dateAnswers) {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/case/stage-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: id, courtPath, confirmedFacts: facts, dateAnswers: answers }),
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

  async function countDeadline(draft: Record<string, string>) {
    if (result?.outcome !== "rendered") return;
    const asked = Object.fromEntries(
      (result.dateQuestions ?? []).map((question) => [question.id, draft[question.id] ?? ""]),
    );
    const next = { ...dateAnswers };
    for (const [key, value] of Object.entries(asked)) {
      if (value) next[key] = value;
      else delete next[key];
    }
    setDateAnswers(next);
    void load(stageId, municipality ? { municipality } : {}, next);
    if (!caseId) return;
    setDateStatus("saving");
    setDateStatus((await savePosition(caseId, { dateAnswers: asked })) ? "saved" : "not-saved");
  }

  return (
    <section
      data-testid="stage-answer-panel"
      className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#10231f]">What happens next at your exact step</h3>
      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        {noticeFirst && suggested === stageId
          ? "Before filing: this step may apply to the kind of claim you described. It shows a written-notice deadline counted from the day of the injury, with the rule it comes from. If it does not fit, choose the question closest to where your case is."
          : suggested
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
            // The user picked this; record it on their case.
            if (caseId) void savePosition(caseId, { stepId: id || null });
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

      {result?.outcome === "rendered" && (result.dateQuestions?.length ?? 0) > 0 && (
        <div id="work-out-your-dates" data-testid="stage-answer-dates" className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-semibold text-[#16302b]">Work out your dates</p>
          <p className="mt-1 text-sm leading-6 text-[#4d675f]">
            Give the date and we will count the deadline for you, with the working shown below.
            Leave it empty if you do not know. You will still see the time period.
          </p>
          <div className="mt-3 space-y-4">
            {result.dateQuestions!.map((question) => {
              const hint = storyHints[question.id];
              const suggestion =
                suggestedDates[question.id] ??
                (hint?.value
                  ? {
                      value: hint.value,
                      basis: hint.yearAssumed
                        ? `from your story: “${hint.quote}” — the year is our guess`
                        : `from your story: “${hint.quote}”`,
                    }
                  : undefined);
              const value = dateDraft[question.id] ?? "";
              return (
                <div key={question.id}>
                  <label className="block">
                    <span className="text-sm font-semibold text-[#16302b]">{question.question}</span>
                    <span className="block text-xs text-[#4d675f]">Used for: {question.sets.join("; ")}</span>
                    <input
                      type="date"
                      data-testid={`stage-answer-date-${question.id}`}
                      value={value}
                      onChange={(event) => setDateDraft({ ...dateDraft, [question.id]: event.target.value })}
                      className="mt-2 rounded-xl border border-[#d8e6df] bg-white px-3 py-2"
                    />
                  </label>
                  {hint && !hint.value && !suggestion && !value ? (
                    <p className="mt-2 text-sm text-[#4d675f]" data-testid={`stage-answer-story-hint-${question.id}`}>
                      You wrote: &ldquo;{hint.quote}&rdquo; Pick that date above, with its year.
                    </p>
                  ) : null}
                  {suggestion && !value ? (
                    // One click uses the suggested date AND counts the deadline:
                    // choosing it is the user's confirmation (page review,
                    // 2026-10-06: no served person ever saw their due date).
                    <button
                      type="button"
                      data-testid={`stage-answer-date-suggestion-${question.id}`}
                      onClick={() => {
                        const draft = { ...dateDraft, [question.id]: suggestion.value };
                        setDateDraft(draft);
                        void countDeadline(draft);
                      }}
                      className="mt-2 block rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-left text-sm font-semibold text-[#2f7d67]"
                    >
                      Count my deadline from {formatIso(suggestion.value)}
                      <span className="block text-xs font-normal text-[#4d675f]">{suggestion.basis}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="stage-answer-dates-save"
              disabled={dateStatus === "saving"}
              onClick={() => void countDeadline(dateDraft)}
              className="rounded-xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Count my deadline
            </button>
            {dateStatus === "saved" ? <span className="text-sm text-[#2f7d67]">Saved to your case.</span> : null}
            {dateStatus === "not-saved" ? (
              <span className="text-sm text-[#7a4b12]">Shown here, but it could not be saved to your case.</span>
            ) : null}
          </div>
        </div>
      )}

      {result?.outcome === "rendered" && <AnswerView answer={result.answer} court={courtPath} userWords={userWords} />}

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
          {result.answer && <AnswerView answer={result.answer} court={courtPath} userWords={userWords} />}
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
