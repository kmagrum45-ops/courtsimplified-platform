"use client";

import { dateAnswerCheck, dateSpans } from "../../../src/lib/case-system/dates";
import { usePrepareCaseGuidance, intakeGuidanceHeaders, useIntakeRecovery, useIntakeState, useInputWithStory, useContinueHandler, useBeforeIntakeAI, useValidateIntakeResponse, useSituation } from "../../_components/IntakeRecovery";
import { situationAnswers } from "../../../src/lib/case-system/situation/situation";
import { panelAnswerFacts } from "../../../src/lib/case-system/intakeReview";
import AnalysisProgress, { ANALYSIS_TIMEOUT_MS } from "./AnalysisProgress";
import StoryChangedNotice, { useStoryAnswersOutdated } from "../../_components/StoryChangedNotice";
import ReviewNeededNotice from "../../_components/ReviewNeededNotice";
import StoryEditor from "./StoryEditor";

import { IntakeRequest } from "../../_components/intakeRequest";

import TidyWordingReview from "./TidyWordingReview";

import SignInForSafetyCheck from "./SignInForSafetyCheck";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
} from "./builderTypes";

import type {
  SmallClaimsEvidenceFile,
  SmallClaimsFiledDocument,
  SmallClaimsIntelligenceInput,
  SmallClaimsIntelligenceOutput,
  SmallClaimsIssue,
} from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

import { supabase } from "../../../src/lib/supabase/client";
import { runClientSafetyCheck } from "../../../src/lib/case-system/intake/clientSafetyCheck";
import LegalAdviceDeflection from "../../_components/LegalAdviceDeflection";
import {
  assignReferences,
  describeFileType,
  evidenceFileId,
  readSelectedFiles,
} from "../../../src/lib/case-system/evidence/evidenceReference";
import EvidenceFileNotice from "../../_components/EvidenceFileNotice";
import {
  explanationFor,
  GENERIC_FALLBACK,
} from "../../../src/lib/content-library/questionExplanations";
import { UUID_PATTERN } from "../../../src/lib/case-system/events/caseEventRequest";
import {
  extractNarrativePrefill,
  type NarrativePrefillFact,
} from "../../../src/lib/case-system/intelligence/narrativePrefill";
import {
  QUESTION_BANK,
  type IntakeQuestion,
} from "../../../src/lib/case-system/intake/questionBank";
import { publicSourceUrl } from "../../../src/lib/content-library/publicSourceUrl";
import { CLAIM_TYPES } from "../../../src/lib/case-system/intake/claimTypes";
import { kindFromStory } from "../../../src/lib/case-system/intake/claimKind";

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
  location: { province: "Ontario"; city: string };
  initialStory: string;
  /** The case's stored entries, when the person comes back to update it (caseRecord.storedIntakeValues). */
  storedValues?: Record<string, string | string[]>;
};

export type SmallClaimsAnalysisResponse = {
  ok: boolean;
  result?: SmallClaimsIntelligenceOutput;
  reasoningMode?: "structured-ai" | "deterministic-fallback";
  analysisAvailable?: boolean;
  authenticated?: boolean;
  error?: string;
};

const filedOptions: { value: SmallClaimsFiledDocument; label: string }[] = [
  { value: "nothing", label: "Nothing filed yet" },
  { value: "plaintiffs-claim", label: "Plaintiff’s Claim already filed / served" },
  { value: "defence", label: "Defence already filed / received" },
  { value: "affidavit-service", label: "Affidavit of Service filed with the court" },
  { value: "offer-settle", label: "Offer to Settle prepared" },
  { value: "settlement-conference", label: "Settlement conference scheduled or completed" },
  { value: "default-judgment", label: "Default judgment step started" },
  { value: "witness-list", label: "Witness list prepared" },
  { value: "enforcement-documents", label: "Enforcement documents started" },
  { value: "not-sure", label: "Not sure" },
];

const evidenceCategoryOptions = [
  "Screenshots / messages",
  "Social media posts",
  "Emails",
  "Witness / recipient information",
  "Reputation / harm proof",
  "Payment / financial proof",
  "Contract / agreement, only if relevant",
  "Photos / physical damage, only if relevant",
  "Court document",
  "Service / delivery proof",
  "Settlement discussion",
  "Other",
];

const defaultInput: SmallClaimsIntelligenceInput = {
  caseStage: "not-sure",
  issues: [],
  filedDocuments: ["nothing"],
  uploadedEvidenceFiles: [],

  yourName: "",
  yourAddress: "",
  yourCity: "",
  yourProvince: "",
  yourPostalCode: "",
  yourPhone: "",
  yourEmail: "",

  otherParty: "",
  otherPartyPhone: "",
  otherPartyEmail: "",

  yourRole: "Plaintiff / claimant",
  courtLocation: "",
  claimNumber: "",
  amountClaimed: "",
  defendantAddress: "",
  agreementDetails: "",
  paymentHistory: "",
  damagesBreakdown: "",
  serviceDetails: "",
  deadlineDetails: "",
  facts: "",
  timeline: "",
  evidence: "",
  missingEvidence: "",
  settlementEfforts: "",
  defenceResponse: "",
  goal: "",
  urgent: "",
};

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Shared by the initial useState (storedValues already in hand at mount)
 * and the late-arriving backfill effect below (storedValues lands after
 * mount, e.g. once app/builder/page.tsx's caseId-recovery effect adds
 * ?caseId= to the URL). Falls back to whatever `base` already has, never to
 * defaultInput's own blanks, so a late backfill can't erase something the
 * user already typed in the narrow window before it ran.
 */
function mergeStoredValuesIntoInput(
  base: SmallClaimsIntelligenceInput,
  values: Record<string, unknown>,
  fallbackFacts: string,
): SmallClaimsIntelligenceInput {
  return {
    ...base,
    facts: String(values.facts || fallbackFacts || base.facts || ""),
    yourName: String(values.yourName || base.yourName || ""),
    otherParty: String(values.otherParty || base.otherParty || ""),
    yourRole: String(values.yourRole || base.yourRole || ""),
    caseStage: values.caseStage ? (values.caseStage as UniversalStage) : base.caseStage,
    amountClaimed: String(values.amountClaimed || base.amountClaimed || ""),
    damagesBreakdown: String(values.damagesBreakdown || base.damagesBreakdown || ""),
    goal: String(values.goal || base.goal || ""),
    timeline: String(values.timeline || base.timeline || ""),
    evidence: String(values.evidence || base.evidence || ""),
    serviceDetails: String(values.serviceDetails || base.serviceDetails || ""),
    yourAddress: String(values.addressDetails || base.yourAddress || ""),
    yourEmail: String(values.yourEmail || base.yourEmail || ""),
    settlementEfforts: String(values.settlementEfforts || base.settlementEfforts || ""),
    urgent: String(values.urgent || base.urgent || ""),
    defenceResponse: String(
      values.enforcementDetails || values.existingOrderDetails || base.defenceResponse || "",
    ),
    filedDocuments: Array.isArray(values.documentStatus)
      ? (values.documentStatus as SmallClaimsIntelligenceInput["filedDocuments"])
      : base.filedDocuments,
    // 2026-10-16 live bug: a claim type the guided route already confirmed
    // (saved to extra.confirmedClaimTypeId, now in storedIntakeValues' own
    // allow-list) never carried into the form route at all -- never merged
    // here, so "kind of claim not clear yet" showed even for a saved case
    // that already had one.
    ...(values.confirmedClaimTypeId || base.confirmedClaimTypeId
      ? { confirmedClaimTypeId: String(values.confirmedClaimTypeId || base.confirmedClaimTypeId) }
      : {}),
  };
}

