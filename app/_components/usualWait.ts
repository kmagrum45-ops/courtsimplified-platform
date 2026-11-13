/**
 * How long working out a next step usually takes, as the pages say it ("This usually takes one to three minutes"), and
 * the end of that time: no screen says it is "taking longer than usual" before it (Chrome check of #547 at 0e0f7e9, G4:
 * the warning showed at about 50 s under a line saying one to three minutes). test:usual-wait-agrees reads both.
 */
export const USUAL_WAIT_WORDS = "This usually takes one to three minutes";
export const USUAL_WAIT_MAX_MS = 3 * 60_000;
