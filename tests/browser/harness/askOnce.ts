/**
 * THE ASK-ONCE RECORDER (gate A1). Records every question the site shows in one case,
 * on every screen, the fact each asks for (src/lib/case-system/caseFile/factsOfQuestion.ts),
 * and when the person answers it. A fact is asked twice when a question asks for it
 * AFTER the person has already given it, by another question or on another screen. A
 * question left unanswered (skipped, "I do not know yet", or simply left on screen) has
 * given nothing, so seeing it again is not a repeat.
 *
 * Question surfaces, each marked in the page by a data attribute:
 *   situation questions      [data-testid=situation-questions][data-question]
 *   questions one at a time  [data-testid=guided-form-question][data-key], and the
 *                            story offers [data-testid=guided-form-from-story][data-group]
 *   Small Claims guided      [data-testid=guided-message][data-question-id], and the
 *                            "here is what I understood" rows [data-testid=story-proposal-row]
 *                            (the depth questions carry their depth id: their fact is read
 *                            from their words, chatQuestionFacts.ts)
 *   the review               [data-testid=intake-initial-question][data-answered=false]
 *   the Family triage        [data-testid=triage-question][data-question]
 *   the stage question       [data-testid=stage-confirmation]
 *   the kind-of-claim card   [data-testid=claim-type-suggestion]
 *   the step page's dates    [data-testid=stage-answer-date-question][data-question-id]
 *   the review's own boxes    [data-testid=intake-entry][data-empty=true] (an empty box asks for its fact)
 *   the Small Claims form    [data-testid=sc-intake-documents][data-empty=true] ("What documents already exist?", nothing ticked)
 * And, never ask twice (site owner, 28 Oct), the places that ask in words, found by what the
 * page already renders (no site change); their fact is read from their words by the test's own
 * table (chatQuestionFacts.ts), never by the site's wording map:
 *   home-reading   the story reading's "What we still need to know" ([data-testid=case-understanding-questions] li)
 *   law            "A few questions the law raises" ([data-testid=sourced-question-current], its label)
 *   chat-reply     every question sentence in a follow-up chat reply ([data-testid=case-partner-transcript], the assistant's bubbles)
 *   confirm-next   the overview's "What to confirm next" card (a section headed so; its question)
 *   forms          the Forms page's questions (the section "Answer these and we will show the official forms...")
 *   service-method the step page's "How were the papers served?" (select[data-testid^=stage-answer-service-method-]), fact serviceMethod
 *   form-field     an empty, visible field of a form view: the Small Claims form ([data-testid^=sc-intake-]) by its key,
 *                  the civil and Family forms (a label holding a textarea) by its label
 * Answers: the situation questions are always answered; a chat question left without
 * Skip; a review question that becomes answered; a Small Claims question followed by the
 * person's reply; a confirmed proposal; a saved date; a triage question that moves on
 * without "not yet"; a recorded stage; an accepted kind of claim; a story-reading question
 * with words typed in its box; a law question moved on from (with words, or skipped: unsure);
 * a service method chosen; a form field filled.
 *
 * "NOT SURE" COUNTS AS ASKED (Jason, 2026-10-24). A skip, "I don't know yet", "not yet" or
 * "I don't know the date" is an answer too: the fact is given as unsure, and asking it
 * again is a repeat -- except ONCE, in the review (its box or its question; option 1), or as
 * the story's own suggestion ("Is that right?"). The next step shows it folded ("not known
 * yet -- Add it"), which is not a question; a date question there, or any second offer, fails.
 * The screen is the page's path, and the builder's step.
 *
 * HELD CHECK (never ask twice, 28 Oct). When a question is recorded, the saved case is read at
 * that moment through the site's own case file (caseFileOf), and the facts it holds as the
 * person's own (confirmed) are kept on the question. A question whose fact is held answered
 * fails (heldViolations), whatever screen asked it; a fact held unsure may be offered once more
 * at the end (END_SURFACES), as above.
 */
