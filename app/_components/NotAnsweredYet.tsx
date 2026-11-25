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
import { useIntakeRecovery, useIntakeReviewView } from "./IntakeRecovery";
import { caseFileOf, isUnsureAnswer, slotsOfQuestion, type CaseFile, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { ADD_IT_LATER, NOT_ANSWERED_YET } from "../../src/lib/case-system/copy/askCopy";
import { settledNotSure, stillNeeded } from "../../src/lib/case-system/caseFile/factStatus";

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
/**
 * Whether a box folds into "Not answered yet": its own words are a "not sure", or the one function says every one of its
 * facts is settled by a confirmed "I'm not sure" (caseFile/factStatus.ts stillNeeded), none known or offered, and the box is
 * empty. A box the person cleared ("removed", settled too) stays an empty box (18 Nov 2026: form-box-follows-record, "a
 * cleared box stays empty", folded after the move to stillNeeded). Pure: test:chrome-pass-2 runs it.
 */
export function foldsAsNotAnswered(file: CaseFile | null, own: readonly SlotFact[], value: unknown): boolean {
  if (isUnsureAnswer(value)) return true;
  if (!file || own.length === 0) return false;
  const needed = stillNeeded(file, own);
  return needed.some((item) => item.addWhenYouKnow && settledNotSure(file, item.fact)) && needed.length === own.length && !needed.some((item) => item.status === "offer") && blank(value);
}

export function NotAnsweredYetField({ field, facts, value, label, children }: { field: string; facts?: SlotFact[]; value: unknown; label: ReactNode; children: ReactNode }) {
  const view = useIntakeReviewView();
  const recovery = useIntakeRecovery();
  // Typing in the box, or "Add it": the box stays for this visit (never folded under the person).
  const [opened, setOpened] = useState(false);
  const own = facts ?? slotsOfQuestion(field);
  // With the saved case too (a day given on the step page), as the review and the case page read it: the newest answer wins.
  const file = view?.checkpoint ? caseFileOf(view.checkpoint, recovery?.getSavedMaster() ?? undefined) : null;
  // A box whose own words are a "not sure" is never shown as if they were the answer, whatever its fact: "Damages / loss /
  // impact breakdown = I do not know yet" stands for no fact (item 4, 6 Nov; Chrome check of #543, step 5b).
  // Folded only when the one function says the fact is settled ("I'm not sure" confirmed) and none of the box's facts is known:
  // an unconfirmed "not sure" is still to ask, so its box stays open (caseFile/factStatus.ts stillNeeded).
  const folded = !opened && foldsAsNotAnswered(file, own, value);
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
