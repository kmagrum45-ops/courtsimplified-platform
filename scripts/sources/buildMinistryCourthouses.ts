/**
 * Builds src/lib/content-library/courts/ministryCourthouses.json from the 144 saved courthouse pages of the Ministry's
 * own directory (docs/sources/court-locations/ontario-ca/, saved by fetchCourthousePages.ts; site owner, 15 Nov 2026:
 * "extract each courthouse's address and which court sits there into a data file with its source line"). No network.
 *
 * For each page: its name, its address lines and each type of court it lists ("Family Telephone: …"), each with the line
 * of the page's `.txt` copy it is on. The `.txt` copies are regenerated here from the saved HTML (pageText.ts), and each
 * HTML file must still match the sha256 in the manifest.
 *
 * What the pages do NOT say: whether a "Family" (or "Small claims", "Civil") service is the Ontario Court of Justice's or
 * the Superior Court of Justice's. Only 3 of the 144 pages name the Ontario Court of Justice at all, and none names the
 * Superior Court. So "which court sits there" is recorded as the page states it: the types of court it lists, and a
 * court named in the courthouse's own name (`courtNamed`) where there is one.
 *
 * The Ontario Court of Justice family offices (the 4 the site uses: courthouses its saved email list marks as family,
 * nextStepPractical.ts ocjFamilyEmails) are matched to a page only by evidence, and the method is recorded:
 *   - "street": the email list's own name for the office gives a street ("311 Jarvis Family"), and exactly one page's
 *     address starts with that number and street;
 *   - "only family courthouse in the city": the Ministry lists exactly one courthouse in the office's city with a
 *     Family service.
 * Otherwise the office has no address here: "ambiguous" (several family courthouses in the city) or "none".
 * Writes no wording.
 *
 * Run: node --import tsx scripts/sources/buildMinistryCourthouses.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { MANIFEST, PAGES_DIR, type ManifestEntry } from "./fetchCourthousePages";
import { pageText } from "./pageText";

export const DATA_FILE = "src/lib/content-library/courts/ministryCourthouses.json";
const OCJ_LIST = "src/lib/content-library/courts/ocjCourthouses.json";
const OCJ_TXT = "docs/sources/court-locations/ocj-courthouse-email-addresses.txt";

/** The types of court the directory uses (its own search list), longest first so "Criminal youth" wins over "Criminal". */
export const COURT_TYPES = ["Victim/Witness Assistance Program", "Crown Attorney's Office", "Court of Appeal", "Criminal youth", "Small claims", "Enforcement", "Bankruptcy", "Divisional", "Criminal", "Family", "Civil"];
const SECTION_END = /^(Accessibility accommodations|Payment options|French-language services|Help us improve this website)$/;

type Line = { text: string; line: number };
export type MinistryCourthouse = {
  slug: string; url: string; retrieved: string; sha256: string; txt: string;
  name: Line; address: Line[]; city: string;
  services: { type: string; phone: string | null; line: number }[];
  courtNamed: Line | null;
};
export type OcjFamilyOffice = {
  office: string; listLine: number; city: string;
  match: "street" | "only family courthouse in the city" | "ambiguous" | "none";
  slug: string | null; address: string[]; candidates: string[];
};

/** One saved page, read: its lines are numbered from 1, as in the `.txt` copy. */
export function readPage(entry: ManifestEntry, lines: readonly string[]): MinistryCourthouse {
  const at = (index: number): Line => ({ text: lines[index], line: index + 1 });
  if (lines[5] !== "Provincial court locations and hours") throw new Error(`${entry.slug}: not the expected page layout`);
  const directions = lines.indexOf("Get directions");
  if (directions < 8) throw new Error(`${entry.slug}: no address block`);
  const address = Array.from({ length: directions - 7 }, (_, offset) => at(7 + offset));
  const city = address[address.length - 1].text.split(" , ")[0].trim();
  const start = lines.indexOf("Types of court and contacts");
  const end = start === -1 ? -1 : lines.findIndex((text, index) => index > start && SECTION_END.test(text));
  const services: MinistryCourthouse["services"] = [];
  if (start !== -1) for (let index = start + 1; index < end; index++) {
    const type = COURT_TYPES.find((name) => lines[index] === name || lines[index].startsWith(`${name} Telephone:`));
    if (type) services.push({ type, phone: lines[index].match(/Telephone: (.+)$/)?.[1].trim() ?? null, line: index + 1 });
  }
  const named = /^(Ontario Court of Justice|Superior Court of Justice)\b/.exec(lines[6]);
  return { slug: entry.slug, url: entry.url, retrieved: entry.retrieved, sha256: entry.sha256, txt: `${PAGES_DIR}/${entry.slug}.txt`, name: at(6), address, city, services, courtNamed: named ? { text: named[1], line: 7 } : null };
}

