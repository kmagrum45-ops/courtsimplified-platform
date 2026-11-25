"use client";

/**
 * WHETHER THE "BEFORE YOU START" NOTICE IS STILL TO BE ACCEPTED, FOR THE WHOLE PAGE (site owner, 15 Nov 2026).
 *
 * The notice (FirstUseAcknowledgement.tsx) reports here as soon as it knows, and again when it is accepted, so code that
 * starts work and is drawn outside it (the review panel's "Show my next step", the home page's Continue) waits for it.
 * null: not known yet (treated as not accepted). true: still to accept. false: accepted.
 *
 * Found on PR #550: the review panel's start from the case page checked the screen for the notice while it was still
 * loading, found none, and said "Working out your next step" while the builder held the work behind the notice.
 */
import { useSyncExternalStore } from "react";
import { readAcknowledgement, writeAcknowledgement } from "@/src/lib/content-library/acknowledgement";
import { supabase } from "@/src/lib/supabase/client";

let outstanding: boolean | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function setNoticeOutstanding(value: boolean | null) {
  if (outstanding === value) return;
  outstanding = value;
  listeners.forEach((listener) => listener());
}

/** Now, outside React: true or null while the notice is not accepted. */
export const noticeOutstandingNow = () => outstanding;

export function useNoticeOutstanding(): boolean | null {
  return useSyncExternalStore(subscribe, () => outstanding, () => null);
}

/** Works it out from the acknowledgement record (signed in: the account's; guest: the browser's), and reports it. */
export async function loadNoticeStatus(): Promise<{ userId: string | null; outstanding: boolean }> {
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const userId = data.user?.id ?? null;
  // Accepted as a guest on this browser, then signed in: the same person, never asked again (site owner, 15 Nov 2026).
  if (userId && !readAcknowledgement(userId) && readAcknowledgement(null)) writeAcknowledgement(userId);
  const value = !readAcknowledgement(userId);
  setNoticeOutstanding(value);
  return { userId, outstanding: value };
}
