export type Form8Field =
  | "courtFileNumber"
  | "courtLocation"
  | "applicantName"
  | "respondentName"
  | "applicantAddress"
  | "respondentAddress"
  | "applicantLawyer"
  | "respondentLawyer"
  | "claimsDecisionMaking"
  | "claimsParentingTime"
  | "claimsChildSupport"
  | "claimsSpousalSupport"
  | "claimsProperty"
  | "claimsDivorce"
  | "claimsOther"
  | "claimsOtherDetails"
  | "childrenDetails"
  | "importantFacts"
  | "ordersRequested"
  | "financialDetails";

export type Form8Definition = {
  id: "form8";
  title: string;
  description: string;
  fields: {
    key: Form8Field;
    label: string;
    type: "text" | "textarea" | "checkbox";
    required?: boolean;
    placeholder?: string;
  }[];
};

export const form8Definition: Form8Definition = {
  id: "form8",
  title: "Form 8 - Application (General)",
  description:
    "Ontario family court application form for parenting, support, divorce, property, and other family law claims.",
  fields: [
    { key: "courtFileNumber", label: "Court file number", type: "text" },
    { key: "courtLocation", label: "Court location", type: "text", required: true },
    { key: "applicantName", label: "Applicant full name", type: "text", required: true },
    { key: "respondentName", label: "Respondent full name", type: "text", required: true },
    { key: "applicantAddress", label: "Applicant address", type: "textarea", required: true },
    { key: "respondentAddress", label: "Respondent address", type: "textarea" },
    { key: "applicantLawyer", label: "Applicant lawyer", type: "text" },
    { key: "respondentLawyer", label: "Respondent lawyer", type: "text" },

    { key: "claimsDecisionMaking", label: "Decision-making responsibility", type: "checkbox" },
    { key: "claimsParentingTime", label: "Parenting time", type: "checkbox" },
    { key: "claimsChildSupport", label: "Child support", type: "checkbox" },
    { key: "claimsSpousalSupport", label: "Spousal support", type: "checkbox" },
    { key: "claimsProperty", label: "Property", type: "checkbox" },
    { key: "claimsDivorce", label: "Divorce", type: "checkbox" },
    { key: "claimsOther", label: "Other", type: "checkbox" },

    { key: "claimsOtherDetails", label: "Other details", type: "textarea" },
    { key: "childrenDetails", label: "Children details", type: "textarea" },
    { key: "importantFacts", label: "Important facts", type: "textarea", required: true },
    { key: "ordersRequested", label: "Orders requested", type: "textarea", required: true },
    { key: "financialDetails", label: "Financial details", type: "textarea" }
  ]
};