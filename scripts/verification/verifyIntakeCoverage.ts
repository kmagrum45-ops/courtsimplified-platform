import assert from "node:assert/strict";

import { baseScenarios } from "./scenarioRegistry";
import {
  KNOWN_FACT_FIELDS,
  QUESTION_BANK,
  type FactCondition,
} from "../../src/lib/case-system/intake/questionBank";
import { EDUCATION_TOPICS, type EducationTopic } from "../../src/lib/case-system/intake/educationTopics";
import { REMEDY_TYPES, type RemedyTopic } from "../../src/lib/case-system/intake/remedyTypes";
import { CLAIM_TYPES, DEFENCE_CONCEPTS } from "../../src/lib/case-system/intake/claimTypes";

// EducationTopic and RemedyTopic share the same fields these checks care
// about (id, surfacedWhen, citations, status) -- checked structurally
// rather than importing one as the other's type, since they're separate
// registries by design (educationTopics.ts vs remedyTypes.ts) that happen
// to follow the same shape, not the same type.
type TopicLike = Pick<EducationTopic | RemedyTopic, "id" | "surfacedWhen" | "citations" | "status">;

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
  // ClaimType structurally satisfies TopicLike (id/citations/status present,
  // surfacedWhen simply absent -- fine for an optional property), so it
  // reuses checks 2, 3, and the bonus check below for free. DEFENCE_CONCEPTS
  // has a different shape (a bare sourceUrl, not a citations tuple) and gets
  // its own small check further down instead of being forced in here.
  const allTopics: TopicLike[] = [...EDUCATION_TOPICS, ...REMEDY_TYPES, ...CLAIM_TYPES];
  for (const topic of allTopics) {
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
  for (const topic of allTopics) {
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

  // ---- DEFENCE_CONCEPTS: same non-draft-needs-source rule, different shape
  // (a bare sourceUrl rather than a citations tuple, so it can't join
  // allTopics above) ----
  for (const concept of DEFENCE_CONCEPTS) {
    if (concept.status === "draft") continue;
    if (!isResolvableSourceUrl(concept.sourceUrl)) {
      missingSources.push(
        `defence concept "${concept.id}" is status "${concept.status}" but has no resolvable ` +
          `sourceUrl from ontario.ca, ontariocourts.ca, or ontariocourtforms.on.ca`,
      );
    }
  }
  assert.equal(
    missingSources.length,
    0,
    `non-draft entries stating a legal fact without a resolvable source ` +
      `(mark them "draft" until sourced, or add the citation):\n` + missingSources.join("\n"),
  );

  // ---- 4. Every ClaimType sub-entry's sourceUrl is mandatory by type (not
  // gated behind a `why` the way questionBank.ts's is) -- verified for every
  // claim type regardless of draft status, since a bad or missing value in a
  // required field is a content bug on its own terms. ----
  const badSubEntrySources: string[] = [];
  for (const claimType of CLAIM_TYPES) {
    for (const element of claimType.plaintiffElements) {
      if (!isResolvableSourceUrl(element.sourceUrl)) {
        badSubEntrySources.push(`claim type "${claimType.id}" plaintiffElement "${element.id}" has no resolvable sourceUrl`);
      }
    }
    for (const consideration of claimType.defendantConsiderations) {
      if (!isResolvableSourceUrl(consideration.sourceUrl)) {
        badSubEntrySources.push(`claim type "${claimType.id}" defendantConsideration "${consideration.id}" has no resolvable sourceUrl`);
      }
    }
    for (const note of claimType.proceduralNotes) {
      if (!isResolvableSourceUrl(note.sourceUrl)) {
        badSubEntrySources.push(`claim type "${claimType.id}" proceduralNote "${note.note.slice(0, 40)}..." has no resolvable sourceUrl`);
      }
    }
  }
  assert.equal(
    badSubEntrySources.length,
    0,
    `ClaimType sub-entries with an unresolvable sourceUrl (this field is mandatory, not conditional):\n` +
      badSubEntrySources.join("\n"),
  );

  // ---- 5. Referential integrity: ClaimType.remedies and
  // .applicableDefenceConceptIds must point at real entries, not typos ----
  const remedyIds = new Set(REMEDY_TYPES.map((remedy) => remedy.id));
  const defenceConceptIds = new Set(DEFENCE_CONCEPTS.map((concept) => concept.id));
  const danglingReferences: string[] = [];
  for (const claimType of CLAIM_TYPES) {
    for (const remedyId of claimType.remedies) {
      if (!remedyIds.has(remedyId)) {
        danglingReferences.push(`claim type "${claimType.id}" references unknown remedy id "${remedyId}"`);
      }
    }
    for (const conceptId of claimType.applicableDefenceConceptIds) {
      if (!defenceConceptIds.has(conceptId)) {
        danglingReferences.push(`claim type "${claimType.id}" references unknown defence concept id "${conceptId}"`);
      }
    }
  }
  assert.equal(
    danglingReferences.length,
    0,
    `ClaimType entries referencing a remedy or defence concept id that doesn't exist:\n` +
      danglingReferences.join("\n"),
  );

  // ---- Bonus: every topic's citations tuple is genuinely non-empty (belt & suspenders on the type) ----
  for (const topic of allTopics) {
    assert.ok(topic.citations.length > 0, `topic "${topic.id}" has an empty citations array`);
  }

  console.log(
    `Intake coverage verified: ${smallClaimsScenarios.length} small-claims scenario(s), ` +
      `${QUESTION_BANK.length} question(s) (0 uncovered intentionalGaps), ` +
      `${EDUCATION_TOPICS.length} education topic(s), ${REMEDY_TYPES.length} remedy topic(s), ` +
      `${CLAIM_TYPES.length} claim type(s), ${DEFENCE_CONCEPTS.length} defence concept(s), ` +
      `0 unknown appliesWhen/surfacedWhen fields, 0 non-draft entries missing a resolvable source, ` +
      `0 dangling remedy/defence-concept references.`,
  );
}

main();
