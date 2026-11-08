/**
 * THE FAMILY CARD TAKES THE LIVED-TOGETHER DATES FROM THE STORY, ACCEPTS A YEAR OR A MONTH, MOVES ON WHEN A QUESTION IS
 * SET ASIDE, AND "WHAT TO CONFIRM NEXT" READS THE RECORDED MUNICIPALITY (Chrome check of production c38e69fd, B3).
 *
 * Chrome, Family: "A few questions about your situation" asked "Did you live together? If so, from roughly when to roughly
 * when?" though the story said "lived together from 2018 to August 2025", and its boxes took only an exact day, so the
 * person typed 2018-01-01 and 2025-08-01. "What to confirm next" then asked "In which municipality does each parent live,
 * and where has your daughter lived since birth?" right after Ottawa was recorded. Found reading the code (owner asked to
 * reproduce it): "I'd rather not answer yet" on a yes/no question stored "not-yet", the same as never asked, so the same
 * question came straight back (statusTriage.ts selectNextTriageQuestion).
 *
 * What it checks:
 *   1. readPartialDate / partialDateWords: a year, a month and year, or a day, as typed or as ISO, never an invalid day;
 *   2. livedTogetherFromStory reads Chrome's sentence and "moved in together ... separated ..."; nothing from a story
 *      that gives no lived-together dates;
 *   3. a question set aside is not asked again on the page: the next one is;
 *   4. withoutMunicipalityAsked: with a municipality recorded, the question asking it again is dropped, keeping its other
 *      part; with none recorded, nothing changes;
 *   5. the card uses them: text boxes (not exact-day only), the story's dates, the set-aside list; both pages pass the
 *      recorded municipality to "What to confirm next".
 *
 * WHAT FAILURE THIS CATCHES: the Family card asking what the story or the record already holds, or a button that does nothing.
 *
 * Run: npm run test:family-triage-dates
 */
import fs from "node:fs";
import { emptyStatusRecord, livedTogetherFromStory, partialDateWords, readPartialDate, selectNextTriageQuestion } from "../../src/lib/case-system/family/statusTriage";
import { withoutMunicipalityAsked } from "../../src/lib/case-system/intelligence/answeredQuestions";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// 1. Dates as people give them.
const READS: [string, string | null][] = [
  ["2018", "2018"], ["August 2025", "2025-08"], ["Aug 2025", "2025-08"], ["2025-08", "2025-08"], ["March 3, 2018", "2018-03-03"],
  ["2018-03-03", "2018-03-03"], ["February 30, 2024", null], ["sometime", null], ["13/2024", null], ["", null],
];
for (const [typed, kept] of READS) check(`1. "${typed}" is kept as ${kept}`, readPartialDate(typed) === kept, String(readPartialDate(typed)));
check("1. shown in words", partialDateWords("2018") === "2018" && partialDateWords("2025-08") === "August 2025" && partialDateWords("2018-03-03") === "March 3, 2018");

// 2. The story's lived-together dates.
const chrome = livedTogetherFromStory("Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6.");
check("2. Chrome's story: 2018 to August 2025", chrome?.start === "2018" && chrome?.end === "2025-08", JSON.stringify(chrome));
const moved = livedTogetherFromStory("We moved in together in March 2019 and separated in May 2024.");
check("2. moved in together ... separated", moved?.start === "2019-03" && moved?.end === "2024-05", JSON.stringify(moved));
check("2. no lived-together dates in the story: nothing", livedTogetherFromStory("We were married in 2015 and separated in 2024.") === null);

// 3. A question set aside is not asked again on the page.
const record = emptyStatusRecord();
check("3. before: the first question is the marriage", selectNextTriageQuestion(record)?.id === "married-to-other-party");
check("3. after \"I'd rather not answer yet\" on it, the next question is asked, not the same one", selectNextTriageQuestion(record, new Set(["married-to-other-party"]))?.id !== "married-to-other-party", String(selectNextTriageQuestion(record, new Set(["married-to-other-party"]))?.id));

// 4. "What to confirm next" reads the recorded municipality.
const asked = "In which municipality does each parent live, and where has your daughter lived since birth?";
check("4. recorded: the municipality part goes, the rest stays", JSON.stringify(withoutMunicipalityAsked([asked], "Ottawa")) === JSON.stringify(["Where has your daughter lived since birth?"]), JSON.stringify(withoutMunicipalityAsked([asked], "Ottawa")));
check("4. recorded: a question asking only that is dropped", withoutMunicipalityAsked(["Which city do you live in?"], "Ottawa").length === 0);
check("4. none recorded: nothing changes", JSON.stringify(withoutMunicipalityAsked([asked], null)) === JSON.stringify([asked]));
check("4. other questions are untouched", JSON.stringify(withoutMunicipalityAsked(["What parenting schedule do you want?"], "Ottawa")) === JSON.stringify(["What parenting schedule do you want?"]));

// 5. The card and both pages use them.
const card = fs.readFileSync("app/builder/_components/FamilyStatusTriage.tsx", "utf8");
check("5. the lived-together boxes take text (a year or a month), not an exact day only", /type="text"\s+data-testid="triage-cohabitation-start"/.test(card) && /type="text"\s+data-testid="triage-cohabitation-end"/.test(card));
check("5. the card uses the story's dates and the set-aside list", /livedTogetherFromStory\(story\)/.test(card) && /selectNextTriageQuestion\(record, deferred\)/.test(card));
check("5. the builder and the case page pass the recorded municipality", /recordedMunicipality=\{courtPath === "family"/.test(fs.readFileSync("app/builder/page.tsx", "utf8")) && /recordedMunicipality=\{courtPath === "family"/.test(fs.readFileSync("app/cases/[id]/page.tsx", "utf8")));

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe Family card reads the story and the record, and moves on when a question is set aside.");
process.exit(failures ? 1 : 0);
