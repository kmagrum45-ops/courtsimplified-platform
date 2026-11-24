/**
 * A CASE SAVED BEFORE A CHANGE STILL OPENS AND READS THE SAME AFTER IT (site owner, 13 Nov 2026: "no change may alter or
 * lose a saved case; a new reader accepts old data; a migration is additive only").
 *
 * The fixtures (fixtures/oldShapeCases/main-141fa246.json.gz, gzipped) are real saved cases, not hand-made: the 35 page-test
 * stories (tests/browser/ask-once-pages.spec.ts) were run on main's code (141fa246) against a local Supabase stack,
 * with the stand-ins for the AI, and each story's saved `cases` rows were read before its account was deleted. Each
 * fixture also holds what main's code read from that row (caseFileOf, reviewPhase, the review's answered questions).
 * They have none of the fields this branch adds (builder.reviewOfferChoices, an answer's source "story-offer" /
 * "not-sure", a chat message's source "chip").
 * REFRESHED 22 Nov 2026 (site owner, before #552 merged): fixtures/oldShapeCases/main-a8afce0b.json.gz, 135 saved cases made
 * the same way on main a8afce0b (after #550, #551 and #553) by eight page tests (ask-once-pages, carry-end-to-end, the "not
 * sure" and offer tests, change-answer, review-answered-kept): every court, guest and signed-in runs, offers, "not sure",
 * removed facts, saved parties lists. Made-up stories in test accounts only. It also holds main's reading of the parties.
 * Checks, for every saved case in every fixture file, through this branch's code:
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
 *   6. what the person typed is not rewritten: a fact main read from a typed answer keeps its words and its source;
 *   7. the parties (14 Nov 2026): with no parties record, they are read from what the case holds, and the other party
 *      main held is one party with that same name (never merged with another).
 * One difference is allowed, and only one (site owner, 13 Nov 2026; ALLOWED_DIFFERENCE below): the court date in
 * family-served-divorce and family-served-motion, where this branch shows the person's typed words instead of the
 * stage step's date, naming the same calendar day. Checks that a different day, another case, another fact or other
 * words are refused.
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

const DIR = path.join(__dirname, "fixtures", "oldShapeCases");
/** The first capture (19 Nov, before #550 and #551): old-shape only. A later capture (refreshed 22 Nov 2026 on main a8afce0b,
 * after #550, #551 and #553, by the same method) holds the shapes saved since, so the "no new field" setup check applies to
 * the first only. */
const OLD_SHAPE_FILE = "main-141fa246.json.gz";

type OldFact = { state: string; value: unknown; sourceKind: string | null; confirmed: boolean; removed: boolean; wouldAsk: boolean };
type Fixture = {
  id: string; file: string; story: string; court: "small-claims" | "civil" | "family"; side: string;
  master: Record<string, unknown>;
  oldReading: { checkpointRead: boolean; phase: string | null; inputRevision: string | null; storyOutdated: boolean | null; answeredQuestions: string[]; facts: Record<string, OldFact>; parties?: { recorded: boolean; list: { side: string; you: boolean; name: string }[] } | null };
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * THE ONE DIFFERENCE ALLOWED (site owner, 13 Nov 2026), by story and fact, nothing else. In these two Family cases the
 * person typed the upcoming court date ("March 3, 2026", intakeData.extra.upcomingCourtDate) and the stage step saved a
 * trial date (position.dateAnswers "2026-03-03"). Main read the step's date over the typed answer (the audit's
 * trial-date bug); this branch never lets a step's date replace the person's typed answer (caseFile.ts
 * STEP_DATE_NEVER_REPLACES). Allowed only when the value now is exactly the person's typed words AND names the same
 * calendar day as main's value, compared after parsing both. Any other case, any other fact, or another day fails.
 */
