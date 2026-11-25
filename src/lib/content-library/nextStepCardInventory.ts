/**
 * The next-step card's words, as review-inventory items (contentInventory,
 * type "next-step-card"). Added 2026-10-29: the card (NextStepPractical.tsx,
 * fed by nextStepPractical.ts) shows forms, fees with amounts, filing and
 * service lines and quoted rules on every step, and none of it was in the
 * review inventory, so none of it could be queued for the site owner's
 * one-item-at-a-time review.
 *
 * THIS LISTS, IT DOES NOT CHANGE. Every text is produced by the same
 * `practicalFor` the card calls, and shaped the way the card renders it:
 * a form as "Form N — official title", a fee as "label: $amount", a rule as
 * its quote in curly quotes, every other line as its `say`.
 *
 * WHAT IS RENDERED. Each step is rendered as the card would be with no city,
 * no story and no dates, once for each side (responding false and true). With
 * no city both portal lines show; with no story every notice and service line
 * shows. Lines the card shows only for certain words, places or sides are
 * then found by walking everything nextStepPractical.ts exports and indexed
 * once each as "conditional". Lines built from a date or the person's own
 * words are not text a reviewer can approve once; they are listed, with the
 * reason, in NEXT_STEP_CARD_EXCLUDED (and in test:inventory-coverage's
 * UNINDEXED).
 *
 * IDS. `next-step:<stepId>:<kind>:<key>`. The key comes from the data, never
 * from where a line sits on the card: a fee's id, a form's court and number,
 * a rule's source and pinpoint, and for a plain line the name it is exported
 * under (e.g. `FILING.civil.toronto`, `SERVICE.civil.ordinary.1`). A line
 * with no exported name falls back to its source and pinpoint.
 *
 * VERSION. SHA-256 of the text (first 48 bits). The inventory's own
 * `versionOf` is a 32-bit string hash; changing it would void nothing today
 * (no approvals exist) but is left for a separate change.
 */

import * as NEXT_STEP_PRACTICAL from "./nextStepPractical";
import {
  CARD_TEXT,
  FEES,
  FEES_IF_CLAIMED_LABEL,
  STEP_PRACTICAL,
  practicalFor,
  type Fee,
  type PlainLine,
  type PracticalCourt,
  type PracticalView,
} from "./nextStepPractical";
import { officialFormFor } from "./forms/officialFormLink";
import { OFFICIAL_URLS, type RuleCitation } from "../case-system/stage-map/citations";
import type { ContentItem } from "./licenseeReview";
import { sha256Version } from "./sha256";

export type NextStepCardKind =
  | "form"
  | "form-note"
  | "form-if-claimed"
  | "fee"
  | "fee-note"
  | "fee-waiver"
  | "fee-if-claimed"
  | "filing"
  | "filing-place"
  | "service"
  | "notice-how"
  | "rule"
  | "after-notice"
  | "garnishee"
  | "text"
  | "line";

/**
 * Every field of the card's view, and the item kinds its words are indexed
 * as, or why it carries no words of its own. test:inventory-coverage fails
 * when practicalFor returns a field this does not name, so a new kind of line
 * on the card cannot go unindexed.
 */
export const NEXT_STEP_CARD_FIELDS: Record<keyof PracticalView, NextStepCardKind[] | { noText: string }> = {
  forms: ["form", "form-note"],
  formsIfClaimed: ["form-if-claimed"],
  fees: ["fee"],
  feeNotes: ["fee-note"],
  feeNotesFirst: { noText: "Only the order of the fee notes and the fees." },
  feeWaiver: ["fee-waiver"],
  feesIfClaimed: ["fee-if-claimed"],
  filing: ["filing"],
  courtOffices: ["filing-place"],
  serving: ["service"],
  also: ["rule"],
  noticeHow: ["notice-how"],
  afterNotice: ["after-notice"],
  leadForms: { noText: "Orders the case's forms page; its forms are the step's own, indexed as \"form\"." },
  garnishee: ["garnishee"],
};

/** Card lines built from a date or the person's words: not one fixed text a reviewer can approve. */
export const NEXT_STEP_CARD_EXCLUDED: Array<{ what: string; where: string; reason: string }> = [
  {
    what: "the too-close-to-file-online line (four wordings)",
    where: "nextStepPractical.ts tooCloseFilingLine",
    reason: "Shown only when the counted deadline is three business days away or less; each wording opens with the person's own date ({when}), so no fixed text exists to approve. Its rule quote is the card's ordinary filing source.",
  },
  {
    what: "the mail timing sentences (two wordings)",
    where: "nextStepPractical.ts mailTimingLines",
    reason: "Built from today's date and the person's serving deadline (the mailing day and the day service counts). The courier line and the sooner ways it shows beside them are fixed and are indexed.",
  },
  {
    what: "the person's own sentence about the employer",
    where: "NextStepPractical.tsx garnishee, \"You wrote: …\"",
    reason: "Quotes the person's own words back to them; it is not our content. The rule lines and the sentence after it are indexed.",
  },
  {
    what: "the court offices in the person's city",
    where: "NextStepPractical.tsx courtOffices.offices",
    reason: "Names, addresses and emails per city, read from courts/courtLocations.json (the courts' own location pages); the intro names the person's city. The place lines and the fixed source sentence are indexed.",
  },
  {
    what: "headings, PDF/Word links and the source line under each item",
    where: "NextStepPractical.tsx",
    reason: "Headings are fixed labels (\"What it costs\"); the source name, pinpoint, checked date and quote under each line are carried on that line's own item (sourceUrl, pinpoint, quote).",
  },
];