const NOT_FAMILY = /\b(?:criminal|crim|bail|trbc)\b|criminal|crim@/i;
/** The site's Ontario Court of Justice family offices: the same rule as nextStepPractical.ts ocjFamilyEmails. */
function ocjFamilyOffices(): { office: string; city: string }[] {
  const list = JSON.parse(readFileSync(OCJ_LIST, "utf8")) as { courthouses: { city: string; emails: string[] }[] };
  return list.courthouses.filter((courthouse) => !NOT_FAMILY.test(courthouse.city) && (/\bfamily\b/i.test(courthouse.city)
    ? courthouse.emails.some((email) => !NOT_FAMILY.test(email))
    : courthouse.emails.some((email) => /(?:^|\s)family\s*[–-]|[–-]\s*family\s*$/i.test(email) && !NOT_FAMILY.test(email))))
    .map((courthouse) => ({ office: courthouse.city, city: /^\d/.test(courthouse.city) || /family$/i.test(courthouse.city) ? "Toronto" : courthouse.city.replace(/\s*\(.*$/, "").trim() }));
}

/** An office matched to a page by evidence (see the header), or left without an address. */
export function matchOffice(office: { office: string; city: string }, pages: readonly MinistryCourthouse[], listLines: readonly string[]): OcjFamilyOffice {
  const listLine = listLines.indexOf(office.office) + 1;
  const street = /^(\d+) ([A-Za-z]+)/.exec(office.office);
  const result = (match: OcjFamilyOffice["match"], page: MinistryCourthouse | null, candidates: MinistryCourthouse[]): OcjFamilyOffice =>
    ({ ...office, listLine, match, slug: page?.slug ?? null, address: page ? page.address.map((line) => line.text) : [], candidates: candidates.map((candidate) => candidate.slug) });
  if (street) {
    const byStreet = pages.filter((page) => page.address[0].text.startsWith(`${street[1]} ${street[2]}`));
    if (byStreet.length === 1) return result("street", byStreet[0], byStreet);
  }
  const family = pages.filter((page) => page.city === office.city && page.services.some((service) => service.type === "Family"));
  if (family.length === 1) return result("only family courthouse in the city", family[0], family);
  return result(family.length ? "ambiguous" : "none", null, family);
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as ManifestEntry[];
  const pages: MinistryCourthouse[] = [];
  for (const entry of manifest) {
    const html = readFileSync(`${PAGES_DIR}/${entry.slug}.html`);
    const sha = createHash("sha256").update(html).digest("hex");
    if (sha !== entry.sha256) throw new Error(`${entry.slug}: the saved page no longer matches its sha256`);
    const text = pageText(html.toString("utf8"));
    writeFileSync(`${PAGES_DIR}/${entry.slug}.txt`, `${text}\n`);
    pages.push(readPage(entry, text.split("\n")));
  }
  const listLines = readFileSync(OCJ_TXT, "utf8").split(/\r?\n/).map((line) => line.trim());
  const offices = ocjFamilyOffices().map((office) => matchOffice(office, pages, listLines));
  writeFileSync(DATA_FILE, `${JSON.stringify({
    source: "https://www.ontario.ca/locations/courts/", savedIn: PAGES_DIR, retrieved: manifest[0].retrieved,
    note: "Each value is on the given line of the page's .txt copy (test:form-maps verifyMinistryCourthouses). The pages list types of court, not which court (OCJ or SCJ) runs them.",
    courthouses: pages,
    ocjFamilyOffices: { list: OCJ_TXT, offices },
  }, null, 1)}\n`);
  console.log(`${pages.length} courthouses; ${pages.filter((page) => page.services.some((service) => service.type === "Family")).length} list a Family service; ${pages.filter((page) => page.courtNamed).length} name a court`);
  for (const office of offices) console.log(`  ${office.office}: ${office.match}${office.address.length ? ` -> ${office.address.join(", ")}` : ""}${office.candidates.length > 1 ? ` (candidates: ${office.candidates.join(", ")})` : ""}`);
  // The README rows, between their markers.
  const rows = manifest.map((entry) => `| \`court-locations/ontario-ca/${entry.slug}.html\` | ${pages.find((page) => page.slug === entry.slug)!.name.text} | ${entry.url} | ${entry.retrieved} | ${entry.sha256} |`).join("\n");
  const readme = readFileSync("docs/sources/README.md", "utf8");
  const [begin, end] = ["<!-- ministry-courthouse-pages:start -->", "<!-- ministry-courthouse-pages:end -->"];
  if (!readme.includes(begin) || !readme.includes(end)) throw new Error("docs/sources/README.md has no ministry-courthouse-pages markers");
  writeFileSync("docs/sources/README.md", `${readme.slice(0, readme.indexOf(begin) + begin.length)}\n| File | Courthouse (the page's own name) | URL | Downloaded | sha256 |\n|---|---|---|---|---|\n${rows}\n${readme.slice(readme.indexOf(end))}`);
}

if (process.argv[1]?.endsWith("buildMinistryCourthouses.ts")) void main();
