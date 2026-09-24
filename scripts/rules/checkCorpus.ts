/**
 * Has the law moved since we vendored it?
 *
 *   npm run rules:check
 *
 * *** WHAT IT DOES ***
 *
 * Re-fetches every source, compares the extracted text to the vendored copy,
 * and — where it differs — reports which RULES changed and which content
 * blocks cite them. The output is a re-verification list, not a diff dump.
 *
 * *** WHY A DIFF IS NOT ENOUGH ***
 *
 * "O. Reg. 258/98 changed" is not actionable: it is 185,000 characters and a
 * consolidation re-issue can shift whitespace. What a person needs is "r.
 * 9.01 changed, and these four blocks cite it". So the comparison is done per
 * RULE, by splitting both copies on rule headings, and the result is joined
 * against the citations the content library actually carries.
 *
 * *** IT DOES NOT AUTO-UPDATE ***
 *
 * Deliberately. A source whose text changed may need a block rewritten, a
 * citation re-pinpointed, or nothing at all — and a script that silently
 * refreshed the vendored copy would erase the evidence that anything moved.
 * `rules:check` reports; `rules:fetch` is the deliberate act of re-vendoring.
 *
 * *** RUN IT MONTHLY ***
 *
 * e-Laws consolidations are irregular, and a rule can change months before
 * anyone notices through ordinary use. Monthly is frequent enough that a
 * change is caught while the person who wrote the block still remembers it.
 * See docs/lso-fixes-report.md for how to wire it as a scheduled job.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { extract } from "./extractText";

import { CORPUS_SOURCES, sourceTier } from "./corpusSources";
import { sha256, consolidationLine, readManifest } from "./fetchCorpus";
import { NEXT_STEP_BLOCKS } from "../../src/lib/content-library/nextSteps";
import { ASSISTANT_BLOCKS } from "../../src/lib/content-library/assistantBlocks";
import { PROCEDURAL_STAGES } from "../../src/lib/content-library/proceduralStages";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_DIR = path.join(ROOT, "docs", "sources", "corpus");

/**
 * Splits a regulation into its rules.
 *
 * O. Reg. 258/98 numbers its provisions "1.01", "8.01", "20.08" at the start
 * of a line, sometimes indented. Anything before the first match is the
 * preamble and is kept under a "(preamble)" key so a change to the
 * consolidation header is still visible.
 */
export function splitByRule(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = text.split("\n");

  let current = "(preamble)";
  let buffer: string[] = [];

  for (const line of lines) {
    const heading = /^\s{0,8}(\d{1,2}\.\d{1,2})\s/.exec(line);
    if (heading) {
      sections.set(current, buffer.join("\n"));
      current = heading[1];
      buffer = [];
    }
    buffer.push(line);
  }
  sections.set(current, buffer.join("\n"));

  return sections;
}

/** Every rule number a piece of content cites, e.g. "r. 9.01" or "rr. 7.01". */
export function citedRules(text: string): string[] {
  return Array.from(
    new Set(Array.from(text.matchAll(/\br{1,2}\.\s*(\d{1,2}\.\d{1,2})/g), (m) => m[1])),
  );
}

/**
 * Which STATUTES a piece of content names.
 *
 * *** WHY THIS EXISTS BESIDE citedRules ***
 *
 * The pre-suit notice blocks cite sections, not rules: "Municipal Act s. 44
 * (10)", "Occupiers' Liability Act s. 6.1". `citedRules` matches the "r. 9.01"
 * shape and would see none of them — so the highest-consequence content in the
 * product would have been outside the change watch entirely.
 *
 * Matching by STATUTE rather than by section is deliberate. Section numbering
 * inside a large Act is not reliably parseable from prose ("s. 44 (10)",
 * "s. 44(10)", "subsection 44(10)"), and a false negative here means a barred
 * claim nobody was warned about. Statute-level granularity over-reports —
 * a change anywhere in the Municipal Act flags every block citing it — and
 * over-reporting on three sources is the right trade against missing one.
 */
