import type {
  FamilyCaseType,
  FamilyLitigationStage,
  ParentingIssueType,
  PropertyIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

import type { FamilyNormalizedIntake } from "./familyAiIntakeNormalizer";
import type { FamilyStrategyResult } from "./familyStrategyEngine";

export type FamilyWorkflowInput = {
  normalized: FamilyNormalizedIntake;
  strategy: FamilyStrategyResult;
};

export type FamilyWorkflowPriority =
  | "urgent-safety"
  | "respond-deadline"
  | "conference-preparation"
  | "motion-preparation"
  | "disclosure-compliance"
  | "parenting-plan"
  | "support-calculation"
  | "property-disclosure"
  | "trial-readiness"
  | "enforcement"
  | "start-application"
  | "clarify-intake";

export type FamilyWorkflowStep = {
  id: string;
  priority: FamilyWorkflowPriority;
  title: string;
  explanation: string;
  requiredForms: string[];
  recommendedForms: string[];
  evidenceNeeded: string[];
  judgeFocus: string[];
  userActions: string[];
  blockers: string[];
  warnings: string[];
};

export type FamilyWorkflowResult = {
  primaryPriority: FamilyWorkflowPriority;
  stage: FamilyLitigationStage;
  detectedCaseTypes: FamilyCaseType[];
  parentingIssues: ParentingIssueType[];
  supportIssues: SupportIssueType[];
  safetyIssues: SafetyConcernType[];
  propertyIssues: PropertyIssueType[];
  requiredFormsNow: string[];
  recommendedFormsLater: string[];
  evidenceNeededNow: string[];
  proceduralWarnings: string[];
  judgeFocus: string[];
  nextBestActions: string[];
  blockersBeforeForms: string[];
  workflowSteps: FamilyWorkflowStep[];
  summary: string;
};

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function hasIssue<T extends string>(items: Array<{ issue: T }>, issue: T): boolean {
  return items.some((item) => item.issue === issue);
}

function labels<T extends string>(items: Array<{ issue: T }>): T[] {
  return cleanList(items.map((item) => item.issue)) as T[];
}

function createStep(params: FamilyWorkflowStep): FamilyWorkflowStep {
  return {
    ...params,
    requiredForms: cleanList(params.requiredForms),
    recommendedForms: cleanList(params.recommendedForms),
    evidenceNeeded: cleanList(params.evidenceNeeded),
    judgeFocus: cleanList(params.judgeFocus),
    userActions: cleanList(params.userActions),
    blockers: cleanList(params.blockers),
    warnings: cleanList(params.warnings),
  };
}

export function runFamilyWorkflowEngine(
  input: FamilyWorkflowInput,
): FamilyWorkflowResult {
  const { normalized, strategy } = input;
  const steps: FamilyWorkflowStep[] = [];

  const stage = normalized.stage;
  const detectedCaseTypes = labels(normalized.detectedCaseTypes);
  const parentingIssues = labels(normalized.parentingIssues);
  const supportIssues = labels(normalized.supportIssues);
  const safetyIssues = labels(normalized.safetyIssues);
  const propertyIssues = labels(normalized.propertyIssues);

  const hasParenting =
    hasIssue(normalized.detectedCaseTypes, "parenting-time") ||
    hasIssue(normalized.detectedCaseTypes, "decision-making-responsibility") ||
    normalized.parentingIssues.length > 0;

  const hasSupport =
    hasIssue(normalized.detectedCaseTypes, "child-support") ||
    hasIssue(normalized.detectedCaseTypes, "spousal-support") ||
    normalized.supportIssues.length > 0;

  const hasSafety =
    hasIssue(normalized.detectedCaseTypes, "restraining-order") ||
    hasIssue(normalized.detectedCaseTypes, "urgent-motion") ||
    normalized.safetyIssues.length > 0 ||
    normalized.risks.urgencyFlags.length > 0;

  const hasProperty =
    hasIssue(normalized.detectedCaseTypes, "property-division") ||
    normalized.propertyIssues.length > 0;

  const hasRelocation =
    hasIssue(normalized.detectedCaseTypes, "mobility-relocation") ||
    hasIssue(normalized.parentingIssues, "mobility-relocation");

  const hasExistingOrder = normalized.procedural.hasExistingOrder;
  const isResponding = normalized.procedural.isResponding;
  const isConference = normalized.procedural.isConference;
  const isMotion = normalized.procedural.isMotion;
  const isUrgent = normalized.procedural.isUrgent;
  const isTrial = normalized.procedural.isTrial;
  const isEnforcement = normalized.procedural.isEnforcement;
  const isStarting = normalized.procedural.isStarting;

  if (hasSafety || isUrgent) {
    steps.push(
      createStep({
        id: "urgent-safety-review",
        priority: "urgent-safety",
        title: "Review urgent safety and protection issues first",
        explanation:
          "Safety concerns must be separated from ordinary parenting conflict. The system should ask for specific incidents, dates, evidence, witnesses, and what immediate order is needed.",
        requiredForms: ["Form 14 - Notice of Motion", "Form 14A - Affidavit"],
        recommendedForms: ["Draft proposed temporary order terms", "Safety incident chronology"],
        evidenceNeeded: [
          "Dated incident timeline",
          "Police occurrence numbers or reports if available",
          "Screenshots or messages showing threats, harassment, or unsafe conduct",
          "Witness names and what each witness can confirm",
          "Existing orders, undertakings, recognizances, or agreements if any",
        ],
        judgeFocus: [
          "What specific urgent risk exists now?",
          "What evidence supports the risk?",
          "Why can the issue not wait for the ordinary court process?",
          "What narrow order would reduce the risk?",
        ],
        userActions: [
          "List each safety incident by date.",
          "Separate safety facts from general conflict.",
          "Draft exact temporary terms requested.",
          "Upload screenshots, police records, prior orders, or witness details.",
        ],
        blockers: normalized.evidence.hasPoliceOrSafetyRecords
          ? []
          : ["Safety concerns are detected, but safety evidence is not clearly organized yet."],
        warnings: [
          "Do not rely on labels like abusive or dangerous without dated facts and evidence.",
          "Urgent materials should be specific, calm, and tied to the requested order.",
        ],
      }),
    );
  }

  if (isResponding) {
    steps.push(
      createStep({
        id: "responding-to-application",
        priority: "respond-deadline",
        title: "Respond to the application before building optional materials",
        explanation:
          "If the user has been served, the system should focus on what was received, the response deadline, what is admitted or denied, and whether a claim should be made in response.",
        requiredForms: ["Form 10 - Answer"],
        recommendedForms: [
          hasParenting ? "Form 35.1 - Parenting Affidavit" : "",
          hasSupport ? "Form 13 - Financial Statement" : "",
          hasProperty ? "Form 13.1 - Financial Statement" : "",
        ],
        evidenceNeeded: [
          "Application and all served documents",
          "Date and method of service",
          "Paragraph-by-paragraph response notes",
          "Documents proving facts that are denied or corrected",
        ],
        judgeFocus: [
          "What is admitted?",
          "What is denied?",
          "What order does the respondent want?",
          "Are financial and parenting documents complete?",
        ],
        userActions: [
          "Upload or summarize the forms received.",
          "Identify the service date and any deadline.",
          "Separate admissions, denials, and requested orders.",
        ],
        blockers: normalized.procedural.receivedForms.length > 0
          ? []
          : ["The user appears to be responding, but the received forms have not been listed."],
        warnings: [
          "Do not draft from only the user's story without checking what the application actually asks for.",
        ],
      }),
    );
  }

  if (isStarting) {
    steps.push(
      createStep({
        id: "start-family-application",
        priority: "start-application",
        title: "Start the family application with the correct issue set",
        explanation:
          "Before generating forms, the system should confirm the claims being made, the requested orders, the court level, parties, children, and whether support or property disclosure is required.",
        requiredForms: ["Form 8 - Application"],
        recommendedForms: [
          hasParenting ? "Form 35.1 - Parenting Affidavit" : "",
          hasSupport ? "Form 13 - Financial Statement" : "",
          hasProperty ? "Form 13.1 - Financial Statement" : "",
        ],
        evidenceNeeded: [
          "Children's names, ages, residence, school/daycare, and current schedule",
          "Requested orders in exact terms",
          "Timeline of separation, parenting changes, support payments, and major incidents",
          "Existing agreements, messages, records, and disclosure documents",
        ],
        judgeFocus: [
          "What order is requested?",
          "Why is the requested order in the child's best interests?",
          "What facts support the requested order?",
          "Are support/property claims supported by disclosure?",
        ],
        userActions: [
          "Confirm each issue being claimed.",
          "Draft exact requested order terms.",
          "Build a timeline before generating affidavits or summaries.",
        ],
        blockers: cleanList([
          normalized.children.hasChildrenInfo ? "" : "Children's information is incomplete.",
          normalized.missingInformation.includes("Exact order or outcome requested from the court.")
            ? "The exact requested order is not clear yet."
            : "",
        ]),
        warnings: [
          "Do not recommend every possible form. Recommend only forms tied to the issues and stage.",
        ],
      }),
    );
  }

  if (hasParenting) {
    steps.push(
      createStep({
        id: "parenting-plan-and-best-interests",
        priority: "parenting-plan",
        title: "Build the parenting proposal and best-interests analysis",
        explanation:
          "Parenting materials must be child-focused. The system should convert conflict into facts about stability, caregiving, routine, communication, safety, school, medical needs, and practical scheduling.",
        requiredForms: [hasExistingOrder ? "Motion/change materials depend on the existing order" : "Form 35.1 - Parenting Affidavit"],
        recommendedForms: ["Parenting schedule chart", "Best-interests evidence summary", "Proposed parenting order terms"],
        evidenceNeeded: [
          "Current and proposed parenting schedule",
          "Caregiving history",
          "School/daycare records if relevant",
          "Messages about exchanges, missed visits, or decision-making",
          "Travel, school, medical, and holiday details",
        ],
        judgeFocus: [
          "Is the proposed schedule practical?",
          "Does it support stability and the child's needs?",
          "Can the parents communicate about decisions?",
          "Does either parent create safety, withholding, or gatekeeping concerns?",
        ],
        userActions: [
          "Create a weekly parenting schedule.",
          "List exchange times and locations.",
          "Explain decision-making requests separately from parenting time.",
          "Tie every request to a child-focused reason.",
        ],
        blockers: cleanList([
          normalized.children.hasCurrentSchedule ? "" : "Current parenting schedule is missing.",
          normalized.children.hasCaregivingHistory ? "" : "Past caregiving history is missing.",
        ]),
        warnings: [
          "Avoid adult-conflict wording unless it directly affects the child or the requested order.",
        ],
      }),
    );
  }

  if (hasRelocation) {
    steps.push(
      createStep({
        id: "relocation-plan",
        priority: "parenting-plan",
        title: "Build a relocation/mobility plan",
        explanation:
          "Relocation disputes need concrete details: where the child will live, school/daycare, transportation, financial impact, relationship preservation, and a revised parenting schedule.",
        requiredForms: ["Forms depend on whether this is a new application, motion, or change to an existing order"],
        recommendedForms: ["Relocation plan", "Transportation plan", "Revised parenting schedule"],
        evidenceNeeded: [
          "Proposed new city or area",
          "School/daycare plan",
          "Housing plan",
          "Employment or family-support reasons for move",
          "Transportation and contact plan for the other parent",
        ],
        judgeFocus: [
          "How will the move affect the child?",
          "How will the child maintain a relationship with the other parent?",
          "Is the plan realistic and child-focused?",
        ],
        userActions: [
          "Draft a complete relocation plan.",
          "Prepare a revised parenting schedule.",
          "Gather school, housing, and transportation evidence.",
        ],
        blockers: ["Relocation cannot be handled with vague reasons alone; a concrete plan is needed."],
        warnings: ["Relocation analysis is highly fact-specific and should be carefully organized."],
      }),
    );
  }

  if (hasSupport) {
    steps.push(
      createStep({
        id: "support-and-disclosure",
        priority: "support-calculation",
        title: "Organize support and financial disclosure",
        explanation:
          "Support issues require income, disclosure, support history, expenses, and any dispute about imputed income, arrears, or section 7 expenses.",
        requiredForms: [hasProperty ? "Form 13.1 - Financial Statement" : "Form 13 - Financial Statement"],
        recommendedForms: ["Support calculation worksheet", "Financial disclosure checklist", "Section 7 expense table"],
        evidenceNeeded: [
          "Recent pay stubs",
          "Tax returns and Notices of Assessment",
          "Proof of benefits or self-employment income",
          "Childcare, medical, school, and activity receipts",
          "Support payments made or missed",
        ],
        judgeFocus: [
          "What are both parties' incomes?",
          "Is disclosure complete?",
          "Are special expenses proven and reasonable?",
          "Are arrears calculated clearly?",
        ],
        userActions: [
          "Create a support disclosure checklist.",
          "List income sources for both parties.",
          "Separate table support, section 7 expenses, arrears, and spousal support.",
        ],
        blockers: normalized.evidence.hasFinancialDisclosure
          ? []
          : ["Financial disclosure is not clearly organized yet."],
        warnings: ["Support recommendations should not be generated without income/disclosure inputs."],
      }),
    );
  }

  if (hasProperty) {
    steps.push(
      createStep({
        id: "property-and-equalization",
        priority: "property-disclosure",
        title: "Organize property, debts, and equalization issues",
        explanation:
          "Property claims require a separate financial-disclosure track. The system should identify the matrimonial home, assets, debts, excluded property, business interests, pensions, and sale/occupation issues.",
        requiredForms: ["Form 13.1 - Financial Statement (Property and Support Claims)"],
        recommendedForms: ["Asset/debt table", "Matrimonial home summary", "Property disclosure checklist"],
        evidenceNeeded: [
          "Mortgage or lease documents",
          "Property valuation or sale documents",
          "Bank, pension, debt, and vehicle records",
          "Business or corporate records if applicable",
          "Proof of excluded property if claimed",
        ],
        judgeFocus: [
          "What property exists?",
          "What debts exist?",
          "What is disputed?",
          "Is disclosure complete and organized?",
        ],
        userActions: [
          "Create an asset and debt table.",
          "Identify the matrimonial home issue.",
          "Separate urgent home/property issues from final equalization issues.",
        ],
        blockers: ["Property claims need structured disclosure before strong form generation."],
        warnings: ["Do not mix parenting facts with property equalization facts in one narrative."],
      }),
    );
  }

  if (isConference) {
    steps.push(
      createStep({
        id: "conference-preparation",
        priority: "conference-preparation",
        title: "Prepare for the family conference stage",
        explanation:
          "Conferences require issue narrowing, settlement positions, updated disclosure, proposed orders, and a clear summary of what remains disputed.",
        requiredForms: [
          stage === "case-conference" ? "Form 17A - Case Conference Brief" : "",
          stage === "settlement-conference" ? "Form 17C - Settlement Conference Brief" : "",
        ],
        recommendedForms: ["Updated financial disclosure", "Proposed order", "Settlement position summary"],
        evidenceNeeded: [
          "Updated issues list",
          "Disclosure exchanged and missing",
          "Settlement offers or proposals",
          "Key evidence only, organized by issue",
        ],
        judgeFocus: [
          "What issues can settle?",
          "What disclosure is missing?",
          "What procedural order is needed?",
          "Are the parties prepared and realistic?",
        ],
        userActions: [
          "Prepare a short issue list.",
          "List settlement offers and proposals.",
          "Update disclosure and evidence summaries.",
        ],
        blockers: [],
        warnings: ["Conference materials should be concise and focused on resolution."],
      }),
    );
  }

  if (isTrial) {
    steps.push(
      createStep({
        id: "trial-readiness",
        priority: "trial-readiness",
        title: "Assess trial readiness",
        explanation:
          "Trial readiness means the user has a clear theory, evidence list, witness plan, disclosure, proposed orders, and responses to likely opposing arguments.",
        requiredForms: ["Trial scheduling and trial-record materials depend on the court direction"],
        recommendedForms: ["Trial evidence package", "Witness outline", "Opening theory", "Proposed final order"],
        evidenceNeeded: [
          "Final evidence list",
          "Witness names and what each witness proves",
          "Updated financial documents if support/property is involved",
          "Chronology and proposed order",
        ],
        judgeFocus: [
          "What facts are actually disputed?",
          "What evidence proves each issue?",
          "Are witnesses necessary and prepared?",
          "What final order is requested?",
        ],
        userActions: [
          "Build a trial issue chart.",
          "Prepare witness questions.",
          "Organize exhibits by issue and date.",
        ],
        blockers: ["Trial materials should not be generated until issues, evidence, and witnesses are organized."],
        warnings: ["Trial preparation must be issue-driven, not a pile of documents."],
      }),
    );
  }

  if (isEnforcement) {
    steps.push(
      createStep({
        id: "family-enforcement",
        priority: "enforcement",
        title: "Enforce an existing family order or support obligation",
        explanation:
          "Enforcement is different from proving the original case. The system should identify the existing order, the breach, the unpaid amount or missed obligation, and the enforcement mechanism.",
        requiredForms: ["Enforcement forms depend on whether the issue is support, parenting, disclosure, or contempt-type relief"],
        recommendedForms: ["Order breach chart", "Arrears table", "Enforcement evidence package"],
        evidenceNeeded: [
          "Existing order or agreement",
          "Proof of non-compliance",
          "Payment history or missed parenting-time history",
          "Correspondence requesting compliance",
        ],
        judgeFocus: [
          "What order exists?",
          "What exact term was breached?",
          "What evidence proves non-compliance?",
          "What enforcement remedy is requested?",
        ],
        userActions: [
          "Upload the existing order.",
          "Create a breach chart.",
          "Separate enforcement facts from old merits arguments.",
        ],
        blockers: hasExistingOrder ? [] : ["An enforceable order or agreement must be identified."],
        warnings: ["Do not reargue the original case during enforcement unless legally necessary."],
      }),
    );
  }

  if (steps.length === 0) {
    steps.push(
      createStep({
        id: "clarify-family-intake",
        priority: "clarify-intake",
        title: "Clarify the family-law issue before recommending forms",
        explanation:
          "The intake does not yet provide enough structured information to safely route the matter. The system should ask targeted questions before recommending forms.",
        requiredForms: [],
        recommendedForms: [],
        evidenceNeeded: [
          "Children's information if parenting is involved",
          "Requested order",
          "Stage of the case",
          "Existing court documents or orders",
          "Key dates and evidence",
        ],
        judgeFocus: ["What issue is before the court?", "What order is requested?", "What facts and evidence support it?"],
        userActions: [
          "Clarify the case stage.",
          "Identify the requested order.",
          "Separate parenting, support, property, safety, and enforcement issues.",
        ],
        blockers: ["The legal issue and procedural stage are not clear enough yet."],
        warnings: ["Do not recommend forms from vague facts alone."],
      }),
    );
  }

  const priorityOrder: FamilyWorkflowPriority[] = [
    "urgent-safety",
    "respond-deadline",
    "enforcement",
    "motion-preparation",
    "conference-preparation",
    "trial-readiness",
    "start-application",
    "parenting-plan",
    "support-calculation",
    "property-disclosure",
    "disclosure-compliance",
    "clarify-intake",
  ];

  const sortedSteps = [...steps].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );

  const primaryPriority = sortedSteps[0]?.priority || "clarify-intake";

  const requiredFormsNow = cleanList(sortedSteps.flatMap((step) => step.requiredForms));
  const recommendedFormsLater = cleanList(sortedSteps.flatMap((step) => step.recommendedForms));
  const evidenceNeededNow = cleanList([
    ...sortedSteps.flatMap((step) => step.evidenceNeeded),
    ...strategy.recommendedEvidence,
    ...normalized.evidence.missingCoreEvidence,
  ]);
  const proceduralWarnings = cleanList([
    ...sortedSteps.flatMap((step) => step.warnings),
    ...strategy.proceduralWarnings,
    ...normalized.risks.proceduralRisks,
    ...normalized.risks.serviceRisks,
  ]);
  const judgeFocus = cleanList([
    ...sortedSteps.flatMap((step) => step.judgeFocus),
    ...strategy.likelyJudgeConcerns,
  ]);
  const nextBestActions = cleanList([
    ...sortedSteps.flatMap((step) => step.userActions),
    ...strategy.recommendedNextSteps,
    ...normalized.suggestedIntakeFocus,
  ]);
  const blockersBeforeForms = cleanList([
    ...sortedSteps.flatMap((step) => step.blockers),
    ...normalized.missingInformation,
  ]);

  const summary = cleanList([
    `Primary workflow priority: ${primaryPriority}.`,
    `Stage detected: ${stage}.`,
    detectedCaseTypes.length > 0
      ? `Detected family issues: ${detectedCaseTypes.join(", ")}.`
      : "Detected family issues still need clarification.",
    blockersBeforeForms.length > 0
      ? "Some information should be clarified before final document generation."
      : "The file is ready for the next workflow step.",
  ]).join(" ");

  return {
    primaryPriority,
    stage,
    detectedCaseTypes,
    parentingIssues,
    supportIssues,
    safetyIssues,
    propertyIssues,
    requiredFormsNow,
    recommendedFormsLater,
    evidenceNeededNow,
    proceduralWarnings,
    judgeFocus,
    nextBestActions,
    blockersBeforeForms,
    workflowSteps: sortedSteps,
    summary,
  };
}
