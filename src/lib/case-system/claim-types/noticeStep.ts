/**
 * The notice step to suggest first, for a claim whose kind can need written
 * notice before suing.
 *
 * WHY (2026-10-06, the site owner's live test). A slip on ice at a store, the
 * injury date given, the claim type confirmed as slip and fall -- and the
 * next-steps panel suggested "How do I actually file my claim". The 60-day
 * Occupiers' Liability Act notice was only in a general information box. The
 * step for it (before-filing:notice-snow-ice-private) was published, with its
 * deadline counted from the injury date; nothing pointed the person to it.
 *
 * WHAT IT DOES. Finds the authored profiles related to the confirmed claim
 * type that have a notice step, and returns the one the person's own words
 * point to. One claim type can relate to several (a fall can be on a city
 * sidewalk, a Toronto sidewalk, or snow and ice on private property), so a
 * story that fits none or more than one gets no suggestion and the panel
 * keeps its ordinary one. It is a SUGGESTION: the panel says so, and the
 * person can choose another step.
 *
 * Pure. Asserted by `npm run test:notice-step`.
 */

import { renderableProfiles } from "./catalogue";

/** Words in the person's story that place a notice step. Surfaces, not law. */
const SNOW_OR_ICE = /\b(ice|icy|iced|snow|snowy|slush|unsalted|salt|salted|sanded)\b/i;
const PUBLIC_SURFACE = /\b(sidewalks?|roads?|streets?|highways?|bridges?|potholes?|crosswalks?)\b/i;
const TORONTO = /\btoronto\b/i;

const POINTS_TO: Record<string, (story: string) => boolean> = {
  "before-filing:notice-snow-ice-private": (story) => SNOW_OR_ICE.test(story) && !PUBLIC_SURFACE.test(story),
  "before-filing:notice-municipality": (story) => PUBLIC_SURFACE.test(story) && !TORONTO.test(story),
  "before-filing:notice-toronto": (story) => PUBLIC_SURFACE.test(story) && TORONTO.test(story),
};

export function suggestedNoticeStep(args: { claimTypeId?: string | null; story?: string | null }): string | null {
  const claimTypeId = args.claimTypeId ?? "";
  if (!claimTypeId) return null;
  const story = args.story ?? "";
  const steps = new Set<string>();
  for (const profile of renderableProfiles()) {
    const related =
      profile.id === claimTypeId ||
      profile.existingClaimTypeId === claimTypeId ||
      (profile.alsoRelevantTo ?? []).includes(claimTypeId);
    if (!related) continue;
    for (const notice of profile.notices ?? []) steps.add(notice.stageId);
  }
  const candidates = [...steps];
  if (candidates.length === 1 && !POINTS_TO[candidates[0]]) return candidates[0];
  const pointed = candidates.filter((stageId) => POINTS_TO[stageId]?.(story));
  return pointed.length === 1 ? pointed[0] : null;
}