const ALLOWED_DIFFERENCE: Record<string, { fact: string; reason: string }> = {
  "family-served-divorce": { fact: "courtDate", reason: "the person's typed court date is never replaced by a step's date (the audit's trial-date bug)" },
  "family-served-motion": { fact: "courtDate", reason: "the person's typed court date is never replaced by a step's date (the audit's trial-date bug)" },
};
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** A calendar day as YYYY-MM-DD from "2026-03-03" or "March 3, 2026"; null for anything else. */
function calendarDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const words = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(value.trim());
  const month = words ? MONTHS.indexOf(words[1].toLowerCase()) : -1;
  if (!words || month < 0) return null;
  return `${words[3]}-${String(month + 1).padStart(2, "0")}-${words[2].padStart(2, "0")}`;
}
/** The allowed difference holds: the typed words now, the same day as main's stored date. */
function allowedDifference(item: { story: string; master: Record<string, unknown> }, fact: string, now: unknown, main: unknown): boolean {
  if (ALLOWED_DIFFERENCE[item.story]?.fact !== fact) return false;
  const typed = ((item.master.intakeData as Record<string, unknown> | undefined)?.extra as Record<string, unknown> | undefined)?.upcomingCourtDate;
  const day = calendarDay(now);
  return typeof typed === "string" && now === typed && day !== null && day === calendarDay(main);
}

