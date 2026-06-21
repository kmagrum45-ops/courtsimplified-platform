export type FamilyCaseType =
  | "decision-making-responsibility"
  | "parenting-time"
  | "child-support"
  | "spousal-support"
  | "property-division"
  | "restraining-order"
  | "divorce"
  | "mobility-relocation"
  | "variation-change-existing-order"
  | "enforcement"
  | "urgent-motion"
  | "case-conference"
  | "settlement-conference"
  | "trial-management-conference"
  | "other";

export type OntarioFamilyCourtLevel =
  | "Ontario Court of Justice"
  | "Superior Court of Justice"
  | "Family Court Branch of the Superior Court of Justice";

export type FamilyUserRole =
  | "applicant"
  | "respondent"
  | "joint-applicant"
  | "third-party-caregiver"
  | "not-sure";

export type FamilyRelationshipStatus =
  | "married"
  | "common-law"
  | "dating-relationship"
  | "never-married-parents"
  | "separated"
  | "divorced"
  | "not-sure";

export type FamilyLitigationStage =
  | "not-started"
  | "application-started"
  | "responding-to-application"
  | "answer-filed"
  | "case-conference"
  | "settlement-conference"
  | "trial-management-conference"
  | "motion"
  | "urgent-motion"
  | "trial"
  | "final-order-made"
  | "variation-or-change"
  | "enforcement"
  | "not-sure";

export type ParentingIssueType =
  | "decision-making"
  | "parenting-schedule"
  | "primary-residence"
  | "supervised-parenting"
  | "communication-between-parents"
  | "exchange-location"
  | "schooling"
  | "medical-decisions"
  | "travel"
  | "mobility-relocation"
  | "withholding-parenting-time"
  | "child-refusing-contact"
  | "grandparent-or-third-party-contact"
  | "other";

export type SafetyConcernType =
  | "family-violence"
  | "coercive-control"
  | "harassment"
  | "threats"
  | "stalking"
  | "substance-use"
  | "mental-health-crisis"
  | "child-abduction-risk"
  | "child-protection-involvement"
  | "police-involvement"
  | "restraining-order-needed"
  | "supervision-needed"
  | "none-known"
  | "other";

export type SupportIssueType =
  | "table-child-support"
  | "section-7-expenses"
  | "income-dispute"
  | "imputed-income"
  | "self-employment-income"
  | "arrears"
  | "special-expenses"
  | "spousal-support-entitlement"
  | "spousal-support-amount"
  | "spousal-support-duration"
  | "financial-disclosure-missing"
  | "other";

export type PropertyIssueType =
  | "matrimonial-home"
  | "equalization"
  | "bank-accounts"
  | "debts"
  | "vehicles"
  | "pensions"
  | "business-interest"
  | "excluded-property"
  | "household-contents"
  | "sale-of-home"
  | "occupation-rent"
  | "other";

export type EvidenceReadiness = "strong" | "partial" | "weak" | "unknown";

export type FamilyDocumentStatus =
  | "not-started"
  | "drafted"
  | "filed"
  | "served"
  | "received"
  | "missing"
  | "not-needed-now"
  | "unknown";

export type FamilyEvidenceCategory =
  | "court-order"
  | "court-application-answer-reply"
  | "parenting-schedule"
  | "message-email-text"
  | "police-report"
  | "child-protection-record"
  | "school-record"
  | "medical-record"
  | "therapy-counselling-record"
  | "financial-disclosure"
  | "income-tax-return"
  | "notice-of-assessment"
  | "paystub"
  | "bank-statement"
  | "expense-receipt"
  | "section-7-expense-proof"
  | "property-document"
  | "mortgage-or-lease"
  | "photo-video"
  | "witness"
  | "affidavit"
  | "service-proof"
  | "settlement-offer"
  | "other";

export interface PersonName {
  firstName: string;
  middleName: string;
  lastName: string;
}

export interface AddressInfo {
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
}

export interface PartyInfo {
  name: PersonName;
  address: AddressInfo;
  contact: ContactInfo;
  lawyerName: string;
  lawyerLicenseNumber: string;
  isSelfRepresented: boolean;
}

