import { cleanList, includesAny, normalize } from "./utils";

export type CourtPath = "family" | "small-claims" | "civil";

export type LegalTheoryRule = {
  id: string;
  courtPaths: CourtPath[];
  theoryName: string;
  plainLanguageMeaning: string;
  triggerTerms: string[];
  requiredElements: string[];
  requiredProof: string[];
  commonWeaknesses: string[];
  likelyDefenceAttacks: string[];
  judgeConcerns: string[];
  recommendedQuestions: string[];
  evidenceToRequest: string[];
  draftingWarnings: string[];
  strategicNotes: string[];
};

export type LegalTheoryInput = {
  courtPath: CourtPath;
  facts: string;
  issues: string[];
  evidence: string;
  timeline: string;
  damagesBreakdown?: string;
  goal?: string;
};

export type LegalTheoryMatch = {
  theoryId: string;
  theoryName: string;
  score: number;
  plainLanguageMeaning: string;
  matchedTriggers: string[];
  requiredElements: string[];
  missingElements: string[];
  requiredProof: string[];
  missingProof: string[];
  likelyDefenceAttacks: string[];
  judgeConcerns: string[];
  recommendedQuestions: string[];
  evidenceToRequest: string[];
  draftingWarnings: string[];
  strategicNotes: string[];
};

export type LegalTheoryResult = {
  matchedTheories: LegalTheoryMatch[];
  strongestTheory?: LegalTheoryMatch;
  allMissingProof: string[];
  allDefenceAttacks: string[];
  allJudgeConcerns: string[];
  allRecommendedQuestions: string[];
  allDraftingWarnings: string[];
  allStrategicNotes: string[];
};

