import type {
  AnalysisResult,
  UniversalStage,
} from "@/app/builder/_components/builderTypes";

import {
  normalizeAiIntake,
  type ClaimFamily,
  type EvidenceCategory,
  type LegalElementStatus,
  type NormalizedLegalElement,
} from "./aiIntakeNormalizer";

import {
  cleanList,
  detectLimitationRisk,
  extractDollarAmounts,
  hasText,
} from "./utils";

export const ONTARIO_SMALL_CLAIMS_LIMIT = 50000;

export type SmallClaimsEngineInput = {
  caseStage: UniversalStage;
  issues: string[];
  filedDocuments: string[];
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  amountClaimed: string;
  damagesBreakdown: string;
  agreementDetails: string;
  paymentHistory: string;
  serviceDetails: string;
  deadlineDetails: string;
  settlementEfforts: string;
  defenceResponse: string;
  goal: string;
  urgent: string;
  completedForms?: string[];
  receivedForms?: string[];
  availableEvidence?: string[];
  userData?: Record<string, unknown>;
  uploadedEvidenceFiles?: Array<Record<string, unknown>>;
};

type ClaimFamilyProfile = {
  family: ClaimFamily;
  userLabel: string;
  claimTypeLabel: string;
  plainLanguageSummary: string;
  coreProofFocus: string[];
  damagesGuidance: string[];
  defenceAttacks: string[];
  judgeConcerns: string[];
  strategicFocus: string[];
  documentRequests: string[];
  nextActions: string[];
};

function getStageLabel(stage: UniversalStage): string {
  const labels: Record<UniversalStage, string> = {
    "starting-case": "Starting a new case",
    responding: "Responding to a case",
    "already-started": "Case already started",
    conference: "Settlement conference",
    motion: "Motion stage",
    trial: "Trial preparation",
    enforcement: "Enforcement",
    urgent: "Urgent issue",
    "not-sure": "Stage unclear",
  };

  return labels[stage] ?? "Stage unclear";
}

