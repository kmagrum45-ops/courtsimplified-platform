/**
 * A CASE SAVED BEFORE A CHANGE STILL OPENS AND READS THE SAME AFTER IT (site owner, 13 Nov 2026: "no change may alter or
 * lose a saved case; a new reader accepts old data; a migration is additive only").
 *
 * The fixtures (fixtures/oldShapeCases/main-141fa246.json.gz, gzipped) are real saved cases, not hand-made: the 35 page-test
 * stories (tests/browser/ask-once-pages.spec.ts) were run on main's code (141fa246) against a local Supabase stack,
 * with the stand-ins for the AI, and each story's saved `cases` rows were read before its account was deleted. Each
 * fixture also holds what main's code read from that row (caseFileOf, reviewPhase, the review's answered questions).
 * They have none of the fields this branch adds (builder.reviewOfferChoices, an answer's source "story-offer" /
 * "not-sure", a chat message's source "chip"). Checks, for every saved case, through this branch's code:
 *   1. it opens: the checkpoint reads as it did, and the case file, review entries, review questions, story offers
 *      and review phase are all read without an error;
 *   2. nothing is written back: the saved record is deep-frozen while it is read, and is byte-identical afterwards;
 *   3. every fact the person gave (a confirmed answer or "not sure") or removed is held the same: same state, same
 *      value, same removed and confirmed marks; this branch's status for it is known or settled, never ask or offer;
 *   4. none of those is asked: a fact main's gate held is not asked by this branch's gate;
 *      (a story value no one confirmed is not the person's answer: main showed it with a tick, this branch offers it
 *      once with Yes / No / I'm not sure. Listed in the output, not failed.)
 *   5. the review is where it was: same phase (a confirmed case stays confirmed, so nothing is shown as needing
 *      confirmation), same input revision, same "story changed" mark, and every question main counted as answered
 *      is still answered;
 *   6. what the person typed is not rewritten: a fact main read from a typed answer keeps its words and its source.
 * The tree story (sc-tree-cut) and the slip-and-fall (sc-slip-and-fall, sc-slip-and-fall-changed) must be among them.
 *
 * WHAT FAILURE THIS CATCHES: a new reader that needs a new field (an old case would lose an answer, ask it again, or
 * reopen its review), or a reader that rewrites the record it reads.
 *
 * Run: npm run test:old-shape-cases
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok || process.env.VERBOSE) console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const FIXTURE = path.join(__dirname, "fixtures", "oldShapeCases", "main-141fa246.json.gz");

type OldFact = { state: string; value: unknown; sourceKind: string | null; confirmed: boolean; removed: boolean; wouldAsk: boolean };
type Fixture = {
  id: string; story: string; court: "small-claims" | "civil" | "family"; side: string;
  master: Record<string, unknown>;
  oldReading: { checkpointRead: boolean; phase: string | null; inputRevision: string | null; storyOutdated: boolean | null; answeredQuestions: string[]; facts: Record<string, OldFact> };
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function main() {
  const { caseFileOf, notAsked } = await import("../../src/lib/case-system/caseFile/caseFile");
  const { slotStatus } = await import("../../src/lib/case-system/caseFile/factStatus");
  const { readCheckpoint } = await import("../../src/lib/case-system/intakeCheckpoint");
  const review = await import("../../src/lib/case-system/intakeReview");
  const { storyAnswersOutdated } = await import("../../src/lib/case-system/storyBasis");

  const cases = (fs.existsSync(FIXTURE) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(FIXTURE)).toString("utf8")).cases : []) as Fixture[];
  check("setup: the old-shape fixtures exist", cases.length > 0, FIXTURE);
  for (const story of ["sc-tree-cut", "sc-slip-and-fall", "sc-slip-and-fall-changed"]) {
    check(`setup: ${story} is among the saved cases`, cases.some((item) => item.story === story && item.oldReading.checkpointRead));
  }
  check("setup: every court is represented", ["small-claims", "civil", "family"].every((court) => cases.some((item) => item.court === court)));
  const newKeys = /"reviewOfferChoices"|"source":"(story-offer|not-sure|chip)"/;
  check("setup: no fixture holds a field this branch adds (they are old-shape)", cases.every((item) => !newKeys.test(JSON.stringify(item.master))));

  let factsHeld = 0;
  const storyValuesUnconfirmed: string[] = [];
  for (const item of cases) {
    const label = item.id;
    const before = JSON.stringify(item.master);
    const master = deepFreeze(structuredClone(item.master));
    let opened = true;
    let reading: { checkpoint: ReturnType<typeof readCheckpoint>; file: ReturnType<typeof caseFileOf> } | null = null;
    try {
      const checkpoint = readCheckpoint(master.intakeCheckpoint, item.court);
      const file = caseFileOf(checkpoint, master);
      if (checkpoint) {
        review.shownReviewEntries(review.withHeldOtherParty(review.reviewEntries(checkpoint), checkpoint, file));
        review.reviewQuestionList(checkpoint, master);
        review.undecidedStoryOffers(checkpoint, master);
        review.reviewOfferChoicesOf(checkpoint);
      }
      reading = { checkpoint, file };
    } catch (error) {
      opened = false;
      check(`1. ${label} opens`, false, String((error as Error)?.stack ?? error).split("\n").slice(0, 3).join(" | "));
    }
    if (!opened || !reading) continue;
    const { checkpoint, file } = reading;
    check(`1. ${label}: the checkpoint reads as it did`, Boolean(checkpoint) === item.oldReading.checkpointRead);
    check(`2. ${label}: the saved record is not changed by reading it`, JSON.stringify(master) === before);

    for (const [fact, old] of Object.entries(item.oldReading.facts)) {
      const slot = (file as Record<string, { state: string; value?: unknown; source?: { kind?: string }; confirmed: boolean; removed?: boolean }>)[fact];
      if (!slot) { check(`3. ${label} ${fact}: the fact still exists`, false); continue; }
      // The person's own: an answer or "not sure" they confirmed, or a fact they removed. A story value nobody confirmed
      // yet is not theirs: main showed it to tick, this branch offers it once (Yes / No / Not sure). Listed, not failed.
      const held = old.removed || (old.confirmed && (old.state === "answered" || old.state === "unsure"));
      if (!held && old.state !== "not-asked") storyValuesUnconfirmed.push(`${label} ${fact} (${old.state}, ${old.sourceKind}) -> ${slotStatus(slot as never)}`);
      if (held) {
        factsHeld += 1;
        check(`3. ${label} ${fact}: held the same (${old.state})`, slot.state === old.state && same(slot.value, old.value) && Boolean(slot.removed) === old.removed && slot.confirmed === old.confirmed,
          `main: ${JSON.stringify(old)} | now: ${JSON.stringify({ state: slot.state, value: slot.value, removed: Boolean(slot.removed), confirmed: slot.confirmed })}`);
        const status = slotStatus(slot as never);
        check(`3. ${label} ${fact}: known or settled, never asked or offered`, status === "known" || status === "settled", `status ${status}`);
      }
      if (held && !old.wouldAsk) check(`4. ${label} ${fact}: not asked (main's gate held it)`, !notAsked(slot as never), JSON.stringify(slot));
      if (old.sourceKind === "answer") check(`6. ${label} ${fact}: the typed words and their source are kept`, slot.source?.kind === "answer" && same(slot.value, old.value), JSON.stringify(slot));
    }

    if (checkpoint) {
      const workflow = (master.workflowStatus ?? {}) as Record<string, unknown>;
      check(`5. ${label}: the review phase is unchanged (${item.oldReading.phase})`, review.reviewPhase(workflow, checkpoint) === item.oldReading.phase, `now ${review.reviewPhase(workflow, checkpoint)}`);
      check(`5. ${label}: the input revision is unchanged`, review.inputRevision(checkpoint) === item.oldReading.inputRevision);
      check(`5. ${label}: the "story changed" mark is unchanged`, storyAnswersOutdated(checkpoint) === item.oldReading.storyOutdated);
      const answeredNow = new Set(review.reviewQuestionList(checkpoint, master).filter((question) => question.answered).map((question) => question.id));
      const lost = item.oldReading.answeredQuestions.filter((id) => !answeredNow.has(id));
      check(`5. ${label}: every question main counted as answered is still answered`, lost.length === 0, `no longer answered: ${lost.join(", ")}`);
    }
  }
  check("setup: the fixtures hold facts to compare", factsHeld > 0, `${factsHeld}`);
  console.log(`${cases.length} saved case(s), ${factsHeld} held fact(s) compared.`);
  console.log(`Story values no one confirmed (not the person's answers; offered once now): ${storyValuesUnconfirmed.length}`);
  for (const line of storyValuesUnconfirmed) console.log(`  ${line}`);
  console.log(failures ? `\n${failures} check(s) failed.` : "\nOld-shape cases: all checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
