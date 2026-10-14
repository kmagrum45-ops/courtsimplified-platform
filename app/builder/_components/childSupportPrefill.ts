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
 * WRONG IS WORSE THAN EMPTY. A field left empty is asked as before; a field
 * filled with the wrong words goes into an application unless the person
 * notices. So each reader is narrow (independent review, 2026-10-13):
 *   - the children: a sentence naming a child WITH an age, never a sentence
 *     about money or how long something went on ("The child support was $400
 *     a month for 2 years" once won over "My son, 12, lives with me");
 *   - the time question: only the sentence saying who the children live with
 *     or how their time is split, not the whole children answer, and not
 *     "we shared a car";
 *   - income documents: only items naming a document, never one naming the
 *     other parent ("His tax returns for 2023") or a refusal ("He refuses to
 *     show his income"), and a document keeps its years ("Notice of
 *     assessment, 2023, 2024").
 *
 * Pure: no browser, no network, no model. verifyChildSupportIntake runs it.
 */

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

const AGE = "(?:\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)";
const CHILD = "(?:daughters?|sons?|kids?|children|child|bab(?:y|ies)|boys?|girls?|twins)";

/** A child named with an age: "my son, 12", "two kids, 9 and 11", "a 4-year-old". */
const CHILD_WITH_AGE = new RegExp(
  `\\b${CHILD}\\b[^.!?]{0,20}?\\b(?:is |are |aged |age )?${AGE}\\b|\\b${AGE}[- ](?:year|yr)s?[- ]old\\b`,
  "i",
);

/** Money or duration: never the description of a child. */
const MONEY_OR_DURATION =
  /\$|\bchild support\b|\bsupport\b|\bpa(?:y|id|ys|ying)\b|\b(?:a|per) (?:month|week|year)\b|\bmonthly\b|\bdollars?\b|\b\d+\s*(?:months?|years?)\b(?![- ]old)|\bfor (?:\w+ )?(?:months?|years?)\b/i;

/** Who the children live with, or how their time is split. */
const LIVING_OR_TIME =
  /\b(?:lives?|living|stays?|staying|resides?|residing)\b[^.!?]{0,40}\bwith\b|\bwith (?:me|him|her|them|us)\b[^.!?]{0,30}\b(?:full[- ]time|most of the time|every|weekends?|weekdays?|nights?|days?)\b|\bevery (?:other|second) (?:weekend|week)\b|\bweek on,? week off\b|\b(?:half|50\/50|equal(?:ly)?)\b[^.!?]{0,15}\btime\b|\bparenting time\b|\bweekends? (?:with|at)\b/i;

/** A document someone can hold, which is what the question asks for. */
const INCOME_DOCUMENT =
  /\b(?:tax returns?|notices? of (?:re)?assessment|NOAs?|T4[AE]?s?|T1s?|T5s?|pay ?stubs?|pay ?slips?|EI (?:statements?|slips?|letters?|stubs?)|employment insurance (?:statements?|letters?)|records? of employment|ROEs?|bank statements?|financial statements?|employment letters?|letters? from (?:my )?employer)\b/i;

/** The other parent's, or about them, or about not having it. */
const OTHER_PERSON_OR_REFUSAL =
  /\b(?:he|she|him|his|her|hers|they|them|their|theirs|ex|other (?:parent|person|side)|refus\w*|won'?t|will not|doesn'?t|does not|didn'?t|did not|hasn'?t|has not|never|admits?|messages?|texts?|emails?|says?|said)\b/i;

/** Sentences, and clauses that start a new subject after a comma ("two kids, 9 and 11, they live with..."). */
function clauses(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+|,\s+(?=(?:they|he|she|we|i|both|the (?:kids|children|boys|girls))\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Evidence items. A comma splits only before a letter, so the years after a
 * document stay with it: "Notice of assessment, 2023, 2024, bank statements"
 * is two items, not four.
 */
function items(text: string): string[] {
  return text
    .split(/\n|;|,\s*(?=[a-z])/i)
    .map((item) => item.trim().replace(/^[-•*]\s*/, "").replace(/[.,]\s*$/, ""))
    .filter(Boolean);
}

function childrenFrom(story: string): string {
  return clauses(story).find((sentence) => CHILD_WITH_AGE.test(sentence) && !MONEY_OR_DURATION.test(sentence)) ?? "";
}

function livingFrom(text: string): string {
  return clauses(text)
    .filter((sentence) => LIVING_OR_TIME.test(sentence))
    .join(" ");
}

export function childSupportPrefill(recorded: FamilyRecordedForPrefill | null | undefined): ChildSupportPrefill {
  if (!recorded) {
    return { applicantName: "", respondentName: "", childrenDescribed: "", parentingTimeDescribed: "", incomeDocumentsHeld: "" };
  }
  const childrenInfo = recorded.childrenInfo.trim();
  const otherName = recorded.otherParty.trim().split(/\s+/)[0] ?? "";
  const namesOther = (item: string) =>
    OTHER_PERSON_OR_REFUSAL.test(item) || (otherName.length > 1 && new RegExp(`\\b${otherName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(item));
  return {
    applicantName: recorded.yourName.trim(),
    respondentName: recorded.otherParty.trim(),
    // The answer to the intake's own children question, as written; failing
    // that, the story's sentence naming a child with an age.
    childrenDescribed: childrenInfo || childrenFrom(recorded.story),
    // Only the words about where the children live or how time is split.
    parentingTimeDescribed: livingFrom(recorded.currentLivingSituation) || livingFrom(childrenInfo),
    incomeDocumentsHeld: items(recorded.evidence)
      .filter((item) => INCOME_DOCUMENT.test(item) && !namesOther(item))
      .join("\n"),
  };
}
