/**
 * WHERE A CASE IS, WHO THE PERSON IS IN IT, AND WHAT IS FILED: IN WORDS, NEVER CODES (26 Oct re-test).
 *
 * The case overview showed "Current stage: responding" and "starting case", "Documents already
 * recorded: application, answer", and for a family case already going "Applicant — you started, or
 * plan to start, the case". One place turns each stored value into the words a screen shows:
 *   - stageInWords: the site's stage words (builderTypes getStageLabel), never the code;
 *   - roleInWords: the person's own start answer when there is one ("I started this case
 *     (applicant)"), else the side in plain words;
 *   - documentInWords: a filed document by its form's name (rawKeys.ts optionWords), never the code.
 *
 * Pure. States no law.
 */
import { getStageLabel, type UniversalStage } from "../../../../app/builder/_components/builderTypes";
import { optionWords } from "./rawKeys";

export function stageInWords(stage: string): string {
  return getStageLabel(stage as UniversalStage) || "Not confirmed yet";
}

const ROLE_WORDS: Record<string, string> = {
  applicant: "Applicant — you started, or plan to start, the case",
  respondent: "Respondent — the other person started the case",
  plaintiff: "Plaintiff — you are bringing the claim",
  defendant: "Defendant — you are responding to a claim",
  "not-sure": "",
};
/** The side in words: the start answer's own words for a case already going, else the plain side. Empty for "not sure". */
export function roleInWords(role: string, startWords?: string | null): string {
  if (startWords) return startWords;
  return role in ROLE_WORDS ? ROLE_WORDS[role] : role;
}

const DOCUMENT_WORDS: Record<string, string> = {
  "plaintiffs-claim": "Plaintiff’s Claim filed and served",
  "affidavit-service": "Affidavit of Service filed with the court",
  "statement-claim": "Statement of Claim filed or served",
  "statement-defence": "Statement of Defence filed or received",
  "notice-application": "Notice of Application filed or received",
  "notice-motion": "Notice of Motion filed or received",
};
export function documentInWords(document: string): string {
  return DOCUMENT_WORDS[document] ?? optionWords(document) ?? document.replace(/-/g, " ");
}
