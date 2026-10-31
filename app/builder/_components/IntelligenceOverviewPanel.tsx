import { lawBehindThis } from "@/src/lib/case-system/retrieval/lawBehind";
import { useState } from "react";
import AppliedLawPanel from "../../_components/AppliedLawPanel";
import CheckedAnswerPanel from "../../_components/CheckedAnswerPanel";
import StrategyPanel from "../../_components/StrategyPanel";
import ResearchPanel from "../../_components/ResearchPanel";
import {
  filingFactsFromDocuments,
  isQuestionAlreadyAnswered,
  recordedDocuments,
  withoutAnsweredQuestions,
  withoutStageAnswered,
} from "@/src/lib/case-system/intelligence/answeredQuestions";
import { meaningfulIssueSignals } from "@/src/lib/case-system/intelligence/issueSignals";
import {
  buildClaimTypeOverviewContent,
  type SourcedListItem,
} from "@/src/lib/case-system/intake/claimTypeOverviewContent";

import type { AnalysisResult, StoredCaseData } from "./builderTypes";
import { documentInWords, roleInWords, stageInWords } from "@/src/lib/case-system/copy/caseWords";
import { formatRecordedAmount } from "../../../src/lib/case-system/format/recordedAmount";
import { FAMILY_RESOURCE_TOPICS } from "../../../src/lib/case-system/intake/familySafetyResources";
import { storyNamesPresentDanger } from "../../../src/lib/case-system/intake/dangerWords";
import { parseRecordedAmount } from "../../../src/lib/case-system/format/recordedAmount";
import { JURISDICTION_ROUTES } from "../../../src/lib/case-system/intake/jurisdictionRoutes";
import { routesForConfirmedClaimType } from "../../../src/lib/case-system/intake/jurisdictionRouteRelevance";
import { splitLead } from "../../../src/lib/case-system/format/previewText";
import {
  DEFAULT_PROCEEDING_ROUTES,
  SETTING_ASIDE_DEFAULT,
  SMALL_CLAIMS_RULES_URL,
} from "../../../src/lib/case-system/intake/defaultProceedings";
import { publicSourceUrl } from "../../../src/lib/content-library/publicSourceUrl";
import { sourceLinkLabel } from "../../../src/lib/content-library/sourceLinkLabel";
import { userStory } from "@/src/lib/case-system/userStory";
import { kindsOfClaim } from "@/src/lib/case-system/intake/claimKind";
import { CLAIM_TYPES } from "@/src/lib/case-system/intake/claimTypes";
import { savePositionQueued } from "./positionSave";
import { changedWords, claimKindAnswer, claimKindLine, CLAIM_KIND_QUESTION, type CaseFile, type ClaimKindHeld } from "@/src/lib/case-system/caseFile/caseFile";
import { WorkingButton } from "@/app/_components/Working";

type Props = {
  analysis: AnalysisResult;
  intake: StoredCaseData | null;
  /**
   * The stage the person confirmed. Wins over the analysis's guess (master
   * plan Phase 1: the overview showed the first analysis's stage beside the
   * one the person had confirmed).
   */
  confirmedStage?: string | null;
  /** The saved case, so a kind of claim the person chooses here is kept with it. */
  caseId?: string | null;
  /**
   * The kind of claim, from the case file (caseFile.ts claimKindOf): the person's answer with its
   * source, or a proposal from the story, or nothing (then asked). The one value every screen shows
   * (site owner, 29 Oct).
   */
  claimKind?: ClaimKindHeld | null;
  /**
   * The case file, for the facts this card still shows from the analysis copy (amount, other party,
   * what they want): a change made with "Change" is shown instead, a removed one not at all (rule 6, 31 Oct).
   */
  caseFile?: CaseFile | null;
  /** Where the case is, in words: the step the person picked, by its own title (caseStep.ts caseStageWords). */
  stageWords?: string | null;
  /** The side in the person's own start answers ("I started this case (applicant)"), for a case already going. */
  roleWords?: string | null;
};

function listField(intake: StoredCaseData | null, field: string): string[] {
  const value = intake?.extra?.[field];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function textField(intake: StoredCaseData | null, field: string): string {
  const value = intake?.extra?.[field];
  return typeof value === "string" ? value.trim() : "";
}

// Stage, side and documents in words, never codes: one place (copy/caseWords.ts, 26 Oct re-test).
const displayStage = stageInWords;
const documentLabel = documentInWords;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#d8e6df] bg-white p-5"><h2 className="text-lg font-bold text-[#16302b]">{title}</h2><div className="mt-3 text-sm leading-7 text-[#24463d]">{children}</div></section>;
}

