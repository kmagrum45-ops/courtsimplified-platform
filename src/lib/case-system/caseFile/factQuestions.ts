/**
 * THE SITE ASKS IN ITS OWN FIXED WORDS, BY FACT ID; THE AI WRITES NO QUESTION (site owner, 19 Nov 2026).
 *
 * Until now the home page's story reading (understanding/understandCase.ts) wrote its own questions, and the site tied
 * each to a fact by matching its WORDING (factsOfQuestion.ts factOfAskedText). In the 30 recorded readings the model
 * wrote 146 questions, 124 of which matched no fact at all, and the same fact came back in other words in each reading
 * ("When was payment due under your agreement?" / "What payment due date or payment terms did you agree on?"). A fact
 * asked in other words could not be recognised as already asked, so repeats could not be prevented by design.
 *
 * Now: the questions the home page asks are chosen by the site, for the court and side, from this fixed list. Each is an
 * existing question of the site's, in its existing words (the Small Claims question bank, the Civil and Family questions,
 * the Family triage): `id` is that question's id, so factsOfQuestion(id) gives its facts exactly, and the one function
 * (factStatus.ts mayShowQuestion) decides by id whether it may be asked. The same story read three times asks the same
 * questions, worded identically. Nothing here is written by a model.
 *
 * A fact the model would have asked about that is not on this list is not asked on the home page: the intake's own
 * questions and steps ask it, or it is a gap for the owner to add (docs: the fact table, for-claude-review).
 */
import { QUESTION_BANK } from "../intake/questionBank";
import { statedInStory } from "../intakeReview";
import { civilGuidedFields, familyGuidedFields } from "../../../../app/builder/_components/guidedFields";
import { factsOfQuestion } from "./factsOfQuestion";
import { factStatus } from "./factStatus";
import type { CaseFile, SlotFact } from "./caseFile";

export type QuestionCourt = "small-claims" | "civil" | "family";
export type QuestionSide = "starting" | "responding";
export type FactQuestion = { id: string; question: string; why?: string };

const bank = (id: string): FactQuestion => {
  const found = QUESTION_BANK.find((item) => item.id === id);
  if (!found) throw new Error(`factQuestions: question bank has no ${id}`);
  return { id, question: found.text, ...(found.why ? { why: found.why } : {}) };
};

/**
 * The Civil and Family questions' own words, read from the fields themselves (app/builder/_components/guidedFields.ts):
 * one copy of each question's text (rule 0, 19 Nov 2026; the copy kept here before is gone).
 */
const FIELD_WORDS: Readonly<Record<string, string>> = Object.fromEntries([
  ...civilGuidedFields({ issues: [], documents: [] }).map((field) => [`civil:${field.key}`, field.question]),
  ...familyGuidedFields({ issues: [], filed: [] }).map((field) => [`family:${field.key}`, field.question]),
]);
export const GUIDED_WORDS: Readonly<Record<string, string>> = Object.fromEntries(
  ["civil:amountClaimed", "civil:legalRemedy", "civil:urgent", "family:childrenInfo", "family:goal"].map((key) => {
    if (!FIELD_WORDS[key]) throw new Error(`factQuestions: no guided field ${key}`);
    return [key, FIELD_WORDS[key]];
  }),
);
const guided = (court: "civil" | "family", key: string): FactQuestion => ({ id: key, question: GUIDED_WORDS[`${court}:${key}`] });

/** The home page's questions, by court and side, most important first. */
export const HOME_QUESTIONS: Readonly<Record<QuestionCourt, Readonly<Record<QuestionSide, readonly FactQuestion[]>>>> = {
  "small-claims": {
    starting: [bank("sc-amount-claimed"), bank("sc-orient-when-happened"), bank("sc-remedy-sought")],
    responding: [bank("sc-defendant-counterclaim"), bank("sc-orient-when-happened")],
  },
  civil: {
    starting: [guided("civil", "amountClaimed"), guided("civil", "legalRemedy"), guided("civil", "urgent")],
    responding: [guided("civil", "legalRemedy"), guided("civil", "urgent")],
  },
  // Not "married": the Family questions ask it themselves, early (guidedFields.ts; factStatus.ts ASKED_BY_THE_INTAKE).
  family: {
    starting: [guided("family", "childrenInfo"), guided("family", "goal")],
    responding: [guided("family", "childrenInfo"), guided("family", "goal")],
  },
};

/** Every fixed wording this list can show, for the build check (no other question text may reach the home page). */
export function allHomeQuestionWords(): Set<string> {
  return new Set(Object.values(HOME_QUESTIONS).flatMap((sides) => Object.values(sides).flatMap((list) => list.map((item) => item.question))));
}

/**
 * THE ONE DECISION OF WHICH HOME QUESTIONS ARE ASKED (site owner, 19 Nov 2026): a fixed question is asked only while each
 * of its facts is "ask" in the one function (factStatus.ts), with the story reader's values (intakeReview.ts
 * statedInStory, no AI reading) as what the story states. So a fact the case record holds (answered, "not sure",
 * removed) is not asked, and a fact the story states is not asked here: the intake offers it once (Yes / No, that's
 * not right / I'm not sure). It reads the story, never the model's reading, so the same story asks the same questions
 * on every reading. Chrome pass 3 re-recording: S2 was asked the amount after "kept my $1,200 deposit"; S1 and S4 were
 * asked when, after "On Oct 4, 2026", and "I do not know yet" settled the date the story gave.
 */
export function homeAsks(file: CaseFile | null | undefined, questionId: string, story: string): boolean {
  const stated = statedInStory(story ?? "");
  return factsOfQuestion(questionId).every((fact) => factStatus(file, fact as SlotFact, stated) === "ask");
}

/** The home page's fixed questions for this court and side (an unclear side: the starting side's), before the decision. */
export function homeQuestionsFor(court: string | null | undefined, side: string | null | undefined): FactQuestion[] {
  const byCourt = court === "small-claims" || court === "civil" || court === "family" ? HOME_QUESTIONS[court] : null;
  if (!byCourt) return [];
  return [...(side === "responding" ? byCourt.responding : byCourt.starting)];
}
