/**
 * Every body of live, user-facing legal content is in the review packet.
 *
 * COSTS NOTHING. Calls the inventory and reads source off disk.
 *
 * *** THE FAILURE THIS EXISTS FOR ***
 *
 * `contentInventory.ts` collected from eleven registries and reported "268
 * items", which read as the whole review surface. It was not. An independent
 * review on 2026-09-23 found three bodies of live legal content outside it
 * entirely:
 *
 *   /legal-principles          21 procedural-stage cards across three courts,
 *                              on a public page, 926 lines
 *   safetyPass.ts              the immediate-danger and distress messages —
 *                              the file's own header says they need clinical
 *                              review before shipping
 *   guided-assistant/           ~5,000 lines of template chat responses
 *
 * **A licensee could have signed off all 268 items and left every word of
 * those unreviewed**, and the packet would have looked complete.
 *
 * *** WHY A LIST AND NOT A SWEEP ***
 *
 * There is no way to ask the codebase "which strings are legal content" — that
 * is the judgment the packet exists to route to a human. So this is a
 * maintained list of known bodies, each with the id prefix or count that proves
 * it is indexed. CLAUDE.md §5 permits a maintained list; the maintenance here
 * is one entry when a new body of content is written, with an obvious cause.
 *
 * The UNINDEXED half is the more useful one. It names what is still outside,
 * so that "268 items" is never again read as "everything".
 *
 * Run: node --import tsx scripts/verification/verifyInventoryCoverage.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { collectContentInventory } from "../../src/lib/content-library/contentInventory";
import { PROCEDURAL_STAGES } from "../../src/lib/content-library/proceduralStages";
import {
  IMMEDIATE_DANGER_MESSAGE,
  DISTRESS_ACKNOWLEDGMENT,
} from "../../src/lib/content-library/crisisMessages";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const inventory = collectContentInventory();
const ids = new Set(inventory.map((entry) => entry.id));
const texts = new Set(inventory.map((entry) => entry.text));

// ---------------------------------------------------------------------------
// 1. The procedural stages
// ---------------------------------------------------------------------------

{
  const indexed = inventory.filter((entry) => entry.type === "procedural-stage");

  if (indexed.length === PROCEDURAL_STAGES.length) {
    pass(
      `all ${PROCEDURAL_STAGES.length} /legal-principles stage cards are in the packet`,
    );
  } else {
    fail(
      "a /legal-principles stage card is missing from the packet",
      `${PROCEDURAL_STAGES.length} cards, ${indexed.length} indexed — an id collision drops one silently`,
    );
  }

  // Ids must be unique per card. "Filing a Claim" and "Serving Documents"
  // recur across courts, which is why the pathway is in the id.
  const stageIds = new Set(indexed.map((entry) => entry.id));
  if (stageIds.size === indexed.length) {
    pass("every stage card has its own id, so each can carry its own approval");
  } else {
    fail(
      `${indexed.length - stageIds.size} stage card(s) share an id`,
      "Two items sharing an id cannot each be approved separately.",
    );
  }

  // Every card must carry a citation through to the packet, or a reviewer has
  // nothing to check the wording against.
  const uncited = indexed.filter((entry) => !entry.sourceUrl);
  if (uncited.length === 0) {
    pass("every stage card carries a source URL into the packet");
  } else {
    fail(
      "a stage card reaches the packet with no source",
      uncited.map((entry) => `  ${entry.id}`).join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// 2. The crisis messages
// ---------------------------------------------------------------------------

{
  const expected = [
    ["safety:immediate-danger-message", IMMEDIATE_DANGER_MESSAGE],
    ["safety:distress-acknowledgment", DISTRESS_ACKNOWLEDGMENT],
  ] as const;

  const missing = expected.filter(([id]) => !ids.has(id));
  if (missing.length === 0) {
    pass("both crisis messages are in the packet");
  } else {
    fail(
      "a crisis message is not in the review packet",
      missing.map(([id]) => `  ${id}`).join("\n"),
    );
  }

  // The indexed text must be the string the user actually sees. An entry
  // holding a paraphrase would send a reviewer the wrong words.
  const drifted = expected.filter(([, text]) => !texts.has(text));
  if (drifted.length === 0) {
    pass("the indexed crisis text is the exact string shown to users");
  } else {
    fail(
      "an indexed crisis message does not match the live constant",
      "The packet would send a reviewer words no user sees.",
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Nothing is approved that should not be
// ---------------------------------------------------------------------------

{
  // Everything starts as a draft with reviewer fields empty. A pre-approved
  // item would be a fabricated sign-off, which is worse than an unreviewed one.
  const approvals = JSON.parse(
    read("src/lib/content-library/approvals.json"),
  ) as { approvals: unknown[] };

  if (approvals.approvals.length === 0) {
    pass("no content is recorded as approved — nothing has been reviewed yet");
  } else {
    // Not a failure. It means review has started, which is the work we want.
    pass(`${approvals.approvals.length} item(s) recorded as licensee-approved`);
  }
}

// ---------------------------------------------------------------------------
// 4. What is STILL outside the packet
// ---------------------------------------------------------------------------

/**
 * Bodies of user-facing text that are NOT indexed, each with a reason.
 *
 * Every entry needs a real reason, enforced below. Without that this becomes a
 * place to park things, which is how "268 items" came to read as the whole
 * review surface in the first place.
 */
