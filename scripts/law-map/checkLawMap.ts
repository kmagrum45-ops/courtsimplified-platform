/**
 * npm run law-map:check -- checks every item of the law map against the saved
 * official text, independently of whoever drafted it (CLAUDE.md s. 2, "Draft
 * from knowledge; publish only what is verified", 2026-10-13).
 *
 * For each item it decides one status:
 *   matches       the provision was found in the saved text and the item's
 *                 `expect` phrase is inside it (for a saved decision: the
 *                 phrase is in the decision; its paragraph is not checked);
 *   elsewhere     the phrase is in the saved text, but not where the pinpoint
 *                 says, so the pinpoint needs correcting;
 *   differs       the phrase is not in the saved text at all: the draft is
 *                 corrected from the source before anything is built from it;
 *   not-saved     the law is not in docs/sources/ yet (a vendoring to-do);
 *   lead          a decision named from knowledge, not yet retrieved and read.
 * And whether the site already quotes that provision ("in the site").
 *
 * Writes docs/law-map/STATUS.md and docs/law-map/status.json. Reads files
 * only: no network, no model, no cost.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import * as CITATIONS from "../../src/lib/case-system/stage-map/citations";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MAP_DIR = path.join(ROOT, "docs", "law-map");

export type Status = "matches" | "elsewhere" | "differs" | "not-saved" | "lead";
type Source = { corpusId?: string; pinpoint?: string; expect?: string; citation?: string; url?: string; decision?: string };
type Item = { id: string; kind: string; title: string; says: string; source?: Source; leadsTo?: string[]; form?: string; review?: { verdict: string; problem?: string; fixed?: string } };
type AreaFile = { area: string; title: string; updated?: string; items: Item[] };

export const norm = (text: string) =>
  text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/­/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

// ---------------------------------------------------------------- saved texts

const texts = new Map<string, string>();
const manifest = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/corpus/manifest.json"), "utf8")) as { entries: { id: string; file: string }[] };
for (const entry of manifest.entries) {
  try {
    texts.set(entry.id, norm(readFileSync(path.join(ROOT, "docs/sources/corpus", entry.file), "utf8")));
  } catch {
    /* listed but not on disk: treated as not saved */
  }
}
const index = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/retrieval/corpus-index.json"), "utf8")) as { sources: unknown };
const indexed = (Array.isArray(index.sources) ? index.sources : Object.values(index.sources as object)) as { id: string; path?: string; file?: string }[];
for (const source of indexed) {
  if (texts.has(source.id) || !source.path) continue;
  try {
    texts.set(source.id, norm(readFileSync(path.join(ROOT, "docs/sources", source.path), "utf8")));
  } catch {
    /* not on disk */
  }
}

// ---------------------------------------------------------------- locating a provision

/** "r. 17.01 (5) (a)" -> { main: "17.01", subs: ["(5)", "(a)"] } */
export function parsePinpoint(pinpoint: string): { main: string; subs: string[] } | null {
  const match = /(?:^|\b)(?:r|s|ss|rr|rule|section|para|paras|art|reg|sch)?\.?\s*(\d+(?:\.\d+)*)\s*((?:\(\s*[0-9a-z.]+\s*\)\s*)*)/i.exec(pinpoint.trim());
  if (!match) return null;
  // Subsections, clauses and paragraphs only: "(4)", "(b.1)", "(iii)". A word
  // in brackets ("s. 2 (victim)") names a defined term, not a subsection.
  const subs = (match[2].match(/\(\s*[0-9a-z.]+\s*\)/gi) ?? [])
    .map((sub) => sub.replace(/\s+/g, "").toLowerCase())
    .filter((sub) => /^\((?:\d+(?:\.\d+)?|[a-z](?:\.\d+)?|[ivx]{1,5})\)$/.test(sub));
  return { main: match[1], subs };
}

/** True when `phrase` sits in the provision the pinpoint names. */
export function inProvision(text: string, pinpoint: string, phrase: string): boolean {
  const parsed = parsePinpoint(pinpoint);
  if (!parsed) return false;
  const escaped = parsed.main.replace(/\./g, "\\.");
  // A section or rule number where it starts a provision: not inside a longer
  // number, and followed by a subsection, a space and a capital in the source
  // (lower-cased here, so: a space and a letter or an opening bracket).
  const starts = [...text.matchAll(new RegExp(`(?<![\\d.])${escaped}(?![\\d])\\.?\\s*(?=\\(|[a-z"'])`, "g"))].map((m) => m.index ?? 0);
  for (const start of starts) {
    let from = start;
    // Some sections run long (Criminal Code s. 515 is tens of thousands of characters).
    const window = text.slice(start, start + 80000);
    let ok = true;
    for (const sub of parsed.subs) {
      const at = window.indexOf(sub, from - start);
      if (at < 0) {
        ok = false;
        break;
      }
      from = start + at;
    }
    if (!ok) continue;
    // A heading ("Marginal note: ...") sits just before its provision, so the look starts a little earlier.
    if (text.slice(Math.max(0, from - 250), from + (parsed.subs.length ? 30000 : 80000)).includes(phrase)) return true;
  }
  return false;
}

export function statusOf(source: Source | undefined): Status {
  if (!source) return "not-saved";
  const id = source.corpusId;
  if (!id) return source.decision ? "lead" : "not-saved";
  const text = texts.get(id);
  if (!text) return id.startsWith("decision") ? "lead" : "not-saved";
  const phrase = norm(source.expect ?? "");
  if (phrase.length < 6) return "differs";
  if (!text.includes(phrase)) return "differs";
  if (id.startsWith("decision") || !source.pinpoint) return "matches";
  // A guide or web page cited by its heading ("Who can ask for a fee
  // waiver"), not by a numbered provision: the phrase being on the page is
  // the check.
  if (!/^\s*(?:r|s|ss|rr|rule|section|reg|sch)\b\.?\s*\d/i.test(source.pinpoint)) return "matches";
  return inProvision(text, source.pinpoint, phrase) ? "matches" : "elsewhere";
}

