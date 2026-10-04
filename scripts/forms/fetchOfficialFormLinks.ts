/**
 * Reads the official Ontario Court Forms index pages and records, for every
 * form listed there, its number, title, date and the official PDF and Word
 * links — then compares that list with the regulations' own tables of forms
 * (formRuleIndex.json).
 *
 *   node --import tsx scripts/forms/fetchOfficialFormLinks.ts [--write]
 *
 * WHY (2026-10-04). An audit found the downloadable catalogue (the
 * court_form_library table behind /forms, last loaded 2026-08-22) missing 59
 * live forms — every estates form and the five family forms that came into
 * force on 2026-06-01 — with 63 wrong titles and 37 wrong numbers. Nothing
 * watched the official site, so a new form version went unnoticed. This is
 * the watch: run monthly by courtsimplified-change-watch.yml.
 *
 * Runs on GitHub's runners. The cloud workspaces that build content cannot
 * reach ontariocourtforms.on.ca from the shell (docs/SOURCING_NOTES.md).
 *
 * With --write it replaces src/lib/content-library/forms/officialFormLinks.json.
 * Without, it only reports. Exit code 0 either way; differences are reported,
 * not failed, because a new official form is news, not a broken build.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Court = "small-claims" | "civil" | "family";

const PAGES: { court: Court; url: string }[] = [
  { court: "small-claims", url: "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/" },
  { court: "civil", url: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/" },
  // The official site keeps estates forms (Rules 74 and 75) on a separate
  // page; the 2026-10-04 audit found all 54 missing from the catalogue.
  { court: "civil", url: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/pre-formatted-fillable-estates-forms/" },
  { court: "family", url: "https://ontariocourtforms.on.ca/en/family-law-rules-forms/" },
];

export type OfficialForm = {
  court: Court;
  number: string;
  title: string;
  date: string;
  pdf: string | null;
  docx: string | null;
  page: string;
};

const ROOT = process.cwd();
const OUT = path.join(ROOT, "src", "lib", "content-library", "forms", "officialFormLinks.json");
const INDEX = path.join(ROOT, "src", "lib", "content-library", "forms", "formRuleIndex.json");

const FORM_NUMBER = /^[0-9]{1,3}[A-Z]?(?:\.[0-9]{1,2})?[A-Z]?(?:\.[0-9])?$/;

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&#8217;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function absolute(href: string, page: string): string {
  return new URL(href, page).toString();
}

/** Pure, so the suite can run it on a saved page. */
export function parseFormsPage(html: string, court: Court, page: string): OfficialForm[] {
  const forms: OfficialForm[] = [];
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(text);
    if (cells.length < 2) continue;
    const number = cells[0].replace(/^Form\s+/i, "").trim();
    if (!FORM_NUMBER.test(number)) continue;
    const hrefs = [...row.matchAll(/href="([^"]+)"/gi)].map((m) => absolute(m[1], page));
    forms.push({
      court,
      number,
      title: cells[1],
      date: cells.find((cell, i) => i >= 2 && /\b(19|20)\d{2}\b/.test(cell)) ?? "",
      pdf: hrefs.find((h) => /\.pdf(\?|$)/i.test(h)) ?? null,
      docx: hrefs.find((h) => /\.docx?(\?|$)/i.test(h)) ?? null,
      page,
    });
  }
  return forms;
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const all: OfficialForm[] = [];
  const problems: string[] = [];

  for (const { court, url } of PAGES) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "CourtSimplified form check (contact@courtsimplified.com)" } });
      if (!response.ok) {
        problems.push(`${url}: HTTP ${response.status}`);
        continue;
      }
      const parsed = parseFormsPage(await response.text(), court, url);
      if (parsed.length === 0) problems.push(`${url}: no form rows recognised — the page layout may have changed`);
      all.push(...parsed);
      console.log(`${court.padEnd(12)} ${parsed.length} forms  ${url}`);
    } catch (error) {
      problems.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // De-duplicate (a form can appear on two pages), keep the first.
  const seen = new Set<string>();
  const forms = all.filter((form) => {
    const key = `${form.court}:${form.number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Compare with the regulations' own tables of forms.
  // formRuleIndex.json keys its forms by court (first run, 2026-10-04, crashed
  // reading it as an array).
  const index = JSON.parse(readFileSync(INDEX, "utf8")) as {
    forms: Record<Court, { number: string; revoked: boolean }[]>;
  };
  const regulation = new Set(
    (Object.entries(index.forms) as [Court, { number: string; revoked: boolean }[]][]).flatMap(([court, list]) =>
      list.filter((f) => !f.revoked).map((f) => `${court}:${f.number}`),
    ),
  );
  const official = new Set(forms.map((f) => `${f.court}:${f.number}`));
  const onSiteNotInRules = [...official].filter((k) => !regulation.has(k)).sort();
  const inRulesNotOnSite = [...regulation].filter((k) => !official.has(k)).sort();

  let changed: string[] = [];
  try {
    const previous = JSON.parse(readFileSync(OUT, "utf8")) as { forms: OfficialForm[] };
    const before = new Map(previous.forms.map((f) => [`${f.court}:${f.number}`, f]));
    for (const form of forms) {
      const old = before.get(`${form.court}:${form.number}`);
      if (!old) changed.push(`NEW ${form.court} Form ${form.number} — ${form.title} (${form.date})`);
      else if (old.date !== form.date || old.pdf !== form.pdf) changed.push(`CHANGED ${form.court} Form ${form.number}: ${old.date} -> ${form.date}`);
    }
    for (const key of before.keys()) if (!official.has(key)) changed.push(`GONE ${key}`);
  } catch {
    changed = [`first run: ${forms.length} official forms recorded`];
  }

  const report = [
    `# Official forms check — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `${forms.length} forms read from ontariocourtforms.on.ca.`,
    "",
    "## Changes since the last recorded list",
    ...(changed.length ? changed.map((c) => `- ${c}`) : ["- none"]),
    "",
    "## Listed on the official site but not in the regulation's table of forms",
    ...(onSiteNotInRules.length ? onSiteNotInRules.map((k) => `- ${k}`) : ["- none"]),
    "",
    "## In the regulation's table of forms but not found on the official site",
    ...(inRulesNotOnSite.length ? inRulesNotOnSite.map((k) => `- ${k}`) : ["- none"]),
    "",
    "## Pages that could not be read",
    ...(problems.length ? problems.map((p) => `- ${p}`) : ["- none"]),
    "",
  ].join("\n");
  writeFileSync(path.join(ROOT, "forms-check-report.md"), report);
  console.log(report);

  if (write && forms.length > 0 && problems.length === 0) {
    writeFileSync(OUT, `${JSON.stringify({ fetchedAt: new Date().toISOString(), source: "https://ontariocourtforms.on.ca/en/", forms }, null, 1)}\n`);
    console.log(`wrote ${OUT}`);
  }
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
