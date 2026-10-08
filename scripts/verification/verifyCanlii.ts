/**
 * Court decisions from CanLII: the rules CanLII's Terms of Use (2026) set for
 * this feature hold in code (docs/SOURCING_NOTES.md, "CanLII").
 *
 * WHAT THIS CATCHES, one section per promise in the 2026-10-07 brief:
 *   1. An uploaded decision shown anywhere without "Source: CanLII" (s. 4.2).
 *   2. An uploaded decision reaching the shared library, the corpus index, the
 *      research step, source requests, evals, fixtures, logs or another user's
 *      case (s. 5.1, and the preamble's privacy concern).
 *   3. Any code path that fetches canlii.org or canlii.ca content, or any API
 *      call other than the metadata endpoints (s. 5.1).
 *   4. The rate limit: one request at a time, two a second, a daily cap well
 *      under CanLII's 5,000, across instances through one lease.
 *   5. The site failing or waiting on CanLII when there is no key, or when
 *      CanLII is down or out of quota.
 *   6. AI help with an uploaded decision showing a quote that is not in the
 *      uploaded text, judging the person's case, or putting a name to an
 *      anonymised party (s. 4.3).
 *   7. The site nudging anyone to download decisions in bulk or for others.
 *
 * Each check asserts a property, not today's file list: a new screen that
 * shows decisions passes by rendering DecisionAttribution, a new URL fetcher
 * passes by calling refuseCanliiContent (or by being declared as fixed-host).
 *
 * COSTS NOTHING. No network, no database, no model: a fake fetch, a fake clock
 * and a fake lease drive the real CanLII client (src/lib/canlii/canliiCore.ts).
 *
 * Run: node --import tsx scripts/verification/verifyCanlii.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  caseRefFromCitation,
  canliiEnabled,
  createCanliiClient,
  createLimiter,
  DAILY_CAP,
  isAllowedApiPath,
  isCanliiContentUrl,
  MIN_GAP_MS,
  refuseCanliiContent,
  type CacheStore,
  type CanliiDeps,
  type LeaseResult,
} from "../../src/lib/canlii/canliiCore";
import {
  checkedDecisionHelp,
  COURT_DECISION_TYPE,
  DECISION_CAUTION,
  DECISION_SEARCH_HELP,
  decisionAttribution,
  namesNotInDecision,
  verifiedPassages,
} from "../../src/lib/case-workspace/courtDecision";
import { decisionUpdate } from "../../src/lib/case-workspace/courtDecisionStore";
import { DOCUMENT_TYPE_IDS } from "../../src/lib/case-workspace/documentTypes";
import { quoteAppearsIn } from "../../src/lib/case-system/intelligence/quoteMatch";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (relative: string): string => readFileSync(path.join(ROOT, relative), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function filesUnder(relative: string, extensions: RegExp): string[] {
  const start = path.join(ROOT, relative);
  if (!existsSync(start)) return [];
  if (statSync(start).isFile()) return extensions.test(start) ? [relative] : [];
  const out: string[] = [];
  for (const entry of readdirSync(start, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".next")) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(child, extensions));
    else if (extensions.test(entry.name)) out.push(child);
  }
  return out;
}

const CODE = /\.(ts|tsx|mts|js|mjs|cjs)$/;
const SITE_FILES = [...filesUnder("app", CODE), ...filesUnder("src", CODE), "middleware.ts"];

async function main() {
  // =========================================================================
  console.log("\n1. Attribution: an uploaded decision is never shown without \"Source: CanLII\"\n");
  // =========================================================================
  {
    const samples = [
      {},
      { caseName: "Smith v. Jones", citation: "2023 ONSC 1234" },
      { caseName: "", citation: "" },
      { caseName: "   ", citation: null },
      { caseName: "Source: somewhere else", citation: "x" },
      null,
      undefined,
    ];
    check(
      "decisionAttribution begins \"Source: CanLII\" whatever is filled in, or nothing",
      samples.every((details) => decisionAttribution(details).startsWith("Source: CanLII")),
    );
    const named = decisionAttribution({ caseName: "Smith v. Jones", citation: "2023 ONSC 1234" });
    check("it carries the case name and citation the person entered or confirmed", named.includes("Smith v. Jones") && named.includes("2023 ONSC 1234"), named);

    const panel = read("app/cases/_components/CourtDecisionPanel.tsx");
    const component = /export function DecisionAttribution\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(panel)?.[1] ?? "";
    check(
      "DecisionAttribution always renders decisionAttribution(), with no switch to hide it",
      component.includes("{decisionAttribution(details)}") && !/\?\s*null|&&|hidden|display:\s*none|sr-only/.test(component),
      component.trim().slice(0, 200),
    );

    // Every screen that shows decisions (the organisation route's `decisions`,
    // or a document of the court-decision type) renders the attribution.
    const showsDecisions = SITE_FILES.filter((file) => {
      if (!file.endsWith(".tsx")) return false;
      const source = read(file);
      return /\bdecisions\b[\s\S]{0,80}(?:\.map|\?\?)|\.decision\b|court-decision-panel/.test(source);
    });
    check("there are screens that show uploaded decisions", showsDecisions.length >= 3, showsDecisions.join(", "));
    for (const file of showsDecisions) {
      const source = read(file);
      check(
        `${file} renders DecisionAttribution wherever it shows a decision`,
        /<DecisionAttribution\b/.test(source) || /<CourtDecisionPanel\b/.test(source),
      );
    }
    const route = read("app/api/workspace/organisation/route.ts");
    check("the documents data gives every decision its attribution line", /attribution:\s*decisionAttribution\(/.test(route));
    check("the AI help answer is shown with the attribution", /decision-help-answer[\s\S]*<DecisionAttribution/.test(panel));
    check("CanLII's caution is shown with an uploaded decision", panel.includes("<DecisionCaution />") && DECISION_CAUTION.includes("overturned"));
  }

  // =========================================================================
  console.log("\n2. Isolation: an uploaded decision stays in its owner's case\n");
  // =========================================================================
  {
    // The shared library, the corpus index, the research step, source
    // requests, evals and fixtures, and the workflows that run them.
    const SHARED = [
      "src/lib/case-system/retrieval",
      "src/lib/case-system/intelligence",
      "src/lib/case-system/sources",
      "src/lib/case-system/knowledge",
      "src/lib/case-system/authority-intelligence",
      "src/lib/content-library",
      "app/api/assistant",
      "app/api/intake",
      "app/api/law",
      "scripts/retrieval",
      "scripts/rules",
      "scripts/eval",
      "scripts/content",
      "scripts/sources",
      "scripts/walkthrough",
      "scripts/verification/fixtures",
      ".github/workflows",
    ];
    const UPLOAD_MARKERS =
      /workspace_documents|workspace_document_text|case-evidence|DOCUMENT_BUCKET|courtDecision(?:Store)?\b|COURT_DECISION_TYPE|["']court-decision["']|decision_case_name|decision-help/;
    const sharedFiles = SHARED.flatMap((dir) => filesUnder(dir, /\.(ts|tsx|mjs|js|json|md|yml|yaml|sh|py)$/));
    // Comments may name these modules to explain a boundary; code may not reach them.
    const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const leaks = sharedFiles.filter((file) => UPLOAD_MARKERS.test(withoutComments(read(file))));
    check(
      `no shared library, index, research, source-request, eval, fixture or workflow file reads uploads (${sharedFiles.length} files)`,
      sharedFiles.length > 100 && leaks.length === 0,
      leaks.join(", "),
    );

    // Every query on the upload tables in the site is scoped to the caller.
    const queryFiles = SITE_FILES.filter((file) => /from\("workspace_document(?:s|_text)"\)/.test(read(file)));
    const unscoped: string[] = [];
    for (const file of queryFiles) {
      const source = read(file);
      for (const match of source.matchAll(/\.from\("workspace_document(?:s|_text)"\)([\s\S]*?)(?:;|\n\s*\n)/g)) {
        const chain = match[1];
        // An insert or upsert carries the owner in the row itself.
        if (/\.(?:insert|upsert)\([\s\S]*user_id:\s*user\.id/.test(chain)) continue;
        if (!/\.eq\("user_id",\s*(?:user\.id|userId|ownerId)\)/.test(chain)) {
          unscoped.push(`${file}: ${chain.replace(/\s+/g, " ").slice(0, 90)}`);
        }
      }
    }
    check(
      `every read or write of uploads in the site is scoped to the signed-in user (${queryFiles.length} files)`,
      queryFiles.length >= 5 && unscoped.length === 0,
      unscoped.join("\n      "),
    );

    const help = read("app/api/workspace/documents/decision-help/route.ts");
    check("AI help reads only the owner's decision, from the owner's case", /\.eq\("user_id", user\.id\)[\s\S]*COURT_DECISION_TYPE/.test(help) && /from\("cases"\)[\s\S]*?\.eq\("user_id", user\.id\)/.test(help));
    check("AI help never logs the decision or the person's words", !/console\.(log|error|warn|info)/.test(help));
    const model = read("src/lib/case-workspace/decisionHelp.ts");
    check("AI help runs inside the audit context that keeps only a hash of the text", /withAiCallContext\(\{ callType: "decision-help"/.test(model));
    check("the model call never logs the decision or the person's words", !/console\.(log|error|warn|info)/.test(model));
    const prose = /const PROSE_FIELDS = new Set\(\[([\s\S]*?)\]\)/.exec(read("src/lib/audit/aiCallLog.ts"))?.[1] ?? "";
    check(
      "the AI call log redacts the help's explanation, quotes and notes, however short",
      ["explanation", "quote", "why"].every((field) => prose.includes(`"${field}"`)),
    );
    const upload = read("app/builder/_components/EvidenceUploadCard.tsx");
    check(
      "a decision that cannot be marked as one is removed, not left behind as unattributed evidence",
      /if \(response\?\.ok\) return null;\s*const removed = await removeUpload\(documentId\);/.test(upload) && /method: "DELETE"/.test(upload),
    );

    const organisation = read("app/api/workspace/organisation/route.ts");
    check(
      "decisions are kept out of the person's timeline and exhibit numbering",
      /const documents = allDocuments\.filter\(\(row\) => row\.user_type !== COURT_DECISION_TYPE\)/.test(organisation) &&
        !/allDocuments\.map\(toNumberable\)|timelineDocuments[^=]*= allDocuments/.test(organisation),
    );
    const book = read("app/api/workspace/exhibit-book/route.ts");
    check(
      "decisions never go in the exhibit book or get exhibit numbers",
      (book.match(/user_type !== COURT_DECISION_TYPE/g) ?? []).length >= 2,
    );

    // Until the migration is applied, the main documents query must not ask
    // for the new columns, or the whole documents list breaks.
    const mainSelects = SITE_FILES.flatMap((file) => [...read(file).matchAll(/\b(?:DOCUMENT_COLUMNS|COLUMNS)\s*=\s*([\s\S]*?);/g)].map((m) => `${file}: ${m[1]}`));
    check(
      "no main documents select names the decision columns (they are read apart)",
      mainSelects.length > 0 && mainSelects.every((entry) => !/decision_/.test(entry)),
    );
    check("decision details are cleaned and bounded before they are saved", JSON.stringify(decisionUpdate({ decisionCaseName: "x".repeat(900), decisionDate: "not a date" })) === JSON.stringify({ decision_case_name: "x".repeat(300), decision_date: null }));
    check("court-decision is in the document catalogue", (DOCUMENT_TYPE_IDS as readonly string[]).includes(COURT_DECISION_TYPE));
  }

  // =========================================================================
  console.log("\n3. No code path fetches canlii.org content; the API is metadata only\n");
  // =========================================================================
  {
    const urls: Array<[string, boolean]> = [
      ["https://www.canlii.org/en/on/onca/doc/2014/2014onca925/2014onca925.html", true],
      ["http://canlii.ca/t/1vxsm", true],
      ["https://canlii.org/", true],
      ["https://WWW.CanLII.org/fr/", true],
      ["https://api.canlii.org/v1/caseBrowse/en/", false],
      ["https://www.ontario.ca/laws/statute/90c43", false],
      ["https://notcanlii.org.example.com/", false],
    ];
    check("isCanliiContentUrl tells content hosts from the API host", urls.every(([url, want]) => isCanliiContentUrl(url) === want));
    let threw = false;
    try {
      refuseCanliiContent("https://www.canlii.org/en/");
    } catch {
      threw = true;
    }
    check("refuseCanliiContent throws for CanLII content", threw);

    const allowed = ["caseBrowse/en/", "caseBrowse/en/onca/2014onca925/", "caseCitator/en/csc-scc/2008scc9/citingCases"];
    const refused = [
      "caseBrowse/en/onca/", // the per-court LIST of decisions: bulk, never allowed
      "caseBrowse/en/onca/?offset=0&resultCount=10000",
      "caseBrowse/fr/onca/2014onca925/",
      "caseCitator/en/onca/2014onca925/citedCases",
      "legislationBrowse/en/",
      "caseBrowse/en/../../en/on/onca/doc/",
      "https://www.canlii.org/en/",
    ];
    check("only the three metadata endpoints are allowed", allowed.every(isAllowedApiPath) && !refused.some(isAllowedApiPath));

    // The client itself: every request goes to the API host, on an allowed path.
    const requested: string[] = [];
    const client = fakeClient({
      key: "test-key",
      respond: (url) => {
        requested.push(url);
        if (url.includes("caseBrowse/en/?")) return { caseDatabases: [{ databaseId: "onca", jurisdiction: "on", name: "Court of Appeal for Ontario" }, { databaseId: "csc-scc", name: "Supreme Court of Canada" }] };
        if (url.includes("citingCases")) return { citingCases: [{ databaseId: "onca", caseId: { en: "2016onca1" }, title: "Later v. Case", citation: "2016 ONCA 1 (CanLII)" }] };
        return { databaseId: "onca", caseId: "2014onca925", url: "http://canlii.ca/t/gfn2b", title: "Ariston Realty Corp. v. Elcarim Inc.", citation: "2014 ONCA 925 (CanLII)", decisionDate: "2014-12-22" };
      },
    });
    const found = await client.api.lookupCase("Ariston Realty Corp. v. Elcarim Inc., 2014 ONCA 925, para 3");
    const citing = found ? await client.api.citingCases(found) : null;
    await client.api.apiGet("caseBrowse/en/onca/");
    check(
      "every request the client made was to https://api.canlii.org/v1/ on a metadata path",
      requested.length >= 3 && requested.every((url) => url.startsWith("https://api.canlii.org/v1/") && isAllowedApiPath(url.slice(26, url.indexOf("?")))),
      requested.join("\n      "),
    );
    check("a request for the bulk list was refused without a call", !requested.some((url) => /caseBrowse\/en\/onca\/\?/.test(url)));
    check("the case link is rewritten to https", found?.url === "https://canlii.ca/t/gfn2b", found?.url);
    check("the court's name comes from CanLII's list of databases", found?.court === "Court of Appeal for Ontario", String(found?.court));
    check("citing cases are counted", citing?.count === 1, JSON.stringify(citing));

    // Static: across the site, only canliiCore talks to the API host, and no
    // network call names a CanLII content host.
    const NETWORK = /\bfetch\(|axios|\bgot\(|https?\.(?:get|request)\(|XMLHttpRequest|new\s+WebSocket|undici|page\.goto/;
    const siteOffenders = SITE_FILES.filter((file) => {
      if (file === "src/lib/canlii/canliiCore.ts") return false;
      const source = read(file);
      if (/api\.canlii\.org|CANLII_API_ORIGIN/.test(source)) return true;
      return source.split("\n").some((line, index, lines) => NETWORK.test(line) && /canlii\.(org|ca)/i.test(lines.slice(index, index + 3).join(" ")));
    });
    check("no site code fetches CanLII; only canliiCore.ts names the API host", siteOffenders.length === 0, siteOffenders.join(", "));

    // Scripts and workflows: every file that makes network calls either refuses
    // CanLII before fetching a URL taken from data, or is declared as fetching
    // only fixed, non-CanLII hosts.
    const FIXED_HOST = new Map<string, string>([
      [".github/workflows/courtsimplified-change-watch.yml", "GitHub's API (opens an issue)"],
      [".github/workflows/courtsimplified-forms-probe.yml", "runs probeOfficialForms.ts, which refuses CanLII"],
      [".github/workflows/courtsimplified-walkthrough.yml", "the site under test"],
      ["scripts/ai/spendGuard.mjs", "OpenAI's Costs API (api.openai.com)"],
      ["scripts/diagnose-auth-email.mjs", "Supabase"],
      ["scripts/ensureStorageBuckets.mjs", "Supabase"],
      ["scripts/fix-smtp-and-verify.mjs", "Supabase"],
      ["scripts/forms/scanFormFields.ts", "Supabase storage"],
      ["scripts/forms/scanPdfInventory.ts", "Supabase storage"],
      ["scripts/keepAliveSupabase.mjs", "Supabase"],
      ["scripts/restoreCourtFormsStorage.mjs", "Supabase storage"],
      ["scripts/verification/applySecurityRemediation.ts", "Supabase"],
      ["scripts/verification/inspectSupabaseFormCatalogueReadonly.mjs", "Supabase"],
      ["scripts/verification/runMutationTests.ts", "the local site"],
      ["scripts/verification/runSecurityAudit.ts", "Supabase and the local site"],
      ["scripts/verification/verifyAssistantLaw.ts", "the local site"],
      ["scripts/verification/verifyGuidedAssistantContext.mjs", "the local site"],
      ["scripts/verification/verifyWorkspaceRls.ts", "Supabase"],
    ]);
    const SCRIPT_NETWORK = /\bfetch\(|\bcurl\b|\bwget\b|requests\.get|urlopen|page\.goto|https?\.get\(/;
    const scriptFiles = [...filesUnder("scripts", /\.(ts|mjs|js|sh|py)$/), ...filesUnder(".github/workflows", /\.ya?ml$/)].filter(
      (file) => file !== "scripts/verification/verifyCanlii.ts" && SCRIPT_NETWORK.test(read(file)),
    );
    const undeclared = scriptFiles.filter((file) => {
      const source = read(file);
      if (/refuseCanliiContent\(/.test(source)) return false;
      if (/\*canlii\*\) echo "REFUSED/.test(source)) return false;
      if (FIXED_HOST.has(file)) return /canlii\.(org|ca)/i.test(source) && !/api\.canlii\.org/.test(source);
      return true;
    });
    check(
      `every script or workflow that fetches refuses CanLII or is declared fixed-host (${scriptFiles.length} files)`,
      scriptFiles.length > 0 && undeclared.length === 0,
      `${undeclared.join(", ")} -- call refuseCanliiContent(url) before fetching, or declare it in FIXED_HOST with the host it fetches`,
    );
    const stale = [...FIXED_HOST.keys()].filter((file) => !scriptFiles.includes(file));
    check("every fixed-host declaration names a file that still fetches", stale.length === 0, stale.join(", "));
    check(
      "fetchDecisionPages.sh still refuses CanLII URLs",
      /\*canlii\*\) echo "REFUSED \(CanLII is never fetched\)/.test(read("scripts/sources/fetchDecisionPages.sh")),
    );
  }

  // =========================================================================
  console.log("\n4. The rate limit: one at a time, two a second, a daily cap\n");
  // =========================================================================
  {
    const clock = fakeClock();
    let held = false;
    const limiter = createLimiter({
      now: clock.now,
      sleep: clock.sleep,
      acquire: async () => (held ? "busy" : ((held = true), { token: "t" })),
      release: async () => {
        held = false;
      },
    });
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        limiter.run(async () => {
          await clock.sleep(120); // a request takes a while
          return index;
        }),
      ),
    );
    const { maxInFlight, starts, count } = limiter.stats();
    const gaps = starts.slice(1).map((start, index) => start - starts[index]);
    check("six calls at once all ran", results.every((value, index) => value === index) && count === 6, JSON.stringify(results));
    check("never more than one request at a time", maxInFlight === 1, `max in flight ${maxInFlight}`);
    check(`requests start at least ${MIN_GAP_MS} ms apart (at most 2 a second)`, gaps.every((gap) => gap >= MIN_GAP_MS), gaps.join(", "));
    const perSecond = Math.max(...starts.map((start) => starts.filter((other) => other >= start && other < start + 1000).length));
    check("no one-second window holds more than two starts", perSecond <= 2, `max ${perSecond}`);

    const capped = createLimiter({ now: clock.now, sleep: clock.sleep, acquire: async () => ({ token: "t" }), release: async () => undefined }, 3);
    const capRuns = [];
    for (let index = 0; index < 5; index += 1) capRuns.push(await capped.run(async () => "called"));
    check("the daily cap stops calls once reached", capRuns.filter((value) => value === "called").length === 3 && capRuns.slice(3).every((value) => value === null), JSON.stringify(capRuns));
    clock.advance(86_400_000);
    check("the count starts again the next day", (await capped.run(async () => "called")) === "called");
    check(`the daily cap (${DAILY_CAP}) stops well before CanLII's 5,000`, DAILY_CAP <= 4000);

    const unavailable = createLimiter({ now: clock.now, sleep: clock.sleep, acquire: async () => "unavailable", release: async () => undefined });
    const before = clock.now();
    const skipped = await unavailable.run(async () => "called");
    check("with the shared lease unreachable, the call is skipped at once", skipped === null && clock.now() - before <= MIN_GAP_MS);

    let busyTimes = 2;
    const contended = createLimiter({
      now: clock.now,
      sleep: clock.sleep,
      acquire: async (): Promise<LeaseResult> => (busyTimes-- > 0 ? "busy" : { token: "t" }),
      release: async () => undefined,
    });
    check("a call waits briefly while another server holds the lease", (await contended.run(async () => "called")) === "called");
    const neverFree = createLimiter({ now: clock.now, sleep: clock.sleep, acquire: async () => "busy", release: async () => undefined });
    const waitStart = clock.now();
    const gaveUp = await neverFree.run(async () => "called");
    check("and gives up rather than waiting without end", gaveUp === null && clock.now() - waitStart < 3000, `${clock.now() - waitStart} ms`);

    const sql = read("supabase/migrations/20261007090000_court_decisions_and_canlii.sql");
    const acquire = /FUNCTION "public"\."canlii_acquire"[\s\S]*?\$\$;/.exec(sql)?.[0] ?? "";
    check(
      "the shared lease admits one call at a time across servers, spaced, under the daily cap",
      /"lease_until" IS NULL OR "lease_until" < clock_timestamp\(\)/.test(acquire) &&
        /"last_call_at" <= clock_timestamp\(\) - make_interval\(secs => "min_gap_ms"/.test(acquire) &&
        /< "max_per_day"/.test(acquire) &&
        /RETURN token/.test(acquire),
    );
    check("a lease is released only by its holder", /WHERE "id" = 1 AND "lease_token" = "token"/.test(sql));
    const server = read("src/lib/canlii/canliiServer.ts");
    check("the server passes our cap and spacing to the shared lease", /max_per_day: DAILY_CAP, min_gap_ms: MIN_GAP_MS/.test(server));
    check("the lease and cache tables are server-only", /serverOnly = \[[^\]]*"canlii_cache"[^\]]*"canlii_api_state"/.test(read("scripts/verification/rls/rlsManifest.mjs")));

    // Repeat lookups are answered from the cache, not CanLII.
    const calls: string[] = [];
    const store = memoryStore();
    const first = fakeClient({ key: "k", store, respond: metadataResponder(calls) });
    await first.api.lookupCase("2014 ONCA 925");
    const afterFirst = calls.length;
    await first.api.lookupCase("2014 ONCA 925");
    const second = fakeClient({ key: "k", store, respond: metadataResponder(calls) }); // another server, same cache table
    await second.api.lookupCase("2014 ONCA 925");
    check("repeat lookups, even from another server, do not call CanLII again", afterFirst === 2 && calls.length === afterFirst, `${calls.length} calls`);
    const peekCalls = calls.length;
    const peek = { cacheOnly: true, missed: false };
    const fromCache = await first.api.caseSummary("2014 ONCA 925", peek);
    const unknownPeek = { cacheOnly: true, missed: false };
    await first.api.caseSummary("2015 ONCA 7", unknownPeek);
    check(
      "a cache-only lookup never calls CanLII, and says when the cache did not have the answer",
      calls.length === peekCalls && fromCache?.case.title === "Ariston Realty Corp. v. Elcarim Inc." && unknownPeek.missed,
      `${calls.length - peekCalls} calls; missed ${unknownPeek.missed}`,
    );
    const lookupRoute = read("app/api/canlii/case/route.ts");
    check(
      "a lookup that would reach CanLII counts against the person's own daily allowance first",
      /caseSummary\(citation, peek\)[\s\S]*if \(peek\.missed\) \{\s*if \(!\(await allowPersonLookup\(user\.id\)\)\)/.test(lookupRoute),
    );
    await first.api.lookupCase("2099 ONCA 1");
    const afterMiss = calls.length;
    await first.api.lookupCase("2099 ONCA 1");
    check("a citation CanLII does not have is remembered, not asked again", calls.length === afterMiss);
  }

  // =========================================================================
  console.log("\n5. Everything works with no key, and when CanLII is down or out of quota\n");
  // =========================================================================
  {
    check("no key means CanLII is off", !canliiEnabled({}) && !canliiEnabled({ CANLII_API_KEY: "  " }) && canliiEnabled({ CANLII_API_KEY: "k" }));
    let called = 0;
    const off = fakeClient({ key: "", respond: () => ((called += 1), {}) });
    const started = Date.now();
    const answers = await Promise.all([
      off.api.lookupCase("2014 ONCA 925"),
      off.api.caseMetadata({ databaseId: "onca", caseId: "2014onca925" }),
      off.api.citingCases({ databaseId: "onca", caseId: "2014onca925" }),
      off.api.apiGet("caseBrowse/en/"),
    ]);
    check("with no key, every lookup answers null at once and nothing is requested", answers.every((answer) => answer === null) && called === 0 && Date.now() - started < 50);

    for (const [label, respond] of [
      ["down (connection refused)", () => {
        throw new Error("ECONNREFUSED");
      }],
      ["out of quota (HTTP 429)", () => ({ __status: 429 })],
      ["failing (HTTP 500)", () => ({ __status: 500 })],
      ["answering an error body", () => ({ error: "QUOTA_EXCEEDED" })],
    ] as Array<[string, () => unknown]>) {
      const broken = fakeClient({ key: "k", respond });
      const answer = await broken.api.lookupCase("2014 ONCA 925").catch(() => "threw");
      check(`with CanLII ${label}, a lookup answers null and does not throw`, answer === null, String(answer));
    }

    const route = read("app/api/canlii/case/route.ts");
    check("the lookup route answers \"not enabled\" before doing anything else when there is no key", /export async function GET[^{]*\{\s*if \(!canliiEnabled\(\)\) return NextResponse\.json\(\{ enabled: false \}\);/.test(route));
    const info = read("app/_components/CanliiCaseInfo.tsx");
    check("the CanLII box renders nothing until it has an answer, and nothing when off", /if \(!answer\?\.enabled \|\| !answer\.case\) return null;/.test(info));
    check("the CanLII box loads after the page, never holding it up", /useEffect\(/.test(info) && /"use client"/.test(info));
    check("being cited is never presented as being upheld", /not the same as being followed or upheld/.test(info));
    check(
      "a person's decision is looked up from its saved citation, not on every keystroke",
      /<CanliiCaseInfo citation=\{details\.citation\}/.test(read("app/cases/_components/CourtDecisionPanel.tsx")),
    );
  }

  // =========================================================================
  console.log("\n6. AI help: quotes checked against the upload; no judging; no names\n");
  // =========================================================================
  {
    const decision =
      "REASONS FOR JUDGMENT. The tenant, J.K., paid the deposit on March 1. The landlord did not return the deposit within the time the Act requires. " +
      "I find that the deposit must be returned with interest. The claim is allowed in part. Deputy Judge Alvarez.";
    const good = checkedDecisionHelp(
      {
        explanation: "The court decided that the landlord had to give back the deposit with interest.",
        passages: [
          { quote: "the deposit must be returned with interest", why: "This part is about returning a deposit, which is also what your situation is about." },
          { quote: "the deposit must be repaid with interest", why: "Changed words." },
          { quote: "deposit", why: "Too short to prove anything." },
          { quote: "“The landlord did not return the deposit   within the time”", why: "Quote marks and spacing aside, these are the decision's words." },
        ],
      },
      decision,
    );
    check(
      "only quotes that appear word for word in the uploaded text are kept",
      good?.passages.length === 2 && good.passages.every((passage) => quoteAppearsIn(passage.quote, decision)),
      JSON.stringify(good?.passages.map((passage) => passage.quote)),
    );
    check("verifiedPassages applies the same check library quotes pass", verifiedPassages([{ quote: "within the time the Act requires", why: "" }], decision).length === 1);
    const grounded = read("src/lib/case-system/intelligence/groundedCognition.ts");
    check("library quotes and decision quotes use the one shared check (quoteMatch.ts)", /quoteAppearsIn\(quote, source\.text\)/.test(grounded) && /from "\.\/quoteMatch"/.test(grounded));

    const judging = [
      "Based on this decision, you will likely win your claim.",
      "Your case is strong because the facts match.",
      "Your chances are good.",
    ];
    check("help that predicts or grades the person's case is refused", judging.every((explanation) => checkedDecisionHelp({ explanation, passages: [] }, decision) === null));
    check(
      "a passage note that grades their case is dropped",
      checkedDecisionHelp({ explanation: "The court ordered the deposit returned.", passages: [{ quote: "the deposit must be returned with interest", why: "This strengthens your case." }] }, decision)?.passages.length === 0,
    );
    check(
      "help that names an anonymised party is refused",
      checkedDecisionHelp({ explanation: "The tenant, Jane Kowalski, paid the deposit.", passages: [] }, decision) === null &&
        checkedDecisionHelp({ explanation: "The tenant, known as Ms. Kowalski, paid.", passages: [] }, decision) === null,
    );
    check(
      "a quotation inside the explanation must be in the decision too",
      checkedDecisionHelp({ explanation: "The judge said \"the landlord acted in bad faith throughout\".", passages: [] }, decision) === null &&
        checkedDecisionHelp({ explanation: "The judge said \"the deposit must be returned with interest\".", passages: [] }, decision) !== null,
    );
    check(
      "a full name is caught even when one of its words appears in the decision",
      namesNotInDecision("The tenant was Jane Kowalski.", `${decision} Jane signed the lease.`).length === 1,
    );
    check("the decision's own names and ordinary words pass", namesNotInDecision("Deputy Judge Alvarez found that the tenant, J.K., paid the deposit on March 1.", decision).length === 0);
    const prompt = read("app/api/workspace/documents/decision-help/route.ts");
    check("AI help runs only on the person's click and only behind the document-analysis (ZDR) switch", /if \(!documentAnalysisEnabled\(\)\) return NextResponse\.json\(\{ enabled: false \}\);/.test(prompt) && /export async function POST/.test(prompt) && !/export async function GET/.test(prompt));
    const model = read("src/lib/case-workspace/decisionHelp.ts");
    check(
      "every model answer passes checkedDecisionHelp before it is returned",
      /const checked = checkedDecisionHelp\(raw, input\.decisionText\);[\s\S]*return checked;/.test(model) &&
        /const help = await askDecisionHelp\(/.test(prompt) &&
        (model.match(/chat\.completions\.create\(/g) ?? []).length === 1,
    );
  }

  // =========================================================================
  console.log("\n7. Never a nudge to download in bulk or for someone else\n");
  // =========================================================================
  {
    const BULK = /\b(bulk|all (?:the |of the )?decisions|every decision|as many|batch|for (?:a |your )?(?:friend|client|someone|others|other people)|on behalf of|download (?:them|decisions) all)\b/i;
    const texts = [DECISION_SEARCH_HELP, DECISION_CAUTION];
    check("the search help and caution invite nothing in bulk or for others", texts.every((text) => !BULK.test(text)) && /Download only the decisions you want to read for your own case/.test(DECISION_SEARCH_HELP));
    const upload = read("app/builder/_components/EvidenceUploadCard.tsx");
    const decisionInput = /ref=\{decisionInput\}[\s\S]*?\/>/.exec(upload)?.[0] ?? "";
    check("a decision is added one file at a time", decisionInput.length > 0 && !/\bmultiple\b/.test(decisionInput));
    const uiText = [upload, read("app/cases/_components/CourtDecisionPanel.tsx")].join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
    check("no screen text invites downloading in bulk or for others", !BULK.test(uiText.replace(/className="[^"]*"/g, "")));
    check("caseRefFromCitation reads the documented examples", JSON.stringify([caseRefFromCitation("2008 SCC 9"), caseRefFromCitation("2014 ONCA 925"), caseRefFromCitation("1999 CanLII 1527 (ON CA)"), caseRefFromCitation("[1999] 1 S.C.R. 201")]) === JSON.stringify([{ databaseId: "csc-scc", caseId: "2008scc9" }, { databaseId: "onca", caseId: "2014onca925" }, { databaseId: "onca", caseId: "1999canlii1527" }, null]));
  }

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

// ---- fakes ---------------------------------------------------------------------

function fakeClock() {
  let time = Date.UTC(2026, 9, 7, 12);
  const sleepers: Array<{ at: number; resolve: () => void }> = [];
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
    /** Resolves after `ms` of fake time; fake time moves forward on its own. */
    sleep: (ms: number) =>
      new Promise<void>((resolve) => {
        const at = time + Math.max(0, ms);
        sleepers.push({ at, resolve });
        sleepers.sort((a, b) => a.at - b.at);
        queueMicrotask(function wake() {
          const next = sleepers.shift();
          if (!next) return;
          time = Math.max(time, next.at);
          next.resolve();
        });
      }),
  };
}

