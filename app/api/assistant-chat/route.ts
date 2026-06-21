import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { runCourtSimplifiedBrain } from "../../../src/lib/case-system/intelligence/courtSimplifiedBrain";

import type {
  CourtSimplifiedBrainOutput,
  IntelligenceCourtPath,
  IntelligenceProvince,
  IntelligenceStage,
  LegalIntelligenceResult,
} from "../../../src/lib/case-system/intelligence/intelligenceTypes";

export const runtime = "nodejs";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantRequestBody = {
  message?: string;
  caseId?: string;
  path?: string;
  caseData?: unknown;
  master_result?: unknown;
  evidenceData?: unknown;
  strategyData?: unknown;
  workspaceDocument?: unknown;
  proceduralStage?: string;
  conversation?: AssistantMessage[];
};

type AssistantResponseMode =
  | "workflow-assistant"
  | "brain-only-fallback"
  | "validation-error";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function clean(value: unknown): string {
  return String(value || "").trim();
}

function truncate(value: string, maxLength = 6000): string {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[Content truncated for assistant reliability.]`;
}

function safeJson(input: unknown, maxLength = 8000): string {
  try {
    return truncate(JSON.stringify(input ?? {}, null, 2), maxLength);
  } catch {
    return "{}";
  }
}

function asCourtPath(value: unknown): IntelligenceCourtPath {
  const text = clean(value);

  if (
    text === "family" ||
    text === "small-claims" ||
    text === "civil" ||
    text === "tribunal" ||
    text === "ltb" ||
    text === "immigration" ||
    text === "criminal-related" ||
    text === "unknown"
  ) {
    return text;
  }

  return "unknown";
}

function asStage(value: unknown): IntelligenceStage {
  const text = clean(value);

  if (
    text === "starting-case" ||
    text === "responding" ||
    text === "already-started" ||
    text === "conference" ||
    text === "motion" ||
    text === "trial" ||
    text === "enforcement" ||
    text === "appeal" ||
    text === "urgent" ||
    text === "settlement" ||
    text === "not-sure"
  ) {
    return text;
  }

  return "not-sure";
}

function asProvince(value: unknown): IntelligenceProvince {
  const text = clean(value);

  if (
    text === "Ontario" ||
    text === "Alberta" ||
    text === "British Columbia" ||
    text === "Manitoba" ||
    text === "New Brunswick" ||
    text === "Newfoundland and Labrador" ||
    text === "Northwest Territories" ||
    text === "Nova Scotia" ||
    text === "Nunavut" ||
    text === "Prince Edward Island" ||
    text === "Quebec" ||
    text === "Saskatchewan" ||
    text === "Yukon" ||
    text === "Federal" ||
    text === "Unknown"
  ) {
    return text;
  }

  return "Unknown";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function trimConversation(
  conversation: AssistantMessage[] = [],
  max = 8,
): AssistantMessage[] {
  return conversation
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        clean(message.content),
    )
    .slice(-max)
    .map((message) => ({
      role: message.role,
      content: truncate(message.content, 1200),
    }));
}

function buildConversationText(
  conversation: AssistantMessage[],
  latestMessage: string,
): string {
  const conversationText = conversation
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return truncate(
    [conversationText, `USER: ${latestMessage}`].filter(Boolean).join("\n\n"),
    12000,
  );
}

function extractExistingProvince(
  masterResult: unknown,
  caseData: unknown,
): IntelligenceProvince {
  const master = asRecord(masterResult);
  const caseRecord = asRecord(caseData);
  const masterCaseFile = asRecord(master.masterCaseFile);

  return asProvince(
    masterCaseFile.province ||
      master.province ||
      caseRecord.province ||
      "Ontario",
  );
}

function extractExistingStage(body: AssistantRequestBody): IntelligenceStage {
  const master = asRecord(body.master_result);
  const caseRecord = asRecord(body.caseData);
  const masterCaseFile = asRecord(master.masterCaseFile);

  return asStage(
    body.proceduralStage ||
      masterCaseFile.stage ||
      master.stage ||
      caseRecord.stage ||
      caseRecord.current_stage ||
      "not-sure",
  );
}

function extractExistingPath(body: AssistantRequestBody): IntelligenceCourtPath {
  const master = asRecord(body.master_result);
  const caseRecord = asRecord(body.caseData);
  const masterCaseFile = asRecord(master.masterCaseFile);

  return asCourtPath(
    body.path ||
      masterCaseFile.casePath ||
      master.casePath ||
      caseRecord.court_path ||
      caseRecord.courtPath ||
      "unknown",
  );
}

function getDetectedClaimText(intelligence: LegalIntelligenceResult): string {
  if (intelligence.primaryClaimTypes.length === 0) {
    return "No primary claim has been confirmed yet.";
  }

  return intelligence.primaryClaimTypes.join(", ");
}

function buildFallbackAnswer(intelligence: LegalIntelligenceResult): string {
  const missing = intelligence.missingInformation.slice(0, 4);
  const risks = intelligence.litigationRisks.slice(0, 3);
  const actions = intelligence.nextBestActions.slice(0, 4);

  const lines: string[] = [];

  lines.push("## Immediate next step");
  lines.push(
    actions[0] ||
      "Continue intake so CourtSimplified can structure the facts, evidence, claim direction, and procedural stage.",
  );

  lines.push("");
  lines.push("## What CourtSimplified understands");
  lines.push(intelligence.plainLanguageSummary);

  lines.push("");
  lines.push("## Current structured direction");
  lines.push(`Primary issue(s): ${getDetectedClaimText(intelligence)}.`);
  lines.push(
    `Court path: ${intelligence.proceduralPosture.courtPath}. Stage: ${intelligence.proceduralPosture.stage}.`,
  );

  if (missing.length > 0) {
    lines.push("");
    lines.push("## Missing information to answer next");
    for (const item of missing) lines.push(`- ${item.question}`);
  }

  if (risks.length > 0) {
    lines.push("");
    lines.push("## Main risk/gap");
    for (const risk of risks) {
      lines.push(`- ${risk.title}: ${risk.suggestedFix}`);
    }
  }

  lines.push("");
  lines.push("## Next action in the site");
  lines.push(
    actions[0] ||
      "Answer the missing questions, then continue to evidence mapping.",
  );

  return lines.join("\n");
}

function buildWorkflowAssistantPrompt(): string {
  return `
You are the CourtSimplified workflow assistant.

The structured CourtSimplified brain has already performed the legal cognition step.
You must NOT redo legal classification, invent new claims, invent forms, invent deadlines, or override the structured intelligence result.

Your job:
- Explain the structured intelligence clearly.
- Guide the user to the next workflow step.
- Ask targeted missing-information questions.
- Help organize facts, evidence, timelines, forms, and documents.
- Keep all guidance tied to the structured intelligence result.
- If the user asks a legal question that requires verified law, say it needs verification before final reliance.

Hard rules:
1. The structured intelligence result is authoritative for this response.
2. Do not create a second legal theory outside the structured result.
3. Do not invent citations, statutes, rules, deadlines, or official filing requirements.
4. Do not recommend forms not listed by the structured result unless you clearly say they need verification.
5. Do not treat possible or uncertain issues as confirmed.
6. Do not guarantee outcomes.
7. Keep answers practical and workflow-based.
8. Give one clear next step.

Tone:
Professional, plain language, calm, specific, and not generic.
`;
}

function buildStructuredIntelligenceContext(args: {
  body: AssistantRequestBody;
  brainOutput: CourtSimplifiedBrainOutput;
}) {
  const { body, brainOutput } = args;
  const intelligence = brainOutput.intelligence;

  return `
COURTSIMPLIFIED STRUCTURED INTELLIGENCE RESULT

CASE ID:
${body.caseId || "Unknown"}

COURT PATH:
${intelligence.proceduralPosture.courtPath}

PROCEDURAL STAGE:
${intelligence.proceduralPosture.stage}

CONFIDENCE:
${intelligence.confidence}

PRIMARY CLAIM TYPES:
${intelligence.primaryClaimTypes.join(", ") || "None confirmed"}

REJECTED FALSE POSITIVES:
${
  intelligence.rejectedFalsePositives
    .map((claim) => `${claim.claimType}: ${claim.rejectedBecause.join("; ")}`)
    .join("\n") || "None"
}

PLAIN LANGUAGE SUMMARY:
${intelligence.plainLanguageSummary}

STRUCTURED CASE SUMMARY:
${intelligence.structuredCaseSummary}

MISSING INFORMATION:
${
  intelligence.missingInformation
    .slice(0, 10)
    .map((item) => `- ${item.question} (${item.reason})`)
    .join("\n") || "None"
}

LITIGATION RISKS:
${
  intelligence.litigationRisks
    .slice(0, 10)
    .map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.suggestedFix}`)
    .join("\n") || "None"
}

EVIDENCE ISSUE LINKS:
${
  intelligence.evidenceIssueLinks
    .slice(0, 10)
    .map(
      (link) =>
        `- ${link.issueLabel}: strength=${link.strength}; missing=${link.missingEvidence.join(
          "; ",
        )}`,
    )
    .join("\n") || "None"
}

OPPOSING ARGUMENTS:
${
  intelligence.opposingArguments
    .slice(0, 8)
    .map((item) => `- ${item.argument} Response: ${item.responseStrategy}`)
    .join("\n") || "None"
}

JUDGE CONCERNS:
${
  intelligence.judgeConcerns
    .slice(0, 8)
    .map((item) => `- ${item.concern} Address by: ${item.howToAddress}`)
    .join("\n") || "None"
}

FORM RECOMMENDATIONS:
${
  intelligence.formRecommendations
    .slice(0, 8)
    .map(
      (form) =>
        `- ${form.formNumber ? `${form.formNumber}: ` : ""}${form.title}. Reason: ${
          form.reason
        }`,
    )
    .join("\n") || "None"
}

NEXT BEST ACTIONS:
${
  intelligence.nextBestActions
    .slice(0, 8)
    .map((item) => `- ${item}`)
    .join("\n") || "None"
}

SYSTEM WARNINGS:
${intelligence.systemWarnings.map((item) => `- ${item}`).join("\n") || "None"}

MASTER_RESULT SNAPSHOT:
${safeJson(body.master_result, 5000)}

CASE_DATA SNAPSHOT:
${safeJson(body.caseData, 3500)}

EVIDENCE_DATA SNAPSHOT:
${safeJson(body.evidenceData, 3500)}

STRATEGY_DATA SNAPSHOT:
${safeJson(body.strategyData, 2500)}

WORKSPACE_DOCUMENT SNAPSHOT:
${safeJson(body.workspaceDocument, 3500)}
`;
}

