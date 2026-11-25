/**
 * test:matrix-stories -- the journey matrix has one story for every starting point of the stage map, and each story is
 * honest about what it states.
 *
 * WHAT IT CHECKS.
 *   1. Every STARTING_POINTS entry (stage-map/stageSequence.ts) has exactly one matrix story, and no story names a
 *      starting point that does not exist (so a new starting point gets its story the day it is added).
 *   2. Each story's court fits its starting point (a "civil:" step is a Civil story, "family:" Family, else Small Claims),
 *      and both sides of every court appear (Small Claims plaintiff and defendant, Civil plaintiff and defendant, Family
 *      applicant and respondent).
 *   3. Every name a story lists appears in its words, and every fact it lists is stated there (its value's words), so a
 *      story never expects an offer of something it does not say.
 *   4. Chrome's two stories from its test of #563 are in the matrix word for word.
 *   5. Every story id is unique and fit for a file name (its recordings live under tests/browser/fixtures/real-ai/).
 *
 * WHAT FAILURE IT EXISTS TO CATCH. A matrix that quietly covers less than the site does: a starting point with no
 * journey, a side never driven, or a story whose expected facts it never states (so its check 6 failures would be
 * noise, not findings). Pure: no browser.
 */
import { readFileSync } from "node:fs";
import { STARTING_POINTS } from "../../src/lib/case-system/stage-map/stageSequence";
import { stagesForPathway } from "../../src/lib/case-system/stage-map/stageMap";
import { MATRIX_STORIES } from "../../tests/browser/matrix/matrixStories";
import { listedNamesIn, namesNeverSent } from "../../tests/browser/harness/aiFixtures";
import { bodyNameLabels } from "../../src/lib/security/requestNames";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
  if (!ok) failures++;
}

const courtOf = (stage: string) => (stage.startsWith("civil:") ? "civil" : stage.startsWith("family:") ? "family" : "small-claims");
const starts = STARTING_POINTS.map((point) => point.stage);
const stories = MATRIX_STORIES.filter((story) => story.startingPoint !== "chrome");

console.log("\n1. One story for every starting point");
const missing = starts.filter((stage) => !stories.some((story) => story.startingPoint === stage));
const doubled = starts.filter((stage) => stories.filter((story) => story.startingPoint === stage).length > 1);
const unknown = stories.filter((story) => !starts.includes(story.startingPoint)).map((story) => `${story.id}: ${story.startingPoint}`);
check(`every starting point (${starts.length}) has a story`, missing.length === 0, missing.join(", "));
check("no starting point has two", doubled.length === 0, doubled.join(", "));
check("no story names a starting point that does not exist", unknown.length === 0, unknown.join(", "));

console.log("\n2. Courts and sides");
const wrongCourt = stories.filter((story) => courtOf(story.startingPoint) !== story.court).map((story) => `${story.id} (${story.court}) starts at ${story.startingPoint}`);
check("each story's court fits its starting point", wrongCourt.length === 0, wrongCourt.join("; "));
const pairs: [string, string][] = [["small-claims", "plaintiff"], ["small-claims", "defendant"], ["civil", "plaintiff"], ["civil", "defendant"], ["family", "applicant"], ["family", "respondent"]];
const absent = pairs.filter(([court, side]) => !MATRIX_STORIES.some((story) => story.court === court && story.side === side)).map((pair) => pair.join(" "));
check("both sides of every court are driven", absent.length === 0, absent.join(", "));

console.log("\n3. Each story states what it lists");
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9$.,' ]+/g, " ");
const notNamed = MATRIX_STORIES.flatMap((story) => story.names.filter((name) => !story.text.includes(name)).map((name) => `${story.id}: ${name}`));
check("every listed name is in the story's words", notNamed.length === 0, notNamed.join("; "));
check("every story lists at least one name and one fact", MATRIX_STORIES.every((story) => story.names.length > 0 && Object.keys(story.facts).length > 0));
const unstated = MATRIX_STORIES.flatMap((story) => Object.entries(story.facts).filter(([, value]) => !words(story.text).includes(words(value).trim())).map(([fact, value]) => `${story.id}: ${fact} "${value}"`));
check("every listed fact is stated in the story's words", unstated.length === 0, unstated.join("; "));

