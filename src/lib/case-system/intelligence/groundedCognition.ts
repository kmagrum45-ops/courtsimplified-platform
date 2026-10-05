/**
 * Grounded analysis: the model writes from verified sources, and code checks
 * every legal statement before a user sees it.
 *
 * WHY (2026-09-29). The analysis prompt asked the model for lawyer-grade
 * reasoning -- risks, next steps, what a claim requires -- from its own general
 * knowledge. It was given none of the verified material this codebase already
 * holds, attached no citations, and nothing checked its sentences. It could
 * sound right and be wrong about Ontario law with nothing to catch it. The
 * verified pieces (the claim-type catalogue, the stage map's verbatim rule
 * quotes, its deadlines) had been built separately and never connected to it.
 *
 * THREE PARTS:
 *
 *   buildSourcePack   -- per case, the verified items that apply: the confirmed
 *                        claim type's elements, evidence categories, defendant
 *                        considerations and procedural notes (each with its
 *                        official sourceUrl), and the rules and deadlines of the
 *                        stage-map positions that match the case's stage and
 *                        side (each quoted verbatim from vendored legislation).
 *                        Every item has a stable id.
 *   sourcePackForPrompt -- the pack as the model sees it.
 *   verifyGroundedCognition -- the gate. A legal statement survives only if it
 *                        cites ids that exist in THIS pack AND quotes wording
 *                        that actually appears in one of those items. Anything
 *                        presented as a plain fact is checked for legal content
 *                        (rules, deadlines, "must file" ...) and dropped if it
 *                        has any. Failures are replaced by the verified wording
 *                        where one exists, dropped where not, and recorded in
 *                        the report so what the model tried to say is visible.
 *
 * A prompt is a request, not a safeguard (ACCURACY_ENGINE.md, chat item 6).
 * The gate is the safeguard: a citation the model invents cannot pass it,
 * because the id is not in the pack, and a real id attached to a claim the
 * source does not make fails the quote check.
 *
 * Asserted by `npm run test:grounded-analysis`.
 */

import { CLAIM_TYPES, DEFENCE_CONCEPTS, type ClaimType } from "../intake/claimTypes";
import { CIVIL_CLAIM_TYPES } from "../intake/civilClaimTypes";
import { FAMILY_MATTER_TYPES } from "../intake/familyMatterTypes";
import { renderableProfiles } from "../claim-types/catalogue";
import { CASE_STAGES, type CaseStage } from "../stage-map/stageMap";
import { officialUrl, sourceName, type RuleCitation } from "../stage-map/citations";

export type SourceItem = {
  id: string;
  /** Short label shown with the citation. */
  label: string;
  /** The verified wording. Quotes are checked against this. */
  text: string;
  sourceUrl: string;
  /** e.g. "O. Reg. 258/98, r. 9.01" when the item is a rule. */
  citation?: string;
};

export type SourcePack = {
  items: SourceItem[];
  byId: Map<string, SourceItem>;
  /** Catalogue element ids for the confirmed claim type, in order. */
  elementIds: string[];
};

type UniversalStageLike = string;

/**
 * Stage-map positions for a coarse stage and side. Deliberately a small,
 * explicit table: the pack should hold the rules for where this person
 * actually is, not all 37 positions.
 */
const STAGE_POSITIONS: Record<string, { plaintiff: string[]; defendant: string[] }> = {
  "starting-case": {
    plaintiff: [
      "before-filing:deciding-whether-to-sue",
      "before-filing:limitation-period-may-have-passed",
      "plaintiff:claim-drafted-not-filed",
    ],
    defendant: [],
  },
  "already-started": {
    plaintiff: [
      "plaintiff:claim-issued-not-served",
      "plaintiff:served-awaiting-defence",
      "plaintiff:defence-period-expired-no-defence",
    ],
    defendant: ["defendant:served-defence-period-running"],
  },
  responding: {
    plaintiff: [],
    defendant: [
      "defendant:served-defence-period-running",
      "defendant:defence-period-expired-not-yet-noted",
    ],
  },
  conference: {
    plaintiff: ["plaintiff:defence-filed", "plaintiff:awaiting-settlement-conference"],
    defendant: ["defendant:defence-filed", "defendant:awaiting-settlement-conference"],
  },
  trial: {
    plaintiff: ["plaintiff:trial-date-set"],
    defendant: ["defendant:trial-date-set"],
  },
  enforcement: {
    plaintiff: ["plaintiff:judgment-in-my-favour-unpaid"],
    defendant: ["defendant:judgment-against-me"],
  },
};

