/**
 * The family-law statutes and rules, vendored WHOLE for the Family library.
 *
 * *** WHY WHOLE ***
 *
 * docs/sources/ has held only excerpts: fla-cited-sections.txt,
 * flr-cited-rules.txt, flr-stage-rules.txt, divorce-act-child-support.txt. An
 * excerpt holds what something already cited, which is the wrong shape for a
 * library that has to cover matters nothing cites yet -- the same lesson
 * oreg-258-98-cited-rules.txt taught for Small Claims (SOURCING_NOTES.md).
 *
 * Fetched through the vendor-sources workflow, because this workspace's shell
 * cannot reach ontario.ca or laws-lois.justice.gc.ca. Added 2026-09-30.
 */

import type { CorpusSource } from "./corpusSources";

const ELAWS = (id: string) => `https://www.ontario.ca/laws/docs/${id}_e.doc`;

export const FAMILY_LAW_SOURCES: CorpusSource[] = [
  {
    id: "family-law-act",
    title: "Family Law Act",
    citation: "R.S.O. 1990, c. F.3",
    url: ELAWS("90f03"),
    format: "elaws-doc",
    mustContain: ["FAMILY LAW ACT", "CONSOLIDATION PERIOD"],
    why: "Property equalization, support, domestic contracts and restraining orders for the Family library.",
  },
  {
    id: "family-law-rules",
    title: "Family Law Rules",
    citation: "O. Reg. 114/99",
    url: ELAWS("990114"),
    format: "elaws-doc",
    mustContain: ["FAMILY LAW RULES", "CONSOLIDATION PERIOD"],
    why: "Every procedural step in a family case: starting, answering, conferences, disclosure, motions, trial, enforcement.",
  },
  {
    id: "childrens-law-reform-act",
    title: "Children's Law Reform Act",
    citation: "R.S.O. 1990, c. C.12",
    url: ELAWS("90c12"),
    format: "elaws-doc",
    mustContain: ["LAW REFORM ACT", "CONSOLIDATION PERIOD"],
    why: "Decision-making responsibility, parenting time and contact, best interests, relocation, for parents who are not divorcing.",
  },
  {
    id: "ontario-child-support-guidelines-full",
    title: "Child Support Guidelines (Ontario)",
    citation: "O. Reg. 391/97",
    url: ELAWS("970391"),
    format: "elaws-doc",
    mustContain: ["CHILD SUPPORT GUIDELINES", "CONSOLIDATION PERIOD"],
    why: "Child support on the Family Law Act path, in full.",
  },
  {
    id: "family-responsibility-support-arrears-enforcement-act",
    title: "Family Responsibility and Support Arrears Enforcement Act, 1996",
    citation: "S.O. 1996, c. 31",
    url: ELAWS("96f31"),
    format: "elaws-doc",
    mustContain: ["CONSOLIDATION PERIOD"],
    why: "How support orders are enforced (the Family Responsibility Office).",
  },
  {
    id: "divorce-act",
    title: "Divorce Act",
    citation: "R.S.C. 1985, c. 3 (2nd Supp.)",
    url: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
    format: "html",
    mustContain: ["Divorce Act", "best interests of the child"],
    why: "Divorce, and support and parenting on the Divorce Act path, in full.",
  },
  {
    id: "federal-child-support-guidelines-full",
    title: "Federal Child Support Guidelines",
    citation: "SOR/97-175",
    url: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
    format: "html",
    mustContain: ["Federal Child Support Guidelines"],
    why: "Child support on the Divorce Act path, in full.",
  },
];
