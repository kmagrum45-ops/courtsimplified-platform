/**
 * Every piece of legal or procedural content in the product, in one uniform
 * shape, collected from the registries that already hold it.
 *
 * *** THIS DOES NOT MOVE THE CONTENT. ***
 *
 * The brief allowed migrating storage only if necessary, and it is not. The
 * catalogues in `src/lib/case-system/intake/` are already the single source of
 * truth, already carry source URLs, and are already exercised by ~70
 * verification scripts. Copying their text into a second store would create
 * two places for the same sentence to live and one of them to go stale.
 *
 * So this is an INDEX, not a copy. It reads the live registries at call time.
 * A content edit shows up here on the next run with no sync step, and the
 * review packet cannot describe text the product is not actually serving.
 *
 * *** VERSIONING ***
 *
 * There is no `version` field on the existing items and adding one to ~160
 * objects by hand would be error-prone and immediately stale. Instead the
 * version is DERIVED: a short stable hash of the item's own user-visible text.
 * Edit the text and the version changes, which voids the licensee approval
 * attached to the old version (see licenseeReview.isApproved).
 *
 * That gives the property the policy actually needs — an approval covers the
 * words that were reviewed, not the id they were stored under — without a
 * bookkeeping field nobody will remember to bump.
 */

import { QUESTION_BANK } from "../case-system/intake/questionBank";
import { EDUCATION_TOPICS } from "../case-system/intake/educationTopics";
import { CLAIM_TYPES } from "../case-system/intake/claimTypes";
import { DEPTH_QUESTIONS } from "../case-system/intake/depth/elementQuestionRegistry";
import { FORM_KNOWLEDGE_BASE } from "../case-system/formKnowledgeBase";
import { FAMILY_RESOURCE_TOPICS } from "../case-system/intake/familySafetyResources";
import { REMEDY_TYPES } from "../case-system/intake/remedyTypes";
import { OUT_OF_SCOPE_FORUMS } from "../case-system/intelligence/outOfScopeForums";
import { NEXT_STEP_BLOCKS } from "./nextSteps";
import { PATHWAY_DESCRIPTIONS } from "./pathwayDescriptions";
import { QUESTION_EXPLANATIONS } from "./questionExplanations";
import type { ContentItem } from "./licenseeReview";

/**
 * A short, stable content hash. Not cryptographic — it only has to change when
 * the text changes and stay the same when it does not.
 */