function ruleItem(prefix: string, rule: RuleCitation, label: string): SourceItem {
  const citation = `${sourceName(rule)}, ${rule.pinpoint}`;
  return {
    id: `${prefix}:${rule.sourceId}:${rule.pinpoint}`,
    label: `${label} (${citation})`,
    text: rule.quote,
    sourceUrl: officialUrl(rule),
    citation,
  };
}

function stageItems(stage: CaseStage): SourceItem[] {
  const items: SourceItem[] = [];
  for (const rule of stage.rules) items.push(ruleItem(`rule:${stage.id}`, rule, stage.title));
  for (const deadline of stage.deadlines) {
    const citation = `${sourceName(deadline.rule)}, ${deadline.rule.pinpoint}`;
    items.push({
      id: `deadline:${deadline.id}`,
      label: `${deadline.what} (${citation})`,
      text: `${deadline.what}. ${deadline.rule.quote}`,
      sourceUrl: officialUrl(deadline.rule),
      citation,
    });
  }
  return items;
}

/** Every library the pack can draw on: Small Claims, civil, family. */
const ALL_LIBRARY_TYPES: readonly ClaimType[] = [...CLAIM_TYPES, ...CIVIL_CLAIM_TYPES, ...FAMILY_MATTER_TYPES];

export function libraryTypeById(id: string | undefined): ClaimType | undefined {
  return id ? ALL_LIBRARY_TYPES.find((item) => item.id === id) : undefined;
}

function libraryItems(claimType: ClaimType): SourceItem[] {
  const items: SourceItem[] = [];
  for (const element of claimType.plaintiffElements) {
    items.push({
      id: `element:${element.id}`,
      label: element.name,
      text: `${element.name}. ${element.plainExplanation}`,
      sourceUrl: element.sourceUrl,
    });
  }
  for (const consideration of claimType.defendantConsiderations) {
    items.push({
      id: `consideration:${consideration.id}`,
      label: consideration.name,
      text: `${consideration.name}. ${consideration.plainExplanation} ${consideration.whenThisComesUp}`,
      sourceUrl: consideration.sourceUrl,
    });
  }
  claimType.proceduralNotes.forEach((note, index) => {
    items.push({ id: `procedure:${claimType.id}:${index}`, label: "Procedure", text: note.note, sourceUrl: note.sourceUrl });
  });
  return items;
}

