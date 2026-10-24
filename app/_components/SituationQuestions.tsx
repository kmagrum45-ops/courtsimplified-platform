"use client";

/**
 * THE SITUATION QUESTIONS AND THE TOP LINE (step 2).
 *
 * Asked before the story, one at a time, in every area: where the person is, whether
 * they started a case already going, which papers they got (by the top of the first
 * page, the court's own pictures) and the day, whether anything has been filed, and
 * the court when nothing else says. The answers are the person's own
 * (situation.ts); the top line repeats them on every page with a Change link.
 *
 * Wording here restates the person's answers and asks; it states no law.
 */
import { useState } from "react";
import { dateAnswerCheck, formatForCourt, parseAnswerDate } from "../../src/lib/case-system/dates";
import {
  answerSituation,
  courtOfPapers,
  FIRST_PAGES,
  nextSituationQuestion,
  paperId,
  situationLine,
  stageChoices,
  withKnownCourt,
  type FirstPage,
  type Situation,
  type SituationCourt,
  type SituationQuestion,
} from "../../src/lib/case-system/situation/situation";

const COURT_NAME: Record<SituationCourt, string> = { "small-claims": "Small Claims Court", civil: "a civil court", family: "a family court" };
const AREA_NAME: Record<SituationCourt, string> = { "small-claims": "Small Claims", civil: "Civil", family: "Family" };
const RECEIVED_QUESTION = "What day did you get the papers?";

type Props = {
  situation: Situation;
  onChange: (next: Situation) => void;
  /** The area the person chose (the landing page's ?path). */
  chosenCourt: SituationCourt | null;
  /** Called when the person picks a court other than the area they are in. */
  onSwitchCourt?: (court: SituationCourt, next: Situation) => void;
  /** Ask from the first question again, keeping the answers as they are (the Change link). */
  reviewing?: boolean;
  onDone?: () => void;
};

/** The next situation question, or nothing when the record is complete (unless reviewing). */
export default function SituationQuestions({ situation, onChange, chosenCourt, onSwitchCourt, reviewing = false, onDone }: Props) {
  const known = withKnownCourt(situation, chosenCourt);
  const [step, setStep] = useState<SituationQuestion | null>(reviewing ? "where" : null);
  const question = step ?? nextSituationQuestion(known, chosenCourt);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  if (!question) return null;

  const save = (answer: SituationQuestion, value: string) => {
    const next = withKnownCourt(answerSituation(known, answer, value), chosenCourt);
    setNote("");
    setTyped("");
    if (answer === "court" && chosenCourt && value !== chosenCourt && onSwitchCourt) {
      onSwitchCourt(value as SituationCourt, next);
      return;
    }
    onChange(next);
    if (reviewing) {
      const after = nextReviewStep(answer, next, chosenCourt);
      setStep(after);
      if (!after) onDone?.();
    }
  };

  const choice = (label: string, answer: SituationQuestion, value: string, chosen: boolean) => (
    <button key={value} type="button" data-testid="situation-option" data-value={value} aria-pressed={chosen} onClick={() => save(answer, value)}
      className="rounded-2xl border border-[#cde7dc] px-4 py-3 text-left font-semibold text-[#16302b] aria-pressed:bg-[#2f7d67] aria-pressed:text-white">
      {label}
    </button>
  );

  return (
    <section data-testid="situation-questions" data-question={question} className="mt-6 rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5">
      {question === "where" && <>
        <h2 className="text-lg font-bold text-[#10231f]">Where are you with this?</h2>
        <p className="mt-1 text-sm text-[#4d675f]">We ask this first, so later questions fit where you are.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {choice("I want to start a case", "where", "starting", known.where === "starting")}
          {choice("I was served with court papers", "where", "served", known.where === "served")}
          {choice("A case is already going", "where", "going", known.where === "going")}
        </div>
      </>}

      {question === "started" && <>
        <h2 className="text-lg font-bold text-[#10231f]">Did you start the case, or are you responding to it?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {choice("I started it", "started", "me", known.started === "me")}
          {choice("I'm responding to it", "started", "them", known.started === "them")}
        </div>
      </>}

      {question === "papers" && <PapersQuestion chosenCourt={chosenCourt} picked={known.papers} onPick={(value) => save("papers", value)} />}

      {question === "received" && <>
        <h2 className="text-lg font-bold text-[#10231f]">{RECEIVED_QUESTION}</h2>
        <p className="mt-1 text-sm text-[#4d675f]">For example: October 6, 2026.</p>
        {note && <p data-testid="situation-date-needs-more" className="mt-2 text-sm text-[#8a4b12]">{note}</p>}
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => {
          event.preventDefault();
          // The one date rule (dates.ts): a missing year is asked, never guessed; one date, as it is counted.
          const more = dateAnswerCheck(RECEIVED_QUESTION, typed, { oneDate: true }) ?? (parseAnswerDate(typed) ? null : "Please give the day, month and year, for example October 6, 2026.");
          if (more) { setNote(more); return; }
          save("received", parseAnswerDate(typed)!);
        }}>
          <input type="text" aria-label={RECEIVED_QUESTION} data-testid="situation-date-input" value={typed} onChange={(event) => setTyped(event.target.value)}
            placeholder={known.receivedOn && known.receivedOn !== "unknown" ? formatForCourt(known.receivedOn) : "October 6, 2026"} className="min-w-64 flex-1 rounded-2xl border border-[#d8e6df] px-4 py-3" />
          <button type="submit" data-testid="situation-date-save" className="rounded-2xl bg-[#2f7d67] px-4 py-3 font-semibold text-white">Save the date</button>
          <button type="button" data-testid="situation-date-unknown" onClick={() => save("received", "unknown")} className="rounded-2xl border px-4 py-3">I don&apos;t know the date</button>
        </form>
      </>}

      {question === "filed" && <>
        <h2 className="text-lg font-bold text-[#10231f]">Has anything been filed with the court yet?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {choice("Yes, something has been filed", "filed", "something", known.filed === "something")}
          {choice("No, nothing yet", "filed", "nothing", known.filed === "nothing")}
        </div>
      </>}

      {question === "court" && <CourtQuestion situation={known} chosenCourt={chosenCourt} onPick={(value) => save("court", value)} />}

      {question === "stage" && <StageQuestion situation={known} onPick={(value) => save("stage", value)} />}
    </section>
  );
}

