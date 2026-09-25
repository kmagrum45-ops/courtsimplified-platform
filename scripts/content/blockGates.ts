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
 * Is this block written for the wrong reader?
 *
 * *** THE CHECK NOTHING ELSE CAN MAKE ***
 *
 * An independent review found, in the PUBLISHED library and marked
 * verified-draft, a block on `plaintiff:defence-period-expired-no-defence` — a
 * plaintiff asking "they never responded, what can I do?" — that said:
 *
 *   "You may file a Defence [Form 9A]…"
 *
 * Every existing gate passed it, and none of them was broken. Each sentence
 * was a TRUE statement about a defendant, the verifier found real support, and
 * every quote was in the corpus. Sentence-level verification cannot see that
 * the reader is the wrong person, because no individual sentence is false.
 *
 * *** WHY THIS IS TWO CHECKS AND NOT A LIST OF BANNED PHRASES ***
 *
 * Correcting the first wording produced "The plaintiff may file a request to
 * note YOU in default" — on the plaintiff's own stage, still written for the
 * defendant. Chasing phrasings would never end.
 *
 * So the second check is the general property: a block written for one side
 * does not describe that side in the third person. If a plaintiff's block says
 * "the plaintiff may…", the person it is speaking to is not the plaintiff.
 * ("Plaintiff's Claim" is excluded — that is the name of Form 7A.)
 *
 * *** EXPORTED, BECAUSE IT BELONGS IN THE DRAFTING LOOP TOO ***
 *
 * Running only at promotion meant the pipeline kept producing the same wrong
 * block and only found out afterwards. The drafter can fix this if it is told,
 * so the same function feeds the redraft.
 */
export function wrongReaderProblems(
  text: string,
  side: CaseStage["side"],
  sourceIds: string[],
): string[] {
  if (side !== "plaintiff" && side !== "defendant") return [];

  const problems: string[] = [];

  /** Steps only the OTHER side takes. In this block they address the wrong reader. */
  const OTHER_SIDE_STEP: Record<"plaintiff" | "defendant", RegExp> = {
    plaintiff:
      /\byou\b[^.]{0,30}\b(file|filed|filing|serve|served|prepare|complete)\b[^.]{0,40}\b(defence|form 9a)\b/i,
    defendant:
      /\byou\b[^.]{0,30}\b(file|filed|filing|request)\b[^.]{0,40}\b(request to clerk|form 9b|note the defendant in default)\b/i,
  };

  /*
   * Who served whom. A plaintiff SERVES the claim; a defendant IS SERVED with
   * it. So "since you were served with the claim" on a plaintiff's stage has
   * the parties the wrong way round, even in a block that is otherwise right.
   *
   * This is the third pattern in this class, and the last I will add by
   * wording. The general check below is what carries the weight; these three
   * exist because they are the specific confusions that actually reached
   * published content.
   */
  const SERVICE_DIRECTION: Record<"plaintiff" | "defendant", RegExp> = {
    plaintiff: /\byou (were|have been|was) served\b/i,
    defendant: /\byou (served|have served)\b[^.]{0,30}\b(the claim|them|the defendant)\b/i,
  };

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (SERVICE_DIRECTION[side].test(sentence)) {
      problems.push(
        `this is a ${side}'s block but has service the wrong way round — a plaintiff serves ` +
          `the claim, a defendant is served with it: "${sentence.trim().slice(0, 110)}"`,
      );
      break;
    }
  }

  /** This block's own side, described as somebody else. */
  const OWN_SIDE_THIRD_PERSON: Record<"plaintiff" | "defendant", RegExp> = {
    plaintiff: /\bthe plaintiff\b(?!'s claim)\s+(?:\w+\s+){0,2}(may|can|must|shall|will|has|have|is|are|needs?|files?|filed|serves?|served|obtains?|requests?|asks?)\b/i,
    defendant: /\bthe defendant\b(?!'s claim)\s+(?:\w+\s+){0,2}(may|can|must|shall|will|has|have|is|are|needs?|files?|filed|serves?|served|obtains?|requests?|asks?)\b/i,
  };

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (OTHER_SIDE_STEP[side].test(sentence)) {
      problems.push(
        `this is a ${side}'s block but tells the reader to take the other side's step: ` +
          `"${sentence.trim().slice(0, 120)}"`,
      );
      break;
    }
  }

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (OWN_SIDE_THIRD_PERSON[side].test(sentence)) {
      problems.push(
        `this is a ${side}'s block but describes "the ${side}" as somebody else, so it is ` +
          `written for the other party: "${sentence.trim().slice(0, 120)}"`,
      );
      break;
    }
  }

  /*
   * A block sourced ONLY from the other side's guide is wrong before a word of
   * it is read. This was the mechanical cause: a side-blind source mapping.
   */
  const OTHER_SIDE_GUIDE: Record<"plaintiff" | "defendant", string[]> = {
    plaintiff: ["guide-replying-to-a-claim", "scj-how-to-respond"],
    defendant: ["guide-making-a-claim"],
  };

  if (sourceIds.length > 0 && sourceIds.every((id) => OTHER_SIDE_GUIDE[side].includes(id))) {
    problems.push(
      `a ${side}'s block sourced ONLY from the other side's guide (${sourceIds.join(", ")}) — ` +
        `the content will be written for the wrong reader`,
    );
  }

  return problems;
}

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

  // ---- the block must address the right party ----------------------------

  failures.push(...wrongReaderProblems(answerText(answer), stage.side, answer.sourceIds ?? []));

  // ---- a bar stated without the thing that qualifies it ------------------

  /*
   * *** THE LIMITATION PERIOD IS NOT A FLAT PROPOSITION ***
   *
   * An independent review found a published block rendering Limitations Act
   * s. 4 as:
   *
   *   "A proceeding shall not be commenced in respect of a claim after the
   *    second anniversary of the day on which the claim was discovered."
   *
   * The corpus reads "**Unless this Act provides otherwise,** a proceeding
   * shall not be commenced…". The dropped words are the ones that preserve
   * discovery (s. 5), minors and incapacity (ss. 6-7), and the suspensions.
   *
   * The harm is specific and one-directional: somebody out of time ON THE FACE
   * OF IT, but with a later discovery date or a suspension, reads an
   * unqualified bar in the block whose entire purpose is "am I out of time?"
   * and abandons a live claim. Nobody ever reports that.
   *
   * So: state the two-year bar and you must also carry the qualifier, or
   * discovery, or say the date is not established.
   */
  const statesTheBar =
    /\b(two years|second anniversary)\b/i.test(answerText(answer)) &&
    /\b(shall not be commenced|cannot (start|bring)|too late|barred)\b/i.test(answerText(answer));

  if (statesTheBar) {
    const carriesTheQualifier =
      /unless this act provides otherwise/i.test(answerText(answer)) ||
      /\bdiscover(ed|y)\b/i.test(answerText(answer)) ||
      /\bnot been established\b/i.test(answerText(answer));

    if (!carriesTheQualifier) {
      failures.push(
        "states the two-year limitation bar without the qualifier that limits it " +
          `("Unless this Act provides otherwise"), or discovery, or that the date is not ` +
          `established — a reader with a later discovery date would abandon a live claim`,
      );
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
