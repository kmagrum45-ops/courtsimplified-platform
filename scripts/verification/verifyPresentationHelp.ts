/**
 * Presentation help stays at Level 1: organise, never rewrite, never advise.
 *
 *   npm run test:presentation-help
 *
 * COSTS NOTHING. No model call. Reads the vendored corpus off disk and calls
 * pure functions.
 *
 * *** THE THREE PROPERTIES, AND WHY EACH IS CHECKABLE ***
 *
 * 1. EVERY CHECKLIST ITEM IS QUOTED FROM A SOURCE. The same `findQuote` gate
 *    every stage answer passes. An item whose quote is not in the corpus is not
 *    a checklist item, it is our opinion about how to prepare for court — and
 *    opinions about preparation are exactly what a licensee has not reviewed.
 *
 * 2. NOTHING HERE PREDICTS OR GRADES. Reuses `predictsOutcome`, the same gate
 *    that refuses outcome language in published blocks. "Being well prepared may
 *    make it possible for you to avoid the expense and risks of having to go to
 *    trial" is in the Ministry's guide, and it is still not something this
 *    product says in its own voice (CLAUDE.md §3, and decision 1 of the Part 7
 *    review: refuse outcome language EVEN WHEN SOURCED).
 *
 * 3. STRUCTURING RETURNS A PERMUTATION. The output strings are the input
 *    strings, reordered — same multiset, nothing edited, nothing merged, nothing
 *    dropped. This is what "no wording rewrites" looks like when it is a
 *    property of the code rather than a line in a brief: a future change that
 *    starts tidying somebody's account fails here instead of passing a review.
 */

import { findQuote, predictsOutcome } from "../content/verifiedContentPipeline";
import {
  CHRONOLOGICAL_ORDER_BASIS,
  PRESENTATION_CHECKLISTS,
} from "../../src/lib/content-library/presentationHelp";
import {
  gapsInStory,
  structureStory,
  type RecordedEvent,
} from "../../src/lib/content-library/structureStory";
import { collectContentInventory } from "../../src/lib/content-library/contentInventory";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`pass  ${name}`);
    return;
  }
  failures.push(detail ? `${name}\n      ${detail}` : name);
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// 1. Every item is quoted from the corpus
// ---------------------------------------------------------------------------

const allItems = PRESENTATION_CHECKLISTS.flatMap((list) => list.items);

check(
  "there are checklist items to check",
  allItems.length > 0,
  "an empty catalogue would make every check below vacuous",
);

for (const item of allItems) {
  const found = findQuote(item.quote);
  check(
    `${item.id} is quoted from a vendored source`,
    found !== null,
    `not found in any corpus file: "${item.quote.slice(0, 90)}…"`,
  );
  if (found && found.sourceId !== item.sourceId) {
    check(
      `${item.id} names the source it actually came from`,
      false,
      `claims ${item.sourceId}, found in ${found.sourceId}`,
    );
  }
}

check(
  "the chronological-order basis is quoted, not asserted",
  findQuote(CHRONOLOGICAL_ORDER_BASIS.quote) !== null,
  `"tell it in order" is the one piece of guidance here that could be mistaken ` +
    `for our own advice about running a case. It is the guide's, and this is the proof`,
);

// ---------------------------------------------------------------------------
// 2. Nothing predicts, grades, or tells them what to argue
// ---------------------------------------------------------------------------

for (const item of allItems) {
  const problem = predictsOutcome(item.text);
  check(
    `${item.id} makes no prediction about how it will go`,
    problem === null,
    problem ?? "",
  );
}

/*
 * The guide itself says "the more you may gain from it" and "avoid the expense
 * and risks of having to go to trial". Quoting a source does not license
 * repeating it in our own voice — decision 1 of the Part 7 review settled that
 * outcome language is refused EVEN WHEN SOURCED. This asserts the item TEXT is
 * clean even where the quote behind it is not.
 */
{
  const gainful = allItems.filter((item) => /\b(gain|avoid the expense|risks?)\b/i.test(item.text));
  check(
    "no item repeats the guide's language about what preparation may gain them",
    gainful.length === 0,
    gainful.map((item) => `${item.id}: ${item.text}`).join("; "),
  );
}

{
  const strategic = allItems.filter((item) =>
    /\b(emphasis|emphasise|emphasize|strongest|weakest|focus on|lead with|best argument|persuad)\b/i.test(
      item.text,
    ),
  );
  check(
    "no item tells them what to emphasise or which point is strongest",
    strategic.length === 0,
    `${strategic.map((item) => item.id).join(", ")} — that is Level 2 and it is not built`,
  );
}