const LEGAL_THEORY_RULES: LegalTheoryRule[] = [
  {
    id: "small-claims-debt",
    courtPaths: ["small-claims", "civil"],
    theoryName: "Debt / unpaid money claim",
    plainLanguageMeaning:
      "A claim that someone owes money because they borrowed it, agreed to pay it, received goods or services, or failed to pay an invoice or balance.",
    triggerTerms: [
      "owe",
      "owed",
      "unpaid",
      "invoice",
      "loan",
      "debt",
      "balance",
      "did not pay",
      "didn't pay",
      "payment plan",
      "e-transfer",
      "repay",
      "money back",
    ],
    requiredElements: [
      "There was a debt, loan, invoice, agreement, or obligation to pay.",
      "The defendant was responsible for paying.",
      "The amount claimed can be calculated.",
      "The amount remains unpaid.",
    ],
    requiredProof: [
      "Loan agreement, invoice, contract, message, or other proof of the obligation.",
      "Proof money, goods, or services were provided.",
      "Payment history or account statement.",
      "Clear calculation of the balance owing.",
      "Demand message or communication asking for payment if available.",
    ],
    commonWeaknesses: [
      "No written agreement.",
      "Unclear repayment terms.",
      "Only a general total with no calculation.",
      "Payments not tracked clearly.",
      "Possible argument that the money was a gift.",
    ],
    likelyDefenceAttacks: [
      "The money was a gift, not a loan.",
      "The amount was already paid.",
      "The amount is calculated incorrectly.",
      "There was no agreement to pay.",
      "The plaintiff did not provide what was promised.",
      "The claim is too old.",
    ],
    judgeConcerns: [
      "What exactly created the obligation to pay?",
      "How was the amount calculated?",
      "What payments were made and when?",
      "Is there reliable proof beyond the plaintiff’s word?",
    ],
    recommendedQuestions: [
      "What document or message proves the other party agreed to pay?",
      "What is the exact balance still owing?",
      "Were any partial payments made?",
      "Did the other party ever admit the debt?",
      "When was the last payment or promise to pay?",
    ],
    evidenceToRequest: [
      "Invoices",
      "Receipts",
      "E-transfer records",
      "Bank records",
      "Text messages about payment",
      "Emails about payment",
      "Demand letters",
      "Payment ledger",
    ],
    draftingWarnings: [
      "Do not simply say they owe money. Explain why they owe it.",
      "Separate principal, fees, interest, and costs.",
      "Avoid emotional wording. Use dates, amounts, and proof.",
    ],
    strategicNotes: [
      "A damages table is critical.",
      "Admissions in texts or emails can be very strong.",
      "If there is no written contract, repeated payments or messages may prove the agreement.",
    ],
  },
  {
    id: "small-claims-contract",
    courtPaths: ["small-claims", "civil"],
    theoryName: "Breach of contract / agreement",
    plainLanguageMeaning:
      "A claim that one side broke an agreement, quote, contract, service arrangement, or promise that caused financial loss.",
    triggerTerms: [
      "contract",
      "agreement",
      "quote",
      "estimate",
      "scope",
      "terms",
      "promise",
      "services",
      "renovation",
      "contractor",
      "job",
      "work",
      "breach",
    ],
    requiredElements: [
      "There was an agreement or contract.",
      "The important terms can be identified.",
      "The plaintiff did what they were required to do, or had a valid reason not to.",
      "The defendant breached the agreement.",
      "The breach caused loss.",
      "The loss can be calculated.",
    ],
    requiredProof: [
      "Written contract, quote, estimate, invoice, email, text, or other proof of terms.",
      "Proof of performance or attempted performance.",
      "Proof of breach.",
      "Proof of damages caused by the breach.",
      "Timeline of agreement, work, breach, and loss.",
    ],
    commonWeaknesses: [
      "Agreement terms are vague.",
      "No proof of what was promised.",
      "Scope changed but was not documented.",
      "Damages are not tied to the breach.",
      "User also failed to perform part of the agreement.",
    ],
    likelyDefenceAttacks: [
      "There was no contract.",
      "The terms were different.",
      "The plaintiff breached first.",
      "The work was defective or incomplete.",
      "The amount claimed is excessive.",
      "The loss was not caused by the alleged breach.",
    ],
    judgeConcerns: [
      "What exactly did each side agree to?",
      "What term was breached?",
      "What evidence proves the breach?",
      "How did the breach cause the amount claimed?",
    ],
    recommendedQuestions: [
      "Was the agreement written, verbal, or partly both?",
      "What exact term was breached?",
      "What proof shows the other side agreed to that term?",
      "What did you do under the agreement?",
      "How did you calculate the loss?",
    ],
    evidenceToRequest: [
      "Contract",
      "Quote",
      "Estimate",
      "Invoices",
      "Texts",
      "Emails",
      "Photos of work",
      "Receipts",
      "Change orders",
      "Payment records",
    ],
    draftingWarnings: [
      "Do not just say the other side was unfair. Identify the agreement and breach.",
      "Do not mix every complaint together. Separate terms, breach, and damages.",
    ],
    strategicNotes: [
      "A contract claim is strongest when organized as: agreement → performance → breach → damages → evidence.",
      "If the contract is verbal, messages and conduct become especially important.",
    ],
  },
  {
    id: "small-claims-property-damage",
    courtPaths: ["small-claims", "civil"],
    theoryName: "Property damage / defective work",
    plainLanguageMeaning:
      "A claim that someone damaged property, performed poor work, caused repairs, or failed to fix what they were responsible for.",
    triggerTerms: [
      "damage",
      "damaged",
      "broken",
      "broke",
      "repair",
      "destroyed",
      "property",
      "vehicle",
      "car",
      "mechanic",
      "defective",
      "poor work",
      "bad work",
      "leak",
      "crack",
    ],
    requiredElements: [
      "The property condition before the problem can be shown.",
      "The defendant caused or was responsible for the damage or defective work.",
      "The damage or defect can be proven.",
      "The repair or replacement cost is reasonable.",
      "The claimed amount is connected to the damage.",
    ],
    requiredProof: [
      "Before-and-after photos.",
      "Repair estimate or invoice.",
      "Inspection report if available.",
      "Messages about the damage.",
      "Proof of ownership or responsibility.",
      "Timeline showing when damage happened.",
    ],
    commonWeaknesses: [
      "No before photos.",
      "No proof the defendant caused the damage.",
      "Only one estimate.",
      "Repair cost seems inflated.",
      "Damage may have pre-existed.",
    ],
    likelyDefenceAttacks: [
      "The damage was pre-existing.",
      "Someone else caused the damage.",
      "The repair cost is unreasonable.",
      "The plaintiff failed to mitigate the loss.",
      "The work was done properly.",
    ],
    judgeConcerns: [
      "What caused the damage?",
      "What did the property look like before?",
      "Is the repair cost reasonable?",
      "Is there objective evidence?",
    ],
    recommendedQuestions: [
      "Do you have photos before the damage?",
      "Do you have photos after the damage?",
      "Who inspected the damage?",
      "How many repair quotes do you have?",
      "What connects the defendant to the damage?",
    ],
    evidenceToRequest: [
      "Photos",
      "Videos",
      "Repair estimates",
      "Repair invoices",
      "Inspection notes",
      "Messages",
      "Witness names",
    ],
    draftingWarnings: [
      "Avoid saying the defendant caused damage unless you explain how.",
      "Connect each repair cost to a specific damaged item.",
    ],
    strategicNotes: [
      "Causation is often the key fight.",
      "Independent repair estimates or photos can make the claim much stronger.",
    ],
  },
  {
    id: "small-claims-defamation",
    courtPaths: ["small-claims", "civil"],
    theoryName: "Defamation / reputational harm",
    plainLanguageMeaning:
      "A claim that someone made a false statement about the user to another person, causing reputational harm or other loss.",
    triggerTerms: [
      "defamation",
      "slander",
      "libel",
      "false statement",
      "lied about me",
      "reputation",
      "posted",
      "facebook",
      "instagram",
      "tiktok",
      "accused me",
      "called me",
      "rumour",
      "harassment complaint",
    ],
    requiredElements: [
      "The exact words or statements are known.",
      "The statement referred to the plaintiff.",
      "The statement was communicated to at least one other person.",
      "The statement would tend to lower the plaintiff’s reputation.",
      "The statement was false or not defensible.",
      "There is harm or a basis for damages.",
    ],
    requiredProof: [
      "Screenshots or recordings of the exact words.",
      "Date and place of publication.",
      "Who received or saw the statement.",
      "Why the statement was false.",
      "Evidence of harm, lost work, distress, community impact, or reputational effect.",
    ],
    commonWeaknesses: [
      "Exact words are missing.",
      "Only private insults with no publication.",
      "No proof anyone else saw it.",
      "Statement may be opinion.",
      "Statement may be true or privileged.",
      "Damages are vague.",
    ],
    likelyDefenceAttacks: [
      "Truth.",
      "Opinion or fair comment.",
      "Qualified privilege.",
      "No publication.",
      "No serious harm.",
      "The words did not identify the plaintiff.",
    ],
    judgeConcerns: [
      "What exact words were used?",
      "Who received the statement?",
      "Why are the words defamatory?",
      "What harm followed?",
      "Are there possible defences?",
    ],
    recommendedQuestions: [
      "What exact words were said or written?",
      "Who saw or received the statement?",
      "When was it said or posted?",
      "How can you prove it was false?",
      "What specific harm resulted?",
    ],
    evidenceToRequest: [
      "Screenshots",
      "Messages",
      "Posts",
      "Witness names",
      "Proof of lost business or reputational impact",
      "Retraction requests",
      "Apology refusal",
    ],
    draftingWarnings: [
      "Do not summarize the statement loosely. Use exact words where possible.",
      "Do not rely only on hurt feelings. Identify reputational or practical harm.",
      "Address possible truth/opinion/privilege defences early.",
    ],
    strategicNotes: [
      "Publication and exact wording are usually central.",
      "Defamation claims become stronger when there are multiple recipients and documented refusal to retract.",
    ],
  },
  {
    id: "civil-negligence",
    courtPaths: ["civil", "small-claims"],
    theoryName: "Negligence",
    plainLanguageMeaning:
      "A claim that someone owed a duty to take reasonable care, failed to do so, and caused harm or loss.",
    triggerTerms: [
      "negligence",
      "failed to",
      "unsafe",
      "injury",
      "harm",
      "duty",
      "careless",
      "supervision",
      "ignored risk",
      "warning",
      "foreseeable",
    ],
    requiredElements: [
      "A duty of care may exist.",
      "The defendant breached the standard of care.",
      "The breach caused the harm.",
      "The harm was reasonably foreseeable.",
      "The damages can be proven.",
    ],
    requiredProof: [
      "Facts showing relationship or duty.",
      "Records showing what the defendant did or failed to do.",
      "Timeline of warning signs or risks.",
      "Proof of harm.",
      "Proof connecting breach to harm.",
      "Damages records.",
    ],
    commonWeaknesses: [
      "Duty of care is unclear.",
      "Claim attacks a policy decision instead of operational conduct.",
      "Causation is speculative.",
      "Damages are not documented.",
      "Hindsight reasoning.",
    ],
    likelyDefenceAttacks: [
      "No duty of care.",
      "No breach.",
      "No causation.",
      "The harm was not foreseeable.",
      "Intervening act.",
      "Policy immunity or discretionary decision.",
      "Contributory negligence.",
    ],
    judgeConcerns: [
      "Is there a legally recognized duty?",
      "What exact conduct breached the standard of care?",
      "How did that breach cause the harm?",
      "Is the claim based on hindsight?",
    ],
    recommendedQuestions: [
      "Who owed the duty and why?",
      "What exactly should they have done differently?",
      "What risk was known before the harm?",
      "What evidence links the breach to the harm?",
      "What damages can be proven?",
    ],
    evidenceToRequest: [
      "Incident records",
      "Policies/procedures",
      "Emails",
      "Reports",
      "Medical records if relevant",
      "Photos",
      "Witness statements",
      "Damages records",
    ],
    draftingWarnings: [
      "Avoid vague phrases like institutional failure unless tied to a recognized negligence element.",
      "Separate breach from causation.",
      "Do not rely only on the bad outcome.",
    ],
    strategicNotes: [
      "The strongest negligence claims are organized around duty, breach, foreseeability, causation, and damages.",
      "Operational failures are usually easier to plead than broad policy attacks.",
    ],
  },
  {
    id: "civil-institutional-negligence",
    courtPaths: ["civil"],
    theoryName: "Institutional negligence / systemic failure",
    plainLanguageMeaning:
      "A claim that an organization, school, hospital, agency, employer, public body, or institution failed to act reasonably despite responsibility, warning signs, policies, records, or known risks.",
    triggerTerms: [
      "institution",
      "institutional",
      "system failure",
      "failed to protect",
      "failed to supervise",
      "ignored warning",
      "ignored warnings",
      "policy",
      "procedure",
      "school",
      "hospital",
      "agency",
      "organization",
      "internal records",
      "reported",
      "complaint",
      "unsafe system",
    ],
    requiredElements: [
      "The institution had a responsibility connected to the plaintiff or situation.",
      "The institution had notice, warning signs, policies, records, or control over the risk.",
      "The institution failed to take reasonable operational steps.",
      "The failure materially contributed to the harm.",
      "The harm and damages can be proven.",
    ],
    requiredProof: [
      "Institutional policies, procedures, or standards.",
      "Reports, complaints, emails, internal records, or prior warnings.",
      "Timeline showing what the institution knew and when.",
      "Documents showing what the institution did or failed to do.",
      "Evidence of harm and damages.",
      "Records linking the failure to the harm.",
    ],
    commonWeaknesses: [
      "Only a broad complaint about unfairness.",
      "No proof of notice or knowledge.",
      "No clear institutional duty or operational step.",
      "No causation link.",
      "Claim sounds like disagreement with policy rather than failure to act.",
    ],
    likelyDefenceAttacks: [
      "No duty owed.",
      "No notice of risk.",
      "Reasonable policies were followed.",
      "The harm was not foreseeable.",
      "The institution did not cause the harm.",
      "The claim improperly attacks policy discretion.",
    ],
    judgeConcerns: [
      "What exactly did the institution know?",
      "What operational step should have been taken?",
      "What record proves notice or warning?",
      "How did the failure cause or materially contribute to the harm?",
    ],
    recommendedQuestions: [
      "Who was told about the problem and when?",
      "What policy, rule, standard, or procedure applied?",
      "What documents prove the institution knew or should have known?",
      "What step was missing?",
      "How did the missing step change the risk or outcome?",
    ],
    evidenceToRequest: [
      "Complaint records",
      "Emails",
      "Incident reports",
      "Policies",
      "Internal notes",
      "Meeting notes",
      "Prior warning records",
      "Timeline of reports",
      "Records of action or inaction",
    ],
    draftingWarnings: [
      "Do not use 'systemic failure' as a conclusion without facts.",
      "Identify the institution’s role, notice, failure, causation, and harm.",
      "Avoid pure hindsight; focus on what was known before the harm.",
    ],
    strategicNotes: [
      "Institutional negligence becomes much stronger when organized around notice, control, policies, operational failure, and causation.",
      "Documents showing prior warnings or ignored complaints can be critical.",
    ],
  },
  {
    id: "civil-human-rights-discrimination",
    courtPaths: ["civil"],
    theoryName: "Human Rights / discrimination",
    plainLanguageMeaning:
      "A rights-based claim or tribunal issue involving unequal treatment, exclusion, harassment, denial of service, reprisal, or failure to accommodate connected to a protected ground.",
    triggerTerms: [
      "human rights",
      "discrimination",
      "discriminated",
      "disability",
      "race",
      "sex",
      "gender",
      "age",
      "creed",
      "religion",
      "family status",
      "marital status",
      "accommodation",
      "denied accommodation",
      "harassment",
      "reprisal",
      "unequal treatment",
      "protected ground",
    ],
    requiredElements: [
      "A protected ground or Human Rights Code-related ground is identified.",
      "There was adverse treatment, exclusion, denial, harassment, reprisal, or failure to accommodate.",
      "There is a connection between the protected ground and the treatment.",
      "The harm, impact, or remedy requested can be explained.",
      "The correct forum or pathway must be considered.",
    ],
    requiredProof: [
      "Facts identifying the protected ground.",
      "Documents showing adverse treatment, refusal, exclusion, harassment, or reprisal.",
      "Accommodation requests and responses if relevant.",
      "Comparator facts or pattern evidence if available.",
      "Witnesses, emails, messages, policies, or records.",
      "Impact evidence and remedy requested.",
    ],
    commonWeaknesses: [
      "No protected ground identified.",
      "Unfair treatment is described but not connected to a protected ground.",
      "No proof of accommodation request or refusal.",
      "Only general workplace, housing, or service conflict.",
      "Wrong forum or limitation issue.",
    ],
    likelyDefenceAttacks: [
      "No protected ground.",
      "No connection between the protected ground and treatment.",
      "Reasonable accommodation was offered.",
      "Undue hardship.",
      "Legitimate non-discriminatory reason for the decision.",
      "Wrong forum or late filing.",
    ],
    judgeConcerns: [
      "What protected ground is involved?",
      "What adverse treatment occurred?",
      "What evidence connects the protected ground to the treatment?",
      "Was accommodation requested or required?",
      "Is this a court issue, tribunal issue, or overlap issue?",
    ],
    recommendedQuestions: [
      "What protected ground is involved?",
      "What exactly happened that was discriminatory?",
      "Who made the decision or statement?",
      "What documents show the reason for the treatment?",
      "Was accommodation requested?",
      "What remedy is being requested?",
    ],
    evidenceToRequest: [
      "Accommodation requests",
      "Denial letters",
      "Emails",
      "Texts",
      "Policies",
      "Medical/accommodation documents if relevant",
      "Witness names",
      "Comparator evidence",
      "Impact records",
      "Timeline of events",
    ],
    draftingWarnings: [
      "Do not describe every unfair event as discrimination unless the protected-ground connection is clear.",
      "Separate adverse treatment from the protected ground and the causal connection.",
      "Do not choose a court path without considering tribunal jurisdiction.",
    ],
    strategicNotes: [
      "Human Rights analysis should be organized as: protected ground → adverse treatment → connection → impact → remedy.",
      "Tribunal/court pathway analysis is critical before generating forms.",
    ],
  },
  {
    id: "civil-disability-accommodation",
    courtPaths: ["civil"],
    theoryName: "Disability accommodation / failure to accommodate",
    plainLanguageMeaning:
      "A Human Rights issue where a person requested or needed accommodation related to disability or medical limitations and the organization failed to respond reasonably.",
    triggerTerms: [
      "disability",
      "disabled",
      "medical restriction",
      "doctor note",
      "accommodation",
      "modified duties",
      "accessible",
      "accessibility",
      "denied accommodation",
      "ignored accommodation",
      "undue hardship",
      "medical documentation",
      "mental health",
    ],
    requiredElements: [
      "A disability-related need or limitation is identified.",
      "The accommodation need was known or reasonably should have been known.",
      "Accommodation was requested or the need was obvious from the circumstances.",
      "The response was denied, ignored, delayed, inadequate, or retaliatory.",
      "The impact and remedy requested can be explained.",
    ],
    requiredProof: [
      "Accommodation request.",
      "Medical note or functional limitation information if available.",
      "Employer, landlord, school, or service-provider response.",
      "Timeline of requests, delays, refusals, or alternatives.",
      "Policies or accessibility records.",
      "Impact evidence.",
    ],
    commonWeaknesses: [
      "No record of the accommodation request.",
      "Medical need is unclear.",
      "Requested accommodation is not connected to the limitation.",
      "Responding party offered alternatives.",
      "No documented impact.",
    ],
    likelyDefenceAttacks: [
      "No disability-related need was disclosed.",
      "Accommodation request was unreasonable or unsupported.",
      "Reasonable accommodation was offered.",
      "Undue hardship.",
      "The user did not participate in the accommodation process.",
    ],
    judgeConcerns: [
      "What limitation required accommodation?",
      "What was requested and when?",
      "How did the organization respond?",
      "Was there a meaningful accommodation process?",
      "What harm resulted?",
    ],
    recommendedQuestions: [
      "What accommodation was requested?",
      "What documents show the request?",
      "What medical or functional information was provided?",
      "What response did the organization give?",
      "What impact followed from the refusal or delay?",
    ],
    evidenceToRequest: [
      "Accommodation emails",
      "Medical notes",
      "Functional limitation letters",
      "Policies",
      "Meeting notes",
      "Denial letters",
      "Alternative accommodation proposals",
      "Impact records",
    ],
    draftingWarnings: [
      "Focus on functional limitations, requested accommodation, response, and impact.",
      "Avoid unnecessary medical detail; include what is needed to show accommodation need.",
      "Document the interactive process carefully.",
    ],
    strategicNotes: [
      "Accommodation cases often turn on timeline, request clarity, response reasonableness, and documented impact.",
    ],
  },
  {
    id: "civil-government-public-authority",
    courtPaths: ["civil"],
    theoryName: "Government / public authority conduct",
    plainLanguageMeaning:
      "A claim involving government, police, Crown, school board, tribunal, ministry, municipality, hospital, regulator, or public authority action or inaction.",
    triggerTerms: [
      "government",
      "public authority",
      "ministry",
      "municipality",
      "school board",
      "hospital",
      "tribunal",
      "police",
      "crown",
      "state actor",
      "public body",
      "regulator",
      "official decision",
      "administrative decision",
      "procedural fairness",
      "unfair process",
    ],
    requiredElements: [
      "The public authority or state actor is identified.",
      "The decision, omission, process, or conduct is clearly described.",
      "The legal wrong is identified without only attacking the outcome.",
      "The harm and remedy are connected to the public authority conduct.",
      "Any immunity, discretion, or judicial review issue is considered.",
    ],
    requiredProof: [
      "Decision letters, notices, orders, emails, transcripts, records, or disclosure.",
      "Timeline of public authority involvement.",
      "Policies, procedures, or legal requirements if available.",
      "Evidence of process failure, omission, or unreasonable conduct.",
      "Evidence of harm and remedy requested.",
    ],
    commonWeaknesses: [
      "Claim attacks a decision without identifying a legal wrong.",
      "No clear public authority action.",
      "Wrong procedure or forum.",
      "Immunity or discretion issue not considered.",
      "No causal link between conduct and harm.",
    ],
    likelyDefenceAttacks: [
      "No private law duty.",
      "Core policy immunity.",
      "Lawful discretion.",
      "Adequate alternative remedy.",
      "Collateral attack.",
      "No causation.",
      "Wrong forum or limitation issue.",
    ],
    judgeConcerns: [
      "Is this a proper civil claim, judicial review, tribunal matter, or Charter issue?",
      "What exact public conduct is challenged?",
      "Does the claim improperly attack a protected decision?",
      "What remedy is legally available?",
    ],
    recommendedQuestions: [
      "Which public body or official was involved?",
      "What decision, omission, process, or conduct is challenged?",
      "What records show what happened?",
      "What legal route fits: civil claim, tribunal, judicial review, Charter, or other?",
      "What remedy is being requested?",
    ],
    evidenceToRequest: [
      "Decision letters",
      "Orders",
      "Emails",
      "Transcripts",
      "Disclosure",
      "Policies",
      "Internal records if available",
      "Timeline",
      "Complaint records",
    ],
    draftingWarnings: [
      "Do not frame the claim as simply disagreeing with a public decision.",
      "Identify operational conduct, procedural unfairness, statutory breach, Charter issue, negligence, or other legal route.",
      "Consider immunity and forum issues early.",
    ],
    strategicNotes: [
      "Public-authority claims need careful routing before drafting.",
      "The strongest framing separates decision outcome, process failure, authority, knowledge, harm, and remedy.",
    ],
  },
  {
    id: "civil-charter",
    courtPaths: ["civil"],
    theoryName: "Charter claim",
    plainLanguageMeaning:
      "A claim that government action or inaction violated a constitutional right and caused a serious legal harm.",
    triggerTerms: [
      "charter",
      "section 7",
      "s.7",
      "section 15",
      "s.15",
      "security of the person",
      "fundamental justice",
      "equality",
      "government",
      "state",
      "police",
      "crown",
      "public authority",
      "rights",
      "constitutional",
      "arbitrary",
      "arbitrariness",
      "overbroad",
      "grossly disproportionate",
    ],
    requiredElements: [
      "State action or state conduct is involved.",
      "A protected Charter interest is engaged.",
      "There is a deprivation or serious impact.",
      "The deprivation is connected to state conduct.",
      "The conduct violates a principle of fundamental justice or another Charter standard.",
      "A remedy is available and appropriate.",
    ],
    requiredProof: [
      "Government actor or institution involved.",
      "State decision, omission, or process.",
      "Timeline linking state conduct to harm.",
      "Records showing knowledge, risk, process failure, or rights impact.",
      "Evidence of harm.",
    ],
    commonWeaknesses: [
      "Claim is really negligence dressed as Charter.",
      "No state action.",
      "No causal link.",
      "No clear principle of fundamental justice.",
      "Attack on judicial decision instead of operational state conduct.",
    ],
    likelyDefenceAttacks: [
      "No Charter breach.",
      "No sufficient state action.",
      "No causation.",
      "Claim is an improper collateral attack.",
      "Core discretion or immunity.",
      "Adequate alternative remedy.",
    ],
    judgeConcerns: [
      "What exact Charter right is engaged?",
      "What state conduct caused the deprivation?",
      "Is this really a constitutional claim or a tort claim?",
      "Does the claim attack a protected discretionary or judicial decision?",
    ],
    recommendedQuestions: [
      "Which government actor did what?",
      "What right was affected?",
      "What risk or harm was known before the deprivation?",
      "What process was missing or arbitrary?",
      "What remedy is being requested?",
    ],
    evidenceToRequest: [
      "Government records",
      "Court transcripts",
      "Disclosure",
      "Policies",
      "Emails",
      "Decision records",
      "Timeline",
      "Expert records if relevant",
    ],
    draftingWarnings: [
      "Do not plead Charter as a vague fairness complaint.",
      "Identify the state action and the specific right.",
      "Avoid attacking the judge’s decision directly if the theory is about pre-judicial operational failure.",
    ],
    strategicNotes: [
      "A strong Charter theory separates state conduct, rights deprivation, fundamental justice problem, causation, and remedy.",
      "The best pleading avoids negligence language unless negligence is pleaded separately.",
    ],
  },
  {
    id: "civil-judicial-review-tribunal-overlap",
    courtPaths: ["civil"],
    theoryName: "Judicial review / tribunal overlap",
    plainLanguageMeaning:
      "A pathway issue where the user may need a tribunal, judicial review, appeal, reconsideration, application, or civil claim depending on the decision, forum, remedy, and deadlines.",
    triggerTerms: [
      "tribunal",
      "judicial review",
      "review decision",
      "decision letter",
      "appeal",
      "reconsideration",
      "administrative",
      "board",
      "commission",
      "hrto",
      "landlord tenant board",
      "ltb",
      "wsib",
      "social benefits tribunal",
      "decision was unfair",
      "procedural fairness",
    ],
    requiredElements: [
      "The decision-maker or tribunal is identified.",
      "The decision or order being challenged is identified.",
      "The date of the decision is known.",
      "The available route is clarified: appeal, reconsideration, judicial review, tribunal application, or civil claim.",
      "The remedy requested matches the proper forum.",
    ],
    requiredProof: [
      "Decision letter or order.",
      "Reasons for decision.",
      "Notice of decision date.",
      "Tribunal record, exhibits, submissions, or correspondence.",
      "Rules or deadlines for appeal/review/reconsideration.",
      "Documents showing procedural unfairness or error.",
    ],
    commonWeaknesses: [
      "Deadline not known.",
      "Wrong forum.",
      "User wants damages but route only allows review/remittal.",
      "No decision record.",
      "Trying to relitigate facts instead of identifying reviewable error.",
    ],
    likelyDefenceAttacks: [
      "Wrong forum.",
      "Late filing.",
      "Adequate alternative remedy.",
      "Decision was reasonable.",
      "No procedural unfairness.",
      "Civil action is barred or premature.",
    ],
    judgeConcerns: [
      "What decision is being reviewed?",
      "Is the deadline still open?",
      "Is the remedy available in this forum?",
      "Is this an appeal, judicial review, tribunal process, or civil claim?",
    ],
    recommendedQuestions: [
      "What tribunal or decision-maker made the decision?",
      "What is the decision date?",
      "Do you have written reasons?",
      "What remedy do you want?",
      "Was there an appeal or reconsideration route?",
    ],
    evidenceToRequest: [
      "Decision letter",
      "Reasons",
      "Tribunal record",
      "Notice of hearing",
      "Submissions",
      "Exhibits",
      "Correspondence",
      "Proof of date received",
    ],
    draftingWarnings: [
      "Do not draft a civil claim if the correct first step is appeal, reconsideration, or judicial review.",
      "Identify deadline and forum before documents.",
      "Separate disagreement with outcome from legal review grounds.",
    ],
    strategicNotes: [
      "Tribunal/court overlap is a routing problem before it is a drafting problem.",
      "The system should flag this early to avoid wrong-form workflows.",
    ],
  },
  {
    id: "civil-privacy-records",
    courtPaths: ["civil"],
    theoryName: "Privacy / records misuse",
    plainLanguageMeaning:
      "A civil, administrative, or rights-related issue involving improper disclosure, access, misuse, withholding, alteration, or mishandling of personal records or sensitive information.",
    triggerTerms: [
      "privacy",
      "private information",
      "personal information",
      "records",
      "disclosed",
      "disclosure",
      "access request",
      "foi",
      "freedom of information",
      "medical records",
      "school records",
      "police records",
      "posted my information",
      "shared my information",
      "data breach",
      "confidential",
    ],
    requiredElements: [
      "The record or personal information is identified.",
      "The party who accessed, disclosed, withheld, altered, or misused it is identified.",
      "The user explains why access/disclosure/misuse was improper.",
      "The harm, risk, or remedy requested is explained.",
      "The correct route is considered: complaint, tribunal, regulator, court, or access request.",
    ],
    requiredProof: [
      "Copy or description of the record.",
      "Evidence of disclosure, access, withholding, misuse, or alteration.",
      "Correspondence with the institution or person involved.",
      "Access request, denial, complaint, or response.",
      "Proof of harm, risk, or impact.",
    ],
    commonWeaknesses: [
      "No proof disclosure occurred.",
      "No clear record identified.",
      "No privacy duty or statutory path identified.",
      "Harm is vague.",
      "Wrong forum or complaint process not considered.",
    ],
    likelyDefenceAttacks: [
      "Disclosure was authorized.",
      "Consent was given.",
      "No damages.",
      "Wrong forum.",
      "Record was not private or confidential.",
      "No proof of access or misuse.",
    ],
    judgeConcerns: [
      "What specific information was involved?",
      "Who disclosed, accessed, or misused it?",
      "Was there consent or legal authority?",
      "What harm followed?",
      "What is the correct process or remedy?",
    ],
    recommendedQuestions: [
      "What exact record or information is involved?",
      "Who had access to it?",
      "Who received it?",
      "Was consent given?",
      "What harm or risk followed?",
      "Was a privacy complaint or access request made?",
    ],
    evidenceToRequest: [
      "Copies of records",
      "Screenshots",
      "Disclosure notices",
      "Access request records",
      "Emails",
      "Complaint records",
      "Institution responses",
      "Proof of who received the information",
    ],
    draftingWarnings: [
      "Do not just say privacy was violated. Identify the record, disclosure/access, authority issue, and harm.",
      "Check whether a regulator, complaint route, or access process applies before civil documents.",
    ],
    strategicNotes: [
      "Privacy claims often require careful routing and proof of disclosure/access.",
      "Records chronology is critical.",
    ],
  },
  {
    id: "civil-misfeasance",
    courtPaths: ["civil"],
    theoryName: "Misfeasance in public office",
    plainLanguageMeaning:
      "A serious claim that a public official knowingly or recklessly misused public power in a way likely to harm the plaintiff.",
    triggerTerms: [
      "misfeasance",
      "public office",
      "bad faith",
      "reckless",
      "abuse of power",
      "public authority",
      "crown",
      "police",
      "government",
      "ignored known risk",
      "improper purpose",
    ],
    requiredElements: [
      "A public officer or public authority exercised public power.",
      "The conduct was unlawful or beyond proper authority.",
      "The official knew the conduct was unlawful or was recklessly indifferent.",
      "The official knew harm to the plaintiff was likely or was recklessly indifferent.",
      "The conduct caused damage.",
    ],
    requiredProof: [
      "Identity or role of public authority.",
      "Records showing knowledge of risk or unlawfulness.",
      "Conduct showing misuse of authority.",
      "Timeline showing awareness before harm.",
      "Evidence of harm and causation.",
    ],
    commonWeaknesses: [
      "Only negligence is shown.",
      "No evidence of knowledge or recklessness.",
      "Claim attacks policy or discretion.",
      "Causation is weak.",
      "Public official role is unclear.",
    ],
    likelyDefenceAttacks: [
      "No bad faith or recklessness.",
      "No knowledge of likely harm.",
      "Lawful exercise of discretion.",
      "No causation.",
      "Claim is negligence in disguise.",
      "Insufficient particulars.",
    ],
    judgeConcerns: [
      "What public power was misused?",
      "What facts show knowledge or recklessness?",
      "What harm was likely and known?",
      "Is this more than negligence?",
    ],
    recommendedQuestions: [
      "What public authority acted?",
      "What did they know before the harm?",
      "What legal duty or limit did they disregard?",
      "What shows recklessness rather than mistake?",
      "How did the misuse cause harm?",
    ],
    evidenceToRequest: [
      "Internal records",
      "Warnings",
      "Transcripts",
      "Emails",
      "Policies",
      "Prior reports",
      "Disclosure",
      "Timeline of knowledge",
    ],
    draftingWarnings: [
      "Do not plead misfeasance unless there are facts supporting knowledge or recklessness.",
      "Avoid using misfeasance as a stronger word for negligence.",
      "Particulars matter.",
    ],
    strategicNotes: [
      "Misfeasance is powerful but high threshold.",
      "Use as an alternative or supporting theory only where knowledge/recklessness facts exist.",
    ],
  },
  {
    id: "family-parenting",
    courtPaths: ["family"],
    theoryName: "Parenting / decision-making responsibility",
    plainLanguageMeaning:
      "A family law issue about where the child lives, parenting time, decision-making responsibility, schedules, communication, or child-focused arrangements.",
    triggerTerms: [
      "custody",
      "parenting",
      "decision-making",
      "access",
      "parenting time",
      "child lives",
      "school",
      "schedule",
      "pickup",
      "drop off",
      "denied access",
    ],
    requiredElements: [
      "The child’s current arrangement is known.",
      "The requested parenting order is clear.",
      "The facts are child-focused.",
      "The proposal addresses the child’s best interests.",
      "Safety or conflict concerns are identified if present.",
    ],
    requiredProof: [
      "Current parenting schedule.",
      "Child’s school/daycare information.",
      "Parenting history.",
      "Communication records.",
      "Evidence of missed visits or denied time if relevant.",
      "Safety-related evidence if relevant.",
    ],
    commonWeaknesses: [
      "Parent-focused complaints instead of child-focused facts.",
      "No clear proposed schedule.",
      "No evidence of current arrangement.",
      "Conflict allegations without proof.",
    ],
    likelyDefenceAttacks: [
      "The requested schedule is not child-focused.",
      "The other parent has been more involved.",
      "The user is exaggerating conflict.",
      "The proposal disrupts school or routine.",
      "Safety concerns are unsupported.",
    ],
    judgeConcerns: [
      "What arrangement is in the child’s best interests?",
      "What has actually been happening?",
      "Is the proposal practical?",
      "Are safety concerns supported by evidence?",
    ],
    recommendedQuestions: [
      "What is the current parenting schedule?",
      "What schedule are you asking for?",
      "What facts show this is best for the child?",
      "Are there safety concerns?",
      "What evidence supports missed parenting time or conflict?",
    ],
    evidenceToRequest: [
      "Parenting calendar",
      "School records",
      "Messages about parenting time",
      "Exchange records",
      "Medical/daycare records",
      "Police/CAS records if relevant",
    ],
    draftingWarnings: [
      "Use child-focused wording.",
      "Avoid attacking the other parent without tying the concern to the child.",
      "Be specific about dates and schedules.",
    ],
    strategicNotes: [
      "Family court materials should focus on the child’s routine, stability, safety, and best interests.",
    ],
  },
  {
    id: "family-support",
    courtPaths: ["family"],
    theoryName: "Child or spousal support",
    plainLanguageMeaning:
      "A family law issue about income, support payments, special expenses, disclosure, arrears, or financial responsibility.",
    triggerTerms: [
      "child support",
      "spousal support",
      "income",
      "pay stubs",
      "tax return",
      "notice of assessment",
      "arrears",
      "section 7",
      "expenses",
      "financial disclosure",
    ],
    requiredElements: [
      "Income information is available or requested.",
      "The type of support is identified.",
      "Children or spouse/dependent relationship is identified.",
      "Special expenses or arrears are documented if claimed.",
    ],
    requiredProof: [
      "Recent pay stubs.",
      "Tax returns.",
      "Notices of assessment.",
      "Proof of benefits.",
      "Childcare/medical/special expense receipts.",
      "Support payment history.",
    ],
    commonWeaknesses: [
      "No income disclosure.",
      "Support amount not calculated.",
      "Expenses are claimed without receipts.",
      "Arrears are not documented.",
    ],
    likelyDefenceAttacks: [
      "Income is wrong.",
      "Expenses are unnecessary or unsupported.",
      "Arrears are calculated incorrectly.",
      "Support should be imputed differently.",
    ],
    judgeConcerns: [
      "Is financial disclosure complete?",
      "What is the correct income?",
      "Are special expenses reasonable and proven?",
      "Is the support calculation reliable?",
    ],
    recommendedQuestions: [
      "What income does each party earn?",
      "Are notices of assessment available?",
      "Are there special expenses?",
      "Is support already being paid?",
      "Are arrears claimed?",
    ],
    evidenceToRequest: [
      "Pay stubs",
      "Tax returns",
      "NOAs",
      "Receipts",
      "Support payment records",
      "Bank records",
    ],
    draftingWarnings: [
      "Do not request support without financial disclosure.",
      "Separate table support, special expenses, and arrears.",
    ],
    strategicNotes: [
      "Support analysis depends heavily on accurate income and disclosure.",
    ],
  },
];

