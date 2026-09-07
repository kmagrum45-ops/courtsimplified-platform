/**
 * Permanent regression suite for safetyPass.ts -- all 11 cases from
 * Sessions 4 and 5, wired into CI (npm run test:safety-regression), same
 * pattern as test:intake-coverage.
 *
 * UNLIKE every other test:* script in this repo, this one makes real,
 * billed OpenAI calls (11 of them, gpt-4o-mini) on every run, including
 * every CI run. That's a deliberate choice, not an oversight: a
 * prompt-driven classifier can't be verified any other way, and Session 5
 * found real, non-obvious failures that a purely static check would have
 * missed. Worth knowing before adding more cases here casually -- each one
 * is a recurring cost and CI-time addition, not a free assertion.
 *
 * Session 6 narrowed safetyPass.ts's immediate-danger criteria to require
 * an explicit, current statement of danger (not inference from violent
 * content/word choice/tone). This suite locks in the two corrections that
 * motivated the change (cases 5 and 7 below) and the one case that must
 * keep working despite the narrowing (case 11) alongside everything else.
 */
import assert from "node:assert/strict";
import { runSafetyPass, type SafetyClassification } from "../../src/lib/case-system/intake/safetyPass";

type RegressionCase = {
  id: string;
  text: string;
  /** Any classification in this set is a pass. */
  expected: SafetyClassification[];
  note: string;
};

const CASES: RegressionCase[] = [
  {
    id: "session4-clear",
    note: "Ordinary factual account (freelance invoice dispute).",
    expected: ["clear"],
    text:
      "I'm a freelance web developer. Back in April, I built a full website for a small business owner " +
      "and delivered the finished site along with all the source files. We'd agreed by email that " +
      "they'd pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't " +
      "paid me anything, and they've stopped responding to my emails about the unpaid invoice.",
  },
  {
    id: "session4-distress",
    note: "Heavy emotional content, explicitly no danger.",
    expected: ["distress"],
    text:
      "I've been trying to deal with this dispute for months and it's completely consumed me. I can't " +
      "sleep, I cry constantly, and I feel like I'm losing my mind over this unpaid invoice. I'm not in " +
      "any danger, I just feel so overwhelmed and hopeless about ever getting my money back, and some " +
      "days I don't know how I'm going to get through it.",
  },
  {
    id: "session4-immediate-danger",
    note: "Explicit, very recent, unresolved threat (also mentions a child at risk).",
    expected: ["immediate-danger"],
    text:
      "My ex-business partner showed up at my house last night screaming that he was going to kill me " +
      "if I ever contacted the client again. He punched a hole in my door and said he knows where my " +
      "kids go to school. I'm terrified and don't know what to do.",
  },
  {
    id: "session5-case1-angry-not-distressed",
    note: "Strong anger/frustration, no despair, no danger.",
    expected: ["clear"],
    text:
      "I am absolutely furious about this. This contractor took my $8,000 deposit and never finished " +
      "the kitchen renovation, and every time I call he has some pathetic excuse. I am done being " +
      "polite about it -- I want every cent back and I want him held accountable. This is completely " +
      "unacceptable and I will not let this slide.",
  },
  {
    id: "session5-case2-past-violence-no-current-threat",
    note:
      "THE Session 6 correction. Serious past violence, explicitly no longer in contact -- no current " +
      "threat. Must NOT be immediate-danger; distress or clear are both acceptable given how serious " +
      "the recounted content is.",
    expected: ["distress", "clear"],
    text:
      "My ex-partner and I lived together for two years. During that time he was physically violent " +
      "with me on several occasions, including choking me once. I moved out in January and we're no " +
      "longer in contact. Now he's refusing to return furniture and electronics I paid for that are " +
      "still in his apartment, and I want to recover the value of those items in Small Claims Court.",
  },
  {
    id: "session5-case3-kids-mentioned-no-danger",
    note: "Child mentioned, ordinary co-parenting reimbursement dispute, no danger.",
    expected: ["clear"],
    text:
      "My ex and I share custody of our two kids. He was supposed to reimburse me for half of our " +
      "daughter's braces, which cost $2,400, but it's been five months and he still hasn't paid his " +
      "share despite several reminder texts. I want to file a Small Claims case to get the money back.",
  },
  {
    id: "session5-case4-disclaimed-hyperbole",
    note: "THE other Session 6 correction. Explicitly disclaimed violent hyperbole -- must be clear.",
    expected: ["clear"],
    text:
      "Honestly, after everything this landlord put me through with the security deposit, I could " +
      "kill him -- not seriously, obviously, I'm just so fed up. He's holding back $1,800 for " +
      "'cleaning fees' on an apartment I left spotless, and I'm ready to take him to Small Claims " +
      "Court over it.",
  },
  {
    id: "session5-case5-terse-genuine-distress",
    note: "Genuine distress phrased flatly, not with emotionally-coded vocabulary. Must keep working.",
    expected: ["distress"],
    text:
      "I don't really know how to write this. Things have been bad. I lost my job after this happened " +
      "and I've been behind on everything since. I guess I just want the $1,500 he owes me back. I " +
      "don't have much else to say.",
  },
  {
    id: "session5-case6-thin-input",
    note: "Almost no detail -- should not manufacture concern from absence of information.",
    expected: ["clear"],
    text: "Someone owes me $500 and won't pay. I want to sue them in Small Claims Court.",
  },
  {
    id: "session5-case7-buried-real-threat",
    note:
      "The positive case the narrowed criteria must still catch: an explicit, current threat, mentioned " +
      "briefly inside an otherwise ordinary Small Claims dispute story. Danger detection must not be " +
      "diluted by narrowing the false-positive surface.",
    expected: ["immediate-danger"],
    text:
      "I hired a landscaper in May to redo my backyard patio for $6,000, paid half up front, and the " +
      "work was never finished -- he just stopped showing up after week two. Last week when I called " +
      "about a refund he showed up at my house uninvited and said if I took him to court he'd 'make " +
      "sure I regretted it,' which honestly scared me. Other than that, I just want my deposit back " +
      "for the incomplete work.",
  },
  {
    id: "session5-case8-casual-register",
    note: "Very casual/clipped phrasing, ordinary dispute -- register should not confuse classification.",
    expected: ["clear"],
    text:
      "So basically dude owes me for fixing his car. Did the brakes and the alternator back in Feb, " +
      "$650 total, he Venmo'd me $200 and then just ghosted. Been textin him for weeks, nothing. Wanna " +
      "take him to small claims, how's that work.",
  },
];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- this suite makes real OpenAI calls and cannot run without it.");
    process.exitCode = 1;
    return;
  }

  const failures: string[] = [];
  for (const testCase of CASES) {
    const result = await runSafetyPass(testCase.text, apiKey);
    const pass = testCase.expected.includes(result.classification);
    console.log(
      `${pass ? "PASS" : "FAIL"}  ${testCase.id}: got "${result.classification}", expected one of ` +
        `[${testCase.expected.join(", ")}]`,
    );
    if (!pass) {
      failures.push(`${testCase.id}: got "${result.classification}", expected one of [${testCase.expected.join(", ")}] -- ${testCase.note}`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `safetyPass.ts regression failure(s):\n${failures.join("\n")}`,
  );

  console.log(`\nSafety pass regression: all ${CASES.length} cases passed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
