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
import { caseStepFor } from "../caseStep";

/**
 * `firm`: the answer is something the person themselves entered or chose --
 * their side, an amount they typed, an answer to a family question, the step
 * they picked. The Forms page keeps a firm answer with the case without
 * asking again (build order Step 2B, 2026-10-12: the walkthrough flagged the
 * page re-asking "money or property?" and "which pleading?" on 4 of 10
 * cases). An answer read from what the story does or does not mention stays
 * a suggestion the person confirms.
 *
 * Since walkthrough run 38593464953 (2026-10-14) a firm answer is the case's
 * answer without any save: the Forms page shows it as "From your case: ... ·
 * Change", and the Forms route applies it when it reads the case
 * (caseAnswersApplied) without storing it, so it follows the fact it came
 * from if that fact later changes. Only a value the person saves (by Change)
 * is stored, and a stored value wins.
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
 * "counterclaim", "sue him back". The person is the one asking (first
 * person), so the plaintiff's own claim ("He wants to claim the money back
 * from me", "he says I owe 7500") is not read as theirs. A bare "should pay" /
 * "has to pay for" counts only when it is them being paid, or the repairs or
 * damage they paid for ("The plaintiff should pay costs if he loses" and "He
 * has to pay for his own lawyer" are not a claim back). Review 2026-10-13:
 * each of those misfired in the first version.
 */
