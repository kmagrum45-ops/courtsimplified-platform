"use client";

/**
 * ONE STEP OF THE NEW SMALL CLAIMS FLOW, FRAMED (site owner, 26 Nov 2026, change 6): on every step change, and when the
 * flow opens, the page goes to the top and the step's heading takes the focus, so a person on a phone or with a screen
 * reader starts at the new step, never in the middle of the last one (the chat used to open at the bottom of the page).
 * Layout only: it reads nothing and asks nothing.
 */
import { useEffect, useRef, type ReactNode } from "react";

export function StepFrame({ step, heading, children }: { step: string; heading: string; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <section data-testid="flow-step" data-step={step} className="space-y-4">
      <h2 ref={headingRef} tabIndex={-1} data-testid="flow-step-heading" className="text-2xl font-bold text-[#10231f] outline-none">
        {heading}
      </h2>
      {children}
    </section>
  );
}
