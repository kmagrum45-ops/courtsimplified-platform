/**
 * The guided assistant can only say catalogued things.
 *
 * COSTS NOTHING. Reads source off disk and calls pure functions.
 *
 * *** WHAT THIS REPLACES ***
 *
 * `docs/chat-engine-report.md` traced twelve output paths through the chat
 * orchestrator. No model was involved — the engine is entirely deterministic —
 * but six of them stated law or procedure, and all twelve were template
 * literals buried in a 1,200-line file. Outside the content library, outside
 * the review packet, outside the output guard.
 *
 * *** THE PROPERTY, IN ONE SENTENCE ***
 *
 * Every string the orchestrator can put on a screen comes from
 * `assistantBlocks.ts`, and gets there through `renderAssistantBlock`, which
 * guards the template before filling any slot.
 *
 * The check that matters most is check 1: **no user-facing string literal
 * remains in the orchestrator**. Without it, someone adds a thirteenth path
 * next month as a plain `return "..."` and every other check here still
 * passes.
 *
 * Run: node --import tsx scripts/verification/verifyAssistantBlocks.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ASSISTANT_BLOCKS,
  assistantBlockById,
  fillAssistantSlots,
  isAssistantPlaceholder,
} from "../../src/lib/content-library/assistantBlocks";
import {
  renderAssistantBlock,
  isRenderableVerification,
} from "../../src/lib/content-library/renderAssistantBlock";
import { collectContentInventory } from "../../src/lib/content-library/contentInventory";
import { DOCTRINE_SEED_LIBRARY } from "../../src/lib/case-system/knowledge/doctrineSeedLibrary";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const ORCHESTRATOR = "src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts";

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ===========================================================================
// 1. No user-facing literal survives in the orchestrator
// ===========================================================================

{
  const source = withoutComments(read(ORCHESTRATOR));

  /*
   * A user-facing literal is a returned or pushed string long enough to be a
   * sentence. Short literals are internal codes — "small-claims", "unknown",
   * "evidence" — and flagging those would make the check unusable, which is
   * how a check gets ignored.
   *
   * 40 characters is the threshold. Every one of the twelve original strings
   * was well over it; every internal code is well under.
   */
  const MIN_SENTENCE = 40;
  const offenders: string[] = [];

  const patterns = [
    /return\s+"([^"\\]{40,})"/g,
    /return\s+`([^`\\$]{40,})`/g,
    /push\(\s*"([^"\\]{40,})"/g,
    /push\(\s*`([^`$]{40,})`/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const text = match[1];
      if (text.length >= MIN_SENTENCE) offenders.push(`  "${text.slice(0, 90)}…"`);
    }
  }

  if (offenders.length === 0) {
    pass("no user-facing sentence is returned as a literal from the orchestrator");
  } else {
    fail(
      "the orchestrator can emit a string that is not a catalogued block",
      `${offenders.join("\n")}\nAdd it to assistantBlocks.ts and render it with assistantText().`,
    );
  }
}

