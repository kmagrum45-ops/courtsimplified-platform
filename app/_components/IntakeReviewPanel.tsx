"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import MunicipalNoticeFirst from "../builder/_components/MunicipalNoticeFirst";
import { IMMEDIATE_DANGER_MESSAGE } from "../../src/lib/content-library/crisisMessages";
import { municipalNoticeFirst } from "../../src/lib/content-library/municipalNoticeFirst";
import { useIntakeRecovery } from "./IntakeRecovery";
import { withServedDate } from "../builder/_components/guidedFields";
import { locationOf, STORY_SECTION, storyOf } from "../../src/lib/case-system/intakeStory";
import StoryEditor from "../builder/_components/StoryEditor";
import { freshSections, staleAnswerKeys, storyAnswersOutdated } from "../../src/lib/case-system/storyBasis";
import StoryChangedNotice from "./StoryChangedNotice";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { canReview, initialAnswersOf, reviewQuestionField, inputRevision, remainingEssentialQuestions, reviewEntries, reviewPhase, suggestInitialAnswers, type ReviewEntry } from "../../src/lib/case-system/intakeReview";
import NextStepStatus from "./NextStepStatus";

/** A stored choice such as "not-sure" or "moving-party", shown in words. */
const SLUG = /^[a-z]+(?:-[a-z]+)+$/;
const words = (value: string) => SLUG.test(value) ? value.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : value;
/** A stored choice in the words the form shows ("respondent" reads as the form's own sentence). */
const shown = (entry: ReviewEntry, value: string) => entry.choices?.find(choice => choice.value === value)?.label ?? words(value);
const empty = (value: ReviewEntry["value"]) => Array.isArray(value) ? value.length === 0 : typeof value === "string" ? !value.trim() : false;

