import {
  getReasoningProfilesForDomain,
  LegalReasoningProfile,
} from "../knowledge/legalReasoningProfiles";

export type CasePartnerRole = "user" | "assistant" | "system";

export type CasePartnerConfidence = "low" | "medium" | "high";

export type CasePartnerCourtArea =
  | "small-claims"
  | "family"
  | "civil"
  | "ltb"
  | "immigration"
  | "criminal-related"
  | "mixed"
  | "unknown";

export type CasePartnerProceduralStage =
  | "not-started"
  | "starting-case"
  | "responding"
  | "already-filed"
  | "conference"
  | "motion"
  | "settlement"
  | "disclosure"
  | "trial-preparation"
  | "trial"
  | "enforcement"
  | "appeal-or-review"
  | "urgent"
  | "not-sure"
  | "unknown";

export type CasePartnerQuestionPriority = "critical" | "high" | "medium" | "low";

export type CasePartnerConversationMessage = {
  role: CasePartnerRole;
  content: string;
};

export type CasePartnerInput = {
  message: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  mode?: string;
};

export type CasePartnerQuestion = {
  id: string;
  priority: CasePartnerQuestionPriority;
  question: string;
  reason: string;
  relatedTo:
    | "jurisdiction"
    | "timeline"
    | "evidence"
    | "procedure"
    | "parties"
    | "remedy"
    | "authority"
    | "risk"
    | "unknown";
};

export type CasePartnerFact = {
  id: string;
  text: string;
  source: "current-message" | "conversation" | "case-memory";
  confidence: CasePartnerConfidence;
  category:
    | "event"
    | "date"
    | "party"
    | "evidence"
    | "procedure"
    | "harm"
    | "remedy"
    | "legal-signal"
    | "unknown";
};

export type CasePartnerLegalSignal = {
  id: string;
  label: string;
  explanation: string;
  confidence: CasePartnerConfidence;
  needsVerification: boolean;
};

export type CasePartnerInferredActor = {
  id: string;
  label: string;
  actorType:
    | "police"
    | "crown"
    | "judge-or-justice"
    | "court-staff"
    | "municipality"
    | "ministry"
    | "school-board"
    | "cas"
    | "landlord"
    | "tenant"
    | "family-party"
    | "private-person"
    | "unknown";
  confidence: CasePartnerConfidence;
  whyInferred: string;
  needsConfirmation: boolean;
};

export type CasePartnerHypothesis = {
  id: string;
  label: string;
  explanation: string;
  confidence: CasePartnerConfidence;
  priority: CasePartnerQuestionPriority;
};

export type ConversationIntelligenceResult = {
  version: "1.3.0";
  generatedAt: string;
  userFacingAnswer: string;
  conversationFocus: {
    primaryGoal: string;
    userRole: string;
    courtArea: CasePartnerCourtArea;
    proceduralStage: CasePartnerProceduralStage;
    confidence: CasePartnerConfidence;
  };
  extractedFacts: CasePartnerFact[];
  inferredActors: CasePartnerInferredActor[];
  hypotheses: CasePartnerHypothesis[];
  legalSignals: CasePartnerLegalSignal[];
  missingInformation: string[];
  questions: CasePartnerQuestion[];
  selectedNextQuestion: CasePartnerQuestion | null;
  caseMemoryPatch: {
    summary: string;
    factsToAdd: string[];
    timelineItemsToReview: string[];
    evidenceToRequest: string[];
    legalIssuesToReview: string[];
    proceduralItemsToReview: string[];
    riskFlags: string[];
    userQuestionsAnswered: string[];
    outstandingQuestions: string[];
  };
  validation: {
    answerDecision:
      | "safe-to-answer"
      | "answer-with-caution"
      | "ask-follow-up-first"
      | "requires-human-review";
    confidence: CasePartnerConfidence;
    shouldAvoidDeadlineAdvice: boolean;
    shouldAvoidFinalConclusion: boolean;
    shouldAvoidFormRecommendation: boolean;
    needsLegalVerification: string[];
  };
};

type IssueKey =
  | "defamation"
  | "contract"
  | "debt"
  | "property-damage"
  | "negligence"
  | "personal-injury"
  | "harassment"
  | "employment"
  | "family-parenting"
  | "family-support"
  | "landlord-tenant"
  | "public-authority"
  | "bail-record"
  | "charter"
  | "unknown";

type IssueFramework = {
  key: IssueKey;
  label: string;
  plainMeaning: string;
  courtArea: CasePartnerCourtArea;
  confidence: CasePartnerConfidence;
  priority: CasePartnerQuestionPriority;
  elements: string[];
  proofNeeded: string[];
  commonDefences: string[];
  keyRisks: string[];
  firstQuestion: string;
  firstQuestionReason: string;
  nextQuestions: Array<{
    question: string;
    reason: string;
    relatedTo: CasePartnerQuestion["relatedTo"];
    priority: CasePartnerQuestionPriority;
  }>;
  reasoningProfile?: LegalReasoningProfile;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function countSignals(text: string, terms: string[]): number {
  const normalized = normalizeText(text);
  return terms.filter((term) => normalized.includes(term.toLowerCase())).length;
}

function confidenceFromSignals(count: number): CasePartnerConfidence {
  if (count >= 5) return "high";
  if (count >= 2) return "medium";
  return "low";
}

function getConversationText(conversation: CasePartnerConversationMessage[] = []): string {
  return conversation
    .slice(-12)
    .map((item) => item.content)
    .join(" ");
}

function wasQuestionAlreadyAsked(
  question: string,
  conversationText: string,
): boolean {
  const normalizedQuestion = normalizeText(question);
  const normalizedConversation = normalizeText(conversationText);

  if (!normalizedQuestion || !normalizedConversation) return false;

  const keyTerms = normalizedQuestion
    .replace(/[?.,]/g, "")
    .split(" ")
    .filter((word) => word.length > 4)
    .slice(0, 7);

  return (
    keyTerms.length >= 2 &&
    keyTerms.every((word) => normalizedConversation.includes(word))
  );
}

function getFirstProfile(domain: Parameters<typeof getReasoningProfilesForDomain>[0]) {
  return getReasoningProfilesForDomain(domain)[0];
}

function profileQuestionReason(profile: LegalReasoningProfile, question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("exactly") || lower.includes("word")) {
    return `This is the first investigation step for ${profile.label}: ${profile.investigationOrder[0]}`;
  }

  if (lower.includes("proof") || lower.includes("evidence")) {
    return `This matters because the highest evidence priorities include ${profile.evidencePriorities
      .slice(0, 3)
      .join(", ")}.`;
  }

  if (lower.includes("who")) {
    return `This helps identify the parties, witnesses, and burden points that need to be proven.`;
  }

  return `This follows the reasoning profile for ${profile.label} and helps move the case from a story into organized proof.`;
}

