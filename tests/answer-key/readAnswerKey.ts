/**
 * THE ANSWER KEY'S READER (site owner, 2026-10-25): a simple table of what each of the 20
 * messy cases must come out as -- the side, court, stage, kind of claim, deadline, form and
 * next step -- which Jason checks. The test that runs each case against it is written once
 * the key arrives; this only reads it.
 *
 * Accepts the table as CSV (a header row "case,field,expected"), tab-separated, or a Markdown
 * table with the same three columns, in any order and any case. Blank lines and lines starting
 * with "#" are skipped. A row with a missing cell is an error, never a silent skip: a key with a
 * hole would let a mismatch pass.
 *
 * Pure: reads a string. No browser, no network.
 */
export type AnswerKeyRow = { caseId: string; field: string; expected: string; line: number };

const COLUMNS = { case: "caseId", field: "field", expected: "expected" } as const;

/** One CSV line into cells: commas outside quotes, "" inside quotes is a quote. */
function csvCells(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted && char === '"' && line[index + 1] === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(cell); cell = ""; }
    else cell += char;
  }
  cells.push(cell);
  return cells.map((item) => item.trim());
}

function cellsOf(line: string, kind: "csv" | "tsv" | "markdown"): string[] {
  if (kind === "tsv") return line.split("\t").map((cell) => cell.trim());
  if (kind === "markdown") return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  return csvCells(line);
}

export function readAnswerKey(text: string): AnswerKeyRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((raw, index) => ({ raw, line: index + 1 })).filter(({ raw }) => raw.trim() && !raw.trim().startsWith("#"));
  if (!lines.length) throw new Error("The answer key is empty.");
  const first = lines[0].raw;
  const kind = first.trim().startsWith("|") ? "markdown" : first.includes("\t") ? "tsv" : "csv";
  const header = cellsOf(first, kind).map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ""));
  const at = Object.fromEntries(Object.keys(COLUMNS).map((name) => [name, header.indexOf(name)])) as Record<keyof typeof COLUMNS, number>;
  const missing = Object.entries(at).filter(([, index]) => index < 0).map(([name]) => name);
  if (missing.length) throw new Error(`The answer key's header needs the columns case, field and expected; missing: ${missing.join(", ")}.`);
  const rows: AnswerKeyRow[] = [];
  for (const { raw, line } of lines.slice(1)) {
    // A Markdown table's separator row: |---|---|---|
    if (kind === "markdown" && /^\s*\|?\s*:?-{2,}/.test(raw)) continue;
    const cells = cellsOf(raw, kind);
    const row = { caseId: cells[at.case] ?? "", field: cells[at.field] ?? "", expected: cells[at.expected] ?? "", line };
    if (!row.caseId || !row.field || !row.expected) throw new Error(`Answer key line ${line} has an empty cell: ${raw.trim()}`);
    rows.push(row);
  }
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.caseId.toLowerCase()}|${row.field.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Answer key line ${row.line} repeats ${row.caseId} / ${row.field}: one expected value per case and field.`);
    seen.add(key);
  }
  return rows;
}

/** The key as case -> field -> expected value. */
export function answerKeyByCase(rows: AnswerKeyRow[]): Map<string, Map<string, string>> {
  const byCase = new Map<string, Map<string, string>>();
  for (const row of rows) {
    if (!byCase.has(row.caseId)) byCase.set(row.caseId, new Map());
    byCase.get(row.caseId)!.set(row.field, row.expected);
  }
  return byCase;
}
