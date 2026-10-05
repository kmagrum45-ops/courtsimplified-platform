/**
 * Arbitrary model text cannot reach a user, and every user-facing model call
 * returns structured output.
 *
 *   npm run test:output-guard
 *
 * COSTS NOTHING. Pure functions and source scanning. No model call.
 *
 * *** THE TWO PROPERTIES ***
 *
 * 1. ALLOWLIST, NOT DENY-LIST. A string reaches a user only if it is a
 *    content-library item or an allowlisted non-legal system message. The
 *    important assertions here are the NEGATIVE ones: plausible, well-behaved,
 *    non-obviously-wrong model prose is still blocked, because it is not
 *    approved content. A deny-list would pass most of these.
 *
 * 2. STRUCTURED OUTPUT. Every generative call in a user flow must pass
 *    `response_format`, so the model returns fields rather than prose. This is
 *    the check that would have caught explainQuestion, which had none.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  checkUserContent,
  ALLOWED_SYSTEM_MESSAGES,
} from "../../src/lib/content-library/outputGuard";
import { collectContentInventory } from "../../src/lib/content-library/contentInventory";
import { nextStepBlockFor } from "../../src/lib/content-library/nextSteps";
import { pathwayDescriptionFor } from "../../src/lib/content-library/pathwayDescriptions";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Source with comments removed.
 *
 * Needed because the checks below count occurrences of expressions this
 * codebase also discusses at length in prose — see the note at the
 * response_format count.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/**
 * Text a model could plausibly produce. None of it is in the library, so none
 * of it may be shown — regardless of how reasonable it sounds.
 *
 * Several of these are deliberately INNOCUOUS. A guard that only blocks
 * obviously bad output is a deny-list wearing an allowlist's clothes.
 */
const MODEL_PROSE = [
  "Based on what you've told me, you should file a Plaintiff's Claim within two years.",
  "Your case looks strong.",
  "You will probably win this.",
  "The judge may ask about the invoice dates.",
  "I'd suggest gathering your receipts before the settlement conference.",
  // Innocuous, accurate-sounding, still not approved content:
  "You may want to keep copies of everything.",
  "Small Claims Court handles claims up to $50,000.",
  "Consider speaking with a lawyer.",
  "Next, organize your documents by date.",
];