// ---------------------------------------------------------------------------
// 3. THE PERMUTATION PROPERTY: structuring cannot rewrite
// ---------------------------------------------------------------------------

{
  const events: RecordedEvent[] = [
    { id: "e1", what: "They stopped answering my emails", when: "3 May 2026" },
    { id: "e2", what: "I delivered the finished work and sent the invoice", when: "2026-04-10" },
    { id: "e3", what: "We signed the agreement", when: "March 3 2026" },
    { id: "e4", what: "I sent a second demand, I think in the summer", when: "sometime later" },
    { id: "e5", what: "I found the damage" },
  ];

  const story = structureStory(events);

  check(
    "structuring keeps every event",
    story.events.length === events.length,
    `${story.events.length} of ${events.length} — dropping one edits their account`,
  );

  const before = [...events.map((event) => event.what)].sort();
  const after = [...story.events.map((event) => event.what)].sort();
  check(
    "the output is a PERMUTATION of the input — not one character rewritten",
    JSON.stringify(before) === JSON.stringify(after),
    `in:  ${JSON.stringify(before)}\n      out: ${JSON.stringify(after)}`,
  );

  check(
    "dated events come out in date order",
    story.events.slice(0, 3).map((event) => event.id).join(",") === "e3,e2,e1",
    story.events.map((event) => `${event.id}@${event.on ?? "-"}`).join(" "),
  );

  check(
    "undated events go last rather than being dropped or guessed into place",
    story.events.slice(3).every((event) => event.on === null) && story.undated === 2,
    story.events.map((event) => `${event.id}:${event.on ?? "none"}`).join(" "),
  );

  check(
    "an unreadable date is distinguished from no date at all",
    story.events.find((event) => event.id === "e4")?.dateUnclear === true &&
      story.events.find((event) => event.id === "e5")?.dateUnclear === false,
    `"sometime later" is an answer; telling somebody it is not a date they can put ` +
      `in front of a judge is more useful than sorting it quietly to the bottom`,
  );

  /*
   * Stability. Two events the person entered on the same day must keep the order
   * they entered them, because deciding which came first is something we do not
   * know.
   */
  const sameDay = structureStory([
    { id: "a", what: "First thing", when: "2026-04-10" },
    { id: "b", what: "Second thing", when: "2026-04-10" },
  ]);
  check(
    "two events on one day keep the order the person entered them",
    sameDay.events.map((event) => event.id).join(",") === "a,b",
    sameDay.events.map((event) => event.id).join(","),
  );

  check(
    "empty input does not throw",
    structureStory([]).events.length === 0 && structureStory([]).undated === 0,
  );
}

// ---------------------------------------------------------------------------
// The gap flags report absence and stop
// ---------------------------------------------------------------------------

{
  const gaps = gapsInStory(
    structureStory([
      { id: "e1", what: "We signed the agreement", when: "March 3 2026" },
      { id: "e2", what: "I found the damage" },
      { id: "e3", what: "I called them", when: "last spring" },
    ]),
  );

  check(
    "a gap is reported for each event with no usable date",
    gaps.length === 2,
    JSON.stringify(gaps),
  );

  const graded = gaps.filter((gap) =>
    /\b(weak|strong|important|critical|serious|hurt|damage your|problem with your case|unlikely|likely)\b/i.test(
      gap,
    ),
  );
  check(
    "no gap flag grades the case or says what the absence costs",
    graded.length === 0,
    `${graded.join("; ")} — CLAUDE.md §3 allows "no date is recorded" and forbids ` +
      `anything that grades the merits`,
  );

  check(
    "a complete story produces no gaps",
    gapsInStory(
      structureStory([{ id: "e1", what: "We signed", when: "2026-03-03" }]),
    ).length === 0,
  );
}

// ---------------------------------------------------------------------------
// Every word of it is reviewable
// ---------------------------------------------------------------------------

{
  const inventory = new Set(collectContentInventory().map((entry) => entry.text.trim()));
  const missing = allItems.filter((item) => !inventory.has(item.text.trim()));

  check(
    "every checklist item is in the review packet",
    missing.length === 0,
    `${missing.map((item) => item.id).join(", ")} — text a person reads that no ` +
      `licensee has been asked to look at`,
  );
}

// ---------------------------------------------------------------------------

console.log("");
console.log("PRESENTATION HELP (LEVEL 1)");
console.log("");
console.log(
  `  ${PRESENTATION_CHECKLISTS.length} checklist(s), ${allItems.length} item(s), all quoted`,
);
console.log(`  ${passed} check(s) passed`);
console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}
