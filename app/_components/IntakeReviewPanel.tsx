"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import MunicipalNoticeFirst from "../builder/_components/MunicipalNoticeFirst";
import { IMMEDIATE_DANGER_MESSAGE } from "../../src/lib/content-library/crisisMessages";
import { municipalNoticeFirst } from "../../src/lib/content-library/municipalNoticeFirst";
import { useIntakeRecovery } from "./IntakeRecovery";
import { locationOf, storyOf } from "../../src/lib/case-system/intakeStory";
import { canReview, inputRevision, remainingEssentialQuestions, reviewEntries, reviewPhase, type ReviewEntry } from "../../src/lib/case-system/intakeReview";

export default function IntakeReviewPanel() {
  const recovery = useIntakeRecovery();
  const pathname = usePathname();
  const view = useSyncExternalStore(recovery?.subscribe ?? (() => () => {}), recovery?.getReview ?? (() => null), () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedRevision, setAcceptedRevision] = useState<string | null>(null);
  if (!view || !recovery || pathname !== "/builder") return null;
  const { checkpoint, workflowStatus } = view;
  const phase = reviewPhase(workflowStatus, checkpoint);
  const revision = inputRevision(checkpoint);
  const entries = reviewEntries(checkpoint);
  const remaining = remainingEssentialQuestions(checkpoint);
  const unanswered = remainingEssentialQuestions(checkpoint, true);
  const unknowns = Array.isArray(checkpoint.sections.builder?.initialUnknowns) ? checkpoint.sections.builder.initialUnknowns as string[] : [];
  const story = storyOf(checkpoint.sections);
  const city = locationOf(checkpoint.sections)?.city ?? "";
  const legacy = workflowStatus.intakeCompleted === true && !workflowStatus.intakeReview;
  async function act(action: "review" | "collect" | "confirm") {
    if (!recovery || busy) return;
    setBusy(true); setError("");
    try { await recovery.transition(action, revision); setAcceptedRevision(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Your review could not be saved. Please retry."); }
    finally { setBusy(false); }
  }
  function edit(entry: ReviewEntry, value: ReviewEntry["value"]) {
    if (!recovery) return;
    if (entry.nested) recovery.put(entry.section, entry.nested, { ...(recovery.read(entry.section, entry.nested) as Record<string, unknown>), [entry.field]: value }, true, true);
    else recovery.put(entry.section, entry.field, value, true, true);
  }
  return <section className="mx-auto my-4 max-w-6xl rounded-2xl border border-[#d8e6df] bg-white p-6" data-testid="intake-review" data-phase={phase}>
    <h2 className="text-xl font-bold">{phase === "user-confirmed" ? "Initial intake confirmed" : phase === "reviewing" ? "Review your initial case information" : "Your initial case information"}</h2>
    <details data-testid="intake-safety-resources" className="my-3"><summary>Safety information and support</summary><p className="whitespace-pre-line">{[IMMEDIATE_DANGER_MESSAGE.split("\n\n")[0], ...IMMEDIATE_DANGER_MESSAGE.split("\n\n").slice(2)].join("\n\n")}</p><p>This information is available without an AI safety check. An unavailable check does not establish that a situation is safe.</p></details>
    {checkpoint.courtPath !== "family" && municipalNoticeFirst(story, { city }) && <aside aria-label="Urgent procedural warning" className="my-4"><h3 className="font-bold">Urgent procedural warning — check this while completing intake</h3><MunicipalNoticeFirst story={story} city={city} /></aside>}
    {legacy && <p>This case was completed before explicit review was introduced. There is no recorded confirmation under the new review process.</p>}
    <p>Initial questions establish your situation, side, what has happened, relevant dates and what you want. Evidence details and additional research are optional later work.</p>
    <p>You can stop initial questioning and review once your city and situation are recorded. Details you do not know can stay unknown; confirmation does not supply missing facts.</p>
    {phase === "reviewing" && <>
      <p>Edit the information below, or return to the intake controls to change choices. Empty answers remain unknown.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {entries.map(entry => <div key={`${entry.section}:${entry.nested ?? ""}:${entry.field}`} className="block text-sm">
          {entry.label}{!entry.essential && " (optional later detail)"}
          {Array.isArray(entry.value) ? <div>{entry.value.length ? entry.value.map(value => <label key={value} className="mr-3 block"><input type="checkbox" checked disabled={busy} onChange={() => edit(entry, (entry.value as string[]).filter(item => item !== value))} /> {value}</label>) : <span>Not recorded</span>}</div>
            : typeof entry.value === "boolean" ? <input aria-label={`Review: ${entry.label}`} type="checkbox" checked={entry.value} disabled={busy} onChange={event => edit(entry, event.target.checked)} />
              : <textarea aria-label={`Review: ${entry.label}`} className="mt-1 block min-h-20 w-full rounded border p-2" value={String(entry.value)} disabled={busy} onChange={event => { if (typeof entry.value === "number") { if (event.target.value.trim() && Number.isFinite(Number(event.target.value))) edit(entry, Number(event.target.value)); } else edit(entry, event.target.value); }} />}
        </div>)}
      </div>
      {unanswered.length > 0 && <fieldset className="mt-5"><legend>Remaining initial questions</legend><p>Answer these in the intake controls, or explicitly record that you do not know. Evidence research is optional.</p>{unanswered.map(question => <label key={question.id} className="my-3 block"><input type="checkbox" data-testid="intake-unknown" checked={unknowns.includes(question.id)} disabled={busy} onChange={event => recovery.put("builder", "initialUnknowns", event.target.checked ? [...unknowns, question.id] : unknowns.filter(id => id !== question.id))} /> I do not know yet: {question.label}</label>)}</fieldset>}
      <label className="mt-5 block"><input data-testid="intake-review-acknowledgement" type="checkbox" checked={acceptedRevision === revision} disabled={busy} onChange={event => setAcceptedRevision(event.target.checked ? revision : null)} /> I have reviewed this information, including anything that is missing or uncertain.</label>
      <button data-testid="intake-confirm" type="button" disabled={busy || remaining.length > 0 || acceptedRevision !== revision || !canReview(checkpoint)} onClick={() => void act("confirm")} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Confirm my initial information</button>{" "}
      <button type="button" disabled={busy} onClick={() => void act("collect")}>Return to intake controls</button>
    </>}
    {phase === "collecting" && <button data-testid="intake-start-review" type="button" disabled={busy || !canReview(checkpoint)} onClick={() => void act("review")} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Stop initial questions and review</button>}
    {phase === "user-confirmed" && <><p>Your initial information is confirmed. Choose "Show my next step" to see it, with its form and deadline. Further evidence and research questions are optional. Changing initial facts requires a new review.</p><button data-testid="intake-continue-guidance" type="button" disabled={busy} onClick={() => recovery.continueToGuidance()} className="mt-4 rounded bg-[#2f7d67] px-4 py-2 text-white disabled:opacity-50">Show my next step</button>{" "}<button type="button" disabled={busy} onClick={() => void act("collect")}>Review or correct initial information</button></>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Saving your review...</p>}
  </section>;
}
