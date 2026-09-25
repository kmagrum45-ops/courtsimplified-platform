/**
 * The whole pipeline: is this our court at all, and if so, where in it?
 *
 * *** WHY THESE ARE TWO CALLS AND NOT ONE ***
 *
 * The stage resolver was being asked to decide scope alongside its own job,
 * and it was bad at it. Chasing that with prompt edits made results oscillate
 * — one fix, one regression — which is the signature of asking a single call
 * to do two different things.
 *
 * `classifyCourtPath` was built for scope. It has a keyword pass, a model
 * pass, a forum registry, and its own suite. It already knew that a tenancy
 * dispute belongs to the Landlord and Tenant Board. Re-deriving that badly in
 * a second prompt was never going to beat it.
 *
 * So scope is decided first, by the component that owns it, and the stage
 * resolver only ever sees matters already established as Small Claims.
 *
 * *** WHAT IT COSTS ***
 *
 * Two model calls where there was one — and the first is often a keyword match
 * that makes no call at all. The right trade: routing somebody's eviction into
 * Small Claims procedure costs them weeks before anything corrects them.
 *
 * *** ONE FUNCTION, TWO CALLERS ***
 *
 * The API route and the eval both run this. An eval that measured a different
 * arrangement of the same parts would be measuring something nobody uses.
 */

import { classifyCourtPath } from "../intelligence/courtPathClassifier";
import type { OutOfScopeForum } from "../intelligence/outOfScopeForums";
import { createOpenAIClient } from "../openaiClient";
import {
  resolveFromModelOutput,
  stageCatalogueForPrompt,
  STAGE_RESOLVER_SYSTEM,
  type StageModelOutput,
  type StageResolution,
} from "./resolveStage";

/**
 * The same floor `HomeLocationGate` uses before it will redirect anybody.
 *
 * Duplicated deliberately rather than imported: that constant lives in a React
 * component, and a server pipeline importing a page component to borrow a
 * number is worse than two lines that agree. If they ever disagree, this one
 * is the conservative half — it decides whether we act on a scope call at all.
 */
export const SCOPE_CONFIDENCE_FLOOR = 0.6;

export type CasePosition =
  | {
      kind: "out-of-scope";
      /** Named when the classifier could say which forum. May be null. */
      forum: OutOfScopeForum | null;
      /** How sure the classifier was. Carried so a caller can soften wording. */
      confidence: number;
    }
  /*
   * *** A BOUNDARY WE ARE NOT ENTITLED TO DECIDE ***
   *
   * `courtPathClassifier` returns out-of-scope at confidence 0.3 for a story
   * that mentions a tenancy AND signals the tenancy has ended. That is not
   * hedging: a previous session confirmed the LTB / Small Claims line for a
   * FORMER tenant is unsourceable from ontario.ca, ontariocourts.ca or
   * ontariocourtforms.on.ca, and the low confidence is how the code says so.
   * `HomeLocationGate` already refuses to redirect below 0.6.
   *
   * Reading that as "out of scope" would turn somebody away from a claim that
   * may well be theirs to bring. Reading it as "in scope" would march them
   * into Small Claims procedure for what may be an LTB matter. Both assert the
   * thing nobody could source.
   *
   * So it is its own outcome, and the honest one: we say which two places it
   * might belong and who can tell them.
   */
  | {
      kind: "boundary-unclear";
      forum: OutOfScopeForum | null;
      confidence: number;
      reasoning: string;
      /**
       * The Small Claims answer is still produced and still shown.
       *
       * A dead end here would be safe and useless: somebody with a money claim
       * that probably IS theirs to bring gets nothing, because of a line
       * nobody could source. So they get the guidance AND the caveat, and can
       * decide with better information than we have.
       */
      stage: StageResolution;
    }
  | { kind: "in-scope"; stage: StageResolution };

export type PositionOptions = {
  model?: string;
  /** Test seam: keeps the scope pass offline. */
  allowExternalCognition?: boolean;
  /**
   * The court path already established for this case, when there is one.
   *
   * *** WHY THIS MATTERS MORE THAN IT LOOKS ***
   *
   * `classifyCourtPath` answers "what kind of problem do you have" for somebody
   * describing it fresh. It is not built for "where is my existing case", and
   * running it on that input produces exactly the errors measured: "he was
   * served last Tuesday by a process server, I have the affidavit" came back
   * as a Landlord and Tenant Board matter, and "he moved out of the address on
   * the lease and the new tenant says she doesn't know him" — a SERVICE
   * problem — tripped the tenancy keywords.
   *
   * By the time somebody asks where their case stands, the court path was
   * settled at intake and stored on the case. Re-deriving it from a fragment
   * about service is asking a question that has already been answered, badly.
   */
  knownCourtPath?: string | null;
};

