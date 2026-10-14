/**
 * Checks the routing rules fixed by law (src/lib/case-system/intelligence/
 * fixedRegimes.ts, CLAUDE.md s. 2a): a construction lien goes to the Superior
 * Court whatever the amount, and a claimed amount over $50,000 leaves Small
 * Claims -- decided in code, winning over the keyword pass and the model.
 *
 * Exists to catch: the 2026-10-13 lien walkthrough, where routing a lien rested
 * on one sentence of a prompt and the person was then given the ordinary civil
 * Defence deadline. Also catches a false hit (a car repair lien, a condo
 * common-expense lien, a house price that is not the amount claimed) that would
 * send someone to the wrong court, and a rule quote that has drifted from the
 * official text in docs/sources/corpus.
 *
 * Offline and free: the model is never called (applyFixedRegime is fed the
 * shapes a model returns).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  applyFixedRegime,
  classifyCourtPath,
  type CourtPathClassification,
} from "../../src/lib/case-system/intelligence/courtPathClassifier";
import {
  CONSTRUCTION_ACT_S50_1,
  SMALL_CLAIMS_LIMIT_RULE,
  claimedAmounts,
  detectsConstructionLien,
  fixedRegimeFor,
} from "../../src/lib/case-system/intelligence/fixedRegimes";
import { NO_MATTERS } from "../../src/lib/content-library/crossForumNotes";

delete process.env.OPENAI_API_KEY;

let failures = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${name}`))
    .catch((error: unknown) => {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  FAIL ${name}\n       ${message}`);
      // Shown on the pull request's checks page, where the job log may not be readable.
      if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:fixed-regimes::${name}: ${message.replace(/\n/g, " ")}`);
    });
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function corpusText(id: string): string {
  const manifest = JSON.parse(
    readFileSync(path.join(process.cwd(), "docs/sources/corpus/manifest.json"), "utf8"),
  ) as { entries: Array<{ id: string; file: string }> };
  const entry = manifest.entries.find((s) => s.id === id);
  assert.ok(entry, `corpus has no source ${id}`);
  return norm(readFileSync(path.join(process.cwd(), "docs/sources/corpus", entry.file), "utf8"));
}

const LIENS = [
  // The 2026-10-13 walkthrough story.
  "Our interlock contractor did a poor job on the driveway, wrong slopes and a bad base. We told him to stop and he registered a $60,000 construction lien on our house.",
  "The contractor put a lien on my property after I refused to pay for the unfinished renovation.",
  "I'm a subcontractor, I did the framing and the builder never paid me $18,000. Can I put a lien on the house?",
  "A roofer registered a lien on title to our home for $9,500.",
  "We need to know the holdback rules before paying the renovation company.",
];

const NOT_LIENS = [
  "The garage kept my car and says they have a lien on it until I pay the repair bill of $2,400.",
  "My condo corporation registered a lien for unpaid common expenses.",
  "CRA put a tax lien on my account.",
  "My contractor never finished my kitchen and owes me back $7,000.",
  "My neighbour's tree fell on my fence and damaged the house.",
];

function classification(over: Partial<CourtPathClassification>): CourtPathClassification {
  return {
    primaryPath: "small-claims",
    secondaryPath: null,
    outOfScopeForum: null,
    confidence: 0.8,
    reasoning: "model reasoning",
    source: "ai",
    aiCalled: true,
    matters: NO_MATTERS,
    ...over,
  };
}

async function main() {
  console.log("Fixed-by-law routing rules");

  await check("each rule quote is word for word in the official text", () => {
    for (const rule of [CONSTRUCTION_ACT_S50_1, SMALL_CLAIMS_LIMIT_RULE]) {
      assert.ok(corpusText(rule.sourceId).includes(norm(rule.quote)), `${rule.sourceId} ${rule.pinpoint} quote not found`);
    }
  });

  for (const story of LIENS) {
    await check(`lien detected: ${story.slice(0, 60)}...`, () => {
      assert.equal(detectsConstructionLien(story), true);
      assert.equal(fixedRegimeFor(story)?.id, "construction-lien");
    });
  }
  for (const story of NOT_LIENS) {
    await check(`not a construction lien: ${story.slice(0, 60)}...`, () => {
      assert.equal(detectsConstructionLien(story), false);
    });
  }

  await check("a lien under $50,000 still goes to the Superior Court, over a model that said small-claims", () => {
    const story = LIENS[3];
    const result = applyFixedRegime(classification({ primaryPath: "small-claims" }), story);
    assert.equal(result.primaryPath, "civil");
    assert.equal(result.regime, "construction-lien");
    assert.match(result.reasoning, /s\. 50 \(1\)/);
    assert.ok(result.confidence >= 0.9);
  });

  await check("a lien overrides an out-of-scope answer too", () => {
    const result = applyFixedRegime(
      classification({ primaryPath: "out-of-scope", outOfScopeForum: { id: "cat" } as never }),
      LIENS[1],
    );
    assert.equal(result.primaryPath, "civil");
    assert.equal(result.outOfScopeForum, null);
  });

  await check("a family story mentioning a lien keeps family first, civil beside it", () => {
    const result = applyFixedRegime(classification({ primaryPath: "family" }), LIENS[1]);
    assert.equal(result.primaryPath, "family");
    assert.equal(result.secondaryPath, "civil");
    assert.equal(result.regime, "construction-lien");
  });

  await check("the lien rule holds offline, with no model at all", async () => {
    const result = await classifyCourtPath({ story: LIENS[0], allowExternalCognition: false });
    assert.equal(result.primaryPath, "civil");
    assert.equal(result.regime, "construction-lien");
  });

  await check("claimed amounts read only amounts tied to the claim", () => {
    assert.deepEqual(claimedAmounts("I'm suing my former employer for $80,000."), [80_000]);
    assert.deepEqual(claimedAmounts("He owes me $75k for the truck."), [75_000]);
    assert.deepEqual(claimedAmounts("We bought the house for $650,000 and the roofer owes us $4,000."), [4_000]);
    assert.deepEqual(claimedAmounts("My salary was $95,000."), []);
  });

  await check("a claimed amount over $50,000 moves a small-claims answer to civil", () => {
    const result = applyFixedRegime(
      classification({ primaryPath: "small-claims" }),
      "I'm suing the dealership for $82,000 for the defective boat.",
    );
    assert.equal(result.primaryPath, "civil");
    assert.equal(result.regime, "over-small-claims-limit");
    assert.match(result.reasoning, /\$50,000/);
  });

  await check("a house price is not the amount claimed", () => {
    const result = applyFixedRegime(
      classification({ primaryPath: "small-claims" }),
      "We bought a $700,000 house and the seller hid a leak; repairs cost $12,000 and we want it back.",
    );
    assert.equal(result.primaryPath, "small-claims");
    assert.equal(result.regime, null);
  });

  await check("the money limit leaves family and tribunal answers alone", () => {
    const story = "My ex is claiming $90,000 of the house equity.";
    assert.equal(applyFixedRegime(classification({ primaryPath: "family" }), story).primaryPath, "family");
    const ltb = applyFixedRegime(
      classification({ primaryPath: "out-of-scope", outOfScopeForum: { id: "ltb" } as never }),
      "My landlord is claiming $60,000 in rent arrears.",
    );
    assert.equal(ltb.primaryPath, "out-of-scope");
  });

  await check("no rule: the classification passes through unchanged, regime null", () => {
    const before = classification({ primaryPath: "small-claims", reasoning: "keep me" });
    const after = applyFixedRegime(before, "My neighbour's dog bit me and the vet bill was $900.");
    assert.equal(after.primaryPath, "small-claims");
    assert.equal(after.reasoning, "keep me");
    assert.equal(after.regime, null);
  });

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll fixed-routing checks passed.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:fixed-regimes::${message.replace(/\n/g, " ")}`);
  process.exit(1);
});
