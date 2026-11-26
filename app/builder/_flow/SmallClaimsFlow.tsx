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

export const FLOW_STEPS = ["reading", "questions", "review", "forms"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

const stepOfAddress = (): FlowStep => {
  if (typeof window === "undefined") return "reading";
  const step = new URL(window.location.href).searchParams.get("step");
  return (FLOW_STEPS as readonly string[]).includes(step ?? "") ? (step as FlowStep) : "reading";
};

export function SmallClaimsFlow() {
  const [step, setStep] = useState<FlowStep>(stepOfAddress);
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
      {step === "forms" ? <FormsStep /> : null}
    </div>
  );
}
