/**
 * Case strategy (2026-10-08, site owner): the person's matter looked at from
 * every seat in the courtroom — their own counsel, the other side's counsel,
 * and the judge — plus the procedural tools and timing. Plan: docs/STRATEGY_PLAN.md.
 *
 * BEHIND ITS OWN SWITCH, OFF ON THE LIVE SITE (strategyEnabled, phaseScope.ts)
 * until the Law Society's A2I approval covers it.
 *
 * NEVER GRADES THE CASE. It never says how strong a case is or how likely it is
 * to succeed, in any wording (site owner, 2026-10-08: "It should never tell
 * someone how strong the case is"). Each seat is a checked answer
 * (checkedAnswer.ts): every statement is proven word for word against the
 * official text, and any statement that predicts or grades the case is refused
 * by the same code check every answer passes. What the other side can raise is
 * stated as what the LAW makes available to them, with the law that answers
 * it, never as a prediction of what they will do or how a judge will see it.
 */

import { isMapOwnedInstruction } from "../procedureOwnership";
import { ANSWER_TIME_MS, checkedAnswer, checkedAnswerView, type CheckedAnswer, type CheckedAnswerInput } from "./checkedAnswer";
import type { CheckedAnswerView } from "../intelligence/intelligenceTypes";
import type { RetrievalCourt } from "./storyRetrieval";

export type StrategySeat = "prove" | "other-side" | "judge" | "procedure";

export type StrategyInput = { story: string; courtPath: RetrievalCourt; side: "plaintiff" | "defendant"; facts?: string };

export type StrategySection = { seat: StrategySeat; title: string; answer: CheckedAnswerView };

const NO_GRADING =
  "State the law and apply it to the facts. Never say or suggest how strong the case is, how likely it is to succeed, or what a judge will think or decide.";

/** The four seats, each asked as its own question about the person's matter. */
export function strategyQuestions(side: "plaintiff" | "defendant", courtPath?: RetrievalCourt): { seat: StrategySeat; title: string; question: string }[] {
  // Family's own words (Jason, 2026-10-24): an applicant and a respondent, never a plaintiff or a defendant.
  const family = courtPath === "family";
  const mine = family
    ? side === "plaintiff" ? "the applicant" : "the respondent"
    : side === "plaintiff" ? "the person bringing this case" : "the person responding to this case";
  const theirs = family
    ? side === "plaintiff" ? "the respondent" : "the applicant"
    : side === "plaintiff" ? "the person being sued or responding" : "the person who brought the case";
  const example = family ? "The law gives a respondent ..." : "The law gives a defendant the defence of ... (section)";
  return [
    {
      seat: "prove",
      title: "What has to be proven, and with what",
      question:
        `I am ${mine}. For each thing that has to be proven in this matter, by me or by the other side, say what the law requires, who has to prove it and to what standard, and what kind of evidence shows it. ${NO_GRADING}`,
    },
    {
      seat: "other-side",
      title: "What the law gives the other side, and the answer to each",
      question:
        `For ${theirs}: which defences, objections and procedural steps does the law make available to them in this kind of matter, and for each, what law or evidence answers it? State each as what the law provides ("${example}"), never as a prediction of what they will do.${family ? " This is a family case: say applicant and respondent, never plaintiff or defendant." : ""} ${NO_GRADING}`,
    },
    {
      seat: "judge",
      title: "What the court must decide",
      question:
        `In order, what are the questions a court must decide in this matter, and for each, what legal test applies and who carries the burden of proof? State them as what the law requires the court to decide. ${NO_GRADING}`,
    },
    {
      seat: "procedure",
      title: "Steps, tools and timing",
      question:
        // The next step, its form and deadline are shown from the stage map
        // (CLAUDE.md s. 2a, 2026-10-14), so this seat covers the tools only.
        `What procedural tools does the law give me in this kind of matter (motions, offers to settle and their cost consequences, ways to get documents or evidence from the other side), and what does each require? Do not list my next step, its form or its deadline: the site shows those separately from the court's checked step map. ${NO_GRADING}`,
    },
  ];
}

export type StrategyDeps = { answer?: (input: CheckedAnswerInput, deps: { timeoutMs: number }) => Promise<CheckedAnswer>; timeoutMs?: number };

/**
 * All four seats, side by side, each a thorough checked answer. Never throws:
 * a seat that cannot be answered comes back "unavailable" and is not shown.
 */
export async function buildStrategy(input: StrategyInput, deps: StrategyDeps = {}): Promise<{ sections: StrategySection[]; missingLaw: string[] }> {
  const answer = deps.answer ?? ((question, options) => checkedAnswer(question, options));
  const timeoutMs = deps.timeoutMs ?? ANSWER_TIME_MS;
  const seats = strategyQuestions(input.side, input.courtPath);
  const answers = await Promise.all(
    seats.map((seat) =>
      answer({ question: seat.question, story: input.story, facts: input.facts, courtPath: input.courtPath, side: input.side }, { timeoutMs }).catch(
        (): CheckedAnswer => ({ status: "unavailable", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] }),
      ),
    ),
  );
  return {
    // The next step, its form and deadline are the stage map's (CLAUDE.md s. 2a);
    // a statement naming the person's own step, form or response period is
    // left to the step panel.
    sections: seats.map((seat, i) => ({
      seat: seat.seat,
      title: seat.title,
      answer: checkedAnswerView({ ...answers[i], statements: answers[i].statements.filter((statement) => !isMapOwnedInstruction(statement.text)) }),
    })),
    missingLaw: [...new Set(answers.flatMap((item) => item.missingLaw))],
  };
}
