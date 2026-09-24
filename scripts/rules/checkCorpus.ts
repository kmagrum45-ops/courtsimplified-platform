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
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { CORPUS_SOURCES } from "./corpusSources";
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

type Citer = { id: string; where: string; rules: string[] };

/** Everything in the content library that cites a rule by number. */
export function collectCiters(): Citer[] {
  const citers: Citer[] = [];

  for (const block of NEXT_STEP_BLOCKS) {
    const rules = citedRules(block.text);
    if (rules.length) citers.push({ id: block.id, where: "next-step block", rules });
  }

  for (const block of ASSISTANT_BLOCKS) {
    const rules = citedRules(
      `${block.template} ${block.citations.map((c) => `${c.sourceName} ${c.quote ?? ""}`).join(" ")}`,
    );
    if (rules.length) citers.push({ id: block.id, where: "assistant block", rules });
  }

  for (const stage of PROCEDURAL_STAGES) {
    const rules = citedRules(
      [stage.summary, ...stage.keyFacts, ...stage.commonRisks].join(" "),
    );
    if (rules.length) {
      citers.push({ id: stage.title, where: "procedural-stage card", rules });
    }
  }

  return citers;
}

function extractDoc(buffer: Buffer): string {
  const temporary = path.join(os.tmpdir(), `corpus-check-${Date.now()}.doc`);
  writeFileSync(temporary, buffer);
  try {
    return execFileSync("antiword", [temporary], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    try {
      unlinkSync(temporary);
    } catch {
      /* not worth failing over */
    }
  }
}

function extractHtml(buffer: Buffer): string {
  return buffer
    .toString("utf8")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/t[dh]>\s*/gi, "\t")
    .replace(/<\/tr>\s*/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

async function main(): Promise<void> {
  const manifest = readManifest();
  if (!manifest) {
    console.error("No manifest. Run `npm run rules:fetch` first.");
    process.exitCode = 1;
    return;
  }

  const citers = collectCiters();
  let changedSources = 0;
  let unreachable = 0;
  const reverify = new Map<string, Set<string>>();

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
      fresh = source.format === "elaws-doc" ? extractDoc(buffer) : extractHtml(buffer);
    } catch (error) {
      console.log(`UNREACHABLE — ${error instanceof Error ? error.name : "unknown"}`);
      unreachable += 1;
      continue;
    }

    if (sha256(fresh) === entry.sha256) {
      console.log("unchanged");
      continue;
    }

    changedSources += 1;
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
      if (touched.length === 0) continue;
      const key = `${citer.where}: ${citer.id}`;
      reverify.set(key, new Set([...(reverify.get(key) ?? []), ...touched]));
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
  } else if (changedSources > 0) {
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