/**
 * Long general-information text: a sentence-bounded lead, the rest behind
 * "Read more". Nothing is removed or reworded -- see splitLead.
 */
function LongText({ text }: { text: string }) {
  const { lead, rest } = splitLead(text);
  if (!rest) return <>{text}</>;
  return (
    <>
      {lead}{" "}
      <details className="inline">
        <summary className="inline cursor-pointer font-semibold text-[#2f7d67]">Read more</summary>
        <span className="block mt-1">{rest}</span>
      </details>
    </>
  );
}

function SourcedList({ items }: { items: SourcedListItem[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item.text}>
          <LongText text={item.text} />
          {item.sourceUrl ? <> (<a className="font-semibold text-[#2f7d67] underline" href={publicSourceUrl(item.sourceUrl)} target="_blank" rel="noreferrer">{sourceLinkLabel(item.sourceUrl, item.text)}</a>)</> : null}
        </li>
      ))}
    </ul>
  );
}

const GENERIC_CONFIRM_QUESTION = "What important fact should be confirmed next?";

export default function IntelligenceOverviewPanel({ analysis, intake, confirmedStage = null, caseId = null, claimKind = null, caseFile = null, stageWords = null, roleWords = null }: Props) {
  // A kind picked from the list here, shown at once: it is written to the case file (the saved position's kind of claim,
  // read first by caseFileOf), which the page reads the next time it loads the case.
  const [pickedHere, setPickedHere] = useState<string | null>(null);
  const caseStage = (confirmedStage || analysis.caseStage) as typeof analysis.caseStage;
  const role = textField(intake, "yourRole");
  // Only selections that record an actual filing. The Small Claims intake
  // defaults filedDocuments to ["nothing"], which used to satisfy the length
  // check below and render as a bullet reading "nothing".
  const documents = recordedDocuments(
    listField(intake, analysis.courtPath === "civil" ? "documents" : "filedDocuments"),
  );
  const hasClaimAndService = analysis.courtPath === "small-claims" && documents.includes("plaintiffs-claim") && documents.includes("affidavit-service");
  // The user's own story, not the labelled record the analysis reads.
  const facts = userStory(intake);
  // A fact changed or removed with "Change" is the case file's, never this copy's older value (rule 6, 31 Oct).
  const changedAmount = changedWords(caseFile, "amount");
  const changedWants = changedWords(caseFile, "wants");
  const changedOther = changedWords(caseFile, "otherParty");
  const amount = changedAmount !== undefined ? changedAmount ?? "" : textField(intake, "amountClaimed");
  const outcome = changedWants !== undefined ? changedWants ?? "" : intake?.goal.trim() || textField(intake, "legalRemedy");
  const parties = [intake?.yourName.trim(), changedOther !== undefined ? changedOther ?? "" : intake?.otherParty.trim()].filter(Boolean).join(" and ");
  const rawIssueSignals = Array.from(new Set([...(analysis.detectedIssues || []), ...(analysis.legalIssues || []), ...(analysis.detectedClaimTypes || []), ...listField(intake, "issueLabels")].filter(Boolean)));
  // "unknown" is the engines' unclassified domain, not an issue. Dropping it
  // here keeps it out of the list; when it was the only signal the card falls
  // back to plain language below rather than naming an internal token.
  const issueSignals = meaningfulIssueSignals(rawIssueSignals);
  const issueTypeUndetermined = rawIssueSignals.length > 0 && issueSignals.length === 0;
  // Session 34 closed the gap the August 2026 audit logged here: defamation
  // and every other Small Claims issue type with a matching CLAIM_TYPES
  // entry (see claimTypeOverviewContent.ts) now draw evidenceToOrganize/
  // courtPoints from that real, sourced content instead of a hand-written
  // duplicate or the AI's own free-form output, which could come back
  // empty for a real scenario (the $700k+ wrongful dismissal case that
  // motivated this fix). Adoption keeps its own hand-written override --
  // it has real, separately-sourced content this fix isn't replacing.
  // Family/Civil issue types, and any Small Claims story that doesn't
  // resemble one of the 19 CLAIM_TYPES entries yet, still fall back to the
  // generic AI-derived paths below -- claimTypeContent is null for those,
  // never a fabricated stand-in.
  // The kind of claim, from the case file: the person's answer with its source, else a kind the
  // story shows (labelled "this matches"), else asked (site owner, 29 Oct: the overview, "Check my
  // case file", the review and the Form 7A section must read the same value). A separate
  // "confirmed" flag never hides the person's own answer. Its content below follows the same kind.
  const pickedName = pickedHere && pickedHere !== "not-sure" ? CLAIM_TYPES.find((claimType) => claimType.id === pickedHere)?.name ?? null : null;
  const kind = analysis.courtPath !== "small-claims" ? null
    : pickedName ? { label: "Kind of claim you chose", words: pickedName, claimTypeId: pickedHere, quote: null, held: true }
    : pickedHere === "not-sure" ? null
    : claimKind ? claimKindLine(claimKind) : null;
  const askKind = analysis.courtPath === "small-claims" && !kind;
  const kindId = kind?.claimTypeId ?? null;
  const claimTypeContent = kindId && facts ? buildClaimTypeOverviewContent(facts, undefined, kindId) : null;
  const hasDefamationSignal = issueSignals.some((item) => /defamation|reputation/i.test(item));
  const hasAdoptionSignal = issueSignals.some((item) => /adoption/i.test(item));
  // Files only (2026-09-30). The typed evidence answer was listed here too and
  // read the user's own words straight back; moved into its own block in the
  // evidence card itself (2026-10-16, see typedEvidence below), rather than
  // only in the collapsed "What you told us" details tag.
  const typedEvidence = intake?.evidence?.trim() || "";
  const recordedEvidence = Array.from(new Set([
    // Reads `reference` ("Document 1"), not `name`. The name field no longer
    // exists -- see src/lib/case-system/evidence/evidenceReference.ts -- so
    // this read was silently returning nothing after that change. The user's
    // own label is shown alongside it, which is the part that means anything.
    ...((intake?.extra?.uploadedEvidenceFiles as Array<{ reference?: unknown; title?: unknown }> | undefined) || []).flatMap((file) => {
      const reference = typeof file?.reference === "string" ? file.reference.trim() : "";
      if (!reference) return [];
      const label = typeof file?.title === "string" ? file.title.trim() : "";
      return [label ? `${reference} — ${label}` : reference];
    }),
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
  /*
   * "What to confirm next" used to display a MODEL-WRITTEN QUESTION about this
   * user's matter, on the main builder screen, with no guard.
   *
   * `analysis.missingInformation` and `analysis.nextBestActions` were filtered
   * for anything ending in "?" and the first hit was rendered verbatim. Found
   * by independent review on 2026-09-23; it is audit finding B-5, which the
   * first pass of the LSO work did not address.
   *
   * Both source fields are now stripped of model prose at the engine's
   * assembly point, so this list is already deterministic. The filter is kept
   * rather than deleted because `missingInformation` still legitimately
   * carries fixed questions ("Has the defendant filed a Defence?") and the
   * catalogue's next steps are library text -- both are fine to show. What is
   * gone is the model's contribution to either.
   */
  const isQuestionText = (value: string) => value.trim().endsWith("?");
  const candidateQuestions = withoutAnsweredQuestions(
    [
      ...analysis.missingInformation.filter(isQuestionText),
      ...(analysis.nextBestActions || []).filter(isQuestionText),
    ],
    filingFacts,
  );
  // Once the stage is known ("I have not filed anything yet", "I was served
  // and need to respond"), the generic filing questions are answered by it,
  // and the deadline question by the dates on the step (page review,
  // 2026-10-06: a mother who answered "Nothing filed yet" was asked "Has
  // anything already been filed?" on every page).
  // One rule, in answeredQuestions.ts (26 Oct re-test, case 16: a case already going was asked about court dates).
  const stillToConfirm = withoutStageAnswered(candidateQuestions, caseStage, stageWords);
  const confirmQuestion = askDefenceQuestion
    ? defenceQuestion
    : stillToConfirm[0] || GENERIC_CONFIRM_QUESTION;
  const textItems = (values: readonly string[]): SourcedListItem[] =>
    Array.from(new Set(values)).map((text) => ({ text }));
  const evidenceToOrganize: SourcedListItem[] = hasAdoptionSignal
    ? textItems(["Full legal names and dates of birth", "Proof of Ontario residence, if available", "Family relationship and living-history information", "Adult person’s written wishes or consent information for review", "Known information about the biological father", "A dated record of reasonable efforts already made to locate or contact him", "Any existing court, adoption, or child-protection documents"])
    : claimTypeContent
      ? claimTypeContent.evidenceToOrganize
      // No fallback. When no claim type matched, this list is EMPTY.
      //
      // It used to fall back to analysis.missingEvidence and
      // intelligenceEvidenceIssues[].missingEvidence — unconstrained model
      // output, rendered under a heading that reads as a determination about
      // the user's case. A defamation story about false statements in one
      // custody argument produced "Pattern of harassment", characterising the
      // user's situation as something they never described.
      //
      // The citation asymmetry made it invisible: the sourced branch renders a
      // (Source) link beside each item and the fallback renders none, so the
      // unfounded entries were the ones WITHOUT a citation, which is the
      // opposite of the signal a reader needs.
      //
      // The branch is removed rather than emptied. An empty fallback is one
      // edit from being refilled; a deleted one has to be re-argued. The
      // original justification — that the list "could come back empty for a
      // real scenario" — inverts on contact: an empty list says nothing, and a
      // fabricated one tells the user the system has decided something about
      // their case.
      : [];
  /*
   * Family support resources, shown on COURT PATH ALONE.
   *
   * FAMILY_RESOURCE_TOPICS is sourced content that had never been rendered
   * anywhere: the module's only importer was its own verification script,
   * so verifyIntakeCoverage passed while no user could reach a word of it.
   * That is the sharpest case of a passing check on unreachable code, and it
   * was safety content.
   *
   * Gated on the court path and nothing else — no AI judgment about whether
   * violence is present in this user's facts, which is the distinction the
   * module's own header draws against safetyPass.ts. Someone on the family
   * path sees it; nobody is assessed to decide that.
   */
  /*
   * Situations that generally belong somewhere other than Small Claims,
   * shown as GENERAL INFORMATION on the court path — every route, always,
   * never matched against this user's facts.
   *
   * WHY NOT MATCHED. JURISDICTION_ROUTES carries a `signals` field whose own
   * comment calls it "fact-pattern cues for later matching". Measured, those
   * signals are 0% single-word and 53% first-person — worse on both counts
   * than the claim-type signals that scored 0 of 10 against plain prose.
   * Against three plainly-worded stories, one per route, only one matched at
   * all, and it matched on "my landlord", which appears in plenty of stories
   * that are not tenancy matters.
   *
   * A false positive here is worse than in claim types: it tells a user their
   * matter belongs at a different tribunal. So the content ships and the
   * matching does not. Listing all three and letting the user recognise their
   * own situation is also the posture CLAUDE.md section 2 requires — the
   * system states the rule, the user applies it.
   */
  // Only entries tied to what the USER confirmed: their claim type, or an
  // amount over the $50,000 limit. Nothing is listed otherwise (2026-09-30,
  // site owner). Never narrowed by the story -- see jurisdictionRouteRelevance.ts.
  const jurisdictionRoutes =
    analysis.courtPath === "small-claims"
      ? routesForConfirmedClaimType(JURISDICTION_ROUTES, kindId, parseRecordedAmount(amount))
      : [];


  /*
   * Rule 11, shown when the user has recorded a default step.
   *
   * Gated on a RECORDED FACT — the default-judgment document the user
   * selected — not on any inference about their claim. Every route in the
   * rule renders, including the two that are not judgment routes at all
   * (r. 11.01 (3)'s precondition and r. 11.04's defendant's-claim carve-out),
   * because which one describes a reader's situation is theirs to work out.
   *
   * Nothing here says which route THIS claim takes. Whether a claim is "for a
   * debt or liquidated demand in money" is the distinction the whole rule
   * turns on, and answering it about a user's claim is applying a statutory
   * definition to their facts.
   */
  const showDefaultProceedings =
    analysis.courtPath === "small-claims" && documents.includes("default-judgment");

  const familyResources =
    analysis.courtPath === "family" ? FAMILY_RESOURCE_TOPICS : [];
  // Closed on every Family case; open only when the story says the person is in danger now (owner, 30 Oct), by the emergency notice's one rule.
  const familyResourcesOpen = storyNamesPresentDanger(userStory(intake));

  const courtPoints: SourcedListItem[] = claimTypeContent ? claimTypeContent.courtPoints : [];
  // General information about what defences commonly arise for this TYPE of
  // claim (sourced, same claimTypeOverviewContent.ts pipeline as courtPoints
  // above) -- never a prediction about what this case's specific opponent
  // will argue. Empty, never a fallback, for anything claimTypeContent is
  // null for (Family/Civil, or a Small Claims story matching none of the 19
  // CLAIM_TYPES entries yet), same as courtPoints.
  const commonDefences: SourcedListItem[] = claimTypeContent ? claimTypeContent.commonDefences : [];
  // The rules that matter most first, named once; their words stay under "What we looked into" (lawBehind.ts).
  const lawBehind = lawBehindThis(analysis.research?.findings ?? [], analysis.appliedLaw ?? []);
  // 2026-09-28. Labelled rows instead of one run-on paragraph that ended with
  // the whole story pasted in. Values are still the user's own words, shown
  // as entered -- nothing is corrected or restated -- and the story sits
  // under its own heading.
  const timeline = intake?.timeline?.trim() || "";

  const snapshotRows: Array<[string, string]> = [
    ["Court", analysis.courtPath === "small-claims" ? "Small Claims Court" : analysis.courtPath === "family" ? "Family court" : "Superior Court of Justice"],
    ...(parties ? ([["Parties recorded", parties]] as Array<[string, string]>) : []),
    ...(roleInWords(role, roleWords) ? ([["Your role", roleInWords(role, roleWords)]] as Array<[string, string]>) : []),
    ["Current stage", stageWords ?? displayStage(caseStage)],
    ...(timeline ? ([["When (your words)", timeline]] as Array<[string, string]>) : []),
    ...(amount ? ([["Amount", formatRecordedAmount(amount)]] as Array<[string, string]>) : []),
    ...(outcome ? ([["What you want (your words)", outcome]] as Array<[string, string]>) : []),
  ];

  return <section className="rounded-3xl border border-[#d8e6df] bg-[#f8faf8] p-6 md:p-8" data-testid="case-overview">
    <h1 className="text-3xl font-bold tracking-tight text-[#10231f]">Your case overview</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4d675f]">A clear view of the information saved from your intake and the next item to review.</p>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <Card title="Case snapshot">
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
          {snapshotRows.map(([label, value], index) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-[#10231f]">{label}</dt>
              <dd>{value}</dd>
              {index === 0 && kind ? (
                <>
                  <dt className="font-semibold text-[#10231f]">{kind.label}</dt>
                  <dd data-testid="claim-kind" data-claim-type={kind.claimTypeId ?? "your-answer"} data-claim-kind-held={kind.held ? "yes" : "no"}>
                    {kind.words}
                    {kind.quote ? <span data-testid="claim-kind-quote" className="block text-xs text-[#4d675f]">From your story: &ldquo;{kind.quote}&rdquo;</span> : null}
                  </dd>
                </>
              ) : index === 0 && askKind ? (
                <>
                  <dt className="font-semibold text-[#10231f]">Kind of claim</dt>
                  <dd data-testid="claim-kind" data-claim-type="not-sure">
                    <ClaimKindChooser caseId={caseId} chosen={pickedHere ?? (claimKind?.askedBy === CLAIM_KIND_QUESTION && claimKind.state === "unsure" ? "not-sure" : null)} onChosen={setPickedHere} saidNotSure={claimKind?.state === "unsure"} />
                  </dd>
                </>
              ) : null}
            </div>
          ))}
        </dl>
        {facts ? (
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold text-[#2f7d67]">What you told us</summary>
            <p className="mt-2 whitespace-pre-wrap">{facts}</p>
            {intake?.evidence?.trim() ? (
              <>
                <p className="mt-3 font-semibold text-[#10231f]">Evidence you described</p>
                <p className="mt-1 whitespace-pre-wrap">{intake.evidence}</p>
              </>
            ) : null}
          </details>
        ) : null}
      </Card>
      {/* 2026-09-30: the generic "Possible issue to review: property-damage. The saved facts and supporting information should be reviewed." list said nothing the user did not already know (owner's walk-through). The card now shows only when it has something specific to say. */}
      {(hasDefamationSignal || hasAdoptionSignal || issueTypeUndetermined) && <Card title="Issues to review">{hasDefamationSignal ? <><p className="font-semibold">Possible defamation or reputational-harm issue to review</p><p className="mt-2">The saved story describes an allegation said to have been communicated to other people and described as false. The court will need the full facts, context, evidence, and procedure reviewed.</p></> : hasAdoptionSignal ? <><p className="font-semibold">Possible adult step-parent adoption process to review</p><p className="mt-2">The saved facts describe an adult who may wish to be adopted by a long-term step-parent. Ontario has an adoption application process, but the required documents, notice/consent issues, and court requirements must be confirmed for the specific circumstances.</p></> : issueTypeUndetermined ? <p>We couldn’t determine a specific issue type from what you’ve described yet. Adding more detail about what happened, and what you want the court to do, will help narrow it.</p> : <ul className="list-disc space-y-1 pl-5">{issueSignals.map((issue) => <li key={issue}>Possible issue to review: {issue}. The saved facts and supporting information should be reviewed.</li>)}</ul>}</Card>}
      {/* The stage is in the snapshot above; this card said it a second time
          (page review round 4). It stays only for what the snapshot does not say. */}
      {hasClaimAndService ? <Card title="Where your case is now"><p>Claim already filed and served.</p></Card> : null}
      {/* 2026-09-30: hidden when the only candidate is the generic fallback "What important fact should be confirmed next?" -- a card with no actual question in it. */}
      {(hasAdoptionSignal || confirmQuestion !== GENERIC_CONFIRM_QUESTION) && <Card title="What to confirm next"><p className="font-semibold">{hasAdoptionSignal ? "Does the adult person freely agree to the proposed adoption?" : confirmQuestion}</p><p className="mt-2">{hasClaimAndService ? "This helps identify the next Small Claims step. Confirm it from the court record or documents you received." : hasAdoptionSignal ? "This helps organize the saved facts for review of the proposed adoption process." : "This helps keep the next review based on the facts already entered."}</p></Card>}
      {/* 2026-09-30: shown only when there are filed or served court documents to list. */}
      {documents.length > 0 && <Card title="Documents already recorded"><ul className="list-disc space-y-1 pl-5">{documents.map((document) => <li key={document}>{documentLabel(document)}</li>)}</ul></Card>}
      {/* 2026-09-30: "Evidence you have recorded" repeated the user's own answer back to them. Their words stay in "What you told us"; the upload card below is where the evidence itself goes.
          2026-10-16 live bug: that left the person's own typed "Evidence you have" answer ("Vet bills") appearing nowhere near the checklist of evidence to organize -- only buried in a collapsed "What you told us" details tag elsewhere on the page, which a live reader did not notice or expect. It belongs right here, beside the checklist it answers part of: shown first, under its own heading, so it reads as "what you already have" next to "what else to organize or confirm" -- not repeated as a second, separate card. */}
      {(typedEvidence || recordedEvidence.length > 0 || evidenceToOrganize.length > 0) && <Card title="Evidence and proof to organize">{typedEvidence && <><h3 className="font-semibold">What you told us you have</h3><p className="mt-2 whitespace-pre-wrap">{typedEvidence}</p></>}{recordedEvidence.length > 0 && <><h3 className={typedEvidence ? "mt-5 font-semibold" : "font-semibold"}>Files you have added</h3><ul className="mt-2 list-disc space-y-1 pl-5">{recordedEvidence.map((item) => <li key={item}>{item}</li>)}</ul></>}{evidenceToOrganize.length > 0 && <><h3 className={typedEvidence || recordedEvidence.length ? "mt-5 font-semibold" : "font-semibold"}>Evidence to organize or confirm</h3><ul className="mt-2 list-disc space-y-1 pl-5">{evidenceToOrganize.map((item) => <li key={item.text}>{item.text}{item.sourceUrl ? <> (<a className="font-semibold text-[#2f7d67] underline" href={publicSourceUrl(item.sourceUrl)} target="_blank" rel="noreferrer">{sourceLinkLabel(item.sourceUrl, item.text)}</a>)</> : null}</li>)}</ul></>}</Card>}
      {/* 2026-10-05: the provisions the analysis rests on, found by meaning-based retrieval and quote-checked. Verbatim text only; see AppliedLawPanel. */}
      {/* 2026-10-07: the person's situation answered in plain words, each statement checked against the official text quoted with it (retrieval/checkedAnswer.ts). */}
      {analysis.checkedAnswer && analysis.checkedAnswer.status !== "unavailable" && <Card title="Your situation, answered"><CheckedAnswerPanel answer={analysis.checkedAnswer} /></Card>}
      {process.env.NEXT_PUBLIC_STRATEGY !== "off" && intake?.facts ? (
        <Card title="Case strategy (beta)">
          <StrategyPanel
            story={userStory(intake)}
            courtPath={analysis.courtPath}
            side={String(intake.extra?.yourRole ?? intake.extra?.role ?? "")}
            caseId={caseId}
          />
        </Card>
      ) : null}
      {/* 2026-10-26 (Charter re-test): the rules that matter most for the claim lead, named once with the question each answers; their words are in "What we looked into" below. Law the research did not show follows, quoted (2026-10-06: never the same passage quoted twice). */}
      {lawBehind.lines.length + lawBehind.quoted.length > 0 && <Card title="The law behind this">
        {lawBehind.lines.length > 0 && <ul data-testid="law-behind-lines" className="space-y-2">{lawBehind.lines.map((line) => <li key={line.id} data-testid="law-behind-line"><a className="font-semibold text-[#2f7d67] underline" href={line.sourceUrl} target="_blank" rel="noreferrer">{line.name}</a>{line.checkedOn ? <span className="text-xs text-[#6b8078]"> (checked {line.checkedOn})</span> : null}<span className="block text-sm text-[#4f685f]">For: {line.answers}</span></li>)}</ul>}
        {lawBehind.lines.length > 0 && <p className="mt-2 text-xs text-[#6b8078]">The words of each are under &ldquo;What we looked into&rdquo;.</p>}
        {lawBehind.quoted.length > 0 && <div className={lawBehind.lines.length ? "mt-4" : ""}><AppliedLawPanel items={lawBehind.quoted} /></div>}
      </Card>}
      {analysis.research && analysis.research.findings.length > 0 && <Card title="What we looked into"><ResearchPanel findings={analysis.research.findings} /></Card>}
      {/* The "What the rules say about starting a Small Claims action" card was
          removed on 2026-10-14 (CLAUDE.md s. 2a, one copy of procedure): the
          step panel shows the starting step, its form and deadlines from the
          stage map, so the same steps were on the page twice. */}
      {courtPoints.length > 0 && <Card title="Points the court may need clarified"><SourcedList items={courtPoints} /></Card>}
      {commonDefences.length > 0 && <Card title="Defences that commonly come up"><p className="mb-3 text-sm leading-6 text-[#4d675f]">General information about defences that commonly arise for this type of claim -- not a prediction about what the other side will argue in this case.</p><SourcedList items={commonDefences} /></Card>}
      {showDefaultProceedings && (
        <Card title="What rule 11 provides after a defendant is noted in default">
          <p className="mb-4 text-sm leading-6 text-[#4d675f]">
            You recorded a default step, so here is what the rule itself says. Which of these
            describes your claim is for you to decide — the rule draws the distinction and
            CourtSimplified does not apply it to your facts.
          </p>
          <ul className="space-y-6">
            {DEFAULT_PROCEEDING_ROUTES.map((route) => (
              <li key={route.id} data-testid="default-proceeding-route" data-rule={route.rule}>
                <p className="font-semibold text-[#10231f]">
                  {route.rule} — {route.title}
                </p>
                <blockquote className="mt-2 border-l-4 border-[#d8e6df] pl-4 text-sm italic">
                  &ldquo;{route.quote}&rdquo;
                </blockquote>
                <p className="mt-2 text-sm font-semibold text-[#24463d]">When this part applies:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {route.appliesWhen.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-semibold text-[#24463d]">Forms the rule names:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {route.forms.map((form) => (
                    <li key={form}>{form}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
            <p className="text-sm font-semibold text-[#10231f]">
              {SETTING_ASIDE_DEFAULT.rule} — the other party can ask to set this aside
            </p>
            <blockquote className="mt-2 border-l-4 border-[#d8e6df] pl-4 text-sm italic">
              &ldquo;{SETTING_ASIDE_DEFAULT.quote}&rdquo;
            </blockquote>
          </div>
          <p className="mt-4 text-sm">
            <a
              className="text-[#2f7d67] underline"
              href={SMALL_CLAIMS_RULES_URL}
              target="_blank"
              rel="noreferrer"
            >
              O. Reg. 258/98, Rules of the Small Claims Court
            </a>{" "}
            — rule 11, consolidation from 14 October 2025.
          </p>
        </Card>
      )}
      {jurisdictionRoutes.length > 0 && (
        <Card title="A rule that can affect where this kind of claim goes">
          <p className="mb-3 text-sm leading-6 text-[#4d675f]">
            Shown because of the kind of claim {kind?.held ? (kind.label === "Kind of claim you chose" ? "you chose" : kind.label === "Kind of claim you confirmed" ? "you confirmed" : "you gave") : "this matches"} or the
            amount you recorded. It is general information about the rule, not a decision about your claim.
          </p>
          <ul className="space-y-5">
            {jurisdictionRoutes.map((route) => (
              <li key={route.id}>
                <p className="font-semibold text-[#10231f]">{route.matterDescription}</p>
                <p className="mt-1"><LongText text={route.whyNotSmallClaims} /></p>
                <p className="mt-1">
                  <span className="font-semibold">Generally goes to:</span> {route.destinationForum}.{" "}
                  {route.whereItGoes}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {route.citations.map((citation) => (
                    <li key={citation.officialUrl}>
                      <a className="text-[#2f7d67] underline" href={citation.officialUrl} target="_blank" rel="noreferrer">
                        {citation.sourceName}
                      </a>
                      {citation.pinpoint ? ` — ${citation.pinpoint}` : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {familyResources.length > 0 && familyResources.map((topic) => (
        <Card key={topic.id} title={topic.title}>
          {/* On every Family case, never assessed against the person's facts. Closed unless the story
              says they are in danger now (site owner, 2026-10-30; before, open on every Family case). */}
          <details open={familyResourcesOpen} data-testid="family-safety-resources">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">Who to contact, and how</summary>
          <p className="mt-2 whitespace-pre-line">{topic.content}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {topic.citations.map((citation) => (
              <li key={citation.officialUrl}>
                <a className="text-[#2f7d67] underline" href={citation.officialUrl} target="_blank" rel="noreferrer">
                  {citation.sourceName}
                </a>
              </li>
            ))}
          </ul>
          </details>
        </Card>
      ))}
      {hasAdoptionSignal && <Card title="Official Ontario resources to review"><ul className="list-disc space-y-2 pl-5"><li><a className="text-[#2f7d67] underline" href="https://www.ontario.ca/page/adopt-stepchild-or-relative" target="_blank" rel="noreferrer">Ontario: Adopt a stepchild or relative</a></li><li><a className="text-[#2f7d67] underline" href="https://ontariocourtforms.on.ca/en/family-law-rules-forms/8d/" target="_blank" rel="noreferrer">Ontario Court Services: Form 8D, Application (adoption)</a></li><li><a className="text-[#2f7d67] underline" href="https://www.ontario.ca/laws/statute/17c14" target="_blank" rel="noreferrer">Ontario Child, Youth and Family Services Act</a></li></ul><p className="mt-3">Form 8D is an official Ontario adoption application form to review. Court requirements and any consent or notice issues must be confirmed before filing.</p></Card>}
    </div>
    <p className="mt-7 text-sm leading-7 text-[#4d675f]">CourtSimplified organizes your information and identifies items to review; it does not decide your legal claim, outcome, or judgment.</p>
  </section>;
}

/**
 * "Not sure" about the kind of claim, and asked (step 2b): the catalogue's kinds of claim
 * to choose from, or "I'm not sure", which is remembered and not asked again (a Choose
 * link stays). The person's choice is kept in the case file (caseFile.ts claimKindAnswer).
 */
function ClaimKindChooser({ caseId, chosen, onChosen, saidNotSure = false }: { caseId: string | null; chosen: string | null; onChosen: (value: string) => void; saidNotSure?: boolean }) {
  // Folded once they said "not sure" (here, or in the review, its one more offer): "Choose it" stays.
  const [open, setOpen] = useState(chosen !== "not-sure" && !saidNotSure);
  const [pick, setPick] = useState("");
  const [failed, setFailed] = useState(false);
  // Which answer is being saved: that button says so, and neither is pressed twice (fresh review, 28 Oct).
  const [saving, setSaving] = useState<"pick" | "not-sure" | null>(null);
  const kinds = kindsOfClaim(CLAIM_TYPES).slice().sort((a, b) => a.name.localeCompare(b.name));
  const save = async (value: string) => {
    if (saving) return;
    setFailed(false);
    setSaving(value === "not-sure" ? "not-sure" : "pick");
    const saved = !caseId || (await savePositionQueued(caseId, claimKindAnswer(value)));
    setSaving(null);
    if (!saved) { setFailed(true); return; }
    onChosen(value);
    setOpen(false);
  };
  if (!open) {
    return <span>Not sure yet. <button type="button" data-testid="claim-kind-choose" onClick={() => setOpen(true)} className="font-semibold text-[#2f7d67] underline">Choose it</button></span>;
  }
  return (
    <span data-testid="claim-kind-chooser" className="block">
      <span className="block">Not sure yet: nothing in your story shows it. Which kind of claim is this?</span>
      <select aria-label="Kind of claim" data-testid="claim-kind-select" value={pick} onChange={(event) => setPick(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d8e6df] px-3 py-2">
        <option value="">Choose one</option>
        {kinds.map((claimType) => <option key={claimType.id} value={claimType.id}>{claimType.name}</option>)}
      </select>
      <span className="mt-2 flex flex-wrap gap-2">
        <WorkingButton data-testid="claim-kind-use" disabled={!pick || saving !== null} working={saving === "pick"} workingLabel="Saving…" onClick={() => void save(pick)} className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Use this</WorkingButton>
        <WorkingButton data-testid="claim-kind-not-sure" disabled={saving !== null} working={saving === "not-sure"} workingLabel="Saving…" onClick={() => void save("not-sure")} className="rounded-xl border border-[#d8e6df] px-4 py-2 text-sm font-semibold text-[#2f7d67]">I&apos;m not sure</WorkingButton>
      </span>
      {failed ? <span className="mt-1 block text-sm text-[#8a4b12]">That could not be saved just now. Please try again.</span> : null}
    </span>
  );
}
