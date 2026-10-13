import type { StoredCaseData } from "./builderTypes";
import { sideFromParts } from "@/src/lib/case-system/caseRecord";

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
  // One rule for the side, shared with the case record (Step 2A, 2026-10-12).
  return (
    sideFromParts({
      confirmedStage: args.confirmedStage,
      intakeData: args.caseData,
      intakeFacts: args.intakeFacts,
    })?.value === "responding"
  );
}

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
