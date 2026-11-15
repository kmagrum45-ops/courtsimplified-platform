/**
 * NO PAGE STARTS WORK WITHOUT GOING THROUGH THE "BEFORE YOU START" NOTICE (site owner, 15 Nov 2026).
 *
 * "A terminal check with a declared list of every place that sends a work request (analysis, AI, next step, story
 * reading, court suggestion); it fails if a request is not on the list or does not go through the notice gate."
 *
 * What it checks, reading the source (no build, no browser):
 *   1. Every browser fetch of a work route (WORK_ROUTE, scripts/verification/noticeGateList.ts) is declared in
 *      WORK_SENDERS, file and route, and every declared one still exists (the list is the code's list, both ways).
 *   2. A fetch whose address is not written out (a variable, a template) is declared in BUILT_ADDRESSES with what it
 *      calls, so a work request cannot hide behind a variable.
 *   3. Every API route that calls a model (its import closure reaches the OpenAI client) is a work route.
 *   4. Every page (app/** /page.tsx) whose import closure reaches a work sender either goes through the notice
 *      (NOTICE_PAGES: each gate checked in its source below) or is declared in PAGES_WITHOUT_NOTICE with why. A page that
 *      newly reaches a work sender fails until it is one or the other, and a declared page that no longer reaches one
 *      fails too, so the list stays the code's list.
 *   5. The gates themselves: the builder page returns only the notice until it is accepted, and nothing drawn outside
 *      that return (the intake wrapper and its review panel) sends a work request; the review panel holds both of its
 *      starts for the notice; the home page's Continue and its answers go through the notice before they send.
 *
 * What failure it catches: a new screen, component or route that sends the story to the AI, or starts analysis, before
 * the person has accepted the notice.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { importClosure } from "../ai/importClosureHash.mjs";
import { NOT_GATED, PAGES_WITHOUT_NOTICE, WORK_ROUTE, WORK_SENDERS, BUILT_ADDRESSES } from "./noticeGateList";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const rel = (file: string) => path.relative(ROOT, file).replace(/\\/g, "/");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

function files(dir: string, keep: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const full = path.join(ROOT, dir, entry.name);
    if (entry.isDirectory()) { if (!["node_modules", ".next"].includes(entry.name)) out.push(...files(rel(full), keep)); }
    else if (keep(full)) out.push(full);
  }
  return out;
}
const browserCode = [...files("app", (f) => /\.(ts|tsx)$/.test(f) && !/[\\/]app[\\/]api[\\/]/.test(f)), ...files("src", (f) => /\.(ts|tsx)$/.test(f))];

// ---- 1. Every work request is declared -------------------------------------------------------------------------
const found = new Set<string>();
const builtFound = new Set<string>();
for (const file of browserCode) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bfetch\(\s*([`"'])(\/api\/[A-Za-z0-9/_\-]+)/g)) if (WORK_ROUTE.test(match[2])) found.add(`${rel(file)} ${match[2]}`);
  for (const match of text.matchAll(/\bfetch\(\s*([^`"'\s)][^,)]*)/g)) builtFound.add(`${rel(file)} ${match[1].trim().slice(0, 40)}`);
}
const declared = new Set(WORK_SENDERS.map((sender) => `${sender.file} ${sender.route}`));
check("every browser request to a work route is declared in WORK_SENDERS", [...found].every((key) => declared.has(key)), [...found].filter((key) => !declared.has(key)).join("; "));
check("every declared work request still exists", [...declared].every((key) => found.has(key)), [...declared].filter((key) => !found.has(key)).join("; "));
check("every declared route is a work route", WORK_SENDERS.every((sender) => WORK_ROUTE.test(sender.route)));

// ---- 2. Built addresses ------------------------------------------------------------------------------------------
const builtDeclared = new Set(Object.keys(BUILT_ADDRESSES));
const builtFiles = new Set([...builtFound].map((key) => key.split(" ")[0]));
check("every fetch whose address is built in code is declared, with what it calls (BUILT_ADDRESSES)", [...builtFiles].every((file) => builtDeclared.has(file)), [...builtFiles].filter((file) => !builtDeclared.has(file)).join("; "));
check("no declared built address is a work route", Object.values(BUILT_ADDRESSES).every((calls) => !calls.routes.some((route) => WORK_ROUTE.test(route))));

// ---- 3. Every API route that calls a model is a work route --------------------------------------------------------
const modelClient = path.join(ROOT, "src", "lib", "case-system", "openaiClient.ts");
const apiRoutes = files("app/api", (f) => /[\\/]route\.ts$/.test(f));
const modelRoutes = apiRoutes.filter((route) => importClosure([rel(route)]).some((file: string) => path.resolve(file) === modelClient)).map((route) => `/${rel(path.dirname(route)).replace(/^app\//, "")}`);
const serverOnly = modelRoutes.filter((route) => !WORK_ROUTE.test(route));
const browserCalled = new Set([...found].map((key) => key.split(" ")[1]));
for (const file of browserCode) for (const match of readFileSync(file, "utf8").matchAll(/["'`](\/api\/[A-Za-z0-9/_\-]+)/g)) browserCalled.add(match[1]);
const calledNotListed = serverOnly.filter((route) => browserCalled.has(route));
check(`every API route the browser calls that reaches the model is a work route (${modelRoutes.length} reach it)`, calledNotListed.length === 0, calledNotListed.join(", "));

// ---- 4. Every page that reaches a work sender goes through the notice, or is declared without it ------------------
const senderFiles = new Set(WORK_SENDERS.map((sender) => path.join(ROOT, sender.file)));
const pages = files("app", (f) => /[\\/]page\.tsx$/.test(f));
const reaching = pages.filter((page) => importClosure([rel(page)]).some((file: string) => senderFiles.has(path.resolve(file)))).map(rel);
const NOTICE_PAGES = ["app/page.tsx", "app/builder/page.tsx"];
const undeclared = reaching.filter((page) => !NOTICE_PAGES.includes(page) && !(page in PAGES_WITHOUT_NOTICE));
check("every page that can send a work request goes through the notice or is declared without it", undeclared.length === 0, undeclared.join(", "));
const stale = Object.keys(PAGES_WITHOUT_NOTICE).filter((page) => !reaching.includes(page));
check("every page declared without the notice still sends a work request (the list stays the code's list)", stale.length === 0, stale.join(", "));
console.log(`      pages without the notice that can send work: ${Object.keys(PAGES_WITHOUT_NOTICE).length}`);

// ---- 5. The gates ----------------------------------------------------------------------------------------------
const builder = readFileSync(path.join(ROOT, "app/builder/page.tsx"), "utf8");
check("the builder page returns only the notice until it is accepted", /if \(acknowledgementOutstanding !== false\) \{\s*return \(/.test(builder) && /<FirstUseAcknowledgement onStatus=\{setAcknowledgementOutstanding\} \/>/.test(builder));
const outside = importClosure(["app/_components/IntakeRecovery.tsx"]).map((file: string) => path.resolve(file)).filter((file: string) => senderFiles.has(file)).map((file: string) => rel(file));
check("nothing drawn outside the builder page's notice return (the intake wrapper, its review panel) sends a work request", outside.length === 0, outside.join(", "));
const panel = readFileSync(path.join(ROOT, "app/_components/IntakeReviewPanel.tsx"), "utf8");
check("the review panel holds both of its starts for the notice", (panel.match(/if \(holdForNotice\(\)\) return;/g) ?? []).length === 2 && !/showWaitingStep\(\)\) \{ setWaiting/.test(panel));
const home = readFileSync(path.join(ROOT, "app/_components/HomeLocationGate.tsx"), "utf8");
const bodyOf = (name: string) => home.slice(home.indexOf(`async function ${name}(`), home.indexOf("\n  }\n", home.indexOf(`async function ${name}(`)));
check("the home page's Continue goes through the notice before it reads the story", /if \(await noticeFirst\(\)\) return;[\s\S]*understandStory\(/.test(bodyOf("continueToIntake")) && /fetch\("\/api\/classify-court-path"/.test(home.slice(home.indexOf("async function continueToIntake("))));
check("the home page's answers to the reading go through the notice before they are sent", /if \(await noticeFirst\(\)\) return;[\s\S]*understandStory\(/.test(bodyOf("updateWithAnswers")));
const homeSenders = WORK_SENDERS.filter((sender) => sender.file === "app/_components/HomeLocationGate.tsx").map((sender) => sender.route).sort();
check("the home page sends only the story reading and the court suggestion, both behind its notice", JSON.stringify(homeSenders) === JSON.stringify(["/api/case/understand", "/api/classify-court-path"]));
check("no work route is left out of the notice (NOT_GATED is empty)", Object.keys(NOT_GATED).length === 0, Object.keys(NOT_GATED).join(", "));

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll notice-gate checks passed.");
process.exit(failed ? 1 : 0);
