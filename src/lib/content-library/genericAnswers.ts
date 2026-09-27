/**
 * Verified content that is NOT tied to a stage.
 *
 * *** WHY THIS TYPE HAD TO EXIST ***
 *
 * All 16 published blocks are `StageAnswer`s, and a StageAnswer is welded to the
 * stage map on purpose: `stageId` must resolve to a real stage, `userQuestion` is
 * copied from it "so the block and the taxonomy cannot drift", and `gateFailures`
 * refuses outright with "answers stage X, which is not in the stage map". That
 * welding is right, and it is why the 37 stages cannot drift from their content.
 *
 * Some obligations are not a stage. Service of documents recurs — before a
 * settlement conference, before trial, whenever a party adds a document — so a
 * reader looking at their exhibit book needs it whatever position their case is in.
 * There is no stage to hang it on.
 *
 * Three ways to do this, and two are wrong:
 *
 *   1. Invent a pseudo-stage. It would pollute a taxonomy of case POSITIONS with
 *      something that is not a position, and every stage-resolution path would have
 *      to learn to skip it.
 *   2. Hand-write the prose outside the pipeline. That is exactly what §2 forbids.
 *   3. A separate type that goes through the SAME drafter, the SAME verifier and
 *      the SAME corpus quote gate, with the stage-specific gates replaced by
 *      equivalents rather than dropped.
 *
 * This is 3. The important part is the last clause: a second content path is a
 * second chance to be weaker, so `genericGateFailures` calls the same
 * `sharedGateFailures` that `gateFailures` does, and adds a gate the stage blocks do
 * not need — that the text assumes neither party's side.
 *
 * *** WHY PARTY-NEUTRALITY IS A GATE AND NOT A STYLE NOTE ***
 *
 * `wrongReaderProblems` protects a stage block by knowing whose stage it is. A
 * generic block has no side, so that protection returns nothing — and a block shown
 * to everybody that tells the reader to file a defence is worse than a defendant's
 * block that does, because the plaintiff reading it has no way to know it was not
 * meant for them. So the absent gate is replaced, not skipped.
 */

import type { RuleCitation } from "../case-system/stage-map/citations";
import type { VerificationRecord, Slot } from "./stageAnswers";
import type { ReadabilityException } from "./readabilityExceptions";

/** Where a generic block is shown. Not a stage — a screen and a topic. */
export type GenericTopicId = "serving-documents";

export type GenericAnswer = {
  id: string;
  topicId: GenericTopicId;
  /**
   * The question this answers, authored here rather than copied from a stage.
   *
   * A StageAnswer copies it from the stage map so the two cannot drift. There is no
   * stage to copy from, so it lives in GENERIC_TOPICS below and the block is checked
   * against that — same anti-drift property, different single source.
   */
  userQuestion: string;

  whatsHappening: string;
  whatToDoNext: string;
  /**
   * Always null.
   *
   * *** WHY A BLOCK ABOUT DEADLINES CARRIES NO DEADLINE SECTION ***
   *
   * The deadline section is rendered by CODE from a stage's authored
   * `StageDeadline[]`, and `gateFailures` requires the published text to be
   * byte-identical to what `renderDeadlineSection` produces. There is no stage, so
   * there are no authored StageDeadlines, so there is nothing for that renderer to
   * produce — and a hand-written deadline section here would be the one thing
   * ACCURACY_ENGINE decision 4 removed from the model's hands.
   *
   * The 14-day and 30-day periods still appear, inside the ordinary sections, as
   * statements the verifier checked against quoted rule text like any other. What
   * does not happen is a computed date: computing one needs an event date this block
   * cannot know, because it is not tied to a stage that asks for one.
   */
  yourDeadline: null;
  whatHappensAfter: string;

  slots: Slot[];
  citations: RuleCitation[];
  sourceIds: string[];
  verification: VerificationRecord;
  /**
   * Set only where the block met the reading-level target because of a term of art.
   *
   * *** WHY THIS IS IN THE PUBLISHED ARTEFACT AND NOT ONLY IN A LOG ***
   *
   * An exception that lives in a run log is an exception nobody sees again. Recorded
   * here it travels with the block: it appears in the review packet, a reviewer can
   * disagree with it, and `test:generic-library` re-derives it from the block's own
   * text and fails if the stored grant no longer matches what the mechanism would
   * grant today.
   *
   * Absent (or null) for a block that simply met the target, which must stay the
   * ordinary case.
   */
  readabilityException?: ReadabilityException | null;
  /**
   * The model that drafted and verified this block.
   *
   * Recorded per block, not only on the release. Promotion happens in a separate
   * invocation from drafting, so the promoting process has no idea which model produced
   * the candidate -- and it duly wrote "gpt-4o-mini" into the release for a block
   * drafted with gpt-4o, because that is what its own env defaulted to. A published
   * artefact that misstates how its content was produced is worse than one that says
   * nothing.
   */
  draftedWith?: string;
};

