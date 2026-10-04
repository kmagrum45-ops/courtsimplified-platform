/**
 * The official-forms watch reads the Ontario Court Forms pages correctly, and
 * the recorded official list covers every live form the regulations name.
 *
 * COSTS NOTHING. Parses a saved fragment and reads JSON off disk.
 *
 * WHY. 2026-10-04: the downloadable catalogue was missing 59 live forms and
 * nothing watched the official site. scripts/forms/fetchOfficialFormLinks.ts
 * (run monthly by courtsimplified-change-watch.yml) records the official
 * list; this suite catches (1) a parser that stops recognising rows, and
 * (2) a recorded list that has fallen behind the regulations.
 *
 * Asserts properties: a form row yields its number, title, date and both
 * links, resolved to absolute URLs; header and non-form rows are skipped; and,
 * once officialFormLinks.json exists, every non-revoked form in
 * formRuleIndex.json is in it (differences the official site itself has are
 * listed with a reason in KNOWN_SITE_GAPS).
 *
 * Also covers rules:check's comparison (scripts/rules/checkCorpus.ts): its
 * first scheduled run reported every source CHANGED over spacing, quotes and
 * accents. A formatting-only difference must compare equal; a changed word
 * must not.
 *
 * Run: node --import tsx scripts/verification/verifyOfficialForms.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseFormsPage } from "../forms/fetchOfficialFormLinks";
import { normalizeForCompare } from "../rules/checkCorpus";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const PAGE = "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/";
const SAMPLE = `<table><tr><th>Form</th><th>Title</th><th>Date</th><th>Files</th></tr>
<tr><td>7A</td><td>Plaintiff&#39;s Claim</td><td>Aug. 1, 2022</td>
<td><a href="/static/media/uploads/courtforms/scc/07a/scr-7a-aug22-en-fil.pdf">PDF</a>
<a href="/static/media/uploads/courtforms/scc/07a/scr-7a-aug22-en-fil.docx">Word</a></td></tr>
<tr><td>Notice to profession</td><td>Something else</td></tr>
<tr><td>1A.1</td><td>Additional Debtors</td><td>Jan. 23, 2014</td><td><a href="https://ontariocourtforms.on.ca/x/1a1.pdf">PDF</a></td></tr></table>`;

const parsed = parseFormsPage(SAMPLE, "small-claims", PAGE);
check("form rows are recognised and other rows skipped", parsed.length === 2, JSON.stringify(parsed.map((f) => f.number)));
const a = parsed[0];
check("number, title and date are read", a?.number === "7A" && a.title === "Plaintiff’s Claim" && a.date === "Aug. 1, 2022", JSON.stringify(a));
check("links are made absolute", a?.pdf === "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/07a/scr-7a-aug22-en-fil.pdf" && Boolean(a?.docx?.endsWith(".docx")));
check("a decimal form number survives", parsed[1]?.number === "1A.1" && parsed[1].docx === null);

{
  const vendored = "9.01  A defendant who wishes to dispute a claim  shall,\n    within 20 days — after being served, file a defence. D\uFFFDfense";
  const refetched = "9.01 A defendant who wishes to dispute a claim shall, within 20 days - after being served, file a defence. Défense";
  check("rules:check ignores spacing, dashes and accents", normalizeForCompare(vendored) === normalizeForCompare(refetched));
  check("rules:check still sees a changed word", normalizeForCompare(vendored) !== normalizeForCompare(refetched.replace("20 days", "30 days")));
  check(
    "rules:check matches a damaged accent with the real letter",
    normalizeForCompare("Fran\uFFFDais (\"cr\uFFFDancier\")") === normalizeForCompare("Français (\"créancier\")"),
  );
}

/**
 * Forms the regulation lists that the official forms site does not offer,
 * each with why. Empty until the first recorded list shows any.
 */
const KNOWN_SITE_GAPS: Record<string, string> = {
  "civil:74H":
    "In the Rules of Civil Procedure's table of forms (Consent, Sept. 1, 2021) but not on the official estates forms page as read on 2026-10-04.",
  "family:8.0.1":
    "The official family forms page writes this form as \"8.01\"; officialFormLink.ts matches the two spellings (officialFormKey).",
};

const linksFile = path.join(process.cwd(), "src/lib/content-library/forms/officialFormLinks.json");
if (!existsSync(linksFile)) {
  console.log("SKIP coverage: officialFormLinks.json is written by the first change-watch run.");
} else {
  const links = JSON.parse(readFileSync(linksFile, "utf8")) as { forms: { court: string; number: string }[] };
  const index = JSON.parse(readFileSync(path.join(process.cwd(), "src/lib/content-library/forms/formRuleIndex.json"), "utf8")) as {
    forms: Record<string, { number: string; revoked: boolean }[]>;
  };
  const official = new Set(links.forms.map((f) => `${f.court}:${f.number}`));
  const missing = Object.entries(index.forms)
    .flatMap(([court, list]) => list.filter((f) => !f.revoked).map((f) => `${court}:${f.number}`))
    .filter((key) => !official.has(key) && !(key in KNOWN_SITE_GAPS));
  check("every live form in the regulations has an official link", missing.length === 0, missing.join(", "));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll official-forms checks passed.");