/** After an answer while reviewing every answer (the Change link): the next one that applies, in order. */
function nextReviewStep(after: SituationQuestion, situation: Situation, chosenCourt: SituationCourt | null): SituationQuestion | null {
  const order: SituationQuestion[] = ["where", "started", "papers", "received", "filed", "court", "stage"];
  const applies = (question: SituationQuestion) =>
    question === "where" ||
    (question === "stage" && situation.where === "going") ||
    (question === "started" && situation.where === "going") ||
    ((question === "papers" || question === "received") && (situation.where === "served" || (situation.where === "going" && situation.started === "them"))) ||
    (question === "filed" && situation.where === "starting") ||
    (question === "court" && (!situation.court || situation.courtFrom === "asked" || (courtOfPapers(situation) !== null && courtOfPapers(situation) !== situation.court)));
  const rest = order.slice(order.indexOf(after) + 1).find(applies) ?? null;
  return rest ?? nextSituationQuestion(situation, chosenCourt);
}

function PapersQuestion({ chosenCourt, picked, onPick }: { chosenCourt: SituationCourt | null; picked?: string; onPick: (value: string) => void }) {
  const [others, setOthers] = useState(false);
  const here = FIRST_PAGES.filter((page) => !chosenCourt || page.court === chosenCourt);
  const elsewhere = FIRST_PAGES.filter((page) => chosenCourt && page.court !== chosenCourt);
  return <>
    <h2 className="text-lg font-bold text-[#10231f]">Which papers did you get?</h2>
    <p className="mt-1 text-sm text-[#4d675f]">Pick the one whose first page starts like yours. Each picture is the top of the court&apos;s own form.</p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{here.map((page) => <PaperCard key={paperId(page)} page={page} picked={picked === paperId(page)} onPick={onPick} />)}</div>
    {elsewhere.length > 0 && (others
      ? <div className="mt-4 grid gap-4 md:grid-cols-2">{elsewhere.map((page) => <PaperCard key={paperId(page)} page={page} picked={picked === paperId(page)} onPick={onPick} />)}</div>
      : <button type="button" data-testid="situation-papers-other-courts" onClick={() => setOthers(true)} className="mt-4 text-sm font-semibold text-[#2f7d67] underline">None of these: show papers from other courts</button>)}
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" data-testid="situation-option" data-value="other" aria-pressed={picked === "other"} onClick={() => onPick("other")} className="rounded-2xl border px-4 py-3 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">Something else</button>
      <button type="button" data-testid="situation-option" data-value="not-sure" aria-pressed={picked === "not-sure"} onClick={() => onPick("not-sure")} className="rounded-2xl border px-4 py-3 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">I&apos;m not sure</button>
    </div>
  </>;
}

