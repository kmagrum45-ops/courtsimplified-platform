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

/*
 * A MOTION TO CHANGE IS STARTED BY ITS OWN DOCUMENT (walkthrough run
 * 38525903567, FM). A father bringing a motion to change was told "Your
 * records show the document that starts this case has already been filed",
 * because the confirmed stage "motion" and his existing order were read as a
 * started case. The order exists; the motion to change does not. Under
 * r. 15 (5) "a party who wants to ask the court to change a final order or
 * agreement shall serve and file a motion to change (Form 15)", and r. 15 (4)
 * starts it "as if the motion were a new case". So for the moving party the
 * starting document is Form 15, recorded only when motion materials are.
 */
export function movingOnMotionToChange(args: {
  courtPath: string;
  responding: boolean;
  /** The motion-to-change route the person confirmed, or the reading not yet answered. */
  routeKind: "asking" | "responding" | "if-served" | null;
  /** The step chosen or suggested (stage-map id), if any. */
  stepId?: string | null;
}): boolean {
  if (args.courtPath !== "family" || args.responding) return false;
  return args.routeKind === "asking" || (args.routeKind === null && args.stepId === "family:both:asking-to-change-final-order");
}

/** The family documents a motion to change is recorded with ("Motion materials already filed"). */
const MOTION_MATERIALS = new Set(["motion-materials"]);

export function originatingDocumentRecorded(args: {
  courtPath: string;
  caseData: StoredCaseData | null;
  intakeFacts: Record<string, unknown> | null;
  /** The stage the user confirmed, if any. */
  confirmedStage?: string | null;
  /** The person brings a motion to change (movingOnMotionToChange): only motion materials record its starting document. */
  motionToChangeMover?: boolean;
}): boolean {
  if (args.motionToChangeMover && args.courtPath === "family") {
    const extra = args.caseData?.extra as Record<string, unknown> | undefined;
    const raw = extra?.filedDocuments;
    return Array.isArray(raw) && raw.some((item) => typeof item === "string" && MOTION_MATERIALS.has(item));
  }
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