export interface ChildInfo {
  id: string;
  fullName: string;
  dateOfBirth: string;
  age?: number;
  livesWith: string;
  schoolOrDaycare: string;
  currentParentingSchedule: string;
  specialNeeds: string;
  medicalNeeds: string;
  childProtectionInvolvement: string;
  childViewsOrPreferences: string;
}

export interface FamilyCaseFacts {
  relationshipStartDate: string;
  separationDate: string;
  marriageDate: string;
  cohabitationDate: string;
  incidentSummary: string;
  previousOrders: string;
  safetyConcerns: string;
  parentingFacts: string;
  childSupportFacts: string;
  spousalSupportFacts: string;
  propertyFacts: string;
  financialFacts: string;
  communicationHistory: string;
  settlementHistory: string;
  urgentFacts: string;
}

export interface FamilyProceduralHistory {
  hasExistingCourtFile: boolean;
  existingFileNumber: string;
  existingOrders: string;
  upcomingCourtDates: string;
  documentsAlreadyFiled: FamilyCaseDocument[];
  documentsReceived: FamilyCaseDocument[];
  serviceStatus: string;
  lastCourtStep: string;
  nextKnownCourtStep: string;
}

export interface FamilyCaseDocument {
  formNumber: string;
  title: string;
  status: FamilyDocumentStatus;
  filedDate?: string;
  servedDate?: string;
  receivedDate?: string;
  notes?: string;
}

export interface FamilyEvidenceItem {
  id: string;
  title: string;
  category: FamilyEvidenceCategory;
  description: string;
  date?: string;
  source?: string;
  fileName?: string;
  relevance: string;
  linkedIssues: Array<
    ParentingIssueType | SafetyConcernType | SupportIssueType | PropertyIssueType | FamilyCaseType
  >;
  strength: EvidenceReadiness;
}

export interface FamilyFinancialSnapshot {
  applicantIncome: string;
  respondentIncome: string;
  incomeDisputed: boolean;
  financialDisclosureMissing: boolean;
  childSupportRequested: boolean;
  spousalSupportRequested: boolean;
  section7ExpensesClaimed: boolean;
  arrearsClaimed: boolean;
  propertyDivisionRequested: boolean;
  notes: string;
}

export interface FamilySafetySnapshot {
  hasSafetyConcerns: boolean;
  concerns: SafetyConcernType[];
  policeInvolvement: string;
  childProtectionInvolvement: string;
  restrainingOrderRequested: boolean;
  supervisedParentingRequested: boolean;
  urgentActionRequested: boolean;
  safetyPlanNotes: string;
}

export interface FamilyParentingSnapshot {
  issues: ParentingIssueType[];
  currentArrangement: string;
  requestedArrangement: string;
  bestInterestsFacts: string;
  communicationProblems: string;
  exchangeProblems: string;
  schoolMedicalTravelIssues: string;
}

export interface FamilyPropertySnapshot {
  issues: PropertyIssueType[];
  matrimonialHomeIssue: string;
  debtsIssue: string;
  assetDisclosureIssue: string;
  equalizationIssue: string;
  urgentPropertyIssue: string;
}

export interface FamilyAnalysisResult {
  courtPath: "family";
  caseStage: FamilyLitigationStage;
  detectedFamilyIssues: FamilyCaseType[];
  parentingIssues: ParentingIssueType[];
  supportIssues: SupportIssueType[];
  propertyIssues: PropertyIssueType[];
  safetyIssues: SafetyConcernType[];
  recommendedNextForms: string[];
  notNeededNow: string[];
  missingInformation: string[];
  missingEvidence: string[];
  evidenceStrengths: string[];
  evidenceWeaknesses: string[];
  bestInterestsFactors: string[];
  likelyOtherSideArguments: string[];
  likelyJudgeConcerns: string[];
  recommendedEvidence: string[];
  recommendedFamilyNextSteps: string[];
  suggestedWordingImprovements: string[];
  urgentWarnings: string[];
  serviceRisks: string[];
  disclosureRisks: string[];
  proceduralRisks: string[];
  summary: string;
}

