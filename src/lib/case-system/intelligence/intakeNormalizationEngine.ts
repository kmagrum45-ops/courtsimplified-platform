import {
  CourtSimplifiedBrainInput,
  DesiredOutcome,
  ExtractedDate,
  ExtractedEvent,
  ExtractedEvidence,
  ExtractedHarm,
  ExtractedMoneyAmount,
  ExtractedParty,
  IntelligenceConfidence,
  IntelligenceCourtPath,
  IntelligenceProvince,
  IntelligenceSourceType,
  IntelligenceStage,
  LegalDomain,
  LegalSignal,
  NormalizedIntake,
} from "./intelligenceTypes";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeWhitespace(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lowerText(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function confidenceFromScore(score: number): IntelligenceConfidence {
  if (score >= 85) return "very-high";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  if (score >= 20) return "low";
  return "very-low";
}

function cleanList(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const lower = lowerText(text);
  return terms.some((term) => lower.includes(lowerText(term)));
}

function sentenceSplit(text: string): string[] {
  return cleanList(
    normalizeWhitespace(text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map((item) => item.trim()),
  ).filter((item) => item.length > 12);
}

function detectProvince(text: string, fallback?: IntelligenceProvince): IntelligenceProvince {
  if (fallback && fallback !== "Unknown") return fallback;

  if (
    includesAny(text, [
      "ontario",
      "ottawa",
      "toronto",
      "mississauga",
      "hamilton",
      "london ontario",
      "small claims court ontario",
      "superior court of justice",
      "ontario court of justice",
    ])
  ) {
    return "Ontario";
  }

  return fallback || "Unknown";
}

function detectStage(text: string, fallback?: IntelligenceStage): IntelligenceStage {
  if (fallback && fallback !== "not-sure") return fallback;

  if (includesAny(text, ["appeal", "appealing", "leave to appeal"])) return "appeal";
  if (includesAny(text, ["enforce", "garnish", "writ", "collection", "judgment debtor"])) return "enforcement";
  if (includesAny(text, ["trial", "trial date", "trial record"])) return "trial";
  if (includesAny(text, ["urgent motion", "bring a motion", "notice of motion", "motion for leave"])) return "motion";
  if (includesAny(text, ["settlement conference", "case conference", "conference"])) return "conference";
  if (includesAny(text, ["offer to settle", "settlement offer", "settlement"])) return "settlement";
  if (includesAny(text, ["urgent", "emergency", "immediate danger", "restraining"])) return "urgent";
  if (includesAny(text, ["responding", "defending", "file a defence", "file a defense", "served me", "i was served"])) return "responding";
  if (includesAny(text, ["already filed", "defence filed", "response filed", "court date", "claim number"])) return "already-started";

  return fallback || "not-sure";
}

function detectCourtPath(text: string, fallback?: IntelligenceCourtPath): IntelligenceCourtPath {
  if (fallback && fallback !== "unknown") return fallback;

  if (
    includesAny(text, [
      "family court",
      "custody",
      "parenting time",
      "decision-making responsibility",
      "child support",
      "spousal support",
      "separation",
      "divorce",
      "matrimonial home",
    ])
  ) {
    return "family";
  }

  if (includesAny(text, ["landlord", "tenant", "ltb", "eviction", "rent arrears"])) {
    return "ltb";
  }

  if (includesAny(text, ["immigration", "refugee", "ircc", "removal order", "sponsorship"])) {
    return "immigration";
  }

  if (
    includesAny(text, [
      "charter",
      "human rights",
      "judicial review",
      "superior court",
      "injunction",
      "declaration",
      "government",
      "public authority",
      "crown",
      "police",
      "ministry",
      "hospital",
      "bail",
    ])
  ) {
    return "civil";
  }

  if (
    includesAny(text, [
      "small claims",
      "plaintiff's claim",
      "plaintiffs claim",
      "defence",
      "owed money",
      "invoice",
      "damages",
      "sue",
    ])
  ) {
    return "small-claims";
  }

  return fallback || "unknown";
}

function addSignal(args: {
  signals: LegalSignal[];
  label: string;
  domain: LegalDomain;
  weight: number;
  confidence?: IntelligenceConfidence;
  sourceText?: string;
  explanation: string;
}): void {
  args.signals.push({
    id: createId("signal"),
    label: args.label,
    domain: args.domain,
    polarity: "supports",
    weight: args.weight,
    confidence: args.confidence || confidenceFromScore(args.weight * 10),
    sourceType: "user-intake",
    sourceText: args.sourceText || args.label,
    explanation: args.explanation,
  });
}

function detectLightweightSignals(text: string): LegalSignal[] {
  const signals: LegalSignal[] = [];

  if (
    includesAny(text, [
      "defamation",
      "slander",
      "libel",
      "false statement",
      "false accusation",
      "lied about me",
      "spread rumours",
      "spread rumors",
      "ruined my reputation",
      "reputation",
      "posted about me",
      "messaged people",
      "told people",
    ])
  ) {
    addSignal({
      signals,
      label: "possible-reputational-publication",
      domain: "defamation",
      weight: 7,
      confidence: "medium",
      explanation: "The narrative contains reputational-publication language.",
    });
  }

  if (
    includesAny(text, [
      "contract",
      "agreement",
      "breach",
      "terms",
      "service agreement",
      "invoice",
      "deposit",
    ])
  ) {
    addSignal({
      signals,
      label: "possible-agreement-dispute",
      domain: "contract",
      weight: 6,
      confidence: "medium",
      explanation: "The narrative contains agreement or payment-performance language.",
    });
  }

  if (includesAny(text, ["owed me", "unpaid", "loan", "borrowed money", "did not pay me back"])) {
    addSignal({
      signals,
      label: "possible-debt-or-payment-dispute",
      domain: "debt",
      weight: 6,
      confidence: "medium",
      explanation: "The narrative contains unpaid-money language.",
    });
  }

  if (
    includesAny(text, [
      "property damage",
      "damaged my car",
      "car damage",
      "broken window",
      "damaged my property",
      "vehicle damage",
      "repair cost",
    ])
  ) {
    addSignal({
      signals,
      label: "possible-physical-property-loss",
      domain: "property-damage",
      weight: 7,
      confidence: "medium",
      explanation: "The narrative contains physical property loss language.",
    });
  }

  if (includesAny(text, ["injured", "hurt", "medical", "hospital", "pain", "fracture", "concussion", "assault"])) {
    addSignal({
      signals,
      label: "possible-personal-injury-or-harm",
      domain: "personal-injury",
      weight: 7,
      confidence: "medium",
      explanation: "The narrative contains bodily injury, assault, or medical harm language.",
    });
  }

  if (includesAny(text, ["harassing", "harassment", "keeps messaging", "threatening messages", "won't stop contacting"])) {
    addSignal({
      signals,
      label: "possible-harassment-pattern",
      domain: "harassment",
      weight: 6,
      confidence: "medium",
      explanation: "The narrative contains repeated-contact or harassment language.",
    });
  }

  if (includesAny(text, ["custody", "parenting", "decision-making", "parenting time", "access to my child"])) {
    addSignal({
      signals,
      label: "possible-family-parenting",
      domain: "family-parenting",
      weight: 8,
      confidence: "medium",
      explanation: "The narrative contains parenting or decision-making language.",
    });
  }

  if (includesAny(text, ["child support", "spousal support", "support arrears"])) {
    addSignal({
      signals,
      label: "possible-family-support",
      domain: "family-support",
      weight: 8,
      confidence: "medium",
      explanation: "The narrative contains family support language.",
    });
  }

  if (
    includesAny(text, [
      "charter",
      "section 7",
      "section 15",
      "state actor",
      "government failed",
      "public authority",
      "crown",
      "police",
      "ministry",
      "bail",
    ])
  ) {
    addSignal({
      signals,
      label: "possible-charter-public-law",
      domain: "civil-charter",
      weight: 8,
      confidence: "medium",
      explanation: "The narrative contains Charter, state actor, or public authority language.",
    });
  }

  if (
    includesAny(text, [
      "institutional failure",
      "system failure",
      "hospital",
      "school board",
      "police",
      "crown",
      "ministry",
      "public authority",
      "failed to investigate",
      "failed to communicate",
    ])
  ) {
    addSignal({
      signals,
      label: "possible-institutional-liability",
      domain: "civil-institutional-liability",
      weight: 8,
      confidence: "medium",
      explanation: "The narrative contains institutional or public-authority failure language.",
    });
  }

  if (includesAny(text, ["human rights", "discrimination", "accommodation", "reprisal"])) {
    addSignal({
      signals,
      label: "possible-human-rights",
      domain: "civil-human-rights",
      weight: 8,
      confidence: "medium",
      explanation: "The narrative contains discrimination, accommodation, or human-rights language.",
    });
  }

  if (includesAny(text, ["negligence", "failed to", "duty of care", "causation", "foreseeable"])) {
    addSignal({
      signals,
      label: "possible-negligence",
      domain: "negligence",
      weight: 7,
      confidence: "medium",
      explanation: "The narrative contains negligence, duty, causation, or foreseeability language.",
    });
  }

  return signals;
}

function inferUserStatedDomains(signals: LegalSignal[]): LegalDomain[] {
  const domains = signals.map((signal) => signal.domain);
  const unique = Array.from(new Set(domains));
  return unique.length ? unique : ["unknown"];
}

function extractMoneyAmounts(text: string): ExtractedMoneyAmount[] {
  const matches = text.match(/\$[\d,]+(\.\d{1,2})?/g) || [];

  return matches.map((match) => {
    const amount = Number(match.replace("$", "").replace(/,/g, ""));

    return {
      id: createId("money"),
      amount: Number.isFinite(amount) ? amount : undefined,
      currency: "CAD",
      rawText: match,
      label: "damages-claimed",
      confidence: "medium",
      sourceText: match,
    };
  });
}

function extractDates(text: string): ExtractedDate[] {
  const exactDateMatches = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || [];
  const yearMatches = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/g) || [];

  const exactDates: ExtractedDate[] = exactDateMatches.map((match): ExtractedDate => ({
    id: createId("date"),
    rawText: match,
    normalizedDate: undefined,
    label: "Referenced date",
    confidence: "medium",
    sourceText: match,
  }));

  const years: ExtractedDate[] = Array.from(new Set(yearMatches))
    .filter((year) => !exactDateMatches.some((date) => date.includes(year)))
    .map((match): ExtractedDate => ({
      id: createId("date"),
      rawText: match,
      normalizedDate: undefined,
      label: "Referenced year",
      confidence: "medium",
      sourceText: match,
    }));

  return [...exactDates, ...years];
}

function partyExists(parties: ExtractedParty[], role: ExtractedParty["role"], name?: string): boolean {
  return parties.some(
    (party) =>
      party.role === role &&
      lowerText(party.name || party.description || "") === lowerText(name || ""),
  );
}

function pushParty(parties: ExtractedParty[], party: ExtractedParty): void {
  if (!partyExists(parties, party.role, party.name || party.description)) {
    parties.push(party);
  }
}

function extractParties(text: string): ExtractedParty[] {
  const parties: ExtractedParty[] = [
    {
      id: createId("party"),
      role: "claimant",
      description: "Primary user party",
      isUser: true,
      confidence: "high",
      sourceText: text,
    },
  ];

  const institutionalActors: Array<{ term: string; name: string }> = [
    { term: "crown", name: "Crown" },
    { term: "attorney general", name: "Attorney General" },
    { term: "police", name: "Police" },
    { term: "ottawa police", name: "Ottawa Police" },
    { term: "ministry", name: "Ministry / government body" },
    { term: "government", name: "Government / public authority" },
    { term: "public authority", name: "Public authority" },
    { term: "hospital", name: "Hospital" },
    { term: "school board", name: "School board" },
    { term: "landlord", name: "Landlord" },
    { term: "employer", name: "Employer" },
  ];

  institutionalActors.forEach((actor) => {
    if (includesAny(text, [actor.term])) {
      pushParty(parties, {
        id: createId("party"),
        name: actor.name,
        role: "institution",
        description: `${actor.name} appears to be a relevant institution or public/private actor.`,
        confidence: "medium",
        sourceText: actor.term,
      });
    }
  });

  if (includesAny(text, ["defendant", "other party", "respondent"])) {
    pushParty(parties, {
      id: createId("party"),
      role: "defendant",
      description: "Possible defendant/responding party referenced in the intake.",
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["witness", "people saw", "people heard", "recipient", "sent to"])) {
    pushParty(parties, {
      id: createId("party"),
      role: "witness",
      description: "Possible witness or recipient referenced in the intake.",
      confidence: "medium",
      sourceText: text,
    });
  }

  return parties;
}

function makeAdmissibilityConcern(args: {
  concern: ExtractedEvidence["admissibilityConcerns"][number]["concern"];
  severity: ExtractedEvidence["admissibilityConcerns"][number]["severity"];
  explanation: string;
  suggestedFix: string;
}): ExtractedEvidence["admissibilityConcerns"][number] {
  return {
    id: createId("admissibility"),
    concern: args.concern,
    severity: args.severity,
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
  };
}

function extractEvidence(text: string): ExtractedEvidence[] {
  const evidence: ExtractedEvidence[] = [];

  function pushEvidence(item: ExtractedEvidence): void {
    if (!evidence.some((existing) => existing.type === item.type && existing.title === item.title)) {
      evidence.push(item);
    }
  }

  if (includesAny(text, ["screenshot", "screenshots"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "screenshot",
      title: "Screenshot evidence",
      description: "The intake references screenshot evidence.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "medium",
      gaps: ["Confirm sender, recipient, timestamps, full context, and readability."],
      admissibilityConcerns: [
        makeAdmissibilityConcern({
          concern: "authenticity",
          severity: "medium",
          explanation: "Screenshots may require proof of source, date, sender, and context.",
          suggestedFix: "Preserve full threads, metadata, sender/recipient details, and original files where possible.",
        }),
      ],
      sourceText: text,
    });
  }

  if (includesAny(text, ["text message", "messages", "sms", "messaged"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "text-message",
      title: "Text-message evidence",
      description: "The intake references messages or text communications.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "medium",
      gaps: ["Confirm the full conversation thread, sender, recipient, and dates."],
      admissibilityConcerns: [
        makeAdmissibilityConcern({
          concern: "missing-context",
          severity: "medium",
          explanation: "Message evidence can be weakened if only partial excerpts are shown.",
          suggestedFix: "Keep the full conversation before and after the key messages.",
        }),
      ],
      sourceText: text,
    });
  }

  if (includesAny(text, ["email", "emailed"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "email",
      title: "Email evidence",
      description: "The intake references email communications.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "medium",
      gaps: ["Confirm sender, recipient, dates, and full email chain."],
      admissibilityConcerns: [],
      sourceText: text,
    });
  }

  if (includesAny(text, ["police report", "police records", "occurrence report", "police notes"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "police-record",
      title: "Police records",
      description: "The intake references police records or police documentation.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "medium",
      gaps: ["Confirm exact record type, date, occurrence number, and disclosure status."],
      admissibilityConcerns: [],
      sourceText: text,
    });
  }

  if (includesAny(text, ["medical record", "doctor", "hospital record", "ptsd", "treatment", "therapy"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "medical-record",
      title: "Medical or treatment records",
      description: "The intake references medical, psychological, hospital, or treatment evidence.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "medium",
      gaps: ["Confirm provider, dates, diagnosis/treatment history, and connection to claimed harm."],
      admissibilityConcerns: [
        makeAdmissibilityConcern({
          concern: "privacy",
          severity: "medium",
          explanation: "Medical records are sensitive and may require careful handling.",
          suggestedFix: "Use only relevant records and consider redactions where appropriate.",
        }),
      ],
      sourceText: text,
    });
  }

  if (includesAny(text, ["court order", "recognizance", "bail transcript", "transcript", "court record", "statement of claim"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "court-order",
      title: "Court or procedural records",
      description: "The intake references court records, transcripts, orders, recognizances, or procedural documents.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "high",
      gaps: ["Confirm completeness, date, issuing court, and whether the record is certified or official."],
      admissibilityConcerns: [],
      sourceText: text,
    });
  }

  if (includesAny(text, ["witness", "people saw", "people heard", "told people", "multiple people"])) {
    pushEvidence({
      id: createId("evidence"),
      type: "witness",
      title: "Potential witness evidence",
      description: "The intake suggests that third parties may have witnessed or received relevant information.",
      linkedFactIds: [],
      linkedIssueIds: [],
      strength: "medium",
      gaps: ["Identify the witness, what they observed, and whether they will provide evidence."],
      admissibilityConcerns: [],
      sourceText: text,
    });
  }

  return evidence;
}

function extractHarms(
  text: string,
  domains: LegalDomain[],
  moneyAmounts: ExtractedMoneyAmount[],
): ExtractedHarm[] {
  const harms: ExtractedHarm[] = [];

  if (
    domains.includes("defamation") ||
    includesAny(text, ["reputation", "humiliated", "embarrassed", "people think", "rumours", "rumors"])
  ) {
    harms.push({
      id: createId("harm"),
      type: "reputational",
      description: "The intake may involve reputational harm or publication-related damage.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["stress", "anxiety", "emotional", "humiliated", "distress", "ptsd", "trauma"])) {
    harms.push({
      id: createId("harm"),
      type: "emotional-distress",
      description: "The intake references emotional, psychological, trauma, or PTSD-related harm.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["safety", "danger", "risk", "assault", "threat"])) {
    harms.push({
      id: createId("harm"),
      type: "safety",
      description: "The intake references safety, violence, risk, threats, or assault-related harm.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["privacy", "records disclosed", "records accessed", "confidential"])) {
    harms.push({
      id: createId("harm"),
      type: "privacy",
      description: "The intake references privacy, record access, or confidentiality harm.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (domains.includes("property-damage")) {
    harms.push({
      id: createId("harm"),
      type: "property-loss",
      description: "The intake may involve physical property damage or repair-related loss.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (domains.includes("personal-injury")) {
    harms.push({
      id: createId("harm"),
      type: "physical-injury",
      description: "The intake may involve physical injury or medical harm.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (moneyAmounts.length > 0 && harms.length === 0) {
    harms.push({
      id: createId("harm"),
      type: "financial",
      description: "The intake references money or damages, but the exact legal basis still requires cognition review.",
      amountIds: moneyAmounts.map((item) => item.id),
      evidenceIds: [],
      confidence: "low",
      sourceText: text,
    });
  }

  return harms;
}

function extractDesiredOutcomes(text: string, moneyAmounts: ExtractedMoneyAmount[]): DesiredOutcome[] {
  const outcomes: DesiredOutcome[] = [];

  if (moneyAmounts.length > 0 || includesAny(text, ["damages", "compensation", "money", "sue"])) {
    outcomes.push({
      id: createId("outcome"),
      type: "money",
      description: "The intake may involve a request for monetary compensation or damages.",
      amountIds: moneyAmounts.map((item) => item.id),
      remedyTypes: ["money-damages"],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["apology", "retraction", "take it back"])) {
    outcomes.push({
      id: createId("outcome"),
      type: "retraction",
      description: "The intake may involve a request for an apology, correction, or retraction.",
      amountIds: [],
      remedyTypes: ["retraction", "apology"],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["injunction", "restraining", "stop them", "court order"])) {
    outcomes.push({
      id: createId("outcome"),
      type: "injunction",
      description: "The intake may involve a request for a court order stopping conduct.",
      amountIds: [],
      remedyTypes: ["injunction"],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["declaration", "declare", "charter remedy"])) {
    outcomes.push({
      id: createId("outcome"),
      type: "court-guidance",
      description: "The intake may involve declaratory or public-law relief.",
      amountIds: [],
      remedyTypes: ["declaration"],
      confidence: "medium",
      sourceText: text,
    });
  }

  if (includesAny(text, ["forms", "which form", "what form", "document"])) {
    outcomes.push({
      id: createId("outcome"),
      type: "forms",
      description: "The user appears to need form or document workflow guidance.",
      amountIds: [],
      remedyTypes: ["unknown"],
      confidence: "medium",
      sourceText: text,
    });
  }

  return outcomes;
}

function eventTitleFor(sentence: string): string {
  if (includesAny(sentence, ["bail"])) return "Bail or release-related event";
  if (includesAny(sentence, ["assault"])) return "Assault or harm event";
  if (includesAny(sentence, ["discovered", "found out", "obtained records"])) return "Discovery of information or records";
  if (includesAny(sentence, ["filed", "served", "claim", "motion"])) return "Procedural filing or service event";
  if (includesAny(sentence, ["treatment", "doctor", "hospital", "ptsd"])) return "Medical or treatment event";
  if (includesAny(sentence, ["message", "email", "posted", "screenshot"])) return "Communication or publication event";
  return "Extracted intake event";
}

function dateIdsForText(text: string, dates: ExtractedDate[]): string[] {
  return dates.filter((date) => text.includes(date.rawText)).map((date) => date.id);
}

function evidenceIdsForText(text: string, evidence: ExtractedEvidence[]): string[] {
  return evidence
    .filter((item) =>
      includesAny(text, [item.title, item.type, item.description || ""])
    )
    .map((item) => item.id);
}

function signalsForText(text: string, signals: LegalSignal[]): LegalSignal[] {
  return signals.filter(
    (signal) =>
      includesAny(text, [signal.label, signal.domain, signal.sourceText || ""]) ||
      includesAny(text, signal.explanation.split(" ").filter((word) => word.length > 4)),
  );
}

function extractEvents(
  text: string,
  signals: LegalSignal[],
  evidence: ExtractedEvidence[],
  dates: ExtractedDate[],
  parties: ExtractedParty[],
): ExtractedEvent[] {
  const sentences = sentenceSplit(text);

  const eventSentences = sentences.filter((sentence) =>
    includesAny(sentence, [
      "on ",
      "in 19",
      "in 20",
      "when",
      "after",
      "before",
      "then",
      "filed",
      "served",
      "bail",
      "assault",
      "discovered",
      "obtained",
      "records",
      "treatment",
      "posted",
      "sent",
      "email",
      "message",
      "police",
      "crown",
      "court",
      "hospital",
    ]),
  );

  const sourceSentences = eventSentences.length > 0 ? eventSentences : sentences.slice(0, 4);

  const events: ExtractedEvent[] = sourceSentences.map((sentence): ExtractedEvent => ({
    id: createId("event"),
    title: eventTitleFor(sentence),
    description: normalizeWhitespace(sentence),
    dateIds: dateIdsForText(sentence, dates),
    partyIds: parties
      .filter((party) =>
        includesAny(sentence, [party.name || "", party.description || "", party.role]),
      )
      .map((party) => party.id),
    evidenceIds: evidenceIdsForText(sentence, evidence),
    legalDomainSignals: signalsForText(sentence, signals),
    sourceText: sentence,
    confidence: sentence.length > 50 ? "medium" : "low",
  }));

  if (events.length > 0) {
    return events;
  }

  return [
    {
      id: createId("event"),
      title: "Primary intake narrative",
      description: normalizeWhitespace(text),
      dateIds: dates.map((date) => date.id),
      partyIds: parties.map((party) => party.id),
      evidenceIds: evidence.map((item) => item.id),
      legalDomainSignals: signals,
      sourceText: text,
      confidence: text.length > 80 ? "medium" : "low",
    },
  ];
}

export async function normalizeIntake(
  input: CourtSimplifiedBrainInput,
): Promise<NormalizedIntake> {
  const rawText = normalizeWhitespace(input.rawUserText || "");
  const legalSignals = detectLightweightSignals(rawText);
  const userDomains = inferUserStatedDomains(legalSignals);
  const moneyAmounts = extractMoneyAmounts(rawText);
  const dates = extractDates(rawText);
  const parties = extractParties(rawText);
  const evidence = extractEvidence(rawText);
  const harms = extractHarms(rawText, userDomains, moneyAmounts);
  const desiredOutcomes = extractDesiredOutcomes(rawText, moneyAmounts);
  const events = extractEvents(rawText, legalSignals, evidence, dates, parties);
  const courtPath = detectCourtPath(rawText, input.courtPath);
  const province = detectProvince(rawText, input.province);
  const stage = detectStage(rawText, input.stage);

  const extractionWarnings = cleanList([
    rawText.length < 40
      ? "The intake is short, so legal interpretation should remain cautious until more facts are provided."
      : "",
    moneyAmounts.length > 0
      ? "Monetary references are treated as possible damages requests, not proof of debt, contract, or property loss."
      : "",
    dates.length === 0
      ? "No clear dates were extracted. Timeline, limitation, service, and deadline analysis will be weaker until dates are added."
      : "",
    events.length <= 1
      ? "Only one event was extracted. Add dates and sequence words to improve chronology analysis."
      : "",
    "Legal signals are preliminary intake indicators only. Final issue classification belongs to the structured cognition layer.",
  ]);

  return {
    id: createId("normalized"),
    version: "2.0.0",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    caseId: input.caseId,
    courtPath,
    province,
    stage,
    rawUserText: rawText,
    sourceType: input.sourceType || ("user-intake" as IntelligenceSourceType),
    parties,
    dates,
    moneyAmounts,
    events,
    harms,
    evidence,
    desiredOutcomes,
    userStatedClaimTypes: userDomains,
    systemDetectedClaimTypes: userDomains,
    unresolvedQuestions: cleanList([
      dates.length === 0 ? "What are the key dates in order?" : "",
      parties.length <= 1 ? "Who are all parties, institutions, witnesses, and decision-makers?" : "",
      evidence.length === 0 ? "What documents, records, messages, witnesses, or proof support the story?" : "",
    ]),
    extractionWarnings,
    confidence: confidenceFromScore(
      Math.min(
        100,
        rawText.length / 3 +
          legalSignals.length * 6 +
          evidence.length * 8 +
          dates.length * 4 +
          events.length * 5 +
          parties.length * 3,
      ),
    ),
  };
}