/**
 * Session 4 proof -- NOT a CI script, NOT a verification script. Makes up
 * to 3 real, billed OpenAI calls (one per test story). Run manually only:
 *
 *   node --import tsx --env-file=.env.local scripts/proofs/runSafetyPassProof.ts
 *
 * Proves: safetyPass.ts correctly classifies 3 hand-written stories
 * (clear / distress / immediate-danger) and, for the clear story only,
 * hands off cleanly into extractIntakeFacts.ts -- the gap flagged at the
 * end of Session 3 (docs/AI_INTAKE_DESIGN.md, "Open questions" and the
 * Session 3 commit note): no free-text story should reach extraction
 * without this running first.
 *
 * Exactly 3 stories, per this session's scope -- not a broader test suite.
 */

import { runSafetyPass } from "../../src/lib/case-system/intake/safetyPass";
import { extractIntakeFacts } from "../../src/lib/case-system/intake/extractIntakeFacts";

// Same story used in Session 3's runUnpaidDebtServicesProof.ts.
const CLEAR_STORY =
  "I'm a freelance web developer. Back in April, I built a full website for a small business owner " +
  "and delivered the finished site along with all the source files. We'd agreed by email that they'd " +
  "pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't paid me " +
  "anything, and they've stopped responding to my emails about the unpaid invoice.";

const DISTRESS_STORY =
  "I've been trying to deal with this dispute for months and it's completely consumed me. I can't " +
  "sleep, I cry constantly, and I feel like I'm losing my mind over this unpaid invoice. I'm not in " +
  "any danger, I just feel so overwhelmed and hopeless about ever getting my money back, and some " +
  "days I don't know how I'm going to get through it.";

const IMMEDIATE_DANGER_STORY =
  "My ex-business partner showed up at my house last night screaming that he was going to kill me if " +
  "I ever contacted the client again. He punched a hole in my door and said he knows where my kids go " +
  "to school. I'm terrified and don't know what to do.";

const STORIES: { label: string; text: string }[] = [
  { label: "clear (Session 3's story)", text: CLEAR_STORY },
  { label: "distress (hand-written)", text: DISTRESS_STORY },
  { label: "immediate-danger (hand-written)", text: IMMEDIATE_DANGER_STORY },
];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  for (const story of STORIES) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`=== Story: ${story.label} ===`);
    console.log(story.text);

    const safety = await runSafetyPass(story.text, apiKey);
    console.log(`\nSafety pass classification: ${safety.classification}`);
    if (safety.reason) console.log(`Reason (internal logging only, not shown to user): ${safety.reason}`);

    if (safety.classification === "immediate-danger") {
      console.log(`\nFixed user-facing message (intake HALTS, extraction does not run):`);
      console.log(safety.userMessage);
      continue;
    }

    if (safety.classification === "distress") {
      console.log(`\nFixed acknowledgment (intake continues at a slower pace -- mechanism not built this session):`);
      console.log(safety.userMessage);
    }

    console.log(`\nProceeding to extraction...`);
    const facts = await extractIntakeFacts(story.text, apiKey);
    console.log("Extracted facts:", JSON.stringify(facts, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
