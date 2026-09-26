/**
 * WHERE the output guard is actually applied — asserted, and stated honestly.
 *
 * COSTS NOTHING. Reads source off disk.
 *
 * *** WHY THIS EXISTS, AND WHAT IT ADMITS ***
 *
 * `verifyOutputGuard.ts` tests the guard FUNCTION: give it model prose, it
 * refuses; give it a library item, it allows. Every one of those checks passes
 * with the guard called from nowhere at all.
 *
 * An independent review on 2026-09-23 established that this was close to the
 * situation. `assertApprovedUserContent` had exactly two call sites in the
 * whole product, both in `HomeLocationGate.tsx`. Meanwhile `outputGuard.ts`'s
 * own header called itself "the single gate every AI-fed, user-facing string
 * passes through" and the compliance report called it "the load-bearing
 * control". Neither was true.
 *
 * A check on a control has to fail when the control is removed. This one does:
 * delete a guarded render and it goes red.
 *
 * *** WHAT IT DELIBERATELY DOES NOT CLAIM ***
 *
 * It does not claim the guard covers the product. It cannot, because it does
 * not. GUARDED lists the render paths that consult it; UNGUARDED lists the
 * significant ones that do not, each with the reason. Both lists are
 * maintained by hand, which CLAUDE.md §5 permits — "a list that must be
 * maintained is fine; a check that punishes the maintenance is not" — and the
 * maintenance here is a one-line addition with an obvious cause.
 *
 * The UNGUARDED list is the more useful half. It is the honest answer to "what
 * does the guard cover", and it is what the compliance report must say rather
 * than "everything".
 *
 * Run: node --import tsx scripts/verification/verifyOutputGuardCoverage.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Source with comments removed.
 *
 * Every check here matches on source text, and this codebase's comments
 * discuss the very expressions being searched for — the comment explaining why
 * a field was removed contains that field's name. Matching a string that also
 * appears in a comment is the defect an independent review flagged in a
 * sibling suite; stripping first is the fix.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ---------------------------------------------------------------------------
// GUARDED — render paths that pass text through the guard
// ---------------------------------------------------------------------------

type GuardedPath = {
  file: string;
  /** What is guarded there. */
  what: string;
  /** Minimum number of guard calls expected in the file. */
  atLeast: number;
};

const GUARDED: GuardedPath[] = [
  {
    file: "src/lib/content-library/computedDeadline.ts",
    what:
      "every sentence the deadline engine can produce, as the TEMPLATE a licensee " +
      "reviewed rather than the filled instance. Added by decision 5, and it had to be: " +
      "wiring the engine to a render path made a dozen sentences about how the law counts " +
      "days user-facing for the first time, and prose assembled inside an engine would " +
      "never have reached the guard to be blocked. Two call sites rather than a dozen: " +
      "every step, statement and caution routes through one `guardedFill` helper, and the " +
      "second call is the uncertainty explanation, guarded on its own because a " +
      "confirm-with-court date whose explanation had been dropped would read as settled",
    atLeast: 2,
  },
  {
    file: "src/lib/content-library/stageAnswerView.ts",
    what:
      "every section of a published stage answer -- the ONLY way one reaches a user. " +
      "It guards the TEMPLATE before filling any slot, so an approval covers the " +
      "reviewed words rather than one user's filled-in sentence",
    atLeast: 1,
  },
  {
    file: "src/lib/content-library/renderAssistantBlock.ts",
    what:
      "every string the guided assistant can say -- it guards the block TEMPLATE, " +
      "with slots intact, before filling any of them",
    atLeast: 1,
  },
  {
    file: "app/_components/HomeLocationGate.tsx",
    what: "the pathway description, and the out-of-scope forum redirect message",
    atLeast: 2,
  },
];

