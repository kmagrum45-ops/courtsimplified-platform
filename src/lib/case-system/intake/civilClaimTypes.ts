/**
 * The civil (Superior Court of Justice) library: claim types above Small
 * Claims' $50,000, or brought in the Superior Court for another reason.
 *
 * Same shape as the Small Claims catalogue (ClaimType), so the same machinery
 * reads it: the AI source pack (groundedCognition.ts), the verification log
 * (docs/sources/catalogue-verification.json) and test:catalogue-verified.
 *
 * *** WHERE THE WORDS CAME FROM ***
 *
 * Written 2026-09-30 from the vendored Rules of Civil Procedure, statutes and
 * the Supreme Court of Canada decisions saved under docs/sources/, every
 * sentence quoted in the log; then re-read by an independent reviewer who had
 * not written it, and corrected where it said more or less than the source.
 * Holdings are attributed to the majority where the decision was split, and
 * Queen v. Cognos is attributed to Iacobucci J., whose reasons were for two
 * judges. status "reviewed" is the site owner's pre-launch decision -- not a
 * licensee review.
 *
 * `remedies` is empty throughout: the remedy registry is Small Claims-specific
 * (its entries carry the $50,000 limit).
 */

import type { ClaimType } from "./claimTypes";

export const CIVIL_CLAIM_TYPES: ClaimType[] = [
  {
    id: "civil-claim-breach-of-contract",
    name: "Breach of contract (Superior Court)",
    broughtBy:
      "A person or business that made a contract and says the other side did not do what the " +
      "contract required, and that this caused them a loss. Not someone with no contract at all, " +
      "and not, without leave, a claim of $50,000 or less (that belongs in Small Claims Court).",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "agreement-and-terms-civcontract",
        name: "A contract existed, and what its terms were",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about the contract itself: " +
          "who made it, when, what each side promised, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The contract document",
            why: "Shows what was agreed and who agreed to it.",
            examples: [
              "Signed contract and any schedules",
              "Purchase order, quote or proposal that was accepted",
              "Amendments or change orders",
            ],
          },
          {
            name: "Communications forming or confirming the deal",
            why: "Shows the terms where the agreement is partly or wholly unwritten.",
            examples: [
              "Emails or letters exchanged before signing",
              "Texts or messages accepting an offer",
              "Meeting notes",
            ],
          },
        ],
      },
      {
        id: "contract-interpretation-civcontract",
        name: "How the contract's words are read",
        plainExplanation:
          "In Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53, the Supreme Court of Canada said " +
          "the interpretation of contracts has moved towards \"a practical, common-sense approach not " +
          "dominated by technical rules of construction\", and that the overriding concern is to " +
          "determine \"the intent of the parties and the scope of their understanding\". To do so, the " +
          "Court said, \"a decision-maker must read the contract as a whole, giving the words used their " +
          "ordinary and grammatical meaning, consistent with the surrounding circumstances known to the " +
          "parties at the time of formation of the contract\" (para. 47). The Court also said the " +
          "surrounding circumstances \"must never be allowed to overwhelm the words of that agreement\", " +
          "and that the interpretation of a written provision \"must always be grounded in the text and " +
          "read in light of the entire contract\" (para. 57). Evidence of the surrounding circumstances " +
          "\"should consist only of objective evidence of the background facts at the time of the " +
          "execution of the contract\" -- knowledge that was or reasonably ought to have been within the " +
          "knowledge of both parties at or before the date of contracting (para. 58). This part of the " +
          "checklist is about the wording of the contract as a whole and the background both sides knew " +
          "when it was made.",
        sourceUrl: "docs/sources/sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The full contract",
            why: "The words are read in light of the entire contract, not one clause alone.",
            examples: [
              "Complete signed copy with all pages and schedules",
              "Any documents the contract refers to",
            ],
          },
          {
            name: "Background both sides knew when the contract was made",
            why: "Shows the setting the contract was made in.",
            examples: [
              "Emails or documents both sides had before signing",
              "Records of the purpose of the deal known to both sides",
              "Dated records showing when each side learned a fact",
            ],
          },
        ],
      },
      {
        id: "honest-performance-civcontract",
        name:
          "If the claim is about dishonesty in carrying out the contract: the duty of honest " +
          "performance",
        plainExplanation:
          "In Bhasin v. Hrynew, 2014 SCC 71, the Supreme Court of Canada recognized \"a common law duty " +
          "which applies to all contracts to act honestly in the performance of contractual " +
          "obligations\" (para. 33). The Court said this \"means simply that parties must not lie or " +
          "otherwise knowingly mislead each other about matters directly linked to the performance of " +
          "the contract\", and that it \"does not impose a duty of loyalty or of disclosure or require a " +
          "party to forego advantages flowing from the contract\" (para. 73). Because it applies to all " +
          "contracts, \"the parties are not free to exclude it\" (para. 75). The Court added that \"the " +
          "parties should be free in some contexts to relax the requirements of the doctrine so long as " +
          "they respect its minimum core requirements\" (para. 77), and that \"any modification of the " +
          "duty of honest performance would need to be in express terms\" (para. 78). In C.M. Callow " +
          "Inc. v. Zollinger, 2020 SCC 45, the majority, in reasons by Kasirer J., said one can mislead " +
          "\"through inaction, by failing to correct a misapprehension caused by one's own misleading " +
          "conduct\" (para. 90), and that whether a party has \"knowingly misled\" the other \"is a highly " +
          "fact-specific determination, and can include lies, half-truths, omissions, and even silence, " +
          "depending on the circumstances\" (para. 91). The majority also said the duty \"attracts " +
          "damages where the manner in which the right was exercised was dishonest\" (para. 53). This " +
          "part of the checklist is about what was said or done about the contract's performance, and " +
          "when.",
        sourceUrl: "docs/sources/bhasin-v-hrynew-2014-SCC-71.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/cm-callow-inc-v-zollinger-2020-SCC-45.pdf",
            pinpoint: "C.M. Callow Inc. v. Zollinger, 2020 SCC 45, paras. 53, 90-91",
          },
        ],
        evidenceCategories: [
          {
            name: "What was said about the contract's performance",
            why: "Shows the statements or conduct in question and who made them.",
            examples: [
              "Emails, letters or messages about whether the contract would continue or be performed",
              "Notes of conversations with dates and names",
            ],
          },
          {
            name: "Timeline",
            why: "Shows when statements were made and what each side knew at the time.",
            examples: [
              "Dated chronology of communications",
              "Records of when a notice or decision was made",
            ],
          },
        ],
      },
      {
        id: "breach-and-loss-civcontract",
        name: "What was not done under the contract, and the loss that followed",
        plainExplanation:
          "In Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30, the Supreme Court of Canada said " +
          "\"the aim of compensatory damages is to restore the wronged party to the position he or she " +
          "would have been in had the contract not been broken\" (para. 44). This part of the checklist " +
          "is about what the other side did or did not do under the contract, the loss that followed, " +
          "and how the amount claimed is worked out.",
        sourceUrl: "docs/sources/fidler-v-sun-life-assurance-co-2006-SCC-30.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "What was not done",
            why: "Shows the promise that was not kept and when.",
            examples: [
              "Notice of termination or refusal",
              "Records of late, missing or different performance",
              "Demand letters and replies",
            ],
          },
          {
            name: "The loss and how it is calculated",
            why: "Shows the amount claimed and where each figure comes from.",
            examples: [
              "Invoices, receipts and bank records",
              "Lost revenue or cost-to-replace calculations",
              "Quotes from replacement suppliers",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "exclusion-clause-civcontract",
        name: "A clause that excludes or limits liability",
        plainExplanation:
          "In Tercon Contractors Ltd. v. British Columbia (Transportation and Highways), 2010 SCC 4, " +
          "Binnie J. (writing for the four judges who dissented in the result) set out \"a series of " +
          "enquiries\" for when a plaintiff seeks to escape the effect of an exclusion clause (para. " +
          "121). The first is \"whether as a matter of interpretation the exclusion clause even applies " +
          "to the circumstances established in evidence\", which \"will depend on the Court's assessment " +
          "of the intention of the parties as expressed in the contract\". If it applies, the second is " +
          "\"whether the exclusion clause was unconscionable at the time the contract was made\" (para. " +
          "122). If the clause is valid and applicable, a third enquiry is whether the court should " +
          "nevertheless refuse to enforce it \"because of the existence of an overriding public policy, " +
          "proof of which lies on the party seeking to avoid enforcement of the clause, that outweighs " +
          "the very strong public interest in the enforcement of contracts\" (para. 123). Cromwell J., " +
          "writing for the majority, said \"I agree with the analytical approach that should be followed " +
          "when tackling an issue relating to the applicability of an exclusion clause set out by my " +
          "colleague Binnie J.\", and that, on the doctrine of fundamental breach in relation to " +
          "exclusion clauses, \"the time has come to lay this doctrine to rest\" (para. 62). This topic " +
          "is about a contract clause that excludes or limits what one side must pay.",
        whenThisComesUp:
          "When the contract contains a clause excluding or limiting liability, or a statement of " +
          "defence relies on one.",
        sourceUrl: "docs/sources/tercon-contractors-ltd-v-british-columbia-2010-SCC-4.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "mitigation-civcontract",
        name: "Steps taken, or not taken, to reduce the loss",
        plainExplanation:
          "In Southcott Estates Inc. v. Toronto Catholic District School Board, 2012 SCC 51, the " +
          "majority, in reasons by Karakatsanis J., said that \"as a general rule, a plaintiff will not " +
          "be able to recover for those losses which he could have avoided by taking reasonable steps\", " +
          "and that \"where it is alleged that the plaintiff has failed to mitigate, the burden of proof " +
          "is on the defendant, who needs to prove both that the plaintiff has failed to make " +
          "reasonable efforts to mitigate and that mitigation was possible\" (para. 24). The majority " +
          "also said a plaintiff who does take reasonable steps to mitigate \"may recover, as damages, " +
          "the costs and expenses incurred in taking those reasonable steps, provided that the costs " +
          "and expenses are reasonable and were truly incurred in mitigation of damages\" (para. 25). " +
          "This topic is about what was done after the breach to reduce the loss, and what it cost.",
        whenThisComesUp:
          "When a statement of defence says the plaintiff could have reduced the loss, or the claim " +
          "includes costs spent trying to reduce it.",
        sourceUrl: "docs/sources/southcott-estates-v-toronto-catholic-district-school-board-2012-SCC-51.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "mental-distress-civcontract",
        name: "A claim for mental distress caused by a breach of contract",
        plainExplanation:
          "In Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30, the Supreme Court of Canada said " +
          "\"damages for mental distress for breach of contract may, in appropriate cases, be awarded as " +
          "an application of the principle in Hadley v. Baxendale\", and that the court should ask \"what " +
          "did the contract promise?\" (para. 44). The Court said that \"in normal commercial contracts, " +
          "the likelihood of a breach of contract causing mental distress is not ordinarily within the " +
          "reasonable contemplation of the parties\", and that \"the law does not award damages for such " +
          "incidental frustration\" (para. 45). The Court said this \"does not obviate the requirement " +
          "that a plaintiff prove his or her loss\", and that the court must be satisfied \"(1) that an " +
          "object of the contract was to secure a psychological benefit that brings mental distress " +
          "upon breach within the reasonable contemplation of the parties; and (2) that the degree of " +
          "mental suffering caused by the breach was of a degree sufficient to warrant compensation\" " +
          "(para. 47). This topic is about a claim for mental distress in a contract case.",
        whenThisComesUp:
          "When a breach of contract claim includes damages for mental distress, or a statement of " +
          "defence disputes them.",
        sourceUrl: "docs/sources/fidler-v-sun-life-assurance-co-2006-SCC-30.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "punitive-damages-civcontract",
        name: "A claim for punitive damages in a contract case",
        plainExplanation:
          "In Whiten v. Pilot Insurance Co., 2002 SCC 18, the majority, in reasons by Binnie J., said " +
          "that in Vorvis \"this Court held that punitive damages are recoverable in such cases provided " +
          "the defendant's conduct said to give rise to the claim is itself 'an actionable wrong'\" " +
          "(para. 78), and that \"an independent actionable wrong is required, but it can be found in " +
          "breach of a distinct and separate contractual provision or other duty such as a fiduciary " +
          "obligation\" (para. 82). Among the points the majority said a jury should understand: \"(1) " +
          "Punitive damages are very much the exception rather than the rule, (2) imposed only if there " +
          "has been high-handed, malicious, arbitrary or highly reprehensible misconduct that departs " +
          "to a marked degree from ordinary standards of decent behaviour\" (para. 94). This topic is " +
          "about a request for punitive damages in a contract case.",
        whenThisComesUp:
          "When a breach of contract claim asks for punitive damages, or a statement of defence " +
          "disputes them.",
        sourceUrl: "docs/sources/whiten-v-pilot-insurance-2002-SCC-18.pdf",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Under r. 14.01(1) of the Rules of Civil Procedure, a proceeding is started by the issuing of " +
          "an originating process. Under r. 14.03(1), the originating process for an action is a " +
          "statement of claim (Form 14A), with some exceptions. Under r. 14.03(2), where there is not " +
          "enough time to prepare a statement of claim, an action may be started by issuing a notice of " +
          "action (Form 14C) with a short statement of the nature of the claim. Under r. 14.03(3), the " +
          "plaintiff must then file a statement of claim (Form 14D) within thirty days after the notice " +
          "of action is issued, and no statement of claim may be filed after that except with the " +
          "defendant's written consent or with leave of the court obtained on notice to the defendant. " +
          "Under r. 14.08(1), a statement of claim must be served within six months after it is issued. " +
          "Under r. 14.08(2), where a notice of action is used, the notice of action and the statement " +
          "of claim must be served together within six months after the notice of action is issued.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Under r. 18.01 of the Rules of Civil Procedure, except as provided in r. 18.02, r. 19.01(5) " +
          "(late delivery of defence) or r. 27.04(2), a statement of defence (Form 18A) must be " +
          "delivered within twenty days after service of the statement of claim where the defendant is " +
          "served in Ontario; within forty days where the defendant is served elsewhere in Canada or in " +
          "the United States of America; or within sixty days where the defendant is served anywhere " +
          "else. Under r. 18.02(1), a defendant who intends to defend may deliver a notice of intent to " +
          "defend (Form 18B) within the time for delivering a statement of defence, and under r. " +
          "18.02(2), a defendant who does so within the prescribed time is entitled to ten more days, " +
          "in addition to the time in r. 18.01, to deliver a statement of defence.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Under r. 76.02(1) of the Rules of Civil Procedure, the simplified procedure in Rule 76 must " +
          "be used in an action if the plaintiff's claim is exclusively for money, real property or " +
          "personal property (or a mix of these), and the total of the money claimed and the fair " +
          "market value of any real or personal property, as at the date the action is started, is " +
          "$200,000 or less, not counting interest and costs. Under r. 76.02(2) and (2.1), where there " +
          "are two or more plaintiffs or defendants, each plaintiff's claim, or the claim against each " +
          "defendant, is considered separately. Under r. 76.02(3), the simplified procedure may be used " +
          "in any other action at the plaintiff's option, subject to r. 76.02(4) to (9). Under r. " +
          "76.02(4), the statement of claim or notice of action must indicate that the action is being " +
          "brought under Rule 76. Under r. 76.01(1), Rule 76 does not apply to some actions, including " +
          "actions under the Class Proceedings Act, 1992, actions under the Construction Act (except " +
          "trust claims), actions assigned for case management under r. 77.05, and actions in which a " +
          "jury notice is delivered under r. 76.02.1(2).",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Under s. 23(1.1) of the Courts of Justice Act, an action that is within the Small Claims " +
          "Court's jurisdiction cannot be started in the Superior Court of Justice except with leave " +
          "(permission) of the Superior Court of Justice, as provided in the rules of court. Under s. " +
          "23(1), the Small Claims Court has jurisdiction in an action for the payment of money where " +
          "the amount claimed does not exceed the prescribed amount, not counting interest and costs, " +
          "and in an action to recover personal property where its value does not exceed the prescribed " +
          "amount. O. Reg. 626/00, s. 1(1), sets the maximum amount of a claim in the Small Claims " +
          "Court at $50,000. Under r. 14.01.1(2) of the Rules of Civil Procedure, a motion for leave " +
          "under s. 23(1.1) may be made without notice, unless the court orders otherwise, and under r. " +
          "14.01.1(3), the court may grant that leave only if it is in the interest of justice. Under " +
          "s. 23(1.2), s. 23(1.1) does not apply to a counterclaim, crossclaim or third or subsequent " +
          "party claim where the main action was started in the Superior Court of Justice.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
            pinpoint: "Rules of Civil Procedure, r. 14.01.1(2), (3)",
          },
        ],
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "suing in Superior Court for breach of contract over $50,000",
      "business deal fell apart and they won't honour the signed agreement",
      "they cancelled our contract early and lied about why",
      "the other company ignored a clause in our agreement",
      "they say a clause in the contract limits what they owe",
      "partner backed out of a written agreement",
      "supplier broke a long-term contract",
      "they misled me about whether they would renew or end the contract",
      "we disagree about what the contract wording means",
      "they stopped performing the agreement partway through",
      "lost a lot of money when they walked away from the deal",
      "contract dispute too big for small claims",
      "need to file a statement of claim for a contract",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Superior Court of Justice, Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "burden of proof",
      },
      {
        sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53",
        officialUrl: "docs/sources/sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 47, 57, 58",
      },
      {
        sourceName: "Bhasin v. Hrynew, 2014 SCC 71",
        officialUrl: "docs/sources/bhasin-v-hrynew-2014-SCC-71.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 33, 73, 75",
      },
      {
        sourceName: "C.M. Callow Inc. v. Zollinger, 2020 SCC 45",
        officialUrl: "docs/sources/cm-callow-inc-v-zollinger-2020-SCC-45.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 53, 90, 91 (majority, Kasirer J.)",
      },
      {
        sourceName: "Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30",
        officialUrl: "docs/sources/fidler-v-sun-life-assurance-co-2006-SCC-30.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 44, 45, 47",
      },
      {
        sourceName:
          "Tercon Contractors Ltd. v. British Columbia (Transportation and Highways), 2010 SCC 4",
        officialUrl: "docs/sources/tercon-contractors-ltd-v-british-columbia-2010-SCC-4.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 62 (majority), 121-123 (Binnie J., dissenting in the result)",
      },
      {
        sourceName: "Southcott Estates Inc. v. Toronto Catholic District School Board, 2012 SCC 51",
        officialUrl: "docs/sources/southcott-estates-v-toronto-catholic-district-school-board-2012-SCC-51.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 24-25 (majority, Karakatsanis J.)",
      },
      {
        sourceName: "Whiten v. Pilot Insurance Co., 2002 SCC 18",
        officialUrl: "docs/sources/whiten-v-pilot-insurance-2002-SCC-18.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 78, 82, 94 (majority, Binnie J.)",
      },
      {
        sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
        officialUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 14.01, 14.01.1, 14.03, 14.08, 18.01, 18.02, 76.01, 76.02",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 23(1), (1.1), (1.2)",
      },
      {
        sourceName: "O. Reg. 626/00 (Small Claims Court Jurisdiction and Appeal Limit)",
        officialUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 1(1)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "civil-claim-debt-or-liquidated-demand",
    name: "Money owed: a fixed sum (debt or liquidated demand) in the Superior Court",
    broughtBy:
      "A person or business owed a fixed, calculable sum of money -- for example under a loan, an " +
      "account or a contract price -- that has not been paid. Not a claim for an amount a court has " +
      "to assess (such as general damages), and not, without leave, a claim of $50,000 or less " +
      "(that belongs in Small Claims Court).",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "debt-owed-civdebt",
        name: "The money is owed, and why",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about where the debt comes " +
          "from -- the loan, account or agreement -- who owes it, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The document creating the debt",
            why: "Shows who owes the money and on what terms.",
            examples: [
              "Loan agreement or promissory note",
              "Signed contract or account agreement",
              "Guarantee",
            ],
          },
          {
            name: "Proof the money was advanced or the obligation arose",
            why: "Shows the debt came into being.",
            examples: [
              "Bank transfer records",
              "Delivery or completion records tied to the price",
              "Statements of account",
            ],
          },
        ],
      },
      {
        id: "liquidated-amount-civdebt",
        name: "The amount: a fixed sum, with payments and interest accounted for",
        plainExplanation:
          "Under r. 19.04(1)(a) of the Rules of Civil Procedure, where a defendant has been noted in " +
          "default, the plaintiff may require the registrar to sign judgment for \"a debt or liquidated " +
          "demand in money, including interest if claimed in the statement of claim\". Under r. " +
          "19.04(2), the requisition for default judgment (Form 19D) states whether there has been any " +
          "partial payment of the claim, with the date and amount of each, and, where prejudgment " +
          "interest was claimed, how the interest is calculated. Under r. 19.04(4), where the claim has " +
          "been partially satisfied, the default judgment is confined to the remainder. This part of " +
          "the checklist is about the exact amount owed, the payments already made, and how any " +
          "interest is calculated.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
        evidenceCategories: [
          {
            name: "How the amount is calculated",
            why: "Shows the sum is fixed and how it was reached.",
            examples: [
              "Statement of account or ledger",
              "Loan schedule or amortization table",
              "Invoices matching the contract price",
            ],
          },
          {
            name: "Payments received",
            why: "Partial payments are stated with their dates and amounts.",
            examples: ["Bank records of each payment", "Receipts", "Running balance statement"],
          },
          {
            name: "Interest",
            why: "Shows the rate and how interest is calculated, if claimed.",
            examples: ["Interest clause in the agreement", "Interest calculation worksheet"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "defence-disputes-debt-civdebt",
        name: "The defendant delivers a statement of defence disputing the debt or the amount",
        plainExplanation:
          "Under r. 18.01 of the Rules of Civil Procedure, a statement of defence (Form 18A) is " +
          "delivered within twenty days after service of the statement of claim where the defendant is " +
          "served in Ontario (forty days elsewhere in Canada or the United States, sixty days anywhere " +
          "else), subject to the exceptions it lists. Under r. 20.01(1), a plaintiff may, after the " +
          "defendant has delivered a statement of defence or served a notice of motion, move with " +
          "supporting affidavit material or other evidence for summary judgment on all or part of the " +
          "claim. Under r. 20.02(2), a party responding to that motion \"may not rest solely on the " +
          "allegations or denials in the party's pleadings, but must set out, in affidavit material or " +
          "other evidence, specific facts showing that there is a genuine issue requiring a trial\". " +
          "This topic is about a statement of defence that disputes that the money is owed, or how " +
          "much.",
        whenThisComesUp:
          "When the defendant has delivered a statement of defence disputing the debt or the amount.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Default judgment, under Rule 19 of the Rules of Civil Procedure. Under r. 19.01(1), where a " +
          "defendant fails to deliver a statement of defence within the prescribed time, the plaintiff " +
          "may, on filing proof of service of the statement of claim, or of deemed service under r. " +
          "16.01(2), require the registrar to note the defendant in default. Under r. 19.04(1)(a), once " +
          "the defendant has been noted in default, the plaintiff may require the registrar to sign " +
          "judgment for a debt or liquidated demand in money, including interest if claimed in the " +
          "statement of claim (Form 19A). Under r. 19.04(3), the registrar may decline to sign default " +
          "judgment if uncertain whether the claim comes within the class of cases for which default " +
          "judgment may properly be signed, or of the amount or rate of prejudgment or postjudgment " +
          "interest properly recoverable. Under r. 19.04(3.1), if the registrar declines, the plaintiff " +
          "may move before a judge for judgment under r. 19.05, or, for a claim referred to in r. " +
          "19.04(1), make a motion to the court for default judgment. Under r. 19.05(1), where a " +
          "defendant has been noted in default, the plaintiff may move before a judge for judgment " +
          "against the defendant on the statement of claim for any claim for which default judgment has " +
          "not been signed, and under r. 19.05(2) that motion must be supported by affidavit evidence " +
          "if the claim is for unliquidated damages. Under r. 19.06, a plaintiff is not entitled to " +
          "judgment on a motion for judgment or at trial merely because the facts alleged in the " +
          "statement of claim are deemed to be admitted, unless the facts entitle the plaintiff to " +
          "judgment. Under r. 19.08(1), a judgment signed by the registrar or granted on motion under " +
          "r. 19.04 may be set aside or varied by the court on such terms as are just.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Summary judgment, under Rule 20 of the Rules of Civil Procedure. Under r. 20.01(1), a " +
          "plaintiff may, after the defendant has delivered a statement of defence or served a notice " +
          "of motion, move with supporting affidavit material or other evidence for summary judgment on " +
          "all or part of the claim. Under r. 20.04(2), the court shall grant summary judgment if \"(a) " +
          "the court is satisfied that there is no genuine issue requiring a trial with respect to a " +
          "claim or defence; or (b) the parties agree to have all or part of the claim determined by a " +
          "summary judgment and the court is satisfied that it is appropriate to grant summary " +
          "judgment.\" Under r. 20.04(2.1), in deciding under clause (2)(a) whether there is a genuine " +
          "issue requiring a trial, the court shall consider the evidence submitted by the parties, and " +
          "a judge making that determination has these powers, unless it is in the interest of justice " +
          "for them to be exercised only at a trial: weighing the evidence, evaluating the credibility " +
          "of a deponent, and drawing any reasonable inference from the evidence. Under r. 20.04(3), " +
          "where the court is satisfied that the only genuine issue is the amount to which the moving " +
          "party is entitled, the court may order a trial of that issue or grant judgment with a " +
          "reference to determine the amount.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved. " +
          "Under s. 5(3), for the purposes of s. 5(1)(a)(i), the day on which injury, loss or damage " +
          "occurs in relation to a demand obligation is the first day on which there is a failure to " +
          "perform the obligation, once a demand for the performance is made. Under s. 5(4), s. 5(3) " +
          "applies to every demand obligation created on or after January 1, 2004.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Under s. 13(1) of the Limitations Act, 2002, if a person acknowledges liability in respect " +
          "of a claim for payment of a liquidated sum (or certain claims about personal property), the " +
          "act or omission on which the claim is based is deemed to have taken place on the day the " +
          "acknowledgment was made. Under s. 13(2), an acknowledgment of liability for interest is an " +
          "acknowledgment of liability for the principal and for interest falling due after the " +
          "acknowledgment is made. Under s. 13(8), subject to s. 13(9) and (10), this applies to an " +
          "acknowledgment of liability for a liquidated sum even though the person making it refuses or " +
          "does not promise to pay the sum or the balance still owing. Under s. 13(10), s. 13(1) and " +
          "(2) (among others) do not apply unless the acknowledgment is in writing and signed by the " +
          "person making it or the person's agent. Under s. 13(11), in the case of a claim for payment " +
          "of a liquidated sum, part payment of the sum by the person against whom the claim is made, " +
          "or by that person's agent, has the same effect as the acknowledgment referred to in s. " +
          "13(10). Under s. 13(9), the section -- which includes the part-payment rule in s. 13(11) -- " +
          "does not apply unless the acknowledgment is made to the person with the claim, the person's " +
          "agent, or an official receiver or trustee acting under the Bankruptcy and Insolvency Act " +
          "(Canada), before the expiry of the limitation period applicable to the claim.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Under s. 23(1.1) of the Courts of Justice Act, an action that is within the Small Claims " +
          "Court's jurisdiction cannot be started in the Superior Court of Justice except with leave " +
          "(permission) of the Superior Court of Justice, as provided in the rules of court. Under s. " +
          "23(1), the Small Claims Court has jurisdiction in an action for the payment of money where " +
          "the amount claimed does not exceed the prescribed amount, not counting interest and costs, " +
          "and in an action to recover personal property where its value does not exceed the prescribed " +
          "amount. O. Reg. 626/00, s. 1(1), sets the maximum amount of a claim in the Small Claims " +
          "Court at $50,000. Under r. 14.01.1(2) of the Rules of Civil Procedure, a motion for leave " +
          "under s. 23(1.1) may be made without notice, unless the court orders otherwise, and under r. " +
          "14.01.1(3), the court may grant that leave only if it is in the interest of justice. Under " +
          "s. 23(1.2), s. 23(1.1) does not apply to a counterclaim, crossclaim or third or subsequent " +
          "party claim where the main action was started in the Superior Court of Justice.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
            pinpoint: "Rules of Civil Procedure, r. 14.01.1(2), (3)",
          },
        ],
      },
      {
        note:
          "Under r. 76.02(1) of the Rules of Civil Procedure, the simplified procedure in Rule 76 must " +
          "be used in an action if the plaintiff's claim is exclusively for money, real property or " +
          "personal property (or a mix of these), and the total of the money claimed and the fair " +
          "market value of any real or personal property, as at the date the action is started, is " +
          "$200,000 or less, not counting interest and costs. Under r. 76.02(2) and (2.1), where there " +
          "are two or more plaintiffs or defendants, each plaintiff's claim, or the claim against each " +
          "defendant, is considered separately. Under r. 76.02(3), the simplified procedure may be used " +
          "in any other action at the plaintiff's option, subject to r. 76.02(4) to (9). Under r. " +
          "76.02(4), the statement of claim or notice of action must indicate that the action is being " +
          "brought under Rule 76. Under r. 76.01(1), Rule 76 does not apply to some actions, including " +
          "actions under the Class Proceedings Act, 1992, actions under the Construction Act (except " +
          "trust claims), actions assigned for case management under r. 77.05, and actions in which a " +
          "jury notice is delivered under r. 76.02.1(2).",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Under r. 14.01(1) of the Rules of Civil Procedure, a proceeding is started by the issuing of " +
          "an originating process. Under r. 14.03(1), the originating process for an action is a " +
          "statement of claim (Form 14A), with some exceptions. Under r. 14.03(2), where there is not " +
          "enough time to prepare a statement of claim, an action may be started by issuing a notice of " +
          "action (Form 14C) with a short statement of the nature of the claim. Under r. 14.03(3), the " +
          "plaintiff must then file a statement of claim (Form 14D) within thirty days after the notice " +
          "of action is issued, and no statement of claim may be filed after that except with the " +
          "defendant's written consent or with leave of the court obtained on notice to the defendant. " +
          "Under r. 14.08(1), a statement of claim must be served within six months after it is issued. " +
          "Under r. 14.08(2), where a notice of action is used, the notice of action and the statement " +
          "of claim must be served together within six months after the notice of action is issued.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
    ],
    signals: [
      "owed a fixed sum over $50,000 and need to sue in Superior Court",
      "default judgment for a debt in Superior Court",
      "borrower stopped paying a large loan balance",
      "they signed an acknowledgment of the debt",
      "they made a part payment and then stopped",
      "summary judgment for money owed",
      "they never filed a statement of defence to my debt claim",
      "a liquidated demand for a set amount",
      "account balance owed by a company is more than small claims allows",
      "promissory note never paid",
      "guarantor refuses to pay the balance",
      "money owed under a written agreement with interest",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Superior Court of Justice, Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "burden of proof",
      },
      {
        sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
        officialUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "rr. 14.01, 14.01.1, 14.03, 14.08, 18.01, 19.01, 19.04-19.06, 19.08, 20.01, 20.02, 20.04, " +
          "76.01, 76.02",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2), 13(1), (2), (8)-(11)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 23(1), (1.1), (1.2)",
      },
      {
        sourceName: "O. Reg. 626/00 (Small Claims Court Jurisdiction and Appeal Limit)",
        officialUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 1(1)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "civil-claim-defamation",
    name: "Defamation (libel or slander) in the Superior Court",
    broughtBy: "The person or business the statement was about.",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "words-defamatory-civdefam",
        name: "The words were defamatory",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said a plaintiff in a " +
          "defamation action is required to prove three things to obtain judgment and an award of " +
          "damages. The first is \"that the impugned words were defamatory, in the sense that they would " +
          "tend to lower the plaintiff's reputation in the eyes of a reasonable person\" (para. 28). The " +
          "other two -- that the words referred to the plaintiff, and that they were published -- are " +
          "the next parts of this checklist. The Court said that if the plaintiff proves the required " +
          "elements, \"the onus then shifts to the defendant to advance a defence in order to escape " +
          "liability\" (para. 29). The Superior Court of Justice's guide to the steps in a civil case " +
          "says that in every civil case the plaintiff has the burden of proof to establish, on a " +
          "balance of probabilities, the allegations in the Statement of Claim.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
            pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)",
          },
        ],
        evidenceCategories: [
          {
            name: "The exact words",
            why: "Records precisely what was said or written.",
            examples: [
              "Screenshot, printout or copy of the article, post or message",
              "Recording or transcript of what was said",
              "Date and place it appeared",
            ],
          },
          {
            name: "The full context",
            why: "Shows the statement as a reader or listener would have met it.",
            examples: [
              "The whole article, thread or broadcast, not just the sentence",
              "Headlines, photos or captions that went with it",
            ],
          },
        ],
      },
      {
        id: "words-refer-to-plaintiff-civdefam",
        name: "The words referred to the plaintiff",
        plainExplanation:
          "The second thing the Supreme Court of Canada listed in Grant v. Torstar Corp., 2009 SCC 61, " +
          "is \"that the words in fact referred to the plaintiff\" (para. 28). This part of the checklist " +
          "is about how the statement identifies the person or business it is about.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "How the plaintiff is identified",
            why: "Shows who the statement is about.",
            examples: [
              "Name, photo, tag, username or business name used in the statement",
              "Details in the statement that point to the plaintiff",
            ],
          },
          {
            name: "People who recognized the plaintiff",
            why: "Shows readers or listeners connected the statement to the plaintiff.",
            examples: [
              "Messages or comments from people who recognized the plaintiff",
              "Names of people who asked the plaintiff about it",
            ],
          },
        ],
      },
      {
        id: "words-published-civdefam",
        name:
          "The words were published -- communicated to at least one person other than the plaintiff",
        plainExplanation:
          "The third thing listed in Grant v. Torstar Corp., 2009 SCC 61, is \"that the words were " +
          "published, meaning that they were communicated to at least one person other than the " +
          "plaintiff\" (para. 28). The Court went on: \"If these elements are established on a balance of " +
          "probabilities, falsity and damage are presumed\". It noted one exception: slander requires " +
          "proof of special damages, unless the words were slanderous per se. The Court also said the " +
          "plaintiff is not required to show that the defendant intended to do harm, or even that the " +
          "defendant was careless; the tort is one of strict liability (para. 28). In Hill v. Church of " +
          "Scientology of Toronto, [1995] 2 S.C.R. 1130, the Supreme Court of Canada said that general " +
          "damages in defamation cases are presumed from the very publication of the false statement " +
          "and are awarded at large (p. 1196).",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/hill-v-church-of-scientology-1995-2-SCR-1130.pdf",
            pinpoint: "Hill v. Church of Scientology of Toronto, [1995] 2 S.C.R. 1130, p. 1196",
          },
        ],
        evidenceCategories: [
          {
            name: "Proof someone else saw or heard it",
            why: "Shows the statement reached a person other than the plaintiff.",
            examples: [
              "Comments, replies or shares from others",
              "View, share or circulation figures",
              "Names of people who heard it said",
            ],
          },
          {
            name: "Effects on the plaintiff",
            why: "Documents what happened after the statement was published.",
            examples: [
              "Lost clients, contracts or job offers",
              "Messages from people reacting to the statement",
              "Business records before and after",
            ],
          },
        ],
      },
      {
        id: "notice-newspaper-broadcast-civdefam",
        name:
          "If this involved a newspaper or broadcast specifically, written notice was given within 6 " +
          "weeks",
        plainExplanation:
          "Under s. 5(1) of the Libel and Slander Act, no action for libel in a newspaper or in a " +
          "broadcast lies unless the plaintiff gave the defendant written notice, specifying the matter " +
          "complained of, within six weeks after the alleged libel came to the plaintiff's knowledge. " +
          "The notice must be served in the same manner as a statement of claim, or by delivering it to " +
          "a grown-up person at the defendant's chief office. Section 1(1) defines \"newspaper\" and " +
          "\"broadcasting\", and s. 7 says this applies only to newspapers printed and published in " +
          "Ontario and to broadcasts from a station in Ontario. Section 8 also limits who can rely on " +
          "ss. 5 and 6: a newspaper defendant is not entitled to their benefit unless the names of the " +
          "proprietor and publisher and the address of publication are stated at the head of the " +
          "editorials or on the front page (s. 8(1)), and for a broadcast they do not apply if, after a " +
          "registered-letter request, the station's owner or operator does not supply the requested " +
          "names and addresses within the time s. 8(3) allows. Whether a particular publication fits " +
          "those definitions is a question to check, not something this content assumes.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2015-11-03",
        evidenceCategories: [
          {
            name: "Copy of the written notice",
            why:
              "Shows the notice step was taken and when, if this Act's notice requirement applies.",
            examples: [
              "Copy of the notice letter",
              "Proof of how and when it was served or delivered",
            ],
          },
          {
            name: "When the statement came to the plaintiff's knowledge",
            why: "The six weeks run from that day.",
            examples: [
              "Date the article or broadcast was first seen or heard",
              "Message or email that first told the plaintiff about it",
            ],
          },
        ],
      },
      {
        id: "limitation-newspaper-broadcast-civdefam",
        name:
          "If this involved a newspaper or broadcast specifically, the action was started within 3 " +
          "months",
        plainExplanation:
          "Under s. 6 of the Libel and Slander Act, an action for a libel in a newspaper or in a " +
          "broadcast must be started within three months after the libel came to the knowledge of the " +
          "person defamed. Section 7 says this applies only to newspapers printed and published in " +
          "Ontario and to broadcasts from a station in Ontario. If the action is started within the " +
          "three months, it may also include a claim for any other libel against the plaintiff by the " +
          "same defendant in the same newspaper or from the same broadcasting station within the year " +
          "before the action started. Section 8 also limits who can rely on ss. 5 and 6: a newspaper " +
          "defendant is not entitled to their benefit unless the names of the proprietor and publisher " +
          "and the address of publication are stated at the head of the editorials or on the front page " +
          "(s. 8(1)), and for a broadcast they do not apply if, after a registered-letter request, the " +
          "station's owner or operator does not supply the requested names and addresses within the " +
          "time s. 8(3) allows.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2015-11-03",
        evidenceCategories: [
          {
            name: "Records of when the statement was discovered",
            why:
              "The three months run from when the libel came to the plaintiff's knowledge, if this Act's " +
              "provisions apply.",
            examples: [
              "Date the article or broadcast was first seen or heard",
              "Message or email that first told the plaintiff about it",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "responsible-communication-civdefam",
        name: "The defendant relies on responsible communication on a matter of public interest",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada recognized a defence of " +
          "responsible communication on matters of public interest. It is assessed with reference to " +
          "the broad thrust of the publication. It applies where the publication is on a matter of " +
          "public interest and the publisher was diligent in trying to verify the allegation, having " +
          "regard to: the seriousness of the allegation; the public importance of the matter; its " +
          "urgency; the status and reliability of the source; whether the plaintiff's side of the story " +
          "was sought and accurately reported; whether including the defamatory statement was " +
          "justifiable; whether its public interest lay in the fact that it was made rather than its " +
          "truth (\"reportage\"); and any other relevant circumstances (para. 126). The Court said the " +
          "defence is \"available to anyone who publishes material of public interest in any medium\" " +
          "(para. 96), noting that \"a review of recent defamation case law suggests that many actions " +
          "now concern blog postings and other online media\" (para. 97).",
        whenThisComesUp:
          "When the statement was published -- an article, broadcast, post or blog -- and the statement " +
          "of defence says it concerned a matter of public interest and was responsibly checked.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "justification-or-privilege-civdefam",
        name: "The defendant says the statement was true, or was made on a privileged occasion",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said that where " +
          "statements of fact are at issue, usually only two defences are available: that the statement " +
          "was substantially true (justification), and that the statement was made in a protected " +
          "context (privilege) (para. 32). Grant itself asked whether those defences should be expanded " +
          "(para. 32), which is where the responsible communication defence comes from. To succeed on " +
          "justification, a defendant must adduce evidence showing that the statement was substantially " +
          "true (para. 33). On privilege, the Court said some occasions, like Parliamentary and legal " +
          "proceedings, are absolutely privileged, while others, like reference letters or credit " +
          "reports, enjoy \"qualified\" privilege, meaning that the privilege can be defeated by proof " +
          "that the defendant acted with malice (para. 30).",
        whenThisComesUp:
          "When the statement of defence says the statement was true, or that it was made in a setting " +
          "such as a court proceeding, a reference letter or a credit report.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "fair-comment-civdefam",
        name: "The defendant says the statement was fair comment (an opinion)",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said statements of " +
          "opinion -- a category which includes any \"deduction, inference, conclusion, criticism, " +
          "judgment, remark or observation which is generally incapable of proof\" -- may attract the " +
          "defence of fair comment. The Court set out the test as reformulated in its earlier WIC Radio " +
          "decision: (a) the comment must be on a matter of public interest; (b) the comment must be " +
          "based on fact; (c) the comment, though it can include inferences of fact, must be " +
          "recognisable as comment; (d) the comment must satisfy the objective test: could any person " +
          "honestly express that opinion on the proved facts?; and (e) even though the comment " +
          "satisfies the objective test, the defence can be defeated if the plaintiff proves that the " +
          "defendant was actuated by express malice (para. 31).",
        whenThisComesUp:
          "When the statement complained of is an opinion, review or criticism, and the statement of " +
          "defence calls it fair comment.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Section 137.1 of the Courts of Justice Act provides a motion to dismiss a proceeding that " +
          "arises from an expression on a matter of public interest. \"Expression\" means any " +
          "communication, whether made verbally or non-verbally, publicly or privately, and whether or " +
          "not it is directed at a person or entity (s. 137.1(2)). Under s. 137.1(3), on motion by a " +
          "person against whom a proceeding is brought, a judge shall, subject to s. 137.1(4), dismiss " +
          "the proceeding against the person if the person satisfies the judge that the proceeding " +
          "arises from an expression made by the person that relates to a matter of public interest. " +
          "Under s. 137.1(4), a judge shall not dismiss the proceeding if the responding party " +
          "satisfies the judge that (a) there are grounds to believe that (i) the proceeding has " +
          "substantial merit, and (ii) the moving party has no valid defence in the proceeding; and (b) " +
          "the harm likely to be or have been suffered by the responding party as a result of the " +
          "moving party's expression is sufficiently serious that the public interest in permitting the " +
          "proceeding to continue outweighs the public interest in protecting that expression. Once the " +
          "motion is made, no further steps may be taken in the proceeding by any party until the " +
          "motion, including any appeal, has been finally disposed of (s. 137.1(5)). If the proceeding " +
          "is dismissed under the section, the moving party is entitled to costs on the motion and in " +
          "the proceeding on a full indemnity basis, unless the judge determines that such an award is " +
          "not appropriate in the circumstances (s. 137.1(7)). Under s. 137.2(1) and (2), the motion " +
          "may be made at any time after the proceeding has commenced, and must be heard no later than " +
          "60 days after notice of the motion is filed with the court.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved. " +
          "The Libel and Slander Act sets a shorter three-month period for libel in an Ontario " +
          "newspaper or broadcast -- see that part of the checklist.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "newspaper article about me was false",
      "news broadcast ruined my reputation",
      "sue a newspaper for libel",
      "sue a TV station over a story",
      "online article accused me of a crime",
      "lost my clients because of false posts",
      "blog post calling me a fraud",
      "want a retraction from the publisher",
      "slander by my former business partner",
      "reputation damages over $50,000",
      "radio host said false things about me",
      "notice of libel to a newspaper",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Supreme Court of Canada -- Grant v. Torstar Corp., 2009 SCC 61",
        officialUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        pinpoint:
          "paras. 28-33 (elements; privilege, fair comment, justification), 96-97, 126 (responsible " +
          "communication)",
      },
      {
        sourceName:
          "Supreme Court of Canada -- Hill v. Church of Scientology of Toronto, [1995] 2 S.C.R. 1130",
        officialUrl: "docs/sources/hill-v-church-of-scientology-1995-2-SCR-1130.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "p. 1196 (general damages presumed; reasons of Cory J. for the majority)",
      },
      {
        sourceName: "Libel and Slander Act, R.S.O. 1990, c. L.12",
        officialUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1(1), 5(1), 6, 7, 8(1), 8(3)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 137.1(2)-(5), 137.1(7), 137.2(1)-(2)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Superior Court of Justice -- Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "burden of proof",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "civil-claim-negligence",
    name: "Injury or property loss caused by someone's carelessness (negligence)",
    broughtBy:
      "The person who was hurt, or whose property was damaged (the plaintiff), suing the person, " +
      "business, professional or institution they say did not take reasonable care (the defendant).",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "duty-of-care-civneg",
        name: "The defendant owed the plaintiff a duty of care",
        plainExplanation:
          "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a " +
          "successful action in negligence requires the plaintiff to show four things: (1) that the " +
          "defendant owed them a duty of care; (2) that the defendant's behaviour breached the standard " +
          "of care; (3) that the plaintiff sustained damage; and (4) that the damage was caused, in " +
          "fact and in law, by the defendant's breach (para. 3). This part of the checklist is about " +
          "the first. In Cooper v. Hobart, 2001 SCC 79, the Court described the test in two stages. At " +
          "the first stage, the Court asked whether the harm that occurred was \"the reasonably " +
          "foreseeable consequence of the defendant's act\" (para. 30), and said that \"reasonable " +
          "foreseeability of the harm must be supplemented by proximity\" -- a word \"used in the " +
          "authorities to characterize the type of relationship in which a duty of care may arise\" " +
          "(para. 31). \"If foreseeability and proximity are established at the first stage, a prima " +
          "facie duty of care arises.\" At the second stage, \"the question still remains whether there " +
          "are residual policy considerations outside the relationship of the parties that may negative " +
          "the imposition of a duty of care\" (para. 30). The Court said the second stage generally " +
          "arises only where the duty of care claimed does not fall within a recognized category (para. " +
          "39). The first category it named is the situation where the defendant's act foreseeably " +
          "causes physical harm to the plaintiff or the plaintiff's property (para. 36).",
        sourceUrl: "docs/sources/cooper-v-hobart-2001-SCC-79.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
            pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3",
          },
        ],
        evidenceCategories: [
          {
            name: "Records of how you and the defendant were connected",
            why: "The duty of care question looks at the relationship between the parties.",
            examples: [
              "Receipts, tickets, contracts or appointment records",
              "Enrolment, membership or registration records",
              "An engagement letter or account with a professional",
              "Photos or a map of where you were and where the defendant was",
            ],
          },
          {
            name: "Records of what happened",
            why:
              "Shows what the defendant did or failed to do, and what harm could be seen coming.",
            examples: [
              "Photos or video of the scene",
              "An incident or occurrence report",
              "Names and contact details of witnesses",
              "Messages or emails sent before or after the event",
            ],
          },
        ],
      },
      {
        id: "standard-of-care-civneg",
        name: "The defendant did not take the care a reasonable person would have taken",
        plainExplanation:
          "This part of the checklist is about the standard of care. In Ryan v. Victoria (City), [1999] " +
          "1 S.C.R. 201, the Supreme Court of Canada said conduct is negligent if it creates an " +
          "objectively unreasonable risk of harm. To avoid liability, a person must exercise the " +
          "standard of care that would be expected of an ordinary, reasonable and prudent person in the " +
          "same circumstances. The Court said what is reasonable depends on the facts of each case, " +
          "including the likelihood of a known or foreseeable harm, the gravity (seriousness) of that " +
          "harm, and the burden or cost of preventing the injury. One may also look to outside " +
          "indicators of reasonable conduct, such as custom, industry practice, and statutory or " +
          "regulatory standards (para. 28). The Court added that legislative standards are relevant to " +
          "the common law standard of care, but the two are not necessarily the same: a statute that " +
          "requires or forbids certain activities may be evidence of reasonable conduct, but it does " +
          "not extinguish the underlying obligation of reasonableness (para. 29).",
        sourceUrl: "docs/sources/ryan-v-victoria-city-1999-1-SCR-201.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "What the defendant did or did not do",
            why:
              "The standard of care question compares the defendant's conduct with what a reasonable person " +
              "would have done in the same circumstances.",
            examples: [
              "Photos, video or measurements of the hazard or conduct",
              "Witness statements",
              "The defendant's own messages, reports or admissions",
            ],
          },
          {
            name: "Standards and practices for that kind of activity",
            why:
              "Ryan names custom, industry practice and statutory or regulatory standards as outside " +
              "indicators of reasonable conduct.",
            examples: [
              "Published industry or professional guidelines",
              "Manufacturer's instructions or warnings",
              "Applicable safety rules, codes or bylaws",
              "Prior complaints, warnings or inspection records",
            ],
          },
        ],
      },
      {
        id: "damage-sustained-civneg",
        name: "The plaintiff sustained damage the law recognizes",
        plainExplanation:
          "This part of the checklist is about the damage. In Mustapha v. Culligan of Canada Ltd., 2008 " +
          "SCC 27, the Supreme Court of Canada said that, generally, a plaintiff who suffers personal " +
          "injury will be found to have suffered damage, and that damage for this purpose includes " +
          "psychological injury (para. 8). But the Court also said psychological disturbance that rises " +
          "to the level of personal injury must be distinguished from psychological upset. The law does " +
          "not recognize upset, disgust, anxiety, agitation or other mental states that fall short of " +
          "injury; a compensable injury must be serious and prolonged and rise above the ordinary " +
          "annoyances, anxieties and fears that people living in society routinely accept (para. 9). " +
          "Mustapha discussed personal and psychological injury. It did not set out a rule about damage " +
          "to property, and none is stated here.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Records of the injury",
            why: "Shows the injury itself, when it was first treated, and how long it lasted.",
            examples: [
              "Emergency, clinic or hospital records",
              "Records from a family doctor, specialist, physiotherapist or counsellor",
              "Photos of visible injuries over time",
            ],
          },
          {
            name: "Records of what the harm cost you",
            why: "Shows the money and other losses that followed.",
            examples: [
              "Receipts for treatment, medication and travel to appointments",
              "Repair estimates or replacement receipts for damaged property",
              "Pay stubs or employer letters showing time missed from work",
            ],
          },
        ],
      },
      {
        id: "causation-and-remoteness-civneg",
        name: "The defendant's carelessness caused the damage, and the damage was not too remote",
        plainExplanation:
          "This part of the checklist is about causation. In Clements v. Clements, 2012 SCC 32, the " +
          "majority of the Supreme Court of Canada said the test for showing causation is the \"but for\" " +
          "test: the plaintiff must show on a balance of probabilities that \"but for\" the defendant's " +
          "negligent act, the injury would not have occurred. The Court said this is a factual inquiry " +
          "(para. 8), and that the test must be applied in a robust common sense fashion; there is no " +
          "need for scientific evidence of the precise contribution the defendant's negligence made to " +
          "the injury (para. 9). The Court described \"but for\" causation as the general rule and set " +
          "out a narrow exception, under which liability can rest on showing that the defendant's conduct " +
          "materially contributed to risk of the plaintiff's injury, where the plaintiff has " +
          "established that the loss would not have occurred \"but for\" the negligence of two or more " +
          "wrongdoers, each possibly in fact responsible, and, through no fault of the plaintiff's own, " +
          "cannot show which one was the \"but for\" cause because each can point to another as the " +
          "possible cause (para. 46). Causation \"in law\" is about remoteness. In Mustapha v. Culligan of " +
          "Canada Ltd., 2008 SCC 27, the Court said the remoteness inquiry asks whether \"the harm [is] " +
          "too unrelated to the wrongful conduct to hold the defendant fairly liable\" (para. 12). It " +
          "described a reasonably foreseeable harm as a \"real risk\" -- one which would occur to the " +
          "mind of a reasonable person in the defendant's position and which they would not brush aside " +
          "as far-fetched (para. 13).",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
            pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, paras. 12-13",
          },
        ],
        evidenceCategories: [
          {
            name: "A timeline linking the event to the harm",
            why:
              "Shows the order of events: what the defendant did, then what happened to you or your " +
              "property.",
            examples: [
              "A dated timeline",
              "Photos taken before and after",
              "Records made at or near the time of the event",
            ],
          },
          {
            name: "Records connecting the harm to the event",
            why:
              "Speaks to whether the injury or loss came from this event and not something else.",
            examples: [
              "A treating doctor's notes on how the injury happened",
              "Repair or inspection reports describing the cause of damage",
              "Witness accounts of what happened",
            ],
          },
        ],
      },
      {
        id: "burden-of-proof-civneg",
        name: "The plaintiff has to prove the claim on a balance of probabilities",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "An organized record of your evidence",
            why:
              "Each part of the claim needs evidence behind it; a record shows what you have and what is " +
              "missing.",
            examples: [
              "A timeline of events with dates",
              "A list of documents and what each one shows",
              "Names and contact details of witnesses",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "contributory-negligence-apportionment-civneg",
        name:
          "The Defence says the plaintiff's own carelessness, or someone else, also contributed",
        plainExplanation:
          "This topic is about a Defence that says the plaintiff's own fault contributed to the damage, " +
          "or that other people share the fault. Under s. 3 of the Negligence Act, in any action for " +
          "damages founded on the fault or negligence of the defendant, if fault or negligence is found " +
          "on the part of the plaintiff that contributed to the damages, the court shall apportion the " +
          "damages in proportion to the degree of fault or negligence found against the parties. Under " +
          "s. 4, if it is not practicable to determine the respective degree of fault or negligence " +
          "between parties, they are deemed to be equally at fault. Under s. 1, where two or more " +
          "persons are found at fault or negligent, they are jointly and severally liable to the person " +
          "suffering the loss; as between themselves, unless a contract (express or implied) says " +
          "otherwise, each must contribute in the degree they are found at fault. Under s. 5, a person " +
          "who is not already a party but is or may be wholly or partly responsible for the damages " +
          "claimed may be added as a defendant, or made a third party under the rules of court.",
        whenThisComesUp:
          "When the Statement of Defence says the injured person's own actions contributed to what " +
          "happened, or blames another person or business as well.",
        sourceUrl: "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2004-01-01",
      },
      {
        id: "occupiers-liability-premises-civneg",
        name: "The harm happened on someone's premises (Occupiers' Liability Act)",
        plainExplanation:
          "This topic is about harm that happened on premises -- land, buildings and the other places " +
          "the Act defines. Under s. 2 of the Occupiers' Liability Act, subject to s. 9, the Act " +
          "applies in place of the common law rules that determine the care an occupier must show " +
          "towards people entering the premises and the property they bring. Under s. 3(1), an occupier " +
          "of premises owes a duty to take such care as in all the circumstances of the case is " +
          "reasonable to see that persons entering on the premises, and the property they bring, are " +
          "reasonably safe while on the premises. Under s. 3(2), this applies whether the danger is " +
          "caused by the condition of the premises or by an activity carried on there. Under s. 3(3), " +
          "that duty applies except in so far as the occupier is free to and does restrict, modify or " +
          "exclude it. Under s. 5(1), the duty (or the liability for breaching it) cannot be restricted " +
          "or excluded by a contract to which the person owed the duty is not a party, and under s. " +
          "5(3), where an occupier is free to restrict, modify or exclude it, the occupier shall take " +
          "reasonable steps to bring the restriction, modification or exclusion to the attention of the " +
          "person to whom the duty is owed. Under s. 4(1), the s. 3(1) duty does not apply to risks willingly assumed by the " +
          "person who enters the premises; in that case the occupier owes a duty not to create a danger " +
          "with the deliberate intent of doing harm or damage to the person or their property, and not " +
          "to act with reckless disregard of the presence of the person or their property. Sections " +
          "4(2) to (4) deem some people to have willingly assumed all risks: under s. 4(2), a person on " +
          "premises with the intention of committing, or in the commission of, a criminal act; and " +
          "under s. 4(3), a person who enters certain premises listed in s. 4(4) -- such as rural " +
          "premises that are used for agricultural purposes, are vacant or undeveloped, or are forested " +
          "or wilderness premises; golf courses when not open for playing, and recreational trails " +
          "reasonably marked by notice -- in the circumstances set out in s. 4(3). Section 1 says an " +
          "\"occupier\" includes a person in physical possession of premises, or a person who has " +
          "responsibility for and control over the condition of the premises or the activities there, " +
          "or control over who is allowed to enter -- and there can be more than one occupier of the " +
          "same premises. Snow and ice have a short notice deadline. Under s. 6.1(1), no action for " +
          "damages for personal injury caused by snow or ice can be brought against an occupier, or an " +
          "independent contractor employed by the occupier to remove snow or ice, unless, within 60 " +
          "days after the injury, written notice of the claim, including the date, time and location of " +
          "the occurrence, has been personally served on or sent by registered mail to at least one of " +
          "them. Under s. 6.1(5) and (6), failing to give that notice is not a bar if the injured " +
          "person died as a result of the injury, or if a judge finds there is reasonable excuse for " +
          "the missing or insufficient notice and the defendant is not prejudiced in its defence. Under " +
          "s. 9(3), the Negligence Act applies to causes of action under the Occupiers' Liability Act.",
        whenThisComesUp:
          "When the injury or damage happened on land, in a building, or on other premises that someone " +
          "occupies or controls.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-01-29",
      },
      {
        id: "school-supervision-standard-civneg",
        name: "A student was harmed while a school was responsible for supervising them",
        plainExplanation:
          "This topic is about harm to a student while under a school's supervision. In Myers v. Peel " +
          "County Board of Education, [1981] 2 S.C.R. 21, a 1981 decision, the Supreme Court of Canada " +
          "said the standard of care to be exercised by school authorities in providing for the " +
          "supervision and protection of students for whom they are responsible is that of the careful " +
          "or prudent parent (p. 31). The Court said this standard \"has, no doubt, become somewhat " +
          "qualified in modern times because of the greater variety of activities conducted in schools, " +
          "with probably larger groups of students using more complicated and more dangerous equipment " +
          "than formerly\", but that, \"with the qualification expressed in the McKay case and noted by " +
          "Carrothers J.A. in Thornton\", \"it remains the appropriate standard for such cases\" (pp. " +
          "31-32). The Court said this is not a standard that can be applied in the same manner and to " +
          "the same extent in every case. Its application will vary from case to case and will depend " +
          "on the number of students being supervised at the time, the nature of the exercise or " +
          "activity, the age and the degree of skill and training the students may have received for " +
          "that activity, the nature and condition of the equipment in use, the competency and capacity " +
          "of the students involved, and a host of other matters (p. 32).",
        whenThisComesUp:
          "When the person hurt was a student and the harm happened during a school activity or while " +
          "the school was responsible for supervising them.",
        sourceUrl: "docs/sources/myers-v-peel-county-board-of-education-1981-2-SCR-21.pdf",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Discovery. Under r. 30.03(1) of the Rules of Civil Procedure, a party to an action must " +
          "serve on every other party an affidavit of documents (Form 30A or 30B) disclosing, to the " +
          "full extent of the party's knowledge, information and belief, all documents relevant to any " +
          "matter in issue in the action that are or have been in the party's possession, control or " +
          "power. Under r. 31.03(1), a party may examine for discovery any other party adverse in " +
          "interest once, and more than once only with leave of the court. Under r. 31.05.1(1), no " +
          "party shall, in conducting oral examinations for discovery, exceed a total of seven hours of " +
          "examination, regardless of the number of parties or other persons to be examined, except " +
          "with the consent of the parties or with leave of the court. Under r. 76.04(2), in an action " +
          "proceeding under Rule 76 (Simplified Procedure), the total is three hours instead of seven.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
      {
        note:
          "Mandatory mediation -- only in some places. Under r. 24.1.04(1) of the Rules of Civil " +
          "Procedure, Rule 24.1 (Mandatory Mediation) applies to actions that were governed by it " +
          "immediately before January 1, 2010; to actions commenced on or after January 1, 2010 in the " +
          "City of Ottawa, the City of Toronto or the County of Essex; and to actions transferred to " +
          "one of those counties on or after January 1, 2014, unless the court orders otherwise. Rule " +
          "24.1.04(2) and (2.1) list actions it does not apply to, including actions under Rule 64 " +
          "(Mortgage Actions) and actions certified as class proceedings. Under r. 24.1.09(1), a " +
          "mediation session shall take place within 180 days after the first defence has been filed, " +
          "unless the court orders otherwise. Under r. 24.1.05, the court may make an order on a " +
          "party's motion exempting the action from the Rule. Rule 24.1.02 describes mediation as a " +
          "process in which a neutral third party facilitates communication among the parties to a " +
          "dispute, to assist them in reaching a mutually acceptable resolution.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
    ],
    signals: [
      "hurt because someone was careless",
      "suing for negligence over my injuries",
      "someone's carelessness damaged my property",
      "professional made a careless mistake that cost me",
      "school didn't supervise my child and they got hurt",
      "nobody took proper care and I was injured",
      "injured because of poor supervision",
      "negligence claim in Superior Court",
      "institution failed to take reasonable care",
      "my injury was caused by someone's negligence",
      "they should have known it was dangerous",
      "careless mistake caused me a serious injury",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 3, 8-9, 12-13",
      },
      {
        sourceName: "Cooper v. Hobart, 2001 SCC 79",
        officialUrl: "docs/sources/cooper-v-hobart-2001-SCC-79.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 30, 36, 39",
      },
      {
        sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201",
        officialUrl: "docs/sources/ryan-v-victoria-city-1999-1-SCR-201.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 28-29",
      },
      {
        sourceName: "Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 8-9",
      },
      {
        sourceName: "Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21",
        officialUrl: "docs/sources/myers-v-peel-county-board-of-education-1981-2-SCR-21.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "pp. 31-32",
      },
      {
        sourceName: "Negligence Act, R.S.O. 1990, c. N.1",
        officialUrl: "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1, 3-5",
      },
      {
        sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
        officialUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1-3, 6.1, 9(3)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
        officialUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "rr. 24.1.02, 24.1.04, 24.1.05, 24.1.09(1), 30.03(1), 31.03(1), 31.05.1(1), 76.04(2)",
      },
      {
        sourceName: "Superior Court of Justice -- Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "Burden of proof",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "civil-claim-negligent-misrepresentation",
    name:
      "Relying on a careless false statement that caused you loss (negligent misrepresentation)",
    broughtBy:
      "The person who relied on a statement someone made to them (the plaintiff), suing the person " +
      "or business that made it (the defendant), where the plaintiff says the statement was untrue, " +
      "inaccurate or misleading and was made carelessly.",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "special-relationship-duty-civmisrep",
        name: "There was a \"special relationship\" giving rise to a duty of care",
        plainExplanation:
          "In Queen v. Cognos Inc., [1993] 1 S.C.R. 87, Justice Iacobucci wrote that the Supreme Court " +
          "of Canada's decisions suggest five general requirements for a negligent misrepresentation " +
          "claim: (1) there must be a duty of care based on a \"special relationship\" between the person " +
          "who made the statement (the representor) and the person who received it (the representee); " +
          "(2) the statement must be untrue, inaccurate, or misleading; (3) the representor must have " +
          "acted negligently in making it; (4) the representee must have relied on it in a reasonable " +
          "manner; and (5) the reliance must have been detrimental to the representee, in the sense " +
          "that damages resulted (p. 110). (Justice Iacobucci wrote for himself and Justice Sopinka. " +
          "Justice La Forest, writing for himself and two other judges, said he agreed with Justices " +
          "Iacobucci and McLachlin, subject to his reasons in a companion case.) This part of the " +
          "checklist is about the first requirement. Justice Iacobucci noted there is debate about the " +
          "proper test for when a \"special relationship\" exists -- some point to \"foreseeable and " +
          "reasonable reliance\" on the statement, others to a \"voluntary assumption of responsibility\" " +
          "by the person making it -- and found it unnecessary to take part in that debate in that case " +
          "(p. 116). In Cooper v. Hobart, 2001 SCC 79, the Court listed liability for negligent " +
          "misstatement among the categories in which proximity has been recognized (para. 36).",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/cooper-v-hobart-2001-SCC-79.pdf",
            pinpoint: "Cooper v. Hobart, 2001 SCC 79, para. 36",
          },
        ],
        evidenceCategories: [
          {
            name: "Records of the relationship and why the statement was made",
            why: "Speaks to the relationship between you and the person who made the statement.",
            examples: [
              "Emails, letters or messages arranging the meeting or request",
              "A job posting, proposal, engagement letter or account records",
              "Notes of who was present and in what role",
            ],
          },
        ],
      },
      {
        id: "statement-untrue-civmisrep",
        name: "The statement was untrue, inaccurate or misleading",
        plainExplanation:
          "This part of the checklist is about the second requirement listed in Queen v. Cognos Inc., " +
          "[1993] 1 S.C.R. 87: that \"the representation in question must be untrue, inaccurate, or " +
          "misleading\" (p. 110). See \"The statement was implied, not spelled out\" and \"The statement " +
          "was about the future\" for two related points Justice Iacobucci discussed.",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The statement itself",
            why: "Shows exactly what was said or written, and when.",
            examples: [
              "Emails, letters, texts or brochures containing the statement",
              "Notes made during or right after the conversation",
              "Names of anyone else who heard it",
            ],
          },
          {
            name: "What the true situation was",
            why: "Shows how the statement differed from the facts.",
            examples: [
              "Documents showing the actual facts at the time",
              "Later correspondence admitting or revealing the true position",
            ],
          },
        ],
      },
      {
        id: "made-negligently-civmisrep",
        name: "The statement was made carelessly",
        plainExplanation:
          "This part of the checklist is about the third requirement: that the person made the " +
          "statement negligently. In Queen v. Cognos Inc., [1993] 1 S.C.R. 87, Justice Iacobucci said " +
          "the standard of care required of a person making representations is an objective one: a duty " +
          "to exercise such reasonable care as the circumstances require to ensure that the " +
          "representations made are accurate and not misleading (p. 121). He said that \"a duty of care " +
          "with respect to representations made during pre-contractual negotiations is over and above a " +
          "duty to be honest in making those representations\": it requires not just that the person be " +
          "truthful and honest, but also that they \"exercise such reasonable care as the circumstances " +
          "require to ensure that the representations made are accurate and not misleading\". He also " +
          "said \"the representor's belief in the truth of his or her representations is irrelevant to " +
          "that standard of care\" (p. 125).",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "What the person knew or could have checked",
            why: "Speaks to whether reasonable care was taken before the statement was made.",
            examples: [
              "Documents the person had, or could have looked at, when they spoke",
              "Later messages showing what they knew at the time",
              "Any caveats or qualifications they did or did not give",
            ],
          },
        ],
      },
      {
        id: "reasonable-reliance-and-loss-civmisrep",
        name: "The plaintiff relied on the statement in a reasonable manner, and damages resulted",
        plainExplanation:
          "This part of the checklist is about the fourth and fifth requirements listed in Queen v. " +
          "Cognos Inc., [1993] 1 S.C.R. 87: \"the representee must have relied, in a reasonable manner, " +
          "on said negligent misrepresentation\", and \"the reliance must have been detrimental to the " +
          "representee in the sense that damages resulted\" (p. 110).",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "What you did because of the statement",
            why: "Shows the decision or step you took in reliance on it, and when.",
            examples: [
              "Resignation letter, signed contract, purchase or transfer records",
              "Messages showing you referred to the statement when deciding",
              "A dated timeline from the statement to your decision",
            ],
          },
          {
            name: "What it cost you",
            why: "Shows the damages that resulted.",
            examples: [
              "Pay records from before and after",
              "Moving, travel or other out-of-pocket receipts",
              "Statements showing money lost",
            ],
          },
        ],
      },
      {
        id: "burden-of-proof-civmisrep",
        name: "The plaintiff has to prove the claim on a balance of probabilities",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "An organized record of your evidence",
            why:
              "Each part of the claim needs evidence behind it; a record shows what you have and what is " +
              "missing.",
            examples: [
              "A timeline of events with dates",
              "A list of documents and what each one shows",
              "Names and contact details of witnesses",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "implied-representation-civmisrep",
        name: "The statement was implied, not spelled out",
        plainExplanation:
          "This topic is about a Defence that says nothing was expressly stated, only implied. In Queen " +
          "v. Cognos Inc., [1993] 1 S.C.R. 87, Justice Iacobucci rejected, as a general rule, the " +
          "proposition that an implied representation cannot under any circumstance give rise to " +
          "actionable negligence, finding no reason in principle, authority or policy for it (p. 130). " +
          "He said a flexible approach is preferable, and that it is arbitrary and premature to declare " +
          "as a general rule that nothing less than express or direct representations can succeed (p. " +
          "131).",
        whenThisComesUp:
          "When the Statement of Defence says the defendant never actually said the thing relied on, " +
          "and that it was only an inference.",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "future-events-statement-civmisrep",
        name: "The statement was about the future",
        plainExplanation:
          "This topic is about a Defence that says the statement was only about future events or " +
          "expectations. In Queen v. Cognos Inc., [1993] 1 S.C.R. 87, Justice Iacobucci noted there are " +
          "authorities supporting the view that only representations of existing facts, and not those " +
          "relating to future occurrences, can give rise to actionable negligence. He did not decide " +
          "whether that view is correct: \"assuming without deciding\" that it is, he found the " +
          "representations most relevant in that case related to a matter of existing fact -- the very " +
          "existence of the job applied for (p. 129).",
        whenThisComesUp:
          "When the Statement of Defence says the statement was a prediction, a forecast or a statement " +
          "of intention rather than a statement of fact.",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        id: "disclaimer-or-contract-term-civmisrep",
        name: "A disclaimer or a contract term limited responsibility for the statement",
        plainExplanation:
          "This topic is about a Defence that relies on a disclaimer, or on a term of a contract signed " +
          "later. In Queen v. Cognos Inc., [1993] 1 S.C.R. 87, Justice Iacobucci said he was \"not " +
          "prepared to hold that nothing less than the clearest and most express disclaimer will " +
          "suffice to negate a duty of care\" (p. 138); in that case he found the employment contract's " +
          "clauses were not a disclaimer of responsibility for what was said in the interview (pp. 136, " +
          "138). He also said that in deciding whether a limitation (or exclusion) of liability clause " +
          "protects a defendant in a particular situation, the first step is to interpret the clause to " +
          "see if it applies to the tort or breach of contract complained of. If the clause is wide " +
          "enough to cover, for example, the defendant's negligence, it may operate to limit the " +
          "defendant's liability for breach of a common law duty of care, subject to any overriding " +
          "considerations (p. 140).",
        whenThisComesUp:
          "When the Statement of Defence points to a disclaimer, a \"no reliance\" clause, or a contract " +
          "signed after the statement was made.",
        sourceUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Pleading misrepresentation. Under r. 25.06(8) of the Rules of Civil Procedure, where fraud, " +
          "misrepresentation, breach of trust, malice or intent is alleged, the pleading shall contain " +
          "full particulars, but knowledge may be alleged as a fact without pleading the circumstances " +
          "from which it is to be inferred.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
      },
    ],
    signals: [
      "relied on careless information that turned out to be wrong",
      "they gave me inaccurate information and I lost money acting on it",
      "negligent misrepresentation",
      "quit my job for a position that didn't exist as described",
      "advisor gave me wrong figures and I relied on them",
      "made a big decision based on what they told me and it was untrue",
      "they assured me of something that wasn't accurate",
      "the information they gave me was misleading and cost me",
      "employer misrepresented the job in the interview",
      "relied on their statement to my detriment",
      "careless statement caused me a financial loss",
      "told me something inaccurate without checking",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Queen v. Cognos Inc., [1993] 1 S.C.R. 87",
        officialUrl: "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "pp. 93, 110, 116, 121, 125, 129-131, 136, 138, 140",
      },
      {
        sourceName: "Cooper v. Hobart, 2001 SCC 79",
        officialUrl: "docs/sources/cooper-v-hobart-2001-SCC-79.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "para. 36",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
        officialUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "r. 25.06(8)",
      },
      {
        sourceName: "Superior Court of Justice -- Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "Burden of proof",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "civil-claim-unjust-enrichment",
    name: "Unjust enrichment (getting back a benefit someone kept without a legal reason)",
    broughtBy:
      "The person who gave money, property, work or another benefit that the other person received " +
      "and kept.",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "enrichment-civue",
        name: "The defendant was enriched -- received and kept a benefit from the plaintiff",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, the Supreme Court of Canada said the cause of " +
          "action for unjust enrichment has three elements: \"(1) an enrichment of the defendant; (2) a " +
          "corresponding deprivation of the plaintiff; and (3) an absence of juristic reason for the " +
          "enrichment\" (para. 30). In Kerr v. Baranow, 2011 SCC 10, the Court said that for the first " +
          "requirement the plaintiff must show that he or she gave something to the defendant which the " +
          "defendant received and retained. The benefit need not be retained permanently, but there " +
          "must be a benefit which has enriched the defendant and which can be restored to the " +
          "plaintiff in specie or by money. The benefit must be tangible. It may be positive or " +
          "negative -- negative in the sense that the benefit spares the defendant an expense he or she " +
          "would have had to undertake (para. 38). The Court has taken a straightforward economic " +
          "approach to the first two elements; moral and policy questions are dealt with at the " +
          "juristic reason stage (para. 37). The Superior Court of Justice's guide to the steps in a " +
          "civil case says that in every civil case the plaintiff has the burden of proof to establish, " +
          "on a balance of probabilities, the allegations in the Statement of Claim.",
        sourceUrl: "docs/sources/kerr-v-baranow-2011-SCC-10.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf",
            pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, para. 30",
          },
          {
            sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
            pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)",
          },
        ],
        evidenceCategories: [
          {
            name: "What was given",
            why: "Shows the benefit the plaintiff gave and that the defendant received it.",
            examples: [
              "Bank transfers, cheques or receipts",
              "Records of work done or materials supplied",
              "Title or account records showing the transfer",
            ],
          },
          {
            name: "That the defendant kept it",
            why: "The benefit must have been received and retained.",
            examples: [
              "Messages refusing to return money or property",
              "Current title or account records",
            ],
          },
        ],
      },
      {
        id: "corresponding-deprivation-civue",
        name: "The plaintiff suffered a corresponding deprivation",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the plaintiff's loss is " +
          "material only if the defendant has gained a benefit or been enriched. That is why the second " +
          "requirement obligates the plaintiff to establish not simply that the defendant has been " +
          "enriched, but also that the enrichment corresponds to a deprivation which the plaintiff has " +
          "suffered (para. 39).",
        sourceUrl: "docs/sources/kerr-v-baranow-2011-SCC-10.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The plaintiff's side of the transaction",
            why: "Shows the loss matches what the defendant gained.",
            examples: [
              "The plaintiff's own bank statements showing the money leaving",
              "Time records or unpaid invoices for work done",
              "Records of property the plaintiff gave up",
            ],
          },
        ],
      },
      {
        id: "no-juristic-reason-civue",
        name:
          "There was no juristic reason (no reason in law or justice) for the defendant to keep the " +
          "benefit",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the third element is that " +
          "the benefit and corresponding detriment must have occurred without a juristic reason: \"To " +
          "put it simply, this means that there is no reason in law or justice for the defendant's " +
          "retention of the benefit conferred by the plaintiff, making its retention 'unjust' in the " +
          "circumstances of the case\" (para. 40). In Garland v. Consumers' Gas Co., 2004 SCC 25, the " +
          "Court said the analysis is in two parts. First, the plaintiff must show that no juristic " +
          "reason from an established category exists to deny recovery. The established categories " +
          "include a contract, a disposition of law, a donative intent, and other valid common law, " +
          "equitable or statutory obligations. If there is no juristic reason from an established " +
          "category, the plaintiff has made out a prima facie case (para. 44). In Moore v. Sweet, 2018 " +
          "SCC 52, the Court said that if any of these categories applies, the analysis ends and the " +
          "plaintiff's claim must fail; its example is a benefit conferred on a defendant by way of " +
          "gift (para. 57). The second part -- where the defendant can show another reason to deny " +
          "recovery -- is described under the defendant topics below.",
        sourceUrl: "docs/sources/kerr-v-baranow-2011-SCC-10.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf",
            pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, para. 44",
          },
          {
            sourceUrl: "docs/sources/moore-v-sweet-2018-SCC-52.pdf",
            pinpoint: "Moore v. Sweet, 2018 SCC 52, para. 57",
          },
        ],
        evidenceCategories: [
          {
            name: "What the parties said at the time",
            why:
              "Bears on whether there was a contract, a gift or another reason for the transfer.",
            examples: [
              "Messages or emails about why the money or work was given",
              "Any written agreement, or the lack of one",
              "Notes on cheques or transfer memos",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "residual-reason-to-deny-civue",
        name: "The defendant points to another reason the benefit should be kept",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, the Supreme Court of Canada said the " +
          "plaintiff's prima facie case is rebuttable where the defendant can show that there is " +
          "another reason to deny recovery. As a result, there is a de facto burden of proof placed on " +
          "the defendant to show the reason why the enrichment should be retained (para. 45). As part " +
          "of the defendant's attempt to rebut, courts should have regard to two factors: the " +
          "reasonable expectations of the parties, and public policy considerations (para. 46). In " +
          "Moore v. Sweet, 2018 SCC 52, the Court restated this second stage: the defendant has an " +
          "opportunity to rebut the plaintiff's prima facie case by showing that there is some residual " +
          "reason to deny recovery (para. 58).",
        whenThisComesUp:
          "When the statement of defence does not rely on a contract, a law, a gift or another legal " +
          "obligation, but says there is still a reason the defendant should keep the benefit.",
        sourceUrl: "docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/moore-v-sweet-2018-SCC-52.pdf",
            pinpoint: "Moore v. Sweet, 2018 SCC 52, para. 58",
          },
        ],
      },
      {
        id: "gift-or-resulting-trust-civue",
        name:
          "Whether a transfer for nothing in return was a gift (presumption of resulting trust)",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada listed the intention to make a " +
          "gift (referred to as a \"donative intent\") as one of the juristic reasons to deny recovery " +
          "(para. 41). A separate rule from Pecore v. Pecore, 2007 SCC 17, concerns who must prove " +
          "whether a transfer was a gift. The Court said: \"The presumption of resulting trust is a " +
          "rebuttable presumption of law and general rule that applies to gratuitous transfers.\" Where " +
          "a transfer is made for no consideration, the onus is placed on the transferee to demonstrate " +
          "that a gift was intended, because \"equity presumes bargains, not gifts\" (para. 24). Where " +
          "the presumption of advancement applies instead, it falls on the party challenging the " +
          "transfer to rebut the presumption of a gift (para. 27). On parents and children, the Court " +
          "said the presumption of advancement \"should be preserved but be limited in application to " +
          "transfers by mothers and fathers to minor children\" (para. 40). It said the presumption of " +
          "advancement should not apply to independent adult children, and that there should be \"a " +
          "rebuttable presumption that the adult child is holding the property in trust for the ageing " +
          "parent to facilitate the free and efficient management of that parent's affairs\" (para. 36); " +
          "it also declined to apply the presumption of advancement to \"dependent\" adult children " +
          "(para. 40). A transfer between a parent and an adult child may still have been intended as a " +
          "gift: it is open to the party claiming it was a gift to rebut the presumption of resulting " +
          "trust by bringing evidence (para. 41). The evidence required to rebut either presumption is " +
          "evidence of the transferor's contrary intention on the balance of probabilities (para. 43).",
        whenThisComesUp:
          "When money or property was transferred without payment in return -- for example, a parent " +
          "adding an adult child to a bank account or a title -- and one side says it was a gift.",
        sourceUrl: "docs/sources/pecore-v-pecore-2007-SCC-17.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "docs/sources/kerr-v-baranow-2011-SCC-10.pdf",
            pinpoint: "Kerr v. Baranow, 2011 SCC 10, para. 41",
          },
        ],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved. " +
          "Under s. 2(1)(a), the Limitations Act, 2002 does not apply to proceedings to which the Real " +
          "Property Limitations Act applies.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "they kept money that was never meant to be theirs",
      "put my money into my parent's house and got nothing back",
      "paid money by mistake and they won't return it",
      "worked for years on their property with no pay",
      "put my name on the account but it was my money",
      "added my son to the house title and now he claims it",
      "common-law partner kept the house I paid for",
      "they benefited at my expense",
      "unjust enrichment claim",
      "they got the insurance money that should have been mine",
      "paid off someone else's mortgage and got nothing back",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Supreme Court of Canada -- Garland v. Consumers' Gas Co., 2004 SCC 25",
        officialUrl: "docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 30, 44-46 (judgment of the Court, Iacobucci J.)",
      },
      {
        sourceName: "Supreme Court of Canada -- Kerr v. Baranow, 2011 SCC 10",
        officialUrl: "docs/sources/kerr-v-baranow-2011-SCC-10.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 37-41 (judgment of the Court, Cromwell J.)",
      },
      {
        sourceName: "Supreme Court of Canada -- Moore v. Sweet, 2018 SCC 52",
        officialUrl: "docs/sources/moore-v-sweet-2018-SCC-52.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 57-58 (reasons of Cote J. for the majority)",
      },
      {
        sourceName: "Supreme Court of Canada -- Pecore v. Pecore, 2007 SCC 17",
        officialUrl: "docs/sources/pecore-v-pecore-2007-SCC-17.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 24, 27, 36, 40-41, 43 (reasons of Rothstein J. for the majority)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Superior Court of Justice -- Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "burden of proof",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "civil-claim-wrongful-dismissal",
    name: "Wrongful dismissal (Superior Court)",
    broughtBy: "The employee whose employment was ended.",
    courtArea: "civil",
    plaintiffElements: [
      {
        id: "dismissed-without-reasonable-notice-civwd",
        name: "The employment was ended without just cause and without reasonable notice",
        plainExplanation:
          "In Honda Canada Inc. v. Keays, 2008 SCC 39, the Supreme Court of Canada said: \"An action for " +
          "wrongful dismissal is based on an implied obligation in the employment contract to give " +
          "reasonable notice of an intention to terminate the relationship in the absence of just " +
          "cause.\" It added that if an employer fails to provide reasonable notice of termination, the " +
          "employee can bring an action for breach of the implied term (para. 50). The Superior Court " +
          "of Justice's guide to the steps in a civil case says that in every civil case the plaintiff " +
          "has the burden of proof to establish, on a balance of probabilities, the allegations in the " +
          "Statement of Claim.",
        sourceUrl: "docs/sources/honda-canada-v-keays-2008-SCC-39.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
            pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)",
          },
        ],
        evidenceCategories: [
          {
            name: "The employment contract",
            why: "Shows the terms of the employment, including any clause about termination.",
            examples: [
              "Offer letter or written contract",
              "Later amendments or policies the employee signed",
            ],
          },
          {
            name: "Termination records",
            why: "Shows how and when the employment ended and what was provided.",
            examples: [
              "Termination letter",
              "Final pay statement and any termination or severance payment",
              "Record of Employment",
            ],
          },
        ],
      },
      {
        id: "esa-minimum-notice-civwd",
        name: "The Employment Standards Act minimum -- a floor, not the whole picture",
        plainExplanation:
          "Under s. 54 of the Employment Standards Act, 2000, no employer shall terminate the " +
          "employment of an employee who has been continuously employed for three months or more unless " +
          "the employer has given written notice of termination in accordance with section 57 or 58 and " +
          "the notice has expired, or has complied with section 61. Under s. 61(1), an employer may " +
          "terminate without notice or with less notice if it pays termination pay in a lump sum and " +
          "continues to make whatever benefit plan contributions would be required to maintain the " +
          "employee's benefits during the notice period the employee would otherwise have been entitled " +
          "to receive. Section 57 sets the notice by length of employment, from at least one week (less " +
          "than one year) up to at least eight weeks (eight years or more). Under s. 58, a different, " +
          "prescribed notice applies where the employer terminates 50 or more employees at an " +
          "establishment in the same four-week period. Under s. 55, prescribed employees are not " +
          "entitled to notice of termination or termination pay under this Part. Under s. 56(1), for s. " +
          "54 an employer terminates employment if it dismisses the employee or otherwise refuses or is " +
          "unable to continue employing them, constructively dismisses the employee and the employee " +
          "resigns in response within a reasonable period, or lays the employee off for longer than a " +
          "temporary lay-off. That scale is a minimum: under s. 5(2), where one or more provisions in " +
          "an employment contract or in another Act that directly relate to the same subject matter as " +
          "an employment standard provide a greater benefit to an employee than the employment " +
          "standard, those provisions apply and the employment standard does not apply, and under s. " +
          "8(1), subject to section 97, the Act does not affect an employee's civil remedies against " +
          "their employer.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Length of employment",
            why: "The statutory minimum depends on the period of employment.",
            examples: [
              "Offer letter or contract showing the start date",
              "T4 slips or pay stubs across the years",
            ],
          },
          {
            name: "What was paid at the end",
            why: "Shows whether notice or termination pay was given.",
            examples: [
              "Termination letter",
              "Final pay statement",
              "Records of continued benefits after the last day",
            ],
          },
        ],
      },
      {
        id: "reasonable-notice-factors-civwd",
        name: "What reasonable notice means at common law",
        plainExplanation:
          "In Honda Canada Inc. v. Keays, 2008 SCC 39, the Supreme Court of Canada said courts have " +
          "generally applied the principles from the Bardal case to decide what reasonable notice is: " +
          "\"There can be no catalogue laid down as to what is reasonable notice in particular classes " +
          "of cases.\" Reasonableness is decided with reference to each particular case, having regard " +
          "to the character of the employment, the length of service, the employee's age, and the " +
          "availability of similar employment, having regard to the employee's experience, training and " +
          "qualifications (para. 28). The Court said these four factors were adopted in Machtinger v. " +
          "HOJ Industries Ltd. and can only be determined on a case-by-case basis (para. 29), and that " +
          "the particular circumstances of the individual should be the concern of the courts (para. " +
          "30). Working out what notice period a given situation calls for is exactly the kind of " +
          "assessment this platform does not do; it is a question for a licensed paralegal or lawyer.",
        sourceUrl: "docs/sources/honda-canada-v-keays-2008-SCC-39.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The character of the job",
            why: "One of the factors the Court listed.",
            examples: [
              "Job description or title history",
              "Organization charts or reporting lines",
              "Duties and responsibilities",
            ],
          },
          {
            name: "Search for similar work",
            why:
              "The availability of similar employment is one of the factors the Court listed.",
            examples: [
              "Job applications sent and responses",
              "Records of job-search efforts after the termination",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "termination-clause-civwd",
        name: "The employer relies on a termination clause in the employment contract",
        plainExplanation:
          "In Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986, the Supreme Court of Canada " +
          "described termination only on reasonable notice as a presumption, rebuttable if the contract " +
          "of employment clearly specifies some other period of notice, whether expressly or impliedly " +
          "(p. 998). The Court held that a clause specifying notice shorter than the statutory minimum " +
          "is \"null and void\" -- the Employment Standards Act then in force made any attempt to " +
          "contract out of the minimum standards by providing lesser benefits \"null and void\" (p. " +
          "1000); s. 5(1) of the current Employment Standards Act, 2000 makes any contracting out of or " +
          "waiver of an employment standard void. The Court said such a term \"cannot be used as " +
          "evidence of the parties' intention\" (p. 1001), and that if an employment contract fails to " +
          "comply with the minimum statutory notice provisions, the presumption of reasonable notice " +
          "will not have been rebutted (p. 1004). Whether a particular clause is valid is a legal " +
          "question about that specific wording, and is not something this content can answer.",
        whenThisComesUp:
          "When the employer's statement of defence says the contract already set out what was owed on " +
          "termination and that amount was paid.",
        sourceUrl: "docs/sources/machtinger-v-hoj-industries-1992-1-SCR-986.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
            pinpoint: "Employment Standards Act, 2000, s. 5(1)",
          },
        ],
      },
      {
        id: "arbitration-clause-civwd",
        name: "The employer relies on an arbitration clause to stop the court action",
        plainExplanation:
          "In Uber Technologies Inc. v. Heller, 2020 SCC 16, Mr. Heller started a class proceeding " +
          "against Uber for violations of the Employment Standards Act, 2000, and Uber brought a motion " +
          "to stay it in favour of arbitration in the Netherlands (para. 3). The majority of the " +
          "Supreme Court of Canada said: \"This is an arbitration agreement that makes it impossible for " +
          "one party to arbitrate. It is a classic case of unconscionability\" (para. 4). The Court said " +
          "the approach to unconscionability \"requires both an inequality of bargaining power and a " +
          "resulting improvident bargain\" (para. 65), and that an inequality of bargaining power exists " +
          "when one party cannot adequately protect their interests in the contracting process (para. " +
          "66). It concluded that, based on both the disadvantages Mr. Heller faced in protecting his " +
          "bargaining interests and the unfair terms that resulted, the arbitration clause was " +
          "unconscionable and therefore invalid (para. 98). The Court did not decide whether the clause " +
          "was also invalid for contracting out of mandatory protections in the Employment Standards " +
          "Act, 2000 (para. 99). Whether a particular arbitration clause is valid is not something this " +
          "content can answer.",
        whenThisComesUp:
          "When the employer responds to the court action by pointing to an arbitration clause in the " +
          "contract and asking that the action be stayed.",
        sourceUrl: "docs/sources/uber-technologies-inc-v-heller-2020-SCC-16.pdf",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "CHOOSING BETWEEN THE TWO ROUTES MATTERS, AND THE CHOICE CAN BE FINAL. Under s. 97(2) of the " +
          "Employment Standards Act, 2000, an employee who files a complaint under the Act alleging an " +
          "entitlement to termination pay or severance pay MAY NOT commence a civil proceeding for " +
          "wrongful dismissal if the complaint and the proceeding would relate to the same termination " +
          "or severance of employment. There is one way back: under s. 97(4), an employee who withdraws " +
          "the complaint within two weeks after it is filed may then commence a civil proceeding (this " +
          "also applies to the wages bar below). The reverse also applies: under s. 98(2), an employee " +
          "who starts a civil proceeding for wrongful dismissal may not file a complaint alleging an " +
          "entitlement to termination pay or severance pay about the same termination or severance. The " +
          "same pattern applies to wages: under s. 97(1), an employee who files a complaint about an " +
          "alleged failure to pay wages or to comply with Part XIII (Benefit Plans) may not commence a " +
          "civil proceeding about the same matter, and under s. 98(1) an employee who starts a civil " +
          "proceeding about that may not file a complaint about the same matter. Under s. 8(1), subject " +
          "to section 97, no civil remedy of an employee against their employer is affected by the Act. " +
          "Because the choice can be final, which route to take is a decision worth taking to a " +
          "licensed paralegal or lawyer before filing anything.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Which court, and which procedure. Ontario's page on suing someone in Small Claims Court says " +
          "that for anything over $50,000 a claim goes to the Superior Court of Justice, and that " +
          "someone owed more than $50,000 can still file in Small Claims Court if willing to waive the " +
          "amount over $50,000. Under r. 57.05(1) of the Rules of Civil Procedure, if a plaintiff in " +
          "the Superior Court recovers an amount within the monetary jurisdiction of the Small Claims " +
          "Court, the court may order that the plaintiff shall not recover any costs; under r. " +
          "57.05(2), that does not apply to an action transferred to the Superior Court of Justice " +
          "under section 107 of the Courts of Justice Act. In the Superior Court, under r. 76.02(1), " +
          "the simplified procedure in Rule 76 must be used if the plaintiff's claim is exclusively for " +
          "money, real property or personal property, and the total of the money claimed and the fair " +
          "market value of any property is $200,000 or less, exclusive of interest and costs. Under r. " +
          "76.02(3), it may be used in any other action at the option of the plaintiff, subject to " +
          "subrules (4) to (9), and under r. 76.02(4) the statement of claim must indicate that the " +
          "action is being brought under Rule 76. Under r. 76.01(1), the simplified procedure does not " +
          "apply to actions under the Class Proceedings Act, 1992, actions under the Construction Act " +
          "(except trust claims), actions assigned for case management under rule 77.05, or actions in " +
          "respect of which a jury notice is delivered in accordance with subrule 76.02.1(2). Under r. " +
          "76.02(2) and (2.1), where there are two or more plaintiffs or defendants, each plaintiff's " +
          "claim, or the claim against each defendant, is considered separately.",
        sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
            pinpoint: "Which court",
          },
        ],
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that a " +
          "proceeding would be an appropriate way to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "fired after many years and owed more than $50,000",
      "severance offer is too low after many years",
      "fired without cause after a long career",
      "employer only paid the ESA minimum",
      "termination clause in my employment contract",
      "arbitration clause in my job contract",
      "senior manager let go without notice",
      "reasonable notice at common law",
      "they gave me only a few weeks' pay after decades",
      "constructive dismissal big pay cut",
      "wrongful dismissal lawsuit Superior Court",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Supreme Court of Canada -- Honda Canada Inc. v. Keays, 2008 SCC 39",
        officialUrl: "docs/sources/honda-canada-v-keays-2008-SCC-39.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 28-30, 50 (reasons of Bastarache J. for the majority)",
      },
      {
        sourceName: "Supreme Court of Canada -- Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986",
        officialUrl: "docs/sources/machtinger-v-hoj-industries-1992-1-SCR-986.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "pp. 998, 1000, 1001, 1004 (reasons of Iacobucci J. for the majority)",
      },
      {
        sourceName: "Supreme Court of Canada -- Uber Technologies Inc. v. Heller, 2020 SCC 16",
        officialUrl: "docs/sources/uber-technologies-inc-v-heller-2020-SCC-16.pdf",
        verifiedAt: "2026-09-30",
        pinpoint: "paras. 3-4, 65-66, 98-99 (reasons of Abella and Rowe JJ. for the majority)",
      },
      {
        sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
        officialUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "ss. 5(1)-(2), 8(1), 54, 55, 56(1), 57, 58(1), 61(1), 97(1), 97(2), 97(4), 98(1), 98(2)",
      },
      {
        sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
        officialUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 57.05(1), 76.02(1), (3), (4)",
      },
      {
        sourceName: "Ontario.ca -- Suing someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-30",
        pinpoint: "claims over $50,000",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Superior Court of Justice -- Steps in a civil case",
        officialUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        pinpoint: "burden of proof",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
];
