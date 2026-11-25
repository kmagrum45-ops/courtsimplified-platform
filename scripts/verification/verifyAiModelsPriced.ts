/**
 * EVERY MODEL THE SITE CAN CALL HAS A PRICE IN THE TABLE (site owner, 10 Nov 2026: "Add a test that fails if a model name
 * used anywhere in the code is not priced").
 *
 * Scope: the served code (src/ and app/, comments stripped), the model defaults the tiers resolve to (aiModels.ts
 * TIER_DEFAULTS), and the corpus index the research step embeds with (docs/sources/retrieval/corpus-index.json
 * "model"). Terminal-only scripts (scripts/, e.g. the content drafter's gpt-4o-mini default) are listed, not required:
 * outside production their calls are not counted, so they are not priced; on production an unpriced model is refused.
 * Every model-shaped string literal (gpt-*, text-embedding-*, o1/o3/o4-*) in the served code must be in the table,
 * except dated snapshot names, which are priced as their model.
 *
 * WHAT FAILURE THIS CATCHES: a new model named in the code (or a rebuilt corpus index on another embedding model) that
 * nobody priced, so every call to it is refused on the live site the day it ships.
 *
 * Run: npm run test:ai-models-priced
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { priceKey } from "../../src/lib/security/aiPrices";
import { TIER_DEFAULTS } from "../../src/lib/case-system/aiModels";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const root = path.resolve(__dirname, "..", "..");
const MODEL_LITERAL = /["'`]((?:gpt-[0-9][0-9a-z.\-]*)|(?:text-embedding-[0-9a-z\-]+)|(?:o[1-9](?:-[0-9a-z\-]+)?))["'`]/g;
const SKIP = new Set([path.join(root, "src", "lib", "security", "aiPrices.ts")]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

/** Block and line comments removed, keeping string contents (a URL's "//" inside quotes is kept). */
export function withoutComments(source: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += next ?? ""; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "/" && next === "*") { const end = source.indexOf("*/", i + 2); i = end < 0 ? source.length : end + 2; continue; }
    if (c === "/" && next === "/") { const end = source.indexOf("\n", i); i = end < 0 ? source.length : end; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    out += c;
    i += 1;
  }
  return out;
}

/** Model names used by the served code: literal -> files. */
export function modelsInCode(files: string[]): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of files) {
    if (SKIP.has(file)) continue;
    for (const match of withoutComments(readFileSync(file, "utf8")).matchAll(MODEL_LITERAL)) {
      const name = match[1];
      const where = path.relative(root, file);
      found.set(name, [...new Set([...(found.get(name) ?? []), where])]);
    }
  }
  return found;
}

const served = [...walk(path.join(root, "src")), ...walk(path.join(root, "app"))];
const inCode = modelsInCode(served);
for (const tier of Object.values(TIER_DEFAULTS)) inCode.set(tier.model, [...(inCode.get(tier.model) ?? []), "src/lib/case-system/aiModels.ts (TIER_DEFAULTS)"]);
const indexFile = path.join(root, "docs", "sources", "retrieval", "corpus-index.json");
if (existsSync(indexFile)) {
  const model = (JSON.parse(readFileSync(indexFile, "utf8")) as { model?: string }).model;
  if (model) inCode.set(model, [...(inCode.get(model) ?? []), "docs/sources/retrieval/corpus-index.json (the research step's embeddings)"]);
}

check("setup: the served code names at least the tier default and the corpus index's embedding model", inCode.size >= 2, JSON.stringify([...inCode.keys()]));
for (const [name, where] of [...inCode].sort()) check(`priced: ${name}  (${where.join(", ")})`, priceKey(name) !== null, `no row in src/lib/security/aiPrices.ts PRICE_TABLE`);

// The guard itself fires: a planted unpriced model name in served-shaped code is found and reported unpriced.
const planted = modelsInCode([]);
planted.set("gpt-9-never-priced", ["(planted)"]);
check("the guard fires on an unpriced model name (planted gpt-9-never-priced)", priceKey("gpt-9-never-priced") === null && planted.has("gpt-9-never-priced"));
check("a comment naming a model is not a use of it", !withoutComments('// uses "gpt-9-never-priced"\nconst a = 1; /* "gpt-9-x" */').includes("gpt-9"));

// Terminal scripts: listed for the owner, not required (not counted outside production; refused on production).
const scriptModels = modelsInCode(walk(path.join(root, "scripts")).filter((file) => !file.includes(`${path.sep}verification${path.sep}`)));
const unpricedScripts = [...scriptModels].filter(([name]) => priceKey(name) === null).map(([name, where]) => `${name} (${where.join(", ")})`);
console.log(`\nTerminal-script models with no price (not required; refused if ever counted on production): ${unpricedScripts.length ? unpricedScripts.join("; ") : "none"}`);

console.log(failures ? `\n${failures} check(s) failed.` : "\nEvery model the site can call has a price.");
process.exit(failures ? 1 : 0);
