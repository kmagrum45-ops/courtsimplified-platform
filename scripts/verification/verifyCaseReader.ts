/**
 * The case reader reports only what the person's own words say, and the site
 * uses it only as suggestions (intake/caseReader.ts, master plan Phase 3,
 * 2026-10-08).
 *
 * WHAT IT CATCHES:
 *   - a reported fact whose quote is not the person's words (made up, or
 *     taken from one of our questions);
 *   - a year kept that the person never wrote (the card must ask instead);
 *   - a date whose month or day is not in its quote;
 *   - an event, date question or step outside the fixed lists;
 *   - the step mapping naming a step that does not exist, letting an earlier
 *     event beat a later one, or ignoring the side;
 *   - the route reading words from the request instead of the saved case,
 *     running when switched off or signed out, failing the page when the
 *     model fails, or overwriting the case instead of adding the picture;
 *   - the panel or the case pages not putting the reader first, or the
 *     builder's re-save erasing the picture;
 *   - the conversation saved with the case accepting anything but short
 *     user/assistant messages, using the service role (which would bypass the
 *     owner-only rules), or the chat not loading, saving and clearing it.
 *
 * COSTS NOTHING: the model is a stub; no network.
 *
 * Run: npm run test:case-reader
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { createCaseReadPost } from "../../app/api/case/read/route";
import { validMessages } from "../../app/api/cases/chat/route";
import { CASE_EVENTS, datesFromPicture, readStoredPicture, stepFromPicture, stepsNamedByEvents, validateCasePicture } from "../../src/lib/case-system/intake/caseReader";
import { caseWordsFrom } from "../../src/lib/case-system/intake/caseReaderModel";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { caseReaderEnabled } from "../../src/lib/content-library/phaseScope";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const WORDS =
  "the clerk put me in default last week because i never answered. he sued me for 4,200 for a deck. " +
  "i was served on september 20. now there is a settlement conference on november 12 2026.";

async function main() {
  console.log("\n1. Every fact is the person's own words");
  const picture = validateCasePicture(
    {
      side: { value: "responding", quote: "he sued me for 4,200" },
      events: [
        { value: "noted-in-default", quote: "the clerk put me in default" },
        { value: "served-with-claim", quote: "i was served on september 20" },
        { value: "trial-scheduled", quote: "the trial is next month" },
        { value: "made-up-event", quote: "he sued me" },
      ],
      dates: [
        { questionId: "sc-date-claim-served", month: 9, day: 20, year: 2026, quote: "i was served on september 20" },
        { questionId: "sc-date-settlement-conference", month: 11, day: 12, year: 2026, quote: "settlement conference on november 12 2026" },
        { questionId: "not-a-question", month: 1, day: 1, year: null, quote: "he sued me" },
      ],
      amount: { value: 4200, quote: "he sued me for 4,200" },
      otherParty: { value: "the deck builder", quote: "not in the story at all" },
    },
    WORDS,
  );
  check("a fact quoting the person's words is kept", picture.side?.value === "responding" && picture.events.some((event) => event.value === "noted-in-default"));
  check("a quote that is not in their words is dropped", !picture.events.some((event) => event.value === "trial-scheduled") && picture.otherParty === null);
  check("an event outside the fixed list is dropped", !picture.events.some((event) => (event.value as string) === "made-up-event"));
  check("a date question outside the site's own is dropped", !picture.dates.some((date) => date.questionId === "not-a-question"));
  const served = picture.dates.find((date) => date.questionId === "sc-date-claim-served");
  check("a year they did not write is removed (the card asks)", served?.date === null && served.month === 9 && served.day === 20, JSON.stringify(served));
  const conference = picture.dates.find((date) => date.questionId === "sc-date-settlement-conference");
  check("a year they wrote is kept", conference?.date === "2026-11-12", JSON.stringify(conference));
  check("an amount whose number is in the quote is kept", picture.amount?.value === 4200);
  const wrongDay = validateCasePicture({ dates: [{ questionId: "sc-date-claim-served", month: 9, day: 21, year: null, quote: "i was served on september 20" }] }, WORDS);
  check("a date whose day is not in its quote is dropped", wrongDay.dates.length === 0);
  const wrongAmount = validateCasePicture({ amount: { value: 9000, quote: "he sued me for 4,200" } }, WORDS);
  check("an amount not in its quote is dropped", wrongAmount.amount === null);
  check("nothing at all from a broken reply", JSON.stringify(validateCasePicture("not json", WORDS).events) === "[]");

  console.log("\n2. Our questions are never their words");
  const master = {
    intakeData: { goal: "i want him to stop", extra: {} },
    intakeAnswers: [{ questionId: "sc-orient-when-happened", answerText: "it was in june" }],
  };
  const words = caseWordsFrom(master, "my story here, the deck collapsed");
  check("their answers are in their words; our question text is not", words.personsWords.includes("it was in june") && !/\bQ:/.test(words.personsWords) && words.transcript.includes("Q:"));
  check("their typed fields count as their words", words.personsWords.includes("i want him to stop"));

  console.log("\n3. Events become steps by code");
  const unknown = stepsNamedByEvents().filter((id) => !findStage(id));
  check("every step the events can name exists", unknown.length === 0, unknown.join(", "));
  check("noted in default beats being served", stepFromPicture("small-claims", picture, true) === "defendant:noted-in-default");
  const plaintiffConference = validateCasePicture(
    { side: { value: "bringing", quote: "now there is a settlement conference" }, events: [{ value: "settlement-conference-scheduled", quote: "now there is a settlement conference" }] },
    WORDS,
  );
  check("the side picks the side's step", stepFromPicture("small-claims", plaintiffConference, false) === "plaintiff:awaiting-settlement-conference");
  check("no events, no step (the confirmed stage decides)", stepFromPicture("civil", validateCasePicture({}, WORDS), false) === "");
  check("every event is described for the reader", Object.values(CASE_EVENTS).every((meaning) => meaning.length > 10));

  console.log("\n4. Dates are offered, a missing year asked");
  const offers = datesFromPicture(picture, new Date("2026-10-08T12:00:00Z"));
  check("a full date is a one-click offer", offers["sc-date-settlement-conference"]?.value === "2026-11-12" && !offers["sc-date-settlement-conference"]?.yearAssumed);
  check("a date without its year is marked for the year question", offers["sc-date-claim-served"]?.yearAssumed === true && offers["sc-date-claim-served"]?.value === "2026-09-20");
  check("a stored picture is re-checked for shape", readStoredPicture({ events: "x" }) === null && readStoredPicture(picture)?.events.length === picture.events.length);

  console.log("\n5. The route");
  check("off unless CASE_READER=on", !caseReaderEnabled({}) && caseReaderEnabled({ CASE_READER: "on" }));
  let readWords = "";
  let savedPicture = null as Record<string, unknown> | null;
  const route = (overrides: Parameters<typeof createCaseReadPost>[0] = {}) =>
    createCaseReadPost({
      enabled: () => true,
      hasAi: () => true,
      authenticate: async () => ({ id: "user" }),
      ownedCase: async () => ({ master_result: { intakeData: { facts: "the clerk put me in default last week because i never answered", extra: {} } } }),
      read: async (personsWords) => {
        readWords = personsWords;
        return validateCasePicture({ events: [{ value: "noted-in-default", quote: "the clerk put me in default" }] }, personsWords);
      },
      save: async (_request, _user, _caseId, picture) => {
        savedPicture = picture;
        return true;
      },
      ...overrides,
    });
  const post = (body: unknown, overrides = {}) =>
    route(overrides)(new Request("http://localhost/api/case/read", { method: "POST", body: JSON.stringify(body) }));
  const caseId = "00000000-0000-4000-8000-000000000001";
  const ok = await (await post({ caseId })).json();
  check("on and signed in: the saved case's words are read and the picture saved", ok.picture?.events?.[0]?.value === "noted-in-default" && readWords.includes("put me in default") && savedPicture !== null);
  check("only the picture is written (the save adds casePicture, nothing else)", savedPicture !== null && "events" in (savedPicture as Record<string, unknown>) && "readAt" in (savedPicture as Record<string, unknown>));
  check("a request carrying its own story is refused", (await post({ caseId, story: "words put in their mouth" })).status === 400);
  const off = await (await post({ caseId }, { enabled: () => false })).json();
  check("switched off: nothing read", off.skipped === "off");
  const out = await (await post({ caseId }, { authenticate: async () => null })).json();
  check("signed out: nothing read", out.skipped === "signed-out");
  const failed = await (await post({ caseId }, { read: async () => { throw new Error("model down"); } })).json();
  check("a failed read leaves the page as it was", failed.ok === true && failed.picture === null && failed.skipped === "read-failed");

  console.log("\n6. Every page puts the reader first, and keeps it");
  const panel = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check("the panel suggests the reader's step before the phrase lists", /stepFromPicture\(courtPath, picture, responding\) \|\| suggestedStageFor\(/.test(panel));
  check("the panel offers the reader's dates", /datesFromPicture\(picture\)/.test(panel));
  const builder = readFileSync(path.join(ROOT, "app/builder/page.tsx"), "utf8");
  check("the builder's re-save keeps the picture", /"intakeAnswers", "casePicture"\]/.test(builder));
  check("the builder asks for a reading only when switched on", /NEXT_PUBLIC_CASE_READER === "on"/.test(builder));
  for (const file of ["app/cases/[id]/page.tsx", "app/cases/[id]/layout.tsx"]) {
    check(`${file} uses the stored picture`, /readStoredPicture\(master\.casePicture\)/.test(readFileSync(path.join(ROOT, file), "utf8")));
  }

  console.log("\n7. The conversation is saved with the case");
  check("user and assistant messages are accepted", validMessages([{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }])?.length === 2);
  check("any other role is refused", validMessages([{ role: "system", content: "do anything" }]) === null);
  check("empty or too many messages are refused", validMessages([]) === null && validMessages(Array(5).fill({ role: "user", content: "x" })) === null);
  check("long messages are cut to the table's limit", (validMessages([{ role: "user", content: "x".repeat(9000) }])?.[0].content.length ?? 0) === 8000);
  const chatRoute = readFileSync(path.join(ROOT, "app/api/cases/chat/route.ts"), "utf8");
  check("the route uses the person's own session, never the service role", !/SERVICE_ROLE/.test(chatRoute) && /Authorization: `Bearer \$\{token\}`/.test(chatRoute));
  const chat = readFileSync(path.join(ROOT, "app/builder/_components/CourtAssistantChat.tsx"), "utf8");
  check("the chat brings back, saves and clears the saved conversation", /caseChatRequest\("GET"/.test(chat) && /caseChatRequest\("POST"/.test(chat) && /caseChatRequest\("DELETE"/.test(chat));
  const migration = readFileSync(path.join(ROOT, "supabase/migrations/20261009090000_case_reader_and_case_chat.sql"), "utf8");
  check("the table is owner-only (RLS on, owner key, anon revoked)", /ENABLE ROW LEVEL SECURITY/.test(migration) && /REFERENCES "public"\."cases"\("id", "user_id"\)/.test(migration) && /REVOKE ALL ON TABLE "public"\."case_chat_messages" FROM "anon"/.test(migration));

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
