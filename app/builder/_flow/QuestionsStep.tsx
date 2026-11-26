"use client";

/**
 * THE QUESTIONS PAGE (site owner, 26 Nov 2026, change A): every question still unknown, on ONE page together, in one fixed
 * order (missingFacts "questions"), with how many are left, and the parties' names and addresses (the Parties step, the one
 * place for them). Nothing here decides what to ask: the record and the registry do. The words come from the question
 * bank; the kind of claim is picked from the Small Claims kinds by name and kept as the kind's id. "I'm not sure" settles a
 * question (never asked again); an answer goes through the one writer (caseWrite.ts writeAnswer).
 */
import { useState } from "react";
import { StepFrame } from "./StepFrame";
import { useFlowRecord } from "./useFlowRecord";
import PartiesStep from "../../_components/PartiesStep";
import { writeAnswer } from "../../_components/caseWrite";
import { missingFacts } from "../../../src/lib/case-system/caseFile/missingFacts";
import { smallClaimsKinds } from "../../../src/lib/case-system/flow/storyStated";
import { QUESTION_BANK } from "../../../src/lib/case-system/intake/questionBank";
import { FLOW_CONTINUE, FLOW_STEP_HEADINGS, QUESTIONS_LEFT, QUESTIONS_NONE_LEFT, QUESTIONS_SAVE } from "../../../src/lib/case-system/copy/flowCopy";
import { OFFER_CHOICES } from "../../../src/lib/case-system/copy/suggestionCopy";

const KIND_QUESTION = "sc-orient-dispute-category";
const objectOf = (value: unknown): Record<string, string> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {});
const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export function QuestionsStep({ onDone }: { onDone: () => void }) {
  const { record, recovery } = useFlowRecord();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const questions = missingFacts(record, "questions");
  const save = (unsure: string[] = []) => {
    if (!recovery) return;
    const typed = Object.fromEntries(Object.entries(drafts).filter(([id, words]) => words.trim() && questions.some((item) => item.field === id)));
    if (Object.keys(typed).length) writeAnswer(recovery, "builder", "initialAnswers", { ...objectOf(recovery.read("builder", "initialAnswers")), ...typed });
    if (unsure.length) writeAnswer(recovery, "builder", "initialUnknowns", [...new Set([...listOf(recovery.read("builder", "initialUnknowns")), ...unsure])]);
    setDrafts((old) => Object.fromEntries(Object.entries(old).filter(([id]) => !(id in typed) && !unsure.includes(id))));
  };
  return (
    <StepFrame step="questions" heading={FLOW_STEP_HEADINGS.questions}>
      <PartiesStep heading="The parties" />
      <p data-testid="questions-left" className="text-sm font-semibold text-[#24463d]">{questions.length ? QUESTIONS_LEFT(questions.length) : QUESTIONS_NONE_LEFT}</p>
      <ol className="space-y-4">
        {questions.map((item) => {
          const bank = QUESTION_BANK.find((question) => question.id === item.field);
          if (!bank) return null;
          const value = drafts[item.field] ?? "";
          const set = (words: string) => setDrafts((old) => ({ ...old, [item.field]: words }));
          return (
            <li key={item.field} data-testid="flow-question" data-question-id={item.field} data-facts={item.facts.join(",")} className="rounded-2xl border border-[#d8e6df] bg-white p-4">
              <label className="block text-sm">
                <span className="font-semibold text-[#16302b]">{bank.text}</span>
                {bank.whyAsked ? <span className="mt-1 block text-xs text-[#4d675f]">{bank.whyAsked}</span> : null}
                {item.field === KIND_QUESTION ? (
                  <select data-testid={`flow-answer-${item.field}`} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d8e6df] px-3 py-2">
                    <option value="" />
                    {smallClaimsKinds().map((kind) => <option key={kind.id} value={kind.id}>{kind.name}</option>)}
                  </select>
                ) : bank.answerType === "date" ? (
                  <input type="date" data-testid={`flow-answer-${item.field}`} value={value} onChange={(event) => set(event.target.value)} className="mt-2 rounded-xl border border-[#d8e6df] px-3 py-2" />
                ) : (
                  <textarea data-testid={`flow-answer-${item.field}`} rows={bank.answerType === "short-text" ? 3 : 1} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d8e6df] px-3 py-2" />
                )}
              </label>
              <button type="button" data-testid={`flow-unsure-${item.field}`} onClick={() => save([item.field])} className="mt-2 text-sm font-semibold text-[#2f7d67] underline">
                {OFFER_CHOICES.unsure}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-3">
        {questions.length ? (
          <button type="button" data-testid="questions-save" onClick={() => save()} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">{QUESTIONS_SAVE}</button>
        ) : (
          <button type="button" data-testid="questions-continue" onClick={onDone} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">{FLOW_CONTINUE}</button>
        )}
      </div>
    </StepFrame>
  );
}