const STATUTE_NAMES: Array<{ sourceId: string; pattern: RegExp }> = [
  { sourceId: "municipal-act-2001", pattern: /Municipal Act/i },
  { sourceId: "city-of-toronto-act-2006", pattern: /City of Toronto Act/i },
  { sourceId: "occupiers-liability-act", pattern: /Occupiers'? Liability Act/i },
  { sourceId: "limitations-act-2002", pattern: /Limitations Act/i },
  { sourceId: "cja-courts-of-justice-act", pattern: /Courts of Justice Act/i },
  { sourceId: "legislation-act-2006", pattern: /Legislation Act/i },
  { sourceId: "oreg-626-00-monetary-jurisdiction", pattern: /O\.\s*Reg\.\s*626\/00|42\/25/i },
];

export function citedStatutes(text: string): string[] {
  return STATUTE_NAMES.filter(({ pattern }) => pattern.test(text)).map(
    ({ sourceId }) => sourceId,
  );
}

type Citer = {
  id: string;
  where: string;
  /** Small Claims rule numbers, e.g. "9.01". */
  rules: string[];
  /** Corpus source ids for statutes this content names. */
  statutes: string[];
};

/**
 * Everything in the content library that cites a rule or names a statute.
 *
 * Both, because they fail differently. A rule citation is precise enough to
 * diff per provision. A statute reference is not — so a change anywhere in
 * that Act flags every block naming it, which over-reports and never misses.
 */
export function collectCiters(): Citer[] {
  const citers: Citer[] = [];

  const add = (id: string, where: string, text: string) => {
    const rules = citedRules(text);
    const statutes = citedStatutes(text);
    if (rules.length || statutes.length) citers.push({ id, where, rules, statutes });
  };

  for (const block of NEXT_STEP_BLOCKS) {
    add(block.id, "next-step block", block.text);
  }

  for (const block of ASSISTANT_BLOCKS) {
    add(
      block.id,
      "assistant block",
      `${block.template} ${block.citations
        .map((c) => `${c.sourceName} ${c.quote ?? ""}`)
        .join(" ")}`,
    );
  }

  for (const stage of PROCEDURAL_STAGES) {
    add(
      stage.title,
      "procedural-stage card",
      [
        stage.summary,
        ...stage.keyFacts,
        ...stage.commonRisks,
        ...stage.citations.map((c) => c.sourceName),
      ].join(" "),
    );
  }

  return citers;
}





async function main(): Promise<void> {
  const manifest = readManifest();
  if (!manifest) {
    console.error("No manifest. Run `npm run rules:fetch` first.");
    process.exitCode = 1;
    return;
  }

  const citers = collectCiters();
  let unreachable = 0;
  const reverify = new Map<string, Set<string>>();

  /*
   * Changed sources are counted BY TIER, and reported separately.
   *
   * A rule amendment and a fee revision both move a hash, and treating them
   * with the same urgency trains people to ignore both. Legislation changing
   * means content may now be WRONG. A practical page changing usually means a
   * number moved -- which still needs checking, but is a different errand.
   */
  const changed: Record<string, string[]> = { legislation: [], practical: [] };

  console.log("");
  console.log(`Vendored ${manifest.generatedAt.slice(0, 10)}. Re-fetching ${CORPUS_SOURCES.length} source(s).`);
  console.log("");

  for (const source of CORPUS_SOURCES) {
    const entry = manifest.entries.find((candidate) => candidate.id === source.id);
    process.stdout.write(`${source.id.padEnd(38)} `);

    if (!entry) {
      console.log("NOT VENDORED — run rules:fetch");
      unreachable += 1;
      continue;
    }

    let fresh: string;
    try {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "CourtSimplified-rules-corpus (change watch)" },
      });
      if (!response.ok) {
        console.log(`UNREACHABLE — HTTP ${response.status}`);
        unreachable += 1;
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fresh = extract(source.format, buffer);
    } catch (error) {
      console.log(`UNREACHABLE — ${error instanceof Error ? error.name : "unknown"}`);
      unreachable += 1;
      continue;
    }

    if (sha256(fresh) === entry.sha256) {
      console.log("unchanged");
      continue;
    }

    changed[sourceTier(source)].push(source.id);
    console.log("CHANGED");
    console.log(`${" ".repeat(39)}was: ${entry.consolidation.slice(0, 92)}`);
    console.log(`${" ".repeat(39)}now: ${consolidationLine(fresh).slice(0, 92)}`);

    // Per-rule comparison, so the report names provisions rather than a file.
    const vendoredPath = path.join(CORPUS_DIR, entry.file);
    if (!existsSync(vendoredPath)) continue;

    const before = splitByRule(readFileSync(vendoredPath, "utf8"));
    const after = splitByRule(fresh);
    const rules = new Set([...before.keys(), ...after.keys()]);

    const changedRules: string[] = [];
    for (const rule of rules) {
      if ((before.get(rule) ?? "") !== (after.get(rule) ?? "")) changedRules.push(rule);
    }

    if (changedRules.length > 0) {
      console.log(`${" ".repeat(39)}rules changed: ${changedRules.slice(0, 20).join(", ")}`);
      if (changedRules.length > 20) {
        console.log(`${" ".repeat(39)}…and ${changedRules.length - 20} more`);
      }
    }

    for (const citer of citers) {
      const touched = citer.rules.filter((rule) => changedRules.includes(rule));
      // A block that NAMES this statute is flagged whether or not a rule
      // number matched — see citedStatutes for why that over-reports on
      // purpose. The notice provisions are cited as "s. 44 (10)", which no
      // rule-number pattern can see.
      const namesThisStatute = citer.statutes.includes(source.id);

      if (touched.length === 0 && !namesThisStatute) continue;

      const key = `${citer.where}: ${citer.id}`;
      const reasons = touched.length > 0 ? touched : [`(names ${source.citation})`];
      reverify.set(key, new Set([...(reverify.get(key) ?? []), ...reasons]));
    }
  }

  console.log("");

  if (reverify.size > 0) {
    console.log("CONTENT NEEDING RE-VERIFICATION:");
    console.log("");
    for (const [citer, rules] of [...reverify].sort()) {
      console.log(`  ${citer}`);
      console.log(`    cites changed rule(s): ${[...rules].sort().join(", ")}`);
    }
    console.log("");
    console.log("For each: read the new rule text, confirm the block still states it");
    console.log("correctly, and re-run `npm run rules:fetch` once the block is right.");
    console.log("Do NOT re-vendor first — that erases the evidence anything moved.");
  } else if (changed.legislation.length + changed.practical.length > 0) {
    console.log("Sources changed, but no rule a content block cites was affected.");
    console.log("Re-vendor with `npm run rules:fetch` when convenient.");
  } else {
    console.log(`No source changed. ${citers.length} content item(s) cite rules by number.`);
  }

  if (unreachable > 0) {
    console.log("");
    console.log(`${unreachable} source(s) could not be reached. That is NOT a clean result —`);
    console.log("a source that cannot be checked is a source that may have changed.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].endsWith("checkCorpus.ts")) {
  void main();
}
