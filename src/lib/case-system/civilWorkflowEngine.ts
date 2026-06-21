import type {
  CaseFormNeed,
  CaseRisk,
  CaseTimelineEvent,
} from "./caseContextEngine";

import type { EvidenceItem } from "./evidenceEngine";

import type {
  CivilCaseType,
  CivilDamagesProfile,
  CivilEvidenceProfile,
  CivilLiabilityTheory,
  CivilNarrativeProfile,
  CivilProcedureProfile,
  CivilProceduralTrack,
  CivilRemedyType,
  CivilStrategicProfile,
} from "./types/civil-case";

export type CivilWorkflowInput = {
  caseId?: string;
  stage?: string;
  rawFacts?: string;
  summary?: string;
  selectedIssues?: string[];
  requestedRemedies?: string[];
  timeline?: CaseTimelineEvent[];
  evidenceItems?: EvidenceItem[];
  formNeeds?: CaseFormNeed[];
  risks?: CaseRisk[];
  liabilityTheories?: CivilLiabilityTheory[];
};

export type CivilWorkflowPriority =
  | "clarify-civil-path"
  | "limitation-review"
  | "forum-review"
  | "pleading-readiness"
  | "evidence-development"
  | "causation-proof"
  | "damages-proof"
  | "motion-readiness"
  | "discovery-readiness"
  | "mediation-settlement"
  | "trial-readiness"
  | "enforcement";

export type CivilWorkflowStep = {
  id: string;
  priority: CivilWorkflowPriority;
  title: string;
  explanation: string;
  userActions: string[];
  evidenceNeeded: string[];
  judgeFocus: string[];
  blockers: string[];
  warnings: string[];
  linkedCaseTypes: CivilCaseType[];
};

