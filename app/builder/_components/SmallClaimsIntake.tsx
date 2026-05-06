"use client";

import { useState } from "react";
import {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
  cleanList,
  getStageLabel,
  hasMeaningfulText,
  includesAny,
  normalize,
} from "@/app/builder/_components/builderTypes";

type SmallClaimsIssue =
  | "unpaid-money"
  | "contract-dispute"
  | "property-damage"
  | "loan-or-debt"
  | "work-or-services"
  | "deposit-refund"
  | "consumer-purchase"
  | "vehicle-dispute"
  | "defending-claim"
  | "settlement"
  | "enforcement"
  | "other";

type FiledDocument =
  | "plaintiffs-claim"
  | "defence"
  | "affidavit-service"
  | "offer-settle"
  | "settlement-conference"
  | "default-judgment"
  | "witness-list"
  | "enforcement-documents"
  | "nothing"
  | "not-sure";

type SmallClaimsInput = {
  caseStage: UniversalStage;
  issues: SmallClaimsIssue[];
  filedDocuments: FiledDocument[];
  yourName: string;
  otherParty: string;
  yourRole: string;
  courtLocation: string;
  claimNumber: string;
  amountClaimed: string;
  defendantAddress: string;
  agreementDetails: string;
  paymentHistory: string;
  damagesBreakdown: string;
  serviceDetails: string;
  deadlineDetails: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  settlementEfforts: string;
  defenceResponse: string;
  goal: string;
  urgent: string;
};

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
};

const issueOptions: { value: SmallClaimsIssue; label: string }[] = [
  { value: "unpaid-money", label: "Unpaid money / invoice" },
  { value: "contract-dispute", label: "Contract or agreement dispute" },
  { value: "property-damage", label: "Property damage" },
  { value: "loan-or-debt", label: "Loan or debt" },
  { value: "work-or-services", label: "Work, services, or renovation dispute" },
  { value: "deposit-refund", label: "Deposit or refund issue" },
  { value: "consumer-purchase", label: "Consumer purchase issue" },
  { value: "vehicle-dispute", label: "Vehicle-related dispute" },
  { value: "defending-claim", label: "I am defending a claim" },
  { value: "settlement", label: "Settlement / offer to settle" },
  { value: "enforcement", label: "Enforcement / collecting judgment" },
  { value: "other", label: "Other Small Claims issue" },
];

