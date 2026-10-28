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
/** `follow`: started by the person from the review panel, so the line is kept where they are looking. `sourced`: a screen has reported the work. */
type Status = { reading: boolean; error: string; startedAt: number | null; at: number; handlers: Handlers; follow?: boolean; sourced?: boolean };
const IDLE: Status = { reading: false, error: "", startedAt: null, at: 0, handlers: {} };
// One entry per screen that publishes, removed when it unmounts, so one screen's
// old error never stands in for another's (the form's and the guided route's).
const sources = new Map<symbol, Status>();
let current: Status = IDLE;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
/**
 * A start the person made from the review panel (its button, or the notice's Continue), shown at
 * once: a screen reports its work only after saving and checking the sign-in, which took seconds
 * live, and the button stood pressable meanwhile (reviewer, case 11). It ends when that work ends,
 * or after PRESS_WAITS_MS if no screen took it up (the screen said why, as an error, or asked for
 * the review).
 */
const PRESS_WAITS_MS = 15_000;
let pressed: { at: number; taken: boolean } | null = null;
let pressTimer: ReturnType<typeof setTimeout> | null = null;
export function nextStepPressed() {
  pressed = { at: Date.now(), taken: false };
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { if (pressed && !pressed.taken) { pressed = null; recompute(); } }, PRESS_WAITS_MS);
  recompute();
}
function recompute() {
  const all = [...sources.values()];
  const working = all.find((status) => status.reading);
  if (pressed && working) pressed.taken = true;
  else if (pressed?.taken && !working) pressed = null;
  current = working
    ? pressed ? { ...working, startedAt: pressed.at, follow: true, sourced: true } : { ...working, sourced: true }
    : pressed ? { ...IDLE, reading: true, startedAt: pressed.at, at: pressed.at, follow: true }
    : all.filter((status) => status.error).sort((a, b) => b.at - a.at)[0] ?? IDLE;
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

/** Whether any screen is working out the next step now: the button that starts it waits (live re-test 26 Oct, case 11). */
export function useNextStepReading(): boolean {
  return useSyncExternalStore(subscribe, () => current.reading, () => false);
}

export default function NextStepStatus() {
  const status = useSyncExternalStore(subscribe, () => current, () => IDLE);
  const guest = !useIntakeRecovery()?.ownerId;
  const [now, setNow] = useState(() => Date.now());
  const line = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (!status.reading) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status.reading]);
  // Work the person started from the panel is kept where they are looking: after the notice's
  // Continue the page landed at its top, far from this line (case 11, live). Checked again when a
  // screen takes the work up (the page may have moved). Work started elsewhere (a form's own Try
  // again) never moves the page (reviewer).
  useEffect(() => {
    if (!status.reading || !status.follow || !line.current) return;
    const box = line.current.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) line.current.scrollIntoView({ behavior: "auto", block: "center" });
  }, [status.reading, status.follow, status.sourced, status.startedAt]);
  if (status.reading && status.startedAt) {
    const seconds = Math.max(0, Math.floor((now - status.startedAt) / 1000));
    const elapsed = seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
    return (
      <p ref={line} data-testid="next-step-status" role="status" aria-live="polite" className="mt-2 text-sm font-semibold text-[#4d675f]">
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
