import {
  filingFactsFromDocuments,
  isQuestionAlreadyAnswered,
  withoutAnsweredQuestions,
} from "@/src/lib/case-system/intelligence/answeredQuestions";

import type { AnalysisResult, StoredCaseData } from "./builderTypes";

type Props = { analysis: AnalysisResult; intake: StoredCaseData | null };

function listField(intake: StoredCaseData | null, field: string): string[] {
  const value = intake?.extra?.[field];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function textField(intake: StoredCaseData | null, field: string): string {
  const value = intake?.extra?.[field];
  return typeof value === "string" ? value.trim() : "";
}

function displayStage(stage: string): string { return stage.replace(/-/g, " "); }

function documentLabel(document: string): string {
  return ({
    "plaintiffs-claim": "Plaintiff’s Claim filed and served",
    "affidavit-service": "Affidavit of Service filed with the court",
    "statement-claim": "Statement of Claim filed or served",
    "statement-defence": "Statement of Defence filed or received",
    "notice-application": "Notice of Application filed or received",
    "notice-motion": "Notice of Motion filed or received",
  } as Record<string, string>)[document] || document.replace(/-/g, " ");
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#d8e6df] bg-white p-5"><h2 className="text-lg font-bold text-[#16302b]">{title}</h2><div className="mt-3 text-sm leading-7 text-[#24463d]">{children}</div></section>;
}

export default function IntelligenceOverviewPanel({ analysis, intake }: Props) {
  const role = textField(intake, "yourRole");
  const documents = listField(intake, analysis.courtPath === "civil" ? "documents" : "filedDocuments");
  const hasClaimAndService = analysis.courtPath === "small-claims" && documents.includes("plaintiffs-claim") && documents.includes("affidavit-service");
  const facts = intake?.facts.trim() || "";
  const amount = textField(intake, "amountClaimed");
  const outcome = intake?.goal.trim() || textField(intake, "legalRemedy");
  const parties = [intake?.yourName.trim(), intake?.otherParty.trim()].filter(Boolean).join(" and ");
  const issueSignals = Array.from(new Set([...(analysis.detectedIssues || []), ...(analysis.legalIssues || []), ...(analysis.detectedClaimTypes || []), ...listField(intake, "issueLabels")].filter(Boolean)));
  const hasDefamationSignal = issueSignals.some((item) => /defamation|reputation/i.test(item));
  const hasAdoptionSignal = issueSignals.some((item) => /adoption/i.test(item));
  const recordedEvidence = Array.from(new Set([
    ...(intake?.evidence.trim() ? [intake.evidence] : []),
    ...((intake?.extra?.uploadedEvidenceFiles as Array<{ name?: unknown }> | undefined) || []).flatMap((file) => typeof file?.name === "string" && file.name.trim() ? [file.name.trim()] : []),
  ]));
  // The card used to hardcode the Defence question whenever a claim and an
  // affidavit of service were recorded, so it asked it even when the same
  // intake recorded a default judgment or a Defence. Both the override and the
  // fallback list now go through the shared filter, so nothing the intake has
  // already answered can surface here.
  const filingFacts = filingFactsFromDocuments(documents);
  const defenceQuestion = "Has the defendant filed a Defence?";
  const askDefenceQuestion =
    hasClaimAndService && !isQuestionAlreadyAnswered(defenceQuestion, filingFacts);
  const isQuestionText = (value: string) => value.trim().endsWith("?");
  const candidateQuestions = withoutAnsweredQuestions(
    [
      ...analysis.missingInformation.filter(isQuestionText),
      ...(analysis.nextBestActions || []).filter(isQuestionText),
    ],
    filingFacts,
  );
  const confirmQuestion = askDefenceQuestion
    ? defenceQuestion
    : candidateQuestions[0] || "What important fact should be confirmed next?";
  const evidenceToOrganize = hasDefamationSignal
    ? ["Complete unedited message threads or screenshots", "Who sent each message", "Uncle and father: what each received and when", "Full context before and after the statement", "Evidence the statement was false, if available", "Evidence of harm or impact, if available"]
    : hasAdoptionSignal ? ["Full legal names and dates of birth", "Proof of Ontario residence, if available", "Family relationship and living-history information", "Adult person’s written wishes or consent information for review", "Known information about the biological father", "A dated record of reasonable efforts already made to locate or contact him", "Any existing court, adoption, or child-protection documents"]
    : Array.from(new Set([...(analysis.missingEvidence || []), ...(analysis.intelligenceEvidenceIssues || []).flatMap((issue) => issue.missingEvidence || [])]));
  const courtPoints = hasDefamationSignal
    ? ["Exact words used", "Who received them", "Dates and context", "Whether the defendant admits, denies, or explains the statements", "What harm is being claimed and supporting evidence", "Current procedural status, including whether a Defence was filed"]
    : Array.from(new Set([...(analysis.judgeConcerns || []), ...(analysis.courtConcerns || [])]));
  const snapshot = [
    `${analysis.courtPath === "small-claims" ? "Small Claims" : analysis.courtPath === "family" ? "Family" : "Civil"} matter.`,
    parties ? `Parties recorded: ${parties}.` : "",
    role ? `Role: ${role}.` : "",
    `Current stage: ${displayStage(analysis.caseStage)}.`,
    amount ? `Amount recorded: ${amount}.` : "",
    outcome ? `Requested outcome: ${outcome}.` : "",
    facts,
  ].filter(Boolean);

  return <section className="rounded-3xl border border-[#d8e6df] bg-[#f8faf8] p-6 md:p-8" data-testid="case-overview">
    <h1 className="text-3xl font-bold tracking-tight text-[#10231f]">Your case overview</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4d675f]">A clear view of the information saved from your intake and the next item to review.</p>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <Card title="Case snapshot"><p>{snapshot.join(" ")}</p></Card>
      {issueSignals.length > 0 && <Card title="Issues to review">{hasDefamationSignal ? <><p className="font-semibold">Possible defamation or reputational-harm issue to review</p><p className="mt-2">The saved story describes an allegation said to have been communicated to other people and described as false. The court will need the full facts, context, evidence, and procedure reviewed.</p></> : hasAdoptionSignal ? <><p className="font-semibold">Possible adult step-parent adoption process to review</p><p className="mt-2">The saved facts describe an adult who may wish to be adopted by a long-term step-parent. Ontario has an adoption application process, but the required documents, notice/consent issues, and court requirements must be confirmed for the specific circumstances.</p></> : <ul className="list-disc space-y-1 pl-5">{issueSignals.map((issue) => <li key={issue}>Possible issue to review: {issue}. The saved facts and supporting information should be reviewed.</li>)}</ul>}</Card>}
      <Card title="Where your case is now"><p>{hasClaimAndService ? "Claim already filed and served." : `Recorded stage: ${displayStage(analysis.caseStage)}.`}</p></Card>
      <Card title="What to confirm next"><p className="font-semibold">{hasAdoptionSignal ? "Does the adult person freely agree to the proposed adoption?" : confirmQuestion}</p><p className="mt-2">{hasClaimAndService ? "This helps identify the next Small Claims step. Confirm it from the court record or documents you received." : hasAdoptionSignal ? "This helps organize the saved facts for review of the proposed adoption process." : "This helps keep the next review based on the facts already entered."}</p></Card>
      <Card title="Documents already recorded">{documents.length ? <ul className="list-disc space-y-1 pl-5">{documents.map((document) => <li key={document}>{documentLabel(document)}</li>)}</ul> : <p>No filed or served documents were selected in this intake.</p>}</Card>
      <Card title="Evidence and proof to organize">{recordedEvidence.length > 0 && <><h3 className="font-semibold">Evidence you have recorded</h3><ul className="mt-2 list-disc space-y-1 pl-5">{recordedEvidence.map((item) => <li key={item}>{item}</li>)}</ul></>}{evidenceToOrganize.length > 0 && <><h3 className={recordedEvidence.length ? "mt-5 font-semibold" : "font-semibold"}>Evidence to organize or confirm</h3><ul className="mt-2 list-disc space-y-1 pl-5">{evidenceToOrganize.map((item) => <li key={item}>{item}</li>)}</ul></>}</Card>
      {courtPoints.length > 0 && <Card title="Points the court may need clarified"><ul className="list-disc space-y-1 pl-5">{courtPoints.map((item) => <li key={item}>{item}</li>)}</ul></Card>}
      {hasAdoptionSignal && <Card title="Official Ontario resources to review"><ul className="list-disc space-y-2 pl-5"><li><a className="text-[#2f7d67] underline" href="https://www.ontario.ca/page/adopt-stepchild-or-relative" target="_blank" rel="noreferrer">Ontario: Adopt a stepchild or relative</a></li><li><a className="text-[#2f7d67] underline" href="https://ontariocourtforms.on.ca/en/family-law-rules-forms/8d/" target="_blank" rel="noreferrer">Ontario Court Services: Form 8D, Application (adoption)</a></li><li><a className="text-[#2f7d67] underline" href="https://www.ontario.ca/laws/statute/17c14" target="_blank" rel="noreferrer">Ontario Child, Youth and Family Services Act</a></li></ul><p className="mt-3">Form 8D is an official Ontario adoption application form to review. Court requirements and any consent or notice issues must be confirmed before filing.</p></Card>}
    </div>
    <p className="mt-7 text-sm leading-7 text-[#4d675f]">CourtSimplified organizes your information and identifies items to review; it does not decide your legal claim, outcome, or judgment.</p>
  </section>;
}
