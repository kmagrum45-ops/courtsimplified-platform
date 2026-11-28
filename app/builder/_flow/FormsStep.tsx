"use client";

/**
 * THE FORMS STEP (site owner, 26 Nov 2026): Form 7A filled from the record (FilledForm7A, the existing form map), Form 10A
 * said as not covered yet (no fill map exists; no new legal content in this PR), and the evidence people often gather for
 * the person's kind of claim as GENERAL INFORMATION in one grouped list (owner's change C): the kind's own evidence
 * categories (claimTypes.ts, each element's evidenceCategories, word for word), each category once. Nothing is marked
 * missing and nothing is compared with the person's facts (CLAUDE.md s. 3). Layout only.
 */
import { useMemo } from "react";
import { StepFrame } from "./StepFrame";
import { useFlowRecord } from "./useFlowRecord";
import FilledForm7A from "../../_components/FilledForm7A";
import { askedQuestionsOf } from "../../../src/lib/case-system/caseFile/caseFile";
import { formContextOfFile } from "../../../src/lib/case-system/forms/formContext";
import { CLAIM_TYPES, type EvidenceCategory } from "../../../src/lib/case-system/intake/claimTypes";
import { EVIDENCE_GENERAL, EVIDENCE_HEADING, FLOW_SEE_NEXT_STEP, FLOW_STEP_HEADINGS, FORM_NOT_COVERED } from "../../../src/lib/case-system/copy/flowCopy";

/** A kind's evidence categories across its elements, each category once (by name), in the order the elements give them. */
export function evidenceOfKind(kindId: string | null): EvidenceCategory[] {
  const kind = kindId ? CLAIM_TYPES.find((type) => type.id === kindId) : null;
  const seen = new Set<string>();
  return (kind?.plaintiffElements ?? []).flatMap((element) => element.evidenceCategories ?? []).filter((category) => {
    const key = category.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function FormsStep({ onNext }: { onNext: () => void }) {
  const { record, recovery } = useFlowRecord();
  const ctx = useMemo(() => (record ? formContextOfFile(record, askedQuestionsOf(recovery?.getReview().checkpoint)) : null), [record, recovery]);
  const kindId = record?.claimKind.state === "answered" && record.claimKind.confirmed && typeof record.claimKind.value === "string" ? record.claimKind.value : null;
  const evidence = evidenceOfKind(kindId);
  return (
    <StepFrame step="forms" heading={FLOW_STEP_HEADINGS.forms}>
      {ctx ? <FilledForm7A ctx={ctx} caseId={recovery?.getCaseId() ?? null} addHref={() => "?step=questions"} /> : null}
      <p data-testid="form-not-covered" data-form="10A" className="text-sm text-[#24463d]">{FORM_NOT_COVERED("Form 10A")}</p>
      {evidence.length ? (
        <section data-testid="evidence-guidance" className="rounded-2xl border border-[#d8e6df] bg-white p-4">
          <h3 className="font-bold text-[#10231f]">{EVIDENCE_HEADING}</h3>
          <p className="mt-1 text-xs text-[#4d675f]">{EVIDENCE_GENERAL}</p>
          <ul className="mt-3 space-y-2">
            {evidence.map((category) => (
              <li key={category.name} data-testid="evidence-category" className="text-sm">
                <span className="font-semibold text-[#16302b]">{category.name}</span>: {category.why}
                {category.examples.length ? <span className="block text-xs text-[#4d675f]">{category.examples.join(" · ")}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* The way on to the results step (site owner, 27 Nov 2026: "Forms leads nowhere"). */}
      <div>
        <button type="button" data-testid="flow-see-next-step" onClick={onNext} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">{FLOW_SEE_NEXT_STEP}</button>
      </div>
    </StepFrame>
  );
}