import type { Page } from "@playwright/test";
import { factsOfQuestion } from "../../../src/lib/case-system/caseFile/factsOfQuestion";
import { caseFileOf, SLOT_FACTS } from "../../../src/lib/case-system/caseFile/caseFile";
import { readCheckpoint } from "../../../src/lib/case-system/intakeCheckpoint";
import { factsOfWords, questionSentences } from "./chatQuestionFacts";
import type { Violation } from "./knownRepeats";
import type { SituationAnswers } from "./situation";

export type HeldState = "answered" | "unsure";
export type Asked = { kind: "ask" | "answer"; surface: string; id: string; screen: string; text: string; at: number; held?: Record<string, HeldState> };

const SCAN = `(() => {
  if (window.__askOnceInstalled) return;
  window.__askOnceInstalled = true;
  const seen = new Set();
  const answered = new Set();
  const skipped = new Set();
  let order = 0;
  const screen = () => {
    const url = new URL(location.href);
    const step = url.searchParams.get("step");
    return url.pathname.replace(/\\/cases\\/[^/]+/, "/cases/:id") + (step ? "?step=" + step : "");
  };
  const now = () => Date.now() * 1000 + (order++ % 1000);
  const emit = (kind, surface, id, text) => window.__recordAsk({ kind, surface, id, screen: screen(), text: (text || "").replace(/\\s+/g, " ").slice(0, 160), at: now() });
  const answer = (surface, id) => { const key = surface + "|" + id; if (answered.has(key)) return; answered.add(key); emit("answer", surface, id, skipped.has(key) ? "unsure" : ""); };
  const words = (el) => (el ? el.innerText || el.textContent || "" : "").replace(/\\s+/g, " ").trim();
  const headed = (selector, heading) => [...document.querySelectorAll(selector)].filter((h) => words(h) === heading).map((h) => h.parentElement).filter(Boolean);
  // The Forms page's questions: the section that says "Answer these and we will show the official forms".
  const formsQuestions = () => [...document.querySelectorAll("p")].filter((p) => words(p).startsWith("Answer these and we will show the official forms")).flatMap((p) => [...p.parentElement.querySelectorAll("label.block, [data-testid=forms-suggested-from-case]")]);
  // The civil and Family forms' text boxes: a label holding a heading and a textarea with no test id (the Small Claims form's own carry theirs and are read by key above), outside the review and the other asking places.
  const formLabels = () => [...document.querySelectorAll("label")].filter((l) => l.querySelector(":scope > textarea:not([data-testid])") && l.querySelector(":scope > span.font-semibold") && !l.closest("[data-testid=intake-review], [data-testid=sourced-questions], [data-testid=case-understanding], [data-testid=case-partner-transcript]"));
  // A form field asks when it stays empty for three scans (a field the page is still filling is not a question yet).
  const emptyScans = new Map();
  const steadyEmpty = (key, empty) => { if (!empty) { emptyScans.delete(key); return false; } const n = (emptyScans.get(key) || 0) + 1; emptyScans.set(key, n); return n >= 3; };
  const surfaces = [
    ["situation", "[data-testid=situation-questions]", (el) => [el.getAttribute("data-question")]],
    ["chat", "[data-testid=guided-form-question]", (el) => [el.getAttribute("data-key")]],
    ["chat-story", "[data-testid=guided-form-from-story]", (el) => (el.getAttribute("data-group") || "").split(" ")],
    ["sc-chat", "[data-testid=guided-message][data-question-id]", (el) => [el.getAttribute("data-question-id")]],
    ["sc-proposal", "[data-testid=story-proposal-row]", (el) => [el.getAttribute("data-question-id")]],
    ["review", "[data-testid=intake-initial-question][data-answered=false]", (el) => [el.getAttribute("data-question")]],
    ["triage", "[data-testid=triage-question]", (el) => [el.getAttribute("data-question")]],
    ["stage", "[data-testid=stage-confirmation]", () => ["stage-confirmation"]],
    ["sc-claim-kind", "[data-testid=claim-type-suggestion]", () => ["claim-kind-suggestion"]],
    ["date", "[data-testid=stage-answer-date-question]", (el) => [el.getAttribute("data-question-id")]],
    // An empty, editable box in the review asks for its fact; so does the Small Claims form's documents list with nothing ticked.
    ["review-entry", "[data-testid=intake-entry][data-empty=true]", (el) => [el.getAttribute("data-field")]],
    // The end: "What we have so far" offers an unsure fact once more; the kind-of-claim chooser asks it.
    ["end", "[data-testid=case-file-line][data-state=unsure] [data-testid=case-file-answer-now]", (el) => [el.closest("[data-testid=case-file-line]").getAttribute("data-question")]],
    ["claim-kind", "[data-testid=claim-kind-chooser]", () => ["claim-kind-suggestion"]],
    ["sc-form", "[data-testid=sc-intake-documents][data-empty=true]", () => ["filedDocuments"]],
    // Never ask twice (28 Oct): the places that ask in words. The id is the question's own words.
    ["home-reading", "[data-testid=case-understanding-questions] li", (el) => [words(el.querySelector("label > span"))]],
    ["law", "[data-testid=sourced-question-current]", (el) => [words(el.querySelector("label"))]],
    ["confirm-next", () => headed("section > h2", "What to confirm next"), (el) => [words(el.querySelector("p.font-semibold"))]],
    ["forms", formsQuestions, (el) => [el.matches("label") ? words(el.childNodes[0]) || words(el) : words(el.querySelector("p.font-semibold"))]],
    ["service-method", "select[data-testid^=stage-answer-service-method-]", (el) => ["serviceMethod:" + el.getAttribute("data-testid").slice("stage-answer-service-method-".length)]],
    ["form-field", "input[data-testid^=sc-intake-], textarea[data-testid^=sc-intake-], select[data-testid^=sc-intake-]", (el) => { const key = el.getAttribute("data-testid").slice("sc-intake-".length); return steadyEmpty("sc:" + key, el.type !== "file" && el.value === "") ? ["sc:" + key] : []; }],
    ["form-field", formLabels, (el) => { const label = words(el.querySelector(":scope > span.font-semibold")); return steadyEmpty("label:" + label, el.querySelector(":scope > textarea:not([data-testid])").value === "") ? ["label:" + label] : []; }],
  ];
  let chatKey = null, triageKey = null, scQuestion = null, scUsers = 0, situationKey = null, lawKey = null, lawValue = "";
  // Skips and "not yet" give nothing: their question is not answered.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-testid]") : null;
    const id = target ? target.getAttribute("data-testid") : "";
    if (id === "guided-form-skip" && chatKey) skipped.add("chat|" + chatKey);
    if (id === "triage-answer-not-yet" && triageKey) skipped.add("triage|" + triageKey);
    // The proposal card: read the ticks at the click itself. The scan runs every 200 ms, and an
    // untick followed at once by "continue" could otherwise leave the card's last-scanned ticks,
    // recording an unticked row as confirmed (m04-tenant, CI 29 Oct: a false "asked twice").
    const card = event.target instanceof Element ? event.target.closest("[data-testid=story-proposals]") : null;
    if (card) window.__askOnceRows = [...card.querySelectorAll("[data-testid=story-proposal-row]")].filter((row) => { const tick = row.querySelector("input[type=checkbox]"); return !tick || tick.checked; }).map((row) => row.getAttribute("data-question-id"));
  }, true);
  // A service method chosen is its answer.
  document.addEventListener("change", (event) => {
    const el = event.target instanceof Element ? event.target : null;
    const id = el ? el.getAttribute("data-testid") || "" : "";
    if (id.startsWith("stage-answer-service-method-") && el.value) answer("service-method", "serviceMethod:" + id.slice("stage-answer-service-method-".length));
  }, true);
  const visible = (el) => !el.checkVisibility || el.checkVisibility();
  const chatSeen = new Map();
  const scan = () => {
    for (const [surface, selector, ids] of surfaces) {
      const found = typeof selector === "function" ? selector() : document.querySelectorAll(selector);
      for (const el of found) {
        if (!visible(el)) continue;
        for (const id of ids(el)) {
          if (!id) continue;
          const key = surface + "|" + id + "|" + screen();
          if (seen.has(key)) continue;
          seen.add(key);
          emit("ask", surface, id, el.innerText);
        }
      }
    }
    // The follow-up chat: each assistant reply, whole, as it grows; the test process splits it into its question sentences.
    const bubbles = [...document.querySelectorAll("[data-testid=case-partner-transcript] > div.mr-auto")].filter(visible);
    bubbles.forEach((bubble, index) => {
      const text = (bubble.querySelector(".whitespace-pre-wrap") || bubble).innerText || "";
      if (!text.trim() || chatSeen.get(index) === text) return;
      chatSeen.set(index, text);
      window.__recordAsk({ kind: "ask", surface: "chat-reply-raw", id: String(index), screen: screen(), text: text.slice(0, 6000), at: now() });
    });
    // Situation questions: each one answered as it moves on (they cannot be skipped).
    const sq = document.querySelector("[data-testid=situation-questions]");
    const nextSituation = sq && visible(sq) ? sq.getAttribute("data-question") : null;
    if (situationKey && situationKey !== nextSituation) answer("situation", situationKey);
    situationKey = nextSituation;
    // Chat (civil, Family): a question left without Skip was answered.
    const cq = document.querySelector("[data-testid=guided-form-question]");
    const nextChat = cq && visible(cq) ? cq.getAttribute("data-key") : null;
    if (chatKey && chatKey !== nextChat) answer("chat", chatKey);
    chatKey = nextChat;
    // Review: a question shown answered.
    for (const el of document.querySelectorAll("[data-testid=intake-initial-question][data-answered=true]")) answer("review", el.getAttribute("data-question"));
    // Small Claims guided: a question followed by the person's reply.
    const questions = [...document.querySelectorAll("[data-testid=guided-message][data-question-id]")];
    const users = document.querySelectorAll("[data-testid=guided-message][data-from=user]").length;
    const lastQuestion = questions.length ? questions[questions.length - 1].getAttribute("data-question-id") : null;
    if (scQuestion && users > scUsers) answer("sc-chat", scQuestion);
    if (lastQuestion !== scQuestion) scUsers = users;
    scQuestion = lastQuestion;
    // Proposals: the rows confirmed when the card goes.
    window.__askOnceRows = window.__askOnceRows || [];
    const rows = [...document.querySelectorAll("[data-testid=story-proposal-row]")].filter(visible);
    if (rows.length) window.__askOnceRows = rows.filter((row) => { const tick = row.querySelector("input[type=checkbox]"); return !tick || tick.checked; }).map((row) => row.getAttribute("data-question-id"));
    else if (window.__askOnceRows.length) { for (const id of window.__askOnceRows) answer("sc-proposal", id); window.__askOnceRows = []; }
    // Step page dates: a date saved.
    for (const el of document.querySelectorAll("[data-testid^=stage-answer-known-]")) answer("date", el.getAttribute("data-testid").slice("stage-answer-known-".length));
    // Triage: a question that moves on.
    const tq = document.querySelector("[data-testid=triage-question]");
    const nextTriage = tq && visible(tq) ? tq.getAttribute("data-question") : null;
    if (triageKey && triageKey !== nextTriage) answer("triage", triageKey);
    triageKey = nextTriage;
    // Stage recorded; kind of claim accepted.
    if (document.querySelector("[data-testid=stage-confirmed]")) answer("stage", "stage-confirmation");
    // Review questions marked "I don't know yet": answered as unsure.
    for (const el of document.querySelectorAll("[data-testid=intake-initial-question][data-unknown=true]")) { skipped.add("review|" + el.getAttribute("data-question")); answer("review", el.getAttribute("data-question")); }
    // The story reading: a question with words typed in its box is answered.
    for (const li of document.querySelectorAll("[data-testid=case-understanding-questions] li")) { const box = li.querySelector("input"); if (box && box.value.trim()) answer("home-reading", words(li.querySelector("label > span"))); }
    // The law's questions: one moved on from is answered (with words), or skipped ("Skip this one": unsure).
    const lq = document.querySelector("[data-testid=sourced-question-current]");
    const nextLaw = lq && visible(lq) ? words(lq.querySelector("label")) : null;
    if (lawKey && lawKey !== nextLaw) { if (!lawValue.trim()) skipped.add("law|" + lawKey); answer("law", lawKey); }
    lawKey = nextLaw;
    lawValue = lq ? (lq.querySelector("textarea") || { value: "" }).value : "";
    // A form field asked, then filled.
    for (const el of document.querySelectorAll("input[data-testid^=sc-intake-], textarea[data-testid^=sc-intake-], select[data-testid^=sc-intake-]")) if (el.value) { const id = "sc:" + el.getAttribute("data-testid").slice("sc-intake-".length); if (seen.has("form-field|" + id + "|" + screen())) answer("form-field", id); }
    for (const el of formLabels()) if (el.querySelector(":scope > textarea:not([data-testid])").value) { const id = "label:" + words(el.querySelector(":scope > span.font-semibold")); if (seen.has("form-field|" + id + "|" + screen())) answer("form-field", id); }
  };
  setInterval(scan, 200);
})()`;

