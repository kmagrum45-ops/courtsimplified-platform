/**
 * The address a READER can open for a source the content cites.
 *
 * *** WHY (2026-09-30 accuracy audit) ***
 *
 * Content is verified against copies kept in the repository, and many entries
 * record the address that was actually read:
 *
 *   - e-Laws ".doc" downloads (https://www.ontario.ca/laws/docs/980258_e.doc).
 *     They resolve, but a reader who clicks "Source" gets a Word file instead
 *     of the law's page.
 *   - Supreme Court of Canada decisions saved as PDFs under docs/sources/.
 *     Rendered as a link, "docs/sources/grant-v-torstar-2009-SCC-61.pdf" is a
 *     relative path on this site and opens a 404 page. 49 catalogue entries
 *     linked that way.
 *
 * This keeps the verified address in the content (the verification log and
 * its checks depend on it) and translates only at the moment a link is shown.
 * An address it cannot translate to a public page returns undefined, so the
 * page shows no link rather than a broken one; the citation text still names
 * the decision.
 *
 * Decision addresses come from docs/sources/README.md ("Retrieved from"),
 * where each PDF's origin was recorded when it was downloaded.
 */

const SCC = (id: number) => `https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/${id}/index.do`;

/** docs/sources/<file> -> the official page it was downloaded from. */
const DECISION_PAGES: Record<string, string> = {
  "clements-v-clements-2012-SCC-32.pdf": SCC(9992),
  "cooper-v-hobart-2001-SCC-79.pdf": SCC(1920),
  "ryan-v-victoria-city-1999-1-SCR-201.pdf": SCC(1679),
  "waldick-v-malcolm-1991-2-SCR-456.pdf": SCC(777),
  "myers-v-peel-county-board-of-education-1981-2-SCR-21.pdf": SCC(2521),
  "sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.pdf": SCC(14302),
  "bhasin-v-hrynew-2014-SCC-71.pdf": SCC(14438),
  "cm-callow-inc-v-zollinger-2020-SCC-45.pdf": SCC(18613),
  "fidler-v-sun-life-assurance-co-2006-SCC-30.pdf": SCC(2303),
  "tercon-contractors-ltd-v-british-columbia-2010-SCC-4.pdf": SCC(7843),
  "uber-technologies-inc-v-heller-2020-SCC-16.pdf": SCC(18406),
  "queen-v-cognos-inc-1993-1-SCR-87.pdf": SCC(949),
  "red-deer-college-v-michaels-1976-2-SCR-324.pdf": SCC(2693),
  "southcott-estates-v-toronto-catholic-district-school-board-2012-SCC-51.pdf": SCC(12612),
  "whiten-v-pilot-insurance-2002-SCC-18.pdf": SCC(1956),
  "pecore-v-pecore-2007-SCC-17.pdf": SCC(2355),
  "machtinger-v-hoj-industries-1992-1-SCR-986.pdf": SCC(872),
  "honda-canada-v-keays-2008-SCC-39.pdf": SCC(5667),
  "grant-v-torstar-2009-SCC-61.pdf": SCC(7837),
  "hill-v-church-of-scientology-1995-2-SCR-1130.pdf": SCC(1285),
  "grant-thornton-v-new-brunswick-2021-SCC-31.pdf": SCC(18964),
  "pioneer-corp-v-godfrey-2019-SCC-42.pdf": SCC(17917),
  // Kerr's English text was re-fetched from the SCC site (item 7922), which is
  // the address crossForumNotes.ts already cites.
  "kerr-v-baranow-2011-SCC-10.pdf": SCC(7922),
  // Downloaded from CanLII; these are the CanLII pages the content already
  // links elsewhere. Linking is not scraping.
  "garland-v-consumers-gas-2004-SCC-25.pdf": "https://www.canlii.org/en/ca/scc/doc/2004/2004scc25/2004scc25.html",
  "mustapha-v-culligan-2008-SCC-27.pdf": "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
  // moore-v-sweet-2018-SCC-52.pdf: no verified public address on record, so no link.
  // Saved as text or HTML only; addresses from docs/sources/README.md ("Retrieved from").
  "nelson-city-v-marchi-2021-SCC-41.pdf": SCC(19036),
  "snell-v-farrell-1990-2-SCR-311.pdf": SCC(634),
  "jones-v-tsige-2012-ONCA-32.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/10962/1/document.do",
  "jesan-real-estate-v-doyle-2020-ONCA-714.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/19170/1/document.do",
  "antrim-truck-centre-v-ontario-2013-SCC-13.pdf": SCC(12887),
  "non-marine-underwriters-v-scalera-2000-SCC-24.pdf": SCC(1786),
  "merrifield-v-canada-2019-ONCA-205.pdf": "https://www.ontariocourts.ca/decisions/2019/2019ONCA0205.htm",
  // Every other saved decision, from its "Retrieved from" address in docs/sources/README.md (2026-10-07).
  "andrews-v-grand-and-toy-1978-2-SCR-229.pdf": SCC(2587),
  "barendregt-v-grebliunas-2022-SCC-22.pdf": SCC(19396),
  "bce-v-1976-debentureholders-2008-SCC-69.pdf": SCC(6238),
  "bracklow-v-bracklow-1999-1-SCR-420.pdf": SCC(1688),
  "brake-v-pj-m2r-restaurant-2017-ONCA-402.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/15800/1/document.do",
  "colucci-v-colucci-2021-SCC-24.pdf": SCC(18909),
  "danyluk-v-ainsworth-2001-SCC-44.pdf": "https://decisions.scc-csc.ca/scc-csc/scc-csc/en/1882/1/document.do",
  "dbs-v-srg-2006-SCC-37.pdf": SCC(2311),
  "henry-v-british-columbia-2015-SCC-24.pdf": SCC(15329),
  "hryniak-v-mauldin-2014-SCC-7.pdf": SCC(13427),
  "jaffer-v-york-university-2010-ONCA-654.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/9970/1/document.do",
  "kaiman-v-graham-2009-ONCA-77.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/8644/1/document.do",
  "letestu-estate-v-ritlyn-2017-ONCA-442.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/15837/1/document.do",
  "matthews-v-ocean-nutrition-2020-SCC-26.pdf": SCC(18496),
  "miazga-v-kvello-estate-2009-SCC-51.pdf": SCC(7827),
  "michel-v-graydon-2020-SCC-24.pdf": SCC(18460),
  "miglin-v-miglin-2003-SCC-24.pdf": SCC(2055),
  "moge-v-moge-1992-3-SCR-813.pdf": SCC(946),
  "moore-v-british-columbia-education-2012-SCC-61.pdf": SCC(12680),
  "nelles-v-ontario-1989-2-SCR-170.pdf": SCC(499),
  "pintea-v-johns-2017-SCC-23.pdf": SCC(16589),
  "pointes-protection-2020-SCC-22.pdf": SCC(18458),
  "potter-v-nb-legal-aid-2015-SCC-10.pdf": SCC(14677),
  "rankin-v-jj-2018-SCC-19.pdf": SCC(17085),
  "rick-v-brandsema-2009-SCC-10.pdf": SCC(6396),
  "saadati-v-moorhead-2017-SCC-28.pdf": SCC(16664),
  "vancouver-city-v-ward-2010-SCC-27.pdf": SCC(7868),
  "vout-v-hay-1995-2-SCR-876.pdf": SCC(1273),
  "waksdale-v-swegon-2020-ONCA-391.pdf": "https://coadecisions.ontariocourts.ca/coa/coa/en/18855/1/document.do",
  "wic-radio-v-simpson-2008-SCC-40.pdf": SCC(5670),
};

/**
 * A decision's text derived from its PDF (`<name>.english.txt`,
 * `<name>.html.txt`, `<name>.txt`) is the same decision, so it opens the same
 * official page as `<name>.pdf`.
 */
function decisionPage(file: string): string | undefined {
  const base = file.replace(/\.(?:english\.txt|html\.txt|txt|pdf)$/, "");
  return DECISION_PAGES[`${base}.pdf`];
}

const ELAWS_DOC = /^https:\/\/www\.ontario\.ca\/laws\/docs\/(?:elaws_(?:statutes|regs)_)?([a-z0-9]+)_e\.doc$/;

export function publicSourceUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const elaws = ELAWS_DOC.exec(url);
  if (elaws) {
    const code = elaws[1];
    // Regulations are numbered by year and number (980258, 000626); statutes
    // by year, letter and number (90c43, 02l24).
    return /^\d{6}$/.test(code)
      ? `https://www.ontario.ca/laws/regulation/${code}`
      : `https://www.ontario.ca/laws/statute/${code}`;
  }
  const local = /^(?:\.\/)?docs\/sources\/(?:decisions\/)?([^/]+)$/.exec(url);
  if (local) return decisionPage(local[1]);
  return /^https?:\/\//.test(url) ? url : undefined;
}
