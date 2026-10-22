/**
 * Set when a Continue was pressed before the review panel was confirmed
 * (prepareCaseGuidance); read by ReviewNeededNotice beside each Continue (L26).
 * Kept apart from both so neither imports the other.
 */
let asked = false;
const listeners = new Set<() => void>();
export const subscribeReviewNeeded = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const reviewNeededAsked = () => asked;
export function markReviewNeeded() {
  asked = true;
  listeners.forEach((listener) => listener());
}
