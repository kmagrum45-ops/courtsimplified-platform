import { createDefaultCase, type DefaultCaseBundle } from "./defaults";
import type { FamilyCaseType } from "./types/family-case.ts";

export interface CaseDefinition {
  slug: FamilyCaseType;
  category: "family";
  title: string;
  description: string;
}

export const FAMILY_CASE_DEFINITIONS: CaseDefinition[] = [
  {
    slug: "decision-making-responsibility",
    category: "family",
    title: "Decision-Making Responsibility",
    description: "Requests about parenting decision-making for a child.",
  },
  {
    slug: "parenting-time",
    category: "family",
    title: "Parenting Time",
    description: "Requests about parenting schedules, access, and time with a child.",
  },
  {
    slug: "child-support",
    category: "family",
    title: "Child Support",
    description: "Requests for child support or changes to child support.",
  },
  {
    slug: "spousal-support",
    category: "family",
    title: "Spousal Support",
    description: "Requests for spousal support or changes to support.",
  },
  {
    slug: "property-division",
    category: "family",
    title: "Property Division",
    description: "Issues involving equalization or division of property.",
  },
  {
    slug: "restraining-order",
    category: "family",
    title: "Restraining Order",
    description: "Safety-related family court requests for restraining relief.",
  },
  {
    slug: "other",
    category: "family",
    title: "Other Family Matter",
    description: "A general family case that does not fit the standard categories.",
  },
];

export function getCaseDefinitions(): CaseDefinition[] {
  return FAMILY_CASE_DEFINITIONS;
}

export function getCaseDefinition(slug: string): CaseDefinition {
  const match = FAMILY_CASE_DEFINITIONS.find((item) => item.slug === slug);

  if (!match) {
    throw new Error(`Unsupported case type: ${slug}`);
  }

  return match;
}

export function createCaseFromType(slug: FamilyCaseType): DefaultCaseBundle {
  const bundle = createDefaultCase();
  bundle.family.caseType = slug;
  return bundle;
}