/**
 * THE CARRY BASELINE MAY ONLY SHRINK (site owner, 30 Oct: the end-to-end carry test "asserts zero").
 *
 * The end-to-end carry test (tests/browser/carry-end-to-end.spec.ts) fails any violation not listed
 * in tests/browser/harness/carryBaseline.json. This suite checks, without a browser:
 *   - every baseline entry names a kind (asked-twice, returned-after-removal, wrong-case,
 *     screens-disagree), a fact, a screen, and a reason in words; none is listed twice;
 *   - this branch ADDS no entry compared with origin/main (fetched if not present). The one
 *     exception is the PR that introduces the file (origin/main has none), so its first CI run's
 *     real violations can be listed before it merges; after that the list can only shrink;
 *   - the matching, as properties: a violation is excused only by an entry of its kind, fact and
 *     screen (and court/route when the entry names one); an entry nothing matched is stale; an added
 *     entry is found; the counts line is the fixed, greppable one.
 *
 * Failure it exists to catch: the counts kept down by listing new violations instead of fixing them
 * (an entry added), or a matcher that excuses everything, so the carry test goes green while the
 * site still asks twice, refills a removed value, opens the wrong case or shows two values.
 */
import { execFileSync } from "node:child_process";
import {
  BASELINE_PATH, COUNTS_LINE, addedEntries, badEntries, baselineEntryFor, countsLine, countsOf, readBaseline, shows, splitByBaseline, staleEntries,
  type CarryBaselineEntry, type CarryViolation,
} from "../../tests/browser/harness/carryCounts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// 1. The entries' shape.
const now = readBaseline();
const bad = badEntries(now);
check("every baseline entry names its kind, fact and screen, and says why in words; none twice", bad.length === 0, JSON.stringify(bad));

// 2. Nothing added compared with origin/main.
function mainBaseline(): CarryBaselineEntry[] | null {
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  let ref = "origin/main";
  try { git("rev-parse", "--verify", "--quiet", ref); }
  catch {
    try { git("fetch", "--no-tags", "--depth=1", "origin", "main"); ref = "FETCH_HEAD"; }
    catch { throw new Error("origin/main could not be read or fetched: the check cannot compare, so it fails rather than pass unchecked"); }
  }
  try { return (JSON.parse(git("show", `${ref}:${BASELINE_PATH}`)) as { entries?: CarryBaselineEntry[] }).entries ?? []; }
  catch { return null; }
}
try {
  const before = mainBaseline();
  if (before === null) {
    console.log(`note  ${BASELINE_PATH} is not on origin/main yet: this PR introduces it, so its entries are the starting list (${now.length}).`);
  } else {
    const added = addedEntries(before, now);
    check(`no baseline entry added compared with origin/main (main ${before.length}, here ${now.length})`, added.length === 0, `added: ${JSON.stringify(added)}`);
  }
} catch (error) {
  check("origin/main's baseline can be read", false, String(error));
}

// 3. The matching, as properties.
const violation = (over: Partial<CarryViolation> = {}): CarryViolation => ({ kind: "returned-after-removal", run: "small-claims form signed-in", court: "small-claims", route: "form", fact: "otherParty", where: "review (after removal and reload)", detail: "synthetic", ...over });
const entry = (over: Partial<CarryBaselineEntry> = {}): CarryBaselineEntry => ({ kind: "returned-after-removal", fact: "otherParty", where: "review (after removal and reload)", reason: "Synthetic: the review offers the removed value again from the story.", ...over });
check("a violation is excused by its own entry", baselineEntryFor(violation(), [entry()]) !== null);
check("an entry of another kind, fact or screen does not excuse it", [entry({ kind: "screens-disagree" }), entry({ fact: "amount" }), entry({ where: "form (given)" })].every((other) => baselineEntryFor(violation(), [other]) === null));
check("an entry limited to a court or route excuses only there", baselineEntryFor(violation(), [entry({ court: "civil" })]) === null && baselineEntryFor(violation(), [entry({ route: "questions" })]) === null && baselineEntryFor(violation(), [entry({ court: "small-claims", route: "form" })]) !== null);
const split = splitByBaseline([violation(), violation({ fact: "amount", kind: "screens-disagree" })], [entry()]);
check("a violation off the list is not excused", split.known.length === 1 && split.unknown.length === 1);
check("an empty baseline excuses nothing (the test then asserts zero)", splitByBaseline([violation()], []).unknown.length === 1);
check("an entry nothing matched is stale", staleEntries([entry(), entry({ fact: "amount" })], [violation()], [{ court: "small-claims", route: "form" }]).map((item) => item.fact).join() === "amount");
check("an entry for a court no run covered is not called stale", staleEntries([entry({ court: "family" })], [], [{ court: "small-claims", route: "form" }]).length === 0);
check("an added entry is found, a removed one is not 'added'", addedEntries([entry()], [entry(), entry({ fact: "amount" })]).length === 1 && addedEntries([entry(), entry({ fact: "amount" })], [entry()]).length === 0);
check("a reason of a few words is refused", badEntries([entry({ reason: "known" })]).length === 1);

// 4. The counts line and the readings.
const line = countsLine(countsOf([violation(), violation({ kind: "wrong-case" }), violation({ kind: "wrong-case", where: "x" })]));
check("the counts line is fixed and greppable", COUNTS_LINE.test(line) && line === "CARRY COUNTS asked-twice=0 returned-after-removal=1 wrong-case=2 screens-disagree=0", line);
check("a labelled counts line still matches", COUNTS_LINE.test(countsLine(countsOf([]), "[civil review guest]")));
check("an amount is read by its number, in any of its forms", shows("Amount: $7,250.00", { amount: 7250 }) && shows("claiming $7250", { amount: 7250 }) && !shows("claiming $72,500", { amount: 7250 }));

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe carry baseline holds.");
process.exit(failures ? 1 : 0);