const filedOptions: { value: FiledDocument; label: string }[] = [
  { value: "plaintiffs-claim", label: "Plaintiff’s Claim already filed / served" },
  { value: "defence", label: "Defence already filed / served" },
  { value: "affidavit-service", label: "Affidavit of Service completed" },
  { value: "offer-settle", label: "Offer to Settle prepared" },
  { value: "settlement-conference", label: "Settlement conference scheduled or completed" },
  { value: "default-judgment", label: "Default judgment step started" },
  { value: "witness-list", label: "Witness list prepared" },
  { value: "enforcement-documents", label: "Enforcement documents started" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
];

const defaultInput: SmallClaimsInput = {
  caseStage: "not-sure",
  issues: [],
  filedDocuments: [],
  yourName: "",
  otherParty: "",
  yourRole: "",
  courtLocation: "",
  claimNumber: "",
  amountClaimed: "",
  defendantAddress: "",
  agreementDetails: "",
  paymentHistory: "",
  damagesBreakdown: "",
  serviceDetails: "",
  deadlineDetails: "",
  facts: "",
  timeline: "",
  evidence: "",
  missingEvidence: "",
  settlementEfforts: "",
  defenceResponse: "",
  goal: "",
  urgent: "",
};

function toggleArrayValue<T extends string>(items: T[], value: T) {
  if (value === "nothing") return items.includes(value) ? [] : ["nothing" as T];
  if (value === "not-sure") return items.includes(value) ? [] : ["not-sure" as T];

  const cleaned = items.filter((item) => item !== "nothing" && item !== "not-sure");

  return cleaned.includes(value)
    ? cleaned.filter((item) => item !== value)
    : [...cleaned, value];
}

function removeAlreadyDone(nextForms: string[], completedForms: string[], receivedForms: string[]) {
  const doneText = normalize([...completedForms, ...receivedForms].join(" "));

  return cleanList(
    nextForms.filter((form) => {
      const normalizedForm = normalize(form);

      if (doneText.includes(normalizedForm)) return false;
      if (normalizedForm.includes("defence") && doneText.includes("defence")) return false;
      if (normalizedForm.includes("offer to settle") && doneText.includes("offer to settle")) return false;
      if (normalizedForm.includes("plaintiff") && doneText.includes("plaintiff")) return false;
      if (normalizedForm.includes("affidavit of service") && doneText.includes("affidavit of service")) return false;
      if (normalizedForm.includes("witness") && doneText.includes("witness")) return false;

      return true;
    })
  );
}

function mapStageForRules(stage: UniversalStage) {
  if (stage === "conference") return "settlement-conference";
  if (stage === "starting-case") return "starting-case";
  return stage;
}

function getCanonicalSmallClaimsIssues(input: SmallClaimsInput) {
  const text = normalize(Object.values(input).flat().join(" "));
  const issues: string[] = [];

  if (
    input.issues.includes("unpaid-money") ||
    input.issues.includes("loan-or-debt") ||
    includesAny(text, ["owe", "unpaid", "invoice", "loan", "debt", "payment"])
  ) {
    issues.push("Unpaid invoice or unpaid money");
  }

  if (
    input.issues.includes("contract-dispute") ||
    input.issues.includes("work-or-services") ||
    includesAny(text, ["contract", "agreement", "quote", "estimate", "services", "renovation"])
  ) {
    issues.push("Breach of contract or agreement");
  }

  if (
    input.issues.includes("property-damage") ||
    includesAny(text, ["damage", "repair", "broke", "destroyed"])
  ) {
    issues.push("Property damage");
  }

  if (
    input.issues.includes("deposit-refund") ||
    includesAny(text, ["deposit", "refund", "return my money", "kept my deposit"])
  ) {
    issues.push("Deposit or refund dispute");
  }

  if (
    input.issues.includes("consumer-purchase") ||
    includesAny(text, ["consumer", "purchase", "bought", "seller", "store", "defective"])
  ) {
    issues.push("Consumer purchase dispute");
  }

  if (
    input.issues.includes("vehicle-dispute") ||
    includesAny(text, ["vehicle", "car", "mechanic", "dealership", "auto repair"])
  ) {
    issues.push("Vehicle repair or vehicle defect dispute");
  }

  if (
    input.issues.includes("enforcement") ||
    includesAny(text, ["judgment not paid", "collect judgment", "garnish", "garnishment", "debtor"])
  ) {
    issues.push("Enforcement after judgment");
  }

  if (
    includesAny(text, ["defamation", "slander", "libel", "false statement", "lied about me", "reputation", "pedophile"])
  ) {
    issues.push("Defamation / reputational harm");
  }

  return cleanList(issues);
}

function analyzeSmallClaimsCase(input: SmallClaimsInput): AnalysisResult {
  const text = normalize(Object.values(input).flat().join(" "));

  const completedForms: string[] = [];
  const receivedForms: string[] = [];
  let requiredNextForms: string[] = [];
  const notNeededNow: string[] = [];
  const detectedIssues: string[] = [];
  const inferredFacts: string[] = [];
  const missingInformation: string[] = [];
  const risksAndGaps: string[] = [];
  const guidance: string[] = [];

  const defenceAlreadyFiled =
    input.filedDocuments.includes("defence") ||
    includesAny(text, ["defence already filed", "defense already filed", "filed my defence", "filed a defence"]);

  const plaintiffClaimAlreadyFiled =
    input.filedDocuments.includes("plaintiffs-claim") ||
    includesAny(text, ["plaintiff claim already filed", "plaintiff's claim already filed", "claim already filed", "served the claim"]);

  const affidavitServiceDone =
    input.filedDocuments.includes("affidavit-service") ||
    includesAny(text, ["affidavit of service completed", "affidavit of service filed", "served and filed proof"]);

  const offerAlreadySent =
    input.filedDocuments.includes("offer-settle") ||
    includesAny(text, ["offer to settle sent", "settlement offer sent", "offer already sent", "sent an offer"]);

  const settlementConferenceStage =
    input.caseStage === "conference" ||
    input.filedDocuments.includes("settlement-conference") ||
    includesAny(text, ["settlement conference", "going to settlement conference", "conference scheduled", "upcoming conference"]);

  const trialStage =
    input.caseStage === "trial" ||
    includesAny(text, ["trial", "trial date", "trial preparation", "witnesses for trial"]);

  const enforcementStage =
    input.caseStage === "enforcement" ||
    input.filedDocuments.includes("enforcement-documents") ||
    input.issues.includes("enforcement") ||
    includesAny(text, ["enforce judgment", "garnishment", "collect judgment", "writ"]);

  const isDefending =
    input.caseStage === "responding" ||
    input.issues.includes("defending-claim") ||
    includesAny(text, ["served with a claim", "claim against me", "being sued", "i am defendant"]);

  const isStarting =
    input.caseStage === "starting-case" ||
    input.filedDocuments.includes("nothing") ||
    (!plaintiffClaimAlreadyFiled &&
      !defenceAlreadyFiled &&
      !settlementConferenceStage &&
      !trialStage &&
      !enforcementStage &&
      input.filedDocuments.length === 0);

  const moneyIssue =
    input.issues.includes("unpaid-money") ||
    input.issues.includes("loan-or-debt") ||
    includesAny(text, ["owe", "unpaid", "invoice", "loan", "debt", "payment"]);

  const contractIssue =
    input.issues.includes("contract-dispute") ||
    input.issues.includes("work-or-services") ||
    includesAny(text, ["contract", "agreement", "quote", "estimate", "services", "renovation"]);

  const damageIssue =
    input.issues.includes("property-damage") ||
    includesAny(text, ["damage", "repair", "broke", "destroyed"]);

  if (plaintiffClaimAlreadyFiled) completedForms.push("Form 7A — Plaintiff’s Claim");
  if (defenceAlreadyFiled) receivedForms.push("Form 9A — Defence");
  if (affidavitServiceDone) completedForms.push("Form 8A — Affidavit of Service");
  if (offerAlreadySent) completedForms.push("Form 14A — Offer to Settle");
  if (input.filedDocuments.includes("witness-list")) completedForms.push("Form 13B — List of Proposed Witnesses");

  if (moneyIssue) detectedIssues.push("Unpaid money, debt, invoice, or payment dispute");
  if (contractIssue) detectedIssues.push("Contract, service, quote, renovation, or agreement dispute");
  if (damageIssue) detectedIssues.push("Property damage issue");
  if (isDefending) detectedIssues.push("Responding to a Small Claims case");
  if (settlementConferenceStage) detectedIssues.push("Settlement conference preparation");
  if (trialStage) detectedIssues.push("Trial or witness preparation");
  if (enforcementStage) detectedIssues.push("Enforcement or collection after judgment");

  if (isStarting && !isDefending) {
    requiredNextForms.push("Form 7A — Plaintiff’s Claim");
    guidance.push("The next focus is preparing the claim, amount breakdown, party names, service address, and evidence.");
  }

  if (isDefending && !defenceAlreadyFiled) {
    requiredNextForms.push("Form 9A — Defence");
    guidance.push("The next focus is preparing a Defence that responds directly to what is admitted, denied, or disputed.");
  }

  if (plaintiffClaimAlreadyFiled && !affidavitServiceDone && !isDefending) {
    requiredNextForms.push("Form 8A — Affidavit of Service");
  }

  if (settlementConferenceStage) {
    requiredNextForms.push(
      "Settlement conference preparation package",
      "Updated evidence list",
      "Settlement position summary",
      "Key document bundle for conference"
    );

    notNeededNow.push("Form 7A — Plaintiff’s Claim");
    notNeededNow.push("Form 9A — Defence");
    notNeededNow.push("Form 14A — Offer to Settle");

    guidance.push(
      "Because the case is at settlement conference stage, the next step is organizing conference materials, evidence, settlement position, and the issues still in dispute."
    );
  }

  if (trialStage) {
    requiredNextForms.push("Form 13B — List of Proposed Witnesses", "Trial evidence package");
    notNeededNow.push("Form 7A — Plaintiff’s Claim", "Form 9A — Defence");
  }

  if (enforcementStage) {
    requiredNextForms.push("Enforcement information package");
    notNeededNow.push("Form 7A — Plaintiff’s Claim", "Form 9A — Defence", "Form 14A — Offer to Settle");
    risksAndGaps.push("Enforcement usually requires details of the judgment/order and the collection method being requested.");
  }

  requiredNextForms = removeAlreadyDone(requiredNextForms, completedForms, receivedForms);

  const doneAndNotNeeded = normalize([...completedForms, ...receivedForms, ...notNeededNow].join(" "));
  requiredNextForms = cleanList(
    requiredNextForms.filter((form) => {
      const f = normalize(form);
      if (doneAndNotNeeded.includes(f)) return false;
      if (f.includes("defence") && doneAndNotNeeded.includes("defence")) return false;
      if (f.includes("offer to settle") && doneAndNotNeeded.includes("offer to settle")) return false;
      if (f.includes("plaintiff") && doneAndNotNeeded.includes("plaintiff")) return false;
      return true;
    })
  );

  if (hasMeaningfulText(input.amountClaimed)) {
    inferredFacts.push("A claim amount or disputed amount was provided.");
  } else {
    missingInformation.push("Exact amount being claimed or disputed.");
  }

  if (hasMeaningfulText(input.defendantAddress)) {
    inferredFacts.push("The other party’s address was provided for service/location purposes.");
  } else if (isStarting && !isDefending) {
    missingInformation.push("Address for the defendant or business being sued.");
  }

  if (hasMeaningfulText(input.agreementDetails)) {
    inferredFacts.push("Agreement, contract, quote, invoice, or deal details were provided.");
  } else if (contractIssue) {
    missingInformation.push("Details of the agreement, contract, quote, invoice, or promise.");
  }

  if (hasMeaningfulText(input.settlementEfforts)) {
    inferredFacts.push("Settlement efforts or discussions were described.");
  }

  if (hasMeaningfulText(input.deadlineDetails)) {
    inferredFacts.push("A deadline, court date, or conference date was provided.");
  }

  if (!hasMeaningfulText(input.damagesBreakdown)) {
    missingInformation.push("Breakdown of how the amount claimed or disputed was calculated.");
  }

  if (!hasMeaningfulText(input.facts)) {
    missingInformation.push("Detailed facts explaining what happened.");
  }

  if (!hasMeaningfulText(input.timeline)) {
    missingInformation.push("Timeline with key dates.");
  }

  if (!hasMeaningfulText(input.evidence)) {
    risksAndGaps.push("Evidence has not been listed yet.");
  }

  if (!hasMeaningfulText(input.goal)) {
    missingInformation.push("What you want the court to order or what result you want.");
  }

  if (isDefending && !hasMeaningfulText(input.defenceResponse) && !defenceAlreadyFiled) {
    missingInformation.push("Response to each claim being made against you.");
  }

  guidance.push(
    "Small Claims materials should clearly explain who owes what, what happened, what stage the case is at, and what evidence proves it.",
    "Do not duplicate forms already filed or received. The next package should match the current stage of the case.",
    "Organize evidence by date, issue, and document type so it can later be connected to the court forms and case package."
  );

  const summary = [
    "Small Claims Case Summary",
    "",
    `Stage: ${getStageLabel(input.caseStage)}`,
    "",
    `Parties:\n- ${input.yourName || "Your name not entered"}\n- ${input.otherParty || "Other party not entered"}`,
    "",
    `Role:\n- ${input.yourRole || "Role not entered"}`,
    "",
    `Issues detected:\n- ${cleanList(detectedIssues).join("\n- ") || "No specific issue detected yet"}`,
    "",
    `Completed forms / steps:\n- ${cleanList(completedForms).join("\n- ") || "None listed"}`,
    "",
    `Received forms / documents:\n- ${cleanList(receivedForms).join("\n- ") || "None listed"}`,
    "",
    `Next required documents:\n- ${cleanList(requiredNextForms).join("\n- ") || "No next forms detected yet"}`,
    "",
    `Not needed right now:\n- ${cleanList(notNeededNow).join("\n- ") || "None identified"}`,
    "",
    `Inferred facts:\n- ${cleanList(inferredFacts).join("\n- ") || "No inferred facts yet"}`,
    "",
    `Missing information:\n- ${cleanList(missingInformation).join("\n- ") || "No major missing information detected"}`,
    "",
    `Risks or gaps:\n- ${cleanList(risksAndGaps).join("\n- ") || "No major risks detected yet"}`,
  ].join("\n");

  return {
    courtPath: "small-claims",
    caseStage: getStageLabel(input.caseStage),
    completedForms: cleanList(completedForms),
    receivedForms: cleanList(receivedForms),
    requiredNextForms: cleanList(requiredNextForms),
    notNeededNow: cleanList(notNeededNow),
    detectedIssues: cleanList(detectedIssues),
    inferredFacts: cleanList(inferredFacts),
    missingInformation: cleanList(missingInformation),
    risksAndGaps: cleanList(risksAndGaps),
    guidance: cleanList(guidance),
    summary,
  };
}

export default function SmallClaimsIntake({ onComplete }: Props) {
  const [input, setInput] = useState<SmallClaimsInput>(defaultInput);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function updateField<K extends keyof SmallClaimsInput>(
    field: K,
    value: SmallClaimsInput[K]
  ) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);

    const localAnalysis = analyzeSmallClaimsCase(input);
    const canonicalIssues = getCanonicalSmallClaimsIssues(input);
    const mappedStage = mapStageForRules(input.caseStage);

    try {
      const [issueRes, procedureRes, evidenceRes] = await Promise.all([
        fetch("/api/rules/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtPath: "small-claims",
            issues: canonicalIssues,
          }),
        }),
        fetch("/api/rules/procedures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtPath: "small-claims",
            stage: mappedStage,
          }),
        }),
        fetch("/api/rules/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtPath: "small-claims",
            issues: canonicalIssues,
          }),
        }),
      ]);

      const issueMatches = issueRes.ok ? await issueRes.json() : [];
      const procedureMatches = procedureRes.ok ? await procedureRes.json() : [];
      const evidenceMatches = evidenceRes.ok ? await evidenceRes.json() : [];

      const issueGuidance = Array.isArray(issueMatches)
        ? issueMatches.flatMap((rule: any) => [
            ...(rule.legal_elements || []),
            ...(rule.missing_info_questions || []),
            ...(rule.judge_or_court_concerns || []),
          ])
        : [];

      const procedureGuidance = Array.isArray(procedureMatches)
        ? procedureMatches.flatMap((rule: any) => [
            rule.rule_name,
            ...(rule.missing_info_questions || []),
            ...(rule.judge_or_court_concerns || []),
          ])
        : [];

      const evidenceGuidance = Array.isArray(evidenceMatches)
        ? evidenceMatches.flatMap((rule: any) => [
            ...(rule.upload_prompts || []),
            ...(rule.court_use_notes || []),
          ])
        : [];

      const evidenceRisks = Array.isArray(evidenceMatches)
        ? evidenceMatches.flatMap((rule: any) => rule.weak_evidence_warnings || [])
        : [];

      const enhancedAnalysis: AnalysisResult = {
        ...localAnalysis,
        detectedIssues: cleanList([
          ...localAnalysis.detectedIssues,
          ...canonicalIssues,
          ...(Array.isArray(issueMatches)
            ? issueMatches.map((rule: any) => rule.issue_name).filter(Boolean)
            : []),
        ]),
        missingInformation: cleanList([
          ...localAnalysis.missingInformation,
          ...(Array.isArray(issueMatches)
            ? issueMatches.flatMap((rule: any) => rule.missing_info_questions || [])
            : []),
          ...(Array.isArray(procedureMatches)
            ? procedureMatches.flatMap((rule: any) => rule.missing_info_questions || [])
            : []),
        ]),
        risksAndGaps: cleanList([...localAnalysis.risksAndGaps, ...evidenceRisks]),
        guidance: cleanList([
          ...localAnalysis.guidance,
          ...issueGuidance,
          ...procedureGuidance,
          ...evidenceGuidance,
        ]),
      };

      const payload: StoredCaseData = {
        courtPath: "small-claims",
        pathLabel: "Small Claims",
        caseStage: input.caseStage,
        yourName: input.yourName,
        otherParty: input.otherParty,
        facts: input.facts,
        timeline: input.timeline,
        evidence: input.evidence,
        missingEvidence: input.missingEvidence,
        goal: input.goal,
        urgent: input.urgent,
        analysis: enhancedAnalysis,
        extra: {
          ...input,
          canonicalIssues,
          mappedStage,
          ruleMatches: {
            issues: issueMatches,
            procedures: procedureMatches,
            evidence: evidenceMatches,
          },
        },
      };

      localStorage.setItem("caseData", JSON.stringify(payload));
      onComplete(enhancedAnalysis, payload);
    } catch (error) {
      console.error("Small Claims rule engine failed. Falling back to local analysis:", error);

      const payload: StoredCaseData = {
        courtPath: "small-claims",
        pathLabel: "Small Claims",
        caseStage: input.caseStage,
        yourName: input.yourName,
        otherParty: input.otherParty,
        facts: input.facts,
        timeline: input.timeline,
        evidence: input.evidence,
        missingEvidence: input.missingEvidence,
        goal: input.goal,
        urgent: input.urgent,
        analysis: localAnalysis,
        extra: {
          ...input,
          canonicalIssues,
          mappedStage,
          ruleEngineError: true,
        },
      };

      localStorage.setItem("caseData", JSON.stringify(payload));
      onComplete(localAnalysis, payload);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Small Claims Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Tell the full story once. CourtSimplified will organize the claim or defence,
        identify what has already been completed, and recommend only the next Small Claims materials for the current stage.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="font-semibold text-[#16302b]">Case stage</span>
          <select
            value={input.caseStage}
            onChange={(e) => updateField("caseStage", e.target.value as UniversalStage)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
          >
            <option value="not-sure">Not sure</option>
            <option value="starting-case">Starting a new case</option>
            <option value="responding">Responding to a case</option>
            <option value="already-started">Case already started</option>
            <option value="conference">Settlement conference</option>
            <option value="motion">Motion stage</option>
            <option value="trial">Trial preparation</option>
            <option value="enforcement">Enforcement</option>
            <option value="urgent">Urgent issue</option>
          </select>
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">Your name</span>
            <input
              value={input.yourName}
              onChange={(e) => updateField("yourName", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Full legal name or business name"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">Other party</span>
            <input
              value={input.otherParty}
              onChange={(e) => updateField("otherParty", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Person or business on the other side"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-[#16302b]">Your role</span>
          <input
            value={input.yourRole}
            onChange={(e) => updateField("yourRole", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: Plaintiff, defendant, business owner, customer, contractor"
          />
        </label>

        <div>
          <h3 className="font-semibold text-[#16302b]">What documents already exist?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField(
                    "filedDocuments",
                    toggleArrayValue(input.filedDocuments, option.value)
                  )
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  input.filedDocuments.includes(option.value)
                    ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]"
                    : "border-[#d8e6df] bg-white text-[#4d675f]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[#16302b]">What issues are involved?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {issueOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField("issues", toggleArrayValue(input.issues, option.value))
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  input.issues.includes(option.value)
                    ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]"
                    : "border-[#d8e6df] bg-white text-[#4d675f]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {[
          ["courtLocation", "Court location", "Example: Ottawa Small Claims Court"],
          ["claimNumber", "Claim number, if already started", "Example: SC-25-000000"],
          ["amountClaimed", "Amount claimed or disputed", "Example: $12,500 plus costs"],
          ["defendantAddress", "Other party address", "Address for service or business address"],
          ["agreementDetails", "Agreement / contract / quote details", "What was agreed to, by whom, and when?"],
          ["paymentHistory", "Payment history", "Payments made, missed, refused, partial payments, deposits."],
          ["damagesBreakdown", "Breakdown of amount claimed", "Explain how you calculated the amount."],
          ["serviceDetails", "Service details", "Who was served, when, where, how, and by whom?"],
          ["deadlineDetails", "Deadlines or court dates", "Defence deadline, settlement conference, trial, service deadline."],
          ["facts", "What happened?", "Explain the full story in your own words."],
          ["timeline", "Timeline", "Important dates in order."],
          ["evidence", "Evidence you have", "Invoices, contracts, texts, photos, receipts, emails, witnesses."],
          ["missingEvidence", "Evidence still missing", "Documents, photos, statements, or records still needed."],
          ["settlementEfforts", "Settlement efforts", "Offers, discussions, payment plans, attempts to resolve."],
          ["defenceResponse", "If defending: your response to the claim", "What do you admit, deny, or dispute?"],
          ["goal", "What do you want the court to order?", "Money, dismissal, payment plan, return of property, costs."],
          ["urgent", "Anything urgent?", "Deadlines, limitation concerns, service problems, default, enforcement urgency."],
        ].map(([field, label, placeholder]) => (
          <label key={field} className="block">
            <span className="font-semibold text-[#16302b]">{label}</span>
            <textarea
              value={String(input[field as keyof SmallClaimsInput])}
              onChange={(e) =>
                updateField(field as keyof SmallClaimsInput, e.target.value as never)
              }
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder={placeholder}
            />
          </label>
        ))}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? "Analyzing..." : "Generate Summary"}
        </button>
      </div>
    </section>
  );
}