/**
 * A boundary caveat is only worth saying when there is guidance to qualify.
 *
 * Vague stories were coming back "this might be a tenancy matter" when the
 * stage was also unknown. Two admissions of uncertainty stacked on each other
 * is not more honest, it is harder to act on: the person is told which two
 * forums it might be AND that we cannot say where they are. UNKNOWN already
 * says the useful half and carries the clarifying question.
 */
function withoutEmptyCaveat(position: CasePosition): CasePosition {
  if (position.kind !== "boundary-unclear") return position;
  if (position.stage.kind === "suggested") return position;
  return { kind: "in-scope", stage: position.stage };
}

/**
 * Scope first, then stage.
 *
 * A failure anywhere lands in the stage resolver's UNKNOWN, never in a
 * confident answer — the whole point of the design being replaced.
 */
export async function resolveCasePosition(
  story: string,
  options: PositionOptions = {},
): Promise<CasePosition> {
  return withoutEmptyCaveat(await resolveCasePositionInner(story, options));
}

async function resolveCasePositionInner(
  story: string,
  options: PositionOptions,
): Promise<CasePosition> {
  /*
   * A case whose path is already settled does not get re-classified.
   *
   * This is the ordinary path in the product: the builder holds `court_path`
   * from intake. Skipping the call is not an optimisation — it stops a
   * classifier built for fresh problem descriptions from second-guessing a
   * decision already made on better information.
   */
  if (options.knownCourtPath === "small-claims") {
    return { kind: "in-scope", stage: await resolveStageWithModel(story, options.model) };
  }

  const scope = await classifyCourtPath({
    story,
    allowExternalCognition: options.allowExternalCognition,
  });

  if (scope.primaryPath === "out-of-scope") {
    /*
     * Below the floor the classifier is telling us it could not resolve the
     * boundary, not that the matter belongs elsewhere. Acting on it either way
     * would assert what it declined to.
     */
    if (scope.confidence < SCOPE_CONFIDENCE_FLOOR) {
      return {
        kind: "boundary-unclear",
        forum: scope.outOfScopeForum,
        confidence: scope.confidence,
        reasoning: scope.reasoning,
        stage: await resolveStageWithModel(story, options.model),
      };
    }
    return { kind: "out-of-scope", forum: scope.outOfScopeForum, confidence: scope.confidence };
  }

  /*
   * *** "civil" IS NOT OUT OF SCOPE, AND TREATING IT AS SUCH BROKE THINGS ***
   *
   * An earlier version returned out-of-scope for `civil` and `family`, on the
   * reasoning that this map models Small Claims only. Stage accuracy fell from
   * 97% to 74%, because `classifyCourtPath` returns "civil" for ordinary
   * Small Claims stories: a $4,200 contractor claim, a slip on a sidewalk, a
   * defendant wanting to counterclaim. The Small Claims / Civil line is
   * MONETARY, and the classifier usually has no amount to go on.
   *
   * Family is a genuinely different court and stays out.
   *
   * Civil is let through deliberately. The stage map already handles the real
   * civil case properly — `before-filing:claim-exceeds-small-claims-limit`
   * exists precisely for a claim over $50,000 — so a story that is truly
   * Superior Court lands on a stage that says so, which is better than a
   * refusal built on a classification that was never reliable here.
   */
  if (scope.primaryPath === "family") {
    return { kind: "out-of-scope", forum: null, confidence: scope.confidence };
  }

  /*
   * "mixed" is the classifier saying the story spans two areas.
   *
   * That is the same admission `boundary-unclear` exists for, reached by a
   * different route — and it is what a former tenant's money claim produces:
   * part tenancy, part debt. Collapsing it to "in scope" would assert the
   * placement the classifier explicitly declined to make.
   *
   * The Small Claims guidance is still produced, for the same reason as the
   * low-confidence path: a dead end would be safe and useless.
   */
  if (scope.primaryPath === "mixed") {
    return {
      kind: "boundary-unclear",
      forum: scope.outOfScopeForum,
      confidence: scope.confidence,
      reasoning: scope.reasoning,
      stage: await resolveStageWithModel(story, options.model),
    };
  }

  return { kind: "in-scope", stage: await resolveStageWithModel(story, options.model) };
}

/** The stage pass on its own, for callers that have already settled scope. */
export async function resolveStageWithModel(
  story: string,
  model = "gpt-4o-mini",
): Promise<StageResolution> {
  try {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      seed: 1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: STAGE_RESOLVER_SYSTEM },
        {
          role: "user",
          content: `STAGES:\n\n${stageCatalogueForPrompt()}\n\nTHE CASE:\n\n${story}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return resolveFromModelOutput(content ? (JSON.parse(content) as StageModelOutput) : null);
  } catch {
    return resolveFromModelOutput(null);
  }
}
