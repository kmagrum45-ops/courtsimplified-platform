// READ-ONLY: compares the Civil rows of the Review and Decisions Log with the wording the site renders from the code.
// Changes nothing: it reads the log, the stage map and the published answers, and writes only its report.
// Run: node --import tsx scripts/audit/civilLogAudit.mts <path to the log as Markdown> [<report file>]
// See scripts/audit/README.md.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [logPath, outPath] = process.argv.slice(2);
if (!logPath) {
  console.error("Usage: node --import tsx scripts/audit/civilLogAudit.mts <log.md> [<report.txt>]");
  process.exit(2);
}
const R = path.resolve(import.meta.dirname, "../..");
const { ALL_STAGES } = await import(pathToFileURL(path.join(R, "src/lib/case-system/stage-map/stageMap.ts")).href);
const { stageRulesText } = await import(pathToFileURL(path.join(R, "src/lib/content-library/stageRules.ts")).href);
const lib = JSON.parse(readFileSync(path.join(R, "src/lib/content-library/published/stageAnswers.published.json"), "utf8"));

const norm = (t: string) =>
  t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ").replace(/\\"/g, '"').replace(/\s+/g, " ").trim();

// Everything the site renders for a step: published sections, rendered deadlines, quoted rules.
const textByStage = new Map<string, string>();
const add = (id: string, t: string) => textByStage.set(id, (textByStage.get(id) ?? "") + "\n" + norm(t));
for (const b of lib.blocks) for (const [k, v] of Object.entries(b)) if (typeof v === "string" && k !== "stageId") add(b.stageId, v);
for (const s of ALL_STAGES) {
  const r = stageRulesText(s);
  add(s.id, [r.deadlines ?? "", r.rules ?? ""].join("\n"));
  // Raw rule quotes too (a quote may be shown inside the rules list).
  for (const c of [...s.rules, ...s.deadlines.flatMap((d: any) => [d.rule, ...d.exceptions])]) add(s.id, c.quote);
}
const allText = [...textByStage.values()].join("\n");
const civilText = [...textByStage.entries()].filter(([id]) => id.startsWith("civil:")).map(([, t]) => t).join("\n");

const md = readFileSync(logPath, "utf8").split(/\r?\n/);
const sectionOf = (start: string, end?: string) => {
  const a = md.findIndex((l) => l.startsWith(start));
  if (a < 0) return [];
  const b = end ? md.findIndex((l, i) => i > a && l.startsWith(end)) : md.length;
  return md.slice(a, b < 0 ? md.length : b);
};
const rowsOf = (lines: string[]) =>
  lines.filter((l) => /^\| 20\d\d-/.test(l)).map((l) => l.replace(/^\| /, "").replace(/ \|$/, "").split(" | "));

// Quoted strings in a cell: "...". Long enough to be wording, not a label.
const quotedIn = (cell: string) => [...norm(cell).matchAll(/"([^"]{25,}?)"(?=[\s.,;:)]|$)/g)].map((m) => m[1]);
const sentencesOf = (cell: string) => norm(cell).split(/(?<=[.!?])\s+(?=[A-Z"])/).filter((s) => s.length > 20);
// A string with an elision is checked run by run.
const present = (needle: string, hay: string) => needle.split(/\s*(?:…|\.\.\.)\s*/).filter((r) => r.length > 8).every((r) => hay.includes(norm(r).replace(/^[,;:\s]+|[,;:\s]+$/g, "")));

const stageIdsIn = (cell: string) => [...new Set([...cell.matchAll(/\bcivil:[a-z-]+:[a-z0-9-]+/g)].map((m) => m[0]))].filter((id) => textByStage.has(id));
const out: string[] = [];
let checked = 0;

// ---- Changes for the site chat: Civil rows ----
const changes = rowsOf(sectionOf("## Changes for the site chat"));
for (const [date, stageCell, current, approved] of changes) {
  const civil = /^civil\b|^carry-over: civil|civil:/i.test(stageCell);
  if (!civil) continue;
  const site = /^site-wide/i.test(stageCell);
  const ids = stageIdsIn(stageCell);
  const hay = ids.length ? ids.map((id) => textByStage.get(id)).join("\n") : civilText;
  let wants: string[];
  if (site) {
    // Only the civil parts of the site-wide row: the quotes that follow a civil: stage id, up to the next stage id.
    const cell = norm(approved);
    wants = [];
    for (const seg of cell.split(/(?=\b(?:sc |civil:|family:|Family approved|approved r\.)\S*)/)) if (seg.startsWith("civil:")) wants.push(...quotedIn(seg));
  } else {
    const q = quotedIn(approved);
    wants = q.length ? q : sentencesOf(approved);
  }
  for (const w of wants) {
    checked++;
    const hayFor = site ? civilText : hay;
    if (!present(w, hayFor)) {
      const elsewhere = present(w, allText);
      out.push(`CHANGES | ${date} | ${stageCell.slice(0, 110)}\n   log:  ${w.slice(0, 400)}\n   code: ${elsewhere ? "found, but not on the stage(s) named" : "not found in the rendered text"}`);
    }
  }
  // The old text is gone, where the row replaces a sentence word for word (no quotes = a literal sentence).
  if (!site && !quotedIn(current).length && current && !/^(none|no |not |as approved)/i.test(current)) {
    for (const old of sentencesOf(current)) {
      if (wants.some((w) => norm(w).includes(old))) continue;
      checked++;
      if (hay.includes(old)) out.push(`CHANGES (old text still shown) | ${date} | ${stageCell.slice(0, 110)}\n   old:  ${old.slice(0, 300)}`);
    }
  }
}

// ---- Legal content review record: Civil rows ----
const review = rowsOf(sectionOf("## Legal content review record", "## Waiting for review"));
const reviewNotes: string[] = [];
for (const [date, item, says, , result, change] of review) {
  if (!/^civil\b/i.test(item)) continue;
  const wants = [...quotedIn(result), ...quotedIn(change)];
  if (!wants.length) {
    reviewNotes.push(`${date} | ${item.slice(0, 90)} | ${says.slice(0, 60)}`);
    continue;
  }
  for (const w of wants) {
    checked++;
    if (!present(w, civilText)) out.push(`REVIEW | ${date} | ${item.slice(0, 110)}\n   log:  ${w.slice(0, 400)}\n   code: ${present(w, allText) ? "found only outside Civil" : "not found in the rendered text"}`);
  }
}
const report = `${out.length} mismatches of ${checked} checked\n\n${out.join("\n\n")}\n\nREVIEW ROWS WITH NO WORDING IN THIS LOG (${reviewNotes.length}):\n${reviewNotes.join("\n")}\n`;
if (outPath) writeFileSync(outPath, report);
else console.log(report);
console.log(`${out.length} mismatches of ${checked} checked; ${reviewNotes.length} review rows carry no wording`);
