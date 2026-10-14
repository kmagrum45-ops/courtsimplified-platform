"use client";

import { useState } from "react";

import EventCandidateSurface from "../../../builder/_components/EventCandidateSurface";
import CaseTimeline from "../../_components/CaseTimeline";
import CaseWorkspace from "../../_components/CaseWorkspace";
import { allDateQuestions, readCasePosition } from "@/src/lib/case-system/casePosition";
import type { CaseRecord as FactRecord } from "@/src/lib/case-system/caseRecord";
import { formatLongDate } from "@/src/lib/case-system/deadlines/holidays";
import { serviceRulesFor } from "@/src/lib/case-system/deadlines/serviceEffectiveDate";
import { shortLabel } from "../../../builder/_components/StageAnswerPanel";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { recordedDateAnswers } from "@/src/lib/case-system/caseRecord";
import { builderHref, useCaseHome } from "../../_components/CaseHomeContext";

/**
 * Timeline: the steps the user recorded (case_events), with the steps their
 * own story describes offered for them to confirm, and the chronology built
 * from their dated documents with the deadlines worked out from their dates.
 *
 * The story's events are offered here as well as in the builder (2026-10-04):
 * a user whose story said "we signed the contract in March, I paid in April"
 * saw an empty timeline here and no way to add those without retyping them
 * (page walkthrough). Each is recorded only when the user confirms it.
 */
/**
 * The case's key dates, from the one case record, for all three courts
 * (build order Step 2A, 2026-10-12). Civil and family had no timeline of their
 * own dates at all -- recording steps is Small Claims only -- although the case
 * already held them (the dates given on the next-step card, dates kept from
 * the story, service dates with how the papers were served). Read only: each
 * date is changed where it was given, on the overview's next-step card.
 */
function KeyDates({ record, courtPath }: { record: FactRecord; courtPath: string | null }) {
  const questions = new Map(allDateQuestions().map((question) => [question.id, question.question]));
  const today = new Date().toISOString().slice(0, 10);
  const entries = Object.entries(record.dates)
    .map(([id, fact]) => ({ id, date: fact.value, source: fact.source, label: shortLabel(questions.get(id) ?? id) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (entries.length === 0) return null;
  const service = record.position.service ?? {};
  const rules = courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? serviceRulesFor(courtPath) : [];
  return (
    <section data-testid="timeline-key-dates" className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#10231f]">Key dates in your case</h2>
      <p className="mt-1 text-sm text-[#4d675f]">
        The dates your case holds, in order. Your deadlines are counted from these. To change one, use the next-step card on
        your case overview.
      </p>
      <ul className="mt-4 space-y-3">
        {entries.map((entry) => {
          const how = service[entry.id];
          const method = how ? rules.find((rule) => rule.method === how.method) : undefined;
          return (
            <li key={entry.id} className="text-sm text-[#16302b]">
              <span className="font-semibold">{formatLongDate(entry.date)}</span>: {entry.label}
              {entry.date > today ? <span className="ml-2 font-semibold text-[#2f7d67]">Coming up</span> : null}
              <span className="block text-xs text-[#4d675f]">
                {how && method ? `${method.label}, ${formatLongDate(how.enteredOn)}. ` : ""}
                {entry.source === "confirmed" ? "Saved to your case." : "From your answers in the intake."}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function CaseTimelineSection() {
  const { caseRecord, courtPath, record, stepId } = useCaseHome();
  // Steps can be recorded only for Small Claims (see CaseTimeline's canRecord).
  const canRecord = courtPath === "small-claims";
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="space-y-8">
      <KeyDates record={record} courtPath={courtPath} />
      {canRecord ? (
        <EventCandidateSurface
          caseId={caseRecord.id}
          onRecorded={() => setRefresh((value) => value + 1)}
          recordedDates={recordedDateAnswers(record)}
          // The step they confirmed: a sentence naming its event is offered as
          // that kind of step, not asked cold (walkthrough 2026-10-13, R6).
          confirmedStep={
            record.position.confirmedStage && stepId && findStage(stepId)
              ? { id: stepId, title: findStage(stepId)!.title, chosen: Boolean(record.position.stepId) }
              : null
          }
        />
      ) : null}
      <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
        <CaseTimeline
          key={refresh}
          caseId={caseRecord.id}
          updateHref={builderHref(caseRecord)}
          canRecord={canRecord}
          confirmedStage={readCasePosition(caseRecord.master_result, courtPath).confirmedStage}
          stepTitle={(stepId && findStage(stepId)?.title) || ""}
        />
      </section>
      <section aria-labelledby="chronology-heading">
        <h2 id="chronology-heading" className="mb-3 text-xl font-bold text-[#10231f]">
          From your documents, and your deadlines
        </h2>
        <CaseWorkspace caseId={caseRecord.id} sections={["timeline", "deadlines"]} />
      </section>
    </div>
  );
}
