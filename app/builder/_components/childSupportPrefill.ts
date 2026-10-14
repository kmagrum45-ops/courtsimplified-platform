/**
 * What the child-support builder can start from, out of what the family
 * intake already recorded (walkthrough 2026-10-13, R3: it asked "Tell me about
 * the children this is for" and for income documents after the intake had
 * recorded "two kids, 9 and 11, they live with their mom").
 *
 * Every value is a SUGGESTION: ChildSupportIntake fills the field with it,
 * says where it came from, and the person changes or clears it (CLAUDE.md
 * s. 4). Nothing here decides anything; a field the intake did not answer
 * stays empty and is asked as before.
 *
 * Pure: no browser, no network, no model. verifyChildSupportIntake runs it.
 */

import { childrenFromStory } from "./storyAnswers";

/** What the family intake recorded, as FamilyIntake reports it (FamilyScope.recorded). */
export type FamilyRecordedForPrefill = {
  yourName: string;
  otherParty: string;
  childrenInfo: string;
  currentLivingSituation: string;
  evidence: string;
  story: string;
};

export type ChildSupportPrefill = {
  applicantName: string;
  respondentName: string;
  childrenDescribed: string;
  parentingTimeDescribed: string;
  incomeDocumentsHeld: string;
};

/** Words that say where the children live or how their time is shared. */
const LIVING =
  /\b(?:lives?|living|stays?|staying|reside[sd]?|with (?:me|him|her|them|their|his|my)\b|every other|weekends?|week on|half (?:of )?the time|50\/50|shared)\b/i;

/** An item that names an income document (tax return, assessment, pay, EI...). */
const INCOME_DOCUMENT =
  /\b(?:tax returns?|notices? of (?:re)?assessment|NOA|T4[AE]?|T1|pay ?stubs?|pay ?slips?|payroll|EI|employment insurance|records? of employment|ROE|income|salary|wages?|earnings|bank statements?|financial statements?)\b/i;

function items(text: string): string[] {
  return text
    .split(/\n|;|,\s+(?=[a-z0-9])/i)
    .map((item) => item.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

export function childSupportPrefill(recorded: FamilyRecordedForPrefill | null | undefined): ChildSupportPrefill {
  if (!recorded) {
    return { applicantName: "", respondentName: "", childrenDescribed: "", parentingTimeDescribed: "", incomeDocumentsHeld: "" };
  }
  const childrenInfo = recorded.childrenInfo.trim();
  const children = childrenInfo || childrenFromStory(recorded.story)?.value || "";
  const living = recorded.currentLivingSituation.trim();
  return {
    applicantName: recorded.yourName.trim(),
    respondentName: recorded.otherParty.trim(),
    childrenDescribed: children,
    // The intake's children question asks who they live with now, so that
    // answer speaks to the time question too, when it says so.
    parentingTimeDescribed: living || (LIVING.test(children) ? children : ""),
    // Only the items that are income documents: the intake's evidence list
    // holds everything (orders, messages, photos), and this question is about
    // income.
    incomeDocumentsHeld: items(recorded.evidence).filter((item) => INCOME_DOCUMENT.test(item)).join("\n"),
  };
}
