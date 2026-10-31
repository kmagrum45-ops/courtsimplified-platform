"use client";

/**
 * "CHANGE": THE ONE CONTROL FOR CHANGING OR REMOVING AN ANSWER ALREADY GIVEN (site owner, 31 Oct:
 * "one change path, latest change wins", rule 6).
 *
 * Wherever an answer shows as held ("already given; it is not asked again" in the review, "What we
 * have so far" on the case page through the review's ?change=<fact>), this opens that fact's own
 * choices and saves through the one write path: caseFile.ts withChange, put as the case file's
 * change record (CASE_FILE_SECTION.changes), a touched answer from the review. caseFileOf applies the
 * record over every older copy, and the review's confirmation rule counts it as a change of a
 * confirmed fact (intakeReview.ts materialFacts), so a confirmed intake asks to be confirmed again.
 *
 * Choices per fact: the kind of claim per court (Small Claims: "What kind of dispute is this?";
 * civil and Family: the issues list), Yes or No, or a typed answer (a day checked for its year, as
 * every date box is), and "Remove this answer". Side, court, stage and papers are not changed here:
 * they choose the court and its steps, so they are changed with the start questions at the top.
 *
 * With `adding` it is the "Add it" of a fact not answered yet (NotAnsweredYet.tsx, site owner 31 Oct):
 * the same choices and the same write path, and nothing to remove.
 *
 * Restates the person's own answers; states no law.
 */