/** The fixed sentences of the card itself, not tied to a step. */
const CARD_SENTENCES: Record<string, string> = { ...CARD_TEXT, feesIfClaimed: FEES_IF_CLAIMED_LABEL };

const AGGREGATES = new Set(["MORE_CARD_LINES"]);

function isPlainLine(value: unknown): value is PlainLine {
  const o = value as PlainLine | null;
  return Boolean(o && typeof o === "object" && typeof o.say === "string" && o.cite && typeof o.cite.quote === "string");
}

function isFee(value: unknown): value is Fee {
  const o = value as Fee | null;
  return Boolean(o && typeof o === "object" && typeof o.amount === "number" && typeof o.label === "string" && o.cite);
}

/**
 * Every plain line nextStepPractical.ts exports, by object, with the name it
 * is exported under. A line reachable by several names takes the one not
 * through an aggregate list, then the shortest, then the first in order.
 */
export function exportedCardLines(): Map<PlainLine, string> {
  const best = new Map<PlainLine, string>();
  const rank = (path: string) => [AGGREGATES.has(path.split(".")[0]) ? 1 : 0, path.split(".").length, path] as const;
  const better = (a: string, b: string) => {
    const [ra, rb] = [rank(a), rank(b)];
    return ra[0] !== rb[0] ? ra[0] < rb[0] : ra[1] !== rb[1] ? ra[1] < rb[1] : ra[2] < rb[2];
  };
  const walk = (value: unknown, path: string, ancestors: Set<unknown>) => {
    if (!value || typeof value !== "object" || value instanceof RegExp || value instanceof Set || value instanceof Map || ancestors.has(value)) return;
    if (isPlainLine(value)) {
      const known = best.get(value);
      if (!known || better(path, known)) best.set(value, path);
      return;
    }
    const next = new Set(ancestors).add(value);
    if (Array.isArray(value)) value.forEach((entry, index) => walk(entry, `${path}.${index}`, next));
    else for (const [key, entry] of Object.entries(value)) walk(entry, `${path}.${key}`, next);
  };
  for (const [name, value] of Object.entries(NEXT_STEP_PRACTICAL)) walk(value, name, new Set());
  return best;
}

function courtOf(stepId: string): PracticalCourt {
  return stepId.startsWith("civil:") ? "civil" : stepId.startsWith("family:") ? "family" : "small-claims";
}

export function formText(court: string, number: string): string {
  const official = officialFormFor(court, number);
  return `Form ${number}${official ? ` — ${official.title}` : ""}`;
}

export function feeText(fee: Fee): string {
  return `${fee.label}: $${fee.amount}`;
}

export function ruleText(rule: RuleCitation): string {
  return `“${rule.quote}”`;
}

const KIND_LABEL: Record<NextStepCardKind, string> = {
  form: "The form",
  "form-note": "The form, the condition beside it",
  "form-if-claimed": "The form, only if the case has that kind of claim",
  fee: "What it costs",
  "fee-note": "What it costs, a note",
  "fee-waiver": "What it costs, the fee waiver",
  "fee-if-claimed": "What it costs, only if claimed",
  filing: "Where and how to file",
  "filing-place": "Where and how to file, where the case is",
  service: "Serving it on the other side",
  "notice-how": "How to give the notice",
  rule: "The rule for this step",
  "after-notice": "Then, starting the court case",
  garnishee: "Naming the employer",
  text: "The card's own sentence",
  line: "A line shown only for some cases",
};