function memoryStore(): CacheStore {
  const rows = new Map<string, { payload: unknown; fetchedAt: number }>();
  return {
    get: async (key) => rows.get(key) ?? null,
    set: async (key, payload) => {
      rows.set(key, { payload: JSON.parse(JSON.stringify(payload)), fetchedAt: Date.now() });
    },
  };
}

function metadataResponder(calls: string[]) {
  return (url: string) => {
    calls.push(url);
    if (url.includes("caseBrowse/en/?")) return { caseDatabases: [{ databaseId: "onca", name: "Court of Appeal for Ontario" }] };
    if (url.includes("2099onca1")) return { __status: 404 };
    return { title: "Ariston Realty Corp. v. Elcarim Inc.", citation: "2014 ONCA 925 (CanLII)", url: "http://canlii.ca/t/gfn2b", decisionDate: "2014-12-22" };
  };
}

function fakeClient({ key, respond, store = null }: { key: string; respond: (url: string) => unknown; store?: CacheStore | null }) {
  const limiter = createLimiter({
    now: () => Date.now(),
    sleep: async () => undefined,
    acquire: async () => ({ token: "t" }),
    release: async () => undefined,
  });
  const fetchFake: CanliiDeps["fetch"] = async (url) => {
    const body = respond(url) as { __status?: number } | undefined;
    const status = body?.__status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify(body ?? {}),
    };
  };
  const api = createCanliiClient({
    env: { CANLII_API_KEY: key },
    fetch: fetchFake,
    limiter,
    store,
    now: () => Date.now(),
    log: () => undefined,
  });
  return { api };
}

void main();
