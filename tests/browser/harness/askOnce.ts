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
 *   the review               [data-testid=intake-initial-question][data-answered=false]
 *   the Family triage        [data-testid=triage-question][data-question]
 *   the stage question       [data-testid=stage-confirmation]
 *   the kind-of-claim card   [data-testid=claim-type-suggestion]
 *   the step page's dates    [data-testid=stage-answer-date-question][data-question-id]
 *   the review's own boxes    [data-testid=intake-entry][data-empty=true] (an empty box asks for its fact)
 *   the Small Claims form    [data-testid=sc-intake-documents][data-empty=true] ("What documents already exist?", nothing ticked)
 * Answers: the situation questions are always answered; a chat question left without
 * Skip; a review question that becomes answered; a Small Claims question followed by the
 * person's reply; a confirmed proposal; a saved date; a triage question that moves on
 * without "not yet"; a recorded stage; an accepted kind of claim.
 *
 * "NOT SURE" COUNTS AS ASKED (Jason, 2026-10-24). A skip, "I don't know yet", "not yet" or
 * "I don't know the date" is an answer too: the fact is given as unsure, and asking it
 * again is a repeat -- except ONCE, in the review (its box or its question; option 1), or as
 * the story's own suggestion ("Is that right?"). The next step shows it folded ("not known
 * yet -- Add it"), which is not a question; a date question there, or any second offer, fails.
 * The screen is the page's path, and the builder's step.
 */
import type { Page } from "@playwright/test";
import { factsOfQuestion } from "../../../src/lib/case-system/caseFile/factsOfQuestion";
import type { SituationAnswers } from "./situation";

export type Asked = { kind: "ask" | "answer"; surface: string; id: string; screen: string; text: string; at: number };

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
  ];
  let chatKey = null, triageKey = null, scQuestion = null, scUsers = 0, situationKey = null;
  // Skips and "not yet" give nothing: their question is not answered.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-testid]") : null;
    const id = target ? target.getAttribute("data-testid") : "";
    if (id === "guided-form-skip" && chatKey) skipped.add("chat|" + chatKey);
    if (id === "triage-answer-not-yet" && triageKey) skipped.add("triage|" + triageKey);
  }, true);
  const visible = (el) => !el.checkVisibility || el.checkVisibility();
  const scan = () => {
    for (const [surface, selector, ids] of surfaces) {
      for (const el of document.querySelectorAll(selector)) {
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
  };
  setInterval(scan, 200);
})()`;

/** Starts recording on this page (every later navigation too). Returns the list it fills. */
export async function recordAsks(page: Page): Promise<Asked[]> {
  const asked: Asked[] = [];
  await page.exposeFunction("__recordAsk", (item: Asked) => { asked.push(item); });
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
const END_SURFACES = new Set(["review", "review-entry", "chat-story"]);

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
    for (const fact of factsOfQuestion(item.id, item.surface)) if (!given.has(fact)) given.set(fact, { ...item, text: item.text === "unsure" ? "unsure" : ask?.text ?? "", screen: ask?.screen ?? item.screen });
  }
  const repeats = new Map<string, Repeat>();
  const offeredAgain = new Set<string>();
  for (const ask of asks) {
    if (ask.surface === "situation") continue;
    for (const fact of factsOfQuestion(ask.id, ask.surface)) {
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
