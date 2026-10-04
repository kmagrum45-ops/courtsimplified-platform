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
