/**
 * THE NEW SMALL CLAIMS RESULTS STEP'S CATALOGUE BLOCKS, BY RULES (site owner, 27 Nov 2026; block table rows D, E, L, F,
 * approved with changes). Everything here comes from the case record and the catalogue's own sourced text, with no AI
 * and no wording changes:
 *
 * - D, the deadlines: the KEPT notice and time-limit items (results/deadlineLines.ts) whose condition the record meets,
 *   each distinct deadline once (an item marked `sameAs` another is not drawn again), soonest first by its stated
 *   period. The step's own deadline comes from the stage map's card, beside these.
 * - E, the evidence checklist: OWNS the plaintiff elements, each with its plain explanation, by its condition; an
 *   element that is a kept deadline is drawn in D only.
 * - L, the law for this claim: the defendant considerations and procedural notes ONLY, each by its condition, never an
 *   item drawn in D, never a deadline item that was cut.
 * - F, the sources: every source the blocks above show, each once, with the date it was verified.
 *
 * An item whose condition waits on a fact the record does not hold is hidden (`asks` lists the facts, for the one asker:
 * site owner's choice, "Hide; ask once"). Nothing shows until the kind of claim is confirmed.
 */
import type { CaseFile } from "../caseFile/caseFile";
import { CLAIM_TYPES } from "../intake/claimTypes";
import { confirmedKind, itemKey, type ApplicabilityAnswers, type ApplicabilityFact } from "../applicability/catalogueConditions";
import { itemApplies } from "../applicability/itemApplies";
import { DEADLINE_LINE_ITEMS } from "../applicability/catalogueConditions.generated";
import { DEADLINE_DECISIONS } from "./deadlineLines";
import { SNOW_ICE_OPENING } from "../copy/flowCopy";
import { CASE_STAGES, type StageDeadline } from "../stage-map/stageMap";
import { officialUrl } from "../stage-map/citations";
import { computedDeadlinesFor } from "../../content-library/computedDeadline";
import { periodLine } from "../../content-library/periodWords";
import { caseDatesFrom } from "../deadlines/deadlineEvents";
import { withCaseFileDates } from "../caseFile/caseFile";
import { fullDayIn } from "../casePosition";
import { sentences } from "../sentences";

export type SourcedLine = { key: string; name: string; text: string; sourceUrl: string | null; verifiedAt: string | null };
export type ScResults = {
  claimTypeId: string | null;
  deadlines: (SourcedLine & { days: number })[];
  elements: SourcedLine[];
  considerations: SourcedLine[];
  notes: SourcedLine[];
  sources: { url: string; verifiedAt: string | null }[];
  asks: ApplicabilityFact[];
};

const EMPTY: ScResults = { claimTypeId: null, deadlines: [], elements: [], considerations: [], notes: [], sources: [], asks: [] };

/** The confirmed catalogue kind, or null: a proposal or a "not sure" shows nothing (hidden by default). */
export function confirmedKindOf(record: CaseFile | null | undefined): string | null {
  const id = confirmedKind(record ?? null);
  return id && CLAIM_TYPES.some((type) => type.id === id && type.courtArea === "small-claims") ? id : null;
}

/** The stage map's basic two-year limitation deadline (Small Claims), as one deadlines line. */
export const LIMITATION_KEY = "deadline:basic-limitation";
export function limitationLine(record: CaseFile): (SourcedLine & { days: number }) | null {
  const deadline = CASE_STAGES.flatMap((stage) => stage.deadlines as readonly StageDeadline[]).find((item) => item.id === LIMITATION_KEY);
  if (!deadline) return null;
  const counted = computedDeadlinesFor([deadline], caseDatesFrom(withCaseFileDates({}, record, fullDayIn)), "scResults")[0];
  const words = counted ? `${deadline.what}. ${counted.statement}` : periodLine({ what: deadline.what, count: deadline.length.count, unit: deadline.length.unit, countFrom: deadline.countFrom });
  return { key: LIMITATION_KEY, name: words, text: words, sourceUrl: officialUrl(deadline.rule), verifiedAt: null, days: 730 };
}