export function buildSourcePack(args: {
  stage: UniversalStageLike;
  side: "plaintiff" | "defendant";
  claimTypeId?: string;
  /**
   * Which court's procedure applies. The stage map's rules are the Small
   * Claims Rules, so they join the pack only on the Small Claims path; until
   * 2026-09-30 a civil or family case was handed Small Claims procedure.
   * Defaults to small-claims, the path every caller used before.
   */
  courtPath?: "small-claims" | "civil" | "family";
  /**
   * Further library entries that may apply -- the civil issues or family
   * matters a user picked. Their elements, considerations and notes are added
   * as citable material; element restoration still keys on claimTypeId only.
   */
  extraClaimTypeIds?: string[];
}): SourcePack {
  const items: SourceItem[] = [];
  const courtPath = args.courtPath ?? "small-claims";
  const claimType = libraryTypeById(args.claimTypeId);
  for (const extraId of args.extraClaimTypeIds ?? []) {
    const extra = libraryTypeById(extraId);
    if (!extra || extra.id === claimType?.id) continue;
    items.push(...libraryItems(extra));
    for (const conceptId of extra.applicableDefenceConceptIds) {
      const concept = DEFENCE_CONCEPTS.find((item) => item.id === conceptId);
      if (concept) {
        items.push({ id: `defence:${concept.id}`, label: concept.name, text: `${concept.name}. ${concept.plainExplanation}`, sourceUrl: concept.sourceUrl });
      }
    }
  }

  if (claimType) {
    for (const element of claimType.plaintiffElements) {
      items.push({
        id: `element:${element.id}`,
        label: element.name,
        text: `${element.name}. ${element.plainExplanation}`,
        sourceUrl: element.sourceUrl,
      });
      element.evidenceCategories.forEach((category, index) => {
        items.push({
          id: `evidence:${element.id}:${index}`,
          label: category.name,
          text: `${category.name}. ${category.why} Examples: ${category.examples.join(", ")}.`,
          sourceUrl: element.sourceUrl,
        });
      });
    }
    for (const consideration of claimType.defendantConsiderations) {
      items.push({
        id: `consideration:${consideration.id}`,
        label: consideration.name,
        text: `${consideration.name}. ${consideration.plainExplanation} ${consideration.whenThisComesUp}`,
        sourceUrl: consideration.sourceUrl,
      });
    }
    claimType.proceduralNotes.forEach((note, index) => {
      items.push({
        id: `procedure:${claimType.id}:${index}`,
        label: "Procedure",
        text: note.note,
        sourceUrl: note.sourceUrl,
      });
    });
  }

  if (claimType) {
    // Defences the catalogue lists for this kind of claim. Each is sourced and
    // verified (docs/sources/catalogue-verification.json), and a defendant --
    // or a plaintiff reading what may be raised -- needs them in the pack.
    for (const conceptId of claimType.applicableDefenceConceptIds) {
      const concept = DEFENCE_CONCEPTS.find((item) => item.id === conceptId);
      if (!concept) continue;
      items.push({
        id: `defence:${concept.id}`,
        label: concept.name,
        text: `${concept.name}. ${concept.plainExplanation}`,
        sourceUrl: concept.sourceUrl,
      });
    }
  }

  // Authored claim-type profiles (claim-types/) that extend this claim type:
  // the notice deadlines that can bar a claim before it is filed (a municipal
  // sidewalk, snow and ice, a newspaper), and the limitation rule. These are
  // the rules a person most needs and least expects, and before 2026-09-30 the
  // analysis never saw them. Offered as material that MAY apply -- the model
  // must still cite them, and nothing here says they apply to this user.
  if (args.claimTypeId) {
    for (const profile of renderableProfiles()) {
      const related =
        profile.id === args.claimTypeId ||
        profile.existingClaimTypeId === args.claimTypeId ||
        (profile.alsoRelevantTo ?? []).includes(args.claimTypeId);
      if (!related) continue;
      for (const notice of profile.notices ?? []) {
        const stage = (CASE_STAGES as readonly CaseStage[]).find((item) => item.id === notice.stageId);
        if (stage) items.push(...stageItems(stage));
        items.push(ruleItem(`notice:${profile.id}`, notice.because, `${profile.name}: notice before suing`));
      }
      if (profile.limitationNote) {
        items.push(ruleItem(`limitation:${profile.id}`, profile.limitationNote.because, `${profile.name}: time limit`));
      }
    }
  }

  const positionIds = courtPath === "small-claims" ? STAGE_POSITIONS[args.stage]?.[args.side] || [] : [];
  for (const id of positionIds) {
    const stage = (CASE_STAGES as readonly CaseStage[]).find((item) => item.id === id);
    if (stage) items.push(...stageItems(stage));
  }

  // Ids must be unique; a rule shared by two positions is one item.
  const byId = new Map<string, SourceItem>();
  for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item);

  return {
    items: [...byId.values()],
    byId,
    elementIds: claimType ? claimType.plaintiffElements.map((element) => element.id) : [],
  };
}

