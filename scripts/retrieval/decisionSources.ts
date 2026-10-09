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
  citation: string;
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

/*
 * Read from the Court's own page (2026-10-05): the judgment text is in the
 * frame at index.do?iframe=true, fetched by the Fetch Decisions workflow and
 * converted to plain text (all markup removed, paragraphs and their numbers
 * kept). The reader is linked to the judgment's page on the Court's site.
 */
const sccPage = (id: string, title: string, citation: string, year: number, file: string, item: number): DecisionSource => ({
  id: `decision-${id}`,
  kind: "decision",
  court: "SCC",
  title,
  citation,
  year,
  path: `decisions/${file}`,
  url: `https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/${item}/index.do`,
  readableUrl: `https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/${item}/index.do`,
});

/** A Court of Appeal decision read from its page on www.ontariocourts.ca (2026-10-07). */
const oncaPage = (id: string, title: string, citation: string, year: number, file: string, url: string): DecisionSource => ({
  id: `decision-${id}`,
  kind: "decision",
  court: "ONCA",
  title,
  citation,
  year,
  path: `decisions/${file}`,
  url,
  readableUrl: url,
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
  // ---- 2026-10-05: leading decisions for the gaps the coverage test and
  // the Court Assistant probe found (Charter damages, discrimination,
  // retroactive child support, relocation, spousal support, agreements,
  // anti-SLAPP, oppression, malicious prosecution, wills, privacy, ...).
  sccPage("ward", "Vancouver (City) v. Ward", "2010 SCC 27", 2010, "vancouver-city-v-ward-2010-SCC-27.html.txt", 7868),
  sccPage("henry", "Henry v. British Columbia (Attorney General)", "2015 SCC 24", 2015, "henry-v-british-columbia-2015-SCC-24.html.txt", 15329),
  sccPage("moore-bc", "Moore v. British Columbia (Education)", "2012 SCC 61", 2012, "moore-v-british-columbia-education-2012-SCC-61.html.txt", 12680),
  sccPage("saadati", "Saadati v. Moorhead", "2017 SCC 28", 2017, "saadati-v-moorhead-2017-SCC-28.html.txt", 16664),
  sccPage("rankin", "Rankin (Rankin’s Garage & Sales) v. J.J.", "2018 SCC 19", 2018, "rankin-v-jj-2018-SCC-19.html.txt", 17085),
  sccPage("marchi", "Nelson (City) v. Marchi", "2021 SCC 41", 2021, "nelson-city-v-marchi-2021-SCC-41.html.txt", 19036),
  sccPage("hryniak", "Hryniak v. Mauldin", "2014 SCC 7", 2014, "hryniak-v-mauldin-2014-SCC-7.html.txt", 13427),
  sccPage("pintea", "Pintea v. Johns", "2017 SCC 23", 2017, "pintea-v-johns-2017-SCC-23.html.txt", 16589),
  sccPage("andrews", "Andrews v. Grand & Toy Alberta Ltd.", "[1978] 2 S.C.R. 229", 1978, "andrews-v-grand-and-toy-1978-2-SCR-229.html.txt", 2587),
  sccPage("snell", "Snell v. Farrell", "[1990] 2 S.C.R. 311", 1990, "snell-v-farrell-1990-2-SCR-311.html.txt", 634),
  sccPage("matthews", "Matthews v. Ocean Nutrition Canada Ltd.", "2020 SCC 26", 2020, "matthews-v-ocean-nutrition-2020-SCC-26.html.txt", 18496),
  sccPage("potter", "Potter v. New Brunswick Legal Aid Services Commission", "2015 SCC 10", 2015, "potter-v-nb-legal-aid-2015-SCC-10.html.txt", 14677),
  sccPage("dbs", "D.B.S. v. S.R.G.; L.J.W. v. T.A.R.; Henry v. Henry; Hiemstra v. Hiemstra", "2006 SCC 37", 2006, "dbs-v-srg-2006-SCC-37.html.txt", 2311),
  sccPage("michel", "Michel v. Graydon", "2020 SCC 24", 2020, "michel-v-graydon-2020-SCC-24.html.txt", 18460),
  sccPage("colucci", "Colucci v. Colucci", "2021 SCC 24", 2021, "colucci-v-colucci-2021-SCC-24.html.txt", 18909),
  sccPage("barendregt", "Barendregt v. Grebliunas", "2022 SCC 22", 2022, "barendregt-v-grebliunas-2022-SCC-22.html.txt", 19396),
  sccPage("bracklow", "Bracklow v. Bracklow", "[1999] 1 S.C.R. 420", 1999, "bracklow-v-bracklow-1999-1-SCR-420.html.txt", 1688),
  sccPage("moge", "Moge v. Moge", "[1992] 3 S.C.R. 813", 1992, "moge-v-moge-1992-3-SCR-813.html.txt", 946),
  sccPage("miglin", "Miglin v. Miglin", "2003 SCC 24", 2003, "miglin-v-miglin-2003-SCC-24.html.txt", 2055),
  sccPage("rick", "Rick v. Brandsema", "2009 SCC 10", 2009, "rick-v-brandsema-2009-SCC-10.html.txt", 6396),
  sccPage("pointes", "1704604 Ontario Ltd. v. Pointes Protection Association", "2020 SCC 22", 2020, "pointes-protection-2020-SCC-22.html.txt", 18458),
  sccPage("wic-radio", "WIC Radio Ltd. v. Simpson", "2008 SCC 40", 2008, "wic-radio-v-simpson-2008-SCC-40.html.txt", 5670),
  sccPage("bce", "BCE Inc. v. 1976 Debentureholders", "2008 SCC 69", 2008, "bce-v-1976-debentureholders-2008-SCC-69.html.txt", 6238),
  sccPage("miazga", "Miazga v. Kvello Estate", "2009 SCC 51", 2009, "miazga-v-kvello-estate-2009-SCC-51.html.txt", 7827),
  sccPage("nelles", "Nelles v. Ontario", "[1989] 2 S.C.R. 170", 1989, "nelles-v-ontario-1989-2-SCR-170.html.txt", 499),
  sccPage("vout", "Vout v. Hay", "[1995] 2 S.C.R. 876", 1995, "vout-v-hay-1995-2-SCR-876.html.txt", 1273),
  onca("jones-tsige", "Jones v. Tsige", "2012 ONCA 32", 2012, "jones-v-tsige-2012-ONCA-32.txt", 10962),
  sccPage("antrim", "Antrim Truck Centre Ltd. v. Ontario (Transportation)", "2013 SCC 13", 2013, "antrim-truck-centre-v-ontario-2013-SCC-13.html.txt", 12887),
  sccPage("scalera", "Non-Marine Underwriters, Lloyd’s of London v. Scalera", "2000 SCC 24", 2000, "non-marine-underwriters-v-scalera-2000-SCC-24.html.txt", 1786),
  oncaPage("merrifield", "Merrifield v. Canada (Attorney General)", "2019 ONCA 205", 2019, "merrifield-v-canada-2019-ONCA-205.txt", "https://www.ontariocourts.ca/decisions/2019/2019ONCA0205.htm"),
  oncaPage("tms-lighting", "TMS Lighting Ltd. v. KJS Transport Inc.", "2014 ONCA 1", 2014, "tms-lighting-v-kjs-transport-2014-ONCA-1.txt", "https://www.ontariocourts.ca/decisions/2014/2014ONCA0001.htm"),
  onca("waksdale", "Waksdale v. Swegon North America Inc.", "2020 ONCA 391", 2020, "waksdale-v-swegon-2020-ONCA-391.txt", 18855),
  // ---- 2026-10-09: claims against the Crown and the police, and bail, for
  // a story about harm by an accused released on bail (owner's test; see
  // docs/sources/README.md). Fetch Decisions runs 37976295989 (search) and
  // 37976584406 (judgments).
  sccPage("clark", "Ontario (Attorney General) v. Clark", "2021 SCC 18", 2021, "ontario-ag-v-clark-2021-SCC-18.html.txt", 18855),
  sccPage("hill-hamilton", "Hill v. Hamilton‑Wentworth Regional Police Services Board", "2007 SCC 41", 2007, "hill-v-hamilton-wentworth-police-2007-SCC-41.html.txt", 2382),
  sccPage("odhavji", "Odhavji Estate v. Woodhouse", "2003 SCC 69", 2003, "odhavji-estate-v-woodhouse-2003-SCC-69.html.txt", 2104),
  sccPage("antic", "R. v. Antic", "2017 SCC 27", 2017, "r-v-antic-2017-SCC-27.html.txt", 16649),
  sccPage("zora", "R. v. Zora", "2020 SCC 14", 2020, "r-v-zora-2020-SCC-14.html.txt", 18391),
  sccPage("st-cloud", "R. v. St-Cloud", "2015 SCC 27", 2015, "r-v-st-cloud-2015-SCC-27.html.txt", 15358),
  sccPage("morales", "R. v. Morales", "[1992] 3 S.C.R. 711", 1992, "r-v-morales-1992-3-SCR-711.html.txt", 941),
  sccPage("hall-bail", "R. v. Hall", "2002 SCC 64", 2002, "r-v-hall-2002-SCC-64.html.txt", 2006),
  sccPage("myers-bail", "R. v. Myers", "2019 SCC 18", 2019, "r-v-myers-2019-SCC-18.html.txt", 17634),
];
