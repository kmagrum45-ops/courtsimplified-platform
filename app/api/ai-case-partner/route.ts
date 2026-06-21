import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type RequestBody = {
  message?: string;
  conversation?: ChatMessage[];
  caseMemory?: unknown;
  mode?: string;
};

type ConfidenceLevel = "low" | "medium" | "high";

type CourtArea =
  | "small-claims"
  | "family"
  | "civil"
  | "ltb"
  | "immigration"
  | "mixed"
  | "unknown";

type ProceduralStage =
  | "not-started"
  | "starting-case"
  | "responding"
  | "already-filed"
  | "conference"
  | "motion"
  | "settlement"
  | "disclosure"
  | "trial-preparation"
  | "trial"
  | "enforcement"
  | "appeal-or-review"
  | "urgent"
  | "not-sure"
  | "unknown";

type AIResponseShape = {
  userFacingAnswer: string;
  structuredCaseUnderstanding: {
    userGoal: string;
    userRole: string;
    courtArea: CourtArea;
    proceduralStage: ProceduralStage;
    confidence: ConfidenceLevel;
    plainLanguageSummary: string;
    keyFacts: string[];
    timelineFacts: string[];
    partiesMentioned: string[];
    legalIssues: string[];
    issueUncertainty: string[];
    remediesOrOutcomesWanted: string[];
    evidenceAvailable: string[];
    evidenceNeeded: string[];
    missingInformation: string[];
  };
  casePlan: {
    immediateFocus: string[];
    nextBestSteps: string[];
    questionsToAskUser: string[];
    documentReadiness: {
      readyToDraft: boolean;
      likelyDocuments: string[];
      missingBeforeDrafting: string[];
      shouldAvoidFormRecommendation: boolean;
    };
    risksToFix: string[];
    judgeConcerns: string[];
    possibleOtherSideArguments: string[];
  };
  validation: {
    answerDecision:
      | "safe-to-answer"
      | "answer-with-caution"
      | "ask-follow-up-first"
      | "block-specific-guidance"
      | "requires-human-review";
    confidence: ConfidenceLevel;
    uncertaintyFlags: string[];
    legalVerificationNeeded: string[];
    shouldAvoidLegalAdviceLanguage: boolean;
    shouldAvoidFinalConclusion: boolean;
    shouldAvoidDeadlineAdvice: boolean;
    shouldAvoidPrecedentCitation: boolean;
    shouldAvoidFormRecommendation: boolean;
  };
  safety: {
    userFacingLimitations: string[];
    internalWarnings: string[];
  };
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanConfidence(value: unknown): ConfidenceLevel {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function cleanCourtArea(value: unknown): CourtArea {
  const allowed: CourtArea[] = [
    "small-claims",
    "family",
    "civil",
    "ltb",
    "immigration",
    "mixed",
    "unknown",
  ];

  return allowed.includes(value as CourtArea) ? (value as CourtArea) : "unknown";
}

function cleanProceduralStage(value: unknown): ProceduralStage {
  const allowed: ProceduralStage[] = [
    "not-started",
    "starting-case",
    "responding",
    "already-filed",
    "conference",
    "motion",
    "settlement",
    "disclosure",
    "trial-preparation",
    "trial",
    "enforcement",
    "appeal-or-review",
    "urgent",
    "not-sure",
    "unknown",
  ];

  return allowed.includes(value as ProceduralStage)
    ? (value as ProceduralStage)
    : "unknown";
}

function buildFallbackResponse(message: string): AIResponseShape {
  return {
    userFacingAnswer:
      "I can help organize this, but I need a few more details before giving specific procedural or document guidance. Start by telling me what happened, when it happened, what proof you have, what court stage you are at, and what you want prepared.",
    structuredCaseUnderstanding: {
      userGoal: "The user wants help understanding or organizing a legal situation.",
      userRole: "unknown",
      courtArea: "unknown",
      proceduralStage: "unknown",
      confidence: "low",
      plainLanguageSummary: message.slice(0, 300),
      keyFacts: [],
      timelineFacts: [],
      partiesMentioned: [],
      legalIssues: [],
      issueUncertainty: [
        "The system does not yet have enough reliable information to safely identify the full legal framework.",
      ],
      remediesOrOutcomesWanted: [],
      evidenceAvailable: [],
      evidenceNeeded: [],
      missingInformation: [
        "dates or timeline",
        "what evidence exists",
        "what outcome the user wants",
        "whether anything has already been filed or served",
      ],
    },
    casePlan: {
      immediateFocus: ["Clarify the facts, evidence, goal, and court stage."],
      nextBestSteps: [
        "Provide a timeline.",
        "List available proof.",
        "Explain what outcome you want.",
      ],
      questionsToAskUser: [
        "When did the main events happen?",
        "What proof do you have?",
        "Has anything already been filed or served?",
        "What do you want the court process to help you get or fix?",
      ],
      documentReadiness: {
        readyToDraft: false,
        likelyDocuments: [],
        missingBeforeDrafting: [
          "procedural stage",
          "court area",
          "facts",
          "evidence",
          "requested outcome",
        ],
        shouldAvoidFormRecommendation: true,
      },
      risksToFix: ["The system should not recommend forms or deadlines yet."],
      judgeConcerns: [],
      possibleOtherSideArguments: [],
    },
    validation: {
      answerDecision: "ask-follow-up-first",
      confidence: "low",
      uncertaintyFlags: ["Insufficient structured facts."],
      legalVerificationNeeded: [],
      shouldAvoidLegalAdviceLanguage: true,
      shouldAvoidFinalConclusion: true,
      shouldAvoidDeadlineAdvice: true,
      shouldAvoidPrecedentCitation: true,
      shouldAvoidFormRecommendation: true,
    },
    safety: {
      userFacingLimitations: [
        "This is case-preparation support, not a final legal opinion.",
      ],
      internalWarnings: ["Fallback response used."],
    },
  };
}

function normalizeAIResponse(parsed: unknown, originalMessage: string): AIResponseShape {
  const source =
    typeof parsed === "object" && parsed !== null && "result" in parsed
      ? (parsed as { result?: unknown }).result
      : parsed;

  if (typeof source !== "object" || source === null) {
    return buildFallbackResponse(originalMessage);
  }

  const value = source as Record<string, any>;
  const understanding = value.structuredCaseUnderstanding ?? value.caseUnderstanding ?? {};
  const plan = value.casePlan ?? {};
  const documentReadiness = plan.documentReadiness ?? {};
  const validation = value.validation ?? {};
  const safety = value.safety ?? value.internalSafety ?? {};

  const fallback = buildFallbackResponse(originalMessage);

  return {
    userFacingAnswer:
      cleanString(value.userFacingAnswer) ||
      cleanString(value.answer) ||
      fallback.userFacingAnswer,

    structuredCaseUnderstanding: {
      userGoal:
        cleanString(understanding.userGoal) ||
        cleanString(understanding.mainObjective) ||
        fallback.structuredCaseUnderstanding.userGoal,
      userRole: cleanString(understanding.userRole, "unknown"),
      courtArea:
        cleanCourtArea(understanding.courtArea) ||
        cleanCourtArea(understanding.courtPath),
      proceduralStage:
        cleanProceduralStage(understanding.proceduralStage) ||
        cleanProceduralStage(understanding.caseStage),
      confidence: cleanConfidence(understanding.confidence),
      plainLanguageSummary:
        cleanString(understanding.plainLanguageSummary) ||
        cleanString(value.plainLanguageSummary) ||
        fallback.structuredCaseUnderstanding.plainLanguageSummary,
      keyFacts: cleanStringArray(understanding.keyFacts),
      timelineFacts: cleanStringArray(understanding.timelineFacts),
      partiesMentioned: cleanStringArray(understanding.partiesMentioned),
      legalIssues:
        cleanStringArray(understanding.legalIssues).length > 0
          ? cleanStringArray(understanding.legalIssues)
          : [
              cleanString(understanding.primaryIssue),
              ...cleanStringArray(understanding.secondaryIssues),
            ].filter(Boolean),
      issueUncertainty: cleanStringArray(understanding.issueUncertainty),
      remediesOrOutcomesWanted: cleanStringArray(
        understanding.remediesOrOutcomesWanted,
      ),
      evidenceAvailable:
        cleanStringArray(understanding.evidenceAvailable).length > 0
          ? cleanStringArray(understanding.evidenceAvailable)
          : cleanStringArray(understanding.knownEvidence),
      evidenceNeeded:
        cleanStringArray(understanding.evidenceNeeded).length > 0
          ? cleanStringArray(understanding.evidenceNeeded)
          : cleanStringArray(understanding.proofNeeded),
      missingInformation: cleanStringArray(understanding.missingInformation),
    },

    casePlan: {
      immediateFocus: cleanStringArray(plan.immediateFocus),
      nextBestSteps:
        cleanStringArray(plan.nextBestSteps).length > 0
          ? cleanStringArray(plan.nextBestSteps)
          : [cleanString(understanding.nextBestStep)].filter(Boolean),
      questionsToAskUser:
        cleanStringArray(plan.questionsToAskUser).length > 0
          ? cleanStringArray(plan.questionsToAskUser)
          : cleanStringArray(plan.questionsToAskUser),
      documentReadiness: {
        readyToDraft: Boolean(documentReadiness.readyToDraft),
        likelyDocuments: cleanStringArray(documentReadiness.likelyDocuments),
        missingBeforeDrafting: cleanStringArray(
          documentReadiness.missingBeforeDrafting,
        ),
        shouldAvoidFormRecommendation:
          documentReadiness.shouldAvoidFormRecommendation !== false,
      },
      risksToFix: cleanStringArray(plan.risksToFix),
      judgeConcerns: cleanStringArray(plan.judgeConcerns),
      possibleOtherSideArguments: cleanStringArray(
        plan.possibleOtherSideArguments,
      ),
    },

    validation: {
      answerDecision:
        validation.answerDecision === "safe-to-answer" ||
        validation.answerDecision === "answer-with-caution" ||
        validation.answerDecision === "ask-follow-up-first" ||
        validation.answerDecision === "block-specific-guidance" ||
        validation.answerDecision === "requires-human-review"
          ? validation.answerDecision
          : "answer-with-caution",
      confidence: cleanConfidence(validation.confidence),
      uncertaintyFlags: cleanStringArray(validation.uncertaintyFlags),
      legalVerificationNeeded:
        cleanStringArray(validation.legalVerificationNeeded).length > 0
          ? cleanStringArray(validation.legalVerificationNeeded)
          : cleanStringArray(safety.needsLegalVerification),
      shouldAvoidLegalAdviceLanguage:
        validation.shouldAvoidLegalAdviceLanguage !== false,
      shouldAvoidFinalConclusion: validation.shouldAvoidFinalConclusion !== false,
      shouldAvoidDeadlineAdvice: validation.shouldAvoidDeadlineAdvice !== false,
      shouldAvoidPrecedentCitation:
        validation.shouldAvoidPrecedentCitation !== false,
      shouldAvoidFormRecommendation:
        validation.shouldAvoidFormRecommendation !== false,
    },

    safety: {
      userFacingLimitations: cleanStringArray(safety.userFacingLimitations),
      internalWarnings:
        cleanStringArray(safety.internalWarnings).length > 0
          ? cleanStringArray(safety.internalWarnings)
          : cleanStringArray(safety.validationWarnings),
    },
  };
}

function buildSystemPrompt() {
  return `
You are CourtSimplified AI Case Partner.

You are the semantic reasoning brain for a litigation preparation platform.

You are NOT:
- a keyword classifier
- a generic chatbot
- an AI lawyer
- a form picker
- a deadline calculator
- a case outcome predictor

Your purpose is to help users organize and understand their legal situation for court preparation.

You must reason like a careful legal case-building assistant:
- understand messy user stories
- identify the user's goal
- identify the user's likely role
- identify possible court area
- identify procedural stage if possible
- extract legally useful facts
- separate facts from conclusions
- identify missing facts
- identify evidence available
- identify evidence needed
- identify proof problems
- identify judge concerns
- identify likely opposing arguments
- identify safe next steps
- decide whether document drafting is premature
- avoid fake certainty

You must NOT rely only on keywords. Interpret the meaning of the user's story.

You must NOT invent:
- statutes
- legal deadlines
- case law
- procedural rules
- court forms
- facts not provided by the user

If something requires current legal verification, say so in the validation fields.

User-facing tone:
- direct
- practical
- calm
- plain language
- focused on preparation
- not robotic
- not generic

Do not expose internal rejected classifications.
Do not say "this is not X" unless it is necessary to prevent a serious mistake.

Return ONLY valid JSON. No markdown. No commentary outside JSON.

Required JSON shape:
{
  "userFacingAnswer": "string",
  "structuredCaseUnderstanding": {
    "userGoal": "string",
    "userRole": "string",
    "courtArea": "small-claims | family | civil | ltb | immigration | mixed | unknown",
    "proceduralStage": "not-started | starting-case | responding | already-filed | conference | motion | settlement | disclosure | trial-preparation | trial | enforcement | appeal-or-review | urgent | not-sure | unknown",
    "confidence": "low | medium | high",
    "plainLanguageSummary": "string",
    "keyFacts": ["string"],
    "timelineFacts": ["string"],
    "partiesMentioned": ["string"],
    "legalIssues": ["string"],
    "issueUncertainty": ["string"],
    "remediesOrOutcomesWanted": ["string"],
    "evidenceAvailable": ["string"],
    "evidenceNeeded": ["string"],
    "missingInformation": ["string"]
  },
  "casePlan": {
    "immediateFocus": ["string"],
    "nextBestSteps": ["string"],
    "questionsToAskUser": ["string"],
    "documentReadiness": {
      "readyToDraft": false,
      "likelyDocuments": ["string"],
      "missingBeforeDrafting": ["string"],
      "shouldAvoidFormRecommendation": true
    },
    "risksToFix": ["string"],
    "judgeConcerns": ["string"],
    "possibleOtherSideArguments": ["string"]
  },
  "validation": {
    "answerDecision": "safe-to-answer | answer-with-caution | ask-follow-up-first | block-specific-guidance | requires-human-review",
    "confidence": "low | medium | high",
    "uncertaintyFlags": ["string"],
    "legalVerificationNeeded": ["string"],
    "shouldAvoidLegalAdviceLanguage": true,
    "shouldAvoidFinalConclusion": true,
    "shouldAvoidDeadlineAdvice": true,
    "shouldAvoidPrecedentCitation": true,
    "shouldAvoidFormRecommendation": true
  },
  "safety": {
    "userFacingLimitations": ["string"],
    "internalWarnings": ["string"]
  }
}
`;
}

function sanitizeConversation(conversation: ChatMessage[]): ChatMessage[] {
  return conversation
    .filter(
      (item) =>
        item &&
        (item.role === "user" ||
          item.role === "assistant" ||
          item.role === "system") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-12)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 5000),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        {
          ok: false,
          error: "OPENAI_API_KEY is missing from .env.local.",
        },
        500,
      );
    }

    const body = (await request.json()) as RequestBody;
    const message = cleanString(body.message);

    if (!message) {
      return jsonResponse(
        {
          ok: false,
          error: "Message is required.",
        },
        400,
      );
    }

    const conversation = sanitizeConversation(
      Array.isArray(body.conversation) ? body.conversation : [],
    );

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt() },
      ...conversation,
      {
        role: "user",
        content: [
          "Analyze this user message for CourtSimplified.",
          "",
          "User message:",
          message,
          "",
          "Remember: answer with valid JSON only.",
        ].join("\n"),
      },
    ];

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1",
          temperature: 0.15,
          response_format: { type: "json_object" },
          messages,
        }),
      },
    );

    const result = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return jsonResponse(
        {
          ok: false,
          error:
            result?.error?.message ||
            "OpenAI request failed while analyzing the case.",
        },
        500,
      );
    }

    const content = result?.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse(
        {
          ok: false,
          error: "No AI response was returned.",
        },
        500,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      return jsonResponse(
        {
          ok: false,
          error: "AI returned invalid JSON.",
          raw: content,
        },
        500,
      );
    }

    const normalized = normalizeAIResponse(parsed, message);

    return jsonResponse({
      ok: true,

      userFacingAnswer: normalized.userFacingAnswer,
      answer: normalized.userFacingAnswer,

      structuredCaseUnderstanding: normalized.structuredCaseUnderstanding,
      caseUnderstanding: normalized.structuredCaseUnderstanding,
      casePlan: normalized.casePlan,
      validation: normalized.validation,
      safety: normalized.safety,

      result: normalized,
    });
  } catch (error) {
    console.error("AI Case Partner error:", error);

    return jsonResponse(
      {
        ok: false,
        error: "Unexpected AI Case Partner error.",
      },
      500,
    );
  }
}