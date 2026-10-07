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
export function suggestedStageFor(
  courtPath: StagePathway,
  confirmedStage: string | null,
  responding: boolean,
): string {
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