/** Every line the next-step card can show, one item per line per step. */
export function collectNextStepCardItems(): ContentItem[] {
  const names = exportedCardLines();
  const feeByCite = new Map<RuleCitation, Fee>(Object.values(FEES).map((fee) => [fee.cite, fee]));
  const items = new Map<string, ContentItem>();
  const shownLines = new Set<PlainLine>();
  const shownFees = new Set<string>();

  const add = (args: { stepId: string; pathway: string; kind: NextStepCardKind; key: string; text: string; cite?: RuleCitation; sourceUrl?: string; where?: string }) => {
    let id = `next-step:${args.stepId}:${args.kind}:${args.key}`;
    const existing = items.get(id);
    if (existing && existing.text === args.text) return;
    // Two different lines with one fallback key (same source and pinpoint): told apart by their own words.
    if (existing) id = `${id}#${sha256Version(args.text).toString(16).slice(0, 8)}`;
    items.set(id, {
      id,
      type: "next-step-card",
      pathway: args.pathway,
      stage: args.stepId,
      text: args.text,
      sourceUrl: args.sourceUrl ?? (args.cite ? OFFICIAL_URLS[args.cite.sourceId] ?? "" : ""),
      ...(args.cite ? { pinpoint: args.cite.pinpoint, quote: args.cite.quote } : {}),
      appearsIn: args.where ?? `Next-step card, "${KIND_LABEL[args.kind]}", for the step ${args.stepId}`,
      version: sha256Version(args.text),
    });
  };

  const lineKey = (line: PlainLine) => {
    const name = names.get(line);
    if (name) return name;
    const fee = feeByCite.get(line.cite);
    if (fee) return `fee.${fee.id}`;
    return `${line.cite.sourceId}@${line.cite.pinpoint}`;
  };

  for (const stepId of Object.keys(STEP_PRACTICAL)) {
    const court = courtOf(stepId);
    for (const responding of [false, true]) {
      const view = practicalFor(stepId, court, "", responding);
      if (!view) continue;
      const lines = (kind: NextStepCardKind, list: readonly PlainLine[]) => {
        for (const line of list) {
          shownLines.add(line);
          add({ stepId, pathway: court, kind, key: lineKey(line), text: line.say, cite: line.cite });
        }
      };
      const fees = (kind: NextStepCardKind, list: readonly Fee[]) => {
        for (const fee of list) {
          shownFees.add(fee.id);
          add({ stepId, pathway: court, kind, key: fee.id, text: feeText(fee), cite: fee.cite });
        }
      };
      for (const form of view.forms) {
        const official = officialFormFor(form.court, form.number);
        add({ stepId, pathway: court, kind: "form", key: `${form.court}-${form.number}`, text: formText(form.court, form.number), sourceUrl: official?.pdf ?? official?.docx ?? "" });
        if (form.note) lines("form-note", [form.note]);
      }
      for (const form of view.formsIfClaimed) {
        const official = officialFormFor(form.court, form.number);
        add({ stepId, pathway: court, kind: "form-if-claimed", key: `${form.court}-${form.number}`, text: formText(form.court, form.number), sourceUrl: official?.pdf ?? official?.docx ?? "" });
        lines("form-if-claimed", [form.when]);
      }
      fees("fee", view.fees);
      lines("fee-note", view.feeNotes);
      if (view.feeWaiver) lines("fee-waiver", [view.feeWaiver]);
      if (view.feesIfClaimed) {
        fees("fee-if-claimed", view.feesIfClaimed.fees);
        lines("fee-if-claimed", [...view.feesIfClaimed.notes, ...(view.feesIfClaimed.waiver ? [view.feesIfClaimed.waiver] : [])]);
      }
      lines("filing", view.filing);
      lines("filing-place", view.courtOffices?.place ?? []);
      lines("garnishee", view.garnishee?.lines ?? []);
      lines("service", view.serving);
      lines("notice-how", view.noticeHow);
      for (const rule of view.also) add({ stepId, pathway: court, kind: "rule", key: `${rule.sourceId}@${rule.pinpoint}`, text: ruleText(rule), cite: rule });
      lines("after-notice", view.afterNotice);
    }
  }

  // Lines the card shows only for some words, places, sides or claims: once each.
  const conditionalWhere = "Next-step card (or the step panel beside it), shown only when the person's words, city, side or claims call for it";
  for (const [line, name] of names) {
    if (shownLines.has(line)) continue;
    add({ stepId: "conditional", pathway: pathwayOfName(name), kind: "line", key: name, text: line.say, cite: line.cite, where: conditionalWhere });
  }
  for (const fee of Object.values(FEES)) {
    if (shownFees.has(fee.id)) continue;
    add({ stepId: "conditional", pathway: fee.court, kind: "fee", key: fee.id, text: feeText(fee), cite: fee.cite, where: conditionalWhere });
  }

  for (const [key, text] of Object.entries(CARD_SENTENCES)) {
    add({ stepId: "card", pathway: "all", kind: "text", key, text, where: "Next-step card, a fixed sentence of the card itself" });
  }

  return [...items.values()];
}

function pathwayOfName(name: string): string {
  const match = /(?:^|\.)(small-claims|civil|family)(?:\.|$)/.exec(name) ?? /^(FAMILY|SC|CIV)_/.exec(name);
  if (!match) return "all";
  return ({ FAMILY: "family", SC: "small-claims", CIV: "civil" } as Record<string, string>)[match[1]] ?? match[1];
}
