/**
 * THE PERSON'S SIDE CHOOSES THE VIEW, IN ONE PLACE (site owner, 13 Nov 2026, decision on 6c; Chrome check of #550, S5).
 *
 * A kind of claim written for the person suing ("A homeowner will not pay the contractor") was shown, as written, to
 * the homeowner being sued: the contractor's proof list, the points the contractor must make, the "you are claiming"
 * wording. For a person being sued, every screen now asks this module which kind's content to show:
 *   - a kind with an existing defendant-side view of the same relationship (defendantViews.json "mapped") shows that
 *     view;
 *   - every other kind written for the person suing is declared "hiddenForDefendant": its plaintiff-only parts are not
 *     shown, and the existing generic view for a person who has been served is shown instead.
 * Nothing here writes wording; every view is an existing, sourced kind. test:defendant-view holds the declarations
 * complete (a new kind for the person suing fails until it says what a person being sued sees).
 */
import views from "./defendantViews.json";
import { CLAIM_TYPES, type ClaimType } from "./claimTypes";
import { respondsToTheCase, type CaseFile } from "../caseFile/caseFile";

const MAPPED = views.mapped as Record<string, string>;
const HIDDEN = new Set(views.hiddenForDefendant as string[]);
export const GENERIC_SERVED_VIEW: string = views.genericServedView;

/** True for a defendant-side kind (written for the person responding). */
export function isDefendantSideKind(id: string): boolean {
  return id.startsWith("sc-defence-");
}

/** The kind whose content is shown, for this side: the kind itself, its defendant-side view, or the generic served view. */
export function kindForSide(kindId: string | null, responding: boolean): { kindId: string | null; plaintiffOnlyHidden: boolean } {
  if (!kindId || !responding || isDefendantSideKind(kindId)) return { kindId, plaintiffOnlyHidden: false };
  if (MAPPED[kindId]) return { kindId: MAPPED[kindId], plaintiffOnlyHidden: false };
  if (HIDDEN.has(kindId)) return { kindId: GENERIC_SERVED_VIEW, plaintiffOnlyHidden: true };
  // Not a Small Claims kind for the person suing (another court's): unchanged.
  return { kindId, plaintiffOnlyHidden: false };
}

/** Parts of a defendant-side view that still speak to the person suing (defendantViews.json, for the review chat). */
const HIDDEN_PARTS = (views.hiddenPartsForDefendant as { startsWith: string }[]).map((part) => part.startsWith);

/** True when this text is declared as speaking to the person suing, so a person being sued is not shown it. */
export function hiddenForDefendant(text: string): boolean {
  return HIDDEN_PARTS.some((start) => text.startsWith(start));
}

/**
 * The claim type whose content is shown, for this side (kindForSide, as a claim type). For a person being sued, a
 * part declared as speaking to the person suing has its explanation left out; its evidence items stay.
 */
export function claimTypeForSide(claimType: ClaimType, responding: boolean): ClaimType {
  const { kindId } = kindForSide(claimType.id, responding);
  const shown = (kindId && kindId !== claimType.id ? CLAIM_TYPES.find((candidate) => candidate.id === kindId) : undefined) ?? claimType;
  if (!responding) return shown;
  return { ...shown, plaintiffElements: shown.plaintiffElements.map((element) => (hiddenForDefendant(element.plainExplanation ?? "") ? { ...element, plainExplanation: "" } : element)) };
}

/** The person is the one being sued, from the record: the case file's side, else the role the intake holds. */
export function respondingSide(file: CaseFile | null | undefined, role?: unknown): boolean {
  if (file?.side?.state === "answered") return respondsToTheCase(file);
  return typeof role === "string" && /defendant|responding/i.test(role);
}