// Session 15 -- Tier 1/Tier 2 field help. Looked up once from the real,
// reviewed QUESTION_BANK -- never new content, never edited here. Only
// fields with a clean, unambiguous correspondence to one of these get the
// help affordance; see the session report for the fields that don't
// (either no questionBank entry at all, or a real mismatch not worth
// misattributing sourced text to the wrong control).
const ROLE_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-orient-role");
const AMOUNT_CLAIMED_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-amount-claimed");
const EVIDENCE_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-evidence-available");
const REMEDY_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-remedy-sought");
const CLAIM_FILED_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-claim-filed");
const DEFENDANT_SERVED_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-defendant-served");
const DEFENCE_FILED_QUESTION = QUESTION_BANK.find((question) => question.id === "sc-defence-filed");

/**
 * Tier 1 (free): shows the question's already-sourced `why`/sourceUrl on
 * click, when present -- no AI, no network, just existing content.
 *
 * Tier 2: "explain it" NO LONGER CALLS A MODEL (LSO Step 4).
 *
 * It used to POST to /api/intake/explain-question, which ran a model call with
 * no `response_format` and returned free-form prose that was rendered verbatim
 * (docs/lso-ai-audit.md finding B-7). The prompt was carefully written -- the
 * model got no user facts and was forbidden from adding rules, deadlines or
 * amounts -- but it was still generative text about a legal question, shown to
 * a user with no human review. Under the A2I policy that is not permitted
 * however well the prompt is written.
 *
 * The explanation now comes from src/lib/content-library/questionExplanations.ts,
 * which derives it from the question's own existing `why` text. Nothing new was
 * authored, and there is no network call at all -- so the button is also
 * instant and works offline.
 *
 * Where a question has no `why`, there is no reviewed explanation, and the
 * GENERIC_FALLBACK shows instead: a deliberately non-legal sentence that says
 * nothing about law, procedure or the user's situation.
 */
