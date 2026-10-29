/**
 * NEVER ASK TWICE: THE STORY PACK'S GATE, CHECKED WITHOUT A BROWSER (site owner, 28 Oct).
 *
 * The story pack (tests/browser/story-pack.spec.ts) records every question the site shows
 * (tests/browser/harness/askOnce.ts), and fails a question whose fact the person already gave
 * (factsAskedTwice) or whose fact the saved case holds as the person's own when it is asked
 * (heldViolations, read through the site's own caseFileOf) -- unless it is on the named list of
 * known repeats (tests/browser/harness/knownRepeats.ts). This suite checks the gate's own logic,
 * as properties:
 *   - every known repeat says why in words and names its audit row (1-12), and names a fact or a question;
 *   - a question whose fact the saved case holds answered fails; one whose fact it does not hold
 *     passes; a story guess (not confirmed) is not held;
 *   - a fact held unsure may be offered once more at the end, and a second offer fails, as does
 *     an offer anywhere else;
 *   - a violation on the known list is excused, in its stories only, and any other is not;
 *   - the test's own wording table maps the chat's row-1 questions (what they want, whether
 *     anything is filed, the main dates) by its own rows, not by the site's wording map, and the
 *     depth question "How much is still owing" to the amount.
 *
 * Failure it exists to catch: a gate that passes everything (a held fact not read, a known list
 * that excuses all, a wording table that no longer knows the chat's questions), so the story
 * pack goes green while the site asks the same thing twice.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { END_SURFACES, factsAskedTwice, factsOfAsk, heldFacts, heldInRows, heldViolations, repeatViolations, withHeldFacts, type Asked } from "../../tests/browser/harness/askOnce";
import { KNOWN_REPEATS, knownRepeatFor, splitKnown, type KnownRepeat, type Violation } from "../../tests/browser/harness/knownRepeats";
import { QUESTION_WORDS, factsOfWords, questionSentences } from "../../tests/browser/harness/chatQuestionFacts";
import { DEPTH_QUESTIONS } from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000001";
const master = (court: "small-claims" | "civil" | "family", sections: Record<string, Record<string, unknown>>) => ({
  intakeCheckpoint: { version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story. We were married in Lisbon, Portugal in 2009." }, ...sections } },
});
let at = 0;
const ask = (surface: string, id: string, text = id): Asked => ({ kind: "ask", surface, id, screen: "/builder", text, at: ++at });

// 1. The known list: every entry says why and names its row.
{
  const bad = KNOWN_REPEATS.filter((entry) => !(entry.reason.trim().split(/\s+/).length >= 8) || !Number.isInteger(entry.auditRow) || entry.auditRow < 1 || entry.auditRow > 12 || (entry.fact === undefined && entry.questionId === undefined) || !entry.surface);
  check("every known repeat has a reason in words, an audit row 1-12, a surface, and a fact or question", bad.length === 0, JSON.stringify(bad));
  check("the list holds the site owner's entry: children asked twice in the w6-family-children chat", KNOWN_REPEATS.some((entry) => entry.surface === "chat-reply" && entry.fact === "children" && entry.stories?.includes("w6-family-children")));
  check("the list holds the audit's row 1 chat questions (wants, filed, main dates)", ["wants", "filed", "whenHappened"].every((fact) => KNOWN_REPEATS.some((entry) => entry.auditRow === 1 && entry.surface === "chat-reply" && entry.fact === fact)));
}

// 2. The held check: a question whose fact the saved case holds fails; one it does not hold passes.
{
  const saved = master("civil", { civil: { input: { amountClaimed: "$9,000", legalRemedy: "My money back" } } });
  const held = heldFacts(saved, "civil");
  check("the saved case's answered facts are held (read through the site's caseFileOf)", held.get("amount") === "answered" && held.get("wants") === "answered");
  const rows = new Map<string, Record<string, unknown>>([["a", { id: "a", court_path: "civil", updated_at: "2026-10-28T10:00:00Z", master_result: saved }]]);
  const read = heldInRows(rows, "civil");
  const asked = [withHeldFacts(ask("review-entry", "amountClaimed"), read), withHeldFacts(ask("chat-reply", "What are you trying to get or fix through the legal process?"), read), withHeldFacts(ask("review-entry", "otherParty"), read)];
  const violations = heldViolations(asked);
  check("a question for a held answered fact fails, on any surface", violations.some((item) => item.fact === "amount" && item.surface === "review-entry") && violations.some((item) => item.fact === "wants" && item.surface === "chat-reply"));
  check("a question for a fact the case does not hold passes", !violations.some((item) => item.fact === "otherParty"));
  const guess = heldFacts(master("family", { builder: { triageState: { record: { marriedToOtherParty: "yes" } } } }), "family");
  check("a story guess (confirmed false) is not held", guess.get("married") === "answered" && !guess.has("marriedWhere"));
  const newer = new Map(rows);
  newer.set("b", { id: "b", court_path: "civil", updated_at: "2026-10-28T11:00:00Z", master_result: master("civil", { civil: { input: { otherParty: "Test Motors Ltd." } } }) });
  check("the case read is the one last written", heldInRows(newer, "civil")("otherParty") === "answered" && heldInRows(newer, "civil")("amount") === null);
  check("the situation questions are the start, not a repeat", heldViolations([withHeldFacts(ask("situation", "where"), () => "answered")]).length === 0);
}

// 3. A fact held unsure: offered once more at the end, never twice, never elsewhere.
{
  const unsure = () => "unsure" as const;
  const endSurface = [...END_SURFACES][0];
  const once = heldViolations([withHeldFacts(ask(endSurface, "amountClaimed"), unsure)]);
  check("an unsure fact offered once more at the end passes", once.length === 0, JSON.stringify(once));
  const twice = heldViolations([withHeldFacts(ask("review-entry", "amountClaimed"), unsure), withHeldFacts(ask("review", "sc-amount-claimed"), unsure)]);
  check("a second offer of the same unsure fact fails", twice.length === 1 && twice[0].fact === "amount" && twice[0].detail === "held unsure");
  const elsewhere = heldViolations([withHeldFacts(ask("date", "sc-date-claim-served"), unsure)]);
  check("an unsure fact offered anywhere but the end fails", elsewhere.length === 1);
  // The existing rule, unchanged: once given, asked again on another screen is a repeat.
  const events: Asked[] = [ask("chat", "amountClaimed"), { kind: "answer", surface: "chat", id: "amountClaimed", screen: "/builder", text: "", at: ++at }, ask("review-entry", "amountClaimedText")];
  check("factsAskedTwice still finds a fact given then asked again", factsAskedTwice(events, false).some((repeat) => repeat.fact === "amount"));
}

// 4. The known list excuses its own entries, in its stories, and nothing else.
{
  const children: Violation = { rule: "held", fact: "children", surface: "chat-reply", id: "Are there any children involved?", screen: "/builder", text: "", detail: "held answered" };
  check("a known repeat is excused in its story", knownRepeatFor(children, "w6-family-children") !== null);
  check("the same repeat in another story is not excused", knownRepeatFor(children, "m17-common-law-house") === null);
  const stranger: Violation = { ...children, surface: "review-entry", fact: "amount" };
  const split = splitKnown([children, stranger], "w6-family-children");
  check("an unknown violation is not excused", split.known.length === 1 && split.unknown.length === 1 && split.unknown[0] === stranger);
  const blank: KnownRepeat[] = [{ surface: "review-entry", reason: "an entry naming neither a fact nor a question excuses nothing", auditRow: 7 }];
  check("an entry naming neither a fact nor a question excuses nothing", knownRepeatFor(stranger, "any", blank) === null);
  // Chrome 29 Oct, finding 1: a date box beside the person's own sentence that gives the date is asked
  // again, given by the story itself (the recorder emits it only when that sentence names the date).
  const eventWhen = factsAskedTwice([ask("event-candidate", "when")], false);
  check("an event's empty date box beside its own dated sentence is a repeat, given by the story", factsOfAsk({ surface: "event-candidate", id: "when", text: "" }).join() === "dateInOwnSentence" && eventWhen.some((repeat) => repeat.fact === "dateInOwnSentence" && repeat.given.surface === "story"));
  // The saved Small Claims conversation shown again after a reload (site owner, 29 Oct): a question is
  // excused ONLY when the reply shown under it is the reply already recorded for it in this case.
  {
    const asked: Asked = { ...ask("sc-chat", "sc-amount-claimed"), reply: undefined };
    const answered: Asked = { kind: "answer", surface: "sc-chat", id: "sc-amount-claimed", screen: "/builder", text: "", at: ++at, reply: "$6,000" };
    const shownAgain = (reply: string | undefined): Asked => ({ ...ask("sc-chat", "sc-amount-claimed"), ...(reply === undefined ? {} : { reply }), held: { amount: "answered" } });
    const verdict = (again: Asked) => ({ twice: factsAskedTwice([asked, answered, again], false).length, held: heldViolations([asked, answered, again]).length });
    const same = verdict(shownAgain("$6,000"));
    check("restored question with the same reply -> not a repeat", same.twice === 0 && same.held === 0, JSON.stringify(same));
    const none = verdict(shownAgain(undefined));
    check("same question shown again with no reply -> repeat", none.twice > 0 && none.held > 0, JSON.stringify(none));
    const other = verdict(shownAgain("$5,000"));
    check("same question shown again with a different reply -> repeat", other.twice > 0 && other.held > 0, JSON.stringify(other));
  }
  check("repeats become one violation per question asked again", repeatViolations([{ fact: "amount", given: ask("chat", "x"), asks: [ask("review", "a"), ask("date", "b")] }]).length === 2);
}

// 5. The test's own wording table: the chat's row-1 questions, from the site's own strings.
{
  const engine = readFileSync(path.join(process.cwd(), "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts"), "utf8");
  const row1: [string, string][] = [
    ["What are you trying to get or fix through the legal process?", "wants"],
    ["Has anything already been filed, served, ordered, scheduled, or decided by a court or tribunal?", "filed"],
    ["What are the main dates, including when the problem happened and when you first found out about it?", "whenHappened"],
  ];
  for (const [question, fact] of row1) {
    check(`the chat still writes "${question.slice(0, 50)}..."`, engine.includes(question));
    const own = QUESTION_WORDS.filter(([pattern]) => pattern.test(question)).flatMap(([, facts]) => facts);
    check(`the test's own table maps it to ${fact} (not the site's map)`, own.includes(fact), own.join());
    check(`and a reply holding it yields that question`, questionSentences(`Thanks.\n${question}\nAnything else?`).includes(question));
    check(`a chat reply's question is asked for ${fact}`, factsOfAsk({ surface: "chat-reply", id: question, text: question }).includes(fact));
  }
  const owing = DEPTH_QUESTIONS.filter((question) => /how much is still owing/i.test(question.text));
  check("the depth questions \"How much is still owing\" are asked for the amount", owing.length > 0 && owing.every((question) => factsOfAsk({ surface: "sc-chat", id: question.id, text: question.text }).includes("amount")), owing.map((question) => question.id).join());
  check("words that name no fact ask for a fact of their own", factsOfWords("Shall I explain the next step again?").length === 0 && factsOfAsk({ surface: "chat-reply", id: "Shall I explain the next step again?", text: "" })[0] === "chat-reply:Shall I explain the next step again?");
  check("the step page's service method asks for serviceMethod", factsOfAsk({ surface: "service-method", id: "serviceMethod:sc-date-claim-served", text: "" }).join() === "serviceMethod");
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("never ask twice: every check passed.");
