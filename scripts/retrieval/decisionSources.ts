/**
 * The court decisions retrieval searches: each judgment already retrieved and
 * read under docs/sources/ (see docs/sources/README.md for where each came
 * from and when), with the text file it is cut from and the page a person
 * opens to read it.
 *
 * Titles are the judgment's own "Indexed as" name (or, for Court of Appeal
 * decisions, the CITATION line); citations are the neutral citation, or the
 * S.C.R. citation for judgments from before neutral citations existed.
 * test:corpus-retrieval checks every title against the file's own text.
 *
 * NOT NOTED UP. None of these has been checked for later decisions that
 * changed or overruled it (SOURCING_NOTES.md, "Noting up"): there is no
 * permitted automated route. Every passage from one is shown with that
 * said, never as settled current law.
 *
 * Moore v. Sweet, 2018 SCC 52 is left out: there is no verified public page
 * to link it to (publicSourceUrl.ts).
 */

import { publicSourceUrl } from "../../src/lib/content-library/publicSourceUrl";
import type { ChunkSource } from "../../src/lib/case-system/retrieval/corpusChunker";

export type DecisionSource = ChunkSource & {
  kind: "decision";
  court: "SCC" | "ONCA";
  year: number;
  /** Relative to docs/sources/. */
  path: string;
  /** The public page for the judgment. */
  readableUrl: string;
};

const scc = (id: string, title: string, citation: string, year: number, file: string, pdf: string): DecisionSource => ({
  id: `decision-${id}`,
  kind: "decision",
  court: "SCC",
  title,
  citation,
  year,
  path: `decisions/${file}`,
  url: `docs/sources/${pdf}`,
  readableUrl: publicSourceUrl(`docs/sources/${pdf}`) ?? "",
});

const onca = (id: string, title: string, citation: string, year: number, file: string, item: number): DecisionSource => ({
  id: `decision-${id}`,
  kind: "decision",
  court: "ONCA",
  title,
  citation,
  year,
  path: `decisions/${file}`,
  url: `https://coadecisions.ontariocourts.ca/coa/coa/en/item/${item}/index.do`,
  readableUrl: `https://coadecisions.ontariocourts.ca/coa/coa/en/item/${item}/index.do`,
});

const pdfDerived = (base: string, html = false) => [`${base}.${html ? "html" : "english"}.txt`, `${base}.pdf`] as const;

