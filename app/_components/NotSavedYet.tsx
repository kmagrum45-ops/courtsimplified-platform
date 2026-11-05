"use client";
/**
 * "NOT SAVED YET", PER FACT (case core G2(c); CASE_CORE_DESIGN.md §12, "two tabs").
 *
 * When this tab sent an edit the server refused as made against an older view (another tab or device saved that
 * fact since), the edit is kept in this tab, not applied, and shown here with the newer saved answer beside it
 * (pendingFacts.ts afterSend, "held"). "Save mine" sends it as the newest save; "Keep the saved one" drops it. The
 * screens show the saved answer until the person chooses (caseFile.ts applyPendingOverRecords). Nothing is decided
 * for the person (CLAUDE.md s. 4). States no law.
 */
import { useSyncExternalStore } from "react";
import { useIntakeRecovery } from "./IntakeRecovery";
import { FACT_LABEL } from "./ChangeAnswer";
import { CASE_FILE_SECTION, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { notSavedYet } from "../../src/lib/case-system/caseFile/pendingFacts";
import { choosePending } from "./caseWrite";
import { answerWords } from "../../src/lib/case-system/caseFile/unsureAnswer";
import { inWords } from "../../src/lib/case-system/copy/rawKeys";

/** An answer in words through the shared readers (a list by its labels, typed "I do not know yet" never as the answer), a removal said as such. */
function words(state: string, value: unknown): string {
  if (state === "removed") return "removed";
  if (state === "unsure") return "not sure";
  if (Array.isArray(value)) return inWords(value.map(String));
  if (typeof value === "string") return answerWords(value) || "not sure";
  return value === undefined || value === null ? "" : String(value);
}

export default function NotSavedYet() {
  const recovery = useIntakeRecovery();
  const changes = useSyncExternalStore(
    (listener) => recovery?.subscribe(listener) ?? (() => {}),
    () => recovery?.read(CASE_FILE_SECTION, "changes"),
    () => undefined,
  );
  if (!recovery?.ownerId) return null;
  const waiting = notSavedYet(changes);
  if (!waiting.length) return null;
  const choose = (fact: SlotFact, keepMine: boolean) => {
    choosePending(recovery, fact, keepMine);
  };
  return (
    <div className="mx-auto max-w-6xl px-6 py-2 text-sm" role="alert" data-testid="not-saved-yet">
      {waiting.map(({ fact, mine, saved }) => (
        <p key={fact} className="py-1" data-testid={`not-saved-yet-${fact}`}>
          <strong>Not saved yet: {FACT_LABEL[fact] ?? fact}.</strong> You entered “{words(mine.state, mine.state === "answered" ? mine.value : undefined)}” here, but
          a newer answer was saved from another tab or device: “{words(saved.state, saved.value)}”.{" "}
          <button type="button" className="underline" data-testid={`not-saved-yet-save-${fact}`} onClick={() => choose(fact, true)}>Save mine</button>{" · "}
          <button type="button" className="underline" data-testid={`not-saved-yet-discard-${fact}`} onClick={() => choose(fact, false)}>Keep the saved one</button>
        </p>
      ))}
    </div>
  );
}
