"use client";

import { useState } from "react";

import EventCandidateSurface from "../../../builder/_components/EventCandidateSurface";
import CaseTimeline from "../../_components/CaseTimeline";
import CaseWorkspace from "../../_components/CaseWorkspace";
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
export default function CaseTimelineSection() {
  const { caseRecord, courtPath } = useCaseHome();
  // Steps can be recorded only for Small Claims (see CaseTimeline's canRecord).
  const canRecord = courtPath === "small-claims";
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="space-y-8">
      {canRecord ? (
        <EventCandidateSurface caseId={caseRecord.id} onRecorded={() => setRefresh((value) => value + 1)} />
      ) : null}
      <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
        <CaseTimeline key={refresh} caseId={caseRecord.id} updateHref={builderHref(caseRecord)} canRecord={canRecord} />
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
