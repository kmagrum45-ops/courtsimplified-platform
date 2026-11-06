"use client";

/**
 * THE SMALL CLAIMS FORM'S BOXES, THROUGH THE ONE ASKER (founder's plan step 5, 1 Nov; intake/asker.ts).
 *
 * A box on the Small Claims form asks for a fact. Before it is shown, the asker reads the case file
 * (caseFileOf, with the saved case: newest wins):
 *   - held "not sure": the box is folded into the quiet line "Not answered yet: add it when you know"
 *     with "Add it", which opens the box again (never asked again; site owner, 31 Oct);
 *   - held answered: the box shows the person's answer -- useHeldFill puts it into an empty box once
 *     (never over what they typed; never again once they cleared it, which item C's save path records
 *     as a removal);
 *   - not held, removed, or only guessed from the story: the box, empty, as it is.
 * A story guess is never held: it is offered under "Found in your description", never typed in.
 * Restates the person's own answers; states no law; changes no wording of a box.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIntakeRecovery, useIntakeReviewView, useIntakeState } from "./IntakeRecovery";
import { useCaseField } from "./useCaseField";
import { caseFileOf, isUnsureAnswer } from "../../src/lib/case-system/caseFile/caseFile";
import { askOf, filledToFollow, formFill, seenNow } from "../../src/lib/case-system/intake/asker";
import { ADD_IT_LATER, NOT_ANSWERED_YET } from "../../src/lib/case-system/copy/askCopy";

const blank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);

/** The case file as the review and the case page read it, for the asker. Null before a checkpoint exists. */
function useCaseFile() {
  const view = useIntakeReviewView();
  const recovery = useIntakeRecovery();
  return view?.checkpoint ? caseFileOf(view.checkpoint, recovery?.getSavedMaster() ?? undefined) : null;
}

/** One box of the Small Claims form, decided by the asker. `field`: the form's key (the asker knows its fact). */
export function AskedField({ field, value, label, children }: { field: string; value: unknown; label: ReactNode; children: ReactNode }) {
  const file = useCaseFile();
  // Typing in the box, or "Add it": the box stays for this visit (never folded under the person).
  const [opened, setOpened] = useState(false);
  const decision = askOf(file, field);
  const folded = !opened && !decision.ask && decision.held === "unsure" && (blank(value) || isUnsureAnswer(value));
  if (folded) {
    return (
      <div className="block" data-testid="not-answered-yet" data-fact={decision.fact} data-field={field}>
        <span className="font-semibold text-[#16302b]">{label}</span>
        <p className="mt-2 text-sm text-[#4d675f]">{NOT_ANSWERED_YET}. <button type="button" data-testid="not-answered-yet-add" onClick={() => setOpened(true)} className="font-semibold text-[#2f7d67] underline">{ADD_IT_LATER}</button></p>
      </div>
    );
  }
  return <div className="contents" data-asked-field={field} onFocusCapture={() => setOpened(true)}>{children}</div>;
}

/**
 * Puts the person's held answers into the form's empty boxes, once per box per case (asker.ts formFill), and keeps a
 * box it filled on the person's newest answer while the box still holds the fill's words (asker.ts filledToFollow;
 * Chrome check of #542, B3: the box kept "$2,650.00" after the amount was changed to $2,400). The boxes filled
 * ("small-claims".filledFromCaseFile) and the words put in each ("small-claims".filledWords) are kept in the saved
 * case, so a box the person cleared is never filled again, in any tab or after a reload, and a box they typed in
 * is never changed. `apply` gets, per box, the words and the words the box must still hold (`over`) to take them.
 */
export function useHeldFill(values: Record<string, unknown>, apply: (fill: Record<string, { words: string; over: string }>) => void) {
  // The case file never counts a box's words the fill put there as an answer (caseFile.ts, "small-claims".filledWords).
  const file = useCaseFile();
  const [filled, setFilled] = useIntakeState<string[]>("small-claims", "filledFromCaseFile", []);
  const [filledWords, setFilledWords] = useCaseField<Record<string, string>>("small-claims", "filledWords", {});
  // The boxes that held words during this visit (asker.ts seenNow), updated as each render's values arrive: a
  // box the person clears to type a new value is never filled under their keys ("$6,400.00$7,250", local carry
  // runs 41393577468 / 41393585578).
  const seen = useRef<string[]>([]);
  seen.current = seenNow(values, seen.current);
  const fill = formFill(file, values, [...filled, ...seen.current]);
  const follow = filledToFollow(file, values, filledWords);
  const changes: Record<string, { words: string; over: string }> = {
    ...Object.fromEntries(Object.entries(fill).map(([field, words]) => [field, { words, over: "" }])),
    ...Object.fromEntries(Object.entries(follow).map(([field, words]) => [field, { words, over: filledWords[field] }])),
  };
  const key = JSON.stringify(changes);
  // A box seen with words and now empty: the person emptied it. Kept in the saved case, so it is not refilled after a reload either.
  const emptied = seen.current.filter((field) => !filled.includes(field) && blank(values[field])).join(",");
  useEffect(() => {
    if (emptied) setFilled((current) => [...new Set([...current, ...emptied.split(",")])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when a box is emptied
  }, [emptied]);
  useEffect(() => {
    const fields = Object.keys(changes);
    if (!fields.length) return;
    apply(changes);
    if (Object.keys(fill).length) setFilled((current) => [...new Set([...current, ...Object.keys(fill)])]);
    setFilledWords((current) => ({ ...current, ...Object.fromEntries(fields.map((field) => [field, changes[field].words])) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when what is to be filled changes
  }, [key]);
}
