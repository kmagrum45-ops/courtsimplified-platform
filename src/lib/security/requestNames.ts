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
import { businessOtherSideIn } from "../case-system/caseFile/storyFacts";
import { partyName, readParties } from "../case-system/parties/parties";
import { CASE_FILE_SECTION } from "../case-system/caseFile/caseFile";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../supabase/serverAuth";

/** A name the story readers pick out as the other party ("my ex, Sarah Jones,"), or none. */
export function storyNames(story: string): string[] {
  const said = story.trim() ? (otherPartyNameFromStory(story) ?? otherPartyFromStory(story) ?? businessOtherSideIn(story))?.value : undefined;
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
  return mergeNameLabels(partyNameLabels(object(object(master).intakeCheckpoint).sections), knownNameLabels(intake, storyNames(story)));
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

/**
 * EVERY PARTY DETAIL THE CASE RECORD HOLDS, AS LABELS (site owner, 14 Nov 2026, rule 3: names, addresses, phone numbers
 * and emails are never sent to OpenAI). The parties record (CASE_FILE_SECTION.parties) is read here, by the label layer
 * only, so the one AI client replaces each value with its label in anything sent and puts it back in what comes back.
 * No AI request builder reads the record itself (test:parties-never-to-ai). A name is matched whole and by its parts; a
 * street, postal code, phone number or email only whole. Each value gets its own numbered label, so putting it back is
 * exact.
 */
export function partyNameLabels(sections: unknown): NameLabel[] {
  const record = readParties(object(object(sections)[CASE_FILE_SECTION]).parties);
  if (!record) return [];
  const out: NameLabel[] = [];
  let other = 0;
  let party = 0;
  const counts: Record<string, number> = {};
  const next = (kind: string) => { counts[kind] = (counts[kind] ?? 0) + 1; return `[${kind} ${counts[kind]}]`; };
  for (const item of record.list) {
    const label = item.you ? "[you]" : item.side === "other" ? (other++ === 0 ? "[the other party]" : `[other party ${other}]`) : `[party ${++party}]`;
    const { details } = item;
    for (const name of [partyName(item), details.fullName, details.companyName, details.alsoKnownAs].map(text).filter((value) => value.trim())) out.push({ name: name.trim(), label });
    if (details.repName?.trim()) out.push({ name: details.repName.trim(), label: next("representative") });
    for (const key of ["street", "repStreet"] as const) if (details[key]?.trim()) out.push({ name: details[key]!.trim(), label: next("street address"), whole: true });
    for (const key of ["postalCode", "repPostalCode"] as const) if (details[key]?.trim()) out.push({ name: details[key]!.trim(), label: next("postal code"), whole: true });
    for (const key of ["phone", "repPhone"] as const) if (details[key]?.trim()) out.push({ name: details[key]!.trim(), label: next("phone number"), whole: true });
    for (const key of ["email", "repEmail"] as const) if (details[key]?.trim()) out.push({ name: details[key]!.trim(), label: next("email address"), whole: true });
    if (details.repLso?.trim()) out.push({ name: details.repLso.trim(), label: next("licence number"), whole: true });
  }
  return mergeNameLabels(out);
}
