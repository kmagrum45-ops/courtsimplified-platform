/**
 * Small Claims education topic registry -- Phase 0 foundation for the
 * post-intake education layer (phase 5 of the eventual AI-guided intake,
 * see docs/AI_INTAKE_DESIGN.md). No AI reads or surfaces these yet in this
 * phase; this is the sourced content registry that layer will draw from.
 *
 * Session 32: every entry's `status`/`reviewedAt` reflects the site owner's
 * own review for this pre-launch product, same convention as
 * `questionBank.ts`/`claimTypes.ts` -- not a claim that outside legal
 * counsel has reviewed the wording.
 *
 * Every `plainExplanation` is general education only: what the concept is,
 * what someone bringing this kind of claim generally must show, what
 * courts typically expect documented. Never "your facts meet this" --
 * see docs/AI_INTAKE_DESIGN.md, "who does the applying" test. Surfacing a
 * topic based on facts (via `surfacedWhen`) is navigation, same as the
 * court-path classifier; the explanation text itself must never cross into
 * applying the law to the user's specific facts.
 *
 * Two topics from the original 8-topic list this registry was scoped to
 * were originally cut: "breach of contract elements" and "negligence
 * elements." Both were checked in an earlier session (web search + fetch
 * against ontario.ca and ontariocourts.ca) and neither has a self-help-guide
 * page stating a general elements framework (duty/breach/causation/damages,
 * or offer/acceptance/consideration/breach) -- what existed on
 * ontariocourts.ca was individual Court of Appeal decisions discussing
 * those concepts case-by-case, and synthesizing a general legal-elements
 * statement from reading appellate opinions is legal analysis from case
 * law, which CLAUDE.md's sourcing rule treats the same as a CanLII-only
 * fact: cut rather than written from inference.
 *
 * The negligence-elements blocker has since cleared: CLAUDE.md section 2
 * now treats a primary source saved under `docs/sources/` (see that
 * folder's README) as a first-class citation route -- CanLII blocks
 * automated fetching (and so, so far, does canlii.org-hosted access to
 * Ontario court decisions specifically), but a manually downloaded,
 * locally read copy satisfies "retrieved and read" the same way a live
 * fetch does. (The Supreme Court of Canada's own decisions database,
 * decisions.scc-csc.ca, turned out to be directly fetchable live -- see
 * docs/SOURCING_NOTES.md -- but that was confirmed after the entries
 * below were already sourced via docs/sources/; both routes reach the
 * same real text.) `sc-topic-general-negligence-elements` below is
 * sourced this way, from Mustapha v. Culligan of Canada Ltd., 2008 SCC 27
 * -- a Supreme Court of Canada decision restating the settled general
 * test, not case-law synthesis from an intermediate appellate decision
 * the way the earlier ontariocourts.ca search kept running into. "Breach
 * of contract elements" remains cut: no equivalent primary source has
 * been found or read for it yet. If a future session finds an actual
 * ontario.ca/ontariocourts.ca/ontariocourtforms.on.ca page stating it
 * plainly, or another SCC/primary source the same way this one was
 * sourced, add it back with that citation.
 *
 * Session 41 sourced `sc-topic-general-unjust-enrichment-elements` the
 * same way, from Garland v. Consumers' Gas Co., 2004 SCC 25 (paras. 30,
 * 44-46, 63-65) -- the leading modern statement of the three-element
 * test, the two-stage juristic reason analysis, and the change of
 * position defence (including that it's unavailable to a defendant
 * enriched through their own wrongdoing). Two other SCC judgments were
 * read in full and deliberately NOT cited: Kerr v. Baranow, 2011 SCC 10
 * restates the same general test but its substantive content -- the
 * "joint family venture" doctrine, quantum meruit vs. proportionate-share
 * remedies -- is tightly bound to domestic/cohabitation property context,
 * not general Small Claims content, exactly the kind of stretching this
 * registry's own "who does the applying" boundary rules out. Moore v.
 * Sweet, 2018 SCC 52 mostly cross-references and restates Garland's own
 * paragraphs rather than adding new general doctrine (its paras. 37/57/58
 * independently confirm the Garland paragraph numbers cited below), and
 * its substantive holdings are specific to the constructive-trust remedy
 * and Insurance Act beneficiary-designation provisions -- also left out,
 * consistent with this topic's own scope limit against asserting anything
 * about a specific remedy. Both are logged in docs/sources/README.md as
 * genuine primary sources read this session, in case a future,
 * differently-scoped session (family-law content, a constructive-trust-
 * specific remedy topic) finds a real use for them.
 */

