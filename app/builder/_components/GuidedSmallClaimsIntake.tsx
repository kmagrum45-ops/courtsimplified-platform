"use client";

import { dateAnswerCheck } from "../../../src/lib/case-system/dates";
import { isDateQuestionId } from "../../../src/lib/case-system/casePosition";
import { intakeGuidanceHeaders, useIntakeReviewView, useIntakeState, useStory, useIntakeRecovery, useBeforeIntakeAI, useValidateIntakeResponse, useSituation } from "../../_components/IntakeRecovery";
import { useStoryAnswersOutdated } from "../../_components/StoryChangedNotice";
import { inputRevision, reviewPhase } from "../../../src/lib/case-system/intakeReview";
import { markReviewNeeded } from "../../_components/reviewNeeded";

import { IntakeRequest } from "../../_components/intakeRequest";

/**
 * Guided Small Claims intake -- one question at a time, answered through a
 * chat-style conversation, powered by /api/intake/guided-turn (the real
 * QUESTION_BANK, no devPreview flag). This is a separate, lighter-weight
 * path from SmallClaimsIntake.tsx's structured form: it collects facts
 * conversationally and does not produce an AnalysisResult, so it does not
 * feed into the builder's case-save/analysis pipeline the form path uses.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConfirmedStoryAnswer,
  StoryAnswerProposal,
} from "@/src/lib/case-system/intake/storyAnswerProposals";

import { supabase } from "../../../src/lib/supabase/client";
import { KNOWN_FACT_FIELDS, QUESTION_BANK } from "@/src/lib/case-system/intake/questionBank";
import { factsOfQuestion } from "@/src/lib/case-system/caseFile/factsOfQuestion";
import LegalAdviceDeflection from "../../_components/LegalAdviceDeflection";
import { publicSourceUrl } from "../../../src/lib/content-library/publicSourceUrl";
import { cardLabel, confirmedDrafts, sameDayAs, respondingFromAnswers } from "./proposalCard";
import { unansweredQuestionStart } from "./heldQuestion";
import { SourcedQuestionsCard, sourcedAnswerListText, useSourcedQuestions, type SourcedAnswer } from "./SourcedQuestions";
import MunicipalNoticeFirst from "./MunicipalNoticeFirst";
import { startSignIn } from "../../_components/startSignIn";
import ReviewNeededNotice from "../../_components/ReviewNeededNotice";
import { municipalNoticeFirst } from "@/src/lib/content-library/municipalNoticeFirst";
import { storyQuoteFor } from "@/src/lib/case-system/intake/claimKind";
import { alreadyAsked, askedAndReplied, caseFileOf } from "@/src/lib/case-system/caseFile/caseFile";
import { CLAIM_TYPES } from "@/src/lib/case-system/intake/claimTypes";
import { WorkingButton, WorkingNote } from "@/app/_components/Working";
import StoryGuidance from "@/app/_components/StoryGuidance";
import { STORY_LABEL } from "@/src/lib/case-system/copy/storyGuidance";

type IntakeFacts = Record<string, string | number | boolean>;

type VoiceTurn = {
  leadIn: string | null;
  questionText: string;
  fellBackToPlainText: boolean;
};

type IntakeQuestion = {
  id: string;
  text: string;
  /** Shown to the user alongside the question. States a legal fact only if sourceUrl is also set. */
  why?: string;
  /** Set whenever `why` states a legal/procedural fact. */
  sourceUrl?: string;
  /** Why the site asks, in plain words that state no law (questionBank.ts). Shown when `why` is absent. */
  whyAsked?: string;
  /** Reviewed example answers from the question bank, shown under the question. */
  examples?: string[];
};

type EvidenceCategory = {
  name: string;
  why: string;
  examples: string[];
};

type EvidenceGuidance = {
  claimTypeId: string;
  claimTypeName: string;
  /** One list. See evidenceGapDetector.ts on why there is no "addressed" subset. */
  categories: EvidenceCategory[];
};

/**
 * 2026-10-16 live bug: the results page labelled this "Kind of claim you
 * confirmed" for every matched claim type, including the exact-phrase path
 * below, which the person is never shown and never asked about -- no card,
 * no message, nothing naming the claim type until the results page itself.
 * `userConfirmed` records which path actually happened: true only when the
 * person clicked "that's right" on the suggestion card (resolveSuggestion
 * below), false for a silent exact-phrase match. The overview panel reads
 * it to word the label honestly instead of overstating what occurred.
 */
/** `quote`: the story's own words that show the kind (claimKind.ts); every kind shown carries them. */
type MatchedClaimType = { claimTypeId: string; claimTypeName: string; userConfirmed?: boolean; quote?: string };

type GuidanceCitation = {
  sourceName: string;
  officialUrl: string;
  pinpoint?: string;
};

type EducationTopicGuidance = {
  id: string;
  title: string;
  plainExplanation: string;
  citations: GuidanceCitation[];
};

type RemedyGuidance = {
  id: string;
  title: string;
  plainExplanation: string;
  citations: GuidanceCitation[];
};

type ClaimGuidance = {
  claimTypeId: string;
  claimTypeName: string;
  educationTopics: EducationTopicGuidance[];
  remedies: RemedyGuidance[];
};

type GuidedTurnResult = {
  halted: boolean;
  /** 2026-09-28. The user asked for legal advice in text sent this turn. */
  requestsLegalAdvice?: boolean;
  haltMessage?: string;
  distressAcknowledgment?: string;
  facts: IntakeFacts;
  answeredIds: string[];
  nextQuestion?: IntakeQuestion;
  voiceTurn?: VoiceTurn;
  /** Turn-scoped, same as evidenceGuidance -- see matchedClaimType state below. */
  matchedClaimTypes: { claimType: { id: string; name: string } }[];
  /**
   * Session 37. Set only when the exact-match matcher found nothing this
   * turn AND the AI fallback found a candidate -- a SUGGESTION, not a
   * confirmed match. Must go through the confirm/reject UI below before
   * it becomes `matchedClaimType`; see pendingSuggestion state.
   */
  suggestedClaimType?: MatchedClaimType;
  /**
   * Session 23. Turn-scoped on the server (see orchestrateIntakeTurn.ts) --
   * only present on the turn where a claim type was freshly matched, most
   * often the opening story. Retained in this component's own state (see
   * evidenceGuidance below) so it doesn't flicker away on a later turn
   * whose text doesn't happen to re-match a claim type.
   */
  evidenceGuidance?: EvidenceGuidance;
  /**
   * Session 32. Turn-scoped on the server (see orchestrateIntakeTurn.ts),
   * same as evidenceGuidance directly above -- retained in this
   * component's own state (see claimGuidance below) for the same reason.
   */
  claimGuidance?: ClaimGuidance;
  intakeComplete: boolean;
  /** Opening story only: answers the story already gives. Nothing is applied until confirmed. */
  storyProposals?: StoryAnswerProposal[];
};

/** One proposal as the user is reviewing it. */
type ProposalDraft = StoryAnswerProposal & { keep: boolean; original: string };

/**
 * What was confirmed, listed, so the conversation shows what was recorded
 * (page review, 2026-10-06: "Confirmed 4 answers from my story" hid every
 * answer, so a wrong one could not be spotted afterwards).
 */
/** The drafts as confirmed: a date shown with another takes that row's tick and edit. */
/** The questions a confirmed kind of claim answers (the claimKind fact, factsOfQuestion.ts). */
const KIND_QUESTION_IDS = new Set(QUESTION_BANK.map((question) => question.id).filter((id) => factsOfQuestion(id).includes("claimKind")));

function resolvedDrafts(drafts: readonly ProposalDraft[]): ProposalDraft[] {
  return confirmedDrafts(drafts, sameDayAs(drafts), drafts.map((draft) => draft.original));
}

/** Only the rows the card showed, so a date confirmed twice is listed once. */
function shownRows(drafts: readonly ProposalDraft[]): ProposalDraft[] {
  const shownWith = sameDayAs(drafts);
  return drafts.filter((_, index) => shownWith[index] < 0);
}

function confirmedSummary(drafts: readonly ProposalDraft[], from: string, responding = false): string {
  const kept = drafts.filter((draft) => draft.keep && draft.answer.trim());
  return [`Confirmed from ${from}:`, ...kept.map((draft) => `• ${cardLabel(draft.questionId, draft.questionText, { responding })}: ${draft.answer.trim()}`)].join("\n");
}

type ChatMessage = {
  from: "user" | "assistant";
  text: string;
  /** Marks a message that carries a bank question, so the one-time intro fires once. */
  isQuestion?: boolean;
  /** The question asked (bank or depth id): marked on the message, so a check can tell which fact was asked (ask-once gate). */
  questionId?: string;
  /** The opening story: shown from the one copy (useStory), never stored here a second time. */
  isStory?: boolean;
};

/**
 * Shown once, before the first question. Replaces the per-question generated
 * lead-in removed in session 48 — see voiceLayer.ts's composeVoiceTurn for the
 * measurements that led to removing it.
 *
 * Deliberately plain: it says what is about to happen and does not thank the
 * user, restate what they said, or characterise their situation.
 */
