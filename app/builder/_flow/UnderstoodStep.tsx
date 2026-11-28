"use client";

/**
 * THE UNDERSTOOD STEP (site owner, 26 Nov 2026): what the story says, offered ONCE. Each line is a fact the record holds
 * as stated in the story (missingFacts "reading"), with the story's own words. "Yes, all of this is right" makes each
 * the person's answer; each line also has the one offer control (Yes / No, that's not right / I'm not sure). After that no
 * screen asks it again (the Questions page asks only what is missing; a value said not right is asked there, once).
 * Layout only: what to show comes from the record, what is saved goes through the one writer (caseWrite.ts writeAnswer).
 */
import { useState } from "react";
import { StepFrame } from "./StepFrame";
import { useFlowRecord } from "./useFlowRecord";
import { UseSuggestion } from "../../_components/UseSuggestion";
import { WorkingButton } from "../../_components/Working";
import { writeAnswer } from "../../_components/caseWrite";
import { FLOW_QUESTIONS, missingFacts } from "../../../src/lib/case-system/caseFile/missingFacts";
import { understoodOfferKey, type StatedFact } from "../../../src/lib/case-system/flow/storyStated";
import { CLAIM_TYPES } from "../../../src/lib/case-system/intake/claimTypes";
import { formatForCourt, isRealIsoDate } from "../../../src/lib/case-system/dates";
import { FLOW_CONTINUE, FLOW_STEP_HEADINGS, UNDERSTOOD_EXTRA_LABELS, UNDERSTOOD_INTRO, UNDERSTOOD_NOTHING, UNDERSTOOD_YES_ALL } from "../../../src/lib/case-system/copy/flowCopy";
import { FROM_YOUR_STORY } from "../../../src/lib/case-system/caseFile/storyOffers";
import { FACT_LABEL } from "../../_components/ChangeAnswer";

/** The question whose answer box keeps each fact (the Questions page's own list): one place, never a second key. */
// A fact no question on that page asks (what was agreed, what was paid, what was tried to settle it) is kept under its own id,
// which the case file reads as that fact (factsOfQuestion.ts: an id it does not map is its own fact).
const questionOf = (fact: StatedFact) => FLOW_QUESTIONS.find((item) => item.fact === fact)?.question ?? fact;
const labelOf = (fact: StatedFact) => (fact in UNDERSTOOD_EXTRA_LABELS ? UNDERSTOOD_EXTRA_LABELS[fact as keyof typeof UNDERSTOOD_EXTRA_LABELS] : FACT_LABEL[fact as Exclude<StatedFact, keyof typeof UNDERSTOOD_EXTRA_LABELS>]);
/** A fact's value as the person reads it: the kind of claim by its name, everything else as the story gave it. */
const shown = (fact: string, value: string) => (fact === "claimKind" ? CLAIM_TYPES.find((type) => type.id === value)?.name ?? value : isRealIsoDate(value) ? formatForCourt(value) : value);

export function UnderstoodStep({ onDone }: { onDone: () => void }) {
  const { record, recovery } = useFlowRecord();
  const [saving, setSaving] = useState(false);
  const offers = missingFacts(record, "reading");
  const accept = (items: typeof offers) => {
    if (!recovery || !items.length) return;
    const before = recovery.read("builder", "initialAnswers");
    const answers = { ...(before && typeof before === "object" ? (before as Record<string, string>) : {}) };
    for (const item of items) { const question = questionOf(item.field as StatedFact); if (question && item.value) answers[question] = item.value; }
    writeAnswer(recovery, "builder", "initialAnswers", answers);
  };
  return (
    <StepFrame step="reading" heading={FLOW_STEP_HEADINGS.reading}>
      <p className="text-sm leading-6 text-[#24463d]">{offers.length ? UNDERSTOOD_INTRO : UNDERSTOOD_NOTHING}</p>
      <ul className="space-y-3" data-testid="understood-lines">
        {offers.map((item) => (
          <li key={item.field} data-testid="understood-line" data-fact={item.field} className="rounded-2xl border border-[#d8e6df] bg-white p-4">
            <UseSuggestion
              offer={{ key: understoodOfferKey(item.field as StatedFact), fact: item.facts[0] ?? null }}
              ask={<span className="text-xs font-semibold uppercase tracking-wide text-[#4d675f]">{labelOf(item.field as StatedFact)}</span>}
              what={shown(item.field, item.value ?? "")}
              note={item.quote ? <>{FROM_YOUR_STORY} “{item.quote}”</> : null}
              testId={`understood-yes-${item.field}`}
              onUse={() => accept([item])}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        {/* Every line decided before going on: an open line would be neither confirmed nor asked (the Questions page asks only
            what is missing). "Yes, all" decides the open lines; Continue shows once none is left. */}
        {offers.length > 0 ? (
          <WorkingButton type="button" data-testid="understood-yes-all" working={saving} workingLabel={FLOW_CONTINUE} onClick={() => { setSaving(true); accept(offers); setSaving(false); onDone(); }} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">
            {UNDERSTOOD_YES_ALL}
          </WorkingButton>
        ) : null}
        {offers.length === 0 ? (
          <button type="button" data-testid="understood-continue" onClick={onDone} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">
            {FLOW_CONTINUE}
          </button>
        ) : null}
      </div>
    </StepFrame>
  );
}
