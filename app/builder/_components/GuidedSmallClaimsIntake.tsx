"use client";

/**
 * Guided Small Claims intake -- one question at a time, answered through a
 * chat-style conversation, powered by /api/intake/guided-turn (the real
 * QUESTION_BANK, no devPreview flag). This is a separate, lighter-weight
 * path from SmallClaimsIntake.tsx's structured form: it collects facts
 * conversationally and does not produce an AnalysisResult, so it does not
 * feed into the builder's case-save/analysis pipeline the form path uses.
 */

import { useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";

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

type MatchedClaimType = { claimTypeId: string; claimTypeName: string };

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
};

type ChatMessage = { from: "user" | "assistant"; text: string };

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
  const [showWhy, setShowWhy] = useState(false);

  if (!question?.why) return null;

  return (
    <div className="mt-2 text-xs leading-5">
      <button
        type="button"
        onClick={() => setShowWhy((current) => !current)}
        className="font-semibold text-[#2f7d67] underline"
      >
        Why does this matter?
      </button>

      {showWhy ? (
        <p className="mt-1 text-[#4d675f]">
          {question.why}
          {question.sourceUrl ? (
            <>
              {" "}
              <a href={question.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                Source
              </a>
            </>
          ) : null}
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
};

export default function GuidedSmallClaimsIntake({ initialStory, onComplete }: Props) {
  const [facts, setFacts] = useState<IntakeFacts>({});
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState(initialStory || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [halted, setHalted] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [started, setStarted] = useState(false);
  // Retained across turns rather than replaced with each response -- only
  // updated when a turn actually carries a new evidenceGuidance, so it
  // doesn't disappear the moment the user answers a plain multiple-choice
  // question with no new free text (see GuidedTurnResult.evidenceGuidance).
  const [evidenceGuidance, setEvidenceGuidance] = useState<EvidenceGuidance | null>(null);
  // Same retain-the-last-value pattern as evidenceGuidance -- claimGuidance
  // is turn-scoped server-side too (see GuidedTurnResult.claimGuidance).
  const [claimGuidance, setClaimGuidance] = useState<ClaimGuidance | null>(null);
  // Same retain-the-last-value pattern as evidenceGuidance -- matchedClaimTypes
  // is turn-scoped server-side, so this is what makes a matched claim type
  // survive to the completion callback even when the LAST turn's text
  // didn't itself re-match one.
  const [matchedClaimType, setMatchedClaimType] = useState<MatchedClaimType | null>(null);
  // Session 37 -- an AI-suggested claim type awaiting explicit user
  // confirmation (see suggestedClaimType on GuidedTurnResult). Never fed
  // into matchedClaimType, evidenceGuidance, or claimGuidance until the
  // user says yes via handleConfirmSuggestion below.
  const [pendingSuggestion, setPendingSuggestion] = useState<MatchedClaimType | null>(null);
  // The exact story text the pending suggestion was classified from --
  // confirming/rejecting re-uses this same text rather than re-sending
  // whatever the user has typed since.
  const [suggestionStoryText, setSuggestionStoryText] = useState("");
  // Ids already rejected in this suggestion cycle -- capped at one retry,
  // enforced server-side too (claimTypeSuggestionResolution.ts).
  const [rejectedSuggestionIds, setRejectedSuggestionIds] = useState<string[]>([]);
  const [resolvingSuggestion, setResolvingSuggestion] = useState(false);
  const [noClaimTypeMatch, setNoClaimTypeMatch] = useState(false);

  // --- Claim-type depth phase (docs/CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md) ---
  //
  // Runs after general intake completes, and ONLY on a confirmed claim type.
  // `matchedClaimType` is exactly that: it is set by an exact matchClaimType
  // hit, and also by resolveSuggestion("confirm") below. Both paths are
  // "confirmed"; an unconfirmed pendingSuggestion never reaches it.
  //
  // Skippable at any point (design section 7): the phase improves draft
  // quality, it is not a prerequisite, and a skipper still reaches a draft.
  const [depthQuestions, setDepthQuestions] = useState<DepthClientQuestion[]>([]);
  const [depthIndex, setDepthIndex] = useState(0);
  const [depthStateMap, setDepthStateMap] = useState<Record<string, unknown> | null>(null);
  const [depthActive, setDepthActive] = useState(false);
  // Retained so onComplete fires with the same facts/answeredIds the
  // completing turn produced, rather than whatever state has become since.
  const [completionPayload, setCompletionPayload] = useState<GuidedIntakeCompletionResult | null>(null);

  async function sendTurn(
    newStoryText: string | undefined,
    newAnsweredIds: string[],
    nextFacts: IntakeFacts,
    answeredQuestionId?: string,
  ) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/intake/guided-turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ facts: nextFacts, answeredIds: newAnsweredIds, newStoryText, answeredQuestionId }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError(json.error || "That didn't go through. Please try again.");
        setLoading(false);
        return;
      }

      const result: GuidedTurnResult = json.result;
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
      const matchedClaimTypeThisTurn: MatchedClaimType | null = freshMatch
        ? { claimTypeId: freshMatch.id, claimTypeName: freshMatch.name }
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

      if (result.intakeComplete || !result.nextQuestion) {
        setIntakeComplete(true);
        setMessages((current) => [
          ...current,
          {
            from: "assistant",
            text: "That's everything needed for now. You can review what you've entered, or continue to the next step whenever you're ready.",
          },
        ]);
        setCurrentQuestion(null);
        setLoading(false);

        const payload: GuidedIntakeCompletionResult = {
          facts: result.facts,
          answeredIds: result.answeredIds,
          matchedClaimType: matchedClaimTypeThisTurn,
        };

        // Depth phase runs only on a CONFIRMED claim type. Without one there
        // is nothing to go deeper on, so completion is immediate — exactly
        // today's behaviour.
        if (matchedClaimTypeThisTurn) {
          setCompletionPayload(payload);
          void startDepthPhase(matchedClaimTypeThisTurn.claimTypeId, result.facts);
        } else {
          onComplete?.(payload);
        }
        return;
      }

      const displayText = [result.voiceTurn?.leadIn, result.voiceTurn?.questionText ?? result.nextQuestion.text]
        .filter(Boolean)
        .join("\n\n");
      setMessages((current) => [...current, { from: "assistant", text: displayText }]);
      setCurrentQuestion(result.nextQuestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Session 37. Resolves pendingSuggestion via /api/intake/classify-claim-type
  // -- confirm accepts it as the real matched claim type (computing
  // evidenceGuidance/claimGuidance for the first time, same as an exact
  // match already does); reject asks for one AI-assisted retry, excluding
  // the rejected id, and gives up honestly after that (see
  // claimTypeSuggestionResolution.ts).
  async function resolveSuggestion(action: "confirm" | "reject") {
    if (!pendingSuggestion) return;
    setResolvingSuggestion(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/intake/classify-claim-type", {
        method: "POST",
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
      if (!response.ok || !json.ok) {
        setError(json.error || "That didn't go through. Please try again.");
        return;
      }

      const result = json.result as
        | { outcome: "confirmed"; claimType: MatchedClaimType; evidenceGuidance: EvidenceGuidance; claimGuidance: ClaimGuidance }
        | { outcome: "revised"; suggestedClaimType: MatchedClaimType }
        | { outcome: "no-match" };

      if (result.outcome === "confirmed") {
        setMatchedClaimType(result.claimType);
        setEvidenceGuidance(result.evidenceGuidance);
        setClaimGuidance(result.claimGuidance);
        setPendingSuggestion(null);
        setRejectedSuggestionIds([]);
      } else if (result.outcome === "revised") {
        setRejectedSuggestionIds((current) => [...current, pendingSuggestion.claimTypeId]);
        setPendingSuggestion(result.suggestedClaimType);
      } else {
        setPendingSuggestion(null);
        setRejectedSuggestionIds([]);
        setNoClaimTypeMatch(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResolvingSuggestion(false);
    }
  }

  function handleStorySubmit() {
    if (!inputText.trim()) return;
    setStarted(true);
    setMessages((current) => [...current, { from: "user", text: inputText }]);
    const story = inputText;
    setInputText("");
    void sendTurn(story, answeredIds, facts);
  }

  function handleAnswerSubmit() {
    if (!currentQuestion) return;
    const answerText = inputText.trim();
    if (answerText) {
      setMessages((current) => [...current, { from: "user", text: answerText }]);
    }
    const nextAnsweredIds = [...answeredIds, currentQuestion.id];
    setInputText("");
    void sendTurn(answerText || undefined, nextAnsweredIds, facts, currentQuestion.id);
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
      ...messages.filter((message) => message.from === "user").map((message) => message.text),
      ...fields
        .map((field) => currentFacts[field as keyof IntakeFacts])
        .filter((value): value is string => typeof value === "string"),
    ].filter((text) => text.trim().length > 0);
  }

  async function callDepthTurn(
    claimTypeId: string,
    currentFacts: IntakeFacts,
    answered?: { questionId: string; answerText: string },
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/intake/depth-turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      }),
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "That didn't go through. Please try again.");
    }

    return json.result as {
      questions: DepthClientQuestion[];
      stateMap: Record<string, unknown>;
      leadIn: string | null;
      halted: boolean;
      haltMessage?: string;
    };
  }

  async function startDepthPhase(claimTypeId: string, currentFacts: IntakeFacts) {
    setLoading(true);
    try {
      const result = await callDepthTurn(claimTypeId, currentFacts);
      setDepthStateMap(result.stateMap);

      // A well-covered story suppresses everything. That is the filter working,
      // not a failure — finish immediately rather than announcing a phase with
      // nothing in it.
      if (result.questions.length === 0) {
        finishDepthPhase(result.stateMap);
        return;
      }

      setDepthQuestions(result.questions);
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
        { from: "assistant", text: result.questions[0].text },
      ]);
    } catch (err) {
      // A depth failure must never strand the user short of a draft.
      setError(err instanceof Error ? err.message : "Could not load the detailed questions.");
      finishDepthPhase(depthStateMap);
    } finally {
      setLoading(false);
    }
  }

  function finishDepthPhase(stateMap: Record<string, unknown> | null) {
    setDepthActive(false);
    const payload = completionPayload;
    if (payload) {
      onComplete?.({ ...payload, elementStateMap: stateMap || undefined });
    }
  }

  function handleDepthAnswerSubmit() {
    const question = depthQuestions[depthIndex];
    if (!question || !completionPayload?.matchedClaimType) return;

    const answerText = inputText.trim();
    if (answerText) {
      setMessages((current) => [...current, { from: "user", text: answerText }]);
    }
    setInputText("");
    setLoading(true);

    void (async () => {
      try {
        const result = await callDepthTurn(
          completionPayload.matchedClaimType!.claimTypeId,
          completionPayload.facts,
          { questionId: question.id, answerText },
        );
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
            { from: "assistant", text: "That's everything. You can continue to the next step." },
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
          { from: "assistant" as const, text: next.text },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't go through. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }

  function handleSkipDepth() {
    setMessages((current) => [
      ...current,
      { from: "assistant", text: "No problem — skipping the rest of these." },
    ]);
    finishDepthPhase(depthStateMap);
  }

  function handleSend() {
    if (!started) handleStorySubmit();
    else if (depthActive) handleDepthAnswerSubmit();
    else if (currentQuestion) handleAnswerSubmit();
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4" style={{ minHeight: 220 }}>
        {messages.length === 0 ? (
          <p className="text-sm text-[#5a736a]">
            Describe what happened in your own words below to get started. CourtSimplified will ask
            follow-up questions one at a time.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className="mb-3"
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

      {!halted && currentQuestion ? (
        <QuestionHelp key={currentQuestion.id} question={currentQuestion} />
      ) : null}

      {!halted && pendingSuggestion ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-[#4a3b12]">
          <p className="font-semibold text-[#3a2e0e]">
            This sounds like it may be about: {pendingSuggestion.claimTypeName} — is that right?
          </p>
          <p className="mt-1 text-xs text-[#6b5a26]">
            This is a suggestion only, not a determination of your case -- nothing is applied until you confirm it.
          </p>
          <div className="mt-3 flex gap-2">
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
              {resolvingSuggestion ? "..." : "No, not that one"}
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

      {error ? <p className="mt-3 text-sm font-semibold text-[#a63b3b]">{error}</p> : null}

      {!halted && (!intakeComplete || depthActive) ? (
        <div className="mt-4 flex gap-2">
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder={
              depthActive || currentQuestion ? "Your answer..." : "Tell us what happened..."
            }
            className="min-h-12 flex-1 rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            disabled={loading || !inputText.trim()}
            onClick={handleSend}
            className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-[#4d675f]">
          {halted ? "Intake stopped here." : "Guided intake complete."}
        </p>
      )}

      {depthActive ? (
        <div className="mt-3 flex items-center gap-3">
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

      {!halted ? (
        <GuidanceDisclosure
          evidenceGuidance={evidenceGuidance}
          claimGuidance={claimGuidance}
          intakeComplete={intakeComplete && !depthActive}
        />
      ) : null}
    </div>
  );
}