{
  // And the positive: it must actually be USING the renderer, or the check
  // above passes because the file has stopped producing anything.
  const source = read(ORCHESTRATOR);
  const calls = (withoutComments(source).match(/assistantText\(/g) || []).length;

  if (calls >= 20) {
    pass(`the orchestrator renders through assistantText (${calls} call sites)`);
  } else {
    fail(
      `only ${calls} assistantText call sites — expected at least 20`,
      "Check 1 passes trivially if the orchestrator stopped emitting text at all.",
    );
  }
}

// ===========================================================================
// 2. Every block referenced actually exists
// ===========================================================================

{
  const source = withoutComments(read(ORCHESTRATOR));
  const referenced = new Set(
    Array.from(source.matchAll(/assistantText\(\s*"([^"]+)"/g), (m) => m[1]),
  );

  const unknown = [...referenced].filter((id) => !assistantBlockById(id));
  if (unknown.length === 0) {
    pass(`all ${referenced.size} block ids referenced by the orchestrator exist`);
  } else {
    fail("the orchestrator references a block that does not exist", unknown.join("\n"));
  }

  // The other direction: an orphan block is a block nobody can reach, and a
  // licensee reviewing it is reviewing text no user will read.
  const reachable = new Set(referenced);
  // These are rendered by the chat component and the API route, not the
  // orchestrator, so they are declared rather than discovered.
  for (const id of ["assistant:opening-message", "assistant:error", "assistant:caution:over-limit"]) {
    reachable.add(id);
  }

  const orphans = ASSISTANT_BLOCKS.filter((block) => !reachable.has(block.id));
  if (orphans.length === 0) {
    pass("no catalogued block is unreachable");
  } else {
    fail(
      "a catalogued block cannot be reached, so a licensee would review dead text",
      orphans.map((b) => `  ${b.id}`).join("\n"),
    );
  }
}

// ===========================================================================
// 3. A block that states law carries a citation, or does not render
// ===========================================================================

{
  const statesLaw = ASSISTANT_BLOCKS.filter((block) => block.statesLaw);
  const uncited = statesLaw.filter(
    (block) => block.citations.length === 0 && !isAssistantPlaceholder(block),
  );

  if (uncited.length === 0) {
    pass(
      `all ${statesLaw.length} law-stating blocks either carry a citation or are placeholders`,
    );
  } else {
    fail(
      "a block states law with no citation and is not a placeholder",
      uncited.map((b) => `  ${b.id}`).join("\n"),
    );
  }

  // Every citation must carry a URL and a verification date, or it is
  // decoration. Same standard the rest of the content registries meet.
  const thin = statesLaw
    .flatMap((block) => block.citations.map((c) => ({ block: block.id, c })))
    .filter(({ c }) => !c.officialUrl || !c.verifiedAt);

  if (thin.length === 0) {
    pass("every citation carries an official URL and a verification date");
  } else {
    fail(
      "a citation is missing its URL or verification date",
      thin.map(({ block }) => `  ${block}`).join("\n"),
    );
  }
}

// ===========================================================================
// 4. The guard accepts every renderable block, and refuses placeholders
// ===========================================================================

{
  const renderable = ASSISTANT_BLOCKS.filter((block) => !isAssistantPlaceholder(block));
  const refused = renderable.filter(
    (block) => renderAssistantBlock({ id: block.id }).refusedBecause === "guard-refused",
  );

  if (refused.length === 0) {
    pass(`the guard accepts all ${renderable.length} renderable blocks`);
  } else {
    fail(
      "the guard refuses a block that is in its own catalogue",
      `${refused.map((b) => `  ${b.id}`).join("\n")}\nThe block is probably not reaching contentInventory.`,
    );
  }

  const placeholders = ASSISTANT_BLOCKS.filter(isAssistantPlaceholder);
  const leaked = placeholders.filter(
    (block) => renderAssistantBlock({ id: block.id }).text !== "",
  );

  if (leaked.length === 0) {
    pass(`all ${placeholders.length} placeholder blocks render as nothing`);
  } else {
    fail("a placeholder block rendered", leaked.map((b) => `  ${b.id}`).join("\n"));
  }
}

// ===========================================================================
// 5. Slots are filled after the guard, never before
// ===========================================================================

{
  const renderer = read("src/lib/content-library/renderAssistantBlock.ts");
  const body = renderer.slice(renderer.indexOf("export function renderAssistantBlock"));

  const guardAt = body.indexOf("assertApprovedUserContent");
  const fillAt = body.indexOf("fillAssistantSlots");

  if (guardAt !== -1 && fillAt !== -1 && guardAt < fillAt) {
    pass("the template is guarded BEFORE slots are filled");
  } else {
    fail(
      "slots are filled before the guard runs",
      "The guard would then be handed a sentence no licensee reviewed, refuse it\n" +
        "correctly, and the refusal would look like a bug.",
    );
  }

  // And prove it behaves: a real block with a slot must come back filled.
  const filled = renderAssistantBlock({
    id: "assistant:recorded:facts",
    slots: { facts: "the deck was never finished" },
  });

  if (filled.text.includes("the deck was never finished") && !filled.text.includes("{{")) {
    pass("a slotted block renders with the slot filled");
  } else {
    fail(`a slotted block rendered as: ${filled.text || "(nothing)"}`);
  }

  // A missing slot leaves the placeholder visible rather than "undefined".
  const missing = fillAssistantSlots("a {{slot}} b", {});
  if (missing === "a {{slot}} b") {
    pass("a missing slot stays visible rather than printing undefined");
  } else {
    fail(`a missing slot produced: ${missing}`);
  }
}

// ===========================================================================
// 6. Unverified doctrine does not reach a user
// ===========================================================================

{
  const unverified = DOCTRINE_SEED_LIBRARY.filter(
    (entry) => !isRenderableVerification(entry.source.verificationStatus),
  );

  console.log(
    `      doctrine: ${DOCTRINE_SEED_LIBRARY.length} object(s), ${unverified.length} not verified`,
  );

  /*
   * The gate, tested against a block that WOULD otherwise render.
   *
   * The first version of this check used `assistant:explain:burden`, which is
   * a placeholder — so it rendered nothing whether the gate worked or not, and
   * a mutation that deleted the gate entirely passed. A check that holds when
   * the control is removed is not a check on the control.
   *
   * `assistant:caution:jurisdiction` is real, cited and renderable, so the
   * ONLY thing that can stop it here is the verification gate.
   */
  const gated = renderAssistantBlock({
    id: "assistant:caution:jurisdiction",
    knowledgeVerification: "not-verified",
  });

  if (gated.text === "" && gated.refusedBecause === "unverified-knowledge") {
    pass("a renderable block backed by unverified knowledge is refused by the gate");
  } else {
    fail(
      "unverified doctrine reached a rendered block",
      `refusedBecause: "${gated.refusedBecause}", text: ${gated.text.slice(0, 120) || "(empty)"}`,
    );
  }

  // And the placeholder path, separately, so both reasons are covered.
  const placeholderBacked = renderAssistantBlock({
    id: "assistant:explain:burden",
    slots: { burden: "anything" },
    knowledgeVerification: "not-verified",
  });

  if (placeholderBacked.text === "") {
    pass("the doctrine-backed explanation block renders nothing today");
  } else {
    fail("the doctrine-backed block rendered", placeholderBacked.text.slice(0, 120));
  }

  // And the gate must not be blocking everything: a verified status passes it.
  // Asserted against a block that is NOT a placeholder, so the only thing
  // being tested is the verification gate.
  const verified = renderAssistantBlock({
    id: "assistant:caution:jurisdiction",
    knowledgeVerification: "approved",
  });

  if (verified.text !== "") {
    pass("a block backed by approved knowledge renders — the gate is not universal");
  } else {
    fail(
      "the verification gate refuses even approved knowledge",
      `refusedBecause: ${verified.refusedBecause}`,
    );
  }
}

// ===========================================================================
// 7. Everything is in the review packet
// ===========================================================================

{
  const inventory = collectContentInventory();
  const ids = new Set(inventory.map((entry) => entry.id));

  const missingBlocks = ASSISTANT_BLOCKS.filter((block) => !ids.has(block.id));
  if (missingBlocks.length === 0) {
    pass(`all ${ASSISTANT_BLOCKS.length} assistant blocks are in the review packet`);
  } else {
    fail("an assistant block is not in the packet", missingBlocks.map((b) => `  ${b.id}`).join("\n"));
  }

  const missingDoctrine = DOCTRINE_SEED_LIBRARY.filter(
    (entry) => !ids.has(`doctrine:${entry.id}`),
  );
  if (missingDoctrine.length === 0) {
    pass(`all ${DOCTRINE_SEED_LIBRARY.length} doctrine objects are in the review packet`);
  } else {
    fail(
      "a doctrine object is not in the packet",
      missingDoctrine.map((e) => `  ${e.id}`).join("\n"),
    );
  }

  // The packet must carry the TEMPLATE, not a filled example — approving one
  // user's sentence approves nothing for anyone else.
  const wrongForm = ASSISTANT_BLOCKS.filter((block) => {
    const entry = inventory.find((item) => item.id === block.id);
    return entry ? entry.text !== block.template : false;
  });

  if (wrongForm.length === 0) {
    pass("the packet carries each block's template, with slots intact");
  } else {
    fail("a block is indexed in a form other than its template", wrongForm.map((b) => `  ${b.id}`).join("\n"));
  }
}

// ===========================================================================
// 8. The three gaps the chat-engine report found
// ===========================================================================

{
  // (a) The disclosures. This surface carried none of them while every other
  // AI-adjacent surface did, and it is the one most likely to be read as
  // advice.
  const chat = read("app/builder/_components/CourtAssistantChat.tsx");
  const missing: string[] = [];

  if (!/<LegalInformationNotice\s*\/?>/.test(chat)) missing.push("LegalInformationNotice");
  if (!/<AiUseNotice[\s/>]/.test(chat)) missing.push("AiUseNotice");

  if (missing.length === 0) {
    pass("the chat surface carries the legal-information and AI-use notices");
  } else {
    fail("the chat surface is missing a disclosure", missing.join(", "));
  }
}

{
  /*
   * (b) The caution on every substantive answer.
   *
   * It used to fire only in buildGeneralAnswer, and only on the first turn —
   * so the four direct-intent answers never carried one, and "what evidence do
   * I need?" as an opening message got a substantive answer with no
   * qualification at all.
   *
   * Asserted on the DIRECT-intent branch specifically, because that is the one
   * that had none.
   */
  const orchestrator = withoutComments(read(ORCHESTRATOR));
  const start = orchestrator.indexOf('if (intent !== "general")');
  const directBranch = orchestrator.slice(start, start + 900);

  if (/buildCaution\(/.test(directBranch)) {
    pass("the direct-intent answers carry a caution, not just the first turn");
  } else {
    fail(
      "a direct-intent answer can be returned with no caution",
      "Evidence, legal issues, readiness and next-question are the answers a\n" +
        "person acts on, and they were the four with no qualification.",
    );
  }
}

{
  /*
   * (c) Model output must not be POSTed into the assistant at all.
   *
   * `litigationRisks` was passed in `strategyData` and forwarded inside
   * caseMemory. Nothing rendered it — the orchestrator reads caseMemory only
   * for courtArea — so it was a latent risk, one `getNestedValue` from
   * becoming a live one.
   *
   * Removed rather than guarded: data that is never sent cannot leak, and
   * nothing has to stay correct for that to hold.
   */
  const builder = withoutComments(read("app/builder/page.tsx"));
  const chatProps = Array.from(
    builder.matchAll(/strategyData=\{[\s\S]{0,400}?\}\s*\n/g),
    (m) => m[0],
  );

  if (chatProps.length === 0) {
    fail("could not find strategyData on the chat component — has it moved?");
  } else {
    const leaking = chatProps.filter((prop) => /litigationRisks|intelligence\?\./.test(prop));

    if (leaking.length === 0) {
      pass(`no model output is passed to the assistant (${chatProps.length} call sites)`);
    } else {
      fail(
        "model output is passed into the assistant's caseMemory",
        leaking.map((p) => `  ${p.trim().slice(0, 120)}`).join("\n"),
      );
    }
  }

  // The orchestrator must still not be reading strategyData out of caseMemory
  // by any route — belt as well as braces, since the prop is only one door.
  const orchestrator = withoutComments(read(ORCHESTRATOR));
  if (!/strategyData|litigationRisks/.test(orchestrator)) {
    pass("the orchestrator reads no strategy field out of caseMemory");
  } else {
    fail("the orchestrator reads strategyData or litigationRisks from caseMemory");
  }
}

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
