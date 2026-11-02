/**
 * EDITS TYPED BUT NOT SAVED YET, SAVED BEFORE ANY CONFIRM (founder's Chrome check of #541 at 354e36fb, 2 Nov,
 * step 3: "5200" typed into an open "Change: Amount" box, then "Confirm my initial information" pressed straight
 * away; the case kept $4,500 and 5200 was lost everywhere).
 *
 * A box that keeps what is typed until its own "Save" (ChangeAnswer) registers here while it holds typing
 * (holdOpenEdit). Every Confirm control runs flushOpenEdits() first, through this one path: each open edit is
 * saved the way its own "Save" saves it, or, when it cannot be saved yet (a day without its year), it is named
 * and the Confirm stops, so nothing typed is dropped. test:confirm-flushes lists every Confirm control and checks
 * each one calls it.
 *
 * Module state, per tab (no React). States no law.
 */
export type OpenEdit = {
  /** What the box changes, in words ("Amount"), for the message when it cannot be saved yet. */
  label: string;
  /** Saves what is typed as its own "Save" would: "saved", "blocked" (needs more first) or "empty" (nothing typed). */
  flush: () => "saved" | "blocked" | "empty";
};

const open = new Map<string, OpenEdit>();

/** Registers an open edit under `id` (one per box); returns the function that removes it. */
export function holdOpenEdit(id: string, edit: OpenEdit): () => void {
  open.set(id, edit);
  return () => {
    if (open.get(id) === edit) open.delete(id);
  };
}

export type FlushResult = { saved: string[]; blocked: string[] };

/** Saves every open edit now. `blocked` names the ones that need more before they can be saved. */
export function flushOpenEdits(): FlushResult {
  const result: FlushResult = { saved: [], blocked: [] };
  for (const edit of [...open.values()]) {
    const outcome = edit.flush();
    if (outcome === "saved") result.saved.push(edit.label);
    if (outcome === "blocked") result.blocked.push(edit.label);
  }
  return result;
}

/** The message a Confirm shows when an open edit needs more before it can be saved. */
export function blockedMessage(blocked: readonly string[]): string {
  return `Finish or cancel your change to ${blocked.join(", ")} before confirming.`;
}

/** The number of open edits (for the terminal check). */
export function openEditCount(): number {
  return open.size;
}

/**
 * The first line of every Confirm control outside the review (whose Confirm runs it inside recovery.transition):
 * saves every open edit; when one needs more first, tells the person through `onBlocked` and returns false, so the
 * Confirm does not go ahead and nothing typed is lost.
 */
export function saveOpenEditsBeforeConfirm(onBlocked: (message: string) => void): boolean {
  const { blocked } = flushOpenEdits();
  if (blocked.length) {
    onBlocked(blockedMessage(blocked));
    return false;
  }
  return true;
}