console.log("\n4. Chrome's two stories, word for word");
const chrome = MATRIX_STORIES.filter((story) => story.startingPoint === "chrome");
check("the Fakebuild kitchen story", chrome.some((story) => story.text.startsWith("I hired TEST Fakebuild Contracting Inc. to renovate my kitchen in Ottawa.") && story.text.endsWith("plus interest and my court costs.")));
check("the Alex loan story", chrome.some((story) => story.text === "In January 2026 I lent my friend Alex $2,000 so he could fix his car. He promised to pay me back by the end of March 2026. He has not paid back anything and now he ignores my texts. I want my $2,000 back."));

console.log("\n5. Ids");
const ids = MATRIX_STORIES.map((story) => story.id);
check("every id is unique and fit for a file name", new Set(ids).size === ids.length && ids.every((id) => /^[a-z0-9-]+$/.test(id)));

console.log("\n6. No listed name is ever sent to the model by a recording or the nightly live check");
for (const story of MATRIX_STORIES) namesNeverSent(`matrix-${story.id}`, story.names);
const unrefused = MATRIX_STORIES.flatMap((story) => story.names.filter((name) => listedNamesIn(JSON.stringify({ messages: [{ role: "user", content: `Notes: ${name.toUpperCase()} said no.` }] })).length === 0).map((name) => `${story.id}: ${name}`));
check("a request holding any story's listed name (any case) is stopped before it is sent", unrefused.length === 0, unrefused.join("; "));
check("a request holding none of them, the names replaced by labels, is sent", listedNamesIn(JSON.stringify({ messages: [{ role: "user", content: "[Other party 1] said no to [Person 2]." }] })).length === 0);
// The site's own name labels (security/requestNames.ts bodyNameLabels, what every AI route applies) on each story: a name it misses is sent as typed by
// the live site. Reported here, never failed here: the matrix report carries it, and the fix is the site's.
const missed = MATRIX_STORIES.flatMap((story) => story.names.filter((name) => !JSON.stringify(bodyNameLabels({ story: story.text })).includes(name)).map((name) => `${story.id}: "${name}"`));
console.log(`info  names the site's name labels do not hide (the live site would send them as typed): ${missed.length ? missed.join("; ") : "none"}`);

console.log("\n7. Every story runs in exactly one shard of the matrix workflow");
const workflow = readFileSync(".github/workflows/courtsimplified-matrix.yml", "utf8");
const shardStories = [...workflow.matchAll(/^\s+stories: (.+)$/gm)].flatMap((match) => match[1].trim().split(/\s+/));
const inNone = ids.filter((id) => !shardStories.includes(id));
const inTwo = ids.filter((id) => shardStories.filter((s) => s === id).length > 1);
const strangers = shardStories.filter((id) => !ids.includes(id));
check("no story in no shard", inNone.length === 0, inNone.join(", "));
check("no story in two shards", inTwo.length === 0, inTwo.join(", "));
check("no shard names a story that does not exist", strangers.length === 0, strangers.join(", "));

console.log("\n8. What must not be asked: each story's own list, from the stage map, never from the site's registry");
const steps = new Map((["small-claims", "civil", "family"] as const).flatMap((court) => stagesForPathway(court).map((stage) => [stage.id, court] as const)));
const badSteps = MATRIX_STORIES.flatMap((story) => story.mustNotAsk.filter((item) => steps.get(item.step) !== story.court).map((item) => `${story.id}: ${item.fact} -> ${item.step} (${steps.has(item.step) ? `a ${steps.get(item.step)} step` : "no such step"})`));
check("every step a list names is a stage-map step of the story's own court", badSteps.length === 0, badSteps.join("; "));
check("every entry says why", MATRIX_STORIES.every((story) => story.mustNotAsk.every((item) => item.why.trim().length > 15)));
check("every story that starts before anything is filed has a list", MATRIX_STORIES.filter((story) => story.nothingFiled && story.side !== "defendant" && story.side !== "respondent").every((story) => story.mustNotAsk.length > 0));
check("the lists are written apart from the site's fact registry (matrixStories.ts does not import it)", !/froms+["'][^"']*factRegistry["']/.test(readFileSync("tests/browser/matrix/matrixStories.ts", "utf8")));

console.log(failures ? `\n${failures} check(s) failed` : `\nAll ${MATRIX_STORIES.length} matrix stories check out`);
process.exit(failures ? 1 : 0);