{
  for (const { file, what, atLeast } of GUARDED) {
    const source = read(file);
    // `\s*\(` already excludes the import line, which has no call parens.
    // Comments are stripped first: this file's own explanations name the
    // function repeatedly.
    const real = (withoutComments(source).match(/assertApprovedUserContent\s*\(/g) || []).length;

    if (real >= atLeast) {
      pass(`${file} guards ${what} (${real} call${real === 1 ? "" : "s"})`);
    } else {
      fail(
        `${file} no longer guards ${what}`,
        `expected at least ${atLeast} call(s) to assertApprovedUserContent, found ${real}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// UNGUARDED — the honest list
// ---------------------------------------------------------------------------

type UnguardedPath = {
  file: string;
  what: string;
  /** Why it is acceptable today, or what would be needed to close it. */
  reason: string;
};

/**
 * Significant user-facing text that does NOT pass through the guard.
 *
 * Every entry needs a reason, enforced below. A bare list would become a place
 * to park things, which is exactly how the guard came to be described as
 * covering the product while covering two paragraphs.
 */
const UNGUARDED: UnguardedPath[] = [
  {
    file: "app/builder/_components/StageConfirmation.tsx",
    what: "the next-step catalogue blocks",
    reason:
      "The text is read directly out of nextSteps.ts, which is the library the " +
      "guard checks against. Routing it through the guard would be asking the " +
      "library whether its own contents are in the library. What the guard would " +
      "add is the REQUIRE_APPROVED_CONTENT check, which is the real gap here.",
  },
  {
    file: "app/_components/PathwayUnavailable.tsx",
    what: "the phase-1 unavailable message and referral list",
    reason:
      "Fixed constants in phaseScope.ts and referralResources.ts, not model " +
      "output and not in the content library. Adding them to the library would " +
      "let the guard cover them and is the right follow-up.",
  },
  {
    file: "app/_components/LegalAdviceDeflection.tsx",
    what: "DEFLECTION_MESSAGE, OUT_OF_SCOPE_MESSAGE and the four referrals",
    reason: "Same as PathwayUnavailable — fixed constants outside the library.",
  },
  {
    file: "src/lib/case-system/intake/safetyPass.ts",
    what: "IMMEDIATE_DANGER_MESSAGE and DISTRESS_ACKNOWLEDGMENT",
    reason:
      "Fixed constants, never model text. Unreviewed crisis wording — the file's " +
      "own header says so — and now IN the review packet (added 2026-09-23), " +
      "which is what routes it to someone with clinical expertise. Still rendered " +
      "without the guard, like every other fixed constant.",
  },
  {
    file: "src/lib/content-library/proceduralStages.ts",
    what: "21 procedural-stage cards across three courts, rendered by /legal-principles",
    reason:
      "Hand-written, not model output, and every card cited. IS now in the review " +
      "packet (added 2026-09-23), so a licensee will read it -- but the page " +
      "renders the cards directly rather than through the guard, so " +
      "REQUIRE_APPROVED_CONTENT would not gate them. Same gap as the catalogue " +
      "renders.",
  },
  {
    file: "src/lib/case-system/documentGenerationEngine.ts",
    what: "the generated document body",
    reason:
      "Assembles the user's own recorded facts plus catalogue next steps. Model " +
      "prose was removed from its inputs at the engine assembly point on " +
      "2026-09-23 rather than by guarding the render, because a document also " +
      "legitimately contains the user's own words — which the guard would refuse, " +
      "since they are not library items. See verifyNoModelProseInDocuments.ts.",
  },
];

{
  const missingReason = UNGUARDED.filter(
    (entry) => !entry.reason || entry.reason.trim().length < 40,
  );

  if (missingReason.length === 0) {
    pass(`all ${UNGUARDED.length} unguarded paths carry a real reason`);
  } else {
    fail(
      "an unguarded path has no reason, or a placeholder one",
      missingReason.map((entry) => `  ${entry.file}`).join("\n"),
    );
  }
}

{
  // A path listed as unguarded that has since been guarded should come OFF the
  // list. Same shape as verifyReachability's dormant-list check: the update is
  // a one-line deletion with an obvious cause.
  const nowGuarded = UNGUARDED.filter((entry) => {
    if (entry.file.endsWith("/")) return false;
    try {
      return /assertApprovedUserContent\s*\(/.test(read(entry.file));
    } catch {
      return false;
    }
  });

  if (nowGuarded.length === 0) {
    pass("no path listed as unguarded has quietly become guarded");
  } else {
    fail(
      "these now call the guard and should be moved to GUARDED",
      nowGuarded.map((entry) => `  ${entry.file}`).join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// The count, stated plainly
// ---------------------------------------------------------------------------

{
  function sourceFiles(): string[] {
    const found: string[] = [];
    function walk(relative: string): void {
      for (const entry of readdirSync(path.join(ROOT, relative))) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        const child = path.join(relative, entry);
        if (statSync(path.join(ROOT, child)).isDirectory()) walk(child);
        else if (/\.tsx?$/.test(entry)) found.push(child.split(path.sep).join("/"));
      }
    }
    walk("src");
    walk("app");
    return found;
  }

  const callers = sourceFiles().filter(
    (file) =>
      file !== "src/lib/content-library/outputGuard.ts" &&
      /assertApprovedUserContent\s*\(|checkUserContent\s*\(/.test(read(file)),
  );

  const declared = new Set(GUARDED.map((entry) => entry.file));
  const undeclared = callers.filter((file) => !declared.has(file));

  console.log("");
  console.log(`Guard is applied in ${callers.length} file(s): ${callers.join(", ")}`);
  console.log(`${UNGUARDED.length} significant render path(s) are declared UNGUARDED.`);
  console.log("");

  if (undeclared.length === 0) {
    pass("every file that calls the guard is declared in GUARDED");
  } else {
    // Not a failure of the product — a failure of this list to describe it.
    fail(
      "a file calls the guard but is not declared here; add it to GUARDED",
      undeclared.join("\n"),
    );
  }
}

console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
