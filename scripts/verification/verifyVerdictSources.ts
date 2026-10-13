/**
 * Every provision a published answer was proved from is in its source list
 * (2026-10-13).
 *
 * WHAT IT CATCHES: the generated list going stale after a release; a quote
 * placed in the wrong subsection (the first cut credited r. 9.03 (2) to
 * 9.03 (1) because a heading sat between them); a table row from a schedule
 * credited to the section above it; the answer's list not showing the added
 * provisions.
 *
 * COSTS NOTHING: no network, no model.
 *
 * Run: npm run test:verdict-sources
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { buildVerdictSources, pinpointForQuote } from "../content/buildVerdictSources";
import { renderStageAnswer } from "../../src/lib/content-library/stageAnswerView";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const SC = "oreg-258-98-small-claims-rules";

console.log("\n1. The generated list is current");
{
  const saved = readFileSync(path.join(ROOT, "src/lib/content-library/published/verdictSources.generated.json"), "utf8");
  check("verdictSources.generated.json matches a fresh build", saved === `${JSON.stringify(buildVerdictSources(), null, 2)}\n`, "run: npx tsx scripts/content/buildVerdictSources.ts");
}

console.log("\n2. Quotes land in the subsection they are printed under");
{
  const placed = (quote: string, source = SC) => pinpointForQuote(source, quote);
  check("a defendant's claim: r. 10.01 (2)", placed("The defendant's claim shall be in Form 10A and may be issued, (a) within 20 days after the day on which the defence is filed;") === "r. 10.01 (2)");
  check("a heading between subsections doesn't shift the number: r. 9.03 (2)", placed("If the plaintiff does not dispute the proposal within the 20-day period referred to in subrule (3),") === "r. 9.03 (2)");
  check("a subsection on the rule's own line: r. 9.03 (1)", placed("A defendant who admits liability for all or part of the plaintiff's claim but wishes to arrange terms of payment") === "r. 9.03 (1)");
  check("the clerk fixes the conference: r. 13.01 (2)", placed("The clerk shall fix a time, date and place for the settlement conference") === "r. 13.01 (2)");
  check("a statute: Limitations Act s. 7 (2)", placed("A person shall be presumed to have been capable of commencing a proceeding", "limitations-act-2002") === "s. 7 (2)");
  check("a schedule's table row is never placed", placed("LIBEL AND SLANDER ACT |SECTION 6 |", "limitations-act-2002") === null);
  check("a quote not in the text is never placed", placed("The defendant may file a defence at any time before trial without leave.") === null);
}

console.log("\n3. The answer's source list shows them");
{
  const answer = renderStageAnswer("defendant:served-defence-period-running");
  const listed = (answer?.sources ?? []).map((source) => source.pinpoint);
  check("the defence step lists r. 10.01 (2) for the defendant's-claim sentence", listed.includes("r. 10.01 (2)"), listed.join(", "));
  check("its own citations still come first", listed[0] === "r. 9.01", listed.join(", "));
  check("no provision is listed twice", new Set((answer?.sources ?? []).map((source) => `${source.name}|${source.pinpoint}`)).size === listed.length);
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
