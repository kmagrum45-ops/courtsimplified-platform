import { AuthorityMetadata } from "./authoritySourceSchema";

import {
  AuthorityVerificationResult,
  verifyAuthorities,
} from "./authorityVerificationEngine";

import {
  AuthorityWeightResult,
  weighAuthorities,
} from "./authorityWeightEngine";

export type CitationUseContext =
  | "pleading"
  | "motion"
  | "affidavit"
  | "factum"
  | "conference-brief"
  | "legal-analysis"
  | "research"
  | "general";

export type CitationSafetyLevel =
  | "safe"
  | "review-required"
  | "unsafe";

export type CitationSafetyResult = {
  authorityId: string;

  safeToCite: boolean;

  safetyLevel: CitationSafetyLevel;

  useContext: CitationUseContext;

  citationSafe: boolean;

  verified: boolean;

  authorityWeight: number;

  requiresManualReview: boolean;

  reasons: string[];

  warnings: string[];

  recommendation: string;
};

export type CitationSafetyEngineInput = {
  authorities: AuthorityMetadata[];
  context: CitationUseContext;
};

export type CitationSafetyEngineOutput = {
  results: CitationSafetyResult[];

  safeAuthorityIds: string[];

  reviewAuthorityIds: string[];

  unsafeAuthorityIds: string[];

  warnings: string[];
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function determineSafetyLevel(args: {
  verification: AuthorityVerificationResult;
  weight: AuthorityWeightResult;
}): CitationSafetyLevel {
  if (!args.verification.citationSafe) {
    return "unsafe";
  }

  if (!args.verification.verified) {
    return "review-required";
  }

  if (args.verification.requiresManualReview) {
    return "review-required";
  }

  if (args.weight.weightScore < 40) {
    return "review-required";
  }

  return "safe";
}

function recommendationForResult(args: {
  safetyLevel: CitationSafetyLevel;
}): string {
  if (args.safetyLevel === "safe") {
    return "Safe for citation in generated legal materials.";
  }

  if (args.safetyLevel === "review-required") {
    return "Review this authority before using it in generated legal documents.";
  }

  return "Do not cite this authority until the underlying issues are resolved.";
}

export function evaluateCitationSafety(
  input: CitationSafetyEngineInput,
): CitationSafetyEngineOutput {
  const verificationOutput = verifyAuthorities(
    input.authorities,
  );

  const weightOutput = weighAuthorities({
    authorities: input.authorities,
  });

  const verificationMap = new Map(
    verificationOutput.results.map((result) => [
      result.authorityId,
      result,
    ]),
  );

  const weightMap = new Map(
    weightOutput.results.map((result) => [
      result.authorityId,
      result,
    ]),
  );

  const results: CitationSafetyResult[] =
    input.authorities.map((authority) => {
      const verification =
        verificationMap.get(authority.id);

      const weight =
        weightMap.get(authority.id);

      if (!verification || !weight) {
        return {
          authorityId: authority.id,

          safeToCite: false,

          safetyLevel: "unsafe",

          useContext: input.context,

          citationSafe: false,

          verified: false,

          authorityWeight: 0,

          requiresManualReview: true,

          reasons: [
            "Authority verification could not be completed.",
          ],

          warnings: [
            "Missing verification or weight data.",
          ],

          recommendation:
            "Do not cite this authority.",
        };
      }

      const safetyLevel =
        determineSafetyLevel({
          verification,
          weight,
        });

      const safeToCite =
        safetyLevel === "safe";

      const reasons: string[] = [];

      if (verification.verified) {
        reasons.push(
          "Authority passed verification.",
        );
      }

      if (verification.citationSafe) {
        reasons.push(
          "Authority is citation safe.",
        );
      }

      if (
        weight.weightGrade === "controlling" ||
        weight.weightGrade === "strong"
      ) {
        reasons.push(
          "Authority carries strong legal weight.",
        );
      }

      return {
        authorityId: authority.id,

        safeToCite,

        safetyLevel,

        useContext: input.context,

        citationSafe:
          verification.citationSafe,

        verified:
          verification.verified,

        authorityWeight:
          weight.weightScore,

        requiresManualReview:
          verification.requiresManualReview,

        reasons,

        warnings: uniqueStrings([
          ...verification.warnings,
          ...weight.warnings,
        ]),

        recommendation:
          recommendationForResult({
            safetyLevel,
          }),
      };
    });

  return {
    results,

    safeAuthorityIds: results
      .filter(
        (result) =>
          result.safetyLevel === "safe",
      )
      .map(
        (result) =>
          result.authorityId,
      ),

    reviewAuthorityIds: results
      .filter(
        (result) =>
          result.safetyLevel ===
          "review-required",
      )
      .map(
        (result) =>
          result.authorityId,
      ),

    unsafeAuthorityIds: results
      .filter(
        (result) =>
          result.safetyLevel ===
          "unsafe",
      )
      .map(
        (result) =>
          result.authorityId,
      ),

    warnings: uniqueStrings(
      results.flatMap(
        (result) =>
          result.warnings,
      ),
    ),
  };
}