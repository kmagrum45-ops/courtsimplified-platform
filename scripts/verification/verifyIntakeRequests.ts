/** Synthetic request failures only. No network, credentials, or case writes. */
import assert from "node:assert/strict";
import { IntakeRequest } from "../../app/_components/intakeRequest";
import { understandingInputError, isUnderstandingBody } from "../../src/lib/case-system/understanding/understandInput";
import { storyWithAnswers } from "../../src/lib/case-system/understanding/understandCase";

async function main() {
  for (const court of ["small-claims", "family", "civil"] as const) {
    const answers = Array.from({ length: 16 }, (_, i) => ({ question: `Question ${i}`, answer: `${i}: ${"x".repeat(650)}` }));
    const input = { story: "This is the complete original description.", city: "Ottawa", chosenCourt: court, answers };
    assert.ok(isUnderstandingBody(input), `${court}: more than eight answers accepted`);
    assert.equal(understandingInputError(input.story, input.city, answers), null);
    const text = storyWithAnswers(input);
    assert.ok(text.length > 8_000);
    for (const answer of answers) assert.ok(text.includes(answer.answer), "Every answer reaches the reasoner intact");
    assert.ok(understandingInputError(input.story, input.city, [...answers, { question: "Long", answer: "z".repeat(1001) }]));
    assert.equal(answers.length, 16, "Validation never trims history");
    assert.ok(!isUnderstandingBody({ ...input, answers: [{ question: "Q", answer: "A", unexpected: true }] }));
  }

  const request = new IntakeRequest();
  let release!: () => void;
  let calls = 0;
  const first = request.run(async () => { calls++; await new Promise<void>((resolve) => { release = resolve; }); return "first"; });
  assert.equal(await request.run(async () => { calls++; }), undefined);
  assert.equal(calls, 1, "Rapid submissions issue only one request");
  release();
  assert.equal(await first, "first");
  assert.equal(request.pending, false);

  let timedOutSignal!: AbortSignal;
  await assert.rejects(request.run(async (signal) => { timedOutSignal = signal; return new Promise<never>(() => {}); }, 5));
  assert.ok(timedOutSignal.aborted, "Timeout aborts underlying fetch signal");
  assert.equal(request.pending, false, "Even a non-cooperating request cannot freeze retry");
  assert.equal(await request.run(async () => "retry"), "retry");

  let oldReply!: () => void;
  let applied = "new answer";
  const old = request.run(async (signal) => {
    await new Promise<void>((resolve) => { oldReply = resolve; });
    signal.throwIfAborted();
    applied = "old answer";
  });
  const rejected = assert.rejects(old);
  request.cancel();
  await rejected;
  const next = request.run(async () => new Promise<string>((resolve) => { release = () => resolve("new response"); }));
  oldReply();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(applied, "new answer", "An old reply cannot overwrite edited input");
  assert.equal(request.pending, true, "Old cleanup cannot unlock a newer request");
  release();
  await next;
  await assert.rejects(request.run(async () => { throw new Error("synthetic failure"); }));
  assert.equal(await request.run(async () => "retry after failure"), "retry after failure");
  console.log("PASS: all three court input contracts; complete history; duplicate, timeout, cancellation, stale-response and retry invariants");
}
main().catch(() => { console.error("FAIL: intake request reliability invariant"); process.exitCode = 1; });
