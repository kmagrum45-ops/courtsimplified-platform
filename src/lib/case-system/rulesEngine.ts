// src/lib/case-system/ruleEngine.ts

type IntakeData = {
  courtPath: string;
  stage: string;
  facts: string;
  issues?: string[];
};

type RuleMatch = {
  issueMatches: any[];
  procedureMatches: any[];
  evidenceMatches: any[];
};

export async function runRuleEngine(intake: IntakeData): Promise<RuleMatch> {
  const { courtPath, facts, stage } = intake;

  const text = facts.toLowerCase();

  // =========================
  // ISSUE DETECTION (basic for now)
  // =========================
  const detectedIssues: string[] = [];

  if (text.includes("not pay") || text.includes("owe") || text.includes("unpaid")) {
    detectedIssues.push("Unpaid invoice or unpaid money");
  }

  if (text.includes("contract") || text.includes("agreement") || text.includes("quote")) {
    detectedIssues.push("Breach of contract or agreement");
  }

  if (text.includes("damage") || text.includes("broke") || text.includes("repair")) {
    detectedIssues.push("Property damage");
  }

  if (text.includes("false") || text.includes("lied") || text.includes("reputation") || text.includes("pedophile")) {
    detectedIssues.push("Defamation / reputational harm");
  }

  if (text.includes("child") || text.includes("parenting") || text.includes("custody")) {
    detectedIssues.push("Parenting / decision-making responsibility");
  }

  if (text.includes("support") || text.includes("income")) {
    detectedIssues.push("Child support");
  }

  if (text.includes("injury") || text.includes("negligence") || text.includes("harm")) {
    detectedIssues.push("Negligence / damages");
  }

  // =========================
  // FETCH RULES FROM DATABASE
  // =========================
  const issueRes = await fetch("/api/rules/issues", {
    method: "POST",
    body: JSON.stringify({ courtPath, issues: detectedIssues }),
  });

  const procedureRes = await fetch("/api/rules/procedures", {
    method: "POST",
    body: JSON.stringify({ courtPath, stage }),
  });

  const evidenceRes = await fetch("/api/rules/evidence", {
    method: "POST",
    body: JSON.stringify({ courtPath, issues: detectedIssues }),
  });

  const issueMatches = await issueRes.json();
  const procedureMatches = await procedureRes.json();
  const evidenceMatches = await evidenceRes.json();

  return {
    issueMatches,
    procedureMatches,
    evidenceMatches,
  };
}