export type CivilWorkflowResult = {
  detectedCivilCaseTypes: CivilCaseType[];
  proceduralTrack: CivilProceduralTrack;
  primaryPriority: CivilWorkflowPriority;
  workflowSteps: CivilWorkflowStep[];

  procedureProfile: CivilProcedureProfile;
  evidenceProfile: CivilEvidenceProfile;
  damagesProfile: CivilDamagesProfile;
  narrativeProfile: CivilNarrativeProfile;
  strategicProfile: CivilStrategicProfile;

  requiredFormsNow: CaseFormNeed[];
  risks: CaseRisk[];
  nextBestActions: string[];
  blockersBeforeDrafting: string[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanStringList(
  items: Array<string | null | undefined | false>,
): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function uniqueCaseTypes(items: CivilCaseType[]): CivilCaseType[] {
  return Array.from(new Set(items));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function combinedText(input: CivilWorkflowInput): string {
  return normalize(
    [
      input.stage,
      input.rawFacts,
      input.summary,
      input.selectedIssues?.join(" "),
      input.requestedRemedies?.join(" "),
      input.liabilityTheories?.map((theory) => theory.title).join(" "),
      input.liabilityTheories?.map((theory) => theory.description).join(" "),
      input.evidenceItems
        ?.map((item) =>
          [
            item.title,
            item.description,
            item.relevance,
            item.relatedIssue,
            item.relatedLegalElement,
            item.category,
            item.content,
          ].join(" "),
        )
        .join(" "),
    ].join(" "),
  );
}

function makeRisk(
  title: string,
  description: string,
  source: CaseRisk["source"],
  suggestedFix: string,
  severity: CaseRisk["severity"] = "high",
): CaseRisk {
  return {
    id: createId("civil_risk"),
    title,
    description,
    severity,
    source,
    suggestedFix,
  };
}

function makeFormNeed(params: {
  title: string;
  reason: string;
  stage: CaseFormNeed["stage"];
}): CaseFormNeed {
  return {
    title: params.title,
    reason: params.reason,
    stage: params.stage,
    status: "needed-now",
    linkedIssueIds: [],
    linkedEvidenceIds: [],
  };
}

function makeStep(params: CivilWorkflowStep): CivilWorkflowStep {
  return {
    ...params,
    userActions: cleanStringList(params.userActions),
    evidenceNeeded: cleanStringList(params.evidenceNeeded),
    judgeFocus: cleanStringList(params.judgeFocus),
    blockers: cleanStringList(params.blockers),
    warnings: cleanStringList(params.warnings),
    linkedCaseTypes: uniqueCaseTypes(params.linkedCaseTypes),
  };
}

function detectCivilCaseTypes(input: CivilWorkflowInput): CivilCaseType[] {
  const text = combinedText(input);
  const types: CivilCaseType[] = [];

  if (includesAny(text, ["defamation", "slander", "libel", "false statement", "reputation"])) {
    types.push("defamation");
  }

  if (includesAny(text, ["contract", "agreement", "breach", "invoice", "deposit", "refund"])) {
    types.push("breach-of-contract");
  }

  if (includesAny(text, ["occupier", "slip", "fall", "premises", "unsafe property"])) {
    types.push("occupier-liability");
  }

  if (includesAny(text, ["personal injury", "injury", "medical injury", "physical harm"])) {
    types.push("personal-injury");
  }

  if (includesAny(text, ["property damage", "damaged property", "vehicle damage"])) {
    types.push("property-damage");
  }

  if (includesAny(text, ["professional negligence", "malpractice", "lawyer", "doctor", "accountant", "professional"])) {
    types.push("professional-negligence");
  }

  if (includesAny(text, ["negligence", "careless", "failed to", "unsafe", "duty of care", "harm caused"])) {
    types.push("negligence");
  }

  if (includesAny(text, ["charter", "section 7", "section 15", "constitutional", "state action"])) {
    types.push("charter");
  }

  if (includesAny(text, ["misfeasance", "public office", "abuse of authority", "reckless disregard"])) {
    types.push("misfeasance");
  }

  if (includesAny(text, ["human rights", "discrimination", "accommodation", "disability", "reprisal"])) {
    types.push("human-rights");
  }

  if (includesAny(text, ["privacy", "records", "personal information", "disclosure", "access request"])) {
    types.push("privacy");
  }

  if (includesAny(text, ["employment", "wrongful dismissal", "workplace", "employer"])) {
    types.push("employment");
  }

  if (includesAny(text, ["insurance", "insurer", "denied claim", "coverage"])) {
    types.push("insurance");
  }

  if (includesAny(text, ["debt", "loan", "owed", "unpaid money"])) {
    types.push("debt");
  }

  const unique = uniqueCaseTypes(types);

  if (unique.length > 1) {
    unique.push("mixed-civil");
  }

  return unique.length > 0 ? uniqueCaseTypes(unique) : ["unknown"];
}

function determineTrack(input: CivilWorkflowInput): CivilProceduralTrack {
  const text = combinedText(input);

  if (includesAny(text, ["enforcement", "collect judgment", "garnishment", "writ"])) return "enforcement";
  if (includesAny(text, ["appeal", "leave to appeal"])) return "appeal";
  if (includesAny(text, ["trial", "trial record", "trial management"])) return "trial";
  if (includesAny(text, ["pre-trial", "pretrial"])) return "pre-trial";
  if (includesAny(text, ["mediation", "settlement conference", "settlement meeting"])) return "mediation";
  if (includesAny(text, ["discovery", "affidavit of documents", "examination for discovery"])) return "discovery";
  if (includesAny(text, ["motion", "injunction", "urgent"])) return "motion";
  if (includesAny(text, ["defence", "statement of defence", "claim filed", "pleading", "statement of claim"])) return "pleadings";
  if (includesAny(text, ["start", "starting", "not filed", "nothing filed", "before filing"])) return "pre-filing";

  return "unknown";
}

function detectRemedies(input: CivilWorkflowInput): CivilRemedyType[] {
  const text = combinedText(input);
  const remedies: CivilRemedyType[] = [];

  if (includesAny(text, ["money", "damages", "compensation", "loss"])) remedies.push("damages");
  if (includesAny(text, ["general damages", "pain and suffering", "reputation"])) remedies.push("general-damages");
  if (includesAny(text, ["special damages", "receipts", "expenses", "out of pocket"])) remedies.push("special-damages");
  if (includesAny(text, ["aggravated"])) remedies.push("aggravated-damages");
  if (includesAny(text, ["punitive", "punishment", "malicious"])) remedies.push("punitive-damages");
  if (includesAny(text, ["injunction", "stop them", "restrain"])) remedies.push("injunction");
  if (includesAny(text, ["declaration", "declare"])) remedies.push("declaratory-relief");
  if (includesAny(text, ["specific performance"])) remedies.push("specific-performance");
  if (includesAny(text, ["charter damages"])) remedies.push("charter-damages");
  if (includesAny(text, ["costs"])) remedies.push("costs");

  return Array.from(new Set(remedies.length > 0 ? remedies : ["damages"]));
}

function hasTimeline(input: CivilWorkflowInput): boolean {
  return Boolean(input.timeline?.length) || includesAny(combinedText(input), ["timeline", "january", "february", "march", "202"]);
}

function evidenceCount(input: CivilWorkflowInput): number {
  return input.evidenceItems?.length || 0;
}

function buildProcedureProfile(
  input: CivilWorkflowInput,
  track: CivilProceduralTrack,
  types: CivilCaseType[],
): CivilProcedureProfile {
  const text = combinedText(input);

  return {
    proceduralTrack: track,

    limitationConcerns: cleanStringList([
      includesAny(text, ["limitation", "deadline", "late", "expired", "two years", "2 years"])
        ? "Limitation or deadline risk must be reviewed before drafting or filing."
        : "",
    ]),

    jurisdictionConcerns: cleanStringList([
      types.includes("human-rights")
        ? "Human Rights issues may require tribunal-pathway review before court pleading."
        : "",
      types.includes("charter") || types.includes("misfeasance")
        ? "Public-authority claims require careful forum, defendant, immunity, notice, and remedy review."
        : "",
      includesAny(text, ["tribunal", "board", "hrto", "ltb", "wsib"])
        ? "A tribunal or administrative decision path may affect the proper procedure."
        : "",
    ]),

    serviceConcerns: cleanStringList([
      includesAny(text, ["served", "service", "affidavit of service"])
        ? "Service history should be tracked with date, method, person served, and proof."
        : "",
      track === "pleadings"
        ? "Pleadings stage requires careful tracking of service and response deadlines."
        : "",
    ]),

    pleadingConcerns: cleanStringList([
      types.includes("defamation")
        ? "Defamation pleadings require exact words, publication, audience, date, identification, harm, and anticipated defences."
        : "",
      types.includes("negligence") || types.includes("professional-negligence")
        ? "Negligence pleadings require duty, breach, causation, and damages."
        : "",
      types.includes("charter") || types.includes("misfeasance")
        ? "Public-law civil pleadings must avoid vague blame and identify state action, process failure, causation, and remedy."
        : "",
      types.includes("breach-of-contract")
        ? "Contract pleadings require agreement terms, breach, loss, and calculation."
        : "",
    ]),

    disclosureConcerns: cleanStringList([
      includesAny(text, ["records", "disclosure", "documents, access request"])
        ? "Document disclosure and record requests should be organized separately from merits arguments."
        : "",
      track === "discovery"
        ? "Discovery requires issue-focused document organization and examination preparation."
        : "",
    ]),

    motionsExpected: cleanStringList([
      includesAny(text, ["injunction", "urgent", "interim", "temporary"])
        ? "Possible motion or injunction materials may be required."
        : "",
      includesAny(text, ["strike", "dismiss", "summary judgment"])
        ? "Possible dispositive motion risk should be assessed."
        : "",
    ]),

    proceduralDeadlines: cleanStringList([
      includesAny(text, ["deadline", "due", "served", "limitation", "appeal"])
        ? "Known deadlines should be entered as dated procedural events."
        : "",
    ]),

    readinessWarnings: cleanStringList([
      track === "unknown"
        ? "Civil procedural track is unclear. Do not generate final materials until the stage is confirmed."
        : "",
      types.includes("unknown")
        ? "Civil issue type is unclear. More facts are needed before drafting."
        : "",
    ]),
  };
}

function buildEvidenceProfile(input: CivilWorkflowInput): CivilEvidenceProfile {
  const text = combinedText(input);
  const items = input.evidenceItems || [];

  return {
    evidenceItems: items,

    keyEvidenceStrengths: cleanStringList([
      items.length > 0 ? `${items.length} evidence item(s) are already connected to the civil file.` : "",
      hasTimeline(input) ? "Timeline information appears to exist." : "",
      includesAny(text, ["screenshot", "email", "text message", "record", "contract"])
        ? "The intake references documentary or digital evidence."
        : "",
    ]),

    contradictionWarnings: cleanStringList([
      includesAny(text, ["contradiction", "inconsistent", "different story"])
        ? "Possible inconsistency should be explained before filing."
        : "",
    ]),

    credibilityConcerns: cleanStringList([
      includesAny(text, ["always", "never", "everyone knows", "obviously"])
        ? "Absolute wording may create credibility risk unless supported by examples."
        : "",
      includesAny(text, ["i think", "maybe", "probably", "heard"])
        ? "Uncertain or second-hand statements should be separated from personal knowledge."
        : "",
    ]),

    missingEvidence: cleanStringList([
      items.length === 0 ? "Civil evidence items should be uploaded or described." : "",
      !hasTimeline(input) ? "A dated chronology is needed." : "",
      includesAny(text, ["damages", "loss", "expenses"]) && !includesAny(text, ["receipt", "invoice", "bank", "pay"])
        ? "Damages proof such as receipts, invoices, bank records, or loss calculations may be needed."
        : "",
      includesAny(text, ["defamation", "false statement"]) && !includesAny(text, ["screenshot", "witness", "recipient", "publication"])
        ? "Defamation proof needs exact words, publication, audience, and screenshots or witnesses."
        : "",
    ]),

    authenticationConcerns: cleanStringList([
      includesAny(text, ["screenshot", "text", "email", "social media"])
        ? "Digital evidence should show sender, recipient, date, context, and completeness."
        : "",
    ]),

    expertEvidenceNeeded: cleanStringList([
      includesAny(text, ["medical", "psychological", "engineering", "professional negligence", "standard of care"])
        ? "Expert evidence may be needed for technical causation, injury, or standard-of-care issues."
        : "",
    ]),

    witnessConcerns: cleanStringList([
      includesAny(text, ["witness", "saw", "heard"])
        ? "Witnesses should be organized by what each person can actually prove."
        : "",
    ]),
  };
}

function buildDamagesProfile(input: CivilWorkflowInput): CivilDamagesProfile {
  const text = combinedText(input);

  return {
    remedyTypes: detectRemedies(input),

    financialLosses: cleanStringList([
      includesAny(text, ["lost income", "wage", "invoice", "expense", "repair", "refund", "debt"])
        ? "Financial losses should be calculated with documents."
        : "",
    ]),

    emotionalHarms: cleanStringList([
      includesAny(text, ["stress", "anxiety", "distress", "humiliation"])
        ? "Emotional harm should be tied to facts, duration, and supporting records where possible."
        : "",
    ]),

    reputationalHarms: cleanStringList([
      includesAny(text, ["reputation", "defamation", "slander", "libel"])
        ? "Reputational harm should identify who heard/read the statement and what impact followed."
        : "",
    ]),

    physicalHarms: cleanStringList([
      includesAny(text, ["injury", "pain", "medical", "treatment"])
        ? "Physical harm should be supported by medical or treatment records where available."
        : "",
    ]),

    aggravatedFactors: cleanStringList([
      includesAny(text, ["humiliation", "malicious", "targeted", "vulnerable"])
        ? "Aggravating facts may affect remedy framing if supported by evidence."
        : "",
    ]),

    punitiveFactors: cleanStringList([
      includesAny(text, ["punitive", "deliberate", "reckless", "abuse of authority"])
        ? "Punitive damages require careful restraint and strong facts."
        : "",
    ]),

    causationConcerns: cleanStringList([
      includesAny(text, ["caused", "because", "resulted"])
        ? ""
        : "Causation must be explained, not assumed.",
    ]),

    mitigationConcerns: cleanStringList([
      includesAny(text, ["mitigate", "looked for work", "tried to fix", "asked them to stop"])
        ? ""
        : "Mitigation steps should be described if damages are claimed.",
    ]),

    damagesProofMissing: cleanStringList([
      includesAny(text, ["damages", "loss", "amount", "$"]) && evidenceCount(input) === 0
        ? "Damages need documentary proof or a clear calculation."
        : "",
    ]),
  };
}

function buildNarrativeProfile(
  input: CivilWorkflowInput,
  types: CivilCaseType[],
  evidenceProfile: CivilEvidenceProfile,
  damagesProfile: CivilDamagesProfile,
): CivilNarrativeProfile {
  const text = clean(input.summary || input.rawFacts || "");

  return {
    coreTheoryNarrative:
      text ||
      "Civil theory is not ready. More facts are required before drafting a court-ready narrative.",

    chronologySummary: cleanStringList([
      hasTimeline(input)
        ? "Chronology exists and should be organized into dated events."
        : "Chronology needs dated events before drafting.",
    ]),

    liabilitySummary: cleanStringList([
      types.includes("defamation")
        ? "Defamation theory requires exact words, publication, identification, and harm/defence analysis."
        : "",
      types.includes("negligence")
        ? "Negligence theory requires duty, breach, causation, and damages."
        : "",
      types.includes("breach-of-contract")
        ? "Contract theory requires agreement, breach, loss, and proof of terms."
        : "",
      types.includes("charter")
        ? "Charter theory requires state action, rights impact, causation, and remedy."
        : "",
    ]),

    causationSummary: cleanStringList([
      ...damagesProfile.causationConcerns,
      "Each claimed loss should be linked to a specific act, omission, or decision.",
    ]),

    damagesSummary: cleanStringList([
      ...damagesProfile.financialLosses,
      ...damagesProfile.emotionalHarms,
      ...damagesProfile.reputationalHarms,
      ...damagesProfile.physicalHarms,
    ]),

    judicialConcerns: cleanStringList([
      "The court will look for clear facts, legal elements, evidence, causation, remedy, and procedural fit.",
      types.includes("mixed-civil")
        ? "Mixed civil claims should be separated by theory to avoid confusion."
        : "",
      ...evidenceProfile.credibilityConcerns,
    ]),

    defenceVulnerabilities: cleanStringList([
      types.includes("defamation")
        ? "Likely defences may include truth, fair comment/opinion, privilege, lack of publication, or lack of damages."
        : "",
      types.includes("breach-of-contract")
        ? "Likely defences may include no agreement, performance, waiver, limitation, or failure to prove loss."
        : "",
      types.includes("negligence")
        ? "Likely defences may include no duty, reasonable care, no causation, contributory negligence, or no proven damages."
        : "",
      types.includes("charter") || types.includes("misfeasance")
        ? "Public-authority defendants may raise immunity, causation, no private-law duty, statutory authority, or threshold arguments."
        : "",
    ]),

    toneWarnings: cleanStringList([
      includesAny(combinedText(input), ["evil", "corrupt", "always", "never", "obviously"])
        ? "Tone should be factual, precise, and evidence-linked."
        : "",
    ]),

    unsupportedAssertions: cleanStringList([
      evidenceCount(input) === 0 ? "Major allegations still need evidence support." : "",
      ...evidenceProfile.missingEvidence,
    ]),

    draftingFocusAreas: cleanStringList([
      "Separate facts from conclusions.",
      "Use dates, actors, documents, and consequences.",
      "Connect each remedy to causation and proof.",
      "Separate each civil theory into its own proof pathway.",
    ]),
  };
}

function buildStrategicProfile(
  input: CivilWorkflowInput,
  types: CivilCaseType[],
  procedureProfile: CivilProcedureProfile,
  narrativeProfile: CivilNarrativeProfile,
): CivilStrategicProfile {
  return {
    strongestTheories: cleanStringList(
      types.filter((type) => type !== "unknown" && type !== "mixed-civil"),
    ),

    likelyDefenceArguments: cleanStringList(narrativeProfile.defenceVulnerabilities),

    likelyJudgeConcerns: cleanStringList([
      ...narrativeProfile.judicialConcerns,
      ...procedureProfile.readinessWarnings,
      ...procedureProfile.jurisdictionConcerns,
    ]),

    settlementConsiderations: cleanStringList([
      "Settlement position should be based on evidence strength, damages proof, legal risk, and procedural cost.",
      types.includes("defamation")
        ? "Consider whether retraction, apology, removal, or correction matters in addition to money."
        : "",
      types.includes("breach-of-contract") || types.includes("debt")
        ? "Consider payment plan, partial repayment, return of property, or documented settlement terms."
        : "",
    ]),

    litigationRisks: cleanStringList([
      ...procedureProfile.limitationConcerns,
      ...procedureProfile.jurisdictionConcerns,
      ...narrativeProfile.unsupportedAssertions,
    ]),

    negotiationLeverage: cleanStringList([
      evidenceCount(input) > 0
        ? "Existing evidence can support settlement pressure if organized clearly."
        : "",
      hasTimeline(input)
        ? "A clear chronology can improve negotiation credibility."
        : "",
    ]),

    proceduralPressurePoints: cleanStringList([
      ...procedureProfile.proceduralDeadlines,
      ...procedureProfile.motionsExpected,
    ]),

    strategicNextSteps: cleanStringList([
      "Confirm civil theory and procedural path.",
      "Build proof map before drafting final pleadings.",
      "Organize evidence by issue, date, source, and legal element.",
      "Prepare damages calculation with supporting records.",
    ]),
  };
}

function buildRequiredForms(
  track: CivilProceduralTrack,
  types: CivilCaseType[],
): CaseFormNeed[] {
  const forms: CaseFormNeed[] = [];

  if (track === "pre-filing") {
    forms.push(
      makeFormNeed({
        title:
          types.includes("charter") || types.includes("human-rights")
            ? "Civil pleading or application pathway requires forum review before form selection"
            : "Statement of Claim / originating document pathway review",
        reason:
          "Civil starting documents depend on forum, cause of action, remedy, and procedural track.",
        stage: "starting-case",
      }),
    );
  }

  if (track === "motion") {
    forms.push(
      makeFormNeed({
        title: "Notice of Motion and supporting affidavit package",
        reason:
          "Motion materials may be required where interim or procedural relief is sought.",
        stage: "motion",
      }),
    );
  }

  if (track === "trial") {
    forms.push(
      makeFormNeed({
        title: "Trial preparation package",
        reason:
          "Trial readiness requires exhibit, witness, chronology, and proof-map preparation.",
        stage: "trial",
      }),
    );
  }

  if (track === "enforcement") {
    forms.push(
      makeFormNeed({
        title: "Civil enforcement pathway package",
        reason:
          "Enforcement requires an existing judgment/order and the correct enforcement route.",
        stage: "enforcement",
      }),
    );
  }

  return forms;
}

function buildRisks(
  procedureProfile: CivilProcedureProfile,
  evidenceProfile: CivilEvidenceProfile,
  damagesProfile: CivilDamagesProfile,
  narrativeProfile: CivilNarrativeProfile,
): CaseRisk[] {
  return [
    ...procedureProfile.limitationConcerns.map((item) =>
      makeRisk(
        "Limitation or deadline concern",
        item,
        "procedure",
        "Enter key dates and verify limitation/deadline before drafting.",
      ),
    ),
    ...procedureProfile.jurisdictionConcerns.map((item) =>
      makeRisk(
        "Forum or jurisdiction concern",
        item,
        "procedure",
        "Confirm correct court, tribunal, review path, parties, and remedy.",
      ),
    ),
    ...evidenceProfile.missingEvidence.map((item) =>
      makeRisk(
        "Missing evidence",
        item,
        "evidence",
        "Upload or describe the missing evidence and link it to an issue.",
      ),
    ),
    ...evidenceProfile.credibilityConcerns.map((item) =>
      makeRisk(
        "Credibility concern",
        item,
        "strategy",
        "Use precise factual wording and support allegations with evidence.",
        "medium",
      ),
    ),
    ...damagesProfile.damagesProofMissing.map((item) =>
      makeRisk(
        "Damages proof gap",
        item,
        "evidence",
        "Prepare a damages table and supporting records.",
      ),
    ),
    ...narrativeProfile.unsupportedAssertions.map((item) =>
      makeRisk(
        "Unsupported assertion",
        item,
        "strategy",
        "Connect the assertion to evidence or rewrite it more carefully.",
      ),
    ),
  ];
}

function priorityRank(priority: CivilWorkflowPriority): number {
  const order: CivilWorkflowPriority[] = [
    "clarify-civil-path",
    "limitation-review",
    "forum-review",
    "pleading-readiness",
    "motion-readiness",
    "evidence-development",
    "causation-proof",
    "damages-proof",
    "discovery-readiness",
    "mediation-settlement",
    "trial-readiness",
    "enforcement",
  ];

  const index = order.indexOf(priority);
  return index === -1 ? 999 : index;
}

function buildWorkflowSteps(
  input: CivilWorkflowInput,
  types: CivilCaseType[],
  track: CivilProceduralTrack,
  procedureProfile: CivilProcedureProfile,
  evidenceProfile: CivilEvidenceProfile,
  damagesProfile: CivilDamagesProfile,
): CivilWorkflowStep[] {
  const steps: CivilWorkflowStep[] = [];

  if (types.includes("unknown") || track === "unknown") {
    steps.push(
      makeStep({
        id: "clarify-civil-path",
        priority: "clarify-civil-path",
        title: "Clarify the civil legal path",
        explanation:
          "The system needs enough facts to distinguish negligence, contract, defamation, Charter, Human Rights, privacy, employment, debt, property, or mixed civil claims.",
        userActions: [
          "State who did what, when it happened, what harm resulted, and what remedy is requested.",
          "Identify whether anything has already been filed or served.",
        ],
        evidenceNeeded: [
          "Core facts",
          "Key dates",
          "Existing court or tribunal documents",
        ],
        judgeFocus: [
          "What legal path is this?",
          "What remedy is being requested?",
          "Is the forum correct?",
        ],
        blockers: ["Civil path is not clear enough for final drafting."],
        warnings: [
          "Do not generate final pleadings until the civil theory and procedural track are clearer.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  steps.push(
    makeStep({
      id: "evidence-development",
      priority: "evidence-development",
      title: "Develop evidence and proof links",
      explanation:
        "Civil cases require proof. Every allegation should connect to a document, witness, timeline event, admission, record, or explanation.",
      userActions: [
        "Upload or describe evidence.",
        "Connect each evidence item to a legal issue and date.",
        "Separate strong evidence from weak or missing evidence.",
      ],
      evidenceNeeded: evidenceProfile.missingEvidence,
      judgeFocus: [
        "What proves each allegation?",
        "Is the evidence reliable?",
        "Is the evidence connected to the remedy?",
      ],
      blockers: evidenceProfile.missingEvidence,
      warnings: [
        ...evidenceProfile.authenticationConcerns,
        ...evidenceProfile.credibilityConcerns,
      ],
      linkedCaseTypes: types,
    }),
  );

  steps.push(
    makeStep({
      id: "causation-proof",
      priority: "causation-proof",
      title: "Build causation proof",
      explanation:
        "The system must connect conduct to harm. Civil drafting should not assume causation just because harm occurred after conduct.",
      userActions: [
        "Explain how the act, omission, statement, breach, or decision caused the loss.",
        "Separate timing from proof of causation.",
      ],
      evidenceNeeded: [
        "Chronology",
        "Before/after records",
        "Communications",
        "Financial records",
        "Medical or expert records if needed",
      ],
      judgeFocus: [
        "What caused the harm?",
        "Could something else explain the loss?",
        "Is expert evidence needed?",
      ],
      blockers: damagesProfile.causationConcerns,
      warnings: ["Causation should be explained issue by issue."],
      linkedCaseTypes: types,
    }),
  );

  steps.push(
    makeStep({
      id: "damages-proof",
      priority: "damages-proof",
      title: "Build damages and remedy proof",
      explanation:
        "Civil remedies must be legally available, proportional, and connected to evidence.",
      userActions: [
        "Prepare a damages table.",
        "Attach receipts, invoices, records, screenshots, or explanation.",
        "Separate money loss from non-money remedies.",
      ],
      evidenceNeeded: damagesProfile.damagesProofMissing,
      judgeFocus: [
        "How was the amount calculated?",
        "What evidence proves the loss?",
        "Is the remedy legally available?",
      ],
      blockers: damagesProfile.damagesProofMissing,
      warnings: [
        ...damagesProfile.mitigationConcerns,
        ...damagesProfile.causationConcerns,
      ],
      linkedCaseTypes: types,
    }),
  );

  if (procedureProfile.limitationConcerns.length > 0) {
    steps.push(
      makeStep({
        id: "limitation-review",
        priority: "limitation-review",
        title: "Review limitation or deadline risk",
        explanation:
          "Civil cases can fail if deadlines are missed. Limitation, appeal, review, motion, or service deadlines must be checked before drafting final materials.",
        userActions: [
          "Enter key dates.",
          "Identify when the harm, decision, publication, breach, or discovery happened.",
        ],
        evidenceNeeded: [
          "Date of incident",
          "Date discovered",
          "Decision letters",
          "Service records",
        ],
        judgeFocus: [
          "Is the claim late?",
          "When did the limitation clock start?",
          "Was there discoverability?",
        ],
        blockers: procedureProfile.limitationConcerns,
        warnings: [
          "Deadline issues should be addressed before final filing decisions.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  if (procedureProfile.jurisdictionConcerns.length > 0) {
    steps.push(
      makeStep({
        id: "forum-review",
        priority: "forum-review",
        title: "Confirm court, tribunal, review, or mixed forum",
        explanation:
          "Civil disputes may belong in court, tribunal, judicial review, appeal, or a mixed pathway. Forum mistakes can create serious procedural risk.",
        userActions: [
          "Identify the decision-maker, institution, tribunal, or court involved.",
          "Upload any decision letters or existing materials.",
        ],
        evidenceNeeded: [
          "Decision letters",
          "Tribunal documents",
          "Government correspondence",
          "Court documents",
        ],
        judgeFocus: [
          "Is this the right forum?",
          "Is the remedy available here?",
          "Is the correct defendant or respondent named?",
        ],
        blockers: procedureProfile.jurisdictionConcerns,
        warnings: ["Forum choice should be verified before form generation."],
        linkedCaseTypes: types,
      }),
    );
  }

  if (track === "pre-filing" || track === "pleadings") {
    steps.push(
      makeStep({
        id: "pleading-readiness",
        priority: "pleading-readiness",
        title: "Prepare pleading readiness",
        explanation:
          "Before a Statement of Claim, Notice of Application, or response is prepared, the system should confirm parties, facts, issues, remedies, limitation, jurisdiction, and evidence.",
        userActions: [
          "Confirm parties and legal names.",
          "Confirm remedy requested.",
          "Organize allegations by legal theory.",
        ],
        evidenceNeeded: [
          "Party details",
          "Address/service details",
          "Facts",
          "Timeline",
          "Documents",
        ],
        judgeFocus: [
          "Does the pleading disclose a viable claim?",
          "Are facts specific?",
          "Are remedies clear?",
        ],
        blockers: procedureProfile.pleadingConcerns,
        warnings: ["Do not plead broad conclusions without material facts."],
        linkedCaseTypes: types,
      }),
    );
  }

  if (track === "motion" || procedureProfile.motionsExpected.length > 0) {
    steps.push(
      makeStep({
        id: "motion-readiness",
        priority: "motion-readiness",
        title: "Assess motion readiness",
        explanation:
          "Motion materials require a specific order, procedural basis, affidavit evidence, urgency if applicable, and draft terms.",
        userActions: [
          "State the exact order requested.",
          "Prepare affidavit facts by date.",
          "Upload procedural history and exhibits.",
        ],
        evidenceNeeded: [
          "Affidavit facts",
          "Exhibits",
          "Existing pleadings/orders",
          "Urgency evidence if any",
        ],
        judgeFocus: [
          "What order is requested?",
          "What rule or authority supports it?",
          "What evidence supports it?",
        ],
        blockers: procedureProfile.motionsExpected,
        warnings: [
          "Motion evidence should be concise, dated, and exhibit-linked.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  if (track === "discovery") {
    steps.push(
      makeStep({
        id: "discovery-readiness",
        priority: "discovery-readiness",
        title: "Prepare discovery and disclosure",
        explanation:
          "Discovery requires issue-focused document organization and careful separation of relevant records, privileged records, and missing disclosure.",
        userActions: [
          "Organize documents by issue.",
          "List missing disclosure.",
          "Prepare examination topics.",
        ],
        evidenceNeeded: [
          "Document list",
          "Disclosure gaps",
          "Chronology",
          "Questions by issue",
        ],
        judgeFocus: [
          "What is relevant?",
          "What remains undisclosed?",
          "Is production proportional?",
        ],
        blockers: procedureProfile.disclosureConcerns,
        warnings: [
          "Do not mix irrelevant material into disclosure packages.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  if (track === "mediation" || track === "pre-trial") {
    steps.push(
      makeStep({
        id: "mediation-settlement",
        priority: "mediation-settlement",
        title: "Prepare settlement or pre-trial position",
        explanation:
          "Settlement materials should summarize strengths, weaknesses, proof, damages, likely defences, and realistic outcomes.",
        userActions: [
          "Prepare damages position.",
          "Summarize best evidence.",
          "List risks and settlement options.",
        ],
        evidenceNeeded: [
          "Damages table",
          "Key documents",
          "Offers",
          "Proof gaps",
        ],
        judgeFocus: [
          "What can realistically settle?",
          "What evidence supports each side?",
          "What issues remain for trial?",
        ],
        blockers: [],
        warnings: [
          "Settlement position should be realistic and evidence-based.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  if (track === "trial") {
    steps.push(
      makeStep({
        id: "trial-readiness",
        priority: "trial-readiness",
        title: "Assess trial readiness",
        explanation:
          "Trial readiness requires issues, proof map, witnesses, exhibit order, chronology, legal theory, defences, and remedy calculations.",
        userActions: [
          "Build issue-by-issue proof chart.",
          "Prepare witness list.",
          "Organize exhibit order and chronology.",
        ],
        evidenceNeeded: [
          "Final evidence list",
          "Witness list",
          "Chronology",
          "Damages calculation",
          "Opening theory",
        ],
        judgeFocus: [
          "What facts are disputed?",
          "What evidence proves each element?",
          "What remedy follows?",
        ],
        blockers: [
          "Trial materials should not be generated until proof map and evidence organization are complete.",
        ],
        warnings: [
          "Trial prep must be issue-driven, not a document dump.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  if (track === "enforcement") {
    steps.push(
      makeStep({
        id: "enforcement",
        priority: "enforcement",
        title: "Prepare enforcement pathway",
        explanation:
          "Enforcement is different from proving the original claim. It requires an enforceable order or judgment and proof of non-payment or non-compliance.",
        userActions: [
          "Upload judgment/order.",
          "Calculate unpaid amount.",
          "Identify enforcement route.",
        ],
        evidenceNeeded: [
          "Judgment/order",
          "Payment history",
          "Debtor information",
          "Compliance records",
        ],
        judgeFocus: [
          "What order exists?",
          "What remains unpaid or breached?",
          "What enforcement step is available?",
        ],
        blockers: ["Existing judgment/order must be confirmed."],
        warnings: [
          "Do not reargue the original merits during enforcement unless required.",
        ],
        linkedCaseTypes: types,
      }),
    );
  }

  return steps.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

export function runCivilWorkflowEngine(
  input: CivilWorkflowInput,
): CivilWorkflowResult {
  const detectedCivilCaseTypes = detectCivilCaseTypes(input);
  const proceduralTrack = determineTrack(input);

  const procedureProfile = buildProcedureProfile(
    input,
    proceduralTrack,
    detectedCivilCaseTypes,
  );

  const evidenceProfile = buildEvidenceProfile(input);
  const damagesProfile = buildDamagesProfile(input);

  const narrativeProfile = buildNarrativeProfile(
    input,
    detectedCivilCaseTypes,
    evidenceProfile,
    damagesProfile,
  );

  const strategicProfile = buildStrategicProfile(
    input,
    detectedCivilCaseTypes,
    procedureProfile,
    narrativeProfile,
  );

  const workflowSteps = buildWorkflowSteps(
    input,
    detectedCivilCaseTypes,
    proceduralTrack,
    procedureProfile,
    evidenceProfile,
    damagesProfile,
  );

  const primaryPriority =
    workflowSteps[0]?.priority ||
    (proceduralTrack === "unknown"
      ? "clarify-civil-path"
      : "evidence-development");

  const requiredFormsNow = buildRequiredForms(
    proceduralTrack,
    detectedCivilCaseTypes,
  );

  const generatedRisks = buildRisks(
    procedureProfile,
    evidenceProfile,
    damagesProfile,
    narrativeProfile,
  );

  const risks = [...(input.risks || []), ...generatedRisks];

  const nextBestActions = cleanStringList([
    ...workflowSteps.flatMap((step) => step.userActions),
    ...strategicProfile.strategicNextSteps,
  ]);

  const blockersBeforeDrafting = cleanStringList([
    ...workflowSteps.flatMap((step) => step.blockers),
    ...procedureProfile.readinessWarnings,
    ...evidenceProfile.missingEvidence,
    ...damagesProfile.damagesProofMissing,
    ...narrativeProfile.unsupportedAssertions,
  ]);

  const summary = cleanStringList([
    `Civil workflow priority: ${primaryPriority}.`,
    `Procedural track: ${proceduralTrack}.`,
    `Detected civil case type(s): ${detectedCivilCaseTypes.join(", ")}.`,
    blockersBeforeDrafting.length > 0
      ? "Civil drafting still has blockers that should be resolved before final documents."
      : "Civil workflow is ready for the next structured litigation step.",
  ]).join(" ");

  return {
    detectedCivilCaseTypes,
    proceduralTrack,
    primaryPriority,
    workflowSteps,
    procedureProfile,
    evidenceProfile,
    damagesProfile,
    narrativeProfile,
    strategicProfile,
    requiredFormsNow,
    risks,
    nextBestActions,
    blockersBeforeDrafting,
    summary,
  };
}