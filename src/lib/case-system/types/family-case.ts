export type FamilyCaseType =
  | "decision-making-responsibility"
  | "parenting-time"
  | "child-support"
  | "spousal-support"
  | "property-division"
  | "restraining-order"
  | "other";

export type OntarioFamilyCourtLevel =
  | "Ontario Court of Justice"
  | "Superior Court of Justice"
  | "Family Court Branch of the Superior Court of Justice";

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
  fullName: string;
  dateOfBirth: string;
  livesWith: string;
}

export interface FamilyCaseFacts {
  relationshipStartDate: string;
  separationDate: string;
  marriageDate: string;
  cohabitationDate: string;
  incidentSummary: string;
  previousOrders: string;
  safetyConcerns: string;
  financialFacts: string;
}

export interface OntarioFamilyCaseData {
  province: "Ontario";
  courtLevel: OntarioFamilyCourtLevel;
  municipality: string;
  courtAddress: string;
  fileNumber: string;
  caseType: FamilyCaseType;
  applicant: PartyInfo;
  respondent: PartyInfo;
  children: ChildInfo[];
  facts: FamilyCaseFacts;
  createdAt: string;
  updatedAt: string;
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

export function createEmptyOntarioFamilyCase(): OntarioFamilyCaseData {
  const now = new Date().toISOString();

  return {
    province: "Ontario",
    courtLevel: "Ontario Court of Justice",
    municipality: "",
    courtAddress: "",
    fileNumber: "",
    caseType: "other",
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
      financialFacts: "",
    },
    createdAt: now,
    updatedAt: now,
  };
}