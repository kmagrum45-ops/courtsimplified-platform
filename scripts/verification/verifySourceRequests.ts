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
import { keepSection } from "../rules/extractText";
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
  // The Charter is not under acts/ or regulations/: it is Part I of the
  // Constitution Act, 1982, published under eng/Const (2026-10-05).
  const charter = declarationFor({ title: "Canadian Charter of Rights and Freedoms", citation: "Part I of the Constitution Act, 1982", jurisdiction: "canada", justiceLawsPath: "Const" }, "Charter s. 24");
  check("the Charter resolves to the Constitution Acts on Justice Laws", "url" in charter && charter.url === "https://laws-lois.justice.gc.ca/eng/Const/FullText.html" && charter.mustContain?.includes("Canadian Charter of Rights and Freedoms"));
  // The Constitution Acts page holds the 1867 and 1982 Acts; kept whole, the
  // chunker filed Charter s. 8 as "s. 147" (2026-10-05).
  check("the Charter is kept apart from the 1867 Act", "section" in charter && charter.section?.from === "PART I Canadian Charter of Rights and Freedoms");
  const page = "CONSTITUTION ACT, 1867\n 8  The Queen\nPART I  Canadian Charter of Rights and Freedoms\n 8  Everyone has the right\nPART II Rights of the Aboriginal Peoples\n 35  The existing";
  const kept = keepSection(page, { from: "PART I Canadian Charter of Rights and Freedoms", to: "PART II Rights of the Aboriginal Peoples" });
  check("a section is kept from its start marker to its end marker", kept === "PART I  Canadian Charter of Rights and Freedoms\n 8  Everyone has the right");
  check("a missing marker fails the fetch, not keeps the whole page", keepSection(page, { from: "PART IX", to: "PART II" }) === null && keepSection(page, { from: "PART I Canadian", to: "PART XI" }) === null);
  const charterEntry = REQUESTED_SOURCES.find((source) => source.id === "canadian-charter-of-rights-and-freedoms");
  check("the vendored Charter declaration keeps only the Charter", Boolean(charterEntry?.section));
  const cyfsa = declarationFor({ title: "Child, Youth and Family Services Act, 2017", citation: "S.O. 2017, c. 14, Sched. 1", jurisdiction: "ontario", elawsCode: "17c14" }, "CYFSA");
  check("a comma inside a title does not end it", "url" in cyfsa && cyfsa.title === "Child, Youth and Family Services Act, 2017" && cyfsa.mustContain[0] === "CHILD, YOUTH AND FAMILY SERVICES ACT, 2017");
  const cited = declarationFor({ title: "Statutory Accident Benefits Schedule, O. Reg. 34/10", citation: "O. Reg. 34/10", jurisdiction: "ontario", elawsCode: "100034" }, "SABS");
  check("a citation after a comma is cut off the title", "url" in cited && cited.title === "Statutory Accident Benefits Schedule");
  check("a one-word title is refused", "unresolved" in declarationFor({ title: "Child", citation: "", jurisdiction: "ontario", elawsCode: "17c14" }, "x"));
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
  // An issue created with the label fires "opened" and "labeled"; listening
  // to both ran every request twice, and the second run flagged a law the
  // first had just added.
  const issueTypes = /issues:\s*\n(?:\s*#.*\n)*\s*types:\s*\[([^\]]*)\]/.exec(workflow)?.[1] ?? "";
  check("one request runs the workflow once", !/opened/.test(issueTypes) && /labeled/.test(issueTypes) && workflow.includes("github.event.label.name == 'source-request'"));
  // A burst of requests: GitHub keeps one pending run per concurrency group
  // and cancels older ones, so each run must sweep every open request.
  check("every run handles every open request", workflow.includes("labels=source-request") && workflow.includes("processSourceRequests.sh"));
  const processor = read("scripts/sources/processSourceRequests.sh");
  check("a request that does not verify leaves nothing declared", /else[\s\S]{0,300}drop_declaration "\$id"/.test(processor));
  // One law that did not verify left its failure in the manifest and kept
  // eight that did out of the library (2026-10-06).
  check("a request that does not verify leaves no failure in the manifest", /drop_declaration\(\)[\s\S]{0,800}manifest\.failures\s*=\s*manifest\.failures\.filter/.test(processor));
  check(
    "an e-Laws 403 is retried under the elaws_statutes_ name, and only a current consolidation is kept",
    /HTTP 403[\s\S]{0,200}try_prefixed/.test(processor) && /elaws_statutes_[\s\S]{0,200}TO THE E-LAWS CURRENCY DATE/.test(processor),
  );
  check("a request marked needs-human is not retried every run", workflow.includes('index("needs-human")'));
  check("Vercel never builds a request branch", read("vercel.json").includes('"source-request-*": false'));
  check("the analysis files the gaps", read("src/lib/case-system/intelligence/courtSimplifiedBrain.ts").includes("fileSourceRequests("));
  check("requested sources join the corpus", read("scripts/rules/corpusSources.ts").includes("...REQUESTED_SOURCES"));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
