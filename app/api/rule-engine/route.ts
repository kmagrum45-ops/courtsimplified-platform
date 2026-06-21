import { NextResponse } from "next/server";
import { runRuleEngine } from "../../../src/lib/case-system/rulesEngine";

export async function POST(req: Request) {
  try {
    const intake = await req.json();

    const result = await runRuleEngine({
      courtPath: intake.courtPath || "not-sure",
      stage: intake.stage || intake.caseStage || "not-sure",
      facts: intake.facts || "",
      issues: intake.issues || [],
      timeline: intake.timeline || "",
      evidence: intake.evidence || "",
      missingEvidence: intake.missingEvidence || "",
      amountClaimed: intake.amountClaimed || "",
      damagesBreakdown: intake.damagesBreakdown || "",
      agreementDetails: intake.agreementDetails || "",
      paymentHistory: intake.paymentHistory || "",
      serviceDetails: intake.serviceDetails || "",
      deadlineDetails: intake.deadlineDetails || "",
      settlementEfforts: intake.settlementEfforts || "",
      defenceResponse: intake.defenceResponse || "",
      goal: intake.goal || "",
      urgent: intake.urgent || "",
      filedDocuments: intake.filedDocuments || [],
      completedForms: intake.completedForms || [],
      receivedForms: intake.receivedForms || [],
      requiredNextForms: intake.requiredNextForms || [],
      notNeededNow: intake.notNeededNow || [],
      availableEvidence: intake.availableEvidence || [],
      userData: intake.userData || intake.extra || {},
    });

    return NextResponse.json({
      ok: true,
      source: "rule-engine",
      result,
    });
  } catch (error) {
    console.error("rule-engine route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Rule engine failed.",
      },
      { status: 500 }
    );
  }
}