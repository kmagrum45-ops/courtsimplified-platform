/**
 * The ten held-back finish-line cases stay held back
 * (tests/browser/walkthrough/heldBackPersonas.ts; master plan decision log,
 * 2026-10-08).
 *
 * WHAT IT CATCHES: a held-back case that duplicates a tuning case (same id or
 * the same story), one that is not written for a real court path, or any site
 * code that names a held-back case -- the sign that the site is being tuned to
 * pass the measurement rather than to handle cases in general.
 *
 * COSTS NOTHING: reads files.
 *
 * Run: npm run test:held-back-cases
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { HELD_BACK_PERSONAS } from "../../tests/browser/walkthrough/heldBackPersonas";
import { PERSONAS } from "../../tests/browser/walkthrough/personas";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

check("ten held-back cases", HELD_BACK_PERSONAS.length === 10, String(HELD_BACK_PERSONAS.length));
const tuningIds = new Set(PERSONAS.map((persona) => persona.id));
const tuningStories = new Set(PERSONAS.map((persona) => persona.story.slice(0, 60)));
check("no held-back id is a tuning id", HELD_BACK_PERSONAS.every((persona) => !tuningIds.has(persona.id)));
check("no held-back story repeats a tuning story", HELD_BACK_PERSONAS.every((persona) => !tuningStories.has(persona.story.slice(0, 60))));
check("ids are unique", new Set(HELD_BACK_PERSONAS.map((persona) => persona.id)).size === HELD_BACK_PERSONAS.length);
check("every case is for one of the three courts and says what a reader may rely on", HELD_BACK_PERSONAS.every((persona) => ["small-claims", "civil", "family"].includes(persona.path) && persona.expect.length > 0));
check("all three courts are covered", ["small-claims", "civil", "family"].every((court) => HELD_BACK_PERSONAS.some((persona) => persona.path === court)));

const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx|json)$/.test(name)) files.push(full);
  }
};
walk(path.join(ROOT, "src"));
walk(path.join(ROOT, "app"));
const named = files.filter((file) => {
  const text = readFileSync(file, "utf8");
  return HELD_BACK_PERSONAS.some((persona) => text.includes(persona.id));
});
check("no site code names a held-back case", named.length === 0, named.map((file) => path.relative(ROOT, file)).join(", "));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
