export type CourtPath = "family" | "small-claims" | "civil";

export type CaseStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "appeal"
  | "not-sure";

export type FormPriority = "required" | "conditional" | "optional" | "later" | "blocked";

export type FormKnowledgeRule = {
  formNumber: string;
  title: string;
  courtPath: CourtPath;
  priority: FormPriority;

  plainPurpose: string;
  usedBy: string[];
  requiredWhen: string[];
  optionalWhen: string[];
  notNeededWhen: string[];
  blockedWhen: string[];

  stageTriggers: CaseStage[];
  issueTriggers: string[];
  factTriggers: string[];
  documentTriggers: string[];

  dependsOn: string[];
  comesBefore: string[];
  comesAfter: string[];

  requiredUserData: string[];
  requiredEvidence: string[];

  lawyerLogic: string;
  judgeConcern: string;
  riskIfWrong: string;
};

export const FORM_KNOWLEDGE_BASE: FormKnowledgeRule[] = [
  {
    formNumber: "7A",
    title: "Plaintiff’s Claim",
    courtPath: "small-claims",
    priority: "required",
    plainPurpose:
      "Starts a Small Claims Court case by setting out who is suing, who is being sued, what happened, and what money or remedy is being claimed.",
    usedBy: ["plaintiff", "claimant", "business suing", "person suing"],
    requiredWhen: [
      "The user is starting a Small Claims Court case.",
      "No Plaintiff’s Claim has already been filed.",
      "The user is asking the court for money or another Small Claims remedy.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "A Plaintiff’s Claim has already been filed.",
      "The user is responding to a claim.",
      "The case is already at settlement conference, trial, or enforcement.",
    ],
    blockedWhen: [
      "The user is the defendant only and is not making a defendant’s claim.",
      "The dispute appears outside Small Claims jurisdiction.",
    ],
    stageTriggers: ["starting-case"],
    issueTriggers: [
      "unpaid money",
      "contract dispute",
      "property damage",
      "debt",
      "refund",
      "deposit",
      "defamation",
      "consumer dispute",
    ],
    factTriggers: [
      "wants to sue",
      "owed money",
      "did not pay",
      "damaged property",
      "breached agreement",
      "wants money back",
    ],
    documentTriggers: ["nothing filed", "not sure"],
    dependsOn: [],
    comesBefore: ["8A", "9A", "settlement conference", "trial"],
    comesAfter: [],
    requiredUserData: [
      "plaintiff legal name",
      "plaintiff address",
      "defendant legal name",
      "defendant address for service",
      "amount claimed",
      "facts",
      "damages breakdown",
      "court location",
    ],
    requiredEvidence: [
      "contract or agreement if any",
      "invoices",
      "receipts",
      "messages",
      "photos",
      "payment records",
      "damage estimates",
    ],
    lawyerLogic:
      "Do not recommend later procedural documents until the originating claim exists. The first task is to create a coherent claim with parties, facts, remedy, damages, and evidence.",
    judgeConcern:
      "The claim must clearly explain what happened, why the defendant is responsible, and how the amount claimed was calculated.",
    riskIfWrong:
      "Recommending later forms before the Plaintiff’s Claim confuses the workflow and may cause the user to skip the document that starts the case.",
  },
  {
    formNumber: "8A",
    title: "Affidavit of Service",
    courtPath: "small-claims",
    priority: "conditional",
    plainPurpose:
      "Proves that court documents were served on another party.",
    usedBy: ["plaintiff", "defendant", "party who served documents"],
    requiredWhen: [
      "A document has already been served and proof of service is needed.",
      "The user says the claim or other document was served.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "No document has been served yet.",
      "The user is still drafting the Plaintiff’s Claim.",
    ],
    blockedWhen: [
      "The user is only starting a claim and has not served anything.",
    ],
    stageTriggers: ["already-started", "responding", "motion", "trial"],
    issueTriggers: ["service problem", "proof of service"],
    factTriggers: ["served the claim", "gave documents", "mailed documents", "served papers"],
    documentTriggers: ["plaintiff's claim filed", "document served"],
    dependsOn: ["document served"],
    comesBefore: ["default judgment", "hearing relying on service"],
    comesAfter: ["7A"],
    requiredUserData: [
      "who served the document",
      "who received it",
      "date of service",
      "method of service",
      "address/location of service",
    ],
    requiredEvidence: [
      "service details",
      "name of person served",
      "date and method of service",
      "supporting notes or receipt if available",
    ],
    lawyerLogic:
      "Only recommend proof of service after there is actually a document to prove was served.",
    judgeConcern:
      "The court needs reliable proof that the other party received proper notice.",
    riskIfWrong:
      "If suggested too early, the user may try to prove service before anything was served.",
  },
  {
    formNumber: "9A",
    title: "Defence",
    courtPath: "small-claims",
    priority: "required",
    plainPurpose:
      "Allows a defendant to respond to a Plaintiff’s Claim by admitting, denying, or disputing what is claimed.",
    usedBy: ["defendant", "person being sued", "business being sued"],
    requiredWhen: [
      "The user has been served with a Plaintiff’s Claim.",
      "The user wants to dispute the claim.",
    ],
    optionalWhen: [
      "The user may still settle, but must understand response deadlines."
    ],
    notNeededWhen: [
      "The user is the plaintiff starting a new claim.",
      "A Defence has already been filed.",
    ],
    blockedWhen: [
      "No claim has been served on the user.",
    ],
    stageTriggers: ["responding"],
    issueTriggers: ["defending claim", "being sued", "disputing claim"],
    factTriggers: ["served with a claim", "claim against me", "being sued", "I am defendant"],
    documentTriggers: ["plaintiff's claim received"],
    dependsOn: ["7A received"],
    comesBefore: ["settlement conference", "trial"],
    comesAfter: ["7A"],
    requiredUserData: [
      "claim number",
      "defendant legal name",
      "what is admitted",
      "what is denied",
      "what is disputed",
      "defence facts",
    ],
    requiredEvidence: [
      "proof contradicting the claim",
      "payment records",
      "messages",
      "contracts",
      "receipts",
      "photos",
    ],
    lawyerLogic:
      "A defence must respond directly to the claim. The system should not recommend a new Plaintiff’s Claim when the user is actually responding.",
    judgeConcern:
      "The Defence should identify what facts are disputed and why.",
    riskIfWrong:
      "If the defendant does not respond properly, default steps may become possible.",
  },
  {
    formNumber: "14A",
    title: "Offer to Settle",
    courtPath: "small-claims",
    priority: "optional",
    plainPurpose:
      "Sets out a formal settlement proposal.",
    usedBy: ["plaintiff", "defendant"],
    requiredWhen: [],
    optionalWhen: [
      "The user wants to make a formal settlement offer.",
      "The case is before settlement conference or trial.",
    ],
    notNeededWhen: [
      "The user only needs to start or respond to a case first.",
      "The case is already resolved.",
    ],
    blockedWhen: [],
    stageTriggers: ["already-started", "conference", "trial"],
    issueTriggers: ["settlement", "offer to settle"],
    factTriggers: ["settle", "offer", "payment plan", "resolve"],
    documentTriggers: ["claim filed", "defence filed"],
    dependsOn: ["case already started"],
    comesBefore: ["settlement conference", "trial"],
    comesAfter: ["7A", "9A"],
    requiredUserData: [
      "terms of offer",
      "deadline for acceptance",
      "payment terms if any",
    ],
    requiredEvidence: [
      "damages calculation",
      "settlement history",
    ],
    lawyerLogic:
      "An offer can be strategic, but it should not replace the required originating or responding documents.",
    judgeConcern:
      "The offer should be clear enough that the other side can accept it.",
    riskIfWrong:
      "A vague offer may not help settlement and may confuse the user’s position.",
  },
  {
    formNumber: "13B",
    title: "List of Proposed Witnesses",
    courtPath: "small-claims",
    priority: "conditional",
    plainPurpose:
      "Identifies witnesses the party expects to rely on at trial.",
    usedBy: ["plaintiff", "defendant"],
    requiredWhen: [
      "The case is moving toward trial and witnesses may be called.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "The case is only starting.",
      "The case is only at defence stage.",
      "The case is enforcement only.",
    ],
    blockedWhen: [],
    stageTriggers: ["trial"],
    issueTriggers: ["trial", "witnesses"],
    factTriggers: ["witness", "trial date", "testify"],
    documentTriggers: ["trial scheduled"],
    dependsOn: ["case proceeding to trial"],
    comesBefore: ["trial"],
    comesAfter: ["settlement conference"],
    requiredUserData: [
      "witness names",
      "what each witness will say",
      "contact information if available",
    ],
    requiredEvidence: [
      "witness notes",
      "documents each witness can prove",
    ],
    lawyerLogic:
      "Witness forms should be recommended only when the case is actually moving toward trial.",
    judgeConcern:
      "Witness evidence should be relevant and not repetitive.",
    riskIfWrong:
      "Recommending witness forms too early overwhelms users and distracts from the current procedural step.",
  },
  {
    formNumber: "8",
    title: "Application",
    courtPath: "family",
    priority: "required",
    plainPurpose:
      "Starts most family court cases by telling the court what orders the applicant is asking for.",
    usedBy: ["applicant", "person starting family case"],
    requiredWhen: [
      "The user is starting a new family case.",
      "No Application has already been filed.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "An Application has already been filed.",
      "The user is responding to an Application.",
      "The user is only bringing a motion in an existing case.",
    ],
    blockedWhen: [],
    stageTriggers: ["starting-case"],
    issueTriggers: [
      "parenting",
      "decision-making responsibility",
      "parenting time",
      "child support",
      "spousal support",
      "property",
      "divorce",
    ],
    factTriggers: [
      "want custody",
      "want parenting time",
      "want support",
      "starting family court",
    ],
    documentTriggers: ["nothing filed"],
    dependsOn: [],
    comesBefore: ["10", "13", "13.1", "35.1", "17A"],
    comesAfter: [],
    requiredUserData: [
      "applicant name",
      "respondent name",
      "children information if parenting",
      "orders requested",
      "facts supporting orders",
    ],
    requiredEvidence: [
      "parenting history",
      "support income documents",
      "agreements",
      "prior orders if any",
    ],
    lawyerLogic:
      "The Application is the originating family document. Do not recommend conference briefs or motion records before the case exists unless there is an existing file.",
    judgeConcern:
      "The requested orders must be clear and tied to facts.",
    riskIfWrong:
      "Starting with later forms can make the user miss the document that opens the case.",
  },
  {
    formNumber: "10",
    title: "Answer",
    courtPath: "family",
    priority: "required",
    plainPurpose:
      "Allows the respondent to answer a family Application and say what they agree with, disagree with, and what orders they want.",
    usedBy: ["respondent"],
    requiredWhen: [
      "The user has received an Application and wants to respond.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "The user is starting the case.",
      "An Answer has already been filed.",
    ],
    blockedWhen: [
      "No Application has been received.",
    ],
    stageTriggers: ["responding"],
    issueTriggers: [
      "responding to family case",
      "answer",
      "application received",
    ],
    factTriggers: [
      "served with application",
      "responding",
      "my ex filed",
    ],
    documentTriggers: ["application received"],
    dependsOn: ["8 received"],
    comesBefore: ["17A", "motion", "conference"],
    comesAfter: ["8"],
    requiredUserData: [
      "respondent name",
      "application details",
      "what is agreed",
      "what is disputed",
      "orders requested by respondent",
    ],
    requiredEvidence: [
      "parenting evidence",
      "income documents",
      "messages",
      "prior agreements or orders",
    ],
    lawyerLogic:
      "Respondents need an Answer, not a new Application, unless making separate claims that procedure allows.",
    judgeConcern:
      "The Answer should respond clearly to the Application.",
    riskIfWrong:
      "Wrongly recommending an Application to a respondent can confuse the role and procedural posture.",
  },
  {
    formNumber: "13",
    title: "Financial Statement",
    courtPath: "family",
    priority: "conditional",
    plainPurpose:
      "Provides financial disclosure for support or financial claims.",
    usedBy: ["applicant", "respondent"],
    requiredWhen: [
      "Child support, spousal support, or financial disclosure is at issue.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "The case is only parenting with no support or financial issue.",
    ],
    blockedWhen: [],
    stageTriggers: ["starting-case", "responding", "conference", "motion"],
    issueTriggers: ["child support", "spousal support", "financial disclosure"],
    factTriggers: [
      "income",
      "support",
      "expenses",
      "pay stubs",
      "tax return",
      "notice of assessment",
    ],
    documentTriggers: [],
    dependsOn: ["financial issue"],
    comesBefore: ["conference", "support order"],
    comesAfter: ["8", "10"],
    requiredUserData: [
      "income",
      "employment",
      "expenses",
      "support paid or received",
    ],
    requiredEvidence: [
      "pay stubs",
      "tax returns",
      "notices of assessment",
      "benefit records",
      "childcare/special expense proof",
    ],
    lawyerLogic:
      "Financial forms should be triggered by support or disclosure issues, not by every family case.",
    judgeConcern:
      "Support cannot be assessed properly without reliable financial disclosure.",
    riskIfWrong:
      "Recommending financial forms in a pure parenting dispute adds unnecessary burden.",
  },
  {
    formNumber: "35.1",
    title: "Affidavit in Support of Claim for Custody or Access",
    courtPath: "family",
    priority: "conditional",
    plainPurpose:
      "Provides parenting-related information when parenting/decision-making or contact with a child is in issue.",
    usedBy: ["parent", "applicant", "respondent"],
    requiredWhen: [
      "Parenting, decision-making responsibility, parenting time, custody, access, or contact with a child is claimed.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "The case has no parenting or child-contact issue.",
      "The issue is only financial support with no parenting dispute.",
    ],
    blockedWhen: [],
    stageTriggers: ["starting-case", "responding", "motion"],
    issueTriggers: [
      "parenting",
      "decision-making responsibility",
      "custody",
      "access",
      "parenting time",
      "contact with child",
    ],
    factTriggers: [
      "child lives with",
      "parenting schedule",
      "custody",
      "access",
      "decision-making",
      "denied parenting time",
    ],
    documentTriggers: [],
    dependsOn: ["parenting claim"],
    comesBefore: ["conference", "parenting order"],
    comesAfter: ["8", "10"],
    requiredUserData: [
      "children names and ages",
      "current parenting schedule",
      "past caregiving history",
      "requested parenting schedule",
      "safety concerns if any",
    ],
    requiredEvidence: [
      "school records",
      "parenting calendar",
      "messages about parenting",
      "medical/daycare records",
      "exchange records",
    ],
    lawyerLogic:
      "Parenting affidavits should be triggered by child-related claims, not by every family case.",
    judgeConcern:
      "The court needs child-focused facts, not general conflict.",
    riskIfWrong:
      "Failing to trigger this form in parenting cases can leave out core parenting evidence.",
  },
  {
    formNumber: "14A",
    title: "Statement of Claim",
    courtPath: "civil",
    priority: "required",
    plainPurpose:
      "Starts many civil actions by pleading material facts, causes of action, parties, damages, and remedies.",
    usedBy: ["plaintiff"],
    requiredWhen: [
      "The user is starting a civil action by claim.",
      "The user seeks damages or civil remedies through an action.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "A Statement of Claim has already been filed.",
      "The matter should proceed by application instead of action.",
      "The user is responding to a civil claim.",
    ],
    blockedWhen: [
      "The user is only defending a lawsuit.",
    ],
    stageTriggers: ["starting-case"],
    issueTriggers: [
      "negligence",
      "breach of contract",
      "defamation",
      "misfeasance",
      "Charter damages",
      "personal injury",
      "property damage",
      "civil assault",
      "debt recovery",
    ],
    factTriggers: [
      "want to sue",
      "damages",
      "negligence",
      "breach",
      "harm caused",
      "government failure",
    ],
    documentTriggers: ["nothing filed"],
    dependsOn: [],
    comesBefore: ["16B", "18A", "discovery", "trial"],
    comesAfter: [],
    requiredUserData: [
      "plaintiff legal name",
      "defendant legal name",
      "court location",
      "material facts",
      "legal basis",
      "remedy requested",
      "damages breakdown",
    ],
    requiredEvidence: [
      "timeline",
      "documents proving facts",
      "damages proof",
      "correspondence",
      "expert or institutional records if applicable",
    ],
    lawyerLogic:
      "Civil claims require pleading discipline: material facts first, legal causes of action second, evidence later.",
    judgeConcern:
      "The pleading must disclose a legally recognized claim and a remedy the court can grant.",
    riskIfWrong:
      "Using the wrong originating process or pleading weak facts can expose the case to procedural attack.",
  },
  {
    formNumber: "18A",
    title: "Statement of Defence",
    courtPath: "civil",
    priority: "required",
    plainPurpose:
      "Allows a defendant in a civil action to respond to the Statement of Claim.",
    usedBy: ["defendant"],
    requiredWhen: [
      "The user has been served with a Statement of Claim and wants to defend.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "The user is starting the case.",
      "A Defence has already been filed.",
    ],
    blockedWhen: [
      "No Statement of Claim has been received.",
    ],
    stageTriggers: ["responding"],
    issueTriggers: ["defence", "responding to civil claim"],
    factTriggers: ["served with claim", "being sued", "statement of claim received"],
    documentTriggers: ["statement of claim received"],
    dependsOn: ["14A received"],
    comesBefore: ["discovery", "trial"],
    comesAfter: ["14A"],
    requiredUserData: [
      "claim details",
      "what is admitted",
      "what is denied",
      "defence facts",
      "legal defences",
    ],
    requiredEvidence: [
      "documents contradicting claim",
      "contracts",
      "messages",
      "payment records",
      "timeline",
    ],
    lawyerLogic:
      "The Defence must respond to pleaded allegations and preserve legal defences.",
    judgeConcern:
      "The Defence should clearly define what issues remain disputed.",
    riskIfWrong:
      "A poor Defence can narrow or damage the user’s position early.",
  },
  {
    formNumber: "16B",
    title: "Affidavit of Service",
    courtPath: "civil",
    priority: "conditional",
    plainPurpose:
      "Proves that a civil court document was served.",
    usedBy: ["plaintiff", "defendant", "moving party"],
    requiredWhen: [
      "A civil document has been served and proof of service is needed.",
    ],
    optionalWhen: [],
    notNeededWhen: [
      "No document has been served yet.",
      "The originating document is still being drafted.",
    ],
    blockedWhen: [
      "The user is only preparing a Statement of Claim and has not served it yet.",
    ],
    stageTriggers: ["already-started", "motion", "trial", "responding"],
    issueTriggers: ["service", "proof of service"],
    factTriggers: ["served", "delivered documents", "mailed documents"],
    documentTriggers: ["document served"],
    dependsOn: ["document served"],
    comesBefore: ["default steps", "motion hearing"],
    comesAfter: ["14A", "37A"],
    requiredUserData: [
      "server name",
      "recipient name",
      "date of service",
      "method of service",
      "address/location",
    ],
    requiredEvidence: [
      "service details",
      "courier receipt if applicable",
      "email/fax confirmation if applicable",
    ],
    lawyerLogic:
      "Proof of service is procedural proof, not an originating step.",
    judgeConcern:
      "The court must be satisfied the other party received proper notice.",
    riskIfWrong:
      "If service proof is missing, the court may refuse to proceed.",
  },
];

export function findKnowledgeForForm(formLabel: string, courtPath?: CourtPath) {
  const normalized = formLabel.toLowerCase();

  return FORM_KNOWLEDGE_BASE.find((form) => {
    const numberMatch =
      normalized.includes(`form ${form.formNumber.toLowerCase()}`) ||
      normalized.includes(form.formNumber.toLowerCase());

    const titleMatch = normalized.includes(form.title.toLowerCase());

    const courtMatch = courtPath ? form.courtPath === courtPath : true;

    return courtMatch && (numberMatch || titleMatch);
  });
}