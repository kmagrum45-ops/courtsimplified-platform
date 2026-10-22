"use client";

import { useEffect, useState } from "react";
import { usePublishNextStepStatus } from "../../_components/NextStepStatus";

/** How long reading a case may take before it is stopped (IntakeRequest's own default was 290 s). */
export const ANALYSIS_TIMEOUT_MS = 120_000;
const SLOW_AFTER_MS = 45_000;

/**
 * A way forward while the case is being read (re-test 2026-10-18: civil sat on
 * "Reading what you told us..." for over a minute after "That request did not
 * finish", with nothing to press). After 45 seconds it offers to stop; after a
 * failure, to try again. Nothing the person entered is lost either way.
 */
export default function AnalysisProgress({ reading, error, onStop, onRetry }: { reading: boolean; error: string; onStop: () => void; onRetry: () => void }) {
  // Also shown beside "Show my next step" at the top of the page (L27).
  usePublishNextStepStatus(reading, error, onStop, onRetry);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!reading) return;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => { clearTimeout(timer); setSlow(false); };
  }, [reading]);
  if (reading && slow) {
    return (
      <p data-testid="analysis-slow" role="status" className="mt-3 text-sm text-[#4d675f]">
        This is taking longer than usual. Your answers are saved here.{" "}
        <button type="button" onClick={onStop} className="font-semibold text-[#2f7d67] underline">Stop and try again</button>
      </p>
    );
  }
  if (!reading && error) {
    return (
      <button type="button" data-testid="analysis-retry" onClick={onRetry} className="mt-3 rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]">
        Try again
      </button>
    );
  }
  return null;
}
