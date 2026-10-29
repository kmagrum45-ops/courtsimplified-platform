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
 *   - a checked-answer line with no source shows no sources toggle (CheckedAnswerPanel);
 *   - the law shown with an answer is kept with the conversation and saved with the case: the chat
 *     route keeps a question's law, refuses one too large, and still saves and reads the words when
 *     the column is not there yet (Chrome, 28 Oct: a reopened chat lost every citation).
 *
 * Failure it exists to catch: "Why this matters: This is the first investigation step for Public
 * authority / Crown / police: Identify each public actor", an empty sources toggle under the
 * library's own line, and the chat asking for an outcome the person had already given.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { internalWordingIn } from "../../src/lib/case-system/copy/rawKeys";
import { answeredInStory } from "../../src/lib/case-system/guided-assistant/answeredInStory";
import { emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import CheckedAnswerPanel from "../../app/_components/CheckedAnswerPanel";
import { chatReplies, type Court } from "./chatRouteHarness";
import { inOrder, validLaw, validMessages } from "../../app/api/cases/chat/route";
import fs from "node:fs";
import path from "node:path";

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
  // The law kept with the conversation (Chrome, 28 Oct).
  const law = { findings: [], answer: { status: "answered", statements: [{ text: "A statement.", sources: [{ citation: "Synthetic Act, 2019, s. 4 (1)" }] }] } };
  const rows = validMessages([{ role: "user", content: "Do I need to give notice?", law }, { role: "assistant", content: "Here is what applies." }]);
  check("a question saved with the case keeps the law found for it", JSON.stringify(rows?.[0]?.law) === JSON.stringify(law) && rows?.[1]?.law === undefined);
  check("a law too large is not kept (the words still are)", validLaw({ big: "x".repeat(250_000) }) === null && validMessages([{ role: "user", content: "Q", law: { big: "x".repeat(250_000) } }])?.[0]?.law === undefined);
  const ROOT = path.resolve(import.meta.dirname, "..", "..");
  const route = fs.readFileSync(path.join(ROOT, "app/api/cases/chat/route.ts"), "utf8");
  check("the chat route reads and saves the law, and works on without the column", /read\("id, role, content, created_at, law"\)/.test(route) && /noLawColumn\(error\)/.test(route) && /export const PATCH/.test(route));
  const chat = fs.readFileSync(path.join(ROOT, "app/builder/_components/CourtAssistantChat.tsx"), "utf8");
  check("the chat keeps a question's law in its own copy and shows it under the reply", /const kept = \{ findings, \.\.\.\(answer \? \{ answer \} : \{\}\) \}/.test(chat) && /law: kept/.test(chat) && /messages\[index - 1\]\?\.law/.test(chat));
  // Fresh reviewer, 28 Oct: a question and its answer share created_at; the law shows under the message
  // after its question, so the question must come first; a lookup from a cleared chat must not land on
  // the next question; the route's limit sits below the database's (jsonb text adds spaces).
  const same = "2026-10-28T10:00:00.000Z";
  const ordered = inOrder([{ role: "assistant", created_at: same }, { role: "user", created_at: same }, { role: "user", created_at: "2026-10-28T09:00:00.000Z" }]);
  check("a question comes before its answer when they were saved together", ordered.map((row) => row.role).join(",") === "user,user,assistant");
  check("a law near the database's limit is refused by the route first", validLaw({ text: "x".repeat(160_000) }) === null && validLaw({ text: "x".repeat(100_000) }) !== null);
  check("Clear chat drops lookups still running, and a law lands only on the question it answers, as not yet saved", /function clearCurrentChat\(\) \{\s*setMessages\(\[INITIAL_ASSISTANT_MESSAGE\]\);[\s\S]{0,200}setLaw\(\{\}\)/.test(chat) && /message\.content === trimmed \? \{ \.\.\.message, law: kept, lawSaved: false \}/.test(chat));
  // The browser test caught it: the stored chat was rebuilt from role and words only, so a reopened chat lost the law.
  check("the chat read back from the browser keeps each question's law, id and saved mark", /function normalizeMessages[\s\S]{0,1200}\.\.\.\(law \? \{ law \} : \{\}\)[\s\S]{0,200}id: stored\.id[\s\S]{0,120}lawSaved: true/.test(chat));
  const migration = fs.readdirSync(path.join(ROOT, "supabase/migrations")).find((file) => /case_chat_law/.test(file));
  check("the column is a migration for the owner to apply", Boolean(migration) && /ADD COLUMN IF NOT EXISTS "law" "jsonb"/.test(fs.readFileSync(path.join(ROOT, "supabase/migrations", migration!), "utf8")));

  // The detector itself.
  check("the detector finds the wording Chrome saw", internalWordingIn("Why this matters: This is the first investigation step for Public authority / Crown / police: Identify each public actor.").length > 0);
  check("and passes plain words", internalWordingIn("This helps put what happened in the order a court will look at it. What proof do you currently have?").length === 0);

  // One list of what answers a question: the case file's facts, and the story.
  check("an outcome already given is not asked for again", answeredInStory("What proof do you currently have, and what outcome are you seeking?", "", { ...emptyCaseFile(), wants: { state: "answered", value: "repairs paid", confirmed: true } }));
  check("an outcome not yet given is still asked for", !answeredInStory("What outcome are you seeking?", "", emptyCaseFile()));
  check("what they did is not asked after a story saying it", answeredInStory("What exactly did they do or fail to do?", CASES[0].story));

  // Through the chat's own route, in every area.
  // The first message is Chrome's own (Charter re-test): on main it drew the profile wording.
  // "What legal issues are in my case?" is the fresh reviewer's (26 Oct): it listed "… reasoning profile", "Reasoning domain: …" and bare domain codes.
  const messages = ["Do I need to give notice before suing the police service?", "Do I need to give notice before suing?", "What should I do next?", "What do I need to prove?", "What legal issues are in my case?"];
  for (const item of CASES) {
    const replies = await chatReplies(item.court, item.story, messages, item.issues ? { issues: item.issues } : {}, checkpoint(item.court, item.story, item.wants));
    const said = replies.join("\n\n");
    const machinery = internalWordingIn(said);
    check(`${item.label}: no reasoning-profile wording in any reply`, machinery.length === 0, machinery.join("; "));
    check(`${item.label}: no bare code listed as an issue`, !/^\s*(?:[-•*]\s*)?unknown\s*$/im.test(said), said.slice(0, 300));
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