export function versionOf(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function item(args: Omit<ContentItem, "version">): ContentItem {
  return { ...args, version: versionOf(args.text) };
}

/** Everything a licensee needs to review, collected from the live registries. */
export function collectContentInventory(): ContentItem[] {
  const items: ContentItem[] = [];

  // ---- Intake questions: the words a user is actually asked ----
  for (const question of QUESTION_BANK) {
    items.push(
      item({
        id: question.id,
        type: "intake-question",
        pathway: question.courtArea,
        stage: question.phase,
        text: question.why ? `${question.text}\n\nWhy: ${question.why}` : question.text,
        sourceUrl: question.sourceUrl || "",
        appearsIn: "Guided intake and the Small Claims static form",
      }),
    );
  }

  // ---- Plain-language explanations (replaces the generative explainQuestion) ----
  for (const [questionId, explanation] of Object.entries(QUESTION_EXPLANATIONS)) {
    items.push(
      item({
        id: `explain:${questionId}`,
        type: "question-explanation",
        pathway: "small-claims",
        stage: "intake",
        text: explanation.text,
        sourceUrl: explanation.sourceUrl,
        appearsIn: `Intake, "I don't understand this" on ${questionId}`,
      }),
    );
  }

  // ---- Education topics ----
  for (const topic of EDUCATION_TOPICS) {
    items.push(
      item({
        id: topic.id,
        type: "education-topic",
        pathway: topic.courtArea,
        stage: "intake",
        text: `${topic.title}\n\n${topic.plainExplanation}`,
        sourceUrl: topic.citations[0]?.officialUrl || "",
        appearsIn: "Intake, surfaced by recorded facts",
      }),
    );
  }

  // ---- Claim types: the element text a user reads ----
  for (const claimType of CLAIM_TYPES) {
    for (const element of claimType.plaintiffElements) {
      items.push(
        item({
          id: `${claimType.id}:${element.id}`,
          type: "claim-type",
          pathway: claimType.courtArea,
          stage: "intake",
          text: `${element.name}\n\n${element.plainExplanation}`,
          sourceUrl: element.sourceUrl || "",
          appearsIn: `Claim type "${claimType.name}" — readiness and Statement of Claim`,
        }),
      );
    }
  }

  // ---- Depth questions ----
  for (const question of DEPTH_QUESTIONS) {
    items.push(
      item({
        id: question.id,
        type: "depth-question",
        pathway: "small-claims",
        stage: "depth",
        text: question.text,
        sourceUrl: "",
        appearsIn: "Depth phase, asked per claim-type element",
      }),
    );
  }

  // ---- Next steps (new in Step 2) ----
  for (const block of NEXT_STEP_BLOCKS) {
    items.push(
      item({
        id: block.id,
        type: "next-step",
        pathway: block.pathway,
        stage: block.stage,
        text: block.text,
        sourceUrl: block.sourceUrl,
        appearsIn: "Case summary and generated documents",
      }),
    );
  }

  // ---- Pathway descriptions (new in Step 3) ----
  for (const description of PATHWAY_DESCRIPTIONS) {
    items.push(
      item({
        id: description.id,
        type: "pathway-description",
        pathway: description.pathway,
        stage: "routing",
        text: description.text,
        sourceUrl: description.sourceUrl,
        appearsIn: "Home, after court-path classification",
      }),
    );
  }

  // ---- Form guidance ----
  for (const form of FORM_KNOWLEDGE_BASE) {
    items.push(
      item({
        // Court path is part of the id because a form NUMBER is not unique
        // across courts: 14A is "Offer to Settle" in Small Claims and
        // "Statement of Claim" in Civil. Keying on the number alone would have
        // let one court's approval silently cover the other's form.
        id: `form:${form.courtPath}:${form.formNumber}`,
        type: "form-guidance",
        pathway: form.courtPath,
        stage: "forms",
        text: `${form.title}\n\n${form.plainPurpose}`,
        sourceUrl: "",
        appearsIn: "Forms guidance",
      }),
    );
  }

  // ---- Family safety resources ----
  for (const topic of FAMILY_RESOURCE_TOPICS) {
    items.push(
      item({
        id: topic.id,
        type: "safety-resource",
        pathway: "family",
        stage: "all",
        text: `${topic.title}\n\n${topic.content}`,
        sourceUrl: topic.citations[0]?.officialUrl || "",
        appearsIn: "Family intake and overview",
      }),
    );
  }

  // ---- Out-of-scope forum redirects ----
  //
  // Already a static, hand-written catalogue — the model only picks a forum
  // id, never the wording. But the wording IS shown to users, and the file's
  // own header says every redirectMessage is "DRAFT: pending lawyer/paralegal
  // review", so it belongs in the packet.
  for (const forum of Object.values(OUT_OF_SCOPE_FORUMS)) {
    items.push(
      item({
        id: `out-of-scope:${forum.id}`,
        type: "pathway-description",
        pathway: forum.id,
        stage: "routing",
        text: `${forum.name}\n\n${forum.redirectMessage}`,
        sourceUrl: forum.citations[0]?.officialUrl || "",
        appearsIn: "Home, when a story points outside the three court paths",
      }),
    );
  }

  // ---- Remedies ----
  for (const remedy of REMEDY_TYPES) {
    items.push(
      item({
        id: remedy.id,
        type: "remedy",
        pathway: "small-claims",
        stage: "readiness",
        text: `${remedy.title}\n\n${remedy.plainExplanation}`,
        sourceUrl: remedy.citations[0]?.officialUrl || "",
        appearsIn: "Readiness gate, remedy confirmation",
      }),
    );
  }

  return items;
}
