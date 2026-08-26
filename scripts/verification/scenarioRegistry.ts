export type CourtPath = "small-claims" | "family" | "civil";

export type RegistryScenario = {
  id: string;
  courtPath: CourtPath;
  intakeFacts: Record<string, unknown>;
  stage: string;
  role: string;
  filedServiceFacts: string[];
  evidenceFacts: string[];
  intentionalGaps: string[];
  contradictions: string[];
  expectedPossibleIssues: string[];
  expectedNextQuestion: string;
  expectedEvidenceGuidance: string[];
  expectedProceduralStatus: string[];
  reviewRequiredBoundaries: string[];
  prohibitedOutputWording: string[];
  expectedWorkflowAction: "organize-evidence" | "review-intake-details" | "check-official-forms-and-procedure";
  expectedPrivacySessionBehavior: string;
};

export const REGISTRY_SEED = 20260814;
const prohibited = ["fallback", "configuration", "Master Case ID", "Save: Waiting", "analysis unavailable", "will win", "entitled to damages"];
const stages = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "not-sure", "service-uncertain", "default-review"];

function idPrefix(area: CourtPath) { return area === "small-claims" ? "SC" : area === "family" ? "FAM" : "CIV"; }

function baseScenario(area: CourtPath, index: number): RegistryScenario {
  const stage = stages[index % stages.length];
  const role = area === "small-claims" ? (index % 2 ? "Plaintiff / claimant" : "Defendant / responding party") : area === "family" ? (index % 2 ? "applicant" : "respondent") : (index % 2 ? "plaintiff" : "defendant");
  const defaultReview = area === "small-claims" && index === 0;
  const adultAdoption = area === "family" && index === 0;
  const minorAdoption = area === "family" && index === 1;
  // Real facts, not filler: a senior executive dismissed without cause by the
  // Canadian subsidiary of a US parent, at a compensation level that pushes
  // Bardal-factor reasonable notice damages far past the $50,000 Small Claims
  // limit. Exercises three things: (1) the civil-path classifier reaches real
  // domains (breach-of-contract / employment) instead of "unknown" — verified
  // against the live engine before this was written, not assumed; (2) the
  // shared over-limit check (courtSimplifiedBrain.detectOverLimitClaimAmount)
  // fires on this amount regardless of which court path reads it, confirmed by
  // probing the Small Claims engine with the same figure; (3) the narrative
  // itself states which entity is the correct defendant, since no engine logic
  // resolves parent-versus-subsidiary -- that has to live in the facts a user
  // records, so reviewRequiredBoundaries and intentionalGaps say so explicitly.
  //
  // Citations verified by independent web search, 2026-08-23, not assumed:
  //   Bardal v. Globe & Mail Ltd., 1960 CanLII 294 (ON SC), p. 145 -- "the
  //   reasonableness of the notice must be decided with reference to each
  //   particular case, having regard to the character of the employment, the
  //   length of service of the servant, the age of the servant and the
  //   availability of similar employment, having regard to the experience,
  //   training and qualifications of the servant." Confirmed word-for-word
  //   against the original judgment text via CanLII Connects.
  //   Adelman v. IBM Canada Limited, 2026 ONSC 420 -- a long-service executive
  //   (Executive Director, Strategic Partnerships, 59, ~18.5 years' service, no
  //   termination provisions in his employment agreement) was awarded 24
  //   months' notice and $682,151.18 in total damages. Cross-confirmed via two
  //   independent sources (BLG's case summary and an HR Reporter court-document
  //   PDF). This scenario's facts (20+ years, age 58) are longer-tenured than
  //   Adelman's real 18.5 years, so citing it as support for the high end of a
  //   17-24 month range is, if anything, conservative -- Adelman got the full
  //   24 months at fewer years of service. The stated $700,000-$1,000,000 claim
  //   range is arithmetically consistent with the $500,000 stated salary over
  //   17-24 months (17mo ~$708k, 24mo ~$1,000,000), not a rounded guess.
  const wrongfulDismissal = area === "civil" && index === 0;
  // The deliberately opposite trigger from wrongfulDismissal: modest damages
  // (a few thousand dollars, nowhere near the $50,000 Small Claims limit), but
  // the remedy sought -- a court order requiring an encroaching shed and tree
  // roots to be removed, not primarily a money judgment -- is one Small Claims
  // Court cannot grant regardless of amount. Verified against the live engine
  // before this was written: civilCaseTypes correctly reaches "property-damage"
  // (there is no "nuisance" or "trespass to land" domain anywhere in the
  // codebase, confirmed by exhaustive grep, so property-damage is the closest
  // and only fitting classification), and the injunction-jurisdiction warning
  // built alongside this scenario fires when the same facts are submitted to
  // Small Claims and stays silent on an ordinary money-only property claim.
  // Real regression coverage for both directions lives in
  // verifyThreeAreaContract.ts (verifyInjunctionJurisdictionWarning), which
  // pulls this scenario's intakeFacts by id and drives the real routes rather
  // than asserting against fields nothing executes.
  //
  // Statutory basis for the warning's "Small Claims Court generally cannot
  // grant injunctions" claim, verified by independent web search, 2026-08-23,
  // not assumed:
  //   Courts of Justice Act, R.S.O. 1990, c. C.43, s. 23(1) -- limits Small
  //   Claims Court's jurisdiction to (a) actions for payment of money up to the
  //   prescribed amount and (b) actions for recovery of possession of personal
  //   property up to the prescribed amount. It is an exhaustive grant, not a
  //   list of examples.
  //   Courts of Justice Act, s. 96(3) -- only the Court of Appeal and the
  //   Superior Court of Justice may grant equitable relief "unless otherwise
  //   provided"; s. 23(1) only otherwise provides for money and personal
  //   property, not injunctions.
  //   Grover v. Hodgins, 2011 ONCA 72 -- Court of Appeal for Ontario authority
  //   (Epstein J.A.) confining Small Claims Court's equitable jurisdiction
  //   under s. 96(3) to payment of money and return of personal property within
  //   its monetary limit. The judgment establishes that scope-of-jurisdiction
  //   principle rather than using the word "injunction" itself; the "generally
  //   cannot grant injunctions" framing is the standard practitioner-commentary
  //   corollary of that holding plus s. 23(1), not a direct quotation from the
  //   case -- confirmed via a second, independent source (WeirFoulds LLP's case
  //   summary) before being treated as settled, since the first source found
  //   overstated it as a direct holding.
  const neighborInjunction = area === "civil" && index === 1;
  // A realistic-but-close-to-the-boundary Small Claims contract case: a $15,000
  // deposit plus $33,500 to complete and fix substandard work, $48,500 total --
  // near but under the $50,000 limit, the amount a real kitchen renovation gone
  // wrong actually produces, not a round test number. Boundary behaviour was
  // probed directly before this was written, not assumed from reading the
  // comparison in courtSimplifiedBrain.ts: $50,000 exactly and $49,999 both stay
  // silent, $50,001 fires, and the same holds for un-comma'd amounts ("50000",
  // "49999", "50001"), confirming the historical truncation bug (a prior
  // session's 064fd55, which read "85000" as 850) has not resurfaced. $48,500
  // itself was confirmed silent.
  //
  // Classification required a real fix to this scenario's own first draft, not
  // just to the engine: contract detection in intakeNormalizationEngine.ts
  // requires hasAgreementFacts AND hasObligationFacts AND hasNonPerformanceFacts
  // together, and a narrative that only implies the contractor's obligation
  // contextually -- "the contractor performed substandard work" -- left
  // hasObligationFacts false and classified as "unknown". Stating the
  // obligation explicitly ("the contractor was required to complete the
  // renovation") is what a complete, honest narrative would include anyway, and
  // fixed it: detectedClaimTypes reaches ["contract"], confirmed live, not
  // "unknown". "Negligent workmanship" as a distinct LegalDomain was
  // investigated and deliberately not chased: it requires literal words like
  // "duty of care" or "foreseeable" that no real homeowner would use, so
  // forcing them in would fabricate a signal rather than describe the case;
  // breach of contract is the real, natural theory this fact pattern supports.
  const contractorRenovation = area === "small-claims" && index === 1;
  const id = defaultReview ? "SC-DEFAMATION-FILED-SERVED-DEFAULT-001" : adultAdoption ? "FAM-ADOPTION-ADULT-001" : minorAdoption ? "FAM-ADOPTION-MINOR-CHILD-PROTECTION-001" : wrongfulDismissal ? "CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001" : neighborInjunction ? "CIV-PROPERTY-INJUNCTION-NEIGHBOR-001" : contractorRenovation ? "SC-CONTRACTOR-INCOMPLETE-RENOVATION-001" : `${idPrefix(area)}-${String(index + 1).padStart(3, "0")}`;
  const facts = defaultReview
    ? "Synthetic alleged false text messages were communicated to an uncle and father."
    : adultAdoption
      ? "A 20-year-old adult wishes to be adopted by a long-term step-parent after living with her mother and step-parent for approximately 15 years. The biological father has not been involved for years and cannot currently be located."
      : minorAdoption
        ? "A proposed adoption involves a minor and an existing child-protection file that requires review."
        : wrongfulDismissal
          ? "A Vice President with over 20 years of service and age 58 was dismissed without cause by Northbridge Analytics Canada ULC, the Canadian subsidiary that was her direct employer of record. The US parent company, Northbridge Analytics Holdings Inc., was never her employer and is not the correct party to name. Annual base salary was $500,000. The employment contract contains no enforceable termination clause limiting notice below the common law standard, so Bardal-factor reasonable notice applies given age, length of service, character of employment, and availability of similar employment. At a 17-24 month notice period, this represents a claim in the range of roughly $700,000-$1,000,000, dramatically over the Ontario Small Claims Court limit. The employer's initial severance offer reflects only a fraction of what that notice period would support."
          : neighborInjunction
            ? "A homeowner's neighbor built a shed that encroaches significantly onto the homeowner's property, crossing the boundary line by several feet. Separately, the neighbor has a large tree whose roots are causing ongoing property damage to the homeowner's foundation and continuing to grow. The homeowner is not primarily seeking money for the damage already caused; the homeowner wants a court order requiring the encroaching shed to be removed and requiring the tree to be removed or the roots addressed so the ongoing damage stops. Total out-of-pocket costs so far are a few thousand dollars for a foundation inspection."
            : contractorRenovation
              ? "A homeowner paid a $15,000 deposit to a contractor for a kitchen renovation under a signed contract. Under the contract, the contractor was required to complete the renovation by an agreed date. The contractor performed substandard and incomplete work and then stopped responding to calls and messages. The homeowner hired a second contractor to complete the renovation and fix the substandard work, at a cost of $33,500. The claim is for the original deposit plus the cost of completion and remediation by the second contractor."
              : `Synthetic ${area} matter ${index + 1}; saved facts require a focused review.`;
  const filedServiceFacts = defaultReview ? ["Plaintiff’s Claim filed and served", "Affidavit of Service filed with the court"] : [];
  const expectedIssue = defaultReview ? "Possible defamation or reputational-harm issue to review" : adultAdoption ? "Possible adult step-parent adoption process to review" : minorAdoption ? "Review required: minor adoption and child-protection circumstances" : wrongfulDismissal ? "Possible wrongful dismissal / employment issue to review: dismissal without cause, common law reasonable notice, and adequacy of the severance offer" : neighborInjunction ? "Possible property issue to review: encroaching structure and root damage, with removal (not money) as the primary remedy sought" : contractorRenovation ? "Possible contract issue to review: breach of the renovation contract through substandard and incomplete work" : `Possible issue to review: synthetic ${area} issue ${index + 1}`;
  return {
    id,
    courtPath: area,
    intakeFacts: {
      province: index === 28 ? "not-sure" : "Ontario",
      city: wrongfulDismissal ? "Toronto" : neighborInjunction ? "Hamilton" : contractorRenovation ? "London" : "Ottawa",
      facts,
      amountClaimed: contractorRenovation ? "$48,500" : area === "small-claims" ? "$10,000" : wrongfulDismissal ? "$850,000" : neighborInjunction ? "$3,000" : undefined,
      issueLabels: adultAdoption || minorAdoption ? ["Adoption — step-parent, relative, or adult adoption"] : wrongfulDismissal ? ["Employment-related civil issue"] : neighborInjunction ? ["Property / land / possession issue", "Injunction / urgent court order"] : undefined,
    },
    stage: defaultReview ? "already-started" : wrongfulDismissal || neighborInjunction || contractorRenovation ? "starting-case" : stage,
    role: adultAdoption ? "step-parent applicant" : wrongfulDismissal || neighborInjunction ? "plaintiff" : contractorRenovation ? "Plaintiff / claimant" : role,
    filedServiceFacts,
    evidenceFacts: defaultReview ? ["screenshots/message threads"] : adultAdoption ? ["family relationship and living-history information"] : wrongfulDismissal ? ["employment contract", "offer letter", "termination letter", "severance offer and calculation", "pay records establishing salary"] : neighborInjunction ? ["property survey", "photos of the encroaching structure and roots", "foundation inspection report"] : contractorRenovation ? ["signed renovation contract", "deposit payment record", "photos of the substandard and incomplete work", "second contractor's quote and invoice"] : [],
    intentionalGaps: defaultReview ? ["Defence status"] : adultAdoption ? ["Adult person’s agreement"] : minorAdoption ? ["Child-protection circumstances"] : wrongfulDismissal ? ["Mitigation efforts (job search / re-employment status) since dismissal", "Exact corporate name and registered status of the Canadian employer of record"] : neighborInjunction ? ["Whether the neighbor disputes the boundary/survey", "Whether the tree and roots are entirely on the neighbor's property or crossing the line"] : contractorRenovation ? ["Exact agreed completion date and whether it passed before the contractor stopped responding", "Whether any written notice was given to the original contractor before hiring the second one"] : ["important date"],
    contradictions: wrongfulDismissal || neighborInjunction || contractorRenovation ? [] : index % 10 === 0 ? ["Synthetic conflicting date requires review"] : [],
    expectedPossibleIssues: [expectedIssue],
    // FOLLOW-UP (logged, not fixed, in the August 2026 audit): wrongfulDismissal's
    // "Has anything already been filed?" is a generic procedural fallback, not
    // tailored to this scenario -- it shares wording with neighborInjunction only
    // because both reused the same default rather than being written for the
    // specific case. It should instead be rewritten to match wrongfulDismissal's own
    // intentionalGaps above (mitigation efforts; the correct corporate defendant),
    // which are exactly what a lawyer would ask first for a $700k+ claim and what
    // the rendered overview currently asks neither of (see the qualityChecks.ts
    // positive-check finding this scenario now produces).
    expectedNextQuestion: defaultReview ? "Has the defendant filed a Defence?" : adultAdoption ? "Does the adult person freely agree to the proposed adoption?" : wrongfulDismissal || neighborInjunction ? "Has anything already been filed?" : contractorRenovation ? "What evidence proves each major fact?" : "What important fact should be confirmed next?",
    expectedEvidenceGuidance: defaultReview ? ["full message threads", "sender", "recipients", "dates/context", "falsity", "harm"] : adultAdoption ? ["full legal names", "Ontario residence", "living-history", "written wishes", "biological father", "reasonable efforts", "child-protection documents"] : wrongfulDismissal ? ["employment contract and any termination clause", "compensation records (salary, bonus, benefits)", "termination and severance offer letters", "length of service and position history", "mitigation efforts since dismissal"] : neighborInjunction ? ["property survey showing the boundary and the encroachment", "photographs of the shed and the tree roots", "foundation inspection report", "correspondence with the neighbor about the encroachment and the roots"] : contractorRenovation ? ["the signed renovation contract", "proof of the deposit payment", "dated photographs of the substandard and incomplete work", "the second contractor's quote and final invoice", "any messages or emails to the original contractor after work stopped"] : ["supporting records"],
    expectedProceduralStatus: defaultReview ? ["Claim already filed and served", "Affidavit of Service recorded as filed with the court"] : filedServiceFacts,
    reviewRequiredBoundaries: wrongfulDismissal
      ? ["No legal outcome is decided.", "Procedure and forms require verified official-source support.", "The correct defendant is the Canadian employer of record, not the foreign parent company; confirm the exact corporate name and registered/operating status before filing."]
      : neighborInjunction
        ? ["No legal outcome is decided.", "Procedure and forms require verified official-source support.", "This case belongs in Civil because of the injunctive remedy sought (removal of the structure and the tree/roots), not because of the dollar amount, which is well under the Small Claims limit. Small Claims Court generally cannot grant injunctions regardless of amount."]
        : contractorRenovation
          ? ["No legal outcome is decided.", "Procedure and forms require verified official-source support.", "This claim ($48,500) is close to but under the $50,000 Small Claims limit; confirm the final total of the deposit plus completion and remediation costs stays under the limit before filing, since additional costs could push it over."]
          : ["No legal outcome is decided.", "Procedure and forms require verified official-source support."],
    prohibitedOutputWording: defaultReview ? [...prohibited, "recreate the Affidavit of Service", "upload the Affidavit of Service", "photocopy the Affidavit of Service", "re-file the Affidavit of Service"] : wrongfulDismissal ? [...prohibited, "guaranteed notice period", "will be awarded", "name the US parent company"] : neighborInjunction ? [...prohibited, "guaranteed removal", "the court will order"] : contractorRenovation ? [...prohibited, "guaranteed refund", "will be reimbursed"] : prohibited,
    expectedWorkflowAction: wrongfulDismissal || neighborInjunction || contractorRenovation ? "organize-evidence" : index % 3 === 0 ? "organize-evidence" : index % 3 === 1 ? "review-intake-details" : "check-official-forms-and-procedure",
    expectedPrivacySessionBehavior: wrongfulDismissal || neighborInjunction || contractorRenovation ? "saved drafts remain scoped to the authenticated owner and selected case" : index % 2 ? "logged-out intake remains tab-scoped and is not a shared draft" : "saved drafts remain scoped to the authenticated owner and selected case",
  };
}

