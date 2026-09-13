/**
 * Every cited provision is vendored, and no not-in-force replacement is
 * undeclared or stale.
 *
 * COSTS NOTHING. Reads local files.
 *
 * WHY. e-Laws prints not-yet-in-force text inline, formatted identically to law
 * that is in force, marked only by a prose sentence beginning "On a day to be
 * named by order of the Lieutenant Governor in Council". Family Law Act s. 46
 * and Children's Law Reform Act s. 35 — both restraining-order powers — each
 * carry one. Citing the replacement would put law that does not yet exist in
 * front of someone asking about their safety.
 *
 * The three checks, in order of what they buy:
 *   1. Every cited provision is actually present in a vendored source. A check
 *      that cannot read the text cannot check the text.
 *   2. Any vendored provision containing the marker DECLARES a
 *      pendingReplacement. This is the one that catches a new amendment
 *      appearing on a refresh.
 *   3. A declared pendingReplacement has been re-checked within
 *      PENDING_REPLACEMENT_RECHECK_DAYS. It FAILS rather than warns: a named-day
 *      provision comes into force silently, and the failure mode is every check
 *      passing while the site cites repealed law.
 *
 * Run: node --import tsx scripts/verification/verifyCitedProvisions.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  STATUTORY_PROVISIONS,
  NOT_IN_FORCE_MARKER,
  PENDING_REPLACEMENT_RECHECK_DAYS,
  VENDORED_SOURCES,
  daysSinceLastChecked,
  type StatutoryProvision,
} from "../../src/lib/case-system/sources/statutoryProvisions";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const SOURCES_DIR = path.join(__dirname, "..", "..", "docs", "sources");

function readVendored(file: string): string {
  return readFileSync(path.join(SOURCES_DIR, file), "utf8");
}

/**
 * The vendored files are organised as labelled blocks:
 *
 *   ----------------------------------------------------------------------
 *   s. 46 — restraining order (CARRIES A NOT-IN-FORCE REPLACEMENT)
 *   ----------------------------------------------------------------------
 *
 *   46 (1) ...
 *
 * Split on the rule lines so each provision's text can be tested on its own.
 * Testing the whole file would let one declared pendingReplacement excuse an
 * undeclared one in a different section — the exact hole this check exists to
 * close.
 */
function blocksByLabel(file: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const parts = readVendored(file).split(/^-{40,}\s*$/m);

  for (let i = 1; i < parts.length; i += 1) {
    const label = parts[i]?.trim();
    const body = parts[i + 1];
    if (!label || body === undefined) continue;
    blocks.set(label, body);
  }

  return blocks;
}

const ALL_BLOCKS = new Map<string, Map<string, string>>(
  VENDORED_SOURCES.map((file) => [file, blocksByLabel(file)]),
);

function blockFor(provision: StatutoryProvision): string | undefined {
  const blocks = ALL_BLOCKS.get(provision.vendoredIn);
  if (!blocks) return undefined;

  for (const [label, body] of blocks) {
    if (label.startsWith(`${provision.section} `) || label === provision.section) {
      return body;
    }
  }

  return undefined;
}

