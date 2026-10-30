/**
 * THE ADDRESS WINS: a page that reads its case or court from the address opens
 * the case the address names (npm run test:address-wins).
 *
 * The site owner's Chrome check (30 Oct): signed in, with an earlier Small Claims
 * case opened in the tab, they started a Family case from My cases and pressed
 * "Continue with Family". The builder opened the EARLIER Small Claims case: the
 * address bar itself said path=small-claims&intake=<the earlier id>.
 *
 * The cause is in Next.js's client router, not in our storage. A page Next
 * prerenders at build time (the builder, the home page) is cached in the browser
 * under its path alone, with the search it was rendered with ("" for a
 * prerendered page) and the full address of the first visit. The next client-side
 * visit to the same path with different search params finds no exact entry,
 * borrows that one (`deprecated_requestOptimisticRouteCacheEntry`), reads the
 * stored address's search as "the server redirected here" and goes THERE. So
 * router.push("/builder?path=family&intake=B") landed on the earlier
 * "/builder?path=small-claims&intake=A" (login's router.push, step 2 of the
 * owner's check). It never happens under `next dev`, which renders every request,
 * nor on a full page load, which is why no browser test on a dev server saw it.
 *
 * The rule, one place per page: a page that reads path, caseId or intake from its
 * address is rendered per request (`export const dynamic = "force-dynamic"` in
 * its page or an enclosing layout), so its search is part of its cache key and
 * the address asked for is the one opened.
 *
 * Two checks:
 *   1. Next's own router code, run here: for a page rendered per request, a later
 *      visit with another case opens that case, never the earlier one. (For a
 *      prerendered page the earlier address is reported as it is today; the check
 *      does not fail if a Next upgrade fixes it.)
 *   2. Every page whose code (its import closure in app/) reads path, caseId or
 *      intake from useSearchParams is rendered per request. Found from the code,
 *      not a list: a new screen that reads the case from the address is covered.
 *
 * Fails when: a page that opens a case from its address is prerendered again
 * (the export removed, a new such page added without it), or Next's router
 * starts reusing another address for a page rendered per request.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, "app");
let failures = 0;
const fail = (message: string) => { failures += 1; console.error(`FAIL ${message}`); };
const pass = (message: string) => console.log(`ok   ${message}`);

// ---------- 1. Next's own router cache ----------
const FIRST = "/builder?path=small-claims&intake=ddd73d55-0000-4000-8000-000000000000";
const SECOND = "/builder?path=family&intake=7707b6f0-0000-4000-8000-000000000000";
const PROBE = `
const path = require("path");
const Module = require("module");
const root = process.argv[1];
const mode = process.argv[2];
globalThis.window = globalThis;
globalThis.location = new URL("https://site.test/dashboard");
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.document = { documentElement: { dataset: {} }, querySelector: () => null, getElementById: () => null };
globalThis.__webpack_require__ = Object.assign(() => ({}), { u: () => "" });
globalThis.__webpack_chunk_load__ = async () => {};
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("react-server-dom-webpack/")) request = "next/dist/compiled/" + request;
  return resolve.call(this, request, ...rest);
};
const dir = path.join(root, "node_modules/next/dist/client/components/segment-cache");
const cache = require(path.join(dir, "cache.js"));
const { createCacheKey } = require(path.join(dir, "cache-key.js"));
const first = ${JSON.stringify(FIRST)};
// What the server says the page was rendered with: "" when prerendered, the request's own search when rendered per request.
const rendered = mode === "prerendered" ? "" : new URL(first, "https://site.test").search.slice(1);
const meta = { id: null, value: "__HEAD__", parent: { id: "?", value: rendered, parent: { id: null, value: null, parent: null } } };
const tree = { requestKey: "__PAGE__", segment: "__PAGE__", refreshState: null, varyPath: meta, isPage: true, slots: null, prefetchHints: 0 };
// The first client visit: Next learns the route and stores it with the address it opened.
cache.writeRouteIntoCache(Date.now(), "/builder", null, tree, meta, false, first, false);
// The second: the address the person asked for, as navigateImpl looks it up.
const want = new URL(${JSON.stringify(SECOND)}, "https://site.test");
const exact = cache.readRouteCacheEntry(Date.now(), createCacheKey(want.href, null));
const route = exact && exact.status === 2 ? exact : cache.deprecated_requestOptimisticRouteCacheEntry(Date.now(), want, null);
process.stdout.write(route ? route.canonicalUrl : want.pathname + want.search);
`;
function opened(mode: "prerendered" | "per-request"): string {
  return execFileSync(process.execPath, ["-e", PROBE, ROOT, mode], { encoding: "utf8" }).trim();
}
try {
  const perRequest = opened("per-request");
  if (perRequest === SECOND) pass("Next's router: a page rendered per request opens the address asked for");
  else fail(`Next's router: a page rendered per request opened ${perRequest}, not ${SECOND}`);
  const prerendered = opened("prerendered");
  console.log(`info a prerendered page asked for ${SECOND} opens ${prerendered}${prerendered === SECOND ? " (Next no longer reuses the earlier address)" : " (the earlier case: why such pages must be rendered per request)"}`);
} catch (error) {
  fail(`Next's router code could not be run here (${error instanceof Error ? error.message.split("\n")[0] : String(error)}); check node_modules/next/dist/client/components/segment-cache`);
}

// ---------- 2. Every page that opens a case from its address is rendered per request ----------
// A direct read, or the shared resolver (src/lib/case-system/openCase.ts, test:open-case).
const CASE_PARAM = /(?:searchParams|params)\.get\(\s*["'](?:path|caseId|intake)["']\s*\)|openCaseFromAddress\(/;
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "api" && entry.name !== "node_modules") walk(full, out); }
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}
function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (candidate.startsWith(APP) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}
/** Files in app/ this page renders that read path, caseId or intake from the address. */
function readersIn(page: string): string[] {
  const seen = new Set<string>();
  const stack = [page];
  const readers: string[] = [];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = fs.readFileSync(file, "utf8");
    if (/useSearchParams/.test(text) && CASE_PARAM.test(text)) readers.push(path.relative(ROOT, file).split(path.sep).join("/"));
    for (const match of text.matchAll(/(?:import|export)[^"']*?from\s*["']([^"']+)["']/g)) {
      const next = resolveImport(file, match[1]);
      if (next) stack.push(next);
    }
  }
  return readers;
}
const FORCE_DYNAMIC = /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/;
/** Rendered per request: a dynamic segment in its path, or force-dynamic in the page or a layout above it. */
function perRequest(page: string): boolean {
  if (/\[[^\]]+\]/.test(path.relative(APP, page))) return true;
  if (FORCE_DYNAMIC.test(fs.readFileSync(page, "utf8"))) return true;
  for (let dir = path.dirname(page); dir.startsWith(APP); dir = path.dirname(dir)) {
    for (const name of ["layout.tsx", "layout.ts"]) {
      const layout = path.join(dir, name);
      if (fs.existsSync(layout) && FORCE_DYNAMIC.test(fs.readFileSync(layout, "utf8"))) return true;
    }
    if (dir === APP) break;
  }
  return false;
}
const pages = walk(APP).filter((file) => /[\\/]page\.tsx?$/.test(file));
let opening = 0;
for (const page of pages) {
  const readers = readersIn(page);
  if (!readers.length) continue;
  opening += 1;
  const route = "/" + path.relative(APP, path.dirname(page)).split(path.sep).join("/");
  if (perRequest(page)) pass(`${route === "/." ? "/" : route} reads the case from its address (${readers.join(", ")}) and is rendered per request`);
  else fail(`${route === "/." ? "/" : route} reads the case from its address (${readers.join(", ")}) but is prerendered: a client-side visit can open an earlier visit's case. Add export const dynamic = "force-dynamic" to the page or its layout.`);
}
// The search itself must work: the builder, at least, is found by it.
if (!pages.some((page) => page.endsWith(path.join("builder", "page.tsx")) && readersIn(page).length)) fail("the builder page was not found reading its case from the address: the search in this suite is broken");
else pass(`${opening} pages read a case or court from their address`);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("\nAll address-wins checks passed.");
