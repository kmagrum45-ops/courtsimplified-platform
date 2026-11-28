"use client";

/**
 * THE NEW SMALL CLAIMS FLOW (site owner, 26 Nov 2026; behind SC_FLOW_V2): story -> Understood (confirm once) -> the
 * questions still unknown, on ONE page -> one review -> the forms. Each step reads the one record (useFlowRecord) and asks
 * only through missingFacts; this component only decides which step shows, from the address (?step=), so Back and reload
 * return to the same step. Replaces, once it passes the matrix, the chat (GuidedSmallClaimsIntake), the whole form
 * (SmallClaimsIntake) and the review panel for Small Claims.
 */
import { useEffect, useState } from "react";
import { UnderstoodStep } from "./UnderstoodStep";
import { QuestionsStep } from "./QuestionsStep";
import { ReviewStep } from "./ReviewStep";
import { FormsStep } from "./FormsStep";
import { useFlowRecord } from "./useFlowRecord";
import { writeAnswer } from "../../_components/caseWrite";
import { elementMapForKind } from "../../../src/lib/case-system/flow/elementMapForKind";

export const FLOW_STEPS = ["reading", "questions", "review", "forms"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

const stepOfAddress = (): FlowStep => {
  if (typeof window === "undefined") return "reading";
  const step = new URL(window.location.href).searchParams.get("step");
  return (FLOW_STEPS as readonly string[]).includes(step ?? "") ? (step as FlowStep) : "reading";
};

export function SmallClaimsFlow() {
  const [step, setStep] = useState<FlowStep>(stepOfAddress);
  // The element map, built ONCE when the kind is confirmed, on whichever step confirmed it, and saved with the case
  // (site owner, 27 Nov 2026, decision 1): elementMapForKind returns null once the map holds every element of the kind.
  const { record, recovery } = useFlowRecord();
  const toSave = elementMapForKind(record);
  useEffect(() => {
    if (recovery && toSave) writeAnswer(recovery, "flow", "elementStates", toSave);
  }, [recovery, toSave]);
  useEffect(() => {
    const back = () => setStep(stepOfAddress());
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  const go = (next: FlowStep) => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", next);
    window.history.pushState(null, "", url.toString());
    setStep(next);
  };
  return (
    <div data-testid="sc-flow" data-flow-step={step}>
      {step === "reading" ? <UnderstoodStep onDone={() => go("questions")} /> : null}
      {step === "questions" ? <QuestionsStep onDone={() => go("review")} /> : null}
      {step === "review" ? <ReviewStep onDone={() => go("forms")} /> : null}
      {/* The results step is the builder page's (?step=results), drawn in this flow's place. A full load of that
          address, so the page reads it as any reload does. */}
      {step === "forms" ? <FormsStep onNext={() => { const url = new URL(window.location.href); url.searchParams.set("step", "results"); window.location.assign(url.toString()); }} /> : null}
    </div>
  );
}