/** The saved text around an item's phrase, for checks that need the provision's own wording. */
export function sourceWindow(source: Source | undefined, reach = 1500): string {
  const text = source?.corpusId ? texts.get(source.corpusId) : undefined;
  const phrase = norm(source?.expect ?? "");
  const at = text && phrase ? text.indexOf(phrase) : -1;
  return text && at >= 0 ? text.slice(Math.max(0, at - reach), at + phrase.length + reach) : "";
}

// ---------------------------------------------------------------- what the site already quotes

const siteCitations = [
  ...Object.values(CITATIONS).filter((value): value is CITATIONS.RuleCitation => !!value && typeof value === "object" && "quote" in value),
  ...ALL_STAGES.flatMap((stage) => [...stage.rules, ...stage.deadlines.map((deadline) => deadline.rule)]),
];
const siteKeys = new Set(siteCitations.map((citation) => `${citation.sourceId}|${parsePinpoint(citation.pinpoint)?.main ?? ""}`));
export const inSite = (source: Source | undefined) =>
  !!source?.corpusId && !!source.pinpoint && siteKeys.has(`${source.corpusId}|${parsePinpoint(source.pinpoint)?.main ?? ""}`);

// ---------------------------------------------------------------- run

export function loadAreas(): AreaFile[] {
  return readdirSync(MAP_DIR)
    .filter((file) => file.endsWith(".json") && file !== "status.json")
    .sort()
    .map((file) => JSON.parse(readFileSync(path.join(MAP_DIR, file), "utf8")) as AreaFile);
}

function main() {
  const areas = loadAreas();
  const STATUSES: Status[] = ["matches", "elsewhere", "differs", "not-saved", "lead"];
  const summary = areas.map((area) => {
    const rows = area.items.map((item) => ({ item, status: statusOf(item.source), site: inSite(item.source) }));
    const count = Object.fromEntries(STATUSES.map((status) => [status, rows.filter((row) => row.status === status).length])) as Record<Status, number>;
    return { area: area.area, title: area.title, total: rows.length, ...count, inSite: rows.filter((row) => row.site).length, reviewed: area.items.filter((item) => item.review).length, rows };
  });

  const toDo = (status: Status) =>
    summary.flatMap((area) => area.rows.filter((row) => row.status === status).map((row) => ({ area: area.area, id: row.item.id, title: row.item.title, source: row.item.source })));

  const json = {
    generated: new Date().toISOString().slice(0, 10),
    areas: summary.map(({ rows: _rows, ...rest }) => rest),
    differs: toDo("differs").map(({ area, id, source }) => ({ area, id, pinpoint: `${source?.corpusId ?? ""} ${source?.pinpoint ?? ""}`.trim(), expect: source?.expect ?? "" })),
    elsewhere: toDo("elsewhere").map(({ area, id, source }) => ({ area, id, pinpoint: `${source?.corpusId ?? ""} ${source?.pinpoint ?? ""}`.trim() })),
    notSaved: [...new Map(toDo("not-saved").map(({ source }) => [source?.citation ?? source?.corpusId ?? "?", source?.url ?? ""])).entries()].map(([citation, url]) => ({ citation, url })),
    leads: [...new Set(toDo("lead").map(({ source }) => source?.decision ?? source?.corpusId ?? "?"))],
  };
  writeFileSync(path.join(MAP_DIR, "status.json"), `${JSON.stringify(json, null, 2)}\n`);

  const total = summary.reduce((sum, area) => sum + area.total, 0);
  const matched = summary.reduce((sum, area) => sum + area.matches, 0);
  const md = [
    "# Law map: status",
    "",
    `Generated by \`npm run law-map:check\` on ${json.generated}. ${matched} of ${total} items match the saved official text.`,
    "",
    "| Area | Items | Match the source | Pinpoint to fix | Phrase differs | Law not saved yet | Decision to read | Reviewed by a second agent | Already in the site |",
    "|---|---|---|---|---|---|---|---|---|",
    ...summary.map((a) => `| ${a.title} | ${a.total} | ${a.matches} | ${a.elsewhere} | ${a.differs} | ${a["not-saved"]} | ${a.lead} | ${a.reviewed} | ${a.inSite} |`),
    "",
    "## Phrase differs (correct from the source)",
    "",
    ...(json.differs.length ? json.differs.map((d) => `- ${d.area} \`${d.id}\`: ${d.pinpoint} -- "${d.expect}"`) : ["None."]),
    "",
    "## Pinpoint to fix (phrase found, but not at the cited provision)",
    "",
    ...(json.elsewhere.length ? json.elsewhere.map((d) => `- ${d.area} \`${d.id}\`: ${d.pinpoint}`) : ["None."]),
    "",
    "## Laws to save (vendor)",
    "",
    ...json.notSaved.map((n) => `- ${n.citation}${n.url ? ` -- ${n.url}` : ""}`),
    "",
    "## Decisions to retrieve and read",
    "",
    ...json.leads.map((lead) => `- ${lead}`),
    "",
  ].join("\n");
  writeFileSync(path.join(MAP_DIR, "STATUS.md"), md);
  console.log(md.split("\n").slice(0, 16).join("\n"));
}

if (process.argv[1]?.endsWith("checkLawMap.ts")) main();