/**
 * The fields of the form views, by their key or their label, for the facts they ask for: the test's
 * own (the Small Claims form's keys go through the site's question map where it has them).
 */
const FORM_FIELD_FACTS: Record<string, readonly string[]> = {
  "sc:yourRole": ["side"],
  "sc:caseStage": ["stage"],
  "sc:timeline": ["whenHappened"],
  "sc:evidence": ["evidence"],
  "sc:serviceDetails": ["servedDate", "serviceMethod"],
  "label:Amount claimed or disputed": ["amount"],
  "label:What do you want ordered?": ["wants"],
  "label:Timeline": ["whenHappened"],
  "label:Evidence you have": ["evidence"],
  "label:Court / tribunal file number, if already started": ["courtFileNumber"],
};

/** The surfaces whose question is its own words (no id): their fact comes from the words (chatQuestionFacts.ts). */
const WORDED = new Set(["chat-reply", "home-reading", "law", "confirm-next", "forms"]);

/** The facts a recorded question asks for, on any surface. A question whose words name no fact asks for a fact of its own. */
export function factsOfAsk(item: Pick<Asked, "surface" | "id" | "text">): string[] {
  if (WORDED.has(item.surface)) { const facts = factsOfWords(item.id); return facts.length ? facts : [`${item.surface}:${item.id}`]; }
  if (item.surface === "service-method") return ["serviceMethod"];
  if (item.surface === "form-field") {
    const own = FORM_FIELD_FACTS[item.id];
    if (own) return [...own];
    const [where, key] = [item.id.slice(0, item.id.indexOf(":")), item.id.slice(item.id.indexOf(":") + 1)];
    if (where === "sc") { const facts = factsOfQuestion(key); return facts.length === 1 && facts[0] === key ? [item.id] : facts; }
    const facts = factsOfWords(key);
    return facts.length ? facts : [item.id];
  }
  // A Small Claims depth question carries its own depth id: its fact is read from its words.
  if (item.surface === "sc-chat" && item.id.startsWith("depth-")) { const facts = factsOfWords(item.text); return facts.length ? facts : [item.id]; }
  return factsOfQuestion(item.id, item.surface);
}

