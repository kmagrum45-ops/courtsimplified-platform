import type { EvidenceItem } from "./evidenceEngine";

export type TimelineConfidence = "strong" | "moderate" | "weak" | "unknown";

export type TimelineEventType =
  | "communication"
  | "payment"
  | "damage"
  | "court-step"
  | "witness"
  | "settlement"
  | "deadline"
  | "other";

export type TimelineEvent = {
  id: string;
  date?: string;
  title: string;
  description: string;
  eventType: TimelineEventType;
  source?: string;
  relatedIssue?: string;
  relatedLegalElement?: string;
  linkedEvidenceIds: Array<string | number>;
  exhibitLabels: string[];
  confidence: TimelineConfidence;
  warnings: string[];
  suggestedFixes: string[];
};

export type TimelineAnalysis = {
  events: TimelineEvent[];
  orderedEvents: TimelineEvent[];
  undatedEvents: TimelineEvent[];
  chronologyWarnings: string[];
  chronologyGaps: string[];
  escalationPatterns: string[];
  contradictionRisks: string[];
  nextSteps: string[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ");
}

function cleanList(items: string[]) {
  return Array.from(
    new Set(items.map((item) => clean(item)).filter(Boolean))
  );
}

function includesAny(text: string, terms: string[]) {
  const normalizedText = normalize(text);

  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function textOf(item: EvidenceItem) {
  return normalize(
    [
      item.label,
      item.title,
      item.description,
      item.relevance,
      item.category,
      item.date,
      item.source,
      item.content,
      item.fileName,
      item.fileType,
      item.relatedIssue,
      item.relatedLegalElement,
      item.exhibitGroup,
      item.exhibitNumber,
      ...(item.linkedForms || []),
      ...(item.linkedTimelineEvents || []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function evidenceId(item: EvidenceItem) {
  return item.id || item.label || item.exhibitNumber || item.title || createId("evidence");
}

function exhibitLabel(item: EvidenceItem) {
  return String(item.label || item.exhibitNumber || item.title || "Unlabelled exhibit");
}

function detectEventType(item: EvidenceItem): TimelineEventType {
  const text = textOf(item);

  if (
    includesAny(text, [
      "message",
      "text",
      "email",
      "screenshot",
      "conversation",
      "chat",
      "called",
      "sent",
      "received",
    ])
  ) {
    return "communication";
  }

  if (
    includesAny(text, [
      "payment",
      "paid",
      "invoice",
      "receipt",
      "deposit",
      "bank",
      "etransfer",
      "e-transfer",
      "refund",
      "amount",
    ])
  ) {
    return "payment";
  }

  if (
    includesAny(text, [
      "damage",
      "repair",
      "broken",
      "defective",
      "photo",
      "picture",
      "before",
      "after",
      "condition",
    ])
  ) {
    return "damage";
  }

  if (
    includesAny(text, [
      "court",
      "filed",
      "served",
      "affidavit",
      "claim",
      "defence",
      "conference",
      "motion",
      "order",
      "judgment",
    ])
  ) {
    return "court-step";
  }

  if (
    includesAny(text, [
      "witness",
      "saw",
      "heard",
      "third party",
      "recipient",
      "observer",
    ])
  ) {
    return "witness";
  }

  if (
    includesAny(text, [
      "settlement",
      "offer",
      "proposal",
      "apology",
      "retraction",
      "resolve",
      "negotiate",
    ])
  ) {
    return "settlement";
  }

  if (
    includesAny(text, [
      "deadline",
      "due date",
      "limitation",
      "last day",
      "served by",
      "file by",
    ])
  ) {
    return "deadline";
  }

  return "other";
}

function eventTitle(item: EvidenceItem, eventType: TimelineEventType) {
  if (clean(item.title)) return clean(item.title);

  if (eventType === "communication") return "Communication event";
  if (eventType === "payment") return "Payment or damages event";
  if (eventType === "damage") return "Damage or condition event";
  if (eventType === "court-step") return "Court or procedural event";
  if (eventType === "witness") return "Witness or third-party event";
  if (eventType === "settlement") return "Settlement or resolution event";
  if (eventType === "deadline") return "Deadline or timing event";

  return "Timeline event";
}

function eventDescription(item: EvidenceItem, eventType: TimelineEventType) {
  if (clean(item.description)) return clean(item.description);
  if (clean(item.relevance)) return clean(item.relevance);
  if (clean(item.content)) return clean(item.content);

  if (eventType === "communication") {
    return "A communication occurred and may be relevant to notice, admissions, denials, chronology, or context.";
  }

  if (eventType === "payment") {
    return "A payment, invoice, receipt, expense, or damages-related event may be relevant.";
  }

  if (eventType === "damage") {
    return "A damage, repair, condition, or physical-evidence event may be relevant.";
  }

  if (eventType === "court-step") {
    return "A court or procedural event may be relevant to the case history.";
  }

  if (eventType === "witness") {
    return "A witness or third-party event may be relevant to corroboration or direct knowledge.";
  }

  if (eventType === "settlement") {
    return "A settlement or resolution event may be relevant.";
  }

  if (eventType === "deadline") {
    return "A deadline or timing event may be relevant.";
  }

  return "This event should be reviewed and connected to the case chronology.";
}

function confidenceFor(item: EvidenceItem): TimelineConfidence {
  let score = 0;

  if (clean(item.date)) score += 2;
  if (clean(item.source)) score += 1;
  if (clean(item.title)) score += 1;
  if (clean(item.description) || clean(item.content)) score += 1;
  if (clean(item.relatedIssue)) score += 1;
  if (clean(item.relatedLegalElement)) score += 1;

  if (score >= 5) return "strong";
  if (score >= 3) return "moderate";
  if (score >= 1) return "weak";

  return "unknown";
}

function warningsFor(item: EvidenceItem) {
  const warnings: string[] = [];
  const suggestedFixes: string[] = [];

  if (!clean(item.date)) {
    warnings.push("This event does not have a date.");
    suggestedFixes.push("Add the date or approximate date this evidence relates to.");
  }

  if (!clean(item.source)) {
    warnings.push("This event does not identify a source.");
    suggestedFixes.push("Identify who created, sent, received, observed, or produced this evidence.");
  }

  if (!clean(item.description) && !clean(item.content)) {
    warnings.push("This event needs more factual description.");
    suggestedFixes.push("Explain what happened and why it matters in the timeline.");
  }

  if (!clean(item.relatedIssue)) {
    warnings.push("This event is not linked to a case issue.");
    suggestedFixes.push("Connect this event to the issue it helps prove or explain.");
  }

  return {
    warnings: cleanList(warnings),
    suggestedFixes: cleanList(suggestedFixes),
  };
}

function parseDateValue(date?: string) {
  const value = clean(date);

  if (!value) return null;

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function daysBetween(a?: string, b?: string) {
  const first = parseDateValue(a);
  const second = parseDateValue(b);

  if (first === null || second === null) return null;

  const diff = second - first;

  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function buildTimelineEvent(item: EvidenceItem): TimelineEvent {
  const eventType = detectEventType(item);
  const riskResult = warningsFor(item);

  return {
    id: createId("timeline"),
    date: item.date,
    title: eventTitle(item, eventType),
    description: eventDescription(item, eventType),
    eventType,
    source: item.source,
    relatedIssue: item.relatedIssue,
    relatedLegalElement: item.relatedLegalElement,
    linkedEvidenceIds: [evidenceId(item)],
    exhibitLabels: [exhibitLabel(item)],
    confidence: confidenceFor(item),
    warnings: riskResult.warnings,
    suggestedFixes: riskResult.suggestedFixes,
  };
}

function buildChronologyGaps(orderedEvents: TimelineEvent[]) {
  const gaps: string[] = [];

  for (let i = 0; i < orderedEvents.length - 1; i += 1) {
    const current = orderedEvents[i];
    const next = orderedEvents[i + 1];

    const gapDays = daysBetween(current.date, next.date);

    if (gapDays !== null && gapDays > 30) {
      gaps.push(
        `There is a ${gapDays}-day timeline gap between "${current.title}" and "${next.title}".`
      );
    }
  }

  return cleanList(gaps);
}

function buildEscalationPatterns(orderedEvents: TimelineEvent[]) {
  const patterns: string[] = [];

  const communicationEvents = orderedEvents.filter(
    (event) => event.eventType === "communication"
  );

  if (communicationEvents.length >= 3) {
    patterns.push(
      "Multiple communication events appear in the chronology. Review whether they show repeated notice, escalation, admissions, denials, or ongoing dispute behaviour."
    );
  }

  const paymentEvents = orderedEvents.filter(
    (event) => event.eventType === "payment"
  );

  if (paymentEvents.length >= 2) {
    patterns.push(
      "Multiple payment or damages events appear in the chronology. Review whether they support a damages calculation or payment history."
    );
  }

  const courtEvents = orderedEvents.filter(
    (event) => event.eventType === "court-step"
  );

  if (courtEvents.length >= 2) {
    patterns.push(
      "Multiple procedural events appear in the chronology. Review whether the procedural history is clear and complete."
    );
  }

  return cleanList(patterns);
}

function buildContradictionRisks(events: TimelineEvent[]) {
  const risks: string[] = [];

  const issueDateMap = new Map<string, Set<string>>();

  for (const event of events) {
    const issue = normalize(event.relatedIssue || "uncategorized");

    if (!issueDateMap.has(issue)) {
      issueDateMap.set(issue, new Set());
    }

    if (event.date) {
      issueDateMap.get(issue)?.add(event.date);
    }
  }

  for (const [issue, dates] of issueDateMap.entries()) {
    if (issue !== "uncategorized" && dates.size >= 4) {
      risks.push(
        `The issue "${issue}" has events spread across several dates. Check for inconsistent wording, timeline confusion, or missing connecting facts.`
      );
    }
  }

  return cleanList(risks);
}

function buildChronologyWarnings(events: TimelineEvent[], undatedEvents: TimelineEvent[]) {
  const warnings: string[] = [];

  if (events.length === 0) {
    warnings.push("No timeline events have been created yet.");
  }

  if (undatedEvents.length > 0) {
    warnings.push(`${undatedEvents.length} event(s) are missing dates.`);
  }

  const weakEvents = events.filter(
    (event) => event.confidence === "weak" || event.confidence === "unknown"
  );

  if (weakEvents.length > 0) {
    warnings.push(`${weakEvents.length} event(s) have weak timeline confidence.`);
  }

  return cleanList(warnings);
}

function buildNextSteps(
  chronologyWarnings: string[],
  chronologyGaps: string[],
  contradictionRisks: string[],
  escalationPatterns: string[]
) {
  const steps: string[] = [];

  if (chronologyWarnings.length > 0) {
    steps.push("Fix timeline warnings before using the chronology in a court document.");
  }

  if (chronologyGaps.length > 0) {
    steps.push("Review timeline gaps and add missing events or explanation where needed.");
  }

  if (contradictionRisks.length > 0) {
    steps.push("Check for inconsistent dates, wording, or event descriptions.");
  }

  if (escalationPatterns.length > 0) {
    steps.push("Review whether repeated events should be summarized as a pattern or kept as separate events.");
  }

  if (steps.length === 0) {
    steps.push("Chronology is ready for basic review and court-package drafting.");
  }

  return cleanList(steps);
}

export function buildTimelineFromEvidence(
  evidenceItems: EvidenceItem[]
): TimelineAnalysis {
  const events = evidenceItems.map(buildTimelineEvent);

  const orderedEvents = events
    .filter((event) => parseDateValue(event.date) !== null)
    .slice()
    .sort((a, b) => {
      const first = parseDateValue(a.date) || 0;
      const second = parseDateValue(b.date) || 0;

      return first - second;
    });

  const undatedEvents = events.filter(
    (event) => parseDateValue(event.date) === null
  );

  const chronologyGaps = buildChronologyGaps(orderedEvents);
  const escalationPatterns = buildEscalationPatterns(orderedEvents);
  const contradictionRisks = buildContradictionRisks(events);
  const chronologyWarnings = buildChronologyWarnings(events, undatedEvents);

  const nextSteps = buildNextSteps(
    chronologyWarnings,
    chronologyGaps,
    contradictionRisks,
    escalationPatterns
  );

  return {
    events,
    orderedEvents,
    undatedEvents,
    chronologyWarnings,
    chronologyGaps,
    escalationPatterns,
    contradictionRisks,
    nextSteps,
  };
}