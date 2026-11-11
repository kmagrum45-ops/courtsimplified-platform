/**
 * NO CASE IS SENT TO ANOTHER COURT'S SOURCE (Chrome check of #545, 9 Nov 2026, item 4: a Small Claims case's evidence
 * list, "Proof the money was actually transferred (Ontario courts guide)", linked the Superior Court's "Steps in a civil
 * case", ontariocourts.ca/scj/.../civil-resources.../steps-to-civil-case/).
 *
 * A source written for one court's own process (sourceCourt.ts) is shown only on that court's cases. A statement that
 * rests on another court's source is not shown either: without its source it is unsourced (CLAUDE.md s. 2), and no
 * Small Claims source in the saved sources says the same thing in the same words. The evidence item itself (what to
 * gather) stays, without the link.
 *
 * What it checks, for every kind of claim in all three courts (Small Claims, civil, Family), on each surface that shows a
 * kind's elements: the case overview (buildClaimTypeOverviewContent: the evidence list, the court points, the common
 * defences), the readiness list (evaluateReadinessGate's outstanding elements) and the claim library page
 * (/claims/[id], rendered):
 *   1. no link goes to a source written for another court (the readiness list carries the citation, and its screen
 *      links it only when `sourceShown`);
 *   2. no statement whose source is another court's is shown (the overview's court points, the readiness list, the page);
 *   3. control: every element whose source fits its court is still shown with its link.
 *
 * WHAT FAILURE THIS CATCHES: a Small Claims, civil or Family case pointed to another court's guide or rules.
 *
 * Run: npm run test:sources-fit-court
 */
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { CIVIL_CLAIM_TYPES } from "../../src/lib/case-system/intake/civilClaimTypes";
import { FAMILY_MATTER_TYPES } from "../../src/lib/case-system/intake/familyMatterTypes";
import { buildClaimTypeOverviewContent } from "../../src/lib/case-system/intake/claimTypeOverviewContent";
import { evaluateReadinessGate } from "../../src/lib/case-system/readiness/readinessGate";
import { sourceCourtOf, sourceFitsCourt } from "../../src/lib/content-library/sourceCourt";
import ClaimTypePage from "../../app/claims/[id]/page";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const ALL = [...CLAIM_TYPES, ...CIVIL_CLAIM_TYPES, ...FAMILY_MATTER_TYPES];
const decode = (html: string) => html.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');

async function main() {
  const wrongLinks: string[] = [];
  const wrongStatements: string[] = [];
  const lostFitting: string[] = [];
  for (const type of ALL) {
    const court = type.courtArea;
    const unfit = type.plaintiffElements.filter((element) => !sourceFitsCourt(element.sourceUrl, court));
    const fit = type.plaintiffElements.filter((element) => sourceFitsCourt(element.sourceUrl, court) && element.sourceUrl);

    // The case overview.
    const overview = buildClaimTypeOverviewContent("", ALL, type.id);
    for (const item of [...(overview?.evidenceToOrganize ?? []), ...(overview?.courtPoints ?? []), ...(overview?.commonDefences ?? [])]) {
      if (!sourceFitsCourt(item.sourceUrl, court)) wrongLinks.push(`${court} ${type.id} overview: "${item.text.slice(0, 50)}" -> ${sourceCourtOf(item.sourceUrl)}`);
    }
    for (const element of unfit) if (overview?.courtPoints.some((point) => point.text === element.plainExplanation)) wrongStatements.push(`${court} ${type.id} overview court point ${element.id}`);
    if (overview) for (const element of fit) if (!overview.courtPoints.some((point) => point.text === element.plainExplanation && point.sourceUrl === element.sourceUrl)) lostFitting.push(`${type.id} overview ${element.id}`);

    // The readiness list (every element not yet answered).
    const gate = evaluateReadinessGate({ claimType: type, elementStateMap: {}, confirmedRemedyId: null, storyText: "x" });
    for (const element of gate.outstanding) {
      // The Statement of Claim screen links it only when `sourceShown` (absent before this fix: shown always).
      if ((element as { sourceShown?: boolean }).sourceShown !== false && !sourceFitsCourt(element.sourceUrl, court)) wrongLinks.push(`${court} ${type.id} readiness ${element.elementId} -> ${sourceCourtOf(element.sourceUrl)}`);
      const source = type.plaintiffElements.find((candidate) => candidate.id === element.elementId);
      if (source && !sourceFitsCourt(source.sourceUrl, court) && element.plainExplanation === source.plainExplanation) wrongStatements.push(`${court} ${type.id} readiness ${element.elementId}`);
    }

    // The claim library page.
    const page = decode(renderToStaticMarkup((await ClaimTypePage({ params: Promise.resolve({ id: type.id }) })) as ReactElement));
    for (const href of [...page.matchAll(/href="([^"]+)"/g)].map((match) => match[1])) {
      if (!sourceFitsCourt(href, court)) wrongLinks.push(`${court} ${type.id} /claims page -> ${href.slice(0, 90)}`);
    }
    for (const element of unfit) if (page.includes(element.plainExplanation)) wrongStatements.push(`${court} ${type.id} /claims page ${element.id}`);
    for (const element of fit) if (!page.includes(element.plainExplanation)) lostFitting.push(`${type.id} /claims page ${element.id}`);
  }
  void createElement;
  check("1. no link goes to a source written for another court", wrongLinks.length === 0, `${wrongLinks.length}: ${wrongLinks.slice(0, 6).join("; ")}`);
  check("2. no statement resting on another court's source is shown", wrongStatements.length === 0, `${wrongStatements.length}: ${wrongStatements.slice(0, 6).join("; ")}`);
  check("3. control: every element whose source fits its court is still shown with it", lostFitting.length === 0, `${lostFitting.length}: ${lostFitting.slice(0, 6).join("; ")}`);
  check(`setup: kinds of claim checked in all three courts (${ALL.length})`, ["small-claims", "civil", "family"].every((court) => ALL.some((type) => type.courtArea === court)));

  console.log(failures ? `\n${failures} check(s) failed.` : "\nNo case is sent to another court's source.");
  process.exit(failures ? 1 : 0);
}
void main();
