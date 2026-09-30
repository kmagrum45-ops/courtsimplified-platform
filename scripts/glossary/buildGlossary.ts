/**
 * Builds src/lib/content-library/glossary/glossaryIndex.json: the legal terms
 * the court rules and the core statutes define, with each definition quoted
 * verbatim from the vendored e-Laws text.
 *
 *   node --import tsx scripts/glossary/buildGlossary.ts   (npm run glossary:index)
 *
 * WHY (2026-09-30). The site had no glossary: "noted in default", "action",
 * "service", "originating process" appeared everywhere and were explained
 * nowhere. Each regulation and Act below opens with a definitions provision
 * ("In these rules, 'action' means ..."). This reads those provisions and
 * nothing else, so every definition is the law's own words. The French
 * equivalent the e-Laws text prints after each definition is dropped.
 *
 * test:glossary rebuilds this in memory and fails if the committed file
 * differs, so a re-vendored statute cannot leave a stale definition live.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export type GlossarySource = {
  id: string;
  file: string;
  citation: string;
  pinpoint: string;
  url: string;
  /** Where the definitions provision starts (a line in the file, matched exactly after trimming). */
  startLine: RegExp;
};

export const GLOSSARY_SOURCES: GlossarySource[] = [
  {
    id: "small-claims-rules",
    file: "docs/sources/corpus/oreg-258-98-small-claims-rules.txt",
    citation: "Rules of the Small Claims Court, O. Reg. 258/98",
    pinpoint: "r. 1.02 (1)",
    url: "https://www.ontario.ca/laws/regulation/980258",
    startLine: /^1\.02\s+\(1\)\s+In these rules,$/,
  },
  {
    id: "civil-rules",
    file: "docs/sources/corpus/rules-of-civil-procedure.txt",
    citation: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
    pinpoint: "r. 1.03 (1)",
    url: "https://www.ontario.ca/laws/regulation/900194",
    startLine: /^1\.03\s+\(1\)\s+In these rules, unless the context requires otherwise,$/,
  },
  {
    id: "family-rules",
    file: "docs/sources/corpus/family-law-rules.txt",
    citation: "Family Law Rules, O. Reg. 114/99",
    pinpoint: "r. 2 (1)",
    url: "https://www.ontario.ca/laws/regulation/990114",
    startLine: /^2\.\s+\(1\)\s+In these rules,$/,
  },
  {
    id: "courts-of-justice-act",
    file: "docs/sources/corpus/cja-courts-of-justice-act.txt",
    citation: "Courts of Justice Act, R.S.O. 1990, c. C.43",
    pinpoint: "s. 1 (1)",
    url: "https://www.ontario.ca/laws/statute/90c43",
    startLine: /^1\s+\(1\)\s+In this Act,$/,
  },
  {
    id: "limitations-act",
    file: "docs/sources/corpus/limitations-act-2002.txt",
    citation: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
    pinpoint: "s. 1",
    url: "https://www.ontario.ca/laws/statute/02l24",
    startLine: /^1\s+In this Act,$/,
  },
  {
    id: "family-law-act",
    file: "docs/sources/corpus/family-law-act.txt",
    citation: "Family Law Act, R.S.O. 1990, c. F.3",
    pinpoint: "s. 1 (1)",
    url: "https://www.ontario.ca/laws/statute/90f03",
    startLine: /^1\s+\(1\)\s+In this Act,$/,
  },
  {
    id: "family-law-act-property",
    file: "docs/sources/corpus/family-law-act.txt",
    citation: "Family Law Act, R.S.O. 1990, c. F.3 (Part I, Family Property)",
    pinpoint: "s. 4 (1)",
    url: "https://www.ontario.ca/laws/statute/90f03",
    startLine: /^4\s+\(1\)\s+In this Part,$/,
  },
  {
    id: "family-law-act-home",
    file: "docs/sources/corpus/family-law-act.txt",
    citation: "Family Law Act, R.S.O. 1990, c. F.3 (Part II, Matrimonial Home)",
    pinpoint: "s. 17",
    url: "https://www.ontario.ca/laws/statute/90f03",
    startLine: /^17\s+In this Part,$/,
  },
  {
    id: "family-law-act-support",
    file: "docs/sources/corpus/family-law-act.txt",
    citation: "Family Law Act, R.S.O. 1990, c. F.3 (Part III, Support Obligations)",
    pinpoint: "s. 29",
    url: "https://www.ontario.ca/laws/statute/90f03",
    startLine: /^29\s+In this Part,$/,
  },
];

export type GlossaryDefinition = {
  source: string;
  citation: string;
  pinpoint: string;
  url: string;
  /** Verbatim, whitespace collapsed, French equivalent removed. */
  definition: string;
};

export type GlossaryTerm = { term: string; definitions: GlossaryDefinition[] };

const TERM_LINE = /^["“]([^"”]+)["”]\s*,?\s*(?:where used [^,]*,\s*)?(means|includes|has the same meaning|refers)/;

function definitionsIn(source: GlossarySource, root: string): { term: string; definition: string }[] {
  const lines = readFileSync(path.join(root, source.file), "utf8").split("\n");
  const start = lines.findIndex((line) => source.startLine.test(line.trim()));
  if (start === -1) throw new Error(`${source.id}: definitions provision not found`);

  const out: { term: string; definitions: string[] }[] = [];
  let current: { term: string; definitions: string[] } | null = null;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const termMatch = trimmed.match(TERM_LINE);
    if (termMatch) {
      current = { term: termMatch[1].replace(/\s+/g, " ").trim(), definitions: [trimmed] };
      out.push(current);
      continue;
    }
    // The provision ends at the next subsection or rule marker, or a heading.
    if (/^\(\d+(\.\d+)?\)\s/.test(trimmed) || /^\d+(\.\d+)*\.?\s+\(\d+\)/.test(trimmed)) break;
    if (!trimmed) {
      if (out.length) break;
      continue;
    }
    if (current) current.definitions.push(trimmed);
  }

  return out.map(({ term, definitions }) => {
    let text = definitions.join(" ").replace(/\s+/g, " ").trim();
    // Drop the French equivalent: ("tribunal") or (“appelant”), and any amendment history after it.
    text = text.replace(/;?\s*\((?:["“][^)]*["”](?:,\s*["“][^)]*["”])*)\)\s*.*$/, "").replace(/;\s*(and|or)?\s*$/, "");
    return { term, definition: text.replace(/[;,]\s*$/, "") };
  });
}

export function buildGlossary(root = process.cwd()): GlossaryTerm[] {
  const byTerm = new Map<string, GlossaryTerm>();
  for (const source of GLOSSARY_SOURCES) {
    for (const { term, definition } of definitionsIn(source, root)) {
      const key = term.toLowerCase();
      const entry = byTerm.get(key) || { term, definitions: [] };
      entry.definitions.push({
        source: source.id,
        citation: source.citation,
        pinpoint: source.pinpoint,
        url: source.url,
        definition,
      });
      byTerm.set(key, entry);
    }
  }
  return [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term));
}

if (process.argv[1] && process.argv[1].endsWith("buildGlossary.ts")) {
  const terms = buildGlossary();
  const out = path.join(process.cwd(), "src/lib/content-library/glossary/glossaryIndex.json");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), terms }, null, 1) + "\n");
  const counts = GLOSSARY_SOURCES.map(
    (source) => `${source.id} ${terms.filter((t) => t.definitions.some((d) => d.source === source.id)).length}`,
  );
  console.log(`${terms.length} terms (${counts.join(", ")}) -> ${path.relative(process.cwd(), out)}`);
}
