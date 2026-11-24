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
 *   the chat's story box     textarea[aria-describedby=guided-story-guidance] (Small Claims), fact "story", asked
 *                            each time it comes on screen; the story is given by "Continue to ... intake" with the
 *                            home page's story box filled, or "Send" / "Send my story" in the chat (founder, 1 Nov)
 *   the story's events       [data-testid=event-candidate]: a date box left empty while its own quoted
 *                            sentence gives that date (fact dateInOwnSentence, given by the story)
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
 * a service method chosen; a form field filled; a follow-up chat reply followed by the person's next
 * message (its question sentences; the same words in a later reply are asked again, chatReplyReader).
 *
 * "NOT SURE" COUNTS AS ASKED (Jason, 2026-10-24). A skip, "I don't know yet", "not yet" or
 * "I don't know the date" is an answer too: the fact is given as unsure, and asking it
 * again ANYWHERE is a repeat (site owner, 31 Oct; it replaced option 1's one allowed offer in
 * the review or as the story's suggestion): the review, a box, a form field, the story's
 * "Is that right?", an answer-now offer, the step page's date question. Screens show it as
 * "Not answered yet: add it when you know" with "Add it", which is not a question.
 * The screen is the page's path, and the builder's step.
 *
 * THE SAVED CONVERSATION SHOWN AGAIN (site owner, 29 Oct). After a reload the Small Claims guided
 * chat shows its earlier questions and replies. Each ask carries the reply shown under it; it is
 * excused (restoredAsk) only when that reply is the one already recorded for the question in this
 * case. Shown with no reply, or with another reply, it is asked again and counts.
 *
 * HELD CHECK (never ask twice, 28 Oct). When a question is recorded, the saved case is read at
 * that moment through the site's own case file (caseFileOf), and the facts it holds as the
 * person's own (confirmed) are kept on the question. A question whose fact is held, answered
 * or unsure, fails (heldViolations), whatever screen asked it: there is no offer at the end.
 */
import type { Page } from "@playwright/test";
import { factsOfQuestion } from "../../../src/lib/case-system/caseFile/factsOfQuestion";
import { caseFileOf, heldLocation, heldOtherPartyCity, heldYourName, SLOT_FACTS } from "../../../src/lib/case-system/caseFile/caseFile";
import { FACT_IDS } from "../../../src/lib/case-system/caseFile/factRecord";
import { CLAIM_TYPES } from "../../../src/lib/case-system/intake/claimTypes";
import { readCheckpoint } from "../../../src/lib/case-system/intakeCheckpoint";
import { GUEST_INTAKE_SESSION_KEY } from "../../../src/lib/case-system/storage/intakeStorageKeys";
import { factsOfWords, questionSentences } from "./chatQuestionFacts";
import type { Violation } from "./knownRepeats";
import type { SituationAnswers } from "./situation";

export type HeldState = "answered" | "unsure";
/**
 * `occurrence`: which of the follow-up chat's replies a question was in (and which reply a person's
 * answer answers), so the same words in a later reply are a new question; absent on every other surface.
 */
export type Asked = { kind: "ask" | "answer" | "blind"; surface: string; id: string; screen: string; text: string; at: number; held?: Record<string, HeldState>;
  /** Small Claims guided only: the person's reply shown under the question (an ask) or given to it (an answer). */
  reply?: string; occurrence?: string;
  /**
   * DIAGNOSTIC ONLY (30 Oct): nothing that counts reads these. The page's address (its case id), the
   * test's step when the ask was seen, and the page's OWN case file state for the asked facts (read
   * from the tab's intake copy, the snapshot the page itself shows), to tell a page that does not hold
   * a fact the saved case holds from a gate that asks a fact the page holds.
   */
  address?: string; step?: string; pageHeld?: Record<string, string>; tab?: string };

/**
 * WHEN A CIVIL OR FAMILY CHAT QUESTION THAT LEFT THE SCREEN WAS ANSWERED (30 Oct). Answered: the person
 * pressed one of its answer controls (Next, "Yes" to the story's words, an option), or skipped it (an
 * "unsure"), or the chat is still on screen and moved on (an answer typed and sent with Enter). NOT
 * answered: the whole chat left the screen with no answer pressed ("Show the whole form instead", a
 * page change). The recorder counted that as an answer, so the review asking the same fact later read
 * as "asked twice" (carry run 4, civil and Family form route: "given at chat:issues" while the review
 * line said "What the case is about: Not recorded"; the person had never answered it). Embedded in SCAN.
 */
export function chatQuestionAnswered(left: { pressedAnswer: boolean; skipped: boolean; chatStillShown: boolean }): boolean {
  return left.pressedAnswer || left.skipped || left.chatStillShown;
}

/**
 * BOXES THAT ARE NOT QUESTIONS (the blind-spot check's exempt list; site owner, 24 Nov 2026, Round 3 Step A). A box a person
 * can type in that no surface logs fails the journey unless it is here, with why. A new box is a question until it is
 * either logged by a surface or listed here.
 */
export const BLIND_EXEMPT: readonly { selector: string; why: string }[] = [
  { selector: "[data-testid=parties-detail-typing] input", why: "the person's own Change opened it on an answer the Parties step holds (they are editing, not being asked)" },
  { selector: "[data-testid=parties-detail-unsure] input", why: "a Parties box shown with its own \"Not sure yet (not asked again)\" note (boxView, not sure or removed)" },
  { selector: "[data-testid=change-answer-text]", why: "the review's Change, opened by the person on an answer already held" },
  { selector: "select[aria-label=\"Province or territory\"]", why: "the home page's province: one fixed option (Ontario), nothing to choose" },
  { selector: "[data-testid=guided-answer]", why: "the Small Claims chat's reply box: the question is the chat's message (sc-chat), this is where the person answers it" },
  { selector: "[data-testid=review-story-draft]", why: "the person's own story, held, shown in its box to edit (the story is never asked again)" },
  { selector: "input[placeholder^=\"Search by form number\"]", why: "the Forms page's search: a list control, not a question about the case" },
  { selector: "select:has(option[value=verified])", why: "the Forms page's \"Show\" filter: a list control, not a question about the case" },
];
const BLIND_EXEMPT_SELECTORS = BLIND_EXEMPT.map((entry) => entry.selector);

/** The boxes the recorder saw on screen that no surface logs and the exempt list does not name (the blind spots). */
export function blindBoxes(events: readonly Asked[]): string[] {
  return [...new Set(events.filter((event) => event.kind === "blind").map((event) => `${event.id} @ ${event.screen}`))];
}

const SCAN = `(() => {
  const chatQuestionAnswered = ${chatQuestionAnswered.toString()};
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
  // Diagnostic only: the address, and for an ask the tab's intake copy (the page's own snapshot).
  const tabCopy = () => { try { return sessionStorage.getItem(${JSON.stringify(GUEST_INTAKE_SESSION_KEY)}) || undefined; } catch { return undefined; } };
  const emit = (kind, surface, id, text, reply) => window.__recordAsk({ kind, surface, id, screen: screen(), text: (text || "").replace(/\\s+/g, " ").slice(0, 160), at: now(), address: location.pathname + location.search, ...(kind === "ask" ? { tab: tabCopy() } : {}), ...(typeof reply === "string" ? { reply: reply.replace(/\\s+/g, " ").trim().slice(0, 500) } : {}) });
  const answer = (surface, id, reply) => { const key = surface + "|" + id; if (answered.has(key)) return; answered.add(key); emit("answer", surface, id, skipped.has(key) ? "unsure" : "", reply); };
  // Small Claims guided: the person's reply shown right under a question (a user message before the next question), if any.
  const replyAfter = (el) => { const all = [...document.querySelectorAll("[data-testid=guided-message]")]; for (const m of all.slice(all.indexOf(el) + 1)) { if (m.getAttribute("data-from") === "user") return words(m); if (m.hasAttribute("data-question-id")) return undefined; } return undefined; };
  const words = (el) => (el ? el.innerText || el.textContent || "" : "").replace(/\\s+/g, " ").trim();
  const headed = (selector, heading) => [...document.querySelectorAll(selector)].filter((h) => words(h) === heading).map((h) => h.parentElement).filter(Boolean);
  // The Forms page's questions: the section that says "Answer these and we will show the official forms".
  // The Forms tab: its open questions ("forms") and its offers from the case ("forms-offer", one control each), apart, so the
  // ask-once page test can tell an offer from a question (site owner, 17 Nov: a fact is offered once).
  const formsBlock = (selector) => [...document.querySelectorAll("p")].filter((p) => words(p).startsWith("Answer these and we will show the official forms")).flatMap((p) => [...p.parentElement.querySelectorAll(selector)]);
  const formsQuestions = () => formsBlock("label.block");
  const formsOffers = () => formsBlock("[data-testid=forms-suggested-from-case]");
  // The civil and Family forms' text boxes: a label holding a heading and a textarea with no test id (the Small Claims form's own carry theirs and are read by key above), outside the review and the other asking places.
  const formLabels = () => [...document.querySelectorAll("label")].filter((l) => l.querySelector(":scope > textarea:not([data-testid])") && l.querySelector(":scope > span.font-semibold") && !l.closest("[data-testid=intake-review], [data-testid=sourced-questions], [data-testid=case-understanding], [data-testid=case-partner-transcript]"));
  // A form field asks when it stays empty for three scans ON THIS SCREEN (a field the page is still filling is not a
  // question yet). Counted by screen as well as by box (site owner, 16 Nov 2026): the address changes before the page
  // hides the screen it leaves (pushStep), so scans from the screen left must not count on the new one
  // (watcher-steady-by-screen.spec.ts; #550 CI, carry Small Claims form signed-in).
  const emptyScans = new Map();
  const steadyEmpty = (box, empty) => { const key = screen() + "|" + box; if (!empty) { emptyScans.delete(key); return false; } const n = (emptyScans.get(key) || 0) + 1; emptyScans.set(key, n); return n >= 3; };
  const surfaces = [
    ["situation", "[data-testid=situation-questions]", (el) => [el.getAttribute("data-question")]],
    ["chat", "[data-testid=guided-form-question]", (el) => [el.getAttribute("data-key")]],
    ["chat-story", "[data-testid=guided-form-from-story]", (el) => (el.getAttribute("data-group") || "").split(" ")],
    // Each ask carries the reply shown under it, if any (replyAfter): restoredAsk() tells the saved
    // conversation shown again after a reload from a question asked again.
    ["sc-chat", "[data-testid=guided-message][data-question-id]", (el) => [el.getAttribute("data-question-id")]],
    ["sc-proposal", "[data-testid=story-proposal-row]", (el) => [el.getAttribute("data-question-id")]],
    // Every review question is SEEN (the blind-spot check: an answered one is no blind box), and asked only while unanswered.
    ["review", "[data-testid=intake-initial-question]", (el) => el.getAttribute("data-answered") === "false" ? [el.getAttribute("data-question")] : []],
    ["triage", "[data-testid=triage-question]", (el) => [el.getAttribute("data-question")]],
    ["stage", "[data-testid=stage-confirmation]", () => ["stage-confirmation"]],
    ["sc-claim-kind", "[data-testid=claim-type-suggestion]", () => ["claim-kind-suggestion"]],
    ["date", "[data-testid=stage-answer-date-question]", (el) => [el.getAttribute("data-question-id")]],
    // An empty, editable box in the review asks for its fact; so does the Small Claims form's documents list with nothing ticked.
    // Every review entry is SEEN, and asked only while empty (blind-spot check, 24 Nov 2026: the filled ones were "blind").
    ["review-entry", "[data-testid=intake-entry]", (el) => el.getAttribute("data-empty") === "true" ? [el.getAttribute("data-field")] : []],
    // An answer-now offer of an unsure fact on "What we have so far" (none is drawn now: any is a repeat); the kind-of-claim chooser asks it.
    ["end", "[data-testid=case-file-line][data-state=unsure] [data-testid=case-file-answer-now]", (el) => [el.closest("[data-testid=case-file-line]").getAttribute("data-question")]],
    ["claim-kind", "[data-testid=claim-kind-chooser]", () => ["claim-kind-suggestion"]],
    ["sc-form", "[data-testid=sc-intake-documents][data-empty=true]", () => ["filedDocuments"]],
    // The Parties step (site owner, 14 Nov 2026, rule 1): an empty box asks for that party's detail, the person-or-company
    // question for its kind; a story offer asks once (its own id, by what it offers). Each party by its id in the record.
    // Whose entry it is ("you", "yours", "other") as well as its id, so its fact is known (one asker, 23 Nov 2026: a box
    // named only by the party's id counted as a fact of its own, so a name or a city asked again counted as nothing).
    ["parties", "[data-testid=parties-detail-ask]", (el) => ["party:" + ((el.closest("[data-party]") || el).getAttribute("data-party") || "") + ":" + ((el.closest("[data-party-id]") || el).getAttribute("data-party-id") || "") + ":" + el.getAttribute("data-detail")]],
    ["parties", "[data-testid=parties-kind]", (el) => ["party:" + ((el.closest("[data-party]") || el).getAttribute("data-party") || "") + ":" + ((el.closest("[data-party-id]") || el).getAttribute("data-party-id") || "") + ":kind"]],
    // The Form 7A checklist (one asker, 23 Nov 2026): an item "Still to add" asks for it; an item "From your story we found"
    // offers it. Each by its element id.
    // Before the one asker the item had no marker, only its heading ('Still to add: "<the element's name>"'): read by that,
    // so the "before" question logs (#561) count it the same way.
    ["form7a-still-to-add", () => [...document.querySelectorAll("[data-testid=form7a-still-to-add]"), ...[...document.querySelectorAll("p")].filter((p) => /^Still to add: “|^Still to add: "/.test(words(p)) && !p.closest("[data-testid=form7a-still-to-add]"))],
      (el) => [el.getAttribute("data-element") || "name:" + words(el).replace(/^Still to add: ["“]/, "").replace(/["”]\s*$/, "")]],
    ["form7a-found", "[data-testid=form7a-found] [data-element]", (el) => [el.getAttribute("data-element")]],
    // The Small Claims form's "Found in your description" offers, each by its box (one asker, 23 Nov 2026). Before the one
    // asker an item had no marker: read by its "<box>:" words, so the "before" logs count it the same way.
    ["sc-form-offer", () => [...document.querySelectorAll("p")].filter((p) => words(p).startsWith("Found in your description")).flatMap((p) => [...p.parentElement.querySelectorAll("li")]), (el) => [el.getAttribute("data-field") || words(el).split(":")[0].trim()]],
    // Whose entry the offer is in (the person's own, "you", or the other side's), so its fact is known (C9: a name or a city
    // offered again on the Parties step was counted as nothing, and Chrome saw both).
    ["parties-offer", "[data-testid=parties-step] [data-offer-choices]", (el) => ["party-offer:" + (el.closest("[data-party]")?.getAttribute("data-party") ?? "") + ":" + words(el.querySelector("[data-testid$=-what]"))]],
    // "Things that may have happened in your case" (EventCandidateSurface): each candidate quotes the
    // person's own sentence. A date box left empty while that very sentence gives the date asks for
    // it again (Chrome 29 Oct, finding 1: "March 2026" in the story, "When, in your words" asked).
    // "when": the words box empty while the sentence names a month and year (or a full day);
    // "exact-date": the picker empty while the sentence names a full day with its year. A month and
    // year alone does not give the day, so the picker beside it is not counted here.
    ["event-candidate", "[data-testid=event-candidate]", (el) => {
      const fp = el.getAttribute("data-fingerprint") || "";
      const sentence = words(el.querySelector("[data-testid=event-candidate-sentence]"));
      const fullDay = /\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}\\b|\\b\\d{1,2} (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.? \\d{4}\\b/.test(sentence);
      const monthYear = fullDay || /\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?,? \\d{4}\\b/.test(sentence);
      const box = [...el.querySelectorAll("label")].find((label) => words(label.querySelector("span")) === "When, in your words");
      const text = box ? box.querySelector("input") : null;
      const date = el.querySelector("input[type=date]");
      const out = [];
      if (text && steadyEmpty("ev-when:" + fp, monthYear && !text.value.trim())) out.push("when");
      if (date && steadyEmpty("ev-date:" + fp, fullDay && !date.value)) out.push("exact-date");
      return out;
    }],
    // Never ask twice (28 Oct): the places that ask in words. The id is the question's own words.
    ["home-reading", "[data-testid=case-understanding-questions] li", (el) => [words(el.querySelector("label > span"))]],
    // The home page's city box: the municipality fact, asked while it stays empty (found by the blind-spot check, 24 Nov 2026:
    // no surface logged it).
    ["home-location", "input[aria-label='City or municipality']", (el) => steadyEmpty("home-city", !el.value.trim()) ? ["municipality"] : []],
    ["law", "[data-testid=sourced-question-current]", (el) => [words(el.querySelector("label"))]],
    ["confirm-next", () => headed("section > h2", "What to confirm next"), (el) => [words(el.querySelector("p.font-semibold"))]],
    ["forms", formsQuestions, (el) => [words(el.childNodes[0]) || words(el)]],
    ["forms-offer", formsOffers, (el) => [words(el.querySelector("p.font-semibold"))]],
    ["service-method", "select[data-testid^=stage-answer-service-method-]", (el) => ["serviceMethod:" + el.getAttribute("data-testid").slice("stage-answer-service-method-".length)]],
    // A box shown with the story's offer for it in its own place is one prompt, the offer (sc-form-offer below): its box is
    // not a second question beside it (one asker, 23 Nov 2026).
    // Only the same fact in the same place: the box's own wrapper (data-asked-field = this box) holds the offer for this
    // same box (data-field = this box). Anywhere else, the box is its own question (site owner, 24 Nov 2026, rule 2c).
    // The same for a box shown with its own "Not sure yet (not asked again)" note (boxView, "not sure" and removed): the box
    // stays so the person can type, and the note in its own wrapper, for this same box, says it is not asked (carry run of
    // 24 Nov: the amount "not sure" on the review, then its box on the form counted as asked again).
    ["form-field", "input[data-testid^=sc-intake-], textarea[data-testid^=sc-intake-], select[data-testid^=sc-intake-]", (el) => { const key = el.getAttribute("data-testid").slice("sc-intake-".length); const mine = el.closest("[data-asked-field]"); if (mine && mine.getAttribute("data-asked-field") === key && mine.querySelector('[data-testid=not-answered-yet][data-field="' + key + '"]')) return []; const own = el.closest('[data-offered="true"]'); if (own && own.getAttribute("data-asked-field") === key && own.querySelector('[data-testid=sc-form-box-offer][data-field="' + key + '"]')) return []; return steadyEmpty("sc:" + key, el.type !== "file" && el.value === "") ? ["sc:" + key] : []; }],
    ["sc-form-offer", "[data-testid=sc-form-box-offer]", (el) => [el.getAttribute("data-field")]],
    ["form-field", formLabels, (el) => { const label = words(el.querySelector(":scope > span.font-semibold")); return steadyEmpty("label:" + label, el.querySelector(":scope > textarea:not([data-testid])").value === "") ? ["label:" + label] : []; }],
  ];
  const chatPressed = new Set();
  let chatKey = null, triageKey = null, scQuestion = null, scUsers = 0, situationKey = null, lawKey = null, lawValue = "";
  // Skips and "not yet" give nothing: their question is not answered.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-testid]") : null;
    const id = target ? target.getAttribute("data-testid") : "";
    if (id === "guided-form-skip" && chatKey) skipped.add("chat|" + chatKey);
    // An answer control of the chat's question, pressed: that question is answered (chatQuestionAnswered).
    if (chatKey && (id === "guided-form-next" || id === "guided-form-from-story-yes" || id === "guided-form-from-story-unsure" || id.startsWith("guided-option-"))) chatPressed.add(chatKey);
    if (id === "triage-answer-not-yet" && triageKey) skipped.add("triage|" + triageKey);
    // The proposal card: read the ticks at the click itself. The scan runs every 200 ms, and an
    // untick followed at once by "continue" could otherwise leave the card's last-scanned ticks,
    // recording an unticked row as confirmed (m04-tenant, CI 29 Oct: a false "asked twice").
    const card = event.target instanceof Element ? event.target.closest("[data-testid=story-proposals]") : null;
    if (card) window.__askOnceRows = [...card.querySelectorAll("[data-testid=story-proposal-row]")].filter((row) => Boolean(row.querySelector("[data-testid=story-proposal-yes][aria-pressed=true], [data-testid=story-proposal-unsure][aria-pressed=true]"))).map((row) => row.getAttribute("data-question-id"));
    // The story given (founder's Chrome re-test of #536, 1 Nov): sent from the home page's story box, or from
    // the Small Claims chat's (its "Send" with the story box holding words, or "Send my story" under the saved story).
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    const homeStory = document.querySelector("textarea[aria-describedby=home-story-guidance]");
    if (button && homeStory && homeStory.value.trim() && /^Continue to .* intake$/.test(words(button))) answer("home-story", "story");
    const chatStory = document.querySelector("textarea[aria-describedby=guided-story-guidance]");
    if (button && ((chatStory && chatStory.value.trim() && words(button) === "Send") || id === "guided-send-saved-story")) answer("sc-story", "story");
  }, true);
  // A service method chosen is its answer.
  document.addEventListener("change", (event) => {
    const el = event.target instanceof Element ? event.target : null;
    const id = el ? el.getAttribute("data-testid") || "" : "";
    if (id.startsWith("stage-answer-service-method-") && el.value) answer("service-method", "serviceMethod:" + id.slice("stage-answer-service-method-".length));
  }, true);
  const visible = (el) => !el.checkVisibility || el.checkVisibility();
  const chatSeen = new Map();
  const chatAnswered = new Set();
  // The Small Claims chat's story box, asked each time it comes on screen (a reload draws it anew).
  let storyBoxShown = false;
  const scan = () => {
    const storyBox = document.querySelector("textarea[aria-describedby=guided-story-guidance]");
    const storyShown = Boolean(storyBox && visible(storyBox));
    if (storyShown && !storyBoxShown) emit("ask", "sc-story", "story", words(document.getElementById("guided-story-guidance")) || "the chat's story box");
    storyBoxShown = storyShown;
    // Everything a surface below saw on screen, logged as a question or seen and not asked (a filled box; a box that is its
    // own offer's): the blind-spot check after the loop counts every other box a person can type in.
    const covered = storyBox && storyShown ? [storyBox] : [];
    for (const [surface, selector, ids] of surfaces) {
      const found = typeof selector === "function" ? selector() : document.querySelectorAll(selector);
      for (const el of found) {
        if (!visible(el)) continue;
        covered.push(el);
        for (const id of ids(el)) {
          if (!id) continue;
          const key = surface + "|" + id + "|" + screen();
          if (seen.has(key)) continue;
          seen.add(key);
          emit("ask", surface, id, el.innerText, surface === "sc-chat" ? replyAfter(el) : undefined);
        }
      }
    }
    // THE BLIND-SPOT CHECK (site owner, 24 Nov 2026, Round 3 Step A): every box on screen a person can type in or choose in
    // is either seen by a surface above or on the exempt list (BLIND_EXEMPT: not a question, with why). Any other is
    // recorded "blind", once per box per screen, and fails the journey (blindBoxes).
    for (const box of document.querySelectorAll("main textarea, main select, main input")) {
      const type = (box.getAttribute("type") || "text").toLowerCase();
      if (type === "hidden" || type === "checkbox" || type === "radio" || type === "file" || type === "submit" || type === "button") continue;
      if (!visible(box) || covered.some((el) => el === box || el.contains(box))) continue;
      if (${JSON.stringify(BLIND_EXEMPT_SELECTORS)}.some((selector) => box.matches(selector))) continue;
      const label = box.closest("label");
      const name = box.getAttribute("data-testid") || box.getAttribute("aria-label") || (label ? words(label) : "") || box.getAttribute("placeholder") || box.getAttribute("name") || "an unnamed box";
      const key = "blind|" + name + "|" + screen();
      if (seen.has(key)) continue;
      seen.add(key);
      emit("blind", "blind", name, name);
    }
    // The follow-up chat: each assistant reply, whole, as it grows; the test process splits it into its question sentences.
    const bubbles = [...document.querySelectorAll("[data-testid=case-partner-transcript] > div.mr-auto")].filter(visible);
    bubbles.forEach((bubble, index) => {
      const text = (bubble.querySelector(".whitespace-pre-wrap") || bubble).innerText || "";
      if (!text.trim() || chatSeen.get(index) === text) return;
      chatSeen.set(index, text);
      window.__recordAsk({ kind: "ask", surface: "chat-reply-raw", id: String(index), screen: screen(), text: text.slice(0, 6000), at: now() });
    });
    // The follow-up chat: a person's reply answers the questions of the assistant's reply before it (as a
    // reply answers a Small Claims guided question). Each reply of theirs once, by its place in the chat.
    const transcript = document.querySelector("[data-testid=case-partner-transcript]");
    if (transcript && visible(transcript)) {
      let assistant = -1, user = -1;
      for (const child of transcript.children) {
        if (child.matches("div.mr-auto")) assistant += 1;
        else if (child.matches("div.ml-auto")) {
          user += 1;
          if (assistant >= 0 && !chatAnswered.has(user)) { chatAnswered.add(user); window.__recordAsk({ kind: "answer", surface: "chat-reply-raw", id: String(assistant), screen: screen(), text: "", at: now() }); }
        }
      }
    }
    // Situation questions: each one answered as it moves on (they cannot be skipped).
    const sq = document.querySelector("[data-testid=situation-questions]");
    const nextSituation = sq && visible(sq) ? sq.getAttribute("data-question") : null;
    if (situationKey && situationKey !== nextSituation) answer("situation", situationKey);
    situationKey = nextSituation;
    // Chat (civil, Family): a question that left the screen, answered only as chatQuestionAnswered says.
    const cq = document.querySelector("[data-testid=guided-form-question]");
    const nextChat = cq && visible(cq) ? cq.getAttribute("data-key") : null;
    const chatShown = document.querySelector("[data-testid=guided-form-chat]");
    if (chatKey && chatKey !== nextChat && chatQuestionAnswered({ pressedAnswer: chatPressed.has(chatKey), skipped: skipped.has("chat|" + chatKey), chatStillShown: Boolean(chatShown && visible(chatShown)) })) answer("chat", chatKey);
    chatKey = nextChat;
    // Review: a question shown answered.
    for (const el of document.querySelectorAll("[data-testid=intake-initial-question][data-answered=true]")) answer("review", el.getAttribute("data-question"));
    // Small Claims guided: a question followed by the person's reply.
    const questions = [...document.querySelectorAll("[data-testid=guided-message][data-question-id]")];
    const users = document.querySelectorAll("[data-testid=guided-message][data-from=user]").length;
    const lastQuestion = questions.length ? questions[questions.length - 1].getAttribute("data-question-id") : null;
    if (scQuestion && users > scUsers) { const replies = document.querySelectorAll("[data-testid=guided-message][data-from=user]"); answer("sc-chat", scQuestion, words(replies[replies.length - 1])); }
    if (lastQuestion !== scQuestion) scUsers = users;
    scQuestion = lastQuestion;
    // Proposals: the rows confirmed when the card goes.
    window.__askOnceRows = window.__askOnceRows || [];
    const rows = [...document.querySelectorAll("[data-testid=story-proposal-row]")].filter(visible);
    if (rows.length) window.__askOnceRows = rows.filter((row) => Boolean(row.querySelector("[data-testid=story-proposal-yes][aria-pressed=true], [data-testid=story-proposal-unsure][aria-pressed=true]"))).map((row) => row.getAttribute("data-question-id"));
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
const WORDED = new Set(["chat-reply", "home-reading", "law", "confirm-next", "forms", "forms-offer"]);

/** The facts a recorded question asks for, on any surface. A question whose words name no fact asks for a fact of its own. */
/** The fact a Parties offer offers: a name or a city, the person's own or the other side's. Anything else: its own id. */
export function partyOfferFacts(id: string): string[] {
  const match = /^party-offer:([^:]*):(.*)$/.exec(id);
  if (!match) return [id];
  const [, party, what] = match;
  const own = party === "you" || party === "yours";
  // As the Parties boxes (partyBoxFacts): the city is the municipality, the province its own detail, the last name its own fact.
  if (/^\s*city or town\b/i.test(what)) return [own ? "municipality" : "otherPartyMunicipality"];
  if (/^\s*province\b/i.test(what)) return [`party:${own ? "you" : party}:province`];
  if (/^\s*last name\b/i.test(what)) return [own ? "yourLastName" : "otherPartyLastName"];
  if (/^\s*(?:name|first name|company's full legal name|another (?:defendant|plaintiff|respondent|applicant))\b/i.test(what)) return [own ? "yourName" : "otherParty"];
  return [id];
}

/**
 * The fact a Parties box asks for, by whose entry it is in: a name is the person's own name or the other side's, a city or
 * province their municipality; any other detail (street, postal code, phone, email, person or company) is that party's
 * detail in the parties record ("party:you:kind"), one fact per party. "party:<you|yours|other>:<party id>:<detail>".
 */
export function partyBoxFacts(id: string): string[] {
  const match = /^party:([^:]*):([^:]*):(.*)$/.exec(id);
  if (!match) return [id];
  const [, who, partyId, detail] = match;
  const own = who === "you";
  // The last name is a fact of its own (site owner, 23 Nov 2026): a one-word name gives the first name only.
  if (detail === "lastName") return [own ? "yourLastName" : who === "other" ? "otherPartyLastName" : `party:${partyId}:lastName`];
  if (/^(?:firstName|fullName|companyName|secondName)$/.test(detail)) return [own ? "yourName" : who === "other" ? "otherParty" : `party:${partyId}:name`];
  // The city is the municipality; the province is a detail of its own (a story that names a city names no province).
  if (detail === "city") return [own ? "municipality" : who === "other" ? "otherPartyMunicipality" : `party:${partyId}:city`];
  return [`party:${own ? "you" : partyId}:${detail}`];
}

/**
 * A Form 7A element's case-file fact, else the element as its own fact. The same rule as caseFile/missingFacts.ts
 * elementFact, kept here so this recorder also runs on code before the one asker (the "before" question logs, #561);
 * test:one-asker checks the two agree on every element.
 */
export function recorderElementFact(element: { id: string; name: string }): string | null {
  const words = `${element.id} ${element.name}`;
  if (/jurisdiction/i.test(words)) return null;
  if (/\bagree(?:d|ment)?\b|-agreement-|\bcontract\b|\bunderstanding\b|\barrangement\b/i.test(words) && !/\b(?:breach|broke|not of|quality)\b/i.test(words)) return "agreementTerms";
  if (/\bamount\b|\bhow much\b|\bcost of (?:repair|loss)\b/i.test(words)) return "amount";
  return null;
}
const FORM7A_ELEMENT_FACTS = (id: string): string => {
  // By its id, or (the page before the one asker) by its name: "name:<element name>".
  const byName = id.startsWith("name:") ? id.slice(5) : null;
  const element = CLAIM_TYPES.flatMap((type) => type.plaintiffElements).find((item) => (byName ? item.name === byName : item.id === id));
  return (element && recorderElementFact(element)) ?? `element:${element?.id ?? id}`;
};

/**
 * FAIL CLOSED (site owner, 23 Nov 2026, rule 6): whether a recorded question names a fact the case record keeps, a party's
 * detail in the parties record, or a claim element. A question that names none ("a fact of its own") fails the journey.
 */
export function namesAFact(fact: string): boolean {
  return (FACT_IDS as readonly string[]).includes(fact) || /^party:/.test(fact) || /^element:/.test(fact) || /^(?:case|sc)-date-/.test(fact);
}

export function factsOfAsk(item: Pick<Asked, "surface" | "id" | "text">): string[] {
  // A date box beside the person's own sentence that already gives that date (SCAN's event-candidate).
  if (item.surface === "event-candidate") return ["dateInOwnSentence"];
  if (WORDED.has(item.surface)) { const facts = factsOfWords(item.id); return facts.length ? facts : [`${item.surface}:${item.id}`]; }
  if (item.surface === "service-method") return ["serviceMethod"];
  // The story: the Small Claims chat's story box asks for it; the home page's or the chat's story sent gives it.
  if (item.surface === "sc-story") return ["story"];
  // The home page's Continue sends the story and the city together: both are given there (C9).
  if (item.surface === "home-story") return ["story", "municipality"];
  // A Parties offer: its fact by whose entry it is in and what it offers (C9: the name and the city offered again were
  // counted as nothing). "party-offer:<you|other|...>:<label>: <value>".
  if (item.surface === "parties-offer") return partyOfferFacts(item.id);
  if (item.surface === "parties") return partyBoxFacts(item.id);
  // An offer in the form's "Found in your description": the fact of its box, as the box itself asks it.
  if (item.surface === "sc-form-offer") return factsOfAsk({ surface: "form-field", id: `sc:${item.id}`, text: item.text });
  // A Form 7A checklist item: the case-file fact it is about, when it has one (the amount, what was agreed), else its element.
  if (item.surface === "form7a-still-to-add" || item.surface === "form7a-found") return [FORM7A_ELEMENT_FACTS(item.id)];
  if (item.surface === "form-field") {
    const own = FORM_FIELD_FACTS[item.id];
    if (own) return [...own];
    const [where, key] = [item.id.slice(0, item.id.indexOf(":")), item.id.slice(item.id.indexOf(":") + 1)];
    // A box whose key is itself a fact the record keeps ("otherParty", "missingEvidence") asks for that fact.
    if (where === "sc") { const facts = factsOfQuestion(key); return facts.length === 1 && facts[0] === key && !namesAFact(key) ? [item.id] : facts; }
    const facts = factsOfWords(key);
    return facts.length ? facts : [item.id];
  }
  // A Small Claims depth question carries its own depth id: its fact is read from its words.
  if (item.surface === "sc-chat" && item.id.startsWith("depth-")) { const facts = factsOfWords(item.text); return facts.length ? facts : [item.id]; }
  // A question that asks about safety in its words asks that too (Family's "Is anything urgent, like ..., a safety
  // worry, ...?": Chrome check of #550, 5c), whatever its own field asks for.
  const own = factsOfQuestion(item.id, item.surface);
  return /\bsafety (?:concerns?|worry|worries)\b/i.test(item.text ?? "") && !own.includes("safety") ? [...own, "safety"] : own;
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
/** Diagnostic only: the step, and the page's own case file state for the ask's facts, from its tab copy (then dropped). */
export function withPageHeld(item: Asked, step?: string): Asked {
  const { tab, ...rest } = item;
  const out: Asked = step ? { ...rest, step } : rest;
  if (item.kind !== "ask" || !tab) return out;
  try {
    const checkpoint = (JSON.parse(tab) as { checkpoint?: { courtPath?: string } }).checkpoint;
    const court = checkpoint?.courtPath;
    if (court !== "small-claims" && court !== "civil" && court !== "family") return out;
    const file = caseFileOf(readCheckpoint(checkpoint, court), undefined);
    const pageHeld: Record<string, string> = {};
    for (const fact of factsOfAsk(item)) if ((SLOT_FACTS as readonly string[]).includes(fact)) pageHeld[fact] = file[fact as (typeof SLOT_FACTS)[number]].state;
    // The facts kept outside the slots, through the case file's own readers (one asker, 23 Nov 2026: the question logs say,
    // for every question, whether the record held its fact at that moment): the person's name, their city, the other side's.
    const outside: Record<string, () => boolean> = { yourName: () => Boolean(heldYourName(file)), municipality: () => Boolean(heldLocation(file)?.city), otherPartyMunicipality: () => Boolean(heldOtherPartyCity(file)) };
    for (const fact of factsOfAsk(item)) if (outside[fact]) pageHeld[fact] = outside[fact]() ? "answered" : "not-asked";
    // Each side's last name, from the parties record: given (answered) or "I'm not sure" (unsure), the same states as any fact.
    const list = (file.parties?.list ?? []) as { you?: boolean; side?: string; details?: Record<string, string>; unsure?: string[] }[];
    const lastOf = (party: (typeof list)[number] | undefined) => (party?.details?.lastName?.trim() ? "answered" : party?.unsure?.includes("lastName") ? "unsure" : "not-asked");
    for (const fact of factsOfAsk(item)) {
      if (fact === "yourLastName") pageHeld[fact] = lastOf(list.find((party) => party.you));
      if (fact === "otherPartyLastName") pageHeld[fact] = lastOf(list.find((party) => party.side === "other"));
    }
    return Object.keys(pageHeld).length ? { ...out, pageHeld } : out;
  } catch { return out; }
}

/** Diagnostic only: an ask's case id, step and page state, in one line for the records. */
export function diagnosticOf(ask: Pick<Asked, "address" | "step" | "pageHeld">): string | undefined {
  if (!ask.address && !ask.step && !ask.pageHeld) return undefined;
  const address = ask.address ? new URL(ask.address, "http://x") : null;
  const id = address ? address.searchParams.get("intake") ?? address.searchParams.get("caseId") ?? /\/cases\/([^/?]+)/.exec(address.pathname)?.[1] ?? "" : "";
  const page = ask.pageHeld ? Object.entries(ask.pageHeld).map(([fact, state]) => `${fact}:${state}`).join(",") : "";
  return [`case=${id.slice(0, 8) || "none"}`, `step=${ask.step ?? "?"}`, `page=${page || "-"}`].join(" ");
}

export function withHeldFacts(item: Asked, read: ((fact: string) => HeldState | null) | null): Asked {
  if (!read || item.kind !== "ask") return item;
  const held: Record<string, HeldState> = {};
  for (const fact of factsOfAsk(item)) { const state = read(fact); if (state) held[fact] = state; }
  return Object.keys(held).length ? { ...item, held } : item;
}

/**
 * The follow-up chat's raw records, read into questions and answers (site owner, 29 Oct). A reply,
 * whole, becomes one question per question sentence, once per reply (its place in the chat): a reply
 * re-drawn as it grows, or the saved chat shown again on another screen, is not asked again; the same
 * words in a LATER reply are a new question. A person's reply answers the question sentences of the
 * assistant's reply before it, once (as for the Small Claims guided chat: a question followed by the
 * person's reply is answered). Any other record passes through.
 */
export function chatReplyReader(): (item: Asked) => Asked[] {
  const chatSentences = new Set<string>();
  const inReply = new Map<string, Asked[]>();
  const answeredReplies = new Set<string>();
  return (item) => {
    if (item.surface !== "chat-reply-raw") return [item];
    const reply = item.id;
    if (item.kind === "answer") {
      if (answeredReplies.has(reply)) return [];
      answeredReplies.add(reply);
      const asked = inReply.get(reply) ?? [];
      return asked.map((ask, order) => ({ kind: "answer", surface: "chat-reply", id: ask.id, screen: ask.screen, text: "", at: item.at + order / 1000, occurrence: item.id }));
    }
    const out: Asked[] = [];
    let order = 0;
    for (const sentence of questionSentences(item.text)) {
      const key = `${sentence}|${reply}`;
      if (chatSentences.has(key)) continue;
      chatSentences.add(key);
      const ask: Asked = { ...item, surface: "chat-reply", id: sentence, text: sentence.slice(0, 160), at: item.at + order++ / 1000, occurrence: item.id };
      inReply.set(reply, [...(inReply.get(reply) ?? []), ask]);
      out.push(ask);
    }
    return out;
  };
}

/**
 * Starts recording on this page (every later navigation too). Returns the list it fills.
 * `held`, when given, is asked at the moment each question is recorded which of its facts the
 * saved case holds (heldInRows); the answer is kept on the question for heldViolations.
 */
/** The script the recorder installs in the page, for the suites that check it parses and keeps its rules. */
export const ASK_ONCE_SCAN = (): string => SCAN;

export async function recordAsks(page: Page, options: { held?: () => ((fact: string) => HeldState | null) | null; step?: () => string } = {}): Promise<Asked[]> {
  const asked: Asked[] = [];
  const readChat = chatReplyReader();
  const withHeld = (item: Asked): Asked => withPageHeld(withHeldFacts(item, item.kind === "ask" && options.held ? options.held() : null), options.step?.());
  await page.exposeFunction("__recordAsk", (item: Asked) => {
    for (const read of readChat(item)) asked.push(withHeld(read));
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

export type Repeat = { fact: string; given: Asked; asks: Asked[] };

/**
 * Each fact asked again after the person gave it: the first answer that gave the fact,
 * then every later question for that fact by another question or on another screen.
 * The situation answers give every fact they settle, first.
 */
export function factsAskedTwice(events: readonly Asked[], situation: SituationAnswers | false): Repeat[] {
  const asks = events.filter((item) => item.kind === "ask" && !restoredAsk(item, events));
  const given = new Map<string, Asked>();
  const situationGiven: Asked = { kind: "answer", surface: "situation", id: "answers", screen: "/", text: "the situation questions", at: 0 };
  for (const fact of factsFromSituation(situation)) given.set(fact, situationGiven);
  for (const fact of unsureFromSituation(situation)) given.set(fact, { ...situationGiven, text: "unsure" });
  // The story gives the dates its own sentences hold: an event candidate is recorded as asking only
  // when the sentence it quotes names the date its box leaves empty (SCAN's event-candidate surface).
  given.set("dateInOwnSentence", { kind: "answer", surface: "story", id: "story", screen: "/", text: "the person's own sentence", at: 0 });
  const firstAsk = (surface: string, id: string) => asks.find((item) => item.surface === surface && item.id === id);
  // Answers, in order, give their question's facts.
  for (const item of events.filter((event) => event.kind === "answer").sort((a, b) => a.at - b.at)) {
    const ask = firstAsk(item.surface, item.id);
    for (const fact of factsOfAsk(ask ?? item)) if (!given.has(fact)) given.set(fact, { ...item, text: item.text === "unsure" ? "unsure" : ask?.text ?? "", screen: ask?.screen ?? item.screen });
  }
  const repeats = new Map<string, Repeat>();
  for (const ask of asks) {
    if (ask.surface === "situation") continue;
    for (const fact of factsOfAsk(ask)) {
      const gave = given.get(fact);
      if (!gave || ask.at <= gave.at) continue;
      // The same question on the same screen is not asked again -- except a Small Claims guided question,
      // which restoredAsk() alone excuses (shown again with the same reply); with none or another, it counts.
      // And a follow-up chat question only within the same reply (occurrence): the same words in a later reply count.
      if (ask.surface !== "sc-chat" && gave.surface === ask.surface && gave.id === ask.id && gave.screen === ask.screen && gave.occurrence === ask.occurrence) continue;
      const repeat = repeats.get(fact) ?? { fact, given: gave, asks: [] };
      repeat.asks.push(ask);
      repeats.set(fact, repeat);
    }
  }
  return [...repeats.values()];
}

/**
 * THE SAVED CONVERSATION SHOWN AGAIN (site owner, 29 Oct). After a reload ("Update your story") the
 * Small Claims guided chat shows its earlier questions with their replies. Such a question is not
 * asked again ONLY when the reply shown under it is the very reply already recorded for that question
 * in this case. Shown with no reply, or with another reply, it is a new ask and counts like any other.
 */
export function restoredAsk(item: Asked, events: readonly Asked[]): boolean {
  if (item.kind !== "ask" || item.surface !== "sc-chat" || !item.reply) return false;
  return events.some((event) => event.kind === "answer" && event.surface === "sc-chat" && event.id === item.id && event.at < item.at && event.reply === item.reply);
}

/**
 * THE HELD CHECK. Every question asked while the saved case held its fact as the person's own:
 * held, answered OR unsure, it fails, on any screen (site owner, 31 Oct: there is no second offer of an
 * unsure fact, at the end or anywhere). The situation questions are the start, not a repeat.
 */
export function heldViolations(events: readonly Asked[]): Violation[] {
  const violations: Violation[] = [];
  for (const ask of [...events].filter((item) => item.kind === "ask" && !restoredAsk(item, events)).sort((a, b) => a.at - b.at)) {
    if (ask.surface === "situation" || !ask.held) continue;
    for (const [fact, state] of Object.entries(ask.held)) {
      violations.push({ rule: "held", fact, surface: ask.surface, id: ask.id, screen: ask.screen, text: ask.text, detail: `held ${state}`, diag: diagnosticOf(ask) });
    }
  }
  return violations;
}

/** The repeats of factsAskedTwice, one violation per question asked again. */
/**
 * THE ASK-ONCE PAGE TEST'S OFFER RULE (site owner, 17 Nov 2026): a fact is offered ONCE, on the first page that needs it,
 * then recorded so it is never offered or asked again. A violation on an offer surface is excused when no offer of the
 * same fact came before it; a SECOND offer is asked again, and a cold question is never excused. Used by
 * tests/browser/ask-once-pages.spec.ts only; every other test keeps the stricter rule above (any re-ask counts).
 */
export function firstOfferExcused(violation: Violation, events: readonly Asked[], offerSurfaces: ReadonlySet<string>): boolean {
  if (!offerSurfaces.has(violation.surface)) return false;
  const ask = events.find((item) => item.kind === "ask" && item.surface === violation.surface && item.id === violation.id && item.screen === violation.screen);
  if (!ask) return false;
  return !events.some((item) => item !== ask && item.kind === "ask" && item.at < ask.at && offerSurfaces.has(item.surface) && factsOfAsk(item).includes(violation.fact));
}

export function repeatViolations(repeats: readonly Repeat[]): Violation[] {
  return repeats.flatMap((repeat) => repeat.asks.map((ask) => ({ rule: "twice" as const, fact: repeat.fact, surface: ask.surface, id: ask.id, screen: ask.screen, text: ask.text, detail: `given at ${repeat.given.surface}:${repeat.given.id}@${repeat.given.screen} "${repeat.given.text.slice(0, 80)}"`, diag: diagnosticOf(ask) })));
}
