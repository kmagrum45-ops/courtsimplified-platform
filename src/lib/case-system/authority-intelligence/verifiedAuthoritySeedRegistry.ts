import {
  AuthorityRegistryModel,
  VerifiedAuthorityEntry,
} from "./authorityRegistryArchitecture";

const NOW = "2026-06-30T00:00:00.000Z";

export const VERIFIED_AUTHORITY_SEED_ENTRIES: VerifiedAuthorityEntry[] = [
  {
    id: "authority_defamation_grant_v_torstar_2009_scc_61",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "needs-context",
    title: "Grant v. Torstar Corp.",
    shortTitle: "Grant",
    citation: "Grant v. Torstar Corp., 2009 SCC 61",
    neutralCitation: "2009 SCC 61",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 2009,
    bindingWeight: "binding",
    importanceScore: 98,
    confidence: "high",
    courtPaths: ["civil", "small-claims"],
    legalDomains: ["defamation"],
    proceduralStages: ["pre-litigation", "starting-case", "responding", "motion", "trial"],
    topicTags: ["defamation", "responsible communication", "public interest"],
    doctrineTags: ["defamation-defence", "responsible-communication"],
    ruleReferences: [],
    statuteReferences: [],
    formReferences: [],
    corePrinciple:
      "Recognizes responsible communication on matters of public interest as a defence in defamation.",
    plainLanguageSummary:
      "This case matters when someone published something about another person and says it was responsibly communicated on a matter of public interest.",
    legalTestSummary:
      "The analysis focuses on public interest and whether the publication was responsible in light of the circumstances.",
    howCourtsUseIt: [
      "To assess responsible communication defences.",
      "To separate public-interest reporting from unsupported reputational harm.",
    ],
    practicalUse: [
      "Ask what was said, who received it, why it was shared, and what steps were taken to verify it.",
    ],
    commonMistakes: [
      "Assuming every public comment is protected.",
      "Ignoring whether factual assertions were verified.",
    ],
    limitsAndWarnings: [
      "Context and exact words matter.",
      "This should not be treated as a complete defamation analysis by itself.",
    ],
    legalTestElements: [
      {
        id: "grant_public_interest",
        label: "Public interest",
        explanation: "The subject matter must be one the public has a genuine interest in knowing about.",
        proofNeeded: ["Publication context", "Audience", "Subject matter"],
        commonWeaknesses: ["Private dispute presented as public interest"],
        evidenceExamples: ["Article", "post", "email", "distribution context"],
        burdenRelevance: "Usually raised by the defendant as a defence.",
      },
      {
        id: "grant_responsibility",
        label: "Responsible communication",
        explanation: "The court considers whether reasonable steps were taken before publication.",
        proofNeeded: ["Verification steps", "Source reliability", "Opportunity to respond"],
        commonWeaknesses: ["No verification", "Reckless repetition"],
        evidenceExamples: ["Messages", "notes", "source records"],
        burdenRelevance: "Defendant must support the defence.",
      },
    ],
    evidenceImplications: [
      {
        id: "grant_evidence_publication_context",
        label: "Publication context",
        explanation: "The context affects public interest, responsibility, malice, and harm.",
        evidenceUsuallyNeeded: ["Exact words", "recipient/audience", "date", "platform"],
        weakEvidenceWarnings: ["Paraphrased allegations without screenshot or record"],
        strongEvidenceExamples: ["Full screenshot", "email headers", "witness recipient"],
      },
    ],
    workflowLinks: [
      { route: "/builder", reason: "Clarify exact words and audience." },
      { route: "/evidence", reason: "Preserve publication proof." },
      { route: "/litigation-strategy", reason: "Assess defences and response strategy." },
    ],
    relatedAuthorities: {
      follows: [],
      followedBy: ["authority_defamation_bent_v_platnick_2020_scc_23"],
      distinguishes: [],
      distinguishedBy: [],
      limits: [],
      limitedBy: [],
      overrules: [],
      overruledBy: [],
      related: ["authority_defamation_wic_radio_v_simpson_2008_scc_40"],
    },
    annualPracticeLinks: [],
    aiUseRules: {
      canShowToUser: true,
      canUseForReasoning: true,
      canUseForDrafting: true,
      mustVerifyBeforeCitation: false,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Do not say a defence applies without the exact publication and context."],
    },
    suggestedAiQuestions: [
      "What exact words were published?",
      "Who received or saw the statement?",
      "Was the statement about you specifically?",
    ],
    suggestedEvidenceQuestions: [
      "Do you have the full message, post, email, or screenshot?",
      "Can you prove who received it?",
    ],
    suggestedWorkflowActions: [
      "Preserve the publication record.",
      "Identify possible defences before drafting.",
    ],
    sourceReferences: [
      {
        id: "src_grant_canlii",
        sourceType: "canlii",
        title: "Grant v. Torstar Corp.",
        citationOrUrlLabel: "2009 SCC 61",
        notes: ["Verified starter authority."],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    lastVerifiedAt: NOW,
  },

  {
    id: "authority_charter_oakes_1986_scc",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "needs-context",
    title: "R. v. Oakes",
    shortTitle: "Oakes",
    citation: "R. v. Oakes, [1986] 1 S.C.R. 103",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 1986,
    bindingWeight: "binding",
    importanceScore: 100,
    confidence: "high",
    courtPaths: ["civil", "criminal-related"],
    legalDomains: ["civil-charter"],
    proceduralStages: ["motion", "trial", "appeal"],
    topicTags: ["Charter", "section 1", "proportionality"],
    doctrineTags: ["oakes-test", "justification"],
    ruleReferences: [],
    statuteReferences: ["Canadian Charter of Rights and Freedoms, s. 1"],
    formReferences: [],
    corePrinciple:
      "Creates the section 1 proportionality framework for justifying Charter limits.",
    plainLanguageSummary:
      "If a Charter right is limited, this case helps assess whether the government can justify the limit.",
    legalTestSummary:
      "Pressing and substantial objective, rational connection, minimal impairment, and proportionality.",
    howCourtsUseIt: [
      "To analyze whether a Charter breach can be justified.",
      "To structure constitutional arguments.",
    ],
    practicalUse: [
      "Use only when there is state action and a Charter right is engaged.",
    ],
    commonMistakes: [
      "Using Oakes where there is no government action.",
      "Skipping evidence about the objective and proportionality.",
    ],
    limitsAndWarnings: [
      "Charter analysis is complex and usually needs careful human review.",
    ],
    legalTestElements: [
      {
        id: "oakes_rational_connection",
        label: "Rational connection",
        explanation: "The limit must be logically connected to the government objective.",
        proofNeeded: ["Government objective", "Connection between law/action and objective"],
        commonWeaknesses: ["Objective stated too generally"],
        evidenceExamples: ["Legislation", "policy record", "decision record"],
        burdenRelevance: "Government usually bears justification burden under s. 1.",
      },
    ],
    evidenceImplications: [
      {
        id: "oakes_state_record",
        label: "State action record",
        explanation: "The record matters because Charter claims depend on state conduct.",
        evidenceUsuallyNeeded: ["Decision", "policy", "order", "record", "transcript"],
        weakEvidenceWarnings: ["No government actor identified"],
        strongEvidenceExamples: ["Official decision letter", "court order", "transcript"],
      },
    ],
    workflowLinks: [
      { route: "/builder", reason: "Identify government actor and right affected." },
      { route: "/evidence", reason: "Collect decision and record." },
      { route: "/litigation-strategy", reason: "Assess Charter theory and remedy." },
    ],
    relatedAuthorities: {
      follows: [],
      followedBy: ["authority_charter_bedford_2013_scc_72", "authority_charter_carter_2015_scc_5"],
      distinguishes: [],
      distinguishedBy: [],
      limits: [],
      limitedBy: [],
      overrules: [],
      overruledBy: [],
      related: [],
    },
    annualPracticeLinks: [],
    aiUseRules: {
      canShowToUser: true,
      canUseForReasoning: true,
      canUseForDrafting: true,
      mustVerifyBeforeCitation: false,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Do not apply Charter analysis to purely private disputes."],
    },
    suggestedAiQuestions: [
      "What government actor or court decision are you challenging?",
      "Which Charter right do you think was affected?",
    ],
    suggestedEvidenceQuestions: [
      "Do you have the order, decision, transcript, or policy?",
    ],
    suggestedWorkflowActions: ["Screen Charter issue.", "Preserve the record."],
    sourceReferences: [
      {
        id: "src_oakes_scc",
        sourceType: "scc",
        title: "R. v. Oakes",
        citationOrUrlLabel: "[1986] 1 S.C.R. 103",
        notes: ["Verified SCC source."],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    lastVerifiedAt: NOW,
  },

  {
    id: "authority_civil_procedure_hryniak_2014_scc_7",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "needs-context",
    title: "Hryniak v. Mauldin",
    shortTitle: "Hryniak",
    citation: "Hryniak v. Mauldin, 2014 SCC 7",
    neutralCitation: "2014 SCC 7",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 2014,
    bindingWeight: "binding",
    importanceScore: 95,
    confidence: "high",
    courtPaths: ["civil", "small-claims"],
    legalDomains: ["procedural"],
    proceduralStages: ["motion", "trial"],
    topicTags: ["summary judgment", "proportionality", "access to justice"],
    doctrineTags: ["culture-shift", "summary-judgment"],
    ruleReferences: ["Ontario Rules of Civil Procedure, Rule 20"],
    statuteReferences: [],
    formReferences: [],
    corePrinciple:
      "Summary judgment can be used where it provides a fair, just, proportionate, and timely process.",
    plainLanguageSummary:
      "This case matters when a party asks the court to decide a case or issue without a full trial.",
    legalTestSummary:
      "The court asks whether there is a genuine issue requiring trial and whether summary judgment can fairly resolve the dispute.",
    howCourtsUseIt: [
      "To assess summary judgment motions.",
      "To apply proportionality and access-to-justice reasoning.",
    ],
    practicalUse: [
      "Consider whether the record is strong enough for a motion or whether more evidence is needed.",
    ],
    commonMistakes: [
      "Assuming summary judgment is simple.",
      "Bringing the motion without a complete evidence record.",
    ],
    limitsAndWarnings: [
      "Rule-specific requirements still matter.",
      "Court path and procedural stage must be confirmed.",
    ],
    legalTestElements: [
      {
        id: "hryniak_genuine_issue",
        label: "Genuine issue requiring trial",
        explanation: "The court assesses whether a trial is needed to fairly decide the dispute.",
        proofNeeded: ["Affidavit evidence", "documents", "record showing facts are sufficiently clear"],
        commonWeaknesses: ["Conflicting evidence needing credibility findings"],
        evidenceExamples: ["Affidavits", "contracts", "emails", "transcripts"],
        burdenRelevance: "Moving party must support the motion record.",
      },
    ],
    evidenceImplications: [
      {
        id: "hryniak_motion_record",
        label: "Motion record",
        explanation: "The strength of the motion depends on the completeness of the record.",
        evidenceUsuallyNeeded: ["Affidavits", "exhibits", "key documents"],
        weakEvidenceWarnings: ["Unsupported allegations"],
        strongEvidenceExamples: ["Clear documents and admissions"],
      },
    ],
    workflowLinks: [
      { route: "/case-dashboard", reason: "Confirm stage and procedural status." },
      { route: "/evidence", reason: "Build motion-ready evidence." },
      { route: "/court-package", reason: "Prepare motion package only after readiness review." },
    ],
    relatedAuthorities: {
      follows: [],
      followedBy: [],
      distinguishes: [],
      distinguishedBy: [],
      limits: [],
      limitedBy: [],
      overrules: [],
      overruledBy: [],
      related: [],
    },
    annualPracticeLinks: [
      {
        rule: "Rule 20",
        sectionLabel: "Summary Judgment",
        commentarySummary:
          "Annual Practice commentary should be added from verified user-provided extraction.",
        notes: ["Pending Annual Practice extraction."],
      },
    ],
    aiUseRules: {
      canShowToUser: true,
      canUseForReasoning: true,
      canUseForDrafting: true,
      mustVerifyBeforeCitation: false,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Do not recommend summary judgment without procedural and evidence review."],
    },
    suggestedAiQuestions: [
      "Is there already a court case started?",
      "What facts are disputed?",
      "Do you have affidavit evidence or documents proving the key facts?",
    ],
    suggestedEvidenceQuestions: [
      "What documents prove the issue without needing live testimony?",
    ],
    suggestedWorkflowActions: ["Review Rule 20 readiness.", "Check evidence completeness."],
    sourceReferences: [
      {
        id: "src_hryniak_scc",
        sourceType: "scc",
        title: "Hryniak v. Mauldin",
        citationOrUrlLabel: "2014 SCC 7",
        notes: ["Verified SCC/CanLII authority."],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    lastVerifiedAt: NOW,
  },

  {
    id: "authority_negligence_saadati_2017_scc_28",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "needs-context",
    title: "Saadati v. Moorhead",
    shortTitle: "Saadati",
    citation: "Saadati v. Moorhead, 2017 SCC 28",
    neutralCitation: "2017 SCC 28",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 2017,
    bindingWeight: "binding",
    importanceScore: 90,
    confidence: "high",
    courtPaths: ["civil", "small-claims"],
    legalDomains: ["negligence", "personal-injury"],
    proceduralStages: ["pre-litigation", "starting-case", "trial"],
    topicTags: ["mental injury", "negligence damages", "proof of harm"],
    doctrineTags: ["mental-injury", "damages"],
    ruleReferences: [],
    statuteReferences: [],
    formReferences: [],
    corePrinciple:
      "Mental injury can be compensable in negligence without requiring proof of a recognized psychiatric illness, but serious and prolonged disturbance must still be proven.",
    plainLanguageSummary:
      "This case matters when someone claims mental injury or psychological harm from negligence.",
    legalTestSummary:
      "The user still needs evidence showing a real, serious, and prolonged mental injury connected to the defendant’s conduct.",
    howCourtsUseIt: [
      "To assess mental injury damages.",
      "To avoid requiring a specific psychiatric diagnosis as a strict legal threshold.",
    ],
    practicalUse: [
      "Collect records and witness evidence showing actual impact over time.",
    ],
    commonMistakes: [
      "Assuming stress alone proves legal damages.",
      "Failing to connect the harm to the defendant’s conduct.",
    ],
    limitsAndWarnings: [
      "Proof of seriousness, duration, and causation is still required.",
    ],
    legalTestElements: [
      {
        id: "saadati_serious_prolonged",
        label: "Serious and prolonged mental injury",
        explanation: "The harm must be more than ordinary upset or frustration.",
        proofNeeded: ["Medical records if available", "witness evidence", "daily-life impact"],
        commonWeaknesses: ["Vague emotional harm with no examples"],
        evidenceExamples: ["Doctor notes", "therapy records", "family/witness statements"],
        burdenRelevance: "Plaintiff/user must prove harm and causation.",
      },
    ],
    evidenceImplications: [
      {
        id: "saadati_impact_evidence",
        label: "Impact evidence",
        explanation: "Evidence should show actual functional impact.",
        evidenceUsuallyNeeded: ["Records", "witnesses", "timeline of symptoms"],
        weakEvidenceWarnings: ["Only saying 'I was stressed'"],
        strongEvidenceExamples: ["Consistent treatment records and witness observations"],
      },
    ],
    workflowLinks: [
      { route: "/evidence", reason: "Collect harm and causation proof." },
      { route: "/litigation-strategy", reason: "Assess damages strength." },
    ],
    relatedAuthorities: {
      follows: [],
      followedBy: [],
      distinguishes: [],
      distinguishedBy: [],
      limits: [],
      limitedBy: [],
      overrules: [],
      overruledBy: [],
      related: [],
    },
    annualPracticeLinks: [],
    aiUseRules: {
      canShowToUser: true,
      canUseForReasoning: true,
      canUseForDrafting: true,
      mustVerifyBeforeCitation: false,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Do not say mental injury is proven without evidence of seriousness and causation."],
    },
    suggestedAiQuestions: [
      "What harm did you experience and how long did it last?",
      "Do you have records or witnesses showing the impact?",
    ],
    suggestedEvidenceQuestions: [
      "Do you have medical notes, therapy records, or people who observed the change?",
    ],
    suggestedWorkflowActions: ["Build damages evidence.", "Map causation."],
    sourceReferences: [
      {
        id: "src_saadati_canlii",
        sourceType: "canlii",
        title: "Saadati v. Moorhead",
        citationOrUrlLabel: "2017 SCC 28",
        notes: ["Verified SCC/CanLII authority."],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    lastVerifiedAt: NOW,
  },

  {
    id: "authority_family_gordon_v_goertz_1996_scc",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "needs-context",
    title: "Gordon v. Goertz",
    shortTitle: "Gordon",
    citation: "Gordon v. Goertz, [1996] 2 S.C.R. 27",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 1996,
    bindingWeight: "binding",
    importanceScore: 90,
    confidence: "high",
    courtPaths: ["family"],
    legalDomains: ["family-parenting"],
    proceduralStages: ["motion", "trial"],
    topicTags: ["best interests", "mobility", "parenting"],
    doctrineTags: ["best-interests-child"],
    ruleReferences: [],
    statuteReferences: ["Divorce Act"],
    formReferences: [],
    corePrinciple:
      "Parenting decisions must be child-centred and based on the best interests of the child.",
    plainLanguageSummary:
      "This case matters when a parenting issue asks what arrangement best serves the child, especially mobility or changes to parenting arrangements.",
    legalTestSummary:
      "The focus is the child’s best interests, not either parent’s preferences alone.",
    howCourtsUseIt: [
      "To assess child-centred parenting disputes.",
      "To examine changes in circumstances and the child’s needs.",
    ],
    practicalUse: [
      "Organize facts around the child’s stability, care, school, relationships, and safety.",
    ],
    commonMistakes: [
      "Making the case mostly about adult conflict instead of the child.",
    ],
    limitsAndWarnings: [
      "Family law is fact-specific and current statutory language must also be checked.",
    ],
    legalTestElements: [
      {
        id: "gordon_best_interests",
        label: "Best interests",
        explanation: "The court focuses on the child’s welfare and circumstances.",
        proofNeeded: ["Child’s schedule", "care history", "school", "health", "family supports"],
        commonWeaknesses: ["Parent-focused allegations without child impact"],
        evidenceExamples: ["Parenting schedule", "school records", "messages about care"],
        burdenRelevance: "Party seeking change must support why it benefits the child.",
      },
    ],
    evidenceImplications: [
      {
        id: "gordon_child_focused_evidence",
        label: "Child-focused evidence",
        explanation: "Evidence should show how the requested order affects the child.",
        evidenceUsuallyNeeded: ["Current schedule", "status quo", "care records"],
        weakEvidenceWarnings: ["General conflict without child-specific facts"],
        strongEvidenceExamples: ["Consistent caregiving history and child needs evidence"],
      },
    ],
    workflowLinks: [
      { route: "/builder", reason: "Clarify child-focused facts." },
      { route: "/evidence", reason: "Collect parenting evidence." },
      { route: "/court-package", reason: "Prepare materials after best-interests facts are organized." },
    ],
    relatedAuthorities: {
      follows: [],
      followedBy: [],
      distinguishes: [],
      distinguishedBy: [],
      limits: [],
      limitedBy: [],
      overrules: [],
      overruledBy: [],
      related: [],
    },
    annualPracticeLinks: [],
    aiUseRules: {
      canShowToUser: true,
      canUseForReasoning: true,
      canUseForDrafting: true,
      mustVerifyBeforeCitation: false,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Do not frame parenting strategy as punishment of the other parent."],
    },
    suggestedAiQuestions: [
      "What parenting arrangement is currently happening?",
      "What order are you asking for and why is it better for the child?",
    ],
    suggestedEvidenceQuestions: [
      "What records show the child’s routine, care, school, or safety needs?",
    ],
    suggestedWorkflowActions: ["Build child-focused facts.", "Prepare parenting evidence."],
    sourceReferences: [
      {
        id: "src_gordon_canlii",
        sourceType: "canlii",
        title: "Gordon v. Goertz",
        citationOrUrlLabel: "1996 CanLII 191 (SCC)",
        notes: ["Verified SCC/CanLII authority."],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    lastVerifiedAt: NOW,
  },

  {
    id: "authority_admin_vavilov_2019_scc_65",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "lawyer-review-recommended",
    title: "Canada (Minister of Citizenship and Immigration) v. Vavilov",
    shortTitle: "Vavilov",
    citation: "Canada (Minister of Citizenship and Immigration) v. Vavilov, 2019 SCC 65",
    neutralCitation: "2019 SCC 65",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 2019,
    bindingWeight: "binding",
    importanceScore: 95,
    confidence: "high",
    courtPaths: ["civil", "tribunal", "immigration"],
    legalDomains: ["procedural", "immigration", "civil-institutional-liability"],
    proceduralStages: ["appeal", "motion", "trial"],
    topicTags: ["judicial review", "administrative law", "reasonableness"],
    doctrineTags: ["standard-of-review", "reasonableness-review"],
    ruleReferences: [],
    statuteReferences: [],
    formReferences: [],
    corePrinciple:
      "Sets the modern framework for judicial review and reasonableness review of administrative decisions.",
    plainLanguageSummary:
      "This case matters when someone challenges a government or tribunal decision.",
    legalTestSummary:
      "The focus is usually whether the decision is reasonable and justified in light of the law and record.",
    howCourtsUseIt: [
      "To assess administrative decision-making.",
      "To review reasons and legal constraints.",
    ],
    practicalUse: [
      "Collect the full decision, record, reasons, correspondence, and governing statute.",
    ],
    commonMistakes: [
      "Arguing judicial review like a fresh trial.",
      "Not getting the decision record.",
    ],
    limitsAndWarnings: [
      "Judicial review is technical and deadline-sensitive.",
    ],
    legalTestElements: [
      {
        id: "vavilov_record_reasons",
        label: "Record and reasons",
        explanation: "The court reviews the decision in light of the record and legal constraints.",
        proofNeeded: ["Decision", "reasons", "record before decision-maker", "governing statute"],
        commonWeaknesses: ["Missing record"],
        evidenceExamples: ["Decision letter", "tribunal record", "submissions"],
        burdenRelevance: "Applicant must show reviewable error.",
      },
    ],
    evidenceImplications: [
      {
        id: "vavilov_decision_record",
        label: "Administrative record",
        explanation: "The record is central to judicial review.",
        evidenceUsuallyNeeded: ["Decision", "reasons", "record", "submissions"],
        weakEvidenceWarnings: ["Only describing unfairness without the decision record"],
        strongEvidenceExamples: ["Complete tribunal/government record"],
      },
    ],
    workflowLinks: [
      { route: "/builder", reason: "Identify decision and decision-maker." },
      { route: "/evidence", reason: "Collect record." },
      { route: "/litigation-strategy", reason: "Assess judicial review path." },
    ],
    relatedAuthorities: {
      follows: [],
      followedBy: [],
      distinguishes: [],
      distinguishedBy: [],
      limits: [],
      limitedBy: [],
      overrules: [],
      overruledBy: [],
      related: [],
    },
    annualPracticeLinks: [],
    aiUseRules: {
      canShowToUser: true,
      canUseForReasoning: true,
      canUseForDrafting: true,
      mustVerifyBeforeCitation: false,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Do not treat judicial review as a full rehearing."],
    },
    suggestedAiQuestions: [
      "What decision are you challenging?",
      "Who made the decision?",
      "When did you receive it?",
    ],
    suggestedEvidenceQuestions: [
      "Do you have the decision, reasons, and record?",
    ],
    suggestedWorkflowActions: ["Check deadline.", "Collect record.", "Review judicial review path."],
    sourceReferences: [
      {
        id: "src_vavilov_canlii",
        sourceType: "canlii",
        title: "Vavilov",
        citationOrUrlLabel: "2019 SCC 65",
        notes: ["Verified CanLII/SCC authority."],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    lastVerifiedAt: NOW,
  },
];

export const VERIFIED_AUTHORITY_TOPIC_GROUPS = [
  {
    id: "topic_defamation",
    label: "Defamation",
    description:
      "Authorities for reputation harm, publication, defences, responsible communication, fair comment, and anti-SLAPP context.",
    legalDomains: ["defamation"],
    courtPaths: ["civil", "small-claims"],
    authorityIds: [
      "authority_defamation_grant_v_torstar_2009_scc_61",
    ],
    defaultCollapsed: true,
  },
  {
    id: "topic_charter",
    label: "Charter",
    description:
      "Authorities for Charter limits, section 1 justification, arbitrariness, overbreadth, gross disproportionality, and state action.",
    legalDomains: ["civil-charter"],
    courtPaths: ["civil", "criminal-related"],
    authorityIds: ["authority_charter_oakes_1986_scc"],
    defaultCollapsed: true,
  },
  {
    id: "topic_civil_procedure",
    label: "Civil Procedure",
    description:
      "Authorities and procedural sources for summary judgment, proportionality, pleadings, service, motions, and court readiness.",
    legalDomains: ["procedural"],
    courtPaths: ["civil", "small-claims"],
    authorityIds: ["authority_civil_procedure_hryniak_2014_scc_7"],
    defaultCollapsed: true,
  },
  {
    id: "topic_negligence",
    label: "Negligence",
    description:
      "Authorities for duty, standard of care, causation, remoteness, damages, and proof of injury.",
    legalDomains: ["negligence", "personal-injury"],
    courtPaths: ["civil", "small-claims"],
    authorityIds: ["authority_negligence_saadati_2017_scc_28"],
    defaultCollapsed: true,
  },
  {
    id: "topic_family_parenting",
    label: "Family Parenting",
    description:
      "Authorities for parenting, best interests, mobility, status quo, safety, and child-focused evidence.",
    legalDomains: ["family-parenting"],
    courtPaths: ["family"],
    authorityIds: ["authority_family_gordon_v_goertz_1996_scc"],
    defaultCollapsed: true,
  },
  {
    id: "topic_administrative_public_authority",
    label: "Administrative / Public Authority",
    description:
      "Authorities for judicial review, administrative decisions, government actors, records, reasons, and review standards.",
    legalDomains: ["procedural", "immigration", "civil-institutional-liability"],
    courtPaths: ["civil", "tribunal", "immigration"],
    authorityIds: ["authority_admin_vavilov_2019_scc_65"],
    defaultCollapsed: true,
  },
] satisfies AuthorityRegistryModel["topicGroups"];

export const VERIFIED_AUTHORITY_SEED_REGISTRY: AuthorityRegistryModel = {
  version: "1.0.0",
  entries: VERIFIED_AUTHORITY_SEED_ENTRIES,
  topicGroups: VERIFIED_AUTHORITY_TOPIC_GROUPS,
  warnings: [
    "Starter registry only. Add Annual Practice authorities only after verified extraction.",
    "Do not display authorities marked internal-only or do-not-display.",
    "Do not cite authority text directly unless the source and pinpoint have been verified.",
  ],
};

export function getVerifiedAuthoritySeedRegistry(): AuthorityRegistryModel {
  return VERIFIED_AUTHORITY_SEED_REGISTRY;
}

export function getVerifiedAuthoritySeedEntries(): VerifiedAuthorityEntry[] {
  return VERIFIED_AUTHORITY_SEED_ENTRIES;
}