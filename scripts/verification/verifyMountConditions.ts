/**
 * Surfaces that mount independently of the analysis pipeline are not gated on
 * it.
 *
 * COSTS NOTHING. Reads page sources off disk. No render, no network.
 *
 * WHY THIS EXISTS — THE SHAPE, FOUND THREE TIMES
 *
 * A component is placed inside a JSX block for LAYOUT, and silently inherits
 * that block's mount condition, which is about something else entirely. The
 * component is imported, reachable, rendered in tests, and invisible to real
 * users in the state that matters.
 *
 *   1. EventCandidateSurface, mounted behind `analysis && canonicalIntakeSaved`.
 *      `analysis` is set only by handleComplete and reset to null whenever an
 *      existing case loads, so a user who ran intake, saw candidates, answered
 *      none and reloaded never saw them again. Unanswered candidates were
 *      designed never to expire; they became invisible instead, which is worse,
 *      because the record still says they are open.
 *
 *   2. statusTriage.ts — built, sourced, verified, mutation-covered, and
 *      mounted nowhere at all. Its suite passed the entire time.
 *
 *   3. ChildSupportIntake and ChildSupportTableCard, inside the `!analysis`
 *      section, so they vanished the moment a family analysis completed.
 *
 * verifyReachability cannot catch any of these. It walks the IMPORT graph, and
 * in cases 1 and 3 the module is imported and reachable — the defect is in a
 * render condition, which the import graph does not model.
 *
 * WHY THIS IS A DECLARED LIST AND NOT AN INFERENCE
 *
 * The tempting check is: extract the identifiers from a mount condition and
 * flag any the component does not receive as a prop. That produces a false
 * positive on every legitimate routing gate — `courtPath === "family"` and
 * `confirmedLocation` are not props of ChildSupportIntake either, and both are
 * correct. The distinction between "gated on routing" and "gated on unrelated
 * pipeline state" is semantic, and a heuristic that guesses at it would flag
 * correct code, which is the failure mode CLAUDE.md section 5 is about.
 *
 * So the property is DECLARED: these named surfaces are independent of the
 * analysis pipeline, and the check asserts no pipeline identifier appears in
 * the condition that mounts them. Adding a surface to the list is a deliberate
 * statement about that surface, and the check then holds it.
 *
 * Run: node --import tsx scripts/verification/verifyMountConditions.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * State produced by, or describing the progress of, the analysis pipeline.
 * A surface declared independent must not be gated on any of these.
 *
 * `caseData` is deliberately absent: it is the loaded case, not pipeline
 * progress, and gating on it is legitimate.
 */
const PIPELINE_STATE = ["analysis", "canonicalIntakeSaved", "savingMaster", "lastSavedAt"];

type IndependentSurface = {
  /** JSX tag name as written. */
  component: string;
  /** Page file it is mounted in, repo-relative. */
  file: string;
  /** Why it needs nothing from the pipeline. Required, and must be specific. */
  reason: string;
};

const ANALYSIS_INDEPENDENT: IndependentSurface[] = [
  {
    component: "ChildSupportIntake",
    file: "app/builder/page.tsx",
    reason:
      "Holds its own form state and builds its own draft through " +
      "draftChildSupportApplication. Takes no props at all, so there is nothing " +
      "the pipeline could supply it. Was inside the !analysis section until " +
      "2026-09-14 and vanished when a family analysis completed.",
  },
  {
    component: "ChildSupportTableCard",
    file: "app/builder/page.tsx",
    reason:
      "Static sourced content about how the O. Reg. 391/97 table is built. Takes " +
      "no props and says nothing about the user's own case, so no state of the " +
      "pipeline can make it more or less correct to show.",
  },
  {
    component: "EventCandidateSurface",
    file: "app/builder/page.tsx",
    reason:
      "Takes caseId and fetches its own state from /api/cases/event-candidates. " +
      "Was mounted behind `analysis && canonicalIntakeSaved`, which made " +
      "unanswered candidates invisible to any user not mid-analysis — they were " +
      "designed never to expire, and became unreachable instead.",
  },
];

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/**
 * The JSX conditions guarding a component, innermost outward.
 *
 * Walks backwards from the component's position counting brace depth, and
 * collects the condition of every `{<expr> && (` block still open at that
 * point. Comments are stripped first — a check that fired on its own
 * explanatory comment is a mistake this codebase has made three times.
 */
function guardingConditions(source: string, component: string): string[] | null {
  const text = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  const at = text.search(new RegExp(`<${component}[\\s/>]`));
  if (at < 0) return null;

  const before = text.slice(0, at);
  const lines = before.split(/\r?\n/);

  const conditions: string[] = [];
  let depth = 0;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    // Counting from the right, so a closing brace deepens and an opening
    // brace unwinds.
    for (let c = line.length - 1; c >= 0; c -= 1) {
      if (line[c] === "}") depth += 1;
      else if (line[c] === "{") depth -= 1;
    }

    if (depth < 0) {
      const match = /\{([^{}]*?)&&\s*\(?\s*$/.exec(line);
      if (match) conditions.push(match[1].trim());
      depth = 0;
    }
  }

  return conditions;
}

function main(): void {
  check("there are declared analysis-independent surfaces", ANALYSIS_INDEPENDENT.length > 0);

  for (const surface of ANALYSIS_INDEPENDENT) {
    const full = path.resolve(process.cwd(), surface.file);

    check(
      `${surface.component}: a reason is recorded`,
      surface.reason.trim().length >= 80,
      "a name on a list is not a declaration — say why the surface needs nothing " +
        "from the pipeline, so the next reader can disagree with something specific",
    );

    if (!fs.existsSync(full)) {
      check(`${surface.component}: ${surface.file} exists`, false);
      continue;
    }

    const source = fs.readFileSync(full, "utf8");
    const conditions = guardingConditions(source, surface.component);

    check(
      `${surface.component}: is mounted in ${surface.file}`,
      conditions !== null,
      "declared independent of the analysis pipeline but mounted nowhere — " +
        "which is failure mode 2, the surface with no screen",
    );
    if (conditions === null) continue;

    const joined = conditions.join(" && ");
    const offending = PIPELINE_STATE.filter((name) =>
      new RegExp(`\\b${name}\\b`).test(joined),
    );

    check(
      `${surface.component}: not gated on analysis-pipeline state`,
      offending.length === 0,
      `gated on ${JSON.stringify(offending)} via: ${JSON.stringify(conditions)}\n` +
        `      Declared independent because: ${surface.reason}`,
    );
  }

  // SELF-TEST. A parser that silently finds nothing would pass every check
  // above while proving nothing, which is the shape of a check that cannot
  // fail. Assert the parser reads a condition it is known to be able to see.
  const builder = fs.readFileSync(path.resolve(process.cwd(), "app/builder/page.tsx"), "utf8");
  const civil = guardingConditions(builder, "CivilIntake");
  check(
    "self-test: the condition parser finds a known gate",
    civil !== null && civil.some((condition) => condition.includes("courtPath")),
    `CivilIntake is mounted behind a courtPath check; the parser returned ${JSON.stringify(civil)}`,
  );

  // And that it can see pipeline state when pipeline state is there — the
  // "Saving core intake" panel is gated on `analysis` by design.
  const savingPanel = /\{analysis && [^}]*canonicalIntakeSaved/.test(builder);
  check(
    "self-test: a genuinely analysis-gated block still exists to be distinguished from",
    savingPanel,
    "if nothing in the file is gated on analysis any more, this check is " +
      "asserting a distinction that no longer has two sides",
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
