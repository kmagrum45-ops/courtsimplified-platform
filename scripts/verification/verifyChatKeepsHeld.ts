/**
 * A FACT THE PERSON HOLDS IS NEVER REPLACED BY WHAT THE MODEL READ FROM THE STORY (rules 2, 4 and 8; Chrome check of
 * #544, 6 Nov 2026, step 18).
 *
 * Chrome answered "What kind of dispute is this?" with "A contract or agreement dispute" in the Small Claims chat and
 * skipped the AI's suggestion "Work or a service you paid for". After adding a sentence to the story and "Start the
 * questions again", the kind became the skipped suggestion, labelled "your answer as you changed it". Cause: each chat
 * turn saves the facts the model returns (GuidedSmallClaimsIntake.tsx, setFacts(result.facts)), including the ones
 * it read from the story (facts.disputeCategory); the save path (IntakeRecovery put -> caseFile.ts followAnswer)
 * treats any new value at a place as the person's newest answer when the case file holds another, so the model's
 * reading was recorded as the person's change. Only the Small Claims chat writes the model's readings straight
 * into its answers; the civil and Family chats apply a story suggestion only on "Yes" (GuidedFormChat.tsx).
 *
 * What this asserts, with no browser, model or database, through the real save rule (followAnswer) and the real
 * reader (caseFileOf), saving the turn's facts as the chat does (caseFile/chatTurnFacts.ts turnFactsToSave):
 *   1. A kind the person gave is kept when a later turn's facts carry another kind read from the story; nothing is
 *      recorded as a change, so no screen says "as you changed it".
 *   2. "Not sure" and a removed answer are kept the same way (never refilled from the story).
 *   3. The rule holds both ways: the question answered in this very turn takes the person's new reply (a change),
 *      and a fact the person never answered still takes the model's reading (as before).
 *
 * What failure it catches: a suggestion or a reading of the story becoming the person's answer.
 *
 * Run: npm run test:chat-keeps-held
 */
import assert from "node:assert/strict";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { caseFileOf, followAnswer, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";

type Facts = Record<string, unknown>;
type Save = (before: Facts, after: Facts, held: CaseFile, answeredNow: readonly string[]) => Facts;

const STORY = "I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid.";
const KIND = "A contract or agreement dispute";
const READ = "Work or a service you paid for (e.g. a contractor)";

function checkpointWith(guided: Record<string, unknown>, caseFile: Record<string, unknown> = {}): Checkpoint {
  return { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "small-claims", revision: "22222222-2222-4222-8222-222222222222",
    sections: { story: { text: STORY, location: { province: "Ontario", city: "Kingston" } }, guided, caseFile } } as unknown as Checkpoint;
}

/** One chat turn saved as the tab saves it: the chat's facts written, the change record followed (IntakeRecovery put). */
function saveTurn(save: Save, cp: Checkpoint, after: Facts, answeredNow: string[]) {
  const guided = (cp.sections.guided ?? {}) as Facts;
  const before = (guided.facts ?? {}) as Facts;
  const held = caseFileOf(cp);
  const saved = save(before, after, held, answeredNow);
  const changes = followAnswer(cp.sections as Record<string, unknown>, "guided", "facts", before, saved, new Date("2026-11-06T15:00:00.000Z"), held);
  const sections = { ...cp.sections, guided: { ...guided, facts: saved }, ...(changes ? { caseFile: { ...(cp.sections.caseFile ?? {}), changes } } : {}) };
  return { file: caseFileOf({ ...cp, sections } as Checkpoint), changes, saved };
}

async function main() {
  const module = await import("../../src/lib/case-system/caseFile/chatTurnFacts").catch(() => null) as { turnFactsToSave?: Save } | null;
  // Until the rule exists, the chat saves whatever the turn returned (GuidedSmallClaimsIntake.tsx setFacts(result.facts)).
  const save: Save = module?.turnFactsToSave ?? ((_before, after) => after);
  let failed = 0;
  const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };

  const answered = checkpointWith({ facts: { disputeCategory: KIND, amountClaimed: 6400 }, answeredIds: ["sc-orient-dispute-category", "sc-amount-claimed"], earlierAnswers: [{ questionId: "sc-orient-dispute-category", answerText: KIND }, { questionId: "sc-amount-claimed", answerText: "$6,400" }] });
  check("the kind held before the turn is the person's", () => {
    const slot = caseFileOf(answered).claimKind;
    assert.equal(slot.state, "answered"); assert.equal(slot.value, KIND); assert.notEqual(slot.changed, true);
  });

  check("1. a later turn's reading of the story never replaces the person's kind, and records no change", () => {
    const { file, changes } = saveTurn(save, answered, { disputeCategory: READ, amountClaimed: 6400 }, []);
    assert.equal(file.claimKind.value, KIND, `the kind became "${String(file.claimKind.value)}"`);
    assert.notEqual(file.claimKind.changed, true, "the kind is marked changed (\"as you changed it\")");
    assert.equal(changes?.claimKind, undefined, `a change was recorded: ${JSON.stringify(changes?.claimKind)}`);
  });

  check("2a. \"not sure\" is kept: the amount is not refilled from the story", () => {
    const unsure = checkpointWith({ facts: { disputeCategory: KIND }, answeredIds: ["sc-orient-dispute-category", "sc-amount-claimed"], earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "I do not know yet" }] }, { changes: { amount: { state: "unsure", at: "2026-11-06T14:00:00.000Z", seq: 1 } } });
    assert.equal(caseFileOf(unsure).amount.state, "unsure");
    const { file } = saveTurn(save, unsure, { disputeCategory: KIND, amountClaimed: 5000 }, []);
    assert.equal(file.amount.state, "unsure", `the amount became ${JSON.stringify(file.amount)}`);
  });

  check("2b. a removed answer stays removed: the other party is not refilled from the story", () => {
    const removed = checkpointWith({ facts: { disputeCategory: KIND }, answeredIds: ["sc-orient-dispute-category"] }, { changes: { otherParty: { state: "removed", at: "2026-11-06T14:00:00.000Z", seq: 1 } } });
    assert.equal(caseFileOf(removed).otherParty.removed, true);
    const { file } = saveTurn(save, removed, { disputeCategory: KIND, otherParty: "Deck Builder Inc." }, []);
    assert.equal(file.otherParty.removed, true, `the other party came back: ${JSON.stringify(file.otherParty)}`);
    assert.notEqual(file.otherParty.value, "Deck Builder Inc.");
  });

  check("3a. the question answered in this turn takes the person's new reply (a change)", () => {
    const { file } = saveTurn(save, answered, { disputeCategory: READ, amountClaimed: 6400 }, ["sc-orient-dispute-category"]);
    assert.equal(file.claimKind.value, READ);
  });

  check("3b. a fact the person never answered still takes the model's reading", () => {
    const { saved } = saveTurn(save, answered, { disputeCategory: KIND, amountClaimed: 6400, timeline: "March 2026" }, []);
    assert.equal(saved.timeline, "March 2026");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