function main(): void {
  const now = new Date();

  // ---- 1. Every cited provision is vendored ----

  for (const provision of STATUTORY_PROVISIONS) {
    const body = blockFor(provision);
    const label = `${provision.statute} ${provision.section}`;

    check(`[${label}] is present in ${provision.vendoredIn}`, body !== undefined);
    if (body === undefined) continue;

    check(`[${label}] has substantive text, not just a heading`, body.trim().length > 80);
    check(
      `[${label}] records a verification date`,
      /^\d{4}-\d{2}-\d{2}$/.test(provision.verifiedAt),
    );

    // consolidationPeriod is what the DOCUMENT says about itself, and it must
    // match the vendored file's own header — not a date someone typed from
    // memory. This is the check that would have caught the Occupiers'
    // Liability Act historical-version error.
    check(
      `[${label}] records a consolidation period`,
      /^\d{4}-\d{2}-\d{2}$/.test(provision.consolidationPeriod),
      provision.consolidationPeriod,
    );

    const header = readVendored(provision.vendoredIn).split("====")[0] ?? "";
    check(
      `[${label}] consolidation period matches the vendored file's header`,
      header.includes(provision.consolidationPeriod),
      `entry says ${provision.consolidationPeriod}; header reads: ${
        header.split("\n").find((line) => /consolidation/i.test(line))?.trim() ?? "(none)"
      }`,
    );

    check(
      `[${label}] is not sourced to a historical version`,
      !/HISTORICAL VERSION/i.test(header),
      "the vendored file's header declares a frozen historical consolidation",
    );
  }

  // ---- 2. No undeclared not-in-force replacement ----
  //
  // The direction that matters: text contains the marker => a declaration must
  // exist. A refresh that pulls in a NEW amendment fails here until someone
  // reads it and writes down what it changes.

  for (const provision of STATUTORY_PROVISIONS) {
    const body = blockFor(provision);
    if (body === undefined) continue;

    const label = `${provision.statute} ${provision.section}`;
    const carriesMarker = body.includes(NOT_IN_FORCE_MARKER);

    check(
      `[${label}] declares its not-in-force replacement if it has one`,
      !carriesMarker || provision.pendingReplacement !== undefined,
      carriesMarker
        ? `the vendored text contains "${NOT_IN_FORCE_MARKER}" but no pendingReplacement is declared`
        : undefined,
    );

    // And the reverse, so a declaration cannot outlive the thing it describes.
    // If the marker is gone, the amendment came into force and the vendored
    // text is stale law.
    check(
      `[${label}] does not declare a replacement the source no longer shows`,
      provision.pendingReplacement === undefined || carriesMarker,
      !carriesMarker && provision.pendingReplacement
        ? "pendingReplacement is declared but the source no longer carries the marker — " +
          "the amendment may now be IN FORCE and the vendored text stale"
        : undefined,
    );
  }

  // ---- 3. Declared replacements are re-checked, and staleness FAILS ----

  for (const provision of STATUTORY_PROVISIONS) {
    if (!provision.pendingReplacement) continue;

    const label = `${provision.statute} ${provision.section}`;
    const age = daysSinceLastChecked(provision, now);

    check(
      `[${label}] pending replacement re-checked within ${PENDING_REPLACEMENT_RECHECK_DAYS} days`,
      age !== null && age <= PENDING_REPLACEMENT_RECHECK_DAYS,
      `last checked ${provision.pendingReplacement.lastChecked} (${age} days ago). ` +
        `Re-fetch ${provision.sourceUrl} and confirm the "${NOT_IN_FORCE_MARKER}" note is ` +
        `still present. If it is gone, the amendment is IN FORCE: refresh the vendored ` +
        `section and remove the declaration.`,
    );

    check(
      `[${label}] says what the replacement would change`,
      provision.pendingReplacement.whatWouldChange.length > 40,
    );

    // "On a day to be named" means no date exists. A non-null date is only
    // legitimate once one has actually been proclaimed.
    const { inForceDate } = provision.pendingReplacement;
    check(
      `[${label}] records no invented in-force date`,
      inForceDate === null || /^\d{4}-\d{2}-\d{2}$/.test(inForceDate),
    );
  }

  // ---- The replacement text never reaches a user-facing registry ----
  //
  // Cheap, and it closes the loop: the point of all of the above is that the
  // future wording stays out of shipped content.

  const registry = readFileSync(
    path.join(__dirname, "..", "..", "src", "lib", "case-system", "family", "familyFormsRegistry.ts"),
    "utf8",
  );
  check(
    "the forms registry quotes no not-in-force text",
    !registry.includes(NOT_IN_FORCE_MARKER),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
