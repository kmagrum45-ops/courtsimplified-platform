/**
 * Does the stage map hold up?
 *
 *   npm run test:stage-map
 *
 * *** WHAT THIS EXISTS TO CATCH ***
 *
 * A stage map is a list of assertions about Ontario procedure, written by
 * someone who could be wrong or could be working from memory. Three failures
 * matter, and each has its own check group:
 *
 *   1. A citation that was recalled rather than read. Every quote is looked up
 *      in the vendored corpus. A rule number that does not exist, a subsection
 *      that says something else, a half-remembered deadline — all fail here.
 *
 *   2. A stage nothing can be told apart from. Part 0's eight-of-ten failure
 *      was not only bad detection; it was a taxonomy with no recorded
 *      boundaries. Every real stage must name at least one neighbour and how
 *      it differs, and every named neighbour must exist.
 *
 *   3. Coverage gaps. Both sides, the five things-went-wrong situations the
 *      brief names, the three pre-suit notice deadlines, and the two special
 *      stages.
 *
 * *** THESE ARE PROPERTIES, NOT TODAY'S VALUES ***
 *
 * Per CLAUDE.md: a check must fail on a regression, never on the work we want
 * done. Nothing here pins a stage count, a citation count or a specific id
 * list beyond the ones the brief itself names. Adding a stage, adding a
 * citation or splitting a position passes; removing a boundary, inventing a
 * quote or dropping a side fails.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  CASE_STAGES,
  claimBarringDeadlines,
  isSpecialStage,
  type CaseStage,
} from "../../src/lib/case-system/stage-map/stageMap";
import {
  OFFICIAL_URLS,
  SOURCE_NAMES,
  type CorpusSourceId,
  type RuleCitation,
} from "../../src/lib/case-system/stage-map/citations";
import * as CITATIONS from "../../src/lib/case-system/stage-map/citations";
import {
  UNKNOWN_STAGE_MESSAGE,
  OUT_OF_SCOPE_STAGE_MESSAGE,
  STAGE_REFERRALS,
  clarifyingQuestionsFor,
} from "../../src/lib/case-system/stage-map/stageMessages";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_DIR = path.join(ROOT, "docs", "sources", "corpus");

const failures: string[] = [];
const notes: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

/** antiword pads words apart and hard-wraps. Compare on collapsed whitespace. */
const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// 1. Every quote is in the corpus
// ---------------------------------------------------------------------------

const corpus = new Map<string, string>();
for (const file of readdirSync(CORPUS_DIR)) {
  if (file.endsWith(".txt")) {
    corpus.set(file.replace(/\.txt$/, ""), flat(readFileSync(path.join(CORPUS_DIR, file), "utf8")));
  }
}

/*
 * EVERY exported citation, not only the ones a stage reaches.
 *
 * The first version of this walked the stage map, which left the holiday and
 * computation citations unchecked the moment the deadline engine started using
 * them directly — quoted rule text, in the module that decides dates, with
 * nothing reading it back out of the source. Checking the citations module
 * itself closes that by construction: a citation cannot be written anywhere in
 * this codebase without being verified, because there is nowhere else to put
 * one.
 */
const allCitations = Object.values(CITATIONS).filter(
  (value): value is RuleCitation =>
    typeof value === "object" &&
    value !== null &&
    "quote" in value &&
    "pinpoint" in value &&
    "sourceId" in value,
);

const reachedByStages = new Set(
  CASE_STAGES.flatMap((stage) => [
    ...stage.rules,
    ...stage.deadlines.flatMap((d) => [d.rule, d.computation, ...d.exceptions]),
  ]).map((c) => `${c.sourceId} ${c.pinpoint}`),
);

let quotesChecked = 0;
for (const citation of allCitations) {
  const text = corpus.get(citation.sourceId);
  if (!text) {
    fail(`${citation.pinpoint}: no vendored corpus file for "${citation.sourceId}". Run npm run rules:fetch.`);
    continue;
  }

  // A quote may skip material with " ... ". Each run is checked separately,
  // so an ellipsis cannot be used to stitch together text that is not there.
  for (const run of citation.quote.split(" ... ")) {
    quotesChecked += 1;
    if (!text.includes(flat(run))) {
      fail(
        `${citation.pinpoint} (${citation.sourceId}): quoted text is NOT in the vendored source.\n` +
          `      looked for: ${flat(run).slice(0, 120)}`,
      );
    }
  }

  if (!OFFICIAL_URLS[citation.sourceId as CorpusSourceId]) {
    fail(`${citation.pinpoint}: no official URL recorded for "${citation.sourceId}".`);
  }
  if (!SOURCE_NAMES[citation.sourceId as CorpusSourceId]) {
    fail(`${citation.pinpoint}: no user-facing source name for "${citation.sourceId}".`);
  }
}

