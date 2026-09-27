/**
 * Nothing under `app/` or `src/` reads the non-shipping reference folders, and no
 * commercial publication is a corpus source.
 *
 * WHAT THIS CATCHES: `docs/reference/civil-annual-practice/` preserved as a
 * planning artefact and then quietly wired into the product. It contains
 * `authoritySectionsCaptured` arrays that are **section headings from the Ontario
 * Annual Practice**, a commercially published Thomson Reuters work which is not on
 * CLAUDE.md §2's acceptable-source list. A heading list is small, looks harmless,
 * and reads like a table of contents — which is exactly why somebody could import
 * it to drive a checklist without thinking of it as publishing someone else's work.
 *
 * It also catches the same folder being added to the corpus sources, where it would
 * be treated as authority and quoted into user-facing content by the drafter.
 *
 * *** WHY A PATH CHECK AND NOT A CONTENT CHECK ***
 *
 * The risk is not that the words are recognisable. It is that the FOLDER is read at
 * all. So this asserts the property "no import path reaches it", which holds
 * whatever the folder comes to contain — including material added later by somebody
 * who has not read the README.
 *
 * *** WHY IT LOOKS FOR IMPORTS AND READS, NOT FOR THE WORDS ***
 *
 * The first version flagged any occurrence of the folder's name, and immediately
 * failed on two comments explaining why the folder must not be used — including the
 * comment left where `annualPracticeLinks` was removed. That is the same mistake
 * CLAUDE.md §6 had to carve an exemption marker for: a check that forbids
 * *describing* a hazard makes the hazard harder to explain, which is backwards.
 *
 * So a line is an offence only if it references the folder AND does something that
 * reads it — an import, a require, a dynamic import, or a filesystem read. Prose is
 * free, because prose is how the next person finds out why not to.
 *
 * COSTS NOTHING. Reads source text off disk. No network, no model, no database.
 *
 * Run: node --import tsx scripts/verification/verifyReferenceFolderIsNotShipped.ts
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

/** Declared once: writing "
" through a shell heredoc injected a real newline into the literal twice. */
const NEWLINE = String.fromCharCode(10);

/** Folders preserved for reference that must never be read by shipped code. */
const NON_SHIPPING = ["docs/reference/civil-annual-practice"];

/** Trees that become the product. */
const SHIPPED_TREES = ["app", "src"];

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

function walk(relative: string): string[] {
  const absolute = path.join(ROOT, relative);
  if (!existsSync(absolute)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(absolute)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const child = path.join(relative, entry);
    if (statSync(path.join(ROOT, child)).isDirectory()) found.push(...walk(child));
    else if (/\.(ts|tsx|mts|js|mjs|json)$/.test(entry)) found.push(child.split(path.sep).join("/"));
  }
  return found;
}

console.log("");
console.log("NON-SHIPPING REFERENCE FOLDERS");
console.log("");

// ---------------------------------------------------------------------------
// 1. The folders exist and say what they are
// ---------------------------------------------------------------------------

for (const folder of NON_SHIPPING) {
  const readme = path.join(ROOT, folder, "README.md");
  if (!existsSync(path.join(ROOT, folder))) {
    // Not a failure: the folder may legitimately be removed one day.
    pass(`${folder} is not present (nothing to police)`);
    continue;
  }
  if (!existsSync(readme)) {
    fail(`${folder} has no README saying it must not ship`);
    continue;
  }
  const text = readFileSync(readme, "utf8");
  const problems: string[] = [];
  if (!/may not be served|must not ship|non-shipping/i.test(text)) {
    problems.push("the README does not say the folder must not be served to users");
  }
  if (!/sourced from the vendored corpus|docs\/sources\/corpus/i.test(text)) {
    problems.push("the README does not point at the vendored corpus as the source of record");
  }
  if (problems.length === 0) pass(`${folder} declares itself non-shipping`);
  else fail(`${folder} README is incomplete`, problems.join("\n"));
}


/**
 * Does this line actually READ the path, as opposed to mentioning it?
 *
 * An import, a require, a dynamic import, or a filesystem read. Anything else —
 * a comment, a README reference, a refusal list — is documentation and is fine.
 */
function readsThePath(line: string, folder: string, leaf: string): boolean {
  if (!line.includes(folder) && !line.includes(leaf)) return false;

  // An ES import or re-export, in either quote style or a template literal.
  if (/\bfrom\s*["'`]/.test(line)) return true;
  // A dynamic import or a require.
  if (/\b(import|require)\s*\(/.test(line)) return true;
  // A bare `import x from`, `import {`, or `import * as`.
  if (/\bimport\s+[\w*{]/.test(line)) return true;
  // A filesystem or network read of it.
  if (/readFile|readFileSync|readdir|createReadStream|fetch\s*\(/.test(line)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// 2. No shipped file reads them
// ---------------------------------------------------------------------------

{
  const offenders: string[] = [];
  const files = SHIPPED_TREES.flatMap((tree) => walk(tree));

  for (const file of files) {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    for (const folder of NON_SHIPPING) {
      // Both the repo-relative path and the folder's distinctive last segment,
      // so a relative import like "../../../docs/reference/civil-annual-practice"
      // is caught as well as an absolute one.
      const leaf = folder.split("/").pop() as string;
      source.split(NEWLINE).forEach((line, index) => {
        if (readsThePath(line, folder, leaf)) {
          offenders.push(`${file}:${index + 1} reads ${folder}`);
        }
      });
    }
  }

  if (offenders.length === 0) {
    pass(`no file under ${SHIPPED_TREES.join("/ or ")}/ reads a non-shipping folder (${files.length} files)`);
  } else {
    fail(
      "shipped code reads a non-shipping reference folder",
      `${offenders.join("\n")}\n\n` +
        `That folder holds Annual Practice section headings — a commercially\n` +
        `published work. Draft from the vendored corpus instead.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. No non-shipping folder is a corpus source
// ---------------------------------------------------------------------------

{
  const sourceFiles = walk("scripts/rules");
  const offenders: string[] = [];
  for (const file of sourceFiles) {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    for (const folder of NON_SHIPPING) {
      const leaf = folder.split("/").pop() as string;
      /*
       * No filename exemption is needed. refusedCorpusPaths.ts and
       * civilProcedureSources.ts both NAME the folder in prose, deliberately, and
       * naming it is not using it. Only a line that reads the path counts.
       */
      source.split(NEWLINE).forEach((line, index) => {
        if (readsThePath(line, folder, leaf)) {
          offenders.push(`${file}:${index + 1} reads ${folder}`);
        }
      });
    }
  }
  if (offenders.length === 0) {
    pass("no corpus source definition names a non-shipping folder");
  } else {
    fail(
      "a non-shipping folder is wired into the corpus",
      `${offenders.join("\n")}\n\n` +
        `A corpus source is quoted into user-facing content by the drafter.\n` +
        `Commercial publications are never sources — CLAUDE.md §2.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. The refusal list exists and covers them
// ---------------------------------------------------------------------------

{
  const refusalPath = path.join(ROOT, "scripts", "rules", "refusedCorpusPaths.ts");
  if (!existsSync(refusalPath)) {
    fail("scripts/rules/refusedCorpusPaths.ts is missing", "Nothing records WHY these paths are not sources.");
  } else {
    const text = readFileSync(refusalPath, "utf8");
    const missing = NON_SHIPPING.filter((folder) => !text.includes(folder));
    if (missing.length === 0) pass("the corpus refusal list covers every non-shipping folder");
    else fail("the corpus refusal list is incomplete", missing.join("\n"));
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
