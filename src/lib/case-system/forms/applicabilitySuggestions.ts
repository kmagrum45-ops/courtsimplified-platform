/**
 * Answers the Forms page's questions already has, offered -- never saved --
 * from the case record.
 *
 * WHY (master plan Phase 1, 2026-10-07). Every page review found the Forms
 * page asking "Are you responding to a Plaintiff's Claim?" of a person whose
 * case already says they were served and are the defendant, and "Is this a
 * divorce application?" of a mother who said they were never married. The
 * answer is pre-selected with where it came from; nothing is recorded until
 * the person presses Save, which is their confirmation (CLAUDE.md section 4).
 * The verified recommendation still needs that saved answer.
 *
 * Kept apart from the route and the Forms page on purpose: those two must
 * carry no form-specific field names (verifyFormsSelectedCaseIsolation). The
 * rules here are keyed on the question's own field path.
 */

import type { CaseRecord } from "../caseRecord";

/**
 * `firm`: the answer is something the person themselves entered or chose --
 * their side, an amount they typed, an answer to a family question, the step
 * they picked. The Forms page keeps a firm answer with the case without
 * asking again (build order Step 2B, 2026-10-12: the walkthrough flagged the
 * page re-asking "money or property?" and "which pleading?" on 4 of 10
 * cases). An answer read from what the story does or does not mention stays
 * a suggestion the person confirms.
 */
export type ApplicabilitySuggestion = { fieldPath: string; value: boolean | string; reason: string; firm?: boolean };

/** The person's chosen step -> the answer it settles, where that step leaves no doubt. */
const STEP_ANSWERS: Record<string, Record<string, { value: string; reason: string; firm: boolean }>> = {
  pleadingPosture: {
    "civil:plaintiff:served-with-counterclaim": { value: "defence-to-counterclaim", reason: "Your step is answering a counterclaim made against you.", firm: true },
    "civil:defendant:served-with-counterclaim-as-new-party": { value: "defence-to-counterclaim", reason: "Your step is answering a counterclaim that names you.", firm: true },
  },
  responseDocument: {
    // A Statement of Defence is the usual answer, but a notice of intent to
    // defend is also open to them, so this one stays a suggestion.
    "civil:defendant:served-defence-period-running": { value: "statement-of-defence", reason: "Your step is answering a statement of claim.", firm: false },
  },
  motionDocumentSet: {
    "family:both:served-with-motion-to-change": { value: "response-to-motion-to-change", reason: "Your step is responding to a motion to change.", firm: true },
    "family:both:asking-to-change-final-order": { value: "motion-to-change", reason: "Your step is asking to change a final order.", firm: true },
    "family:both:bringing-a-motion": { value: "notice-of-motion-and-general-affidavit", reason: "Your step is bringing a motion.", firm: false },
  },
};

type Question = { field_path: string; choices: ReadonlyArray<{ value: unknown }> };

/**
 * A defendant asking, in their own words, for the other side to pay THEM:
 * "I want him to pay for the repairs", "I want to claim back the $5,200",
 * "counterclaim", "sue him back". Not the plaintiff's demand ("he says I owe
 * 7500"), and not a sentence that says no ("I don't want to claim anything").
 */
