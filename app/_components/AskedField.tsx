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
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useIntakeRecovery, useIntakeReviewView, useIntakeState } from "./IntakeRecovery";
import { useCaseField } from "./useCaseField";
import { writeFollow } from "./caseWrite";
import { caseFileOf, changesOf, isUnsureAnswer, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { boxView, type BoxFact } from "../../src/lib/case-system/caseFile/boxView";
import { filledToFollow, formFill, seenNow } from "../../src/lib/case-system/intake/asker";
import { heldAnswer } from "../../src/lib/case-system/caseFile/heldAnswer";
import { CHANGE_LINK } from "../../src/lib/case-system/copy/askCopy";
import { settledNotSure } from "../../src/lib/case-system/caseFile/factStatus";
import { boxesToFollow } from "../../src/lib/case-system/caseFile/boxFollow";
import { formatForCourt } from "../../src/lib/case-system/dates";

const blank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);

/** The case file as the review and the case page read it, for the asker. Null before a checkpoint exists. */
function useCaseFile() {
  const view = useIntakeReviewView();
  const recovery = useIntakeRecovery();
  return view?.checkpoint ? caseFileOf(view.checkpoint, recovery?.getSavedMaster() ?? undefined) : null;
}

/**
 * The story's offer for each box the page is offering right now (the one asker, caseFile/missingFacts.ts), by box: its value
 * and quote (for boxView) and the offer's own Yes / No, that's not right / I'm not sure (node). Once answered it is no longer
 * in the map.
 */
export const OfferedFields = createContext<ReadonlyMap<string, { value: string; quote: string; node: ReactNode }>>(new Map());

/** The box's fact state, for boxView: the story's offer, the answer held anywhere, "not sure", removed, or none yet. */
function boxFact(file: ReturnType<typeof useCaseFile>, field: string, value: unknown, offer: { value: string; quote: string } | undefined): BoxFact {
  const decision = heldAnswer(file, field);
  if (isUnsureAnswer(value)) return { state: "unsure" };
  if (decision?.held === "answered") return { state: "answered", words: slotText(decision.slot, (iso) => formatForCourt(iso)) };
  if (decision?.held === "unsure" || (decision && settledNotSure(file, decision.fact))) return { state: "unsure" };
  if (decision?.held === "removed") return { state: "removed" };
  return offer ? { state: "offer", value: offer.value, quote: offer.quote } : { state: "ask" };
}

/**
 * One box of a form, decided by the one asker (caseFile/boxView.ts boxView: the table of what a box shows in each fact
 * state). The box is always shown, typeable; the story's offer above it while it is empty; a note for "not sure" or removed;
 * Change beside a held answer (it puts the cursor in the box). `field`: the form's key (the asker knows its fact). The
 * answer held elsewhere is put into the empty box by the form's fill (useHeldFill), which reads boxView too.
 */
export function AskedField({ field, value, label, children }: { field: string; value: unknown; label: ReactNode; children: ReactNode }) {
  const file = useCaseFile();
  const offer = useContext(OfferedFields).get(field);
  const wrapper = useRef<HTMLDivElement>(null);
  const view = boxView(boxFact(file, field, value, offer), typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value));
  const fact = heldAnswer(file, field)?.fact;
  void label;
  return (
    <div className="contents" ref={wrapper} data-asked-field={field} data-offered={view.offer ? "true" : undefined}>
      {view.offer && offer ? offer.node : null}
      {view.note ? <p className="text-sm text-[#4d675f]" data-testid="not-answered-yet" data-fact={fact} data-field={field}>{view.note}</p> : null}
      {children}
      {view.change ? <button type="button" data-testid="asked-field-change" data-field={field} onClick={() => wrapper.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea, select")?.focus()} className="mt-1 text-sm font-semibold text-[#2f7d67] underline">{CHANGE_LINK}</button> : null}
    </div>
  );
}

/**
 * The form's boxes follow the newest saved answer, in all three courts (rule 3; boxFollow.ts; Chrome check of #544,
 * step 14). `container`: where the boxes live ("input" for Small Claims and Civil; null for Family, whose boxes are
 * each their own field). Written into the form's copy as a follow, not an answer: no change is recorded, the
 * confirmation is untouched, nothing is sent (put with touched=false), so opening the form writes nothing (rule 6).
 * A box the person is typing in (it has the focus) is left alone.
 */
export function useBoxesFollow(section: string, container: string | null) {
  const recovery = useIntakeRecovery();
  const view = useIntakeReviewView();
  const file = view?.checkpoint ? caseFileOf(view.checkpoint, recovery?.getSavedMaster() ?? undefined) : null;
  const own = view?.checkpoint.sections[section] as Record<string, unknown> | undefined;
  const values = (container ? own?.[container] : own) as Record<string, unknown> | undefined;
  const plan = file && values && typeof values === "object" ? boxesToFollow(file, section, container, values, (iso) => formatForCourt(iso), new Set(), changesOf(view?.checkpoint.sections)) : {};
  const key = JSON.stringify(plan);
  useEffect(() => {
    if (!recovery || key === "{}") return;
    const active = typeof document !== "undefined" ? document.activeElement : null;
    const typed = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active.value : null;
    const now = (container ? recovery.read(section, container) : undefined) as Record<string, unknown> | undefined;
    const next = Object.fromEntries(Object.entries(plan).filter(([field]) => typed === null || String((container ? now?.[field] : recovery.read(section, field)) ?? "") !== typed));
    if (!Object.keys(next).length) return;
    if (container) writeFollow(recovery, section, container, { ...(now ?? {}), ...next });
    else for (const [field, words] of Object.entries(next)) writeFollow(recovery, section, field, words);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when what the boxes must show changes
  }, [key]);
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
  // An empty box's first fill waits until the case holds its words as the fill's (filledWords): put first, the box's
  // words looked like a new answer for a moment, which cancelled a confirmation after a "Change" (Chrome check of #544
  // on 99e2ec0, 7 Nov, F9: the whole form's first opening said "You changed an answer, so please review and confirm
  // again"). A box following a change (`over` holds the fill's earlier words) takes its words at once, as before.
  const firstFills = useRef<Record<string, { words: string; over: string }> | null>(null);
  useEffect(() => {
    const fields = Object.keys(changes);
    if (!fields.length || firstFills.current) return;
    const follows = Object.fromEntries(Object.entries(changes).filter(([, change]) => change.over !== ""));
    const firsts = Object.fromEntries(Object.entries(changes).filter(([, change]) => change.over === ""));
    if (Object.keys(follows).length) apply(follows);
    if (Object.keys(firsts).length) firstFills.current = firsts;
    setFilledWords((current) => ({ ...current, ...Object.fromEntries(fields.map((field) => [field, changes[field].words])) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when what is to be filled changes
  }, [key]);
  useEffect(() => {
    const waiting = firstFills.current;
    if (!waiting || !Object.entries(waiting).every(([field, change]) => filledWords[field] === change.words)) return;
    firstFills.current = null;
    apply(waiting);
    setFilled((current) => [...new Set([...current, ...Object.keys(waiting)])]);
  });
}
