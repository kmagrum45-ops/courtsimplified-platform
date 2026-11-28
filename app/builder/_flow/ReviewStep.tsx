"use client";

/**
 * THE ONE REVIEW (site owner, 26 Nov 2026): everything the case holds, each with Change (ChangeAnswer.tsx, the one change
 * path), a fact said "not sure" as the quiet "Not answered yet" line with "Add it", and Continue, which confirms the case
 * the way the old review did (the recovery's review then confirm transitions; a change after confirming asks again).
 * It asks nothing new. Layout only: what to show comes from the record.
 */
import { useState } from "react";
import { StepFrame } from "./StepFrame";
import { useFlowRecord } from "./useFlowRecord";
import ChangeAnswer, { FACT_LABEL } from "../../_components/ChangeAnswer";
import { WorkingButton } from "../../_components/Working";
import { saveOpenEditsBeforeConfirm } from "../../_components/openEdits";
import { useIntakeReviewView } from "../../_components/IntakeRecovery";
import { inputRevision } from "../../../src/lib/case-system/intakeReview";
import { NOT_ANSWERED_YET } from "../../../src/lib/case-system/copy/askCopy";
import { reviewLines } from "../../../src/lib/case-system/flow/reviewLines";
import { FLOW_STEP_HEADINGS, REVIEW_CONFIRM, REVIEW_INTRO, UNDERSTOOD_EXTRA_LABELS } from "../../../src/lib/case-system/copy/flowCopy";


export function ReviewStep({ onDone }: { onDone: () => void }) {
  const { record, recovery } = useFlowRecord();
  const view = useIntakeReviewView();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    if (!recovery || !view) return;
    // Anything still typed in an open box (a Change left open) is saved first, through the one path (openEdits.ts).
    if (!saveOpenEditsBeforeConfirm(setError)) return;
    setBusy(true);
    setError("");
    try {
      const revision = inputRevision(view.checkpoint);
      await recovery.transition("review", revision);
      await recovery.transition("confirm", revision);
      onDone();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(false);
    }
  };
  return (
    <StepFrame step="review" heading={FLOW_STEP_HEADINGS.review}>
      <p className="text-sm leading-6 text-[#24463d]">{REVIEW_INTRO}</p>
      <dl className="space-y-3" data-testid="flow-review">
        {/* The lines come from the record through one function (flow/reviewLines.ts); this draws them. */}
        {reviewLines(record).map((line) => (
          <div key={line.fact} data-testid="flow-review-line" data-fact={line.fact} className="rounded-2xl border border-[#d8e6df] bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#4d675f]">{line.kind === "slot" ? FACT_LABEL[line.fact] : UNDERSTOOD_EXTRA_LABELS[line.fact]}</dt>
            <dd className="text-[#16302b]">{line.kind === "slot" && line.notAnswered ? NOT_ANSWERED_YET : line.words}</dd>
            {line.kind === "slot" ? <ChangeAnswer fact={line.fact} court="small-claims" current={line.value} adding={line.notAnswered} /> : null}
          </div>
        ))}
      </dl>
      {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
      <WorkingButton type="button" data-testid="flow-review-confirm" working={busy} workingLabel={REVIEW_CONFIRM} onClick={() => void confirm()} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">
        {REVIEW_CONFIRM}
      </WorkingButton>
    </StepFrame>
  );
}
