/**
 * Plain-language explanations of provisions are shown only when an
 * independent second model call and code have both found nothing wrong with
 * them (src/lib/case-system/retrieval/explainProvision.ts).
 *
 * WHAT IT CATCHES:
 *   - An explanation shown although the checking call found something in it
 *     the provision does not say, or something the provision says that it
 *     leaves out.
 *   - The checking call being given the first call's prompt or feedback
 *     (it must see only the provision and the explanation, or it is not
 *     independent).
 *   - A malformed or failed check treated as a pass (it must fail closed).
 *   - A changed, rounded or invented number, outcome wording, or advice to
 *     the reader getting through because the checking call missed it.
 *   - Explaining anything other than an indexed, hash-verified passage: the
 *     route takes an id, never text.
 *   - The switch not turning the feature off, or the panel offering the
 *     button when it is off.
 *   - A model call without structured output, or one not audited.
 *
 * COSTS NOTHING. Both model calls are stubs; the built index is read from
 * disk when present. No network, no database.
 *
 * Run: npm run test:plain-explanations
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  clearExplanationCache,
  explainChecked,
  explainPassage,
  explanationRejection,
  parseExplanation,
  parseVerdict,
  provisionOf,
  EXPLAIN_SYSTEM_PROMPT,
  VERIFY_SYSTEM_PROMPT,
  type ProvisionForExplaining,
  type Verdict,
} from "../../src/lib/case-system/retrieval/explainProvision";
import { loadCorpusIndex, readPassage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { plainExplanationsEnabled } from "../../src/lib/content-library/phaseScope";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

// A synthetic provision: the checks are about the pipeline, not about any law.
const PROVISION: ProvisionForExplaining = {
  citation: "Example Act, S.O. 2099, c. 1, s. 4(2)",
  text: "A person may apply within six months after the event, unless the court extends the time under subsection (3). The amount shall not exceed $35,000.",
  decision: false,
};
const GOOD =
  "A person can apply within six months after the event. The court can give more time under subsection (3). The amount cannot be more than $35,000.";
const CLEAN: Verdict = { unsupported: [], missing: [] };

async function main() {
  console.log("\n1. Code checks every explanation before the checking call sees it");
  check("a faithful explanation passes", explanationRejection(PROVISION, GOOD) === null, String(explanationRejection(PROVISION, GOOD)));
  check(
    "a number not in the provision is refused",
    explanationRejection(PROVISION, GOOD.replace("$35,000", "$50,000")) !== null,
  );
  check(
    "a converted number is refused (\"six months\" written as 180 days)",
    explanationRejection(PROVISION, GOOD.replace("six months", "180 days")) !== null,
  );
  check("numbers from the citation are allowed", explanationRejection(PROVISION, `${GOOD} This is section 4(2).`) === null);
  check("advice to the reader is refused", explanationRejection(PROVISION, `${GOOD} You should apply soon.`) !== null);
  check("talk of the reader's case is refused", explanationRejection(PROVISION, `${GOOD} This helps your case.`) !== null);
  check("talk of chances is refused", explanationRejection(PROVISION, `${GOOD} Your chances are good.`) !== null);
  const disputeProvision = { ...PROVISION, text: `${PROVISION.text} A consumer may dispute the amount.` };
  check(
    "a deny-listed word the provision itself uses is allowed",
    explanationRejection(disputeProvision, `${GOOD} A consumer may dispute the amount.`) === null,
  );
  check(
    "the same word is refused when the provision does not use it",
    explanationRejection(PROVISION, `${GOOD} A consumer may dispute the amount.`) !== null,
  );
  check("an empty or too-short explanation is refused", explanationRejection(PROVISION, "It is a rule.") !== null);
  check("an overlong explanation is refused", explanationRejection(PROVISION, `${GOOD} `.repeat(10)) !== null);

  console.log("\n2. The checking call's answer fails closed");
  check("a clean verdict parses", JSON.stringify(parseVerdict('{"unsupported":[],"missing":[]}')) === JSON.stringify(CLEAN));
  check("findings parse", parseVerdict('{"unsupported":["x"],"missing":[]}')?.unsupported.length === 1);
  check("prose is not a verdict", parseVerdict("Looks fine to me.") === null);
  check("a verdict missing a list is not a verdict", parseVerdict('{"unsupported":[]}') === null);
  check("a list that is not a list is not a verdict", parseVerdict('{"unsupported":"none","missing":[]}') === null);
  check("an explanation that is not a string is nothing", parseExplanation('{"explanation":5}') === null);

  console.log("\n3. Shown only when the independent check finds nothing");
  const seenByVerifier: string[] = [];
  const stubVerify = (verdicts: (Verdict | null)[]) => async (provision: ProvisionForExplaining, explanation: string) => {
    seenByVerifier.push(JSON.stringify({ provision, explanation }));
    return verdicts.shift() ?? CLEAN;
  };
  const feedbackSeen: (Verdict | undefined)[] = [];
  const stubGenerate = (texts: (string | null)[]) => async (_: ProvisionForExplaining, feedback?: Verdict) => {
    feedbackSeen.push(feedback);
    return texts.shift() ?? null;
  };

  let out = await explainChecked(PROVISION, { generate: stubGenerate([GOOD]), verify: stubVerify([CLEAN]) });
  check("a clean check shows the explanation", "explanation" in out && out.explanation === GOOD);

  feedbackSeen.length = 0;
  out = await explainChecked(PROVISION, {
    generate: stubGenerate([GOOD, GOOD]),
    verify: stubVerify([{ unsupported: [], missing: ["the exception in subsection (3)"] }, CLEAN]),
  });
  check("a finding gets one more attempt, checked from scratch", "explanation" in out);
  check("the second attempt is told what the check found", feedbackSeen[1]?.missing[0] === "the exception in subsection (3)");

  out = await explainChecked(PROVISION, {
    generate: stubGenerate([GOOD, GOOD]),
    verify: stubVerify([{ unsupported: ["says must"], missing: [] }, { unsupported: [], missing: ["the cap"] }]),
  });
  check("findings on both attempts: nothing is shown", "failed" in out && out.failed === "unchecked");

  out = await explainChecked(PROVISION, { generate: stubGenerate([GOOD]), verify: async () => null });
  check("a failed or malformed check: nothing is shown", "failed" in out);

  out = await explainChecked(PROVISION, {
    generate: stubGenerate([GOOD.replace("$35,000", "$40,000"), GOOD.replace("$35,000", "$45,000")]),
    verify: async () => CLEAN,
  });
  check("code refuses a changed number even when the check passes it", "failed" in out);

  feedbackSeen.length = 0;
  out = await explainChecked(PROVISION, {
    generate: stubGenerate([`${GOOD} `.repeat(10), GOOD]),
    verify: stubVerify([CLEAN]),
  });
  check("a code refusal is explained to the second attempt, which can then pass", "explanation" in out && Boolean(feedbackSeen[1]?.problem));

  out = await explainChecked(PROVISION, {
    generate: async () => {
      throw new Error("network");
    },
    verify: stubVerify([CLEAN]),
  });
  check("a model error is caught, and nothing is shown", "failed" in out && out.failed === "error");

  seenByVerifier.length = 0;
  await explainChecked(PROVISION, { generate: stubGenerate([GOOD]), verify: stubVerify([CLEAN]) });
  const verifierInput = seenByVerifier[0] ?? "";
  check(
    "the checking call sees only the provision and the explanation",
    verifierInput.includes(PROVISION.text) && verifierInput.includes(GOOD) && !verifierInput.includes("feedback"),
  );
  check(
    "the two calls have different instructions (the checker is not the writer's prompt)",
    (EXPLAIN_SYSTEM_PROMPT as string) !== VERIFY_SYSTEM_PROMPT && !VERIFY_SYSTEM_PROMPT.includes(EXPLAIN_SYSTEM_PROMPT.slice(0, 60)),
  );
  check("the checker is told it did not write the explanation", /did not write/i.test(VERIFY_SYSTEM_PROMPT));

  console.log("\n4. Only an indexed, hash-verified passage is explained");
  check("an unknown id is not found", (await explainPassage("corpus:nothing:1", { index: null })).ok === false);
  const index = loadCorpusIndex(ROOT);
  if (!index) {
    console.log("  info  no built index here; the indexed-passage checks are skipped");
  } else {
    clearExplanationCache();
    const [id] = index.meta.chunks.find(([chunkId]) => readPassage(index, chunkId, 1)) ?? [];
    const passage = id ? readPassage(index, id, 1) : null;
    check("a real passage can be read", Boolean(passage));
    if (id && passage) {
      const provision = provisionOf(passage);
      let generated = 0;
      const deps = {
        index,
        generate: async (p: ProvisionForExplaining) => {
          generated += 1;
          return p.text === passage.text ? `This provision says what it says, as written in ${provision.citation}.` : null;
        },
        verify: async () => CLEAN,
      };
      const first = await explainPassage(id, deps);
      check("the model is given the passage's own words", first.ok, JSON.stringify(first));
      check("the result names the provision", first.ok && first.citation === provision.citation);
      await explainPassage(id, deps);
      check("a second request for the same passage is served from the cache", generated === 1, `${generated} generations`);
      check("a decision paragraph is marked as one", provisionOf({ ...passage, source: { ...passage.source, tier: "case-law" } }).decision);
    }
  }

  console.log("\n5. Switches and wiring");
  check("on by default", plainExplanationsEnabled({}));
  check("PLAIN_EXPLANATIONS=off turns it off", !plainExplanationsEnabled({ PLAIN_EXPLANATIONS: "off" }));
  check("AI_ANALYSIS_TEXT_TO_USERS=off turns it off too", !plainExplanationsEnabled({ AI_ANALYSIS_TEXT_TO_USERS: "off" }));

  const route = read("app/api/law/explain/route.ts");
  check("the route checks the switch", route.includes("plainExplanationsEnabled()"));
  check("the route accepts a corpus id, never text", /const ID = \/\^corpus:/.test(route) && !/body\)?\.text|\.text\b.*body/.test(route));
  const brain = read("src/lib/case-system/intelligence/courtSimplifiedBrain.ts");
  check("the analysis marks items explainable only when the switch is on", /explainable = plainExplanationsEnabled\(\)/.test(brain));
  const panel = read("app/_components/AppliedLawPanel.tsx");
  check("the panel offers the button only for explainable items", /item\.explainable \? <ExplainProvision/.test(panel));
  const control = read("app/_components/ExplainProvision.tsx");
  check("the control sends only the id", /JSON\.stringify\(\{ id \}\)/.test(control));
  check("the control says when nothing passed the check", /passed our check/.test(control));

  const module = read("src/lib/case-system/retrieval/explainProvision.ts");
  check("every model call declares structured output", (module.match(/chat\.completions\.create\(/g) ?? []).length === 1 && module.includes('response_format: { type: "json_object" }'));
  check("model calls are audited", module.includes("withAiCallContext("));
  const guard = read("scripts/verification/verifyOutputGuard.ts");
  check("declared as a model call site", guard.includes('"src/lib/case-system/retrieval/explainProvision.ts"'));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
