/**
 * The deployed analysis routes carry the retrieval index and the corpus.
 *
 * WHAT IT CATCHES. Retrieval reads its index and the vendored corpus from disk
 * by file names the bundler cannot see, so next.config.ts lists them in
 * outputFileTracingIncludes. If that stops working -- a renamed route, a
 * changed config key, a Next.js upgrade that reads it differently -- the
 * deployed function has no index, retrieval quietly adds nothing, and every
 * other check stays green. This reads the build's own trace files, so it
 * checks what ships, not what the config says.
 *
 * Runs after `npm run build` (CI does both). Without a build it says so and
 * fails, because a check that cannot look must not pass.
 *
 * Run: npm run test:retrieval-bundled
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
// Every route that reads the passage index at run time. A route missing
// here AND from next.config's outputFileTracingIncludes gets no index on
// Vercel and silently does nothing (/api/intake/sourced-questions, caught
// before release 2026-10-05).
const ROUTES = ["small-claims/analyze", "civil/analyze", "family/analyze", "law/explain", "intake/sourced-questions", "assistant/law"];
const MUST_SHIP = [
  "docs/sources/retrieval/corpus-index.json",
  "docs/sources/retrieval/corpus-vectors.bin",
  "docs/sources/corpus/residential-tenancies-act-2006.txt",
];

let failures = 0;
for (const route of ROUTES) {
  const trace = path.join(ROOT, ".next", "server", "app", "api", ...route.split("/"), "route.js.nft.json");
  if (!existsSync(trace)) {
    failures += 1;
    console.log(`FAIL  /api/${route}: no trace file at ${path.relative(ROOT, trace)} (run npm run build first)`);
    continue;
  }
  const files = (JSON.parse(readFileSync(trace, "utf8")) as { files: string[] }).files.map((file) =>
    path.relative(ROOT, path.resolve(path.dirname(trace), file)).split(path.sep).join("/"),
  );
  const missing = MUST_SHIP.filter((file) => !files.includes(file));
  if (missing.length) {
    failures += 1;
    console.log(`FAIL  /api/${route} does not ship: ${missing.join(", ")}`);
  } else {
    console.log(`pass  /api/${route} ships the index and the corpus`);
  }
}
console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
