/**
 * A GUEST'S INTAKE CARRIES INTO THEIR ACCOUNT — ONLY WHEN THEY ASK FOR IT.
 *
 * Re-test 2026-10-18: guests have to sign in for guidance, and signing in wiped
 * what they had entered. But a shared computer (clinic, library) must never hand
 * one person's story to the next person who signs in.
 *
 * So the carry is explicit and narrow: pressing "Sign in" from inside a guest
 * intake marks THAT intake (by its flow id) in this tab for 30 minutes. The login
 * page carries it over only when the sign-in returns to that same intake. Anyone
 * who signs in later, or elsewhere, gets nothing; the mark is read once.
 */
import { readCheckpoint, record, type IntakeSession } from "./intakeCheckpoint";
import { GUEST_CARRY_KEY, GUEST_INTAKE_SESSION_KEY } from "./storage/intakeStorageKeys";

export const GUEST_CARRY_MAX_AGE_MS = 30 * 60 * 1000;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function markGuestCarry(storage: Store, flowId: string, now = Date.now()): void {
  try { storage.setItem(GUEST_CARRY_KEY, JSON.stringify({ flowId, at: now })); } catch { /* storage unavailable: nothing to carry */ }
}

/** The guest intake to bring into this account, rewritten as the account's; null when the person did not ask for it. */
export function carryGuestIntake(storage: Store, destination: string, userId: string, now = Date.now()): IntakeSession | null {
  try {
    const mark = record(JSON.parse(storage.getItem(GUEST_CARRY_KEY) || "null"));
    storage.removeItem(GUEST_CARRY_KEY);
    const params = new URL(destination, "http://local").searchParams;
    const flow = params.get("intake");
    if (!flow || mark.flowId !== flow || typeof mark.at !== "number" || now < mark.at || now - mark.at > GUEST_CARRY_MAX_AGE_MS) return null;
    const value = record(JSON.parse(storage.getItem(GUEST_INTAKE_SESSION_KEY) || "null"));
    const court = record(value.checkpoint).courtPath;
    if (value.version !== 2 || value.ownerId !== null || (court !== "small-claims" && court !== "family" && court !== "civil") || params.get("path") !== court) return null;
    const checkpoint = readCheckpoint(value.checkpoint, court, flow);
    // The guest's own review is not proof on an account: it is confirmed again there.
    return checkpoint ? { version: 2, ownerId: userId, caseId: null, serverRevision: null, checkpoint } : null;
  } catch { return null; }
}
