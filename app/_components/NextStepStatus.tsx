"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { startSignIn } from "./startSignIn";
import { useIntakeRecovery } from "./IntakeRecovery";

/**
 * PROGRESS AND ERRORS BESIDE "SHOW MY NEXT STEP" (L27).
 *
 * The button is in the review panel at the top of the page; the screen that
 * does the work (the Small Claims, Family or Civil form, or the guided route)
 * is far below it. After pressing it, the progress line sat about 2,350px down
 * and nothing near the button changed for about 90 seconds. Each screen now
 * publishes its state here, and the panel shows it beside the button.
 */
type Handlers = { onStop?: () => void; onRetry?: () => void };
type Status = { reading: boolean; error: string; startedAt: number | null; at: number; handlers: Handlers };
const IDLE: Status = { reading: false, error: "", startedAt: null, at: 0, handlers: {} };
// One entry per screen that publishes, removed when it unmounts, so one screen's
// old error never stands in for another's (the form's and the guided route's).
const sources = new Map<symbol, Status>();
let current: Status = IDLE;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function recompute() {
  const all = [...sources.values()];
  current = all.find((status) => status.reading) ?? all.filter((status) => status.error).sort((a, b) => b.at - a.at)[0] ?? IDLE;
  listeners.forEach((listener) => listener());
}

/** A screen that works out the next step reports its state (reading, error) and its stop/retry actions. */
export function usePublishNextStepStatus(reading: boolean, error: string, onStop?: () => void, onRetry?: () => void) {
  const latest = useRef({ onStop, onRetry });
  const [source] = useState(() => Symbol("next-step-source"));
  useEffect(() => { latest.current = { onStop, onRetry }; });
  useEffect(() => {
    const handlers = { onStop: latest.current.onStop && (() => latest.current.onStop?.()), onRetry: latest.current.onRetry && (() => latest.current.onRetry?.()) };
    sources.set(source, { reading, error, startedAt: reading ? Date.now() : null, at: Date.now(), handlers });
    recompute();
  }, [reading, error, source]);
  useEffect(() => () => { sources.delete(source); recompute(); }, [source]);
}

const SLOW_AFTER_S = 45;

export default function NextStepStatus() {
  const status = useSyncExternalStore(subscribe, () => current, () => IDLE);
  const guest = !useIntakeRecovery()?.ownerId;
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
        {seconds >= SLOW_AFTER_S && status.handlers.onStop ? <>{" "}<button type="button" onClick={status.handlers.onStop} className="underline">Stop and try again</button></> : null}
      </p>
    );
  }
  if (status.error) {
    return (
      <p data-testid="next-step-error" role="alert" className="mt-2 text-sm font-semibold text-[#a63b3b]">
        {status.error}
        {/* A guest asked to sign in gets the link here too (guestCarry.ts brings the intake along). */}
        {guest && /sign in/i.test(status.error) ? <>{" "}<a href="/login" onClick={(event) => { event.preventDefault(); startSignIn(); }} className="underline">Sign in or create a free account</a></> : null}
        {status.handlers.onRetry ? <>{" "}<button type="button" onClick={status.handlers.onRetry} className="underline">Try again</button></> : null}
      </p>
    );
  }
  return null;
}
