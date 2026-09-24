/**
 * The vendored corpus is complete, current, and actually on disk.
 *
 * COSTS NOTHING. Reads the vendored files. No network — `rules:check` is the
 * one that goes out, and it is a monthly job rather than a test.
 *
 * *** WHY THIS IS SEPARATE FROM rules:check ***
 *
 * `rules:check` answers "has the law moved". This answers "is what we vendored
 * usable" — that every declared source is present, that no file is a
 * historical snapshot, that the manifest matches the files beside it, and that
 * the corpus contains the provisions the stage map is about to be built on.
 *
 * The second question has to be answerable offline, on every run, because
 * everything downstream assumes it.
 *
 * Run: node --import tsx scripts/verification/verifyRulesCorpus.ts
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { CORPUS_SOURCES, sourceTier } from "../rules/corpusSources";
import { sha256, readManifest } from "../rules/fetchCorpus";
import { smallClaimsForms, formTitle } from "../../src/lib/content-library/smallClaimsForms";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_DIR = path.join(ROOT, "docs", "sources", "corpus");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

const manifest = readManifest();

if (!manifest) {
  fail("no manifest — run `npm run rules:fetch`");
  process.exitCode = 1;
} else {
  // -------------------------------------------------------------------------
  // 1. Every declared source is vendored
  // -------------------------------------------------------------------------
  {
    const missing = CORPUS_SOURCES.filter(
      (source) => !manifest.entries.some((entry) => entry.id === source.id),
    );

    if (missing.length === 0 && manifest.failures.length === 0) {
      pass(`all ${CORPUS_SOURCES.length} declared sources are vendored`);
    } else {
      fail(
        "a declared source is not in the corpus",
        [
          ...missing.map((s) => `  ${s.id} — not in the manifest`),
          ...manifest.failures.map((f) => `  ${f.id} — ${f.reason}`),
        ].join("\n") +
          "\nNothing may be written from memory to fill a gap here.",
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. No file is a historical snapshot
  // -------------------------------------------------------------------------
  {
    /*
     * The failure this exists for is real and reached users. The Occupiers'
     * Liability Act was cited from a `_eV006` document frozen seven weeks
     * before s. 6.1 came into force, so a slip-and-fall claim type told people
     * about the two-year limitation period and not the 60-day written notice
     * requirement that bars the action without it.
     *
     * A current consolidation says "TO THE E-LAWS CURRENCY DATE". A frozen one
     * says "HISTORICAL VERSION FOR THE PERIOD". The difference is one line.
     */
    const historical = manifest.entries.filter((entry) =>
      /HISTORICAL VERSION/i.test(entry.consolidation),
    );

    if (historical.length === 0) {
      pass("no vendored document is a historical snapshot");
    } else {
      fail(
        "a vendored document is a FROZEN historical version, not current law",
        historical.map((e) => `  ${e.id}: ${e.consolidation}`).join("\n"),
      );
    }

    // And the e-Laws documents must state a consolidation at all. A document
    // with no header is one whose currency nobody can check.
    const elaws = CORPUS_SOURCES.filter((s) => s.format === "elaws-doc").map((s) => s.id);
    const silent = manifest.entries.filter(
      (entry) => elaws.includes(entry.id) && entry.consolidation === "(none stated)",
    );

    if (silent.length === 0) {
      pass("every e-Laws document states its consolidation period");
    } else {
      fail("an e-Laws document states no consolidation", silent.map((e) => `  ${e.id}`).join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 3. The manifest matches the files beside it
  // -------------------------------------------------------------------------
  {
    const drifted: string[] = [];

    for (const entry of manifest.entries) {
      const file = path.join(CORPUS_DIR, entry.file);
      if (!existsSync(file)) {
        drifted.push(`  ${entry.id} — ${entry.file} is missing`);
        continue;
      }
      const actual = sha256(readFileSync(file, "utf8"));
      if (actual !== entry.sha256) {
        drifted.push(`  ${entry.id} — file hash ${actual.slice(0, 12)} ≠ manifest ${entry.sha256.slice(0, 12)}`);
      }
    }

    if (drifted.length === 0) {
      pass(`all ${manifest.entries.length} vendored files match their manifest hash`);
    } else {
      fail(
        "a vendored file has been edited since it was fetched",
        `${drifted.join("\n")}\nThe corpus is a record of what the source said, not a document to edit.`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. The corpus holds the provisions the stage map needs
  // -------------------------------------------------------------------------
  {
    /*
     * A maintained list, which CLAUDE.md §5 permits. Each entry is a provision
     * the stage map is built on, so its absence means a stage cannot be
     * sourced — a far more useful failure than "the file got shorter".
     */
    const REQUIRED: Array<{ source: string; probe: RegExp; what: string }> = [
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}7\.01\s/m, what: "r. 7.01 — commencing an action" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}8\.01\s/m, what: "r. 8.01 — service of the claim" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}9\.01\s/m, what: "r. 9.01 — the defence" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}11\.01\s/m, what: "r. 11.01 — noting in default" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}11\.06\s/m, what: "r. 11.06 — setting aside default" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}13\.01\s/m, what: "r. 13.01 — settlement conference" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}17\.0/m, what: "r. 17 — trial" },
      { source: "oreg-258-98-small-claims-rules", probe: /^\s{0,8}20\.0/m, what: "r. 20 — enforcement" },
      { source: "oreg-626-00-monetary-jurisdiction", probe: /\$50,000/, what: "the $50,000 monetary limit" },
      { source: "oreg-626-00-monetary-jurisdiction", probe: /O\.\s*Reg\.\s*42\/25/, what: "the O. Reg. 42/25 credit line" },
      { source: "limitations-act-2002", probe: /basic limitation period/i, what: "the basic limitation period" },
      { source: "legislation-act-2006", probe: /holiday/i, what: "the holiday definition, for day counting" },
      { source: "cja-courts-of-justice-act", probe: /Small Claims Court/, what: "the Small Claims Court provisions" },
    ];

    const absent: string[] = [];

    for (const { source, probe, what } of REQUIRED) {
      const entry = manifest.entries.find((candidate) => candidate.id === source);
      if (!entry) {
        absent.push(`  ${what} — source ${source} not vendored`);
        continue;
      }
      const text = readFileSync(path.join(CORPUS_DIR, entry.file), "utf8");
      if (!probe.test(text)) absent.push(`  ${what} — not found in ${source}`);
    }

    if (absent.length === 0) {
      pass(`all ${REQUIRED.length} provisions the stage map needs are in the corpus`);
    } else {
      fail("a provision the stage map is built on is not in the corpus", absent.join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 5. The forms table parses, and names forms the way the court does
  // -------------------------------------------------------------------------
  {
    const forms = smallClaimsForms();

    if (forms.length >= 40) {
      pass(`the forms table parses to ${forms.length} forms`);
    } else {
      fail(`the forms table parsed to only ${forms.length} forms — the extraction has drifted`);
    }

    /*
     * Spot checks against forms the content actually names. 14A is the
     * instructive one: it is "Offer to Settle" in Small Claims and "Statement
     * of Claim" in Civil, which is why form ids in the content inventory carry
     * the court path.
     */
    const EXPECTED: Array<[string, string]> = [
      ["7A", "Plaintiff's Claim"],
      ["9A", "Defence"],
      ["10A", "Defendant's Claim"],
      ["14A", "Offer to Settle"],
      ["20A", "Certificate of Judgment"],
      ["1A", "Additional Parties"],
    ];

    const wrong = EXPECTED.filter(([number, title]) => formTitle(number) !== title).map(
      ([number, title]) => `  Form ${number}: expected "${title}", table says "${formTitle(number) ?? "(absent)"}"`,
    );

    if (wrong.length === 0) {
      pass(`${EXPECTED.length} spot-checked forms carry the court's own titles`);
    } else {
      fail("a form's title does not match the court's table", wrong.join("\n"));
    }

    // A form number the court does not have must resolve to nothing, or the
    // lookup would validate an invented form.
    if (formTitle("99Z") === null) {
      pass("an unknown form number resolves to nothing");
    } else {
      fail("an invented form number resolved to a title");
    }
  }

  // -------------------------------------------------------------------------
  // 6. Both tiers are present, and the practical sources carry real content
  // -------------------------------------------------------------------------
  {
    const byTier = { legislation: 0, practical: 0 };
    for (const source of CORPUS_SOURCES) byTier[sourceTier(source)] += 1;

    if (byTier.legislation >= 5 && byTier.practical >= 8) {
      pass(
        `both tiers are vendored: ${byTier.legislation} legislation, ${byTier.practical} practical`,
      );
    } else {
      fail(
        `tier counts are ${byTier.legislation} legislation / ${byTier.practical} practical`,
        "The practical layer -- fees, online filing, what to bring -- cannot be\n" +
          "written without its own sources. None of it is in the regulation.",
      );
    }

    /*
     * A practical source is a live web page, and the extractor strips nav,
     * header, footer and aside. If a site restructures so that real content
     * sits inside one of those, the vendored file becomes boilerplate -- and
     * a block citing it would point at a page whose words we no longer hold.
     *
     * Each source declares substantive markers for exactly this. Asserted
     * again here, offline, because the fetch-time check only runs when
     * someone re-fetches.
     */
    const hollow: string[] = [];
    for (const source of CORPUS_SOURCES) {
      if (sourceTier(source) !== "practical") continue;
      const entry = manifest.entries.find((candidate) => candidate.id === source.id);
      if (!entry) continue;
      const text = readFileSync(path.join(CORPUS_DIR, entry.file), "utf8").toUpperCase();
      const absent = source.mustContain.filter(
        (marker) => !text.includes(marker.toUpperCase()),
      );
      if (absent.length > 0) hollow.push(`  ${source.id} — missing: ${absent.join("; ")}`);
    }

    if (hollow.length === 0) {
      pass(`every practical source's vendored text carries its substantive markers`);
    } else {
      fail(
        "a practical source vendored as boilerplate — the extractor stripped its content",
        hollow.join("\n"),
      );
    }
  }

  console.log("");
  console.log(
    `Corpus: ${manifest.entries.length} sources, ` +
      `${manifest.entries.reduce((total, entry) => total + entry.characters, 0).toLocaleString()} characters, ` +
      `vendored ${manifest.generatedAt.slice(0, 10)}.`,
  );
  console.log("");
  console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
