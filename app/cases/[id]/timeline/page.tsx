"use client";

import CaseTimeline from "../../_components/CaseTimeline";
import CaseWorkspace from "../../_components/CaseWorkspace";
import { builderHref, useCaseHome } from "../../_components/CaseHomeContext";

/**
 * Timeline: the steps the user recorded (case_events), and the chronology
 * built from their dated documents with the deadlines worked out from their
 * dates (workspace). Two records with different sources, shown one above the
 * other and labelled, rather than merged into one list that would hide where
 * each line came from.
 */
export default function CaseTimelineSection() {
  const { caseRecord } = useCaseHome();
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
        <CaseTimeline caseId={caseRecord.id} updateHref={builderHref(caseRecord)} />
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
