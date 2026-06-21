import {
  AuthorityBindingLevel,
  AuthorityCourtLevel,
  AuthorityMetadata,
  AuthorityVerificationStatus,
} from "./authoritySourceSchema";

import {
  VerifiedAuthorityRule,
  findVerifiedAuthorityRule,
} from "./verifiedAuthorityRegistry";

export type AuthorityVerificationResult = {
  authorityId: string;
  verified: boolean;
  citationSafe: boolean;
  requiresManualReview: boolean;
  authorityWeight: number;
  bindingLevel: AuthorityBindingLevel;
  verificationStatus: AuthorityVerificationStatus;
  warnings: string[];
  explanation: string;
};

export type AuthorityVerificationEngineOutput = {
  results: AuthorityVerificationResult[];
  verifiedCount: number;
  manualReviewCount: number;
  unsafeCitationCount: number;
  warnings: string[];
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasCitation(authority: AuthorityMetadata): boolean {
  return Boolean(authority.citation?.citation?.trim());
}

function hasSummary(authority: AuthorityMetadata): boolean {
  return authority.summary.trim().length > 0;
}

function getVerificationRule(
  authority: AuthorityMetadata,
): VerifiedAuthorityRule | undefined {
  return findVerifiedAuthorityRule({
    sourceType: authority.sourceType,
    courtLevel: authority.courtLevel as AuthorityCourtLevel | undefined,
  });
}

function verifySingleAuthority(
  authority: AuthorityMetadata,
): AuthorityVerificationResult {
  const warnings: string[] = [];
  const rule = getVerificationRule(authority);

  if (!rule) {
    return {
      authorityId: authority.id,
      verified: false,
      citationSafe: false,
      requiresManualReview: true,
      authorityWeight: 0,
      bindingLevel: authority.bindingLevel,
      verificationStatus: "needs-review",
      warnings: [
        "No verification rule exists for this authority type or court level.",
      ],
      explanation:
        "CourtSimplified cannot safely classify this authority until a registry rule exists.",
    };
  }

  let verified = rule.consideredVerified;
  let citationSafe = rule.citationSafe;
  let requiresManualReview = rule.requiresManualReview;
  let authorityWeight = rule.authorityWeight;
  let verificationStatus: AuthorityVerificationStatus =
    rule.defaultVerificationStatus;

  if (authority.status === "repealed") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = Math.min(authorityWeight, 5);
    verificationStatus = "outdated-risk";
    warnings.push("Authority is marked as repealed.");
  }

  if (authority.status === "superseded") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = Math.min(authorityWeight, 10);
    verificationStatus = "outdated-risk";
    warnings.push("Authority is marked as superseded.");
  }

  if (authority.status === "overruled") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = 0;
    verificationStatus = "overruled-risk";
    warnings.push("Authority is marked as overruled.");
  }

  if (authority.status === "amended") {
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 10, 0);
    verificationStatus = "needs-review";
    warnings.push("Authority is marked as amended and should be checked.");
  }

  if (authority.status === "unknown") {
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 15, 0);
    verificationStatus = "needs-review";
    warnings.push("Authority status is unknown.");
  }

  if (authority.verificationStatus === "overruled-risk") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = 0;
    verificationStatus = "overruled-risk";
    warnings.push("Authority has an overruled-risk flag.");
  }

  if (authority.verificationStatus === "outdated-risk") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 25, 0);
    verificationStatus = "outdated-risk";
    warnings.push("Authority may be outdated and should be reviewed.");
  }

  if (authority.verificationStatus === "needs-review") {
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 10, 0);
    verificationStatus = "needs-review";
    warnings.push("Authority requires manual review before reliance.");
  }

  if (authority.verificationStatus === "questionable") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 40, 0);
    verificationStatus = "questionable";
    warnings.push("Authority is marked questionable.");
  }

  if (authority.verificationStatus === "unverified") {
    verified = false;
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 50, 0);
    verificationStatus = "unverified";
    warnings.push("Authority is unverified.");
  }

  if (!hasCitation(authority)) {
    citationSafe = false;
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 10, 0);
    warnings.push("Authority is missing a usable citation.");
  }

  if (!hasSummary(authority)) {
    requiresManualReview = true;
    authorityWeight = Math.max(authorityWeight - 5, 0);
    warnings.push("Authority is missing a summary.");
  }

  if (authority.sourceType === "secondary-source") {
    verified = false;
    requiresManualReview = true;
    citationSafe = false;
    warnings.push(
      "Secondary sources should not be treated as primary legal authority.",
    );
  }

  if (authority.sourceType === "policy") {
    requiresManualReview = true;
    citationSafe = false;
    warnings.push(
      "Policy sources require review before being used as legal authority.",
    );
  }

  return {
    authorityId: authority.id,
    verified,
    citationSafe,
    requiresManualReview,
    authorityWeight: clampWeight(authorityWeight),
    bindingLevel: rule.bindingLevel,
    verificationStatus,
    warnings: uniqueStrings(warnings),
    explanation: rule.explanation,
  };
}

export function verifyAuthorities(
  authorities: AuthorityMetadata[],
): AuthorityVerificationEngineOutput {
  const results = authorities.map(verifySingleAuthority);

  return {
    results,
    verifiedCount: results.filter((result) => result.verified).length,
    manualReviewCount: results.filter(
      (result) => result.requiresManualReview,
    ).length,
    unsafeCitationCount: results.filter((result) => !result.citationSafe).length,
    warnings: uniqueStrings(results.flatMap((result) => result.warnings)),
  };
}