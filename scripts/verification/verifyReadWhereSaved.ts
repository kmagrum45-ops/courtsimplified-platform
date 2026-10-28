/**
 * A SAVED ANSWER IS READ WHERE IT WAS SAVED (site owner, item 5, 2026-10-28).
 *
 * Checks, as properties, for all three courts:
 *   - every date the step page shows from the case file (withCaseFileDates over caseFileOf) is a
 *     date of the one case record (readCaseRecord), which the timeline, the printable case file
 *     and the deadlines read; and a date the person gave on the step page still wins;
 *   - the day a Family respondent was served, which the family chat and the review keep as a line
 *     of the Timeline (SERVED_LINE), is held by the case file and answers the step page's
 *     served-date question;
 *   - the location a saved case recorded is read under every court's spelling (Small Claims
 *     extra.yourProvince / yourCity, civil and Family extra.province / city, civil's civilInput),
 *     by the one reader, and the builder's restore and the chat use that reader.
 *
 * Failures it exists to catch (search of 28 Oct): a date answered in the review was missing from
 * the timeline, the case file and the deadlines, because the position route drops it from
 * dateAnswers as a repeat and readCaseRecord read only dateAnswers; a Family served date was
 * invisible to the case file, which read only family.servedDate, a field nothing writes; the
 * builder's restore read only Small Claims' spelling, so a civil or Family case was asked its city
 * again.
 */
import fs from "node:fs";
import path from "node:path";
import * as caseRecordModule from "../../src/lib/case-system/caseRecord";
import { caseFileOf, withCaseFileDates } from "../../src/lib/case-system/caseFile/caseFile";
import { fullDayIn, SERVED_LINE } from "../../src/lib/case-system/casePosition";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const ID = "00000000-0000-4000-8000-000000000001";
type Court = Checkpoint["courtPath"];
const checkpoint = (courtPath: Court, sections: Record<string, Record<string, unknown>>): Checkpoint => ({ version: 1, flowId: ID, courtPath, revision: ID, sections: { story: { text: "Synthetic story." }, ...sections } });
const { readCaseRecord, recordedDateAnswers } = caseRecordModule;

// 1. Dates given in the review reach the case record, in all three courts.
const REVIEW_DATE: Record<Court, string> = { "small-claims": "sc-date-claim-served", civil: "sc-date-claim-served", family: "case-date-served-with-application" };
for (const court of ["small-claims", "civil", "family"] as const) {
  const id = REVIEW_DATE[court];
  const master = { courtPath: court, intakeCheckpoint: checkpoint(court, { builder: { initialAnswers: { [id]: "September 15, 2026" } } }), position: { dateAnswers: { "sc-date-defence-filed": "2026-10-01" } } };
  // What the case file holds, one id per moment (the step page also fills a moment's twin question).
  const shown = withCaseFileDates({ "sc-date-defence-filed": "2026-10-01" }, caseFileOf(master.intakeCheckpoint, master), fullDayIn, { twins: false });
  const recorded = recordedDateAnswers(readCaseRecord(master, court));
  const missing = Object.entries(shown).filter(([key, value]) => recorded[key] !== value);
  const extra = Object.keys(recorded).filter((key) => !(key in shown));
  check(`${court}: the case record holds every date the case file holds, and nothing else`, Object.keys(shown).includes(id) && missing.length === 0 && extra.length === 0, `shown ${JSON.stringify(shown)}; recorded ${JSON.stringify(recorded)}`);
  // The person's own date on the step page wins over the same question answered earlier.
  const both = { ...master, position: { dateAnswers: { [id]: "2026-09-20" } } };
  check(`${court}: a date given on the step page wins over the review's`, recordedDateAnswers(readCaseRecord(both, court))[id] === "2026-09-20");
}

// One moment is listed once: a step-page date is not repeated under its twin question (review of
// #507: the timeline listed the defence date twice, the second under the civil question's label).
{
  const recorded = recordedDateAnswers(readCaseRecord({ courtPath: "small-claims", position: { dateAnswers: { "sc-date-defence-filed": "2026-10-01" } } }, "small-claims"));
  const days = Object.values(recorded);
  check("a day given once is listed once", days.length === new Set(days).size, JSON.stringify(recorded));
}

// 2. The Family served date kept in the Timeline.
{
  const master = { courtPath: "family", intakeCheckpoint: checkpoint("family", { family: { timeline: `Separated in 2025.\n${SERVED_LINE}October 3, 2026` } }) };
  const file = caseFileOf(master.intakeCheckpoint, master);
  check("family: the served day kept in the Timeline is held by the case file", file.servedDate.state === "answered" && file.servedDate.value === "October 3, 2026", JSON.stringify(file.servedDate));
  check("family: it answers the step page's served-date question, and reaches the case record", recordedDateAnswers(readCaseRecord(master, "family"))["case-date-served-with-application"] === "2026-10-03");
  // Served with a motion to change: the day answers that question, not the application's (review of #507).
  const motion = { courtPath: "family", intakeCheckpoint: checkpoint("family", { situation: { record: { where: "served", court: "family", papers: "family-15", receivedOn: "unknown" } }, family: { timeline: `${SERVED_LINE}October 3, 2026` } }) };
  const motionDates = recordedDateAnswers(readCaseRecord(motion, "family"));
  check("family: the served day answers the question for the papers named (a motion to change)", motionDates["case-date-served-with-motion-to-change"] === "2026-10-03" && !("case-date-served-with-application" in motionDates), JSON.stringify(motionDates));
  const none = caseFileOf(checkpoint("family", { family: { timeline: "Separated in 2025." } }), { courtPath: "family" });
  check("family: a Timeline with no served line gives no served day", none.servedDate.state === "not-asked", JSON.stringify(none.servedDate));
}

// 3. The location, under every court's spelling.
const locationOfIntake = (caseRecordModule as Record<string, unknown>).locationOfIntake as ((intake: unknown) => { province: string; city: string }) | undefined;
check("there is one reader of a saved case's location", typeof locationOfIntake === "function");
if (locationOfIntake) {
  const SAVED: [string, Record<string, unknown>][] = [
    ["small-claims (SmallClaimsIntake)", { yourProvince: "Ontario", yourCity: "Sudbury" }],
    ["civil (CivilIntake)", { province: "Ontario", city: "Sudbury", civilInput: { province: "Ontario", city: "Sudbury" } }],
    ["civil (civilInput only)", { civilInput: { province: "Ontario", city: "Sudbury" } }],
    ["family (FamilyIntake)", { province: "Ontario", city: "Sudbury" }],
  ];
  for (const [label, extra] of SAVED) {
    const location = locationOfIntake({ extra });
    check(`${label}: the saved location is read`, location.province === "Ontario" && location.city === "Sudbury", JSON.stringify(location));
  }
  // The Small Claims writer still saves under the spelling read here (a renamed key would be lost again).
  check("the Small Claims form saves yourProvince and yourCity", /yourProvince: location\.province/.test(read("app/builder/_components/SmallClaimsIntake.tsx")));
}
// Every reader of a saved case's location goes through it: no other file reads one spelling alone.
const readers = ["app/builder/page.tsx", "app/builder/_components/CourtAssistantChat.tsx", "src/lib/case-system/caseRecord.ts"];
check("the builder's restore, the chat and the case record read the location through the one reader", readers.every((file) => /locationOfIntake\(/.test(read(file))));

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
