/**
 * Reads the owner's Case Law Map file (docs/law-map/case-law-batch1-2026-11-22.md) into its 25 entries, exactly as
 * written: every value is the text after "- key: " on its line, untouched. Shared by the build step
 * (scripts/content/buildCaseLawBatch1.ts) and the test (scripts/verification/verifyCaseLawBatch1.ts), so the stored
 * wording and the wording it is checked against come from one reading of one file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const CASE_LAW_FIXTURE = path.resolve(import.meta.dirname, "..", "..", "docs", "law-map", "case-law-batch1-2026-11-22.md");

export type FixtureEntry = {
  /** "E01" */
  number: string;
  /** "pintea-v-johns" */
  slug: string;
  /** Every "- key: value" line of the entry, value untouched. */
  fields: Record<string, string>;
};

/** The marker the file uses for "this entry has no caution of its own". */
export const NO_CAUTION = /^\(none( beyond the summary)?\)$/;

export function readCaseLawFixture(file = CASE_LAW_FIXTURE): FixtureEntry[] {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const entries: FixtureEntry[] = [];
  let current: FixtureEntry | null = null;
  for (const line of text.split("\n")) {
    const heading = /^### (E\d\d) — ([a-z0-9-]+)$/.exec(line);
    if (heading) {
      current = { number: heading[1], slug: heading[2], fields: {} };
      entries.push(current);
      continue;
    }
    if (line.startsWith("#") || line === "---") {
      current = null;
      continue;
    }
    const field = /^- ([a-z_]+): (.*)$/.exec(line);
    if (field && current) {
      if (field[1] in current.fields) throw new Error(`${current.number}: "${field[1]}" given twice`);
      current.fields[field[1]] = field[2];
    }
  }
  return entries;
}

/** "Label: https://…" pairs, separated by " ; " (statute_links), or one pair. */
export function readLinks(value: string): { label: string; url: string }[] {
  return value.split(" ; ").map((part) => {
    const at = part.lastIndexOf(": https://");
    if (at < 0) throw new Error(`not "Label: URL": ${part}`);
    return { label: part.slice(0, at), url: part.slice(at + 2) };
  });
}
