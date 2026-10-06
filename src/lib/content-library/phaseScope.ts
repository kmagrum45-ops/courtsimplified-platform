/**
 * What CourtSimplified covers in phase 1, and what it says about the rest.
 *
 * *** THE DECISION ***
 *
 * Phase 1 is Ontario Small Claims Court only. Family and Civil (Superior
 * Court) are not available yet.
 *
 * *** WHY THIS FILE EXISTS RATHER THAN A FLAG IN THREE COMPONENTS ***
 *
 * Both other paths were already reachable and already half-built. Under the
 * LSO rewrite their next-step catalogues became placeholders, because there was
 * no reviewed procedural wording for them and inventing some was the thing the
 * rewrite existed to stop. That left a worse outcome than either extreme: a
 * user could complete a Family intake and be shown NOTHING where the next steps
 * should be — a blank space that reads as "we have no advice for you" rather
 * than "we do not cover this yet".
 *
 * An empty screen is not an honest answer. This is.
 *
 * *** THE PLACEHOLDER BLOCKS STAY ***
 *
 * The eighteen Family and Civil `[NEEDS LICENSEE REVIEW: …]` next-step blocks
 * remain in `nextSteps.ts` as drafts, and remain in the review packet. They are
 * the shape of phase 2 and the record of which stages still need authored,
 * sourced wording. Deleting them would lose that and make the work look smaller
 * than it is. They are simply no longer reachable by a user, which is what the
 * gate below enforces.
 *
 * *** WHERE THE GATE IS APPLIED ***
 *
 *   - `HomeLocationGate` — before a user can start an unavailable path, and
 *     before the classifier can suggest switching to one.
 *   - `app/builder/page.tsx` — because `/builder?path=family` is reachable by
 *     URL and from a saved draft, so gating the front door alone would leave
 *     the side door open.
 *
 * Both render the same component from the same constants. A gate that says two
 * different things in two places is two gates.
 */

/*
 * *** OFFICIAL-FORM COMPLETION AND CLAIM DRAFTING ARE PAUSED ***
 *
 * Decided 2026-09-27 for the LSO A2I Stage 1 application. /api/generate-form
 * fills the fields of official court PDFs from a user's case data, and the
 * builder's Statement of Claim surface drafts claim particulars.
 * docs/REGULATORY_POSITION.md sections 6.4-6.5 identify these as the sharpest
 * exposure under Law Society Act s. 1(6)2.vii and s. 1(7)1, so they are out of
 * scope until the Law Society gives guidance. The application says so.
 *
 * While true: the route refuses before reading the request, the /forms page
 * shows FORM_COMPLETION_PAUSED_MESSAGE, and the builder does not render the
 * Statement of Claim surface. Asserted by `npm run test:form-completion-paused`.
 */
/*
 * UNPAUSED 2026-09-30 by the site owner for live testing ("Put everything on
 * live"). Set back to true to pause again; verifyFormCompletionPaused asserts
 * the paused behaviour whenever it is true.
 */
export const FORM_COMPLETION_PAUSED = false;

export const FORM_COMPLETION_PAUSED_MESSAGE =
  "Filling in official court forms is not available right now. You can find every Ontario court form, " +
  "free, on the Ontario Court Forms website, and complete it yourself.";

export const OFFICIAL_COURT_FORMS_URL = "https://ontariocourtforms.on.ca/en/";

/**
 * Whether sentences the AI wrote about a user's case are shown to them.
 *
 * ON, everywhere including production (site owner, 2026-09-29): the site has
 * no users yet and is being built the way it will run -- the full AI analysis
 * (risks, next actions, follow-up questions, element explanations) is live.
 *
 * The code-written alternative is kept, not deleted: set
 * AI_ANALYSIS_TEXT_TO_USERS=off (in Vercel or .env.local) and every sentence
 * comes from buildCodeWrittenCognition in courtSimplifiedBrain.ts instead --
 * the sourced claim-type catalogue and the fact-specific engines, with the
 * model making structured choices only. That is the configuration the LSO A2I
 * answers (2026-09-28) describe for when real users are admitted, for any part
 * the Law Society has not approved.
 *
 * Asserted by `npm run test:no-model-text-to-users`.
 */
export function aiAnalysisTextToUsers(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.AI_ANALYSIS_TEXT_TO_USERS !== "off";
}

/**
 * "The law behind this": the provisions the person's analysis rests on, found
 * for their story by meaning-based retrieval and cited by the analysis with a
 * quote checked against the official text (retrieval/storyRetrieval.ts,
 * groundedCognition.verifiedSourceIds). Shown verbatim with the citation and
 * the official link -- applying the law to the user's situation, which
 * CLAUDE.md section 2 ("guide like a lawyer") allows, never a view on the
 * outcome. Its own switch, per that section, so it can be turned off for real
 * users until the A2I approval covers it: APPLIED_LAW=off.
 */
export function appliedLawEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.APPLIED_LAW !== "off";
}

/** Pathways a user can actually complete today. */
/*
 * All three since 2026-09-30 (site owner: "Put everything on live"), now that
 * the civil and family libraries and next steps are written and verified. To
 * close a pathway again, remove it here; every gate reads this list.
 */
