/**
 * THE SMALL CLAIMS CHAT'S FACTS AFTER A TURN: a fact the person holds is never replaced by the model's reading.
 *
 * Each chat turn returns the facts the model read from everything said so far, the story included, and the chat
 * saves them (GuidedSmallClaimsIntake.tsx). The save path records a new value at a place as the person's newest
 * answer when the case file holds another (caseFile.ts followAnswer), so a reading of the story replaced an answer
 * the person gave and was shown as "your answer as you changed it" (Chrome check of #544, step 18: the kind became
 * the suggestion the person had skipped), and refilled an answer they removed.
 *
 * The rule (site owner, 6 Nov: rules 2, 4 and 8): a fact the person holds -- answered, "not sure" or removed, by
 * their own action (a confirmed slot) -- keeps its saved value in the chat's facts, unless this very turn answered
 * it (the question just asked, or a story card the person accepted). A fact the person never answered still takes
 * the model's reading, as before. Checked by test:chat-keeps-held.
 *
 * The chat's own copy is never the answer either (rule 3; owner's read of the read pack, 6 Nov: "chat stale copy").
 * An answer the person changed elsewhere -- the amount on the review while the chat is open -- is what the chat saves
 * and sends on, to the analysis and to the depth questions (factsWithRecord), not the value the chat last held and the
 * model echoed. A removed answer is not sent on. Checked by test:chat-uses-record.
 */
import { sameAnswer, slotsOfQuestion, type CaseFile } from "./caseFile";
import { canonicalJson } from "../canonicalJson";

type Facts = Record<string, unknown>;

/** The chat's facts to save: `after` (the turn's), with each fact the person holds kept as it was in `before`. */
export function turnFactsToSave<T extends Facts>(before: T, after: T, held: CaseFile, answeredNow: readonly string[]): T {
  const own = new Set(answeredNow.flatMap((id) => slotsOfQuestion(id)));
  const out: Facts = { ...after };
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (canonicalJson(before[key]) === canonicalJson(after[key])) continue;
    const facts = slotsOfQuestion(key);
    if (!facts.length || facts.some((fact) => own.has(fact))) continue;
    const personHolds = facts.some((fact) => { const slot = held[fact]; return slot.confirmed && (slot.state !== "not-asked" || slot.removed === true); });
    if (!personHolds) continue;
    if (key in before) out[key] = before[key]; else delete out[key];
  }
  return factsWithRecord(out, held, answeredNow) as T;
}

/**
 * The chat's facts with each answer the person holds taken from the record (caseFileOf), not the chat's copy: an
 * answered fact at the record's value (a number stays a number), a removed one taken out. A fact answered in this very
 * turn (`answeredNow`), a "not sure", a fact held only from the story, a key for more than one fact, and a fact the
 * record holds with no plain value (the kind of claim, a choice) are left as they are.
 */
export function factsWithRecord<T extends Facts>(facts: T, held: CaseFile, answeredNow: readonly string[] = []): T {
  const own = new Set(answeredNow.flatMap((id) => slotsOfQuestion(id)));
  const out: Facts = { ...facts };
  for (const key of Object.keys(facts)) {
    const found = slotsOfQuestion(key);
    if (found.length !== 1 || own.has(found[0])) continue;
    const slot = held[found[0]];
    if (!slot?.confirmed) continue;
    if (slot.removed) { delete out[key]; continue; }
    if (slot.state !== "answered" || slot.value === undefined) continue;
    if (sameAnswer(found[0], slot.value, facts[key])) continue;
    const now = facts[key];
    if (typeof now === "number" && typeof slot.value !== "number") continue;
    if (typeof now === "boolean" && typeof slot.value !== "boolean") continue;
    if (Array.isArray(now) !== Array.isArray(slot.value)) continue;
    out[key] = typeof now === "string" && typeof slot.value === "number" ? String(slot.value) : slot.value;
  }
  return out as T;
}
