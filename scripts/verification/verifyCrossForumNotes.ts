/**
 * Connection notes quote their sources exactly, are selected by topic alone,
 * and a story's issues can only carry the user's own words.
 *
 * COSTS NOTHING. Pure functions and files on disk; no model is called.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a phrase inside “curly quotes” in a note that does not appear, word for
 *     word, in one of that note's saved sources (a misquote, a paraphrase in
 *     quotation marks, or a quote from memory);
 *   - a note citing a source whose local copy is missing;
 *   - a note citing CanLII (never fetched here; see CLAUDE.md s. 2);
 *   - a note selected for a story that does not raise its topics, or not
 *     selected for one that does (asserted as properties of the topics, not
 *     as a pinned list, so adding a note does not break this);
 *   - an issue whose quote is not in the user's story surviving the
 *     classifier's coercion (the only text from the model a user sees is
 *     their own words, so a quote that is not theirs must be dropped);
 *   - an issue kind the registry does not know surviving coercion;
 *   - any note or label missing from the content inventory, which would make
 *     the output guard blank it on screen.
 *
 * Run: node --import tsx scripts/verification/verifyCrossForumNotes.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  CROSS_FORUM_NOTES,
  ISSUE_KINDS,
  ISSUE_KIND_LABELS,
  NO_MATTERS,
  SEVERAL_MATTERS_INTRO,
  hasSeveralMattersContent,
  selectCrossForumNotes,
  type StoryMatters,
} from "../../src/lib/content-library/crossForumNotes";
import { coerceStoryMatters } from "../../src/lib/case-system/intelligence/courtPathClassifier";
import { checkUserContent } from "../../src/lib/content-library/outputGuard";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ROOT = process.cwd();

/** Whitespace, line-break hyphenation and quote style do not count as differences. */
function normalize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text with page furniture removed, so a quote that crosses a page break still matches. */
function comparable(raw: string): string {
  return normalize(
    raw
      .split("\n")
      .filter((line) => !/^\s*Page:\s*\d+\s*$/.test(line))
      .join("\n")
      // A word hyphenated across a line break ("cre-\nate") is one word.
      .replace(/(\w)-\n\s*(\w)/g, "$1$2"),
  );
}

// ---------------------------------------------------------------------------
// 1. Every quoted phrase is in a saved source, word for word
// ---------------------------------------------------------------------------

for (const note of CROSS_FORUM_NOTES) {
  const quotes = [...note.text.matchAll(/“([^”]+)”/g)].map((match) => match[1]);
  check(`${note.id} quotes at least one source`, quotes.length > 0);

  const sourceTexts: string[] = [];
  for (const source of note.sources) {
    const file = path.join(ROOT, source.localText);
    const present = existsSync(file);
    check(`${note.id}: local copy exists for ${source.sourceName}`, present, source.localText);
    check(`${note.id}: ${source.sourceName} is not CanLII`, !/canlii/i.test(source.officialUrl));
    check(`${note.id}: ${source.sourceName} has a verification date`, /^\d{4}-\d{2}-\d{2}$/.test(source.verifiedAt));
    if (present) sourceTexts.push(comparable(readFileSync(file, "utf8")));
  }

  for (const quote of quotes) {
    const wanted = normalize(quote);
    // Exact match only. A bilingual SCC judgment is checked against its
    // derived English-column copy (docs/sources/decisions/*.english.txt),
    // because the original interleaves French on every line.
    const found = sourceTexts.some((text) => text.includes(wanted));
    check(`${note.id}: quote is in a source — “${quote.slice(0, 60)}…”`, found, quote);
  }
}

// ---------------------------------------------------------------------------
// 2. Selection follows the topics
// ---------------------------------------------------------------------------

const matters = (kinds: string[], flags: Partial<StoryMatters> = {}): StoryMatters => ({
  ...NO_MATTERS,
  ...flags,
  issues: kinds.map((kind) => ({ kind: kind as StoryMatters["issues"][number]["kind"], quote: kind })),
});
const ids = (list: { id: string }[]) => list.map((note) => note.id);

