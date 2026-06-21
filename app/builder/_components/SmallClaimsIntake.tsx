"use client";

import { useMemo, useState } from "react";

import type {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
} from "./builderTypes";

import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsEvidenceFile,
  type SmallClaimsFiledDocument,
  type SmallClaimsIntelligenceInput,
  type SmallClaimsIssue,
} from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
};

const filedOptions: { value: SmallClaimsFiledDocument; label: string }[] = [
  { value: "nothing", label: "Nothing filed yet" },
  { value: "plaintiffs-claim", label: "Plaintiff’s Claim already filed / served" },
  { value: "defence", label: "Defence already filed / received" },
  { value: "affidavit-service", label: "Affidavit of Service completed" },
  { value: "offer-settle", label: "Offer to Settle prepared" },
  { value: "settlement-conference", label: "Settlement conference scheduled or completed" },
  { value: "default-judgment", label: "Default judgment step started" },
  { value: "witness-list", label: "Witness list prepared" },
  { value: "enforcement-documents", label: "Enforcement documents started" },
  { value: "not-sure", label: "Not sure" },
];

const evidenceCategoryOptions = [
  "Screenshots / messages",
  "Social media posts",
  "Emails",
  "Witness / recipient information",
  "Reputation / harm proof",
  "Payment / financial proof",
  "Contract / agreement, only if relevant",
  "Photos / physical damage, only if relevant",
  "Court document",
  "Service / delivery proof",
  "Settlement discussion",
  "Other",
];

