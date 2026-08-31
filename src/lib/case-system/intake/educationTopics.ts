/**
 * Small Claims education topic registry -- Phase 0 foundation for the
 * post-intake education layer (phase 5 of the eventual AI-guided intake,
 * see docs/AI_INTAKE_DESIGN.md). No AI reads or surfaces these yet in this
 * phase; this is the sourced content registry that layer will draw from.
 *
 * DRAFT wording -- every `plainExplanation` below is pending lawyer/
 * paralegal review before it ships to real users, same convention as
 * `outOfScopeForums.ts` and `questionBank.ts`.
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
 * are deliberately NOT here: "breach of contract elements" and "negligence
 * elements." Both were checked this session (web search + fetch against
 * ontario.ca and ontariocourts.ca) and neither has a self-help-guide page
 * stating a general elements framework (duty/breach/causation/damages, or
 * offer/acceptance/consideration/breach) -- what exists on ontariocourts.ca
 * is individual Court of Appeal decisions discussing those concepts
 * case-by-case. Synthesizing a general legal-elements statement from
 * reading appellate opinions is legal analysis from case law, which
 * CLAUDE.md's sourcing rule treats the same as a CanLII-only fact: cut it
 * rather than write it from inference. If a future session finds an actual
 * ontario.ca/ontariocourts.ca/ontariocourtforms.on.ca page stating these
 * plainly, add the topics back with that citation.
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
    reviewedAt: null,
    status: "draft",
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
    reviewedAt: null,
    status: "draft",
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
    reviewedAt: null,
    status: "draft",
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
    reviewedAt: null,
    status: "draft",
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
    reviewedAt: null,
    status: "draft",
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
    reviewedAt: null,
    status: "draft",
  },
];
