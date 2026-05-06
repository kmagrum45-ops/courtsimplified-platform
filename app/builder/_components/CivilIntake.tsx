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
} from "./builderTypes";

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
};

type CivilIssue =
  | "contract"
  | "negligence"
  | "defamation"
  | "property"
  | "debt"
  | "injunction"
  | "charter"
  | "employment"
  | "estate"
  | "motion"
  | "appeal"
  | "enforcement"
  | "other";

type CivilDocument =
  | "statement-claim"
  | "statement-defence"
  | "notice-application"
  | "notice-motion"
  | "affidavit-service"
  | "affidavit"
  | "order"
  | "judgment"
  | "discovery"
  | "trial-record"
  | "nothing"
  | "not-sure";

type CivilInput = {
  caseStage: UniversalStage;
  issues: CivilIssue[];
  documents: CivilDocument[];
  yourName: string;
  otherParty: string;
  yourRole: string;
  courtLocation: string;
  courtFileNumber: string;
  amountClaimed: string;
  limitationDeadline: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  damagesBreakdown: string;
  legalRemedy: string;
  settlementEfforts: string;
  serviceDetails: string;
  urgent: string;
};

const defaultInput: CivilInput = {
  caseStage: "not-sure",
  issues: [],
  documents: [],
  yourName: "",
  otherParty: "",
  yourRole: "",
  courtLocation: "",
  courtFileNumber: "",
  amountClaimed: "",
  limitationDeadline: "",
  facts: "",
  timeline: "",
  evidence: "",
  missingEvidence: "",
  damagesBreakdown: "",
  legalRemedy: "",
  settlementEfforts: "",
  serviceDetails: "",
  urgent: "",
};

const issueOptions: { value: CivilIssue; label: string }[] = [
  { value: "contract", label: "Contract / agreement dispute" },
  { value: "negligence", label: "Negligence / harm / damages" },
  { value: "defamation", label: "Defamation / reputational harm" },
  { value: "property", label: "Property / land / possession issue" },
  { value: "debt", label: "Debt / money owed" },
  { value: "injunction", label: "Injunction / urgent court order" },
  { value: "charter", label: "Charter / government conduct" },
  { value: "employment", label: "Employment-related civil issue" },
  { value: "estate", label: "Estate / probate / trust issue" },
  { value: "motion", label: "Motion in an existing case" },
  { value: "appeal", label: "Appeal / leave to appeal" },
  { value: "enforcement", label: "Enforcement / collection after judgment" },
  { value: "other", label: "Other civil issue" },
];

