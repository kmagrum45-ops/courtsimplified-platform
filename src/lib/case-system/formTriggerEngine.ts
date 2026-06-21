import {
  CourtPath,
  CaseStage,
  FORM_KNOWLEDGE_BASE,
  FormKnowledgeRule,
} from "./formKnowledgeBase";

import { cleanList, normalize, includesAny } from "./utils";

export type FormTriggerInput = {
  courtPath: CourtPath;
  stage: CaseStage;
  role?: string;
  issues: string[];
  facts: string;
  filedDocuments: string[];
  completedForms: string[];
  receivedForms: string[];
  availableEvidence: string[];
  userData: Record<string, unknown>;
};

export type TriggeredFormRecommendation = {
  formNumber: string;
  title: string;
  courtPath: CourtPath;
  priority: FormKnowledgeRule["priority"];
  status: "required" | "optional" | "later" | "blocked";
  score: number;
  reasons: string[];
  missingUserData: string[];
  missingEvidence: string[];
  lawyerLogic: string;
  judgeConcern: string;
  riskIfWrong: string;
};

export type FormTriggerResult = {
  requiredForms: TriggeredFormRecommendation[];
  optionalForms: TriggeredFormRecommendation[];
  laterForms: TriggeredFormRecommendation[];
  blockedForms: TriggeredFormRecommendation[];
  allRecommendations: TriggeredFormRecommendation[];
};

function normalizeBundle(input: FormTriggerInput) {
  return normalize(
    [
      input.role || "",
      input.issues.join(" "),
      input.facts,
      input.filedDocuments.join(" "),
      input.completedForms.join(" "),
      input.receivedForms.join(" "),
      input.availableEvidence.join(" "),
      Object.values(input.userData || {}).join(" "),
    ].join(" ")
  );
}

function formAlreadyExists(form: FormKnowledgeRule, input: FormTriggerInput) {
  const combined = normalize(
    [
      ...input.completedForms,
      ...input.receivedForms,
      ...input.filedDocuments,
    ].join(" ")
  );

  return (
    combined.includes(normalize(form.formNumber)) ||
    combined.includes(normalize(`Form ${form.formNumber}`)) ||
    combined.includes(normalize(form.title))
  );
}

function hasUserData(field: string, userData: Record<string, unknown>) {
  const target = normalize(field);

  return Object.entries(userData || {}).some(([key, value]) => {
    const keyText = normalize(key);
    const valueText = normalize(String(value || ""));

    return (
      valueText.length > 1 &&
      (keyText.includes(target) ||
        target.includes(keyText) ||
        valueText.includes(target))
    );
  });
}

function hasEvidenceItem(item: string, evidence: string[]) {
  const evidenceText = normalize(evidence.join(" "));
  return evidenceText.length > 0 && includesAny(evidenceText, [item]);
}

function buildContext(input: FormTriggerInput) {
  const bundle = normalizeBundle(input);

  return {
    bundle,

    isSmallClaims: input.courtPath === "small-claims",
    isFamily: input.courtPath === "family",
    isCivil: input.courtPath === "civil",

    isPlaintiff: includesAny(bundle, ["plaintiff", "claimant", "applicant"]),
    isDefendant: includesAny(bundle, ["defendant", "respondent"]),

    isSettlementStage:
      includesAny(bundle, ["settlement conference", "conference"]) ||
      input.stage === "conference",

    isTrialStage:
      includesAny(bundle, ["trial", "trial management"]) ||
      input.stage === "trial",

    isMotionStage:
      includesAny(bundle, ["motion", "urgent motion"]) ||
      input.stage === "motion",

    isEnforcementStage:
      includesAny(bundle, ["garnishment", "enforcement", "writ", "collection"]) ||
      input.stage === "enforcement",

    isDefamation: includesAny(bundle, [
      "defamation",
      "slander",
      "libel",
      "false statement",
      "reputation",
      "pedophile",
      "third party",
    ]),

    isContract: includesAny(bundle, [
      "contract",
      "agreement",
      "invoice",
      "quote",
      "payment",
    ]),

    isDebt: includesAny(bundle, ["loan", "debt", "money owed"]),

    isPropertyDamage: includesAny(bundle, [
      "repair",
      "property damage",
      "contractor",
      "vehicle",
    ]),

    isServiceCompleted: includesAny(bundle, [
      "served",
      "service completed",
      "affidavit of service",
    ]),

    alreadyFiledClaim: includesAny(bundle, [
      "claim filed",
      "claim already filed",
      "plaintiff claim filed",
      "statement of claim filed",
      "plaintiff’s claim already filed",
      "plaintiff's claim already filed",
    ]),

    alreadyAtConference: includesAny(bundle, [
      "conference brief",
      "settlement conference",
    ]),

    hasWitnesses: includesAny(bundle, ["witness", "third party", "recipient"]),
  };
}

