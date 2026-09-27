/**
 * CLAIM-TYPE PROFILES — "what kind of case do I have", layered on the stage map's
 * "where am I in the process".
 *
 * *** WHAT THIS IS AND IS NOT ***
 *
 * A stage block is generic: the defence period is twenty days whatever the claim is
 * about. A profile adds what is special about THIS KIND of matter — whether this
 * court is even the right place, whether a notice has to go out before anything
 * else, what to gather, and where else a person can go.
 *
 * It is a NEW dimension, not a replacement. Nothing here changes a stage block.
 *
 * *** IT CARRIES NO PROSE ***
 *
 * Every user-facing sentence about a claim type goes through the content pipeline
 * and the published library, exactly like the stage answers. This file holds
 * STRUCTURE: which forum, which provision says so, which notice stages apply, which
 * deadline events feed the engine, which corpus sources back it, and which
 * clarifying questions tell one type from another.
 *
 * The one apparent exception is `gather`, which is a list of documents and dates.
 * That is organisational — "an invoice", "the date you told them" — and carries no
 * legal proposition. CLAUDE.md §3 allows naming what is missing and forbids grading
 * it, so a gather list may say a photograph is not in the file and may never say the
 * claim is weak without one.
 *
 * *** WHY contentStatus EXISTS ***
 *
 * The catalogue declares far more types than are authored, deliberately: the
 * breadth is the map of the work, and a type that is named but unwritten is
 * visible, countable, and cannot be quietly forgotten. `contentStatus` is what
 * keeps that honest — `"declared"` means nothing may render, and
 * `verifyClaimTypeCatalogue` asserts a declared profile carries no user-facing
 * fields at all.
 *
 * This is the same shape `verifyDepthQuestions` settled on for unauthored question
 * elements, and for the same reason: a list that must be maintained is fine; a
 * check that punishes the maintenance is not (CLAUDE.md §5).
 */

import type { RuleCitation } from "../stage-map/citations";
import type { DeadlineEventKey } from "../deadlines/deadlineEvents";

/** The families the catalogue is organised into. Used for coverage reporting. */
export type ClaimFamily =
  | "money-owed"
  | "goods-and-services"
  | "property-damage"
  | "injury"
  | "neighbours"
  | "work"
  | "housing"
  | "family-adjacent"
  | "other"
  | "defendant-side"
  | "out-of-scope";

/**
 * Where a matter of this kind belongs.
 *
 * *** WHY A VERDICT AND NOT A BOOLEAN ***
 *
 * "In scope / out of scope" cannot express the three answers that actually matter
 * to a user. `depends` is the important one: a landlord-and-tenant matter may be
 * this court's or the Board's depending on whether the tenancy has ended, and the
 * honest output is a question, not a guess. A boolean would force a guess.
 */
export type ForumVerdict =
  | {
      kind: "small-claims";
      /** The provision that puts it here. */
      because: RuleCitation;
    }
  | {
      kind: "elsewhere";
      /** Corpus id of the body's own page, so a referral names a real route. */
      forumSourceId: string;
      /** The provision that puts it there, where one says so. */
      because: RuleCitation | null;
      /**
       * Set when the route is not yet sourced. A profile with this set may say we
       * have no verified route rather than naming one from memory — the ten pages
       * in docs/infra/human-list.md are why this field exists.
       */
      routeUnsourced?: true;
    }
  | {
      kind: "depends";
      /** The clarifying question that resolves it, from the approved bank. */
      questionId: string;
      /** What each answer means, as ids of other profiles or forums. */
      resolvesTo: string[];
      because: RuleCitation | null;
    };

/** A pre-suit notice, wired to the deadline engine. */
export type ProfileNotice = {
  /** The stage-map stage that carries the content for it. */
  stageId: string;
  /** What the clock runs from, so the engine can compute a date. */
  countFromEvent: DeadlineEventKey;
  because: RuleCitation;
  /**
   * True where missing it bars the claim outright, subject to the statute's own
   * exceptions. Ranked first for content, because turning away a barred claimant
   * late is the worst outcome available.
   */
  claimBarring: boolean;
};

export type ClaimTypeProfile = {
  /** Stable id. Where an existing intake claim type matches, the SAME id is used. */
  id: string;
  family: ClaimFamily;
  /** Plain name, as a person would say it. Not a legal label. */
  name: string;

  /**
   * "authored" — structure complete and sources attached; content may be drafted.
   * "declared" — the type is recognised as real and nothing is written yet.
   */
  contentStatus: "authored" | "declared";

  /** The existing intake catalogue entry this extends, where there is one. */
  existingClaimTypeId?: string;

  /** Who is typically on each side. Descriptive, never an assumption about a user. */
  sides?: { bringing: string; defending: string };

  forum?: ForumVerdict;
  notices?: ProfileNotice[];

  /**
   * Limitation NOTES ONLY. A note may say a period exists and what it runs from.
   * It may never compute whether a user is out of time: that is applying law to
   * their facts, and `before-filing:limitation-period-may-have-passed` exists to
   * route them to someone who can.
   */
  limitationNote?: { because: RuleCitation; runsFrom: string };

  /** Documents, dates and names. Organisational only — CLAUDE.md §3. */
  gather?: string[];

  /** Corpus ids backing every statement a drafter may make about this type. */
  sourceIds?: string[];

  /** Corpus ids of other routes: regulators, tribunals, free services. */
  alternativeRouteSourceIds?: string[];

  /** Stage ids specific to this type where something has already gone wrong. */
  wentWrongStageIds?: string[];

  /** Approved clarifying-question ids that tell this type from its neighbours. */
  intakeQuestionIds?: string[];

  /**
   * How a real person describes it. SYNTHETIC, never shown to a user, used for
   * classifier context and eval stories. verifyClaimTypeScenarios asserts they
   * contain no personal data and cannot reach a render path.
   */
  scenarios?: string[];

  /**
   * Safety-first. Leads with police, victim services and the crisis messages
   * before any civil information. Assault, harassment, intimate-image abuse, elder
   * financial abuse, scams, anything touching a child's safety.
   */
  sensitive?: true;
};