function PaperCard({ page, picked, onPick }: { page: FirstPage; picked: boolean; onPick: (value: string) => void }) {
  return (
    <button type="button" data-testid="situation-paper" data-value={paperId(page)} aria-pressed={picked} onClick={() => onPick(paperId(page))}
      className="rounded-2xl border border-[#cde7dc] bg-white p-3 text-left aria-pressed:border-[#2f7d67] aria-pressed:ring-2 aria-pressed:ring-[#2f7d67]">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, small picture of the court's own form */}
      <img src={`/${page.image}`} alt={`Top of the first page of Form ${page.number}, ${page.title}`} className="w-full rounded border" />
      <span className="mt-2 block font-semibold text-[#16302b]">{page.title} (Form {page.number})</span>
      <span className="block text-xs text-[#4d675f]">From the official form dated {page.date}, ontariocourtforms.on.ca</span>
    </button>
  );
}

function CourtQuestion({ situation, chosenCourt, onPick }: { situation: Situation; chosenCourt: SituationCourt | null; onPick: (value: string) => void }) {
  const papersCourt = courtOfPapers(situation);
  const differs = papersCourt && chosenCourt && papersCourt !== chosenCourt;
  return <>
    <h2 className="text-lg font-bold text-[#10231f]">Which court is it in?</h2>
    {differs && <p data-testid="situation-court-differs" className="mt-1 text-sm text-[#5c4a14]">The papers you picked are from {COURT_NAME[papersCourt]}, and you started in {AREA_NAME[chosenCourt]}. Which is it?</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {(["small-claims", "civil", "family"] as SituationCourt[]).map((court) => (
        <button key={court} type="button" data-testid="situation-option" data-value={court} aria-pressed={situation.court === court} onClick={() => onPick(court)}
          className="rounded-2xl border border-[#cde7dc] px-4 py-3 text-left font-semibold aria-pressed:bg-[#2f7d67] aria-pressed:text-white">
          {AREA_NAME[court]}{court === papersCourt ? " (what your papers show)" : court === chosenCourt ? " (where you started)" : ""}
        </button>
      ))}
    </div>
  </>;
}

/**
 * Opens the situation questions again from anywhere on the page (a field answered at the
 * start, shown in the questions one at a time, changes there, never in a second copy).
 */
export const SITUATION_CHANGE_EVENT = "courtsimplified:situation-change";
export function openSituationChange(): void {
  window.dispatchEvent(new Event(SITUATION_CHANGE_EVENT));
}

/** The top line on every page: the person's own answers, with a Change link. Nothing until complete. */
export function SituationLine({ situation, onChange, changeHref }: { situation: Situation; onChange?: () => void; changeHref?: string }) {
  const line = situationLine(situation);
  if (!line) return null;
  return (
    <p data-testid="situation-line" className="mx-auto max-w-6xl px-6 py-2 text-sm font-semibold text-[#16302b]">
      {line}{" · "}
      {onChange
        ? <button type="button" data-testid="situation-change" onClick={onChange} className="font-semibold text-[#2f7d67] underline">Change</button>
        : changeHref ? <a data-testid="situation-change" href={changeHref} className="font-semibold text-[#2f7d67] underline">Change</a> : null}
    </p>
  );
}

/**
 * For a case already going: what has happened so far, once. The options are the stage
 * map's own steps for the court and side, in the words the map gives each (its question
 * in the person's words); steps where something has gone wrong are listed after.
 */
function StageQuestion({ situation, onPick }: { situation: Situation; onPick: (value: string) => void }) {
  const steps = stageChoices(situation);
  const option = (id: string, label: string) => (
    <button key={id} type="button" data-testid="situation-option" data-value={id} aria-pressed={situation.stage === id} onClick={() => onPick(id)}
      className="rounded-2xl border border-[#cde7dc] bg-white px-4 py-3 text-left text-sm font-semibold text-[#16302b] aria-pressed:bg-[#2f7d67] aria-pressed:text-white">
      {label}
    </button>
  );
  const usual = steps.filter((step) => !step.wentWrong);
  const wrong = steps.filter((step) => step.wentWrong);
  return <>
    <h2 className="text-lg font-bold text-[#10231f]">What has happened in the case so far?</h2>
    <p className="mt-1 text-sm text-[#4d675f]">Pick the one closest to where you are now. We ask this once and keep your answer.</p>
    <div className="mt-4 grid gap-2 md:grid-cols-2">{usual.map((step) => option(step.id, step.userQuestion))}</div>
    {wrong.length > 0 && <>
      <p className="mt-4 text-sm font-semibold text-[#4d675f]">If something has gone wrong</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">{wrong.map((step) => option(step.id, step.userQuestion))}</div>
    </>}
    <div className="mt-4">{option("not-sure", "I'm not sure")}</div>
  </>;
}