check("no topics select no notes", selectCrossForumNotes(NO_MATTERS).length === 0);
check(
  "a single ordinary claim selects no note and does not show the card",
  selectCrossForumNotes(matters(["debt-or-contract"])).length === 0 &&
    !hasSeveralMattersContent(matters(["debt-or-contract"])),
);
check(
  "any employment pay or termination topic selects the complaint-or-court note",
  ids(selectCrossForumNotes(matters(["employment-pay"]))).includes("cross-forum:employment-standards-or-court") &&
    ids(selectCrossForumNotes(matters(["employment-termination"]))).includes("cross-forum:employment-standards-or-court"),
);
check(
  "discrimination alone does not select the joined-claim note (the HRTO redirect covers it)",
  !ids(selectCrossForumNotes(matters(["discrimination"]))).includes("cross-forum:human-rights-with-another-claim"),
);
check(
  "discrimination with another court claim selects the joined-claim note",
  ids(selectCrossForumNotes(matters(["discrimination", "employment-termination"]))).includes(
    "cross-forum:human-rights-with-another-claim",
  ),
);
check(
  "a tenancy with another claim selects the tenancy note; a tenancy alone does not",
  ids(selectCrossForumNotes(matters(["residential-tenancy", "injury"]))).includes("cross-forum:tenancy-and-court") &&
    !ids(selectCrossForumNotes(matters(["residential-tenancy"]))).includes("cross-forum:tenancy-and-court"),
);
check(
  "several parties selects the fault note only with an injury or damage",
  ids(selectCrossForumNotes(matters(["injury"], { severalOtherParties: true }))).includes(
    "cross-forum:several-people-at-fault",
  ) &&
    !ids(selectCrossForumNotes(matters(["debt-or-contract"], { severalOtherParties: true }))).includes(
      "cross-forum:several-people-at-fault",
    ),
);
check(
  "an earlier decision selects its note whatever the topics",
  ids(selectCrossForumNotes(matters([], { earlierDecision: true }))).includes("cross-forum:earlier-decision"),
);
check(
  "an unmarried couple selects its note only with a family matter",
  ids(selectCrossForumNotes(matters(["family"], { unmarriedCouple: true }))).includes("cross-forum:unmarried-couple") &&
    !ids(selectCrossForumNotes(matters(["debt-or-contract"], { unmarriedCouple: true }))).includes(
      "cross-forum:unmarried-couple",
    ),
);
check(
  "only an amount above $50,000 selects the limit note",
  ids(selectCrossForumNotes(NO_MATTERS, [50_001])).includes("cross-forum:over-small-claims-limit") &&
    !ids(selectCrossForumNotes(NO_MATTERS, [50_000])).includes("cross-forum:over-small-claims-limit"),
);
check(
  "two different matters show the card even with no note",
  hasSeveralMattersContent(matters(["family", "defamation"])),
);
check(
  "two issues of the same kind are one matter",
  !hasSeveralMattersContent(matters(["debt-or-contract", "debt-or-contract"])),
);

// ---------------------------------------------------------------------------
// 3. Coercion keeps only the user's own words and known kinds
// ---------------------------------------------------------------------------

const story =
  "My boss fired me after I asked for time off for my religious holiday, and he still owes me two weeks of pay.";
const coerced = coerceStoryMatters(
  {
    issues: [
      { kind: "employment-termination", quote: "My boss fired me" },
      { kind: "discrimination", quote: "time off for my religious holiday" },
      { kind: "employment-pay", quote: "he owes me wages" }, // not in the story
      { kind: "tax-dispute", quote: "still owes me two weeks of pay" }, // unknown kind
      { kind: "employment-pay", quote: "" },
    ],
    severalOtherParties: "yes",
    earlierDecision: true,
  },
  story,
);
check(
  "issues whose quote is in the story survive",
  coerced.issues.some((issue) => issue.kind === "employment-termination") &&
    coerced.issues.some((issue) => issue.kind === "discrimination"),
);
check(
  "an issue whose quote is not in the story is dropped",
  !coerced.issues.some((issue) => issue.quote === "he owes me wages"),
);
check("an unknown kind is dropped", coerced.issues.length === 2, JSON.stringify(coerced.issues));
check("a non-boolean flag is false", coerced.severalOtherParties === false);
check("a boolean flag is kept", coerced.earlierDecision === true);
check("a missing flag is false", coerced.unmarriedCouple === false);
check(
  "a malformed payload yields no matters rather than throwing",
  coerceStoryMatters(undefined, story).issues.length === 0 &&
    coerceStoryMatters({ issues: "lots" }, story).issues.length === 0,
);
check(
  "a quote matching only by case and spacing is kept, carrying the story's own text",
  coerceStoryMatters({ issues: [{ kind: "employment-termination", quote: "my  BOSS fired me" }] }, story).issues[0]
    ?.quote === "My boss fired me",
);

// ---------------------------------------------------------------------------
// 4. Everything the card renders is approved content
// ---------------------------------------------------------------------------

check("the intro passes the output guard", checkUserContent(SEVERAL_MATTERS_INTRO.text).allowed);
for (const kind of ISSUE_KINDS) {
  check(`label for ${kind} passes the output guard`, checkUserContent(ISSUE_KIND_LABELS[kind].text).allowed);
}
for (const note of CROSS_FORUM_NOTES) {
  check(`${note.id} title passes the output guard`, checkUserContent(note.title).allowed);
  check(`${note.id} text passes the output guard`, checkUserContent(note.text).allowed);
}

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
