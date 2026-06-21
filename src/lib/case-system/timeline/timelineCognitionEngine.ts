import {
  CaseConfidence,
  CaseEvidenceType,
  CaseLegalDomain,
  CaseSeverity,
} from "../architecture/masterCaseSchema";

import {
  LitigationTimelineEvent,
  LitigationTimelineModel,
  TimelineBuildInput,
  TimelineBuildOutput,
  TimelineCausationChain,
  TimelineDateValue,
  TimelineEventKind,
  TimelineEvidenceLink,
  TimelineProceduralSequence,
  TimelineReadinessState,
  TimelineValidationIssue,
} from "./timelineEventArchitecture";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function confidenceRank(value: CaseConfidence): number {
  const ranks: Record<CaseConfidence, number> = {
    "very-low": 1,
    low: 2,
    medium: 3,
    high: 4,
    "very-high": 5,
  };

  return ranks[value] || 1;
}

function confidenceFromRank(rank: number): CaseConfidence {
  if (rank >= 4.5) return "very-high";
  if (rank >= 3.5) return "high";
  if (rank >= 2.5) return "medium";
  if (rank >= 1.5) return "low";
  return "very-low";
}

function hasText(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function inferEventKind(description: string): TimelineEventKind {
  if (hasText(description, ["served", "service"])) return "service-event";
  if (hasText(description, ["filed", "claim", "application", "defence", "defense"])) {
    return "filing-event";
  }
  if (hasText(description, ["deadline", "due", "limitation"])) return "deadline-event";
  if (hasText(description, ["conference", "settlement conference", "case conference"])) {
    return "conference-event";
  }
  if (hasText(description, ["motion", "urgent motion", "affidavit"])) return "motion-event";
  if (hasText(description, ["trial", "hearing"])) return "hearing-event";
  if (hasText(description, ["order", "judgment", "decision"])) return "order-event";
  if (hasText(description, ["paid", "payment", "invoice", "owed"])) return "payment-event";
  if (hasText(description, ["settlement", "offer to settle"])) return "settlement-event";
  if (hasText(description, ["appeal"])) return "appeal-event";
  if (hasText(description, ["enforce", "garnish", "writ"])) return "enforcement-event";
  if (hasText(description, ["message", "email", "text", "posted", "told"])) return "communication";
  if (hasText(description, ["harm", "injury", "damage", "loss", "reputation"])) return "harm-event";

  return "factual-event";
}

function buildDateValue(args: {
  raw?: string;
  normalized?: string;
}): TimelineDateValue {
  if (args.normalized) {
    return {
      rawText: args.raw,
      normalizedDate: args.normalized,
      certainty: "exact",
      confidence: "high",
    };
  }

  if (args.raw) {
    return {
      rawText: args.raw,
      certainty: "approximate",
      confidence: "medium",
    };
  }

  return {
    certainty: "unknown",
    confidence: "very-low",
  };
}

function inferEvidenceTypeFromId(_: string): CaseEvidenceType | undefined {
  return undefined;
}

function buildEvidenceLinks(candidate: TimelineBuildInput["eventCandidates"][number]): TimelineEvidenceLink[] {
  return (candidate.evidenceIds || []).map((evidenceId) => ({
    evidenceId,
    evidenceType: inferEvidenceTypeFromId(evidenceId),
    linkReason: "Evidence was referenced by this event candidate.",
    provesOrSupports: ["Event occurrence", "Context"],
    concerns: [],
    confidence: "medium",
  }));
}

function buildClaimLinks(candidate: TimelineBuildInput["eventCandidates"][number]) {
  return (candidate.legalDomains || []).map((domain) => ({
    legalDomain: domain,
    elementOrIssue: "General factual support",
    linkReason: "Event was connected to this legal domain by the upstream intelligence layer.",
    confidence: "medium" as CaseConfidence,
  }));
}

function buildValidationIssues(event: LitigationTimelineEvent): TimelineValidationIssue[] {
  const issues: TimelineValidationIssue[] = [];

  if (event.date.certainty === "unknown") {
    issues.push({
      id: createId("timeline_issue"),
      issueType: "missing-date",
      severity: "medium",
      title: "Event date is missing",
      explanation:
        "This event does not have a clear date. Missing dates weaken chronology, limitation analysis, procedural timing, and causation sequencing.",
      suggestedFix:
        "Add the date or best approximate date for this event.",
      affectedEventIds: [event.id],
    });
  }

  if (event.evidenceLinks.length === 0) {
    issues.push({
      id: createId("timeline_issue"),
      issueType: "missing-evidence-link",
      severity: "low",
      title: "Event is not linked to evidence",
      explanation:
        "This event is not linked to evidence yet. The system can still track it, but proof readiness is weaker.",
      suggestedFix:
        "Link screenshots, messages, documents, photos, witnesses, or other evidence to this event.",
      affectedEventIds: [event.id],
    });
  }

  if (event.partyIds.length === 0) {
    issues.push({
      id: createId("timeline_issue"),
      issueType: "missing-party-link",
      severity: "low",
      title: "Event is not linked to a party",
      explanation:
        "This event is not linked to a person, institution, or opposing party yet.",
      suggestedFix:
        "Identify who was involved in this event.",
      affectedEventIds: [event.id],
    });
  }

  return issues;
}

function buildTimelineEvent(args: {
  candidate: TimelineBuildInput["eventCandidates"][number];
  input: TimelineBuildInput;
}): LitigationTimelineEvent {
  const id = args.candidate.id || createId("timeline_event");
  const description = args.candidate.description;

  const event: LitigationTimelineEvent = {
    id,
    version: "1.0.0",

    kind: inferEventKind(description),
    title: args.candidate.title,
    description,
    importance: "important",

    date: buildDateValue({
      raw: args.candidate.dateRaw,
      normalized: args.candidate.dateNormalized,
    }),

    partyIds: args.candidate.partyIds || [],
    evidenceLinks: buildEvidenceLinks(args.candidate),
    claimLinks: buildClaimLinks(args.candidate),

    proceduralContext: {
      courtPath: args.input.courtPath,
      province: args.input.province,
      stage: args.input.stage,
      filingRelated: hasText(description, ["filed", "claim", "application", "defence", "defense"]),
      serviceRelated: hasText(description, ["served", "service"]),
      deadlineRelated: hasText(description, ["deadline", "due", "limitation"]),
      hearingRelated: hasText(description, ["hearing", "trial", "conference"]),
      orderRelated: hasText(description, ["order", "judgment", "decision"]),
      enforcementRelated: hasText(description, ["enforce", "garnish", "writ"]),
      appealRelated: hasText(description, ["appeal"]),
      practicalEffect: [],
    },

    relationships: [],
    validationIssues: [],

    source: {
      sourceType: "system-inference",
      sourceText: args.candidate.sourceText || description,
      confidence: "medium",
    },

    tags: [],
    confidence: "medium",
  };

  return {
    ...event,
    validationIssues: buildValidationIssues(event),
  };
}

function buildCausationChains(events: LitigationTimelineEvent[]): TimelineCausationChain[] {
  const harmEvents = events.filter((event) => event.kind === "harm-event");
  const factualEvents = events.filter(
    (event) => event.kind === "factual-event" || event.kind === "communication",
  );

  if (harmEvents.length === 0 || factualEvents.length === 0) {
    return [];
  }

  return [
    {
      id: createId("causation_chain"),
      title: "Initial factual-to-harm sequence",
      eventIds: [...factualEvents.slice(0, 3), ...harmEvents.slice(0, 3)].map(
        (event) => event.id,
      ),
      linkedClaimIds: [],
      linkedLegalDomains: uniqueStrings(
        [...factualEvents, ...harmEvents].flatMap((event) =>
          event.claimLinks.map((link) => link.legalDomain),
        ),
      ) as CaseLegalDomain[],
      explanation:
        "The timeline suggests a possible sequence from factual events or communications to alleged harm. This needs further validation with dates, evidence, and causation details.",
      gaps: [
        "Confirm exact dates.",
        "Confirm evidence linking each event to the alleged harm.",
        "Explain how the earlier event caused or contributed to the later harm.",
      ],
      strength: "low",
    },
  ];
}

function buildProceduralSequences(input: TimelineBuildInput, events: LitigationTimelineEvent[]): TimelineProceduralSequence[] {
  const proceduralEvents = events.filter((event) =>
    [
      "procedural-event",
      "filing-event",
      "service-event",
      "deadline-event",
      "conference-event",
      "motion-event",
      "hearing-event",
      "order-event",
      "enforcement-event",
      "appeal-event",
    ].includes(event.kind),
  );

  if (proceduralEvents.length === 0) {
    return [];
  }

  return [
    {
      id: createId("procedural_sequence"),
      courtPath: input.courtPath,
      stage: input.stage,
      eventIds: proceduralEvents.map((event) => event.id),
      missingPrerequisites:
        input.stage === "responding"
          ? ["Confirm what document was served and the response deadline."]
          : [],
      deadlineRisks: proceduralEvents.some((event) => event.date.certainty === "unknown")
        ? ["At least one procedural event has no clear date."]
        : [],
      serviceRisks: proceduralEvents.some((event) => event.kind === "filing-event")
        ? ["Confirm whether filed materials were served properly."]
        : [],
      sequencingWarnings: [],
      confidence: "medium",
    },
  ];
}

function buildGlobalValidationIssues(events: LitigationTimelineEvent[]): TimelineValidationIssue[] {
  const issues: TimelineValidationIssue[] = [];

  const datedEvents = events.filter((event) => event.date.normalizedDate);

  const sortedDates = datedEvents
    .map((event) => event.date.normalizedDate)
    .filter((date): date is string => Boolean(date));

  if (sortedDates.length !== datedEvents.length) {
    issues.push({
      id: createId("timeline_issue"),
      issueType: "unclear-order",
      severity: "low",
      title: "Some event ordering is uncertain",
      explanation:
        "Some events have approximate or missing dates, so the timeline order may be incomplete.",
      suggestedFix:
        "Add missing dates or approximate date ranges.",
      affectedEventIds: events
        .filter((event) => event.date.certainty !== "exact")
        .map((event) => event.id),
    });
  }

  return issues;
}

function averageConfidence(values: CaseConfidence[]): CaseConfidence {
  if (values.length === 0) return "very-low";

  const average =
    values.reduce((total, value) => total + confidenceRank(value), 0) /
    values.length;

  return confidenceFromRank(average);
}

function buildReadiness(events: LitigationTimelineEvent[]): TimelineReadinessState {
  const eventIssues = events.flatMap((event) => event.validationIssues);

  const dateConfidence = averageConfidence(events.map((event) => event.date.confidence));

  const evidenceLinkingStrength = averageConfidence(
    events.map((event) => (event.evidenceLinks.length > 0 ? "medium" : "low")),
  );

  const blockers = eventIssues
    .filter((issue) => issue.severity === "high" || issue.severity === "critical")
    .map((issue) => issue.title);

  const nextTimelineActions = uniqueStrings([
    ...eventIssues.slice(0, 5).map((issue) => issue.suggestedFix),
    "Review the timeline for missing dates, missing evidence, and unclear event order.",
  ]);

  return {
    chronologyCompleteness: events.length > 0 ? "medium" : "very-low",
    dateConfidence,
    evidenceLinkingStrength,
    proceduralSequencingStrength: "low",
    causationStrength: "low",
    blockers,
    nextTimelineActions,
  };
}

export function buildTimelineCognition(
  input: TimelineBuildInput,
): TimelineBuildOutput {
  const timestamp = nowIso();

  const events = input.eventCandidates.map((candidate) =>
    buildTimelineEvent({
      candidate,
      input,
    }),
  );

  const causationChains = buildCausationChains(events);
  const proceduralSequences = buildProceduralSequences(input, events);
  const validationIssues = [
    ...events.flatMap((event) => event.validationIssues),
    ...buildGlobalValidationIssues(events),
  ];

  const readiness = buildReadiness(events);

  const warnings = uniqueStrings([
    ...validationIssues.map((issue) => issue.title),
    ...(events.length === 0
      ? ["No timeline events were available to build chronology."]
      : []),
  ]);

  const confidence = averageConfidence([
    readiness.chronologyCompleteness,
    readiness.dateConfidence,
    readiness.evidenceLinkingStrength,
    readiness.proceduralSequencingStrength,
    readiness.causationStrength,
  ]);

  return {
    timeline: {
      id: createId("timeline"),
      version: "1.0.0",
      createdAt: timestamp,
      updatedAt: timestamp,
      caseId: input.caseId,

      events,
      causationChains,
      proceduralSequences,

      validationIssues,
      readiness,

      warnings,
      confidence,
    },
    warnings,
  };
}