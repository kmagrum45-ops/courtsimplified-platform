/**
 * ONE CASE ID DECIDES WHICH CASE IS OPEN: the address, and nothing else
 * (npm run test:open-case).
 *
 * The site owner's rule 1 (30 Oct 2026): "One case id decides which case is
 * open. The id in the address (the intake or case id) is the only authority. No
 * remembered 'last case' in tab storage, a cookie, or the most recently opened
 * case may override it. Creating a case sets that id and goes to it. 'Continue
 * with <court>' opens the intake just created, with its own court path. With no
 * id, show the case chooser, and never guess."
 *
 * What it caught: the builder kept the case it last saved in tab storage
 * (courtSimplifiedBuilderLastCase) and, on an address with no case id, put that
 * case's id into the address (on a reload of ?step=results, and on a fresh mount
 * on ?step=guided/form). Twice a new case opened as an older one (16 Oct; the
 * owner's Chrome check, 30 Oct). Fails on main before this change: the resolver
 * did not exist, three files read the last case, and five read caseId/intake
 * from the address each in their own way.
 *
 * Checks, each a property:
 *   1. The shared resolver (src/lib/case-system/openCase.ts) answers from the
 *      address alone: with a "last case" planted in sessionStorage, localStorage
 *      and document.cookie, every answer is the same as without, and its source
 *      touches no storage or cookie.
 *   2. What it answers: the case or intake the address names; with none, never
 *      an id -- signed in on a builder step or a builder with no court, the case
 *      chooser (My cases); a guest with no court, the start page; a court with
 *      no step, a new intake (whose id goes into the address).
 *   3. No source file reads or writes a remembered last case.
 *   4. No page or client library reads caseId or intake from an address except
 *      through the resolver (app/ outside app/api, and src/lib/case-system).
 *   5. The places that open a case use it: the intake boundary (whose provider
 *      is keyed by the resolver's answer), its no-id branch (the chooser before
 *      any new intake), the builder, /forms, /legal-principles, sign-in's return.
 *   6. "Continue with <court>" and creating an intake put the new id and its own
 *      court in the address (HomeLocationGate, IntakeRecovery).
 *
 * Stand-ins: a plain object in place of sessionStorage/localStorage and a string
 * in place of document.cookie (check 1); source read off disk for checks 3-6.
 * No browser, no network, no database. The browser half is
 * tests/browser/address-opens-chosen-case.spec.ts (e), which runs in CI.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const RESOLVER = path.join(ROOT, "src/lib/case-system/openCase.ts");
let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}
const read = (rel: string) => (existsSync(path.join(ROOT, rel)) ? readFileSync(path.join(ROOT, rel), "utf8") : "");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== "node_modules") walk(full, out); }
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

type Open = { court: string | null; caseId: string | null; intake: string | null; step: string | null };
type Mod = {
  openCaseFromAddress: (params: URLSearchParams) => Open;
  withoutACase: (open: Open, where: { pathname: string; signedIn: boolean }) => string | null;
  addressWithoutACase: (choice: string | null) => string | null;
  CASE_CHOOSER: string;
};

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const LAST = "99999999-0000-4000-8000-000000000009";

async function main() {
  // ---------- 1 & 2. The resolver ----------
  let mod: Mod | null = null;
  if (existsSync(RESOLVER)) mod = (await import("../../src/lib/case-system/openCase")) as unknown as Mod;
  check("the shared resolver exists (src/lib/case-system/openCase.ts)", Boolean(mod));
  if (mod) {
    const { openCaseFromAddress, withoutACase, addressWithoutACase } = mod;
    const addresses = [
      "path=small-claims&intake=" + A,
      "path=family&caseId=" + B,
      "path=family&caseId=" + B + "&step=results",
      "path=small-claims",
      "path=small-claims&step=guided",
      "path=civil&step=results",
      "",
      "caseId=" + A,
    ];
    const answer = (search: string) => {
      const open = openCaseFromAddress(new URLSearchParams(search));
      return JSON.stringify({ open, builderIn: withoutACase(open, { pathname: "/builder", signedIn: true }), builderGuest: withoutACase(open, { pathname: "/builder", signedIn: false }) });
    };
    const clean = addresses.map(answer);
    // Plant a remembered last case everywhere a browser could remember one.
    const planted = { courtSimplifiedBuilderLastCase: JSON.stringify({ caseId: LAST, courtPath: "small-claims" }), courtSimplifiedActiveCaseId: LAST };
    const store = { getItem: (key: string) => (planted as Record<string, string>)[key] ?? null, setItem() {}, removeItem() {}, key: () => null, clear() {}, length: 2 };
    const g = globalThis as Record<string, unknown>;
    g.sessionStorage = store; g.localStorage = store; g.document = { cookie: `lastCase=${LAST}; courtSimplifiedBuilderLastCase=${LAST}` };
    const withMemory = addresses.map(answer);
    delete g.sessionStorage; delete g.localStorage; delete g.document;
    check("a remembered last case in tab storage, local storage or a cookie changes no answer", clean.every((value, i) => value === withMemory[i]), addresses.filter((_, i) => clean[i] !== withMemory[i]).join(" | "));
    check("no answer ever names the remembered case", !withMemory.some((value) => value.includes(LAST)));
    const source = strip(readFileSync(RESOLVER, "utf8"));
    check("the resolver's code touches no storage, cookie or account", !/sessionStorage|localStorage|document\.cookie|cookies\(|supabase|fetch\(/.test(source));

    const o = (search: string) => openCaseFromAddress(new URLSearchParams(search));
    check("the intake the address names is the one open", o(`path=small-claims&intake=${A}`).intake === A && o(`path=small-claims&intake=${A}`).court === "small-claims");
    check("the case the address names is the one open", o(`path=family&caseId=${B}`).caseId === B);
    check("an unknown court is no court, never a default", o("path=elsewhere").court === null && o("").court === null);
    check("an empty id is no id", o("caseId=&intake=").caseId === null && o("caseId=&intake=").intake === null);
    const at = (search: string, pathname: string, signedIn: boolean) => withoutACase(o(search), { pathname, signedIn });
    check("an address with an id opens it: nothing else is consulted", at(`path=small-claims&intake=${A}&step=results`, "/builder", true) === null && at(`caseId=${B}`, "/builder", false) === null);
    check("signed in, a builder step with no id: the case chooser", at("path=small-claims&step=results", "/builder", true) === "chooser" && at("path=family&step=guided", "/builder", true) === "chooser" && addressWithoutACase("chooser") === mod.CASE_CHOOSER && mod.CASE_CHOOSER === "/dashboard");
    check("signed in, the builder with no court and no id: the case chooser", at("", "/builder", true) === "chooser");
    check("a guest, the builder with no court and no id: the start page, not a guessed court", at("", "/builder", false) === "start" && addressWithoutACase("start") === "/");
    check("a guest on a builder step with no id: their one in-tab intake (asked first), never another case", at("path=civil&step=results", "/builder", false) === "new-intake");
    check("a court and no step: a new intake (start a new case)", at("path=family", "/builder", true) === "new-intake" && at("path=family", "/", false) === "new-intake");
    check("/forms and /legal-principles with no id: their general view", at("", "/forms", true) === "general" && at("", "/legal-principles", true) === "general");
  }

  // ---------- 3. No remembered last case anywhere ----------
  const sources = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "src"))];
  const lastCase = sources
    .filter((file) => !file.endsWith(path.join("storage", "intakeStorageKeys.ts")))
    .filter((file) => /BUILDER_LAST_CASE_KEY|courtSimplifiedBuilderLastCase/.test(strip(readFileSync(file, "utf8"))))
    .map(rel);
  check("no source file reads or writes a remembered last case", lastCase.length === 0, lastCase.join(", "));

  // ---------- 4. One way to read the case from an address ----------
  const direct = sources
    .filter((file) => !rel(file).startsWith("app/api/") && (rel(file).startsWith("app/") || rel(file).startsWith("src/lib/case-system/")) && file !== RESOLVER)
    .filter((file) => /\.get\(\s*["'](?:caseId|intake)["']\s*\)/.test(strip(readFileSync(file, "utf8"))))
    .map(rel);
  check("no page reads caseId or intake from its address except through the resolver", direct.length === 0, direct.join(", "));

  // ---------- 5. The places that open a case use it ----------
  const recovery = strip(read("app/_components/IntakeRecovery.tsx"));
  const boundary = recovery.match(/export function IntakeRecoveryBoundary[\s\S]*?\n\}/)?.[0] ?? "";
  check("the intake boundary keys its provider by the resolver's answer", /openCaseFromAddress\(useSearchParams\(\)\)/.test(boundary) && /key=\{`\$\{path\}:\$\{caseId \?\? ""\}:\$\{flow \?\? ""\}`\}/.test(boundary));
  check("the intake boundary sends a builder with no court and no id to the chooser", /NoCaseInAddress/.test(boundary) && /namesACase\(open\)/.test(boundary));
  const noId = recovery.match(/if \(!requestedFlow && !selectedId\) \{[\s\S]*?writeIntakeSession\(/)?.[0] ?? "";
  check("with no id, the chooser is decided before any new intake is created", /withoutACase\(openCaseFromAddress\(/.test(noId) && /window\.location\.replace\(elsewhere\)/.test(noId));
  for (const [file, label] of [["app/builder/page.tsx", "the builder"], ["app/forms/FormsWorkspace.tsx", "/forms"], ["app/legal-principles/page.tsx", "/legal-principles"], ["app/login/page.tsx", "sign-in's return"], ["src/lib/case-system/guestCarry.ts", "the guest carry"]] as const) {
    check(`${label} reads its case through the resolver`, /openCaseFromAddress\(/.test(strip(read(file))));
  }

  // ---------- 6. Creating an intake, and "Continue with <court>", put its id in the address ----------
  const gate = strip(read("app/_components/HomeLocationGate.tsx"));
  check("\"Continue with <court>\" opens the intake just created, with its own court", /router\.push\(`\/builder\?path=\$\{chosenPath\}&intake=\$\{flowId\}`\)/.test(gate) && /router\.push\(`\/builder\?path=\$\{chosenPath\}&intake=\$\{recovery\.flowId\}`\)/.test(gate));
  check("a new intake's id goes into the address the moment it starts", /if \(!requestedFlow && !selectedId\) \{[\s\S]*?writeIntakeSession\([\s\S]{0,400}?url\.searchParams\.set\("intake", flowId\)/.test(recovery));

  console.log(failures ? `\n${failures} failure(s).` : "\nAll open-case checks passed.");
  if (failures) process.exitCode = 1;
}

void main();
