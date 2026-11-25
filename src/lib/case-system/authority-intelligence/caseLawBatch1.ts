/**
 * THE CASE LAW MAP, BATCH 1 (owner, 2026-11-22), IN THE AUTHORITY REGISTRY.
 *
 * 22 decisions and 3 statute or rule provisions, each with the owner's approved summary and cautions, word for word
 * (caseLawBatch1.json, built from docs/law-map/case-law-batch1-2026-11-22.md by scripts/content/buildCaseLawBatch1.ts).
 *
 * PHASE 1 ONLY: STORED, CHECKED, SHOWN TO NO ONE.
 *   - Nothing outside this folder imports this file, and these entries are not in VERIFIED_AUTHORITY_SEED_ENTRIES, so
 *     the retrieval engine and the AI never see them. As registry entries they are "needs-review", "do-not-display",
 *     and may not be shown or used for reasoning or drafting.
 *   - caseLawDisplay() is the one way an entry could ever be shown, and it answers null for every entry today: each
 *     needs review, and confirmed_at is empty. It can never return a summary without its cautions, its source label
 *     and its link.
 *   - Two separate things are both called "review" here. review.status "needs review" is the standing label for legal
 *     content no one has signed off through the site. hidden_until_checked is true for a decision whose CanLII citation
 *     check has not passed (failed, or not run).
 *   - No decision text is stored: only our summaries and each case's name, citations, court, date and a link.
 *   - Procedure (a step, form, deadline or fee) is never taken from an entry; it comes from the stage map (CLAUDE.md
 *     s. 2a). procedureMentions lists each period an entry mentions, as explanation only.
 *
 * Test: npm run test:case-law-batch1.
 */
import batch from "./caseLawBatch1.json";
import type { CaseCourtPath } from "../architecture/masterCaseSchema";
import type { VerifiedAuthorityEntry } from "./authorityRegistryArchitecture";

export type CanliiCheck = {
  status: "pass" | "fail" | "not checked" | "not applicable";
  /** The date the check ran (Toronto). Never typed. */
  checkedOn: string | null;
  /** The link CanLII's API returned for the case (canlii.ca), for a person to click. */
  url: string | null;
  note: string;
};

export type CaseLawEntry = {
  /** "E01" */
  number: string;
  /** "pintea-v-johns" */
  id: string;
  kind: "case-law" | "statute" | "rule";
  courts: Extract<CaseCourtPath, "small-claims" | "civil" | "family">[];
  topicTextId: string;
  title: string;
  citations: string[];
  court: string | null;
  decided: string | null;
  decidedAs: "decided" | "reasons released" | null;
  sourceLabel: "Source: CanLII" | "Source: Ontario e-Laws";
  /** Links whose domain may be shown. The first is the entry's own source (for a decision, the CanLII link). */
  links: { label: string; url: string; role: "decision" | "source" | "related" }[];
  /** Links held back until the owner decides on their domain; never shown. */
  linkPendingSourceDecision: { label: string; url: string; reason: string }[];
  summaryTextId: string;
  /** Null where the owner's file says "(none)" or "(none beyond the summary)". */
  cautionsTextId: string | null;
  cautionsAsGiven: string;
  review: {
    status: "needs review" | "reviewed";
    /** Set only when the owner's review is saved through the site's review mechanism. Never typed or backdated. */
    confirmed_at: string | null;
    reviewer: string;
    /** The owner's notes as supplied: sources checked, corrections. */
    owner_check_notes: string;
  };
  canliiCheck: CanliiCheck;
  hidden_until_checked: boolean;
  /** The first outcome or case-strength check that refused this entry's wording. The entry stays out of use. */
  stoppedByPredictionCheck: { field: "topic" | "summary" | "cautions"; phrase: string; rule: string } | null;
  procedureMentions: string[];
  machineCheck: {
    /** Always false: no code check here reads a summary against the whole of what it summarizes. */
    verified: false;
    decisionText: {
      file: string;
      paragraphsCited: number[];
      paragraphsMissing: number[];
      quotesChecked: string[];
      quotesMissing: string[];
    } | null;
    statutePinpoints: { corpusId: string; pinpoint: string; phrase: string; found: boolean }[];
  };
  /** False for every entry in phase 1. */
  inUse: boolean;
};

export type CaseLawBatch = {
  batch: string;
  from: string;
  note: string;
  /** Every piece of user-facing text, by id (French-ready: a second language is a second map with the same ids). */
  texts: Record<string, string>;
  entries: CaseLawEntry[];
};

export const CASE_LAW_BATCH1 = batch as CaseLawBatch;

export const caseLawText = (id: string, data: CaseLawBatch = CASE_LAW_BATCH1): string => data.texts[id] ?? "";

/** The entries filed under a court: where guidance for that court will look them up once it is wired (not yet). */
export function caseLawEntriesForCourt(court: CaseCourtPath, data: CaseLawBatch = CASE_LAW_BATCH1): CaseLawEntry[] {
  return data.entries.filter((entry) => (entry.courts as CaseCourtPath[]).includes(court));
}