const FIRST_QUESTION_INTRO =
  "A few questions to get the details down. Answer in your own words — and if you don't know something, say so and we'll record that.";

/** Shown exactly once, when the last question of the whole intake is done. */
const INTAKE_CLOSING_LINE =
  "That's everything needed for now. You can review what you've entered, or continue to the next step whenever you're ready.";

/**
 * Session 28. What onComplete actually hands back -- the real shape of
 * what guided intake produces, NOT SmallClaimsIntake.tsx's
 * (AnalysisResult, StoredCaseData) contract. Those types expect a full
 * structured analysis (detectedIssues, missingInformation, an
 * intelligence snapshot, a narrative summary) that nothing in the guided
 * pipeline computes -- orchestrateIntakeTurn() produces small structured
 * facts, a turn-scoped claim-type match, and evidence-category guidance,
 * nothing resembling AnalysisResult. Forcing this into that contract
 * would mean fabricating empty/fake analysis fields just to satisfy the
 * type, which would be worse than not calling onComplete at all -- see
 * this session's report for the design question this leaves open.
 */
/**
 * One depth question as the server hands it over.
 *
 * `text` is the rendered, slot-substituted, AUTHORED string. It is never model
 * output — the depth turn discards VoiceTurn.questionText, and the lead-in
 * travels separately as `leadIn`. See orchestrateDepthTurn.ts.
 */
export type DepthClientQuestion = {
  id: string;
  elementId: string;
  text: string;
  why?: string;
  sourceUrl?: string;
  examples?: string[];
};

export type GuidedIntakeCompletionResult = {
  facts: IntakeFacts;
  answeredIds: string[];
  /** Retained across turns like evidenceGuidance -- null if no claim type ever matched. */
  matchedClaimType: MatchedClaimType | null;
  /**
   * Per-element record state from the depth phase, when it ran.
   *
   * This is the SAME map the readiness gate reads — depth answers and
   * attestation are one structure, not two that can disagree (design
   * section 5). Undefined when no claim type was confirmed or the user
   * skipped, which is a legitimate state, not a failure.
   */
  elementStateMap?: Record<string, unknown>;
  /**
   * The story as the person actually sent it in the chat. The page used to
   * map its own copy (the home-page story the box was prefilled with), so an
   * edited or newly typed story never reached the analysis.
   */
  storyText?: string;
  /**
   * Answers to the questions written from the law that applies
   * (SourcedQuestions.tsx), as text to add to the story; absent when none
   * were answered.
   */
  followUpText?: string;
  /** Every follow-up answer to keep with the case (earlier visits and this one; Step 2A). */
  sourcedAnswers?: SourcedAnswer[];
  /**
   * Every answer the person confirmed or typed, by question id. The page
   * offers the dates among them on the next-steps panel instead of asking
   * again (live test, 2026-10-06).
   */
  answers?: ConfirmedStoryAnswer[];
};

/**
 * Session 28 -- Tier 1 field help, same pattern as SmallClaimsIntake.tsx's
 * FieldHelp (Tier 1 half only: a "Why does this matter?" toggle showing
 * the question's already-sourced why/sourceUrl). No AI, no network, just
 * existing content the server was already sending in nextQuestion -- this
 * component just wasn't rendering it. Renders nothing when the current
 * question has no `why` to show.
 */