function FieldHelp({ question }: { question?: IntakeQuestion }) {
  const [showWhy, setShowWhy] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  if (!question) return null;

  function handleExplain() {
    if (explanation) return;
    const reviewed = explanationFor(question!.id);
    setExplanation(reviewed ? reviewed.text : GENERIC_FALLBACK);
  }

  return (
    <div className="mt-1 text-xs leading-5">
      {question.why ? (
        <button
          type="button"
          onClick={() => setShowWhy((current) => !current)}
          className="mr-3 font-semibold text-[#2f7d67] underline"
        >
          Why does this matter?
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleExplain}
        disabled={Boolean(explanation)}
        className="font-semibold text-[#2f7d67] underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {"I don't understand this — explain it"}
      </button>

      {showWhy && question.why ? (
        <p className="mt-1 text-[#4d675f]">
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
      ) : null}

      {explanation ? <p className="mt-1 text-[#4d675f]">{explanation}</p> : null}
    </div>
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function toggleArrayValue<T extends string>(items: T[], value: T): T[] {
  if (value === "nothing") return items.includes(value) ? [] : [value];
  if (value === "not-sure") return items.includes(value) ? [] : [value];

  const cleaned = items.filter(
    (item) => item !== "nothing" && item !== "not-sure",
  );

  return cleaned.includes(value)
    ? cleaned.filter((item) => item !== value)
    : [...cleaned, value];
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function inferIssuesFromStory(input: SmallClaimsIntelligenceInput): SmallClaimsIssue[] {
  const text = normalizeText(
    [
      input.yourRole,
      input.facts,
      input.timeline,
      input.evidence,
      input.missingEvidence,
      input.goal,
      input.damagesBreakdown,
      input.urgent,
    ].join(" "),
  );

  const issues: SmallClaimsIssue[] = [];

  // Walkthrough, 2026-10-04: an unpaid invoice was labelled "harmful
  // communications/harassment" because the user sent reminder TEXTS and
  // EMAILS. How people communicate is not what the dispute is about, so the
  // medium words ("messages", "texts", "email", "posted", "spread") are gone;
  // only words that name the harm itself remain.
  if (
    text.includes("defamation") ||
    text.includes("defamed") ||
    text.includes("reputation") ||
    text.includes("false statement") ||
    text.includes("slander") ||
    text.includes("libel") ||
    text.includes("rumor") ||
    text.includes("rumour") ||
    text.includes("lies about me")
  ) {
    issues.push("defamation-reputation");
  }

  if (
    text.includes("harass") ||
    text.includes("threat") ||
    text.includes("intimidat") ||
    text.includes("stalk")
  ) {
    issues.push("harassment-communications");
  }

  if (
    text.includes("unpaid") ||
    text.includes("owed") ||
    text.includes("invoice") ||
    text.includes("loan") ||
    text.includes("debt")
  ) {
    issues.push("unpaid-money");
  }

  if (
    text.includes("contract") ||
    text.includes("agreement") ||
    text.includes("quote") ||
    text.includes("renovation") ||
    text.includes("service")
  ) {
    issues.push("contract-dispute");
  }

  if (
    text.includes("damaged") ||
    text.includes("repair") ||
    text.includes("vehicle") ||
    text.includes("property damage")
  ) {
    issues.push("property-damage");
  }

  if (
    text.includes("served with a claim") ||
    text.includes("defending") ||
    text.includes("defence") ||
    text.includes("defense") ||
    text.includes("i am defendant")
  ) {
    issues.push("defending-claim");
  }

  if (text.includes("settle") || text.includes("settlement")) {
    issues.push("settlement");
  }

  return Array.from(new Set(issues));
}

function inferStage(input: SmallClaimsIntelligenceInput): UniversalStage {
  if (input.caseStage !== "not-sure") return input.caseStage;

  const text = normalizeText(
    [input.yourRole, input.facts, input.serviceDetails, input.defenceResponse].join(" "),
  );

  if (input.filedDocuments.includes("settlement-conference")) return "conference";
  if (input.filedDocuments.includes("enforcement-documents")) return "enforcement";
  if (input.filedDocuments.includes("plaintiffs-claim")) return "already-started";

  // "i was served a plaintifs claim" (walkthrough, 2026-10-04) previewed as
  // "starting case": only "served with a claim" was recognised.
  const servedAsDefendant = /\b(i|we)\s+(was|were|have been|got|just got)\s+served\b/.test(text);
  if (
    input.filedDocuments.includes("defence") ||
    servedAsDefendant ||
    text.includes("served with a claim") ||
    text.includes("defendant") ||
    text.includes("responding") ||
    text.includes("defending")
  ) {
    return "responding";
  }

  return "starting-case";
}

function isDefendantRole(role: string | undefined): boolean {
  return /defendant|responding/i.test(role ?? "");
}

function buildMissingPrompt(input: SmallClaimsIntelligenceInput): string {
  const missing: string[] = [];

  if (!hasText(input.yourName)) missing.push("your legal name");
  if (!hasText(input.otherParty)) missing.push("the other party’s name");
  if (!hasText(input.defendantAddress)) missing.push("the other party’s address for service");
  if (!hasText(input.facts)) missing.push("the case story");
  // Dates and evidence already in the story count (page review, 2026-10-06:
  // "important dates" was asked for after "the papers came on September 25").
  const storyHasDate = dateSpans(input.facts).length > 0;
  if (!hasText(input.timeline) && !storyHasDate) missing.push("important dates");
  if (!hasText(input.evidence)) missing.push("what evidence you have");
  if (!hasText(input.amountClaimed)) missing.push(isDefendantRole(input.yourRole) ? "the amount the claim asks for" : "the amount claimed, if money is requested");
  if (!hasText(input.damagesBreakdown) && !isDefendantRole(input.yourRole)) missing.push("how the amount was calculated");

  if (!missing.length) {
    return "You have given enough to see your next steps. You can add more later.";
  }

  return `Still useful to add: ${missing.join(", ")}.`;
}

function buildCaseDirection(input: SmallClaimsIntelligenceInput): string {
  const issues = inferIssuesFromStory(input);
  const stage = inferStage(input);

  const labels: Record<SmallClaimsIssue, string> = {
    "unpaid-money": "unpaid money",
    "contract-dispute": "contract/agreement dispute",
    "property-damage": "property damage",
    "loan-or-debt": "loan/debt",
    "work-or-services": "work/services",
    "deposit-refund": "deposit/refund",
    "consumer-purchase": "consumer purchase",
    "vehicle-dispute": "vehicle dispute",
    "defamation-reputation": "defamation/reputational harm",
    "harassment-communications": "harmful communications/harassment",
    "defending-claim": "responding/defence",
    settlement: "settlement",
    enforcement: "enforcement",
    other: "other",
  };

  // Nothing is guessed before there is a story (page review, 2026-10-06: a
  // blank form read "Likely direction: starting case · not yet classified").
  if (!hasText(input.facts)) return "";
  // 2026-10-16 live bug: a claim type the guided route already confirmed
  // (now carried into `input` by mergeStoredValuesIntoInput above) is the
  // real answer, over the weaker generic-issue guesser below -- reopening a
  // saved case showed "kind of claim not clear yet" even when one had
  // already been settled.
  const confirmedClaimType = input.confirmedClaimTypeId
    ? CLAIM_TYPES.find((claimType) => claimType.id === input.confirmedClaimTypeId)
    : null;
  const issueText = confirmedClaimType
    ? confirmedClaimType.name
    : issues.length
      ? issues.map((issue) => labels[issue]).join(", ")
      : "kind of claim not clear yet";

  return `So far this looks like: ${stage.replace(/-/g, " ")} · ${issueText}`;
}


// SafetyCheckResponse was removed 2026-09-17. The route's response shape now
// lives with the one client that parses it,
// src/lib/case-system/intake/clientSafetyCheck.ts, rather than being restated
// per caller.

type SafetyCheckOutcome = {
  /** Step 6d: the user asked for legal advice rather than describing events. */
  requestsLegalAdvice?: boolean;
  halted: boolean;
  haltMessage?: string;
  distressAcknowledgment?: string;
};

/**
 * Session 17 -- the form's own path to the identical safety pass guided
 * mode already runs on every free-text turn: same runSafetyPass()
 * function, called server-side via /api/intake/safety-check, not
 * reimplemented here. `userMessage` in the response is always one of
 * safetyPass.ts's fixed constants (IMMEDIATE_DANGER_MESSAGE /
 * DISTRESS_ACKNOWLEDGMENT), never model-generated text.
 *
 * No fallback exists for a real safety classification (same reason
 * guided mode requires authentication unconditionally), so this function
 * still checks for a session itself and fails open if one is somehow
 * missing -- but as of Session 19, handleAnalyze() already blocks an
 * unauthenticated submission before this is ever called, so that branch
 * below is a defensive backstop, not the live guest path it used to be.
 * Any other technical failure (network error, non-ok response, malformed
 * body) also fails open: a legitimate submission is never blocked by a
 * technical hiccup, same philosophy as every other AI feature in this
 * codebase.
 */
async function runFormSafetyCheck(storyText: string): Promise<SafetyCheckOutcome> {
  /*
   * TWO CHANGES, 2026-09-17.
   *
   * 1. THE SESSION CHECK IS GONE. It returned `{ halted: false }` when no
   *    session existed -- silently skipping the safety check for anyone not
   *    signed in. The route now accepts anonymous callers, so the check runs
   *    for everyone. A bearer token is still sent when one exists; its
   *    absence no longer means no check.
   *
   * 2. THE FETCH IS GONE, replaced by the shared helper. This file held its
   *    own copy, which is why verifySafetyPassCoverage could not have been
   *    written honestly before: three copies of one fetch give a checker
   *    nothing to look for. One entry point is what makes the property
   *    checkable.
   */
  const {
    data: { session },
  } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));

  const result = await runClientSafetyCheck(storyText, session?.access_token);

  if (result.classification === "immediate-danger") {
    return { halted: true, haltMessage: result.userMessage, requestsLegalAdvice: result.requestsLegalAdvice };
  }
  if (result.classification === "distress") {
    return { halted: false, distressAcknowledgment: result.userMessage, requestsLegalAdvice: result.requestsLegalAdvice };
  }
  return { halted: false, requestsLegalAdvice: result.requestsLegalAdvice };
}

/**
 * Session 29: exported so builder/page.tsx can call the exact same
 * /api/small-claims/analyze request for guided intake's completion --
 * no second, parallel implementation of this call.
 */
export async function requestSmallClaimsAnalysis(
  input: SmallClaimsIntelligenceInput,
  /**
   * The selected case, when there is one. Sending it is what lets the analysis
   * see the events the user confirmed; without it the route has no case to
   * read them from and the run proceeds on intake answers alone, as it did
   * before confirmed events were wired in.
   */
  caseId?: string | null,
  signal?: AbortSignal,
  guidanceHeaders: Record<string, string> = {},
): Promise<SmallClaimsAnalysisResponse> {
  // Only a real case row id is sent. `masterCaseId` and similar in-memory ids
  // are not `cases.id` values, and sending one would earn a 400 that failed
  // the whole analysis over an optional enrichment.
  const sendCaseId = caseId && UUID_PATTERN.test(caseId) ? caseId : "";

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/small-claims/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...guidanceHeaders,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(sendCaseId ? { input, caseId: sendCaseId } : { input }),
    // Stops waiting just before the server's own limit, so a person is told
    // something rather than left on "Analyzing..." (2026-10-10, outside test).
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(290_000)]) : AbortSignal.timeout(290_000),
  }).catch((error: unknown) => {
    throw new Error(
      // The page stopping its wait (or the person pressing Stop) is not a network
      // failure: it read "could not reach the server" (#468 re-test).
      error instanceof Error && (error.name === "TimeoutError" || signal?.aborted)
        ? "This is taking longer than it should. Your answers are still here; please press the button to try again."
        : "CourtSimplified could not reach the server. Please check your connection and try again.",
    );
  });

  // A server that ran out of time answers with an HTML page, not JSON.
  const data = (await response.json().catch(() => ({}))) as SmallClaimsAnalysisResponse;

  if (!response.ok || !data.ok || !data.result) {
    throw new Error(
      data.error || "CourtSimplified could not analyze this intake.",
    );
  }

  return data;
}

