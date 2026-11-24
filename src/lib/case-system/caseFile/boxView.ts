/**
 * WHAT A FORM BOX SHOWS (the one asker; site owner, 24 Nov 2026: "ONE pure function, boxView(factState, ownAnswer), in the
 * shared asker code. Every form box uses it, and no screen decides this on its own").
 *
 *   fact state         the box shows
 *   ask                an empty box, no offer
 *   offer (the story)  the box, still empty and typeable, with "From your story: X" above it and Yes / No, that's not
 *                      right / I'm not sure; the story's value is never typed into the box for the person
 *   answered anywhere  the SAME box, pre-filled with that answer, still typeable, with Change; never empty, never text
 *   unsure             the box, plus "Not sure yet (not asked again)"
 *   removed            the same, and it stays removed (never filled again)
 *
 * The box exists in every state. `ownAnswer`: what the box holds now (typed by the person, or filled before): theirs, so
 * never replaced (no fill) and never covered by an offer. Pure: no React, no network. States no law.
 */
import { NOT_SURE_NOT_ASKED_AGAIN } from "../copy/askCopy";

/** A box's fact, as the one function reads it (factStatus.ts, heldAnswer.ts) with the story's offer when there is one. */
export type BoxFact =
  | { state: "ask" }
  | { state: "offer"; value: string; quote: string }
  | { state: "answered"; words: string }
  | { state: "unsure" }
  | { state: "removed" };

export type BoxView = {
  /** Always true: a box people type into exists in every state. */
  box: true;
  /** The words to put in the empty box (the answer held elsewhere), or null to leave it as it is. */
  fill: string | null;
  /** The story's offer, shown above the empty box with its three choices, or null. */
  offer: { value: string; quote: string; choices: readonly ["yes", "no", "unsure"] } | null;
  /** The line beside the box, or null. */
  note: string | null;
  /** A Change option beside the box (an answer is held). */
  change: boolean;
};

const CHOICES = ["yes", "no", "unsure"] as const;
const typed = (own: string | null | undefined) => typeof own === "string" && own.trim().length > 0;

export function boxView(fact: BoxFact, ownAnswer: string | null | undefined): BoxView {
  const own = typed(ownAnswer);
  switch (fact.state) {
    case "offer":
      return { box: true, fill: null, offer: own ? null : { value: fact.value, quote: fact.quote, choices: CHOICES }, note: null, change: false };
    case "answered":
      return { box: true, fill: own || !fact.words.trim() ? null : fact.words, offer: null, note: null, change: true };
    case "unsure":
    case "removed":
      return { box: true, fill: null, offer: null, note: own ? null : NOT_SURE_NOT_ASKED_AGAIN, change: false };
    default:
      return { box: true, fill: null, offer: null, note: null, change: false };
  }
}
