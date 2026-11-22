/**
 * Checks each decision in the Case Law Map (batch 1) against CanLII's API, metadata only, through the site's own
 * client, rate limit, lease and cache (src/lib/canlii/canliiServer.ts: one call at a time, two a second, a daily cap).
 * Never fetches a CanLII web page; only api.canlii.org's caseBrowse and caseCitator endpoints are called.
 *
 *   1. Citation check: does the case exist under its citation, and do CanLII's title (first party), court database and
 *      decision date match the entry? The result, the date checked and CanLII's own link are written to the store; a
 *      decision whose check did not pass stays hidden_until_checked. CanLII's title and date are compared here and not
 *      stored.
 *   2. Citing-case check, for the Court of Appeal entries: the Supreme Court of Canada decisions CanLII's citator lists
 *      as citing each. Printed for the owner to review, not stored, and nothing is decided from it. Being cited is not
 *      being upheld, or overruled.
 *
 * MANUAL ONLY (it spends CanLII calls; about 32 the first time, then cached). Needs CANLII_API_KEY and migration
 * 20261007090000 (the shared lease). With no key it says so and changes nothing.
 *
 *   npm run canlii:check-case-law
 */
import { readFileSync, writeFileSync } from "node:fs";
import { canlii, canliiEnabled, caseRefFromCitation } from "../../src/lib/canlii/canliiServer";
import type { CaseLawBatch } from "../../src/lib/case-system/authority-intelligence/caseLawBatch1";
import { buildCaseLawBatch, STORE } from "../content/buildCaseLawBatch1";

const simplify = (text: string) =>
  text.toLowerCase().replace(/[‘’'`.,()]/g, "").replace(/\s+/g, " ").trim();
const firstParty = (title: string) => simplify(title).replace(/^r v /, "").split(" v ")[0];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());

async function main() {
  if (!canliiEnabled()) {
    console.log("CANLII_API_KEY is not set. Nothing was checked, and the store is unchanged.");
    return;
  }
  const api = canlii();
  const store = JSON.parse(readFileSync(STORE, "utf8")) as CaseLawBatch;

  for (const entry of store.entries) {
    if (entry.kind !== "case-law") continue;
    const citation = entry.citations.find((c) => caseRefFromCitation(c));
    if (!citation) {
      entry.canliiCheck = { status: "fail", checkedOn: today(), url: null, note: "No citation CanLII can look up." };
      continue;
    }
    const ref = caseRefFromCitation(citation)!;
    const found = await api.lookupCase(citation);
    if (!found) {
      entry.canliiCheck = { status: "fail", checkedOn: today(), url: null, note: `Not found on CanLII as ${citation} (or CanLII did not answer).` };
      continue;
    }
    const problems: string[] = [];
    if (!simplify(found.title).includes(firstParty(entry.title))) problems.push(`CanLII's title differs (first party "${firstParty(entry.title)}" not in it)`);
    if (entry.decided && found.decisionDate && found.decisionDate !== entry.decided) problems.push(`CanLII's decision date differs from ${entry.decided}`);
    const expectedDb = entry.court?.startsWith("Supreme Court of Canada") ? "csc-scc" : "onca";
    if (ref.databaseId !== expectedDb) problems.push(`court database is ${ref.databaseId}, expected ${expectedDb}`);
    entry.canliiCheck = problems.length
      ? { status: "fail", checkedOn: today(), url: found.url, note: problems.join("; ") }
      : { status: "pass", checkedOn: today(), url: found.url, note: `Found as ${citation}; title, court and date match.` };
    console.log(`${entry.canliiCheck.status.padEnd(5)} ${entry.number} ${entry.title}  ${entry.canliiCheck.note}`);
  }

  // Rebuild so hidden_until_checked follows the results; the wording is re-read from the owner's file.
  const rebuilt = buildCaseLawBatch(store);
  writeFileSync(STORE, `${JSON.stringify(rebuilt, null, 2)}\n`);

  console.log("\nSupreme Court of Canada decisions that cite each Court of Appeal entry (for review; nothing is decided from this):");
  for (const entry of rebuilt.entries) {
    if (entry.kind !== "case-law" || !entry.court?.startsWith("Court of Appeal for Ontario")) continue;
    const ref = entry.citations.map((c) => caseRefFromCitation(c)).find(Boolean);
    if (!ref) continue;
    const citing = await api.citingCases(ref);
    if (!citing) {
      console.log(`  ${entry.number} ${entry.title}: CanLII did not answer`);
      continue;
    }
    const scc = citing.cases.filter((c) => c.databaseId === "csc-scc");
    console.log(`  ${entry.number} ${entry.title}: ${scc.length ? scc.map((c) => `${c.title}, ${c.citation}`).join("; ") : "none listed"}`);
  }
}

void main();