export default function SmallClaimsIntake({ onComplete, location, initialStory, storedValues }: Props) {
  const beforeIntakeAI = useBeforeIntakeAI();
  const prepareCaseGuidance = usePrepareCaseGuidance();
  const recovery = useIntakeRecovery();
  const validateIntakeResponse = useValidateIntakeResponse();
  const [storedInput, setInput] = useInputWithStory<SmallClaimsIntelligenceInput>("small-claims", () => {
    // What the case already holds, under anything newly read from a story
    // (master plan Phase 1: "Update your story" opened a blank form).
    const values: Record<string, unknown> = {
      ...(storedValues ?? {}),
    };
    const merged = mergeStoredValuesIntoInput(
      { ...defaultInput, yourProvince: location.province, yourCity: location.city },
      values,
      initialStory,
    );
    // 2026-10-16 live bug: "Case stage" showed "Not sure" even when the
    // story plainly describes a dispute that hasn't gone to court yet --
    // inferStage() already works this out correctly, but was only ever
    // consulted at submission time (handleAnalyze below), never fed back
    // into what the select actually shows while the person is filling in
    // the form. Applying it here is a pre-filled SUGGESTION, same as any
    // other prefilled field: the select stays editable, and nothing here
    // is stored until the person submits or saves.
    return merged.caseStage === "not-sure" && hasText(merged.facts)
      ? { ...merged, caseStage: inferStage(merged) }
      : merged;
  });
  // The situation answers, given before the story (situation.ts), answer the side and what
  // has been filed: read from there, never asked again (step 2).
  const [situation] = useSituation();
  const fromStart = useMemo(() => situationAnswers("small-claims", situation), [situation]);
  const roleFromStart = fromStart.role === "defendant" ? "Defendant / responding party" : fromStart.role === "plaintiff" ? "Plaintiff / claimant" : null;
  const input: SmallClaimsIntelligenceInput = useMemo(() => {
    const ruledOut = new Set(fromStart.excludeDocuments ?? []);
    const documents = fromStart.documents?.includes("nothing")
      ? ["nothing"]
      : fromStart.documents
        ? [...new Set([...(storedInput.filedDocuments ?? []).filter((item) => item !== "nothing"), ...fromStart.documents])]
        : (storedInput.filedDocuments ?? []).filter((item) => !ruledOut.has(item));
    // A stage the situation answers settle; for a case already going, only a stage that is not "starting".
    const caseStage = fromStart.caseStage ?? (situation.where === "going" && storedInput.caseStage === "starting-case" ? "already-started" : storedInput.caseStage);
    return { ...storedInput, ...(roleFromStart ? { yourRole: roleFromStart } : {}), caseStage, filedDocuments: documents as SmallClaimsIntelligenceInput["filedDocuments"] };
  }, [storedInput, roleFromStart, fromStart.documents, fromStart.excludeDocuments, fromStart.caseStage, situation.where]);

  /*
   * The same "tab forgot its state" problem GuidedSmallClaimsIntake already
   * solved with its `previousTaken`/`!started` backfill: storedValues is
   * read above only in the initial useState initializer, so a caseId that
   * lands in the URL after this component already mounted (app/builder/
   * page.tsx's own caseId-recovery effect does exactly that for a reload on
   * ?step=form with no caseId yet) arrives one render too late for the
   * initializer to see it. storedValuesTaken mirrors previousTaken (already
   * had it at mount -> never re-apply); userEditedRef is this component's
   * own guard, since unlike the guided intake there's no single `started`
   * flag -- it flips true the moment any field is edited, so a stored value
   * that arrives late never overwrites something the user already typed in
   * the narrow window before it arrived. Added 2026-10-15, alongside the
   * matching fix to GuidedSmallClaimsIntake and app/builder/page.tsx's
   * caseId-recovery effect (which this backfill is what makes safe to
   * extend from step=guided to step=form).
   */
  const storedValuesTaken = useRef(Boolean(storedValues));
  const userEditedRef = useRef(false);
  useEffect(() => {
    if (storedValuesTaken.current || userEditedRef.current || !storedValues) return;
    storedValuesTaken.current = true;
    const values: Record<string, unknown> = { ...storedValues };
    setInput((current) => mergeStoredValuesIntoInput(current, values, ""));
  }, [setInput, storedValues]);

  // Starts open when there's no story yet to display (e.g. the pre-builder
  // gate no longer collects it for Small Claims) -- otherwise the user would
  // land on an empty "Case story" summary with no visible way to type into it
  // until they notice the "Edit case story" toggle.

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisRequest = useRef(new IntakeRequest());
  const requestScope = input;
  useEffect(() => {
    const request = analysisRequest.current;
    return () => request.cancel();
  }, [requestScope]);
  const [analysisError, setAnalysisError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [safetyHalted, setSafetyHalted] = useState(false);
  const [safetyHaltMessage, setSafetyHaltMessage] = useState("");
  const [distressAcknowledgment, setDistressAcknowledgment] = useState("");
  /** Step 6d: set when the safety pass reports the user asked for legal advice. */
  const [asksForAdvice, setAsksForAdvice] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  // Answers based on an earlier version of the story: no next step until the questions start again (storyBasis.ts).
  const storyChanged = useStoryAnswersOutdated();
  const [extractedFacts, setExtractedFacts] = useState<NarrativePrefillFact[]>(
    () => [],
  );

  const inferredDirection = useMemo(() => buildCaseDirection(input), [input]);
  const missingPrompt = useMemo(() => buildMissingPrompt(input), [input]);
  const inferredIssues = useMemo(() => inferIssuesFromStory(input), [input]);
  const inferredDisputeCategory = useMemo(() => {
    if (inferredIssues.includes("defamation-reputation")) return "defamation";
    if (inferredIssues.includes("work-or-services")) return "work-or-services";
    return undefined;
  }, [inferredIssues]);
  // 2026-10-16 live bug: typing a story directly into THIS form's "Case
  // story" box never extracted anything from it. extractNarrativePrefill
  // only ran for the AI chat partner's first message (CourtAssistantChat
  // .tsx), handed off through sessionStorage and consumed once at mount
  // (since removed: Part 3, stale-story audit item 4) -- a hand-off, not a
  // live extractor on the form's own story box. Someone who picked "fill in
  // the form yourself" and typed their story here directly had to re-type
  // the amount and dates they'd already written, even though the same
  // regex extraction that works for the chat path works just as well on
  // this text.
  //
  // Run once the person finishes editing the story (closes the toggle), not
  // on every keystroke. Limited to plain-string fields with no name/type
  // mismatch against NarrativePrefillFact.field (documentStatus ->
  // filedDocuments, addressDetails -> yourAddress, and the role/caseStage
  // facts are deliberately left out of this pass -- they need the same
  // array/union-safe handling mergeStoredValuesIntoInput already has, and
  // widening this fix to use that function would let a fresh extraction
  // silently overwrite something the person already typed by hand, since
  // mergeStoredValuesIntoInput's own `values.x || base.x` always prefers
  // the new value). Only fills a field that is still blank.
  const EXTRACTABLE_STORY_FIELDS = new Set([
    "amountClaimed",
    "timeline",
    "evidence",
    "settlementEfforts",
    "yourEmail",
    "goal",
    "otherParty",
    "yourName",
  ]);
  /*
   * "Save story" (StoryEditor): values this form read from the earlier story are
   * read again from the new one, rather than kept and set aside as answers to an
   * earlier story (which blocked Continue, #468 CI). A field the person typed is
   * left alone. Cleared first, so each re-read value is recorded under the new story.
   */
  function saveStory(text: string) {
    // Read from the story as it was (not this visit's list, which a reload empties).
    const fromStory = new Map(
      extractNarrativePrefill({ narrative: input.facts, courtPath: "small-claims" }).facts
        .filter((fact) => fact.state === "direct" && EXTRACTABLE_STORY_FIELDS.has(fact.field))
        .map((fact) => [fact.field, Array.isArray(fact.value) ? fact.value.join(", ") : fact.value]),
    );
    if (fromStory.size) {
      setInput((current) => {
        const next = { ...current } as Record<string, unknown>;
        for (const [field, value] of fromStory) if (next[field] === value) next[field] = "";
        return next as SmallClaimsIntelligenceInput;
      });
    }
    updateField("facts", text);
    // After the clear and the new story are written (the intake store writes in an
    // effect, so a clear and refill in one click would be one unchanged write).
    setTimeout(() => extractFromStory(text), 0);
  }

  function extractFromStory(text: string = input.facts) {
    if (!text.trim()) return;
    const prefill = extractNarrativePrefill({ narrative: text, courtPath: "small-claims" });
    const direct = prefill.facts.filter(
      (fact) => fact.state === "direct" && EXTRACTABLE_STORY_FIELDS.has(fact.field),
    );
    if (direct.length === 0) return;
    setExtractedFacts((current) => [
      ...current.filter((fact) => !direct.some((found) => found.field === fact.field)),
      ...direct,
    ]);
    setInput((current) => {
      const next = { ...current } as Record<string, unknown>;
      for (const fact of direct) {
        const existing = next[fact.field];
        if (typeof existing === "string" && existing.trim()) continue;
        next[fact.field] = Array.isArray(fact.value) ? fact.value.join(", ") : fact.value;
      }
      return next as SmallClaimsIntelligenceInput;
    });
  }

  function updateField<K extends keyof SmallClaimsIntelligenceInput>(
    field: K,
    value: SmallClaimsIntelligenceInput[K],
  ) {
    userEditedRef.current = true;
    setExtractedFacts((current) => current.filter((fact) => fact.field !== field));
    // Editing the fields the safety check reads clears a prior halt/
    // acknowledgment -- revising the story is exactly how a user tries
    // again, not a dead end.
    if (field === "facts" || field === "urgent") {
      setSafetyHalted(false);
      setSafetyHaltMessage("");
      setDistressAcknowledgment("");
    }
    setInput((current) => ({ ...current, [field]: value }));
  }

  function handleEvidenceFilesSelected(files: FileList | null) {
    if (!files) return;
    userEditedRef.current = true;

    /*
     * The FileList is read by evidenceReference.readSelectedFiles, which
     * touches size, type and lastModified and never `name`. See that module
     * for why the name is not captured rather than scrubbed later.
     *
     * Numbering happens inside the state updater because "Document N"
     * continues from what is already listed, and only the updater can see
     * that without racing another selection.
     */
    const chosen = readSelectedFiles(files);

    setInput((current) => {
      const existingIds = new Set(
        current.uploadedEvidenceFiles.map((file) => file.id),
      );
      const fresh = assignReferences(
        current.uploadedEvidenceFiles.map((file) => file.reference),
        chosen.filter((facts) => !existingIds.has(evidenceFileId(facts))),
      );

      const nextFiles: SmallClaimsEvidenceFile[] = fresh.map((file) => ({
        ...file,
        title: "",
        description: "",
        category: "",
        evidenceDate: "",
        source: "",
        relevance: "",
      }));

      return {
        ...current,
        uploadedEvidenceFiles: [...current.uploadedEvidenceFiles, ...nextFiles],
      };
    });
  }

  function updateEvidenceFile(
    fileId: string,
    field: keyof Pick<
      SmallClaimsEvidenceFile,
      "title" | "description" | "category" | "evidenceDate" | "source" | "relevance"
    >,
    value: string,
  ) {
    userEditedRef.current = true;
    setInput((current) => ({
      ...current,
      uploadedEvidenceFiles: current.uploadedEvidenceFiles.map((file) =>
        file.id === fileId ? { ...file, [field]: value } : file,
      ),
    }));
  }

  function removeEvidenceFile(fileId: string) {
    userEditedRef.current = true;
    setInput((current) => ({
      ...current,
      uploadedEvidenceFiles: current.uploadedEvidenceFiles.filter(
        (file) => file.id !== fileId,
      ),
    }));
  }

  useContinueHandler("form", () => { void handleAnalyze(); });

  async function handleAnalyze() {
    if (analysisRequest.current.pending) return;
    try {
      await analysisRequest.current.run(async (signal) => {
        await beforeIntakeAI(signal);
        if (!(await prepareCaseGuidance("form"))) return;
    if (!hasText(input.facts)) {
      setAnalysisError("Add a short description of what happened before continuing the core intake.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    setStorageWarning("");
    setSafetyHalted(false);
    setSafetyHaltMessage("");
    setDistressAcknowledgment("");
    setAuthRequired(false);

    // Session 19 -- the safety check has no deterministic fallback (same
    // reason guided mode requires authentication unconditionally), so a
    // guest submission used to skip it silently. Require a signed-in
    // session before anything else here, same as guided mode, rather than
    // letting an unauthenticated story reach analysis unchecked.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setAuthRequired(true);
      setIsAnalyzing(false);
      return;
    }

    // Same safety pass guided mode runs on every free-text turn, before
    // anything else -- here it runs on the case story plus the "anything
    // urgent" field (the two free-text fields most likely to carry real
    // distress/danger signal), combined into one call rather than one
    // per field.
    const safetyCheckText = [input.facts, input.urgent]
      .filter((text) => hasText(text))
      .join("\n\n");
    const safety = await runFormSafetyCheck(safetyCheckText);

    await validateIntakeResponse(signal);

    signal.throwIfAborted();
    if (safety.halted) {
      setSafetyHalted(true);
      setSafetyHaltMessage(safety.haltMessage || "");
      setIsAnalyzing(false);
      return;
    }

    setAsksForAdvice(Boolean(safety.requestsLegalAdvice));
    if (safety.distressAcknowledgment) {
      setDistressAcknowledgment(safety.distressAcknowledgment);
    }

    try {
      const stage = inferStage(input);
      // A defendant who is responding was served a claim, so "Nothing filed
      // yet" -- the form's default, never chosen -- is not saved for them
      // (page review, 2026-10-06: the record said "Nothing filed yet" beside
      // "I was served a plaintiff's claim"). Only the untouched default is
      // replaced; anything the user ticked stands.
      const untouchedDefault = input.filedDocuments.length === 0 || (input.filedDocuments.length === 1 && input.filedDocuments[0] === "nothing");
      // 2026-10-16 live bug: this route never matched a claim type at all, so
      // the overview's evidence checklist, court points and common defences
      // (all driven by confirmedClaimTypeId) never appeared for anyone who
      // filled in the form instead of using the guided chat. Matched here on
      // "Case story" alone -- the same single field the guided route matches
      // its opening story against -- via the same settledClaimTypeMatch bar
      // orchestrateIntakeTurn.ts uses there (claimTypeMatcher.ts). A weaker,
      // scattered-word candidate is left out rather than auto-applied: this
      // route has no suggestion card to ask the person about it (CLAUDE.md
      // §4, suggest never decide).
      // Kinds of claim only, with the story's words that show it (claimKind.ts, step 2b).
      const matched = hasText(input.facts) ? kindFromStory(input.facts, CLAIM_TYPES) : null;
      const matchedClaimTypeId = matched?.claimType.id ?? null;
      // Answers given in the review panel count here too, where the form left them empty
      // (re-test round 7: after "start the questions again" they were the only answers).
      const panel = recovery ? panelAnswerFacts(recovery.getReview().checkpoint) : {};
      const preparedInput: SmallClaimsIntelligenceInput = {
        ...input,
        amountClaimed: input.amountClaimed || String(panel.amountClaimedText ?? ""),
        goal: input.goal || String(panel.remedySoughtText ?? ""),
        // The situation answer is the side; an older answer in the review panel never replaces it (step 2 reviewer).
        yourRole: fromStart.role === "plaintiff" || fromStart.role === "defendant" ? fromStart.role : input.yourRole === "plaintiff" || input.yourRole === "defendant" ? input.yourRole : (panel.role === "plaintiff" || panel.role === "defendant" ? panel.role : input.yourRole),
        timeline: input.timeline || String(panel.timelineText ?? ""),
        caseStage: stage,
        issues: inferIssuesFromStory(input),
        filedDocuments:
          stage === "responding" && untouchedDefault
            ? ["plaintiffs-claim"]
            : input.filedDocuments.length > 0
              ? input.filedDocuments
              : ["nothing"],
        ...(matchedClaimTypeId ? { confirmedClaimTypeId: matchedClaimTypeId } : {}),
      };

      const response = await requestSmallClaimsAnalysis(
        preparedInput,
        recovery?.getCaseId(),
        signal,
        intakeGuidanceHeaders(recovery),
      );
      const result = response.result!;
      const payload: StoredCaseData = {
        ...result.payload,
        extra: {
          ...(result.payload.extra || {}),
          analysisExecution: {
            reasoningMode: response.reasoningMode,
            analysisAvailable: response.analysisAvailable === true,
            authenticated: response.authenticated === true,
            completedAt: new Date().toISOString(),
          },
          // Never user-confirmed on this route -- there is no suggestion card
          // here, only the automatic exact-phrase match above. Matches
          // IntelligenceOverviewPanel.tsx's claimTypeUserConfirmed read, which
          // words the "Kind of claim..." label honestly either way (see the
          // guided route's same field, app/builder/page.tsx).
          ...(matchedClaimTypeId ? { claimTypeUserConfirmed: false, claimTypeQuote: matched!.quote } : {}),
          // The side and filing the situation answers settle, as the person's own (stageFromAnswers.ts).
          ...(fromStart.role === "plaintiff" || fromStart.role === "defendant"
            ? { personAnswers: { side: fromStart.role, ...(fromStart.role === "plaintiff" && fromStart.claimFiled !== undefined ? { claimFiled: fromStart.claimFiled } : {}) } }
            : {}),
        },
      };

      await validateIntakeResponse(signal);

      signal.throwIfAborted();
      onComplete(result.analysis, payload);
    } catch (error) {


      setAnalysisError(
        error instanceof Error
          ? error.message
          : "CourtSimplified could not complete the Small Claims intelligence analysis. Please review the intake and try again.",
      );
    }
      }, ANALYSIS_TIMEOUT_MS);
    } catch {
      setAnalysisError("That request did not finish. Your answers are still here; please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Answers based on an earlier version of the story are not shown or pre-filled anywhere in
  // this form until the questions start again from the story (storyBasis.ts, re-test 2026-10-18).
  if (storyChanged) {
    return (
      <section data-testid="sc-intake-story-changed" className="mt-6 rounded-3xl border border-[#d8e6df] bg-white p-6">
        <h2 className="text-xl font-bold text-[#10231f]">Small Claims intake</h2>
        <StoryChangedNotice where="questions" />
        <button type="button" data-testid="sc-intake-analyze" disabled className="mt-4 rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Continue to your next steps</button>
      </section>
    );
  }

  return (
    <section onChangeCapture={() => analysisRequest.current.cancel()} className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <div className="rounded-3xl bg-[#f2fbf7] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f7d67]">
          Small Claims intake
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#10231f]">
          Confirm the details needed for your Small Claims matter.
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#4d675f]">
          Start with the parties, amount, important dates, and available documents.
        </p>

        <div className="mt-4 rounded-2xl border border-[#cde7dc] bg-white p-4 text-sm text-[#24463d]">
          {inferredDirection ? <p className="font-semibold">{inferredDirection}</p> : null}
          <p className="mt-2">{missingPrompt}</p>
        </div>
      </div>

      {inferredDisputeCategory === "defamation" ? (
        <div className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-sm leading-6 text-[#24463d]">
          <p className="font-semibold">I found a possible false-statement or reputation concern in your story.</p>
          <p className="mt-2">I&apos;ll use that context and ask for the factual details that are still missing. You can correct or add to anything below.</p>
        </div>
      ) : null}

      {authRequired && <SignInForSafetyCheck area="Small Claims" />}

      {asksForAdvice && (
        <div className="mt-5">
          <LegalAdviceDeflection reason="legal-advice" />
        </div>
      )}

      {safetyHalted && safetyHaltMessage && (
        <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          {safetyHaltMessage}
        </div>
      )}

      {distressAcknowledgment && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {distressAcknowledgment}
        </div>
      )}

      {analysisError && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {analysisError}
        </div>
      )}
      <AnalysisProgress reading={isAnalyzing} error={analysisError} onRetry={() => void handleAnalyze()} onStop={() => { analysisRequest.current.cancel(); setAnalysisError("Stopped. Your answers are still here; you can try again."); }} />

      {storageWarning && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {storageWarning}
        </div>
      )}

      {extractedFacts.length > 0 && (
        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-[#24463d]">
          <p className="font-semibold">Found in your description — review/edit</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {extractedFacts.map((fact) => (
              <li key={fact.field}>
                {fact.field}: {Array.isArray(fact.value) ? fact.value.join(", ") : fact.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <div className="rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            Location confirmed on Home
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#4d675f]">
            Location: {location.city}, {location.province}.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">Case stage</span>
            {fromStart.caseStage ? (
              <p data-testid="stage-from-start" className="mt-2 rounded-2xl border border-[#d8e6df] bg-[#f3f8f5] px-4 py-3">{fromStart.caseStage === "responding" ? "Responding to a case" : fromStart.caseStage === "already-started" ? "Case already started" : "Starting a new case"} <span className="text-sm text-[#4d675f]">(from your answers at the start; change them at the top of the page)</span></p>
            ) : (
            <select
              data-testid="sc-intake-caseStage" value={input.caseStage}
              onChange={(event) =>
                updateField("caseStage", event.target.value as UniversalStage)
              }
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
            >
              <option value="not-sure">Not sure</option>
              <option value="starting-case">Starting a new case</option>
              <option value="responding">Responding to a case</option>
              <option value="already-started">Case already started</option>
              <option value="conference">Settlement conference</option>
              <option value="motion">Motion stage</option>
              <option value="trial">Trial preparation</option>
              <option value="enforcement">Enforcement</option>
              <option value="urgent">Urgent issue</option>
            </select>
            )}
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">Your role</span>
{roleFromStart ? (
              <p data-testid="sc-intake-yourRole-from-start" className="mt-2 rounded-2xl border border-[#d8e6df] bg-[#f3f8f5] px-4 py-3">{roleFromStart} <span className="text-sm text-[#4d675f]">(from your answers at the start; change them at the top of the page)</span></p>
            ) : (
            <select
              data-testid="sc-intake-yourRole" value={input.yourRole}
              onChange={(event) => updateField("yourRole", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
            >
              {/* An emptied role ("Start the questions again") reads as unanswered, not as the first option (#468 re-test). */}
              <option value="">Choose your role</option>
              <option value="Plaintiff / claimant">Plaintiff / claimant</option>
              <option value="Defendant / responding party">Defendant / responding party</option>
              <option value="Not sure">Not sure</option>
            </select>
            )}
            <FieldHelp question={ROLE_QUESTION} />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Your full legal name or business name
            </span>
            <input
              data-testid="sc-intake-yourName" value={input.yourName}
              onChange={(event) => updateField("yourName", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Full legal name or business name"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Other party name
            </span>
            <input
              data-testid="sc-intake-otherParty" value={input.otherParty}
              onChange={(event) => updateField("otherParty", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Person or business on the other side"
            />
          </label>
        </div>

        <StoryEditor section="small-claims" story={input.facts} startOpen={!input.facts.trim()} onSave={saveStory} ids={{ toggle: "sc-intake-edit-story", draft: "sc-intake-facts", save: "sc-story-save" }} />

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Important dates / timeline
            </span>
            <textarea
              data-testid="sc-intake-timeline" value={input.timeline}
              onChange={(event) => updateField("timeline", event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="List dates in order. If you do not know exact dates, estimate."
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Evidence you have
            </span>
            <textarea
              data-testid="sc-intake-evidence" value={input.evidence}
              onChange={(event) => updateField("evidence", event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Screenshots, messages, witnesses, receipts, photos, emails, documents."
            />
            <FieldHelp question={EVIDENCE_QUESTION} />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Evidence still missing
            </span>
            <textarea
              data-testid="sc-intake-missingEvidence" value={input.missingEvidence}
              onChange={(event) =>
                updateField("missingEvidence", event.target.value)
              }
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Example: exact date, full thread, witness names, proof of who saw the statement."
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              {/* A defendant does not ask the court for an order on the claim;
                  page review, 2026-10-06. */}
              {isDefendantRole(input.yourRole) ? "What do you want to happen with the claim against you?" : "What do you want the court to order?"}
            </span>
            <textarea
              data-testid="sc-intake-goal" value={input.goal}
              onChange={(event) => updateField("goal", event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Money, apology, return of property, dismissal, payment plan, costs."
            />
            <FieldHelp question={REMEDY_QUESTION} />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Amount claimed or disputed
            </span>
            <input
              data-testid="sc-intake-amountClaimed" value={input.amountClaimed}
              onChange={(event) =>
                updateField("amountClaimed", event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Example: $5,000"
            />
            <FieldHelp question={AMOUNT_CLAIMED_QUESTION} />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              {isDefendantRole(input.yourRole) ? "Which part of the amount you dispute, and why" : "Breakdown of amount claimed"}
            </span>
            <input
              data-testid="sc-intake-damagesBreakdown" value={input.damagesBreakdown}
              onChange={(event) =>
                updateField("damagesBreakdown", event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Explain how you reached the number, if known."
            />
          </label>
        </div>

        <div className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            Party and service details
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <input
              data-testid="sc-intake-yourAddress" value={input.yourAddress}
              onChange={(event) => updateField("yourAddress", event.target.value)}
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your address"
            />

            <input
              data-testid="sc-intake-yourPostalCode" value={input.yourPostalCode}
              onChange={(event) =>
                updateField("yourPostalCode", event.target.value)
              }
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your postal code"
            />

            <input
              data-testid="sc-intake-yourEmail" value={input.yourEmail}
              onChange={(event) => updateField("yourEmail", event.target.value)}
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your email"
            />

            <textarea
              data-testid="sc-intake-defendantAddress" value={input.defendantAddress}
              onChange={(event) =>
                updateField("defendantAddress", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3 md:col-span-2"
              placeholder="Other party address for service, if known"
            />

            <textarea
              data-testid="sc-intake-serviceDetails" value={input.serviceDetails}
              onChange={(event) =>
                updateField("serviceDetails", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3 md:col-span-2"
              placeholder={fromStart.servedOn ? "How the papers were served (in person, by mail, by email)" : "Service details, only if anything has already been served"}
            />
            {/* The same date check as every date box (dates.ts), as in the civil form: a note, since nothing is counted from this box. */}
            {input.serviceDetails.trim() && dateAnswerCheck("When and how was it served?", input.serviceDetails.trim()) ? (
              <span data-testid="sc-field-needs-more" className="text-sm text-[#8a4b12] md:col-span-2">{dateAnswerCheck("When and how was it served?", input.serviceDetails.trim())}</span>
            ) : null}
          </div>
        </div>

        {/* Whether anything is filed was answered at the start (the case file, caseFile.ts): the list is
            shown for detail, never as the question again. */}
        <div data-testid="sc-intake-documents" data-empty={input.filedDocuments.length === 0 && !(situation.where === "served" || situation.where === "going" || (situation.where === "starting" && situation.filed)) ? "true" : "false"}>
          <h3 className="font-semibold text-[#16302b]">
            {situation.where === "served" || situation.where === "going" || (situation.where === "starting" && situation.filed)
              ? "Any other documents that already exist? (optional detail)"
              : "What documents already exist?"}
          </h3>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filedOptions.map((option) => {
              const matchedQuestion =
                option.value === "plaintiffs-claim"
                  ? CLAIM_FILED_QUESTION
                  : option.value === "affidavit-service"
                    ? DEFENDANT_SERVED_QUESTION
                    : option.value === "defence"
                      ? DEFENCE_FILED_QUESTION
                      : undefined;

              return (
                <div key={option.value}>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "filedDocuments",
                        toggleArrayValue(input.filedDocuments, option.value),
                      )
                    }
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                      input.filedDocuments.includes(option.value)
                        ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]"
                        : "border-[#d8e6df] bg-white text-[#4d675f]"
                    }`}
                  >
                    {option.label}
                  </button>
                  <FieldHelp question={matchedQuestion} />
                </div>
              );
            })}
          </div>
        </div>

        <details className="rounded-3xl border border-[#d8e6df] bg-white p-5">
          <summary className="cursor-pointer font-bold text-[#16302b]">
            Optional details for specific case types
          </summary>

          <div className="mt-5 grid gap-5">
            <textarea
              data-testid="sc-intake-agreementDetails" value={input.agreementDetails}
              onChange={(event) =>
                updateField("agreementDetails", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Agreement/contract details, only if this case involves an agreement"
            />

            <textarea
              data-testid="sc-intake-paymentHistory" value={input.paymentHistory}
              onChange={(event) =>
                updateField("paymentHistory", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Payment history, only if money, invoices, loan, debt, or services are involved"
            />

            <textarea
              data-testid="sc-intake-defenceResponse" value={input.defenceResponse}
              onChange={(event) =>
                updateField("defenceResponse", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Defence response, only if you are responding to someone else's claim"
            />

            <textarea
              data-testid="sc-intake-settlementEfforts" value={input.settlementEfforts}
              onChange={(event) =>
                updateField("settlementEfforts", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Settlement efforts or offers"
            />

            <textarea
              data-testid="sc-intake-deadlineDetails" value={input.deadlineDetails}
              onChange={(event) =>
                updateField("deadlineDetails", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Deadlines, court dates, or urgent timing concerns"
            />

            <textarea
              data-testid="sc-intake-urgent" value={input.urgent}
              onChange={(event) => updateField("urgent", event.target.value)}
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Anything urgent"
            />
          </div>
        </details>

        <div className="rounded-3xl border border-dashed border-[#b8d8cc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            List and describe your evidence
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#4d675f]">
            Evidence is optional at this step, but the system will mark proof
            gaps if important evidence is missing.
          </p>

          {/*
            LSO Step 8. Sits directly under the heading, before the picker: a
            caution a person reads after choosing is a caution that arrived too
            late. See EvidenceFileNotice.tsx for what actually happens to a file.
          */}
          <EvidenceFileNotice />

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#d8e6df] bg-white px-4 py-6 text-center hover:bg-[#f4fbf8]">
            <span className="font-semibold text-[#2f7d67]">
              Choose files to list
            </span>
            <span className="mt-1 text-sm text-[#6b8078]">
              You can select multiple files
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) =>
                handleEvidenceFilesSelected(event.target.files)
              }
            />
          </label>

          {input.uploadedEvidenceFiles.length > 0 && (
            <div className="mt-5 grid gap-4">
              {input.uploadedEvidenceFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-[#d8e6df] bg-white p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      {/*
                        The file name used to be here, and was also sent to
                        OpenAI. Now neither -- see evidenceReference.ts.
                      */}
                      <p className="font-semibold text-[#16302b]">
                        {file.reference}
                      </p>
                      <p className="mt-1 text-sm text-[#6b8078]">
                        {describeFileType(file.type)} · {formatFileSize(file.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEvidenceFile(file.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <input
                        value={file.title}
                        onChange={(event) =>
                          updateEvidenceFile(file.id, "title", event.target.value)
                        }
                        className="w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                        placeholder="Your label for this document"
                      />
                      <span
                        data-testid="evidence-label-hint"
                        className="mt-1 block text-xs leading-5 text-[#6b8078]"
                      >
                        Your own label for this document. Optional, and sent to our AI provider along with what you write about it.
                      </span>
                    </label>

                    <select
                      value={file.category}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "category", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Select issue</option>
                      {evidenceCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>

                    <input
                      value={file.evidenceDate}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "evidenceDate", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                      placeholder="Date or event this relates to"
                    />

                    <input
                      value={file.source}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "source", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                      placeholder="Who created or sent it?"
                    />
                  </div>

                  <textarea
                    value={file.description}
                    onChange={(event) =>
                      updateEvidenceFile(file.id, "description", event.target.value)
                    }
                    className="mt-4 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                    placeholder="What does this evidence show?"
                  />

                  <textarea
                    value={file.relevance}
                    onChange={(event) =>
                      updateEvidenceFile(file.id, "relevance", event.target.value)
                    }
                    className="mt-4 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                    placeholder="Why does it matter to your case?"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <TidyWordingReview
          fields={(
            [
              ["facts", "Case story"],
              ["timeline", "Important dates / timeline"],
              ["evidence", "Evidence you have"],
              ["missingEvidence", "Evidence still missing"],
              ["goal", "What do you want the court to order?"],
              ["serviceDetails", "Service details"],
              ["agreementDetails", "Agreement or contract details"],
              ["paymentHistory", "Payment history"],
              ["defenceResponse", "Your response to the claim"],
              ["settlementEfforts", "Settlement efforts"],
              ["deadlineDetails", "Deadline details"],
              ["urgent", "Anything urgent"],
            ] as [keyof SmallClaimsIntelligenceInput, string][]
          ).map(([key, label]) => ({
            key,
            label,
            value: String(input[key] ?? ""),
            setValue: (next: string) => updateField(key, next as never),
          }))}
        />

        <button
          type="button"
          data-testid="sc-intake-analyze"
          onClick={handleAnalyze}
          disabled={isAnalyzing || safetyHalted || storyChanged}
          className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? "Reading what you told us..." : "Continue to your next steps"}
        </button>
        <StoryChangedNotice where="button" />
        <ReviewNeededNotice from="form" />
      </div>
    </section>
  );
}