function profileQuestions(
  profile: LegalReasoningProfile,
  fallback: IssueFramework["nextQuestions"],
): IssueFramework["nextQuestions"] {
  const fromProfile = profile.firstQuestions.slice(1).map((question, index) => ({
    question,
    reason: profileQuestionReason(profile, question),
    relatedTo:
      question.toLowerCase().includes("proof") ||
      question.toLowerCase().includes("screenshot") ||
      question.toLowerCase().includes("record")
        ? "evidence"
        : question.toLowerCase().includes("who")
          ? "parties"
          : "unknown",
    priority: index === 0 ? "critical" : "high",
  })) satisfies IssueFramework["nextQuestions"];

  return unique([...fromProfile.map((item) => item.question), ...fallback.map((item) => item.question)])
    .map((question) => {
      const profileMatch = fromProfile.find((item) => item.question === question);
      const fallbackMatch = fallback.find((item) => item.question === question);
      return profileMatch || fallbackMatch;
    })
    .filter((item): item is IssueFramework["nextQuestions"][number] => Boolean(item));
}

function enrichFrameworkWithProfile(
  framework: IssueFramework,
  profile?: LegalReasoningProfile,
): IssueFramework {
  if (!profile) return framework;

  const firstQuestion = profile.firstQuestions[0] || framework.firstQuestion;

  return {
    ...framework,
    reasoningProfile: profile,
    elements: unique([...framework.elements, ...profile.burdenFocus]).slice(0, 10),
    proofNeeded: unique([...profile.evidencePriorities, ...framework.proofNeeded]).slice(0, 12),
    keyRisks: unique([
      ...framework.keyRisks,
      ...profile.proceduralWatchPoints,
      ...profile.judicialConcerns,
      ...profile.userMistakesToPrevent,
    ]).slice(0, 14),
    firstQuestion,
    firstQuestionReason:
      firstQuestion === framework.firstQuestion
        ? framework.firstQuestionReason
        : profileQuestionReason(profile, firstQuestion),
    nextQuestions: profileQuestions(profile, framework.nextQuestions),
  };
}

