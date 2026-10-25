/**
 * A short wait inside an async step (never during render): for a request retried after
 * the case it needs has had a moment to save. Kept here so components carry no timers of
 * their own (test:chat-hydration).
 */
export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
