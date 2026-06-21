export type FormRecommendation = {
  formNumber: string;
  reason: string;
  priority: "required" | "recommended" | "conditional";
};

export function getFormRecommendations(input: {
  stage: string;
  filed: string[];
  issues: string[];
}) : FormRecommendation[] {

  const forms: FormRecommendation[] = [];

  const hasFiled = (name: string) =>
    input.filed.some(f => f.toLowerCase().includes(name));

  const hasIssue = (issue: string) =>
    input.issues.includes(issue);

  // =========================
  // STAGE: RESPONDING
  // =========================
  if (input.stage === "responding") {
    if (!hasFiled("answer")) {
      forms.push({
        formNumber: "Form 10",
        reason: "You must respond to the application",
        priority: "required"
      });
    }

    if (hasIssue("support") && !hasFiled("financial")) {
      forms.push({
        formNumber: "Form 13",
        reason: "Financial disclosure is required for support issues",
        priority: "required"
      });
    }
  }

  // =========================
  // STAGE: CONFERENCE
  // =========================
  if (input.stage === "conference") {
    forms.push({
      formNumber: "Form 17A",
      reason: "Required before a case conference",
      priority: "required"
    });

    if (hasIssue("support") && !hasFiled("financial")) {
      forms.push({
        formNumber: "Form 13",
        reason: "Updated financials are usually required before conference",
        priority: "required"
      });
    }
  }

  // =========================
  // STAGE: STARTING CASE
  // =========================
  if (input.stage === "starting") {
    if (!hasFiled("application")) {
      forms.push({
        formNumber: "Form 8",
        reason: "You must start your case with an application",
        priority: "required"
      });
    }
  }

  // =========================
  // ALWAYS CHECK MOTIONS
  // =========================
  if (input.stage === "motion") {
    forms.push({
      formNumber: "Form 14",
      reason: "Used to request court orders",
      priority: "required"
    });
  }

  return forms;
}