async function main() {
  const { caseFileOf } = await import("../../src/lib/case-system/caseFile/caseFile");
  const notAsked = (slot: Parameters<typeof slotStatusOf>[0]) => ["ask", "offer"].includes(slotStatusOf(slot));
  const { slotStatus: slotStatusOf } = await import("../../src/lib/case-system/caseFile/factStatus");
  const { slotStatus } = await import("../../src/lib/case-system/caseFile/factStatus");
  const { readCheckpoint } = await import("../../src/lib/case-system/intakeCheckpoint");
  const review = await import("../../src/lib/case-system/intakeReview");
  const { storyAnswersOutdated } = await import("../../src/lib/case-system/storyBasis");
  const { partyName } = await import("../../src/lib/case-system/parties/parties");

  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((name) => name.endsWith(".json.gz")).sort() : [];
  const cases = files.flatMap((name) => (JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, name))).toString("utf8")).cases as Omit<Fixture, "file">[]).map((item) => ({ ...item, file: name }))) as Fixture[];
  check("setup: the old-shape fixtures exist", cases.some((item) => item.file === OLD_SHAPE_FILE), DIR);
  check("setup: a capture newer than the first is present (refreshed 22 Nov 2026)", cases.some((item) => item.file !== OLD_SHAPE_FILE));
  for (const story of ["sc-tree-cut", "sc-slip-and-fall", "sc-slip-and-fall-changed"]) {
    check(`setup: ${story} is among the saved cases`, cases.some((item) => item.story === story && item.oldReading.checkpointRead));
  }
  for (const name of files) check(`setup: every court is represented (${name})`, ["small-claims", "civil", "family"].every((court) => cases.some((item) => item.file === name && item.court === court)));
  const newKeys = /"reviewOfferChoices"|"source":"(story-offer|not-sure|chip)"|"parties":{"version"/;
  check("setup: no case in the first capture holds a field added since (they are old-shape)", cases.filter((item) => item.file === OLD_SHAPE_FILE).every((item) => !newKeys.test(JSON.stringify(item.master))));
  // The refreshed capture holds the shapes saved since #550/#551: guest and signed-in runs, the review's offer choices,
  // "not sure", removed facts, and confirmed and unconfirmed reviews.
  const fresh = cases.filter((item) => item.file !== OLD_SHAPE_FILE);
  const factsOf = (item: Fixture) => Object.values(item.oldReading.facts);
  check("setup: the refreshed capture has guest-run cases", fresh.some((item) => /guest/i.test(item.story)));
  check("setup: the refreshed capture has signed-in cases", fresh.some((item) => !/guest/i.test(item.story)));
  check("setup: the refreshed capture has the review's offer choices", fresh.some((item) => /"reviewOfferChoices"/.test(JSON.stringify(item.master))));
  check('setup: the refreshed capture has "not sure" answers', fresh.some((item) => factsOf(item).some((fact) => fact.state === "unsure" && fact.confirmed)));
  check("setup: the refreshed capture has removed facts", fresh.some((item) => factsOf(item).some((fact) => fact.removed)));
  check("setup: the refreshed capture has confirmed and unconfirmed reviews", fresh.some((item) => item.oldReading.phase === "user-confirmed") && fresh.some((item) => item.oldReading.phase !== "user-confirmed"));

  let factsHeld = 0;
  const storyValuesUnconfirmed: string[] = [];
  for (const item of cases) {
    const label = item.file === OLD_SHAPE_FILE ? item.id : `[22 Nov] ${item.id}`;
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
        check(`3. ${label} ${fact}: held the same (${old.state})`, slot.state === old.state && (same(slot.value, old.value) || allowedDifference(item, fact, slot.value, old.value)) && Boolean(slot.removed) === old.removed && slot.confirmed === old.confirmed,
          `main: ${JSON.stringify(old)} | now: ${JSON.stringify({ state: slot.state, value: slot.value, removed: Boolean(slot.removed), confirmed: slot.confirmed })}`);
        const status = slotStatus(slot as never);
        check(`3. ${label} ${fact}: known or settled, never asked or offered`, status === "known" || status === "settled", `status ${status}`);
      }
      if (held && !old.wouldAsk) check(`4. ${label} ${fact}: not asked (main's gate held it)`, !notAsked(slot as never), JSON.stringify(slot));
      if (old.sourceKind === "answer") check(`6. ${label} ${fact}: the typed words and their source are kept`, slot.source?.kind === "answer" && (same(slot.value, old.value) || allowedDifference(item, fact, slot.value, old.value)), JSON.stringify(slot));
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

    // 7. The parties (14 Nov 2026, rule 1): an old case has no parties record; it opens, and its parties are read from what
    // it holds, nothing written back (check 2). The other party main held is one party with that same name, never merged.
    const parties = (file as { parties?: { list: { side: string; you?: true }[]; recorded: boolean } }).parties;
    const mainParties = item.oldReading.parties;
    if (mainParties) {
      // A refreshed capture holds main's own reading of the parties: the same list (side, you, name) and the same record mark.
      const now = parties ? { recorded: Boolean(parties.recorded), list: parties.list.map((party) => ({ side: party.side, you: Boolean(party.you), name: partyName(party as never) })) } : null;
      check(`7. ${label}: the parties read as main read them`, same(now, mainParties), `main: ${JSON.stringify(mainParties)} | now: ${JSON.stringify(now)}`);
    } else check(`7. ${label}: the parties are read (no record, read from what the case holds)`, Boolean(parties) && parties!.recorded === false, JSON.stringify(parties ?? null));
    const otherHeld = item.oldReading.facts.otherParty;
    if (parties && otherHeld && otherHeld.state === "answered" && typeof otherHeld.value === "string") {
      const others = parties.list.filter((party) => party.side === "other").map((party) => partyName(party as never));
      // With no parties record the other party is read from the one fact: exactly one party, that name. With a record the
      // person saved on the Parties step (22 Nov capture: sc-forms-chrome added "Test Manager" beside Circle K), the list
      // is theirs and is compared whole with main's reading above; main's other party must still be on it.
      if (!parties.recorded) check(`7. ${label}: the other party main held is one party with the same name`, others.length === 1 && others[0] === otherHeld.value, `main: ${otherHeld.value} | parties: ${JSON.stringify(others)}`);
      else check(`7. ${label}: the other party main held is still on the saved parties list`, others.includes(otherHeld.value), `main: ${otherHeld.value} | parties: ${JSON.stringify(others)}`);
    }
  }
  // The allowance is that narrow: each of these must be refused.
  const typedCase = { story: "family-served-divorce", master: { intakeData: { extra: { upcomingCourtDate: "March 3, 2026" } } } };
  check("allowance: the typed words naming main's day are allowed", allowedDifference(typedCase, "courtDate", "March 3, 2026", "2026-03-03"));
  check("allowance: a different day is refused", !allowedDifference(typedCase, "courtDate", "March 3, 2026", "2026-03-04"));
  check("allowance: words that are not the person's typed words are refused", !allowedDifference(typedCase, "courtDate", "3 March 2026", "2026-03-03"));
  check("allowance: another fact is refused", !allowedDifference(typedCase, "whenHappened", "March 3, 2026", "2026-03-03"));
  check("allowance: another case is refused", !allowedDifference({ ...typedCase, story: "family-moved-away" }, "courtDate", "March 3, 2026", "2026-03-03"));
  for (const [story, allowed] of Object.entries(ALLOWED_DIFFERENCE)) check(`setup: the allowed difference names a saved case (${story}, ${allowed.fact}: ${allowed.reason})`, cases.some((item) => item.story === story));
  check("setup: the fixtures hold facts to compare", factsHeld > 0, `${factsHeld}`);
  console.log(`${cases.length} saved case(s), ${factsHeld} held fact(s) compared.`);
  console.log(`Story values no one confirmed (not the person's answers; offered once now): ${storyValuesUnconfirmed.length}`);
  for (const line of storyValuesUnconfirmed) console.log(`  ${line}`);
  console.log(failures ? `\n${failures} check(s) failed.` : "\nOld-shape cases: all checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