export async function POST(req: NextRequest) {
  try {
    const body: AssistantRequestBody = await req.json();
    const message = clean(body.message);

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          mode: "validation-error" satisfies AssistantResponseMode,
          error: "Missing user message.",
        },
        { status: 400 },
      );
    }

    const recentConversation = trimConversation(body.conversation || []);
    const rawUserText = buildConversationText(recentConversation, message);

    const brainOutput = await runCourtSimplifiedBrain({
      caseId: body.caseId,
      courtPath: extractExistingPath(body),
      province: extractExistingProvince(body.master_result, body.caseData),
      stage: extractExistingStage(body),
      rawUserText,
      existingMasterResult: body.master_result || body.caseData || {},
      sourceType: "chat-message",
    });

    if (!openai) {
      return NextResponse.json({
        success: true,
        mode: "brain-only-fallback" satisfies AssistantResponseMode,
        answer: buildFallbackAnswer(brainOutput.intelligence),
        intelligence: brainOutput.intelligence,
        masterResultPatch: brainOutput.masterResultPatch,
        dashboardPatch: brainOutput.dashboardPatch,
        recommendedNextRoute: brainOutput.recommendedNextRoute,
        metadata: {
          caseId: body.caseId || null,
          path: body.path || null,
          proceduralStage: body.proceduralStage || null,
          usedBrain: true,
          usedOpenAIForBrain: false,
          usedOpenAIForAssistant: false,
          reason: "OPENAI_API_KEY is not configured.",
        },
      });
    }

    const response = await openai.chat.completions.create({
      model:
        process.env.COURTSIMPLIFIED_ASSISTANT_MODEL ||
        process.env.COURTSIMPLIFIED_REASONING_MODEL ||
        "gpt-4o-mini",
      temperature: 0.12,
      messages: [
        {
          role: "system",
          content: buildWorkflowAssistantPrompt(),
        },
        {
          role: "system",
          content: buildStructuredIntelligenceContext({
            body,
            brainOutput,
          }),
        },
        ...recentConversation,
        {
          role: "user",
          content: message,
        },
      ],
    });

    const answer =
      response.choices[0]?.message?.content?.trim() ||
      buildFallbackAnswer(brainOutput.intelligence);

    return NextResponse.json({
      success: true,
      mode: "workflow-assistant" satisfies AssistantResponseMode,

      answer,

      intelligence: brainOutput.intelligence,
      masterResultPatch: brainOutput.masterResultPatch,
      dashboardPatch: brainOutput.dashboardPatch,
      recommendedNextRoute: brainOutput.recommendedNextRoute,

      metadata: {
        caseId: body.caseId || null,
        path: body.path || null,
        proceduralStage: body.proceduralStage || null,

        usedMasterResult: Boolean(body.master_result),
        usedEvidenceData: Boolean(body.evidenceData),
        usedStrategyData: Boolean(body.strategyData),
        usedWorkspaceDocument: Boolean(body.workspaceDocument),

        usedBrain: true,
        usedOpenAIForBrain: true,
        usedOpenAIForAssistant: true,

        primaryClaimTypes: brainOutput.intelligence.primaryClaimTypes,
        rejectedFalsePositives:
          brainOutput.intelligence.rejectedFalsePositives.map(
            (claim) => claim.claimType,
          ),
        recommendedNextRoute: brainOutput.recommendedNextRoute || null,
        conversationMessages: recentConversation.length,
      },
    });
  } catch (error) {
    console.error("assistant-chat route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "The CourtSimplified assistant could not respond right now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}