/**
 * The general two-year limit is counted from an injury date under the
 * Limitations Act's presumption -- and says that it is a presumption -- on the
 * injury notice steps and the before-filing limitation steps.
 *
 * WHY (page review, 2026-10-06). The site owner's own story (slipped on store
 * ice 13 January 2025) was told "you have 60 days" with no sign that the time
 * had gone, and never saw its last day to sue, 13 January 2027, three months
 * away. The discovery date itself is never asked (deadlineEvents.ts says why);
 * s. 5 (2) presumes it is the day of the act or omission unless the contrary
 * is proved, so that is what is counted, in those words.
 *
 * WHAT IT CATCHES:
 *   - an injury notice step that loses the two-year date;
 *   - a two-year date shown without the presumption sentence (a counted date
 *     presented as settled when the Act lets it be displaced);
 *   - a counted date in the past not saying it has passed;
 *   - the presumption quote drifting from the vendored Limitations Act;
 *   - a claim with no injury asked for an injury date (2026-10-07).
 *
 * COSTS NOTHING: the stage-answer route, no model.
 *
 * Run: npm run test:presumed-limitation
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { POST } from "../../app/api/case/stage-answer/route";
import { S_LIMITATIONS_5_2_PRESUMPTION } from "../../src/lib/case-system/stage-map/citations";
import { dateQuestionsForStep } from "../../src/lib/case-system/casePosition";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok    ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

async function deadlineText(stageId: string, dateAnswers: Record<string, string>): Promise<string> {
  const response = await POST(
    new Request("http://local/api/case/stage-answer", {
      method: "POST",
      body: JSON.stringify({ stageId, courtPath: "small-claims", confirmedFacts: {}, dateAnswers }),
    }),
  );
  const body = (await response.json()) as { answer?: { sections?: { heading: string; text: string }[] } };
  return body.answer?.sections?.find((section) => /deadline/i.test(section.heading))?.text ?? "";
}

async function main() {
  for (const stageId of ["before-filing:notice-snow-ice-private", "before-filing:notice-municipality"]) {
    check(`${stageId} asks for the injury date`, dateQuestionsForStep(stageId).some((question) => question.id === "sc-date-injury"));
  }
  // Page review 2026-10-07: a debt claimant was asked "If this involves an
  // injury..." and never got a date. A step with no injury deadline asks for
  // the day the claim is based on, and never for an injury.
  const general = dateQuestionsForStep("before-filing:deciding-whether-to-sue");
  check(
    "a step with no injury deadline asks the day the claim is based on, not an injury date",
    general.some((question) => question.id === "case-date-act-or-omission") && !general.some((question) => question.id === "sc-date-injury"),
    JSON.stringify(general.map((question) => question.id)),
  );
  const debt = await deadlineText("before-filing:deciding-whether-to-sue", { "case-date-act-or-omission": "2025-07-15" });
  check("a debt claim's two-year date is counted from that day", /15 July 2027/.test(debt), debt.slice(-400));
  const injuryOnly = await deadlineText("before-filing:deciding-whether-to-sue", { "sc-date-injury": "2025-01-13" });
  check("an injury date still counts the two years where it was given", /13 January 2027/.test(injuryOnly));

  const ice = await deadlineText("before-filing:notice-snow-ice-private", { "sc-date-injury": "2025-01-13" });
  check("the ice-slip notice date is counted and said to have passed", /14 March 2025/.test(ice) && /already passed/.test(ice), ice.slice(-600));
  check("the two-year date is counted from the injury", /13 January 2027/.test(ice));
  const presumptionAt = ice.indexOf("presumes");
  check(
    "the two-year date is introduced as a presumption that can be displaced",
    presumptionAt >= 0 && presumptionAt < ice.indexOf("13 January 2027") && /unless you can prove/.test(ice),
  );

  const corpus = readFileSync(path.resolve(__dirname, "../../docs/sources/corpus/limitations-act-2002.txt"), "utf8").replace(/\s+/g, " ");
  check("the s. 5 (2) quote is in the vendored Limitations Act", corpus.includes(S_LIMITATIONS_5_2_PRESUMPTION.quote));

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll presumed-limitation checks passed.");
}

void main();