/** What the saved case holds at a moment: each slot the person answered (confirmed), answered or unsure. Story guesses (confirmed false) are not held. */
export function heldFacts(master: unknown, court: "small-claims" | "civil" | "family"): Map<string, HeldState> {
  const held = new Map<string, HeldState>();
  const value = master && typeof master === "object" && !Array.isArray(master) ? (master as Record<string, unknown>) : null;
  if (!value) return held;
  const file = caseFileOf(readCheckpoint(value.intakeCheckpoint, court), value);
  for (const fact of SLOT_FACTS) {
    const slot = file[fact];
    if (!slot.confirmed) continue;
    if (slot.state === "answered" || slot.state === "unsure") held.set(fact, slot.state);
  }
  return held;
}

/** The saved case of a synthetic account (the case of that court last written), as the held check reads it. */
export function heldInRows(rows: Map<string, Record<string, unknown>>, court: "small-claims" | "civil" | "family"): (fact: string) => HeldState | null {
  const cases = [...rows.values()].filter((row) => !row.court_path || row.court_path === court).sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
  const held = cases.length ? heldFacts(cases[0].master_result, court) : new Map<string, HeldState>();
  return (fact) => held.get(fact) ?? null;
}

/** A question with the facts the saved case holds for it, at this moment (none kept when it holds none). */
export function withHeldFacts(item: Asked, read: ((fact: string) => HeldState | null) | null): Asked {
  if (!read || item.kind !== "ask") return item;
  const held: Record<string, HeldState> = {};
  for (const fact of factsOfAsk(item)) { const state = read(fact); if (state) held[fact] = state; }
  return Object.keys(held).length ? { ...item, held } : item;
}

