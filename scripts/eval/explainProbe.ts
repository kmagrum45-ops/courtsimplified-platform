/**
 * How often a plain-language explanation passes the independent check, and
 * what the check finds when it does not. Real model calls; a report, not a
 * gate.
 *
 * Takes the provisions labelled in the recall set (retrievalRecallSet.ts) --
 * real Small Claims, civil, family and tenancy provisions plus decision
 * paragraphs -- explains each through the same pipeline the site uses
 * (explainProvision.ts), and writes explain-probe.md with each explanation
 * shown, each one withheld, and the checker's findings on every attempt. The
 * pass rate says how often a person gets an explanation; the findings are
 * what to read to judge whether the checker is strict enough, or too strict.
 *
 * No user data. Needs OPENAI_API_KEY (the Retrieval Eval workflow runs it).
 *
 *   npm run eval:explain
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadCorpusIndex, sourcePassages } from "../../src/lib/case-system/retrieval/corpusIndex";
import {
  explainPassage,
  explanationRejection,
  generateWithModel,
  verifyWithModel,
  type Verdict,
} from "../../src/lib/case-system/retrieval/explainProvision";
import { RECALL_SET } from "./retrievalRecallSet";

const LIMIT = Number(process.env.EXPLAIN_PROBE_LIMIT || 40);

async function main() {
  const index = loadCorpusIndex();
  if (!index) throw new Error("No built index (docs/sources/retrieval/).");

  const ids: string[] = [];
  for (const story of RECALL_SET) {
    for (const label of story.expect) {
      const sourceId = Object.keys(index.meta.sources).find((id) => id === label.source || id.endsWith(label.source));
      if (!sourceId) continue;
      const passage = sourcePassages(index, sourceId).find((chunk) => chunk.text.includes(label.phrase));
      if (passage && !ids.includes(passage.id)) ids.push(passage.id);
    }
  }

  const lines: string[] = [];
  let shown = 0;
  let total = 0;
  const started = Date.now();
  // Spread across the whole set (Small Claims, civil, family, tenancy,
  // decisions), not its first stories: the first run took the first 30 and
  // saw no family provision at all.
  const step = Math.max(1, ids.length / LIMIT);
  const sample = Array.from({ length: Math.min(LIMIT, ids.length) }, (_, n) => ids[Math.floor(n * step)]);
  for (const id of sample) {
    const attempts: { text: string; refused: string | null; verdict?: Verdict | null }[] = [];
    const t0 = Date.now();
    const result = await explainPassage(id, {
      index,
      generate: async (provision, feedback) => {
        const text = await generateWithModel(provision, feedback);
        if (text) attempts.push({ text, refused: explanationRejection(provision, text) });
        return text;
      },
      verify: async (provision, explanation) => {
        const verdict = await verifyWithModel(provision, explanation);
        const attempt = attempts[attempts.length - 1];
        if (attempt) attempt.verdict = verdict;
        return verdict;
      },
    });
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    total += 1;
    if (result.ok) shown += 1;
    lines.push(`## ${result.ok ? "SHOWN" : `WITHHELD (${result.reason})`} -- ${id} (${seconds}s)`);
    if (result.ok) lines.push(`**${result.citation}**`, "", `> ${result.explanation}`);
    attempts.forEach((attempt, n) => {
      lines.push("", `Attempt ${n + 1} (${attempt.text.length} characters): ${attempt.text}`);
      if (attempt.refused) lines.push(`- refused by code: ${attempt.refused}`);
      else if (attempt.verdict === null) lines.push("- the check returned no usable answer");
      else if (attempt.verdict) {
        for (const item of attempt.verdict.unsupported) lines.push(`- not in the provision: ${item}`);
        for (const item of attempt.verdict.missing) lines.push(`- left out: ${item}`);
        if (!attempt.verdict.unsupported.length && !attempt.verdict.missing.length) lines.push("- check: nothing found");
      }
    });
    lines.push("");
    console.log(`${result.ok ? "shown   " : "withheld"} ${id} ${seconds}s`);
  }

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  const head = `# Plain explanations: ${shown} of ${total} shown (${minutes} min)\n\nEach was written by one call and checked by a separate call that saw only the provision and the explanation, then by code. Withheld ones show what the check found.\n`;
  writeFileSync(path.join(process.cwd(), "explain-probe.md"), `${head}\n${lines.join("\n")}\n`);
  console.log(`${shown} of ${total} explanations shown`);
}

void main();