export interface OntarioFamilyCaseData {
  province: "Ontario";
  courtLevel: OntarioFamilyCourtLevel;
  municipality: string;
  courtAddress: string;
  fileNumber: string;
  caseType: FamilyCaseType;
  role: FamilyUserRole;
  relationshipStatus: FamilyRelationshipStatus;
  litigationStage: FamilyLitigationStage;
  applicant: PartyInfo;
  respondent: PartyInfo;
  children: ChildInfo[];
  facts: FamilyCaseFacts;
  procedural: FamilyProceduralHistory;
  parenting: FamilyParentingSnapshot;
  safety: FamilySafetySnapshot;
  financial: FamilyFinancialSnapshot;
  property: FamilyPropertySnapshot;
  evidence: FamilyEvidenceItem[];
  analysis?: FamilyAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyPerson(): PartyInfo {
  return {
    name: {
      firstName: "",
      middleName: "",
      lastName: "",
    },
    address: {
      street: "",
      unit: "",
      city: "",
      province: "Ontario",
      postalCode: "",
      country: "Canada",
    },
    contact: {
      email: "",
      phone: "",
    },
    lawyerName: "",
    lawyerLicenseNumber: "",
    isSelfRepresented: true,
  };
}

export function createEmptyChild(): ChildInfo {
  return {
    id: createId("child"),
    fullName: "",
    dateOfBirth: "",
    livesWith: "",
    schoolOrDaycare: "",
    currentParentingSchedule: "",
    specialNeeds: "",
    medicalNeeds: "",
    childProtectionInvolvement: "",
    childViewsOrPreferences: "",
  };
}

export function createEmptyFamilyCaseDocument(
  formNumber = "",
  title = "",
  status: FamilyDocumentStatus = "unknown",
): FamilyCaseDocument {
  return {
    formNumber,
    title,
    status,
    notes: "",
  };
}

export function createEmptyFamilyEvidenceItem(): FamilyEvidenceItem {
  return {
    id: createId("family_evidence"),
    title: "",
    category: "other",
    description: "",
    relevance: "",
    linkedIssues: [],
    strength: "unknown",
  };
}

export function createEmptyOntarioFamilyCase(): OntarioFamilyCaseData {
  const now = new Date().toISOString();

  return {
    province: "Ontario",
    courtLevel: "Ontario Court of Justice",
    municipality: "",
    courtAddress: "",
    fileNumber: "",
    caseType: "other",
    role: "not-sure",
    relationshipStatus: "not-sure",
    litigationStage: "not-sure",
    applicant: createEmptyPerson(),
    respondent: createEmptyPerson(),
    children: [],
    facts: {
      relationshipStartDate: "",
      separationDate: "",
      marriageDate: "",
      cohabitationDate: "",
      incidentSummary: "",
      previousOrders: "",
      safetyConcerns: "",
      parentingFacts: "",
      childSupportFacts: "",
      spousalSupportFacts: "",
      propertyFacts: "",
      financialFacts: "",
      communicationHistory: "",
      settlementHistory: "",
      urgentFacts: "",
    },
    procedural: {
      hasExistingCourtFile: false,
      existingFileNumber: "",
      existingOrders: "",
      upcomingCourtDates: "",
      documentsAlreadyFiled: [],
      documentsReceived: [],
      serviceStatus: "",
      lastCourtStep: "",
      nextKnownCourtStep: "",
    },
    parenting: {
      issues: [],
      currentArrangement: "",
      requestedArrangement: "",
      bestInterestsFacts: "",
      communicationProblems: "",
      exchangeProblems: "",
      schoolMedicalTravelIssues: "",
    },
    safety: {
      hasSafetyConcerns: false,
      concerns: [],
      policeInvolvement: "",
      childProtectionInvolvement: "",
      restrainingOrderRequested: false,
      supervisedParentingRequested: false,
      urgentActionRequested: false,
      safetyPlanNotes: "",
    },
    financial: {
      applicantIncome: "",
      respondentIncome: "",
      incomeDisputed: false,
      financialDisclosureMissing: false,
      childSupportRequested: false,
      spousalSupportRequested: false,
      section7ExpensesClaimed: false,
      arrearsClaimed: false,
      propertyDivisionRequested: false,
      notes: "",
    },
    property: {
      issues: [],
      matrimonialHomeIssue: "",
      debtsIssue: "",
      assetDisclosureIssue: "",
      equalizationIssue: "",
      urgentPropertyIssue: "",
    },
    evidence: [],
    createdAt: now,
    updatedAt: now,
  };
}