import type { FactCondition } from "./questionBank";

export type EducationCitation = {
  sourceName: string;
  officialUrl: string;
  verifiedAt: string;
  pinpoint?: string;
};

export type EducationTopic = {
  id: string;
  courtArea: "small-claims";
  title: string;
  /** Omitted means the topic is generally relevant and not fact-gated. */
  surfacedWhen?: FactCondition;
  plainExplanation: string;
  /** Non-empty tuple, compile-time enforced -- same pattern as app/legal-principles/page.tsx. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: "sc-topic-monetary-limit",
    courtArea: "small-claims",
    title: "Small Claims Court's $50,000 limit",
    plainExplanation:
      "Small Claims Court in Ontario can only order payment or return of property up to $50,000, " +
      "not counting interest and court costs. This limit applies to the total amount claimed, not " +
      "each individual issue in a case. If a claim is worth more than that, it generally has to go " +
      "to a different court (the Superior Court of Justice) instead.",
    citations: [
      {
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-08-31",
        pinpoint: "monetary jurisdiction increased from $35,000 to $50,000, effective October 1, 2025",
      },
    ],
    reviewedAt: "2026-09-08",
    status: "reviewed",
  },
  {
    id: "sc-topic-limitation-period",
    courtArea: "small-claims",
    title: "Time limits on starting a claim",
    plainExplanation:
      "In most cases, Ontario's Limitations Act, 2002 gives someone 2 years from when they " +
      "discovered (or reasonably should have discovered) their claim to start a lawsuit. Waiting " +
      "past that window can mean losing the right to sue at all, regardless of how strong the " +
      "underlying facts are. There are exceptions and different rules for some claim types, so this " +
      "is general information, not a determination of any specific deadline.",
    citations: [
      {
        sourceName: "Ontario.ca — Civil Claims: Suing and Being Sued",
        officialUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
        verifiedAt: "2026-08-31",
        pinpoint: "\"a claim cannot be started more than two years after the claim was discovered\"",
      },
    ],
    reviewedAt: "2026-09-08",
    status: "reviewed",
  },
  {
    id: "sc-topic-burden-of-proof",
    courtArea: "small-claims",
    title: "Who has to prove what, and how much proof is needed",
    plainExplanation:
      "In a civil case like Small Claims Court, the person bringing the claim (the plaintiff) " +
      "generally has to prove their allegations on a \"balance of probabilities\" -- meaning the " +
      "evidence has to show it's more likely than not (more than a 50% chance) that their version " +
      "is correct. This is a lower standard than the \"beyond a reasonable doubt\" standard used in " +
      "criminal cases. What this generally means in practice is that having some documentation, " +
      "records, or witnesses to back up a claim's key facts matters more than how strongly someone " +
      "feels about what happened.",
    citations: [
      {
        sourceName: "Ontario Superior Court of Justice — Steps to a Civil Case",
        officialUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-08-31",
        pinpoint:
          "\"the plaintiff has the burden of proof to establish on a balance of probabilities the allegations contained in the Statement of Claim\"",
      },
    ],
    reviewedAt: "2026-09-08",
    status: "reviewed",
  },
  {
    id: "sc-topic-demand-letters",
    courtArea: "small-claims",
    title: "Sending a demand letter before suing",
    plainExplanation:
      "Ontario's own guidance suggests that before starting a claim, it can be worth sending a " +
      "letter or talking to the other side directly to ask for payment or resolution first. This " +
      "is not a legal requirement to sue in Small Claims Court -- it's a suggested step that can " +
      "sometimes resolve a dispute without going to court at all, and can also become useful " +
      "documentation later showing an attempt was made to resolve things directly.",
    citations: [
      {
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-08-31",
        pinpoint: "\"you could send a letter or talk to the person who owes you money\"",
      },
    ],
    reviewedAt: "2026-09-08",
    status: "reviewed",
  },
  {
    id: "sc-topic-filing-form-7a",
    courtArea: "small-claims",
    title: "What filing a claim involves (Form 7A)",
    surfacedWhen: { field: "claimFiled", op: "notExists" },
    plainExplanation:
      "Starting a Small Claims Court case means filling out and filing a Plaintiff's Claim, which " +
      "is Form 7A. It sets out who is suing whom, for how much, and why. Once it's filed, it " +
      "generally has to be served on the other party (the defendant), and the person who served it " +
      "has to file proof of that service with the court.",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
        pinpoint: "Plaintiff's Claim [Form 7A] used to commence an action",
      },
    ],
    reviewedAt: "2026-09-08",
    status: "reviewed",
  },
  {
    id: "sc-topic-collecting-after-judgment",
    courtArea: "small-claims",
    title: "Collecting money after winning a judgment",
    plainExplanation:
      "Winning a case doesn't mean payment happens automatically -- a judgment has to be enforced " +
      "if the other side doesn't pay voluntarily. Ontario's guidance describes several enforcement " +
      "tools, generally starting with a written request for payment, and, if that doesn't work, " +
      "options like garnishment (claiming money owed to the debtor by someone else, such as an " +
      "employer or bank), a writ of seizure and sale of personal property or land, or an " +
      "examination hearing to ask the debtor about their finances and ability to pay.",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: After Judgment",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment",
        verifiedAt: "2026-08-31",
        pinpoint: "garnishment, writ of seizure and sale, examination hearing",
      },
    ],
    reviewedAt: "2026-09-08",
    status: "reviewed",
  },
  {
    id: "sc-topic-general-negligence-elements",
    courtArea: "small-claims",
    title: "The elements of a negligence claim",
    plainExplanation:
      "A negligence claim generally requires proving four separate elements: (1) that the " +
      "defendant owed the plaintiff a duty of care; (2) that the defendant's conduct breached the " +
      "standard of care; (3) that the plaintiff sustained damage; and (4) that the damage was " +
      "caused, in fact and in law, by the defendant's breach. " +
      "Duty of care asks whether the relationship between the parties is close enough that one may " +
      "reasonably be said to owe the other a duty not to cause injury -- a question of " +
      "foreseeability moderated by policy considerations. Where the relationship falls into a type " +
      "courts have already recognized as giving rise to a duty of care, precedent settles the " +
      "question and a full duty-of-care analysis isn't needed -- for example, courts have long " +
      "recognized that a manufacturer of a consumable good owes a duty of care to the ultimate " +
      "consumer of that good. " +
      "Standard of care asks whether the defendant's conduct breached the standard expected of it. " +
      "Conduct is negligent if it creates an unreasonable risk of harm. " +
      "Damage for this purpose includes psychological injury, not only physical injury -- but " +
      "psychological injury that counts as personal injury has to be distinguished from ordinary " +
      "upset. The law does not recognize upset, disgust, anxiety, agitation, or other mental states " +
      "that fall short of injury; to count, an injury generally has to be serious and prolonged, " +
      "rising above the ordinary annoyances, anxieties, and fears that people living in society " +
      "routinely accept. " +
      "Causation has two parts: whether the breach caused the harm in fact, and whether it also " +
      "caused the harm in law -- meaning the harm isn't too remote to fairly hold the defendant " +
      "liable for it. That remoteness question turns on reasonable foreseeability: whether the " +
      "harm was a real risk that would occur to a reasonable person in the defendant's position, " +
      "not one they'd dismiss as far-fetched. For personal-injury claims, and especially mental-" +
      "injury claims, foreseeability is judged against a person of \"ordinary fortitude,\" not the " +
      "particular plaintiff's own sensitivities -- unusual or extreme reactions to a negligent act " +
      "are imaginable but not reasonably foreseeable. That ordinary-fortitude threshold is a " +
      "separate question from the \"thin skull\" rule: once it's shown that a person of ordinary " +
      "fortitude would foreseeably suffer the injury, the defendant must then take the plaintiff as " +
      "found for the purpose of assessing the resulting damages -- ordinary fortitude decides " +
      "whether the damage is compensable at law at all, not how much compensation follows once it " +
      "is. Where a defendant is shown to have had actual knowledge of a plaintiff's particular " +
      "sensitivities, the ordinary-fortitude requirement doesn't have to be applied as strictly.",
    citations: [
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 3 -- the four elements of a negligence claim",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 4-5 -- duty of care: the proximity question, and that an established category doesn't need a full Anns analysis",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 6 -- manufacturer/ultimate-consumer as an example of an already-established duty-of-care category",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 7 -- standard of care: conduct is negligent if it creates an unreasonable risk of harm",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 8 -- damage includes psychological injury, not only physical injury",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 9 -- compensable psychological injury must be serious and prolonged, distinct from ordinary upset",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 11 -- causation has both a factual and a legal (remoteness) branch",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 12-13 -- remoteness turns on reasonable foreseeability, i.e. a \"real risk,\" not mere possibility",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 14-15 -- foreseeability of personal/mental injury is judged against a person of \"ordinary fortitude\"",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 16 -- ordinary fortitude is a compensability threshold, distinct from the \"thin skull\" rule on quantum",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 17 -- actual knowledge of a plaintiff's particular sensitivities relaxes the ordinary-fortitude requirement",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-topic-general-unjust-enrichment-elements",
    courtArea: "small-claims",
    title: "The elements of an unjust enrichment claim",
    plainExplanation:
      "A claim in unjust enrichment generally requires showing three elements: (1) that the " +
      "defendant was enriched; (2) that the plaintiff suffered a corresponding deprivation; and (3) " +
      "that there is no juristic reason for the enrichment -- meaning no justification in law for the " +
      "defendant keeping the benefit at the plaintiff's expense. " +
      "The absence-of-juristic-reason element is assessed in two stages. First, the plaintiff must " +
      "show that none of a fixed list of established categories applies to justify the enrichment -- " +
      "those established categories are a contract, a disposition of law, a donative intent (a gift), " +
      "and other valid common law, equitable, or statutory obligations. If none of those established " +
      "categories applies, the plaintiff has made out a prima facie case. Second, that prima facie " +
      "case can still be rebutted: the defendant may show some other reason the enrichment should be " +
      "kept, and at this stage courts consider the reasonable expectations of the parties and public " +
      "policy considerations. " +
      "Separately, even where all three elements are made out, a defendant may have a change of " +
      "position defence available -- where an innocent defendant shows they materially changed their " +
      "position because of the enrichment, such that requiring them to return it would be inequitable. " +
      "That defence is not available, however, to a defendant who obtained the enrichment through " +
      "their own wrongdoing.",
    citations: [
      {
        sourceName: "Supreme Court of Canada — Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 30 -- the three elements of a claim in unjust enrichment: enrichment, corresponding deprivation, absence of juristic reason",
      },
      {
        sourceName: "Supreme Court of Canada — Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 44 -- juristic reason analysis, stage one: the plaintiff must show no juristic reason from an established category (contract, disposition of law, donative intent, other valid common law/equitable/statutory obligations) applies; if none does, a prima facie case is made out",
      },
      {
        sourceName: "Supreme Court of Canada — Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 45 -- the prima facie case is rebuttable; the defendant bears a de facto burden to show another reason the enrichment should be retained",
      },
      {
        sourceName: "Supreme Court of Canada — Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 46 -- juristic reason analysis, stage two: on rebuttal, courts consider the reasonable expectations of the parties and public policy considerations",
      },
      {
        sourceName: "Supreme Court of Canada — Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 63 -- the change of position defence: restitution will be denied where an innocent defendant shows they materially changed their position because of the enrichment, such that returning it would be inequitable",
      },
      {
        sourceName: "Supreme Court of Canada — Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
        verifiedAt: "2026-09-11",
        pinpoint: "paras. 64-65 -- the change of position defence is not available to a defendant who is a wrongdoer; a defendant who obtained the enrichment through their own wrongdoing cannot assert that returning it would be unjust",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
