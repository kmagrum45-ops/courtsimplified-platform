/**
 * The claim-type catalogue is internally honest: ids are unique and stable,
 * authored profiles carry their sources, declared profiles carry nothing, and the
 * synthetic scenarios can never reach a user.
 *
 * WHAT THIS CATCHES, in order of how much it would cost:
 *
 * 1. **A declared profile with user-facing fields.** The catalogue names ~180 types
 *    and has authored 7. `contentStatus: "declared"` is the whole basis on which
 *    the other ~173 are safe to have in the repository at all. A declared profile
 *    that quietly grew a forum verdict would render a half-answer that reads like a
 *    whole one, and a user cannot tell the difference between "this court is wrong
 *    for you" and silence.
 *
 * 2. **An authored profile with no source.** Every statement a drafter may make
 *    about a claim type has to be quotable from the vendored corpus. An authored
 *    profile with an empty `sourceIds` is an invitation to write from memory.
 *
 * 3. **A claim-barring notice with no provision behind it.** These are the
 *    deadlines that end claims. One asserted without a citation is the worst
 *    single error available in this repository.
 *
 * 4. **A scenario containing personal data, or reaching a render path.** Scenarios
 *    are synthetic training and eval material. They were never reviewed as content
 *    and must never be shown, so they are checked for names, emails, addresses and
 *    phone numbers, and no shipped file may read the field.
 *
 * 5. **An id that forks from the existing intake catalogue.** Where a profile
 *    extends one of the 22 intake claim types it must reuse that id, or the two
 *    catalogues drift and a user is classified twice under different names.
 *
 * COSTS NOTHING. Reads the catalogue and the source tree. No network, no model.
 *
 * Run: node --import tsx scripts/verification/verifyClaimTypeCatalogue.ts
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

import { CLAIM_TYPE_PROFILES, coverageByFamily, renderableProfiles } from "../../src/lib/case-system/claim-types/catalogue";
import { CORPUS_SOURCES } from "../rules/corpusSources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("CLAIM-TYPE CATALOGUE");
console.log("");

// ---------------------------------------------------------------------------
// Coverage, printed first so the report is the headline
// ---------------------------------------------------------------------------

{
  const rows = coverageByFamily();
  const authored = rows.reduce((n, r) => n + r.authored, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  console.log(`  ${total} claim types declared, ${authored} authored`);
  for (const row of rows) {
    console.log(
      `    ${row.family.padEnd(20)} ${String(row.authored).padStart(3)} authored  ` +
        `${String(row.declared).padStart(3)} declared`,
    );
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// 1. Ids are unique
// ---------------------------------------------------------------------------

{
  const seen = new Map<string, number>();
  for (const profile of CLAIM_TYPE_PROFILES) {
    seen.set(profile.id, (seen.get(profile.id) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1);
  if (duplicates.length === 0) {
    pass(`all ${CLAIM_TYPE_PROFILES.length} profile ids are unique`);
  } else {
    fail(
      "duplicate profile ids",
      duplicates.map(([id, n]) => `${id} appears ${n} times`).join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// 2. A declared profile carries nothing a user could see
// ---------------------------------------------------------------------------

{
  const USER_FACING: Array<keyof (typeof CLAIM_TYPE_PROFILES)[number]> = [
    "forum",
    "notices",
    "limitationNote",
    "gather",
    "alternativeRouteSourceIds",
    "wentWrongStageIds",
  ];

  const offenders: string[] = [];
  for (const profile of CLAIM_TYPE_PROFILES) {
    if (profile.contentStatus !== "declared") continue;
    const set = USER_FACING.filter((field) => profile[field] !== undefined);
    if (set.length > 0) {
      offenders.push(`${profile.id} declares ${set.join(", ")} while contentStatus is "declared"`);
    }
  }

  if (offenders.length === 0) {
    pass("no declared profile carries a user-facing field");
  } else {
    fail(
      "a declared profile carries user-facing fields",
      `${offenders.join("\n")}\n\n` +
        `Either finish it and set contentStatus to "authored", or remove the fields.\n` +
        `A half-filled profile renders an answer that looks complete.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. An authored profile is actually complete
// ---------------------------------------------------------------------------

{
  const corpusIds = new Set(CORPUS_SOURCES.map((source) => source.id));
  const problems: string[] = [];

  for (const profile of renderableProfiles()) {
    if (!profile.forum) problems.push(`${profile.id}: authored with no forum verdict`);
    if (!profile.sourceIds || profile.sourceIds.length === 0) {
      problems.push(`${profile.id}: authored with no sourceIds — nothing could be quoted`);
    }
    for (const id of profile.sourceIds ?? []) {
      if (!corpusIds.has(id)) {
        problems.push(`${profile.id}: sourceId "${id}" is not a vendored corpus source`);
      }
    }
    for (const id of profile.alternativeRouteSourceIds ?? []) {
      if (!corpusIds.has(id)) {
        problems.push(`${profile.id}: alternative route "${id}" is not a vendored corpus source`);
      }
    }
    if (profile.forum?.kind === "elsewhere" && !profile.forum.routeUnsourced) {
      if (!corpusIds.has(profile.forum.forumSourceId)) {
        problems.push(
          `${profile.id}: routes elsewhere to "${profile.forum.forumSourceId}", which is not vendored. ` +
            `Set routeUnsourced if there is genuinely no source yet`,
        );
      }
    }
  }

  if (problems.length === 0) {
    pass(`every authored profile has a forum verdict and vendored sources (${renderableProfiles().length})`);
  } else {
    fail("an authored profile is incomplete", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. Every claim-barring notice cites a provision
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  let barring = 0;
  for (const profile of CLAIM_TYPE_PROFILES) {
    for (const notice of profile.notices ?? []) {
      if (notice.claimBarring) barring += 1;
      if (!notice.because || !notice.because.sourceId || !notice.because.quote) {
        problems.push(`${profile.id}: a notice on ${notice.stageId} has no citation with a quote`);
      }
      if (!notice.countFromEvent) {
        problems.push(`${profile.id}: a notice on ${notice.stageId} has no event to count from`);
      }
    }
  }
  if (problems.length === 0) {
    pass(`every notice cites a provision and names its event (${barring} claim-barring)`);
  } else {
    fail("a notice is asserted without its provision", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 5. Scenarios are synthetic — no personal data
// ---------------------------------------------------------------------------

{
  /*
   * Deliberately crude and deliberately loud. These are fabricated strings, so a
   * false positive costs one rewrite; a miss puts a real person's details into
   * classifier context and eval output.
   */
  const PERSONAL: Array<{ what: string; pattern: RegExp }> = [
    { what: "an email address", pattern: /[\w.+-]+@[\w-]+\.[\w.]+/ },
    { what: "a phone number", pattern: /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/ },
    { what: "a postal code", pattern: /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/ },
    { what: "a street address", pattern: /\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Crescent|Cres|Lane)\b/ },
    { what: "a long digit run that could be an account or claim number", pattern: /\b\d{7,}\b/ },
  ];

  const problems: string[] = [];
  let scenarios = 0;

  for (const profile of CLAIM_TYPE_PROFILES) {
    for (const scenario of profile.scenarios ?? []) {
      scenarios += 1;
      for (const { what, pattern } of PERSONAL) {
        if (pattern.test(scenario)) {
          problems.push(`${profile.id}: a scenario contains ${what}`);
        }
      }
      if (scenario.length > 200) {
        problems.push(`${profile.id}: a scenario is ${scenario.length} characters — these are one-liners`);
      }
    }
  }

  if (problems.length === 0) {
    pass(`no scenario contains personal data (${scenarios} scenarios)`);
  } else {
    fail("a scenario contains personal data", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. Scenarios cannot reach a render path
// ---------------------------------------------------------------------------

{
  /*
   * Asserted over SOURCE TEXT rather than over today's imports, so wiring the field
   * into a page fails here rather than silently shipping fabricated sentences as
   * though they had been reviewed.
   */
  function walk(relative: string): string[] {
    const absolute = path.join(ROOT, relative);
    if (!existsSync(absolute)) return [];
    const found: string[] = [];
    for (const entry of readdirSync(absolute)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const child = path.join(relative, entry);
      if (statSync(path.join(ROOT, child)).isDirectory()) found.push(...walk(child));
      else if (/\.(ts|tsx)$/.test(entry)) found.push(child.split(path.sep).join("/"));
    }
    return found;
  }

  const RENDER_TREES = ["app", "src/components", "src/lib/content-library"];
  const offenders: string[] = [];

  for (const tree of RENDER_TREES) {
    for (const file of walk(tree)) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      source.split(/\r?\n/).forEach((line, index) => {
        // `.scenarios` or `scenarios:` reached from a render tree.
        if (/\.scenarios\b/.test(line) || /\bscenarios\s*\./.test(line)) {
          offenders.push(`${file}:${index + 1}`);
        }
      });
    }
  }

  if (offenders.length === 0) {
    pass(`no render path reads profile scenarios (${RENDER_TREES.join(", ")})`);
  } else {
    fail(
      "a render path reads the synthetic scenarios",
      `${offenders.join("\n")}\n\n` +
        `Scenarios are fabricated and were never reviewed as content. They exist for\n` +
        `classifier context and eval stories only.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 7. Ids reused from the intake catalogue really exist there
// ---------------------------------------------------------------------------

{
  const intakePath = path.join(ROOT, "src", "lib", "case-system", "intake", "claimTypes.ts");
  const intake = existsSync(intakePath) ? readFileSync(intakePath, "utf8") : "";
  const problems: string[] = [];

  for (const profile of CLAIM_TYPE_PROFILES) {
    if (!profile.existingClaimTypeId) continue;
    if (!intake.includes(`"${profile.existingClaimTypeId}"`)) {
      problems.push(
        `${profile.id}: existingClaimTypeId "${profile.existingClaimTypeId}" is not in intake/claimTypes.ts`,
      );
    }
  }

  if (problems.length === 0) pass("every existingClaimTypeId points at a real intake claim type");
  else fail("a profile claims to extend an intake type that does not exist", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 8. No intake claim type is silently dropped
// ---------------------------------------------------------------------------

{
  /*
   * *** WHY THIS IS NOT JUST "IDS MATCH" ***
   *
   * An intake type may be carried forward in two legitimate ways: the new catalogue
   * reuses its id, or a new profile names it in `existingClaimTypeId` because the
   * old type is being SPLIT.
   *
   * `sc-claim-defamation-libel-slander` is the second case, and it is the reason
   * this check exists rather than a simple id comparison. That one type conflated a
   * newspaper or broadcast — six weeks' notice, three months to start, under
   * ss. 5 (1) and 6 — with an ordinary online post, which those sections do not
   * reach at all (s. 7). Keeping them as one type meant one deadline answer for two
   * situations, and either answer is harmful in the other's case.
   *
   * So a split is allowed, and vanishing is not. An intake type accounted for
   * NEITHER way has been dropped, and dropping one means a user already classified
   * under it stops being recognised.
   */
  const intakePath = path.join(ROOT, "src", "lib", "case-system", "intake", "claimTypes.ts");
  const intake = existsSync(intakePath) ? readFileSync(intakePath, "utf8") : "";
  const intakeIds = [...intake.matchAll(/id: "(sc-claim-[a-z0-9-]+)"/g)].map((m) => m[1]);

  const catalogueIds = new Set(CLAIM_TYPE_PROFILES.map((p) => p.id));
  const extended = new Set(
    CLAIM_TYPE_PROFILES.map((p) => p.existingClaimTypeId).filter((id): id is string => Boolean(id)),
  );

  const dropped = intakeIds.filter((id) => !catalogueIds.has(id) && !extended.has(id));

  if (intakeIds.length === 0) {
    fail("could not read any intake claim type ids", intakePath);
  } else if (dropped.length === 0) {
    const split = intakeIds.filter((id) => !catalogueIds.has(id) && extended.has(id));
    pass(
      `all ${intakeIds.length} intake claim types are accounted for ` +
        `(${intakeIds.length - split.length} by id, ${split.length} split into new profiles)`,
    );
  } else {
    fail(
      "an intake claim type has been dropped",
      `${dropped.join("\n")}\n\n` +
        `Reuse the id, or name it in existingClaimTypeId on the profile that replaces it.`,
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
