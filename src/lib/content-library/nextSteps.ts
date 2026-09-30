/**
 * Next-step content blocks, keyed by pathway and stage.
 *
 * *** WHY THIS FILE EXISTS ***
 *
 * `analysis.nextBestActions` was model output. It flowed through
 * `buildSummary()` into `context.summary` and from there into
 * `documentGenerationEngine.ts`, which pushed it into a document the user
 * downloads. That is AI-written procedural content delivered to a user without
 * human review — the clearest breach of the LSO A2I policy in the codebase
 * (docs/lso-ai-audit.md, finding B-4).
 *
 * The model now returns only a STAGE CODE from a fixed enum. This catalogue
 * supplies the words. Nothing the model writes reaches a user.
 *
 * *** WHERE THE TEXT CAME FROM ***
 *
 * Small Claims blocks restate requirements already sourced in this codebase,
 * each citing the rule in O. Reg. 258/98 vendored verbatim under
 * docs/sources/oreg-258-98-cited-rules.txt. They are assembled from existing
 * building blocks, not newly authored.
 *
 * Every other pathway and stage carries an explicit
 * `[NEEDS LICENSEE REVIEW: ...]` placeholder. Family and Civil have no
 * equivalent sourced next-step content in the codebase, and inventing it here
 * is exactly what this work exists to stop. A placeholder that says so is
 * honest; plausible prose would not be.
 *
 * *** NOTHING HERE IS LICENSEE-APPROVED YET ***
 *
 * Every block starts unapproved. `licenseeReview.ts` tracks sign-off
 * separately, and `REQUIRE_APPROVED_CONTENT` will gate serving when it is
 * turned on before launch.
 */

export type NextStepBlock = {
  /** Stable id. Also the id the review packet and approvals use. */
  id: string;
  pathway: "small-claims" | "family" | "civil";
  /** Matches UniversalStage in app/builder/_components/builderTypes.ts. */
  stage: string;
  /** The heading shown above the steps. */
  title: string;
  /** The text a user reads. Rendered verbatim; never model-generated. */
  text: string;
  sourceUrl: string;
};

const PLACEHOLDER = (what: string) => `[NEEDS LICENSEE REVIEW: ${what}]`;

