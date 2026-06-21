import { cleanList, normalize } from "./utils";
import { ScenarioResult, ScenarioIssue } from "./scenarioEngine";

export type ConfidenceLevel =
  | "primary"
  | "secondary"
  | "possible"
  | "suppressed";

export type ScenarioConfidenceDecision = {
  issueId: string;
  label: string;
  confidence: number;
  level: ConfidenceLevel;
  reasons: string[];
};

export type ScenarioConfidenceResult = {
  primaryIssue?: ScenarioConfidenceDecision;
  secondaryIssues: ScenarioConfidenceDecision[];
  possibleIssues: ScenarioConfidenceDecision[];
  suppressedIssues: ScenarioConfidenceDecision[];

  allowedTheoryLabels: string[];
  suppressedTheoryLabels: string[];

  focusNotes: string[];
};

function toDecision(
  issue: ScenarioIssue,
  level: ConfidenceLevel
): ScenarioConfidenceDecision {
  return {
    issueId: issue.id,
    label: issue.label,
    confidence: issue.confidence,
    level,
    reasons: issue.reasons,
  };
}

function theoryLabelsForIssue(issueId: string): string[] {
  const map: Record<string, string[]> = {
    "debt-unpaid-money": [
      "Debt / unpaid money claim",
      "Debt / unpaid money",
    ],
    "contract-breach": [
      "Breach of contract / agreement",
      "Contract / agreement dispute",
    ],
    "property-damage": [
      "Property damage / defective work",
      "Property damage / repair claim",
    ],
    defamation: [
      "Defamation / reputational harm",
    ],
    "consumer-refund": [
      "Consumer purchase / refund dispute",
    ],
    enforcement: [
      "Enforcement after judgment",
    ],
    "family-parenting": [
      "Parenting / decision-making responsibility",
    ],
    "family-support": [
      "Child or spousal support",
    ],
    "civil-negligence": [
      "Negligence",
    ],
    "civil-charter": [
      "Charter claim",
      "Charter / government rights claim",
    ],
  };

  return map[issueId] || [];
}

function isCloseEnoughToPrimary(issue: ScenarioIssue, primary?: ScenarioIssue) {
  if (!primary) return false;
  return issue.confidence >= Math.max(55, primary.confidence - 20);
}

export function runScenarioConfidenceEngine(
  scenario: ScenarioResult
): ScenarioConfidenceResult {
  const confirmedIssues = [
    ...(scenario.primaryIssue ? [scenario.primaryIssue] : []),
    ...scenario.secondaryIssues,
  ];

  const sortedConfirmed = cleanList(confirmedIssues.map((issue) => issue.id))
    .map((id) => confirmedIssues.find((issue) => issue.id === id))
    .filter(Boolean) as ScenarioIssue[];

  const primary = scenario.primaryIssue;

  const primaryIssue =
    primary && primary.confidence >= 55
      ? toDecision(primary, "primary")
      : undefined;

  const secondaryIssues = sortedConfirmed
    .filter((issue) => issue.id !== primary?.id)
    .filter((issue) => isCloseEnoughToPrimary(issue, primary))
    .slice(0, 2)
    .map((issue) => toDecision(issue, "secondary"));

  const possibleIssues = scenario.possibleUnconfirmedIssues
    .filter((issue) => issue.confidence >= 30)
    .slice(0, 4)
    .map((issue) => toDecision(issue, "possible"));

  const suppressedIssues = [
    ...scenario.excludedIssues,
    ...scenario.possibleUnconfirmedIssues.filter((issue) => issue.confidence < 30),
    ...sortedConfirmed.filter(
      (issue) =>
        issue.id !== primary?.id &&
        !secondaryIssues.some((secondary) => secondary.issueId === issue.id)
    ),
  ].map((issue) => toDecision(issue, "suppressed"));

  const allowedTheoryLabels = cleanList([
    ...(primaryIssue ? theoryLabelsForIssue(primaryIssue.issueId) : []),
    ...secondaryIssues.flatMap((issue) => theoryLabelsForIssue(issue.issueId)),
  ]);

  const suppressedTheoryLabels = cleanList(
    suppressedIssues.flatMap((issue) => theoryLabelsForIssue(issue.issueId))
  );

  const focusNotes: string[] = [];

  if (primaryIssue) {
    focusNotes.push(
      `Primary focus should be ${primaryIssue.label}.`
    );
  } else {
    focusNotes.push(
      "No primary issue is confirmed strongly enough. Ask clarifying questions before deep legal analysis."
    );
  }

  if (secondaryIssues.length > 0) {
    focusNotes.push(
      `Secondary issues may be considered: ${secondaryIssues
        .map((issue) => issue.label)
        .join(", ")}.`
    );
  }

  if (possibleIssues.length > 0) {
    focusNotes.push(
      "Possible issues should be shown as questions to confirm, not full legal recommendations."
    );
  }

  if (suppressedTheoryLabels.length > 0) {
    focusNotes.push(
      "Low-confidence or unrelated theories should be suppressed from the main summary."
    );
  }

  if (scenario.stage === "conference") {
    focusNotes.push(
      "At conference stage, emphasize settlement position, evidence organization, and disputed issues rather than starting-form recommendations."
    );
  }

  if (scenario.stage === "trial") {
    focusNotes.push(
      "At trial stage, emphasize witnesses, admissible evidence, chronology, and proof of each legal element."
    );
  }

  if (scenario.stage === "enforcement") {
    focusNotes.push(
      "At enforcement stage, focus on judgment details, debtor information, and collection options."
    );
  }

  return {
    primaryIssue,
    secondaryIssues,
    possibleIssues,
    suppressedIssues,
    allowedTheoryLabels,
    suppressedTheoryLabels,
    focusNotes: cleanList(focusNotes),
  };
}

export function filterTheoryListByConfidence(
  theories: string[],
  confidence: ScenarioConfidenceResult
) {
  if (confidence.allowedTheoryLabels.length === 0) {
    return [];
  }

  return cleanList(
    theories.filter((theory) => {
      const value = normalize(theory);

      return confidence.allowedTheoryLabels.some((allowed) =>
        value.includes(normalize(allowed)) ||
        normalize(allowed).includes(value)
      );
    })
  );
}

export function shouldSuppressTheory(
  theoryName: string,
  confidence: ScenarioConfidenceResult
) {
  const value = normalize(theoryName);

  if (
    confidence.allowedTheoryLabels.some(
      (allowed) =>
        value.includes(normalize(allowed)) ||
        normalize(allowed).includes(value)
    )
  ) {
    return false;
  }

  return confidence.suppressedTheoryLabels.some(
    (suppressed) =>
      value.includes(normalize(suppressed)) ||
      normalize(suppressed).includes(value)
  );
}