export const AVAILABLE_PATHWAYS = ["small-claims", "family", "civil"] as const;

export type AvailablePathway = (typeof AVAILABLE_PATHWAYS)[number];

/** Every pathway the product has a route for, available or not. */
export type KnownPathway = "small-claims" | "family" | "civil";

/*
 * Returns a plain boolean, NOT a type predicate, and that is deliberate.
 *
 * As a predicate it narrowed courtPath to "small-claims" after the gate, and
 * TypeScript then correctly reported every downstream `courtPath === "family"`
 * branch in the builder as unreachable. Those branches are phase 2: the Family
 * and Civil intakes still exist, still compile and still have their tests, they
 * are simply not routed to. Narrowing would have forced deleting them to make
 * the build pass, which is a much larger change than gating a route and would
 * throw away the work phase 2 restores.
 */
export function isPathwayAvailable(pathway: string): boolean {
  return (AVAILABLE_PATHWAYS as readonly string[]).includes(pathway);
}

/**
 * The plain name of a pathway, for the fixed message below.
 *
 * "Civil" alone is ambiguous to a self-represented person — Small Claims is a
 * civil court too. Named as the court it actually is.
 */
export const PATHWAY_LABELS: Record<KnownPathway, string> = {
  "small-claims": "Small Claims Court",
  family: "family court",
  civil: "Superior Court of Justice (civil)",
};

/**
 * FIXED TEXT. Not generated, not templated per user, not varied by facts.
 *
 * Says three things and stops: what we do cover, that we do not cover this yet,
 * and that not covering it is not a statement about their case. The last one
 * matters — a person turned away at the door can reasonably read it as "you
 * have no case", and they are often already worried about exactly that.
 */
export const PATHWAY_UNAVAILABLE_HEADING = "We don't cover this yet";

export function pathwayUnavailableMessage(pathway: KnownPathway): string {
  const label = PATHWAY_LABELS[pathway] ?? "this area";
  return (
    `CourtSimplified currently covers Ontario Small Claims Court only. We can't ` +
    `help with ${label} matters yet.\n\n` +
    `This is about what we have built so far. It is not a comment on your ` +
    `situation or on whether you have a case — we are not able to assess that. ` +
    `The services below can help you find someone who can.`
  );
}

/**
 * Every fixed string this module can put on a screen.
 *
 * *** THE COMMENT HERE USED TO BE FALSE. CORRECTED 2026-09-23. ***
 *
 * It said "exported so the output guard's allowlist and the tests read the
 * same list the component renders". Neither `outputGuard.ts` nor
 * `contentInventory.ts` imports it, and `PathwayUnavailable.tsx` renders the
 * message directly — so it was a dead export whose own documentation asserted
 * a coverage that did not exist. Found by independent review.
 *
 * It is kept because it is the right shape for the fix: when these messages go
 * into the content library, this is the function that enumerates them for the
 * inventory. Until then it is used only by `verifyPhaseScope`, and this
 * comment says so rather than implying more.
 */
export function allPathwayUnavailableMessages(): string[] {
  return (["family", "civil", "small-claims"] as KnownPathway[]).map(
    pathwayUnavailableMessage,
  );
}

/**
 * "Explain in plain words" on each provision under "The law behind this":
 * model wording about the law, shown only after an independent second model
 * call and code have checked it against the provision
 * (retrieval/explainProvision.ts). Its own switch, per CLAUDE.md section 2,
 * so it can be turned off for real users until the A2I approval covers it:
 * PLAIN_EXPLANATIONS=off. It also honours aiAnalysisTextToUsers.
 */
export function plainExplanationsEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.PLAIN_EXPLANATIONS !== "off" && aiAnalysisTextToUsers(env);
}

/**
 * The research step before the analysis (retrieval/researchStory.ts): the
 * model chooses the legal questions for the story, reads what the library
 * has for each, and names what it lacks; code checks every quote. What the
 * person sees from it ("What we looked into") is the questions and the
 * provisions' own words. Its own switch, per CLAUDE.md section 2:
 * RESEARCH_STEP=off returns the analysis to single-pass retrieval.
 */
export function researchStepEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.RESEARCH_STEP !== "off";
}

/**
 * Follow-up questions written from the law the research step read
 * (retrieval/sourcedQuestions.ts), for any kind of case, each tied to a
 * quoted provision and checked by code and a second model call. Chosen by
 * the site owner 2026-10-05. Its own switch, per CLAUDE.md section 2:
 * SOURCED_QUESTIONS=off. Model-written text to users, so it also follows
 * AI_ANALYSIS_TEXT_TO_USERS, and it needs the research step.
 */
export function sourcedQuestionsEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.SOURCED_QUESTIONS !== "off" && aiAnalysisTextToUsers(env) && researchStepEnabled(env);
}

/**
 * "The law on your question" in the Court Assistant
 * (retrieval/researchQuestion.ts, /api/assistant/law): each question the
 * person asks is researched and answered with the provisions' own words and
 * verified quotes. Its own switch: ASSISTANT_LAW=off. It shows provisions,
 * so it also follows APPLIED_LAW, and it needs the research step.
 */
export function assistantLawEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.ASSISTANT_LAW !== "off" && appliedLawEnabled(env) && researchStepEnabled(env);
}