/**
 * Starts recording on this page (every later navigation too). Returns the list it fills.
 * `held`, when given, is asked at the moment each question is recorded which of its facts the
 * saved case holds (heldInRows); the answer is kept on the question for heldViolations.
 */
export async function recordAsks(page: Page, options: { held?: () => ((fact: string) => HeldState | null) | null } = {}): Promise<Asked[]> {
  const asked: Asked[] = [];
  const chatSentences = new Set<string>();
  const withHeld = (item: Asked): Asked => withHeldFacts(item, item.kind === "ask" && options.held ? options.held() : null);
  await page.exposeFunction("__recordAsk", (item: Asked) => {
    // A chat reply, whole: one question per question sentence, each once per screen.
    if (item.surface === "chat-reply-raw") {
      let order = 0;
      for (const sentence of questionSentences(item.text)) {
        const key = `${sentence}|${item.screen}`;
        if (chatSentences.has(key)) continue;
        chatSentences.add(key);
        asked.push(withHeld({ ...item, surface: "chat-reply", id: sentence, text: sentence.slice(0, 160), at: item.at + order++ / 1000 }));
      }
      return;
    }
    asked.push(withHeld(item));
  });
  await page.addInitScript(SCAN);
  return asked;
}

/** The facts the person's situation answers give. */
export function factsFromSituation(answers: SituationAnswers | false): string[] {
  if (!answers) return [];
  const facts = ["situation", "court"];
  if (answers.where === "starting" || answers.where === "served") facts.push("side", "stage");
  // A case already going: the side, that papers are filed, and what has happened so far (asked once).
  if (answers.where === "going") facts.push("filed", "stage");
  if (answers.where === "going" && answers.started) facts.push("side");
  if (answers.where === "starting" && answers.filed) facts.push("filed");
  if (answers.papers) facts.push("papers");
  if (answers.receivedOn && answers.receivedOn !== "unknown") facts.push("servedDate");
  return facts;
}

