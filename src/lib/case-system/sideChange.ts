/**
 * WHEN THE PERSON'S SIDE CHANGES, THE OLD SIDE'S FACTS ARE SET ASIDE (#477 re-test, case 19).
 *
 * Marcus first told the site he was suing Circuit Doctors for $1,650, then changed his
 * answer: he is being sued, for $3,200. The form went on showing "Amount claimed: $1,650
 * (your answer already given; it is not asked again)" -- his own claim's amount, on the
 * claim against him.
 *
 * An answer to a question about one side of the case (the amount, whether a claim or a
 * defence is filed, what they want, the kind of claim, the outcome they ask for) is an
 * answer about that side. When the side given in the situation answers changes, every
 * such answer is emptied, in every area at once (each area's form, the Small Claims
 * guided answers, the review's answers and its "I don't know yet", the questions skipped
 * one at a time, the case file's own "not sure" record), so each is asked again for the
 * side the person is on now. Everything else they told us (the story, the other party,
 * dates, location) stays.
 *
 * Pure: no React, no network. States no law.
 */
import type { Checkpoint } from "./intakeCheckpoint";
import { factOfAskedText, factsOfQuestion } from "./caseFile/factsOfQuestion";
import { situationOf, sideOf } from "./situation/situation";
import { BASIS_SECTION } from "./storyBasis";

type Sections = Checkpoint["sections"];

/** The facts that belong to one side of the case. */
export const SIDE_FACTS = new Set(["amount", "filed", "defenceFiled", "wants", "claimKind", "outcome", "claimServed"]);

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
/** Whether an answer to this question (or field) is about one side. */
export const aboutOneSide = (id: string) => factsOfQuestion(id).some((fact) => SIDE_FACTS.has(fact));
/** The same kind of value, empty: a form field keeps its type, so the form still draws. */
const emptied = (value: unknown) => (Array.isArray(value) ? [] : typeof value === "string" ? "" : typeof value === "boolean" ? false : typeof value === "number" ? null : value && typeof value === "object" ? {} : null);

/** The side the situation answers give, in these sections. */
export const sideIn = (sections: Sections) => sideOf(situationOf(sections));

/**
 * The sections with the old side's answers emptied, and the (section, key) fields that
 * changed, so the screens holding them can be told. Unchanged when the side did not
 * change from one given side to another.
 */
export function onSideChange(before: Sections, after: Sections): { sections: Sections; changed: [string, string][] } {
  const from = sideIn(before);
  const to = sideIn(after);
  if (!from || !to || from === to) return { sections: after, changed: [] };
  const sections: Sections = { ...after };
  const changed: [string, string][] = [];
  const basis = { ...(object(sections[BASIS_SECTION]) as Record<string, string>) };
  const untag = (key: string) => { delete basis[key]; };

  // Each area's form: its fields about one side, emptied in place.
  for (const [section, field] of [["civil", "input"], ["small-claims", "input"], ["family", null]] as const) {
    const holder = field ? object(sections[section]?.[field]) : object(sections[section]);
    const keys = Object.keys(holder).filter(aboutOneSide);
    if (!keys.length) continue;
    const next = { ...holder, ...Object.fromEntries(keys.map((key) => [key, emptied(holder[key])])) };
    if (field) { sections[section] = { ...sections[section], [field]: next }; changed.push([section, field]); }
    else { sections[section] = next; for (const key of keys) changed.push([section, key]); }
    for (const key of keys) untag(field ? `${section}.${field}.${key}` : `${section}.${key}`);
  }

  // The Small Claims guided answers: the facts, the questions answered, and the earlier answers.
  const guided = object(sections.guided);
  if (Object.keys(guided).length) {
    const facts = object(guided.facts);
    const factKeys = Object.keys(facts).filter(aboutOneSide);
    const answered = Array.isArray(guided.answeredIds) ? (guided.answeredIds as unknown[]).filter((id) => typeof id === "string") as string[] : [];
    const earlier = Array.isArray(guided.earlierAnswers) ? guided.earlierAnswers as unknown[] : [];
    const keptEarlier = earlier.filter((item) => !aboutOneSide(String(object(item).questionId ?? "")));
    const matched = object(guided.matchedClaimType);
    const next: Record<string, unknown> = {
      ...guided,
      facts: Object.fromEntries(Object.entries(facts).filter(([key]) => !factKeys.includes(key))),
      answeredIds: answered.filter((id) => !aboutOneSide(id)),
      earlierAnswers: keptEarlier,
      ...(Object.keys(matched).length ? { matchedClaimType: null } : {}),
    };
    if (JSON.stringify(next) !== JSON.stringify(guided)) {
      sections.guided = next;
      for (const key of ["facts", "answeredIds", "earlierAnswers", "matchedClaimType"]) changed.push(["guided", key]);
      for (const key of factKeys) untag(`guided.facts.${key}`);
      for (const key of ["guided.answeredIds", "guided.earlierAnswers", "guided.matchedClaimType"]) untag(key);
    }
  }

  // The review's answers and its "I don't know yet".
  const builder = object(sections.builder);
  const initial = object(builder.initialAnswers);
  const initialKeys = Object.keys(initial).filter(aboutOneSide);
  const unknowns = Array.isArray(builder.initialUnknowns) ? (builder.initialUnknowns as unknown[]).filter((id) => typeof id === "string") as string[] : [];
  const keptUnknowns = unknowns.filter((id) => !aboutOneSide(id));
  if (initialKeys.length || keptUnknowns.length !== unknowns.length) {
    sections.builder = { ...builder, initialAnswers: Object.fromEntries(Object.entries(initial).filter(([key]) => !initialKeys.includes(key))), initialUnknowns: keptUnknowns };
    changed.push(["builder", "initialAnswers"], ["builder", "initialUnknowns"]);
    for (const key of initialKeys) untag(`builder.initialAnswers.${key}`);
  }

  // Skipped one at a time (civil, Family).
  const chat = object(sections["form-chat"]);
  const skipped = Array.isArray(chat.skipped) ? (chat.skipped as unknown[]).filter((id) => typeof id === "string") as string[] : [];
  if (skipped.some(aboutOneSide)) { sections["form-chat"] = { ...chat, skipped: skipped.filter((id) => !aboutOneSide(id)) }; changed.push(["form-chat", "skipped"]); }

  // The home page's answers to the story reading's questions, by the fact each asks for: the case
  // file reads them (caseFile.ts), so the old side's are set aside too (Charter re-test 27 Oct).
  const home = object(sections.home);
  const homeAnswers = Array.isArray(home.understoodAnswers) ? home.understoodAnswers as unknown[] : [];
  const keptHome = homeAnswers.filter((item) => { const fact = factOfAskedText(String(object(item).question ?? "")); return !(fact && SIDE_FACTS.has(fact)); });
  if (keptHome.length !== homeAnswers.length) { sections.home = { ...home, understoodAnswers: keptHome }; changed.push(["home", "understoodAnswers"]); untag("home.understoodAnswers"); }

  // The case file's own "not sure" record.
  const file = object(sections.caseFile);
  const unsure = object(file.unsure);
  const unsureKeys = Object.keys(unsure).filter((fact) => SIDE_FACTS.has(fact));
  if (unsureKeys.length) { sections.caseFile = { ...file, unsure: Object.fromEntries(Object.entries(unsure).filter(([fact]) => !unsureKeys.includes(fact))) }; changed.push(["caseFile", "unsure"]); }

  sections[BASIS_SECTION] = basis;
  return { sections, changed };
}
