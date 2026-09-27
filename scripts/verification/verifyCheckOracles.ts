/**
 * No check can be satisfied by a comment. A check's oracle must be independent of the
 * implementation's description of itself.
 *
 * WHAT THIS CATCHES: a source-level check whose searched text also appears in the target
 * file's comments — so the check passes on a file that merely TALKS about doing the right
 * thing, while no longer doing it.
 *
 * *** WHY THIS SUITE EXISTS: THREE TIMES IS NOT A COINCIDENCE ***
 *
 * It happened three times on this branch, in three different files, and each time the
 * check was mine and looked correct:
 *
 *   1. `verifyWorkspaceOcr` searched for the Vite-only `?url` import form and FAILED
 *      against correct code, because clientOcr.ts contains a comment explaining that
 *      `?url` does not work under Next. The check punished documenting the hazard it
 *      hunted.
 *
 *   2. `verifyWorkspaceUi` had to strip comments for the same reason: every string it
 *      looks for is also discussed in the page's own comments.
 *
 *   3. `verifyWorkspaceExport` read `no-store` out of the export route's HEADER COMMENT
 *      explaining why the response must be no-store. A mutation making the response
 *      cacheable left the check GREEN — the phrase was still there, in prose, describing
 *      the rule it had just stopped enforcing.
 *
 * The earlier absence-claims gate tripping on its own explanatory template is the same
 * shape, which makes four.
 *
 * A well-commented codebase makes this MORE likely, not less: the better the comment
 * explaining why a rule matters, the more certainly it contains the rule's own keywords.
 * So this is a structural hazard of how this repository is written, and it needs a
 * structural check rather than care.
 *
 * *** WHAT IT DOES ***
 *
 * For every verification script that reads a project source file and does NOT strip
 * comments, it extracts the literals that script searches for, and reports any literal
 * that appears in the target's comments but NOT in its code. Such a literal is an oracle
 * the implementation writes for itself.
 *
 * *** WHAT IT CANNOT CATCH, STATED PLAINLY ***
 *
 * Only the comment-oracle shape, and only where the target path is a resolvable literal.
 * The wider family — a check that asserts a constant equals itself, or compares a
 * document to its own prose — needs judgement. `docs/VERIFICATION_SUITES.md` and the
 * header of each suite are where that judgement is recorded.
 *
 * COSTS NOTHING. File reads.
 *
 * Run: node --import tsx scripts/verification/verifyCheckOracles.ts
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SUITE_DIR = path.join(ROOT, "scripts", "verification");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

/** Block and whole-line comments only — the same shape the suites strip. */
function splitComments(source: string): { code: string; comments: string } {
  const comments: string[] = [];

  let code = source.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    comments.push(match);
    return "";
  });

  code = code
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
        comments.push(line);
        return false;
      }
      return true;
    })
    .join("\n");

  return { code, comments: comments.join("\n") };
}

/*
 * *** THE WHOLE-FILE STRIPPER DETECTOR WAS ITSELF A COMMENT-ORACLE ***
 *
 * There was a stripsComments(source) here that asked whether the SUITE FILE mentioned a
 * stripper anywhere. It returned true for verifyWorkspaceExport even after the stripping
 * was removed from the call -- because the file still defines stripComments and still
 * explains it in a docstring. So every at-risk suite was skipped, and this audit reported
 * all clear against all three historical instances.
 *
 * The audit for comment-oracles was defeated by a comment-oracle inside the audit. That is
 * not irony worth enjoying, it is the measure of how easy this shape is to write: I wrote
 * one while writing the check for them.
 *
 * Stripping is now recorded PER VARIABLE, from the initialiser that produced it, so a
 * variable read raw is at risk whatever else the file contains.
 */
/**
 * Which local variable holds the contents of which file.
 *
 * *** WHY THE ASSOCIATION MATTERS, AND WHAT IT COST TO LEARN ***
 *
 * The first version of this scan collected every `path.join(ROOT, …)` in a suite and
 * tested every searched literal against every one of them. It duly reported
 * `verifyDatabaseEnvironments` as searching applyMigrations.ts for a phrase that is only
 * in that file's comments — and the phrase is not tested against applyMigrations.ts at
 * all. It is tested against CLAUDE.md, which the same suite also reads.
 *
 * A false positive in a meta-check is worse than in an ordinary one: nobody can act on
 * it, so the suite gets skipped, and then it catches nothing. So a literal is only
 * compared with the file the code actually tests it against.
 *
 * Handles `const x = readFileSync(path.join(ROOT, …), "utf8")` and the same wrapped in a
 * comment-stripping call, which is how these suites are written.
 */
