/**
 * No model-written warning reaches a user.
 *
 * courtSimplifiedBrain's `systemWarnings` becomes AnalysisResult.userWarnings.
 * It used to spread `gptCognition.systemWarnings` -- free text the model
 * wrote -- into that list, filtered only by the case-strength blocklist. A
 * procedural or legal sentence ("file your Defence within 20 days") could go
 * straight to a user. The LSO A2I policy forbids AI-generated legal content
 * reaching a user without human review; found 2026-09-27 while preparing the
 * A2I response.
 *
 * Asserts the PROPERTY: nothing taken from the model's output (`gptCognition`,
 * `structuredCognition`, `cognition`) is spread into the user-facing
 * `systemWarnings` list. Every entry must be built by code. A new
 * deterministic warning passes; a model field does not.
 *
 * Also asserts the fixed generic caution is present, so removing the model's
 * version did not silently drop the only warning some analyses carried.
 *
 * Verified end to end on 2026-09-27 against a stubbed OpenAI response carrying
 * a planted procedural warning: reached userWarnings before this change, not
 * after. That run needs a stubbed client and is not repeated here.
 *
 * Reads source off disk. No network, no model, no database.
 *
 * Run: npm run test:no-model-warnings
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const source = readFileSync(path.join(ROOT, "src/lib/case-system/intelligence/courtSimplifiedBrain.ts"), "utf8");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

/** The array literal passed to `systemWarnings: sanitizeTextArray(cleanList([ ... ]))`, comments stripped. */
function systemWarningsBlock(): string {
  const start = source.indexOf("systemWarnings: sanitizeTextArray(cleanList([");
  if (start === -1) throw new Error("systemWarnings assembly not found -- update this suite");
  let depth = 0;
  let i = source.indexOf("[", start);
  const from = i;
  for (; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]" && --depth === 0) break;
  }
  return source
    .slice(from, i + 1)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

const block = systemWarningsBlock();
const modelRef = block.match(/\b(gptCognition|structuredCognition|cognition)\b/);
check("user-facing systemWarnings takes nothing from the model's output", !modelRef, modelRef?.[0]);
check("the fixed generic caution is still included", block.includes("FIXED_VERIFY_WARNING"));
check(
  "the fixed caution is a literal, not model text",
  /export const FIXED_VERIFY_WARNING\s*=\s*\n?\s*"/.test(source),
);

console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