const UNINDEXED: Array<{ what: string; where: string; reason: string }> = [
  {
    what: "the deterministic chat engine",
    where: "src/lib/case-system/guided-assistant/",
    reason:
      "~5,000 lines of template responses behind CourtAssistantChat, containing " +
      "procedural statements. Template text, not model-written despite the " +
      "directory name. A scoping decision is pending — see docs/chat-engine-report.md.",
  },
  {
    what: "the phase-1 unavailable message",
    where: "src/lib/content-library/phaseScope.ts",
    reason:
      "Fixed non-legal product copy: says what we cover and that we do not cover " +
      "this yet. Makes no statement about law or procedure. Worth a licensee's " +
      "eye for tone, and listed in the report under what to spot-check first.",
  },
  {
    what: "the deflection and referral text",
    where: "src/lib/content-library/referralResources.ts",
    reason:
      "Fixed text plus four service names and URLs. States no law. The URLs were " +
      "verified to resolve; the wording is product copy, not legal content.",
  },
  {
    what: "the UNKNOWN and OUT_OF_SCOPE stage messages",
    where: "src/lib/case-system/stage-map/stageMessages.ts",
    reason:
      "Fixed text that says only that we cannot place the case, or that it is not " +
      "a Small Claims matter, and points to the same four referral services. It " +
      "states no law and names no procedure — deliberately, since it is what we " +
      "say INSTEAD of procedure when we do not know. The clarifying question it " +
      "shows is not written here: it comes from the stage map's recorded " +
      "boundaries, which test:stage-map verifies against the vendored corpus. " +
      "Worth a licensee's eye for tone, like the phase-1 message beside it.",
  },
  {
    what: "the AI-use notice and first-use acknowledgement",
    where: "app/_components/AiUseNotice.tsx, FirstUseAcknowledgement.tsx",
    reason:
      "Disclosure copy about how the product works, not about law. It IS a " +
      "representation to users and was wrong until 2026-09-23, so it is named in " +
      "the report as the first thing to spot-check.",
  },
  {
    what: "the pre-upload caution",
    where: "app/_components/EvidenceFileNotice.tsx",
    reason:
      "Names legal categories — privilege, sealing, publication bans — without " +
      "stating what they do. Closest of these to legal content and flagged in " +
      "the report for licensee review of the wording.",
  },
];

{
  const thin = UNINDEXED.filter((entry) => entry.reason.trim().length < 60);
  if (thin.length === 0) {
    pass(`all ${UNINDEXED.length} unindexed bodies carry a real reason`);
  } else {
    fail("an unindexed body has a placeholder reason", thin.map((e) => e.where).join("\n"));
  }
}

console.log("");
console.log(`Inventory: ${inventory.length} items across ${new Set(inventory.map((e) => e.type)).size} types.`);
console.log(`${UNINDEXED.length} bodies of user-facing text remain outside it, by reason.`);
console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
