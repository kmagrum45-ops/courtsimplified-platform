/**
 * A browser-storage key may only be named in the registry.
 *
 *   npm run test:storage-keys
 *
 * COSTS NOTHING. Pure source scanning.
 *
 * WHY THIS EXISTS RATHER THAN A CONVENTION
 *
 * The court-path finder's key was spelled three ways across the codebase: a
 * local `temporaryKey` const in the finder, a bare string literal in the
 * builder, and properly exported constants in `builderDraftStorage.ts`. TWO
 * separate searches for that key missed it — once because the literal has no
 * separator after "courtSimplified", once because the local const name shares
 * no token with the literal it holds.
 *
 * A key nobody can find is a key nobody can clear, which is how a story
 * survived into a stranger's session on a shared computer.
 *
 * Knowing the convention did not produce the convention. This is the
 * mechanical version.
 *
 * THE PROPERTY
 *
 *   No call to localStorage/sessionStorage getItem, setItem or removeItem
 *   passes a string LITERAL as the key, anywhere in app/ or src/, except
 *   inside the registry module itself.
 *
 * A variable, a constant imported from the registry, or a function that builds
 * a key from one is fine. The thing being banned is a key that exists only as
 * text at a call site, because that is the form no search reliably finds.
 *
 * This asserts a property, not today's key list: it stays green when a key is
 * added to the registry and goes red when one is added anywhere else.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  INTAKE_STORAGE_KEYS,
  NAMED_STORAGE_KEYS,
} from "../../src/lib/case-system/storage/intakeStorageKeys";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCANNED_ROOTS = ["app", "src"];

/** The registry is where keys live, so it is the one file allowed to spell them. */
const REGISTRY = path.join("src", "lib", "case-system", "storage", "intakeStorageKeys.ts");

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.log(`FAIL  ${message}`);
}

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".next") walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        found.push(path.relative(REPO_ROOT, full));
      }
    }
  };
  for (const root of SCANNED_ROOTS) {
    const full = path.join(REPO_ROOT, root);
    if (fs.existsSync(full)) walk(full);
  }
  return found;
}

/**
 * Matches a storage call whose first argument starts with a quote.
 *
 * `storage.getItem(x)` and `localStorage.setItem(SOME_CONST, …)` do not match.
 * `localStorage.getItem("caseData")` does.
 */
const LITERAL_KEY_CALL =
  /\b(?:localStorage|sessionStorage|window\s*\.\s*(?:localStorage|sessionStorage))\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*(["'`])/g;

function main(): void {
  const files = sourceFiles();
  console.log(`scanning ${files.length} file(s) under ${SCANNED_ROOTS.join(", ")}\n`);

  let violations = 0;

  for (const file of files) {
    if (file.split(path.sep).join("/") === REGISTRY.split(path.sep).join("/")) continue;

    const text = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
    LITERAL_KEY_CALL.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = LITERAL_KEY_CALL.exec(text))) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      const snippet = text.slice(match.index, match.index + 90).replace(/\s+/g, " ");
      violations += 1;
      fail(
        `${file}:${line} names a storage key inline\n      ${snippet}\n` +
          `      Import it from ${REGISTRY.split(path.sep).join("/")} instead.`,
      );
    }
  }

  if (violations === 0) {
    console.log("pass  no storage key is named inline outside the registry");
  }

  // ---- The registry itself has to stay usable ----

  const seen = new Set<string>();
  for (const entry of INTAKE_STORAGE_KEYS) {
    if (seen.has(entry.key)) fail(`registry lists "${entry.key}" twice`);
    seen.add(entry.key);

    if (!entry.note.trim()) {
      fail(`registry entry "${entry.key}" has no note saying what it holds`);
    }
  }
  if (!failures) {
    console.log(`pass  registry has ${INTAKE_STORAGE_KEYS.length} distinct, documented keys`);
  }

  // A prefix entry must not be shadowed by an exact entry that would never be
  // reached — and more importantly, an exact entry sitting under a prefix entry
  // is a sign someone added a key without noticing it was already covered.
  for (const entry of INTAKE_STORAGE_KEYS) {
    if (entry.matches !== "exact") continue;
    const covering = INTAKE_STORAGE_KEYS.find(
      (other) =>
        other !== entry &&
        other.matches === "prefix" &&
        other.area === entry.area &&
        entry.key.startsWith(other.key),
    );
    if (covering) {
      fail(`"${entry.key}" is already covered by the prefix entry "${covering.key}"`);
    }
  }

  // ---- Every scope value is deliberate ----
  //
  // "shared" is the one that matters: it means an unscoped localStorage key
  // readable by the next person to use the browser. The count is asserted as a
  // FLOOR-free property — the check does not pin today's number, it requires
  // that anything marked shared says so in its note, so the privacy surface
  // stays legible rather than accumulating silently.
  for (const entry of INTAKE_STORAGE_KEYS) {
    if (entry.scope === "user" && entry.matches !== "prefix") {
      fail(`"${entry.key}" is user-scoped but not a prefix match, so the :<userId> form is missed`);
    }
  }

  // A named constant that is not in the registry would be a key the reset does
  // not clear, spelled somewhere a call site can import — the exact failure
  // this module exists to prevent, reintroduced inside the module itself.
  for (const named of NAMED_STORAGE_KEYS) {
    const covered = INTAKE_STORAGE_KEYS.some((entry) =>
      entry.matches === "prefix" ? named.startsWith(entry.key) : entry.key === named,
    );
    if (!covered) {
      fail(`the exported constant "${named}" is not covered by any registry entry`);
    }
  }
  if (!failures) {
    console.log(`pass  all ${NAMED_STORAGE_KEYS.length} exported key constants are in the registry`);
  }

  const shared = INTAKE_STORAGE_KEYS.filter((e) => e.scope === "shared");
  const sharedWithContent = shared.filter((e) => e.holdsCaseContent);
  console.log(
    `\nnote  ${shared.length} unscoped localStorage key(s), ${sharedWithContent.length} of which can hold case content.`,
  );
  console.log("      These are readable by the next person to use the browser.");
  console.log("      Recorded in docs/security/DATA_FLOW_INVENTORY.md.");

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