export type CaseLawDisplay = {
  title: string;
  citations: string[];
  summary: string;
  /** Always present when the entry has a caution; never dropped. */
  cautions: string | null;
  sourceLabel: string;
  link: string;
};

/**
 * The only way an entry may be shown. Null unless every condition holds: the owner's review is saved (status
 * "reviewed" with a confirmed_at the mechanism set), the CanLII check passed for a decision, no prediction check
 * refused it, it is marked in use, it is filed under this court, and it has its summary, its cautions (where it has
 * any), a source label and a link. In phase 1 it is null for every entry.
 */
export function caseLawDisplay(id: string, court: CaseCourtPath, data: CaseLawBatch = CASE_LAW_BATCH1): CaseLawDisplay | null {
  const entry = data.entries.find((e) => e.id === id);
  if (!entry) return null;
  if (entry.review.status !== "reviewed" || !entry.review.confirmed_at) return null;
  if (entry.hidden_until_checked || entry.stoppedByPredictionCheck || !entry.inUse) return null;
  if (!(entry.courts as CaseCourtPath[]).includes(court)) return null;
  const summary = caseLawText(entry.summaryTextId, data);
  const cautions = entry.cautionsTextId ? caseLawText(entry.cautionsTextId, data) : null;
  const link = entry.links[0]?.url ?? "";
  if (!summary || (entry.cautionsTextId && !cautions) || !entry.sourceLabel || !link) return null;
  return { title: entry.title, citations: entry.citations, summary, cautions, sourceLabel: entry.sourceLabel, link };
}

/** The review record of every entry, for an admin view or an export. Not shown to users. */
export function caseLawReviewRecords(data: CaseLawBatch = CASE_LAW_BATCH1) {
  return data.entries.map((entry) => ({
    number: entry.number,
    id: entry.id,
    title: entry.title,
    ...entry.review,
    canliiCheck: entry.canliiCheck,
    hidden_until_checked: entry.hidden_until_checked,
    stoppedByPredictionCheck: entry.stoppedByPredictionCheck,
  }));
}

const LEVEL: Record<string, VerifiedAuthorityEntry["courtLevel"]> = {
  "Supreme Court of Canada": "supreme-court-of-canada",
  "Court of Appeal for Ontario": "ontario-court-of-appeal",
};

/**
 * The entries in the registry's own shape, as entries that may not be displayed or used. The registry's descriptive
 * fields (core principle, test elements, evidence notes) are left empty on purpose: the only wording these entries
 * carry is the owner's, in approvedRecord.
 */
export function caseLawBatch1AuthorityEntries(data: CaseLawBatch = CASE_LAW_BATCH1): VerifiedAuthorityEntry[] {
  return data.entries.map((entry) => ({
    id: `authority_case_law_map_${entry.id.replace(/-/g, "_")}`,
    version: "1.0.0",
    kind: entry.kind === "case-law" ? "case-law" : entry.kind === "rule" ? "rule" : "statute",
    displayMode: "do-not-display",
    verificationStatus: "needs-review",
    userRiskLevel: "needs-context",
    title: entry.title,
    shortTitle: entry.title,
    citation: entry.citations.join("; "),
    neutralCitation: entry.citations.find((c) => /^\d{4} (SCC|ONCA) \d+$/.test(c)),
    courtLevel: (entry.court && LEVEL[Object.keys(LEVEL).find((k) => entry.court?.startsWith(k)) ?? ""]) || "other",
    jurisdiction: entry.kind === "case-law" && entry.court?.startsWith("Supreme") ? "Canada" : "Ontario",
    year: entry.decided ? Number(entry.decided.slice(0, 4)) : undefined,
    bindingWeight: "unknown",
    courtPaths: entry.courts,
    legalDomains: [],
    proceduralStages: [],
    topicTags: [],
    doctrineTags: [],
    ruleReferences: [],
    statuteReferences: [],
    formReferences: [],
    corePrinciple: "",
    plainLanguageSummary: "",
    legalTestSummary: "",
    howCourtsUseIt: [],
    practicalUse: [],
    commonMistakes: [],
    limitsAndWarnings: [],
    legalTestElements: [],
    evidenceImplications: [],
    workflowLinks: [],
    relatedAuthorities: { follows: [], followedBy: [], distinguishes: [], distinguishedBy: [], limits: [], limitedBy: [], overrules: [], overruledBy: [], related: [] },
    aiUseRules: {
      canShowToUser: false,
      canUseForReasoning: false,
      canUseForDrafting: false,
      mustVerifyBeforeCitation: true,
      mustExplainLimits: true,
      mustAskContextQuestions: true,
      prohibitedUses: ["Never restate this entry's holding in other words.", "Never contradict its cautions."],
    },
    suggestedAiQuestions: [],
    suggestedEvidenceQuestions: [],
    suggestedWorkflowActions: [],
    sourceReferences: [],
    createdAt: "2026-11-22T00:00:00.000Z",
    updatedAt: "2026-11-22T00:00:00.000Z",
    approvedRecord: entry,
  }));
}
