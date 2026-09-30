/**
 * Every courthouse address and contact shown is on the court's own page.
 *
 * COSTS NOTHING. Reads src/lib/content-library/courts/courtLocations.json and
 * the saved page text in docs/sources/court-locations/.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a name, address line, email, phone number or event label that is not
 *     on the saved text of that location's page (a typo, a stale value, or a
 *     value copied from the wrong location);
 *   - a location with no address, or a court listed with no contact;
 *   - a location whose saved page text is missing;
 *   - a URL that is not the court's own ontariocourts.ca location page.
 *
 * Run: node --import tsx scripts/verification/verifyCourtLocations.ts
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { COURT_LOCATIONS } from "../../src/lib/content-library/courts/courtLocations";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const norm = (text: string) => text.replace(/\s+/g, " ").trim();
let problems = 0;
for (const location of COURT_LOCATIONS) {
  const file = path.join(process.cwd(), "docs/sources/court-locations", `${location.slug}.txt`);
  if (!existsSync(file)) {
    problems += 1;
    console.log(`      ${location.slug}: saved page text missing`);
    continue;
  }
  const page = norm(readFileSync(file, "utf8"));
  const values = [
    location.name,
    ...location.address,
    ...location.services.flatMap((service) => [
      ...service.address,
      ...service.contacts.flatMap((contact) => [contact.event, contact.email, contact.phone]),
    ]),
  ].filter((value): value is string => Boolean(value));
  for (const value of values) {
    if (!page.includes(norm(value))) {
      problems += 1;
      console.log(`      ${location.slug}: not on its page — "${value}"`);
    }
  }
  if (location.address.length === 0) {
    problems += 1;
    console.log(`      ${location.slug}: no address`);
  }
  for (const service of location.services) {
    if (service.contacts.length === 0) {
      problems += 1;
      console.log(`      ${location.slug}: ${service.court} listed with no contact`);
    }
  }
  if (location.url !== `https://www.ontariocourts.ca/scj/locations/${location.slug}/`) {
    problems += 1;
    console.log(`      ${location.slug}: unexpected URL ${location.url}`);
  }
}
check(`every value for ${COURT_LOCATIONS.length} courthouses is on the court's own page`, problems === 0, `${problems} problem(s)`);
check("at least one location per court type", ["small-claims", "civil", "family"].every((court) =>
  COURT_LOCATIONS.some((location) => location.services.some((service) => service.court === court))));

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