export const baseScenarios: RegistryScenario[] = (["small-claims", "family", "civil"] as const).flatMap((area) => Array.from({ length: 30 }, (_, index) => baseScenario(area, index)));

function hash(value: string): number { let result = REGISTRY_SEED; for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619); return result >>> 0; }

export function generatedVariations(count = 3000) {
  return Array.from({ length: count }, (_, index) => {
    const base = baseScenarios[index % baseScenarios.length];
    const variation = hash(`${base.id}:${index}`) % 10;
    return { id: `${base.id}-V${String(index + 1).padStart(4, "0")}`, baseId: base.id, seed: REGISTRY_SEED, variation, courtPath: base.courtPath, expectedWorkflowAction: base.expectedWorkflowAction, prohibitedOutputWording: base.prohibitedOutputWording };
  });
}

// ---------------------------------------------------------------------------
// Classification scenarios: what courtPathClassifier.ts should decide before
// an intake ever starts, not what the completed intake should say. These are
// structurally different from RegistryScenario above (no stage, no forms, no
// evidence) because an out-of-scope story never reaches the builder at all --
// it's rejected at the home-page location gate. Kept in this file per the
// August 2026 audit's requirement to register out-of-scope/mixed/insufficient
// scenarios here, but as their own list rather than forced into
// RegistryScenario's shape.
//
// All nine out-of-scope forums from the audit are now covered, each with a
// keyword-only scenario (resolves free, no model call) and an AI-escalated
// scenario (deliberately long enough to force the model path), per that
// audit's priority order: LTB was built and proven first, on its own, to
// validate the out-of-scope mechanism end to end before repeating the same
// pattern eight more times. Genuine mixed in-scope/out-of-scope matters
// (one story naming both an in-scope and an out-of-scope claim) remain a
// deliberate follow-up, not an oversight -- courtPathClassifier's schema has
// no representation for that combination yet.
export type ClassificationExpectedOutcome =
  | { kind: "in-scope"; courtPath: CourtPath }
  | { kind: "mixed"; primary: CourtPath; secondary: CourtPath }
  | { kind: "out-of-scope"; forum: string }
  | { kind: "insufficient-info" };

