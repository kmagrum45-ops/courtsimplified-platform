/**
 * Runs mutation tests that cannot silently not-mutate.
 *
 * WHY THIS EXISTS. Mutation testing this session was done ad hoc: edit a file
 * with perl or a node one-liner, re-run a suite, look for FAIL, restore. One of
 * those runs reported a PASS because the string replace had not matched — the
 * file was never mutated, the suite correctly passed on clean code, and the
 * output was indistinguishable from "the check does not work". That is the same
 * class of defect as a detector returning clean on dirty code, and it is worse
 * than not mutation-testing at all, because it produces false confidence.
 *
 * THE FIX IS AN ORDERING. A mutation test has three separate outcomes and they
 * must not be collapsed:
 *
 *   1. The mutation did not land       -> ERROR. Says nothing about the check.
 *   2. The mutation landed, suite PASSED -> FAIL. The check does not work.
 *   3. The mutation landed, suite FAILED -> pass. The check works.
 *
 * Every ad-hoc run above could only distinguish (2) from (3) by eye, and (1)
 * masqueraded as (3). Here (1) is checked first and reported as its own thing.
 *
 * Restoration is in a `finally`, and is verified after the fact — a harness
 * that leaves a mutated file behind corrupts the repo, which is a worse failure
 * than the one it exists to prevent.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.join(__dirname, "..", "..");

export type Mutation = {
  /** Repo-relative path. */
  file: string;
  /**
   * Exact substring to replace. Must be present, or the run is an ERROR rather
   * than a result — that is the whole point of this module.
   */
  find: string;
  /** Replacement. Must differ from `find`. */
  replace: string;
};

export type MutationCase = {
  /** What defect this reintroduces, in the words of the thing being defended. */
  label: string;
  /** The suite that must catch it, repo-relative. */
  suite: string;
  /** One or more edits applied together. */
  mutations: Mutation[];
};

export type RestoreFailure = { kind: "restore-failed"; label: string; detail: string };

export type MutationOutcome =
  | { kind: "caught"; label: string }
  | { kind: "not-caught"; label: string; detail: string }
  | { kind: "did-not-land"; label: string; detail: string }
  | RestoreFailure;

function readFile(relative: string): string {
  return readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

/**
 * Translate "\n" in a pattern to whatever the file actually uses.
 *
 * This repo is checked out with CRLF on Windows, so a multi-line pattern
 * written with "\n" matches nothing. That is not a hypothetical: the first run
 * of runMutationTests.ts reported exactly this for a multi-line pattern, and
 * the same cause silently broke several ad-hoc perl and node mutations earlier
 * in the session — which is what this whole module exists to stop.
 *
 * Handled here rather than by asking every caller to write "\r\n", because a
 * pattern that works on one machine and not another is a mutation test that
 * passes for the wrong reason somewhere.
 */
function matchLineEndings(pattern: string, fileContent: string): string {
  const usesCrlf = fileContent.includes("\r\n");
  const normalized = pattern.replace(/\r\n/g, "\n");
  return usesCrlf ? normalized.replace(/\n/g, "\r\n") : normalized;
}

function writeFile(relative: string, content: string): void {
  writeFileSync(path.join(REPO_ROOT, relative), content, "utf8");
}

/** Exit code of a verification suite. Non-zero means it reported failures. */
function runSuite(suite: string): number {
  try {
    execFileSync(process.execPath, ["--import", "tsx", suite], {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    return 0;
  } catch (error) {
    const status = (error as { status?: number }).status;
    return typeof status === "number" ? status : 1;
  }
}

/**
 * Apply one case, run its suite, restore, and classify.
 *
 * The order of checks matters and is the reason this module exists:
 * landing is verified BEFORE the suite result is looked at, so a
 * non-matching pattern can never be read as a working check.
 */
export function runMutationCase(testCase: MutationCase): MutationOutcome {
  const snapshots = new Map<string, string>();

  try {
    // ---- 1. Verify every mutation lands ----

    for (const mutation of testCase.mutations) {
      const original = readFile(mutation.file);

      if (!snapshots.has(mutation.file)) snapshots.set(mutation.file, original);

      const find = matchLineEndings(mutation.find, original);
      const replace = matchLineEndings(mutation.replace, original);

      if (find === replace) {
        return {
          kind: "did-not-land",
          label: testCase.label,
          detail: `${mutation.file}: find and replace are identical`,
        };
      }

      const occurrences = original.split(find).length - 1;
      if (occurrences === 0) {
        return {
          kind: "did-not-land",
          label: testCase.label,
          detail:
            `${mutation.file}: pattern not found, so nothing was mutated. ` +
            `The suite was NOT exercised. Pattern: ${JSON.stringify(mutation.find.slice(0, 80))}`,
        };
      }

      const mutated = original.split(find).join(replace);

      if (mutated === original) {
        return {
          kind: "did-not-land",
          label: testCase.label,
          detail: `${mutation.file}: replacement produced identical content`,
        };
      }

      writeFile(mutation.file, mutated);

      // Read back from disk. An in-memory diff does not prove the write
      // happened — a read-only file or a failed write would pass that check.
      if (readFile(mutation.file) === original) {
        return {
          kind: "did-not-land",
          label: testCase.label,
          detail: `${mutation.file}: write did not take effect on disk`,
        };
      }
    }

    // ---- 2. Only now is the suite result meaningful ----

    const exitCode = runSuite(testCase.suite);

    if (exitCode === 0) {
      return {
        kind: "not-caught",
        label: testCase.label,
        detail: `${testCase.suite} passed with the defect present`,
      };
    }

    return { kind: "caught", label: testCase.label };
  } finally {
    for (const [file, original] of snapshots) {
      writeFile(file, original);
    }
  }
}

/** Confirm every mutated file is byte-identical to how it started. */
export function verifyRestored(
  testCase: MutationCase,
  before: Map<string, string>,
): RestoreFailure | null {
  for (const mutation of testCase.mutations) {
    const expected = before.get(mutation.file);
    if (expected === undefined) continue;

    if (readFile(mutation.file) !== expected) {
      return {
        kind: "restore-failed",
        label: testCase.label,
        detail: `${mutation.file} was left modified`,
      };
    }
  }

  return null;
}

export function snapshotFiles(testCase: MutationCase): Map<string, string> {
  const snapshots = new Map<string, string>();
  for (const mutation of testCase.mutations) {
    if (!snapshots.has(mutation.file)) snapshots.set(mutation.file, readFile(mutation.file));
  }
  return snapshots;
}
