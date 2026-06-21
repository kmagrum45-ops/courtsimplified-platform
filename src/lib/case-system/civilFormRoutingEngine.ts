import type { CaseFormNeed } from "./caseContextEngine";

import type {
  CivilCaseType,
  CivilProceduralTrack,
} from "./types/civil-case";

import type { CivilWorkflowResult } from "./civilWorkflowEngine";

export type CivilFormPriority =
  | "required-now"
  | "recommended-now"
  | "later"
  | "blocked"
  | "not-needed-now";

export type CivilFormReason =
  | "start-claim"
  | "responding"
  | "motion"
  | "injunction"
  | "discovery"
  | "mediation"
  | "pre-trial"
  | "trial"
  | "appeal"
  | "enforcement"
  | "service-proof"
  | "forum-review"
  | "human-rights-tribunal"
  | "judicial-review"
  | "clarification-needed";

export type CivilFormRecommendation = {
  id: string;
  title: string;
  formNumber?: string;
  priority: CivilFormPriority;
  reason: CivilFormReason;
  why: string;
  neededWhen: string;
  dependsOn: string[];
  blockers: string[];
  evidenceNeeded: string[];
  notNeededBecause: string[];
};

export type CivilFormRoutingInput = {
  workflow: CivilWorkflowResult;
  existingFormNeeds?: CaseFormNeed[];
  existingDocuments?: string[];
};