function extractDateSignals(message: string): string[] {
  const dates: string[] = [];

  const numericDates = message.match(
    /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
  );

  if (numericDates) dates.push(...numericDates);

  const monthDates = message.match(
    /\b(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+\d{1,2}(?:,\s*\d{4})?\b/gi,
  );

  if (monthDates) dates.push(...monthDates);

  if (
    includesAny(message, [
      "yesterday",
      "today",
      "last week",
      "last month",
      "last year",
      "a year ago",
      "two years ago",
      "years ago",
      "recently",
      "before",
      "after",
      "then",
    ])
  ) {
    dates.push("relative date mentioned");
  }

  return unique(dates);
}

function inferCourtArea(message: string): CasePartnerCourtArea {
  const family = countSignals(message, [
    "custody",
    "parenting",
    "child support",
    "spousal support",
    "family court",
    "case conference",
    "access",
    "decision-making",
    "divorce",
  ]);

  const ltb = countSignals(message, [
    "landlord",
    "tenant",
    "rent",
    "eviction",
    "lease",
    "locked me out",
    "ltb",
    "tribunal",
  ]);

  const smallClaims = countSignals(message, [
    "small claims",
    "plaintiff's claim",
    "plaintiffs claim",
    "form 7a",
    "settlement conference",
    "money owed",
    "damaged my car",
    "repair cost",
  ]);

  const criminalRelated = countSignals(message, [
    "crown",
    "police",
    "bail",
    "arrested",
    "charges",
    "criminal",
    "surety",
    "release order",
    "detained",
    "prosecutor",
  ]);

  const civil = countSignals(message, [
    "lawsuit",
    "statement of claim",
    "civil",
    "negligence",
    "defamation",
    "contract",
    "damages",
    "sue",
    "false statement",
    "third party",
    "reputation",
  ]);

  const immigration = countSignals(message, [
    "immigration",
    "refugee",
    "ircc",
    "removal",
  ]);

  const scores: Array<[CasePartnerCourtArea, number]> = [
    ["family", family],
    ["ltb", ltb],
    ["small-claims", smallClaims],
    ["criminal-related", criminalRelated],
    ["civil", civil],
    ["immigration", immigration],
  ];

  const matched = scores
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (matched.length === 0) return "unknown";
  if (matched.length > 1 && matched[0][1] === matched[1][1]) return "mixed";

  return matched[0][0];
}

function inferProceduralStage(message: string): CasePartnerProceduralStage {
  if (includesAny(message, ["urgent", "emergency", "immediate", "without notice"])) {
    return "urgent";
  }

  if (includesAny(message, ["appeal", "review", "judicial review"])) {
    return "appeal-or-review";
  }

  if (includesAny(message, ["trial", "trial record", "trial package"])) {
    return "trial-preparation";
  }

  if (includesAny(message, ["motion", "notice of motion"])) {
    return "motion";
  }

  if (includesAny(message, ["case conference", "settlement conference", "conference"])) {
    return "conference";
  }

  if (includesAny(message, ["already filed", "i filed", "served", "court file number", "issued"])) {
    return "already-filed";
  }

  if (includesAny(message, ["defence", "defense", "responding", "answer", "i was served"])) {
    return "responding";
  }

  if (includesAny(message, ["want to sue", "start a claim", "starting", "not filed", "thinking of suing", "can i sue"])) {
    return "starting-case";
  }

  return "unknown";
}

function detectIssueFrameworks(message: string): IssueFramework[] {
  const frameworks: IssueFramework[] = [];

  const defamationSignals = countSignals(message, [
    "defamation",
    "defamatory",
    "false statement",
    "false statements",
    "said about me",
    "lied about me",
    "third party",
    "sent to someone",
    "posted",
    "reputation",
    "slander",
    "libel",
    "accused me",
    "spread lies",
  ]);

  if (defamationSignals > 0) {
    frameworks.push(
      enrichFrameworkWithProfile(
        {
          key: "defamation",
          label: "Possible defamation / reputation harm",
          plainMeaning:
            "This is a possible reputation-harm issue. The case needs to focus on the exact statement, who received it, whether it referred to you, what proof exists, and what harm followed.",
          courtArea: "civil",
          confidence: confidenceFromSignals(defamationSignals),
          priority: "critical",
          elements: [
            "The exact words or meaning of the statement.",
            "The statement was about or identifiable as referring to you.",
            "The statement was communicated to at least one third party.",
            "The statement could lower your reputation in the eyes of a reasonable person.",
            "The statement was false or misleading, subject to possible defences.",
          ],
          proofNeeded: [
            "The exact statement, not just a summary.",
            "Who made the statement.",
            "Who received or saw the statement.",
            "Date and method of publication, such as text, email, post, report, or letter.",
            "Screenshots, messages, emails, witnesses, or records proving publication.",
            "What harm happened afterward.",
          ],
          commonDefences: [
            "Truth / justification.",
            "Fair comment or opinion.",
            "Qualified privilege.",
            "Absolute privilege in certain legal or court-related settings.",
            "Responsible communication on a matter of public interest.",
            "No publication, no identification, or no reputational harm.",
          ],
          keyRisks: [
            "Exact wording matters. A paraphrase may not be enough.",
            "Statements made in court or some legal processes may involve privilege issues.",
            "The forum and remedy need verification before recommending a claim path.",
            "Damages must be connected to evidence, not just upset feelings.",
          ],
          firstQuestion: "What exactly was said about you, word for word if possible?",
          firstQuestionReason:
            "For defamation, the exact words are the foundation. CourtSimplified needs the actual statement before it can assess publication, identification, meaning, possible defences, and harm.",
          nextQuestions: [
            {
              priority: "critical",
              relatedTo: "parties",
              question: "Who made the statement, and who received it or saw it?",
              reason:
                "Defamation usually requires publication to someone other than you. The speaker and recipient are central facts.",
            },
            {
              priority: "high",
              relatedTo: "evidence",
              question: "Do you have a screenshot, message, email, letter, post, recording, or witness who can prove the statement was sent?",
              reason:
                "The system needs to connect the alleged statement to proof before treating it as usable evidence.",
            },
          ],
        },
        getFirstProfile("defamation"),
      ),
    );
  }

  const contractSignals = countSignals(message, [
    "contract",
    "agreement",
    "breach",
    "promised",
    "paid",
    "did not pay",
    "owed me",
    "invoice",
    "services",
  ]);

  if (contractSignals > 0) {
    frameworks.push(
      enrichFrameworkWithProfile(
        {
          key: "contract",
          label: "Possible contract / payment dispute",
          plainMeaning:
            "This appears to involve an agreement, payment issue, service dispute, or breach.",
          courtArea: "small-claims",
          confidence: confidenceFromSignals(contractSignals),
          priority: "high",
          elements: [
            "There was an agreement.",
            "The terms can be proven.",
            "One side performed or was ready to perform.",
            "The other side breached.",
            "A loss or remedy can be proven.",
          ],
          proofNeeded: [
            "Written contract, texts, invoices, emails, receipts, bank records, or witnesses.",
            "Proof of payment or non-payment.",
            "Proof of what work or goods were provided.",
            "Damages calculation.",
          ],
          commonDefences: [
            "No agreement.",
            "Terms were different.",
            "Work was defective.",
            "Payment was already made.",
            "No loss proven.",
          ],
          keyRisks: [
            "The terms must be clear enough.",
            "Damages need records.",
            "Limitation dates may matter.",
          ],
          firstQuestion: "What was the agreement, and what exactly did the other person fail to do?",
          firstQuestionReason:
            "Contract and payment disputes depend on the terms of the agreement, breach, and proof of loss.",
          nextQuestions: [
            {
              priority: "high",
              relatedTo: "evidence",
              question: "What proof do you have of the agreement, such as messages, invoices, receipts, or emails?",
              reason:
                "The agreement and terms need to be proven before the system can assess strength.",
            },
          ],
        },
        getFirstProfile("contract"),
      ),
    );
  }

  const propertySignals = countSignals(message, [
    "damaged my car",
    "property damage",
    "repair",
    "broken",
    "destroyed",
    "vehicle",
    "damage to my",
  ]);

  if (propertySignals > 0) {
    frameworks.push(
      enrichFrameworkWithProfile(
        {
          key: "property-damage",
          label: "Possible property damage claim",
          plainMeaning:
            "This appears to involve damage to property and a possible request for repair costs or compensation.",
          courtArea: "small-claims",
          confidence: confidenceFromSignals(propertySignals),
          priority: "high",
          elements: [
            "What property was damaged.",
            "Who caused the damage.",
            "How the damage happened.",
            "Repair cost or loss value.",
            "Proof connecting the other person to the damage.",
          ],
          proofNeeded: [
            "Photos.",
            "Repair estimates or invoices.",
            "Witnesses.",
            "Messages or admissions.",
            "Timeline.",
          ],
          commonDefences: [
            "They did not cause it.",
            "Damage already existed.",
            "Cost is too high.",
            "No proof of loss.",
          ],
          keyRisks: [
            "Causation must be proven.",
            "Repair cost must be documented.",
          ],
          firstQuestion: "What property was damaged, and what proof shows the other person caused it?",
          firstQuestionReason:
            "Property damage cases usually turn on causation, photos, repair costs, and any admissions.",
          nextQuestions: [
            {
              priority: "high",
              relatedTo: "evidence",
              question: "Do you have photos, repair estimates, invoices, messages, or witnesses?",
              reason:
                "Those records help prove both damage and amount claimed.",
            },
          ],
        },
        getFirstProfile("property-damage"),
      ),
    );
  }

  const familySignals = countSignals(message, [
    "custody",
    "parenting",
    "decision-making",
    "child support",
    "access",
    "case conference",
    "family court",
    "mother",
    "father",
  ]);

  if (familySignals > 0) {
    frameworks.push(
      enrichFrameworkWithProfile(
        {
          key: "family-parenting",
          label: "Possible family parenting/support issue",
          plainMeaning:
            "This appears to involve parenting, support, safety, disclosure, or family court procedure.",
          courtArea: "family",
          confidence: confidenceFromSignals(familySignals),
          priority: "high",
          elements: [
            "Current order or agreement.",
            "Child-related facts.",
            "Current schedule or status quo.",
            "Safety or risk concerns.",
            "Requested change or order.",
            "Evidence supporting the request.",
          ],
          proofNeeded: [
            "Current orders.",
            "Messages.",
            "School/medical records.",
            "Payment records.",
            "Police/CAS records if relevant.",
            "Timeline.",
          ],
          commonDefences: [
            "Status quo should continue.",
            "No material change.",
            "Request is not in the child's best interests.",
            "Evidence is incomplete.",
          ],
          keyRisks: [
            "Court needs child-focused facts.",
            "Support requires income/payment proof.",
            "Urgency must be supported by evidence.",
          ],
          firstQuestion: "What order or arrangement exists right now, and what are you trying to change?",
          firstQuestionReason:
            "Family cases depend heavily on the current order/status quo and the specific child-focused outcome requested.",
          nextQuestions: [
            {
              priority: "high",
              relatedTo: "procedure",
              question: "Is there already a court order, agreement, upcoming conference, motion, or court date?",
              reason:
                "The next step depends on the current family court stage.",
            },
          ],
        },
        getFirstProfile("family-parenting"),
      ),
    );
  }

  const publicSignals = countSignals(message, [
    "crown",
    "police",
    "government",
    "ministry",
    "public authority",
    "clpa",
    "crown liability",
    "prosecutor",
    "bail",
    "charter",
  ]);

  if (publicSignals > 0) {
    frameworks.push(
      enrichFrameworkWithProfile(
        {
          key: "public-authority",
          label: "Possible public-authority / Crown / police issue",
          plainMeaning:
            "This appears to involve a government, police, Crown, court, or institutional actor and needs careful threshold screening.",
          courtArea: "civil",
          confidence: confidenceFromSignals(publicSignals),
          priority: "critical",
          elements: [
            "Which public actor was involved.",
            "What they did or failed to do.",
            "Whether the conduct was operational, discretionary, judicial, prosecutorial, or administrative.",
            "Causation between the conduct and the harm.",
            "Notice, leave, limitation, immunity, jurisdiction, and proper defendant issues.",
          ],
          proofNeeded: [
            "Chronology.",
            "Court records.",
            "Police/Crown records.",
            "Transcripts or audio.",
            "Orders or endorsements.",
            "Correspondence.",
            "Proof of harm.",
          ],
          commonDefences: [
            "Immunity.",
            "No duty of care.",
            "Protected discretion.",
            "Collateral attack.",
            "Wrong defendant.",
            "No causation.",
            "Limitation/notice problem.",
          ],
          keyRisks: [
            "Public-authority claims can be dismissed early if not framed correctly.",
            "CourtSimplified must not treat disagreement with a decision as automatically actionable.",
            "Rules, leave, notice, and limitation periods must be verified.",
          ],
          firstQuestion: "Which public actor is involved, and what exactly did they do or fail to do?",
          firstQuestionReason:
            "Public-authority cases require separating operational conduct from protected decision-making and identifying each actor's role.",
          nextQuestions: [
            {
              priority: "critical",
              relatedTo: "procedure",
              question: "Has anything already been filed, ordered, appealed, reviewed, or decided by a court or tribunal?",
              reason:
                "Public-authority and court-process issues can involve jurisdiction, appeal, review, collateral attack, and limitation risks.",
            },
            {
              priority: "high",
              relatedTo: "evidence",
              question: "What records do you have: transcript, audio, disclosure, order, endorsement, police records, Crown correspondence, or court file documents?",
              reason:
                "The record is often central to proving what happened and what was relied on.",
            },
          ],
        },
        getFirstProfile("civil-institutional-liability"),
      ),
    );
  }

  return frameworks.sort((a, b) => {
    const priorityScore: Record<CasePartnerQuestionPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return priorityScore[b.priority] - priorityScore[a.priority];
  });
}

function inferActors(message: string): CasePartnerInferredActor[] {
  const actors: CasePartnerInferredActor[] = [];

  function addActor(
    label: string,
    actorType: CasePartnerInferredActor["actorType"],
    confidence: CasePartnerConfidence,
    whyInferred: string,
    needsConfirmation = true,
  ) {
    if (actors.some((actor) => actor.actorType === actorType && actor.label === label)) return;

    actors.push({
      id: createId("actor"),
      label,
      actorType,
      confidence,
      whyInferred,
      needsConfirmation,
    });
  }

  if (includesAny(message, ["police", "officer", "arrested", "charged", "investigation"])) {
    addActor(
      "Police or investigating officer",
      "police",
      "medium",
      "The user mentioned police, arrest, charges, or investigation facts.",
    );
  }

  if (includesAny(message, ["crown", "prosecutor", "crown attorney", "opposed bail"])) {
    addActor(
      "Crown prosecutor",
      "crown",
      "medium",
      "The user mentioned Crown/prosecutor involvement or Crown position.",
    );
  }

  if (includesAny(message, ["judge", "justice", "jp", "justice of the peace", "bail hearing"])) {
    addActor(
      "Judge or justice of the peace",
      "judge-or-justice",
      "medium",
      "The user mentioned a judge, justice, justice of the peace, or hearing decision.",
    );
  }

  if (includesAny(message, ["court staff", "clerk", "recording", "transcript", "missing tape", "audio"])) {
    addActor(
      "Court staff or court records process",
      "court-staff",
      "medium",
      "The user mentioned court records, transcript, audio, recording, clerk, or missing record issues.",
    );
  }

  if (includesAny(message, ["cas", "children's aid", "childrens aid", "child protection"])) {
    addActor(
      "Children's Aid / child protection agency",
      "cas",
      "medium",
      "The user explicitly mentioned CAS, Children's Aid, or child protection facts.",
    );
  }

  if (includesAny(message, ["landlord"])) {
    addActor("Landlord", "landlord", "high", "The user mentioned a landlord.", false);
  }

  if (includesAny(message, ["tenant"])) {
    addActor("Tenant", "tenant", "high", "The user mentioned a tenant.", false);
  }

  if (includesAny(message, ["ex", "mother", "father", "spouse", "child support", "custody", "parenting"])) {
    addActor(
      "Family party",
      "family-party",
      "medium",
      "The user mentioned family-law relationship terms.",
    );
  }

  if (
    includesAny(message, [
      "someone",
      "person",
      "friend",
      "neighbour",
      "neighbor",
      "coworker",
      "co-worker",
      "employer",
      "third party",
      "private person",
    ])
  ) {
    addActor(
      "Private person",
      "private-person",
      "medium",
      "The user described a private person or third-party communication.",
    );
  }

  return actors;
}

function extractFacts(
  message: string,
  actors: CasePartnerInferredActor[],
  frameworks: IssueFramework[],
): CasePartnerFact[] {
  const facts: CasePartnerFact[] = [];
  const dates = extractDateSignals(message);

  for (const date of dates) {
    facts.push({
      id: createId("fact"),
      text: `Date or time signal mentioned: ${date}`,
      source: "current-message",
      confidence: date === "relative date mentioned" ? "low" : "medium",
      category: "date",
    });
  }

  if (
    includesAny(message, [
      "text",
      "message",
      "email",
      "screenshot",
      "recording",
      "video",
      "photo",
      "bank",
      "e-transfer",
      "transcript",
      "audio",
      "court paper",
      "order",
      "letter",
      "post",
      "social media",
    ])
  ) {
    facts.push({
      id: createId("fact"),
      text: "The user appears to have or reference evidence that may need to be organized.",
      source: "current-message",
      confidence: "medium",
      category: "evidence",
    });
  }

  for (const actor of actors) {
    facts.push({
      id: createId("fact"),
      text: `Possible actor identified: ${actor.label}`,
      source: "current-message",
      confidence: actor.confidence,
      category: "party",
    });
  }

  for (const framework of frameworks) {
    facts.push({
      id: createId("fact"),
      text: `Possible legal issue identified: ${framework.label}`,
      source: "current-message",
      confidence: framework.confidence,
      category: "legal-signal",
    });

    if (framework.reasoningProfile) {
      facts.push({
        id: createId("fact"),
        text: `Reasoning profile applied: ${framework.reasoningProfile.label}`,
        source: "current-message",
        confidence: "high",
        category: "legal-signal",
      });
    }
  }

  if (includesAny(message, ["filed", "served", "conference", "motion", "trial", "appeal", "order"])) {
    facts.push({
      id: createId("fact"),
      text: "The message contains procedural-stage information that should be checked against the case timeline.",
      source: "current-message",
      confidence: "medium",
      category: "procedure",
    });
  }

  if (includesAny(message, ["damages", "loss", "harm", "stress", "money", "cost", "injury", "missed work", "reputation"])) {
    facts.push({
      id: createId("fact"),
      text: "The user mentions harm, loss, damages, reputation impact, or other consequences.",
      source: "current-message",
      confidence: "medium",
      category: "harm",
    });
  }

  if (facts.length === 0 && message.trim()) {
    facts.push({
      id: createId("fact"),
      text: message.trim().slice(0, 500),
      source: "current-message",
      confidence: "low",
      category: "unknown",
    });
  }

  return facts;
}

function detectLegalSignals(
  message: string,
  frameworks: IssueFramework[],
): CasePartnerLegalSignal[] {
  const signals: CasePartnerLegalSignal[] = [];

  for (const framework of frameworks) {
    signals.push({
      id: createId("signal"),
      label: framework.label,
      explanation: framework.plainMeaning,
      confidence: framework.confidence,
      needsVerification: true,
    });

    if (framework.reasoningProfile) {
      signals.push({
        id: createId("signal"),
        label: `${framework.reasoningProfile.label} reasoning profile`,
        explanation:
          "CourtSimplified loaded a shared legal reasoning profile for this issue so the conversation, evidence review, and investigation can follow a consistent case-building path.",
        confidence: "high",
        needsVerification: false,
      });
    }
  }

  if (includesAny(message, ["limitation", "limitations", "two years", "deadline to sue", "out of time"])) {
    signals.push({
      id: createId("signal"),
      label: "Limitation period issue",
      explanation:
        "Timing may matter. CourtSimplified should verify jurisdiction, dates, discovery, defendant type, and the legal framework before giving deadline guidance.",
      confidence: "medium",
      needsVerification: true,
    });
  }

  if (includesAny(message, ["privilege", "court", "police report", "employer", "cas", "children's aid"])) {
    signals.push({
      id: createId("signal"),
      label: "Context / privilege / recipient issue",
      explanation:
        "The setting and recipient may affect the legal analysis, possible defences, and next steps.",
      confidence: "medium",
      needsVerification: true,
    });
  }

  return signals;
}

function buildHypotheses(frameworks: IssueFramework[]): CasePartnerHypothesis[] {
  return frameworks.map((framework) => {
    const profileText = framework.reasoningProfile
      ? ` The reasoning profile will prioritize: ${framework.reasoningProfile.investigationOrder
          .slice(0, 3)
          .join("; ")}.`
      : "";

    return {
      id: createId("hypothesis"),
      label: framework.label,
      explanation:
        `${framework.plainMeaning} The key issues to investigate are: ${framework.elements
          .slice(0, 3)
          .join("; ")}.${profileText}`,
      confidence: framework.confidence,
      priority: framework.priority,
    };
  });
}

function buildMissingInformation(args: {
  message: string;
  frameworks: IssueFramework[];
  stage: CasePartnerProceduralStage;
}): string[] {
  const missing: string[] = [];

  const hasProvince = includesAny(args.message, [
    "ontario",
    "alberta",
    "british columbia",
    "quebec",
    "manitoba",
    "saskatchewan",
    "nova scotia",
    "new brunswick",
    "province",
    "canada",
  ]);

  if (!hasProvince) missing.push("province or jurisdiction");

  if (extractDateSignals(args.message).length === 0) {
    missing.push("important dates or timeline");
  }

  if (
    !includesAny(args.message, [
      "filed",
      "served",
      "not filed",
      "court",
      "order",
      "conference",
      "motion",
      "trial",
      "hearing",
      "no court yet",
      "not in court",
    ])
  ) {
    missing.push("current court/procedural stage");
  }

  if (
    !includesAny(args.message, [
      "text",
      "email",
      "screenshot",
      "record",
      "photo",
      "video",
      "document",
      "bank",
      "transcript",
      "evidence",
      "audio",
      "order",
      "letter",
      "post",
      "witness",
    ])
  ) {
    missing.push("what evidence exists");
  }

  if (
    !includesAny(args.message, [
      "want",
      "need",
      "asking",
      "seeking",
      "sue",
      "dismiss",
      "order",
      "money",
      "custody",
      "support",
      "appeal",
      "apology",
      "retraction",
      "damages",
    ])
  ) {
    missing.push("what outcome the user wants");
  }

  for (const framework of args.frameworks.slice(0, 2)) {
    if (framework.key === "defamation") {
      if (!includesAny(args.message, ["said", "wrote", "sent", "posted", "statement", "words"])) {
        missing.push("exact defamatory words");
      }

      if (!includesAny(args.message, ["third party", "sent to", "posted", "published", "told", "received", "saw"])) {
        missing.push("publication recipient");
      }

      if (!includesAny(args.message, ["false", "lie", "untrue", "not true", "misleading"])) {
        missing.push("why the statement is false or misleading");
      }

      if (!includesAny(args.message, ["harm", "lost", "reputation", "job", "stress", "money", "damage"])) {
        missing.push("reputation or damages impact");
      }
    }

    if (framework.reasoningProfile) {
      for (const point of framework.reasoningProfile.investigationOrder.slice(0, 3)) {
        if (!includesAny(args.message, point.toLowerCase().split(" ").filter((word) => word.length > 5))) {
          missing.push(`reasoning profile check: ${point}`);
        }
      }
    }
  }

  return unique(missing).slice(0, 12);
}

function buildQuestions(args: {
  missing: string[];
  frameworks: IssueFramework[];
  signals: CasePartnerLegalSignal[];
  actors: CasePartnerInferredActor[];
  conversationText: string;
}): CasePartnerQuestion[] {
  const questions: CasePartnerQuestion[] = [];

  function pushQuestion(question: CasePartnerQuestion) {
    if (wasQuestionAlreadyAsked(question.question, args.conversationText)) return;
    if (questions.some((existing) => existing.question === question.question)) return;
    questions.push(question);
  }

  const primary = args.frameworks[0];

  if (primary) {
    pushQuestion({
      id: createId("question"),
      priority: primary.priority,
      question: primary.firstQuestion,
      reason: primary.firstQuestionReason,
      relatedTo:
        primary.key === "defamation"
          ? "evidence"
          : primary.key === "public-authority"
            ? "parties"
            : "unknown",
    });

    for (const item of primary.nextQuestions) {
      pushQuestion({
        id: createId("question"),
        priority: item.priority,
        question: item.question,
        reason: item.reason,
        relatedTo: item.relatedTo,
      });
    }
  }

  if (args.missing.includes("province or jurisdiction")) {
    pushQuestion({
      id: createId("question"),
      priority: primary ? "medium" : "critical",
      question: "What province or territory did this happen in?",
      reason:
        "The province matters because court procedure, limitation rules, available remedies, and public-authority rules can change by jurisdiction.",
      relatedTo: "jurisdiction",
    });
  }

  if (args.actors.length > 0 && args.actors.some((actor) => actor.needsConfirmation)) {
    const labels = args.actors.slice(0, 3).map((actor) => actor.label).join(", ");

    pushQuestion({
      id: createId("question"),
      priority: "medium",
      question: `From what you described, it sounds like this may involve ${labels}. Is that right, or is the main concern with someone else?`,
      reason:
        "CourtSimplified should confirm the people or institutions involved before building the case structure.",
      relatedTo: "parties",
    });
  }

  if (args.missing.includes("important dates or timeline")) {
    pushQuestion({
      id: createId("question"),
      priority: "high",
      question: "What are the main dates, including when the problem happened and when you first found out about it?",
      reason:
        "Dates are needed for the timeline, limitation review, credibility, and procedural next steps.",
      relatedTo: "timeline",
    });
  }

  if (args.missing.includes("what evidence exists")) {
    pushQuestion({
      id: createId("question"),
      priority: "high",
      question: "What proof do you already have, such as messages, emails, screenshots, witnesses, court papers, recordings, receipts, or transcripts?",
      reason:
        "CourtSimplified needs to connect each important fact to proof instead of treating the story as unsupported allegations.",
      relatedTo: "evidence",
    });
  }

  if (args.missing.includes("current court/procedural stage")) {
    pushQuestion({
      id: createId("question"),
      priority: "medium",
      question: "Has anything already been filed, served, ordered, scheduled, or decided by a court or tribunal?",
      reason:
        "The next step depends on the current stage. The system should not suggest forms, deadlines, or workflow steps until that is clear.",
      relatedTo: "procedure",
    });
  }

  if (args.missing.includes("what outcome the user wants")) {
    pushQuestion({
      id: createId("question"),
      priority: "medium",
      question: "What are you trying to get or fix through the legal process?",
      reason:
        "The outcome helps identify the correct remedy, documents, evidence, and next workflow step.",
      relatedTo: "remedy",
    });
  }

  return questions;
}

function selectNextQuestion(questions: CasePartnerQuestion[]): CasePartnerQuestion | null {
  const priorityOrder: CasePartnerQuestionPriority[] = ["critical", "high", "medium", "low"];

  for (const priority of priorityOrder) {
    const found = questions.find((question) => question.priority === priority);
    if (found) return found;
  }

  return questions[0] ?? null;
}

function buildPrimaryGoal(args: {
  frameworks: IssueFramework[];
  signals: CasePartnerLegalSignal[];
  missing: string[];
}): string {
  if (args.frameworks.length > 0) {
    const profile = args.frameworks[0].reasoningProfile;
    return profile
      ? `Investigate using reasoning profile: ${profile.label}`
      : `Investigate: ${args.frameworks[0].label}`;
  }

  if (args.signals.length > 0) {
    return "Clarify and organize the user's legal issue into a structured case file.";
  }

  if (args.missing.length > 0) {
    return "Gather the missing facts needed to understand the case.";
  }

  return "Continue organizing the case.";
}

function buildUserFacingAnswer(args: {
  courtArea: CasePartnerCourtArea;
  stage: CasePartnerProceduralStage;
  actors: CasePartnerInferredActor[];
  frameworks: IssueFramework[];
  signals: CasePartnerLegalSignal[];
  nextQuestion: CasePartnerQuestion | null;
}): string {
  const primary = args.frameworks[0];

  if (primary) {
    const elementsText = primary.elements
      .slice(0, 4)
      .map((element) => `- ${element}`)
      .join("\n");

    const proofText = primary.proofNeeded
      .slice(0, 4)
      .map((proof) => `- ${proof}`)
      .join("\n");

    const profileText = primary.reasoningProfile
      ? `\n\nCourtSimplified is also applying the ${primary.reasoningProfile.label} reasoning profile, which means it will check investigation order, proof priorities, burden points, contradictions, credibility risks, procedural watch points, judicial concerns, and likely opposing arguments.`
      : "";

    const riskText = primary.keyRisks.length
      ? `\n\nImportant caution: ${primary.keyRisks[0]}`
      : "";

    const questionText = args.nextQuestion
      ? `\n\nMy next question is: ${args.nextQuestion.question}\n\nI'm asking because ${args.nextQuestion.reason}`
      : "\n\nTell me the exact facts, the proof you have, the main dates, and what you want the legal process to fix.";

    return [
      `I understand. This looks like ${primary.label.toLowerCase()}.`,
      primary.plainMeaning,
      profileText,
      "",
      "The key things CourtSimplified needs to sort out are:",
      elementsText,
      "",
      "The proof that will usually matter includes:",
      proofText,
      riskText,
      questionText,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const opening =
    args.signals.length > 0
      ? `I can see some possible legal issues to organize, including ${args.signals
          .map((signal) => signal.label.toLowerCase())
          .slice(0, 3)
          .join(", ")}.`
      : "I can help turn this into a structured case file.";

  const actorText =
    args.actors.length > 0
      ? `\n\nPossible people or institutions involved include ${args.actors
          .map((actor) => actor.label)
          .slice(0, 3)
          .join(", ")}.`
      : "";

  const courtText =
    args.courtArea !== "unknown"
      ? `\n\nThis appears connected to ${args.courtArea.replace("-", " ")}.`
      : "\n\nI do not want to assume the court path yet.";

  const stageText =
    args.stage !== "unknown"
      ? ` The procedural stage may be ${args.stage.replace("-", " ")}.`
      : "";

  const questionText = args.nextQuestion
    ? `\n\nMy next question is: ${args.nextQuestion.question}\n\nI'm asking because ${args.nextQuestion.reason}`
    : "\n\nTell me the main dates, the proof you have, and what you want the legal process to fix.";

  return `${opening}${actorText}${courtText}${stageText}${questionText}`;
}

function buildUserRole(message: string): string {
  if (includesAny(message, ["i want to sue", "my claim", "plaintiff", "applicant"])) {
    return "potential claimant/applicant";
  }

  if (includesAny(message, ["i was served", "defendant", "respondent", "answer", "defence"])) {
    return "responding party";
  }

  return "unknown";
}

export function buildConversationIntelligence(
  input: CasePartnerInput,
): ConversationIntelligenceResult {
  const message = clean(input.message);
  const conversationText = getConversationText(input.conversation);
  const combinedText = `${conversationText} ${message}`;

  const frameworks = detectIssueFrameworks(combinedText);
  const courtArea =
    frameworks[0]?.courtArea && frameworks[0].courtArea !== "unknown"
      ? frameworks[0].courtArea
      : inferCourtArea(combinedText);

  const stage = inferProceduralStage(combinedText);
  const inferredActors = inferActors(combinedText);
  const extractedFacts = extractFacts(message, inferredActors, frameworks);
  const legalSignals = detectLegalSignals(combinedText, frameworks);

  const hypotheses = buildHypotheses(frameworks);

  const missingInformation = buildMissingInformation({
    message: combinedText,
    frameworks,
    stage,
  });

  const questions = buildQuestions({
    missing: missingInformation,
    frameworks,
    signals: legalSignals,
    actors: inferredActors,
    conversationText,
  });

  const selectedNextQuestion = selectNextQuestion(questions);

  const confidence = confidenceFromSignals(
    extractedFacts.length +
      inferredActors.length +
      hypotheses.length +
      legalSignals.length -
      Math.min(missingInformation.length, 4),
  );

  const answer = buildUserFacingAnswer({
    courtArea,
    stage,
    actors: inferredActors,
    frameworks,
    signals: legalSignals,
    nextQuestion: selectedNextQuestion,
  });

  return {
    version: "1.3.0",
    generatedAt: nowIso(),
    userFacingAnswer: answer,
    conversationFocus: {
      primaryGoal: buildPrimaryGoal({
        frameworks,
        signals: legalSignals,
        missing: missingInformation,
      }),
      userRole: buildUserRole(combinedText),
      courtArea,
      proceduralStage: stage,
      confidence,
    },
    extractedFacts,
    inferredActors,
    hypotheses,
    legalSignals,
    missingInformation,
    questions,
    selectedNextQuestion,
    caseMemoryPatch: {
      summary: message.slice(0, 500),
      factsToAdd: [
        ...extractedFacts.map((fact) => fact.text),
        ...inferredActors.map(
          (actor) => `Possible actor: ${actor.label} (${actor.actorType})`,
        ),
        ...hypotheses.map((hypothesis) => `Hypothesis: ${hypothesis.label}`),
      ],
      timelineItemsToReview: extractedFacts
        .filter((fact) => fact.category === "date" || fact.category === "event")
        .map((fact) => fact.text),
      evidenceToRequest: questions
        .filter((question) => question.relatedTo === "evidence")
        .map((question) => question.question),
      legalIssuesToReview: [
        ...legalSignals.map((signal) => signal.label),
        ...hypotheses.map((hypothesis) => hypothesis.label),
      ],
      proceduralItemsToReview:
        stage !== "unknown" ? [`Possible procedural stage: ${stage}`] : [],
      riskFlags: unique([
        ...legalSignals
          .filter((signal) => signal.needsVerification)
          .map((signal) => `${signal.label} needs legal verification.`),
        ...frameworks.flatMap((framework) => framework.keyRisks),
        ...frameworks.flatMap((framework) =>
          framework.reasoningProfile
            ? [
                ...framework.reasoningProfile.proceduralWatchPoints,
                ...framework.reasoningProfile.credibilityChecks,
                ...framework.reasoningProfile.contradictionChecks,
              ]
            : [],
        ),
        ...missingInformation.map((item) => `Missing: ${item}`),
      ]),
      userQuestionsAnswered: [],
      outstandingQuestions: questions.map((question) => question.question),
    },
    validation: {
      answerDecision:
        selectedNextQuestion || missingInformation.length > 0
          ? "ask-follow-up-first"
          : "answer-with-caution",
      confidence,
      shouldAvoidDeadlineAdvice: true,
      shouldAvoidFinalConclusion: true,
      shouldAvoidFormRecommendation: true,
      needsLegalVerification: legalSignals
        .filter((signal) => signal.needsVerification)
        .map((signal) => signal.label),
    },
  };
}