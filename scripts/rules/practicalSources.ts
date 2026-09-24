/**
 * TIER 2 — the official court pages and guides the practical layer cites.
 *
 * *** WHY A SECOND TIER, AND NOT JUST MORE SOURCES ***
 *
 * Tier 1 is legislation: what the law REQUIRES. A rule number is stable, the
 * text changes rarely, and a change is always significant.
 *
 * Tier 2 is what actually happens at the counter: the filing fee, whether you
 * can file online, what to bring, how long the court takes. None of that is in
 * O. Reg. 258/98 and none of it can be derived from it. A person who knows
 * r. 7.01 still does not know that filing a claim costs $108 online.
 *
 * The two tiers differ in a way the change watch has to respect. A fee page
 * changes when a fee changes, which is a content update, not an emergency. A
 * rule changing is an emergency. Same mechanism, different urgency, so they
 * are labelled rather than mixed.
 *
 * *** EVERY URL HERE WAS DISCOVERED, NOT GUESSED ***
 *
 * The first attempt guessed six plausible URLs — /page/pay-court-fees,
 * /page/file-court-documents-online, .../after-judgment-getting-results — and
 * five of them were 404s served with a friendly page. The real ones were found
 * by fetching the guide's own index and following its links, which is the only
 * way to be sure a page exists under the name you are about to cite.
 *
 * *** WHAT A PRACTICAL BLOCK MAY SAY ***
 *
 * The same standard as a legal block: the sentence carries the citation, and
 * the verifier must find the supporting words on the cited page. "Filing a
 * Plaintiff's Claim online costs $108" needs the fee page to say $108. A fee
 * remembered from six months ago is exactly the kind of thing that is wrong
 * without anyone noticing.
 */

import type { CorpusSource } from "./corpusSources";

export const PRACTICAL_SOURCES: CorpusSource[] = [
  // ------------------------------------------------ ontario.ca, the Guide
  {
    id: "guide-making-a-claim",
    title: "Guide to Procedures in Small Claims Court: Making a claim",
    citation: "ontario.ca — Guide to Procedures in Small Claims Court",
    url: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
    format: "html",
    tier: "practical",
    mustContain: ["Plaintiff's Claim", "Small Claims Court"],
    why: "What a plaintiff does to start: which form, where it is filed, what is attached.",
  },
  {
    id: "guide-serving-documents",
    title: "Guide to Procedures in Small Claims Court: Serving documents",
    citation: "ontario.ca — Guide to Procedures in Small Claims Court",
    url: "https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents",
    format: "html",
    tier: "practical",
    mustContain: ["Affidavit of Service", "Small Claims Court"],
    why:
      "How service is actually carried out and proved. The rule says service " +
      "must happen; this says what a person does on the day.",
  },
  {
    id: "guide-replying-to-a-claim",
    title: "Guide to Procedures in Small Claims Court: Replying to a claim",
    citation: "ontario.ca — Guide to Procedures in Small Claims Court",
    url: "https://www.ontario.ca/document/guide-procedures-small-claims-court/replying-claim",
    format: "html",
    tier: "practical",
    mustContain: ["Defence", "Small Claims Court"],
    why: "The defendant's side: filing a Defence, the fee, and what a defendant's claim is.",
  },
  {
    id: "guide-getting-ready-for-court",
    title: "Guide to Procedures in Small Claims Court: Getting ready for court",
    citation: "ontario.ca — Guide to Procedures in Small Claims Court",
    url: "https://www.ontario.ca/document/guide-procedures-small-claims-court/getting-ready-court",
    format: "html",
    tier: "practical",
    mustContain: ["settlement conference", "Small Claims Court"],
    why:
      "The settlement conference and trial preparation — what to bring, how " +
      "documents are exchanged. Item 8's presentation layer is built on this.",
  },
  {
    id: "guide-motions-and-clerks-orders",
    title: "Guide to Procedures in Small Claims Court: Motions and clerk's orders",
    citation: "ontario.ca — Guide to Procedures in Small Claims Court",
    url: "https://www.ontario.ca/document/guide-procedures-small-claims-court/motions-and-clerks-orders",
    format: "html",
    tier: "practical",
    mustContain: ["motion", "Small Claims Court"],
    why:
      "How a motion is actually brought. The things-went-wrong blocks — setting " +
      "aside a default judgment, extending a missed deadline — all route through here.",
  },
  {
    id: "guide-after-judgment",
    title: "Guide to Procedures in Small Claims Court: After judgment",
    citation: "ontario.ca — Guide to Procedures in Small Claims Court",
    url: "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment",
    format: "html",
    tier: "practical",
    mustContain: ["Garnishment", "Writ of Seizure"],
    why:
      "Enforcement in practice: garnishment, writs, examination. The enforcement " +
      "next-step block has been an unwritten placeholder since Step 2 and this " +
      "is the source that lets it be written.",
  },

  // ------------------------------------- ontario.ca, fees and online filing
  {
    id: "ontario-suing-someone-small-claims",
    title: "Suing someone in Small Claims Court",
    citation: "ontario.ca",
    url: "https://www.ontario.ca/page/suing-someone-small-claims-court",
    format: "html",
    tier: "practical",
    mustContain: ["Small Claims Court", "$50,000"],
    why:
      "The overview page, and the source already cited for the $50,000 limit " +
      "in proceduralStages.ts. Vendored so that citation is checkable offline.",
  },
  {
    id: "ontario-file-small-claims-online",
    title: "File Small Claims Court documents online",
    citation: "ontario.ca",
    url: "https://www.ontario.ca/page/file-small-claims-court-documents-online",
    format: "html",
    tier: "practical",
    mustContain: ["Plaintiff's Claim", "Fee waiver"],
    why:
      "THE FEE SCHEDULE, and whether a document can be filed online at all. " +
      "This page carries live dollar amounts, which is precisely the kind of " +
      "fact that goes stale silently.",
  },
  {
    id: "ontario-fee-waiver",
    title: "Have your court fees waived",
    citation: "ontario.ca",
    url: "https://www.ontario.ca/page/have-your-court-fees-waived",
    format: "html",
    tier: "practical",
    mustContain: ["fee waiver"],
    why:
      "A filing fee is a barrier for exactly the people this platform is for. " +
      "Any block that states a fee should be able to say this exists.",
  },

  // --------------------------------------------------- ontariocourts.ca
  {
    id: "scj-steps-in-a-case",
    title: "Small Claims Court — Steps in a Case",
    citation: "ontariocourts.ca — Superior Court of Justice",
    url: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/steps-in-a-case/",
    format: "html",
    tier: "practical",
    mustContain: ["Settlement Conference", "Writ of seizure"],
    why:
      "The court's own account of the sequence, which is the closest thing to " +
      "an authoritative stage map and the check on the one built in Part 2.",
  },
  {
    id: "scj-how-to-respond",
    title: "Small Claims Court — How to Respond to a Case",
    citation: "ontariocourts.ca — Superior Court of Justice",
    url: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
    format: "html",
    tier: "practical",
    mustContain: ["Form 9A", "defendant"],
    why: "The defendant's sequence, from the court rather than from the regulation.",
  },
  {
    id: "scj-default-proceedings",
    title: "Small Claims Court — Default Proceedings",
    citation: "ontariocourts.ca — Superior Court of Justice",
    url: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/",
    format: "html",
    tier: "practical",
    mustContain: ["noted in default", "default judgment"],
    why:
      "Noting in default and default judgment in practice. Two of the " +
      "things-went-wrong blocks depend on it, and Part 0 found both positions " +
      "had nowhere to live in the old taxonomy.",
  },
];