const PARTY = "(?:him|her|them|the contractor|the plaintiff|the other side)";
const SUBJECT = "(?:he|she|they|the contractor|the plaintiff)";
const ME = "\\b(?:i|we)\\b[^.!?\\n]{0,50}";
const CLAIM_BACK = [
  new RegExp(`${ME}\\b(?:want|wanted|would like|'d like|need|am asking|ask|hope|hoping|plan|planning|am going)\\b[^.!?\\n]{0,40}\\b${PARTY}\\b[^.!?\\n]{0,15}\\bto (?:pay|cover|reimburse|refund|compensate)\\b`, "i"),
  new RegExp(`${ME}\\b(?:have|make|get) ${PARTY} (?:to )?(?:pay|cover|reimburse|refund|compensate)\\b`, "i"),
  new RegExp(`\\b${SUBJECT} owes? (?:me|us)\\b(?! nothing| anything)`, "i"),
  new RegExp(`\\b${SUBJECT} (?:should|has to|must|needs to|ought to) (?:pay|cover|reimburse|refund|compensate) (?:me|us)\\b`, "i"),
  new RegExp(`\\b${SUBJECT} (?:should|has to|must|needs to|ought to) (?:pay|cover) for (?:the |my |our )?(?:repairs?|fixing|fix|damage|redoing|redo)\\b`, "i"),
  new RegExp(`${ME}\\bclaim(?:ing)? (?:it |that |the money |the cost |the costs |\\$?[\\d,]+ )?back\\b`, "i"),
  new RegExp(`${ME}\\bclaim(?:ing)? against ${PARTY}\\b`, "i"),
  /\bcounter-?claim/i,
  /\bdefendant'?s claim\b/i,
  new RegExp(`${ME}\\bsu(?:e|ing) ${PARTY} (?:back|for)\\b`, "i"),
];
/** A story about being sued or served: the person may be the one responding, whatever their stage says. */
const SUED_OR_SERVED = /\b(?:su(?:ing|ed|es?) me|against me|(?:i was|i've been|i have been|i got|been|was) served|served (?:me|on me|with)|i (?:got|received) (?:a|the) (?:statement of claim|claim|notice))\b/;
/** A "no" anywhere up to the end of the words: "I don't want him to pay me anything". */
const SAYS_NO = /\b(?:no|not|never|nothing|don'?t|do not|doesn'?t|does not|won'?t|will not|didn'?t|did not|can'?t|cannot)\b/i;

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
      // A question is not a request ("Do I have to counterclaim?").
      if (sentence.includes("?")) continue;
      for (const pattern of CLAIM_BACK) {
        const match = pattern.exec(sentence);
        if (match && !SAYS_NO.test(sentence.slice(0, match.index + match[0].length))) return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
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

  // "Are you responding to a Plaintiff's Claim / Family Application?" Kept
  // only when the person set their side themselves (sideIsTheirs); a side a
  // model read from the story, or one inferred from the stage alone, is
  // offered (review of 400ad42).
  if (/^respondingTo/.test(last) && side) {
    const firm = sideIsTheirs(record, master);
    return side === "responding"
      ? { value: true, reason: "Your case says you are responding to the other side's case.", ...(firm ? { firm } : {}) }
      : { value: false, reason: "Your case says you are the one starting it.", ...(firm ? { firm } : {}) };
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
  // the step "considering a defendant's claim" is offered the same way.
  if (last === "isMakingDefendantsClaim" && side === "responding") {
    if (record.position.stepId === "defendant:considering-defendants-claim") {
      // Considering is a question, not a decision: offered, never kept
      // without their confirmation (CLAUDE.md section 4; review 2026-10-13).
      return { value: true, reason: "Your step is considering a defendant's claim." };
    }
    const asked = claimBackInOwnWords(master, record.story);
    if (asked) return { value: true, reason: `You wrote: “${asked}”` };
  }

  // The step the person picked settles some of these outright.
  const stepAnswer = record.position.stepId ? STEP_ANSWERS[last]?.[record.position.stepId] : undefined;
  if (stepAnswer) return stepAnswer;
  // No step picked: the step every case page shows them (caseStep.ts, the
  // card's own order, once their stage is confirmed). Walkthrough MC
  // (2026-10-13): the card said "Your step: ... how do I ask the court to
  // change it?" and the Forms page still asked "Which Family Law Rules
  // motion document set are you preparing?". That step is the site's
  // suggestion, not the person's choice, so its answer is offered, never kept
  // without them (CLAUDE.md section 4): firm only for a step they chose.
  const pathway = record.courtPath;
  if (!record.position.stepId && pathway && STEP_ANSWERS[last]) {
    const shown = caseStepFor(master, pathway, record.side?.value === "responding", { requireConfirmedStage: true });
    const fromShown = shown ? STEP_ANSWERS[last][shown] : undefined;
    if (fromShown) return { value: fromShown.value, reason: `${fromShown.reason.replace(/^Your step is/, "The step shown for your case is")}` };
  }

  // Civil: what the person's own words already answer. Each says only what is
  // in their story; "Not sure" stays one click away.
  const story = record.story.toLowerCase();

  // A story that mentions a notice of action is never answered for them
  // (review 2026-10-13: "i filed a notice of action last week", "i was served
  // with a notice of action"), whatever their stage says.
  if (last === "isCommencedByNoticeOfAction" && /\bnotice of action\b/.test(story)) return null;
  // "Was this case started by Notice of Action?" asked of a plaintiff whose
  // confirmed stage is "I have not filed anything yet" (walkthrough SW,
  // 2026-10-13; run 38593464953: still shown, needing a Save click). Nothing
  // has been started, and the person CONFIRMED that stage, so "No" is the
  // case's answer, shown with Change and counted without a click (CLAUDE.md
  // s. 4 is met by their confirmation of the stage). Kept only for someone
  // bringing the case: a served defendant can also truthfully say "I have not
  // filed anything yet" (review 2026-10-13), so a defendant role, a
  // responding side, or a story about being sued or served leaves it a
  // suggestion. The Forms route applies a kept answer when it reads the case
  // and never stores it, so it follows a later change of stage.
  //
  // Review of 400ad42: with no role, or "Not sure", the side is itself read
  // from that stage (caseRecord sideFromParts), so "starting" proved nothing.
  // Kept only when the person picked a starting role themselves (source
  // "intake"); otherwise offered.
  const roleSaysDefendant = /defend|respond/i.test(String(asRecord(asRecord(master.intakeData).extra).yourRole ?? ""));
  if (last === "isCommencedByNoticeOfAction" && record.position.confirmedStage === "starting-case" && side !== "responding" && !roleSaysDefendant) {
    const reason = "You said you have not filed anything yet, so your case has not been started by a notice of action.";
    const theirRole = record.side?.source === "intake" && side === "starting";
    return theirRole && !SUED_OR_SERVED.test(story) ? { value: false, reason, firm: true } : { value: false, reason };
  }
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

/**
 * Whether the side on the record is one the person set themselves (review of
 * 400ad42). A role they picked in the intake ("intake") is; a stage they
 * confirmed as "I was served" ("confirmed", responding) is. A "starting" side
 * read only from the stage "I have not filed anything yet" is not: with no
 * role, or "Not sure", sideFromParts infers it from that same stage. A side a
 * model read from the story ("guided", intakeFacts.role) counts only when the
 * person's own answer to the role question (personAnswers.side) agrees.
 */
export function sideIsTheirs(record: CaseRecord, master: Record<string, unknown>): boolean {
  const side = record.side;
  if (!side) return false;
  if (side.source === "intake") return true;
  if (side.source === "confirmed") return side.value === "responding";
  const own = String(asRecord(asRecord(asRecord(master.intakeData).extra).personAnswers).side ?? "");
  const ownSide = /defendant|respondent|responding/i.test(own) ? "responding" : /plaintiff|claimant|applicant|moving/i.test(own) ? "starting" : null;
  return ownSide === side.value;
}

/**
 * The marks the Forms route keeps beside the stored answers: one per field the
 * person saved through the page (applicabilitySaveFor / the route's PATCH).
 * A stored value with no mark was written by the page's old automatic save
 * (before 2026-10-14), not chosen by the person.
 */
export const CHOSEN_KEY = "chosen";

type Stored = Record<string, unknown>;

/** A save's patch with a chosen mark for each field it sets, and the mark cleared where it clears one (the Forms route's PATCH). */
export function withChosenMarks(patch: Stored): Stored {
  const marks: Record<string, true | null> = {};
  for (const [group, answers] of Object.entries(patch)) {
    for (const [field, value] of Object.entries(asRecord(answers))) marks[`formApplicability.${group}.${field}`] = value === null ? null : true;
  }
  return { ...patch, [CHOSEN_KEY]: marks };
}

function storedValueAt(stored: Stored, fieldPath: string): boolean | string | undefined {
  const [, group, field] = fieldPath.split(".");
  const value = asRecord(stored[group])[field];
  return typeof value === "boolean" || typeof value === "string" ? value : undefined;
}
function chosenAt(stored: Stored, fieldPath: string): boolean {
  return asRecord(stored[CHOSEN_KEY])[fieldPath] === true;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * How one Forms question stands (review of 400ad42):
 *   - "case": a firm answer, nothing stored against it -- answered, no click;
 *   - "saved": a value saved to the case (chosen by the person, or stored
 *     with no firm answer to compare); `caseSays` when a firm answer now
 *     differs from one the person chose;
 *   - "conflict": a value the old automatic save stored, which a firm answer
 *     now contradicts -- both are shown and the person is asked;
 *   - "suggested": a reading of the story, one click to keep;
 *   - "open": nothing known.
 */
export type AnswerView =
  | { kind: "case"; value: boolean | string; reason: string }
  | { kind: "saved"; value: boolean | string; caseSays?: { value: boolean | string; reason: string } }
  | { kind: "conflict"; saved: boolean | string; caseSays: { value: boolean | string; reason: string } }
  | { kind: "suggested"; value: boolean | string; reason: string }
  | { kind: "open" };

export function answerViewFor(fieldPath: string, stored: Stored, suggestions: ReadonlyArray<ApplicabilitySuggestion>): AnswerView {
  const suggestion = suggestions.find((item) => item.fieldPath === fieldPath);
  const firm = suggestion?.firm ? { value: suggestion.value, reason: suggestion.reason } : undefined;
  const saved = storedValueAt(stored, fieldPath);
  if (saved !== undefined) {
    if (!firm || same(saved, firm.value)) return firm && !chosenAt(stored, fieldPath) ? { kind: "case", ...firm } : { kind: "saved", value: saved };
    return chosenAt(stored, fieldPath) ? { kind: "saved", value: saved, caseSays: firm } : { kind: "conflict", saved, caseSays: firm };
  }
  if (firm) return { kind: "case", ...firm };
  if (suggestion) return { kind: "suggested", value: suggestion.value, reason: suggestion.reason };
  return { kind: "open" };
}

/**
 * The case's answers as the form matcher reads them. A firm answer counts
 * with no save and is never written, so it follows the fact it comes from; a
 * value the person chose wins; a value the old automatic save stored that a
 * firm answer now contradicts counts as neither until the person picks one.
 */
export function caseAnswersApplied(stored: Stored, suggestions: ReadonlyArray<ApplicabilitySuggestion>): Record<string, unknown> {
  const paths = new Set<string>(suggestions.filter((item) => item.firm).map((item) => item.fieldPath));
  for (const [group, answers] of Object.entries(stored)) {
    if (group === CHOSEN_KEY) continue;
    for (const field of Object.keys(asRecord(answers))) paths.add(`formApplicability.${group}.${field}`);
  }
  const out: Record<string, unknown> = {};
  for (const fieldPath of paths) {
    const view = answerViewFor(fieldPath, stored, suggestions);
    const value = view.kind === "case" || view.kind === "saved" ? view.value : undefined;
    if (value === undefined) continue;
    const [, group, field] = fieldPath.split(".");
    out[group] = { ...asRecord(out[group]), [field]: value };
  }
  return out;
}

/**
 * What a save sends for the answers the person picked on the page (review of
 * 400ad42): a pick equal to the case's firm answer is never stored -- and
 * clears (null) a different value stored before, so the firm answer applies
 * again; a pick equal to a value they already chose sends nothing; anything
 * else is sent, and the route marks it chosen. Null when nothing changes.
 */
export function applicabilitySaveFor(
  picked: Record<string, boolean | string>,
  stored: Stored,
  suggestions: ReadonlyArray<ApplicabilitySuggestion>,
): Record<string, Record<string, boolean | string | null>> | null {
  const patch: Record<string, Record<string, boolean | string | null>> = {};
  for (const [fieldPath, value] of Object.entries(picked)) {
    const [, group, field] = fieldPath.split(".");
    if (!group || !field) continue;
    const firm = suggestions.find((item) => item.firm && item.fieldPath === fieldPath);
    const saved = storedValueAt(stored, fieldPath);
    let next: boolean | string | null | undefined = value;
    if (firm && same(firm.value, value)) next = saved === undefined ? undefined : null;
    else if (saved !== undefined && same(saved, value) && chosenAt(stored, fieldPath)) next = undefined;
    if (next === undefined) continue;
    patch[group] = { ...patch[group], [field]: next };
  }
  return Object.keys(patch).length ? patch : null;
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
