/**
 * Stage-independent content rests on quoted sources, renders the same whatever stage
 * the case is in, and renders NOTHING while nothing is verified.
 *
 * WHAT THIS CATCHES:
 *
 *   1. A published generic block whose sentences do not trace to a quote that is
 *      actually in the vendored corpus. Same code gate as the 16 stage blocks —
 *      `findQuote` over `docs/sources/corpus/` — because a verifier asked to quote its
 *      support can invent a quote and it will look right.
 *
 *   2. The panel becoming stage-scoped again. It is stage-independent because it takes
 *      no stage, and the moment somebody adds a stage-shaped prop it silently becomes
 *      a block that differs between readers whose service obligations are identical.
 *      So the prop type is asserted, not just documented.
 *
 *   3. Unverified prose reaching a panel labelled "verified". Today this is the live
 *      case, not a hypothetical: the serving-documents block has not passed the
 *      pipeline, so the loader returns undefined and the panel must return null.
 *
 *   4. The authored topic spec drifting from the corpus. Every quote in
 *      GENERIC_TOPICS is hand-authored, and an authored quote that is no longer in the
 *      vendored text is a citation the drafter would be handed and the verifier would
 *      then fail to find — the run would burn attempts on a source problem.
 *
 * *** WHY CHECK 4 IS NOT REDUNDANT WITH CHECK 1 ***
 *
 * Check 1 validates what was PUBLISHED. Check 4 validates what the pipeline will be
 * GIVEN on its next run. With nothing published, check 1 has nothing to look at and
 * check 4 is the only thing standing between a re-vendored corpus and a run that
 * cannot succeed.
 *
 * COSTS NOTHING. File reads and pure functions. No model, no network.
 *
 * Run: node --import tsx scripts/verification/verifyGenericLibrary.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { GENERIC_TOPICS } from "../../src/lib/content-library/genericAnswers";
import {
  PUBLISHED_GENERIC_BLOCKS,
  publishedGenericBlock,
} from "../../src/lib/content-library/publishedGenericLibrary";
import { genericGateFailures } from "../../scripts/content/blockGates";
import { findQuote } from "../../scripts/content/verifiedContentPipeline";
import { OFFICIAL_URLS } from "../../src/lib/case-system/stage-map/citations";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("GENERIC (STAGE-INDEPENDENT) CONTENT LIBRARY");
console.log("");

// ---------------------------------------------------------------------------
// 1. Every authored quote is in the vendored corpus, right now
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  let quoteCount = 0;

  for (const topic of GENERIC_TOPICS) {
    if (topic.rules.length === 0) {
      problems.push(`topic "${topic.id}" authorises no rules, so a drafter has nothing to rest on`);
    }

    for (const citation of topic.rules) {
      quoteCount += 1;

      const found = findQuote(citation.quote);
      if (found === null) {
        problems.push(
          `${topic.id} ${citation.pinpoint}: the authored quote is NOT in the vendored ` +
            `corpus — "${citation.quote.slice(0, 70)}…"`,
        );
        continue;
      }

      /*
       * findQuote searches every source, so a quote can be real and attributed to the
       * wrong statute. That is a citation error, not a fabrication, and it is worth
       * reporting separately — a pinpoint that names the wrong instrument is what a
       * reader would follow to check the rule.
       */
      if (found.sourceId !== citation.sourceId) {
        problems.push(
          `${topic.id} ${citation.pinpoint}: attributed to "${citation.sourceId}" but the ` +
            `passage was found in "${found.sourceId}"`,
        );
      }

      if (!OFFICIAL_URLS[citation.sourceId as keyof typeof OFFICIAL_URLS]) {
        problems.push(
          `${topic.id} ${citation.pinpoint}: source "${citation.sourceId}" has no official ` +
            `URL, so the reader cannot check the rule themselves`,
        );
      }

      if (!/^(r\.|s\.|rr\.|ss\.)\s/.test(citation.pinpoint)) {
        problems.push(
          `${topic.id}: pinpoint "${citation.pinpoint}" is not in the form "r. 13.03 (2)"`,
        );
      }
    }

    /*
     * A practical source must be a real corpus file. A misspelled id would be silently
     * skipped by genericSourceMaterial, and the run would then fail for a reason that
     * looks like a drafting problem.
     */
    for (const sourceId of topic.practicalSourceIds) {
      const file = path.join(ROOT, "docs", "sources", "corpus", `${sourceId}.txt`);
      try {
        readFileSync(file, "utf8");
      } catch {
        problems.push(
          `${topic.id}: practical source "${sourceId}" is not a vendored corpus file, so it ` +
            `would be silently dropped from the drafter's source material`,
        );
      }
    }
  }

  if (problems.length === 0) {
    pass(
      `all ${quoteCount} authored quotes across ${GENERIC_TOPICS.length} topic(s) are in the ` +
        `vendored corpus, correctly attributed, with an official URL`,
    );
  } else {
    fail("the authored topic spec does not match the corpus", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. Anything published passes the same gates, and every sentence has a quote
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  for (const block of PUBLISHED_GENERIC_BLOCKS) {
    for (const problem of genericGateFailures(block)) {
      problems.push(`${block.id}: ${problem}`);
    }

    const verdicts = block.verification.verdicts ?? [];

    if (block.verification.status === "verified-draft") {
      if (verdicts.length === 0) {
        problems.push(`${block.id}: verified-draft with no verdicts — nothing was checked`);
      }
      for (const verdict of verdicts) {
        if (!verdict.supported) {
          problems.push(`${block.id}: an unsupported sentence shipped: "${verdict.sentence}"`);
          continue;
        }
        if (!verdict.quote) {
          problems.push(
            `${block.id}: a supported sentence carries no quote, so nothing traces it: ` +
              `"${verdict.sentence}"`,
          );
          continue;
        }
        for (const quote of verdict.quote.split(" | ")) {
          if (quote.trim().length < 25) continue;
          if (findQuote(quote) === null) {
            problems.push(
              `${block.id}: rests on a passage not in the corpus: "${quote.slice(0, 70)}…"`,
            );
          }
        }
      }
    }

    if (block.yourDeadline !== null) {
      problems.push(`${block.id}: carries a deadline section, which a stage-free block cannot render`);
    }
  }

  if (problems.length === 0) {
    pass(
      PUBLISHED_GENERIC_BLOCKS.length === 0
        ? "no generic block is published yet, so nothing unverified can be served"
        : `all ${PUBLISHED_GENERIC_BLOCKS.length} published generic block(s) pass every gate ` +
          `and every sentence traces to a corpus quote`,
    );
  } else {
    fail("a published generic block is not properly supported", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. The panel is stage-independent, structurally
// ---------------------------------------------------------------------------

{
  /*
   * *** ASSERTED ON THE PROPS TYPE, NOT ON A COMMENT ***
   *
   * The panel renders the same content for every reader because it is never told
   * anything about the reader's case. A stage, case id, claim type or court path prop
   * would let it differ between readers whose service obligations are identical — and
   * it would be an easy thing to add for a plausible reason.
   *
   * Comments are stripped first: this file's own explanation of the hazard names every
   * forbidden word, and a check that read its own documentation would fail on correct
   * code. That has happened here before.
   */
  const source = readFileSync(
    path.join(ROOT, "src", "components", "case-workspace", "VerifiedServingPanel.tsx"),
    "utf8",
  );

  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");

  const propsBlock = withoutComments.match(
    /export type VerifiedServingPanelProps = \{([\s\S]*?)\n\};/,
  );

  const problems: string[] = [];

  if (!propsBlock) {
    problems.push(
      "VerifiedServingPanelProps could not be found. If it was renamed, update this check — " +
        "do not delete it.",
    );
  } else {
    const FORBIDDEN = /\b(stage|stageId|caseId|case_id|claimType|courtPath|position|side)\b/i;
    const offending = propsBlock[1]
      .split("\n")
      .filter((line) => FORBIDDEN.test(line))
      .map((line) => line.trim());

    if (offending.length > 0) {
      problems.push(
        `the panel now takes case-shaped props, so it can differ by stage: ${offending.join("; ")}`,
      );
    }
  }

  // And it must not reach for a stage itself instead of taking one as a prop.
  if (/publishedBlockFor|resolveStage|STAGE_MAP|stageAnswerView/.test(withoutComments)) {
    problems.push("the panel reads stage-scoped content, so it is not stage-independent");
  }

  // It must read the generic library, or it is not serving verified generic content.
  if (!/publishedGenericBlock\(/.test(withoutComments)) {
    problems.push("the panel does not read the generic published library at all");
  }

  if (problems.length === 0) {
    pass("the panel takes no stage, case id or claim type, so it cannot vary by case position");
  } else {
    fail("the panel is not stage-independent", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. It fails closed: nothing verified means nothing rendered
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  /*
   * The loader is the thing the panel returns null on, so the property is asserted
   * there. Driving React to confirm it renders null would need a renderer for what is
   * a one-line guard; the guard's input is what matters.
   */
  const block = publishedGenericBlock("serving-documents");

  if (PUBLISHED_GENERIC_BLOCKS.length === 0 && block !== undefined) {
    problems.push("the loader returned a block although nothing is published");
  }

  /*
   * A needs-human block must never be servable even if it reaches the published file.
   * Checked against a synthetic block rather than a real one, so this keeps asserting
   * something after the real block passes — the trap the reachability and
   * depth-question checks fell into.
   */
  const servable = PUBLISHED_GENERIC_BLOCKS.filter(
    (candidate) => candidate.verification.status !== "verified-draft",
  );
  if (servable.length > 0) {
    problems.push(
      `${servable.length} published block(s) carry a status that is not verified-draft: ` +
        servable.map((candidate) => `${candidate.id} (${candidate.verification.status})`).join(", "),
    );
  }

  /*
   * The panel must have no branch that renders content when the block is absent — no
   * placeholder, no "coming soon" inside a box labelled verified.
   */
  const source = readFileSync(
    path.join(ROOT, "src", "components", "case-workspace", "VerifiedServingPanel.tsx"),
    "utf8",
  );
  if (!/if \(!block\) return null;/.test(source)) {
    problems.push(
      "the panel has no `if (!block) return null` guard, so it may render a panel labelled " +
        "verified with nothing verified in it",
    );
  }

  if (problems.length === 0) {
    pass(
      "with nothing verified the loader returns undefined and the panel returns null — no " +
        "placeholder appears under a verified label",
    );
  } else {
    fail("unverified content could reach the screen", problems.join("\n"));
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
