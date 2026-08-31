import assert from "node:assert/strict";

import { baseScenarios } from "./scenarioRegistry";
import {
  KNOWN_FACT_FIELDS,
  QUESTION_BANK,
  type FactCondition,
} from "../../src/lib/case-system/intake/questionBank";
import { EDUCATION_TOPICS } from "../../src/lib/case-system/intake/educationTopics";

const ALLOWED_SOURCE_DOMAINS = [
  "https://www.ontario.ca/",
  "https://ontario.ca/",
  "https://www.ontariocourts.ca/",
  "https://ontariocourts.ca/",
  "https://www.ontariocourtforms.on.ca/",
  "https://ontariocourtforms.on.ca/",
];

function isResolvableSourceUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return ALLOWED_SOURCE_DOMAINS.some((prefix) => value.startsWith(prefix));
}

function collectFactFields(condition: FactCondition, out: Set<string>): void {
  if ("all" in condition) {
    condition.all.forEach((inner) => collectFactFields(inner, out));
    return;
  }
  if ("any" in condition) {
    condition.any.forEach((inner) => collectFactFields(inner, out));
    return;
  }
  out.add(condition.field);
}

function main() {
  const knownFields = new Set<string>(KNOWN_FACT_FIELDS);

  // ---- 1. Every small-claims scenario's intentionalGaps must be covered ----
  const smallClaimsScenarios = baseScenarios.filter((scenario) => scenario.courtPath === "small-claims");
  assert.ok(smallClaimsScenarios.length > 0, "expected at least one small-claims scenario in the registry");

  const coveredGaps = new Set<string>();
  for (const question of QUESTION_BANK) {
    (question.covers ?? []).forEach((gap) => coveredGaps.add(gap));
  }

  const uncoveredGaps: string[] = [];
  for (const scenario of smallClaimsScenarios) {
    for (const gap of scenario.intentionalGaps) {
      if (!coveredGaps.has(gap)) {
        uncoveredGaps.push(`${scenario.id}: "${gap}"`);
      }
    }
  }
  assert.equal(
    uncoveredGaps.length,
    0,
    `intentionalGaps with no covering question (add a question with a matching \`covers\` entry):\n` +
      uncoveredGaps.join("\n"),
  );

  // ---- 2. appliesWhen / surfacedWhen must only reference known fact fields ----
  const unknownFieldRefs: string[] = [];
  for (const question of QUESTION_BANK) {
    if (!question.appliesWhen) continue;
    const fields = new Set<string>();
    collectFactFields(question.appliesWhen, fields);
    for (const field of fields) {
      if (!knownFields.has(field)) {
        unknownFieldRefs.push(`question "${question.id}" appliesWhen references unknown field "${field}"`);
      }
    }
  }
  for (const topic of EDUCATION_TOPICS) {
    if (!topic.surfacedWhen) continue;
    const fields = new Set<string>();
    collectFactFields(topic.surfacedWhen, fields);
    for (const field of fields) {
      if (!knownFields.has(field)) {
        unknownFieldRefs.push(`topic "${topic.id}" surfacedWhen references unknown field "${field}"`);
      }
    }
  }
  assert.equal(
    unknownFieldRefs.length,
    0,
    `appliesWhen/surfacedWhen referencing a field not in KNOWN_FACT_FIELDS ` +
      `(questionBank.ts) -- add the field there first, deliberately:\n` +
      unknownFieldRefs.join("\n"),
  );

  // ---- 3. Every non-draft item stating a legal fact needs a resolvable sourceUrl ----
  const missingSources: string[] = [];
  for (const question of QUESTION_BANK) {
    if (question.status === "draft") continue;
    const statesLegalFact = Boolean(question.why);
    if (statesLegalFact && !isResolvableSourceUrl(question.sourceUrl)) {
      missingSources.push(
        `question "${question.id}" is status "${question.status}" with a \`why\` but no resolvable ` +
          `sourceUrl from ontario.ca, ontariocourts.ca, or ontariocourtforms.on.ca`,
      );
    }
  }
  for (const topic of EDUCATION_TOPICS) {
    if (topic.status === "draft") continue;
    const hasResolvableCitation = topic.citations.some((citation) => isResolvableSourceUrl(citation.officialUrl));
    if (!hasResolvableCitation) {
      missingSources.push(
        `topic "${topic.id}" is status "${topic.status}" but has no citation with a resolvable ` +
          `officialUrl from ontario.ca, ontariocourts.ca, or ontariocourtforms.on.ca`,
      );
    }
  }
  assert.equal(
    missingSources.length,
    0,
    `non-draft entries stating a legal fact without a resolvable source ` +
      `(mark them "draft" until sourced, or add the citation):\n` + missingSources.join("\n"),
  );

  // ---- Bonus: every topic's citations tuple is genuinely non-empty (belt & suspenders on the type) ----
  for (const topic of EDUCATION_TOPICS) {
    assert.ok(topic.citations.length > 0, `topic "${topic.id}" has an empty citations array`);
  }

  console.log(
    `Intake coverage verified: ${smallClaimsScenarios.length} small-claims scenario(s), ` +
      `${QUESTION_BANK.length} question(s) (0 uncovered intentionalGaps), ` +
      `${EDUCATION_TOPICS.length} education topic(s), 0 unknown appliesWhen/surfacedWhen fields, ` +
      `0 non-draft entries missing a resolvable source.`,
  );
}

main();