const defaultInput: SmallClaimsIntelligenceInput = {
  caseStage: "not-sure",
  issues: [],
  filedDocuments: ["nothing"],
  uploadedEvidenceFiles: [],

  yourName: "",
  yourAddress: "",
  yourCity: "",
  yourProvince: "Ontario",
  yourPostalCode: "",
  yourPhone: "",
  yourEmail: "",

  otherParty: "",
  otherPartyPhone: "",
  otherPartyEmail: "",

  yourRole: "Plaintiff / claimant",
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

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function toggleArrayValue<T extends string>(items: T[], value: T): T[] {
  if (value === "nothing") return items.includes(value) ? [] : [value];
  if (value === "not-sure") return items.includes(value) ? [] : [value];

  const cleaned = items.filter(
    (item) => item !== "nothing" && item !== "not-sure",
  );

  return cleaned.includes(value)
    ? cleaned.filter((item) => item !== value)
    : [...cleaned, value];
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function inferIssuesFromStory(input: SmallClaimsIntelligenceInput): SmallClaimsIssue[] {
  const text = normalizeText(
    [
      input.yourRole,
      input.facts,
      input.timeline,
      input.evidence,
      input.missingEvidence,
      input.goal,
      input.damagesBreakdown,
      input.urgent,
    ].join(" "),
  );

  const issues: SmallClaimsIssue[] = [];

  if (
    text.includes("defamation") ||
    text.includes("reputation") ||
    text.includes("false statement") ||
    text.includes("false statements") ||
    text.includes("rumor") ||
    text.includes("rumour") ||
    text.includes("posted") ||
    text.includes("called me") ||
    text.includes("spread")
  ) {
    issues.push("defamation-reputation");
  }

  if (
    text.includes("harass") ||
    text.includes("threat") ||
    text.includes("messages") ||
    text.includes("texts") ||
    text.includes("email") ||
    text.includes("social media")
  ) {
    issues.push("harassment-communications");
  }

  if (
    text.includes("unpaid") ||
    text.includes("owed") ||
    text.includes("invoice") ||
    text.includes("loan") ||
    text.includes("debt")
  ) {
    issues.push("unpaid-money");
  }

  if (
    text.includes("contract") ||
    text.includes("agreement") ||
    text.includes("quote") ||
    text.includes("renovation") ||
    text.includes("service")
  ) {
    issues.push("contract-dispute");
  }

  if (
    text.includes("damaged") ||
    text.includes("repair") ||
    text.includes("vehicle") ||
    text.includes("property damage")
  ) {
    issues.push("property-damage");
  }

  if (
    text.includes("served with a claim") ||
    text.includes("defending") ||
    text.includes("defence") ||
    text.includes("defense") ||
    text.includes("i am defendant")
  ) {
    issues.push("defending-claim");
  }

  if (text.includes("settle") || text.includes("settlement")) {
    issues.push("settlement");
  }

  return Array.from(new Set(issues));
}

function inferStage(input: SmallClaimsIntelligenceInput): UniversalStage {
  if (input.caseStage !== "not-sure") return input.caseStage;

  const text = normalizeText(
    [input.yourRole, input.facts, input.serviceDetails, input.defenceResponse].join(" "),
  );

  if (input.filedDocuments.includes("settlement-conference")) return "conference";
  if (input.filedDocuments.includes("enforcement-documents")) return "enforcement";
  if (input.filedDocuments.includes("plaintiffs-claim")) return "already-started";

  if (
    input.filedDocuments.includes("defence") ||
    text.includes("served with a claim") ||
    text.includes("defendant") ||
    text.includes("responding") ||
    text.includes("defending")
  ) {
    return "responding";
  }

  return "starting-case";
}

function buildMissingPrompt(input: SmallClaimsIntelligenceInput): string {
  const missing: string[] = [];

  if (!hasText(input.yourName)) missing.push("your legal name");
  if (!hasText(input.otherParty)) missing.push("the other party’s name");
  if (!hasText(input.defendantAddress)) missing.push("the other party’s address for service");
  if (!hasText(input.facts)) missing.push("the full story");
  if (!hasText(input.timeline)) missing.push("important dates");
  if (!hasText(input.evidence)) missing.push("what evidence you have");
  if (!hasText(input.amountClaimed)) missing.push("the amount claimed, if money is requested");
  if (!hasText(input.damagesBreakdown)) missing.push("how the amount was calculated");

  if (!missing.length) {
    return "The intake has enough to run an initial analysis, but the system will still check for proof gaps.";
  }

  return `Still useful to add: ${missing.join(", ")}.`;
}

function buildCaseDirection(input: SmallClaimsIntelligenceInput): string {
  const issues = inferIssuesFromStory(input);
  const stage = inferStage(input);

  const labels: Record<SmallClaimsIssue, string> = {
    "unpaid-money": "unpaid money",
    "contract-dispute": "contract/agreement dispute",
    "property-damage": "property damage",
    "loan-or-debt": "loan/debt",
    "work-or-services": "work/services",
    "deposit-refund": "deposit/refund",
    "consumer-purchase": "consumer purchase",
    "vehicle-dispute": "vehicle dispute",
    "defamation-reputation": "defamation/reputational harm",
    "harassment-communications": "harmful communications/harassment",
    "defending-claim": "responding/defence",
    settlement: "settlement",
    enforcement: "enforcement",
    other: "other",
  };

  const issueText = issues.length
    ? issues.map((issue) => labels[issue]).join(", ")
    : "not yet classified";

  return `Likely direction: ${stage.replace(/-/g, " ")} · ${issueText}`;
}

export default function SmallClaimsIntake({ onComplete }: Props) {
  const [input, setInput] =
    useState<SmallClaimsIntelligenceInput>(defaultInput);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const inferredDirection = useMemo(() => buildCaseDirection(input), [input]);
  const missingPrompt = useMemo(() => buildMissingPrompt(input), [input]);

  function updateField<K extends keyof SmallClaimsIntelligenceInput>(
    field: K,
    value: SmallClaimsIntelligenceInput[K],
  ) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function handleEvidenceFilesSelected(files: FileList | null) {
    if (!files) return;

    const nextFiles: SmallClaimsEvidenceFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "Unknown file type",
      lastModified: file.lastModified,
      title: "",
      description: "",
      category: "",
      evidenceDate: "",
      source: "",
      relevance: "",
    }));

    setInput((current) => {
      const existingIds = new Set(
        current.uploadedEvidenceFiles.map((file) => file.id),
      );

      return {
        ...current,
        uploadedEvidenceFiles: [
          ...current.uploadedEvidenceFiles,
          ...nextFiles.filter((file) => !existingIds.has(file.id)),
        ],
      };
    });
  }

  function updateEvidenceFile(
    fileId: string,
    field: keyof Pick<
      SmallClaimsEvidenceFile,
      "title" | "description" | "category" | "evidenceDate" | "source" | "relevance"
    >,
    value: string,
  ) {
    setInput((current) => ({
      ...current,
      uploadedEvidenceFiles: current.uploadedEvidenceFiles.map((file) =>
        file.id === fileId ? { ...file, [field]: value } : file,
      ),
    }));
  }

  function removeEvidenceFile(fileId: string) {
    setInput((current) => ({
      ...current,
      uploadedEvidenceFiles: current.uploadedEvidenceFiles.filter(
        (file) => file.id !== fileId,
      ),
    }));
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const preparedInput: SmallClaimsIntelligenceInput = {
        ...input,
        caseStage: inferStage(input),
        issues: inferIssuesFromStory(input),
        filedDocuments:
          input.filedDocuments.length > 0 ? input.filedDocuments : ["nothing"],
      };

      const result = await analyzeSmallClaimsWithBrain(preparedInput);

      localStorage.setItem("caseData", JSON.stringify(result.payload));
      localStorage.setItem("courtSimplifiedCase", JSON.stringify(result.payload));

      if (result.masterResultPatch) {
        localStorage.setItem(
          "courtSimplifiedMasterResultPatch",
          JSON.stringify(result.masterResultPatch),
        );
      }

      if (result.dashboardPatch) {
        localStorage.setItem(
          "courtSimplifiedDashboardPatch",
          JSON.stringify(result.dashboardPatch),
        );
      }

      if (result.recommendedNextRoute) {
        localStorage.setItem(
          "courtSimplifiedRecommendedNextRoute",
          result.recommendedNextRoute,
        );
      }

      onComplete(result.analysis, result.payload);
    } catch (error) {
      console.error("Small Claims intelligence analysis failed:", error);

      setAnalysisError(
        "CourtSimplified could not complete the Small Claims intelligence analysis. Please review the intake and try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <div className="rounded-3xl bg-[#f2fbf7] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f7d67]">
          Small Claims · Narrative-first intake
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#10231f]">
          Tell the story. The system will classify the legal path.
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#4d675f]">
          This intake no longer forces the case into old checkbox categories.
          It uses your story, role, documents, evidence, and goals to determine
          claim direction, missing proof, likely forms, risks, and next steps.
        </p>

        <div className="mt-4 rounded-2xl border border-[#cde7dc] bg-white p-4 text-sm text-[#24463d]">
          <p className="font-semibold">{inferredDirection}</p>
          <p className="mt-2">{missingPrompt}</p>
        </div>
      </div>

      {analysisError && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {analysisError}
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">Case stage</span>
            <select
              value={input.caseStage}
              onChange={(event) =>
                updateField("caseStage", event.target.value as UniversalStage)
              }
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

          <label className="block">
            <span className="font-semibold text-[#16302b]">Your role</span>
            <select
              value={input.yourRole}
              onChange={(event) => updateField("yourRole", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
            >
              <option value="Plaintiff / claimant">Plaintiff / claimant</option>
              <option value="Defendant / responding party">Defendant / responding party</option>
              <option value="Not sure">Not sure</option>
            </select>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Your full legal name or business name
            </span>
            <input
              value={input.yourName}
              onChange={(event) => updateField("yourName", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Full legal name or business name"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Other party name
            </span>
            <input
              value={input.otherParty}
              onChange={(event) => updateField("otherParty", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Person or business on the other side"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-[#16302b]">
            What happened?
          </span>
          <textarea
            value={input.facts}
            onChange={(event) => updateField("facts", event.target.value)}
            className="mt-2 min-h-44 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: I want to sue because someone posted false statements about me online and sent messages to other people. I have screenshots and want compensation for reputational harm."
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Important dates / timeline
            </span>
            <textarea
              value={input.timeline}
              onChange={(event) => updateField("timeline", event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="List dates in order. If you do not know exact dates, estimate."
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Evidence you have
            </span>
            <textarea
              value={input.evidence}
              onChange={(event) => updateField("evidence", event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Screenshots, messages, witnesses, receipts, photos, emails, documents."
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Evidence still missing
            </span>
            <textarea
              value={input.missingEvidence}
              onChange={(event) =>
                updateField("missingEvidence", event.target.value)
              }
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Example: exact date, full thread, witness names, proof of who saw the statement."
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              What do you want the court to order?
            </span>
            <textarea
              value={input.goal}
              onChange={(event) => updateField("goal", event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Money, apology, return of property, dismissal, payment plan, costs."
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Amount claimed or disputed
            </span>
            <input
              value={input.amountClaimed}
              onChange={(event) =>
                updateField("amountClaimed", event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Example: $5,000"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">
              Breakdown of amount claimed
            </span>
            <input
              value={input.damagesBreakdown}
              onChange={(event) =>
                updateField("damagesBreakdown", event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Explain how you reached the number, if known."
            />
          </label>
        </div>

        <div className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            Party and service details
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <input
              value={input.yourAddress}
              onChange={(event) => updateField("yourAddress", event.target.value)}
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your address"
            />

            <input
              value={input.yourCity}
              onChange={(event) => updateField("yourCity", event.target.value)}
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your city"
            />

            <input
              value={input.yourPostalCode}
              onChange={(event) =>
                updateField("yourPostalCode", event.target.value)
              }
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your postal code"
            />

            <input
              value={input.yourEmail}
              onChange={(event) => updateField("yourEmail", event.target.value)}
              className="rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Your email"
            />

            <textarea
              value={input.defendantAddress}
              onChange={(event) =>
                updateField("defendantAddress", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3 md:col-span-2"
              placeholder="Other party address for service, if known"
            />

            <textarea
              value={input.serviceDetails}
              onChange={(event) =>
                updateField("serviceDetails", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3 md:col-span-2"
              placeholder="Service details, only if anything has already been served"
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[#16302b]">
            What documents already exist?
          </h3>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField(
                    "filedDocuments",
                    toggleArrayValue(input.filedDocuments, option.value),
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

        <details className="rounded-3xl border border-[#d8e6df] bg-white p-5">
          <summary className="cursor-pointer font-bold text-[#16302b]">
            Optional details for specific case types
          </summary>

          <div className="mt-5 grid gap-5">
            <textarea
              value={input.agreementDetails}
              onChange={(event) =>
                updateField("agreementDetails", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Agreement/contract details, only if this case involves an agreement"
            />

            <textarea
              value={input.paymentHistory}
              onChange={(event) =>
                updateField("paymentHistory", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Payment history, only if money, invoices, loan, debt, or services are involved"
            />

            <textarea
              value={input.defenceResponse}
              onChange={(event) =>
                updateField("defenceResponse", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Defence response, only if you are responding to someone else's claim"
            />

            <textarea
              value={input.settlementEfforts}
              onChange={(event) =>
                updateField("settlementEfforts", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Settlement efforts or offers"
            />

            <textarea
              value={input.deadlineDetails}
              onChange={(event) =>
                updateField("deadlineDetails", event.target.value)
              }
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Deadlines, court dates, or urgent timing concerns"
            />

            <textarea
              value={input.urgent}
              onChange={(event) => updateField("urgent", event.target.value)}
              className="min-h-24 rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Anything urgent"
            />
          </div>
        </details>

        <div className="rounded-3xl border border-dashed border-[#b8d8cc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            Upload and describe evidence files
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#4d675f]">
            Evidence is optional at this step, but the system will mark proof
            gaps if important evidence is missing.
          </p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#d8e6df] bg-white px-4 py-6 text-center hover:bg-[#f4fbf8]">
            <span className="font-semibold text-[#2f7d67]">
              Choose evidence files
            </span>
            <span className="mt-1 text-sm text-[#6b8078]">
              You can select multiple files
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) =>
                handleEvidenceFilesSelected(event.target.files)
              }
            />
          </label>

          {input.uploadedEvidenceFiles.length > 0 && (
            <div className="mt-5 grid gap-4">
              {input.uploadedEvidenceFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-[#d8e6df] bg-white p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-[#16302b]">
                        {file.name}
                      </p>
                      <p className="mt-1 text-sm text-[#6b8078]">
                        {formatFileSize(file.size)} · {file.type}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEvidenceFile(file.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <input
                      value={file.title}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "title", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                      placeholder="Evidence title"
                    />

                    <select
                      value={file.category}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "category", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Select issue</option>
                      {evidenceCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>

                    <input
                      value={file.evidenceDate}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "evidenceDate", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                      placeholder="Date or event this relates to"
                    />

                    <input
                      value={file.source}
                      onChange={(event) =>
                        updateEvidenceFile(file.id, "source", event.target.value)
                      }
                      className="rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                      placeholder="Who created or sent it?"
                    />
                  </div>

                  <textarea
                    value={file.description}
                    onChange={(event) =>
                      updateEvidenceFile(file.id, "description", event.target.value)
                    }
                    className="mt-4 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                    placeholder="What does this evidence show?"
                  />

                  <textarea
                    value={file.relevance}
                    onChange={(event) =>
                      updateEvidenceFile(file.id, "relevance", event.target.value)
                    }
                    className="mt-4 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                    placeholder="Why does it matter to your case?"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

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