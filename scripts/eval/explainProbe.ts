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
  generateWithModel,
  verifyWithModel,
  type Verdict,
} from "../../src/lib/case-system/retrieval/explainProvision";
import { RECALL_SET } from "./retrievalRecallSet";

const LIMIT = Number(process.env.EXPLAIN_PROBE_LIMIT || 30);

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
  for (const id of ids.slice(0, LIMIT)) {
    const verdicts: Verdict[] = [];
    const attempts: string[] = [];
    const t0 = Date.now();
    const result = await explainPassage(id, {
      index,
      generate: async (provision, feedback) => {
        const text = await generateWithModel(provision, feedback);
        if (text) attempts.push(text);
        return text;
      },
      verify: async (provision, explanation) => {
        const verdict = await verifyWithModel(provision, explanation);
        if (verdict) verdicts.push(verdict);
        return verdict;
      },
    });
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    total += 1;
    if (result.ok) shown += 1;
    lines.push(`## ${result.ok ? "SHOWN" : `WITHHELD (${result.reason})`} -- ${id} (${seconds}s)`);
    if (result.ok) lines.push(`**${result.citation}**`, "", `> ${result.explanation}`);
    attempts.forEach((text, n) => {
      const verdict = verdicts[n];
      lines.push("", `Attempt ${n + 1}: ${text}`);
      if (verdict) {
        for (const item of verdict.unsupported) lines.push(`- not in the provision: ${item}`);
        for (const item of verdict.missing) lines.push(`- left out: ${item}`);
        if (!verdict.unsupported.length && !verdict.missing.length) lines.push("- check: nothing found");
      } else {
        lines.push("- refused by code before the check, or the check failed");
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