export function scResults(record: CaseFile | null | undefined, answers: ApplicabilityAnswers = {}, claimTypeId: string | null = confirmedKindOf(record)): ScResults {
  const type = claimTypeId ? CLAIM_TYPES.find((each) => each.id === claimTypeId && each.courtArea === "small-claims") : null;
  if (!record || !type) return EMPTY;
  const asks = new Set<ApplicabilityFact>();
  const shows = (list: "element" | "consideration" | "note", id: string | number) => {
    const verdict = itemApplies(record, type.id, list, id, answers);
    if (!verdict.shows) verdict.ask.forEach((fact) => asks.add(fact));
    return verdict.shows;
  };
  const deadlineKeys = new Set<string>(DEADLINE_LINE_ITEMS);
  const deadlines: ScResults["deadlines"] = [];
  const lineOf = (key: string, name: string, text: string, sourceUrl?: string, verifiedAt?: string): SourcedLine => ({ key, name, text, sourceUrl: sourceUrl ?? null, verifiedAt: verifiedAt ?? null });
  const route = (key: string, line: SourcedLine): "deadline" | "cut" | "other" => {
    if (!deadlineKeys.has(key)) return "other";
    const decision = DEADLINE_DECISIONS[key];
    if (decision?.keep) { deadlines.push({ ...line, days: decision.days }); return "deadline"; }
    return "cut";
  };
  const elements = type.plaintiffElements.flatMap((element) => {
    const key = itemKey(type.id, "element", element.id);
    if (!shows("element", element.id)) return [];
    const line = lineOf(key, element.name, element.plainExplanation, element.sourceUrl, element.verifiedAt);
    // A cut deadline element is still something to show the court: it stays in the checklist (the cut is from D only).
    return route(key, line) === "deadline" ? [] : [line];
  });
  const considerations = type.defendantConsiderations.flatMap((item) => {
    const key = itemKey(type.id, "consideration", item.id);
    if (!shows("consideration", item.id)) return [];
    const line = lineOf(key, item.name, `${item.plainExplanation} ${item.whenThisComesUp}`.trim(), item.sourceUrl, item.verifiedAt);
    return route(key, line) === "other" ? [line] : [];
  });
  const notes = type.proceduralNotes.flatMap((note, index) => {
    const key = itemKey(type.id, "note", index);
    if (!shows("note", index)) return [];
    const line = lineOf(key, "", note.note, note.sourceUrl, note.verifiedAt);
    return route(key, line) === "other" ? [line] : [];
  });
  // A snow-and-ice notice opens with the owner's words (27 Nov 2026), then the item's own.
  for (const line of deadlines) { const decision = DEADLINE_DECISIONS[line.key]; if (decision?.keep && decision.snowIce) line.name = `${SNOW_ICE_OPENING} ${line.name || line.text}`; }
  // The two-year limitation period, once, for every confirmed kind (site owner, 27 Nov 2026): the stage map's own
  // deadline (Limitations Act, 2002, s. 4), counted by the deadline engine when the record holds the day it runs from,
  // else in the card's own period words (periodWords.ts).
  const limitation = limitationLine(record);
  if (limitation) deadlines.push(limitation);
  const drawn = deadlines.sort((a, b) => a.days - b.days);
  // Each sentence once on the page (acceptance rule (f), story 8 on this step, 28 Nov 2026: every "What the other side may
  // raise" item of a loan claim opens with the same two rule 9.01 / 9.02 sentences). A sentence already shown above is
  // left out of a later item; nothing is reworded. A line left with no text keeps its name.
  const shownSentences = new Set<string>();
  for (const line of [...drawn, ...elements, ...considerations, ...notes]) {
    const kept = sentences(line.text).filter((sentence) => { const key = sentence.replace(/\s+/g, " ").trim().toLowerCase(); if (shownSentences.has(key)) return false; shownSentences.add(key); return true; });
    line.text = kept.join(" ");
  }
  const seen = new Map<string, string | null>();
  for (const line of [...drawn, ...elements, ...considerations, ...notes]) if (line.sourceUrl && !seen.has(line.sourceUrl)) seen.set(line.sourceUrl, line.verifiedAt);
  return { claimTypeId: type.id, deadlines: drawn, elements, considerations, notes, sources: [...seen].map(([url, verifiedAt]) => ({ url, verifiedAt })), asks: [...asks] };
}
