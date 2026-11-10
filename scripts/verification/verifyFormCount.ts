/**
 * EVERY PAGE GIVES ONE COUNT OF A COURT'S OFFICIAL FORMS, FROM ONE SOURCE, AND THE FORMS TAB SHOWS EACH FORM ONCE
 * (Chrome check of production c38e69fd, 8 Nov 2026, B5).
 *
 * Chrome: the Small Claims page said "All 46 official forms for this court"; the case's Forms tab said "Small Claims 48
 * official form(s)" and "Showing 48 of 48 forms". Cause found here: the page counted formSummaries.json; the tab counted
 * the database catalogue (court_form_master_view), which holds Form 20F and Form 20R twice (an empty copy and one titled
 * "... - ."). The official forms site lists 46 (officialFormLinks.json). Right number: 46.
 *
 * What it checks:
 *   1. officialFormCount gives the official site's count for each court (Small Claims 46);
 *   2. oneRowPerForm keeps one row per form number, the one with the PDF, its title without " - .";
 *   3. the Small Claims page (CourtResourcesPanel) and the Forms tab (FormsWorkspace) both count with officialFormCount,
 *      and the tab's list goes through oneRowPerForm.
 *
 * WHAT FAILURE THIS CATCHES: two pages giving two counts of the same forms, or a form shown twice.
 *
 * Run: npm run test:form-count
 */
import fs from "node:fs";
import { officialFormCount, oneRowPerForm } from "../../src/lib/content-library/forms/formCount";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const links = JSON.parse(fs.readFileSync("src/lib/content-library/forms/officialFormLinks.json", "utf8")) as { forms: { court: string; number: string }[] };
for (const court of ["small-claims", "civil", "family"] as const) {
  const official = new Set(links.forms.filter((form) => form.court === court).map((form) => form.number)).size;
  check(`1. ${court}: the count is the official site's (${official})`, officialFormCount(court) === official, String(officialFormCount(court)));
}
check("1. Small Claims: 46", officialFormCount("small-claims") === 46);

const rows = [
  { form_number: "Form 20F", official_title: "Garnishee's Statement", pdf_path: null, word_path: null },
  { form_number: "Form 20F", official_title: "Garnishee's Statement - .", pdf_path: "ontario/small-claims/rscc-20f-e-0519.pdf", word_path: null },
  { form_number: "Form 7A", official_title: "Plaintiff's Claim", pdf_path: "a.pdf", word_path: "a.docx" },
];
const one = oneRowPerForm(rows);
check("2. one row per form number", one.length === 2, JSON.stringify(one));
const garnishee = one.find((row) => row.form_number === "Form 20F");
check("2. the copy with the PDF is kept, its title without \" - .\"", garnishee?.pdf_path === "ontario/small-claims/rscc-20f-e-0519.pdf" && garnishee?.official_title === "Garnishee's Statement", JSON.stringify(garnishee));

const panel = fs.readFileSync("app/_components/CourtResourcesPanel.tsx", "utf8");
const workspace = fs.readFileSync("app/forms/FormsWorkspace.tsx", "utf8");
check("3. the Small Claims page counts with officialFormCount", /officialFormCount\(court\)/.test(panel) && !/FORM_SUMMARIES\[court\]\)\.length/.test(panel));
check("3. the Forms tab counts with officialFormCount and lists one row per form", /officialFormCount\(path\)/.test(workspace) && /oneRowPerForm\(/.test(workspace));

console.log(failures ? `\n${failures} check(s) failed.` : "\nOne count of each court's official forms, and each form shown once.");
process.exit(failures ? 1 : 0);
