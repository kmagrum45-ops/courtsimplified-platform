"use client";

import { useState } from "react";

import type { CheckedAnswerView } from "@/src/lib/case-system/intelligence/intelligenceTypes";
import type { CaseUnderstanding, UnderstoodCourt } from "@/src/lib/case-system/understanding/understandCase";
import { isPathwayAvailable } from "@/src/lib/content-library/phaseScope";
import CheckedAnswerPanel from "./CheckedAnswerPanel";
import LegalAdviceDeflection from "./LegalAdviceDeflection";
import StageAnswerPanel from "../builder/_components/StageAnswerPanel";

/**
 * The front door's answer to a person's story (understanding/understandCase.ts,
 * site owner 2026-10-14). Three parts, in the order a lawyer would give them:
 *
 *   1. What we understood: the person's own facts restated, for them to
 *      correct. Model-written, but it states no law (law sentences are
 *      removed before it reaches here) and it is offered as a reading to confirm.
 *   2. What we need to know: the questions whose answers change the court or
 *      the next step. Answering them runs the reading again with the answers.
 *   3. The next step, from the stage map (CLAUDE.md s. 2a): the reading picks
 *      the step, and StageAnswerPanel shows its form, deadline, filing, fee and
 *      what comes after from the map, for the person to confirm or change.
 *   4. The law that applies: only statements that passed the check against
 *      the official text, each with its source (CheckedAnswerPanel).
 *
 * The court is a suggestion with a button; the person chooses (CLAUDE.md s. 4).
 */

export type UnderstandResponse = { understanding: CaseUnderstanding; answer: CheckedAnswerView };

type CourtPath = "small-claims" | "civil" | "family";

/** Points shown before "More of the law that applies". The first is the next step. */
const FIRST_POINTS = 6;

const COURT_LABEL: Record<UnderstoodCourt, string> = {
  "small-claims": "Small Claims Court",
  civil: "Superior Court of Justice (civil)",
  family: "family court",
  tribunal: "a tribunal",
  "outside-ontario": "a court outside Ontario",
  unclear: "not clear yet",
};
const PATH_LABEL: Record<CourtPath, string> = { "small-claims": "Small Claims", civil: "Civil", family: "Family" };

function asPath(court: UnderstoodCourt): CourtPath | null {
  return court === "small-claims" || court === "civil" || court === "family" ? court : null;
}

