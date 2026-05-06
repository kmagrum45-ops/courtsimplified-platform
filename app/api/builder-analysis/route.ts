import { NextResponse } from "next/server";

type AnalysisResult = {
  courtPath: "family" | "small-claims" | "civil";
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

function fallbackAnalysis(data: any): AnalysisResult {
  return {
    courtPath: data?.courtPath || "family",
    caseStage: data?.caseStage || "not-sure",
    completedForms: [],
    requiredNextForms: [],
    notNeededNow: [],
    detectedIssues: ["AI analysis failed — fallback mode used"],
    inferredFacts: [],
    missingInformation: ["Check OpenAI API key or server setup"],
    risksAndGaps: [],
    guidance: ["System fallback — AI not running"],
    summary: "AI could not analyze this intake. Check setup.",
  };
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(fallbackAnalysis(data), { status: 200 });
    }

    const prompt = `
You are CourtSimplified, a practical Canadian legal intake assistant.

You help self-represented users organize information for court.
You do not give legal advice.
You do not invent facts.

CRITICAL RULES:
- Read the FULL story
- DO NOT list something as missing if it is already implied
- Infer facts where reasonable
- Separate issues, inferred facts, and missing information

Return ONLY JSON in this exact format:

{
  "courtPath": "family",
  "caseStage": "",
  "completedForms": [],
  "requiredNextForms": [],
  "notNeededNow": [],
  "detectedIssues": [],
  "inferredFacts": [],
  "missingInformation": [],
  "risksAndGaps": [],
  "guidance": [],
  "summary": ""
}

INTAKE:
${JSON.stringify(data, null, 2)}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(fallbackAnalysis(data), { status: 200 });
    }

    const result = await response.json();

    const text =
      result.output_text ||
      result.output?.[0]?.content?.[0]?.text ||
      "";

    let parsed: AnalysisResult;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = fallbackAnalysis(data);
      parsed.summary = "AI response was not valid JSON.";
    }

    return NextResponse.json(parsed, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: "Server error during analysis" },
      { status: 500 }
    );
  }
}