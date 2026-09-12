/**
 * Two defendant stories end to end through the real pipeline, exercising the
 * three questions added for the gaps in docs/INTAKE_ENTRY_POINT_DESIGN.md
 * §1c, plus the derived stage from caseStageDerivation.ts.
 *
 *   D-A  served recently, disputing the facts
 *   D-B  further along — admits part, cannot pay at once, and is thinking
 *        about a claim of their own. Exercises the r. 9.03 route and the
 *        counterclaim question, which had no coverage at all before.
 *
 * The journey invariant suite is applied to both, so this is an assertion
 * run rather than a capture run.
 *
 * Entrypoint guard per the runFullClaimTypeSurvey.ts incident.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runStoryThroughPipeline, type PipelineStoryInput } from "./fixtures/pipelineRunner";
import { checkJourney } from "./journeyInvariants";
import { deriveCaseStage } from "../../src/lib/case-system/intake/caseStageDerivation";
import {
  setInterceptionContext,
  getInterceptions,
  clearInterceptions,
} from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "scripts", "verification", "fixtures", "journeyBattery");

const BASE: Record<string, string> = {
  "sc-orient-when-happened": "About five weeks ago.",
  "sc-orient-role": "Defending a claim (defendant)",
  "sc-orient-dispute-category": "Defending a Small Claims case",
  "sc-claim-filed": "Yes -- the other side filed a claim against me.",
  "sc-defendant-served": "Yes, I was served.",
  "sc-defence-filed": "No, not yet.",
  "sc-defence-time-elapsed": "I am not sure how many days it has been.",
  "sc-defendant-noted-in-default": "I don't know.",
  "sc-contractor-completion-date": "Not applicable.",
  "sc-contractor-notice-before-replacement": "Not applicable.",
  "sc-safety-check": "No safety concerns.",
  "sc-amount-claimed": "They are claiming about $6,000.",
  "sc-evidence-available": "I have our text messages and the original written quote.",
  "sc-remedy-sought": "I want the claim against me dismissed.",
  "sc-service-details": "I was handed the papers.",
  "sc-defamation-publication-details": "Not applicable.",
  "sc-defendant-claim-received": "A Plaintiff's Claim with a court file number, and some attachments.",
  "sc-defendant-response-facts": "I agree I hired them. I disagree that the work was finished properly.",
  "sc-defendant-response-evidence": "Photographs of the work and an invoice from the person who redid it.",
  "sc-defendant-outcome": "I want the claim dismissed.",
};

const JOURNEYS: (PipelineStoryInput & { note: string })[] = [
  {
    id: "D-A-served-recently-disputes-facts",
    note: "Served recently, disputing the facts. Exercises the new service-method question.",
    story:
      "A contractor served me with court papers about three weeks ago over a basement job. He says I " +
      "owe him the balance. He left partway through and what he did finish had to be pulled out and " +
      "redone by someone else, which I paid for. I do not accept I owe him the balance.",
    answers: {
      ...BASE,
      "sc-defendant-service-method":
        "A person came to my door and handed the envelope to me directly. That was the 21st.",
      "sc-defendant-counterclaim":
        "He damaged a pipe on the way out and I paid about $900 to fix it. I have not started anything of my own.",
      "sc-defendant-admission-payment":
        "I do not accept I owe him anything, so there is nothing I am trying to arrange payment on.",
    },
    location: { province: "Ontario", city: "Toronto" },
  },
  {
    id: "D-B-admits-part-cannot-pay-at-once",
    note: "Further along: admits part, payment is the difficulty (r. 9.03), and considering a counterclaim.",
    story:
      "I was served a while back over an unpaid supplier account and I have already filed my defence. " +
      "Honestly I do accept I owe them for the first two deliveries. What I cannot do is pay the whole " +
      "thing in one go on what I earn. The last delivery was the wrong specification and I sent it " +
      "back, and they never credited me for it.",
    answers: {
      ...BASE,
      "sc-defence-filed": "Yes, I filed my defence already.",
      "sc-defendant-response-facts":
        "I agree I owe for the first two deliveries. I disagree about the third, which I returned.",
      "sc-defendant-outcome":
        "I want to pay what I actually owe, over time, and not be charged for the delivery I sent back.",
      "sc-defendant-service-method":
        "It came by registered mail and I had to sign for it. I signed on the 4th.",
      "sc-defendant-counterclaim":
        "They still have the returned stock and never credited me about $1,400 for it. I have not started my own claim.",
      "sc-defendant-admission-payment":
        "Yes, I accept the first two deliveries. The problem is paying it all at once, not the amount.",
    },
    location: { province: "Ontario", city: "Ottawa" },
  },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`Defendant journeys: ${JOURNEYS.length}`);
  console.log(`Estimated cost: $${((0.08 / 19) * JOURNEYS.length).toFixed(3)}\n`);
  if (dryRun) return console.log("--dry-run: stopping before any billed call.");
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const lines: string[] = ["# Defendant journeys — gap-closure verification", ""];

  for (const j of JOURNEYS) {
    process.stdout.write(`  ${j.id} ... `);
    clearInterceptions();
    setInterceptionContext(j.id);
    const run = await runStoryThroughPipeline(j, apiKey);
    const violations = checkJourney(run);
    const caught = [...getInterceptions()];
    const stage = deriveCaseStage(run.finalFacts);

    console.log(`${run.turns.length} turns, ${violations.length} violation(s), ${caught.length} catch(es), stage=${stage.stage}`);

    const asked = run.turns.map((t) => t.questionAsked).filter(Boolean) as string[];
    const newOnes = ["sc-defendant-service-method", "sc-defendant-counterclaim", "sc-defendant-admission-payment"];

    lines.push(`## ${j.id}`, "", `${j.note}`, "", "```", run.input.story, "```", "");
    lines.push(`- turns: ${run.turns.length} | halted: ${run.halted} | complete: ${run.intakeComplete}`);
    lines.push(`- derived stage: **${stage.stage}** — ${stage.basis.join("; ")}`);
    lines.push(`- matched claim type: ${run.retainedMatchedClaimType?.claimTypeId ?? "(none)"}`);
    lines.push("", "### New questions reached", "");
    for (const id of newOnes) lines.push(`- \`${id}\`: ${asked.includes(id) ? "ASKED" : "not asked"}`);
    lines.push("", "### Captured fields", "", "```json", JSON.stringify(run.finalFacts, null, 2), "```", "");
    lines.push("### Invariant violations", "");
    if (!violations.length) lines.push("_None._", "");
    for (const v of violations) lines.push(`- **${v.invariant}** [\`${v.sourceField}\`] ${v.detail}`);
    lines.push("", "### Sanitizer interceptions", "");
    if (!caught.length) lines.push("_None._", "");
    for (const c of caught) lines.push(`- ${c.kind} \`${c.field}\` matched "${c.matchedTerm}"`);
    lines.push("", "### Analysis output (complete)", "", "```json", JSON.stringify(run.analysisOutput ?? null, null, 2), "```", "");
  }

  fs.writeFileSync(path.join(OUT_DIR, "_DEFENDANT_JOURNEYS.md"), lines.join("\n") + "\n", "utf8");
  console.log(`\nWrote ${path.relative(REPO_ROOT, path.join(OUT_DIR, "_DEFENDANT_JOURNEYS.md"))}`);
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
