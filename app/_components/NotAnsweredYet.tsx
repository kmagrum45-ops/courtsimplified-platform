"use client";

/**
 * "NOT ANSWERED YET: ADD IT WHEN YOU KNOW" -- THE ONE QUIET LINE FOR A FACT THE PERSON SAID THEY DO
 * NOT KNOW (site owner, 31 Oct; it replaced option 1's "one more offer" of 24 Oct).
 *
 * After "I don't know" or "not sure" (a skip, the words typed, or "I do not know yet"), no screen asks
 * the question again, in any court. Where a screen would ask for that fact, it shows this line instead
 * (askCopy.ts NOT_ANSWERED_YET), with a control the person may use when they know:
 *   - NotAnsweredYet: the review's line, with ChangeAnswer ("Add it"), so filling it goes through the
 *     one change path (caseFile.ts withChange; the change record wins over every older source). Side,
 *     court, stage and papers are changed with the start questions at the top, as everywhere;
 *   - NotAnsweredYetField: a whole form's box, folded into the line when the form opens with the fact
 *     held not sure; "Add it" opens the form's own box again (the form's own save). A box the person is
 *     typing in is never folded under them.
 * Never counted as still to answer; never blocks Confirm. Restates the person's own answers; states no law.
 */
import { useState, type ReactNode } from "react";
import ChangeAnswer, { CHANGED_AT_THE_START, changeChoices } from "./ChangeAnswer";
import { useIntakeReviewView } from "./IntakeRecovery";
import { caseFileOf, isUnsureAnswer, slotsOfQuestion, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { ADD_IT_LATER, NOT_ANSWERED_YET } from "../../src/lib/case-system/copy/askCopy";

/** The review's quiet line for a fact: its name (when given), the words, and the control to add it. */
export default function NotAnsweredYet({ fact, court, name, startOpen = false, control }: { fact?: SlotFact; court: string | null | undefined; name?: string; startOpen?: boolean; control?: ReactNode }) {
  const own = control ?? (fact && changeChoices(fact, court) ? <ChangeAnswer fact={fact} court={court} adding startOpen={startOpen} />
    : fact && CHANGED_AT_THE_START.has(fact) ? <span className="text-[#4d675f]"> (change it with the start questions at the top of the page)</span> : null);
  return (
    <p className="mt-1 text-sm text-[#4d675f]" data-testid="not-answered-yet" data-fact={fact}>
      {name ? <span className="font-semibold text-[#16302b]">{name}: </span> : null}{NOT_ANSWERED_YET}.{own}
    </p>
  );
}

const blank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);

/**
 * A whole form's box for a fact: the quiet line in its place while the case file holds the fact not
 * sure and the box holds nothing (or "I don't know"); otherwise the box itself. `facts`: the facts the
 * box asks for, where its key names none (a timeline box asks when it happened).
 */
export function NotAnsweredYetField({ field, facts, value, label, children }: { field: string; facts?: SlotFact[]; value: unknown; label: ReactNode; children: ReactNode }) {
  const view = useIntakeReviewView();
  // Typing in the box, or "Add it": the box stays for this visit (never folded under the person).
  const [opened, setOpened] = useState(false);
  const own = facts ?? slotsOfQuestion(field);
  const file = view?.checkpoint ? caseFileOf(view.checkpoint) : null;
  const folded = !opened && file !== null && own.length > 0 && own.some((fact) => file[fact].state === "unsure") && !own.some((fact) => file[fact].state === "answered") && (blank(value) || isUnsureAnswer(value));
  if (folded) {
    return (
      <div className="block" data-testid="not-answered-yet" data-fact={own[0]} data-field={field}>
        <span className="font-semibold text-[#16302b]">{label}</span>
        <p className="mt-2 text-sm text-[#4d675f]">{NOT_ANSWERED_YET}. <button type="button" data-testid="not-answered-yet-add" onClick={() => setOpened(true)} className="font-semibold text-[#2f7d67] underline">{ADD_IT_LATER}</button></p>
      </div>
    );
  }
  return <div className="contents" onFocusCapture={() => setOpened(true)}>{children}</div>;
}
