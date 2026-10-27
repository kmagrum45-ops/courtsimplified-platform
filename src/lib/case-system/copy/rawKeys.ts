/**
 * NO RAW FIELD NAME OR CODE REACHES A PERSON (#477 re-test, item 5).
 *
 * Chrome saw "decision-making-responsibility, parenting-time, spousal-support, divorce,
 * sale-of-home" under "Kind of claim", and "Case stage: conference". Each was a stored
 * value shown as it is kept. This is the one list of what is kept that way -- every option
 * value with a hyphen in it, every stage id, every form field and case-file slot named in
 * code -- with the words each option shows, so a screen can put words in their place, and
 * a guard (the story pack, test:raw-keys) can fail when one reaches the page.
 *
 * Pure: no React, no network. States no law.
 */
import { FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS, familyGuidedFields, civilGuidedFields } from "../../../../app/builder/_components/guidedFields";
import { SLOT_FACTS } from "../caseFile/caseFile";
import { QUESTION_BANK } from "../intake/questionBank";
import { LEGAL_REASONING_PROFILES } from "../knowledge/legalReasoningProfiles";

const OPTIONS = [...FAMILY_FILED_OPTIONS, ...FAMILY_ISSUE_OPTIONS, ...CIVIL_ISSUE_OPTIONS, ...CIVIL_DOCUMENT_OPTIONS];

/** The words a stored option value shows ("parenting-time" -> the form's own label), or null. */
export function optionWords(value: string): string | null {
  return OPTIONS.find((option) => option.value === value)?.label ?? null;
}

/** A stored list or value in words: each option by its label, never its code. */
export function inWords(value: string | string[]): string {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => optionWords(item) ?? item).join(", ");
}

/** Stored values with a hyphen: never ordinary prose. */
const HYPHENATED = [...new Set(OPTIONS.map((option) => option.value).filter((value) => value.includes("-")))];
/** Names of fields and slots kept in code (camelCase): never ordinary prose. */
const FIELD_NAMES = [...new Set([
  ...familyGuidedFields({ issues: FAMILY_ISSUE_OPTIONS, filed: FAMILY_FILED_OPTIONS }).map((field) => field.key),
  ...civilGuidedFields({ issues: CIVIL_ISSUE_OPTIONS, documents: CIVIL_DOCUMENT_OPTIONS }).map((field) => field.key),
  ...SLOT_FACTS,
  ...QUESTION_BANK.flatMap((question) => (typeof question.capturesField === "string" ? [question.capturesField as string] : [])),
  "adoptionDetails", "caseStage", "currentLivingSituation", "missingEvidence", "pastLivingHistory", "propertyHomeDetails", "safetyConcerns", "existingOrderDate",
].filter((name) => /[a-z][A-Z]/.test(name)))];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RAW = new RegExp(
  [
    `(?<![\\w-])(?:${HYPHENATED.map(escape).join("|")})(?![\\w-])`,
    `\\b(?:${FIELD_NAMES.map(escape).join("|")})\\b`,
    // A stage id: "family:both:case-conference-scheduled", "plaintiff:awaiting-settlement-conference".
    String.raw`\b(?:family|civil|plaintiff|defendant|applicant|respondent|both):[a-z0-9]+(?:[:-][a-z0-9]+)+\b`,
  ].join("|"),
  "g",
);

/** Every raw code or field name in a screen's text. */
export function rawKeysIn(text: string): string[] {
  return [...new Set([...text.matchAll(RAW)].map((match) => match[0]))];
}

/**
 * The site's own reasoning machinery, never shown: the legal reasoning profiles' names and their
 * investigation steps ("Public authority / Crown / police", "Identify each public actor."), and the
 * words that introduced them (Charter re-test 27 Oct: "Why this matters: This is the first
 * investigation step for Public authority / Crown / police: Identify each public actor"). One list,
 * read from the profiles themselves, so a new profile is covered without editing this.
 */
// Less the words the person is offered as answers ("Property damage" is also a choice for "What kind
// of dispute is this?"): those are the person's words on screen, not the profiles'.
const OFFERED_WORDS = new Set(
  [
    ...QUESTION_BANK.flatMap((question) => question.choices ?? []),
    ...[FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS].flat().map((option) => option.label),
  ].map((words) => words.trim().toLowerCase()),
);
const PROFILE_WORDS = [...new Set(LEGAL_REASONING_PROFILES.flatMap((profile) => [profile.label, ...profile.investigationOrder]))].filter((words) => !OFFERED_WORDS.has(words.replace(/\.$/, "").trim().toLowerCase()));
const INTERNAL_WORDING = new RegExp(
  [
    ...PROFILE_WORDS.map((words) => escape(words.replace(/\.$/, ""))),
    String.raw`\breasoning profile`,
    String.raw`\binvestigation step for\b`,
    String.raw`\bevidence priorities\b`,
  ].join("|"),
  "gi",
);

/** Each piece of the site's internal reasoning wording in a text (none should ever reach a screen). */
export function internalWordingIn(text: string): string[] {
  return [...new Set([...text.matchAll(INTERNAL_WORDING)].map((match) => match[0]))];
}
