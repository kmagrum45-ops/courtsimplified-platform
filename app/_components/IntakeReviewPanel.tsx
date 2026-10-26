"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import MunicipalNoticeFirst from "../builder/_components/MunicipalNoticeFirst";
import { IMMEDIATE_DANGER_MESSAGE } from "../../src/lib/content-library/crisisMessages";
import { municipalNoticeFirst } from "../../src/lib/content-library/municipalNoticeFirst";
import { useIntakeRecovery } from "./IntakeRecovery";
import { NOTICE_GIVEN_EVENT } from "./FirstUseAcknowledgement";
import { withServedDate } from "../builder/_components/guidedFields";
import { dateAnswerCheck, formatForCourt, isDateQuestion } from "../../src/lib/case-system/dates";
import { caseFileOf, slotsOfQuestion, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { isDateQuestionId } from "../../src/lib/case-system/casePosition";
import { situationAnswers, situationOf } from "../../src/lib/case-system/situation/situation";
import { locationOf, STORY_SECTION, storyOf } from "../../src/lib/case-system/intakeStory";
import StoryEditor from "../builder/_components/StoryEditor";
import { freshSections, staleAnswerKeys, storyAnswersOutdated } from "../../src/lib/case-system/storyBasis";
import StoryChangedNotice from "./StoryChangedNotice";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { canReview, initialAnswersOf, reviewQuestionField, inputRevision, remainingEssentialQuestions, reviewEntries, reviewPhase, suggestInitialAnswers, type ReviewEntry } from "../../src/lib/case-system/intakeReview";
import NextStepStatus from "./NextStepStatus";

/** What an answer with no line of its own is, in words. */
const HIDDEN_ANSWER_NAMES: Record<string, string> = {
  "sourced.answers": "Your answers to the questions about the law",
  "builder.triageState": "Your answers about where the family case stands",
  "guided.answeredIds": "The questions answered one at a time",
  "guided.earlierAnswers": "The questions answered one at a time",
  "guided.matchedClaimType": "The kind of claim chosen in the questions",
  "guided.facts": "An answer from the questions answered one at a time",
};

/** A stored choice such as "not-sure" or "moving-party", shown in words. */
const SLUG = /^[a-z]+(?:-[a-z]+)+$/;
const words = (value: string) => SLUG.test(value) ? value.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : value;
/** A stored choice in the words the form shows ("respondent" reads as the form's own sentence). */
const shown = (entry: ReviewEntry, value: string) => entry.choices?.find(choice => choice.value === value)?.label ?? words(value);
/**
 * The step "Show my next step" waits on (the "Before you start" notice), brought to where the
 * person is looking: it sat below the button, out of sight (#477 re-test, case 11).
 */
function showWaitingStep(): boolean {
  const step = document.querySelector<HTMLElement>('[data-testid="first-use-acknowledgement"]');
  if (!step) return false;
  step.scrollIntoView({ behavior: "auto", block: "center" });
  step.querySelector<HTMLInputElement>('[data-testid="acknowledgement-checkbox"]')?.focus({ preventScroll: true });
  return true;
}
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
  // Waiting on the notice: once it is given, the next step is opened, on every route. The
  // notice holds the builder back while some routes still take a Continue, so asking them
  // first opened Small Claims' chooser with no next step and no word why (case 11).
  useEffect(() => {
    if (!waiting || !recovery) return;
    const given = () => { setWaiting(false); recovery.continueToGuidance(); };
    window.addEventListener(NOTICE_GIVEN_EVENT, given);
    return () => window.removeEventListener(NOTICE_GIVEN_EVENT, given);
  }, [waiting, recovery]);
  // The day of service is saved into a Timeline line, which trims it: typed key by key,
  // "October 12" lost its spaces (re-test 2026-10-18). It is kept as typed here and
  // saved, trimmed, when the person leaves the field.
  // A date box's typing, kept until it leaves the box, so its year can be asked first.
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});
  // "Pick everything that fits" in the panel: ticked here, saved together (#470 re-test:
  // the question closed after the first pick).
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  // Questions answered here stay on screen with the answer shown, so the person can change
  // it, including back to what it was (#470 re-test: the question vanished after one answer).
  const [answeredHere, setAnsweredHere] = useState<string[]>([]);
  const keepShown = (id: string) => setAnsweredHere(current => current.includes(id) ? current : [...current, id]);
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  // The order questions first appeared in (see shownQuestions below).
  const seenOrder = useRef<string[]>([]);
  if (!view || !recovery || pathname !== "/builder") return null;
  const { checkpoint, workflowStatus } = view;
  const phase = reviewPhase(workflowStatus, checkpoint);
  const revision = inputRevision(checkpoint);
  // Optional details with nothing in them are not shown (re-test 2026-10-18).
  const entries = reviewEntries(checkpoint).filter(entry => entry.essential || !empty(entry.value));
  const remaining = remainingEssentialQuestions(checkpoint);
  const unanswered = remainingEssentialQuestions(checkpoint, true);
  const listed = [
    ...unanswered,
    ...answeredHere.filter(id => !unanswered.some(question => question.id === id)).map(id => ({ id, label: reviewQuestionField(checkpoint.courtPath, id)?.question ?? QUESTION_BANK.find(item => item.id === id)?.text ?? id })),
  ];
  // Each question stays where it first appeared: an answered one moved to the end of the list,
  // so the questions jumped while the person was answering them (#471 re-test).
  for (const question of listed) if (!seenOrder.current.includes(question.id)) seenOrder.current.push(question.id);
  const shownQuestions = [...listed].sort((a, b) => seenOrder.current.indexOf(a.id) - seenOrder.current.indexOf(b.id));
  /** The answer a civil or Family question holds now, as the form keeps it. */
  const fieldValue = (id: string): unknown => checkpoint.courtPath === "civil" ? (checkpoint.sections.civil?.input as Record<string, unknown> | undefined)?.[id] : checkpoint.sections.family?.[id];
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
  // Small Claims answers set aside by a story change, shown with their question (not wiped).
  const staleInitial: Record<string, string> = Object.fromEntries(Object.entries(initialAnswersOf(checkpoint)).filter(([id]) => staleKeys.has(`builder.initialAnswers.${id}`)));
  const shownKeys = new Set(entries.map(entry => `${entry.section}.${entry.nested ? `${entry.nested}.` : ""}${entry.field}`));
  const hiddenStale = [...staleKeys].filter(key => !shownKeys.has(key) && !key.startsWith("builder.initialAnswers."));
  const fresh = { ...checkpoint, sections: freshSections(checkpoint) };
  // The case file (caseFile.ts): an empty box whose fact was given, or answered "not sure",
  // somewhere else shows that answer instead of asking for it again.
  const caseFile = caseFileOf(checkpoint);
  // Only an answer is shown in place of the box: a "not sure" fact is offered here once more, in its box.
  const answeredSlot = (field: string) => slotsOfQuestion(field).map(fact => caseFile[fact]).find(item => item.state === "answered") ?? null;
  // A "not sure" fact gets ONE box here (its one more offer): a later box for the same fact shows "Not sure yet".
  const offeredInBox = new Set<string>();
  const duplicateUnsure = new Set<string>();
  for (const entry of entries) {
    if (!empty(entry.value) || entry.fromStart || answeredSlot(entry.field)) continue;
    const unsure = slotsOfQuestion(entry.field).filter(fact => caseFile[fact].state === "unsure");
    if (!unsure.length) continue;
    if (unsure.every(fact => offeredInBox.has(fact))) duplicateUnsure.add(entry.field);
    else for (const fact of unsure) offeredInBox.add(fact);
  }
  const heldSlot = (field: string) => answeredSlot(field) ?? (duplicateUnsure.has(field) ? slotsOfQuestion(field).map(fact => caseFile[fact]).find(item => item.state === "unsure") ?? null : null);
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
      recovery.put("family", "timeline", withServedDate(String(recovery.read("family", "timeline") ?? ""), String(value)), true, true, true, true);
      return;
    }
    // Given here, even unchanged, it is an answer to the current story (#471 re-test).
    if (entry.nested) recovery.put(entry.section, entry.nested, { ...(recovery.read(entry.section, entry.nested) as Record<string, unknown>), [entry.field]: value }, true, true, true, entry.field);
    else recovery.put(entry.section, entry.field, value, true, true, true, true);
  }
  /**
   * An answer to an earlier version of the story that has no line or question here (the
   * law questions' answers, the Family triage, the guided questions' own record): kept or
   * set aside here, so it never blocks Confirm out of sight (#471 re-test: civil stayed
   * blocked after every answer shown was given again).
   */
  /** The answer itself, as text: each law question with its answer, or the value. */
  function shownAnswer(key: string): string {
    const [section, field, inner] = key.split(".");
    const value = inner === undefined ? checkpoint.sections[section]?.[field] : (checkpoint.sections[section]?.[field] as Record<string, unknown> | undefined)?.[inner];
    if (Array.isArray(value)) return value.map(item => item && typeof item === "object" && "question" in item ? `${String((item as { question: unknown }).question)}: ${String((item as { answer?: unknown }).answer ?? "")}` : String(item)).join("\n");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).filter(item => typeof item === "string" && item.trim()).join("; ");
    return String(value ?? "");
  }
  function keepOrSetAside(key: string, keep: boolean) {
    if (!recovery) return;
    const [section, field, inner] = key.split(".");
    const current = recovery.read(section, field);
    if (inner !== undefined) {
      const record = { ...((current as Record<string, unknown> | undefined) ?? {}) };
      if (!keep) delete record[inner];
      recovery.put(section, field, record, true, true, true, keep ? inner : undefined);
      return;
    }
    const empty = Array.isArray(current) ? [] : current && typeof current === "object" ? {} : typeof current === "string" ? "" : null;
    recovery.put(section, field, keep ? current : empty, true, true, true, keep ? true : undefined);
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
      recovery.put("family", "timeline", withServedDate(String(recovery.read("family", "timeline") ?? ""), String(value)), true, true, true, true);
      keepShown(questionId);
      return;
    }
    keepShown(questionId);
    // Answered again here: based on the current story even when the value is the same
    // (#470 re-test: re-choosing the same side never cleared "earlier version").
    if (court === "civil") {
      const input = (recovery.read("civil", "input") as Record<string, unknown> | undefined) ?? {};
      recovery.put("civil", "input", { ...input, [questionId]: value }, true, true, true, questionId);
    } else recovery.put("family", questionId, value, true, true, true, true);
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
    recovery.put("builder", "initialAnswers", { ...initialAnswersOf({ ...now, sections: freshSections(now) }), [questionId]: value }, true, false, true, questionId);
    keepShown(questionId);
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
        {entries.map(entry => { const held = empty(entry.value) && !entry.fromStart ? heldSlot(entry.field) : null; return <div key={`${entry.section}:${entry.nested ?? ""}:${entry.field}`} data-testid="intake-entry" data-field={entry.field} data-empty={empty(entry.value) && !entry.fromStart && !held ? "true" : "false"} className="block text-sm">
          {entry.label}{!entry.essential && " (optional later detail)"}
          {entry.hint && empty(entry.value) && <span className="block text-[#4d675f]">{entry.hint}</span>}
          {staleKeys.has(`${entry.section}.${entry.nested ? `${entry.nested}.` : ""}${entry.field}`) && <span data-testid="intake-answer-stale" className="block text-[#7a4b12]">Answered for an earlier version of your story. Answer it again, or start the questions again.</span>}
          {/* The story: a draft saved with "Save story", as in the form (#470 re-test: typing here
              changed the story at once and set every answer aside). */}
          {held ? <p className="mt-1" data-testid="intake-entry-held" aria-label={`Review: ${entry.label}`}>{slotText(held, formatForCourt)} <span className="text-[#4d675f]">(your answer {held.source?.kind === "answer" && held.source.question.startsWith("situation:") ? "at the start; change it at the top of the page" : "already given; it is not asked again"})</span></p>
          : entry.section === STORY_SECTION && entry.field === "text" ? <div className="mt-1"><StoryEditor section={checkpoint.courtPath} story={String(entry.value)} onSave={text => edit(entry, text)} startOpen draftField="reviewStoryDraft" label={`Review: ${entry.label}`} heading={null} showStory={false} ids={{ toggle: "review-story-edit", draft: "review-story-draft", save: "review-story-save" }} /></div>
          : entry.fromStart ? <p className="mt-1" data-testid="intake-entry-from-start" aria-label={`Review: ${entry.label}`}>{Array.isArray(entry.value) ? entry.value.map(value => shown(entry, value)).join(", ") : typeof entry.value === "string" ? shown(entry, entry.value) : String(entry.value)} <span className="text-[#4d675f]">(from your answers at the start; change them at the top of the page)</span></p>
          : Array.isArray(entry.value) ? <div role="group" aria-label={`Review: ${entry.label}`}>{entry.value.length ? entry.value.map(value => <label key={value} className="mr-3 block"><input type="checkbox" checked disabled={busy} onChange={() => edit(entry, (entry.value as string[]).filter(item => item !== value))} /> {shown(entry, value)}</label>) : <span>Not recorded</span>}</div>
            : typeof entry.value === "boolean" ? <div role="group" aria-label={`Review: ${entry.label}`} className="mt-1 flex gap-2">{/* Yes or No, the answer marked: an unticked box read the same as no answer (#470 re-test: "nothing filed" showed no "Claim Filed" tick). */}{([true, false] as const).map(choice => <button key={String(choice)} type="button" data-testid="intake-entry-yes-no" aria-pressed={entry.value === choice} disabled={busy} onClick={() => edit(entry, choice)} className="rounded border px-3 py-1 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">{choice ? "Yes" : "No"}</button>)}</div>
              : typeof entry.value === "string" && (entry.choices || SLUG.test(entry.value)) ? <p className="mt-1" aria-label={`Review: ${entry.label}`}>{shown(entry, entry.value)} <span className="text-[#4d675f]">(change this in the intake controls)</span></p>
                : typeof entry.value === "string" && isDateQuestion(entry.question ?? entry.label, { dateQuestion: entry.section === "family" && entry.field === "servedDate" }) ? (() => {
                  /* Every box whose question asks for a date asks for its year, as in the questions (#470 re-test: Family's "October 6" was kept; step 1 reviewer: civil's "When and how you were served" was not checked here). */
                  const key = `entry:${entry.section}:${entry.field}`;
                  const draft = dateDrafts[key];
                  return <>{fieldNotes[key] ? <p data-testid="intake-entry-needs-more" className="mt-1 text-sm text-[#8a4b12]">{fieldNotes[key]}</p> : null}<input type="text" aria-label={`Review: ${entry.label}`} className="mt-1 block w-full rounded border p-2" placeholder="For example: October 12, 2026" value={draft ?? String(entry.value)} disabled={busy} onChange={event => setDateDrafts(current => ({ ...current, [key]: event.target.value }))} onBlur={() => { if (draft === undefined) return; const typed = draft.trim(); const servedDate = entry.section === "family" && entry.field === "servedDate"; const more = typed ? dateAnswerCheck(entry.question ?? entry.label, typed, { dateQuestion: servedDate, oneDate: servedDate }) : null; setFieldNotes(current => ({ ...current, [key]: more ?? "" })); if (more) return; edit(entry, typed); setDateDrafts(current => { const next = { ...current }; delete next[key]; return next; }); }} onKeyDown={event => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} /></>;
                })()
                : <textarea aria-label={`Review: ${entry.label}`} className="mt-1 block min-h-20 w-full rounded border p-2" value={String(entry.value)} disabled={busy} onChange={event => { if (typeof entry.value === "number") { if (event.target.value.trim() && Number.isFinite(Number(event.target.value))) edit(entry, Number(event.target.value)); } else edit(entry, event.target.value); }} />}
        </div>; })}
      </div>
      {phase === "reviewing" && hiddenStale.length > 0 && <fieldset className="mt-5" data-testid="intake-hidden-stale"><legend>Other answers given for an earlier version of your story</legend>{hiddenStale.map(key => <div key={key} className="my-3" data-testid="intake-hidden-stale-item" data-key={key}>
        <p className="font-semibold">{HIDDEN_ANSWER_NAMES[key] ?? HIDDEN_ANSWER_NAMES[key.split(".").slice(0, 2).join(".")] ?? "An earlier answer"}</p>
        <p className="whitespace-pre-line text-[#4d675f]">{shownAnswer(key)}</p>
        <button type="button" data-testid="intake-hidden-keep" disabled={busy} onClick={() => keepOrSetAside(key, true)} className="mr-2 rounded border px-3 py-1">Keep it</button>
        <button type="button" data-testid="intake-hidden-set-aside" disabled={busy} onClick={() => keepOrSetAside(key, false)} className="rounded border px-3 py-1">Set it aside</button>
      </div>)}</fieldset>}
      {phase === "reviewing" && shownQuestions.length > 0 && <fieldset className="mt-5"><legend>Remaining initial questions</legend><p>Answer these here or in the intake controls, or record that you do not know. A suggestion read from your story is only a suggestion until you choose it. Evidence research is optional.</p>{shownQuestions.map(question => {
        const bank = QUESTION_BANK.find(item => item.id === question.id);
        const suggested = suggestions[question.id];
        const answered = !unanswered.some(item => item.id === question.id);
        return <div key={question.id} className="my-4" data-testid="intake-initial-question" data-question={question.id} data-answered={answered ? "true" : "false"} data-unknown={unknowns.includes(question.id) ? "true" : "false"}>
          <p className="font-semibold">{question.label}</p>
          {staleInitial[question.id] ? <p data-testid="intake-answer-stale" className="text-[#7a4b12]">Answered for an earlier version of your story: &ldquo;{staleInitial[question.id]}&rdquo;. <button type="button" data-testid="intake-keep-answer" disabled={busy} onClick={() => answer(question.id, staleInitial[question.id])} className="underline">Keep this answer</button> or choose again.</p> : null}
          {bank?.answerType === "choice" && Array.isArray(bank.choices) && <div className="mt-1 flex flex-wrap gap-2">{bank.choices.map(choice => <button key={choice} type="button" disabled={busy} aria-pressed={initialAnswersOf(fresh)[question.id] === choice} onClick={() => answer(question.id, choice)} className="rounded border px-3 py-1 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">{choice}{choice === suggested ? " (suggested from your story)" : ""}</button>)}</div>}
          {bank?.answerType === "yes-no" && <div className="mt-1 flex flex-wrap gap-2">{["Yes", "No"].map(choice => <button key={choice} type="button" disabled={busy} aria-pressed={initialAnswersOf(fresh)[question.id] === choice} onClick={() => answer(question.id, choice)} className="rounded border px-3 py-1 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">{choice}</button>)}</div>}
          {/* Typed answers save when the person leaves the box (Enter too): a value typed but never "used" counted for nothing (re-test round 7). */}
          {bank && ["date", "amount", "short-text"].includes(bank.answerType) && <div className="mt-1 flex flex-wrap items-center gap-2"><input type="text" placeholder={bank.answerType === "date" ? "For example: August 2026, or 2026-08-15" : bank.answerType === "amount" ? "For example: $8,500" : "Your answer"} aria-label={`Answer: ${question.label}`} value={dates[question.id] ?? ""} disabled={busy} onChange={event => setDates(current => ({ ...current, [question.id]: event.target.value }))} onBlur={() => { const typed = dates[question.id]; if (typed === undefined || !typed.trim()) return; const more = dateAnswerCheck(question.label, typed.trim(), { dateQuestion: bank.answerType === "date", oneDate: isDateQuestionId(question.id) }); setFieldNotes(current => ({ ...current, [question.id]: more ?? "" })); if (!more) answer(question.id, typed.trim()); }} onKeyDown={event => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} className="rounded border px-2 py-1" />{/* A suggestion is a button, never a filled-looking box that was not saved (re-test round 7). */}{suggested && <button type="button" data-testid="intake-use-suggestion" disabled={busy} onClick={() => answer(question.id, suggested)} className="rounded border px-3 py-1">Use “{suggested}” (from your story)</button>}</div>}
          {bank && fieldNotes[question.id] ? <p data-testid="intake-field-needs-more" className="mt-1 text-sm text-[#8a4b12]">{fieldNotes[question.id]}</p> : null}
          {/* Civil and Family: the form's own field, answerable here (#469 re-test). */}
          {!bank && (() => {
            const field = reviewQuestionField(checkpoint.courtPath, question.id);
            if (!field) return null;
            // "Nothing filed yet" is not offered once the situation answers say papers exist (step 2).
            const ruledOut = situationAnswers(checkpoint.courtPath, situationOf(checkpoint.sections)).excludeDocuments ?? [];
            const options = field.options.filter(option => !ruledOut.includes(option.value));
            if (field.kind === "choice") return <div className="mt-1 flex flex-wrap gap-2">{options.map(option => <button key={option.value} type="button" data-testid="intake-field-choice" aria-pressed={answered && fieldValue(question.id) === option.value} disabled={busy} onClick={() => answerField(question.id, option.value)} className="rounded border px-3 py-1 aria-pressed:bg-[#2f7d67] aria-pressed:text-white">{option.label}</button>)}</div>;
            if (field.kind === "multi") {
              const held = fieldValue(question.id);
              const ticked = picks[question.id] ?? (answered && Array.isArray(held) ? held as string[] : []);
              return <div className="mt-1" role="group" aria-label={question.label}>{options.map(option => <label key={option.value} className="mr-3 block"><input type="checkbox" data-testid="intake-field-pick" value={option.value} checked={ticked.includes(option.value)} disabled={busy} onChange={() => setPicks(current => ({ ...current, [question.id]: ticked.includes(option.value) ? ticked.filter(value => value !== option.value) : [...ticked, option.value] }))} /> {option.label}</label>)}<button type="button" data-testid="intake-field-save" disabled={busy || ticked.length === 0} onClick={() => answerField(question.id, ticked)} className="mt-2 rounded border px-3 py-1 disabled:opacity-50">Save these</button></div>;
            }
            return <div className="mt-1"><div className="flex flex-wrap items-center gap-2"><input type="text" aria-label={`Answer: ${question.label}`} placeholder="Your answer" value={dates[question.id] ?? ""} disabled={busy} onChange={event => setDates(current => ({ ...current, [question.id]: event.target.value }))} onBlur={() => typedField(question.id, (typed) => field.needsMore?.(typed) ?? dateAnswerCheck(field.question, typed))} onKeyDown={event => { if (event.key === "Enter") typedField(question.id, (typed) => field.needsMore?.(typed) ?? dateAnswerCheck(field.question, typed)); }} className="min-w-[16rem] flex-1 rounded border px-3 py-1" /></div>{fieldNotes[question.id] ? <p data-testid="intake-field-needs-more" className="mt-1 text-sm text-[#8a4b12]">{fieldNotes[question.id]}</p> : null}</div>;
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
    {phase === "user-confirmed" && !viewing && <><p>Your initial information is confirmed. Choose &quot;Show my next step&quot; to see it, with its form and deadline. Further evidence and research questions are optional. Changing initial facts requires a new review.</p><button data-testid="intake-continue-guidance" type="button" disabled={busy || questionsOutdated} onClick={() => { if (showWaitingStep()) { setWaiting(true); return; } setWaiting(!recovery.continueToGuidance()); }} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Show my next step</button>{" "}<button data-testid="intake-view-review" type="button" disabled={busy} onClick={() => setViewing(true)}>Review or correct initial information</button>
      <NextStepStatus />
      <StoryChangedNotice where="button" /></>}
    {waiting && phase === "user-confirmed" && <p data-testid="intake-continue-waiting" role="status" className="mt-2 text-sm">Finish the step shown below first; your next step will then appear.</p>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Saving your review...</p>}
  </section>;
}
