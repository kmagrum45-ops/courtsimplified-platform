/**
 * ██████████████████████████████████████████████████████████████████████
 * ██                                                                    ██
 * ██   DEV_ONLY -- NOT A REAL REVIEW. LOCAL TESTING ONLY.               ██
 * ██                                                                    ██
 * ██   This file exists ONLY so the site owner can click through the   ██
 * ██   guided-intake pipeline locally, on their own machine, to see    ██
 * ██   whether it works end to end. Flipping `status` to "reviewed"    ██
 * ██   here is NOT licensee/lawyer/paralegal review -- it is a         ██
 * ██   developer clicking a button. Nothing in this file has been      ██
 * ██   reviewed by anyone qualified to review it.                      ██
 * ██                                                                    ██
 * ██   MUST NEVER BE IMPORTED BY ANY PRODUCTION CODE PATH.             ██
 * ██   The only file allowed to import this is the /api/intake/        ██
 * ██   guided-turn route, and only when BOTH (a) the caller explicitly ██
 * ██   opts in with ?devPreview=true and (b) NODE_ENV !== "production" ██
 * ██   -- see that route's isDevPreviewAllowed() for the actual gate.  ██
 * ██   No other file in this codebase should ever import this one.    ██
 * ██                                                                    ██
 * ██   MUST BE DELETED BEFORE ANY REAL DEPLOYMENT OF THIS FEATURE.     ██
 * ██   Session 12 built this to prove the pipeline is clickable, not   ██
 * ██   to leave it lying around. Once questionBank.ts's real entries   ██
 * ██   go through actual review and get marked "reviewed" for real,    ██
 * ██   this entire file (and the devPreview mechanism in the route)    ██
 * ██   should be deleted, not kept "just in case."                     ██
 * ██                                                                    ██
 * ██████████████████████████████████████████████████████████████████████
 *
 * Contents: a copy of 8 real questions from questionBank.ts's
 * QUESTION_BANK -- enough to complete one full conversation for the
 * "unpaid debt / non-payment for services" claim type, the same scenario
 * every proof script in scripts/proofs/ has used since Session 3. Every
 * field except `status`/`reviewedAt` is copied verbatim from the real
 * bank -- this file does not invent, edit, or "improve" any question
 * text. QUESTION_BANK itself is never imported or modified by this file;
 * the objects below are independent literal copies.
 */

import type { IntakeQuestion } from "./questionBank";

export const DEV_ONLY_TEST_REVIEWED_BANK: IntakeQuestion[] = [
  // ---------------------------------------------------------------- orientation
  {
    id: "sc-orient-when-happened",
    courtArea: "small-claims",
    text: "Roughly when did the situation that led to this claim happen?",
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    covers: ["important date"],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-orient-role",
    courtArea: "small-claims",
    text: "Are you the person or business bringing this claim, or the one responding to a claim?",
    answerType: "choice",
    choices: ["Bringing the claim (plaintiff)", "Responding to a claim (defendant)"],
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-orient-dispute-category",
    courtArea: "small-claims",
    text: "What kind of dispute is this?",
    answerType: "choice",
    choices: [
      "Unpaid money owed to you",
      "A contract or agreement dispute",
      "Property damage",
      "A loan or debt",
      "Work done or services provided (e.g. a contractor)",
      "A deposit that wasn't returned",
      "A consumer purchase problem",
      "A vehicle-related dispute",
      "Something said about you (defamation)",
      "Something else",
    ],
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },

  // ------------------------------------------------------------------ substance
  {
    id: "sc-amount-claimed",
    courtArea: "small-claims",
    text: "What is the total dollar amount you are claiming?",
    why:
      "Small Claims Court can only hear claims up to $50,000 (effective October 1, 2025), " +
      "excluding interest and costs -- if your amount is higher, this may not be the right court.",
    sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
    answerType: "amount",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-filed",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "plaintiff" },
    text: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?",
    why: "This is the form that formally starts a Small Claims Court case.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-evidence-available",
    courtArea: "small-claims",
    text:
      "What evidence do you have to support your claim (documents, photos, messages, receipts, " +
      "witnesses)?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-remedy-sought",
    courtArea: "small-claims",
    text: "What outcome are you asking the court to order?",
    examples: [
      "Payment of a specific amount of money",
      "Return of property or its value",
      "Payment for repair costs or other documented losses",
      "Another outcome — describe it in your own words",
    ],
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },

  // ------------------------------------------------------------------ sensitive
  {
    id: "sc-safety-check",
    courtArea: "small-claims",
    text:
      "Is there anything about your safety, or the other party's behaviour toward you, that we " +
      "should know before continuing?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: true,
    phase: "sensitive",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
];
