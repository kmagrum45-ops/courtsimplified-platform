/**
 * Records that a user was shown the information-not-advice and AI-use notices.
 *
 * *** WHY localStorage AND NOT A TABLE ***
 *
 * A database-backed acknowledgement needs a migration. Step 7's migrations are
 * written but deliberately NOT applied to any Supabase project, so a DB-backed
 * gate would either block every user (table missing) or be silently skipped.
 * Shipping a gate that cannot work is worse than shipping one with a stated
 * limit.
 *
 * *** THE LIMIT, STATED PLAINLY ***
 *
 * This is PER BROWSER, not per account. A user who signs in on a second device
 * sees the notice again, and clearing browsing data resets it. For a notice
 * that costs one checkbox, showing it twice is a small harm and the honest
 * default.
 *
 * It also means this is NOT a reliable audit record of who acknowledged what.
 * If the LSO needs that — and for quarterly reporting they may — it has to move
 * to the database. The upgrade path is in the report.
 *
 * *** WHY IT IS NOT IN intakeStorageKeys.ts ***
 *
 * That registry drives `resetIntake()`, which clears everything when an
 * anonymous user starts fresh on a shared computer. An acknowledgement is not
 * intake content and should survive starting a new case — a user should not be
 * re-asked because they clicked "start over". Deliberately outside that sweep.
 */

/** Base key. Suffixed with the user id when there is one. */
export const ACKNOWLEDGEMENT_KEY = "courtSimplifiedNoticeAcknowledged";

export type Acknowledgement = {
  /** ISO timestamp of the click. */
  acknowledgedAt: string;
  /** Which notice version was shown, so a material change can re-ask. */
  version: number;
};

/**
 * Bumped when the wording of the notices changes materially. A user who
 * acknowledged version 1 is asked again at version 2, which is the point of
 * recording a version rather than a bare boolean.
 */
export const NOTICE_VERSION = 1;

function keyFor(userId: string | null): string {
  return userId ? `${ACKNOWLEDGEMENT_KEY}:${userId}` : `${ACKNOWLEDGEMENT_KEY}:guest`;
}

/** The stored acknowledgement, or null if none applies to the current version. */
export function readAcknowledgement(userId: string | null): Acknowledgement | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Acknowledgement>;
    if (typeof parsed.acknowledgedAt !== "string") return null;
    if (parsed.version !== NOTICE_VERSION) return null;

    return { acknowledgedAt: parsed.acknowledgedAt, version: parsed.version };
  } catch {
    // Storage can throw in a private window or with site data blocked. A user
    // who cannot store an acknowledgement is shown the notice again, which is
    // the safe direction to fail.
    return null;
  }
}

/** Records the acknowledgement with a timestamp. Never throws. */
export function writeAcknowledgement(userId: string | null): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      keyFor(userId),
      JSON.stringify({
        acknowledgedAt: new Date().toISOString(),
        version: NOTICE_VERSION,
      } satisfies Acknowledgement),
    );
  } catch {
    // Same reasoning as above: failing to record means the notice shows again.
  }
}