function proceduralBlock(form: FormKnowledgeRule, input: FormTriggerInput) {
  const context = buildContext(input);
  const title = normalize(form.title);
  const formNumber = normalize(form.formNumber);

  if (form.courtPath !== input.courtPath) {
    return "Wrong court type.";
  }

  if (
    context.isSmallClaims &&
    (title.includes("custody") ||
      title.includes("parenting") ||
      title.includes("decision making") ||
      title.includes("support") ||
      title.includes("divorce") ||
      title.includes("family") ||
      title === "consent" ||
      formNumber === "13b")
  ) {
    return "Family law or unrelated consent form blocked in Small Claims.";
  }

  if (
    context.isSettlementStage &&
    (title.includes("trial scheduling") ||
      title.includes("trial record") ||
      title.includes("pre trial") ||
      title.includes("pre-trial"))
  ) {
    return "Trial scheduling forms blocked during conference stage.";
  }

  if (
    !context.isTrialStage &&
    (title.includes("list of proposed witnesses") ||
      title.includes("witness list") ||
      formNumber === "13a")
  ) {
    return "Witness forms suppressed before trial stage.";
  }

  if (
    !context.isEnforcementStage &&
    (title.includes("garnishment") ||
      title.includes("writ") ||
      title.includes("debtor") ||
      title.includes("examination"))
  ) {
    return "Enforcement forms blocked outside enforcement stage.";
  }

  if (
    context.alreadyFiledClaim &&
    (title.includes("plaintiff claim") ||
      title.includes("plaintiff’s claim") ||
      title.includes("plaintiff's claim") ||
      title.includes("statement of claim"))
  ) {
    return "Initial claim forms suppressed because claim already exists.";
  }

  if (
    context.isServiceCompleted &&
    (title.includes("affidavit of service") || formNumber === "8a")
  ) {
    return "Service forms suppressed because service already appears completed.";
  }

  if (
    context.isDefamation &&
    (title.includes("repair") ||
      title.includes("vehicle") ||
      title.includes("construction") ||
      title.includes("contractor") ||
      title.includes("property damage"))
  ) {
    return "Property/repair forms blocked in defamation matter.";
  }

  if (context.isContract && title.includes("defamation")) {
    return "Defamation forms blocked in contract matter.";
  }

  return null;
}

function scoreRule(form: FormKnowledgeRule, input: FormTriggerInput) {
  let score = 0;
  const reasons: string[] = [];
  const bundle = normalizeBundle(input);
  const blockedReason = proceduralBlock(form, input);

  if (blockedReason) {
    return {
      score: -999,
      reasons: [blockedReason],
    };
  }

  if (form.stageTriggers.includes(input.stage)) {
    score += 40;
    reasons.push(`Stage match: ${input.stage}`);
  }

  if (form.usedBy.some((role) => bundle.includes(normalize(role)))) {
    score += 20;
    reasons.push("Role alignment detected.");
  }

  if (includesAny(bundle, form.issueTriggers)) {
    score += 35;
    reasons.push("Issue triggers matched.");
  }

  if (includesAny(bundle, form.factTriggers)) {
    score += 30;
    reasons.push("Fact triggers matched.");
  }

  if (includesAny(bundle, form.documentTriggers)) {
    score += 20;
    reasons.push("Document history matched.");
  }

  if (includesAny(bundle, form.requiredWhen)) {
    score += 35;
    reasons.push("Required conditions matched.");
  }

  if (includesAny(bundle, form.optionalWhen)) {
    score += 10;
    reasons.push("Optional conditions matched.");
  }

  if (includesAny(bundle, form.notNeededWhen)) {
    score -= 40;
    reasons.push("Not-needed conditions detected.");
  }

  if (includesAny(bundle, form.blockedWhen)) {
    score -= 50;
    reasons.push("Blocked conditions detected.");
  }

  if (formAlreadyExists(form, input)) {
    score -= 90;
    reasons.push("Already completed/received.");
  }

  return {
    score,
    reasons: cleanList(reasons),
  };
}

function determineStatus(
  form: FormKnowledgeRule,
  score: number
): TriggeredFormRecommendation["status"] {
  if (score < 0) return "blocked";
  if (form.priority === "required" && score >= 55) return "required";
  if (form.priority === "conditional" && score >= 60) return "required";
  if (form.priority === "optional" && score >= 35) return "optional";
  if (score >= 25) return "later";
  return "blocked";
}

function buildRecommendation(
  form: FormKnowledgeRule,
  input: FormTriggerInput
): TriggeredFormRecommendation {
  const scored = scoreRule(form, input);
  const status = determineStatus(form, scored.score);

  const missingUserData = form.requiredUserData.filter(
    (field) => !hasUserData(field, input.userData)
  );

  const missingEvidence = form.requiredEvidence.filter(
    (item) => !hasEvidenceItem(item, input.availableEvidence)
  );

  return {
    formNumber: form.formNumber,
    title: form.title,
    courtPath: form.courtPath,
    priority: form.priority,
    status,
    score: scored.score,
    reasons: scored.reasons,
    missingUserData,
    missingEvidence,
    lawyerLogic: form.lawyerLogic,
    judgeConcern: form.judgeConcern,
    riskIfWrong: form.riskIfWrong,
  };
}

export function runFormTriggerEngine(input: FormTriggerInput): FormTriggerResult {
  const allRecommendations = FORM_KNOWLEDGE_BASE
    .filter((form) => form.courtPath === input.courtPath)
    .map((form) => buildRecommendation(form, input))
    .sort((a, b) => b.score - a.score);

  return {
    requiredForms: allRecommendations.filter((item) => item.status === "required"),
    optionalForms: allRecommendations.filter((item) => item.status === "optional"),
    laterForms: allRecommendations.filter((item) => item.status === "later"),
    blockedForms: allRecommendations.filter((item) => item.status === "blocked"),
    allRecommendations,
  };
}