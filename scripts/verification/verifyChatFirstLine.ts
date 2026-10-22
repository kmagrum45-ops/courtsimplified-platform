/**
 * The follow-up chat's replies read from the confirmed intake (L47), tested the
 * way a person's message reaches it live.
 *
 * What it checks, through the guided-assistant route with a saved case and the
 * chat's own opening message in the conversation (chatRouteHarness), in Small
 * Claims, Family and civil, on the first and on a later turn:
 *   - "What should I do next?" never says "not enough information yet", asks to
 *     confirm the court, or says the province must be confirmed;
 *   - "What should I gather first?" opens with what the story already lists,
 *     quoted, and does not ask what proof the person has;
 *   - "How long do I have to respond?" opens with the law-answer line and is
 *     never saved or echoed as a fact ("I've added the new information...");
 *   - no engine warning or internal label reaches the person, and the chat page
 *     no longer renders the "Information still to confirm" box or issue chips;
 *   - the law lookup's waiting text matches how long it can take.
 * With no court given, the generic fallback is still available.
 *
 * Failure it exists to catch: the #469 re-test. The old version of this suite
 * called the gateway with an empty conversation and a near-empty case, so every
 * message was a "first turn" on an empty story; live, the chat's greeting is
 * already in the conversation and the case has its intake, so the person's
 * question took the "recorded facts" path ("I've added the new information to the
 * case record: How long do I have to respond?") and the evidence reply ignored
 * the story ("The most important evidence gaps currently identified are:").
 *
 * Run: npm run test:chat-first-line
 */
import fs from "node:fs";
import { runGuidedAssistantGateway } from "../../src/lib/case-system/guided-assistant/guidedAssistantGateway";
import { chatReplies } from "./chatRouteHarness";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const GENERIC = /not enough information yet|confirm the court path/i;
const INTERNAL = /Important limitation|Knowledge retrieval warning|must not be cited|procedural stage is uncertain|Reasoning domain|privilege \/ recipient issue|evidence gaps currently identified/i;
const STORY = "I hired Test Renovations Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and they never finished. $6,000 is still owed back to me. I have text messages, the signed contract and a bank receipt.";
const firstLine = (reply: string) => reply.split("\n")[0] ?? "";

void (async () => {
  for (const court of ["small-claims", "family", "civil"] as const) {
    // Each question both as the first message and after another one, as people ask them.
    const [next, gather, asked] = await chatReplies(court, STORY, ["What should I do next?", "What should I gather first?", "How long do I have to respond?"]);
    const [askedFirst] = await chatReplies(court, STORY, ["How long do I have to respond?"]);
    const [gatherFirst] = await chatReplies(court, STORY, ["What should I gather first?"]);

    check(`${court}: "what next" does not say "not enough information yet" or ask to confirm the court`, !GENERIC.test(next) && next.trim().length > 0, next.slice(0, 300));
    check(`${court}: nor says the province must be confirmed`, !/province or jurisdiction must be confirmed/i.test(next), next.slice(0, 300));
    for (const [turn, reply] of [["first", gatherFirst], ["later", gather]] as const) {
      check(`${court} (${turn} turn): "What should I gather first?" opens with what the story lists, quoted`, /^From what you told us, you have: “/.test(firstLine(reply)) && reply.includes("“I have text messages, the signed contract and a bank receipt.”"), reply.slice(0, 240));
      check(`${court} (${turn} turn): and does not ask what proof the person already has`, !/What proof do you already have/i.test(reply), reply.slice(0, 240));
    }
    for (const [turn, reply] of [["first", askedFirst], ["later", asked]] as const) {
      check(`${court} (${turn} turn): a question opens with the law-answer line`, firstLine(reply).startsWith("The law on your question is shown below"), reply.slice(0, 200));
      check(`${court} (${turn} turn): the question is never saved or echoed as a fact`, !/added the new information/i.test(reply) && !reply.includes("How long do I have to respond?"), reply.slice(0, 300));
    }
    for (const [label, reply] of [["next", next], ["gather", gather], ["asked", asked]] as const) {
      check(`${court} (${label}): no internal warning or label reaches the person`, !INTERNAL.test(reply), reply.slice(0, 300));
    }
    // #470 re-test: "To keep your case record complete:" ended a reply, its question
    // removed as a repeat. Asked again and again, it always leads into something.
    const again = await chatReplies(court, STORY, ["How long do I have to respond?", "How long do I have to respond?", "What happens next?", "Can I get my costs back?"]);
    const dangling = again.filter((reply) => /To keep your case record complete:\s*$/m.test(reply));
    check(`${court}: "To keep your case record complete:" never ends a line with nothing after it`, dangling.length === 0, dangling[0]?.slice(-200) ?? "");
    check(`${court}: and a repeated question still opens with the law-answer line`, again.every((reply) => firstLine(reply).startsWith("The law on your question is shown below")), again.map((reply) => firstLine(reply).slice(0, 60)).join(" / "));
  }

  const fallback = runGuidedAssistantGateway({
    message: "What should I do next?", conversation: [], mode: "builder-chat",
    caseMemory: { caseData: { facts: "Synthetic story." }, masterResult: {}, path: undefined },
  } as never).userFacingAnswer;
  check("with no court given, the generic fallback is still there", GENERIC.test(fallback), fallback.slice(0, 300));

  // The chat page itself: the engine's warnings and issue labels are not shown.
  const chat = fs.readFileSync("app/builder/_components/CourtAssistantChat.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  check("the chat page renders no \"Information still to confirm\" box", !/Information still to confirm/.test(chat) && !/systemWarnings\.map/.test(chat));
  check("the chat page renders no issue labels (\"Reasoning domain: unknown\", \"Context / privilege / recipient issue\")", !/investigationIssues\.(map|length|slice)/.test(chat));
  check("the law lookup's waiting text does not promise \"up to two minutes\" (it can take 4.5)", !/up to two minutes/.test(chat) && /up to four and a half/.test(chat));

  if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
  console.log("PASS chat first line: replies read from the confirmed intake, through the live route, in all three areas");
})();
