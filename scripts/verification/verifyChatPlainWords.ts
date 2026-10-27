/**
 * THE CHAT SPEAKS PLAINLY AND DOES NOT ASK WHAT IT HAS (Charter re-test, 27 Oct, root cause 4).
 *
 * Checks, as properties, through the chat's own route (app/api/guided-assistant) with a saved case
 * in all three areas (a Charter claim, a Small Claims debt, a civil debt, a family case):
 *   - no reply carries the site's reasoning machinery: a profile's name, an investigation step, or
 *     the words that introduced them (copy/rawKeys.ts internalWordingIn, read from the profiles
 *     themselves, so a new profile is covered too);
 *   - a question the person has answered is not asked again: "what outcome are you seeking?" once
 *     they said what they want (the case file's answered facts, answeredInStory.ts), and "What
 *     exactly did they do or fail to do?" after a story saying it;
 *   - a checked-answer line with no source shows no sources toggle (CheckedAnswerPanel).
 *
 * Failure it exists to catch: "Why this matters: This is the first investigation step for Public
 * authority / Crown / police: Identify each public actor", an empty sources toggle under the
 * library's own line, and the chat asking for an outcome the person had already given.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { internalWordingIn } from "../../src/lib/case-system/copy/rawKeys";
import { answeredInStory } from "../../src/lib/case-system/guided-assistant/answeredInStory";
import CheckedAnswerPanel from "../../app/_components/CheckedAnswerPanel";
import { chatReplies, type Court } from "./chatRouteHarness";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000027";

// Synthetic stories; no names.
const CASES: { label: string; court: Court; story: string; issues?: string[]; wants: Record<string, unknown> }[] = [
  { label: "Charter claim against police", court: "civil", issues: ["charter", "police-conduct"], story: "On June 3, 2025 in Ottawa I was stopped by two officers of the police service, searched without a reason and handcuffed. They never told me why I was detained and did not let me call a lawyer. My wrist was injured and I missed two shifts.", wants: { civil: { input: { legalRemedy: "A declaration that my Charter rights were violated, and $75,000 in damages" } } } },
  { label: "Small Claims debt", court: "small-claims", story: "I hired a deck builder in March 2026 for $8,000. I paid $2,000 and the $6,000 balance for the materials I supplied is still owed to me after he left the job.", wants: { "small-claims": { input: { remedySought: "Payment of the $6,000 owed" } } } },
  { label: "civil debt", court: "civil", story: "A supplier kept my $62,000 deposit and never delivered the equipment we agreed on in January 2026. I have the invoice and the emails asking for it back.", wants: { civil: { input: { legalRemedy: "Return of my $62,000 deposit" } } } },
  { label: "family case", court: "family", story: "We separated in May 2026 after eight years together. Our daughter is 6 and lives with me during the week. I want a parenting schedule and child support set out properly.", wants: { family: { goal: "A parenting schedule and child support" } } },
];

const checkpoint = (court: Court, story: string, sections: Record<string, unknown>) => ({
  intakeCheckpoint: { version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: story }, situation: { record: { where: "starting", filed: "nothing", court } }, ...sections } },
});

async function main() {
  // The detector itself.
  check("the detector finds the wording Chrome saw", internalWordingIn("Why this matters: This is the first investigation step for Public authority / Crown / police: Identify each public actor.").length > 0);
  check("and passes plain words", internalWordingIn("This helps put what happened in the order a court will look at it. What proof do you currently have?").length === 0);

  // One list of what answers a question: the case file's facts, and the story.
  check("an outcome already given is not asked for again", answeredInStory("What proof do you currently have, and what outcome are you seeking?", "", new Set(["wants"])));
  check("an outcome not yet given is still asked for", !answeredInStory("What outcome are you seeking?", "", new Set()));
  check("what they did is not asked after a story saying it", answeredInStory("What exactly did they do or fail to do?", CASES[0].story));

  // Through the chat's own route, in every area.
  // The first message is Chrome's own (Charter re-test): on main it drew the profile wording.
  const messages = ["Do I need to give notice before suing the police service?", "Do I need to give notice before suing?", "What should I do next?", "What do I need to prove?"];
  for (const item of CASES) {
    const replies = await chatReplies(item.court, item.story, messages, item.issues ? { issues: item.issues } : {}, checkpoint(item.court, item.story, item.wants));
    const said = replies.join("\n\n");
    const machinery = internalWordingIn(said);
    check(`${item.label}: no reasoning-profile wording in any reply`, machinery.length === 0, machinery.join("; "));
    check(`${item.label}: the chat does not ask for the outcome they gave`, !/outcome are you seeking|what (?:do|would) you (?:want|like) (?:to happen|the court to)/i.test(said), said.slice(0, 400));
    check(`${item.label}: the chat does not ask what they did, after the story said it`, !/what exactly did they do or fail to do/i.test(said));
    check(`${item.label}: every reply answers`, replies.every((reply) => reply.length > 0 && !reply.startsWith("ERROR")), replies.find((reply) => reply.startsWith("ERROR")) ?? "");
  }

  // The sources toggle only where there are sources.
  const html = renderToStaticMarkup(React.createElement(CheckedAnswerPanel, { answer: {
    status: "answered",
    declinedToJudge: false,
    notConfirmed: [],
    statements: [
      { text: "Our library does not hold a rule that says this, so we cannot tell you that here.", sources: [] },
      { text: "A sentence with its source.", sources: [{ passageId: "p1", citation: "Some Act, s. 1", sourceUrl: "https://www.ontario.ca/laws/statute/00x00", quote: "The words.", kind: "legislation" }] },
    ],
  } }));
  check("a line with no source has no sources toggle; a line with one has it", (html.match(/<details/g) ?? []).length === 1);

  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exitCode = failures ? 1 : 0;
}

void main();