function getHighestDollarAmount(text: string): number | null {
  const amounts = extractDollarAmounts(text);
  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function statusNeedsWork(status: unknown): boolean {
  return (
    status === "missing" ||
    status === "unclear" ||
    status === "partially-supported" ||
    status === false ||
    status === null ||
    typeof status === "undefined"
  );
}

function statusIsSupported(status: unknown): boolean {
  return status === "supported" || status === true;
}

function elementNeed(element: NormalizedLegalElement): string {
  return element.userFacingNeed || `${element.label} needs clearer proof.`;
}

function evidenceCategoryLabel(category: EvidenceCategory): string {
  const labels: Partial<Record<EvidenceCategory, string>> = {
    "contract-agreement": "contract, agreement, quote, terms, or written understanding",
    "invoice-payment": "invoice, payment record, account statement, or balance record",
    "receipt-expense": "receipt, expense record, replacement cost, or out-of-pocket record",
    "bank-transfer": "bank record, e-transfer, cheque, or transfer confirmation",
    "text-email-message": "texts, emails, direct messages, letters, or chat records",
    "social-media-post": "social media post, profile, comment, or online publication",
    screenshot: "screenshots preserving the statement, message, post, or transaction",
    "photo-video": "photos or videos",
    "repair-estimate": "repair estimate, inspection note, or repair invoice",
    witness: "witness information or person who saw, heard, or knows what happened",
    "publication-recipient": "person who received, saw, or heard the statement",
    "retraction-apology": "retraction request, apology request, refusal, or correction history",
    medical: "medical or treatment record",
    "employment-income": "income, employment, business, client, or lost-work record",
    "court-document": "court document, order, claim, defence, notice, or judgment",
    "service-proof": "proof of service, affidavit of service, delivery record, or process-server note",
    "settlement-communication": "settlement offer, demand letter, repayment request, apology request, or negotiation record",
    "judgment-enforcement": "judgment, enforcement record, debtor information, or garnishment information",
    "ownership-property": "ownership record, receipt, title, registration, or proof the property belongs to the claimant",
    "expert-inspection": "inspection report, expert note, repair assessment, or third-party opinion",
    other: "other supporting document or record",
  };

  return labels[category] ?? String(category);
}

const DEFAULT_PROFILE: ClaimFamilyProfile = {
  family: "unknown",
  userLabel: "Unclear small claims dispute",
  claimTypeLabel: "Unclear Small Claims Court issue",
  plainLanguageSummary:
    "The situation may involve a Small Claims Court issue, but more facts are needed before the system can classify it confidently.",
  coreProofFocus: [
    "What happened",
    "Who caused the loss",
    "What money or remedy is being requested",
    "What documents support the claim",
  ],
  damagesGuidance: [
    "Start by identifying the exact money loss.",
    "Upload documents showing payment, damage, repair, refund, unpaid amount, or other measurable harm.",
  ],
  defenceAttacks: [
    "The other side may argue the claim is unclear.",
    "The other side may argue the amount is unsupported.",
    "The other side may argue the court cannot grant the remedy requested.",
  ],
  judgeConcerns: [
    "What legal issue is actually before the court?",
    "What money is being claimed?",
    "What evidence supports the claim?",
  ],
  strategicFocus: [
    "Clarify the claim before generating forms.",
    "Focus on facts, dates, people, money, and documents.",
  ],
  documentRequests: ["Timeline", "Messages", "Receipts", "Invoices", "Photos", "Payment records"],
  nextActions: [
    "Answer the missing fact questions.",
    "Identify the main money loss.",
    "Upload the strongest documents first.",
  ],
};

const CLAIM_PROFILES: Partial<Record<ClaimFamily, ClaimFamilyProfile>> = {
  "debt-unpaid-money": {
    family: "debt-unpaid-money",
    userLabel: "Money owed or unpaid invoice",
    claimTypeLabel: "Debt / unpaid money / unpaid invoice",
    plainLanguageSummary: "This appears to involve money that one person or business says the other person owes.",
    coreProofFocus: ["Why the money is owed", "How much is owed", "When payment was due", "Payment requests and non-payment"],
    damagesGuidance: ["Use a clear running balance.", "Separate principal, fees, interest, expenses, and court costs."],
    defenceAttacks: ["They may argue the money was already paid.", "They may argue the amount is wrong.", "They may argue the money was a gift or not legally owed.", "They may argue payment was not due yet."],
    judgeConcerns: ["Is there proof the money was owed?", "Is the amount clear?", "Is there proof of non-payment?"],
    strategicFocus: ["Create a payment ledger.", "Use admissions where available.", "Avoid vague amounts."],
    documentRequests: ["Invoices", "Bank records or e-transfer proof", "Messages admitting the debt", "Payment requests", "Account statement or ledger"],
    nextActions: ["Create a balance chart.", "Gather proof of payment history.", "Identify any admission of debt."],
  },
  "loan-repayment": {
    family: "loan-repayment",
    userLabel: "Loan repayment",
    claimTypeLabel: "Loan repayment claim",
    plainLanguageSummary: "This appears to involve money loaned to another person that has not been repaid.",
    coreProofFocus: ["Proof the money was a loan", "Amount advanced", "Repayment terms", "Payments made or missed"],
    damagesGuidance: ["Show the amount advanced, any payments received, and the balance remaining.", "Messages admitting repayment obligations are important."],
    defenceAttacks: ["They may argue the money was a gift.", "They may argue there was no repayment deadline.", "They may argue they already repaid some or all of it."],
    judgeConcerns: ["Was it truly a loan?", "What repayment terms were agreed to?", "What balance remains owing?"],
    strategicFocus: ["Use transfer records and messages together.", "Separate the original loan from later payment discussions."],
    documentRequests: ["Bank transfers", "E-transfer records", "Messages about repayment", "Payment history"],
    nextActions: ["Build a repayment timeline.", "Calculate the remaining balance.", "Gather messages showing the loan was not a gift."],
  },
  "deposit-refund": {
    family: "deposit-refund",
    userLabel: "Deposit or refund issue",
    claimTypeLabel: "Deposit / refund claim",
    plainLanguageSummary: "This appears to involve money paid up front, a refund request, or a dispute about whether a deposit should be returned.",
    coreProofFocus: ["Why the money was paid", "Refund terms", "Why the refund is owed", "Amount still unpaid"],
    damagesGuidance: ["Use receipts, payment records, booking terms, cancellation terms, and refund messages."],
    defenceAttacks: ["They may say the deposit was non-refundable.", "They may say you cancelled too late.", "They may say they performed enough work to keep the money."],
    judgeConcerns: ["What were the refund terms?", "Was the deposit refundable?", "Is the requested refund supported by documents?"],
    strategicFocus: ["Show the refund terms clearly.", "Separate the amount paid from the amount being claimed."],
    documentRequests: ["Receipt or payment record", "Refund policy", "Messages about cancellation or refund", "Agreement or booking terms"],
    nextActions: ["Upload the payment record.", "Identify the refund promise or policy.", "Prepare a refund calculation."],
  },
  "contract-breach": {
    family: "contract-breach",
    userLabel: "Agreement or contract problem",
    claimTypeLabel: "Breach of contract",
    plainLanguageSummary: "This appears to involve an agreement where one side says the other side did not do what was promised.",
    coreProofFocus: ["What the agreement was", "Who agreed to what", "What each side did or paid", "What was not done", "How the amount claimed is calculated"],
    damagesGuidance: ["Use invoices, receipts, replacement costs, account statements, and written estimates.", "Separate unpaid amounts, repair costs, replacement costs, and other out-of-pocket losses."],
    defenceAttacks: ["They may argue there was no final agreement.", "They may argue the terms were different.", "They may argue you also failed to perform your part.", "They may argue the amount claimed is not proven."],
    judgeConcerns: ["Is there enough proof of the actual agreement?", "Is the claimed loss tied to the breach?", "Is the amount reasonable and supported by documents?"],
    strategicFocus: ["Create a simple timeline from agreement to breach to loss.", "Put all payment records beside the invoices or messages they relate to.", "Avoid emotional wording and focus on the promise, breach, and loss."],
    documentRequests: ["Contract or written agreement", "Quotes, invoices, receipts, and proof of payment", "Messages discussing the terms", "Photos or records showing incomplete or defective work"],
    nextActions: ["Build a damages table.", "Organize agreement proof first.", "Prepare a short settlement position based on the strongest documents."],
  },
  "services-work-dispute": {
    family: "services-work-dispute",
    userLabel: "Bad work, unfinished work, or service dispute",
    claimTypeLabel: "Defective services / unfinished work",
    plainLanguageSummary: "This appears to involve work or services that may have been done poorly, late, incompletely, or not at all.",
    coreProofFocus: ["What work was promised", "What was actually done", "What was defective or unfinished", "What it cost to fix or complete"],
    damagesGuidance: ["Repair estimates are usually stronger than guesses.", "Before-and-after photos can help show what changed.", "Keep the cost to fix separate from any refund being requested."],
    defenceAttacks: ["They may say the work was completed properly.", "They may say you changed the scope of work.", "They may say damage was caused by someone else.", "They may say the repair estimate is too high."],
    judgeConcerns: ["Can the court see the difference between promised work and actual work?", "Is the repair cost supported by reliable records?", "Was the other side given a chance to respond or fix the issue?"],
    strategicFocus: ["Use photos and estimates to make the defect easy to understand.", "Avoid general complaints; identify the exact work problem.", "Tie every requested dollar to a document."],
    documentRequests: ["Quote or work order", "Invoice and payment proof", "Photos or videos", "Repair estimate or inspection record", "Messages about complaints or fixing the work"],
    nextActions: ["Create a defect list.", "Create a repair-cost list.", "Gather proof of what was promised."],
  },
  "consumer-goods": {
    family: "consumer-goods",
    userLabel: "Consumer purchase or seller dispute",
    claimTypeLabel: "Consumer transaction / defective goods / refund",
    plainLanguageSummary: "This appears to involve a purchase, refund, defective item, misrepresentation, or seller dispute.",
    coreProofFocus: ["What was bought", "What was promised", "What was received", "What was wrong with it", "Refund, repair, or replacement cost"],
    damagesGuidance: ["Use receipts, listings, payment records, and repair estimates.", "Show what you asked the seller to do before suing."],
    defenceAttacks: ["They may say the item was sold as-is.", "They may say you accepted the product.", "They may say the defect was disclosed."],
    judgeConcerns: ["What was represented before purchase?", "Was the problem reported quickly?", "Is the refund or repair cost reasonable?"],
    strategicFocus: ["Preserve the listing or ad.", "Show payment and complaint history.", "Explain the gap between what was promised and what was delivered."],
    documentRequests: ["Receipt or invoice", "Ad or online listing", "Payment proof", "Photos or videos", "Messages with seller", "Repair estimate"],
    nextActions: ["Organize purchase proof.", "Preserve the seller’s listing or promise.", "Build refund or repair calculation."],
  },
  "property-damage": {
    family: "property-damage",
    userLabel: "Property damage or loss",
    claimTypeLabel: "Property damage / replacement cost",
    plainLanguageSummary: "This appears to involve damage to property, missing property, or the cost to repair or replace property.",
    coreProofFocus: ["What property was damaged or lost", "Who caused the damage", "When and how it happened", "Repair or replacement cost"],
    damagesGuidance: ["Use repair invoices, estimates, replacement receipts, or photos.", "Do not rely only on what the item felt worth to you."],
    defenceAttacks: ["They may deny causing the damage.", "They may say the property was already damaged.", "They may say the repair cost is too high."],
    judgeConcerns: ["Is there proof the defendant caused the damage?", "Is the value supported?", "Is the repair or replacement cost reasonable?"],
    strategicFocus: ["Show the before-and-after condition if possible.", "Connect the damage to a specific event.", "Use third-party repair estimates where possible."],
    documentRequests: ["Photos or videos", "Repair estimates", "Receipts or replacement prices", "Messages admitting or discussing the damage", "Witness information"],
    nextActions: ["Prepare a property damage chart.", "Gather proof of value.", "Identify witnesses or admissions."],
  },
  "vehicle-dispute": {
    family: "vehicle-dispute",
    userLabel: "Vehicle dispute",
    claimTypeLabel: "Vehicle damage / repair / dealership dispute",
    plainLanguageSummary: "This appears to involve a vehicle, mechanic, dealership, repair, damage, or purchase issue.",
    coreProofFocus: ["Vehicle ownership or responsibility", "What went wrong", "Who caused or is responsible for the issue", "Repair or replacement cost"],
    damagesGuidance: ["Use repair estimates, mechanic records, invoices, photos, and payment records."],
    defenceAttacks: ["They may say the issue existed before.", "They may say the repair was proper.", "They may dispute the repair cost."],
    judgeConcerns: ["What caused the vehicle issue?", "Is the repair cost reasonable?", "Is there reliable third-party proof?"],
    strategicFocus: ["Use mechanic records or inspections where possible.", "Keep the timeline clear."],
    documentRequests: ["Repair estimate", "Mechanic report", "Photos", "Invoice", "Messages with seller, mechanic, or other party"],
    nextActions: ["Gather repair documents.", "Clarify causation.", "Prepare a repair-cost summary."],
  },
  "defamation-reputation": {
    family: "defamation-reputation",
    userLabel: "Reputation harm or false statements",
    claimTypeLabel: "Defamation / slander / libel",
    plainLanguageSummary: "This appears to involve statements that may have harmed reputation, credibility, business, employment, or relationships.",
    coreProofFocus: ["The exact words used", "Who made the statement", "Who received or heard it", "Why the statement was false or harmful", "What harm followed"],
    damagesGuidance: ["Reputation harm should be connected to specific consequences where possible.", "Screenshots should show date, sender, recipient, and context.", "A retraction request can help show you tried to resolve the issue."],
    defenceAttacks: ["They may argue the statement was true.", "They may argue it was opinion, not fact.", "They may argue nobody else received it.", "They may argue there was no measurable harm.", "They may raise privilege or fair comment depending on the context."],
    judgeConcerns: ["What exactly was said?", "Who else received it?", "Why is it defamatory rather than just insulting?", "What harm was caused?"],
    strategicFocus: ["Quote the exact words carefully.", "Identify every recipient separately.", "Separate emotional upset from reputational harm.", "Keep the claim focused and document-driven."],
    documentRequests: ["Screenshots of the exact words", "Recipient names or witness information", "Retraction or apology request", "Messages showing refusal to correct", "Proof of business, employment, or relationship impact"],
    nextActions: ["Create a publication chart.", "Preserve screenshots with dates and context.", "Prepare a short damages explanation."],
  },
  "privacy-or-harassment-civil": {
    family: "privacy-or-harassment-civil",
    userLabel: "Harassment, privacy, or repeated harmful conduct",
    claimTypeLabel: "Harassment / privacy-related civil harm",
    plainLanguageSummary: "This appears to involve repeated harmful conduct, communications, privacy harm, threats, intimidation, or interference causing harm.",
    coreProofFocus: ["Pattern of conduct", "Dates and frequency", "Impact on the user", "Any financial or reputational loss"],
    damagesGuidance: ["Courts usually need more than general stress; show specific harm or financial loss where possible.", "Organize repeated events by date."],
    defenceAttacks: ["They may say events were isolated.", "They may say communications were mutual.", "They may say no legal damages are proven."],
    judgeConcerns: ["Is this a civil money claim or another type of legal remedy?", "Is there a clear pattern?", "Are damages proven?"],
    strategicFocus: ["Build a dated conduct chart.", "Avoid overloading the court with every message; identify the strongest examples.", "Separate safety concerns from money damages."],
    documentRequests: ["Screenshots and messages", "Call logs", "Witness information", "Police or incident reports if applicable", "Expense or income-loss records"],
    nextActions: ["Create a timeline of repeated events.", "Identify the strongest examples.", "Clarify what money damages are being claimed."],
  },
  "negligence-financial-loss": {
    family: "negligence-financial-loss",
    userLabel: "Carelessness causing loss",
    claimTypeLabel: "Negligence / financial loss",
    plainLanguageSummary: "This appears to involve harm caused by someone failing to act with reasonable care.",
    coreProofFocus: ["What duty or responsibility existed", "What the person failed to do", "How that caused harm", "What loss resulted"],
    damagesGuidance: ["Keep property loss, lost income, repair costs, and expenses separate.", "Causation must be clear: explain how the careless act caused the loss."],
    defenceAttacks: ["They may deny owing a duty.", "They may argue they acted reasonably.", "They may argue something else caused the loss.", "They may argue you failed to reduce your losses."],
    judgeConcerns: ["Was there a legal responsibility?", "Was there a clear breach of reasonable care?", "Is causation proven?", "Are damages supported?"],
    strategicFocus: ["Do not only describe unfairness; explain duty, breach, causation, and damages.", "Use documents or witnesses to support each step."],
    documentRequests: ["Photos or videos", "Incident reports", "Repair records", "Witness information", "Receipts and expense records", "Messages or complaints made after the event"],
    nextActions: ["Build a duty-breach-causation-damages chart.", "Identify third-party records.", "Gather proof of all losses."],
  },
  "personal-injury": {
    family: "personal-injury",
    userLabel: "Personal injury",
    claimTypeLabel: "Personal injury claim",
    plainLanguageSummary: "This appears to involve physical injury, pain, treatment, or income loss caused by another person or organization.",
    coreProofFocus: ["What happened", "Who was responsible", "What injury occurred", "Treatment and recovery", "Financial losses"],
    damagesGuidance: ["Separate pain and suffering, lost income, treatment expenses, and out-of-pocket costs."],
    defenceAttacks: ["They may deny responsibility.", "They may argue the injury was not caused by them.", "They may argue the damages are too high."],
    judgeConcerns: ["Is there proof of injury?", "Is causation clear?", "Are damages supported by records?"],
    strategicFocus: ["Use medical and treatment records.", "Connect the injury to the event.", "Keep damages organized by category."],
    documentRequests: ["Medical records", "Photos", "Incident reports", "Witness information", "Receipts", "Lost income proof"],
    nextActions: ["Create an injury timeline.", "Gather treatment records.", "Prepare a damages breakdown."],
  },
  "employment-wages": {
    family: "employment-wages",
    userLabel: "Work, wages, or income dispute",
    claimTypeLabel: "Employment / wage-related money claim",
    plainLanguageSummary: "This appears to involve unpaid work, income loss, job-related money, or a work-related dispute.",
    coreProofFocus: ["Work performed", "Pay or compensation promised", "Amount unpaid or lost", "Records supporting the claim"],
    damagesGuidance: ["Use pay records, invoices, time records, or income history.", "Separate unpaid wages from other losses."],
    defenceAttacks: ["They may dispute hours worked.", "They may dispute employee versus contractor status.", "They may argue payment was made."],
    judgeConcerns: ["Is Small Claims Court the correct path for this issue?", "Is the amount proven?", "Are there employment standards issues outside the claim?"],
    strategicFocus: ["Make the money calculation simple.", "Preserve written proof of hours, rates, and payments."],
    documentRequests: ["Contract or work agreement", "Pay stubs or invoices", "Time records", "Messages about payment", "Bank records"],
    nextActions: ["Build an unpaid amount chart.", "Gather payment history.", "Clarify whether the claim belongs in court or another process."],
  },
  "return-of-property": {
    family: "return-of-property",
    userLabel: "Return of property",
    claimTypeLabel: "Return of property / value of property",
    plainLanguageSummary: "This appears to involve property or belongings that another person has kept, refused to return, damaged, or withheld.",
    coreProofFocus: ["What property is involved", "Proof it belongs to the claimant", "How the other party got it", "Requests for return", "Value if not returned"],
    damagesGuidance: ["Use receipts, photos, ownership proof, replacement values, and messages asking for return."],
    defenceAttacks: ["They may deny having the property.", "They may dispute ownership.", "They may say it was gifted or abandoned."],
    judgeConcerns: ["Who owns the property?", "Does the other party still have it?", "What is the value if it cannot be returned?"],
    strategicFocus: ["Prove ownership first.", "Show requests for return.", "Have a backup damages amount if return is impossible."],
    documentRequests: ["Receipts", "Photos", "Ownership documents", "Messages asking for return", "Replacement value proof"],
    nextActions: ["List each item.", "Add proof of ownership.", "Add value for each item."],
  },
  "fraud-misrepresentation": {
    family: "fraud-misrepresentation",
    userLabel: "Fraud or misrepresentation",
    claimTypeLabel: "Fraud / misrepresentation",
    plainLanguageSummary: "This appears to involve a claim that someone made a false statement or misleading promise that caused financial loss.",
    coreProofFocus: ["What was said or promised", "Why it was false or misleading", "Reliance on the statement", "Money or loss caused by relying on it"],
    damagesGuidance: ["Show the payment or loss that happened because of the false statement."],
    defenceAttacks: ["They may say the statement was true.", "They may say it was opinion or sales talk.", "They may say you did not rely on it.", "They may say there is no proven loss."],
    judgeConcerns: ["What exactly was represented?", "Why was it false?", "How did it cause the loss?"],
    strategicFocus: ["Quote the exact representation.", "Connect the representation to the payment or loss.", "Avoid broad accusations without documents."],
    documentRequests: ["Messages or ads", "Payment records", "Contract or receipt", "Proof showing the statement was false"],
    nextActions: ["Identify each false statement.", "Link each statement to a loss.", "Gather payment proof."],
  },
  "enforcement-after-judgment": {
    family: "enforcement-after-judgment",
    userLabel: "Enforcing a judgment",
    claimTypeLabel: "Enforcement after judgment",
    plainLanguageSummary: "This appears to involve collecting money or enforcing an order after judgment.",
    coreProofFocus: ["Judgment or order", "Amount still unpaid", "Debtor information", "Best enforcement route"],
    damagesGuidance: ["Use the judgment amount, payments received, interest if applicable, and remaining balance."],
    defenceAttacks: ["They may say the judgment was paid.", "They may dispute the balance.", "They may claim inability to pay."],
    judgeConcerns: ["Is there an enforceable judgment?", "What amount remains unpaid?", "What enforcement method is being requested?"],
    strategicFocus: ["Do not reargue the original claim.", "Focus on the judgment and collection path."],
    documentRequests: ["Judgment or order", "Payment history after judgment", "Debtor employer or bank information", "Prior enforcement steps"],
    nextActions: ["Confirm judgment details.", "Calculate unpaid balance.", "Identify debtor assets, income, or bank information."],
  },
  "responding-defence": {
    family: "responding-defence",
    userLabel: "Responding to a claim",
    claimTypeLabel: "Defence / response to claim",
    plainLanguageSummary: "This appears to involve responding to a claim that has been served or already started.",
    coreProofFocus: ["What the claim says", "What is admitted", "What is denied", "Any counterclaim, set-off, or repayment position"],
    damagesGuidance: ["If money is disputed, show what is admitted, what is denied, and why."],
    defenceAttacks: ["The plaintiff may argue your defence is unsupported.", "The plaintiff may argue you admitted the debt or wrongdoing.", "The plaintiff may argue your response is late."],
    judgeConcerns: ["Is the defence filed on time?", "Does the defence answer the actual claim?", "Are documents attached or available?"],
    strategicFocus: ["Respond directly to each allegation.", "Separate admissions from denials.", "Do not ignore deadlines."],
    documentRequests: ["Plaintiff’s Claim", "Defence deadline information", "Documents disproving the claim", "Payment or communication records"],
    nextActions: ["Review each paragraph of the claim.", "Prepare direct responses.", "Identify any counterclaim or set-off."],
  },
  "settlement-conference-prep": {
    family: "settlement-conference-prep",
    userLabel: "Settlement conference preparation",
    claimTypeLabel: "Settlement conference preparation",
    plainLanguageSummary: "This appears to be at the settlement conference stage, where the focus is narrowing issues, organizing proof, and preparing realistic settlement positions.",
    coreProofFocus: ["Issues still disputed", "Strongest evidence", "Damages calculation", "Weaknesses and realistic settlement options"],
    damagesGuidance: ["Use a clean damages table and settlement range."],
    defenceAttacks: ["The other side may attack weak proof.", "The other side may dispute damages.", "The other side may argue settlement should be lower."],
    judgeConcerns: ["Are the issues clear?", "Can the case settle?", "Are both sides prepared with documents?"],
    strategicFocus: ["Prepare a short case theory.", "Know your best evidence and biggest weakness.", "Have a realistic settlement proposal."],
    documentRequests: ["Settlement conference brief", "Key evidence", "Damages table", "Offer to settle", "Witness list if needed"],
    nextActions: ["Prepare a settlement position.", "Organize exhibits.", "List the main disputed issues."],
  },
  "trial-prep": {
    family: "trial-prep",
    userLabel: "Trial preparation",
    claimTypeLabel: "Trial preparation",
    plainLanguageSummary: "This appears to be close to trial, where evidence, witnesses, theory, and document organization are the priority.",
    coreProofFocus: ["Trial theory", "Witnesses", "Documents", "Damages proof", "Responses to the other side’s arguments"],
    damagesGuidance: ["Every dollar claimed should connect to a document, witness, or clear explanation."],
    defenceAttacks: ["The other side may attack missing documents.", "The other side may challenge credibility.", "The other side may argue damages are speculative."],
    judgeConcerns: ["Is the evidence organized?", "Are witnesses ready?", "Are the issues narrow enough for trial?"],
    strategicFocus: ["Prepare exhibits in order.", "Prepare witness questions.", "Keep the trial theory short and evidence-based."],
    documentRequests: ["Trial evidence package", "Witness list", "Chronology", "Damages table", "Questions for witnesses"],
    nextActions: ["Build the exhibit package.", "Prepare witness outlines.", "Draft a short opening theory."],
  },
  "jurisdiction-warning": {
    family: "jurisdiction-warning",
    userLabel: "Jurisdiction warning",
    claimTypeLabel: "Possible court or jurisdiction issue",
    plainLanguageSummary: "There may be an issue about whether Small Claims Court is the right place or whether the amount/remedy fits that court.",
    coreProofFocus: ["Amount claimed", "Type of remedy requested", "Where the events happened", "Whether another tribunal or court is required"],
    damagesGuidance: ["Confirm the claimed amount and whether the remedy is money-based."],
    defenceAttacks: ["The other side may argue the court has no jurisdiction.", "The other side may argue the remedy requested is not available."],
    judgeConcerns: ["Is this the correct court?", "Is the amount within the limit?", "Is the requested remedy available?"],
    strategicFocus: ["Confirm jurisdiction before generating final documents."],
    documentRequests: ["Amount claimed", "Location of events", "Contract terms", "Any tribunal documents"],
    nextActions: ["Confirm the amount and remedy.", "Check whether another forum may apply."],
  },
};

function getPrimaryProfile(primary: ClaimFamily): ClaimFamilyProfile {
  return CLAIM_PROFILES[primary] ?? DEFAULT_PROFILE;
}

function buildEvidenceNeeds(categories: EvidenceCategory[]): string[] {
  return cleanList(categories.map((category) => `Gather ${evidenceCategoryLabel(category)}.`));
}

function buildMissingElementGuidance(elements: NormalizedLegalElement[]): string[] {
  return cleanList(elements.filter((element) => statusNeedsWork(element.status)).map((element) => elementNeed(element)));
}

function buildEvidenceStrengths(elements: NormalizedLegalElement[]): string[] {
  return cleanList(elements.filter((element) => statusIsSupported(element.status)).map((element) => `${element.label} appears supported.`));
}

function buildEvidenceWeaknesses(elements: NormalizedLegalElement[]): string[] {
  return cleanList(elements.filter((element) => statusNeedsWork(element.status)).map((element) => elementNeed(element)));
}

function buildRiskFlags(input: SmallClaimsEngineInput, combinedText: string): string[] {
  const risks: string[] = [];
  const highestAmount = getHighestDollarAmount(`${input.amountClaimed} ${input.damagesBreakdown} ${combinedText}`);

  if (highestAmount !== null && highestAmount > ONTARIO_SMALL_CLAIMS_LIMIT) {
    risks.push(`The highest amount detected is $${highestAmount.toLocaleString()}, which is above Ontario Small Claims Court's $${ONTARIO_SMALL_CLAIMS_LIMIT.toLocaleString()} limit.`);
  }

  const limitationRisk = detectLimitationRisk(`${input.timeline} ${input.deadlineDetails} ${combinedText}`);

  if (typeof limitationRisk === "string" && limitationRisk.trim().length > 0) {
    risks.push(limitationRisk);
  }
  if (hasText(input.defenceResponse)) risks.push("The other side has already responded or raised a defence, so the case strategy should address their position directly instead of only repeating the claim.");
  if (input.caseStage === "conference") risks.push("Because this is at settlement conference stage, the strongest settlement position should be built from proof, damages, weaknesses, and realistic compromise options.");
  if (input.caseStage === "trial") risks.push("Because this is near trial, evidence organization, witness preparation, and a concise theory of the case become more important than adding new broad allegations.");

  return cleanList(risks);
}

function buildRecommendedForms(input: SmallClaimsEngineInput): string[] {
  const stage = input.caseStage;
  const completed = input.completedForms ?? [];
  const received = input.receivedForms ?? [];
  const filed = [...completed, ...received, ...input.filedDocuments].join(" ").toLowerCase();
  const forms: string[] = [];

  if (stage === "starting-case" && !filed.includes("7a")) forms.push("Form 7A - Plaintiff's Claim");
  if (stage === "responding" && !filed.includes("9a")) forms.push("Form 9A - Defence");
  if (stage === "conference") forms.push("Settlement Conference Brief", "List of Proposed Witnesses");
  if (stage === "motion") forms.push("Notice of Motion and Supporting Affidavit");
  if (stage === "trial") forms.push("Trial preparation checklist", "Witness list", "Document brief / evidence package");
  if (stage === "enforcement") forms.push("Enforcement forms may be needed depending on whether there is already a judgment.");

  return cleanList(forms);
}

function buildDetectedIssues(primary: ClaimFamily, secondary: ClaimFamily[], issues: string[]): string[] {
  return cleanList([primary, ...secondary, ...issues]);
}

function buildInferredFacts(input: SmallClaimsEngineInput): string[] {
  const facts: string[] = [];

  if (hasText(input.amountClaimed)) facts.push(`The user has identified an amount claimed or disputed: ${input.amountClaimed}.`);
  if (hasText(input.damagesBreakdown)) facts.push("The user has provided at least some damages breakdown.");
  if (hasText(input.timeline)) facts.push("The user has provided timeline information.");
  if (hasText(input.evidence) || (input.uploadedEvidenceFiles?.length ?? 0) > 0) facts.push("The user has identified evidence or uploaded evidence files.");
  if (hasText(input.defenceResponse)) facts.push("The other side's response or defence has been identified.");

  return cleanList(facts);
}

export function runSmallClaimsEngine(input: SmallClaimsEngineInput): AnalysisResult {
  const normalized = normalizeAiIntake({
    casePath: "small-claims",
    stage: input.caseStage,
    role: input.userData?.yourRole ? String(input.userData.yourRole) : undefined,
    facts: [input.facts, input.agreementDetails, input.paymentHistory, input.serviceDetails, input.defenceResponse].join("\n"),
    timeline: input.timeline,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence,
    goal: input.goal,
    urgent: input.urgent,
    issues: input.issues,
    filedDocuments: input.filedDocuments,
    completedForms: input.completedForms ?? [],
    receivedForms: input.receivedForms ?? [],
    availableEvidence: input.availableEvidence ?? [],
    uploadedEvidenceFiles: input.uploadedEvidenceFiles ?? [],
    userData: {
      ...(input.userData ?? {}),
      amountClaimed: input.amountClaimed,
      damagesBreakdown: input.damagesBreakdown,
      goal: input.goal,
    },
    conversationText: [
      input.facts,
      input.timeline,
      input.evidence,
      input.missingEvidence,
      input.amountClaimed,
      input.damagesBreakdown,
      input.agreementDetails,
      input.paymentHistory,
      input.serviceDetails,
      input.deadlineDetails,
      input.settlementEfforts,
      input.defenceResponse,
      input.goal,
      input.urgent,
      input.issues.join(" "),
    ].join("\n"),
  });

  const primaryFamily = normalized.primaryClaimFamily;
  const secondaryFamilies: ClaimFamily[] = normalized.secondaryClaimFamilies.map((item) => item.family);
  const profile = getPrimaryProfile(primaryFamily);
  const combinedText = [
    input.facts,
    input.timeline,
    input.evidence,
    input.missingEvidence,
    input.amountClaimed,
    input.damagesBreakdown,
    input.agreementDetails,
    input.paymentHistory,
    input.serviceDetails,
    input.deadlineDetails,
    input.settlementEfforts,
    input.defenceResponse,
    input.goal,
    input.urgent,
    input.issues.join(" "),
  ].join(" ");

  const missingElementGuidance = buildMissingElementGuidance(normalized.legalElements);
  const evidenceNeeds = buildEvidenceNeeds(normalized.evidence.categories);
  const risksAndGaps = cleanList([
    ...buildRiskFlags(input, combinedText),
    ...missingElementGuidance,
    ...profile.judgeConcerns.map((concern) => `Judge concern: ${concern}`),
    ...normalized.intakeQuality.map((issue) => issue.message),
  ]);

  const guidance = cleanList([
    profile.plainLanguageSummary,
    `Current stage: ${getStageLabel(input.caseStage)}.`,
    `Main proof focus: ${profile.coreProofFocus.join("; ")}.`,
    ...profile.strategicFocus,
    ...profile.nextActions,
  ]);

  const requiredNextForms = buildRecommendedForms(input);
  const notNeededNow: string[] = [];

  if (input.caseStage === "starting-case") {
    notNeededNow.push(
      "Trial documents are usually not the first focus before the claim is issued and served.",
    );
  }

  if (input.caseStage !== "enforcement") {
    notNeededNow.push(
      "Enforcement forms usually wait until there is a judgment or enforceable order.",
    );
  }

  const missingInformation = cleanList([
    ...missingElementGuidance,
    ...evidenceNeeds,
    ...profile.documentRequests.map((request) => `Upload or add: ${request}.`),
  ]);

  const legalIssues = cleanList([
    profile.claimTypeLabel,
    ...normalized.secondaryClaimFamilies.map((family) => family.label),
    ...normalized.possibleUnconfirmedFamilies.map((family) => family.label),
  ]);

  const evidenceStrengths = buildEvidenceStrengths(normalized.legalElements);
  const evidenceWeaknesses = buildEvidenceWeaknesses(normalized.legalElements);
  const limitationRiskResult = detectLimitationRisk(`${input.timeline} ${input.deadlineDetails} ${combinedText}`);
  const limitationRisk =
    typeof limitationRiskResult === "string" && limitationRiskResult.trim().length > 0
      ? limitationRiskResult
      : null;
  const highestAmount = getHighestDollarAmount(`${input.amountClaimed} ${input.damagesBreakdown}`);

  const jurisdictionRisks: string[] = [];

  if (highestAmount !== null && highestAmount > ONTARIO_SMALL_CLAIMS_LIMIT) {
    jurisdictionRisks.push(
      `The amount claimed may exceed the Ontario Small Claims Court limit of $${ONTARIO_SMALL_CLAIMS_LIMIT.toLocaleString()}.`,
    );
  }

  if (normalized.money.withinOntarioSmallClaimsLimit === false) {
    jurisdictionRisks.push(
      "The detected amount may be above Ontario Small Claims Court's monetary limit.",
    );
  }

  const partyRisks: string[] = [];

  if (!normalized.parties.otherParty) {
    partyRisks.push("The other party/defendant information is incomplete.");
  }

  if (!normalized.parties.otherPartyAddress && input.caseStage === "starting-case") {
    partyRisks.push(
      "The other party's address may be needed for issuing and serving the claim.",
    );
  }

  const timelineAnalysis: string[] = [];
  timelineAnalysis.push(
    normalized.timeline.hasTimeline
      ? "A timeline has been provided and should be organized into dated events."
      : "A clearer dated timeline is still needed.",
  );
  if (normalized.timeline.events.length > 0) {
    timelineAnalysis.push(
      `${normalized.timeline.events.length} timeline event(s) were detected from the intake.`,
    );
  }

  const deadlineRisks: string[] = [];
  if (limitationRisk) deadlineRisks.push(limitationRisk);

  const serviceRisks: string[] = [];

  if (input.caseStage === "starting-case") {
    serviceRisks.push(
      "After a claim is issued, proper service and proof of service will be required.",
    );
  }

  const summaryParts: string[] = [
    `Likely claim path: ${profile.claimTypeLabel}.`,
    `The system should focus on ${profile.coreProofFocus.join(", ")}.`,
  ];
  summaryParts.push(
    risksAndGaps.length > 0
      ? `Main risks/gaps: ${risksAndGaps.slice(0, 4).join(" ")}`
      : "No major gaps were detected from the current intake, but the evidence should still be reviewed.",
  );

  return {
    courtPath: "small-claims",
    caseStage: input.caseStage,
    completedForms: input.completedForms ?? [],
    receivedForms: input.receivedForms ?? [],
    requiredNextForms,
    notNeededNow: cleanList(notNeededNow),
    detectedIssues: buildDetectedIssues(primaryFamily, secondaryFamilies, input.issues),
    inferredFacts: buildInferredFacts(input),
    missingInformation,
    risksAndGaps,
    guidance,
    summary: cleanList(summaryParts).join(" "),
    legalIssues,
    proceduralStageReasoning: [
      `The selected stage is ${getStageLabel(input.caseStage)}.`,
      "The recommended next steps are based on the stage, the documents already filed or received, and the proof gaps detected in the intake.",
    ],
    timelineAnalysis: cleanList(timelineAnalysis),
    evidenceStrengths,
    evidenceWeaknesses,
    missingEvidence: missingInformation,
    deadlineRisks: cleanList(deadlineRisks),
    serviceRisks: cleanList(serviceRisks),
    partyRisks: cleanList(partyRisks),
    jurisdictionRisks: cleanList(jurisdictionRisks),
    limitationRisks: cleanList(deadlineRisks),
    opposingArguments: profile.defenceAttacks,
    courtConcerns: profile.judgeConcerns,
    recommendedQuestions: cleanList([
      ...normalized.legalElements
        .filter((element) => statusNeedsWork(element.status))
        .map((element) => `What evidence supports: ${element.label}?`),
      "What documents prove the amount claimed?",
      "What would the other side say in response?",
    ]),
    caseStrategy: profile.strategicFocus,
    casePackageItems: cleanList([
      "Chronology / timeline",
      "Damages table",
      "Evidence list",
      "Key messages or documents",
      ...profile.documentRequests,
    ]),
    documentUploadRequests: profile.documentRequests,
    nextBestActions: profile.nextActions,
    userWarnings: risksAndGaps,
    detectedClaimTypes: legalIssues,
    damagesIssues: cleanList([
      ...normalized.damages.categories.map((category) => `Detected damages category: ${category}.`),
      ...profile.damagesGuidance,
    ]),
    proceduralRisks: risksAndGaps,
    defenceAttacks: profile.defenceAttacks,
    judgeConcerns: profile.judgeConcerns,
    suggestedFocus: profile.coreProofFocus,
  };
}
