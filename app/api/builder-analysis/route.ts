import { NextResponse } from "next/server";

type CourtPath = "family" | "small-claims" | "civil";

type AnalysisResult = {
  courtPath: CourtPath;
  caseStage: string;
  completedForms: string[];
  requiredNextForms: string[];
  notNeededNow: string[];
  detectedIssues: string[];
  inferredFacts: string[];
  missingInformation: string[];
  risksAndGaps: string[];
  guidance: string[];
  summary: string;
};

function normalizeCourtPath(value: unknown): CourtPath {
  if (value === "small-claims" || value === "civil" || value === "family") {
    return value;
  }

  return "family";
}

function fallbackAnalysis(data: any, message = "Analysis fallback used."): AnalysisResult {
  return {
    courtPath: normalizeCourtPath(data?.courtPath),
    caseStage: String(data?.caseStage || data?.currentStage || "not-sure"),
    completedForms: [],
    requiredNextForms: [],
    notNeededNow: [],
    detectedIssues: [],
    inferredFacts: [],
    missingInformation: [message],
    risksAndGaps: [],
    guidance: [
      "Continue using the guided intake. Final form recommendations should be validated through the CourtSimplified rules and forms system.",
    ],
    summary: message,
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function mapCaseSummaryToBuilderAnalysis(data: any, parsed: any): AnalysisResult {
  const analysis = parsed?.analysis || parsed || {};

  return {
    courtPath: normalizeCourtPath(analysis.courtPath || data?.courtPath),
    caseStage: String(
      analysis.currentStage ||
        analysis.caseStage ||
        data?.caseStage ||
        "not-sure"
    ),

    completedForms: toStringArray(analysis.completedForms),
    requiredNextForms: toStringArray(analysis.requiredNextForms),
    notNeededNow: toStringArray(analysis.notNeededNow),

    detectedIssues: [
      ...toStringArray(analysis.legalIssues),
      ...toStringArray(analysis.detectedLegalPaths),
      ...toStringArray(analysis.factualThemes),
    ],

    inferredFacts: toStringArray(analysis.timelineAnalysis),

    missingInformation: [
      ...toStringArray(analysis.missingInformation),
      ...toStringArray(analysis.missingEvidence),
    ],

    risksAndGaps: [
      ...toStringArray(analysis.risks),
      ...toStringArray(analysis.deadlineRisks),
      ...toStringArray(analysis.serviceRisks),
      ...toStringArray(analysis.limitationRisks),
      ...toStringArray(analysis.contradictions),
    ],

    guidance: [
      ...toStringArray(analysis.nextSteps),
      ...toStringArray(analysis.caseStrategy),
      ...toStringArray(analysis.recommendedQuestions),
    ],

    summary: String(
      analysis.plainLanguageSummary ||
        analysis.summary ||
        "CourtSimplified analyzed the intake."
    ),
  };
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const caseSummaryUrl = new URL("/api/case-summary", req.url);

    const response = await fetch(caseSummaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return NextResponse.json(
        fallbackAnalysis(
          data,
          "The main case-summary analysis route did not return a successful response."
        ),
        { status: 200 }
      );
    }

    const parsed = await response.json();
    const mapped = mapCaseSummaryToBuilderAnalysis(data, parsed);

    return NextResponse.json(
      {
        ...mapped,
        sourceRoute: "case-summary",
        compatibilityRoute: "builder-analysis",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      fallbackAnalysis(
        {},
        "Server error during builder-analysis compatibility routing."
      ),
      { status: 200 }
    );
  }
}