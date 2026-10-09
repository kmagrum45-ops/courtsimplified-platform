import type { StagePathway } from "./stageMap";

/**
 * The step this user most likely means, from the stage they confirmed and the
 * side they are on. A SUGGESTION: it is pre-selected and its answer shown, and
 * the list stays open for them to pick another (CLAUDE.md section 4).
 *
 * Page walkthrough, 2026-10-04: a served Small Claims defendant confirmed "I
 * was served and need to respond" and still saw nothing about the time to
 * defend, because this panel showed nothing until they found the right
 * question in a list that opened with plaintiff and injury-notice questions.
 *
 * Small Claims only, where the stage answers are published; "" means no
 * suggestion, and the panel waits for the user to choose, as before.
 */
/**
 * The step the person's own words name, when they name one the stage alone
 * cannot tell apart. Walkthrough, 2026-10-08: a defendant whose story said "I
 * have been noted in default" was suggested the ordinary defence step (and
 * asked to find "noted in default" in a list); a father whose story asked to
 * change his final support order was suggested a motion for a temporary
 * order; a respondent with a case conference got the settlement conference.
 * Only phrases that name a procedural event count -- never a guess about the
 * case -- and the result is still only a suggestion.
 */
export function stepNamedInStory(courtPath: StagePathway, responding: boolean, story: string): string {
  const text = story.toLowerCase().replace(/\s+/g, " ");
  if (!text.trim()) return "";
  const notedInDefault = /\bnoted (?:me |us |him |her |them |the defendant )?in default\b/.test(text);
  // A default judgment that has happened, not one the person fears.
  const defaultJudgment =
    /\bdefault judg(?:e)?ment\b[^.]{0,30}\b(?:signed|entered|obtained|granted|issued|against (?:me|us))\b/.test(text) ||
    /\b(?:got|obtained|has|have|signed) (?:a )?default judg(?:e)?ment\b/.test(text);
  if (courtPath === "small-claims") {
    if (responding && defaultJudgment) return "defendant:default-judgment-against-me";
    if (responding && notedInDefault) return "defendant:noted-in-default";
    if (!responding && notedInDefault) return "plaintiff:defendant-noted-in-default";
    return "";
  }
  if (courtPath === "civil") {
    if (responding && defaultJudgment) return "civil:defendant:default-judgment-against-me";
    if (responding && notedInDefault) return "civil:defendant:noted-in-default";
    if (!responding && notedInDefault) return "civil:plaintiff:defendant-noted-in-default";
    if (/\bsummary judg(?:e)?ment\b/.test(text)) return "civil:both:summary-judgment-motion";
    return "";
  }
  // Family.
  const changeFinal =
    /\bmotion to change\b/.test(text) ||
    /\b(?:change|vary|lower|reduce|increase)\b[^.]{0,40}\b(?:final |support |child support |spousal support |parenting |custody )*order\b/.test(text);
  if (changeFinal) return /\bserved\b[^.]{0,40}\bmotion to change\b/.test(text) ? "family:both:served-with-motion-to-change" : "family:both:asking-to-change-final-order";
  if (/\btrial management conference\b/.test(text)) return "family:both:trial-management-conference-scheduled";
  if (/\bsettlement conference\b/.test(text)) return "family:both:settlement-conference-scheduled";
  if (/\bcase conference\b/.test(text)) return "family:both:case-conference-scheduled";
  return "";
}

export function suggestedStageFor(
  courtPath: StagePathway,
  confirmedStage: string | null,
  responding: boolean,
  /** The person's own words; a procedural event they name decides the step (stepNamedInStory). */
  story = "",
): string {
  const named = stepNamedInStory(courtPath, responding, story);
  if (named) return named;
  /*
   * Civil and family were left to choose for themselves until 2026-10-06,
   * because their steps had no written answers. Every step now shows at least
   * its deadlines and rules (stageRules.ts), so each court suggests the step
   * its confirmed stage points to, the same way Small Claims does.
   */
  if (courtPath === "civil") {
    switch (confirmedStage) {
      case "starting-case":
        return responding ? "civil:defendant:served-defence-period-running" : "civil:plaintiff:claim-drafted-not-issued";
      case "responding":
        return "civil:defendant:served-defence-period-running";
      case "conference":
        return "civil:both:pretrial-scheduled";
      case "motion":
        return "civil:both:motion-scheduled";
      case "trial":
        return "civil:both:trial-date-set";
      case "enforcement":
        return responding ? "civil:defendant:judgment-being-enforced" : "civil:plaintiff:judgment-unpaid";
      default:
        return "";
    }
  }
  if (courtPath === "family") {
    switch (confirmedStage) {
      case "starting-case":
        return responding ? "family:respondent:served-time-to-answer-running" : "family:before-filing:deciding-where-to-start";
      case "responding":
        return "family:respondent:served-time-to-answer-running";
      case "conference":
        return "family:both:case-conference-scheduled";
      case "motion":
        return responding ? "family:both:responding-to-a-motion" : "family:both:bringing-a-motion";
      case "trial":
        return "family:both:trial-scheduled";
      case "enforcement":
        return "family:both:support-order-not-paid";
      default:
        return "";
    }
  }
  const side = responding ? "defendant" : "plaintiff";
  switch (confirmedStage) {
    case "responding":
      return "defendant:served-defence-period-running";
    case "starting-case":
      return responding ? "defendant:served-defence-period-running" : "plaintiff:claim-drafted-not-filed";
    case "conference":
      return `${side}:awaiting-settlement-conference`;
    case "trial":
      return `${side}:trial-date-set`;
    case "enforcement":
      return responding ? "defendant:judgment-against-me" : "plaintiff:judgment-in-my-favour-unpaid";
    default:
      return "";
  }
}