export default function CaseUnderstandingCard({
  result,
  chosenPath,
  updating,
  onAnswer,
  onContinue,
  story = "",
  city = "",
}: {
  result: UnderstandResponse;
  /** The person's own words, for the step panel's dates and service. */
  story?: string;
  city?: string;
  chosenPath: CourtPath;
  updating: boolean;
  onAnswer: (answers: { question: string; answer: string }[]) => void;
  onContinue: (path: CourtPath, answers: { question: string; answer: string }[]) => void;
}) {
  const { understanding, answer } = result;
  const [replies, setReplies] = useState<Record<number, string>>({});
  const answered = understanding.questions
    .map((item, index) => ({ question: item.question, answer: (replies[index] ?? "").trim() }))
    .filter((item) => item.answer);
  const suggested = asPath(understanding.mainCourt);
  const tribunal = understanding.matters.find((matter) => matter.court === "tribunal");

  return (
    <div
      role="group"
      aria-label="What we understood"
      data-testid="case-understanding"
      className="mt-6 space-y-5 rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5"
    >
      <section>
        <h2 className="text-lg font-bold text-[#10231f]">Here is what we understood</h2>
        {understanding.summary ? (
          <p className="mt-2 text-sm leading-6 text-[#24463d]" data-testid="case-understanding-summary">
            {understanding.summary}
          </p>
        ) : null}
        {understanding.facts.length > 0 && (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2" data-testid="case-understanding-facts">
            {understanding.facts.map((fact, index) => (
              <div key={`${fact.label}-${index}`} className="rounded-2xl border border-[#d8e6df] bg-white px-4 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#4d675f]">{fact.label}</dt>
                <dd className="text-[#16302b]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {understanding.stage ? (
          <p className="mt-3 text-sm leading-6 text-[#24463d]">
            <span className="font-semibold text-[#16302b]">Where it stands: </span>
            {understanding.stage}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[#4d675f]">
          This is our reading of what you wrote. If something is wrong, change your description above and check again.
        </p>
      </section>

      {understanding.questions.length > 0 && (
        <section data-testid="case-understanding-questions">
          <h3 className="font-bold text-[#10231f]">What we still need to know</h3>
          <ol className="mt-2 space-y-3">
            {understanding.questions.map((item, index) => (
              <li key={`${index}-${item.question.slice(0, 20)}`} className="rounded-2xl border border-[#d8e6df] bg-white p-3">
                <label className="block text-sm">
                  <span className="font-semibold text-[#16302b]">{item.question}</span>
                  {item.why ? <span className="mt-1 block text-xs text-[#4d675f]">Why we ask: {item.why}</span> : null}
                  <input
                    aria-label={item.question}
                    value={replies[index] ?? ""}
                    onChange={(event) => setReplies((current) => ({ ...current, [index]: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-[#d8e6df] px-3 py-2"
                    placeholder="Your answer (optional)"
                  />
                </label>
              </li>
            ))}
          </ol>
          <button
            type="button"
            data-testid="case-understanding-update"
            disabled={updating || answered.length === 0}
            onClick={() => onAnswer(answered)}
            className="mt-3 rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {updating ? "Updating…" : "Update with my answers"}
          </button>
        </section>
      )}

      {understanding.regime && (
        <section className="rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4" data-testid="case-understanding-regime">
          <p className="text-sm leading-6 text-[#4a3b17]">{understanding.regime.reasoning}</p>
          {understanding.regime.ownProcedure ? (
            <p className="mt-2 text-sm leading-6 text-[#4a3b17]" data-testid="case-understanding-not-covered">
              Our step-by-step guide does not cover this kind of proceeding yet, so we are not listing steps, forms or
              deadlines for it. The law below is checked against the official text.
            </p>
          ) : null}
        </section>
      )}

      {suggested && !understanding.regime?.ownProcedure && (
        <section data-testid="case-understanding-next-step">
          <StageAnswerPanel
            courtPath={suggested}
            suggestedStepId={understanding.step}
            responding={understanding.side === "responding"}
            storyText={story}
            userWords={story}
            city={city}
          />
        </section>
      )}

      <section>
        <h3 className="font-bold text-[#10231f]">The law that applies</h3>
        <div className="mt-2">
          {answer.status === "answered" || answer.declinedToJudge || answer.status === "outside-scope" ? (
            <>
              {/* The next step and the main points first; the rest folded, the way a lawyer leads with what to do now. */}
              <CheckedAnswerPanel answer={{ ...answer, statements: answer.statements.slice(0, FIRST_POINTS), notConfirmed: answer.statements.length > FIRST_POINTS ? [] : answer.notConfirmed }} />
              {answer.statements.length > FIRST_POINTS && (
                <details className="mt-3" data-testid="case-understanding-more-law">
                  <summary className="cursor-pointer text-sm font-semibold text-[#1c473d]">
                    More of the law that applies ({answer.statements.length - FIRST_POINTS} more points)
                  </summary>
                  <div className="mt-2">
                    <CheckedAnswerPanel answer={{ ...answer, declinedToJudge: false, statements: answer.statements.slice(FIRST_POINTS) }} />
                  </div>
                </details>
              )}
            </>
          ) : (
            <p className="text-sm text-[#4d675f]">
              We could not confirm the law for this against the official text yet, so we are not stating it. You can still continue, and the next screens will guide you.
            </p>
          )}
        </div>
      </section>

      {tribunal && (
        <section className="rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4" data-testid="case-understanding-tribunal">
          <h3 className="font-bold text-[#10231f]">
            {tribunal.title}: this may belong to {tribunal.forum || "a tribunal"}
          </h3>
          <div className="mt-3">
            <LegalAdviceDeflection reason="out-of-scope" />
          </div>
        </section>
      )}

      <section>
        <p className="text-sm text-[#24463d]">
          <span className="font-semibold text-[#16302b]">Where this seems to belong: </span>
          {COURT_LABEL[understanding.mainCourt]}. This is a suggestion, not a decision about your case; you choose where to continue.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {suggested && isPathwayAvailable(suggested) && (
            <button
              type="button"
              data-testid="case-understanding-continue-suggested"
              onClick={() => onContinue(suggested, answered)}
              className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
            >
              Continue with {PATH_LABEL[suggested]}
            </button>
          )}
          {suggested !== chosenPath && (
            <button
              type="button"
              data-testid="case-understanding-continue-chosen"
              onClick={() => onContinue(chosenPath, answered)}
              className={
                suggested && isPathwayAvailable(suggested)
                  ? "rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]"
                  : "rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
              }
            >
              Continue with {PATH_LABEL[chosenPath]}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