/**
 * Adds passages found by meaning-based retrieval (retrieval/storyRetrieval.ts)
 * to the pack. They become citable exactly like catalogue items -- the gate
 * checks a quote against their verbatim text the same way -- and an id
 * already in the pack is never replaced.
 */
export function withRetrievedItems(pack: SourcePack, retrieved: readonly SourceItem[]): SourcePack {
  const byId = new Map(pack.byId);
  const items = [...pack.items];
  for (const item of retrieved) {
    if (byId.has(item.id)) continue;
    byId.set(item.id, item);
    items.push(item);
  }
  return { items, byId, elementIds: pack.elementIds };
}

/**
 * Every source the model cited where the citation passes the gate's check:
 * the id is in the pack AND the quote appears in that source's text. Walks
 * the whole response, so it does not depend on which fields carry citations.
 * Used to show the person the law their analysis actually rests on.
 */
export function verifiedSourceIds(model: unknown, pack: SourcePack): Set<string> {
  const found = new Set<string>();
  const walk = (value: unknown, depth: number) => {
    if (depth > 8 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.sourceIds)) {
      const result = checkCitation(record as GroundedItem, pack);
      if ("source" in result) found.add(result.source.id);
    }
    for (const entry of Object.values(record)) walk(entry, depth + 1);
  };
  walk(model, 0);
  return found;
}

/** True for a passage retrieval found in the corpus. */
export function isRetrievedItem(item: SourceItem): boolean {
  return item.id.startsWith("corpus:");
}