function scoreTheory(rule: LegalTheoryRule, input: LegalTheoryInput) {
  const bundle = normalize(
    [
      input.facts,
      input.issues.join(" "),
      input.evidence,
      input.timeline,
      input.damagesBreakdown || "",
      input.goal || "",
    ].join(" ")
  );

  const matchedTriggers = rule.triggerTerms.filter((term) =>
    includesAny(bundle, [term])
  );

  let score = matchedTriggers.length * 15;

  if (rule.courtPaths.includes(input.courtPath)) {
    score += 20;
  } else {
    score -= 40;
  }

  if (matchedTriggers.length >= 3) score += 15;
  if (matchedTriggers.length >= 5) score += 10;

  return { score, matchedTriggers };
}

function evidenceText(input: LegalTheoryInput) {
  return normalize(
    [
      input.evidence,
      input.timeline,
      input.damagesBreakdown || "",
      input.facts,
    ].join(" ")
  );
}

function findMissingProof(rule: LegalTheoryRule, input: LegalTheoryInput) {
  const proofText = evidenceText(input);

  return rule.requiredProof.filter((proof) => {
    const simplified = proof
      .toLowerCase()
      .split(/[,\s/]+/)
      .filter((word) => word.length > 4);

    return !simplified.some((word) => proofText.includes(word));
  });
}