export type ClassificationScenario = {
  id: string;
  story: string;
  declaredCourtPath: CourtPath | null;
  expected: ClassificationExpectedOutcome;
};

export const classificationScenarios: ClassificationScenario[] = [
  {
    // Short enough (well under the classifier's 320-character escalation
    // threshold) to resolve at the free keyword stage alone -- this is the
    // path that used to silently discard a correct "ltb" detection back to
    // "unknown" before the fix.
    id: "CLASSIFY-OUT-OF-SCOPE-LTB-KEYWORD-001",
    story:
      "My landlord is trying to evict me without giving proper notice and will not fix the broken heater in my " +
      "apartment. I want to stop the eviction and get the repairs done.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "ltb" },
  },
  {
    // Deliberately long enough to force AI escalation, so this proves the
    // model-facing half of the fix (the schema's new out-of-scope option),
    // not just the keyword stage.
    id: "CLASSIFY-OUT-OF-SCOPE-LTB-ESCALATED-001",
    story:
      "I have lived in my rental unit for six years and always paid rent on time until this year, when I fell " +
      "behind by two months after a medical leave from work. My landlord served me with a notice of termination " +
      "and has now told me I have to move out by the end of the month, but I do not think the notice followed " +
      "the proper form or gave the amount of notice the law requires, and nobody has explained what my options " +
      "are for catching up on the rent I owe instead of losing my home. I want to know what I can do to challenge " +
      "the eviction and stay in my apartment while I get caught up.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "ltb" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-HRTO-KEYWORD-001",
    story:
      "My employer discriminated against me because of my disability and refused their duty to accommodate my " +
      "medical needs at work.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "hrto" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-HRTO-ESCALATED-001",
    story:
      "I have a documented medical disability and asked my employer for a modified schedule and an accessible " +
      "workstation, supported by a note from my doctor. My manager refused the request, said the accommodation " +
      "was too inconvenient for the team, and shortly afterward started giving me worse shifts and excluding me " +
      "from meetings I used to attend. I believe I am being treated differently because of my disability and " +
      "because I asked to be accommodated, not for any performance reason, and HR has not responded to two " +
      "emails I sent describing what has been happening. I want to understand what my options are for raising " +
      "this formally.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "hrto" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-WSIAT-KEYWORD-001",
    story:
      "I was injured at work and filed a WSIB claim, but they denied my workplace injury claim and I want to " +
      "appeal to WSIAT.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "wsiat" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-WSIAT-ESCALATED-001",
    story:
      "I hurt my back lifting equipment at work eight months ago and reported it to my supervisor the same day. " +
      "I filed a claim with WSIB and received benefits for the first two months, but my doctor says I am still " +
      "not able to return to my regular duties. WSIB recently sent a decision saying my ongoing pain is not " +
      "related to the workplace injury and cut off my benefits, even though my own doctor disagrees and has " +
      "written a letter explaining why. I do not know how the return to work plan is supposed to account for " +
      "restrictions my doctor has documented, and I want to challenge WSIB's decision before I run out of time " +
      "to appeal it.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "wsiat" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-CAT-KEYWORD-001",
    story:
      "My condominium corporation is refusing to give me copies of records I am entitled to, and I want to file " +
      "a complaint with the Condominium Authority Tribunal.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "cat" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-CAT-ESCALATED-001",
    story:
      "I own a unit in a condominium corporation and have asked the property manager three times over the last " +
      "two months for copies of the reserve fund study and the minutes from the last two board meetings, which " +
      "I understand I am entitled to as an owner. Each time I have been told the records will be sent and then " +
      "never received anything. I am also concerned the board changed a rule about short-term rentals without " +
      "following the proper notice and voting process required by the condominium's declaration and by-laws. I " +
      "want to know what I can do to get the records I am owed and to challenge how the rule was changed.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "cat" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-SOCIAL-BENEFITS-TRIBUNAL-KEYWORD-001",
    story:
      "My Ontario Disability Support Program benefits were cut off and I want to file an ODSP appeal with the " +
      "Social Benefits Tribunal.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "social-benefits-tribunal" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-SOCIAL-BENEFITS-TRIBUNAL-ESCALATED-001",
    story:
      "I have been receiving Ontario Disability Support Program payments for three years because of a chronic " +
      "medical condition documented by my specialist. Last month I received a letter saying my file was reviewed " +
      "and my benefits are being terminated because the caseworker decided my condition no longer meets the " +
      "program's disability definition, even though nothing about my diagnosis or treatment has changed and my " +
      "doctor's most recent report says the opposite. I rely on this support to pay for my medication and rent, " +
      "and I do not understand how they reached this decision or what evidence they actually considered. I want " +
      "to challenge the termination before my current payments run out.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "social-benefits-tribunal" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-LAT-KEYWORD-001",
    story:
      "I was in a car accident and my insurer denied my accident benefits claim, so I want to file with the " +
      "Licence Appeal Tribunal for my statutory accident benefits.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "lat" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-LAT-ESCALATED-001",
    story:
      "I was a passenger in a car accident six months ago and have been receiving physiotherapy for a neck " +
      "injury under my statutory accident benefits since then. My insurer recently sent an examination report " +
      "from a doctor they arranged, concluding my treatment is no longer medically necessary, and stopped paying " +
      "for further physiotherapy even though my own treating physiotherapist says I still need several more " +
      "sessions to recover properly. I do not understand how one examination can override my treating provider's " +
      "opinion, and the insurer has not explained what other benefits I might still be entitled to under my " +
      "policy. I want to dispute the denial before my recovery is set back further.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "lat" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-DIVISIONAL-COURT-KEYWORD-001",
    story:
      "I want to apply for judicial review of a decision made by a government tribunal, and I understand this " +
      "goes to the Divisional Court.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "divisional-court" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-DIVISIONAL-COURT-ESCALATED-001",
    story:
      "A municipal committee of adjustment refused my property's permit application, and I believe the " +
      "committee breached the rules of procedural fairness before reaching its decision -- I was never given " +
      "proper notice of the hearing date, and the written reasons contradict what was actually discussed at the " +
      "meeting I did attend. I am not asking a court to decide whether the permit itself should be approved, or " +
      "to substitute its own judgment for the committee's; I only want the committee's decision quashed and sent " +
      "back because of how unfairly it was reached. I understand that reviewing a government decision-maker's " +
      "process, rather than the merits of its decision, is a different kind of proceeding from an ordinary " +
      "lawsuit against another person or company.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "divisional-court" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-IMMIGRATION-KEYWORD-001",
    story:
      "I am dealing with an immigration matter and need to file a refugee claim with the Immigration and " +
      "Refugee Board.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "immigration" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-IMMIGRATION-ESCALATED-001",
    story:
      "I came to Canada two years ago and submitted a refugee claim based on events in my home country that I " +
      "do not believe I can safely return to. My hearing before the Immigration and Refugee Board is scheduled " +
      "for next month, and I have been gathering documents, country condition reports, and witness statements " +
      "to support my claim, but I am still missing an official document from my home country that has been " +
      "difficult to obtain from here. I also received a letter from IRCC asking for additional information " +
      "about my travel history that I need to respond to before the hearing. I want to understand what I still " +
      "need to prepare and how the timing works given how close the hearing date is.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "immigration" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-CRIMINAL-KEYWORD-001",
    story:
      "I am facing criminal charges and have a bail hearing scheduled; I need help understanding the criminal " +
      "court process.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "criminal-related" },
  },
  {
    id: "CLASSIFY-OUT-OF-SCOPE-CRIMINAL-ESCALATED-001",
    story:
      "I was arrested last week and have been charged with an offence I do not believe I am guilty of. I was " +
      "released on conditions with a surety and now have a court date coming up where I understand the Crown " +
      "attorney will present the case against me. I have never been through the criminal court process before " +
      "and do not understand what disclosure I am supposed to receive from the prosecutor, what my conditions " +
      "actually restrict me from doing in the meantime, or whether I should be looking for a criminal defence " +
      "lawyer or duty counsel before my next appearance. I want to understand what happens between now and the " +
      "court date and what I need to prepare.",
    declaredCourtPath: "civil",
    expected: { kind: "out-of-scope", forum: "criminal-related" },
  },
  {
    // Regression guard for a real bug caught while proving the LTB fix: a
    // totally generic, content-free story got classified "out-of-scope: ltb"
    // at confidence 0.9 because the model treated "doesn't clearly fit
    // family/small-claims/civil" as evidence FOR landlord-tenant, rather than
    // as genuine uncertainty. Its own stated reasoning was "The story does
    // not indicate a specific claim... suggesting it may pertain to
    // landlord-tenant issues" -- confirmed live, not assumed, then fixed by
    // requiring the prompt to cite affirmative words, not absence of fit.
    // This must never again resolve to out-of-scope, with any forum.
    id: "CLASSIFY-INSUFFICIENT-INFO-GENERIC-001",
    story: "Synthetic saved facts for a focused review.",
    declaredCourtPath: "civil",
    expected: { kind: "insufficient-info" },
  },
];