export function sourcePackForPrompt(pack: SourcePack): string {
  if (pack.items.length === 0) {
    return "VERIFIED SOURCES: none apply to this case yet. You therefore may not state ANY law, rule, deadline, form, or legal requirement. Organize the user's facts and ask for what is missing.";
  }
  const lines = pack.items.map((item) => `[${item.id}] ${item.label}\n    ${item.text}`);
  const retrieved = pack.items.some(isRetrievedItem)
    ? "\n\nSources whose id starts with \"corpus:\" were found by searching Ontario law and official guidance for this person's situation. A search can return a passage that is near the situation but does not govern it: rely on one only where its own words cover these facts, and never stretch it beyond what it says. A provision that sets a condition, exception or time limit must be stated with it."
    : "";
  return `VERIFIED SOURCES for this case. These are the ONLY legal authority you may rely on.${retrieved}\n\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------- the gate

/**
 * Words that make a sentence a statement about law or procedure. A sentence
 * presented as a plain fact that contains any of them is not a plain fact.
 * Deliberately broad: a wrongly dropped sentence costs a little usefulness; a
 * wrongly kept one can send a self-represented person to the wrong office or
 * past a deadline.
 */
const LEGAL_SIGNAL =
  /\b(rules?|r\.\s*\d|s\.\s*\d|sections?|subsection|regulations?|statutes?|acts?|form\s*\d+[a-z]?|must|shall|required|requires|deadlines?|within \d+|\d+\s*days?|limitation|entitled|liable|liability|negligen\w*|duty of care|court (will|would|can|could|may|must)|judges?|judgment|default|file|filed|filing|serve|served|service|leave of|immunity|jurisdiction|damages|remed(y|ies)|lawful|unlawful|illegal|legally|breach)\b/i;

export function hasLegalContent(text: string): boolean {
  return LEGAL_SIGNAL.test(text);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type GroundedItem = { sourceIds?: unknown; quote?: unknown; kind?: unknown };

export type DroppedStatement = { field: string; text: string; reason: string };

export type GroundingReport = {
  kept: number;
  replaced: number;
  dropped: DroppedStatement[];
};

/** The item's valid source, or a reason it has none. */
export function checkCitation(
  item: GroundedItem,
  pack: SourcePack,
): { source: SourceItem } | { reason: string } {
  const ids = Array.isArray(item.sourceIds) ? item.sourceIds.filter((id): id is string => typeof id === "string") : [];
  if (ids.length === 0) return { reason: "no source cited" };
  const known = ids.map((id) => pack.byId.get(id)).filter((source): source is SourceItem => Boolean(source));
  if (known.length === 0) return { reason: `cited source not in the verified pack (${ids.join(", ")})` };
  const quote = typeof item.quote === "string" ? normalize(item.quote) : "";
  if (quote.length < 15) return { reason: "no quote from the cited source" };
  const match = known.find((source) => normalize(source.text).includes(quote));
  if (!match) return { reason: "quote does not appear in the cited source" };
  return { source: match };
}

type AnyRecord = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Applies the gate to the model's analysis. Returns the analysis with only
 * verified legal statements (each carrying its sourceUrl) and plain facts that
 * contain no legal content, plus a report of everything removed.
 *
 * Works on the untyped model object so it stays independent of the brain's
 * internal types; the brain passes its GptCognitionOutput through.
 */
export function verifyGroundedCognition<T extends AnyRecord>(
  model: T,
  pack: SourcePack,
): { cognition: T; report: GroundingReport } {
  const report: GroundingReport = { kept: 0, replaced: 0, dropped: [] };
  const drop = (field: string, text: string, reason: string) => {
    report.dropped.push({ field, text: text.slice(0, 300), reason });
  };

  /** A legal statement: needs a verified citation. */
  const legal = (field: string, item: AnyRecord, text: string) => {
    const result = checkCitation(item as GroundedItem, pack);
    if ("source" in result) {
      report.kept += 1;
      return result.source;
    }
    drop(field, text, result.reason);
    return null;
  };

  /** A plain fact: allowed only with no legal content in it. */
  const factOk = (field: string, text: string) => {
    if (!text) return false;
    if (hasLegalContent(text)) {
      drop(field, text, "presented as a fact but states law or procedure");
      return false;
    }
    report.kept += 1;
    return true;
  };

  const out: AnyRecord = { ...model };

  // Claim classifications: explanation and elements.
  out.claimClassifications = (Array.isArray(model.claimClassifications) ? model.claimClassifications : []).map(
    (claim: AnyRecord) => {
      const explanation = str(claim.explanation);
      const elements = (Array.isArray(claim.elements) ? claim.elements : []).flatMap((element: AnyRecord) => {
        const key = str(element.elementKey);
        const catalogue = pack.byId.get(`element:${key}`);
        const text = str(element.explanation);
        const missingFacts = (Array.isArray(element.missingFacts) ? element.missingFacts : [])
          .map(str)
          .filter((fact: string) => factOk("element.missingFacts", fact));
        if (catalogue) {
          // A catalogue element: the name and law come from the catalogue; the
          // model's explanation may only relate the user's facts to it.
          const keepText = text && factOk("element.explanation", text);
          if (!keepText) report.replaced += 1;
          return [
            {
              ...element,
              label: catalogue.label,
              explanation: keepText ? text : catalogue.text,
              missingFacts,
              risks: [],
              sourceUrl: catalogue.sourceUrl,
            },
          ];
        }
        const source = legal("element", element, `${str(element.label)}: ${text}`);
        return source
          ? [{ ...element, missingFacts, risks: [], sourceUrl: source.sourceUrl }]
          : [];
      });
      // Where the user confirmed a claim type, any catalogue element the model
      // left out is restored, so the verified list is always complete.
      const present = new Set(elements.map((element: AnyRecord) => str(element.elementKey)));
      const restored = pack.elementIds
        .filter((id) => !present.has(id))
        .map((id) => {
          const catalogue = pack.byId.get(`element:${id}`)!;
          report.replaced += 1;
          return {
            elementKey: id,
            label: catalogue.label,
            status: "not-documented",
            explanation: catalogue.text,
            missingFacts: [],
            risks: [],
            sourceUrl: catalogue.sourceUrl,
          };
        });
      const keepExplanation = explanation && (factOk("claim.explanation", explanation) || false);
      return {
        ...claim,
        explanation: keepExplanation ? explanation : "",
        elements: [...elements, ...restored],
      };
    },
  );

  // Rejected types carry only the choice.
  out.rejectedFalsePositives = (Array.isArray(model.rejectedFalsePositives) ? model.rejectedFalsePositives : []).map(
    (claim: AnyRecord) => ({
      claimType: claim.claimType,
      status: claim.status,
      confidence: claim.confidence,
      explanation: "Considered and not matched to this case.",
    }),
  );

  // Follow-up questions ask for facts; they may stay. The REASON is a
  // statement and must be sourced or be free of legal content.
  out.missingInformation = (Array.isArray(model.missingInformation) ? model.missingInformation : []).flatMap(
    (item: AnyRecord) => {
      const question = str(item.question);
      if (!question) return [];
      const reason = str(item.reason);
      const source = hasLegalContent(reason) ? legal("missing.reason", item, reason) : null;
      const reasonOk = source || (reason && factOk("missing.reason", reason));
      if (!reasonOk) report.replaced += 1;
      return [
        {
          ...item,
          question,
          reason: reasonOk ? reason : "Recording this lets the case file show what supports each part of the claim.",
          ...(source ? { sourceUrl: source.sourceUrl } : {}),
        },
      ];
    },
  );

  // Evidence links: what a thing proves is a legal statement.
  out.evidenceIssueLinks = (Array.isArray(model.evidenceIssueLinks) ? model.evidenceIssueLinks : []).map(
    (link: AnyRecord) => {
      const requiredProof = str(link.requiredProof);
      const source = legal("link.requiredProof", link, requiredProof);
      if (!source) report.replaced += 1;
      const explanation = str(link.explanation);
      return {
        ...link,
        requiredProof: source ? requiredProof : "Compare it with the parts of the claim listed with the claim.",
        missingEvidence: (Array.isArray(link.missingEvidence) ? link.missingEvidence : [])
          .map(str)
          .filter((fact: string) => factOk("link.missingEvidence", fact)),
        explanation: explanation && factOk("link.explanation", explanation) ? explanation : "Evidence you recorded in the intake.",
        ...(source ? { sourceUrl: source.sourceUrl } : {}),
      };
    },
  );

  // Risks are legal statements, always.
  out.litigationRisks = (Array.isArray(model.litigationRisks) ? model.litigationRisks : []).flatMap((risk: AnyRecord) => {
    const text = `${str(risk.title)}: ${str(risk.explanation)} ${str(risk.suggestedFix)}`;
    const source = legal("risk", risk, text);
    return source ? [{ ...risk, sourceUrl: source.sourceUrl }] : [];
  });

  // Forms are legal statements, always.
  out.formRecommendations = (Array.isArray(model.formRecommendations) ? model.formRecommendations : []).flatMap(
    (form: AnyRecord) => {
      const source = legal("form", form, `${str(form.title)}: ${str(form.reason)}`);
      return source ? [{ ...form, sourceUrl: source.sourceUrl }] : [];
    },
  );

  // Next actions: practical steps with no legal content may stand as they
  // are; anything about law or procedure needs a verified citation.
  const actions: { text: string; sourceUrl?: string }[] = [];
  for (const raw of Array.isArray(model.nextBestActions) ? model.nextBestActions : []) {
    const item: AnyRecord = typeof raw === "string" ? { text: raw } : (raw as AnyRecord) || {};
    const text = str(item.text);
    if (!text) continue;
    const cited = Array.isArray(item.sourceIds) && item.sourceIds.length > 0;
    if (cited || hasLegalContent(text)) {
      // A cited step keeps its link when the citation checks out. An uncited
      // step with legal content, or a citation that fails, is removed.
      const source = legal("nextBestActions", item, text);
      if (source) actions.push({ text, sourceUrl: source.sourceUrl });
    } else if (factOk("nextBestActions", text)) {
      actions.push({ text });
    }
  }
  out.nextBestActions = actions.map((action) => action.text);
  out.nextBestActionSources = actions;

  // Never shown; the brain's fixed caution replaces it.
  out.systemWarnings = [];

  return { cognition: out as T, report };
}
