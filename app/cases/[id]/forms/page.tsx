"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import FormsNamedHere from "../../../_components/FormsNamedHere";
import FormsWorkspace from "../../../forms/FormsWorkspace";
import { isPlaceholder, nextStepBlockFor } from "@/src/lib/content-library/nextSteps";
import { officialFormsNamedIn, relevantToFamilyCase, userWordsOf } from "@/src/lib/content-library/forms/formsInText";
import { useCaseHome } from "../../_components/CaseHomeContext";

/**
 * Forms: first the forms the user's own next step names (so the Defence a
 * served defendant was just told about is at the top, not inside a catalogue
 * of every form), then the full forms tool for this case's court.
 */
export default function CaseFormsSection() {
  // The step the user picked, or the one the overview suggests for their stage (CaseHome.stepId).
  const { caseRecord, courtPath, position, stepId } = useCaseHome();
  const [stepTexts, setStepTexts] = useState<string[] | null>(null);
  const userWords = userWordsOf((caseRecord.master_result ?? {}).intakeData);

  useEffect(() => {
    if (!courtPath || !position.confirmedStage) {
      setStepTexts([]);
      return;
    }
    // Every civil and family step now has a written answer (run-19), so all
    // three courts read the forms from the same answer the user was shown.
    // The short next-step block stays as the fallback for a step without one.
    const court = courtPath;
    const stage = position.confirmedStage;
    const fallback = () => {
      if (court === "small-claims") return [];
      const block = nextStepBlockFor(court, stage);
      return block && !isPlaceholder(block) ? [block.text] : [];
    };
    if (!stepId) {
      setStepTexts(fallback());
      return;
    }
    void (async () => {
      const response = await fetch("/api/case/stage-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: stepId, courtPath, confirmedFacts: {} }),
      }).catch(() => null);
      const body = response?.ok ? await response.json() : null;
      const sections = (body?.answer?.sections ?? []) as { text: string }[];
      setStepTexts(sections.length ? sections.map((section) => section.text) : fallback());
    })();
  }, [courtPath, position.confirmedStage, stepId]);

  return (
    <div className="space-y-6">
      {stepTexts &&
      courtPath &&
      officialFormsNamedIn(stepTexts, courtPath).some((form) => courtPath !== "family" || relevantToFamilyCase(form, userWords)) ? (
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#10231f]">Forms for your next step</h2>
          <p className="mt-1 text-sm text-[#4f685f]">
            The forms named in the guidance for where your case is.{" "}
            <Link href={`/cases/${encodeURIComponent(caseRecord.id)}`} className="font-semibold text-[#2f7d67] underline">
              Read that step
            </Link>
          </p>
          <div className="mt-4">
            <FormsNamedHere texts={stepTexts} court={courtPath} heading="Named in your next step" userWords={userWords} />
          </div>
        </section>
      ) : null}
      <FormsWorkspace caseId={caseRecord.id} courtPath={caseRecord.court_path} embedded />
    </div>
  );
}