function variableTargets(source: string): Map<string, { file: string; stripped: boolean }> {
  /*
   * *** TWO PASSES, BECAUSE ONE PASS FOUND NOTHING ***
   *
   * The first version matched only `const x = readFileSync(path.join(ROOT, …))`. Run
   * against all three historical instances, it detected NONE of them — a meta-check that
   * could not fail, which is the decoration CLAUDE.md §5 warns about.
   *
   * These suites are not written that way. They declare the path as a module constant
   * and read it through a helper:
   *
   *     const EXPORT_ROUTE = path.join(ROOT, "app", …);      <- pass 1 resolves this
   *     source = stripComments(readFileSync(EXPORT_ROUTE));  <- pass 2 links source to it
   *     const pageRaw = read(PAGE);                          <- and this
   *
   * Pass 1 resolves path constants; pass 2 links any variable to a path constant
   * mentioned in its initialiser, whatever wrapper sits around it. Reassignment to a
   * pre-declared `let` counts, which is how `let source = ""` then `source = …` works.
   */
  const paths = new Map<string, string>();

  for (const match of source.matchAll(
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*path\.join\(\s*ROOT\s*,([^;]*?)\)\s*;/g,
  )) {
    const parts = [...match[2].matchAll(/"([^"]+)"/g)].map((part) => part[1]);
    if (parts.length === 0) continue;
    const full = path.join(ROOT, ...parts);
    if (existsSync(full)) paths.set(match[1], full);
  }

  const map = new Map<string, { file: string; stripped: boolean }>();

  /*
   * Any assignment whose right-hand side mentions a resolved path constant, or builds a
   * path inline. Deliberately loose about the wrapper: readFileSync, a local `read`, a
   * comment stripper, or several nested.
   */
  for (const match of source.matchAll(
    /(?:(?:const|let)\s+)?([A-Za-z_$][\w$]*)\s*=\s*([^;]*?(?:readFileSync|read|load)\s*\([^;]*?)\s*;/g,
  )) {
    const [, variable, initialiser] = match;

    /*
     * Per variable, from the initialiser that produced it. Not "does this file mention a
     * stripper" — that was the bug this audit was written to find, and it was in the
     * audit.
     */
    const stripped = /stripComments|withoutComments|stripCode/.test(initialiser);

    for (const [constant, file] of paths) {
      if (new RegExp(`\\b${constant}\\b`).test(initialiser)) {
        map.set(variable, { file, stripped });
        break;
      }
    }

    if (map.has(variable)) continue;

    const inline = initialiser.match(/path\.join\(\s*ROOT\s*,([^)]*)\)/);
    if (inline) {
      const parts = [...inline[1].matchAll(/"([^"]+)"/g)].map((part) => part[1]);
      if (parts.length === 0) continue;
      const full = path.join(ROOT, ...parts);
      if (existsSync(full)) map.set(variable, { file: full, stripped });
    }
  }

  /*
   * *** ALIASES, BECAUSE THE STRIPPING IS USUALLY A SEPARATE LINE ***
   *
   * These suites read once and then derive:
   *
   *     const pageRaw = read(PAGE);            <- resolved above
   *     const page = withoutComments(pageRaw); <- and the literals are tested against THIS
   *
   * Without following that second line, the variable the checks actually use is unknown
   * and every literal is counted as unresolved — which is how this audit reported all
   * clear while the UI suite was at risk. An alias inherits the file, and inherits
   * `stripped` only if its own initialiser strips or the variable it came from was
   * already stripped.
   *
   * Two passes are enough for the shapes present; a longer chain would be reported as
   * unresolved rather than silently assumed safe.
   */
  for (let round = 0; round < 2; round += 1) {
    for (const match of source.matchAll(
      /(?:(?:const|let)\s+)?([A-Za-z_$][\w$]*)\s*=\s*([^;=]*?\b([A-Za-z_$][\w$]*)\b[^;=]*?)\s*;/g,
    )) {
      const [, variable, initialiser, referenced] = match;
      if (map.has(variable)) continue;

      const from = map.get(referenced);
      if (!from) continue;

      map.set(variable, {
        file: from.file,
        stripped:
          from.stripped || /stripComments|withoutComments|stripCode/.test(initialiser),
      });
    }
  }

  return map;
}

/**
 * Literals tested against a named variable, paired with that variable.
 *
 * Short strings are skipped — they match by accident and would drown the result.
 */
function literalsByVariable(source: string): { literal: string; variable: string }[] {
  const found: { literal: string; variable: string }[] = [];

  // /regex/.test(variable)
  for (const match of source.matchAll(
    /\/((?:[^/\\\n]|\\.){6,}?)\/[gimsuy]*\.test\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
  )) {
    found.push({ literal: match[1], variable: match[2] });
  }

  // variable.includes("literal")
  for (const match of source.matchAll(
    /([A-Za-z_$][\w$]*)\.includes\(\s*"((?:[^"\\]|\\.){8,}?)"\s*\)/g,
  )) {
    found.push({ literal: match[2], variable: match[1] });
  }

  // variable.match(/regex/)
  for (const match of source.matchAll(
    /([A-Za-z_$][\w$]*)\.match(?:All)?\(\s*\/((?:[^/\\\n]|\\.){6,}?)\/[gimsuy]*\s*\)/g,
  )) {
    found.push({ literal: match[2], variable: match[1] });
  }

  return found;
}

