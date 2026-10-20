"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * PROGRESS AND ERRORS BESIDE "SHOW MY NEXT STEP" (L27).
 *
 * The button is in the review panel at the top of the page; the screen that
 * does the work (the Small Claims, Family or Civil form, or the guided route)
 * is far below it. After pressing it, the progress line sat about 2,350px down
 * and nothing near the button changed for about 90 seconds. Each screen now
 * publishes its state here, and the panel shows it beside the button.
 */
type Status = { reading: boolean; error: string; startedAt: number | null };
const IDLE: Status = { reading: false, error: "", startedAt: null };
let current: Status = IDLE;
let handlers: { onStop?: () => void; onRetry?: () => void } = {};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(next: Status) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** A screen that works out the next step reports its state (reading, error) and its stop/retry actions. */
export function usePublishNextStepStatus(reading: boolean, error: string, onStop?: () => void, onRetry?: () => void) {
  const latest = useRef({ onStop, onRetry });
  useEffect(() => { latest.current = { onStop, onRetry }; });
  useEffect(() => {
    handlers = { onStop: () => latest.current.onStop?.(), onRetry: () => latest.current.onRetry?.() };
    publish({ reading, error, startedAt: reading ? Date.now() : null });
  }, [reading, error]);
  useEffect(() => () => publish(IDLE), []);
}

const SLOW_AFTER_S = 45;

export default function NextStepStatus() {
  const status = useSyncExternalStore(subscribe, () => current, () => IDLE);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!status.reading) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status.reading]);
  if (status.reading && status.startedAt) {
    const seconds = Math.max(0, Math.floor((now - status.startedAt) / 1000));
    const elapsed = seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
    return (
      <p data-testid="next-step-status" role="status" aria-live="polite" className="mt-2 text-sm font-semibold text-[#4d675f]">
        Working out your next step from the court rules ({elapsed}). This usually takes one to three minutes; your answers are saved.
        {seconds >= SLOW_AFTER_S && handlers.onStop ? <>{" "}<button type="button" onClick={handlers.onStop} className="underline">Stop and try again</button></> : null}
      </p>
    );
  }
  if (status.error) {
    return (
      <p data-testid="next-step-error" role="alert" className="mt-2 text-sm font-semibold text-[#a63b3b]">
        {status.error}
        {handlers.onRetry ? <>{" "}<button type="button" onClick={handlers.onRetry} className="underline">Try again</button></> : null}
      </p>
    );
  }
  return null;
}
