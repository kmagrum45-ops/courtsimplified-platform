/**
 * Source requests: a law the research step says the library lacks becomes an
 * issue, and the workflow turns the issue into a verified, indexed source.
 *
 * WHAT IT CATCHES:
 *   - A resolution pointing anywhere but the two official hosts
 *     (ontario.ca/laws/docs, laws-lois.justice.gc.ca), or with a malformed
 *     e-Laws code or Justice Laws path.
 *   - A declaration that does not demand its own title and, for e-Laws, the
 *     current-consolidation line in the fetched text (so a wrong guess would
 *     be vendored instead of failing).
 *   - Filing without the token, filing anything about the person (only the
 *     law's name and court path may leave), filing a law already requested,
 *     or more than three a call.
 *   - A filing failure reaching the analysis.
 *   - The workflow merging without the fetch verifying, or without the corpus
 *     suites passing; a request branch Vercel would build.
 *
 * COSTS NOTHING: GitHub's API is a stub; the resolver's model call is not run.
 *
 * Run: npm run test:source-requests
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { declarationFor, idFromTitle } from "../sources/resolveSourceRequest";
import { fileSourceRequests, requestTitle } from "../../src/lib/case-system/retrieval/sourceRequests";
import { REQUESTED_SOURCES } from "../rules/requestedSources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

async function main() {
  console.log("\n1. Resolving a name to an official source");
  check("ids are kebab case", idFromTitle("Statutory Accident Benefits Schedule — Effective September 1, 2010") === "statutory-accident-benefits-schedule-effective-september-1-2");
  const sabs = declarationFor({ title: "Statutory Accident Benefits Schedule - Effective September 1, 2010", citation: "O. Reg. 34/10", jurisdiction: "ontario", elawsCode: "100034" }, "SABS");
  check("the marker is the short title, so a dash printed differently cannot fail a right document", "mustContain" in sabs && sabs.mustContain[0] === "STATUTORY ACCIDENT BENEFITS SCHEDULE" && sabs.id === "statutory-accident-benefits-schedule");
  check("an id never ends on a hyphen", !idFromTitle("A".repeat(59) + " B").endsWith("-"));
  const hta = declarationFor({ title: "Highway Traffic Act", citation: "R.S.O. 1990, c. H.8", jurisdiction: "ontario", elawsCode: "90h08" }, "Highway Traffic Act, s. 193");
  check("an Ontario statute resolves to its e-Laws .doc", "url" in hta && hta.url === "https://www.ontario.ca/laws/docs/90h08_e.doc");
  check("an Ontario regulation code resolves too", "url" in declarationFor({ title: "Statutory Accident Benefits Schedule", citation: "O. Reg. 34/10", jurisdiction: "ontario", elawsCode: "100034" }, "SABS"));
  check(
    "the fetch must find the title and the current consolidation",
    "mustContain" in hta && hta.mustContain.includes("HIGHWAY TRAFFIC ACT") && hta.mustContain.includes("CONSOLIDATION PERIOD"),
  );
  const cc = declarationFor({ title: "Criminal Code", citation: "R.S.C. 1985, c. C-46", jurisdiction: "canada", justiceLawsPath: "acts/C-46" }, "Criminal Code s. 810");
  check("a federal Act resolves to Justice Laws", "url" in cc && cc.url === "https://laws-lois.justice.gc.ca/eng/acts/C-46/FullText.html" && cc.mustContain.includes("Criminal Code"));
  check("a malformed code is refused", "unresolved" in declarationFor({ title: "Highway Traffic Act", citation: "", jurisdiction: "ontario", elawsCode: "../../evil" }, "x"));
  check("a path off Justice Laws is refused", "unresolved" in declarationFor({ title: "Criminal Code", citation: "", jurisdiction: "canada", justiceLawsPath: "https://example.com/x" }, "x"));
  check("no code, no declaration", "unresolved" in declarationFor({ title: "Some Act", citation: "", jurisdiction: "ontario" }, "x"));
  check("every requested source on record is on an official host", REQUESTED_SOURCES.every((source) => /^https:\/\/(www\.ontario\.ca\/laws\/docs\/|laws-lois\.justice\.gc\.ca\/eng\/)/.test(source.url)));

  console.log("\n2. Filing");
  const calls: { url: string; body?: string }[] = [];
  const stubFetch = (existingTitles: string[], ok = true) =>
    (async (url: string, init?: { method?: string; body?: string }) => {
      calls.push({ url, body: init?.body });
      if (!init?.method) return { ok: true, json: async () => existingTitles.map((title) => ({ title })) } as Response;
      return { ok } as Response;
    }) as unknown as typeof fetch;

  const none = await fileSourceRequests(["Highway Traffic Act"], { courtPath: "small-claims" }, { env: {}, fetch: stubFetch([]) });
  check("without the token nothing is filed", none.filed.length === 0 && calls.length === 0);

  calls.length = 0;
  const env = { GITHUB_SOURCE_REQUEST_TOKEN: "stub-token" };
  const result = await fileSourceRequests(
    ["Statutory Accident Benefits Schedule, O. Reg. 34/10", "Criminal Code, ss. 264 and 810", "Highway Traffic Act", "Fourth Act", "Fifth Act"],
    { courtPath: "small-claims" },
    { env, fetch: stubFetch([requestTitle("Highway Traffic Act")]) },
  );
  check("a law already requested is not filed again", result.skipped.includes("Highway Traffic Act") && !result.filed.includes("Highway Traffic Act"));
  check("at most three a call", calls.filter((call) => call.body).length <= 3 && result.filed.length + result.skipped.length === 3);
  const posted = calls.filter((call) => call.body).map((call) => JSON.parse(call.body!) as { title: string; body: string; labels: string[] });
  check("issues carry the source-request label", posted.every((issue) => issue.labels.join() === "source-request"));
  check("only the law's name and the court path are sent", posted.every((issue) => !/dislocat|bus hit|my |I was/i.test(issue.body)));
  const again = await fileSourceRequests(["Statutory Accident Benefits Schedule, O. Reg. 34/10"], { courtPath: "small-claims" }, { env, fetch: stubFetch([]) });
  check("the same law is not filed twice from one server", again.filed.length === 0);
  const broken = await fileSourceRequests(["Some Act"], { courtPath: "family" }, {
    env,
    fetch: (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch,
  });
  check("a failure is swallowed", broken.filed.length === 0);

  console.log("\n3. The workflow and wiring");
  const workflow = read(".github/workflows/courtsimplified-source-requests.yml");
  check("it merges only after the fetch verified", /Index and check[\s\S]*if: steps\.fetch\.outputs\.verified == 'yes'/.test(workflow));
  check("it merges only after the corpus suites pass", /test:rules-corpus[\s\S]*test:corpus-retrieval[\s\S]*Merge[\s\S]*if: steps\.index\.outcome == 'success'/.test(workflow));
  check("Vercel never builds a request branch", read("vercel.json").includes('"source-request-*": false'));
  check("the analysis files the gaps", read("src/lib/case-system/intelligence/courtSimplifiedBrain.ts").includes("fileSourceRequests("));
  check("requested sources join the corpus", read("scripts/rules/corpusSources.ts").includes("...REQUESTED_SOURCES"));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