export type CivilFormRoutingResult = {
  requiredNow: CivilFormRecommendation[];
  recommendedNow: CivilFormRecommendation[];
  later: CivilFormRecommendation[];
  blocked: CivilFormRecommendation[];
  notNeededNow: CivilFormRecommendation[];
  all: CivilFormRecommendation[];
  formNeedsForMasterCase: CaseFormNeed[];
  blockersBeforeGeneration: string[];
  routingWarnings: string[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function createId(prefix: string, title: string): string {
  return `${prefix}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function makeForm(
  form: Omit<CivilFormRecommendation, "id">,
): CivilFormRecommendation {
  return {
    ...form,
    id: createId("civil_form", form.title),
    dependsOn: cleanList(form.dependsOn),
    blockers: cleanList(form.blockers),
    evidenceNeeded: cleanList(form.evidenceNeeded),
    notNeededBecause: cleanList(form.notNeededBecause),
  };
}

function hasType(types: CivilCaseType[], type: CivilCaseType): boolean {
  return types.includes(type);
}

function toCaseStage(track: CivilProceduralTrack): CaseFormNeed["stage"] {
  if (track === "pre-filing") return "starting-case";
  if (track === "pleadings") return "already-started";
  if (track === "motion") return "motion";
  if (track === "trial") return "trial";
  if (track === "enforcement") return "enforcement";
  if (track === "urgent") return "urgent";
  return "general";
}

function toCaseFormNeed(
  form: CivilFormRecommendation,
  track: CivilProceduralTrack,
): CaseFormNeed {
  return {
    formNumber: form.formNumber,
    title: form.title,
    reason: form.why,
    stage: toCaseStage(track),
    status:
      form.priority === "required-now" || form.priority === "recommended-now"
        ? "needed-now"
        : form.priority === "later"
          ? "not-needed-yet"
          : "unknown",
    linkedIssueIds: [],
    linkedEvidenceIds: [],
  };
}

function dedupeForms(forms: CivilFormRecommendation[]): CivilFormRecommendation[] {
  const priorityRank: Record<CivilFormPriority, number> = {
    "required-now": 1,
    "recommended-now": 2,
    later: 3,
    blocked: 4,
    "not-needed-now": 5,
  };

  const map = new Map<string, CivilFormRecommendation>();

  for (const form of forms) {
    const key = `${form.formNumber || ""}|${form.title}`;
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
      why: cleanList([base.why, other.why]).join(" "),
      dependsOn: cleanList([...base.dependsOn, ...other.dependsOn]),
      blockers: cleanList([...base.blockers, ...other.blockers]),
      evidenceNeeded: cleanList([...base.evidenceNeeded, ...other.evidenceNeeded]),
      notNeededBecause: cleanList([
        ...base.notNeededBecause,
        ...other.notNeededBecause,
      ]),
    });
  }

  return Array.from(map.values());
}

export function runCivilFormRoutingEngine(
  input: CivilFormRoutingInput,
): CivilFormRoutingResult {
  const { workflow } = input;
  const forms: CivilFormRecommendation[] = [];

  const track = workflow.proceduralTrack;
  const types = workflow.detectedCivilCaseTypes;

  const forumBlockers = cleanList([
    ...workflow.procedureProfile.jurisdictionConcerns,
    ...workflow.procedureProfile.readinessWarnings,
  ]);

  if (track === "unknown" || hasType(types, "unknown")) {
    forms.push(
      makeForm({
        title: "Clarify civil path before selecting court forms",
        priority: "blocked",
        reason: "clarification-needed",
        why: "The civil issue or procedural stage is not clear enough to safely route forms.",
        neededWhen:
          "Use internally when more information is required before form generation.",
        dependsOn: ["Civil theory", "Procedural stage", "Forum", "Requested remedy"],
        blockers: ["Civil path is unclear."],
        evidenceNeeded: ["Facts", "Timeline", "Existing documents", "Requested remedy"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "pre-filing") {
    forms.push(
      makeForm({
        title: "Statement of Claim / originating process review",
        formNumber: "14A or applicable originating document",
        priority: forumBlockers.length > 0 ? "blocked" : "required-now",
        reason: "start-claim",
        why: "A civil case normally requires the correct originating document, but the exact form depends on forum, claim type, remedy, and procedure.",
        neededWhen: "Use when starting a new civil court claim or application.",
        dependsOn: [
          "Correct forum",
          "Legal names of parties",
          "Material facts",
          "Cause of action",
          "Requested remedy",
          "Limitation review",
        ],
        blockers: forumBlockers,
        evidenceNeeded: [
          "Facts",
          "Timeline",
          "Damages calculation",
          "Key documents",
          "Service address",
        ],
        notNeededBecause: [],
      }),
    );
  } else {
    forms.push(
      makeForm({
        title: "New originating claim document",
        priority: "not-needed-now",
        reason: "start-claim",
        why: "The file does not appear to be at a fresh pre-filing stage.",
        neededWhen: "Use when starting a new civil proceeding.",
        dependsOn: [],
        blockers: [],
        evidenceNeeded: [],
        notNeededBecause: ["The detected procedural track is not pre-filing."],
      }),
    );
  }

  if (track === "pleadings") {
    forms.push(
      makeForm({
        title: "Pleadings response/review package",
        priority: "required-now",
        reason: "responding",
        why: "At the pleadings stage, the system should review the claim, defence, reply, service dates, response deadlines, and any pleading defects.",
        neededWhen: "Use after a claim, defence, application, or response has been filed or served.",
        dependsOn: ["Existing pleadings", "Service date", "Response deadline"],
        blockers: workflow.procedureProfile.serviceConcerns,
        evidenceNeeded: ["Statement of Claim", "Defence", "Service records", "Court endorsements"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "motion") {
    forms.push(
      makeForm({
        title: "Notice of Motion and supporting affidavit package",
        priority: "required-now",
        reason: workflow.procedureProfile.motionsExpected.some((item) =>
          item.toLowerCase().includes("injunction"),
        )
          ? "injunction"
          : "motion",
        why: "Motion materials require a specific order requested, legal basis, affidavit evidence, exhibits, and procedural history.",
        neededWhen: "Use when asking the court for interim, urgent, procedural, or dispositive relief.",
        dependsOn: ["Exact order requested", "Evidence", "Procedural history"],
        blockers: workflow.procedureProfile.motionsExpected,
        evidenceNeeded: ["Affidavit facts", "Exhibits", "Draft order terms"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "discovery") {
    forms.push(
      makeForm({
        title: "Discovery and document-disclosure preparation package",
        priority: "required-now",
        reason: "discovery",
        why: "Discovery requires organized documents, missing disclosure lists, issue-based questions, and privilege/proportionality review.",
        neededWhen: "Use during discovery, document production, affidavit of documents, or examination preparation.",
        dependsOn: ["Pleadings", "Issues", "Documents", "Disclosure gaps"],
        blockers: workflow.procedureProfile.disclosureConcerns,
        evidenceNeeded: ["Document list", "Issue chart", "Missing disclosure list"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "mediation") {
    forms.push(
      makeForm({
        title: "Mediation / settlement position package",
        priority: "recommended-now",
        reason: "mediation",
        why: "Mediation materials should summarize liability, causation, damages, strengths, weaknesses, and settlement options.",
        neededWhen: "Use before mediation or serious settlement discussions.",
        dependsOn: ["Damages table", "Key evidence", "Risk review"],
        blockers: [],
        evidenceNeeded: ["Settlement offers", "Damages proof", "Best evidence"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "pre-trial") {
    forms.push(
      makeForm({
        title: "Pre-trial conference preparation package",
        priority: "required-now",
        reason: "pre-trial",
        why: "Pre-trial preparation requires issue narrowing, settlement position, evidence summary, procedural history, and trial readiness assessment.",
        neededWhen: "Use when preparing for pre-trial or trial management steps.",
        dependsOn: ["Pleadings", "Discovery status", "Settlement position"],
        blockers: workflow.blockersBeforeDrafting,
        evidenceNeeded: ["Issues list", "Evidence summary", "Damages calculation"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "trial") {
    forms.push(
      makeForm({
        title: "Trial record / trial preparation package",
        priority: "required-now",
        reason: "trial",
        why: "Trial materials require issue-by-issue proof mapping, witnesses, exhibits, chronology, damages proof, and legal theory.",
        neededWhen: "Use when preparing for trial.",
        dependsOn: ["Final issues", "Witness list", "Exhibit list", "Proof map"],
        blockers: ["Trial package should not be generated until proof map and evidence organization are complete."],
        evidenceNeeded: ["Witness list", "Exhibit order", "Chronology", "Damages table"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "appeal") {
    forms.push(
      makeForm({
        title: "Appeal / leave pathway review",
        priority: "blocked",
        reason: "appeal",
        why: "Appeals require strict deadline, order, reasons, record, standard of review, and appellate route analysis.",
        neededWhen: "Use when challenging an order, judgment, tribunal decision, or administrative decision.",
        dependsOn: ["Order/judgment", "Reasons", "Date issued", "Appeal route"],
        blockers: ["Appeal deadlines and route must be confirmed before document generation."],
        evidenceNeeded: ["Order", "Reasons", "Decision date", "Record materials"],
        notNeededBecause: [],
      }),
    );
  }

  if (track === "enforcement") {
    forms.push(
      makeForm({
        title: "Civil enforcement pathway package",
        priority: "required-now",
        reason: "enforcement",
        why: "Enforcement requires an existing enforceable order or judgment, debtor information, unpaid amount, and correct enforcement route.",
        neededWhen: "Use after judgment or order where collection/compliance is required.",
        dependsOn: ["Judgment/order", "Amount unpaid", "Debtor information"],
        blockers: ["Existing judgment or order must be confirmed."],
        evidenceNeeded: ["Judgment/order", "Payment history", "Debtor information"],
        notNeededBecause: [],
      }),
    );
  }

  if (hasType(types, "human-rights")) {
    forms.push(
      makeForm({
        title: "Human Rights forum and remedy review",
        priority: "blocked",
        reason: "human-rights-tribunal",
        why: "Human Rights issues may belong in a tribunal, court, judicial review, employment process, housing process, or mixed route depending on the facts and remedy.",
        neededWhen: "Use whenever discrimination, accommodation, reprisal, or protected-ground issues are detected.",
        dependsOn: ["Protected ground", "Adverse treatment", "Forum", "Remedy"],
        blockers: ["Human Rights forum must be reviewed before final civil form routing."],
        evidenceNeeded: ["Accommodation requests", "Refusals", "Policies", "Comparators", "Impact evidence"],
        notNeededBecause: [],
      }),
    );
  }

  if (hasType(types, "charter") || hasType(types, "misfeasance")) {
    forms.push(
      makeForm({
        title: "Public authority / Charter pleading pathway review",
        priority: "blocked",
        reason: "judicial-review",
        why: "Public authority claims require careful review of forum, defendant/respondent, immunity, notice, limitation, cause of action, Charter remedy, and judicial review risk.",
        neededWhen: "Use when government, police, Crown, ministry, tribunal, school board, hospital, municipality, or public authority conduct is involved.",
        dependsOn: ["State actor", "Decision/conduct", "Right or duty affected", "Remedy", "Forum"],
        blockers: ["Public authority route must be verified before final form selection."],
        evidenceNeeded: ["Decision records", "Correspondence", "Policies", "Court/tribunal records", "Timeline"],
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
    ...workflow.blockersBeforeDrafting,
  ]);

  const routingWarnings = cleanList([
    ...workflow.procedureProfile.limitationConcerns,
    ...workflow.procedureProfile.jurisdictionConcerns,
    ...workflow.procedureProfile.pleadingConcerns,
    ...workflow.narrativeProfile.unsupportedAssertions,
  ]);

  const formNeedsForMasterCase = cleanList([
    ...requiredNow,
    ...recommendedNow,
    ...later,
  ] as never).map((form) =>
    toCaseFormNeed(form as unknown as CivilFormRecommendation, workflow.proceduralTrack),
  );

  const summary = cleanList([
    requiredNow.length > 0
      ? `${requiredNow.length} civil procedural document/package item(s) are required now.`
      : "No civil court document should be generated until blockers are resolved or stage is clearer.",
    blocked.length > 0
      ? `${blocked.length} item(s) are blocked pending forum, stage, evidence, or procedural clarification.`
      : "No major civil form-routing blockers detected.",
  ]).join(" ");

  return {
    requiredNow,
    recommendedNow,
    later,
    blocked,
    notNeededNow,
    all,
    formNeedsForMasterCase,
    blockersBeforeGeneration,
    routingWarnings,
    summary,
  };
}