export const DECISION_SOURCES: DecisionSource[] = [
  scc("bhasin", "Bhasin v. Hrynew", "2014 SCC 71", 2014, ...pdfDerived("bhasin-v-hrynew-2014-SCC-71")),
  scc("clements", "Clements v. Clements", "2012 SCC 32", 2012, ...pdfDerived("clements-v-clements-2012-SCC-32")),
  scc("callow", "C.M. Callow Inc. v. Zollinger", "2020 SCC 45", 2020, ...pdfDerived("cm-callow-inc-v-zollinger-2020-SCC-45")),
  scc("cooper", "Cooper v. Hobart", "2001 SCC 79", 2001, ...pdfDerived("cooper-v-hobart-2001-SCC-79")),
  scc("fidler", "Fidler v. Sun Life Assurance Co.", "2006 SCC 30", 2006, ...pdfDerived("fidler-v-sun-life-assurance-co-2006-SCC-30")),
  scc("garland", "Garland v. Consumers’ Gas Co.", "2004 SCC 25", 2004, ...pdfDerived("garland-v-consumers-gas-2004-SCC-25")),
  scc("grant-thornton", "Grant Thornton LLP v. New Brunswick", "2021 SCC 31", 2021, ...pdfDerived("grant-thornton-v-new-brunswick-2021-SCC-31")),
  scc("grant-torstar", "Grant v. Torstar Corp.", "2009 SCC 61", 2009, ...pdfDerived("grant-v-torstar-2009-SCC-61")),
  scc("honda", "Honda Canada Inc. v. Keays", "2008 SCC 39", 2008, ...pdfDerived("honda-canada-v-keays-2008-SCC-39")),
  scc("kerr", "Kerr v. Baranow", "2011 SCC 10", 2011, ...pdfDerived("kerr-v-baranow-2011-SCC-10")),
  scc("mustapha", "Mustapha v. Culligan of Canada Ltd.", "2008 SCC 27", 2008, ...pdfDerived("mustapha-v-culligan-2008-SCC-27")),
  scc("pecore", "Pecore v. Pecore", "2007 SCC 17", 2007, ...pdfDerived("pecore-v-pecore-2007-SCC-17")),
  scc("pioneer", "Pioneer Corp. v. Godfrey", "2019 SCC 42", 2019, ...pdfDerived("pioneer-corp-v-godfrey-2019-SCC-42")),
  scc("ryan", "Ryan v. Victoria (City)", "[1999] 1 S.C.R. 201", 1999, ...pdfDerived("ryan-v-victoria-city-1999-1-SCR-201")),
  scc("sattva", "Sattva Capital Corp. v. Creston Moly Corp.", "2014 SCC 53", 2014, ...pdfDerived("sattva-capital-corp-v-creston-moly-corp-2014-SCC-53")),
  scc("southcott", "Southcott Estates Inc. v. Toronto Catholic District School Board", "2012 SCC 51", 2012, ...pdfDerived("southcott-estates-v-toronto-catholic-district-school-board-2012-SCC-51")),
  scc("tercon", "Tercon Contractors Ltd. v. British Columbia (Transportation and Highways)", "2010 SCC 4", 2010, ...pdfDerived("tercon-contractors-ltd-v-british-columbia-2010-SCC-4")),
  scc("uber", "Uber Technologies Inc. v. Heller", "2020 SCC 16", 2020, ...pdfDerived("uber-technologies-inc-v-heller-2020-SCC-16")),
  scc("whiten", "Whiten v. Pilot Insurance Co.", "2002 SCC 18", 2002, ...pdfDerived("whiten-v-pilot-insurance-2002-SCC-18")),
  // Scanned PDFs with no text layer: read from the Court's own HTML page
  // (Fetch Decisions run 37304655081, 2026-10-05).
  scc("hill", "Hill v. Church of Scientology of Toronto", "[1995] 2 S.C.R. 1130", 1995, ...pdfDerived("hill-v-church-of-scientology-1995-2-SCR-1130", true)),
  scc("machtinger", "Machtinger v. HOJ Industries Ltd.", "[1992] 1 S.C.R. 986", 1992, ...pdfDerived("machtinger-v-hoj-industries-1992-1-SCR-986", true)),
  scc("myers", "Myers v. Peel County Board of Education", "[1981] 2 S.C.R. 21", 1981, ...pdfDerived("myers-v-peel-county-board-of-education-1981-2-SCR-21", true)),
  scc("cognos", "Queen v. Cognos Inc.", "[1993] 1 S.C.R. 87", 1993, ...pdfDerived("queen-v-cognos-inc-1993-1-SCR-87", true)),
  scc("red-deer", "Red Deer College v. Michaels", "[1976] 2 S.C.R. 324", 1976, ...pdfDerived("red-deer-college-v-michaels-1976-2-SCR-324", true)),
  scc("waldick", "Waldick v. Malcolm", "[1991] 2 S.C.R. 456", 1991, ...pdfDerived("waldick-v-malcolm-1991-2-SCR-456", true)),
  // From the courts' own databases (README, "Decisions from the courts' own databases").
  {
    ...scc("danyluk", "Danyluk v. Ainsworth Technologies Inc.", "2001 SCC 44", 2001, "danyluk-v-ainsworth-2001-SCC-44.english.txt", "-"),
    url: "https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/1882/index.do",
    readableUrl: "https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/1882/index.do",
  },
  onca("kaiman", "Kaiman v. Graham", "2009 ONCA 77", 2009, "kaiman-v-graham-2009-ONCA-77.txt", 8644),
  onca("letestu", "Letestu Estate v. Ritlyn Investments Limited", "2017 ONCA 442", 2017, "letestu-estate-v-ritlyn-2017-ONCA-442.txt", 15837),
  onca("jesan", "Jesan Real Estate Ltd. v. Doyle", "2020 ONCA 714", 2020, "jesan-real-estate-v-doyle-2020-ONCA-714.txt", 19170),
  onca("jaffer", "Jaffer v. York University", "2010 ONCA 654", 2010, "jaffer-v-york-university-2010-ONCA-654.txt", 9970),
  onca("brake", "Brake v. PJ-M2R Restaurant Inc.", "2017 ONCA 402", 2017, "brake-v-pj-m2r-restaurant-2017-ONCA-402.txt", 15800),
];
