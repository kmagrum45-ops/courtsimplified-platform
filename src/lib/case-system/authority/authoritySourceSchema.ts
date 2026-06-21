export type AuthoritySchemaVersion = "1.0.0";

export type AuthoritySourceType =
  | "constitution"
  | "charter"
  | "statute"
  | "regulation"
  | "rule-of-court"
  | "practice-direction"
  | "official-form"
  | "official-guide"
  | "case-law"
  | "tribunal-decision"
  | "policy"
  | "secondary-source"
  | "unknown";

export type AuthorityJurisdiction =
  | "Canada"
  | "Federal"
  | "Ontario"
  | "Alberta"
  | "British Columbia"
  | "Manitoba"
  | "New Brunswick"
  | "Newfoundland and Labrador"
  | "Northwest Territories"
  | "Nova Scotia"
  | "Nunavut"
  | "Prince Edward Island"
  | "Quebec"
  | "Saskatchewan"
  | "Yukon"
  | "Unknown";

export type AuthorityCourtLevel =
  | "supreme-court-of-canada"
  | "federal-court-of-appeal"
  | "federal-court"
  | "provincial-court-of-appeal"
  | "superior-court"
  | "provincial-court"
  | "tribunal"
  | "unknown";

export type AuthorityBindingLevel =
  | "constitutional"
  | "binding"
  | "highly-persuasive"
  | "persuasive"
  | "limited"
  | "not-authoritative"
  | "unknown";

export type AuthorityVerificationStatus =
  | "verified"
  | "needs-review"
  | "outdated-risk"
  | "overruled-risk"
  | "questionable"
  | "unverified";

export type AuthorityStatus =
  | "active"
  | "repealed"
  | "superseded"
  | "amended"
  | "overruled"
  | "unknown";

export type AuthorityDomain =
  | "family"
  | "civil"
  | "small-claims"
  | "criminal"
  | "charter"
  | "constitutional"
  | "administrative"
  | "employment"
  | "human-rights"
  | "landlord-tenant"
  | "immigration"
  | "evidence"
  | "procedure"
  | "damages"
  | "defamation"
  | "negligence"
  | "contracts"
  | "property"
  | "institutional-liability"
  | "unknown";

export type AuthorityCitation = {
  citation: string;
  neutralCitation?: string;
  shortCitation?: string;
};

export type AuthorityRelationship = {
  authorityId: string;

  relationship:
    | "applies"
    | "interprets"
    | "amends"
    | "repeals"
    | "overrules"
    | "distinguishes"
    | "follows"
    | "cites"
    | "supports"
    | "limits";
};

export type AuthorityMetadata = {
  id: string;

  title: string;

  sourceType: AuthoritySourceType;

  jurisdiction: AuthorityJurisdiction;

  courtLevel?: AuthorityCourtLevel;

  bindingLevel: AuthorityBindingLevel;

  verificationStatus: AuthorityVerificationStatus;

  status: AuthorityStatus;

  citation?: AuthorityCitation;

  sourceUrl?: string;

  enactedDate?: string;

  lastAmendedDate?: string;

  decisionDate?: string;

  domains: AuthorityDomain[];

  keywords: string[];

  summary: string;

  practicalMeaning: string;

  proceduralImpact: string[];

  evidenceImpact: string[];

  burdenImpact: string[];

  strategicImpact: string[];

  limitations: string[];

  warnings: string[];

  relatedAuthorities: AuthorityRelationship[];

  confidence: number;
};

export type AuthorityCollection = {
  id: string;

  version: AuthoritySchemaVersion;

  createdAt: string;

  updatedAt: string;

  authorities: AuthorityMetadata[];
};