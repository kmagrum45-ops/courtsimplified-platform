import type { StoredCaseData } from "./builderTypes";

/**
 * Whether the user is on the RESPONDING side of the case.
 *
 * Page walkthrough, 2026-10-04: a Small Claims defendant who had been served,
 * and had confirmed "I was served and need to respond", was offered "Create
 * Plaintiff's Claim draft (Form 7A)" — the other side's document. The draft
 * buttons only checked whether that document was already filed, which a
 * defendant's own record does not say.
 *
 * Any one signal is enough, each from the user's own answers: the confirmed
 * stage, the role recorded on the intake, or the guided intake's role.
 */
export function userIsResponding(args: {
  confirmedStage: string | null;
  caseData: StoredCaseData | null;
  intakeFacts: Record<string, unknown> | null;
}): boolean {
  if (args.confirmedStage === "responding") return true;
  if (args.intakeFacts?.role === "defendant") return true;
  const extra = args.caseData?.extra as Record<string, unknown> | undefined;
  const roles = [
    (args.caseData as (StoredCaseData & { yourRole?: unknown }) | null)?.yourRole,
    extra?.yourRole,
  ];
  return roles.some(
    (role) => typeof role === "string" && /defendant|respondent|responding/i.test(role),
  );
}

/**
 * Whether the originating document is ALREADY RECORDED as filed.
 *
 * The "What CourtSimplified can help with next" buttons were gated on
 * `courtPath` and `getActiveCaseId()` and nothing else. A user whose case
 * recorded the claim filed, served, and a default judgment obtained was still
 * offered "Create Plaintiff's Claim draft (Form 7A)" — the document that
 * starts the case, offered to someone past default.
 *
 * Two independent signals, either of which is enough, because they are
 * populated on different paths and a case can have one without the other:
 *
 *   - `extra.filedDocuments` / `extra.documents`, the list the overview panel
 *     already renders under "Documents already recorded".
 *   - `IntakeFacts.claimFiled`, the guided-intake answer that
 *     deriveCaseStageWithEvents reads.
 *
 * Only TRUE is meaningful. Absence means not recorded, never "did not
 * happen" — the same rule the intakeFacts writer follows.
 */
/**
 * Stages that only exist once a case has been started. Walkthrough,
 * 2026-10-08: a plaintiff with a judgment, one with a settlement conference
 * booked and one with a motion were each offered a new Plaintiff's Claim or
 * Statement of Claim draft, because neither the documents list nor the guided
 * facts said the claim was filed -- but the stage they chose did.
 */
const STARTED_STAGES = new Set(["already-started", "conference", "motion", "trial", "enforcement"]);

export function originatingDocumentRecorded(args: {
  courtPath: string;
  caseData: StoredCaseData | null;
  intakeFacts: Record<string, unknown> | null;
  /** The stage the user confirmed, if any. */
  confirmedStage?: string | null;
}): boolean {
  if (args.intakeFacts?.claimFiled === true) return true;
  if (args.confirmedStage && STARTED_STAGES.has(args.confirmedStage)) return true;
  if (args.caseData?.caseStage && STARTED_STAGES.has(args.caseData.caseStage)) return true;

  const extra = args.caseData?.extra as Record<string, unknown> | undefined;
  const raw = extra?.filedDocuments ?? extra?.documents;
  const filed = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];

  const originating: Record<string, string[]> = {
    "small-claims": ["plaintiffs-claim"],
    civil: ["statement-of-claim"],
    family: ["application"],
  };

  return (originating[args.courtPath] || []).some((id) => filed.includes(id));
}

/**
 * Whether the ordinary response (Defence, Statement of Defence, Answer) is
 * still the person's next document, given the step they are at. Replay,
 * 2026-10-09: a defendant noted in default was offered "Create Defence
 * (Form 9A) draft" as the first action, ahead of the motion to set the
 * noting aside that their step actually needs. Past the defence -- noted in
 * default, a default judgment, a judgment, or a defence already filed -- the
 * draft is not offered. With no step known, it is, as before.
 */
export function respondingDocumentStillDue(stepId: string | null | undefined): boolean {
  if (!stepId) return true;
  // Offered only at a step where the defence or answer is the next thing to
  // do. A step past it -- noted in default, a judgment, a defence filed, a
  // conference or trial -- gets no offer (held-back walkthrough, 2026-10-09:
  // a defendant with a trial date was offered "Create Defence (Form 9A)
  // draft"), and neither does a step for the other side picked by mistake.
  return /(?:^|:)(?:served-defence-period-running|defence-period-expired-not-yet-noted|defence-period-expired-not-noted|served-time-to-answer-running|served-with-amended-application)$/.test(stepId);
}
