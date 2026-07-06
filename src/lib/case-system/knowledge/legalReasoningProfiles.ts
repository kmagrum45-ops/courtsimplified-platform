import { CaseLegalDomain } from "../architecture/masterCaseSchema";

export type LegalReasoningProfileVersion = "1.0.0";

export type LegalReasoningProfileKey =
  | "defamation"
  | "contract"
  | "property-damage"
  | "negligence"
  | "family-parenting"
  | "public-authority"
  | "unknown";

export type LegalReasoningProfile = {
  key: LegalReasoningProfileKey;
  version: LegalReasoningProfileVersion;
  label: string;
  legalDomains: CaseLegalDomain[];
  investigationOrder: string[];
  evidencePriorities: string[];
  burdenFocus: string[];
  contradictionChecks: string[];
  credibilityChecks: string[];
  proceduralWatchPoints: string[];
  judicialConcerns: string[];
  opposingArguments: string[];
  userMistakesToPrevent: string[];
  firstQuestions: string[];
};

export const LEGAL_REASONING_PROFILES: LegalReasoningProfile[] = [
  {
    key: "defamation",
    version: "1.0.0",
    label: "Defamation / reputation harm",
    legalDomains: ["defamation"],
    investigationOrder: [
      "Identify the exact words used.",
      "Identify who made the statement.",
      "Identify who received, saw, or heard the statement.",
      "Determine whether the statement referred to the user.",
      "Determine why the statement may lower reputation.",
      "Identify whether the statement is false, misleading, opinion, or partly true.",
      "Screen for privilege, court/police/employment/CAS context, and other possible defences.",
      "Identify proof of publication and proof of harm.",
    ],
    evidencePriorities: [
      "Full screenshots or message threads",
      "Emails or letters",
      "Social media posts",
      "Witness names",
      "Date and time records",
      "Proof of who received the statement",
      "Proof of harm, loss, reputation impact, or consequences",
    ],
    burdenFocus: [
      "Exact statement",
      "Publication to a third party",
      "Reference to the user",
      "Defamatory meaning",
      "Harm or presumed/general harm depending on context",
      "Response to possible defences",
    ],
    contradictionChecks: [
      "Does the user have the exact words or only a summary?",
      "Does the recipient actually exist and can publication be proven?",
      "Is the statement fact, opinion, or mixed?",
      "Could the statement be substantially true?",
      "Was the statement made in a privileged setting?",
    ],
    credibilityChecks: [
      "Avoid exaggerating damages without evidence.",
      "Separate what was said from how it made the user feel.",
      "Preserve context before and after the statement.",
      "Do not omit parts of the conversation that change meaning.",
    ],
    proceduralWatchPoints: [
      "Confirm province/jurisdiction.",
      "Screen limitation timing.",
      "Confirm proper court path and remedy.",
      "Check whether the publication setting creates privilege or procedural barriers.",
    ],
    judicialConcerns: [
      "Can the exact statement be proven?",
      "Was it actually communicated to a third party?",
      "Was it about the user?",
      "Is there evidence of harm?",
      "Are recognized defences likely to be raised?",
    ],
    opposingArguments: [
      "The statement was true.",
      "The statement was opinion.",
      "The statement was privileged.",
      "There was no publication.",
      "The statement did not identify the user.",
      "There is no proven harm.",
    ],
    userMistakesToPrevent: [
      "Do not summarize the statement when exact wording is available.",
      "Do not ignore who received it.",
      "Do not assume hurt feelings alone prove damages.",
      "Do not overlook privilege or context.",
    ],
    firstQuestions: [
      "What exactly was said about you, word for word if possible?",
      "Who made the statement?",
      "Who received it or saw it?",
      "Do you have proof of the statement, such as a screenshot, email, message, post, or witness?",
    ],
  },
  {
    key: "contract",
    version: "1.0.0",
    label: "Contract / payment dispute",
    legalDomains: ["contract", "debt", "consumer"],
    investigationOrder: [
      "Identify the agreement.",
      "Identify the parties.",
      "Identify the terms.",
      "Identify what each side did.",
      "Identify the breach.",
      "Identify the loss or amount owed.",
      "Identify documents proving agreement, performance, breach, and damages.",
    ],
    evidencePriorities: [
      "Written contract",
      "Text messages or emails",
      "Invoices",
      "Receipts",
      "Bank records",
      "Photos of work/product",
      "Admissions",
    ],
    burdenFocus: [
      "Agreement",
      "Terms",
      "Breach",
      "Performance by user",
      "Loss or remedy",
    ],
    contradictionChecks: [
      "Were terms changed later?",
      "Was payment already made?",
      "Was performance disputed?",
      "Is the amount claimed supported by records?",
    ],
    credibilityChecks: [
      "Avoid claiming amounts without calculation.",
      "Separate agreed price from later expectations.",
      "Preserve full conversations, not selective excerpts.",
    ],
    proceduralWatchPoints: [
      "Confirm court path.",
      "Confirm limitation timing.",
      "Confirm whether Small Claims is appropriate.",
    ],
    judicialConcerns: [
      "Was there a clear agreement?",
      "Can the terms be proven?",
      "Is the amount claimed supported?",
    ],
    opposingArguments: [
      "No agreement existed.",
      "The terms were different.",
      "The user did not perform.",
      "Payment was made.",
      "The damages are unsupported.",
    ],
    userMistakesToPrevent: [
      "Do not rely only on memory if messages or invoices exist.",
      "Do not mix unrelated amounts together.",
      "Do not ignore partial payments.",
    ],
    firstQuestions: [
      "What was the agreement?",
      "What proof shows the agreement?",
      "What exactly did the other side fail to do?",
      "How much money are you claiming and how did you calculate it?",
    ],
  },
  {
    key: "property-damage",
    version: "1.0.0",
    label: "Property damage",
    legalDomains: ["property-damage", "negligence"],
    investigationOrder: [
      "Identify the damaged property.",
      "Identify who caused the damage.",
      "Identify how it happened.",
      "Identify date and location.",
      "Identify repair or replacement cost.",
      "Identify evidence connecting the other party to the damage.",
    ],
    evidencePriorities: [
      "Photos",
      "Repair estimates",
      "Invoices",
      "Witnesses",
      "Messages or admissions",
      "Insurance records",
    ],
    burdenFocus: [
      "Damage occurred",
      "Other party caused it",
      "Cost is proven",
      "Amount claimed is reasonable",
    ],
    contradictionChecks: [
      "Was the damage pre-existing?",
      "Is causation direct or assumed?",
      "Do repair records match the claimed damage?",
    ],
    credibilityChecks: [
      "Do not overstate repair cost.",
      "Separate visible damage from estimated damage.",
      "Preserve before/after photos if available.",
    ],
    proceduralWatchPoints: [
      "Confirm Small Claims suitability.",
      "Confirm limitation timing.",
      "Confirm defendant identity.",
    ],
    judicialConcerns: [
      "Can causation be proven?",
      "Is the repair cost reasonable?",
      "Is there objective evidence?",
    ],
    opposingArguments: [
      "They did not cause the damage.",
      "The damage already existed.",
      "The repair cost is excessive.",
      "There is no proof of loss.",
    ],
    userMistakesToPrevent: [
      "Do not assume causation without proof.",
      "Do not claim repair costs without estimates or invoices.",
    ],
    firstQuestions: [
      "What property was damaged?",
      "How did the other person cause the damage?",
      "Do you have photos or repair estimates?",
    ],
  },
  {
    key: "family-parenting",
    version: "1.0.0",
    label: "Family parenting / support",
    legalDomains: ["family-parenting", "family-support", "family-safety"],
    investigationOrder: [
      "Identify current order or arrangement.",
      "Identify children and current schedule.",
      "Identify requested change.",
      "Identify safety/support/disclosure concerns.",
      "Identify child-focused evidence.",
      "Identify upcoming court dates or conferences.",
    ],
    evidencePriorities: [
      "Current order",
      "Messages",
      "School records",
      "Medical records",
      "Payment records",
      "Parenting schedule",
      "Safety records if relevant",
    ],
    burdenFocus: [
      "Best interests / child-focused facts",
      "Current status quo",
      "Requested order",
      "Evidence supporting the requested outcome",
    ],
    contradictionChecks: [
      "Does the requested order match the facts?",
      "Are adult-conflict facts connected to child impact?",
      "Are support claims supported by payment/income records?",
    ],
    credibilityChecks: [
      "Keep language child-focused.",
      "Avoid unsupported attacks on the other parent.",
      "Use specific dates and examples.",
    ],
    proceduralWatchPoints: [
      "Confirm court stage.",
      "Confirm existing order.",
      "Confirm conference/motion/trial status.",
      "Confirm required disclosure.",
    ],
    judicialConcerns: [
      "How does the request help the child?",
      "What is the current status quo?",
      "Is there evidence for safety/support allegations?",
    ],
    opposingArguments: [
      "Status quo should continue.",
      "No material change.",
      "Request is not child-focused.",
      "Evidence is incomplete.",
    ],
    userMistakesToPrevent: [
      "Do not focus only on adult conflict.",
      "Do not make serious allegations without evidence.",
      "Do not ignore existing orders.",
    ],
    firstQuestions: [
      "Is there already a court order or agreement?",
      "What arrangement exists right now?",
      "What are you asking the court to change?",
    ],
  },
  {
    key: "public-authority",
    version: "1.0.0",
    label: "Public authority / Crown / police",
    legalDomains: ["civil-institutional-liability", "civil-charter", "procedural"],
    investigationOrder: [
      "Identify each public actor.",
      "Identify exactly what each actor did or failed to do.",
      "Separate operational conduct from protected decision-making.",
      "Identify existing court or tribunal record.",
      "Screen jurisdiction, notice, leave, immunity, limitation, and collateral attack risk.",
      "Identify causation and harm.",
      "Identify records proving knowledge, conduct, and causation.",
    ],
    evidencePriorities: [
      "Orders",
      "Transcripts",
      "Audio",
      "Disclosure",
      "Police records",
      "Correspondence",
      "Court file documents",
      "Chronology",
    ],
    burdenFocus: [
      "Actionable conduct",
      "Duty or legal obligation",
      "Causation",
      "Harm",
      "Procedural vehicle",
      "Threshold barriers",
    ],
    contradictionChecks: [
      "Is the claim attacking a decision instead of actionable conduct?",
      "Is there an appeal/review route?",
      "Is causation proven or assumed?",
      "Are defendants separated by role?",
    ],
    credibilityChecks: [
      "Avoid framing as hindsight disagreement only.",
      "Separate facts from conclusions.",
      "Use records wherever possible.",
    ],
    proceduralWatchPoints: [
      "Leave requirements",
      "Notice requirements",
      "Limitation timing",
      "Immunity",
      "Jurisdiction",
      "Collateral attack",
      "Proper defendant naming",
    ],
    judicialConcerns: [
      "Is the claim legally actionable?",
      "Is the procedure correct?",
      "Is there causation?",
      "Is the record complete?",
    ],
    opposingArguments: [
      "Immunity.",
      "Protected discretion.",
      "No duty of care.",
      "No causation.",
      "Wrong forum.",
      "Collateral attack.",
      "Limitation or notice failure.",
    ],
    userMistakesToPrevent: [
      "Do not sue everyone without separating roles.",
      "Do not frame the case only as disagreement with a decision.",
      "Do not ignore threshold procedure.",
    ],
    firstQuestions: [
      "Which public actor is involved?",
      "What exactly did they do or fail to do?",
      "Do you have the court, police, Crown, or government records?",
    ],
  },
];

export function getLegalReasoningProfiles(): LegalReasoningProfile[] {
  return LEGAL_REASONING_PROFILES;
}

export function getReasoningProfilesForDomain(
  domain: CaseLegalDomain,
): LegalReasoningProfile[] {
  return LEGAL_REASONING_PROFILES.filter((profile) =>
    profile.legalDomains.includes(domain),
  );
}