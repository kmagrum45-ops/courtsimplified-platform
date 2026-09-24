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

/** Pathways a user can actually complete today. */
export const AVAILABLE_PATHWAYS = ["small-claims"] as const;

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
 * Exported so the output guard's allowlist and the tests read the same list the
 * component renders, rather than a second copy that can drift.
 */
export function allPathwayUnavailableMessages(): string[] {
  return (["family", "civil", "small-claims"] as KnownPathway[]).map(
    pathwayUnavailableMessage,
  );
}