const CLAIM_BACK = [
  /\b(?:want|wants|wanted|asking|ask|like|need|hoping|hope|plan|planning|going)\b[^.!?\n]{0,40}\b(?:him|her|them|the contractor|the plaintiff|the other side)\b[^.!?\n]{0,15}\bto (?:pay|cover|reimburse|refund|compensate)\b/i,
  /\b(?:have|make|get) (?:him|her|them|the contractor|the plaintiff|the other side) (?:to )?(?:pay|cover|reimburse|refund|compensate)\b/i,
  /\b(?:he|she|they|the contractor|the plaintiff) (?:should (?:pay|cover|reimburse|refund)|owes? me|has to pay (?:me|for))\b/i,
  /\bclaim(?:ing)? (?:it |that|the money |the cost |the costs |\$?[\d,]+ )?back\b/i,
  /\bclaim(?:ing)? against (?:him|her|them|the contractor|the plaintiff)\b/i,
  /\bcounter-?claim/i,
  /\bdefendant'?s claim\b/i,
  /\bsu(?:e|ing) (?:him|her|them|the contractor|the plaintiff) (?:back|for)\b/i,
];
const SAYS_NO = /\b(?:no|not|never|don'?t|do not|won'?t|will not|didn'?t|did not)\b[^.!?\n]{0,25}$/i;

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function claimBackInOwnWords(master: Record<string, unknown>, story: string): string | null {
  const intake = asRecord(master.intakeData);
  const answers = Array.isArray(master.intakeAnswers) ? master.intakeAnswers : [];
  const own = [
    ...answers.map((answer) => asRecord(answer).answerText).filter((value): value is string => typeof value === "string"),
    ...[intake.goal, asRecord(intake.extra).goal].filter((value): value is string => typeof value === "string"),
    story,
  ];
  for (const text of own) {
    for (const sentence of sentencesOf(text)) {
      for (const pattern of CLAIM_BACK) {
        const match = pattern.exec(sentence);
        if (match && !SAYS_NO.test(sentence.slice(0, match.index))) return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
      }
    }
  }
  return null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** One rule per question this module can answer from the record. */
function suggest(
  fieldPath: string,
  record: CaseRecord,
  master: Record<string, unknown>,
): { value: boolean | string; reason: string; firm?: boolean } | null {
  const last = fieldPath.split(".").at(-1) ?? "";
  const side = record.side?.value;

  // "Are you responding to a Plaintiff's Claim / Family Application?"
  if (/^respondingTo/.test(last) && side) {
    return side === "responding"
      ? { value: true, reason: "Your case says you are responding to the other side's case.", firm: true }
      : { value: false, reason: "Your case says you are the one starting it.", firm: true };
  }

  // "Is this a divorce application?" -- from the family questions' own answers.
  if (last === "isDivorceApplication") {
    const family = asRecord(asRecord(master.familyStatus).record);
    if (family.marriedToOtherParty === "no") {
      return { value: false, reason: "You said you were not married to the other person.", firm: true };
    }
    if (family.divorceSought === "yes") return { value: true, reason: "You said you are asking for a divorce.", firm: true };
    if (family.divorceSought === "no") return { value: false, reason: "You said you are not asking for a divorce.", firm: true };
  }

  // "Does your case include a claim about decision-making, parenting time or contact?"
  if (last === "hasDecisionMakingParentingTimeOrContactClaim") {
    const issues = asRecord(asRecord(master.intakeData).extra).issues;
    const list = Array.isArray(issues) ? issues.map(String) : [];
    if (list.some((issue) => /decision|custody|parenting|access|contact/i.test(issue))) {
      return { value: true, reason: "The issues you chose include parenting.", firm: true };
    }
  }
  // "What ordinary claim are you starting?" -- a money claim, from the amount
  // they recorded (held-back walkthrough, 2026-10-09: asked of a plaintiff
  // whose $5,200 repair-cost claim was on record).
  if (last === "requestedRemedyType" && record.amount && /\d/.test(record.amount)) {
    return { value: "ordinary-money-claim", reason: `You recorded an amount: ${record.amount}.`, firm: true };
  }
  // No amount typed, but the story asks for money: offered, not kept.
  if (last === "requestedRemedyType" && /\$\s?\d|\b(?:pay(?:\s+(?:me|for|back))?|owe[sd]?|refund|compensat\w*|reimburs\w*)\b/i.test(record.story)) {
    return { value: "ordinary-money-claim", reason: "Your story asks for money." };
  }

  // "Are you making a Defendant's Claim?" -- from a defendant's own words
  // asking the other side to pay them (walkthrough, 2026-10-13, R7: a
  // homeowner sued by a contractor said in the intake she wanted him to pay
  // for the repairs, and the Forms page asked about a Defendant's Claim as if
  // nothing had been said). Wanting money back can also be raised in the
  // defence, so this stays a suggestion they confirm, never a kept answer;
  // the step "considering a defendant's claim" is their own choice, so it is.
  if (last === "isMakingDefendantsClaim" && side === "responding") {
    if (record.position.stepId === "defendant:considering-defendants-claim") {
      return { value: true, reason: "Your step is considering a defendant's claim.", firm: true };
    }
    const asked = claimBackInOwnWords(master, record.story);
    if (asked) return { value: true, reason: `You wrote: “${asked}”` };
  }

  // The step the person picked settles some of these outright.
  const stepAnswer = record.position.stepId ? STEP_ANSWERS[last]?.[record.position.stepId] : undefined;
  if (stepAnswer) return stepAnswer;

  // Civil: what the person's own words already answer. Each says only what is
  // in their story; "Not sure" stays one click away.
  const story = record.story.toLowerCase();
  if (last === "isMortgageForeclosure" && story && !/\bmortgage|foreclos|power of sale/.test(story)) {
    return { value: false, reason: "Your story does not mention a mortgage." };
  }
  if (last === "isCommencedByNoticeOfAction" && story && !/\bnotice of action\b/.test(story)) {
    return { value: false, reason: "Your story does not mention a notice of action." };
  }
  if (last === "isGeneralAction" && /\b(?:statement of claim|sued|suing|sue)\b/.test(story)) {
    return { value: true, reason: "You described suing someone." };
  }
  // Suing someone is an action, not an application (walkthrough: the page
  // asked a plaintiff with a new action whether it was an application).
  if (last === "isApplication" && /\b(?:statement of claim|sued|suing|sue)\b/.test(story) && !/\bnotice of application\b/.test(story)) {
    return { value: false, reason: "You described suing someone, which is an action, not an application." };
  }
  return null;
}

export function suggestApplicability(
  questions: ReadonlyArray<Question>,
  record: CaseRecord,
  masterResult: unknown,
): ApplicabilitySuggestion[] {
  const master = asRecord(masterResult);
  const out: ApplicabilitySuggestion[] = [];
  for (const question of questions) {
    const found = suggest(question.field_path, record, master);
    // Only a value the question itself offers.
    if (found && question.choices.some((choice) => choice.value === found.value)) {
      out.push({ fieldPath: question.field_path, ...found });
    }
  }
  return out;
}
