"use client";

import { useIntakeState } from "./IntakeRecovery";

import type { CheckedAnswerView } from "@/src/lib/case-system/intelligence/intelligenceTypes";
import type { CaseUnderstanding, UnderstoodCourt } from "@/src/lib/case-system/understanding/understandCase";
import { betterDestinationKnown, courtQuestionShown } from "@/src/lib/case-system/understanding/betterDestination";
import { isPathwayAvailable } from "@/src/lib/content-library/phaseScope";
import LegalAdviceDeflection from "./LegalAdviceDeflection";
import TribunalNotice from "./TribunalNotice";
import { WorkingButton } from "./Working";
import { UseSuggestion } from "./UseSuggestion";
import { factStatus } from "@/src/lib/case-system/caseFile/factStatus";
import { allHomeQuestionWords, homeAsks } from "@/src/lib/case-system/caseFile/factQuestions";
import { cardAnswers } from "@/src/lib/case-system/understanding/understandRequest";

/** A question of the site's own: it has an id and its words are the fixed words (never the model's). */
const SITE_WORDS = allHomeQuestionWords();
const isSiteQuestion = (item: { id?: string; question: string }) => Boolean(item.id) && SITE_WORDS.has(item.question);
import type { CaseFile } from "@/src/lib/case-system/caseFile/caseFile";

/** Initial intake: factual reading, category clarification and questions only. */

export type UnderstandResponse = { understanding: CaseUnderstanding; answer: CheckedAnswerView };

