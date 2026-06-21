import type {
  FamilyCaseType,
  FamilyLitigationStage,
  ParentingIssueType,
  PropertyIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

import type { FamilyWorkflowResult } from "./familyWorkflowEngine";
import type { FamilyNormalizedIntake } from "./familyAiIntakeNormalizer";
import type { FamilyStrategyResult } from "./familyStrategyEngine";

export type FamilyFormRoutingInput = {
  normalized: FamilyNormalizedIntake;
  strategy: FamilyStrategyResult;
  workflow: FamilyWorkflowResult;
};

export type FamilyFormPriority = "required-now" | "recommended-now" | "later" | "blocked" | "not-needed-now";

export type FamilyFormReason =
  | "start-application"
  | "responding"
  | "parenting-claim"
  | "support-claim"
  | "property-claim"
  | "motion"
  | "urgent-motion"
  | "conference"
  | "settlement-conference"
  | "trial-management-conference"
  | "change-existing-order"
  | "enforcement"
  | "service-proof"
  | "financial-disclosure"
  | "divorce"
  | "clarification-needed";

export type FamilyFormRecommendation = {
  formNumber: string;
  title: string;
  priority: FamilyFormPriority;
  reason: FamilyFormReason;
  why: string;
  neededWhen: string;
  dependsOn: string[];
  blockers: string[];
  evidenceNeeded: string[];
  notNeededBecause: string[];
  officialLabel: string;
};

export type FamilyFormRoutingResult = {
  requiredNow: FamilyFormRecommendation[];
  recommendedNow: FamilyFormRecommendation[];
  later: FamilyFormRecommendation[];
  blocked: FamilyFormRecommendation[];
  notNeededNow: FamilyFormRecommendation[];
  all: FamilyFormRecommendation[];
  formLabelsForDocumentsPage: string[];
  blockersBeforeGeneration: string[];
  routingWarnings: string[];
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

function hasIssue<T extends string>(items: T[], issue: T): boolean {
  return items.includes(issue);
}

function makeForm(params: Omit<FamilyFormRecommendation, "officialLabel">): FamilyFormRecommendation {
  return {
    ...params,
    dependsOn: cleanList(params.dependsOn),
    blockers: cleanList(params.blockers),
    evidenceNeeded: cleanList(params.evidenceNeeded),
    notNeededBecause: cleanList(params.notNeededBecause),
    officialLabel: `Form ${params.formNumber} - ${params.title}`,
  };
}

function dedupeForms(forms: FamilyFormRecommendation[]): FamilyFormRecommendation[] {
  const map = new Map<string, FamilyFormRecommendation>();
  const priorityRank: Record<FamilyFormPriority, number> = {
    "required-now": 1,
    "recommended-now": 2,
    later: 3,
    blocked: 4,
    "not-needed-now": 5,
  };

  for (const form of forms) {
    const key = form.formNumber;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, form);
      continue;
    }

    const keepNew = priorityRank[form.priority] < priorityRank[existing.priority];
    const base = keepNew ? form : existing;
    const other = keepNew ? existing : form;

    map.set(key, {
      ...base,
      dependsOn: cleanList([...base.dependsOn, ...other.dependsOn]),
      blockers: cleanList([...base.blockers, ...other.blockers]),
      evidenceNeeded: cleanList([...base.evidenceNeeded, ...other.evidenceNeeded]),
      notNeededBecause: cleanList([...base.notNeededBecause, ...other.notNeededBecause]),
      why: cleanList([base.why, other.why]).join(" "),
    });
  }

  return Array.from(map.values());
}

