import type {
  CivilCaseType,
  CivilDamagesProfile,
  CivilEvidenceProfile,
  CivilLiabilityTheory,
  CivilNarrativeProfile,
  CivilProcedureProfile,
  CivilStrategicProfile,
} from "./types/civil-case";

import type { CivilWorkflowResult } from "./civilWorkflowEngine";
import type { CivilEvidenceResult } from "./civilEvidenceEngine";

export type CivilNarrativeInput = {
  title?: string;
  summary?: string;
  facts?: string[];
  requestedRemedies?: string[];
  caseTypes?: CivilCaseType[];
  liabilityTheories?: CivilLiabilityTheory[];
  workflow?: CivilWorkflowResult;
  evidence?: CivilEvidenceResult;
};

export type CivilNarrativeSection = {
  id: string;
  title: string;
  purpose: string;
  draftPoints: string[];
  evidenceLinks: string[];
  risks: string[];
  saferWording: string[];
};

export type CivilNarrativeResult = {
  narrativeProfile: CivilNarrativeProfile;
  sections: CivilNarrativeSection[];
  chronologyDraft: string[];
  liabilityDraft: string[];
  causationDraft: string[];
  damagesDraft: string[];
  remedyDraft: string[];
  toneWarnings: string[];
  unsupportedAssertions: string[];
  judgeFacingConcerns: string[];
  defenceVulnerabilities: string[];
  draftingNextSteps: string[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function createId(title: string): string {
  return `civil_narrative_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function allText(input: CivilNarrativeInput): string {
  return normalize(
    [
      input.title,
      input.summary,
      input.facts?.join(" "),
      input.requestedRemedies?.join(" "),
      input.caseTypes?.join(" "),
      input.liabilityTheories?.map((theory) => theory.title).join(" "),
      input.liabilityTheories?.map((theory) => theory.description).join(" "),
      input.workflow?.summary,
      input.evidence?.summary,
    ].join(" "),
  );
}

function detectedTypes(input: CivilNarrativeInput): CivilCaseType[] {
  return cleanList([
    ...(input.caseTypes || []),
    ...(input.workflow?.detectedCivilCaseTypes || []),
  ]) as CivilCaseType[];
}

function buildChronologyDraft(input: CivilNarrativeInput): string[] {
  const facts = input.facts || [];

  return cleanList([
    facts.length > 0
      ? "Organize the facts in date order before final drafting."
      : "The chronology needs dated events before final drafting.",
    ...facts.slice(0, 8).map((fact) => `Chronology point: ${fact}`),
    input.workflow?.proceduralTrack
      ? `Procedural posture: ${input.workflow.proceduralTrack}.`
      : "",
  ]);
}

function buildLiabilityDraft(
  input: CivilNarrativeInput,
  types: CivilCaseType[],
): string[] {
  const theories = input.liabilityTheories || [];

  return cleanList([
    theories.length > 0
      ? `Potential liability theory: ${theories.map((theory) => theory.title).join("; ")}.`
      : "",
    types.includes("defamation")
      ? "For defamation, plead the exact words, who published them, who received them, when they were published, how they identified the plaintiff, and what harm followed."
      : "",
    types.includes("negligence")
      ? "For negligence, separate duty, breach, causation, and damages."
      : "",
    types.includes("breach-of-contract")
      ? "For contract, identify the agreement, terms, breach, loss, and proof of the amount claimed."
      : "",
    types.includes("charter")
      ? "For Charter issues, identify state action, the protected interest, the process failure or rights impact, causation, and the remedy requested."
      : "",
    types.includes("misfeasance")
      ? "For misfeasance, identify the public officer/body, authority used, unlawful or reckless conduct, knowledge/recklessness, causation, and damages."
      : "",
    types.includes("human-rights")
      ? "For Human Rights issues, identify the protected ground, adverse treatment, connection between the two, impact, and requested remedy."
      : "",
  ]);
}

function buildCausationDraft(input: CivilNarrativeInput): string[] {
  const workflowCausation =
    input.workflow?.damagesProfile.causationConcerns || [];

  return cleanList([
    "Explain how the conduct caused the harm. Do not rely only on timing.",
    ...workflowCausation,
    input.evidence?.missingEvidence.some((gap) => gap.issue === "damages")
      ? "Damages causation needs stronger evidence support."
      : "",
  ]);
}

function buildDamagesDraft(input: CivilNarrativeInput): string[] {
  const damages: CivilDamagesProfile | undefined = input.workflow?.damagesProfile;

  return cleanList([
    damages?.financialLosses.join("; "),
    damages?.emotionalHarms.join("; "),
    damages?.reputationalHarms.join("; "),
    damages?.physicalHarms.join("; "),
    damages?.aggravatedFactors.join("; "),
    damages?.punitiveFactors.join("; "),
    damages?.damagesProofMissing.join("; "),
    "Connect each claimed loss to a fact, document, date, and legal theory.",
  ]);
}

function buildRemedyDraft(input: CivilNarrativeInput): string[] {
  const remedies = cleanList([
    ...(input.requestedRemedies || []),
    ...(input.workflow?.damagesProfile.remedyTypes || []),
  ]);

  return cleanList([
    remedies.length > 0
      ? `Requested remedies to organize: ${remedies.join(", ")}.`
      : "Requested remedies need to be clarified.",
    "Separate money damages from declarations, injunctions, costs, and other non-money remedies.",
  ]);
}

function buildToneWarnings(input: CivilNarrativeInput): string[] {
  const text = allText(input);

  return cleanList([
    includesAny(text, ["evil", "corrupt", "obviously", "always", "never"])
      ? "Avoid absolute or inflammatory wording unless it is directly supported by evidence."
      : "",
    includesAny(text, ["i think", "probably", "maybe", "heard"])
      ? "Separate personal knowledge from assumptions, belief, or second-hand information."
      : "",
  ]);
}

function buildUnsupportedAssertions(input: CivilNarrativeInput): string[] {
  return cleanList([
    ...(input.evidence?.strategicWeaknesses || []),
    ...(input.workflow?.narrativeProfile.unsupportedAssertions || []),
  ]);
}

function buildDefenceVulnerabilities(
  input: CivilNarrativeInput,
  types: CivilCaseType[],
): string[] {
  return cleanList([
    ...(input.workflow?.narrativeProfile.defenceVulnerabilities || []),
    types.includes("defamation")
      ? "Defence may argue truth, opinion, privilege, no publication, no identification, or no damages."
      : "",
    types.includes("negligence")
      ? "Defence may argue no duty, reasonable care, no causation, contributory fault, mitigation, or no damages."
      : "",
    types.includes("breach-of-contract")
      ? "Defence may argue no contract, different terms, performance, waiver, limitation, or failure to prove loss."
      : "",
    types.includes("charter") || types.includes("misfeasance")
      ? "Public-authority defendants may raise immunity, statutory authority, no causation, no available remedy, or threshold objections."
      : "",
  ]);
}

function buildJudgeConcerns(
  input: CivilNarrativeInput,
  unsupported: string[],
): string[] {
  return cleanList([
    ...(input.workflow?.narrativeProfile.judicialConcerns || []),
    ...(input.evidence?.judicialConcerns.map((concern) => concern.title) || []),
    unsupported.length > 0
      ? "The judge may be concerned about allegations that are not linked to evidence."
      : "",
    "The judge will look for clear facts, legal theory, causation, damages, remedy, and procedural fit.",
  ]);
}

function makeSection(params: CivilNarrativeSection): CivilNarrativeSection {
  return {
    ...params,
    draftPoints: cleanList(params.draftPoints),
    evidenceLinks: cleanList(params.evidenceLinks),
    risks: cleanList(params.risks),
    saferWording: cleanList(params.saferWording),
  };
}

function buildSections(args: {
  chronologyDraft: string[];
  liabilityDraft: string[];
  causationDraft: string[];
  damagesDraft: string[];
  remedyDraft: string[];
  unsupportedAssertions: string[];
  defenceVulnerabilities: string[];
}): CivilNarrativeSection[] {
  return [
    makeSection({
      id: createId("chronology"),
      title: "Chronology",
      purpose: "Organize the case in date order so the court can follow what happened.",
      draftPoints: args.chronologyDraft,
      evidenceLinks: ["Timeline events", "Dated communications", "Court or tribunal documents"],
      risks: [],
      saferWording: ["Use exact dates where possible. If dates are approximate, say so clearly."],
    }),
    makeSection({
      id: createId("liability"),
      title: "Liability Theory",
      purpose: "Explain what legal wrong is alleged and what elements must be proven.",
      draftPoints: args.liabilityDraft,
      evidenceLinks: ["Documents", "Witnesses", "Admissions", "Official records"],
      risks: args.defenceVulnerabilities,
      saferWording: ["Use facts first, then legal conclusions. Avoid broad accusations without particulars."],
    }),
    makeSection({
      id: createId("causation"),
      title: "Causation",
      purpose: "Connect the conduct to the harm or loss.",
      draftPoints: args.causationDraft,
      evidenceLinks: ["Before/after records", "Financial records", "Medical records", "Communications"],
      risks: ["Causation is weak if harm is only assumed from timing."],
      saferWording: ["Explain the chain of events and why the harm followed from the conduct."],
    }),
    makeSection({
      id: createId("damages"),
      title: "Damages and Impact",
      purpose: "Explain the loss, harm, amount claimed, and supporting proof.",
      draftPoints: args.damagesDraft,
      evidenceLinks: ["Receipts", "Invoices", "Bank records", "Screenshots", "Medical or employment records"],
      risks: args.unsupportedAssertions,
      saferWording: ["Separate calculated financial losses from general harm or distress."],
    }),
    makeSection({
      id: createId("remedy"),
      title: "Requested Remedy",
      purpose: "State what order, damages, declaration, injunction, costs, or other remedy is requested.",
      draftPoints: args.remedyDraft,
      evidenceLinks: ["Damages table", "Draft order terms", "Legal basis for remedy"],
      risks: [],
      saferWording: ["Ask for remedies clearly and proportionately."],
    }),
  ];
}

export function runCivilNarrativeEngine(
  input: CivilNarrativeInput,
): CivilNarrativeResult {
  const types = detectedTypes(input);

  const chronologyDraft = buildChronologyDraft(input);
  const liabilityDraft = buildLiabilityDraft(input, types);
  const causationDraft = buildCausationDraft(input);
  const damagesDraft = buildDamagesDraft(input);
  const remedyDraft = buildRemedyDraft(input);

  const toneWarnings = buildToneWarnings(input);
  const unsupportedAssertions = buildUnsupportedAssertions(input);
  const defenceVulnerabilities = buildDefenceVulnerabilities(input, types);
  const judgeFacingConcerns = buildJudgeConcerns(input, unsupportedAssertions);

  const sections = buildSections({
    chronologyDraft,
    liabilityDraft,
    causationDraft,
    damagesDraft,
    remedyDraft,
    unsupportedAssertions,
    defenceVulnerabilities,
  });

  const draftingNextSteps = cleanList([
    "Create a dated chronology.",
    "Separate each civil theory into its own proof pathway.",
    "Link each major allegation to evidence.",
    "Explain causation before damages.",
    "Prepare a damages table and remedy list.",
    unsupportedAssertions.length > 0
      ? "Resolve unsupported assertions before final drafting."
      : "",
  ]);

  const procedureProfile: CivilProcedureProfile | undefined =
    input.workflow?.procedureProfile;

  const evidenceProfile: CivilEvidenceProfile | undefined =
    input.workflow?.evidenceProfile || input.evidence?.evidenceProfile;

  const damagesProfile: CivilDamagesProfile | undefined =
    input.workflow?.damagesProfile;

  const strategicProfile: CivilStrategicProfile | undefined =
    input.workflow?.strategicProfile;

  const narrativeProfile: CivilNarrativeProfile = {
    coreTheoryNarrative:
      clean(input.summary) ||
      clean(input.facts?.join(" ")) ||
      "Civil narrative requires more facts before final drafting.",

    chronologySummary: chronologyDraft,
    liabilitySummary: liabilityDraft,
    causationSummary: causationDraft,
    damagesSummary: damagesDraft,

    judicialConcerns: judgeFacingConcerns,
    defenceVulnerabilities,

    toneWarnings,
    unsupportedAssertions,

    draftingFocusAreas: draftingNextSteps,
  };

  return {
    narrativeProfile,
    sections,
    chronologyDraft,
    liabilityDraft,
    causationDraft,
    damagesDraft,
    remedyDraft,
    toneWarnings,
    unsupportedAssertions,
    judgeFacingConcerns,
    defenceVulnerabilities,
    draftingNextSteps,
    summary: cleanList([
      "Civil narrative engine completed.",
      procedureProfile?.proceduralTrack
        ? `Procedural track: ${procedureProfile.proceduralTrack}.`
        : "",
      evidenceProfile?.missingEvidence?.length
        ? "Evidence gaps remain."
        : "",
      damagesProfile?.damagesProofMissing?.length
        ? "Damages proof gaps remain."
        : "",
      strategicProfile?.strongestTheories?.length
        ? `Strongest civil theories: ${strategicProfile.strongestTheories.join(", ")}.`
        : "",
    ]).join(" "),
  };
}