/** The facts the situation answers give as unsure ("I don't know the date", papers "not sure", stage "not sure"). */
export function unsureFromSituation(answers: SituationAnswers | false): string[] {
  if (!answers) return [];
  const facts: string[] = [];
  if (answers.receivedOn === "unknown" && (answers.where === "served" || (answers.where === "going" && answers.started === "them"))) facts.push("servedDate");
  if (answers.where === "going" && (answers.stage ?? "not-sure") === "not-sure") facts.push("stage");
  if (answers.papers === "not-sure") facts.push("papers");
  return facts;
}

/** Where an unsure fact may be offered once more (once, in total): the review, or the story's suggestion. */
export const END_SURFACES = new Set(["review", "review-entry", "chat-story"]);

export type Repeat = { fact: string; given: Asked; asks: Asked[] };

/**
 * Each fact asked again after the person gave it: the first answer that gave the fact,
 * then every later question for that fact by another question or on another screen.
 * The situation answers give every fact they settle, first.
 */
export function factsAskedTwice(events: readonly Asked[], situation: SituationAnswers | false): Repeat[] {
  const asks = events.filter((item) => item.kind === "ask");
  const given = new Map<string, Asked>();
  const situationGiven: Asked = { kind: "answer", surface: "situation", id: "answers", screen: "/", text: "the situation questions", at: 0 };
  for (const fact of factsFromSituation(situation)) given.set(fact, situationGiven);
  for (const fact of unsureFromSituation(situation)) given.set(fact, { ...situationGiven, text: "unsure" });
  const firstAsk = (surface: string, id: string) => asks.find((item) => item.surface === surface && item.id === id);
  // Answers, in order, give their question's facts.
  for (const item of events.filter((event) => event.kind === "answer").sort((a, b) => a.at - b.at)) {
    const ask = firstAsk(item.surface, item.id);
    for (const fact of factsOfAsk(ask ?? item)) if (!given.has(fact)) given.set(fact, { ...item, text: item.text === "unsure" ? "unsure" : ask?.text ?? "", screen: ask?.screen ?? item.screen });
  }
  const repeats = new Map<string, Repeat>();
  const offeredAgain = new Set<string>();
  for (const ask of asks) {
    if (ask.surface === "situation") continue;
    for (const fact of factsOfAsk(ask)) {
      const gave = given.get(fact);
      if (!gave || ask.at <= gave.at) continue;
      if (gave.surface === ask.surface && gave.id === ask.id && gave.screen === ask.screen) continue;
      // An unsure fact, offered once more at the end: allowed once.
      if (gave.text === "unsure" && END_SURFACES.has(ask.surface) && !offeredAgain.has(fact)) { offeredAgain.add(fact); continue; }
      const repeat = repeats.get(fact) ?? { fact, given: gave, asks: [] };
      repeat.asks.push(ask);
      repeats.set(fact, repeat);
    }
  }
  return [...repeats.values()];
}

