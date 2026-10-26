"use client";

/**
 * Case overview: where the case is, what comes next, and what needs sorting
 * out. The page a user lands on after intake and every time they come back.
 *
 * Guides; never judges (CLAUDE.md section 2). It says which step the user is
 * at, what the rules say comes next, and counts their deadline from a date
 * they give. It never says how the case will go.
 *
 * Every stage shown is one the user confirmed. Until they have, the
 * confirmation is the first thing on the page and no next step renders
 * (section 4), exactly as in the builder.
 */

import { readStoredPicture } from "@/src/lib/case-system/intake/caseReader";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import StageConfirmation from "../../builder/_components/StageConfirmation";
import StageAnswerPanel from "../../builder/_components/StageAnswerPanel";
import NextStepsCard from "../../builder/_components/NextStepsCard";
import IntelligenceOverviewPanel from "../../builder/_components/IntelligenceOverviewPanel";
import CaseReviewPanel from "../../builder/_components/CaseReviewPanel";
import type { AnalysisResult, StoredCaseData, UniversalStage } from "../../builder/_components/builderTypes";
import { getStageLabel } from "../../builder/_components/builderTypes";
import {
  CONFIRMABLE_STAGES,
  settledStage,
  storyHintsForDates,
  storyWithTimeline,
  suggestedDatesFromAnswers,
  suggestedDatesFromEvents,
  type SuggestedDate,
} from "@/src/lib/case-system/casePosition";
import { readCaseDrafts } from "@/src/lib/case-system/drafts/caseDrafts";
import { positionSavesSettled, savePositionQueued } from "../../builder/_components/positionSave";
import { userWordsOf } from "@/src/lib/content-library/forms/formsInText";
import { authHeaders, builderHref, formatDate, useCaseHome } from "../_components/CaseHomeContext";
import { noticeStepForCase, stepStoryText } from "@/src/lib/case-system/caseStep";
import { stageRecordedFromAnswers, suggestionForSide } from "@/app/builder/_components/stageFromAnswers";
import { sideOf, situationOfCase, stepFromSituation } from "@/src/lib/case-system/situation/situation";
import { caseFileOf, unsureDateQuestions, withCaseFileDates } from "@/src/lib/case-system/caseFile/caseFile";
import { fullDayIn } from "@/src/lib/case-system/casePosition";
import { readCheckpoint } from "@/src/lib/case-system/intakeCheckpoint";
import CaseFilePanel from "../_components/CaseFilePanel";
import SafetyNotice from "@/app/_components/SafetyNotice";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { countedStepDeadlines } from "@/src/lib/case-system/caseFile/stepDeadlines";

type EventsResponse = {
  events: Array<{
    id: string;
    event_type: string;
    title: string;
    occurred_at_normalized: string | null;
    date_certainty: string;
  }>;
  stage: { stage: string; basis: string[] };
  freshness: { state: string };
  freshnessMessage: string | null;
  inconsistencies: Array<{ id: string; observation: string; rule: string; ruleQuote: string; options: string[] }>;
};

type DocumentCounts = { total: number; dated: number; dateNeeded: number };

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function asConfirmable(value: unknown): UniversalStage | null {
  return typeof value === "string" && (CONFIRMABLE_STAGES as readonly string[]).includes(value)
    ? (value as UniversalStage)
    : null;
}