export const NEXT_STEP_BLOCKS: NextStepBlock[] = [
  // ---------------------------------------------------------- Small Claims
  {
    id: "next:small-claims:starting-case",
    pathway: "small-claims",
    stage: "starting-case",
    title: "Starting your claim",
    text:
      "An action is started by filing a Plaintiff's Claim (Form 7A) with the clerk, together with a copy for each defendant. A copy for each defendant is not required if the claim is filed electronically (r. 7.01 (1), (1.1)).\n\n" +
      "The claim must be served on the defendant within six months after the date it is issued. The court may extend that time, before or after the six months has passed (r. 8.01 (2)).\n\n" +
      "Service is proved by an Affidavit of Service (Form 8A), or by a lawyer or paralegal's Certificate of Service (Form 8B) where that licensee served it, or caused it to be served, and is satisfied service was effected (r. 8.09.1).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:responding",
    pathway: "small-claims",
    stage: "responding",
    title: "Responding to a claim",
    text:
      "A defendant who wishes to dispute a claim must, within 20 days of being served, serve a Defence (Form 9A) on every other party and file it with the clerk, with proof of service (r. 9.01).\n\n" +
      "Proof of service is an Affidavit of Service (Form 8A) or a lawyer or paralegal's Certificate of Service (Form 8B) (r. 8.09.1).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:already-started",
    pathway: "small-claims",
    stage: "already-started",
    title: "Where the case stands",
    text:
      "If no defence has been filed in time, the plaintiff may ask the clerk to note the defendant in default. The clerk requires a request to note in default (which may be made in Form 9B) and proof that the claim was served within the court's territorial division (r. 11.01 (1)).\n\n" +
      "If every defendant was served outside that territorial division, no defendant can be noted in default until an Affidavit for Jurisdiction (Form 11A) is filed with the clerk, or the point is proved before a judge (r. 11.01 (3)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:conference",
    pathway: "small-claims",
    stage: "conference",
    title: "Before the settlement conference",
    text:
      "Documents not already attached to the claim or defence must be served and filed at least 14 days before a settlement conference.\n\n" +
      "A List of Proposed Witnesses (Form 13A) must be served at least 14 days before the settlement conference.",
    sourceUrl:
      "https://www.ontario.ca/document/guide-procedures-small-claims-court/getting-ready-court",
  },
  {
    id: "next:small-claims:motion",
    pathway: "small-claims",
    stage: "motion",
    title: "Bringing a motion",
    text:
      "A motion is made by a notice of motion and supporting affidavit (Form 15A).\n\n" +
      "It must be served on every party who has filed a claim, and any defendant not noted in default, at least seven days before the hearing date, and filed with proof of service at least three days before the hearing date (r. 15.01 (1), (3)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:trial",
    pathway: "small-claims",
    stage: "trial",
    title: "Preparing for trial",
    text:
      "Documents not already attached to the claim or defence must be served and filed at least 30 days before the trial date.\n\n" +
      "Service of a summons to witness, and the payment or tender of attendance money, may be proved by an Affidavit of Service (Form 8A) or a lawyer or paralegal's Certificate of Service (Form 8B) (r. 18.03 (4)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:enforcement",
    pathway: "small-claims",
    stage: "enforcement",
    title: "Enforcing an order",
    text:
      "An order for the payment or recovery of money may be enforced by a writ of seizure and sale of personal property (Form 20C) under rule 20.06, a writ of seizure and sale of land (Form 20D) under rule 20.07, and garnishment under rule 20.08, and a further order as to payment may be made after an examination (r. 20.03).\n\n" +
      "If there is default under the order, the clerk of a court in the territorial division where the debtor lives or carries on business will, at the creditor's request, issue a notice of examination (Form 20H), supported by an affidavit for enforcement request (Form 20P) (r. 20.10 (1), (2)).\n\n" +
      "To enforce at another court location, the clerk will, at the creditor's request supported by Form 20P stating the amount still owing, issue a certificate of judgment (Form 20A) to the clerk at that location (r. 20.04 (1)).\n\n" +
      "The court may stay enforcement, and may vary the times and proportions in which money is to be paid if it is satisfied that the debtor's circumstances have changed (r. 20.02 (1)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:urgent",
    pathway: "small-claims",
    stage: "urgent",
    title: "When time is short",
    text:
      "The court may lengthen or shorten any time set by the rules or by an order, on such terms as are just (r. 3.02 (1)). A time for serving or filing a document can also be lengthened or shortened by filing the consent of the parties (r. 3.02 (2)).\n\n" +
      "A party who has been noted in default, or has a default judgment against them, can make a motion to set it aside. The court may do so if it is satisfied that the party has a meritorious defence and a reasonable explanation for the default, and that the motion is made as soon as is reasonably possible (r. 11.06).\n\n" +
      "A motion is made by a notice of motion and supporting affidavit (Form 15A), with a hearing date obtained from the clerk before it is served (r. 15.01 (1), (2)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:not-sure",
    pathway: "small-claims",
    stage: "not-sure",
    title: "Not sure where you are",
    text:
      "If you are not sure what stage your case is at, that is a question a lawyer or paralegal can help with. Ontario's Small Claims Court guide says that if you wish to consult an Ontario lawyer or paralegal, you may contact the Law Society Referral Service, operated by the Law Society of Ontario. It can give you the name of a lawyer or paralegal in your area, who will provide a free initial consultation of up to 30 minutes to help determine your rights and options.\n\n" +
      "You can ask for a referral by completing the online request form at www.lawsocietyreferralservice.ca.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment",
  },

  // ---------------------------------------------------------------- Family
  ...(["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"] as const).map(
    (stage): NextStepBlock => ({
      id: `next:family:${stage}`,
      pathway: "family",
      stage,
      title: "Next steps",
      text: PLACEHOLDER(
        `Family next steps for the "${stage}" stage. O. Reg. 114/99 rr. 2, 6, 8, 10, 14 and 17 are vendored in docs/sources/flr-stage-rules.txt, but no reviewed user-facing next-step wording exists for this pathway`,
      ),
      sourceUrl: "https://www.ontario.ca/laws/regulation/990114",
    }),
  ),

  // ----------------------------------------------------------------- Civil
  ...(["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"] as const).map(
    (stage): NextStepBlock => ({
      id: `next:civil:${stage}`,
      pathway: "civil",
      stage,
      title: "Next steps",
      text: PLACEHOLDER(
        `Superior Court (Civil) next steps for the "${stage}" stage. R.R.O. 1990, Reg. 194 rr. 16.09, 29.1.03, 30.03, 31.05.1, 48.02, 48.14 and 50.02 are vendored in docs/sources/rcp-cited-rules.txt, but no reviewed user-facing next-step wording exists for this pathway`,
      ),
      sourceUrl: "https://www.ontario.ca/laws/regulation/900194",
    }),
  ),
];

const BY_KEY = new Map(NEXT_STEP_BLOCKS.map((block) => [`${block.pathway}:${block.stage}`, block]));
const BY_ID = new Map(NEXT_STEP_BLOCKS.map((block) => [block.id, block]));

/** The block for a pathway and stage, or null. Never throws, never invents. */
export function nextStepBlockFor(pathway: string, stage: string): NextStepBlock | null {
  return BY_KEY.get(`${pathway}:${stage}`) ?? null;
}

/**
 * Resolve a block id the model returned.
 *
 * Returns null for anything not in the catalogue, which is what makes a
 * hallucinated or stale id harmless rather than user-visible.
 */
export function nextStepBlockById(id: string): NextStepBlock | null {
  return BY_ID.get(id) ?? null;
}

/** Whether a block is still an unreviewed placeholder. */
export function isPlaceholder(block: NextStepBlock): boolean {
  return block.text.startsWith("[NEEDS LICENSEE REVIEW:");
}
