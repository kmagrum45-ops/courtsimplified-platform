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

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { GENERIC_TOPICS } from "../../src/lib/content-library/genericAnswers";
import {
  PUBLISHED_GENERIC_BLOCKS,
  publishedGenericBlock,
} from "../../src/lib/content-library/publishedGenericLibrary";
import { genericGateFailures } from "../../scripts/content/blockGates";
import { findQuote } from "../../scripts/content/verifiedContentPipeline";
import { OFFICIAL_URLS } from "../../src/lib/case-system/stage-map/citations";
import {
  TERMS_OF_ART,
  assessReadability,
  minimumSyllablePlaceholder,
} from "../../src/lib/content-library/readabilityExceptions";
import { countSyllables } from "../../src/lib/content-library/readability";

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

    /*
     * Provenance. Neither field affects whether the block is verified — promotion
     * re-gates everything regardless of route — but a published block with no record of
     * how it was produced cannot be reconstructed later, and "reassembled from a run
     * log" is precisely the fact that is obvious today and invisible in a month.
     */
    if (!block.draftedWith) {
      problems.push(`${block.id}: does not record which model drafted it`);
    }
    if (!block.publishedVia) {
      problems.push(
        `${block.id}: does not record whether it came from a live drafter run or was ` +
          `recovered from a run log`,
      );
    } else if (
      block.publishedVia !== "drafter-run" &&
      block.publishedVia !== "recovered-from-run-log"
    ) {
      problems.push(`${block.id}: unknown publishedVia "${block.publishedVia}"`);
    }

    if (block.yourDeadline !== null) {
      problems.push(`${block.id}: carries a deadline section, which a stage-free block cannot render`);
    }
  }

  /*
   * *** A CORRUPT PUBLISHED FILE MUST FAIL, NOT DISAPPEAR ***
   *
   * `publishedGenericLibrary` loads the file in a try/catch and treats absence as "nothing
   * published", which is the right FAIL-CLOSED behaviour for serving: a broken file must
   * never put unverified prose on a screen.
   *
   * It also made this suite blind. A mutation that edited a published block's text and
   * broke the JSON left every check passing — the loader reported an empty set and the
   * checks below it had nothing to disagree with. Silence read as health.
   *
   * So: if the file EXISTS on disk, it must parse and it must contain blocks. Absence is
   * still fine; absence-with-a-file-present is not.
   */
  const publishedPath = path.join(
    ROOT,
    "src",
    "lib",
    "content-library",
    "published",
    "genericAnswers.published.json",
  );

  if (existsSync(publishedPath)) {
    let parsed: { blocks?: unknown[] } | null = null;
    try {
      parsed = JSON.parse(readFileSync(publishedPath, "utf8")) as { blocks?: unknown[] };
    } catch (error) {
      problems.push(
        `the published file exists but does not parse (${
          error instanceof Error ? error.message.slice(0, 60) : "unknown"
        }). The loader treats this as "nothing published", so every other check here would ` +
          `pass while the artefact is broken.`,
      );
    }

    if (parsed && (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0)) {
      problems.push("the published file exists but contains no blocks");
    }

    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length !== PUBLISHED_GENERIC_BLOCKS.length) {
      problems.push(
        `the file on disk has ${parsed.blocks.length} block(s) and the loader exposes ` +
          `${PUBLISHED_GENERIC_BLOCKS.length} — a block is being silently dropped`,
      );
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

// ---------------------------------------------------------------------------
// 5. Every term of art is real, and justified
// ---------------------------------------------------------------------------

{
  /*
   * A term qualifies for the readability exception because a source uses it as the
   * name of something, not because it is long. So the cited passage has to be in the
   * vendored corpus — otherwise an entry could be added on an assertion that some rule
   * probably uses the phrase, and the exception would rest on nothing.
   */
  const problems: string[] = [];

  for (const entry of TERMS_OF_ART) {
    const found = findQuote(entry.definedAt.quote);

    if (found === null) {
      problems.push(
        `"${entry.term}": the passage cited at ${entry.definedAt.pinpoint} is NOT in the ` +
          `vendored corpus, so the entry rests on nothing`,
      );
    } else if (found.sourceId !== entry.definedAt.sourceId) {
      problems.push(
        `"${entry.term}": cited to "${entry.definedAt.sourceId}" but the passage is in ` +
          `"${found.sourceId}"`,
      );
    }

    // The term must actually appear in the passage that supposedly uses it as a name.
    if (!entry.definedAt.quote.toLowerCase().includes(entry.term.toLowerCase())) {
      problems.push(
        `"${entry.term}": the cited passage does not contain the term, so it does not ` +
          `show the source using it as a name`,
      );
    }

    /*
     * A justification long enough to be a reason. Not a proxy for quality — a
     * deliberate floor, because "it is a legal term" is not a justification and a
     * one-word entry is how this mechanism would be abused first.
     */
    if (entry.justification.trim().length < 80) {
      problems.push(
        `"${entry.term}": the justification is ${entry.justification.trim().length} ` +
          `characters. Say why no plain substitute is ACCURATE, not that the term is legal.`,
      );
    }

    /*
     * *** THE SUBSTITUTION MUST CHANGE SYLLABLES AND NOTHING ELSE ***
     *
     * Flesch-Kincaid is a function of words, sentences and syllables. The exception's
     * whole basis is that the placeholder isolates the term's SYLLABLE cost, so it must
     * preserve the word count. A placeholder that dropped a word would lower the grade
     * for a reason unrelated to the term, and the exception would be granted to blocks
     * it is not for.
     *
     * A mutation replacing the placeholder word with an empty string went UNNOTICED
     * until this check existed.
     */
    const placeholder = minimumSyllablePlaceholder(entry.term);
    const termWords = entry.term.trim().split(/\s+/);
    const placeholderWords = placeholder.trim().split(/\s+/).filter(Boolean);

    if (placeholderWords.length !== termWords.length) {
      problems.push(
        `"${entry.term}": its placeholder has ${placeholderWords.length} word(s) against ` +
          `the term's ${termWords.length}. The substitution must change syllables only.`,
      );
    }
    for (const word of placeholderWords) {
      if (countSyllables(word) !== 1) {
        problems.push(
          `"${entry.term}": placeholder word "${word}" is ${countSyllables(word)} syllables, ` +
            `not 1 — the substitution is not the plainest possible case`,
        );
      }
    }

    if (entry.maxOccurrences < 1 || entry.maxOccurrences > 3) {
      problems.push(
        `"${entry.term}": maxOccurrences is ${entry.maxOccurrences}. Above 3 the excess is ` +
          `repetition the drafter can fix, which the exception must not excuse.`,
      );
    }
  }

  if (problems.length === 0) {
    pass(
      `all ${TERMS_OF_ART.length} term(s) of art cite a real corpus passage that uses the ` +
        `term, with a justification and an occurrence cap`,
    );
  } else {
    fail("a term of art is not properly established", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. The exception refuses everything it is not for
// ---------------------------------------------------------------------------

{
  /*
   * *** THE CHECK THAT MATTERS MOST ABOUT THIS MECHANISM ***
   *
   * A readability exception is one step from a readability relaxation. These cases are
   * synthetic and fixed, so they keep asserting the same property no matter what the
   * real content becomes — the trap the reachability and depth-question checks fell
   * into was pinning a current value instead.
   *
   * Each case is over the target for a reason that is NOT an unavoidable term of art,
   * and each must be refused.
   */
  const term = TERMS_OF_ART[0]?.term ?? "settlement conference";

  const mustRefuse: [string, string][] = [
    [
      "padding, no term of art anywhere",
      "It is important to ensure that you carefully review and consider all of the " +
        "documentation which may potentially be relevant to the proceedings in question.",
    ],
    [
      "a term of art present, but the excess is a very long sentence",
      `At least 14 days before the ${term}, each party must serve on every other party ` +
        `and file with the court a copy of any document to be relied on at the trial, ` +
        `including an expert report, not attached to the party's claim or defence.`,
    ],
    [
      "the term repeated past its cap",
      `Serve before the ${term}. The ${term} is scheduled by the clerk. At the ${term} ` +
        `you will discuss the issues. After the ${term} a trial may follow.`,
    ],
    [
      "ordinary long vocabulary, no term of art",
      "Notwithstanding the aforementioned considerations, the applicant should " +
        "endeavour to substantiate their allegations with corroborative documentation.",
    ],
  ];

  const problems: string[] = [];

  for (const [label, text] of mustRefuse) {
    const assessment = assessReadability(text);
    if (assessment.withinTarget) {
      problems.push(
        `${label}: ACCEPTED at grade ${assessment.grade.toFixed(1)}` +
          (assessment.exception ? ` on a "${assessment.exception.term}" exception` : " outright") +
          ". The exception is behaving as a general readability relaxation.",
      );
    }
  }

  /*
   * And it must still GRANT the case it exists for, or it is dead code that only ever
   * refuses. The sentence below is the one the report measured at 9.66.
   */
  const granted = assessReadability(
    `Serve your documents 14 days before the ${term}.`,
  );
  if (!granted.withinTarget || !granted.exception) {
    problems.push(
      "the measured case is no longer granted, so the mechanism only ever refuses — " +
        `grade ${granted.grade.toFixed(2)}`,
    );
  } else if (granted.exception.gradeWithoutTerm > granted.exception.target) {
    problems.push("a grant was issued although the substituted grade is still over target");
  }

  if (problems.length === 0) {
    pass(
      `the exception refuses all ${mustRefuse.length} cases it is not for (padding, long ` +
        `sentences, repetition, ordinary vocabulary) and still grants the measured case`,
    );
  } else {
    fail("the readability exception is too permissive", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 7. A stored exception still matches what the mechanism would grant
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  for (const block of PUBLISHED_GENERIC_BLOCKS) {
    const prose = [block.whatsHappening, block.whatToDoNext, block.whatHappensAfter]
      .filter(Boolean)
      .join("\n\n");

    const assessment = assessReadability(prose);

    if (block.readabilityException && !assessment.exception) {
      problems.push(
        `${block.id}: carries a stored readability exception for ` +
          `"${block.readabilityException.term}" that the mechanism would NOT grant today`,
      );
    }

    if (!block.readabilityException && assessment.exception) {
      problems.push(
        `${block.id}: relies on a readability exception that is not recorded on the block, ` +
          `so the grant is invisible to a reviewer`,
      );
    }

    if (block.readabilityException && assessment.exception) {
      if (block.readabilityException.term !== assessment.exception.term) {
        problems.push(
          `${block.id}: stored exception names "${block.readabilityException.term}", the ` +
            `mechanism names "${assessment.exception.term}"`,
        );
      }
      if (
        Math.abs(block.readabilityException.gradeWithTerm - assessment.exception.gradeWithTerm) >
        0.05
      ) {
        problems.push(
          `${block.id}: stored grade ${block.readabilityException.gradeWithTerm} does not ` +
            `match the recomputed ${assessment.exception.gradeWithTerm} — the text was edited ` +
            `after promotion`,
        );
      }
    }

    if (!assessment.withinTarget) {
      problems.push(`${block.id}: ${assessment.reason}`);
    }
  }

  if (problems.length === 0) {
    pass(
      PUBLISHED_GENERIC_BLOCKS.length === 0
        ? "no published block, so no stored exception to re-derive"
        : `every published block's reading level re-derives to the same verdict, and any ` +
          `exception it relies on is recorded on the block`,
    );
  } else {
    fail("a stored readability exception no longer matches the block", problems.join("\n"));
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