function main(): void {
  // ---- 1. Model prose is blocked, including the harmless-sounding kind ----

  for (const prose of MODEL_PROSE) {
    const result = checkUserContent(prose);
    check(
      `blocked: "${prose.slice(0, 52)}${prose.length > 52 ? "…" : ""}"`,
      !result.allowed,
      `guard allowed it as ${result.allowed ? result.reason : ""}`,
    );
  }

  // ---- 2. Real library content passes ----

  const inventory = collectContentInventory();
  const servable = inventory.filter((entry) => !entry.text.includes("[NEEDS LICENSEE REVIEW:"));

  check(
    "the inventory is not empty (so the checks above are not vacuous)",
    servable.length > 20,
    `only ${servable.length} servable items`,
  );

  let allowedCount = 0;
  for (const entry of servable.slice(0, 40)) {
    if (checkUserContent(entry.text).allowed) allowedCount += 1;
  }
  check(
    "library items are allowed through",
    allowedCount === Math.min(40, servable.length),
    `${allowedCount} of ${Math.min(40, servable.length)} allowed`,
  );

  // A next-step block rendered LINE BY LINE, which is how the summary renders
  // it, must still pass. This failed on the first run and is why the guard
  // indexes individual lines.
  const block = nextStepBlockFor("small-claims", "starting-case");
  check("a next-step block exists for small-claims/starting-case", Boolean(block));
  if (block) {
    const lines = block.text.split("\n").map((line) => line.trim()).filter(Boolean);
    const allLinesPass = lines.every((line) => checkUserContent(line).allowed);
    check(
      "every line of a next-step block passes when rendered separately",
      allLinesPass,
      lines.find((line) => !checkUserContent(line).allowed)?.slice(0, 70),
    );
  }

  const pathway = pathwayDescriptionFor("small-claims");
  check(
    "a pathway description passes",
    Boolean(pathway && checkUserContent(pathway.text).allowed),
  );

  // ---- 3. Allowlisted system messages pass, and nothing else does ----

  for (const message of ALLOWED_SYSTEM_MESSAGES) {
    check(
      `system message allowed: "${message.slice(0, 40)}…"`,
      checkUserContent(message).reason === "system-message",
    );
  }

  check(
    "a near-miss of an allowlisted message is NOT allowed",
    !checkUserContent(
      "This question helps us understand your situation. If you're unsure, just guess.",
    ).allowed,
  );

  // ---- 4. Placeholders never reach a user ----

  check(
    "a placeholder is blocked even though it IS a library item",
    !checkUserContent("[NEEDS LICENSEE REVIEW: family next steps]").allowed,
  );

  const placeholderItem = inventory.find((entry) =>
    entry.text.includes("[NEEDS LICENSEE REVIEW:"),
  );
  check(
    "placeholders exist in the inventory (so the check above is meaningful)",
    Boolean(placeholderItem),
  );
  if (placeholderItem) {
    check(
      "the real placeholder item is blocked",
      checkUserContent(placeholderItem.text).reason === "placeholder",
    );
  }

  // ---- 5. Empty and whitespace ----

  check("empty string is blocked", !checkUserContent("").allowed);
  check("whitespace is blocked", !checkUserContent("   \n  ").allowed);

  // ---- 6. Every user-facing model call passes response_format ----
  //
  // This is the property that would have caught explainQuestion.ts, which had
  // no response_format and returned prose straight to the screen.

  const callSites = [
    "src/lib/case-system/intake/safetyPass.ts",
    "src/lib/case-system/intake/extractIntakeFacts.ts",
    "src/lib/case-system/intake/claimTypeAiClassifier.ts",
    "src/lib/case-system/intelligence/courtPathClassifier.ts",
    "src/lib/case-system/intelligence/courtSimplifiedBrain.ts",
    // Added 2026-09-30. All four were live call sites the list had not caught
    // up with; the per-file check above is what confirms each declares
    // response_format.
    "src/lib/case-system/caseReview/caseReviewModel.ts",
    "src/lib/case-system/chat/libraryChat.ts",
    "src/lib/case-system/intake/storyAnswerProposals.ts",
    "src/lib/case-system/stage-map/resolveCasePosition.ts",
    // Added 2026-10-04: spelling suggestions for the user's own words. JSON
    // output, validated field by field in code before anything is shown.
    "src/lib/case-system/intake/tidyWording.ts",
    // Added 2026-10-05: writes legal search phrases from the story for
    // meaning-based retrieval. JSON output; nothing it writes is shown, it
    // only chooses which verified passages the analysis may cite.
    "src/lib/case-system/retrieval/storyRetrieval.ts",
    // Added 2026-10-05: plain-language explanation of one provision, and the
    // independent check of it. JSON output; shown only when the check and
    // code both pass it (verifyPlainExplanations).
    "src/lib/case-system/retrieval/explainProvision.ts",
    // Added 2026-10-05: the research step -- chooses questions, reads passages.
    // JSON output; only code-verified quotes from the provisions are shown.
    "src/lib/case-system/retrieval/researchStory.ts",
    // Added 2026-10-05: follow-up questions written from the passages the
    // research found, and an independent check of them. JSON output; a
    // question is shown only when code and the check both pass it
    // (verifySourcedQuestions).
    "src/lib/case-system/retrieval/sourcedQuestions.ts",
  ];

  for (const file of callSites) {
    const full = path.join(REPO_ROOT, file);
    if (!fs.existsSync(full)) {
      check(`${file} exists`, false, "listed as a model call site but not found");
      continue;
    }

    /*
     * Comments stripped before counting.
     *
     * Independent review on 2026-09-23: this compared two substring counts,
     * and `response_format:` appears in prose all over this codebase. A file
     * whose comment discussed response_format satisfied the check without
     * declaring one. Correct today by luck rather than by construction, which
     * is the definition of a check that will fail to fail.
     */
    const text = withoutComments(fs.readFileSync(full, "utf8"));
    const creates = (text.match(/chat\.completions\.create\(/g) || []).length;
    const formats = (text.match(/response_format:/g) || []).length;

    check(
      `${path.basename(file)}: every model call declares response_format (${formats}/${creates})`,
      creates > 0 && formats >= creates,
      "A user-flow model call without response_format can return free-form prose, " +
        "which is how explainQuestion reached users.",
    );
  }

  // Nothing outside that list may call a model. A new call site must be added
  // deliberately, which is the moment to ask whether it needs structured output.
  const scanned: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".next"].includes(entry.name)) walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        // Comments stripped, as above: aiModels.ts shows a create() call in a
        // usage comment and makes no call.
        const text = withoutComments(fs.readFileSync(full, "utf8"));
        if (/chat\.completions\.create\(|responses\.create\(/.test(text)) {
          scanned.push(path.relative(REPO_ROOT, full).split(path.sep).join("/"));
        }
      }
    }
  };
  for (const root of ["src", "app"]) {
    const full = path.join(REPO_ROOT, root);
    if (fs.existsSync(full)) walk(full);
  }

  const unexpected = scanned.filter(
    (file) => !callSites.includes(file) && file !== "src/lib/case-system/openaiClient.ts",
  );
  check(
    "no undeclared model call sites",
    unexpected.length === 0,
    `found: ${unexpected.join(", ")}. Add it to callSites above and confirm it returns structured output.`,
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
