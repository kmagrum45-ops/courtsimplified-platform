/**
 * THE COURT-PATH FINDER'S HAND-OFF BELONGS TO ONE INTAKE (finderHandoff.ts; the story left at "Before you start",
 * found 9 Nov 2026 from the intake-reset flake, CI job 129360927580).
 *
 * The rule IntakeRecovery applies on every opening, with no browser and no timing:
 *  - a hand-off nobody has taken is taken by a new intake, and only by one;
 *  - the intake that took it keeps it across a refresh (its own ?intake= address);
 *  - any other intake, a saved case (?caseId=), or a hand-off for another intake: dropped;
 *  - taking "Has a case already started?" never leaves the story without its intake.
 * The browser side (every court, real navigation) is tests/browser/finder-story-leak.spec.ts.
 *
 * WHAT FAILURE THIS CATCHES: one person's story left in a shared browser tab for the next intake to find.
 */
import { keepFinderHandoff, takeFinderHandoff, withoutStarted } from "../../src/lib/case-system/storage/finderHandoff";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const fresh = JSON.stringify({ province: "Ontario", city: "Toronto", facts: "the story", started: "no" });
const takenByA = takeFinderHandoff(fresh, A);

check("a new intake may take a hand-off nobody has taken", keepFinderHandoff(fresh, { requestedFlow: null, selectedId: null }));
check("taking it names the intake", takenByA !== null && JSON.parse(takenByA).flowId === A && JSON.parse(takenByA).facts === "the story");
check("the intake that took it keeps it across a refresh", keepFinderHandoff(takenByA, { requestedFlow: A, selectedId: null }));
check("a NEW intake drops a hand-off another intake took (the person left at \"Before you start\")", !keepFinderHandoff(takenByA, { requestedFlow: null, selectedId: null }));
check("another intake's address drops it", !keepFinderHandoff(takenByA, { requestedFlow: B, selectedId: null }));
check("a saved case drops it, taken or not", !keepFinderHandoff(takenByA, { requestedFlow: A, selectedId: B }) && !keepFinderHandoff(fresh, { requestedFlow: null, selectedId: B }));
check("an untaken hand-off is never kept on an existing intake's address", !keepFinderHandoff(fresh, { requestedFlow: B, selectedId: null }));
check("another intake cannot take a hand-off already taken", takeFinderHandoff(takenByA, B) === null);
check("unreadable or empty is never kept", !keepFinderHandoff("not json", { requestedFlow: null, selectedId: null }) && !keepFinderHandoff(null, { requestedFlow: null, selectedId: null }));

const rest = withoutStarted(takenByA);
check("taking \"started\" keeps the story with its intake", rest !== null && !("started" in JSON.parse(rest)) && JSON.parse(rest).flowId === A);
check("taking \"started\" never writes back a story without its intake (IntakeRecovery.tsx, the old rewrite)", withoutStarted(fresh) === null);
check("taking \"started\" from a hand-off holding nothing else leaves nothing", withoutStarted(JSON.stringify({ started: "no", flowId: A })) === null);

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe finder's hand-off belongs to one intake.");
process.exit(failures ? 1 : 0);
