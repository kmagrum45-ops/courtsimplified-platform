/**
 * The gates a block must pass to be published — in ONE place.
 *
 * *** WHY THIS IS SHARED RATHER THAN WRITTEN TWICE ***
 *
 * Two things need to apply these checks: the promotion script, which decides
 * whether a run may become the published set, and the verification suite,
 * which decides whether the published set is still good. If those two had
 * their own copies they would drift, and the drift would be silent in the
 * worst direction — promotion permitting something the suite would reject, or
 * the suite passing content promotion would have refused.
 *
 * So there is one function. Promotion refuses a block it returns failures for;
 * the suite fails on the same. A gate added here is added to both at once.
 *
 * *** WHY IT RE-CHECKS THINGS THE PIPELINE ALREADY CHECKED ***
 *
 * The pipeline checked them against the corpus as it stood during that run.
 * These run against the corpus as it stands NOW. A re-vendoring that moves
 * rule text must invalidate content verified against the old text, and the
 * only way to know is to look again rather than to trust a stored verdict.
 */

import { findQuote, predictsOutcome } from "./verifiedContentPipeline";
import type { CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import {
  answerText,
  NO_SOURCE_NOTICE,
  renderDeadlineSection,
  type StageAnswer,
} from "../../src/lib/content-library/stageAnswers";
import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";

/** Statuses a user may be shown. `needs-human` and `draft` are never published. */
export const PUBLISHABLE = ["verified-draft", "no-source", "approved"] as const;

export function isPublishable(answer: StageAnswer): boolean {
  return (PUBLISHABLE as readonly string[]).includes(answer.verification.status);
}

/*
 * American spellings. "defense" is the one that is not cosmetic: the document
 * a defendant files is a DEFENCE (Form 9A), so the American spelling sends a
 * person looking for a form that appears on no Ontario court page.
 */
const US_SPELLINGS =
  /\b(defense|favor|favors|favored|honor|honors|labor|center|centers|judgement)\b/gi;

/**
 * Everything wrong with this block, as plain sentences. Empty means publishable.
 *
 * `stage` is the stage map entry it answers. Passing it in rather than looking
 * it up keeps this a pure function, which is what lets the suite run it against
 * a synthetic block that is wrong on purpose.
 */
export function gateFailures(answer: StageAnswer, stage: CaseStage | undefined): string[] {
  const failures: string[] = [];

  if (!stage) {
    return [`answers stage "${answer.stageId}", which is not in the stage map`];
  }

  if (!isPublishable(answer)) {
    failures.push(`status is "${answer.verification.status}", which is never shown to a user`);
  }

  if (answer.verification.status === ("approved" as string)) {
    failures.push("claims `approved`, which only a licensee may set — never the pipeline");
  }

  // ---- every section present, none abandoned -----------------------------

  if (!answer.whatsHappening || !answer.whatToDoNext || !answer.whatHappensAfter) {
    failures.push("a section is empty, so the block answers only part of the question");
  }

  if (answerText(answer).includes("NOT_SUPPORTED")) {
    failures.push("contains NOT_SUPPORTED, which is the drafter giving up and must never ship");
  }

  // ---- the deadline matches the stage map, exactly ------------------------

  /*
   * Not "has a deadline section" — the RIGHT one. The deadline is rendered by
   * code from the stage map, so the published text must be byte-identical to
   * what that renderer produces today. Anything else means the block was
   * hand-edited, or the stage map moved after promotion.
   */
  const expected = renderDeadlineSection(stage.deadlines);
  if ((answer.yourDeadline ?? null) !== (expected ?? null)) {
    failures.push(
      expected
        ? "the deadline section does not match what the stage map renders — the block was " +
          "edited after promotion, or the stage map changed and this content was not re-promoted"
        : "states a deadline the stage map does not have",
    );
  }

  // ---- provenance --------------------------------------------------------

  if (answer.citations.length === 0 && (answer.sourceIds ?? []).length === 0) {
    failures.push("no provenance: neither a cited rule nor a source support was found in");
  }

  // ---- every quote still in the corpus, checked NOW ----------------------

  for (const verdict of answer.verification.verdicts) {
    if (!verdict.supported || !verdict.quote || verdict.sourceId === "stage-premise") continue;
    for (const quote of verdict.quote.split(" | ")) {
      if (quote.trim().length < 25) continue;
      if (findQuote(quote) === null) {
        failures.push(
          `rests on a passage that is not in the vendored corpus: "${quote.slice(0, 90)}"`,
        );
      }
    }
  }

  if (answer.verification.status === "verified-draft") {
    const unsupported = answer.verification.verdicts.filter((verdict) => !verdict.supported);
    if (unsupported.length > 0) {
      failures.push(`${unsupported.length} sentence(s) are unsupported in a verified block`);
    }
    if (answer.verification.verdicts.length === 0) {
      failures.push("verified-draft with no verdicts at all — nothing was actually checked");
    }
  }

  // ---- a no-source block says so, and only where it is true --------------

  if (answer.verification.status === "no-source") {
    const empty = new Set(answer.verification.sectionsWithoutSource);
    if (empty.size === 0) {
      failures.push("marked no-source but no section is recorded as empty");
    }
    if (!answerText(answer).includes(NO_SOURCE_NOTICE)) {
      failures.push("marked no-source but does not carry the notice, so it reads as guidance");
    }
    for (const name of ["whatToDoNext", "whatHappensAfter"] as const) {
      const section = answer[name];
      if (!section?.includes(NO_SOURCE_NOTICE)) continue;
      if (!empty.has(name) || section.trim() !== NO_SOURCE_NOTICE) {
        failures.push(
          `the no-source notice sits in "${name}" alongside real guidance, so the block ` +
            `says it cannot help immediately after helping`,
        );
      }
    }
  }

  // ---- how it reads ------------------------------------------------------

  const text = answerText(answer);

  const prediction = predictsOutcome(text);
  if (prediction) {
    failures.push(
      `predicts an outcome ("${prediction}") — refused even when a source says it (CLAUDE.md §3)`,
    );
  }

  const spellings = Array.from(new Set(Array.from(text.matchAll(US_SPELLINGS), (m) => m[0])));
  if (spellings.length > 0) {
    failures.push(`American spelling: ${spellings.join(", ")}`);
  }

  const grade = readability(text).grade;
  if (Number(grade.toFixed(1)) > TARGET_GRADE) {
    failures.push(`reads at grade ${grade.toFixed(1)}, above the grade ${TARGET_GRADE} target`);
  }

  return failures;
}
