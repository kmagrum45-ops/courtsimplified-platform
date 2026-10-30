/**
 * A GUEST'S INTAKE CARRIES INTO THEIR ACCOUNT — ONLY WHEN THEY ASK FOR IT.
 *
 * Re-test 2026-10-18: guests have to sign in for guidance, and signing in wiped
 * what they had entered. But a shared computer (clinic, library) must never hand
 * one person's story to the next person who signs in.
 *
 * So the carry is explicit and narrow: pressing any "Sign in" link while a guest
 * intake is open in this tab (signInAddress, used by every sign-in link) marks
 * THAT intake (by its flow id) in this tab for 30 minutes and returns to it. The
 * login page carries it over only when the sign-in returns to that same intake.
 * Anyone who signs in later, or elsewhere, gets nothing; the mark is read once.
 *
 * Re-test 2026-10-19: the header "Sign in" and the guided route went to /login
 * with no mark and no way back, so the intake was wiped and the person landed on
 * My cases. Every link now goes through signInAddress.
 *
 * A carried intake never joins an existing case: it gets a fresh flow id (which
 * is the id its case is created under) and no case id, so its first save creates
 * a new case. IntakeRecovery refuses to open a carried intake over an existing row.
 */
import { readCheckpoint, record, type IntakeSession } from "./intakeCheckpoint";
import { migrateStory, storyOf } from "./intakeStory";
import { GUEST_CARRY_KEY, GUEST_INTAKE_SESSION_KEY } from "./storage/intakeStorageKeys";
import { openCaseFromAddress } from "./openCase";

export const GUEST_CARRY_MAX_AGE_MS = 30 * 60 * 1000;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Court = "small-claims" | "family" | "civil";

export function markGuestCarry(storage: Store, flowId: string, now = Date.now()): void {
  try { storage.setItem(GUEST_CARRY_KEY, JSON.stringify({ flowId, at: now })); } catch { /* storage unavailable: nothing to carry */ }
}

/** The guest intake open in this tab, if any. */
function openGuestIntake(storage: Pick<Storage, "getItem">): { flowId: string; court: Court; entered: boolean } | null {
  try {
    const value = record(JSON.parse(storage.getItem(GUEST_INTAKE_SESSION_KEY) || "null"));
    const raw = record(value.checkpoint);
    const court = raw.courtPath;
    if (value.version !== 2 || value.ownerId !== null || (court !== "small-claims" && court !== "family" && court !== "civil") || typeof raw.flowId !== "string") return null;
    const checkpoint = readCheckpoint(raw, court, raw.flowId);
    return checkpoint ? { flowId: checkpoint.flowId, court, entered: Boolean(storyOf(migrateStory(checkpoint).sections).trim()) } : null;
  } catch { return null; }
}

/**
 * Where a "Sign in" link should return to, marking the open guest intake to carry.
 * On the intake itself: back to it. Elsewhere, with a guest intake holding a story
 * in this tab: back to that intake, not My cases. Otherwise null (the login page's
 * own default).
 */
export function signInAddress(storage: Store, pathname: string, search: string, now = Date.now()): string | null {
  const guest = openGuestIntake(storage);
  const here = `${pathname}${search}`;
  const onBuilder = pathname === "/builder";
  if (guest && onBuilder && openCaseFromAddress(new URLSearchParams(search)).intake === guest.flowId) {
    markGuestCarry(storage, guest.flowId, now);
    return here;
  }
  if (guest?.entered) {
    markGuestCarry(storage, guest.flowId, now);
    return `/builder?path=${guest.court}&intake=${guest.flowId}`;
  }
  return onBuilder ? here : null;
}

/**
 * The guest intake to bring into this account, rewritten as the account's under a
 * new flow id, with the destination pointing at it; null when the person did not
 * ask for it.
 */
export function carryGuestIntake(storage: Store, destination: string, userId: string, now = Date.now(), newFlowId: string = crypto.randomUUID()): { session: IntakeSession; destination: string } | null {
  try {
    const mark = record(JSON.parse(storage.getItem(GUEST_CARRY_KEY) || "null"));
    storage.removeItem(GUEST_CARRY_KEY);
    const address = new URL(destination, "http://local");
    const params = address.searchParams;
    const flow = openCaseFromAddress(params).intake;
    if (!flow || mark.flowId !== flow || typeof mark.at !== "number" || now < mark.at || now - mark.at > GUEST_CARRY_MAX_AGE_MS) return null;
    const value = record(JSON.parse(storage.getItem(GUEST_INTAKE_SESSION_KEY) || "null"));
    const court = record(value.checkpoint).courtPath;
    if (value.version !== 2 || value.ownerId !== null || (court !== "small-claims" && court !== "family" && court !== "civil") || openCaseFromAddress(params).court !== court) return null;
    const checkpoint = readCheckpoint(value.checkpoint, court, flow);
    if (!checkpoint || newFlowId === flow) return null;
    params.set("intake", newFlowId);
    params.delete("caseId");
    // The guest's own review is not proof on an account: it is confirmed again there.
    // No case id, a fresh flow id: the first save creates a new case, never an older one.
    return {
      session: { version: 2, ownerId: userId, caseId: null, serverRevision: null, carried: true, checkpoint: { ...checkpoint, flowId: newFlowId } },
      destination: `${address.pathname}?${params}`,
    };
  } catch { return null; }
}