/** Turns a regex source into something testable, or null if it will not compile. */
function compile(literal: string): RegExp | null {
  try {
    return new RegExp(literal, "i");
  } catch {
    return null;
  }
}

console.log("");
console.log("CHECK ORACLES — no check may be satisfied by a comment");
console.log("");

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

type Finding = {
  suite: string;
  target: string;
  literal: string;
  /** "only-in-comments" is already broken. "in-both" is one edit from broken. */
  kind: "only-in-comments" | "in-both";
};

const findings: Finding[] = [];
let suitesRead = 0;
let comparisons = 0;
let unassociated = 0;

for (const file of readdirSync(SUITE_DIR)) {
  if (!/^verify.*\.ts$/.test(file)) continue;
  // This suite's own prose names every pattern it hunts for.
  if (file === "verifyCheckOracles.ts") continue;

  const suiteSource = readFileSync(path.join(SUITE_DIR, file), "utf8");

  const targets = variableTargets(suiteSource);
  if (targets.size === 0) continue;

  suitesRead += 1;

  for (const { literal, variable } of literalsByVariable(suiteSource)) {
    const target = targets.get(variable);
    if (!target) {
      unassociated += 1;
      continue;
    }

    // Stripped at the point of reading: nothing in the comments can reach the match.
    if (target.stripped) continue;

    // Markdown and JSON have no code/comment distinction to exploit.
    if (!/\.tsx?$|\.sql$/.test(target.file)) continue;

    const { code, comments } = splitComments(readFileSync(target.file, "utf8"));
    if (comments.trim().length === 0) continue;

    const pattern = compile(literal);
    if (!pattern) continue;
    comparisons += 1;

    const inComments = pattern.test(comments);
    const inCode = pattern.test(code);

    if (inComments && !inCode) {
      findings.push({ suite: file, target: target.file, literal, kind: "only-in-comments" });
    } else if (inComments && inCode) {
      findings.push({ suite: file, target: target.file, literal, kind: "in-both" });
    }
  }
}

// ---------------------------------------------------------------------------
// 1. A check satisfied by prose alone — already broken
// ---------------------------------------------------------------------------

{
  const broken = findings.filter((finding) => finding.kind === "only-in-comments");

  if (broken.length === 0) {
    pass(
      `no check is satisfied by a comment alone — ${suitesRead} suite(s) read source, ` +
        `${comparisons} literal(s) compared against code and comments separately`,
    );
  } else {
    fail(
      "a check is satisfied by the implementation's own description of itself",
      broken
        .map(
          (finding) =>
            `${finding.suite} searches /${finding.literal.slice(0, 55)}/ in ` +
            `${path.relative(ROOT, finding.target)}, where it appears ONLY IN A COMMENT. ` +
            `The check passes on prose.`,
        )
        .join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// 2. A check one edit away from it — the shape that actually happened
// ---------------------------------------------------------------------------

{
  /*
   * *** THIS IS THE CHECK THAT WOULD HAVE CAUGHT ALL THREE ***
   *
   * In every real instance the searched phrase was in the code AND in a comment about the
   * code. `verifyWorkspaceExport` looked for `no-store`, which was in the response header
   * and in the paragraph explaining why it must be. So the check passed — correctly, at
   * that moment — and stopped meaning anything the instant the header changed, because the
   * paragraph kept it green.
   *
   * "Only in comments" is the aftermath. "In both, with no stripping" is the condition,
   * and it is detectable BEFORE anything breaks. That is the whole value of this suite:
   * the earlier three were each found by a mutation, one at a time, after the fact.
   *
   * The fix is always the same and always cheap — strip comments before matching.
   */
  const fragile = findings.filter((finding) => finding.kind === "in-both");

  if (fragile.length === 0) {
    pass(
      "no check depends on text that also appears in the target's comments, so none can be " +
        "held green by prose after the code changes",
    );
  } else {
    fail(
      "a check would survive the behaviour it asserts being removed",
      fragile
        .map(
          (finding) =>
            `${finding.suite} searches /${finding.literal.slice(0, 55)}/ in ` +
            `${path.relative(ROOT, finding.target)}, where it is in BOTH the code and a ` +
            `comment. Remove the behaviour and the comment keeps this green. Strip comments.`,
        )
        .join("\n"),
    );
  }

  if (unassociated > 0) {
    /*
     * An UPPER BOUND on the gap, not a count of risks. Most of these are literals tested
     * against a local string — a sentence in a fixture, a value built in the check — which
     * has no comments to hide in. The rest are file reads through a shape this resolver
     * does not follow.
     *
     * Stated as a number anyway, because "the parts I could not examine" is exactly what a
     * clean result must not be silent about. A meta-check that reports only what it
     * managed to look at reads as broader coverage than it has.
     */
    console.log(
      `      note: ${unassociated} literal(s) tested against variables this resolver could ` +
        `not tie to a file. An upper bound on the unexamined gap, not a count of risks — ` +
        `most are local strings with no comments to hide in.`,
    );
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