export default function IntakeReviewPanel() {
  const recovery = useIntakeRecovery();
  const pathname = usePathname();
  const view = useSyncExternalStore(recovery?.subscribe ?? (() => () => {}), recovery?.getReview ?? (() => null), () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedRevision, setAcceptedRevision] = useState<string | null>(null);
  // Opening a confirmed intake to look at it is not a change (re-test 2026-10-18).
  const [viewing, setViewing] = useState(false);
  const [dates, setDates] = useState<Record<string, string>>({});
  // "Show my next step" with no intake on the page yet (the "Before you start" step is showing).
  const [waiting, setWaiting] = useState(false);
  // The day of service is saved into a Timeline line, which trims it: typed key by key,
  // "October 12" lost its spaces (re-test 2026-10-18). It is kept as typed here and
  // saved, trimmed, when the person leaves the field.
  const [servedDraft, setServedDraft] = useState<string | null>(null);
  // "Pick everything that fits" in the panel: ticked here, saved together (#470 re-test:
  // the question closed after the first pick).
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  if (!view || !recovery || pathname !== "/builder") return null;
  const { checkpoint, workflowStatus } = view;
  const phase = reviewPhase(workflowStatus, checkpoint);
  const revision = inputRevision(checkpoint);
  // Optional details with nothing in them are not shown (re-test 2026-10-18).
  const entries = reviewEntries(checkpoint).filter(entry => entry.essential || !empty(entry.value));
  const remaining = remainingEssentialQuestions(checkpoint);
  const unanswered = remainingEssentialQuestions(checkpoint, true);
  const unknowns = Array.isArray(checkpoint.sections.builder?.initialUnknowns) ? checkpoint.sections.builder.initialUnknowns as string[] : [];
  const suggestions = suggestInitialAnswers(checkpoint);
  const story = storyOf(checkpoint.sections);
  const city = locationOf(checkpoint.sections)?.city ?? "";
  const legacy = workflowStatus.intakeCompleted === true && !workflowStatus.intakeReview;
  const showEntries = phase === "reviewing" || (phase === "user-confirmed" && viewing);
  // The guided questions read an earlier story: no next step from them, on any route.
  // Answers based on an earlier version of the story, in any area (storyBasis.ts).
  const questionsOutdated = storyAnswersOutdated(checkpoint);
  const staleKeys = new Set(staleAnswerKeys(checkpoint));
  const fresh = { ...checkpoint, sections: freshSections(checkpoint) };
  async function act(action: "review" | "collect" | "confirm") {
    if (!recovery || busy) return;
    setBusy(true); setError("");
    try { await recovery.transition(action, revision); setAcceptedRevision(null); setViewing(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Your review could not be saved. Please retry."); }
    finally { setBusy(false); }
  }
  /** Edits made here are review edits: a confirmed intake goes back to reviewing, not to the start. */
  function edit(entry: ReviewEntry, value: ReviewEntry["value"]) {
    if (!recovery) return;
    // The day of service lives in the Family Timeline, as the form keeps it.
    if (entry.section === "family" && entry.field === "servedDate") {
      recovery.put("family", "timeline", withServedDate(String(recovery.read("family", "timeline") ?? ""), String(value)), true, true, true);
      return;
    }
    if (entry.nested) recovery.put(entry.section, entry.nested, { ...(recovery.read(entry.section, entry.nested) as Record<string, unknown>), [entry.field]: value }, true, true, true);
    else recovery.put(entry.section, entry.field, value, true, true, true);
  }
  /** The person's answer to an initial question; a chosen side also fills an empty side field in the form. */
  /** A civil or Family remaining question, answered in the panel: written into that form's own field. */
  function answerField(questionId: string, value: string | string[]) {
    const court = checkpoint.courtPath;
    if (!recovery || (court !== "civil" && court !== "family")) return;
    // Every write here tells the form (external): without it the form never saw the answer
    // and wrote its own value back (#470 re-test: the served date was "rejected", the role
    // showed "Select your role", "Nothing filed yet" reached no analysis).
    if (court === "family" && questionId === "servedDate") {
      // Family keeps the day of service in its Timeline, as the form does.
      recovery.put("family", "timeline", withServedDate(String(recovery.read("family", "timeline") ?? ""), String(value)), true, true, true);
      return;
    }
    if (court === "civil") {
      const input = (recovery.read("civil", "input") as Record<string, unknown> | undefined) ?? {};
      recovery.put("civil", "input", { ...input, [questionId]: value }, true, true, true);
    } else recovery.put("family", questionId, value, true, true, true);
    // Chosen here by the person, so their own side and filings (stageFromAnswers.ts).
    if (questionId === "yourRole") {
      const set = recovery.read(court, "personSet");
      recovery.put(court, "personSet", [...new Set([...(Array.isArray(set) ? set : []), "yourRole"])], false, true);
    }
    if (questionId === (court === "civil" ? "documents" : "filedDocuments")) recovery.put(court, "personDocuments", Array.isArray(value) ? value : [value], false, true);
  }
  /** A typed answer to a civil or Family question: kept only once the field's own check passes. */
  function typedField(questionId: string, needsMore?: (value: string) => string | null) {
    const typed = (dates[questionId] ?? "").trim();
    if (!typed) return;
    const more = needsMore?.(typed) ?? null;
    setFieldNotes(current => ({ ...current, [questionId]: more ?? "" }));
    if (!more) answerField(questionId, typed);
  }

  function answer(questionId: string, value: string) {
    if (!recovery) return;
    // From the store as it is now, not as last drawn: typing an amount and then clicking "No"
    // straight away saved the click over the amount (re-test round 7).
    const now = recovery.getReview().checkpoint;
    recovery.put("builder", "initialAnswers", { ...initialAnswersOf({ ...now, sections: freshSections(now) }), [questionId]: value }, true, false, true);
    const input = recovery.read("small-claims", "input") as Record<string, unknown> | undefined;
    if (questionId === "sc-orient-role" && input && !["plaintiff", "defendant"].includes(String(input.yourRole))) {
      recovery.put("small-claims", "input", { ...input, yourRole: value.includes("defendant") ? "defendant" : "plaintiff" }, true, true, true);
    }
  }
  const needs = [
    !canReview(checkpoint) && "your city and a description of what happened",
    remaining.length > 0 && `an answer, or "I do not know yet", for: ${remaining.map(question => question.label).join("; ")}`,
    questionsOutdated && "the answers marked as given for an earlier version of your story answered again, or the questions started again from your story",
    acceptedRevision !== revision && "a tick in \"I have reviewed this information\"",
  ].filter(Boolean) as string[];
  // scroll-mt-28: a scroll to the panel stops below the 77px sticky header, not under it (L46).
  return <section className="mx-auto my-4 max-w-6xl scroll-mt-28 rounded-2xl border border-[#d8e6df] bg-white p-6" data-testid="intake-review" data-phase={phase}>
    <h2 className="text-xl font-bold">{phase === "user-confirmed" ? "Initial intake confirmed" : phase === "reviewing" ? "Review your initial case information" : "Your initial case information"}</h2>
    <details data-testid="intake-safety-resources" className="my-3"><summary>Safety information and support</summary><p className="whitespace-pre-line">{[IMMEDIATE_DANGER_MESSAGE.split("\n\n")[0], ...IMMEDIATE_DANGER_MESSAGE.split("\n\n").slice(2)].join("\n\n")}</p><p>This information is available without an AI safety check. An unavailable check does not establish that a situation is safe.</p></details>
    {checkpoint.courtPath !== "family" && municipalNoticeFirst(story, { city }) && <aside aria-label="Urgent procedural warning" className="my-4"><h3 className="font-bold">Urgent procedural warning — check this while completing intake</h3><MunicipalNoticeFirst story={story} city={city} /></aside>}
    {legacy && <p>This case was completed before explicit review was introduced. There is no recorded confirmation under the new review process.</p>}
    <p>Initial questions establish your situation, side, what has happened, relevant dates and what you want. Evidence details and additional research are optional later work.</p>
    <p>You can stop initial questioning and review once your city and situation are recorded. Details you do not know can stay unknown; confirmation does not supply missing facts.</p>
    {showEntries && <>
      <p>{phase === "user-confirmed" ? "This is what you confirmed. Changing anything here means confirming again." : "Edit the information below, or return to the intake controls to change choices. Empty answers remain unknown."}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {entries.map(entry => <div key={`${entry.section}:${entry.nested ?? ""}:${entry.field}`} className="block text-sm">
          {entry.label}{!entry.essential && " (optional later detail)"}
          {entry.hint && empty(entry.value) && <span className="block text-[#4d675f]">{entry.hint}</span>}
          {staleKeys.has(`${entry.section}.${entry.nested ? `${entry.nested}.` : ""}${entry.field}`) && <span data-testid="intake-answer-stale" className="block text-[#7a4b12]">Answered for an earlier version of your story. Answer it again, or start the questions again.</span>}
          {/* The story: a draft saved with "Save story", as in the form (#470 re-test: typing here
              changed the story at once and set every answer aside). */}
          {entry.section === STORY_SECTION && entry.field === "text" ? <div className="mt-1"><StoryEditor section={checkpoint.courtPath} story={String(entry.value)} onSave={text => edit(entry, text)} startOpen draftField="reviewStoryDraft" label={`Review: ${entry.label}`} heading={null} showStory={false} ids={{ draft: "review-story-draft", save: "review-story-save" }} /></div>
          : Array.isArray(entry.value) ? <div role="group" aria-label={`Review: ${entry.label}`}>{entry.value.length ? entry.value.map(value => <label key={value} className="mr-3 block"><input type="checkbox" checked disabled={busy} onChange={() => edit(entry, (entry.value as string[]).filter(item => item !== value))} /> {shown(entry, value)}</label>) : <span>Not recorded</span>}</div>
            : typeof entry.value === "boolean" ? <input aria-label={`Review: ${entry.label}`} type="checkbox" checked={entry.value} disabled={busy} onChange={event => edit(entry, event.target.checked)} />
              : typeof entry.value === "string" && (entry.choices || SLUG.test(entry.value)) ? <p className="mt-1" aria-label={`Review: ${entry.label}`}>{shown(entry, entry.value)} <span className="text-[#4d675f]">(change this in the intake controls)</span></p>
                : entry.section === "family" && entry.field === "servedDate" ? <input aria-label={`Review: ${entry.label}`} className="mt-1 block w-full rounded border p-2" placeholder="For example: October 12, 2026" value={servedDraft ?? String(entry.value)} disabled={busy} onChange={event => setServedDraft(event.target.value)} onBlur={() => { if (servedDraft !== null) { edit(entry, servedDraft.trim()); setServedDraft(null); } }} />
                : <textarea aria-label={`Review: ${entry.label}`} className="mt-1 block min-h-20 w-full rounded border p-2" value={String(entry.value)} disabled={busy} onChange={event => { if (typeof entry.value === "number") { if (event.target.value.trim() && Number.isFinite(Number(event.target.value))) edit(entry, Number(event.target.value)); } else edit(entry, event.target.value); }} />}
        </div>)}
      </div>
      {phase === "reviewing" && unanswered.length > 0 && <fieldset className="mt-5"><legend>Remaining initial questions</legend><p>Answer these here or in the intake controls, or record that you do not know. A suggestion read from your story is only a suggestion until you choose it. Evidence research is optional.</p>{unanswered.map(question => {
        const bank = QUESTION_BANK.find(item => item.id === question.id);
        const suggested = suggestions[question.id];
        return <div key={question.id} className="my-4" data-testid="intake-initial-question" data-question={question.id}>
          <p className="font-semibold">{question.label}</p>
          {bank?.answerType === "choice" && Array.isArray(bank.choices) && <div className="mt-1 flex flex-wrap gap-2">{bank.choices.map(choice => <button key={choice} type="button" disabled={busy} aria-pressed={initialAnswersOf(fresh)[question.id] === choice} onClick={() => answer(question.id, choice)} className="rounded border px-3 py-1 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">{choice}{choice === suggested ? " (suggested from your story)" : ""}</button>)}</div>}
          {bank?.answerType === "yes-no" && <div className="mt-1 flex flex-wrap gap-2">{["Yes", "No"].map(choice => <button key={choice} type="button" disabled={busy} aria-pressed={initialAnswersOf(fresh)[question.id] === choice} onClick={() => answer(question.id, choice)} className="rounded border px-3 py-1 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">{choice}</button>)}</div>}
          {/* Typed answers save when the person leaves the box (Enter too): a value typed but never "used" counted for nothing (re-test round 7). */}
          {bank && ["date", "amount", "short-text"].includes(bank.answerType) && <div className="mt-1 flex flex-wrap items-center gap-2"><input type="text" placeholder={bank.answerType === "date" ? "For example: August 2026, or 2026-08-15" : bank.answerType === "amount" ? "For example: $8,500" : "Your answer"} aria-label={`Answer: ${question.label}`} value={dates[question.id] ?? ""} disabled={busy} onChange={event => setDates(current => ({ ...current, [question.id]: event.target.value }))} onBlur={() => { const typed = dates[question.id]; if (typed !== undefined && typed.trim()) answer(question.id, typed.trim()); }} onKeyDown={event => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} className="rounded border px-2 py-1" />{/* A suggestion is a button, never a filled-looking box that was not saved (re-test round 7). */}{suggested && <button type="button" data-testid="intake-use-suggestion" disabled={busy} onClick={() => answer(question.id, suggested)} className="rounded border px-3 py-1">Use “{suggested}” (from your story)</button>}</div>}
          {/* Civil and Family: the form's own field, answerable here (#469 re-test). */}
          {!bank && (() => {
            const field = reviewQuestionField(checkpoint.courtPath, question.id);
            if (!field) return null;
            if (field.kind === "choice") return <div className="mt-1 flex flex-wrap gap-2">{field.options.map(option => <button key={option.value} type="button" data-testid="intake-field-choice" disabled={busy} onClick={() => answerField(question.id, option.value)} className="rounded border px-3 py-1">{option.label}</button>)}</div>;
            if (field.kind === "multi") {
              const ticked = picks[question.id] ?? [];
              return <div className="mt-1" role="group" aria-label={question.label}>{field.options.map(option => <label key={option.value} className="mr-3 block"><input type="checkbox" data-testid="intake-field-pick" value={option.value} checked={ticked.includes(option.value)} disabled={busy} onChange={() => setPicks(current => ({ ...current, [question.id]: ticked.includes(option.value) ? ticked.filter(value => value !== option.value) : [...ticked, option.value] }))} /> {option.label}</label>)}<button type="button" data-testid="intake-field-save" disabled={busy || ticked.length === 0} onClick={() => answerField(question.id, ticked)} className="mt-2 rounded border px-3 py-1 disabled:opacity-50">Save these</button></div>;
            }
            return <div className="mt-1"><div className="flex flex-wrap items-center gap-2"><input type="text" aria-label={`Answer: ${question.label}`} placeholder="Your answer" value={dates[question.id] ?? ""} disabled={busy} onChange={event => setDates(current => ({ ...current, [question.id]: event.target.value }))} onBlur={() => typedField(question.id, field.needsMore)} onKeyDown={event => { if (event.key === "Enter") typedField(question.id, field.needsMore); }} className="min-w-[16rem] flex-1 rounded border px-3 py-1" /></div>{fieldNotes[question.id] ? <p data-testid="intake-field-needs-more" className="mt-1 text-sm text-[#8a4b12]">{fieldNotes[question.id]}</p> : null}</div>;
          })()}
          <label className="mt-1 block"><input type="checkbox" data-testid="intake-unknown" checked={unknowns.includes(question.id)} disabled={busy} onChange={event => { const current = Array.isArray(recovery.read("builder", "initialUnknowns")) ? recovery.read("builder", "initialUnknowns") as string[] : []; recovery.put("builder", "initialUnknowns", event.target.checked ? [...current.filter(id => id !== question.id), question.id] : current.filter(id => id !== question.id), true, false, true); }} /> I do not know yet</label>
        </div>;
      })}</fieldset>}
      {phase === "reviewing" ? <>
        <label className="mt-5 block"><input data-testid="intake-review-acknowledgement" type="checkbox" checked={acceptedRevision === revision} disabled={busy} onChange={event => setAcceptedRevision(event.target.checked ? revision : null)} /> I have reviewed this information, including anything that is missing or uncertain.</label>
        <button data-testid="intake-confirm" type="button" disabled={busy || needs.length > 0} onClick={() => void act("confirm")} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Confirm my initial information</button>{" "}
        <button type="button" disabled={busy} onClick={() => void act("collect")}>Return to intake controls</button>
        {needs.length > 0 && <p data-testid="intake-confirm-needs" className="mt-2 text-sm text-[#4d675f]">Still needed before you can confirm: {needs.join("; ")}.</p>}
        <StoryChangedNotice where="button" />
      </> : <button data-testid="intake-close-review" type="button" className="mt-4 rounded border px-4 py-2" onClick={() => setViewing(false)}>Close</button>}
    </>}
    {phase === "collecting" && <button data-testid="intake-start-review" type="button" disabled={busy || !canReview(checkpoint)} onClick={() => void act("review")} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Stop initial questions and review</button>}
    {phase === "user-confirmed" && !viewing && <><p>Your initial information is confirmed. Choose &quot;Show my next step&quot; to see it, with its form and deadline. Further evidence and research questions are optional. Changing initial facts requires a new review.</p><button data-testid="intake-continue-guidance" type="button" disabled={busy || questionsOutdated} onClick={() => setWaiting(!recovery.continueToGuidance())} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Show my next step</button>{" "}<button data-testid="intake-view-review" type="button" disabled={busy} onClick={() => setViewing(true)}>Review or correct initial information</button>
      <NextStepStatus />
      <StoryChangedNotice where="button" /></>}
    {waiting && phase === "user-confirmed" && <p data-testid="intake-continue-waiting" role="status" className="mt-2 text-sm">Finish the step shown below first; your next step will then appear.</p>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Saving your review...</p>}
  </section>;
}