type CourtPath = "small-claims" | "civil" | "family";


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
  onDraftChange,
  onContinue,
  openingPath = null,
  story = "",
  file = null,
}: {
  result: UnderstandResponse;
  /** The person's own words, for the step panel's dates and service. */
  story?: string;
  city?: string;
  chosenPath: CourtPath;
  updating: boolean;
  onAnswer: (answers: { question: string; answer: string }[]) => void;
  onDraftChange?: (answers: { question: string; answer: string }[]) => void;
  onContinue: (path: CourtPath, answers: { question: string; answer: string }[]) => void;
  /** The court whose intake is opening after a Continue (HomeLocationGate): that button says so, both wait. */
  openingPath?: CourtPath | null;
  /**
   * The case record (caseFile.ts), for the one function (factStatus.ts): a question whose fact is known or settled, or
   * one the court's own intake asks, is not asked here; a court already chosen is not offered again (Chrome milestone
   * test of #550, rows 6 and 45).
   */
  file?: CaseFile | null;
}) {
  const { understanding } = result;
  const [replies, setReplies] = useIntakeState<Record<string, string>>("home-card", "replies", {});
  /*
   * `replies` is kept by each question's id (site owner, 19 Nov 2026). Each "Update with my answers" round replaces
   * `result` with a fresh read, its questions in another set or order: an answer stays under its own question and a new
   * question starts empty. Until then it was kept by place in the list and cleared on every round, because an answer
   * kept by place showed up under another question (site owner's live test, 16 Oct 2026; case-understanding-continuity).
   */
  // Built in one place (understandRequest.ts), so test:understand-request checks what is sent against the route.
  const answered = cardAnswers(understanding.questions, replies);
  const suggested = asPath(understanding.mainCourt);
  // The questions this card may ask, by their place in the reading (replies are kept by that place): ONLY the site's own,
  // by id and in its fixed words (questions/factQuestions.ts), and only while the one function lets that id be asked. A
  // reading saved before 19 Nov 2026 with the model's own questions shows none of them (site owner: no AI-written
  // question text reaches the person).
  // The one decision (factQuestions.ts homeAsks): a question whose facts the record holds, or the story states, is not
  // asked here, and nothing is offered here: the intake offers a stated value once (site owner, 19 Nov 2026).
  const asks = understanding.questions.map((item) => isSiteQuestion(item) && homeAsks(file, item.id!, story ?? ""));
  // Each box is kept by its question's id, never its place, so a new reading with other questions can never put an
  // answer under another question (site owner, 19 Nov 2026).
  const reply = (id: string, value: string) => {
    const next = { ...replies, [id]: value };
    setReplies(next);
    onDraftChange?.(cardAnswers(understanding.questions, next, { draft: true }));
  };
  // The court the person already chose (the start's answer): the reading's same court is not offered again.
  const heldCourt = file && factStatus(file, "court") === "known" && typeof file.court.value === "string" ? file.court.value : null;
  const courtChosen = Boolean(suggested && heldCourt === suggested);
  // The court is the person's answer once chosen (here, or the court card they picked: chosenPath): not asked again
  // unless the reading points somewhere else (betterDestination.ts courtQuestionShown; Chrome milestone pass 2, finding 1).
  const askCourt = courtQuestionShown(understanding.mainCourt, heldCourt ?? chosenPath, suggested ? isPathwayAvailable(suggested) : null);
  const continueHere = courtChosen || (!askCourt && suggested === chosenPath);
  const tribunal = understanding.matters.find((matter) => matter.court === "tribunal");
  // 2026-10-17 live bug (Case 1, a landlord-held deposit): see
  // betterDestinationKnown's own comment in betterDestination.ts.
  const betterDestination = betterDestinationKnown(understanding.mainCourt, chosenPath, suggested ? isPathwayAvailable(suggested) : null);

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

      {/*
        The tribunal comes before any question (C1, site owner 9 Nov 2026). The code rule's notice (fixedRegimes.ts
        exclusiveTribunalFor, the forum's own sourced words) when it named one; otherwise the reading's own "this may
        belong to" line. Both were below the questions until 9 Nov.
      */}
      {understanding.tribunal ? (
        <TribunalNotice tribunal={understanding.tribunal} courtLabel={PATH_LABEL[chosenPath]} context="CaseUnderstandingCard:tribunal" />
      ) : tribunal ? (
        <section className="rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4" data-testid="case-understanding-tribunal">
          <h3 className="font-bold text-[#10231f]">
            {tribunal.title}: this may belong to {tribunal.forum || "a tribunal"}
          </h3>
          <div className="mt-3">
            <LegalAdviceDeflection reason="out-of-scope" />
          </div>
        </section>
      ) : null}

      {asks.some(Boolean) && (
        <section data-testid="case-understanding-questions">
          <h3 className="font-bold text-[#10231f]">What we still need to know</h3>
          <ol className="mt-2 space-y-3">
            {understanding.questions.map((item, index) => !asks[index] ? null : (
              <li key={item.id} data-fact-question={item.id} className="rounded-2xl border border-[#d8e6df] bg-white p-3">
                <label className="block text-sm">
                  <span className="font-semibold text-[#16302b]">{item.question}</span>
                  {item.why ? <span className="mt-1 block text-xs text-[#4d675f]">Why we ask: {item.why}</span> : null}
                  <input
                    disabled={updating}
                    aria-label={item.question}
                    data-testid={`case-understanding-answer-${item.id}`}
                    value={replies[item.id!] ?? ""}
                    onChange={(event) => reply(item.id!, event.target.value)}
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
          {understanding.regime.ownProcedure && !understanding.step ? (
            <p className="mt-2 text-sm leading-6 text-[#4a3b17]" data-testid="case-understanding-not-covered">
              Our step-by-step guide does not cover this kind of proceeding yet, so we are not listing steps, forms or
              deadlines for it. You can review your information before continuing.
            </p>
          ) : null}
        </section>
      )}

      <p className="text-sm">After the initial questions, you will review and confirm your information before receiving case-specific procedural guidance.</p>

      <section>
        {askCourt ? (
          <p className="text-sm text-[#24463d]" data-testid="case-understanding-court-question">
            <span className="font-semibold text-[#16302b]">Where this seems to belong: </span>
            {COURT_LABEL[understanding.mainCourt]}. This is a suggestion, not a decision about your case; you choose where to continue.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          {/* The court chosen at the start: continue there, never asked again. */}
          {continueHere && suggested && isPathwayAvailable(suggested) ? (
            <WorkingButton
              disabled={updating || openingPath !== null}
              working={openingPath === suggested}
              workingLabel="Opening your intake…"
              data-testid="case-understanding-continue-suggested"
              onClick={() => onContinue(suggested, answered)}
              className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
            >
              Continue with {PATH_LABEL[suggested]}
            </WorkingButton>
          ) : null}
          {!continueHere && askCourt && suggested && isPathwayAvailable(suggested) && (
            // The one control every suggestion is offered with (owner, 31 Oct).
            <UseSuggestion
              // Where to continue: the person still chooses a court to go on, so "not sure" settles no fact; the offer is not made again.
              offer={{ key: `court:${suggested}`, fact: null }}
              disabled={updating || openingPath !== null}
              working={openingPath === suggested}
              workingLabel="Opening your intake…"
              testId="case-understanding-continue-suggested"
              what={PATH_LABEL[suggested]}
              onUse={() => onContinue(suggested, answered)}
              className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
            />
          )}
          {suggested !== chosenPath && (
            <WorkingButton
              disabled={updating || openingPath !== null}
              working={openingPath === chosenPath}
              workingLabel="Opening your intake…"
              data-testid="case-understanding-continue-chosen"
              onClick={() => onContinue(chosenPath, answered)}
              className={
                betterDestination
                  ? "rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]"
                  : "rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
              }
            >
              Continue with {PATH_LABEL[chosenPath]}
            </WorkingButton>
          )}
        </div>
      </section>
    </div>
  );
}
