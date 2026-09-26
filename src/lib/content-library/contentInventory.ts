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
import { PROCEDURAL_STAGES } from "./proceduralStages";
import { ASSISTANT_BLOCKS } from "./assistantBlocks";
import { PUBLISHED_BLOCKS } from "./publishedLibrary";
import { DEADLINE_TEMPLATES } from "../case-system/deadlines/deadlineTemplates";
import { OFFICIAL_URLS } from "../case-system/stage-map/citations";
import { DOCTRINE_SEED_LIBRARY } from "../case-system/knowledge/doctrineSeedLibrary";
import {
  IMMEDIATE_DANGER_MESSAGE,
  DISTRESS_ACKNOWLEDGMENT,
} from "./crisisMessages";
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

  /*
   * ---- Procedural stages: /legal-principles ----
   *
   * ADDED 2026-09-23. These 22 cards are live on a public page and were in NO
   * review packet, because they lived as a module-private const inside
   * `app/legal-principles/page.tsx` and this file could not see them. A
   * licensee could have signed off every other item here and left 926 lines of
   * procedural content across three courts unreviewed. Found by independent
   * review; the content moved to `proceduralStages.ts` so it could be indexed.
   *
   * The whole card is one item. A reviewer checking "the clerk notes a
   * defendant in default" needs the surrounding keyFacts and the citation in
   * front of them, and splitting the card into six rows would put each fact on
   * its own line with the source on another.
   */
  const PATHWAY_BY_COURT: Record<string, string> = {
    "Small Claims Court": "small-claims",
    "Superior Court (Civil)": "civil",
    "Family Court": "family",
  };

  for (const stage of PROCEDURAL_STAGES) {
    const pathway = PATHWAY_BY_COURT[stage.courtPath] ?? "unknown";
    items.push(
      item({
        // Includes the pathway: "Filing a Claim" and "Serving Documents" both
        // recur across courts, and an id collision would silently drop a card
        // from the packet. Same defect the form-guidance ids hit earlier.
        id: `stage:${pathway}:${slug(stage.title)}`,
        type: "procedural-stage",
        pathway,
        stage: "reference",
        text: [
          stage.title,
          "",
          stage.summary,
          "",
          "Key facts:",
          ...stage.keyFacts.map((fact) => `- ${fact}`),
          "",
          "How CourtSimplified uses it:",
          ...stage.workflowUse.map((use) => `- ${use}`),
          "",
          "Common risks:",
          ...stage.commonRisks.map((risk) => `- ${risk}`),
        ].join("\n"),
        sourceUrl: stage.citations[0]?.officialUrl || "",
        appearsIn: "/legal-principles — a public page, live today",
      }),
    );
  }

  /*
   * ---- Crisis messages ----
   *
   * ADDED 2026-09-23, and these are the highest-consequence strings in the
   * product. `safetyPass.ts`'s own header says the message "STILL NEEDS REAL
   * CLINICAL/LEGAL REVIEW BEFORE THIS EVER SHIPS", and answer Q7 to the LSO
   * leads with it — yet neither string was in the packet. The one
   * `safety-resource` row was `family-violence-support-resources`, a different
   * file entirely.
   *
   * The phone numbers inside are individually sourced from ontario.ca and
   * quoted verbatim (see the block comment above the constant). What has never
   * been reviewed is the MESSAGE: whether this is the right thing to say to
   * someone who has just disclosed danger, in this order, at this length.
   * That is a clinical judgment, not a sourcing one, and it is exactly what a
   * review packet exists to route to the right person.
   */
  items.push(
    item({
      id: "safety:immediate-danger-message",
      type: "safety-resource",
      pathway: "all",
      stage: "safety",
      text: IMMEDIATE_DANGER_MESSAGE,
      sourceUrl: "https://www.ontario.ca/page/connect-supports-survivors-violence",
      appearsIn:
        "Every free-text intake, when the safety pass returns immediate-danger. The intake HALTS.",
    }),
  );

  /*
   * ---- Guided assistant blocks ----
   *
   * ADDED 2026-09-23. docs/chat-engine-report.md traced twelve output paths
   * through the chat orchestrator: no model involved, but six stated law or
   * procedure and all twelve were template literals buried in a 1,200-line
   * file — outside the library, outside the packet, outside the guard.
   *
   * Indexed as the TEMPLATE, with `{{slots}}` intact. That is the string a
   * licensee reviews and the string `renderAssistantBlock` passes to the guard
   * before filling anything in. Indexing a filled example would approve one
   * user's sentence and no other.
   */
  for (const block of ASSISTANT_BLOCKS) {
    items.push(
      item({
        id: block.id,
        type: "assistant-block",
        pathway: "all",
        stage: "assistant",
        text: block.template,
        sourceUrl: block.citations[0]?.officialUrl || "",
        appearsIn: block.appearsIn,
      }),
    );
  }

  /*
   * ---- Published stage answers ----
   *
   * The blocks the accuracy pipeline produced and a promotion pinned. Only
   * the PUBLISHED set is indexed — candidate runs are not content, they are
   * proposals, and indexing one would let the output guard pass whatever the
   * last script run happened to write.
   *
   * Each of the four sections is indexed separately because that is how the
   * guard sees them. It checks a string, and a renderer shows one section at
   * a time; indexing the joined block would mean a section on its own was not
   * in the index and would be refused.
   */
  for (const block of PUBLISHED_BLOCKS) {
    const sections: Array<[string, string | null]> = [
      ["whats-happening", block.whatsHappening],
      ["what-to-do-next", block.whatToDoNext],
      ["your-deadline", block.yourDeadline],
      ["what-happens-after", block.whatHappensAfter],
    ];

    for (const [name, text] of sections) {
      if (!text) continue;
      items.push(
        item({
          id: `${block.id}:${name}`,
          type: "stage-answer",
          pathway: "small-claims",
          stage: block.stageId,
          text,
          sourceUrl: block.citations[0]
            ? OFFICIAL_URLS[block.citations[0].sourceId]
            : "",
          appearsIn: `Stage answer for "${block.userQuestion}"`,
        }),
      );
    }
  }

  /*
   * ---- The deadline engine's sentences (decision 5) ----
   *
   * Every sentence the deadline engine can produce, as the template a reviewer
   * reads rather than as one filled instance of it.
   *
   * These had to be indexed the moment the engine got a production caller.
   * `outputGuard` is an allowlist, so an engine sentence that is not in the
   * index cannot be shown at all — and, worse than being blocked, prose
   * assembled inside an engine and appended to a section would never have
   * reached the guard to be blocked. Indexing the templates is what makes the
   * guard true of the deadline text as well as the block text.
   *
   * A slot is left AS a slot (`{result}`) in the indexed text: the reviewer is
   * approving the sentence, and the dates that go into it are the reader's own.
   */
  for (const template of Object.values(DEADLINE_TEMPLATES)) {
    items.push(
      item({
        id: `deadline-template:${template.id}`,
        type: "deadline-computation",
        pathway: "small-claims",
        stage: "deadlines",
        text: template.text,
        sourceUrl: template.cites ? OFFICIAL_URLS[template.cites.sourceId] : "",
        appearsIn: "The deadline section of a stage answer, when the date it counts from is known",
      }),
    );
  }

  /*
   * ---- The doctrine library ----
   *
   * ADDED 2026-09-23. 11 objects, every one carrying
   * `verificationStatus: "not-verified"`, `authorityLevel:
   * "operational-guidance"` and `jurisdiction: "Unknown"`. Zero statute, rule
   * or case-law citations in the file. It supplies the evidence priorities,
   * burden priorities and procedural watch-points behind three of the guided
   * assistant's answers, and it was in no review packet.
   *
   * The file is honest about itself in its own metadata. Nothing downstream
   * was telling the user, and nothing was routing it to a reviewer. Both are
   * now true: it is here, and `renderAssistantBlock` refuses to render a block
   * backed by knowledge that is not `verified-draft` or `approved`.
   */
  for (const knowledge of DOCTRINE_SEED_LIBRARY) {
    items.push(
      item({
        id: `doctrine:${knowledge.id}`,
        type: "doctrine",
        pathway: "all",
        stage: "assistant",
        text: `${knowledge.title}\n\n${knowledge.summary}`,
        // Deliberately empty: operationalSource() carries no official URL, and
        // inventing one would be the opposite of what this entry is for.
        sourceUrl: "",
        appearsIn:
          `Guided assistant — evidence, issue and readiness answers. ` +
          `verificationStatus: ${knowledge.source.verificationStatus}. ` +
          `NOT RENDERED while it is "not-verified".`,
      }),
    );
  }

  items.push(
    item({
      id: "safety:distress-acknowledgment",
      type: "safety-resource",
      pathway: "all",
      stage: "safety",
      text: DISTRESS_ACKNOWLEDGMENT,
      sourceUrl: "",
      appearsIn:
        "Every free-text intake, when the safety pass returns distress. The intake continues.",
    }),
  );

  return items;
}

/** Lowercase-hyphenated, for ids built from a human title. */
function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
