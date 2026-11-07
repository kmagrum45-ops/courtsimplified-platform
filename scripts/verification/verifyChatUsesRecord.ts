/**
 * THE SMALL CLAIMS CHAT SENDS THE RECORD'S ANSWER, NOT ITS OWN OLDER COPY (rule 3, site owner 6 Nov 2026; owner's read
 * of the read pack: "chat stale copy").
 *
 * The chat keeps its own copy of the facts (guided.facts). When the person changes an answer elsewhere -- the amount on
 * the review, while the chat is open -- that copy still holds the old value, and the model's next turn echoes it. The
 * chat then saved that turn's facts and sent them on: to the analysis (the next step) and to the depth questions. Before
 * this rule, turnFactsToSave (caseFile/chatTurnFacts.ts) compared the turn's facts with the chat's own copy (`before`):
 * the two agreed on the old amount, so the old amount went on.
 *
 * What this asserts, with no browser, model or database, through the real save rule (followAnswer) and the real reader
 * (caseFileOf):
 *   1. the amount changed on the review after the chat answered it: the facts the chat saves and sends on carry the
 *      record's amount, and saving them leaves the record on that amount. (The kind of claim is held as a choice with
 *      no plain value, so the chat's kind is kept by test:chat-keeps-held, not here.)
 *   2. a removed answer: the chat's facts no longer carry it;
 *   3. the rule holds both ways: the question answered in this very turn still takes the person's reply; a fact the
 *      person never answered still takes the model's reading;
 *   4. the facts handed to the analysis at "Show my next step" (factsWithRecord) carry the record's amount too.
 *
 * What failure it catches: an answer the person changed going to the analysis or the depth questions at its old value.
 *
 * Run: npm run test:chat-uses-record
 */
import assert from "node:assert/strict";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { caseFileOf, followAnswer, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { turnFactsToSave } from "../../src/lib/case-system/caseFile/chatTurnFacts";

type Facts = Record<string, unknown>;
const STORY = "I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid.";
const KIND = "A contract or agreement dispute";

function checkpoint(): Checkpoint {
  return { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "small-claims", revision: "22222222-2222-4222-8222-222222222222",
    sections: {
      story: { text: STORY, location: { province: "Ontario", city: "Kingston" } },
      guided: { facts: { disputeCategory: KIND, amountClaimed: 6400, otherParty: "Jordan Testwood" }, answeredIds: ["sc-orient-dispute-category", "sc-amount-claimed"], earlierAnswers: [{ questionId: "sc-orient-dispute-category", answerText: KIND }, { questionId: "sc-amount-claimed", answerText: "$6,400" }] },
      "small-claims": { input: { amountClaimed: "", otherParty: "" } },
      caseFile: {},
    } } as unknown as Checkpoint;
}

/** A change made on the review (a place other than the chat), saved as the tab saves it. */
function changeElsewhere(cp: Checkpoint, field: string, before: unknown, after: unknown, at: string): Checkpoint {
  const sections = cp.sections as Record<string, Record<string, unknown>>;
  const input = { ...(sections["small-claims"].input as Facts) };
  const held = caseFileOf(cp);
  const changes = followAnswer(sections, "small-claims", "input", { ...input, [field]: before }, { ...input, [field]: after }, new Date(at), held);
  return { ...cp, sections: { ...sections, "small-claims": { input: { ...input, [field]: after } }, caseFile: { ...(sections.caseFile ?? {}), ...(changes ? { changes } : {}) } } } as unknown as Checkpoint;
}

/** One chat turn saved as the chat saves it (GuidedSmallClaimsIntake.tsx): returns the facts sent on and any change recorded. */
function turn(cp: Checkpoint, after: Facts, answeredNow: string[]) {
  const guided = cp.sections.guided as Facts;
  const before = guided.facts as Facts;
  const held = caseFileOf(cp);
  const saved = turnFactsToSave(before, after, held, answeredNow);
  const changes = followAnswer(cp.sections as Record<string, unknown>, "guided", "facts", before, saved, new Date("2026-11-06T16:00:00.000Z"), held);
  const sections = { ...cp.sections, guided: { ...guided, facts: saved }, ...(changes ? { caseFile: { ...(cp.sections.caseFile ?? {}), changes } } : {}) };
  return { saved, file: caseFileOf({ ...cp, sections } as Checkpoint), changes, held };
}

async function main() {
  const module = await import("../../src/lib/case-system/caseFile/chatTurnFacts") as { factsWithRecord?: (facts: Facts, held: CaseFile, answeredNow?: readonly string[]) => Facts };
  let failed = 0;
  const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };

  const changed = changeElsewhere(checkpoint(), "amountClaimed", "", "$8,150", "2026-11-06T15:00:00.000Z");
  check("the record holds the amount changed on the review", () => assert.equal(caseFileOf(changed).amount.value, 8150));

  check("1. the next chat turn sends the record's amount, not the chat's old copy, and records no change", () => {
    // The model echoes the chat's own facts: the old amount.
    const { saved, file } = turn(changed, { disputeCategory: KIND, amountClaimed: 6400, otherParty: "Jordan Testwood" }, ["sc-damages-breakdown"]);
    assert.equal(saved.amountClaimed, 8150, `the chat sent amountClaimed ${JSON.stringify(saved.amountClaimed)}`);
    assert.equal(file.amount.value, 8150, `the record's amount became ${JSON.stringify(file.amount.value)}`);
  });

  check("2. a removed answer is not sent on by the chat", () => {
    const named = { ...checkpoint() } as Checkpoint;
    (named.sections["small-claims"] as Facts).input = { amountClaimed: "", otherParty: "Jordan Testwood" };
    const removed = changeElsewhere(named, "otherParty", "Jordan Testwood", "", "2026-11-06T15:00:00.000Z");
    assert.equal(caseFileOf(removed).otherParty.removed, true, "precondition: the other party is removed");
    const { saved } = turn(removed, { disputeCategory: KIND, amountClaimed: 6400, otherParty: "Jordan Testwood" }, []);
    assert.equal(saved.otherParty, undefined, `the chat sent otherParty ${JSON.stringify(saved.otherParty)}`);
  });

  check("3a. the question answered in this very turn takes the person's reply", () => {
    const { saved } = turn(changed, { disputeCategory: KIND, amountClaimed: 9350 }, ["sc-amount-claimed"]);
    assert.equal(saved.amountClaimed, 9350);
  });

  check("3b. a fact the person never answered still takes the model's reading", () => {
    const { saved } = turn(changed, { disputeCategory: KIND, amountClaimed: 6400, agreementType: "written" }, []);
    assert.equal(saved.agreementType, "written");
  });

  check("4. the facts handed to the analysis at \"Show my next step\" carry the record's amount", () => {
    assert.equal(typeof module.factsWithRecord, "function", "factsWithRecord (chatTurnFacts.ts) does not exist");
    const sent = module.factsWithRecord!({ disputeCategory: KIND, amountClaimed: 6400 }, caseFileOf(changed));
    assert.equal(sent.amountClaimed, 8150, `the analysis got amountClaimed ${JSON.stringify(sent.amountClaimed)}`);
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
