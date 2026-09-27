/**
 * Every human-supplied snapshot has provenance, is second-tier, and exists.
 *
 * WHAT THIS CATCHES: a snapshot used as though it were a fetched source. The
 * snapshot type exists because ten pages cannot be fetched, and it is the only
 * source type whose content nothing can re-verify against the live web. That makes
 * it the one type where an unattributed or undated file could sit in the corpus
 * indefinitely, being quoted, with nobody able to say where it came from.
 *
 * So four properties are asserted:
 *
 *   1. format "human-snapshot" and a `snapshot` block imply each other. A snapshot
 *      block on a fetched source is meaningless; a snapshot format without one is
 *      unattributable.
 *   2. `savedBy` is a real name and `savedAt` a real date. "unknown" and "TBD" are
 *      refused by name, because they are what gets typed when the answer is not to
 *      hand and they read as though someone checked.
 *   3. The saved file exists on disk. A source that cannot be read is not a source.
 *   4. **Tier is always "practical".** A snapshot is one person's copy of one page
 *      on one day. Nothing claim-barring may rest on one, and the tier is what
 *      stops the drafter treating it as law.
 *
 * It does NOT assert that snapshots are fresh. Staleness is real — a snapshot is the
 * only source that goes out of date silently — but a suite that failed as a file
 * aged would be red for reasons nobody could fix in the moment, which is how a
 * suite gets ignored. `rules:check` reports the age instead.
 *
 * COSTS NOTHING. Reads the source list and the filesystem. No network.
 *
 * Run: node --import tsx scripts/verification/verifySnapshotProvenance.ts
 */

import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { CORPUS_SOURCES, sourceTier } from "../rules/corpusSources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

/** Placeholders that look like answers. Refused by name. */
const NOT_A_NAME = /^(unknown|tbd|n\/a|na|someone|me|admin|user|test)$/i;

console.log("");
console.log("HUMAN-SUPPLIED SNAPSHOT PROVENANCE");
console.log("");

const snapshots = CORPUS_SOURCES.filter((source) => source.format === "human-snapshot");
const strays = CORPUS_SOURCES.filter(
  (source) => source.format !== "human-snapshot" && source.snapshot !== undefined,
);

if (snapshots.length === 0) {
  pass("no human-supplied snapshots are declared yet (docs/infra/human-list.md is the task)");
} else {
  pass(`${snapshots.length} human-supplied snapshot(s) declared`);
}

if (strays.length === 0) {
  pass("no fetched source carries snapshot provenance it cannot have");
} else {
  fail(
    "a fetched source declares snapshot provenance",
    strays.map((s) => `${s.id} — format is "${s.format}" but a snapshot block is set`).join("\n"),
  );
}

for (const source of snapshots) {
  const problems: string[] = [];
  const snapshot = source.snapshot;

  if (!snapshot) {
    fail(`${source.id}: format is human-snapshot with no snapshot block`);
    continue;
  }

  if (!snapshot.localPath || !snapshot.localPath.startsWith("docs/sources/snapshots/")) {
    problems.push(
      `localPath "${snapshot.localPath}" must live under docs/sources/snapshots/ ` +
        `so every saved page is in one reviewable place`,
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}/.test(snapshot.savedAt ?? "")) {
    problems.push(`savedAt "${snapshot.savedAt}" is not an ISO date`);
  } else if (new Date(snapshot.savedAt) > new Date()) {
    problems.push(`savedAt "${snapshot.savedAt}" is in the future`);
  }

  if (!snapshot.savedBy || NOT_A_NAME.test(snapshot.savedBy.trim())) {
    problems.push(
      `savedBy "${snapshot.savedBy}" is not a person. A snapshot nobody is named ` +
        `against cannot be asked about`,
    );
  }

  if (!snapshot.becauseUnfetchable || snapshot.becauseUnfetchable.trim().length < 15) {
    problems.push(
      "becauseUnfetchable must say why the automated route failed, so nobody re-tries it",
    );
  }

  if (sourceTier(source) !== "practical") {
    problems.push(
      `tier is "${sourceTier(source)}" — a snapshot is always "practical". One person's ` +
        `copy of one page on one day cannot support a claim-barring statement`,
    );
  }

  if (snapshot.localPath) {
    const saved = path.join(ROOT, snapshot.localPath);
    if (!existsSync(saved)) {
      problems.push(`the saved file is missing: ${snapshot.localPath}`);
    } else if (statSync(saved).size === 0) {
      problems.push(`the saved file is empty: ${snapshot.localPath}`);
    }
  }

  if (problems.length === 0) {
    pass(`${source.id} has complete provenance (saved ${snapshot.savedAt} by ${snapshot.savedBy})`);
  } else {
    fail(`${source.id} provenance is incomplete`, problems.join("\n"));
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
