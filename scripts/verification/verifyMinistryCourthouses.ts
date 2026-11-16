/**
 * THE MINISTRY'S COURTHOUSE PAGES AND THE DATA READ FROM THEM (site owner, 15 Nov 2026: fetch the courthouse pages,
 * "record URL, date and sha256 for each in the README", "extract each courthouse's address and which court sits there
 * into a data file with its source line"). Runs as part of test:form-maps. No network.
 *
 * What it asserts:
 *   1. every courthouse page the saved directory index links to is saved, matches the sha256 in manifest.json, and has
 *      its row (URL and sha256) in docs/sources/README.md;
 *   2. every value in ministryCourthouses.json is on the line of the page's .txt copy it names (a name or address line
 *      exactly; a type of court at the start of its line, with the telephone given there);
 *   3. the data file is what the pages say: reading each saved .txt again gives the same entry (no hand edits);
 *   4. each Ontario Court of Justice family office with an address got it by the recorded method, from evidence: "street"
 *      when its own name's number and street begin exactly one page's address; "only family courthouse in the city"
 *      when exactly one page in its city lists Family; and an office with no address has no such evidence;
 *   5. NEGATIVE CONTROL: an address line changed in the data is caught by check 2.
 *
 * WHAT FAILURE THIS CATCHES: an address or type of court with no source line, a page saved without its README row or
 * changed after it was hashed, a data file edited by hand, or an office given an address the evidence does not support.
 *
 * Run: npm run test:form-maps
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { courthouseSlugs, MANIFEST, PAGES_DIR, type ManifestEntry } from "../sources/fetchCourthousePages";
import { DATA_FILE, matchOffice, readPage, type MinistryCourthouse, type OcjFamilyOffice } from "../sources/buildMinistryCourthouses";

const data = JSON.parse(readFileSync(DATA_FILE, "utf8")) as { courthouses: MinistryCourthouse[]; ocjFamilyOffices: { list: string; offices: OcjFamilyOffice[] } };
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as ManifestEntry[];
const txt = (page: MinistryCourthouse) => readFileSync(page.txt, "utf8").split(/\r?\n/);

let failed = 0;
const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").slice(0, 8).join("\n      ")}`); } };

/** The values of these courthouses that are not on the line they name. */
function offLine(pages: readonly MinistryCourthouse[]): string[] {
  const out: string[] = [];
  for (const page of pages) {
    const lines = txt(page);
    for (const value of [page.name, ...page.address, ...(page.courtNamed ? [page.courtNamed] : [])]) {
      const on = lines[value.line - 1] ?? "";
      if (value === page.courtNamed ? !on.startsWith(value.text) : on !== value.text) out.push(`${page.slug} line ${value.line}: "${value.text}" vs "${on}"`);
    }
    for (const service of page.services) {
      const on = lines[service.line - 1] ?? "";
      if (!on.startsWith(service.type) || (service.phone && !on.includes(service.phone))) out.push(`${page.slug} line ${service.line}: ${service.type} ${service.phone} vs "${on}"`);
    }
  }
  return out;
}

check("1. every page the index links to is saved, matches its sha256, and has its README row", () => {
  const slugs = courthouseSlugs(readFileSync("docs/sources/court-locations/ontario-ca-court-locations.html", "utf8"));
  assert.deepEqual(manifest.map((entry) => entry.slug).sort(), [...slugs].sort());
  const readme = readFileSync("docs/sources/README.md", "utf8");
  const wrong = manifest.flatMap((entry) => {
    const sha = createHash("sha256").update(readFileSync(`${PAGES_DIR}/${entry.slug}.html`)).digest("hex");
    return [...(sha === entry.sha256 ? [] : [`${entry.slug}: sha256 differs`]), ...(readme.includes(`| ${entry.url} | ${entry.retrieved} | ${entry.sha256} |`) ? [] : [`${entry.slug}: no README row`])];
  });
  assert.deepEqual(wrong, []);
});

check("2. every value in the data file is on the .txt line it names", () => {
  assert.equal(data.courthouses.length, manifest.length);
  assert.deepEqual(offLine(data.courthouses), []);
});

check("3. the data file is what the saved pages say (read again, the same)", () => {
  const changed = data.courthouses.filter((page) => JSON.stringify(readPage(manifest.find((entry) => entry.slug === page.slug)!, txt(page).filter((line, index, all) => index < all.length - 1 || line))) !== JSON.stringify(page));
  assert.deepEqual(changed.map((page) => page.slug), []);
});

check("4. each Ontario Court of Justice family office's address is backed by its recorded method", () => {
  const listLines = readFileSync(data.ocjFamilyOffices.list, "utf8").split(/\r?\n/).map((line) => line.trim());
  const problems: string[] = [];
  for (const office of data.ocjFamilyOffices.offices) {
    if (listLines[office.listLine - 1] !== office.office) problems.push(`${office.office}: not on line ${office.listLine} of the OCJ list`);
    const again = matchOffice({ office: office.office, city: office.city }, data.courthouses, listLines);
    if (JSON.stringify(again) !== JSON.stringify(office)) problems.push(`${office.office}: the evidence now gives ${again.match} ${again.slug}`);
    const page = data.courthouses.find((courthouse) => courthouse.slug === office.slug);
    if (office.match === "street") {
      const [, number, street] = /^(\d+) ([A-Za-z]+)/.exec(office.office) ?? [];
      if (!page?.address[0].text.startsWith(`${number} ${street}`)) problems.push(`${office.office}: matched by street, but the page's address does not start with it`);
    }
    if (office.match === "only family courthouse in the city" && data.courthouses.filter((courthouse) => courthouse.city === office.city && courthouse.services.some((service) => service.type === "Family")).length !== 1) problems.push(`${office.office}: not the only family courthouse in ${office.city}`);
    if (page && JSON.stringify(office.address) !== JSON.stringify(page.address.map((line) => line.text))) problems.push(`${office.office}: address differs from its page`);
    if (!page && office.address.length) problems.push(`${office.office}: an address with no page`);
  }
  assert.deepEqual(problems, []);
});

check("5. negative control: an address line changed in the data is caught", () => {
  const page = data.courthouses[0];
  const changed = { ...page, address: [{ ...page.address[0], text: `${page.address[0].text} (changed)` }, ...page.address.slice(1)] };
  assert.ok(offLine([changed]).length > 0, "a changed address passed");
});

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nAll checks passed");
