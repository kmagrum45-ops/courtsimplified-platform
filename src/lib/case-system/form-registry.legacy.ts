import { form8Definition } from "./form8";
import type { FamilyCaseType } from "./types/family-case.ts";

export type FormDefinition = {
  id: string;
  title: string;
  description: string;
  fields: any[];
};

export type FormRecommendation = {
  formNumber: string;
  title: string;
  reason: string;
  status: "recommended" | "already_completed" | "missing_info";
};

export const ALL_FORMS: FormDefinition[] = [form8Definition];

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function analyzeFamilyFormNeeds(input: string): {
  completedForms: FormRecommendation[];
  recommendedForms: FormRecommendation[];
  missingInfoQuestions: string[];
} {
  const text = input.toLowerCase();

  const completedForms: FormRecommendation[] = [];
  const recommendedForms: FormRecommendation[] = [];
  const missingInfoQuestions: string[] = [];

  const responseAlreadyDone = includesAny(text, [
    "response",
    "answered",
    "answer filed",
    "filed my answer",
    "responded",
  ]);

  const financialAlreadyDone = includesAny(text, [
    "financial papers",
    "financial statement",
    "form 13",
    "disclosure",
    "income documents",
  ]);

  const hasCaseConference = includesAny(text, [
    "case conference",
    "conference coming",
    "conference coming up",
  ]);

  const hasParentingIssue = includesAny(text, [
    "custody",
    "parenting",
    "decision-making",
    "decision making",
    "access",
    "parenting time",
    "child lives",
    "full custody",
  ]);

  const hasSupportIssue = includesAny(text, [
    "child support",
    "spousal support",
    "support",
    "income",
    "arrears",
  ]);

  if (responseAlreadyDone) {
    completedForms.push({
      formNumber: "Form 10",
      title: "Answer",
      reason: "User said a response/answer has already been filed.",
      status: "already_completed",
    });
  }

  if (financialAlreadyDone) {
    completedForms.push({
      formNumber: "Form 13",
      title: "Financial Statement",
      reason: "User said financial papers/disclosure have already been completed.",
      status: "already_completed",
    });
  }

  if (hasCaseConference) {
    recommendedForms.push({
      formNumber: "Form 17A",
      title: "Case Conference Brief",
      reason: "User mentioned an upcoming case conference.",
      status: "recommended",
    });

    missingInfoQuestions.push("What is the date of the case conference?");
    missingInfoQuestions.push("What issues do you want the judge to deal with at the conference?");
  }

  if (hasParentingIssue) {
    missingInfoQuestions.push("What parenting schedule are you asking for?");
    missingInfoQuestions.push("What facts support your child’s best interests?");
  }

  if (hasSupportIssue && !financialAlreadyDone) {
    recommendedForms.push({
      formNumber: "Form 13",
      title: "Financial Statement",
      reason: "Support is mentioned and financial disclosure may be required.",
      status: "recommended",
    });
  }

  if (!responseAlreadyDone && !hasCaseConference) {
    recommendedForms.push({
      formNumber: "Form 10",
      title: "Answer",
      reason: "The user appears to be responding to an existing family court case.",
      status: "recommended",
    });
  }

  return {
    completedForms,
    recommendedForms,
    missingInfoQuestions: [...new Set(missingInfoQuestions)],
  };
}

export function getFormsForFamilyCase(caseType: FamilyCaseType): FormDefinition[] {
  switch (caseType) {
    case "decision-making-responsibility":
    case "parenting-time":
    case "child-support":
    case "spousal-support":
    case "property-division":
    case "restraining-order":
    case "other":
      return ALL_FORMS;

    default:
      return [];
  }
}