export function runFamilyFormRoutingEngine(input: FamilyFormRoutingInput): FamilyFormRoutingResult {
  const { normalized, strategy, workflow } = input;

  const forms: FamilyFormRecommendation[] = [];
  const stage = normalized.stage;
  const detectedCaseTypes = workflow.detectedCaseTypes;
  const parentingIssues = workflow.parentingIssues;
  const supportIssues = workflow.supportIssues;
  const propertyIssues = workflow.propertyIssues;
  const safetyIssues = workflow.safetyIssues;

  const hasParenting =
    hasIssue(detectedCaseTypes, "parenting-time") ||
    hasIssue(detectedCaseTypes, "decision-making-responsibility") ||
    parentingIssues.length > 0;

  const hasSupport =
    hasIssue(detectedCaseTypes, "child-support") ||
    hasIssue(detectedCaseTypes, "spousal-support") ||
    supportIssues.length > 0;

  const hasProperty =
    hasIssue(detectedCaseTypes, "property-division") ||
    propertyIssues.length > 0;

  const hasSafety =
    hasIssue(detectedCaseTypes, "restraining-order") ||
    hasIssue(detectedCaseTypes, "urgent-motion") ||
    safetyIssues.length > 0;

  const hasRelocation =
    hasIssue(detectedCaseTypes, "mobility-relocation") ||
    parentingIssues.includes("mobility-relocation");

  const isStarting = normalized.procedural.isStarting;
  const isResponding = normalized.procedural.isResponding;
  const isConference = normalized.procedural.isConference;
  const isMotion = normalized.procedural.isMotion;
  const isUrgent = normalized.procedural.isUrgent;
  const isTrial = normalized.procedural.isTrial;
  const isEnforcement = normalized.procedural.isEnforcement;
  const hasExistingOrder = normalized.procedural.hasExistingOrder;

  if (isStarting) {
    forms.push(
      makeForm({
        formNumber: "8",
        title: "Application (General)",
        priority: "required-now",
        reason: "start-application",
        why: "A new Ontario family case generally starts with an application that tells the court what orders are requested.",
        neededWhen: "Use when starting a new family court case unless a more specific application process applies.",
        dependsOn: ["Confirmed court level", "Applicant/respondent information", "Requested orders"],
        blockers: cleanList([
          normalized.missingInformation.includes("Exact order or outcome requested from the court.")
            ? "The exact orders requested are not clear enough yet."
            : "",
        ]),
        evidenceNeeded: ["Requested order terms", "Basic facts", "Existing orders or agreements if any"],
        notNeededBecause: [],
      }),
    );
  } else {
    forms.push(
      makeForm({
        formNumber: "8",
        title: "Application (General)",
        priority: "not-needed-now",
        reason: "start-application",
        why: "The case does not appear to be at the start-new-application stage.",
        neededWhen: "Use when starting a new family case.",
        dependsOn: [],
        blockers: [],
        evidenceNeeded: [],
        notNeededBecause: ["The detected stage is not a fresh application stage."],
      }),
    );
  }

  if (isResponding) {
    forms.push(
      makeForm({
        formNumber: "10",
        title: "Answer",
        priority: "required-now",
        reason: "responding",
        why: "A respondent generally needs an Answer to respond to an application and state what is admitted, denied, and requested.",
        neededWhen: "Use when served with an application and responding to claims made by the other party.",
        dependsOn: ["Application received", "Service date", "Claims being admitted or denied"],
        blockers: normalized.procedural.receivedForms.length > 0
          ? []
          : ["Received documents have not been listed yet, so the response may be incomplete."],
        evidenceNeeded: ["Copy of received Application", "Service date", "Documents that support denials or new claims"],
        notNeededBecause: [],
      }),
    );
  } else {
    forms.push(
      makeForm({
        formNumber: "10",
        title: "Answer",
        priority: "not-needed-now",
        reason: "responding",
        why: "The case does not appear to be in a respondent-answer posture.",
        neededWhen: "Use when responding to an Application served by another party.",
        dependsOn: [],
        blockers: [],
        evidenceNeeded: [],
        notNeededBecause: ["No responding posture detected."],
      }),
    );
  }

  if (hasParenting && (isStarting || isResponding || isMotion || hasRelocation)) {
    forms.push(
      makeForm({
        formNumber: "35.1",
        title: "Affidavit (decision-making responsibility, parenting time, contact)",
        priority: "required-now",
        reason: "parenting-claim",
        why: "Parenting claims require child-focused facts about decision-making responsibility, parenting time, contact, caregiving history, and best interests.",
        neededWhen: "Use when making or responding to a parenting-time, decision-making, or contact claim.",
        dependsOn: ["Children's information", "Current schedule", "Requested parenting terms"],
        blockers: cleanList([
          normalized.children.hasChildrenInfo ? "" : "Children's basic information is missing.",
          normalized.children.hasCurrentSchedule ? "" : "Current schedule or living arrangement is missing.",
        ]),
        evidenceNeeded: [
          "Current parenting schedule",
          "Caregiving history",
          "School/daycare details",
          "Messages or records about parenting time and decision-making",
        ],
        notNeededBecause: [],
      }),
    );
  } else {
    forms.push(
      makeForm({
        formNumber: "35.1",
        title: "Affidavit (decision-making responsibility, parenting time, contact)",
        priority: "not-needed-now",
        reason: "parenting-claim",
        why: "No active parenting claim has been detected for the current stage.",
        neededWhen: "Use when parenting time, decision-making responsibility, or contact is claimed.",
        dependsOn: [],
        blockers: [],
        evidenceNeeded: [],
        notNeededBecause: ["No parenting claim detected as required now."],
      }),
    );
  }

  if (hasSupport && !hasProperty) {
    forms.push(
      makeForm({
        formNumber: "13",
        title: "Financial Statement (Support Claims)",
        priority: "required-now",
        reason: "financial-disclosure",
        why: "Support claims generally require financial disclosure unless the situation is limited to table child support where disclosure rules may differ by role and claim type.",
        neededWhen: "Use for support claims that do not include property/equalization or matrimonial-home claims.",
        dependsOn: ["Income information", "Disclosure documents", "Support claim details"],
        blockers: normalized.evidence.hasFinancialDisclosure
          ? []
          : ["Financial disclosure is not clearly organized yet."],
        evidenceNeeded: [
          "Tax returns",
          "Notices of Assessment",
          "Recent pay stubs",
          "Proof of benefits or self-employment income",
          "Section 7 expense receipts if applicable",
        ],
        notNeededBecause: [],
      }),
    );
  }

  if (hasProperty) {
    forms.push(
      makeForm({
        formNumber: "13.1",
        title: "Financial Statement (Property and Support Claims)",
        priority: "required-now",
        reason: "property-claim",
        why: "Property, equalization, matrimonial-home, or combined property/support claims require the more detailed financial statement.",
        neededWhen: "Use when the case involves property, equalization, matrimonial home, debts, pensions, business interests, or property plus support.",
        dependsOn: ["Asset information", "Debt information", "Income information", "Property claim details"],
        blockers: ["Property disclosure should be organized before final form generation."],
        evidenceNeeded: [
          "Mortgage or lease documents",
          "Bank and debt statements",
          "Pension or business records",
          "Property valuation or sale records",
          "Proof of excluded property if claimed",
        ],
        notNeededBecause: [],
      }),
    );
  } else {
    forms.push(
      makeForm({
        formNumber: "13.1",
        title: "Financial Statement (Property and Support Claims)",
        priority: "not-needed-now",
        reason: "property-claim",
        why: "No property/equalization issue has been detected.",
        neededWhen: "Use for property, equalization, matrimonial-home, or property-and-support claims.",
        dependsOn: [],
        blockers: [],
        evidenceNeeded: [],
        notNeededBecause: ["No property claim detected."],
      }),
    );
  }

  if (isMotion || isUrgent || hasSafety) {
    forms.push(
      makeForm({
        formNumber: "14",
        title: "Notice of Motion",
        priority: isUrgent || hasSafety ? "required-now" : "recommended-now",
        reason: isUrgent || hasSafety ? "urgent-motion" : "motion",
        why: "A motion asks the court for an order before final resolution. Urgent or safety issues may require motion materials.",
        neededWhen: "Use when asking the court for temporary, procedural, urgent, or other motion relief.",
        dependsOn: ["Specific order requested", "Grounds for motion", "Supporting affidavit evidence"],
        blockers: cleanList([
          normalized.missingInformation.includes("Exact order or outcome requested from the court.")
            ? "The specific motion order requested is not clear yet."
            : "",
        ]),
        evidenceNeeded: ["Motion order requested", "Supporting facts", "Timeline", "Urgency/safety evidence if applicable"],
        notNeededBecause: [],
      }),
    );

    forms.push(
      makeForm({
        formNumber: "14A",
        title: "Affidavit",
        priority: "required-now",
        reason: isUrgent || hasSafety ? "urgent-motion" : "motion",
        why: "Motion requests generally need affidavit evidence explaining the facts relied on.",
        neededWhen: "Use to provide sworn evidence supporting a motion or urgent request.",
        dependsOn: ["Dated facts", "Evidence list", "Exact relief requested"],
        blockers: normalized.evidence.hasTimeline
          ? []
          : ["A dated timeline is not organized yet."],
        evidenceNeeded: ["Dated incident facts", "Messages or records", "Existing orders", "Exhibits"],
        notNeededBecause: [],
      }),
    );
  }

  if (isConference) {
    const conferenceForm = stage === "settlement-conference" ? "17C" : stage === "trial-management-conference" ? "17E" : "17A";
    const conferenceTitle = stage === "settlement-conference"
      ? "Settlement Conference Brief"
      : stage === "trial-management-conference"
        ? "Trial Management Conference Brief"
        : "Case Conference Brief";

    forms.push(
      makeForm({
        formNumber: conferenceForm,
        title: conferenceTitle,
        priority: "required-now",
        reason: stage === "settlement-conference"
          ? "settlement-conference"
          : stage === "trial-management-conference"
            ? "trial-management-conference"
            : "conference",
        why: "Conference materials help the court identify issues, disclosure problems, settlement possibilities, and procedural next steps.",
        neededWhen: "Use for the applicable conference stage when directed or required by the court rules/process.",
        dependsOn: ["Conference date", "Issues list", "Settlement position", "Disclosure update"],
        blockers: normalized.procedural.hasUpcomingCourtDate
          ? []
          : ["A conference date or stage should be confirmed before finalizing conference materials."],
        evidenceNeeded: ["Updated issues list", "Disclosure status", "Settlement proposals", "Key documents only"],
        notNeededBecause: [],
      }),
    );
  } else {
    forms.push(
      makeForm({
        formNumber: "17A",
        title: "Case Conference Brief",
        priority: "not-needed-now",
        reason: "conference",
        why: "The case is not currently detected as being at the case-conference stage.",
        neededWhen: "Use for case conference preparation when that stage is reached.",
        dependsOn: [],
        blockers: [],
        evidenceNeeded: [],
        notNeededBecause: ["No case conference stage detected."],
      }),
    );
  }

  if (hasExistingOrder && (stage === "variation-or-change" || detectedCaseTypes.includes("variation-change-existing-order"))) {
    forms.push(
      makeForm({
        formNumber: "15",
        title: "Motion to Change",
        priority: "required-now",
        reason: "change-existing-order",
        why: "Changing an existing final order or agreement usually requires a change-process rather than starting from scratch.",
        neededWhen: "Use when changing an existing final order or agreement where the change procedure applies.",
        dependsOn: ["Existing order/agreement", "Material change facts", "Requested changed terms"],
        blockers: hasExistingOrder ? [] : ["Existing order or agreement must be identified."],
        evidenceNeeded: ["Existing order", "Facts showing change", "Updated financial/parenting evidence"],
        notNeededBecause: [],
      }),
    );
  }

  if (isEnforcement) {
    forms.push(
      makeForm({
        formNumber: "Enforcement-specific",
        title: "Enforcement pathway depends on order type",
        priority: "blocked",
        reason: "enforcement",
        why: "Family enforcement form routing depends on whether the problem is support arrears, parenting-time breach, disclosure breach, or another order breach.",
        neededWhen: "Use after identifying the existing order, breach, and enforcement route.",
        dependsOn: ["Existing order", "Breach details", "Enforcement remedy requested"],
        blockers: ["The enforcement route must be classified before recommending a specific form."],
        evidenceNeeded: ["Existing order", "Breach chart", "Payment or missed-time records", "Compliance requests"],
        notNeededBecause: [],
      }),
    );
  }

  if (!isStarting && !isResponding && !isConference && !isMotion && !isUrgent && !isTrial && !isEnforcement) {
    forms.push(
      makeForm({
        formNumber: "Clarify-stage",
        title: "Clarify procedural stage before form generation",
        priority: "blocked",
        reason: "clarification-needed",
        why: "The procedural stage is not clear enough to safely recommend official forms.",
        neededWhen: "Use internally when the engine needs more information before routing forms.",
        dependsOn: ["Stage", "Role", "Existing documents", "Requested order"],
        blockers: ["The case stage is unclear."],
        evidenceNeeded: ["Existing court documents", "Court dates", "Forms received or filed"],
        notNeededBecause: [],
      }),
    );
  }

  const all = dedupeForms(forms);
  const requiredNow = all.filter((form) => form.priority === "required-now");
  const recommendedNow = all.filter((form) => form.priority === "recommended-now");
  const later = all.filter((form) => form.priority === "later");
  const blocked = all.filter((form) => form.priority === "blocked");
  const notNeededNow = all.filter((form) => form.priority === "not-needed-now");

  const blockersBeforeGeneration = cleanList([
    ...requiredNow.flatMap((form) => form.blockers),
    ...recommendedNow.flatMap((form) => form.blockers),
    ...blocked.flatMap((form) => form.blockers),
    ...workflow.blockersBeforeForms,
  ]);

  const routingWarnings = cleanList([
    ...workflow.proceduralWarnings,
    ...strategy.proceduralWarnings,
    ...strategy.credibilityRisks,
    ...normalized.risks.proceduralRisks,
    ...normalized.risks.disclosureRisks,
  ]);

  const formLabelsForDocumentsPage = cleanList([
    ...requiredNow.map((form) => form.officialLabel),
    ...recommendedNow.map((form) => form.officialLabel),
  ]);

  const summary = cleanList([
    requiredNow.length > 0
      ? `${requiredNow.length} form(s) are required now based on the detected Family workflow.`
      : "No official form should be generated until the stage and issue set are clearer.",
    blockersBeforeGeneration.length > 0
      ? "Some blockers must be resolved before safe form generation."
      : "No form-generation blockers detected for the required forms.",
  ]).join(" ");

  return {
    requiredNow,
    recommendedNow,
    later,
    blocked,
    notNeededNow,
    all,
    formLabelsForDocumentsPage,
    blockersBeforeGeneration,
    routingWarnings,
    summary,
  };
}