function findMissingElements(rule: LegalTheoryRule, input: LegalTheoryInput) {
  const bundle = normalize(
    [
      input.facts,
      input.issues.join(" "),
      input.evidence,
      input.timeline,
      input.damagesBreakdown || "",
      input.goal || "",
    ].join(" ")
  );

  return rule.requiredElements.filter((element) => {
    const keywords = element
      .toLowerCase()
      .split(/[,\s/]+/)
      .filter((word) => word.length > 5);

    return !keywords.some((word) => bundle.includes(word));
  });
}

export function runLegalTheoryEngine(
  input: LegalTheoryInput
): LegalTheoryResult {
  const matchedTheories = LEGAL_THEORY_RULES
    .filter((rule) => rule.courtPaths.includes(input.courtPath))
    .map((rule) => {
      const scored = scoreTheory(rule, input);
      const missingProof = findMissingProof(rule, input);
      const missingElements = findMissingElements(rule, input);

      return {
        theoryId: rule.id,
        theoryName: rule.theoryName,
        score: scored.score,
        plainLanguageMeaning: rule.plainLanguageMeaning,
        matchedTriggers: scored.matchedTriggers,
        requiredElements: rule.requiredElements,
        missingElements,
        requiredProof: rule.requiredProof,
        missingProof,
        likelyDefenceAttacks: rule.likelyDefenceAttacks,
        judgeConcerns: rule.judgeConcerns,
        recommendedQuestions: rule.recommendedQuestions,
        evidenceToRequest: rule.evidenceToRequest,
        draftingWarnings: rule.draftingWarnings,
        strategicNotes: rule.strategicNotes,
      };
    })
    .filter((match) => match.score > 20)
    .sort((a, b) => b.score - a.score);

  return {
    matchedTheories,
    strongestTheory: matchedTheories[0],
    allMissingProof: cleanList(matchedTheories.flatMap((item) => item.missingProof)),
    allDefenceAttacks: cleanList(matchedTheories.flatMap((item) => item.likelyDefenceAttacks)),
    allJudgeConcerns: cleanList(matchedTheories.flatMap((item) => item.judgeConcerns)),
    allRecommendedQuestions: cleanList(matchedTheories.flatMap((item) => item.recommendedQuestions)),
    allDraftingWarnings: cleanList(matchedTheories.flatMap((item) => item.draftingWarnings)),
    allStrategicNotes: cleanList(matchedTheories.flatMap((item) => item.strategicNotes)),
  };
}