import { NextResponse } from "next/server";

type CourtSimplifiedAnalysis = {
  summary: string;
  caseType: string;
  currentStage: string;

  completedForms: string[];
  receivedForms: string[];
  requiredNextForms: string[];
  notNeededNow: string[];

  missingInformation: string[];
  evidenceMentioned: string[];

  legalIssues: string[];
  timelineAnalysis: string[];
  proceduralStageReasoning: string[];

  risks: string[];
  contradictions: string[];

  evidenceStrengths: string[];
  evidenceWeaknesses: string[];
  missingEvidence: string[];

  deadlineRisks: string[];
  serviceRisks: string[];
  limitationRisks: string[];

  opposingArguments: string[];
  courtConcerns: string[];

  recommendedQuestions: string[];
  caseStrategy: string[];
  casePackageItems: string[];

  nextSteps: string[];
};

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { summary: "OpenAI API key is missing." },
        { status: 500 }
      );
    }

    const prompt = `
You are CourtSimplified — an advanced legal reasoning engine.

You DO NOT behave like a chatbot.
You behave like a legal professional reviewing a full case file.

----------------------------------------
MANDATORY THINKING PROCESS
----------------------------------------

1. Reconstruct a timeline from facts
2. Identify current legal stage
3. Identify legal issues (substantive + procedural)
4. Detect contradictions
5. Identify risks (deadlines, evidence, process)
6. Analyze evidence strength
7. Consider opposing arguments
8. Consider what a judge will focus on
9. Determine ONLY next procedural steps

----------------------------------------
CRITICAL RULES
----------------------------------------

- NEVER recommend steps already completed
- NEVER restart a case already in progress
- DO NOT guess — use missingInformation instead
- DO NOT give legal advice
- THINK before answering

----------------------------------------
WHAT YOU MUST DETECT

LEGAL ISSUES:
- breach of contract
- unpaid debt
- negligence
- procedural defects
- jurisdiction issues

RISKS:
- missed deadlines
- weak evidence
- no proof of service
- incorrect process
- limitation periods

CONTRADICTIONS:
- user says something is done but also asks how to do it
- timeline inconsistencies

EVIDENCE ANALYSIS:
- what supports the claim
- what is missing
- what is weak

----------------------------------------
OUTPUT STRICT JSON

{
  "summary": "",
  "caseType": "",
  "currentStage": "",

  "completedForms": [],
  "receivedForms": [],
  "requiredNextForms": [],
  "notNeededNow": [],

  "missingInformation": [],
  "evidenceMentioned": [],

  "legalIssues": [],
  "timelineAnalysis": [],
  "proceduralStageReasoning": [],

  "risks": [],
  "contradictions": [],

  "evidenceStrengths": [],
  "evidenceWeaknesses": [],
  "missingEvidence": [],

  "deadlineRisks": [],
  "serviceRisks": [],
  "limitationRisks": [],

  "opposingArguments": [],
  "courtConcerns": [],

  "recommendedQuestions": [],
  "caseStrategy": [],
  "casePackageItems": [],

  "nextSteps": []
}

----------------------------------------
INTAKE DATA
----------------------------------------

${JSON.stringify(data, null, 2)}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          summary:
            "OpenAI error: " +
            (result?.error?.message || "Unknown error"),
        },
        { status: response.status }
      );
    }

    const rawContent = result?.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json({
        summary: "No analysis generated.",
      });
    }

    let parsed: CourtSimplifiedAnalysis;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({
        summary: rawContent,
      });
    }

    return NextResponse.json({
      summary: parsed.summary || "",
      analysis: parsed,
      caseType: parsed.caseType || "Unknown",
      currentStage: parsed.currentStage || "Unknown",
      completedForms: parsed.completedForms || [],
      receivedForms: parsed.receivedForms || [],
      requiredNextForms: parsed.requiredNextForms || [],
      notNeededNow: parsed.notNeededNow || [],
      missingInformation: parsed.missingInformation || [],
      evidenceMentioned: parsed.evidenceMentioned || [],

      legalIssues: parsed.legalIssues || [],
      timelineAnalysis: parsed.timelineAnalysis || [],
      proceduralStageReasoning: parsed.proceduralStageReasoning || [],

      risks: parsed.risks || [],
      contradictions: parsed.contradictions || [],

      evidenceStrengths: parsed.evidenceStrengths || [],
      evidenceWeaknesses: parsed.evidenceWeaknesses || [],
      missingEvidence: parsed.missingEvidence || [],

      deadlineRisks: parsed.deadlineRisks || [],
      serviceRisks: parsed.serviceRisks || [],
      limitationRisks: parsed.limitationRisks || [],

      opposingArguments: parsed.opposingArguments || [],
      courtConcerns: parsed.courtConcerns || [],

      recommendedQuestions: parsed.recommendedQuestions || [],
      caseStrategy: parsed.caseStrategy || [],
      casePackageItems: parsed.casePackageItems || [],

      nextSteps: parsed.nextSteps || [],
    });
  } catch (err) {
    return NextResponse.json(
      { summary: "Server error." },
      { status: 500 }
    );
  }
}