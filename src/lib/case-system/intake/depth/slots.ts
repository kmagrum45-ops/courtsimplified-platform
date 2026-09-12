/**
 * Deterministic slot substitution for depth question text.
 *
 * LOAD-BEARING PROPERTY 2 (docs/CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md section 3,
 * Channel B): questions inherit the user's vocabulary WITHOUT the model ever
 * authoring question text.
 *
 * This is a pure string operation over text the user themselves typed:
 *
 *   Authored: "When {defendantLabel} put up {subjectLabel}, who else saw it?"
 *   Rendered: "When your ex-girlfriend put up the post, who else saw it?"
 *
 * THE INVARIANT THIS PROTECTS — composeVoiceTurn() never emits model output as
 * question text. The voice layer writes the LEAD-IN only; the question itself
 * comes from the authored spec and is transformed only by this function. That
 * is what makes the architecture defensible for a legal intake product: the
 * words a user is asked to answer were written and reviewed by a person.
 *
 * Letting the voice layer phrase the question would be simpler and would read
 * better. It is not worth dissolving the one guarantee that matters.
 *
 * WHY SLOT VALUES ARE BOUNDED, for two independent reasons:
 *
 *  1. Characterization. "my ex-girlfriend" is a referring expression; "that
 *     liar" is a characterization, and echoing it inside a question would
 *     adopt it as the system's own voice.
 *  2. Validator coverage. validateVoiceLayerOutput() guards the lead-in, not
 *     question text — question text has always been reviewed bank content. If
 *     a slot admitted free-form story text, a prohibited case-strength term
 *     could arrive through the slot and reach the user unchecked.
 *
 * So slot values come from a bounded set of captured party/subject labels, are
 * length-capped, and are rejected outright if they carry anything the
 * case-strength validator would block. Where no clean label exists the neutral
 * default is CORRECT, not a fallback failure.
 */

import { validateCaseStrengthLanguage } from "../../intelligence/caseStrengthLanguageValidator";

/** The complete set of slots a question may use. Adding one is a review step. */
export const SLOT_NAMES = ["defendantLabel", "subjectLabel", "amountLabel"] as const;

export type SlotName = (typeof SLOT_NAMES)[number];

/**
 * Every slot has an authored neutral default, and a question MUST read
 * correctly with every slot defaulted. That is the ship-safe state, and
 * assertQuestionReadsWithDefaults() below enforces it.
 */
export const SLOT_DEFAULTS: Record<SlotName, string> = {
  defendantLabel: "the other party",
  subjectLabel: "it",
  amountLabel: "the amount",
};

export type SlotValues = Partial<Record<SlotName, string>>;

/** Longer than this is a sentence, not a label. */
const MAX_SLOT_LENGTH = 40;

/**
 * Words that turn a referring expression into a characterization. A label
 * containing one is rejected in favour of the neutral default.
 */
const CHARACTERIZATION_WORDS = [
  "liar", "lying", "crook", "crooked", "fraud", "fraudster", "scammer",
  "thief", "criminal", "idiot", "incompetent", "negligent", "dishonest",
  "shady", "useless", "awful", "terrible", "horrible", "nasty", "evil",
];

export type SlotFillResult = {
  text: string;
  /** Slots that used the user's label. */
  filledFromUser: SlotName[];
  /** Slots that fell back to the neutral default, with why. */
  defaulted: { slot: SlotName; reason: "absent" | "too-long" | "characterization" | "blocked-term" }[];
};

/**
 * Pure. Fills slots in authored text, falling back to the neutral default
 * whenever the user's label is absent or unsafe.
 */
export function fillSlots(authoredText: string, values: SlotValues): SlotFillResult {
  const filledFromUser: SlotName[] = [];
  const defaulted: SlotFillResult["defaulted"] = [];

  let text = authoredText;

  for (const slot of SLOT_NAMES) {
    const token = `{${slot}}`;
    if (!text.includes(token)) continue;

    const candidate = (values[slot] || "").trim();
    const verdict = vetLabel(candidate);

    if (verdict === "ok") {
      filledFromUser.push(slot);
      text = text.split(token).join(candidate);
    } else {
      defaulted.push({ slot, reason: verdict });
      text = text.split(token).join(SLOT_DEFAULTS[slot]);
    }
  }

  return { text: tidy(text), filledFromUser, defaulted };
}

function vetLabel(
  candidate: string,
): "ok" | "absent" | "too-long" | "characterization" | "blocked-term" {
  if (candidate.length === 0) return "absent";
  if (candidate.length > MAX_SLOT_LENGTH) return "too-long";

  const lower = candidate.toLowerCase();

  if (CHARACTERIZATION_WORDS.some((word) => lower.includes(word))) {
    return "characterization";
  }

  // Reason 2 in the file header: the lead-in validator does not run over
  // question text, so the slot is where a blocked term could otherwise enter.
  if (!validateCaseStrengthLanguage(candidate).valid) {
    return "blocked-term";
  }

  return "ok";
}

/**
 * Authoring guard: a question must read correctly with every slot defaulted.
 * Returns the problems found, empty when the text is safe to ship.
 *
 * Run over the whole registry by the verification harness, so an unshippable
 * question cannot reach a user.
 */
export function checkQuestionReadsWithDefaults(authoredText: string): string[] {
  const problems: string[] = [];
  const rendered = fillSlots(authoredText, {}).text;

  for (const match of authoredText.matchAll(/\{([a-zA-Z]+)\}/g)) {
    const name = match[1];
    if (!SLOT_NAMES.includes(name as SlotName)) {
      problems.push(`unknown slot "{${name}}" — add it to SLOT_NAMES with a neutral default`);
    }
  }

  if (/\{|\}/.test(rendered)) {
    problems.push(`unsubstituted slot remains after defaulting: ${JSON.stringify(rendered)}`);
  }

  if (/\s{2,}/.test(rendered) || / ,|\s\./.test(rendered)) {
    problems.push(`reads badly with defaults: ${JSON.stringify(rendered)}`);
  }

  return problems;
}

function tidy(text: string): string {
  return text.replace(/\s{2,}/g, " ").replace(/\s+([.,?!])/g, "$1").trim();
}