/**
 * THE HELD CHECK. Every question asked while the saved case held its fact as the person's own:
 * held answered, it fails; held unsure, it may be offered once more at the end (END_SURFACES),
 * once per fact, and any other offer fails. The situation questions are the start, not a repeat.
 */
export function heldViolations(events: readonly Asked[]): Violation[] {
  const violations: Violation[] = [];
  const offeredAgain = new Set<string>();
  for (const ask of [...events].filter((item) => item.kind === "ask").sort((a, b) => a.at - b.at)) {
    if (ask.surface === "situation" || !ask.held) continue;
    for (const [fact, state] of Object.entries(ask.held)) {
      if (state === "unsure" && END_SURFACES.has(ask.surface) && !offeredAgain.has(fact)) { offeredAgain.add(fact); continue; }
      violations.push({ rule: "held", fact, surface: ask.surface, id: ask.id, screen: ask.screen, text: ask.text, detail: `held ${state}` });
    }
  }
  return violations;
}

/** The repeats of factsAskedTwice, one violation per question asked again. */
export function repeatViolations(repeats: readonly Repeat[]): Violation[] {
  return repeats.flatMap((repeat) => repeat.asks.map((ask) => ({ rule: "twice" as const, fact: repeat.fact, surface: ask.surface, id: ask.id, screen: ask.screen, text: ask.text, detail: `given at ${repeat.given.surface}:${repeat.given.id}@${repeat.given.screen} "${repeat.given.text.slice(0, 80)}"` })));
}
