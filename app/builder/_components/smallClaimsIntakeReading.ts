/**
 * What the Small Claims form intake reads from what the person has entered:
 * the stage, the kind of claim, the heading ("So far this looks like ...")
 * and what is still useful to add. Pure, with type-only imports, so
 * test:intake-sequencing runs the real functions rather than reading source.
 *
 * ENFORCEMENT (walkthrough run 38593464953, SJ; review of 859efbb). Once the
 * form knew the person was enforcing a judgment, it still led with "kind of
 * claim not clear yet" and kept the claim-building fields in front. Now:
 * - The heading for a judgment to enforce is a SUGGESTION, worded as one,
 *   with the way to change it (CLAUDE.md s. 4).
 * - A story is read as a judgment to enforce only with a court win ("won my
 *   case", "won in court", "judgment") AND money not paid, and never when an
 *   appeal is mentioned. "We won the contract/tender/bid" is not a court win.
 * - The story's reading is NEVER sent to the analysis by itself: inferStage
 *   (what is sent) does not read it. The page offers a button that sets the
 *   Case stage dropdown, visibly, and only the dropdown is sent.
 */

import type { UniversalStage } from "./builderTypes";
import type { SmallClaimsIntelligenceInput, SmallClaimsIssue } from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

/** The heading when the reading is a judgment to enforce. */
export const ENFORCEMENT_DIRECTION = "So far this looks like: you have a judgment to enforce. Not right? Choose your stage under Case stage.";

/** The summary of the folded claim-building fields. */
export const CLAIM_FIELDS_FOLDED_SUMMARY = "About the original claim (optional: you already have a judgment)";