export type GenericTopic = {
  id: GenericTopicId;
  /** For the drafter's prompt, in place of a stage title. */
  title: string;
  userQuestion: string;
  /** In place of a stage's `description`. States no law. */
  context: string;
  /**
   * The provisions the block may rest on, authored by hand with every quote taken
   * from the vendored corpus and checked to be findable there — the same discipline
   * as `StageMap.rules`.
   */
  rules: RuleCitation[];
  /**
   * Official guide pages the drafter may also use, passed whole.
   *
   * *** WHY THESE ARE HERE AFTER I ARGUED THEY SHOULD NOT BE ***
   *
   * The first version of this passed pinpoint-quoted legislation and nothing else,
   * reasoning that a guide page describes a particular point in a case and a sentence
   * lifted from one would carry that point's assumptions into a block with no stage
   * to qualify them.
   *
   * The pipeline then failed the block four times out of four, and the reason was
   * mine. The regulation says "shall". Grade 8 prose says "must" — and drafter rule
   * 4a instructs exactly that: "keep the word 'must' where the source says shall".
   * With only the regulation available, the verifier had no text saying "must" to
   * quote, and rejected every obligation sentence with "the source ... does not use
   * the word 'must'". The 16 stage blocks never hit this because `sourceMaterial`
   * hands them official guide pages, which do say "must".
   *
   * So the objection was right about guides in general and wrong here. A guide about
   * SERVING DOCUMENTS is not about a point in a case; service recurs throughout, which
   * is the same reason this block is stage-independent in the first place. The
   * narrowness was not protecting anything — it was making a faithful grade-8
   * rendering of a statutory duty unverifiable.
   *
   * The guard that remains is the drafter's own instruction, which the stage pipeline
   * also relies on: a guide "is not legislation, so do not state a rule from it".
   */
  practicalSourceIds: string[];
};

/**
 * *** EVERY QUOTE BELOW WAS READ OUT OF THE VENDORED REGULATION, NOT RECALLED ***
 *
 * Source: `docs/sources/corpus/oreg-258-98-small-claims-rules.txt`, read
 * 2026-09-27. Rule numbers confirmed against the regulation's own table of contents
 * in the same file: RULE 13 SETTLEMENT CONFERENCES carries 13.03 PURPOSES OF
 * SETTLEMENT CONFERENCE, and RULE 18 EVIDENCE AT TRIAL carries 18.02 WRITTEN
 * STATEMENTS, DOCUMENTS AND RECORDS. Each quote was then run through `findQuote`
 * and located in that file.
 *
 * *** THE CORRECTION THAT MATTERS: r. 18.02 (1) IS NOT A SERVICE REQUIREMENT ***
 *
 * It is tempting, and wrong, to describe r. 18.02 as "document-service requirements
 * before trial". The rule imposes no obligation to serve anything. It says that a
 * document served at least 30 days before the trial date SHALL BE RECEIVED IN
 * EVIDENCE unless the trial judge orders otherwise — an admissibility route a party
 * may take, not a duty.
 *
 * Writing it as a requirement would be inventing an obligation the source does not
 * state, which is the precise failure the verifier exists to catch. It is recorded
 * here so the distinction is not lost the next time somebody edits this file.
 *
 * r. 13.03 (2), by contrast, IS mandatory: "each party shall serve ... and file".
 * And r. 18.02 (3) is mandatory once a party chooses to serve under 18.02 — "shall
 * append to or include in". Three provisions, two different kinds of obligation, and
 * the block has to keep them apart.
 */
export const GENERIC_TOPICS: readonly GenericTopic[] = [
  {
    id: "serving-documents",
    title: "Serving your documents",
    userQuestion:
      "When do I have to give my documents to the other side and to the court?",
    context:
      "The reader is putting their documents in order in their case workspace. " +
      "Giving documents to the other parties and to the court happens more than once " +
      "in a case, so this is shown whatever position their case is in. This states " +
      "no law.",
    /*
     * ontario.ca, "Guide to Procedures in Small Claims Court: Serving documents",
     * vendored as guide-serving-documents.txt, retrieved 2026-09-27 per
     * docs/sources/corpus/manifest.json. An official court guide whose whole subject
     * is service, so it is not scoped to one point in a case.
     */
    practicalSourceIds: ["guide-serving-documents"],
    rules: [
      {
        sourceId: "oreg-258-98-small-claims-rules",
        pinpoint: "r. 13.03 (2)",
        quote:
          "At least 14 days before the date of the settlement conference, each party shall serve on every other party and file with the court,",
      },
      {
        sourceId: "oreg-258-98-small-claims-rules",
        pinpoint: "r. 13.03 (2) (a)",
        quote:
          "a copy of any document to be relied on at the trial, including an expert report, not attached to the party's claim or defence",
      },
      {
        sourceId: "oreg-258-98-small-claims-rules",
        pinpoint: "r. 13.03 (2) (b)",
        quote:
          "a list of proposed witnesses (Form 13A) and of other persons with knowledge of the matters in dispute in the action",
      },
      {
        sourceId: "oreg-258-98-small-claims-rules",
        pinpoint: "r. 18.02 (1)",
        quote:
          "A document or written statement or an audio or visual record that has been served, at least 30 days before the trial date, on all parties who were served with the notice of trial, shall be received in evidence, unless the trial judge orders otherwise.",
      },
      {
        sourceId: "oreg-258-98-small-claims-rules",
        pinpoint: "r. 18.02 (3)",
        quote:
          "A party who serves on another party a written statement or document described in subrule (2) shall append to or include in the statement or document,",
      },
      {
        sourceId: "oreg-258-98-small-claims-rules",
        pinpoint: "r. 18.02 (4)",
        quote:
          "A party who has been served with a written statement or document described in subrule (2) and wishes to cross-examine the witness or author may summon him or her as a witness under subrule 18.03 (1).",
      },
    ],
  },
];

export function genericTopicById(id: string): GenericTopic | undefined {
  return GENERIC_TOPICS.find((topic) => topic.id === id);
}
