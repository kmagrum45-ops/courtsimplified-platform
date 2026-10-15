"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Hides the homepage's marketing body (the court-type picker, "answers
 * checked", "how it works", "why CourtSimplified exists") while a person is
 * mid-intake at `/?path=...` (HomeLocationGate, rendered above this).
 *
 * Before this, the full homepage still rendered below the intake gate no
 * matter how far along the person was — so a person four screens into Small
 * Claims intake, past the AI's own first question and into a full next-step
 * card, still saw "What kind of matter is this?" and the Small Claims /
 * Family / Civil cards again underneath their own answer (owner report,
 * 2026-10-14). The path is already chosen; the picker has nothing left to
 * offer once it is.
 *
 * Reads the same `?path=` HomeLocationGate reads, so the two always agree on
 * whether intake is active. Needs its own `useSearchParams`, which bails out
 * of static prerendering unless wrapped in Suspense -- same reason
 * HomeLocationGate is wrapped in page.tsx.
 */
export default function HideDuringIntake({ children }: { children: ReactNode }) {
  const rawPath = useSearchParams().get("path");
  const intakeActive = rawPath === "family" || rawPath === "small-claims" || rawPath === "civil";
  return intakeActive ? null : <>{children}</>;
}