export function hasText(value: string | undefined | null): boolean {
  return (value ?? "").trim().length > 0;
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// A court win, never a contract, a tender, a bid or a custody order.
const COURT_WIN = /\b(?:i|we) won (?:my|our|the) (?:small claims )?(?:case|claim|trial|lawsuit)\b|\bwon in court\b|\bjudg(?:e)?ment\b/i;
// The other side's judgment against the person is not theirs to enforce.
const JUDGMENT_AGAINST_ME = /\bjudg(?:e)?ment (?:was )?(?:against|on) (?:me|us)\b/i;
const NOT_PAID = /\b(?:hasn'?t|has not|haven'?t|have not|never|won'?t|will not|refuses? to|didn'?t|did not)\s+(?:paid|pay)\b|\bnot (?:been )?paid\b|\bunpaid\b/i;
const APPEAL = /\bappeal/i;

/** Whether the person's words say they won in court and have not been paid, with no appeal mentioned. */
export function judgmentUnpaidFromStory(text: string): boolean {
  const words = text.replace(/[’‘]/g, "'");
  return COURT_WIN.test(words) && !JUDGMENT_AGAINST_ME.test(words) && NOT_PAID.test(words) && !APPEAL.test(words);
}

/**
 * The stage SENT to the analysis: the Case stage dropdown, or, when it says
 * "Not sure", what the documents and the defendant's words show. The story's
 * enforcement reading is not here: it is only offered (enforcementSuggested).
 */
export function inferStage(input: SmallClaimsIntelligenceInput): UniversalStage {
  if (input.caseStage !== "not-sure") return input.caseStage;

  const text = normalizeText([input.yourRole, input.facts, input.serviceDetails, input.defenceResponse].join(" "));

  if (input.filedDocuments.includes("settlement-conference")) return "conference";
  if (input.filedDocuments.includes("enforcement-documents")) return "enforcement";
  if (input.filedDocuments.includes("plaintiffs-claim")) return "already-started";

  // "i was served a plaintifs claim" (walkthrough, 2026-10-04) previewed as
  // "starting case": only "served with a claim" was recognised.
  const servedAsDefendant = /\b(i|we)\s+(was|were|have been|got|just got)\s+served\b/.test(text);
  if (
    input.filedDocuments.includes("defence") ||
    servedAsDefendant ||
    text.includes("served with a claim") ||
    text.includes("defendant") ||
    text.includes("responding") ||
    text.includes("defending")
  ) {
    return "responding";
  }

  return "starting-case";
}

/** The story reads as a judgment to enforce while the dropdown still says "Not sure": offer to set it, never set it. */
export function enforcementSuggested(input: SmallClaimsIntelligenceInput): boolean {
  return input.caseStage === "not-sure" && inferStage(input) !== "enforcement" && hasText(input.facts) && judgmentUnpaidFromStory(normalizeText(input.facts));
}

/** What the page shows as the reading: the stage sent, or a judgment to enforce when that is suggested. */
export function enforcementShown(input: SmallClaimsIntelligenceInput): boolean {
  return hasText(input.facts) && (inferStage(input) === "enforcement" || enforcementSuggested(input));
}

export function isDefendantRole(role: string | undefined): boolean {
  return /defendant|responding/i.test(role ?? "");
}

export function inferIssuesFromStory(input: SmallClaimsIntelligenceInput): SmallClaimsIssue[] {
  const text = normalizeText(
    [input.yourRole, input.facts, input.timeline, input.evidence, input.missingEvidence, input.goal, input.damagesBreakdown, input.urgent].join(" "),
  );

  const issues: SmallClaimsIssue[] = [];

  // Walkthrough, 2026-10-04: an unpaid invoice was labelled "harmful
  // communications/harassment" because the user sent reminder TEXTS and
  // EMAILS. How people communicate is not what the dispute is about, so the
  // medium words ("messages", "texts", "email", "posted", "spread") are gone;
  // only words that name the harm itself remain.
  if (
    text.includes("defamation") ||
    text.includes("defamed") ||
    text.includes("reputation") ||
    text.includes("false statement") ||
    text.includes("slander") ||
    text.includes("libel") ||
    text.includes("rumor") ||
    text.includes("rumour") ||
    text.includes("lies about me")
  ) {
    issues.push("defamation-reputation");
  }

  if (text.includes("harass") || text.includes("threat") || text.includes("intimidat") || text.includes("stalk")) {
    issues.push("harassment-communications");
  }

  if (text.includes("unpaid") || text.includes("owed") || text.includes("invoice") || text.includes("loan") || text.includes("debt")) {
    issues.push("unpaid-money");
  }

  if (text.includes("contract") || text.includes("agreement") || text.includes("quote") || text.includes("renovation") || text.includes("service")) {
    issues.push("contract-dispute");
  }

  if (text.includes("damaged") || text.includes("repair") || text.includes("vehicle") || text.includes("property damage")) {
    issues.push("property-damage");
  }

  if (
    text.includes("served with a claim") ||
    text.includes("defending") ||
    text.includes("defence") ||
    text.includes("defense") ||
    text.includes("i am defendant")
  ) {
    issues.push("defending-claim");
  }

  if (text.includes("settle") || text.includes("settlement")) {
    issues.push("settlement");
  }

  return Array.from(new Set(issues));
}

/** What is still useful to add when enforcing: never evidence for the claim or how it was calculated. */
export function enforcementMissing(input: { yourName: string; otherParty: string; defendantAddress: string; timeline: string }): string[] {
  const missing: string[] = [];
  if (!hasText(input.yourName)) missing.push("your legal name");
  if (!hasText(input.otherParty)) missing.push("the other party’s name");
  if (!hasText(input.defendantAddress)) missing.push("the other party’s address for service");
  if (!hasText(input.timeline)) missing.push("the date of the judgment");
  return missing;
}

export function buildMissingPrompt(input: SmallClaimsIntelligenceInput): string {
  // Enforcing a judgment (walkthrough run 38593464953, SJ): the claim is
  // decided, so evidence for it and how it was calculated are not asked for.
  if (enforcementShown(input)) {
    const still = enforcementMissing(input);
    return still.length ? `Still useful to add: ${still.join(", ")}.` : "You have given enough to see your next steps. You can add more later.";
  }
  const missing: string[] = [];

  if (!hasText(input.yourName)) missing.push("your legal name");
  if (!hasText(input.otherParty)) missing.push("the other party’s name");
  if (!hasText(input.defendantAddress)) missing.push("the other party’s address for service");
  if (!hasText(input.facts)) missing.push("the case story");
  // Dates and evidence already in the story count (page review, 2026-10-06:
  // "important dates" was asked for after "the papers came on September 25").
  const storyHasDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(input.facts);
  if (!hasText(input.timeline) && !storyHasDate) missing.push("important dates");
  if (!hasText(input.evidence)) missing.push("what evidence you have");
  if (!hasText(input.amountClaimed)) missing.push(isDefendantRole(input.yourRole) ? "the amount the claim asks for" : "the amount claimed, if money is requested");
  if (!hasText(input.damagesBreakdown) && !isDefendantRole(input.yourRole)) missing.push("how the amount was calculated");

  if (!missing.length) {
    return "You have given enough to see your next steps. You can add more later.";
  }

  return `Still useful to add: ${missing.join(", ")}.`;
}

const ISSUE_LABELS: Record<SmallClaimsIssue, string> = {
  "unpaid-money": "unpaid money",
  "contract-dispute": "contract/agreement dispute",
  "property-damage": "property damage",
  "loan-or-debt": "loan/debt",
  "work-or-services": "work/services",
  "deposit-refund": "deposit/refund",
  "consumer-purchase": "consumer purchase",
  "vehicle-dispute": "vehicle dispute",
  "defamation-reputation": "defamation/reputational harm",
  "harassment-communications": "harmful communications/harassment",
  "defending-claim": "responding/defence",
  settlement: "settlement",
  enforcement: "enforcement",
  other: "other",
};

export function buildCaseDirection(input: SmallClaimsIntelligenceInput): string {
  // Nothing is guessed before there is a story (page review, 2026-10-06: a
  // blank form read "Likely direction: starting case · not yet classified").
  if (!hasText(input.facts)) return "";
  // A judgment to enforce leads, as a suggestion, never claim-type building
  // (walkthrough run 38593464953, SJ: "enforcement · kind of claim not clear yet").
  if (enforcementShown(input)) return ENFORCEMENT_DIRECTION;
  const issues = inferIssuesFromStory(input);
  const stage = inferStage(input);
  const issueText = issues.length ? issues.map((issue) => ISSUE_LABELS[issue]).join(", ") : "kind of claim not clear yet";

  return `So far this looks like: ${stage.replace(/-/g, " ")} · ${issueText}`;
}
