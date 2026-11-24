/**
 * THE QUESTION LOG (site owner, 23 Nov 2026: "For each journey (guest, signed in) output a plain-text QUESTION LOG: every
 * question shown, in order, with the screen, the fact id it asks for, and whether the case record already held that fact
 * at that moment ... A report saying '0 repeats' without the logs is not accepted").
 *
 * From the ask-once recorder's events (harness/askOnce.ts recordAsks): one line per question shown, and three verdicts:
 *   held     a question asked (not offered from the story) while the record held its fact, answered or "not sure";
 *   twice    a fact asked or offered again after it was asked or offered once (a fact is shown once, from any screen);
 *   no-fact  a question that names no fact the record keeps (fail closed, rule 6).
 * It reads only the recorder's events, so it runs on the code before the one asker too (the "before" logs of #561).
 */
import fs from "node:fs";
import path from "node:path";
import { factsOfAsk, namesAFact, restoredAsk, type Asked } from "./askOnce";

/** Surfaces that offer a value read from the story (Yes / No, that's not right / I'm not sure), never ask it cold. */
// The ask-once suite's own list (ask-once-pages.spec.ts OFFER_SURFACES), with the Form 7A story screen.
export const OFFER_SURFACES = new Set(["sc-proposal", "story-proposal-row", "guided-form-from-story", "claim-kind", "parties-offer", "forms-offer", "form7a-found", "sc-form-offer"]);

export type LogResult = { lines: string[]; held: string[]; twice: string[]; noFact: string[] };

export function questionLog(events: readonly Asked[]): LogResult {
  const lines: string[] = [];
  const held: string[] = [];
  const twice: string[] = [];
  const noFact: string[] = [];
  const shownFact = new Map<string, string>();
  let n = 0;
  for (const event of events) {
    if (event.kind !== "ask") continue;
    n += 1;
    const facts = factsOfAsk(event);
    const page = (event as { pageHeld?: Record<string, string> }).pageHeld ?? {};
    const heldThen = facts.map((fact) => `${fact}=${page[fact] ?? event.held?.[fact] ?? "not-read"}`);
    const where = `${event.surface} @ ${event.screen}`;
    const words = (event.text ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
    // The saved Small Claims conversation shown again with the very reply already recorded for that question (askOnce.ts
    // restoredAsk; site owner, 29 Oct): listed, never counted as asked (the recorder's held and twice checks skip it too).
    if (restoredAsk(event, events)) { lines.push(`${n}. [${where}] "${words}" | the saved conversation, shown with its saved reply "${event.reply}": not asked`); continue; }
    lines.push(`${n}. [${where}] "${words}" | fact: ${facts.join(", ")} | held then: ${heldThen.join(", ")}`);
    const offered = OFFER_SURFACES.has(event.surface);
    for (const fact of facts) {
      if (!namesAFact(fact)) noFact.push(`${n}. ${where}: "${words}" names no fact (${fact})`);
      const state = page[fact] ?? event.held?.[fact];
      if (!offered && (state === "answered" || state === "unsure")) held.push(`${n}. ${where}: ${fact} asked while the record held it (${state})`);
      const before = shownFact.get(fact);
      if (before && before !== `${event.surface}|${event.id}`) twice.push(`${n}. ${where}: ${fact} shown again (first: ${before})`);
      if (!before) shownFact.set(fact, `${event.surface}|${event.id}`);
    }
  }
  return { lines, held, twice, noFact };
}

/** Writes the log for one journey to question-logs/<name>.txt and returns its verdicts. */
export function writeQuestionLog(name: string, title: string, events: readonly Asked[]): LogResult {
  const result = questionLog(events);
  const dir = path.resolve(process.env.QUESTION_LOG_DIR ?? "question-logs");
  fs.mkdirSync(dir, { recursive: true });
  const body = [
    `QUESTION LOG: ${title}`,
    `Code: ${process.env.QUESTION_LOG_CODE ?? process.env.GITHUB_SHA ?? "local"}`,
    `Questions shown: ${result.lines.length}. Asked while held: ${result.held.length}. Shown twice: ${result.twice.length}. No fact id: ${result.noFact.length}.`,
    "",
    ...result.lines,
    "",
    "ASKED WHILE HELD:", ...(result.held.length ? result.held : ["(none)"]),
    "SHOWN TWICE:", ...(result.twice.length ? result.twice : ["(none)"]),
    "NO FACT ID:", ...(result.noFact.length ? result.noFact : ["(none)"]),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(dir, `${name}.txt`), body);
  return result;
}
