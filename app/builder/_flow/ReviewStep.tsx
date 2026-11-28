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
import { slotStatus } from "../../../src/lib/case-system/caseFile/factStatus";
import { FLOW_QUESTIONS } from "../../../src/lib/case-system/caseFile/missingFacts";
import { SLOT_FACTS, type SlotFact } from "../../../src/lib/case-system/caseFile/caseFile";
import { CLAIM_TYPES } from "../../../src/lib/case-system/intake/claimTypes";
import { NOT_ANSWERED_YET } from "../../../src/lib/case-system/copy/askCopy";
import { FLOW_STEP_HEADINGS, REVIEW_CONFIRM, REVIEW_INTRO } from "../../../src/lib/case-system/copy/flowCopy";

/** The facts the review lists, in the Questions page's order (each fact once). */
const REVIEWED: readonly SlotFact[] = FLOW_QUESTIONS.map((item) => item.fact).filter((fact): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact));

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
        {record ? REVIEWED.map((fact) => {
          const slot = record[fact];
          const status = slotStatus(slot);
          if (status !== "known" && status !== "settled") return null;
          const value = fact === "claimKind" ? CLAIM_TYPES.find((type) => type.id === slot.value)?.name ?? String(slot.value ?? "") : Array.isArray(slot.value) ? slot.value.join(", ") : String(slot.value ?? "");
          return (
            <div key={fact} data-testid="flow-review-line" data-fact={fact} className="rounded-2xl border border-[#d8e6df] bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#4d675f]">{FACT_LABEL[fact]}</dt>
              <dd className="text-[#16302b]">{status === "settled" ? NOT_ANSWERED_YET : value}</dd>
              <ChangeAnswer fact={fact} court="small-claims" current={slot.value} adding={status === "settled"} />
            </div>
          );
        }) : null}
      </dl>
      {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
      <WorkingButton type="button" data-testid="flow-review-confirm" working={busy} workingLabel={REVIEW_CONFIRM} onClick={() => void confirm()} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">
        {REVIEW_CONFIRM}
      </WorkingButton>
    </StepFrame>
  );
}