function QuestionHelp({ question }: { question: IntakeQuestion | null }) {
  // 2026-09-30. `examples` is reviewed bank content the server already sends,
  // but nothing rendered it: "What outcome are you asking the court to order?"
  // showed no examples although four are written (site owner's walk-through).
  const examples = question?.examples ?? [];
  // A reason that is law (`why`, always sourced) wins; otherwise the plain
  // reason the site asks (`whyAsked`, which states no law). Walkthrough
  // 2026-10-13 (V3): "Roughly when did the situation..." had neither.
  const plainWhy = question?.why ? "" : question?.whyAsked ?? "";
  if (!question?.why && !plainWhy && examples.length === 0) return null;

  // Why the question matters is shown, not folded behind a toggle
  // (walkthrough, 2026-10-08: "no visible explanation beneath 'Why does this
  // matter?'" -- the finish line asks the site to say why when it is not obvious).
  return (
    <div className="mt-2 text-xs leading-5">
      {question?.why ? (
        <p data-testid="question-why" className="mb-1 text-[#4d675f]">
          <span className="font-semibold text-[#2f7d67]">Why this matters: </span>
          {question.why}
          {question.sourceUrl ? (
            <>
              {" "}
              <a href={publicSourceUrl(question.sourceUrl)} target="_blank" rel="noreferrer" className="font-semibold underline">
                Source
              </a>
            </>
          ) : null}
        </p>
      ) : plainWhy ? (
        <p data-testid="question-why" className="mb-1 text-[#4d675f]">
          <span className="font-semibold text-[#2f7d67]">Why we ask: </span>
          {plainWhy}
        </p>
      ) : null}
      {examples.length > 0 ? (
        <p data-testid="question-examples" className="text-[#4d675f]">
          For example: {examples.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Session 32. Renders one educationTopics.ts/remedyTypes.ts entry --
 * shared between the education-topic list and the remedy list below,
 * since both share the same {title, plainExplanation, citations} shape.
 */
function GuidanceEntry({ entry }: { entry: EducationTopicGuidance | RemedyGuidance }) {
  return (
    <div className="mt-2">
      <p className="font-semibold">{entry.title}</p>
      <p className="mt-1">{entry.plainExplanation}</p>
      <p className="mt-1 text-xs">
        {entry.citations.map((citation, index) => (
          <span key={citation.officialUrl}>
            {index > 0 ? " · " : ""}
            <a href={citation.officialUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
              {citation.sourceName}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * All general education, held below the input and collapsed during intake.
 *
 * THE SEQUENCING DEFECT THIS FIXES. Both panels used to render between the
 * question and the answer box, and they appeared the moment the user confirmed
 * a claim type — then stayed there for every remaining turn, because both are
 * held in retain-the-last-value state. For defamation that is roughly 840 words
 * of content (six education topics, two remedies, five evidence categories)
 * wedged between "here is the question" and "type your answer".
 *
 * That is backwards for the person this site is for. Someone who knows nothing
 * about the process needs the question and the input together, with nothing in
 * between. Education has a place; it is not between a question and its answer.
 *
 * So: during intake this is ONE line under the input, collapsed, opened only if
 * the user chooses. Once intake is complete it expands by default, because then
 * reading it is the sensible next thing to do.
 *
 * WHY evidenceGuidance IS DEFERRED TOO, and not treated as part of the flow.
 * It reads "situations like this often also involve the following, though it
 * hasn't come up yet in what you've shared" — which tells the user what to
 * mention next. That shapes the account rather than recording it, and cuts
 * against the premise that the user's own words drive the case file. Its
 * "already mentioned" line has also been observed asserting the user had
 * mentioned something they had not. Framing it as a prompt would make both
 * problems worse, not better.
 *
 * NO CONTENT IS LOST. The same educationTopics.ts and remedyTypes.ts entries
 * render, with the same citations — only the placement changes. Neither panel
 * is load-bearing: across this component both values are read only inside these
 * blocks, and neither reaches onComplete, sendTurn, question selection, the
 * depth phase or the readiness gate.
 */
function GuidanceDisclosure({
  evidenceGuidance,
  claimGuidance,
  intakeComplete,
}: {
  evidenceGuidance: EvidenceGuidance | null;
  claimGuidance: ClaimGuidance | null;
  intakeComplete: boolean;
}) {
  const [open, setOpen] = useState(false);

  const hasEvidence = Boolean(evidenceGuidance) && evidenceGuidance!.categories.length > 0;
  const hasClaim =
    Boolean(claimGuidance) &&
    (claimGuidance!.educationTopics.length > 0 || claimGuidance!.remedies.length > 0);

  if (!hasEvidence && !hasClaim) return null;

  // Expanded once intake is done; collapsed while questions are still running,
  // regardless of what the user toggled mid-intake.
  const expanded = intakeComplete || open;

  return (
    <div className="mt-4">
      {intakeComplete ? null : (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="text-sm font-semibold text-[#2f7d67] underline"
          aria-expanded={open}
        >
          {open ? "Hide" : "General information about claims like this"}
        </button>
      )}

      {expanded ? (
        <div className="mt-3 space-y-4">
          {/* What to gather comes first: it is what the person acts on (site owner, live test 2026-10-06). */}
          {hasEvidence ? (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-[#24463d]">
              <p className="font-semibold text-[#10231f]">
                General evidence guidance for situations like this
              </p>

              {/*
                One neutral list. The "Already mentioned in what you've shared"
                line was removed in session 48 — it asserted the user had
                supplied things they had not (see evidenceGapDetector.ts), and
                so was the "hasn't come up yet" framing, which told the user
                what to say next. Both made claims about the user's own file
                from a word match. This states what situations like theirs
                generally involve, and claims nothing about what they said.
              */}
              <div className="mt-2">
                <p>Situations like this often involve:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {evidenceGuidance!.categories.map((category) => (
                    <li key={category.name}>
                      <span className="font-semibold">{category.name}</span>
                      {category.examples.length > 0 ? (
                        <span> — for example: {category.examples.join(", ")}.</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-2 text-xs text-[#557168]">
                This is general information about situations like yours, not an assessment of your case.
              </p>
            </div>
          ) : null}
          {hasClaim ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-[#24463d]">
              <p className="font-semibold text-[#10231f]">General information for situations like this</p>

              {claimGuidance!.educationTopics.length > 0 ? (
                <div className="mt-2">
                  {claimGuidance!.educationTopics.map((topic) => (
                    <GuidanceEntry key={topic.id} entry={topic} />
                  ))}
                </div>
              ) : null}

              {claimGuidance!.remedies.length > 0 ? (
                <div className="mt-3">
                  <p className="font-semibold">
                    What courts in this category of situation can generally order
                  </p>
                  {claimGuidance!.remedies.map((remedy) => (
                    <GuidanceEntry key={remedy.id} entry={remedy} />
                  ))}
                </div>
              ) : null}

              <p className="mt-3 text-xs text-[#557168]">
                This is general information about situations like yours, not an assessment of what your
                case is entitled to or a substitute for advice from a licensed paralegal or lawyer.
              </p>
            </div>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}

type Props = {
  location: { province: "Ontario"; city: string };
  initialStory: string;
  /** Called once, when the conversation reports intakeComplete. See GuidedIntakeCompletionResult's own comment for why this isn't SmallClaimsIntake.tsx's onComplete shape. */
  onComplete?: (result: GuidedIntakeCompletionResult) => void;
  /**
   * What this case already holds from an earlier guided conversation
   * (master_result.intakeAnswers and intakeFacts), when the person comes back
   * through "Update your story". The conversation starts from it instead of
   * from nothing, so nothing already answered is asked again (build order
   * Step 2A, 2026-10-12; it used to start from scratch on every visit).
   */
  previous?: { answers: ConfirmedStoryAnswer[]; facts: Record<string, unknown>; sourcedAnswers?: SourcedAnswer[] };
};

const BANK_IDS = new Set(QUESTION_BANK.map((question) => question.id));
const NO_EARLIER_SOURCED: SourcedAnswer[] = [];
const KNOWN_FACTS = new Set<string>(KNOWN_FACT_FIELDS);

/** Earlier facts the guided turn accepts (known fields, plain values only). */
function previousFacts(previous: Props["previous"]): IntakeFacts {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(previous?.facts ?? {})) {
    if (!KNOWN_FACTS.has(key)) continue;
    if (typeof value === "boolean" || typeof value === "number") out[key] = value;
    else if (typeof value === "string" && value.length <= 1200) out[key] = value; // the turn's own limit
  }
  return out;
}

/** Earlier answered question ids from the bank, newest kept (the turn takes at most 50). */
function previousAnsweredIds(previous: Props["previous"]): string[] {
  const ids = (previous?.answers ?? []).map((answer) => answer.questionId).filter((id) => BANK_IDS.has(id));
  return Array.from(new Set(ids)).slice(-50);
}

export default function GuidedSmallClaimsIntake({ location, initialStory, onComplete, previous }: Props) {
  const reviewView = useIntakeReviewView();
  const intakeConfirmed = Boolean(reviewView && reviewPhase(reviewView.workflowStatus, reviewView.checkpoint) === "user-confirmed");
  // A press of this route's Continue before the review is confirmed: said beside it (L26).
  // Only a press: finishing the questions on its own shows nothing (#465 re-test).
  const pressedContinue = () => { if (reviewView && !intakeConfirmed) markReviewNeeded("guided", inputRevision(reviewView.checkpoint)); };
  const recovery = useIntakeRecovery();
  // The situation answers (situation.ts) settle the side and whether a claim was filed or served; the server applies them every turn.
  const [situation] = useSituation();
  const resumedHeld = useRef(Boolean(recovery?.read("guided", "heldPayload")));
  const beforeIntakeAI = useBeforeIntakeAI();
  const validateIntakeResponse = useValidateIntakeResponse();
  const [facts, setFacts] = useIntakeState<IntakeFacts>("guided", "facts", () => previousFacts(previous));
  const [answeredIds, setAnsweredIds] = useIntakeState<string[]>("guided", "answeredIds", () => previousAnsweredIds(previous));
  const [currentQuestion, setCurrentQuestion] = useIntakeState<IntakeQuestion | null>("guided", "currentQuestion", null);
  const [messages, setMessages] = useIntakeState<ChatMessage[]>("guided", "messages", []);
  // Sticky once set: the notice answers a question the user asked, and it
  // stays in view while they carry on with the intake.
  const [asksForAdvice, setAsksForAdvice] = useIntakeState("guided", "asksForAdvice", false);
  // Before the conversation starts the box IS the story (the one copy, intakeStory.ts);
  // afterwards it holds the answer being typed.
  const [story, setStory] = useStory();
  const [answerDraft, setAnswerDraft] = useIntakeState("guided", "inputText", "");
  const startedRef = useRef(false);
  const setInputText = useCallback((value: string) => { (startedRef.current ? setAnswerDraft : setStory)(value); }, [setAnswerDraft, setStory]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const turnRequest = useRef(new IntakeRequest());
  const depthRequest = useRef(new IntakeRequest());
  const suggestionRequest = useRef(new IntakeRequest());
  useEffect(() => {
    const requests = [turnRequest.current, depthRequest.current, suggestionRequest.current];
    mounted.current = true;
    return () => { mounted.current = false; requests.forEach((request) => request.cancel()); };
  }, []);
  const [error, setError] = useState("");
  // A 401 from the guided AI routes: the line gets a sign-in link beside it.
  const [signInNeeded, setSignInNeeded] = useState(false);
  // L26: finishing needs the review panel at the top confirmed; the error line links to it.
  const [reviewNeeded, setReviewNeeded] = useState(false);
  const [halted, setHalted] = useIntakeState("guided", "halted", false);
  const [intakeComplete, setIntakeComplete] = useIntakeState("guided", "intakeComplete", false);
  const [started, setStarted] = useIntakeState("guided", "started", false);
  useEffect(() => { startedRef.current = started; }, [started]);
  const inputText = started ? answerDraft : story;
  const shownMessages = useMemo(() => messages.map((message) => message.isStory ? { ...message, text: story } : message), [messages, story]);
  // Retained across turns rather than replaced with each response -- only
  // updated when a turn actually carries a new evidenceGuidance, so it
  // doesn't disappear the moment the user answers a plain multiple-choice
  // question with no new free text (see GuidedTurnResult.evidenceGuidance).
  const [evidenceGuidance, setEvidenceGuidance] = useIntakeState<EvidenceGuidance | null>("guided", "evidenceGuidance", null);
  // Same retain-the-last-value pattern as evidenceGuidance -- claimGuidance
  // is turn-scoped server-side too (see GuidedTurnResult.claimGuidance).
  const [claimGuidance, setClaimGuidance] = useIntakeState<ClaimGuidance | null>("guided", "claimGuidance", null);
  // Same retain-the-last-value pattern as evidenceGuidance -- matchedClaimTypes
  // is turn-scoped server-side, so this is what makes a matched claim type
  // survive to the completion callback even when the LAST turn's text
  // didn't itself re-match one.
  const [matchedClaimType, setMatchedClaimType] = useIntakeState<MatchedClaimType | null>("guided", "matchedClaimType", null);
  // Session 37 -- an AI-suggested claim type awaiting explicit user
  // confirmation (see suggestedClaimType on GuidedTurnResult). Never fed
  // into matchedClaimType, evidenceGuidance, or claimGuidance until the
  // user says yes via handleConfirmSuggestion below.
  const [pendingSuggestion, setPendingSuggestion] = useIntakeState<MatchedClaimType | null>("guided", "pendingSuggestion", null);
  // The exact story text the pending suggestion was classified from --
  // confirming/rejecting re-uses this same text rather than re-sending
  // whatever the user has typed since.
  const [suggestionStoryText, setSuggestionStoryText] = useIntakeState("guided", "suggestionStoryText", "");
  // Ids already rejected in this suggestion cycle -- capped at one retry,
  // enforced server-side too (claimTypeSuggestionResolution.ts).
  const [rejectedSuggestionIds, setRejectedSuggestionIds] = useIntakeState<string[]>("guided", "rejectedSuggestionIds", []);
  const [resolvingSuggestion, setResolvingSuggestion] = useState(false);
  const [noClaimTypeMatch, setNoClaimTypeMatch] = useIntakeState("guided", "noClaimTypeMatch", false);

  // --- Claim-type depth phase (docs/CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md) ---
  //
  // Runs after general intake completes, and ONLY on a confirmed claim type.
  // `matchedClaimType` is exactly that: it is set by an exact matchClaimType
  // hit, and also by resolveSuggestion("confirm") below. Both paths are
  // "confirmed"; an unconfirmed pendingSuggestion never reaches it.
  //
  // Skippable at any point (design section 7): the phase improves draft
  // quality, it is not a prerequisite, and a skipper still reaches a draft.
  const [depthQuestions, setDepthQuestions] = useIntakeState<DepthClientQuestion[]>("guided", "depthQuestions", []);
  const [depthIndex, setDepthIndex] = useIntakeState("guided", "depthIndex", 0);
  const [depthStateMap, setDepthStateMap] = useIntakeState<Record<string, unknown> | null>("guided", "depthStateMap", null);
  const [depthActive, setDepthActive] = useIntakeState("guided", "depthActive", false);
  // Retained so onComplete fires with the same facts/answeredIds the
  // completing turn produced, rather than whatever state has become since.
  const [completionPayload, setCompletionPayload] = useIntakeState<GuidedIntakeCompletionResult | null>("guided", "completionPayload", null);
  const sourced = useSourcedQuestions("small-claims", previous?.sourcedAnswers ?? NO_EARLIER_SOURCED);
  const [heldPayload, setHeldPayload] = useIntakeState<GuidedIntakeCompletionResult | null>("guided", "heldPayload", null);
  const storyRef = useRef(story);
  useEffect(() => { storyRef.current = story; }, [story]);
  // 2026-09-28. "Here's what I understood" -- answers the opening story
  // already gives, awaiting the user's confirmation. Null when none pending.
  const [proposalDrafts, setProposalDrafts] = useIntakeState<ProposalDraft[] | null>("guided", "proposalDrafts", null);
  // Which phase the proposals panel is confirming: the opening intake
  // questions, or the claim-type depth questions (2026-10-04).
  const [proposalMode, setProposalMode] = useIntakeState<"intake" | "depth">("guided", "proposalMode", "intake");
  // One extra read of the story after the first confirmations, never more.
  const [reproposed, setReproposed] = useIntakeState("guided", "reproposed", false);
  // 2026-10-05. Everything the person has answered, and every proposal they
  // unticked, sent with each answer so the next questions are checked against
  // the whole conversation, not only the opening story. Live run: the date
  // given to "when did it happen?" was asked for again as the injury date.
  const [earlierAnswers, setEarlierAnswers] = useIntakeState<ConfirmedStoryAnswer[]>("guided", "earlierAnswers", () => (previous?.answers ?? []).slice(-200));
  // The saved case can finish loading after this mounts; take its earlier
  // answers then too, as long as the conversation hasn't started.
  const previousTaken = useRef(Boolean(previous || recovery?.read("guided", "facts")));
  useEffect(() => {
    if (!previous || previousTaken.current || started) return;
    previousTaken.current = true;
    setFacts(previousFacts(previous));
    setAnsweredIds(previousAnsweredIds(previous));
    setEarlierAnswers(previous.answers.slice(-200));
  }, [previous, setAnsweredIds, setEarlierAnswers, setFacts, started]);
  const [declinedIds, setDeclinedIds] = useIntakeState<string[]>("guided", "declinedIds", []);

  /** The conversation check (caseFile.ts askedAndReplied): each question this chat asked that the person replied to, sent as answered. */
  function repliedInThisChat(): string[] {
    const turns = messages.map((message) => ({ role: message.from, text: message.text, questionId: message.questionId }));
    return [...new Set(messages.flatMap((message) => (message.questionId && askedAndReplied(turns, message.questionId) ? [message.questionId] : [])))];
  }

  async function sendTurn(
    newStoryText: string | undefined,
    newAnsweredIds: string[],
    nextFacts: IntakeFacts,
    answeredQuestionId?: string,
    confirmedAnswers?: ConfirmedStoryAnswer[],
    repropose?: { story: string; alreadyOffered: string[] },
    earlier?: { story: string; answers: ConfirmedStoryAnswer[]; declined: string[] },
  ) {
    if (turnRequest.current.pending || depthRequest.current.pending) return;
    if (answeredQuestionId && newStoryText && newStoryText.length > 1000) {
      setError("This answer is longer than the 1,000-character limit. Your full text is still here; please review it before retrying.");
      return;
    }
    setLoading(true);
    setError(""); setSignInNeeded(false); setReviewNeeded(false);

    try {
      await turnRequest.current.run(async (signal) => {
        await beforeIntakeAI(signal);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/intake/guided-turn", {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          facts: nextFacts,
          // The case file is the one gate (caseFile.ts): a question whose fact the person
          // gave anywhere (the review, the form, the step page), or said "not sure" to, is
          // sent as answered, so it is never asked here again.
          answeredIds: [...new Set([...newAnsweredIds, ...(reviewView ? QUESTION_BANK.filter((question) => alreadyAsked(caseFileOf(reviewView.checkpoint), question.id)).map((question) => question.id) : []), ...repliedInThisChat()])],
          newStoryText,
          answeredQuestionId,
          confirmedAnswers,
          repropose,
          earlier,
          situation,
        }),
      });

      const json = await response.json();
      await validateIntakeResponse(signal);
      signal.throwIfAborted();
      if (!response.ok || !json.ok) {
        setError(json.error || "That didn't go through. Please try again.");
        setSignInNeeded(response.status === 401);
        if (!answeredQuestionId && !confirmedAnswers) setStarted(false);
        return;
      }

      const result: GuidedTurnResult = json.result;
      setInputText("");
      setProposalDrafts(null);
      if (answeredQuestionId && newStoryText) setEarlierAnswers((current) => [...current.filter((item) => item.questionId !== answeredQuestionId), { questionId: answeredQuestionId, answerText: newStoryText }]);
      if (newStoryText) setMessages((current) => [...current, answeredQuestionId ? { from: "user", text: newStoryText } : { from: "user", text: "", isStory: true }]);
      setFacts(result.facts);
      setAnsweredIds(result.answeredIds);
      if (result.evidenceGuidance) {
        setEvidenceGuidance(result.evidenceGuidance);
      }
      if (result.claimGuidance) {
        setClaimGuidance(result.claimGuidance);
      }
      if (result.suggestedClaimType && newStoryText) {
        setPendingSuggestion(result.suggestedClaimType);
        setSuggestionStoryText(newStoryText);
        setRejectedSuggestionIds([]);
        setNoClaimTypeMatch(false);
      }

      // Compute the value to report now, before any setState -- the
      // retained state variable won't reflect this turn's fresh match
      // until the next render, but onComplete (below) may need to fire
      // with the up-to-date value in this same pass.
      const freshMatch = result.matchedClaimTypes[0]?.claimType;
      // The story's words for an exact match: the signal phrase found whole in it (claimKind.ts).
      const freshQuote = freshMatch && newStoryText ? storyQuoteFor(newStoryText, CLAIM_TYPES.find((claimType) => claimType.id === freshMatch.id) ?? { signals: [] }) : null;
      const matchedClaimTypeThisTurn: MatchedClaimType | null = freshMatch
        ? { claimTypeId: freshMatch.id, claimTypeName: freshMatch.name, userConfirmed: false, ...(freshQuote ? { quote: freshQuote } : {}) }
        : matchedClaimType;
      if (freshMatch) {
        setMatchedClaimType(matchedClaimTypeThisTurn);
      }

      if (result.halted) {
        setHalted(true);
        setMessages((current) => [
          ...current,
          { from: "assistant", text: result.haltMessage || "Intake stopped here." },
        ]);
        setCurrentQuestion(null);
        setLoading(false);
        return;
      }

      if (result.distressAcknowledgment) {
        setMessages((current) => [...current, { from: "assistant", text: result.distressAcknowledgment as string }]);
      }

      // Same notice Civil, Family and the Small Claims form show: fixed words
      // and the reviewed referral list. It does not stop the intake.
      // The notice belongs to the turn that raised it, so a later turn that
      // asks nothing of the kind clears it (page walkthrough, 2026-10-06: it
      // stayed up for the rest of the session and reappeared on Back).
      setAsksForAdvice(result.requestsLegalAdvice === true);

      // Answers the story already gives are shown for confirmation BEFORE any
      // question is asked. Nothing is applied until the user confirms; what
      // they untick is simply asked as normal.
      if (result.storyProposals && result.storyProposals.length > 0) {
        setProposalDrafts(result.storyProposals.map((proposal) => ({ ...proposal, keep: true, original: proposal.answer })));
        setMessages((current) => [
          ...current,
          {
            from: "assistant",
            text: answeredQuestionId
              ? "You've already told me some of what I was going to ask next. Check these the same " +
                "way: fix anything that's off, and untick anything that's wrong."
              : confirmedAnswers
              ? "Your answers opened a few more questions that your story already answers. Check " +
                "these the same way."
              : "Here's what I understood from what you wrote. Check each one: fix anything that's " +
                "off, and untick anything that's wrong. I'll only ask about what's left.",
          },
        ]);
        setCurrentQuestion(null);
        setLoading(false);
        return;
      }

      if (result.intakeComplete || !result.nextQuestion) {
        setIntakeComplete(true);
        setCurrentQuestion(null);
        setLoading(false);

        const payload: GuidedIntakeCompletionResult = {
          facts: result.facts,
          answeredIds: result.answeredIds,
          matchedClaimType: matchedClaimTypeThisTurn,
          ...(storyRef.current ? { storyText: storyRef.current } : {}),
        };

        // Depth phase runs only on a CONFIRMED claim type. Without one there
        // is nothing to go deeper on, so completion is immediate.
        //
        // The closing line is shown only when the intake is actually over.
        // It used to be appended here unconditionally, so "That's everything
        // needed for now" appeared directly ABOVE "A few more questions
        // specific to this kind of claim" (found in a live run, 2026-09-28).
        // When a depth phase follows, the depth phase owns the closing line.
        if (matchedClaimTypeThisTurn) {
          setCompletionPayload(payload);
          void startDepthPhase(matchedClaimTypeThisTurn.claimTypeId, result.facts, payload);
        } else {
          setMessages((current) => [...current, { from: "assistant", text: INTAKE_CLOSING_LINE }]);
          completeWithSourced(payload);
        }
        return;
      }

      // Session 48: the generated per-question lead-in is gone (voiceLayer.ts
      // explains why). `leadIn` is now always null, so this is the reviewed
      // question text alone — the same conclusion the education-sequencing fix
      // reached: the question and the input, with nothing between them.
      //
      // A single fixed line is shown ONCE, before the first question, in place
      // of a fresh pseudo-personal greeting every turn. Deterministic, reviewed,
      // and free.
      const displayText = result.voiceTurn?.questionText ?? result.nextQuestion.text;
      const isFirstQuestion = messages.every((message) => message.from !== "assistant" || !message.isQuestion);

      setMessages((current) => [
        ...current,
        ...(isFirstQuestion
          ? [{ from: "assistant" as const, text: FIRST_QUESTION_INTRO }]
          : []),
        { from: "assistant" as const, text: displayText, isQuestion: true, questionId: result.nextQuestion?.id },
      ]);
      setCurrentQuestion(result.nextQuestion);
      });
    } catch {
      if (!answeredQuestionId && !confirmedAnswers) setStarted(false);
      setError("That request did not finish. Your answer is still here; please try again.");
    } finally {
      if (!depthRequest.current.pending) setLoading(false);
    }
  }

  // Session 37. Resolves pendingSuggestion via /api/intake/classify-claim-type
  // -- confirm accepts it as the real matched claim type (computing
  // evidenceGuidance/claimGuidance for the first time, same as an exact
  // match already does); reject asks for one AI-assisted retry, excluding
  // the rejected id, and gives up honestly after that (see
  // claimTypeSuggestionResolution.ts).
  async function resolveSuggestion(action: "confirm" | "reject") {
    if (!pendingSuggestion || suggestionRequest.current.pending) return;
    setResolvingSuggestion(true);
    setError(""); setSignInNeeded(false); setReviewNeeded(false);

    try {
      await suggestionRequest.current.run(async (signal) => {
        await beforeIntakeAI(signal);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/intake/classify-claim-type", {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          storyText: suggestionStoryText,
          facts,
          action,
          claimTypeId: pendingSuggestion.claimTypeId,
          priorRejectedIds: rejectedSuggestionIds,
        }),
      });

      const json = await response.json();
      await validateIntakeResponse(signal);
      signal.throwIfAborted();
      if (!response.ok || !json.ok) {
        setError(json.error || "That didn't go through. Please try again.");
        setSignInNeeded(response.status === 401);
        return;
      }

      const result = json.result as
        | { outcome: "confirmed"; claimType: { claimTypeId: string; claimTypeName: string }; evidenceGuidance: EvidenceGuidance; claimGuidance: ClaimGuidance }
        | { outcome: "revised"; suggestedClaimType: MatchedClaimType }
        | { outcome: "no-match" };

      if (result.outcome === "confirmed") {
        // This path only runs after the person clicked "that's right" on the
        // suggestion card -- the one case where userConfirmed is actually true.
        setMatchedClaimType({ ...result.claimType, userConfirmed: true, ...(pendingSuggestion.quote ? { quote: pendingSuggestion.quote } : {}) });
        setEvidenceGuidance(result.evidenceGuidance ?? null);
        setClaimGuidance(result.claimGuidance ?? null);
        setPendingSuggestion(null);
        setRejectedSuggestionIds([]);
        // The kind answers "What it's about" (both are the claimKind fact, factsOfQuestion.ts): the
        // story card does not ask it again (26 Oct re-test, case 19).
        setProposalDrafts((current) => {
          const left = current?.filter((draft) => !KIND_QUESTION_IDS.has(draft.questionId)) ?? null;
          return left && left.length ? left : null;
        });
      } else if (result.outcome === "revised") {
        setRejectedSuggestionIds((current) => [...current, pendingSuggestion.claimTypeId]);
        setPendingSuggestion(result.suggestedClaimType);
      } else {
        setPendingSuggestion(null);
        setRejectedSuggestionIds([]);
        setNoClaimTypeMatch(true);
      }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResolvingSuggestion(false);
    }
  }

  /*
   * WHICH STORY THE CONVERSATION READ. A correction made in the review changes the
   * one story; Back then showed this conversation's "Confirmed from my story"
   * reading of the OLD story with no notice (re-test 2026-10-18). When the story
   * has changed since, the old reading is set aside and the person can start the
   * questions again from the story as it now is.
   */
  const [readFrom, setReadFrom] = useIntakeState("guided", "readFrom", "");
  // This conversation read an earlier story, or any answer anywhere was based on one (storyBasis.ts).
  const storyAnswersChanged = useStoryAnswersOutdated();
  const readingOutdated = (started && Boolean(readFrom.trim()) && readFrom.trim() !== story.trim()) || storyAnswersChanged;
  // One restart for every route: the store resets this conversation with every stale answer.
  function startAgainFromStory() {
    recovery?.discardStaleAnswers();
    setShowSavedStory(true);
  }

  // A saved story is shown as text with "Send" and "Edit", never hidden inside an
  // empty-looking box that typing would add to (re-test 2026-10-18).
  // Only a story that was already saved when this opened; one being typed stays in the box.
  const [showSavedStory, setShowSavedStory] = useState(() => Boolean(story.trim()));

  function handleStorySubmit() {
    if (loading || turnRequest.current.pending || !inputText.trim()) return;
    setStarted(true);
    const story = inputText;
    setReadFrom(story);
    storyRef.current = story;
    // The law that applies is researched while the guided questions run, so
    // its questions are ready when they end.
    void sourced.start(story);
    void sendTurn(story, answeredIds, facts);
  }

  function handleAnswerSubmit() {
    if (loading || turnRequest.current.pending || !currentQuestion) return;
    const answerText = inputText.trim();
    // A date without its year is asked for its year before it is sent; sent without one, it
    // was kept as "October 6" and then dropped (dates.ts, #471 re-test).
    const year = dateAnswerCheck(currentQuestion.text, answerText, { dateQuestion: (currentQuestion as { answerType?: string }).answerType === "date", oneDate: isDateQuestionId(currentQuestion.id) });
    if (year) {
      setMessages((current) => [...current, { from: "assistant", text: year }]);
      return;
    }
    const nextAnsweredIds = [...answeredIds, currentQuestion.id];
    const openingStory = story;
    const earlier = answerText
      ? { story: openingStory, answers: earlierAnswers, declined: declinedIds }
      : undefined;
    void sendTurn(answerText || undefined, nextAnsweredIds, facts, currentQuestion.id, undefined, undefined, earlier);
  }

  /**
   * The user's own verbatim text the suppression filter reads. Exactly the
   * fields the design names, plus the opening story.
   */
  function buildUserTexts(currentFacts: IntakeFacts): string[] {
    const fields = [
      "storyText",
      "amountClaimedText",
      "timelineText",
      "evidenceText",
      "remedySoughtText",
      "serviceDetailsText",
    ] as const;

    return [
      ...shownMessages.filter((message) => message.from === "user").map((message) => message.text),
      ...fields
        .map((field) => currentFacts[field as keyof IntakeFacts])
        .filter((value): value is string => typeof value === "string"),
    ].filter((text) => text.trim().length > 0);
  }

  async function callDepthTurn(
    claimTypeId: string,
    currentFacts: IntakeFacts,
    answered?: { questionId: string; answerText: string },
    confirmedAnswers?: ConfirmedStoryAnswer[],
  ) {
    const result = await depthRequest.current.run(async (signal) => {
        await beforeIntakeAI(signal);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/intake/depth-turn", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...intakeGuidanceHeaders(recovery),
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        claimTypeId,
        userTexts: buildUserTexts(currentFacts).slice(0, 12),
        // Slot values are left empty, so every slot renders its authored
        // neutral default. That is the ship-safe state the design names, not a
        // fallback failure: filling {defendantLabel} from the user's own words
        // needs a bounded party/subject label extractor, which does not exist
        // yet. Every authored question is required to read correctly with all
        // slots defaulted, and verifyDepthQuestions.ts enforces that.
        slotValues: {},
        stateMap: depthStateMap || undefined,
        facts: currentFacts as Record<string, string | number | boolean>,
        ...(answered
          ? { answeredQuestionId: answered.questionId, answerText: answered.answerText }
          : {}),
        ...(confirmedAnswers && confirmedAnswers.length > 0 ? { confirmedAnswers } : {}),
      }),
    });

    const json = await response.json();
    await validateIntakeResponse(signal);
    signal.throwIfAborted();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "That didn't go through. Please try again.");
    }

    return json.result as {
      questions: DepthClientQuestion[];
      proposals?: StoryAnswerProposal[];
      stateMap: Record<string, unknown>;
      leadIn: string | null;
      halted: boolean;
      haltMessage?: string;
    };
    });
    if (!result) throw new Error("A request is already in progress.");
    return result;
  }

  // `payload` is passed in rather than read from completionPayload state: the
  // caller sets that state in the same pass, so a read here (or in
  // finishDepthPhase on the zero-question and error paths) still sees null and
  // onComplete never fires -- the user would be stranded short of the overview.
  async function startDepthPhase(
    claimTypeId: string,
    currentFacts: IntakeFacts,
    payload: GuidedIntakeCompletionResult,
  ) {
    if (!intakeConfirmed) { setCompletionPayload(payload); onComplete?.({ ...payload, answers: earlierAnswers }); return; }
    setLoading(true);
    try {
      const result = await callDepthTurn(claimTypeId, currentFacts);
      setDepthStateMap(result.stateMap);

      // A well-covered story suppresses everything. That is the filter working,
      // not a failure — finish immediately rather than announcing a phase with
      // nothing in it.
      if (result.questions.length === 0) {
        setMessages((current) => [...current, { from: "assistant", text: INTAKE_CLOSING_LINE }]);
        finishDepthPhase(result.stateMap, payload);
        return;
      }

      setDepthQuestions(result.questions);

      // Questions the user's own words already answer are proposed first, for
      // them to confirm, so they are not asked again (2026-10-04: a user whose
      // only evidence was texts to their brother was still asked about
      // newspapers). Confirming happens in handleConfirmDepthProposals.
      if (result.proposals && result.proposals.length > 0) {
        setProposalMode("depth");
        setProposalDrafts(result.proposals.map((proposal) => ({ ...proposal, keep: true, original: proposal.answer })));
        setMessages((current) => [
          ...current,
          {
            from: "assistant",
            text:
              "A few questions apply to this kind of claim. Your story already answers some of them — " +
              "please check these, and I'll only ask what's still missing.",
          },
        ]);
        return;
      }

      setDepthIndex(0);
      setDepthActive(true);
      setMessages((current) => [
        ...current,
        {
          from: "assistant",
          text:
            "A few more questions specific to this kind of claim. You can skip these at any point — " +
            "they help the draft, and nothing depends on answering them.",
        },
        { from: "assistant", text: result.questions[0].text, questionId: result.questions[0].id },
      ]);
    } catch (err) {
      if (!mounted.current) return;
      // A depth failure must never strand the user short of a draft.
      setError(err instanceof Error ? err.message : "Could not load the detailed questions.");
      setMessages((current) => [...current, { from: "assistant", text: INTAKE_CLOSING_LINE }]);
      finishDepthPhase(depthStateMap, payload);
    } finally {
      setLoading(false);
    }
  }

  // No hand-written questions for this kind of claim: before the analysis,
  // ask the ones written from the law that applies, if research found any.
  // Held while they load; released at once when there are none. A claim
  // type with its own reviewed questions (the depth phase) uses those.
  function completeWithSourced(completed: GuidedIntakeCompletionResult) {
    const payload = { ...completed, answers: earlierAnswers };
    const kept = sourced.answeredList();
    const followUpText = sourcedAnswerListText(kept);
    onComplete?.({ ...payload, sourcedAnswers: kept, ...(followUpText ? { followUpText } : {}) });
  }

  function releaseHeld() {
    if (!heldPayload) return;
    const kept = sourced.answeredList();
    const followUpText = sourcedAnswerListText(kept);
    setHeldPayload(null);
    onComplete?.({ ...heldPayload, sourcedAnswers: kept, ...(followUpText ? { followUpText } : {}) });
  }

  useEffect(() => {
    // A municipal notice line holds the page until the person continues
    // (round 4 review, 2026-10-14): moving on at once would hide it.
    if (!resumedHeld.current && heldPayload && (sourced.state === "none" || sourced.state === "idle") && !municipalNoticeFirst(storyRef.current, { city: location?.city ?? "" })) {
      setHeldPayload(null);
      // Nothing new to ask: still keep the answers from earlier visits.
      onComplete?.({ ...heldPayload, sourcedAnswers: sourced.answeredList() });
    }
  }, [heldPayload, sourced.state, sourced.answeredList, onComplete, location?.city, sourced, storyRef, setHeldPayload]);

  function finishDepthPhase(
    stateMap: Record<string, unknown> | null,
    payloadOverride?: GuidedIntakeCompletionResult,
  ) {
    setDepthActive(false);
    const payload = payloadOverride ?? completionPayload;
    if (payload) {
      // Must carry `answers` the same way completeWithSourced() does — this is
      // the only path a claim-type match takes, and without it the page-level
      // suggestedDatesFromAnswers() has nothing to read, so a date the user
      // already gave (e.g. the incident date) never prefills into the
      // deadline calculator (found 2026-10-15).
      onComplete?.({
        ...payload,
        answers: payload.answers ?? earlierAnswers,
        elementStateMap: stateMap || undefined,
        sourcedAnswers: sourced.answeredList(),
      });
    } else {
      // 2026-10-16 live bug: this branch silently did nothing when `payload`
      // was missing, leaving the user on the closing chat line with no error,
      // no save, and no way to continue -- a true dead end. Whatever the
      // cause, the user must see SOMETHING rather than nothing.
      if (!intakeConfirmed) {
        // L26: the usual cause. Say so, with a link to the panel, instead of a dead end.
        setError("Your initial case information at the top of this page is not confirmed yet. Confirm it there first; your answers here are kept.");
        setReviewNeeded(true);
      } else {
        setError("Something went wrong finishing the intake. Please try again, or go back and re-answer the last question.");
      }
    }
  }

  function handleDepthAnswerSubmit() {
    const question = depthQuestions[depthIndex];
    if (loading || depthRequest.current.pending || !question || !completionPayload?.matchedClaimType) return;

    const answerText = inputText.trim();
    if (answerText) {
      setMessages((current) => [...current, { from: "user", text: answerText }]);
    }
    setLoading(true);

    void (async () => {
      try {
        const result = await callDepthTurn(
          completionPayload.matchedClaimType!.claimTypeId,
          completionPayload.facts,
          { questionId: question.id, answerText },
        );
        setInputText("");
        setDepthStateMap(result.stateMap);

        if (result.halted) {
          setHalted(true);
          setDepthActive(false);
          setMessages((current) => [
            ...current,
            { from: "assistant", text: result.haltMessage || "Intake stopped here." },
          ]);
          return;
        }

        const nextIndex = depthIndex + 1;
        const next = depthQuestions[nextIndex];

        if (!next) {
          setMessages((current) => [
            ...current,
            { from: "assistant", text: INTAKE_CLOSING_LINE },
          ]);
          finishDepthPhase(result.stateMap);
          return;
        }

        setDepthIndex(nextIndex);
        // The lead-in is the ONLY model-authored text here. The question shown
        // is next.text, the authored string — never result.leadIn's phrasing.
        setMessages((current) => [
          ...current,
          ...(result.leadIn ? [{ from: "assistant" as const, text: result.leadIn }] : []),
          { from: "assistant" as const, text: next.text, questionId: next.id },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't go through. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }

  function handleSkipDepth() {
    if (loading || depthRequest.current.pending) return;
    setMessages((current) => [
      ...current,
      { from: "assistant", text: "No problem — skipping the rest of these." },
      { from: "assistant", text: INTAKE_CLOSING_LINE },
    ]);
    finishDepthPhase(depthStateMap);
  }

  function handleConfirmDepthProposals() {
    if (!proposalDrafts || !completionPayload?.matchedClaimType) return;
    const drafts = resolvedDrafts(proposalDrafts);
    // An edited date follows the same rule as a typed one (dates.ts): asked for its year, not kept without it.
    const dateNote = drafts
      .filter((draft) => draft.keep && draft.answer.trim())
      .map((draft) => {
        const note = dateAnswerCheck(draft.questionText, draft.answer.trim(), { dateQuestion: draft.dateQuestion, oneDate: isDateQuestionId(draft.questionId) });
        return note ? `${draft.questionText} ${note}` : null;
      })
      .find(Boolean);
    if (dateNote) {
      setMessages((current) => [...current, { from: "assistant", text: dateNote }]);
      return;
    }
    const confirmed: ConfirmedStoryAnswer[] = drafts
      .filter((draft) => draft.keep && draft.answer.trim())
      .map((draft) => ({ questionId: draft.questionId, answerText: draft.answer.trim() }));
    const unticked = drafts.filter((draft) => !draft.keep).map((draft) => draft.questionId);
    if (unticked.length) setDeclinedIds((current) => [...current, ...unticked]);
    if (confirmed.length) setEarlierAnswers((current) => [...current, ...confirmed]);
    setProposalDrafts(null);
    setProposalMode("intake");
    setMessages((current) => [
      ...current,
      {
        from: "user",
        text:
          confirmed.length > 0
            ? confirmedSummary(shownRows(drafts), "what I've told you", respondingFromAnswers([...earlierAnswers, ...drafts], facts))
            : "None of those were right.",
      },
    ]);
    const confirmedIds = new Set(confirmed.map((item) => item.questionId));
    const remaining = depthQuestions.filter((question) => !confirmedIds.has(question.id));
    const payload = completionPayload;
    setLoading(true);

    void (async () => {
      let stateMap = depthStateMap;
      try {
        if (confirmed.length > 0) {
          const result = await callDepthTurn(
            payload.matchedClaimType!.claimTypeId,
            payload.facts,
            undefined,
            confirmed,
          );
          stateMap = result.stateMap;
          setDepthStateMap(result.stateMap);
        }
      } catch (err) {
        // Not recorded means simply asked: put every question back.
        setError(err instanceof Error ? err.message : "That didn't go through. Please try again.");
        if (!mounted.current) return;
        setProposalDrafts(drafts);
        setProposalMode("depth");
        return;
      } finally {
        setLoading(false);
      }

      if (remaining.length === 0) {
        setMessages((current) => [...current, { from: "assistant", text: INTAKE_CLOSING_LINE }]);
        finishDepthPhase(stateMap, payload);
        return;
      }

      setDepthQuestions(remaining);
      setDepthIndex(0);
      setDepthActive(true);
      setMessages((current) => [
        ...current,
        {
          from: "assistant",
          text:
            remaining.length === 1
              ? "One more question for this kind of claim. You can skip it."
              : "A few more questions for this kind of claim. You can skip these at any point.",
        },
        { from: "assistant", text: remaining[0].text },
      ]);
    })();
  }

  function handleConfirmProposals() {
    if (loading || turnRequest.current.pending || depthRequest.current.pending) return;
    if (proposalMode === "depth") {
      handleConfirmDepthProposals();
      return;
    }
    if (!proposalDrafts) return;
    const drafts = resolvedDrafts(proposalDrafts);
    // An edited date follows the same rule as a typed one (dates.ts): asked for its year, not kept without it.
    const dateNote = drafts
      .filter((draft) => draft.keep && draft.answer.trim())
      .map((draft) => {
        const note = dateAnswerCheck(draft.questionText, draft.answer.trim(), { dateQuestion: draft.dateQuestion, oneDate: isDateQuestionId(draft.questionId) });
        return note ? `${draft.questionText} ${note}` : null;
      })
      .find(Boolean);
    if (dateNote) {
      setMessages((current) => [...current, { from: "assistant", text: dateNote }]);
      return;
    }
    const confirmed: ConfirmedStoryAnswer[] = drafts
      .filter((draft) => draft.keep && draft.answer.trim())
      .map((draft) => ({ questionId: draft.questionId, answerText: draft.answer.trim() }));
    // What was unticked is not offered again, as in the claim-details card below: here it was
    // not recorded, so "A claim of your own" came back after each answer (#471 re-test).
    const unticked = drafts.filter((draft) => !draft.keep).map((draft) => draft.questionId);
    if (unticked.length) setDeclinedIds((current) => [...new Set([...current, ...unticked])]);
    setMessages((current) => [
      ...current,
      {
        from: "user",
        text:
          confirmed.length > 0
            ? confirmedSummary(shownRows(drafts), "my story", respondingFromAnswers([...earlierAnswers, ...drafts], facts))
            : "None of those were right.",
      },
    ]);
    const openingStory = story;
    const repropose =
      !reproposed && openingStory
        ? { story: openingStory, alreadyOffered: proposalDrafts.map((draft) => draft.questionId) }
        : undefined;
    if (repropose) setReproposed(true);
    void sendTurn(undefined, answeredIds, facts, undefined, confirmed, repropose);
  }

  function updateProposalDraft(index: number, patch: Partial<ProposalDraft>) {
    setProposalDrafts((current) =>
      current ? current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)) : current,
    );
  }

  function handleSend() {
    if (loading || resolvingSuggestion || turnRequest.current.pending || depthRequest.current.pending) return;
    if (!started) handleStorySubmit();
    else if (depthActive) handleDepthAnswerSubmit();
    else if (currentQuestion) handleAnswerSubmit();
  }

  // ONE QUESTION AT A TIME (walkthrough 2026-10-13, V3). The claim-type
  // suggestion arrives in the same turn as the next question, and both were
  // shown together: "Roughly when did the situation... happen?" above "is
  // that right?", with one answer box between them. While the suggestion
  // waits, the question it arrived with is held back (its message, its help
  // and the answer box) and shown the moment the suggestion is answered.
  const suggestionFirst = !halted && Boolean(pendingSuggestion);
  const heldFrom = suggestionFirst ? unansweredQuestionStart(shownMessages, FIRST_QUESTION_INTRO) : shownMessages.length;

  return (
    <div>
      {asksForAdvice ? (
        <div className="mb-4">
          <LegalAdviceDeflection reason="legal-advice" />
        </div>
      ) : null}
      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4" style={{ minHeight: 220 }}>
        {readingOutdated ? (
          <div data-testid="guided-reading-outdated" className="text-sm text-[#5c4a14]">
            <p className="font-semibold">Your story has changed since it was last read.</p>
            <p className="mt-1">The answers read from your earlier story are set aside, so nothing here reflects the old version.</p>
            <button type="button" onClick={startAgainFromStory} className="mt-3 rounded-xl bg-[#2f7d67] px-4 py-2 font-semibold text-white">Start the questions again from my story</button>
          </div>
        ) : !started && showSavedStory && story.trim() ? (
          <div data-testid="guided-saved-story" className="text-sm">
            <p className="font-semibold text-[#16302b]">Your story</p>
            <p className="mt-1 whitespace-pre-wrap text-[#2b4640]">{story}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <WorkingButton data-testid="guided-send-saved-story" working={loading} workingLabel="Reading your story…" onClick={handleStorySubmit} className="rounded-xl bg-[#2f7d67] px-4 py-2 font-semibold text-white disabled:opacity-50">Send my story</WorkingButton>
              <button type="button" onClick={() => setShowSavedStory(false)} className="rounded-xl border border-[#d8e6df] px-4 py-2 font-semibold text-[#2f7d67]">Edit my story</button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#5a736a]">
            Send your story below to get started. CourtSimplified will ask follow-up questions one at
            a time.
          </p>
        ) : (
          shownMessages.slice(0, heldFrom).map((message, index) => (
            <div
              key={index}
              className="mb-3"
              data-testid="guided-message"
              data-from={message.from}
              data-question-id={message.questionId}
              style={{ textAlign: message.from === "user" ? "right" : "left" }}
            >
              <div
                className="inline-block rounded-2xl px-4 py-2 text-sm"
                style={{
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                  background: message.from === "user" ? "#16302b" : "#ffffff",
                  color: message.from === "user" ? "#ffffff" : "#16302b",
                  border: message.from === "user" ? "none" : "1px solid #d8e6df",
                }}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>

      {!halted && !readingOutdated && proposalDrafts && !pendingSuggestion ? (
        <div
          data-testid="story-proposals"
          className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-4 text-sm text-[#16302b]"
        >
          <p className="flex items-center gap-2 font-semibold">
            Here&apos;s what I understood
            <span className="rounded-full bg-[#eef6f2] px-2 py-0.5 text-xs font-semibold text-[#2f7d67]">
              AI suggestion
            </span>
          </p>
          <p className="mt-1 text-xs text-[#5a736a]">
            Suggested by AI from your own words. Nothing is saved until you confirm.
          </p>
          <div className="mt-3 space-y-3">
            {proposalDrafts.map((draft, index) => (sameDayAs(proposalDrafts)[index] >= 0 ? null : (
              <div key={draft.questionId} data-testid="story-proposal-row" data-question-id={draft.questionId} className="rounded-xl border border-[#d8e6df] p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    disabled={loading}
                    checked={draft.keep}
                    onChange={(event) => updateProposalDraft(index, { keep: event.target.checked })}
                    className="mt-1"
                  />
                  <span className="font-semibold">{cardLabel(draft.questionId, draft.questionText, { responding: respondingFromAnswers([...earlierAnswers, ...proposalDrafts], facts) })}</span>
                </label>
                {draft.choices && draft.choices.length > 0 ? (
                  <select
                    value={draft.answer}
                    disabled={loading || !draft.keep}
                    onChange={(event) => updateProposalDraft(index, { answer: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-[#d8e6df] px-3 py-2 disabled:opacity-50"
                  >
                    {draft.choices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={draft.answer}
                    disabled={loading || !draft.keep}
                    onChange={(event) => updateProposalDraft(index, { answer: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-[#d8e6df] px-3 py-2 disabled:opacity-50"
                  />
                )}
                <p className="mt-1 text-xs text-[#6b8078]">From your story: &ldquo;{draft.storyQuote}&rdquo;</p>
                {proposalDrafts.some((_, other) => sameDayAs(proposalDrafts)[other] === index) ? (
                  <p data-testid="story-proposal-also" className="mt-1 text-xs text-[#6b8078]">
                    Also kept as{" "}
                    {proposalDrafts
                      .filter((_, other) => sameDayAs(proposalDrafts)[other] === index)
                      .map((other) => cardLabel(other.questionId, other.questionText, { responding: respondingFromAnswers([...earlierAnswers, ...proposalDrafts], facts) }).toLowerCase())
                      .join(" and ")}
                    .
                  </p>
                ) : null}
              </div>
            )))}
          </div>
          <WorkingNote working={loading}>Saving what you confirmed and finding the next question…</WorkingNote>
          <WorkingButton
            data-testid="story-proposals-continue"
            working={loading}
            workingLabel="Working on it…"
            onClick={handleConfirmProposals}
            className="mt-4 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Looks right, continue
          </WorkingButton>
        </div>
      ) : null}

      {!halted && !readingOutdated && currentQuestion && !suggestionFirst ? (
        <QuestionHelp key={currentQuestion.id} question={currentQuestion} />
      ) : null}

      {/* One at a time (page review, 2026-10-07: "What kind of dispute is this?" and this box asked at
          once), and the kind first: it is the finer question, and once confirmed the story card does not
          ask "What it's about" again (26 Oct re-test, case 19). Turned down, the card asks it as before. */}
      {!halted && !readingOutdated && pendingSuggestion ? (
        <div data-testid="claim-type-suggestion" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-[#4a3b12]">
          <p className="font-semibold text-[#3a2e0e]">
            This sounds like it may be about: {pendingSuggestion.claimTypeName} — is that right?
          </p>
          {pendingSuggestion.quote ? (
            <p data-testid="claim-type-quote" className="mt-1 text-xs text-[#6b5a26]">
              From your story: &ldquo;{pendingSuggestion.quote}&rdquo;
            </p>
          ) : null}
          <p data-testid="claim-type-why" className="mt-1 text-xs text-[#6b5a26]">
            <span className="font-semibold">Why we ask: </span>
            knowing what kind of matter this is lets us pick the follow-up questions, general
            information and draft forms that fit it.
          </p>
          <p className="mt-1 text-xs text-[#6b5a26]">
            AI suggestion only, not a determination of your case -- nothing is applied until you confirm it.
          </p>
          <WorkingNote working={resolvingSuggestion}>Saving your answer about the kind of claim…</WorkingNote>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={resolvingSuggestion}
              onClick={() => void resolveSuggestion("confirm")}
              className="rounded-full bg-[#2f7d67] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Yes, that&apos;s right
            </button>
            <button
              type="button"
              disabled={resolvingSuggestion}
              onClick={() => void resolveSuggestion("reject")}
              className="rounded-full border border-[#c9b26a] bg-white px-4 py-2 text-xs font-bold text-[#4a3b12] disabled:opacity-60"
            >
              No, not that one
            </button>
            {/* Now that the next question waits on this one, there has to be a
                way past it that applies nothing (suggest, never decide). */}
            <button
              type="button"
              disabled={resolvingSuggestion}
              onClick={() => {
                setPendingSuggestion(null);
                setRejectedSuggestionIds([]);
              }}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#4a3b12] underline disabled:opacity-60"
            >
              Not sure, skip this
            </button>
          </div>
        </div>
      ) : null}

      {!halted && !pendingSuggestion && noClaimTypeMatch ? (
        <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#4d675f]">
          We don&apos;t have a specific match for this kind of situation yet. You can keep going with the
          questions below -- this only affects the extra claim-type-specific guidance shown here, not the
          rest of your intake.
        </div>
      ) : null}

      {/*
        The education panels used to render HERE — between the question and the
        input — and appeared from the moment the user confirmed a claim type,
        on every turn thereafter. That put ~840 words of general information in
        front of the answer box for someone who may know nothing about the
        process. They now render BELOW the input; see GuidanceDisclosure.
      */}

      {error ? <p className="mt-3 text-sm font-semibold text-[#a63b3b]" data-testid="guided-error">{error}{reviewNeeded ? <>{" "}<button type="button" data-testid="guided-go-to-review" onClick={() => document.querySelector<HTMLElement>("[data-testid=\"intake-review\"]")?.scrollIntoView({ block: "start" })} className="underline">Go to your initial case information</button></> : null}{signInNeeded ? <>{" "}<a href="/login" data-testid="guided-sign-in" onClick={(event) => { event.preventDefault(); startSignIn(); }} className="underline">Sign in or create a free account (what you entered comes with you)</a></> : null}</p> : null}

      {/*
        2026-10-16 live bug: "Guided intake complete." rendered mid-flow, in
        the gap between the generic phase ending (intakeComplete set true,
        synchronously) and the claim-type depth phase actually starting
        (depthActive set true only after its network round-trip resolves,
        startDepthPhase below). That round-trip yields control back to the
        browser, so React commits a real render in between with
        intakeComplete true and depthActive still false -- exactly what this
        guard was keying on. `loading` is the one flag already true for that
        whole window (set at the top of startDepthPhase, before its await),
        so adding it here keeps the input area (and its Send button)
        showing through the gap instead of a premature "complete" label.
      */}
      {readingOutdated || (!started && showSavedStory && story.trim()) ? null : !halted && (proposalDrafts || suggestionFirst) ? null : !halted && (!intakeComplete || depthActive || loading) ? (
        <div className="mt-4">
        {/* Before any question, this box takes the story: it shows the one story guidance
            (copy/storyGuidance.ts) instead of a placeholder of its own (owner, 30 Oct). */}
        {!(depthActive || currentQuestion) ? <StoryGuidance id="guided-story-guidance" className="mb-2" /> : null}
        <div className="flex gap-2">
          <textarea
            // Keyed to the question actually on screen, the same fix already
            // applied to QuestionHelp just below (`key={currentQuestion.id}`,
            // "resets why/examples panel per question"). This input had no
            // such key: `inputText` is cleared on submit, but that clear and
            // the next question's arrival are two separate state updates, so
            // a render in between could show the next question with the
            // previous answer still in the box. Remounting on question change
            // forces them back in sync. Found 2026-10-15, live testing: the
            // answer box carried the prior question's typed text at least
            // twice (the $5,000-split question, then "do you still have pain").
            key={depthActive ? depthQuestions[depthIndex]?.id : currentQuestion?.id}
            value={inputText}
            disabled={loading}
            onChange={(event) => setInputText(event.target.value)}
            placeholder={depthActive || currentQuestion ? "Your answer..." : undefined}
            aria-label={depthActive || currentQuestion ? undefined : STORY_LABEL}
            aria-describedby={depthActive || currentQuestion ? undefined : "guided-story-guidance"}
            className="min-h-12 flex-1 rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <WorkingButton
            disabled={!inputText.trim()}
            working={loading}
            workingLabel="Sending…"
            onClick={handleSend}
            className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </WorkingButton>
        </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#4d675f]">
            {halted ? "Intake stopped here." : "Guided intake complete."}
          </p>
          {/*
            2026-10-16 live bug: once intake is marked complete and the depth
            phase is no longer active, this was the ONLY thing rendered here --
            a static line, no button. If onComplete above never actually fired
            (completionPayload missing, a save error, anything), the user was
            stuck on this exact screen with nothing to click. This button is
            the escape hatch: it is always available once intake is complete
            and not currently loading, and re-runs the same finish path, which
            by now reads committed state rather than whatever was in flight
            the first time.
          */}
          {!halted && !loading ? (<>
            <button
              type="button"
              onClick={() => { pressedContinue(); finishDepthPhase(depthStateMap); }}
              className="mt-3 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
            >
              Continue to your next steps
            </button>
            <ReviewNeededNotice from="guided" />
          </>) : null}
        </div>
      )}

      {depthActive ? (
        <div className="mt-3 flex items-center gap-3">
          {/* Held while a turn runs; the Send button beside it says what is working (fresh review, 28 Oct). */}
          <button
            type="button"
            onClick={handleSkipDepth}
            disabled={loading}
            className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#4d675f] disabled:opacity-50"
          >
            Skip these questions
          </button>
          <span className="text-xs text-[#6b8078]">
            Question {depthIndex + 1} of {depthQuestions.length}. Answering is optional — if you
            don&apos;t know, say so and we&apos;ll record that.
          </span>
        </div>
      ) : null}

      {!halted && heldPayload ? (
        <div className="mt-4">
          {/* The 10-day notice to a municipality comes before any question (round 4 review, 2026-10-14). */}
          <MunicipalNoticeFirst story={storyRef.current} city={location?.city ?? ""} />
          <SourcedQuestionsCard
            state={sourced.state}
            questions={sourced.questions}
            answers={sourced.answers}
            setAnswer={sourced.setAnswer}
          />
          <button
            type="button"
            onClick={() => { pressedContinue(); releaseHeld(); }}
            className="mt-3 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
          >
            {sourced.state === "loading" ? "Skip and continue" : "Continue to your next steps"}
          </button>
          <ReviewNeededNotice from="guided" />
        </div>
      ) : null}

      {!halted && intakeConfirmed ? (
        <GuidanceDisclosure
          evidenceGuidance={evidenceGuidance}
          claimGuidance={claimGuidance}
          // Same in-flight gap as the input-area guard above: expand only
          // once the depth phase is either active or genuinely not coming
          // (loading covers the window between the generic phase ending and
          // depthActive flipping true).
          intakeComplete={intakeComplete && !depthActive && !loading}
        />
      ) : null}
    </div>
  );
}
