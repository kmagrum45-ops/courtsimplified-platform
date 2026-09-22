"use client";

import { useState } from "react";

import type { UniversalStage } from "./builderTypes";
import { nextStepBlockFor, isPlaceholder } from "@/src/lib/content-library/nextSteps";

/**
 * Suggest-then-confirm for the detected case stage.
 *
 * *** WHY THIS EXISTS ***
 *
 * The stage a case is at determines which next steps a user is shown. That
 * stage is detected by a model from what the user wrote. Under the LSO A2I
 * policy a model may analyse inputs and classify — but the user has to be the
 * one who decides, and they cannot decide something they were never shown.
 *
 * So the detected stage is presented as a suggestion, the user confirms it or
 * picks a different one, and no next-step content renders until they have.
 *
 * *** WHAT THIS COMPONENT NEVER DOES ***
 *
 * It renders no legal or procedural text of its own. The stage labels are
 * plain descriptions of where a case is, and the next steps that follow
 * confirmation come from the reviewed catalogue in
 * `src/lib/content-library/nextSteps.ts`. Nothing the model wrote is displayed.
 */

const STAGE_OPTIONS: { value: UniversalStage; label: string }[] = [
  { value: "starting-case", label: "I have not filed anything yet" },
  { value: "responding", label: "I was served and need to respond" },
  { value: "already-started", label: "The case has started" },
  { value: "conference", label: "A settlement conference is coming up" },
  { value: "motion", label: "I need to bring or answer a motion" },
  { value: "trial", label: "A trial is coming up" },
  { value: "enforcement", label: "I have an order and need it enforced" },
  { value: "urgent", label: "This is urgent" },
  { value: "not-sure", label: "I am not sure" },
];

function labelFor(stage: UniversalStage): string {
  return STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? "I am not sure";
}

export type StageConfirmationProps = {
  /** What the model detected. A suggestion, never applied on its own. */
  suggestedStage: UniversalStage;
  pathway: "small-claims" | "family" | "civil";
  /** Called once the user has confirmed a stage, with the stage they chose. */
  onConfirm: (stage: UniversalStage) => void;
  /** Set once confirmed, so the component can show the settled state. */
  confirmedStage: UniversalStage | null;
};

export default function StageConfirmation({
  suggestedStage,
  pathway,
  onConfirm,
  confirmedStage,
}: StageConfirmationProps) {
  const [choice, setChoice] = useState<UniversalStage>(suggestedStage);
  const [changing, setChanging] = useState(false);

  if (confirmedStage && !changing) {
    return (
      <section
        data-testid="stage-confirmed"
        className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
      >
        <p className="text-sm text-[#4d675f]">
          Stage recorded: <strong className="text-[#10231f]">{labelFor(confirmedStage)}</strong>
        </p>
        <button
          type="button"
          onClick={() => {
            setChoice(confirmedStage);
            setChanging(true);
          }}
          className="mt-2 text-sm font-semibold text-[#2f7d67] underline"
        >
          Change this
        </button>
      </section>
    );
  }

  const block = nextStepBlockFor(pathway, choice);
  const hasContent = Boolean(block && !isPlaceholder(block));

  return (
    <section
      data-testid="stage-confirmation"
      className="rounded-3xl border-2 border-[#2f7d67] bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#10231f]">Where is your case right now?</h3>

      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        From what you have told us, this looks like:{" "}
        <strong className="text-[#10231f]">{labelFor(suggestedStage)}</strong>. Please confirm,
        or choose a different one. We use this to decide which steps to show you.
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#16302b]">Case stage</span>
        <select
          aria-label="Case stage"
          data-testid="stage-select"
          value={choice}
          onChange={(event) => setChoice(event.target.value as UniversalStage)}
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
        >
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {!hasContent && (
        <p className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#7a4b12]">
          We do not have reviewed next steps for that stage yet, so we will not show any.
          You can still use the rest of your case file.
        </p>
      )}

      <button
        type="button"
        data-testid="stage-confirm"
        onClick={() => {
          setChanging(false);
          onConfirm(choice);
        }}
        className="mt-4 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white"
      >
        Confirm this stage
      </button>
    </section>
  );
}
