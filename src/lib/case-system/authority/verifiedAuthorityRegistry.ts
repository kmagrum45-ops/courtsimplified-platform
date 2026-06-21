import {
  AuthorityBindingLevel,
  AuthorityCourtLevel,
  AuthoritySourceType,
  AuthorityVerificationStatus,
} from "./authoritySourceSchema";

export type VerifiedAuthorityRule = {
  id: string;

  sourceType: AuthoritySourceType;

  courtLevel?: AuthorityCourtLevel;

  bindingLevel: AuthorityBindingLevel;

  defaultVerificationStatus: AuthorityVerificationStatus;

  authorityWeight: number;

  consideredVerified: boolean;

  requiresManualReview: boolean;

  citationSafe: boolean;

  explanation: string;
};

export const VERIFIED_AUTHORITY_REGISTRY: VerifiedAuthorityRule[] = [
  {
    id: "canadian-charter",

    sourceType: "charter",

    bindingLevel: "constitutional",

    defaultVerificationStatus: "verified",

    authorityWeight: 100,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "The Canadian Charter of Rights and Freedoms is constitutional authority and carries the highest legal weight.",
  },

  {
    id: "constitution",

    sourceType: "constitution",

    bindingLevel: "constitutional",

    defaultVerificationStatus: "verified",

    authorityWeight: 100,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Constitutional provisions are binding and sit at the top of the legal hierarchy.",
  },

  {
    id: "statute",

    sourceType: "statute",

    bindingLevel: "binding",

    defaultVerificationStatus: "verified",

    authorityWeight: 95,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Valid statutes enacted by the appropriate legislature are binding authority.",
  },

  {
    id: "regulation",

    sourceType: "regulation",

    bindingLevel: "binding",

    defaultVerificationStatus: "verified",

    authorityWeight: 90,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Regulations enacted under statutory authority are generally binding.",
  },

  {
    id: "rule-of-court",

    sourceType: "rule-of-court",

    bindingLevel: "binding",

    defaultVerificationStatus: "verified",

    authorityWeight: 90,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Rules of Court are procedural authorities that courts expect parties to follow.",
  },

  {
    id: "practice-direction",

    sourceType: "practice-direction",

    bindingLevel: "highly-persuasive",

    defaultVerificationStatus: "verified",

    authorityWeight: 85,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Practice Directions guide court operations and procedural expectations.",
  },

  {
    id: "official-form",

    sourceType: "official-form",

    bindingLevel: "binding",

    defaultVerificationStatus: "verified",

    authorityWeight: 80,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Official court forms are approved procedural instruments.",
  },

  {
    id: "official-guide",

    sourceType: "official-guide",

    bindingLevel: "persuasive",

    defaultVerificationStatus: "verified",

    authorityWeight: 75,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Official government and court guides are persuasive operational resources.",
  },

  {
    id: "scc",

    sourceType: "case-law",

    courtLevel: "supreme-court-of-canada",

    bindingLevel: "binding",

    defaultVerificationStatus: "verified",

    authorityWeight: 98,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Supreme Court of Canada decisions are binding across Canada unless displaced by legislation.",
  },

  {
    id: "court-of-appeal",

    sourceType: "case-law",

    courtLevel: "provincial-court-of-appeal",

    bindingLevel: "binding",

    defaultVerificationStatus: "verified",

    authorityWeight: 92,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Provincial Court of Appeal decisions are generally binding within their jurisdiction.",
  },

  {
    id: "superior-court",

    sourceType: "case-law",

    courtLevel: "superior-court",

    bindingLevel: "highly-persuasive",

    defaultVerificationStatus: "verified",

    authorityWeight: 80,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Superior Court decisions are persuasive and often influential.",
  },

  {
    id: "provincial-court",

    sourceType: "case-law",

    courtLevel: "provincial-court",

    bindingLevel: "persuasive",

    defaultVerificationStatus: "verified",

    authorityWeight: 65,

    consideredVerified: true,

    requiresManualReview: false,

    citationSafe: true,

    explanation:
      "Provincial Court decisions may be persuasive depending on context.",
  },

  {
    id: "tribunal",

    sourceType: "tribunal-decision",

    courtLevel: "tribunal",

    bindingLevel: "limited",

    defaultVerificationStatus: "needs-review",

    authorityWeight: 50,

    consideredVerified: false,

    requiresManualReview: true,

    citationSafe: true,

    explanation:
      "Tribunal decisions may be useful but require context-specific review.",
  },

  {
    id: "secondary-source",

    sourceType: "secondary-source",

    bindingLevel: "not-authoritative",

    defaultVerificationStatus: "needs-review",

    authorityWeight: 20,

    consideredVerified: false,

    requiresManualReview: true,

    citationSafe: false,

    explanation:
      "Secondary sources assist understanding but should not be relied upon as primary authority.",
  },

  {
    id: "policy",

    sourceType: "policy",

    bindingLevel: "limited",

    defaultVerificationStatus: "needs-review",

    authorityWeight: 25,

    consideredVerified: false,

    requiresManualReview: true,

    citationSafe: false,

    explanation:
      "Policies may explain administrative practice but are not generally binding legal authority.",
  },
];

export function findVerifiedAuthorityRule(args: {
  sourceType: AuthoritySourceType;
  courtLevel?: AuthorityCourtLevel;
}): VerifiedAuthorityRule | undefined {
  return VERIFIED_AUTHORITY_REGISTRY.find(
    (rule) =>
      rule.sourceType === args.sourceType &&
      (rule.courtLevel === undefined ||
        rule.courtLevel === args.courtLevel),
  );
}