export default function CaseOverviewPage() {
  const { caseRecord, position, courtPath, responding, reload, record, stepId: homeStepId } = useCaseHome();
  const caseId = caseRecord.id;
  const base = `/cases/${encodeURIComponent(caseId)}`;
  const master = asRecord(caseRecord.master_result);

  const [events, setEvents] = useState<EventsResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentCounts | null>(null);
  const [stageError, setStageError] = useState("");

  const loadSignals = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) return;
    const [eventsResponse, documentsResponse] = await Promise.all([
      fetch(`/api/cases/events?caseId=${encodeURIComponent(caseId)}`, { headers }).catch(() => null),
      fetch(`/api/workspace/organisation?caseId=${encodeURIComponent(caseId)}&view=documents`, { headers }).catch(
        () => null,
      ),
    ]);
    if (eventsResponse?.ok) setEvents((await eventsResponse.json()) as EventsResponse);
    if (documentsResponse?.ok) {
      const payload = await documentsResponse.json();
      if (payload?.counts) setDocuments(payload.counts as DocumentCounts);
    }
  }, [caseId]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  async function confirmStage(stage: UniversalStage) {
    setStageError("");
    // One save at a time with the deadline box's own saves (positionSave.ts).
    const saved = await savePositionQueued(caseId, { confirmedStage: stage });
    if (!saved) {
      setStageError("That could not be saved just now. Please try again.");
      return;
    }
    await reload();
  }

  // The suggestion offered for confirmation: what the user's own records point
  // to, never applied until they confirm it.
  // "Not sure" left by the intake answers (re-run answers settled nothing)
  // is no one's choice: the case page asks (re-check 2026-10-14).
  const unsettledFromAnswers = position.confirmedStage !== null && settledStage(position) === null;
  const suggestedStage: UniversalStage =
    (unsettledFromAnswers ? null : position.confirmedStage) ??
    suggestionForSide(asConfirmable(events?.stage.stage) ?? asConfirmable(caseRecord.current_stage) ?? "not-sure", responding);

  // The situation answers settle the stage too (served, nothing filed, or the step of a
  // case already going): never asked again here (step 2b).
  const situation = situationOfCase(master);
  const fromSituation = courtPath ? stageRecordedFromAnswers(courtPath, null, "not-sure", situation) : null;
  const confirmed = (unsettledFromAnswers ? null : position.confirmedStage) ?? fromSituation?.stage ?? null;
  const situationStep = stepFromSituation(situation, courtPath);

  /*
   * A stage confirmed on the results page a moment ago may still be on its
   * way when this page first loads (walkthrough run 38475320722: the case
   * page asked for it again, and showed it after a reload). Read the case once
   * more shortly after opening, before asking.
   */
  const [lookedAgain, setLookedAgain] = useState(false);
  useEffect(() => {
    if (confirmed || lookedAgain) return;
    const timer = setTimeout(() => {
      setLookedAgain(true);
      void reload();
    }, 2_500);
    return () => clearTimeout(timer);
  }, [confirmed, lookedAgain, reload]);
  const draftCount = readCaseDrafts(master).length;
  // Dates the person gave in the guided questions are offered here too, as the
  // builder offers them (walkthrough R4, 2026-10-13: the case page asked
  // "Which year was that?" for a date already answered). Recorded events win.
  const guidedAnswers = (Array.isArray(master.intakeAnswers) ? master.intakeAnswers : []).filter(
    (answer): answer is { questionId: string; answerText: string } =>
      Boolean(answer) && typeof (answer as { questionId?: unknown }).questionId === "string" && typeof (answer as { answerText?: unknown }).answerText === "string",
  );
  const suggestedDates: Record<string, SuggestedDate> = {
    ...suggestedDatesFromAnswers(guidedAnswers),
    ...(events ? suggestedDatesFromEvents(events.events) : {}),
  };
  const analysis = asRecord(master.intakeAnalysis) as unknown as AnalysisResult;
  const intake = master.intakeData as StoredCaseData | undefined;
  const hasIntakeSummary = Boolean(
    master.intakeAnalysis && intake && typeof intake.facts === "string" && typeof intake.goal === "string",
  );

  const toSortOut: { text: string; href?: string; action?: string }[] = [];
  for (const item of events?.inconsistencies ?? []) {
    toSortOut.push({ text: item.observation, href: `${base}/timeline`, action: "Review your timeline" });
  }
  if (documents && documents.dateNeeded > 0) {
    toSortOut.push({
      text:
        documents.dateNeeded === 1
          ? "One of your documents has no confirmed date, so it is not in your timeline yet."
          : `${documents.dateNeeded} of your documents have no confirmed date, so they are not in your timeline yet.`,
      href: `${base}/documents`,
      action: "Add the dates",
    });
  }
  if (documents && documents.total === 0) {
    toSortOut.push({
      text: "No documents are saved to this case yet. Contracts, receipts, messages and photos can all be kept here.",
      href: `${base}/documents`,
      action: "Add documents",
    });
  }

  return (
    <div className="space-y-6">
      {events?.freshnessMessage ? (
        <section
          data-testid="analysis-freshness-banner"
          className="rounded-3xl border border-amber-300 bg-amber-50 p-5"
        >
          <p className="text-sm text-amber-950">{events.freshnessMessage}</p>
          <Link
            href={builderHref(caseRecord)}
            className="mt-3 inline-block rounded-full bg-[#2f7d67] px-4 py-2 text-sm font-bold text-white"
          >
            Update the analysis
          </Link>
        </section>
      ) : null}

      {/* Kept open while the story mentions threats, fear or violence (SafetyNotice.tsx). */}
      <SafetyNotice story={record.story ?? ""} />

      {/* The case file (caseFile.ts): everything the person has told us, each asked once. */}
      <CaseFilePanel
        file={caseFileOf(courtPath ? readCheckpoint(master.intakeCheckpoint, courtPath) : null, master)}
        changeHref={builderHref(caseRecord)}
        situationHref={`${builderHref(caseRecord)}&situation=change`}
        stepHref="#next-heading"
        deadlines={countedStepDeadlines(position.stepId ?? situationStep ?? (homeStepId || null), position.dateAnswers)}
      />

      <section aria-labelledby="where-heading" className="space-y-3">
        <h2 id="where-heading" className="text-xl font-bold text-[#10231f]">
          Where your case is
        </h2>
        {courtPath ? (
          <StageConfirmation
            key={`${confirmed ?? "unconfirmed"}:${suggestedStage}`}
            suggestedStage={suggestedStage}
            pathway={courtPath}
            confirmedStage={confirmed}
            // A case already going: the step the next step follows, the latest chosen.
            stepWords={situation.where === "going" ? findStage(position.stepId ?? situationStep ?? "")?.userQuestion ?? null : null}
            onConfirm={(stage) => void confirmStage(stage)}
          />
        ) : (
          <p className="rounded-3xl border border-[#d8e6df] bg-white p-5 text-sm text-[#4f685f]">
            This case does not have a court yet.{" "}
            <Link href={builderHref(caseRecord)} className="font-semibold text-[#2f7d67] underline">
              Tell us what happened
            </Link>{" "}
            and we will work out which court and steps apply.
          </p>
        )}
        {stageError ? <p className="text-sm text-[#7a4b12]">{stageError}</p> : null}
        {confirmed && position.confirmedStageAt ? (
          <p className="text-xs text-[#4f685f]">You confirmed this on {formatDate(position.confirmedStageAt)}.</p>
        ) : null}
        {/* Only when the records actually point somewhere; "not enough recorded" is noise here. */}
        {/* Only before the person has confirmed where they are: after that,
            a second "what your records say" stage contradicted theirs
            (held-back walkthrough, 2026-10-09). */}
        {/* And only when it explains the stage suggested: "Case already started" under an "I was
            served" suggestion read as a contradiction (#468 re-test). */}
        {!confirmed && events?.stage.basis.length && events.stage.stage !== "unknown" && events.stage.stage === suggestedStage ? (
          <details className="rounded-2xl border border-[#e3efe9] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">
            <summary className="cursor-pointer font-semibold text-[#24463d]">
              What your records say: {getStageLabel(events.stage.stage as UniversalStage)}
            </summary>
            <ul className="mt-2 space-y-1">
              {events.stage.basis.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {confirmed && courtPath ? (
        <section aria-labelledby="next-heading" className="space-y-3">
          <h2 id="next-heading" className="text-xl font-bold text-[#10231f]">
            Your next step
          </h2>
          {/* Every court now has written step answers (run-19), so the case page
              shows the same panel as the builder -- with the dates the user
              gave, counted. Civil and family showed only the stage overview
              here, so a counted deadline never reached the case page (page
              review, 2026-10-06). */}
          {courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? (
            <StageAnswerPanel
              courtPath={courtPath}
              confirmedStage={confirmed}
              responding={responding}
              sideFromRecord={sideOf(situationOfCase(master)) !== null}
              caseId={caseId}
              initialStepId={position.stepId ?? situationStep}
              // A day not known had its one more offer in the review: folded here (caseFile.ts).
              laterDates={unsureDateQuestions(caseFileOf(courtPath ? readCheckpoint(master.intakeCheckpoint, courtPath) : null, master))}
              initialDateAnswers={withCaseFileDates(position.dateAnswers, caseFileOf(readCheckpoint(master.intakeCheckpoint, courtPath), master), fullDayIn)}
              initialService={position.service}
              motionToChange={position.motionToChange ?? null}
              // Once a date counted here is saved, the case is read again, so
              // the Timeline and Case file tabs show it without a reload
              // (walkthrough 2026-10-13, R5: the Case file said "None yet").
              // The panel queues the save BEFORE calling onSaved, so this wait
              // has the save to wait for (review 2026-10-13: it was called
              // first, and the wait returned at once).
              onSaved={() => void positionSavesSettled(caseId).then(reload)}
              suggestedDates={suggestedDates}
              storyHints={storyHintsForDates(storyWithTimeline(record.story, intake?.timeline))}
              // The same words and notice step the case layout reads for the
              // step (caseStep.ts), so every tab names the step shown here.
              storyText={stepStoryText(master, courtPath)}
              userWords={userWordsOf(intake)}
              // Amount, city, claim type and story from the one case record
              // (build order Step 2A, 2026-10-12). The city used to be read
              // from extra.yourCity only, so a civil case (civilInput.city)
              // lost its city and could be shown the wrong filing portal.
              recordedAmount={record.amount}
              city={record.city}
              picture={readStoredPicture(master.casePicture)}
              // The notice step the builder suggested, here too (page review,
              // 2026-10-07: the case page silently dropped the snow-and-ice
              // notice step and its deadline).
              noticeStepId={noticeStepForCase(master, courtPath)}
            />
          ) : (
            <NextStepsCard pathway={courtPath} stage={confirmed} userWords={userWordsOf(master.intakeData)} />
          )}
        </section>
      ) : null}

      <section aria-labelledby="sort-heading" className="space-y-3">
        <h2 id="sort-heading" className="text-xl font-bold text-[#10231f]">
          Things to sort out
        </h2>
        {toSortOut.length ? (
          <ul className="space-y-3">
            {toSortOut.map((item) => (
              <li
                key={item.text}
                data-testid="case-to-sort-out"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8e6df] bg-white p-4"
              >
                <p className="max-w-3xl text-sm text-[#24463d]">{item.text}</p>
                {item.href ? (
                  <Link href={item.href} className="text-sm font-semibold text-[#2f7d67] underline">
                    {item.action}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-[#d8e6df] bg-white p-4 text-sm text-[#4f685f]">
            Nothing in your records needs sorting out right now.
          </p>
        )}
        <CaseReviewPanel caseId={caseId} />
      </section>

      <section aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="sr-only">
          Your case file
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href={`${base}/timeline`} className="rounded-3xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Timeline</p>
            <p className="mt-1 text-sm text-[#4f685f]">
              {events
                ? events.events.length === 1
                  ? "1 step recorded"
                  : `${events.events.length} steps recorded`
                : "What has happened so far, in order"}
            </p>
          </Link>
          <Link href={`${base}/documents`} className="rounded-3xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Documents</p>
            <p className="mt-1 text-sm text-[#4f685f]">
              {documents ? (documents.total === 1 ? "1 document" : `${documents.total} documents`) : "Your evidence and papers"}
            </p>
          </Link>
          <Link href={`${base}/forms`} className="rounded-3xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Forms</p>
            <p className="mt-1 text-sm text-[#4f685f]">Which official forms apply to you</p>
          </Link>
          <Link href={`${base}/drafts`} className="rounded-3xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Drafts</p>
            <p className="mt-1 text-sm text-[#4f685f]">
              {draftCount ? (draftCount === 1 ? "1 draft" : `${draftCount} drafts`) : "Chronology, your story, an affidavit outline"}
            </p>
          </Link>
          <Link href={`${base}/case-file`} className="rounded-3xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]">
            <p className="font-bold text-[#10231f]">Case file</p>
            <p className="mt-1 text-sm text-[#4f685f]">Your whole case on one page, to print or save as PDF</p>
          </Link>
        </div>
      </section>

      {hasIntakeSummary ? (
        <section aria-labelledby="told-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="told-heading" className="text-xl font-bold text-[#10231f]">
              What you told us
            </h2>
            <Link href={builderHref(caseRecord)} className="text-sm font-semibold text-[#2f7d67] underline">
              Change your story
            </Link>
          </div>
          <IntelligenceOverviewPanel analysis={analysis} intake={intake ?? null} confirmedStage={confirmed} caseId={caseId} chosenClaimKind={position.claimKind ?? null} heldKind={caseFileOf(courtPath ? readCheckpoint(master.intakeCheckpoint, courtPath) : null, master).claimKind} />
        </section>
      ) : null}
    </div>
  );
}
