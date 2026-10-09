#!/usr/bin/env node
/**
 * What a test run cost, from its token ledgers (2026-10-09).
 *
 * Every model call in a run with AI_TOKEN_LEDGER set adds one line
 * {model, input, output} to a ledger file (src/lib/case-system/openaiClient.ts).
 * This sums every `tokens-*.jsonl` in a folder and writes COST.md with the
 * calls, the tokens and the estimated dollars at AI_PRICE_INPUT_PER_M /
 * AI_PRICE_OUTPUT_PER_M (default 2 and 10 per million, gpt-6.1-sol's list
 * price on 2026-10-09). It is an ESTIMATE: OpenAI's own usage page is the
 * bill. Never reads or prints content or keys.
 *
 * Usage: node scripts/ai/costReport.mjs <folder>
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function summarize(lines, prices = { input: 2, output: 10 }) {
  const byFile = new Map();
  const total = { calls: 0, input: 0, output: 0 };
  for (const { file, text } of lines) {
    const entry = byFile.get(file) ?? { calls: 0, input: 0, output: 0 };
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      const input = Number(row.input) || 0;
      const output = Number(row.output) || 0;
      entry.calls += 1;
      entry.input += input;
      entry.output += output;
      total.calls += 1;
      total.input += input;
      total.output += output;
    }
    byFile.set(file, entry);
  }
  const dollars = (use) => (use.input * prices.input + use.output * prices.output) / 1_000_000;
  return { byFile, total, dollars };
}

function main() {
  const folder = process.argv[2] ?? "walkthrough-output";
  const files = readdirSync(folder).filter((name) => /^tokens-.*\.jsonl$/.test(name));
  const prices = { input: Number(process.env.AI_PRICE_INPUT_PER_M) || 2, output: Number(process.env.AI_PRICE_OUTPUT_PER_M) || 10 };
  const { byFile, total, dollars } = summarize(
    files.map((file) => ({ file, text: readFileSync(path.join(folder, file), "utf8") })),
    prices,
  );
  const rows = [...byFile.entries()].map(
    ([file, use]) => `| ${file.replace(/^tokens-|\.jsonl$/g, "")} | ${use.calls} | ${use.input.toLocaleString("en-CA")} | ${use.output.toLocaleString("en-CA")} | $${dollars(use).toFixed(2)} |`,
  );
  const report = [
    "# What this run cost (estimate)",
    "",
    `Priced at $${prices.input} per million input tokens and $${prices.output} per million output tokens. OpenAI's usage page is the real bill.`,
    "",
    "| Part | Calls | Input tokens | Output tokens | Estimate |",
    "|---|---|---|---|---|",
    ...rows,
    `| **Total** | **${total.calls}** | **${total.input.toLocaleString("en-CA")}** | **${total.output.toLocaleString("en-CA")}** | **$${dollars(total).toFixed(2)}** |`,
    "",
  ].join("\n");
  writeFileSync(path.join(folder, "COST.md"), report);
  console.log(report);
}

if (process.argv[1] && process.argv[1].endsWith("costReport.mjs")) main();
