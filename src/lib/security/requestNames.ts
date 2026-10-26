/**
 * THE NAMES A REQUEST'S CASE HOLDS, SET FOR EVERY MODEL CALL IT MAKES (site owner, 2026-10-25).
 *
 * Every AI route runs its work inside the names of its case (privacy/modelNameContext.ts), so
 * the one AI client replaces them with labels in what it sends and puts them back in what it
 * returns. The names come from what the request carries (an intake, a form's input, its story
 * or fields) and, when the request names a saved case of the signed-in person, from that
 * case's saved intake. The confirmed-guidance gate does this for the routes behind it
 * (intakeGuidanceGate.ts); `withRequestNames` does it for the rest.
 */
import { knownNameLabels, type NameLabel } from "../case-system/privacy/nameLabels";
import { otherPartyFromStory, otherPartyNameFromStory } from "../../../app/builder/_components/storyAnswers";
import { withNameLabelsFor } from "../case-system/privacy/modelNameContext";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../supabase/serverAuth";

/** A name the story readers pick out as the other party ("my ex, Sarah Jones,"), or none. */
export function storyNames(story: string): string[] {
  const said = story.trim() ? (otherPartyNameFromStory(story) ?? otherPartyFromStory(story))?.value : undefined;
  return said ? [said] : [];
}

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Every name the request's own body carries: its intake, its form input, its fields, and its story. */
export function bodyNameLabels(body: Record<string, unknown>): NameLabel[] {
  const intake = { ...object(body.fields), ...object(body.input), ...object(body.intake), ...object(body.intakeData), ...object(body.caseData) };
  const story = [body.story, body.facts, intake.facts, body.storyText, body.newStoryText].map(text).find((value) => value.trim()) ?? "";
  return knownNameLabels(intake, storyNames(story));
}

/** Two lists of names as one, each name once (the first label wins). */
export function mergeNameLabels(...lists: readonly NameLabel[][]): NameLabel[] {
  const out: NameLabel[] = [];
  for (const item of lists.flat()) if (!out.some((held) => held.name.toLowerCase() === item.name.toLowerCase())) out.push(item);
  return out;
}

/** The names a saved case holds: its intake data and its story. */
export function savedCaseNameLabels(master: unknown): NameLabel[] {
  const intake = object(object(master).intakeData);
  const story = text(object(object(object(master).intakeCheckpoint).sections).story && object(object(object(object(master).intakeCheckpoint).sections).story).text) || text(intake.facts);
  return knownNameLabels(intake, storyNames(story));
}

/** For routes outside the confirmed-guidance gate: the request's names (and its saved case's, when it names one). */
export function withRequestNames<T extends Request>(handler: (request: T) => Promise<Response>): (request: T) => Promise<Response> {
  return async (request: T) => {
    let body: Record<string, unknown> = {};
    try { body = object(JSON.parse(await request.clone().text())); } catch { /* the handler answers a bad body itself */ }
    let saved: NameLabel[] = [];
    const caseId = typeof body.caseId === "string" ? body.caseId : null;
    if (caseId) {
      const user = await getAuthenticatedUser(request as never).catch(() => null);
      const owned = user ? await getAuthenticatedOwnedCase(request, user as never, caseId, { masterKeys: ["intakeData", "intakeCheckpoint"] }).catch(() => null) : null;
      if (owned) saved = savedCaseNameLabels(owned.master_result);
    }
    return withNameLabelsFor(mergeNameLabels(saved, bodyNameLabels(body)), () => handler(request));
  };
}