const documentOptions: { value: CivilDocument; label: string }[] = [
  { value: "statement-claim", label: "Statement of Claim already filed / served" },
  { value: "statement-defence", label: "Statement of Defence already filed / received" },
  { value: "notice-application", label: "Notice of Application already filed / received" },
  { value: "notice-motion", label: "Notice of Motion already filed / received" },
  { value: "affidavit-service", label: "Affidavit of Service completed" },
  { value: "affidavit", label: "Affidavit already prepared" },
  { value: "order", label: "Order already made" },
  { value: "judgment", label: "Judgment already obtained" },
  { value: "discovery", label: "Discovery / Affidavit of Documents started" },
  { value: "trial-record", label: "Trial record / trial materials started" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
];

function toggleArrayValue<T extends string>(items: T[], value: T) {
  if (value === "nothing") return items.includes(value) ? [] : ["nothing" as T];
  if (value === "not-sure") return items.includes(value) ? [] : ["not-sure" as T];

  const cleaned = items.filter((item) => item !== "nothing" && item !== "not-sure");

  return cleaned.includes(value)
    ? cleaned.filter((item) => item !== value)
    : [...cleaned, value];
}

function analyzeCivilCase(input: CivilInput): AnalysisResult {
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

  const claimStarted =
    input.documents.includes("statement-claim") ||
    includesAny(text, ["statement of claim filed", "claim already filed"]);

  const defenceFiled =
    input.documents.includes("statement-defence") ||
    includesAny(text, ["statement of defence filed", "defence already filed"]);

  const applicationStarted = input.documents.includes("notice-application");
  const motionStarted = input.documents.includes("notice-motion");
  const serviceDone = input.documents.includes("affidavit-service");
  const judgmentDone = input.documents.includes("judgment");
  const discoveryStarted = input.documents.includes("discovery");
  const trialStarted = input.documents.includes("trial-record");

  if (claimStarted) completedForms.push("Form 14A — Statement of Claim");
  if (defenceFiled) receivedForms.push("Form 18A — Statement of Defence");
  if (applicationStarted) completedForms.push("Form 14E — Notice of Application");
  if (motionStarted) completedForms.push("Form 37A — Notice of Motion");
  if (serviceDone) completedForms.push("Form 16B — Affidavit of Service");
  if (judgmentDone) completedForms.push("Judgment / order already exists");
  if (discoveryStarted) completedForms.push("Discovery materials started");
  if (trialStarted) completedForms.push("Trial materials started");

  const isStarting =
    input.caseStage === "starting-case" ||
    input.documents.includes("nothing") ||
    input.documents.length === 0;

  const isResponding = input.caseStage === "responding";
  const isMotion = input.caseStage === "motion" || input.issues.includes("motion");
  const isEnforcement =
    input.caseStage === "enforcement" || input.issues.includes("enforcement");
  const isTrial = input.caseStage === "trial";
  const isUrgent = input.caseStage === "urgent" || input.issues.includes("injunction");

  if (input.issues.includes("contract")) detectedIssues.push("Contract / agreement issue");
  if (input.issues.includes("negligence")) detectedIssues.push("Negligence / damages issue");
  if (input.issues.includes("defamation")) detectedIssues.push("Defamation / reputational harm issue");
  if (input.issues.includes("charter")) detectedIssues.push("Charter / public authority issue");
  if (input.issues.includes("estate")) detectedIssues.push("Estate / probate / trust issue");
  if (isMotion) detectedIssues.push("Motion or procedural request");
  if (isEnforcement) detectedIssues.push("Enforcement after judgment");
  if (isTrial) detectedIssues.push("Trial preparation");

  if (isStarting && !claimStarted && !applicationStarted) {
    requiredNextForms.push("Form 14A — Statement of Claim");
    requiredNextForms.push("Form 4A — General Heading");
    requiredNextForms.push("Form 4C — Backsheet");
  }

  if (isResponding && !defenceFiled) {
    requiredNextForms.push("Form 18A — Statement of Defence");
  }

  if (claimStarted && !serviceDone && !isResponding) {
    requiredNextForms.push("Form 16B — Affidavit of Service");
  }

  if (isMotion) {
    requiredNextForms.push("Form 37A — Notice of Motion");
    requiredNextForms.push("Affidavit in support of motion");
  }

  if (isUrgent) {
    requiredNextForms.push("Urgent motion materials");
    risksAndGaps.push("Urgent relief usually needs clear evidence, dates, harm, and the exact order requested.");
  }

  if (discoveryStarted || input.caseStage === "already-started") {
    requiredNextForms.push("Affidavit of Documents / discovery organization package");
  }

  if (isTrial) {
    requiredNextForms.push("Trial record / evidence package");
    requiredNextForms.push("Witness list and key document index");
  }

  if (isEnforcement) {
    requiredNextForms.push("Enforcement information package");
    requiredNextForms.push("Writ / garnishment / examination materials depending on enforcement method");
  }

  if (applicationStarted) {
    requiredNextForms.push("Application record / affidavit evidence package");
    notNeededNow.push("Form 14A — Statement of Claim");
  }

  if (claimStarted) notNeededNow.push("Form 14A — Statement of Claim");
  if (defenceFiled) notNeededNow.push("Form 18A — Statement of Defence");
  if (serviceDone) notNeededNow.push("Form 16B — Affidavit of Service");

  if (!hasMeaningfulText(input.yourName)) missingInformation.push("Your full legal name or business name.");
  if (!hasMeaningfulText(input.otherParty)) missingInformation.push("Other party’s full legal name or business name.");
  if (!hasMeaningfulText(input.courtLocation)) missingInformation.push("Court location.");
  if (!hasMeaningfulText(input.facts)) missingInformation.push("Detailed facts explaining what happened.");
  if (!hasMeaningfulText(input.timeline)) missingInformation.push("Timeline with key dates.");
  if (!hasMeaningfulText(input.evidence)) risksAndGaps.push("Evidence has not been listed yet.");
  if (!hasMeaningfulText(input.legalRemedy)) missingInformation.push("Exact order or remedy wanted from the court.");

  if (input.issues.includes("defamation")) {
    if (!hasMeaningfulText(input.evidence)) {
      risksAndGaps.push("Defamation claims usually need proof of the exact words, who received them, when they were published, and harm caused.");
    }
    if (!hasMeaningfulText(input.damagesBreakdown)) {
      missingInformation.push("Explanation of reputational, financial, or other harm caused by the statements.");
    }
  }

  if (input.issues.includes("negligence") && !hasMeaningfulText(input.damagesBreakdown)) {
    missingInformation.push("Breakdown of damages and losses caused by the alleged negligence.");
  }

  if (hasMeaningfulText(input.amountClaimed)) inferredFacts.push("A claim amount was provided.");
  if (hasMeaningfulText(input.limitationDeadline)) inferredFacts.push("A limitation or deadline concern was provided.");
  if (hasMeaningfulText(input.settlementEfforts)) inferredFacts.push("Settlement efforts were described.");
  if (hasMeaningfulText(input.serviceDetails)) inferredFacts.push("Service details were provided.");

  guidance.push(
    "Civil cases should be organized by parties, legal issue, facts, timeline, evidence, requested remedy, and procedural stage.",
    "Do not restart the case with forms already filed. Prepare only the next documents required for the current stage.",
    "For a Statement of Claim, the system will need party names, court location, material facts, legal basis, remedy requested, and damages breakdown.",
    "For motions, the system will need the order requested, evidence supporting urgency or need, and the procedural history.",
    "Evidence should be organized by date, source, issue, and what each document proves."
  );

  const doneText = normalize([...completedForms, ...receivedForms, ...notNeededNow].join(" "));
  requiredNextForms = cleanList(
    requiredNextForms.filter((form) => {
      const f = normalize(form);
      if (f.includes("statement of claim") && doneText.includes("statement of claim")) return false;
      if (f.includes("statement of defence") && doneText.includes("statement of defence")) return false;
      if (f.includes("affidavit of service") && doneText.includes("affidavit of service")) return false;
      return true;
    })
  );

  const summary = [
    "Civil Case Summary",
    "",
    `Stage: ${getStageLabel(input.caseStage)}`,
    "",
    `Next required documents:\n- ${requiredNextForms.join("\n- ") || "No next forms detected yet"}`,
    "",
    `Missing information:\n- ${cleanList(missingInformation).join("\n- ") || "No major missing information detected"}`,
    "",
    `Risks or gaps:\n- ${cleanList(risksAndGaps).join("\n- ") || "No major risks detected yet"}`,
  ].join("\n");

  return {
    courtPath: "civil",
    caseStage: getStageLabel(input.caseStage),
    completedForms: cleanList(completedForms),
    receivedForms: cleanList(receivedForms),
    requiredNextForms,
    notNeededNow: cleanList(notNeededNow),
    detectedIssues: cleanList(detectedIssues),
    inferredFacts: cleanList(inferredFacts),
    missingInformation: cleanList(missingInformation),
    risksAndGaps: cleanList(risksAndGaps),
    guidance,
    summary,
  };
}

export default function CivilIntake({ onComplete }: Props) {
  const [input, setInput] = useState<CivilInput>(defaultInput);

  function updateField<K extends keyof CivilInput>(field: K, value: CivilInput[K]) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function handleAnalyze() {
    const analysis = analyzeCivilCase(input);

    const payload: StoredCaseData = {
      courtPath: "civil",
      pathLabel: "Civil",
      caseStage: input.caseStage,
      yourName: input.yourName,
      otherParty: input.otherParty,
      facts: input.facts,
      timeline: input.timeline,
      evidence: input.evidence,
      missingEvidence: input.missingEvidence,
      goal: input.legalRemedy,
      urgent: input.urgent,
      analysis,
      extra: {
        issues: input.issues,
        documents: input.documents,
        yourRole: input.yourRole,
        courtLocation: input.courtLocation,
        courtFileNumber: input.courtFileNumber,
        amountClaimed: input.amountClaimed,
        limitationDeadline: input.limitationDeadline,
        damagesBreakdown: input.damagesBreakdown,
        legalRemedy: input.legalRemedy,
        settlementEfforts: input.settlementEfforts,
        serviceDetails: input.serviceDetails,
      },
    };

    localStorage.setItem("caseData", JSON.stringify(payload));
    onComplete(analysis, payload);
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Civil Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Tell the full civil case story once. CourtSimplified will identify the
        current stage, missing information, next documents, and case-building steps.
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
            <option value="starting-case">Starting a new civil case</option>
            <option value="responding">Responding to a civil case</option>
            <option value="already-started">Case already started</option>
            <option value="conference">Conference / case management</option>
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
              placeholder="Person, business, institution, or government body"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-[#16302b]">Your role</span>
          <input
            value={input.yourRole}
            onChange={(e) => updateField("yourRole", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: plaintiff, defendant, applicant, moving party"
          />
        </label>

        <div>
          <h3 className="font-semibold text-[#16302b]">What documents already exist?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {documentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField("documents", toggleArrayValue(input.documents, option.value))
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  input.documents.includes(option.value)
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
          ["courtLocation", "Court location", "Example: Ottawa Superior Court of Justice"],
          ["courtFileNumber", "Court file number, if already started", "Example: CV-25-00000000"],
          ["amountClaimed", "Amount claimed or disputed", "Example: $75,000 plus costs"],
          ["limitationDeadline", "Limitation/deadline concerns", "When did the issue happen? Any filing deadline?"],
          ["facts", "What happened?", "Explain the full story in your own words."],
          ["timeline", "Timeline", "Important dates in order."],
          ["evidence", "Evidence you have", "Contracts, texts, emails, photos, records, receipts, witnesses."],
          ["missingEvidence", "Evidence still missing", "Documents, records, witnesses, or proof still needed."],
          ["damagesBreakdown", "Damages / loss breakdown", "Explain money loss, harm, expenses, reputational harm, or other damages."],
          ["legalRemedy", "What do you want the court to order?", "Money, declaration, injunction, dismissal, order, costs."],
          ["settlementEfforts", "Settlement efforts", "Offers, letters, discussions, refusals, payment proposals."],
          ["serviceDetails", "Service details", "Who was served, when, where, how, and by whom?"],
          ["urgent", "Anything urgent?", "Deadlines, injunction, ongoing harm, limitation issue, enforcement urgency."],
        ].map(([field, label, placeholder]) => (
          <label key={field} className="block">
            <span className="font-semibold text-[#16302b]">{label}</span>
            <textarea
              value={String(input[field as keyof CivilInput])}
              onChange={(e) =>
                updateField(field as keyof CivilInput, e.target.value as never)
              }
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder={placeholder}
            />
          </label>
        ))}

        <button
          type="button"
          onClick={handleAnalyze}
          className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
        >
          Generate Analysis
        </button>
      </div>
    </section>
  );
}