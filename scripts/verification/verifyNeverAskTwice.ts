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
 *   - a fact held unsure is never offered again, anywhere: an offer "at the end" (the review, a
 *     review box, the story's suggestion) fails like any other (site owner, 31 Oct);
 *   - a violation on the known list is excused, in its stories only, and any other is not;
 *   - no known repeat excuses a chat question (row 1 fixed 29 Oct; test:chat-asks-by-fact);
 *   - the court order or agreement in place is a fact of its own (not filed), and the follow-up chat's
 *     repeats are caught: a person's reply answers the assistant's reply before it, the same words in a
 *     later reply are asked again, and a reply re-drawn (or the saved chat shown on another screen) is not;
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
import { ASK_ONCE_SCAN, chatQuestionAnswered, chatReplyReader, diagnosticOf, withPageHeld, factsAskedTwice, factsOfAsk, heldFacts, heldInRows, heldViolations, repeatViolations, withHeldFacts, type Asked } from "../../tests/browser/harness/askOnce";
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
  // Row 1 is fixed (29 Oct): every chat asks by fact through the one gate (caseFile.ts chatMayAsk),
  // checked through the route by test:chat-asks-by-fact. No entry may excuse a chat question again.
  const chatExcuses = KNOWN_REPEATS.filter((entry) => entry.surface === "chat-reply" || entry.surface === "chat" || entry.surface === "chat-story");
  check("no known repeat excuses a chat question (row 1 fixed: the chats read the case file)", chatExcuses.length === 0, JSON.stringify(chatExcuses));
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

// 3. A fact held unsure is never offered again, anywhere (site owner, 31 Oct; it replaced option 1's
// one allowed offer "at the end": the review, a review box, or the story's suggestion in the chat).
{
  const unsure = () => "unsure" as const;
  // The surfaces that were "the end" until 31 Oct, each now a FAIL case (no second offer anywhere).
  for (const [surface, id] of [["review", "sc-amount-claimed"], ["review-entry", "amountClaimed"], ["chat-story", "amountClaimed"]] as const) {
    const offered = heldViolations([withHeldFacts(ask(surface, id), unsure)]);
    check(`an unsure fact offered once more (${surface}) fails`, offered.length === 1 && offered[0].fact === "amount" && offered[0].detail === "held unsure", JSON.stringify(offered));
  }
  const twice = heldViolations([withHeldFacts(ask("review-entry", "amountClaimed"), unsure), withHeldFacts(ask("review", "sc-amount-claimed"), unsure)]);
  check("every offer of the same unsure fact fails, the first too", twice.length === 2 && twice.every((violation) => violation.fact === "amount" && violation.detail === "held unsure"));
  const elsewhere = heldViolations([withHeldFacts(ask("date", "sc-date-claim-served"), unsure)]);
  check("an unsure fact offered on any other screen fails", elsewhere.length === 1);
  // The asked-twice record agrees: "not sure" given (a skip, or "I don't know" typed), then the review offers it.
  for (const text of ["unsure", ""]) {
    const goal = (surface: string, id: string): Asked => ({ kind: "ask", surface, id, screen: "/builder?step=guided", text: "What outcome are you asking the court to order?", at: ++at });
    const events: Asked[] = [goal("sc-chat", "sc-remedy-sought"), { kind: "answer", surface: "sc-chat", id: "sc-remedy-sought", screen: "/builder?step=guided", text, at: ++at }, goal("review-entry", "goal")];
    check(`not sure in the chat (answer recorded ${text ? "as unsure" : "with its words"}), then the review's offer: a repeat`, repeatViolations(factsAskedTwice(events, false)).length === 1, JSON.stringify(repeatViolations(factsAskedTwice(events, false))));
  }
  // The existing rule, unchanged: once given, asked again on another screen is a repeat.
  const events: Asked[] = [ask("chat", "amountClaimed"), { kind: "answer", surface: "chat", id: "amountClaimed", screen: "/builder", text: "", at: ++at }, ask("review-entry", "amountClaimedText")];
  check("factsAskedTwice still finds a fact given then asked again", factsAskedTwice(events, false).some((repeat) => repeat.fact === "amount"));
}

// 4. The known list excuses its own entries, in its stories, and nothing else.
{
  // A list of its own (the real list changes as the site is fixed: row 1 was deleted on 29 Oct).
  const list: KnownRepeat[] = [{ surface: "chat-reply", fact: "children", stories: ["w6-family-children"], reason: "a test entry", auditRow: 1 }];
  const children: Violation = { rule: "held", fact: "children", surface: "chat-reply", id: "Are there any children involved?", screen: "/builder", text: "", detail: "held answered" };
  check("a known repeat is excused in its story", knownRepeatFor(children, "w6-family-children", list) !== null);
  check("the same repeat in another story is not excused", knownRepeatFor(children, "m17-common-law-house", list) === null);
  const stranger: Violation = { ...children, surface: "review-entry", fact: "amount" };
  const split = splitKnown([children, stranger], "w6-family-children", list);
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

// 6. The court order or agreement in place is a fact of its own, and the follow-up chat's repeats are caught
//    (site owner, 29 Oct: "Is there already a court order or agreement?" no longer asks "filed", but asking
//    it twice must still be a repeat). The recorder reads the chat as it does the Small Claims guided chat:
//    the person's reply answers the questions of the assistant's reply before it; the same sentence in a
//    later reply is a new question; the same reply re-drawn is not.
{
  const ORDER = "Is there already a court order or agreement?";
  check("(1) \"Is there already a court order or agreement?\" asks for the court order in place, not filed", factsOfWords(ORDER).join() === "existingOrder", factsOfWords(ORDER).join());
  check("(1) \"What order or arrangement exists right now?\" asks for the court order in place", factsOfWords("What order or arrangement exists right now?").join() === "existingOrder");
  const compound = factsOfWords("Is there already a court order, agreement, upcoming conference, motion, or court date?");
  check("(1) the Family framework's compound question asks for the order in place and the court date, not filed", compound.includes("existingOrder") && compound.includes("courtDate") && !compound.includes("filed"), compound.join());

  const SCREEN = "/builder?step=results";
  const raw = (kind: "ask" | "answer", bubble: number, text: string, at: number): Asked => ({ kind, surface: "chat-reply-raw", id: String(bubble), screen: SCREEN, text, at });
  const read = (events: Asked[]) => { const reader = chatReplyReader(); return events.flatMap((item) => reader(item)); };
  // (2) Asked, answered by a reply, then asked again in a later reply: a repeat of the court order fact.
  const twice = read([
    raw("ask", 1, `Thanks for that.\n${ORDER}`, 1000),
    raw("answer", 1, "", 2000),
    raw("ask", 2, `I recorded that update.\n${ORDER}`, 3000),
  ]);
  const repeats = factsAskedTwice(twice, false);
  check("(2) asked, answered by the person's reply, then asked again in a later chat reply: a repeat of the court order fact", repeats.some((repeat) => repeat.fact === "existingOrder" && repeat.asks.length === 1), JSON.stringify(twice.map((item) => `${item.kind}:${item.id}`)));
  // (3) Asked once and still on screen as the reply is re-drawn (growing, then the same): no repeat.
  const once = read([
    raw("ask", 1, "Thanks", 1000),
    raw("ask", 1, `Thanks for that.\n${ORDER}`, 1500),
    raw("ask", 1, `Thanks for that.\n${ORDER}`, 1800),
  ]);
  check("(3) asked once and still on screen across re-draws: one question, no repeat", once.filter((item) => item.kind === "ask").length === 1 && factsAskedTwice(once, false).length === 0, JSON.stringify(once.map((item) => `${item.kind}:${item.id}`)));
  // And answered, then the same reply re-drawn: still no repeat.
  const redrawn = read([raw("ask", 1, ORDER, 1000), raw("answer", 1, "", 2000), raw("ask", 1, ORDER, 2500)]);
  check("(3) answered, then the same reply re-drawn: no repeat", factsAskedTwice(redrawn, false).length === 0, JSON.stringify(redrawn.map((item) => `${item.kind}:${item.id}`)));
  // The saved chat shown again on another screen (the case page reloads it): the same replies, not new questions.
  const elsewhere = read([raw("ask", 1, ORDER, 1000), raw("answer", 1, "", 2000), { ...raw("ask", 1, ORDER, 5000), screen: "/cases/:id" }, { ...raw("answer", 1, "", 5100), screen: "/cases/:id" }]);
  check("(3) the saved chat shown again on another screen: no repeat", factsAskedTwice(elsewhere, false).length === 0, JSON.stringify(elsewhere.map((item) => `${item.kind}:${item.id}@${item.screen}`)));
  // And a reply with no question answered by a reply gives nothing; another fact asked in the later reply is not a repeat.
  const other = read([raw("ask", 1, ORDER, 1000), raw("answer", 1, "", 2000), raw("ask", 2, "What proof do you currently have?", 3000)]);
  check("(2) a different question in the later reply is not a repeat", factsAskedTwice(other, false).length === 0);
}

// A civil or Family chat question that left the screen (carry run 4, 30 Oct): answered only when the person
// pressed an answer control, skipped it, or the chat is still on screen and moved on. The whole chat hidden
// ("Show the whole form instead") with nothing pressed is NOT an answer: it was recorded as one, so the
// review then asking that fact, which the person had never given, read as "asked twice".
{
  check("chat left: an answer pressed is an answer", chatQuestionAnswered({ pressedAnswer: true, skipped: false, chatStillShown: false }));
  check("chat left: a skip is recorded (as unsure)", chatQuestionAnswered({ pressedAnswer: false, skipped: true, chatStillShown: false }));
  check("chat left: still on screen and moved on (sent with Enter) is an answer", chatQuestionAnswered({ pressedAnswer: false, skipped: false, chatStillShown: true }));
  check("chat left: the whole chat hidden with nothing pressed is NOT an answer", !chatQuestionAnswered({ pressedAnswer: false, skipped: false, chatStillShown: false }));
  const scan = ASK_ONCE_SCAN();
  let parses = true;
  try { new Function(scan); } catch { parses = false; }
  check("the recorder script parses, and its chat answer goes through chatQuestionAnswered", parses && scan.includes("chatQuestionAnswered({ pressedAnswer: chatPressed.has(chatKey)"));
  // The run-4 sequence: the chat shows "What kind of case is it?", the person opens the whole form (no
  // answer recorded), the review asks it: one question, not a repeat. Pressed and answered, the review asking again is one.
  const kindAsk = (surface: string, id: string, at: number): Asked => ({ kind: "ask", surface, id, screen: "/builder", text: "What kind of case is it?", at });
  check("chat hidden unanswered, then the review asks the kind: not a repeat", factsAskedTwice([kindAsk("chat", "issues", 1), kindAsk("review", "issues", 3)], false).length === 0);
  check("chat answered, then the review asks the kind: a repeat (the rule is unchanged)", factsAskedTwice([kindAsk("chat", "issues", 1), { kind: "answer", surface: "chat", id: "issues", screen: "/builder", text: "", at: 2 }, kindAsk("review", "issues", 3)], false).length === 1);
}

// Diagnostic fields on an ask (30 Oct): the address's case id, the step, and the page's own case file
// state for the fact, read from the tab's intake copy. They only feed the records: the same events with
// and without them give the same repeats and held violations.
{
  const tab = JSON.stringify({ version: 2, ownerId: null, caseId: null, serverRevision: null, checkpoint: { version: 1, flowId: "00000000-0000-4000-8000-0000000000d1", courtPath: "civil", revision: "00000000-0000-4000-8000-0000000000d2", sections: { civil: { input: { issues: ["contract"] } } } } });
  const ask: Asked = { kind: "ask", surface: "chat", id: "issues", screen: "/builder", text: "What kind of case is it?", at: 5, address: "/builder?path=civil&intake=00000000-0000-4000-8000-0000000000d1", tab };
  const read = withPageHeld(ask, "the first case by its address");
  check("diagnostic: the tab copy is read into the page's own state, then dropped", read.pageHeld?.claimKind === "answered" && read.tab === undefined && read.step === "the first case by its address");
  check("diagnostic: one line with the case id, the step and the page state", diagnosticOf(read) === "case=00000000 step=the first case by its address page=claimKind:answered", String(diagnosticOf(read)));
  const plain: Asked[] = [{ kind: "ask", surface: "review", id: "issues", screen: "/builder", text: "x", at: 1 }, { kind: "answer", surface: "review", id: "issues", screen: "/builder", text: "", at: 2 }, { ...ask, tab: undefined, address: undefined }];
  const withDiag: Asked[] = [plain[0], plain[1], read];
  const strip = (items: { fact: string; surface: string; id: string; rule: string }[]) => JSON.stringify(items.map(({ fact, surface, id, rule }) => [fact, surface, id, rule]));
  check("diagnostic: the fields never change what counts", strip(repeatViolations(factsAskedTwice(plain, false))) === strip(repeatViolations(factsAskedTwice(withDiag, false))) && repeatViolations(factsAskedTwice(withDiag, false)).length === 1);
}

// The story is a fact too (founder's Chrome re-test of #536, 1 Nov: the Small Claims chat showed its story
// box, "Tell us what happened in your own words...", after the story was sent and the kind suggestion used).
// The chat's story box is an ask of "story"; the home page's story sent, or the chat's, gives it.
{
  const scan = ASK_ONCE_SCAN();
  check("the recorder asks \"story\" when the chat's story box appears, and records the story given", scan.includes('"sc-story", "story"') && scan.includes('"home-story", "story"'));
  check("the chat's story box asks for the story fact", factsOfAsk({ surface: "sc-story", id: "story", text: "" }).join() === "story");
  const given: Asked = { kind: "answer", surface: "home-story", id: "story", screen: "/", text: "", at: 2 };
  const box = (at: number): Asked => ({ kind: "ask", surface: "sc-story", id: "story", screen: "/builder?step=guided", text: "Tell us what happened in your own words", at });
  const again = repeatViolations(factsAskedTwice([given, box(3)], false));
  check("the story sent on the home page, then the chat's story box: asked twice (fact story)", again.length === 1 && again[0].fact === "story", JSON.stringify(again));
  check("the chat's story box before any story was given: not a repeat", factsAskedTwice([box(1), { kind: "answer", surface: "sc-story", id: "story", screen: "/builder?step=guided", text: "", at: 2 }], false).length === 0);
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("never ask twice: every check passed.");
