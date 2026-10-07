/**
 * Checks every court decision in our library against CanLII's API: does the
 * case exist on CanLII under that citation, and does CanLII's title match
 * ours? Metadata only, through the same rate limit and cache as the site
 * (src/lib/canlii/canliiServer.ts: one call at a time, two a second, a daily
 * cap). Prints a report; changes nothing.
 *
 * MANUAL ONLY. It spends CanLII calls (about one per decision, then cached
 * for 30 days), so it is not in CI and no workflow runs it. It needs
 * CANLII_API_KEY and migration 20261007090000 applied (the shared lease):
 *
 *   node --import tsx --env-file=.env.local scripts/sources/checkDecisionCitations.ts
 *
 * A citation from a printed report ("[1999] 1 S.C.R. 201") has no CanLII id
 * to look up and is listed as "not checkable by citation".
 */

import { canlii, canliiEnabled, caseRefFromCitation } from "../../src/lib/canlii/canliiServer";
import { DECISION_SOURCES } from "../retrieval/decisionSources";

const simplify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’'`.,()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  if (!canliiEnabled()) {
    console.log("CANLII_API_KEY is not set. Nothing was checked.");
    return;
  }
  const api = canlii();
  let confirmed = 0;
  const problems: string[] = [];
  const unchecked: string[] = [];

  for (const source of DECISION_SOURCES) {
    const label = `${source.title}, ${source.citation}`;
    if (!caseRefFromCitation(source.citation)) {
      unchecked.push(label);
      continue;
    }
    const found = await api.lookupCase(source.citation);
    if (!found) {
      problems.push(`${label}: not found on CanLII under that citation (or CanLII did not answer)`);
      continue;
    }
    if (!simplify(found.title).includes(simplify(source.title).split(" v ")[0] ?? "")) {
      problems.push(`${label}: CanLII calls it "${found.title}", ${found.citation}`);
      continue;
    }
    confirmed += 1;
    console.log(`ok    ${label}  ->  ${found.citation}  ${found.url}`);
  }

  console.log("");
  console.log(`${confirmed} confirmed on CanLII.`);
  if (unchecked.length) console.log(`${unchecked.length} not checkable by citation:\n  ${unchecked.join("\n  ")}`);
  if (problems.length) {
    console.log(`${problems.length} to look at:\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
  }
}

void main();
