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

type FiledDocument =
  | "application"
  | "answer"
  | "financial-statement"
  | "affidavit"
  | "motion-materials"
  | "conference-brief"
  | "order-agreement"
  | "nothing"
  | "not-sure";

type FamilyIssue =
  | "decision-making-responsibility"
  | "parenting-time"
  | "child-support"
  | "spousal-support"
  | "property-division"
  | "matrimonial-home"
  | "safety-concerns"
  | "relocation"
  | "disclosure"
  | "enforcement"
  | "other";

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
};

const filedOptions: { value: FiledDocument; label: string }[] = [
  { value: "application", label: "Application already filed / served" },
  { value: "answer", label: "Answer / response already filed" },
  { value: "financial-statement", label: "Financial statement already completed" },
  { value: "affidavit", label: "Affidavit already prepared" },
  { value: "motion-materials", label: "Motion materials already filed" },
  { value: "conference-brief", label: "Conference brief already filed" },
  { value: "order-agreement", label: "Existing court order or agreement" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
];

const issueOptions: { value: FamilyIssue; label: string }[] = [
  { value: "decision-making-responsibility", label: "Decision-making responsibility / custody" },
  { value: "parenting-time", label: "Parenting time / access" },
  { value: "child-support", label: "Child support" },
  { value: "spousal-support", label: "Spousal support" },
  { value: "property-division", label: "Property / equalization" },
  { value: "matrimonial-home", label: "Matrimonial home / exclusive possession" },
  { value: "safety-concerns", label: "Safety concerns" },
  { value: "relocation", label: "Relocation / moving with child" },
  { value: "disclosure", label: "Disclosure problems" },
  { value: "enforcement", label: "Enforcement / arrears" },
  { value: "other", label: "Other family issue" },
];

function toggleArrayValue<T extends string>(items: T[], value: T) {
  if (value === "nothing") return items.includes(value) ? [] : ["nothing" as T];
  if (value === "not-sure") return items.includes(value) ? [] : ["not-sure" as T];

  const cleaned = items.filter((item) => item !== "nothing" && item !== "not-sure");

  return cleaned.includes(value)
    ? cleaned.filter((item) => item !== value)
    : [...cleaned, value];
}

function analyzeFamilyCase(input: {
  caseStage: UniversalStage;
  filedDocuments: FiledDocument[];
  issues: FamilyIssue[];
  yourName: string;
  otherParty: string;
  childrenInfo: string;
  currentLivingSituation: string;
  pastLivingHistory: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  goal: string;
  urgent: string;
  safetyConcerns: string;
  propertyHomeDetails: string;
  upcomingCourtDate: string;
}): AnalysisResult {
  const text = normalize(
    [
      input.childrenInfo,
      input.currentLivingSituation,
      input.pastLivingHistory,
      input.facts,
      input.timeline,
      input.evidence,
      input.missingEvidence,
      input.goal,
      input.urgent,
      input.safetyConcerns,
      input.propertyHomeDetails,
      input.upcomingCourtDate,
      input.issues.join(" "),
    ].join(" ")
  );

  const completedForms: string[] = [];
  const receivedForms: string[] = [];
  let requiredNextForms: string[] = [];
  const notNeededNow: string[] = [];
  const detectedIssues: string[] = [];
  const inferredFacts: string[] = [];
  const missingInformation: string[] = [];
  const risksAndGaps: string[] = [];
  const guidance: string[] = [];

  const applicationFiled = input.filedDocuments.includes("application");
  const answerReceived = input.filedDocuments.includes("answer");
  const financialDone = input.filedDocuments.includes("financial-statement");
  const affidavitDone = input.filedDocuments.includes("affidavit");
  const conferenceBriefDone = input.filedDocuments.includes("conference-brief");

  if (applicationFiled) completedForms.push("Form 8 — Application");
  if (answerReceived) receivedForms.push("Form 10 — Answer");
  if (financialDone) completedForms.push("Form 13 / 13.1 — Financial Statement");
  if (affidavitDone) completedForms.push("Form 14A — Affidavit");
  if (conferenceBriefDone) completedForms.push("Form 17A — Case Conference Brief");

  const parentingIssue =
    input.issues.includes("decision-making-responsibility") ||
    input.issues.includes("parenting-time") ||
    includesAny(text, ["child", "children", "parenting", "custody", "access", "decision-making"]);

  const supportIssue =
    input.issues.includes("child-support") ||
    input.issues.includes("spousal-support") ||
    includesAny(text, ["support", "income", "expenses", "pay stubs", "tax", "financial"]);

  const propertyIssue =
    input.issues.includes("property-division") ||
    input.issues.includes("matrimonial-home") ||
    includesAny(text, ["property", "house", "home", "matrimonial", "equalization", "mortgage"]);

  const safetyIssue =
    input.issues.includes("safety-concerns") ||
    includesAny(text, ["abuse", "violence", "fear", "threat", "harass", "police", "urgent", "safety"]);

  const conferenceStage =
    input.caseStage === "conference" ||
    input.filedDocuments.includes("conference-brief") ||
    includesAny(text, ["case conference", "settlement conference", "conference date"]);

  const motionStage =
    input.caseStage === "motion" ||
    input.caseStage === "urgent" ||
    includesAny(text, ["motion", "urgent", "temporary order", "without notice"]);

  if (parentingIssue) {
    detectedIssues.push("Parenting / decision-making issue");
    if (!applicationFiled && input.caseStage === "starting-case") {
      requiredNextForms.push("Form 35.1 — Parenting Affidavit");
    }
  }

  if (supportIssue && !financialDone) {
    detectedIssues.push("Support / financial disclosure issue");
    requiredNextForms.push("Form 13 or Form 13.1 — Financial Statement");
  }

  if (propertyIssue && !financialDone) {
    detectedIssues.push("Property or matrimonial home issue");
    requiredNextForms.push("Form 13.1 — Financial Statement with property claims");
  }

  if (safetyIssue) {
    detectedIssues.push("Safety or urgency issue");
    risksAndGaps.push("Safety concerns should be organized by date, incident, evidence, and requested order.");
  }

  if (conferenceStage && !conferenceBriefDone) {
    requiredNextForms.push("Form 17A — Case Conference Brief");
  }

  if (motionStage) {
    requiredNextForms.push("Form 14 — Notice of Motion");
    if (!affidavitDone) requiredNextForms.push("Form 14A — Affidavit");
  }

  if (
    (input.caseStage === "starting-case" ||
      input.filedDocuments.includes("nothing") ||
      input.filedDocuments.length === 0) &&
    !applicationFiled
  ) {
    requiredNextForms.push("Form 8 — Application");
  }

  if (input.caseStage === "responding" && !answerReceived) {
    requiredNextForms.push("Form 10 — Answer");
  }

  if (hasMeaningfulText(input.childrenInfo)) {
    inferredFacts.push("Children or parenting facts were provided.");
  } else if (parentingIssue) {
    missingInformation.push("Children’s names, ages, living arrangements, and current parenting schedule.");
  }

  if (hasMeaningfulText(input.currentLivingSituation)) {
    inferredFacts.push("Current living situation was provided.");
  } else {
    missingInformation.push("Current living arrangements.");
  }

  if (hasMeaningfulText(input.pastLivingHistory)) {
    inferredFacts.push("Past caregiving or living history was provided.");
  }

  if (!hasMeaningfulText(input.facts)) {
    missingInformation.push("Detailed facts explaining what happened.");
  }

  if (!hasMeaningfulText(input.timeline)) {
    missingInformation.push("Timeline with important dates.");
  }

  if (!hasMeaningfulText(input.evidence)) {
    risksAndGaps.push("Evidence has not been listed yet.");
  }

  if (!hasMeaningfulText(input.goal)) {
    missingInformation.push("What you want the court to order.");
  }

  if (hasMeaningfulText(input.upcomingCourtDate)) {
    inferredFacts.push("An upcoming court date or deadline was provided.");
  }

  guidance.push(
    "Organize the case by issue: parenting, support, property, safety, disclosure, and deadlines.",
    "Only prepare the next forms needed for the current stage.",
    "For parenting issues, include the children’s ages, where they live, who has provided care, and the current schedule.",
    "For support or property issues, gather income records, expenses, tax documents, bank records, and property information.",
    "For urgent or safety issues, organize clear dates, messages, photos, police involvement, and witnesses where available."
  );

  requiredNextForms = cleanList(
    requiredNextForms.filter((form) => {
      const doneText = normalize([...completedForms, ...receivedForms, ...notNeededNow].join(" "));
      const f = normalize(form);

      if (f.includes("application") && doneText.includes("application")) return false;
      if (f.includes("answer") && doneText.includes("answer")) return false;
      if (f.includes("financial") && doneText.includes("financial")) return false;
      if (f.includes("affidavit") && doneText.includes("affidavit")) return false;
      if (f.includes("conference brief") && doneText.includes("conference brief")) return false;

      return true;
    })
  );

  const summary = [
    "Family Case Summary",
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
    courtPath: "family",
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

export default function FamilyIntake({ onComplete }: Props) {
  const [caseStage, setCaseStage] = useState<UniversalStage>("not-sure");
  const [filedDocuments, setFiledDocuments] = useState<FiledDocument[]>([]);
  const [issues, setIssues] = useState<FamilyIssue[]>([]);
  const [yourName, setYourName] = useState("");
  const [otherParty, setOtherParty] = useState("");
  const [childrenInfo, setChildrenInfo] = useState("");
  const [currentLivingSituation, setCurrentLivingSituation] = useState("");
  const [pastLivingHistory, setPastLivingHistory] = useState("");
  const [facts, setFacts] = useState("");
  const [timeline, setTimeline] = useState("");
  const [evidence, setEvidence] = useState("");
  const [missingEvidence, setMissingEvidence] = useState("");
  const [goal, setGoal] = useState("");
  const [urgent, setUrgent] = useState("");
  const [safetyConcerns, setSafetyConcerns] = useState("");
  const [propertyHomeDetails, setPropertyHomeDetails] = useState("");
  const [upcomingCourtDate, setUpcomingCourtDate] = useState("");

  function handleAnalyze() {
    const analysis = analyzeFamilyCase({
      caseStage,
      filedDocuments,
      issues,
      yourName,
      otherParty,
      childrenInfo,
      currentLivingSituation,
      pastLivingHistory,
      facts,
      timeline,
      evidence,
      missingEvidence,
      goal,
      urgent,
      safetyConcerns,
      propertyHomeDetails,
      upcomingCourtDate,
    });

    const payload: StoredCaseData = {
      courtPath: "family",
      pathLabel: "Family",
      caseStage,
      yourName,
      otherParty,
      facts,
      timeline,
      evidence,
      missingEvidence,
      goal,
      urgent,
      analysis,
      extra: {
        filedDocuments,
        issues,
        childrenInfo,
        currentLivingSituation,
        pastLivingHistory,
        safetyConcerns,
        propertyHomeDetails,
        upcomingCourtDate,
      },
    };

    localStorage.setItem("caseData", JSON.stringify(payload));
    onComplete(analysis, payload);
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Family Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Tell the full story once. CourtSimplified will organize the facts,
        detect likely issues, identify missing information, and recommend next documents.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="font-semibold text-[#16302b]">Case stage</span>
          <select
            value={caseStage}
            onChange={(e) => setCaseStage(e.target.value as UniversalStage)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
          >
            <option value="not-sure">Not sure</option>
            <option value="starting-case">Starting a new case</option>
            <option value="responding">Responding to a case</option>
            <option value="already-started">Case already started</option>
            <option value="conference">Conference / settlement step</option>
            <option value="motion">Motion stage</option>
            <option value="trial">Trial preparation</option>
            <option value="enforcement">Enforcement</option>
            <option value="urgent">Urgent issue</option>
          </select>
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">Your name</span>
            <input value={yourName} onChange={(e) => setYourName(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" placeholder="Full name" />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">Other party</span>
            <input value={otherParty} onChange={(e) => setOtherParty(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" placeholder="Other person’s name" />
          </label>
        </div>

        <div>
          <h3 className="font-semibold text-[#16302b]">What documents have already been filed or received?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filedOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => setFiledDocuments((current) => toggleArrayValue(current, option.value))} className={`rounded-2xl border px-4 py-3 text-left text-sm ${filedDocuments.includes(option.value) ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]" : "border-[#d8e6df] bg-white text-[#4d675f]"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[#16302b]">What issues are involved?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {issueOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => setIssues((current) => toggleArrayValue(current, option.value))} className={`rounded-2xl border px-4 py-3 text-left text-sm ${issues.includes(option.value) ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]" : "border-[#d8e6df] bg-white text-[#4d675f]"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {[
          ["childrenInfo", "Children / parenting details", childrenInfo, setChildrenInfo, "Children’s names/ages, where they live, current schedule, decision-making issues."],
          ["currentLivingSituation", "Current living situation", currentLivingSituation, setCurrentLivingSituation, "Where everyone lives now and current parenting arrangements."],
          ["pastLivingHistory", "Past caregiving / living history", pastLivingHistory, setPastLivingHistory, "Who has cared for the children and how arrangements changed over time."],
          ["facts", "What happened?", facts, setFacts, "Explain the situation in your own words."],
          ["timeline", "Timeline", timeline, setTimeline, "Important dates: separation, moves, court dates, incidents, missed payments, agreements."],
          ["evidence", "Evidence you have", evidence, setEvidence, "Messages, emails, photos, school records, financial records, police reports, agreements."],
          ["missingEvidence", "Evidence still missing", missingEvidence, setMissingEvidence, "Documents or proof you still need to collect."],
          ["safetyConcerns", "Safety or urgent concerns", safetyConcerns, setSafetyConcerns, "Any urgent issues, safety concerns, threats, police involvement, or immediate risks."],
          ["propertyHomeDetails", "Property / home details", propertyHomeDetails, setPropertyHomeDetails, "Matrimonial home, property, debts, bank accounts, vehicles, pensions, business interests."],
          ["goal", "What do you want the court to order?", goal, setGoal, "Parenting time, decision-making, support, disclosure, property order, urgent order, enforcement."],
          ["urgent", "Anything urgent the system should flag?", urgent, setUrgent, "Upcoming deadline, safety concern, missed court date, service issue, financial emergency."],
        ].map(([key, label, value, setter, placeholder]) => (
          <label key={String(key)} className="block">
            <span className="font-semibold text-[#16302b]">{String(label)}</span>
            <textarea
              value={String(value)}
              onChange={(e) => (setter as (value: string) => void)(e.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder={String(placeholder)}
            />
          </label>
        ))}

        <label className="block">
          <span className="font-semibold text-[#16302b]">Upcoming court date or deadline</span>
          <input
            value={upcomingCourtDate}
            onChange={(e) => setUpcomingCourtDate(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: Case conference on June 15, 2026"
          />
        </label>

        <button type="button" onClick={handleAnalyze} className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white">
          Generate Summary
        </button>
      </div>
    </section>
  );
}