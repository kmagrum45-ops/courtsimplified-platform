/**
 * THE STORY IS A FACT OF THE CASE FILE (founder, 1 Nov; Chrome check of #536, round 2, item 2).
 *
 * In the Small Claims chat, after "Use the suggestion: <kind>", the chat showed its story box ("Tell us what
 * happened in your own words...") with a Send box although the story had been sent, and no "Got it" for the
 * kind. Cause (triage, read from the code): the confirmed branch of resolveSuggestion
 * (GuidedSmallClaimsIntake.tsx) removed the kind rows from the story card; when they were the only rows the
 * card emptied, no next question was fetched, and the input area fell back to the story box, which is drawn
 * when there is "no current question", not when "the story was not given". "story" was a fact of the
 * question map (factsOfQuestion.ts) but not of the case file (SLOT_FACTS), so no screen could ask the case
 * file whether it was given.
 *
 * Checks:
 *   1. "story" is a case file fact (SLOT_FACTS), and the story's words are kept as `storyText`;
 *   2. the case file holds the story answered once the story is given (the checkpoint's or the saved case's),
 *      and not asked (not-asked) before;
 *   3. the one gate never asks a question for the story once it is held (nextQuestion / chatMayAsk);
 *   4. the Small Claims chat draws its story box only while the case file does not hold the story, and
 *      after a kind suggestion is used with nothing left on the card it moves on with "Got it: <kind>"
 *      (read from GuidedSmallClaimsIntake.tsx: the gate and the continuation are there).
 * The browser twin: the carry spec's story check (askOnce.ts "sc-story") and tests/browser/story-fact-chat.spec.ts.
 *
 * WHAT FAILURE THIS CATCHES: the story asked again after it was given, on any screen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as caseFileModule from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const { caseFileOf, SLOT_FACTS, chatMayAsk, nextQuestion } = caseFileModule;
const ID = "00000000-0000-4000-8000-000000000501";
const STORY = "Synthetic story: Test Storage Ltd. lost my bicycle in May 2026.";
const cp = (court: Checkpoint["courtPath"], story: string): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: story, location: { province: "Ontario", city: "Sudbury" } } } } as unknown as Checkpoint);

check("\"story\" is a case file fact (SLOT_FACTS)", (SLOT_FACTS as readonly string[]).includes("story"));
for (const court of ["small-claims", "civil", "family"] as const) {
  const given = caseFileOf(cp(court, STORY)) as unknown as Record<string, { state?: string } | string | undefined>;
  const slot = given.story as { state?: string } | undefined;
  check(`${court}: the story given, the case file holds it answered`, typeof slot === "object" && slot?.state === "answered", JSON.stringify(slot));
  check(`${court}: the story's words are kept as storyText`, given.storyText === STORY, JSON.stringify(given.storyText));
  const none = caseFileOf(cp(court, "")) as unknown as Record<string, { state?: string }>;
  check(`${court}: no story yet, it is not asked yet (not-asked)`, none.story?.state === "not-asked", JSON.stringify(none.story));
  check(`${court}: held, no chat asks for the story again`, !chatMayAsk(caseFileOf(cp(court, STORY)), "story") && nextQuestion(caseFileOf(cp(court, STORY)), ["story"]) === null);
}
// The saved case's story counts too (a reload before the checkpoint caught up).
{
  const saved = caseFileOf(cp("small-claims", ""), { intakeData: { facts: STORY }, userStory: STORY }) as unknown as Record<string, { state?: string }>;
  check("the saved case's story alone: held answered", saved.story?.state === "answered", JSON.stringify(saved.story));
}
// The chat's own code: the story box drawn only while the story is not held; the continuation after the kind.
{
  const chat = readFileSync(path.join(process.cwd(), "app/builder/_components/GuidedSmallClaimsIntake.tsx"), "utf8");
  check("the Small Claims chat draws its story box only while the case file does not hold the story", /storyHeld/.test(chat) && /\.story\.state === "answered"/.test(chat));
  check("after a used kind suggestion empties the card, the chat moves on with \"Got it: <kind>\"", /Got it: \$\{/.test(chat) && /continueAfterKind/.test(chat));
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("the story is a fact of the case file: every check passed.");