// ---------------------------------------------------------------------------
// 2. Structure: ids, boundaries, and that boundaries point somewhere real
// ---------------------------------------------------------------------------

const ids = new Set<string>();
for (const stage of CASE_STAGES) {
  if (ids.has(stage.id)) fail(`duplicate stage id: ${stage.id}`);
  ids.add(stage.id);
}

for (const stage of CASE_STAGES) {
  if (isSpecialStage(stage.id)) continue;

  if (stage.distinguishedFrom.length === 0) {
    fail(
      `${stage.id}: records no boundary. A stage nothing can be told apart from is ` +
        `a stage a classifier will guess at — this is the Part 0 failure mode.`,
    );
  }

  for (const boundary of stage.distinguishedFrom) {
    if (!ids.has(boundary.stage)) {
      fail(`${stage.id}: distinguished from "${boundary.stage}", which is not a stage.`);
    }
    if (boundary.stage === stage.id) {
      fail(`${stage.id}: distinguished from itself.`);
    }
    if (boundary.by.trim().length < 12) {
      fail(`${stage.id}: the boundary against ${boundary.stage} says nothing useful.`);
    }
  }

  if (stage.cues.length === 0) {
    fail(`${stage.id}: no cues, so nothing can route to it.`);
  }
  if (!stage.userQuestion.trim().endsWith("?") && !stage.userQuestion.trim().endsWith(".")) {
    fail(`${stage.id}: userQuestion should be the question a person actually asks.`);
  }
}

// ---------------------------------------------------------------------------
// 3. Deadlines: counted under a regime, and bars carry their exceptions
// ---------------------------------------------------------------------------

