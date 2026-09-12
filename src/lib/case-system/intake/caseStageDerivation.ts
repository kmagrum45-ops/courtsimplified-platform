/**
 * GAP 4 from docs/INTAKE_ENTRY_POINT_DESIGN.md §1c: a defendant at a
 * settlement conference currently answers identically to one served
 * yesterday, because nothing records where the case actually is.
 *
 * DERIVED, NOT STORED, and that is the whole design. That spec's decision 2
 * concluded the regulation recognises EVENTS rather than a stage ladder:
 * Rule 7 is commencement, 8 service, 9 defence, 13 settlement conferences,
 * 20 enforcement. A case is not "at rule 13"; it has had a defence filed,
 * which makes a settlement conference due within 90 days under r. 13.01(3).
 *
 * So position is computed from facts the user already confirmed, and a
 * derived position cannot drift out of sync with the facts it came from —
 * which a stored ladder can, and which is how a case file starts lying.
 *
 * NOTHING HERE IS AN INFERENCE ENTERING THE FACT MODEL. Every input is a
 * user-confirmed boolean already in IntakeFacts. This function reads them
 * and returns a view; it writes nothing. That is the distinction
 * twentyDaysElapsed failed — that field STORED an AI-inferred legal
 * conclusion, and a downstream gate then relied on it.
 *
 * It also states no deadline. r. 13.01(3)'s 90 days and r. 9.01's 20 days
 * are real, but when they run from depends on service method and a counting
 * interaction the regulation never resolves (see
 * docs/SMALL_CLAIMS_RULES_MAP.md Part 3). The questions state those rules;
 * this file only says which stage the recorded facts describe.
 */

import type { IntakeFacts } from "./selectQuestions";

/**
 * A subset of UniversalStage (app/builder/_components/builderTypes.ts).
 *
 * DELIBERATELY LIMITED TO VALUES THE FORM-RECOMMENDATION DATA ACTUALLY
 * CARRIES. Audited 2026-09-12 against the 30 verified
 * legal_form_mapping_rules rows: they list only starting-case (5),
 * responding (11), already-started (5), conference (2) and motion (6).
 * UniversalStage's other four — trial, enforcement, urgent, not-sure —
 * appear in ZERO rows, so deriving one of them would silently produce no
 * verified forms. See resolveFormStageSupport() in betaProcedureAuthority.ts
 * for how that is now surfaced rather than swallowed.
 */
export type DerivedCaseStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "unknown";

export type CaseStageDerivation = {
  stage: DerivedCaseStage;
  /**
   * Which confirmed facts produced it, in plain terms. Carried so the
   * derivation can be shown to a user or a reviewer rather than appearing
   * as a bare label — nothing here should be a black box.
   */
  basis: string[];
};

function isTrue(value: unknown): boolean {
  return value === true;
}

function isFalse(value: unknown): boolean {
  return value === false;
}

/**
 * Derives where the case is from confirmed facts alone.
 *
 * Returns "unknown" whenever the facts do not settle it. That is the honest
 * answer far more often than a ladder would suggest, and it is the safe one:
 * "unknown" routes to the guided path rather than to a fast path built on a
 * position nobody confirmed.
 */
export function deriveCaseStage(facts: IntakeFacts): CaseStageDerivation {
  const role = facts.role;
  const claimFiled = facts.claimFiled;
  const claimServed = facts.claimServed;
  const defenceFiled = facts.defenceFiled;
  const basis: string[] = [];

  // A defence on file is the clearest marker either side can give, and it is
  // what r. 13.01(3) hangs the settlement conference off.
  if (isTrue(defenceFiled)) {
    basis.push("a defence has been filed");
    return { stage: "conference", basis };
  }

  if (role === "defendant") {
    if (isTrue(claimServed)) {
      basis.push("you were served with a claim", "no defence has been filed yet");
      return { stage: "responding", basis };
    }
    // Told us they are defending, but service is unconfirmed. Do not guess —
    // whether they were served is exactly what the service-method question
    // exists to establish.
    basis.push("you described yourself as defending a claim", "whether you were served is not confirmed");
    return { stage: "unknown", basis };
  }

  if (isTrue(claimFiled)) {
    if (isTrue(claimServed)) {
      basis.push("a claim has been filed", "the claim has been served");
      return { stage: "already-started", basis };
    }
    if (isFalse(claimServed)) {
      basis.push("a claim has been filed", "it has not been served yet");
      return { stage: "already-started", basis };
    }
    basis.push("a claim has been filed");
    return { stage: "already-started", basis };
  }

  if (isFalse(claimFiled)) {
    basis.push("nothing has been filed with the court yet");
    return { stage: "starting-case", basis };
  }

  return { stage: "unknown", basis: ["not enough confirmed facts to say"] };
}