import { useEffect, useRef, useState } from "react";
import { useIntakeRecovery } from "./IntakeRecovery";
import { CASE_FILE_SECTION, withChange, type ChangeInput, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { CIVIL_ISSUE_OPTIONS, FAMILY_ISSUE_OPTIONS } from "../builder/_components/guidedFields";
import { dateAnswerCheck } from "../../src/lib/case-system/dates";
import { ADD_IT_LATER } from "../../src/lib/case-system/copy/askCopy";

/** Each fact's name, as "What we have so far" and the review show it. */
export const FACT_LABEL: Record<SlotFact, string> = {
  side: "Your side",
  court: "Court",
  stage: "Where the case is",
  filed: "Anything filed yet",
  papers: "Papers you received",
  servedDate: "Day you got the papers",
  amount: "Amount",
  otherParty: "The other party",
  children: "Children",
  married: "Married to the other person",
  marriedWhere: "Where you married",
  claimKind: "Kind of claim",
  wants: "What you want",
  whenHappened: "When it happened",
  conferenceDate: "Conference date",
  defenceFiled: "Defence or answer filed",
  outcome: "Outcome you want",
  urgent: "Anything urgent",
  courtDate: "Next court date",
};

/** Changed with the start questions at the top of the page: they choose the court and its steps. */
export const CHANGED_AT_THE_START = new Set<SlotFact>(["side", "court", "stage", "papers"]);
const YES_NO = new Set<SlotFact>(["filed", "children", "married", "defenceFiled"]);
const DAYS = new Set<SlotFact>(["servedDate", "whenHappened", "conferenceDate", "courtDate"]);

type Choices =
  | { kind: "choice"; options: { value: string; label: string }[] }
  | { kind: "multi"; options: { value: string; label: string }[] }
  | { kind: "yes-no" }
  | { kind: "text"; day: boolean };

/** The choices "Change" offers for a fact in a court, or null when it is changed at the start. */
export function changeChoices(fact: SlotFact, court: string | null | undefined): Choices | null {
  if (CHANGED_AT_THE_START.has(fact)) return null;
  if (fact === "claimKind") {
    if (court === "civil") return { kind: "multi", options: CIVIL_ISSUE_OPTIONS };
    if (court === "family") return { kind: "multi", options: FAMILY_ISSUE_OPTIONS };
    const choices = QUESTION_BANK.find((question) => question.id === "sc-orient-dispute-category")?.choices ?? [];
    return { kind: "choice", options: choices.map((choice) => ({ value: choice, label: choice })) };
  }
  if (YES_NO.has(fact)) return { kind: "yes-no" };
  return { kind: "text", day: DAYS.has(fact) };
}

export default function ChangeAnswer({ fact, court, startOpen = false, current, adding = false }: { fact: SlotFact; court: string | null | undefined; startOpen?: boolean; current?: unknown; /** For a fact not answered yet ("I don't know"): "Add it", nothing to remove (askCopy.ts NOT_ANSWERED_YET). */ adding?: boolean }) {
  const recovery = useIntakeRecovery();
  const [open, setOpen] = useState(startOpen);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [picks, setPicks] = useState<string[]>(Array.isArray(current) ? current.filter((item): item is string => typeof item === "string") : []);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (startOpen) box.current?.scrollIntoView({ block: "center" }); }, [startOpen]);
  const choices = changeChoices(fact, court);
  if (!recovery || !choices) return null;
  const label = FACT_LABEL[fact];
  /** The one write path (caseFile.ts withChange): the change record, a touched answer from the review. */
  const save = (change: ChangeInput) => {
    recovery.put(CASE_FILE_SECTION, "changes", withChange(recovery.read(CASE_FILE_SECTION, "changes"), fact, change), true, true, true);
    setOpen(false); setTyped(""); setNote("");
  };
  const saveTyped = () => {
    const words = typed.trim();
    if (!words) return;
    const more = choices.kind === "text" && choices.day ? dateAnswerCheck(label, words, { dateQuestion: true, oneDate: true }) : null;
    setNote(more ?? "");
    if (!more) save({ state: "answered", value: words });
  };
  if (!open) return <span data-testid="change-answer" data-fact={fact}>{" "}<button type="button" data-testid="change-answer-open" onClick={() => setOpen(true)} className="font-semibold text-[#2f7d67] underline">{adding ? ADD_IT_LATER : "Change"}</button></span>;
  return (
    <span ref={box} data-testid="change-answer" data-fact={fact} data-open="true" className="mt-2 block rounded-xl border border-[#d8e6df] p-3">
      <span className="block font-semibold">{adding ? "Add" : "Change"}: {label}</span>
      {choices.kind === "choice" ? (
        <span className="mt-1 flex flex-wrap gap-2">{choices.options.map((option) => <button key={option.value} type="button" data-testid="change-answer-choice" onClick={() => save({ state: "answered", value: option.value })} className="rounded border px-3 py-1">{option.label}</button>)}</span>
      ) : choices.kind === "multi" ? (
        <span className="mt-1 block" role="group" aria-label={`Change: ${label}`}>
          {choices.options.map((option) => <label key={option.value} className="mr-3 block"><input type="checkbox" data-testid="change-answer-pick" value={option.value} checked={picks.includes(option.value)} onChange={() => setPicks((list) => (list.includes(option.value) ? list.filter((item) => item !== option.value) : [...list, option.value]))} /> {option.label}</label>)}
          <button type="button" data-testid="change-answer-save" disabled={picks.length === 0} onClick={() => save({ state: "answered", value: picks })} className="mt-2 rounded border px-3 py-1 disabled:opacity-50">Save these</button>
        </span>
      ) : choices.kind === "yes-no" ? (
        <span className="mt-1 flex gap-2">{([true, false] as const).map((value) => <button key={String(value)} type="button" data-testid="change-answer-choice" onClick={() => save({ state: "answered", value })} className="rounded border px-3 py-1">{value ? "Yes" : "No"}</button>)}</span>
      ) : (
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <input type="text" data-testid="change-answer-text" aria-label={`New answer: ${label}`} placeholder={choices.day ? "For example: October 12, 2026" : "Your answer"} value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveTyped(); }} className="min-w-[14rem] flex-1 rounded border px-2 py-1" />
          <button type="button" data-testid="change-answer-save" disabled={!typed.trim()} onClick={saveTyped} className="rounded border px-3 py-1 disabled:opacity-50">Save</button>
        </span>
      )}
      {note ? <span data-testid="change-answer-needs-more" className="mt-1 block text-sm text-[#8a4b12]">{note}</span> : null}
      <span className="mt-2 flex flex-wrap gap-3">
        {adding ? null : <button type="button" data-testid="change-answer-remove" onClick={() => save({ state: "removed" })} className="text-sm font-semibold text-[#8a4b12] underline">Remove this answer</button>}
        <button type="button" data-testid="change-answer-cancel" onClick={() => { setOpen(false); setNote(""); }} className="text-sm underline">Cancel</button>
      </span>
    </span>
  );
}
