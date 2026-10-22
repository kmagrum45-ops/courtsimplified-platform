"use client";

import { useEffect, useState } from "react";
import { usePublishNextStepStatus } from "../../_components/NextStepStatus";

/**
 * How long the page waits for a case to be read before it stops waiting.
 *
 * Was 120 s. A new Small Claims case took longer (research up to 45 s, then the
 * main reasoning call), so the page gave up at 120 s three times running and
 * said "could not reach the server" while the server, allowed 300 s, was still
 * working (#468 re-test). Now 270 s: research (RESEARCH_TIMEOUT_MS, 45 s) plus
 * the reasoning call (COGNITION_TIMEOUT_MS, 150 s) fit inside it, and it stays
 * under the route's maxDuration of 300 s. After 45 s the person may stop and retry.
 * test:analysis-time-budget keeps these in order.
 */
export const ANALYSIS_TIMEOUT_MS = 270_000;
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
