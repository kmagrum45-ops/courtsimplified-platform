/**
 * Which route's Continue was pressed before the review panel was confirmed, and
 * for which version of the intake (L26). Read by ReviewNeededNotice beside that
 * route's Continue only, and only while the intake is still that version: the
 * guided route finishing its questions on its own, or a press on another route
 * or an earlier version, shows nothing (Part 3b, #465 re-test).
 * Kept apart from the notice and the intake store so neither imports the other.
 */
export type ReviewNeeded = { from: string; revision: string } | null;
let asked: ReviewNeeded = null;
const listeners = new Set<() => void>();
export const subscribeReviewNeeded = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const reviewNeededAsked = () => asked;
export function markReviewNeeded(from: string, revision: string) {
  asked = { from, revision };
  listeners.forEach((listener) => listener());
}