for (const stage of CASE_STAGES) {
  for (const deadline of stage.deadlines) {
    if (deadline.regime === "small-claims-rules") {
      // The rules regime means "counted under court rules, Saturday a holiday".
      // A Small Claims appeal is started under the Rules of Civil Procedure
      // (r. 61.04), whose holiday definition (r. 1.03) is word-for-word the Small
      // Claims one (r. 1.02), so either rules' computation provision is correct.
      const RULES_SOURCES = ["oreg-258-98-small-claims-rules", "rules-of-civil-procedure"];
      if (!RULES_SOURCES.includes(deadline.computation.sourceId)) {
        fail(
          `${deadline.id}: counted under the Small Claims rules but the computation ` +
            `provision comes from ${deadline.computation.sourceId}.`,
        );
      }
    } else if (deadline.computation.sourceId !== "legislation-act-2006") {
      fail(
        `${deadline.id}: a statutory period must be counted under the Legislation ` +
          `Act, not ${deadline.computation.sourceId}. r. 3.01 counts time for "these ` +
          `rules" and does not reach a statute.`,
      );
    }

    /*
     * A deadline that BARS the claim must carry its exceptions.
     *
     * All three notice provisions say failure is not a bar where the injured
     * person died, or where a judge finds a reasonable excuse and no
     * prejudice. Stating the bar without them would frighten someone out of a
     * claim they still have — which is its own kind of wrong answer, and one
     * nobody would ever complain about, because the person simply goes away.
     */
    if (deadline.consequence === "bars-the-claim" && deadline.exceptions.length === 0) {
      fail(
        `${deadline.id}: bars the claim but records no exception. Check the statute — ` +
          `if there genuinely is none, say so here in a comment.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Coverage the brief requires
// ---------------------------------------------------------------------------

const has = (id: string) => ids.has(id);

for (const side of ["plaintiff", "defendant", "both"] as const) {
  const count = CASE_STAGES.filter((stage) => stage.side === side).length;
  if (count === 0) fail(`no stages for side "${side}".`);
}

for (const special of ["unknown", "out-of-scope"]) {
  if (!has(special)) fail(`the "${special}" stage is missing. A default is not a stage.`);
}

/*
 * The five things-went-wrong situations the brief names as first-class.
 *
 * This is a list that must be maintained, which CLAUDE.md permits: adding a
 * situation is a deliberate act and the check makes it visible. What it must
 * NOT do is pin the current stage ids, so each situation is matched by a
 * predicate over the stage map rather than by id.
 */
const WENT_WRONG_SITUATIONS: Array<{ situation: string; matches: (s: CaseStage) => boolean }> = [
  {
    situation: "missed deadline",
    matches: (s) => s.wentWrong && /missed|expired|passed|run out/i.test(`${s.title} ${s.description}`),
  },
  {
    situation: "failed service",
    matches: (s) => s.wentWrong && /serv/i.test(`${s.title} ${s.description}`),
  },
  {
    situation: "missed hearing",
    matches: (s) => s.wentWrong && /(settlement conference|trial)/i.test(s.title) && /missed|did not attend|not attend/i.test(`${s.title} ${s.description}`),
  },
  {
    situation: "default judgment against you",
    matches: (s) => s.wentWrong && s.side === "defendant" && /default judgment/i.test(`${s.title} ${s.description}`),
  },
  {
    situation: "wrong court",
    matches: (s) => s.wentWrong && /wrong court|wrong territorial|exceeds|over the Small Claims limit|cannot hear/i.test(`${s.title} ${s.description}`),
  },
];

for (const { situation, matches } of WENT_WRONG_SITUATIONS) {
  if (!CASE_STAGES.some(matches)) {
    fail(`no first-class stage for the "${situation}" situation.`);
  }
}

/*
 * The three pre-suit notice deadlines.
 *
 * Matched by the length and the statute rather than by stage id, so renaming
 * a stage does not break the check and deleting the deadline does.
 */
const bars = claimBarringDeadlines();
const NOTICE_DEADLINES: Array<{ what: string; sourceId: string; days: number }> = [
  { what: "municipal 10-day notice", sourceId: "municipal-act-2001", days: 10 },
  { what: "City of Toronto 10-day notice", sourceId: "city-of-toronto-act-2006", days: 10 },
  { what: "occupiers' 60-day snow and ice notice", sourceId: "occupiers-liability-act", days: 60 },
];

for (const expected of NOTICE_DEADLINES) {
  const found = bars.find(
    ({ deadline }) =>
      deadline.rule.sourceId === expected.sourceId &&
      deadline.length.unit === "days" &&
      deadline.length.count === expected.days,
  );
  if (!found) {
    fail(
      `the ${expected.what} is not in the stage map as a claim-barring deadline. ` +
        `This is the deadline a self-represented person is least likely to know exists.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 5. The special stages have something to say
// ---------------------------------------------------------------------------

if (UNKNOWN_STAGE_MESSAGE.length < 80) fail("the UNKNOWN message says too little to be useful.");
if (OUT_OF_SCOPE_STAGE_MESSAGE.length < 80) fail("the OUT_OF_SCOPE message says too little to be useful.");
if (STAGE_REFERRALS.length === 0) fail("the special stages offer no referrals.");
for (const referral of STAGE_REFERRALS) {
  if (!/^https:\/\//.test(referral.url)) fail(`referral ${referral.id} has no https URL.`);
}

/*
 * The clarifying question mechanism actually produces a question.
 *
 * Asserted against the pair that caused the original bug: a plaintiff waiting
 * on a defence and a plaintiff whose defence period has run out. If the stage
 * map stops recording what separates them, UNKNOWN degrades from "here is the
 * question that would settle it" back to a bare shrug.
 */
const questions = clarifyingQuestionsFor([
  "plaintiff:served-awaiting-defence",
  "plaintiff:defence-period-expired-no-defence",
]);
if (questions.length === 0) {
  fail("no clarifying question separates awaiting-defence from defence-period-expired.");
} else {
  notes.push(`clarifying question for the Part 0 pair: "${questions[0]}"`);
}

// ---------------------------------------------------------------------------

console.log("");
console.log("STAGE MAP");
console.log("");
console.log(`  ${CASE_STAGES.length} stages: ` +
  `${CASE_STAGES.filter((s) => s.side === "plaintiff").length} plaintiff, ` +
  `${CASE_STAGES.filter((s) => s.side === "defendant").length} defendant, ` +
  `${CASE_STAGES.filter((s) => s.side === "both").length} either side`);
console.log(`  ${CASE_STAGES.filter((s) => s.wentWrong).length} where something has already gone wrong`);
console.log(`  ${CASE_STAGES.flatMap((s) => s.deadlines).length} deadlines, ${bars.length} of which bar the claim`);
console.log(`  ${quotesChecked} quoted passages checked against the vendored corpus`);
console.log(
  `    of ${allCitations.length} citations, ${reachedByStages.size} are reached from a stage; ` +
    `the rest are used by the deadline engine and are checked here for the same reason`,
);
console.log(
  `  ${CASE_STAGES.reduce((n, s) => n + s.distinguishedFrom.length, 0)} recorded boundaries between stages`,
);
console.log("");

for (const note of notes) console.log(`  ${note}`);
if (notes.length) console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} PROBLEM(S):`);
  console.log("");
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}
