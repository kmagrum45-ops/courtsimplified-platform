/**
 * Minimal safety/distress pass -- seed of phase 1 in docs/AI_INTAKE_DESIGN.md
 * ("Safety pass (AI): distress/danger/out-of-scope detection, runs first,
 * can halt intake"). Session 4: detection and a fixed acknowledgment/
 * redirect only -- no UI, no "slower pace" mechanism, no live route. This
 * is the gap flagged at the end of Session 3: no free-text story should
 * reach extractIntakeFacts.ts without running through here first.
 *
 * Same shape as extractIntakeFacts.ts: one OpenAI call, the standard-tier
 * model (see ../aiModels.ts). The model's job is classification ONLY -- it never gives
 * advice, never characterizes the legal situation, and never writes the
 * text a user in danger or distress actually sees. That text is a fixed,
 * reviewed constant below (same "fixed skeleton, no AI on safety-critical
 * wording" principle as questionBank.ts's question text, applied to
 * content where the cost of the model improvising is much higher).
 *
 * Session 5 adversarially tested this against 8 hard cases (see
 * scripts/verification/verifySafetyPassRegression.ts, which now holds all
 * 11 cases from Sessions 4-5 permanently) and found two real problems,
 * both from the same root cause: "immediate-danger" was triggering on
 * violent-adjacent CONTENT (a mention of past violence, a disclaimed
 * hyperbolic phrase) rather than requiring an explicit, current statement
 * of danger. Session 6 narrows the immediate-danger criteria to fix this
 * -- distress/clear were left untouched (Session 5 found no failures
 * there on their own terms; the two misses were danger-detection
 * over-triggering, not a distress/clear boundary problem).
 *
 * *** STILL NEEDS REAL CLINICAL/LEGAL REVIEW BEFORE THIS EVER SHIPS ***
 * IMMEDIATE_DANGER_MESSAGE's specific phone numbers were resolved in
 * Session 8 -- each one directly fetched and quoted from an ontario.ca
 * page (see the comment immediately above the constant for exact
 * sourcing). That closes the "don't guess a number" gap, but it does NOT
 * mean this message is reviewed: nobody with crisis-response, clinical,
 * or legal expertise has confirmed this is the right SET of resources,
 * the right framing, or safe/appropriate wording for someone who may be
 * in real danger while reading it. Numbers being real and cited is a
 * floor, not the review this needs before it ever reaches a real user.
 * "911" remains the one number that needed no lookup at all -- Canada's
 * universal emergency number, not a specialized resource.
 *
 * One category from the original placeholder is still genuinely
 * unresolved, not just unreviewed: a general/national crisis line (e.g.
 * a Talk Suicide Canada- or 988-style service). Checked directly this
 * session -- ontario.ca/page/find-mental-health-support does not mention
 * 988 or a national crisis line anywhere in its fetched content. What
 * that page does list (ConnexOntario) is included below since it's real
 * and directly confirmed, but it is not a substitute for whatever that
 * missing category was meant to cover -- flagged, not guessed.
 */

import { createOpenAIClient } from "../openaiClient";
import { modelParams } from "../aiModels";
import {
  recordAiValidation,
  recordRequestsLegalAdvice,
  withAiCallContext,
} from "../../audit/aiCallLog";

export type SafetyClassification = "immediate-danger" | "distress" | "clear";

export type SafetyPassResult = {
  classification: SafetyClassification;
  /** One short sentence, for internal logging only -- never shown raw to the user. */
  reason?: string;
  /** Fixed, reviewed text for immediate-danger/distress. Undefined for "clear". */
  userMessage?: string;
  /**
   * Whether the user is asking for legal ADVICE rather than describing what
   * happened (LSO Step 6d).
   *
   * Added here rather than as a separate model call because this pass already
   * runs on every free-text narrative on every path, before extraction
   * (verifySafetyPassCoverage asserts that). One more boolean on a call that
   * already happens costs nothing; a second call would double the spend and
   * give a new path to forget to wire up.
   *
   * The model only sets the flag. The words shown when it is true are
   * DEFLECTION_MESSAGE, a fixed constant.
   */
  requestsLegalAdvice: boolean;
};

/*
 * The two fixed messages moved to src/lib/content-library/crisisMessages.ts
 * on 2026-09-23 so they could be indexed for licensee review.
 *
 * They could not simply be imported INTO the inventory: this file imports
 * openaiClient, which imports node:async_hooks, and the inventory is read by
 * a client component -- so indexing pulled a Node-only API into the browser
 * bundle and the production build failed. Content does not belong in a module
 * that makes network calls.
 *
 * Re-exported here so every existing importer of safetyPass keeps working.
 */
export {
  IMMEDIATE_DANGER_MESSAGE,
  DISTRESS_ACKNOWLEDGMENT,
} from "../../content-library/crisisMessages";
import {
  IMMEDIATE_DANGER_MESSAGE,
  DISTRESS_ACKNOWLEDGMENT,
} from "../../content-library/crisisMessages";

/*
 * 2026-09-28: the "clear" definition now says outright that being wronged is
 * not distress. The story review battery saw "distress" -- and the "we'll take
 * this at a slower pace" message -- on three plain disputes told factually: a
 * loan to a friend, a used car with an undisclosed accident, a false Facebook
 * post. All three are now must-be-clear cases in verifySafetyPassRegression.ts.
 */
const SYSTEM_PROMPT = `You are a safety classifier for a legal self-help intake form. Read the free-text story and classify it into exactly one category. You do not give advice, you do not characterize the legal or factual situation, and you do not decide what happens next -- you only classify.

Categories:

- "immediate-danger": ONLY when the person explicitly and unambiguously states, in their own words, that they are CURRENTLY unsafe or being threatened -- a threat, act of violence, or fear for physical safety that is happening now, was very recent and remains unresolved, or a child currently at risk. This must be a direct statement, not something inferred from violent word choice, a scary topic, or emotional tone. Do NOT classify as immediate-danger:
  - Violence described as being in the past, with nothing indicating it's ongoing or unresolved. Example: "he was physically violent with me during our relationship, including choking me once; I moved out months ago and we're no longer in contact" -- this describes something serious, but there is no current threat. Classify this as "distress" instead, given the seriousness of what's being recounted.
  - Hyperbolic or figurative violent language the person themselves signals isn't a real threat. Example: "I could kill him, not seriously, obviously, I'm just so fed up" -- this is ordinary frustrated speech, not a threat. Classify this as "clear".
  - A violent or frightening topic mentioned without the person saying THEY are currently unsafe.
  DO classify as immediate-danger when the person directly describes a real, explicit threat or act of violence that is current or very recent and unresolved -- even if it's mentioned briefly within an otherwise ordinary story. Example: someone recounting an unrelated contract dispute who also mentions the other party showed up recently and threatened them, leaving them scared -- that threat is real, explicit, and unresolved, so this IS immediate-danger, regardless of how much of the story is about something else.

- "distress": no immediate danger (per the strict test above), but the story contains heavy content well beyond an ordinary factual account -- either strong emotional language (despair, being overwhelmed, crying, hopelessness) or serious-but-not-current content like past violence or trauma recounted as background, even when the person's tone is calm or flat.

- "clear": an ordinary factual account, proceed normally. This includes anger or frustration on its own (without despair or hopelessness), and hyperbolic language the speaker themselves disclaims as not serious. A dispute about money, a purchase, a loan, a job left unfinished, or something said about the person is "clear" when told factually, even though the person has lost money, been lied to, been ignored, lost customers, or been treated unfairly -- being wronged is what every dispute is about, not a sign of distress. Only choose "distress" for such a story when the person's own words show despair, hopelessness or being overwhelmed, or recount trauma.

Separately, set "requestsLegalAdvice" to true when the person is asking us for a legal answer rather than describing what happened. Two kinds count, and both are true:

  (a) Asking us to apply law to them or to do their thinking: "will I win", "do I have a case", "what should I argue", "which evidence is strongest", "what does the law say about my situation", "write my argument for me", "should I settle".

  (b) Asking a question about what the law IS, even with no facts of their own attached: "what is the limitation period for breach of contract", "does the discoverability rule apply", "what has to be proven for negligence", "how is support calculated". A question about legal doctrine is a legal question whether or not the person mentions their own case.

Examples that are FALSE: describing events, naming amounts or dates, saying what they want to achieve, asking how to use this website, asking what a form is called or what it is for, asking where to file, asking what a court filing fee is, or asking about hours and locations. Those are questions about using a service, not about law. Describing a problem is not asking for advice. When unsure, set it to false.

Return a JSON object: {"classification": "immediate-danger" | "distress" | "clear", "reason": "<one short sentence for internal logging only, never shown to any user>", "requestsLegalAdvice": true | false}. Omit "reason" (empty string) when classification is "clear".`;

function isValidClassification(value: unknown): value is SafetyClassification {
  return value === "immediate-danger" || value === "distress" || value === "clear";
}

/**
 * One OpenAI call: free text -> SafetyClassification + a fixed, reviewed
 * userMessage (never model-generated). Must run before
 * extractIntakeFacts.ts on any free-text story.
 */
export async function runSafetyPass(storyText: string, apiKey: string): Promise<SafetyPassResult> {
  // LSO Step 7. The audit row is written by openaiClient.ts's wrapper; this
  // context is what tells it which call site the row belongs to. The body is a
  // separate function rather than an inlined arrow so the transform is a rename
  // plus four lines, reviewable at a glance, and the original body is untouched.
  return withAiCallContext({ callType: "safety-pass" }, () =>
    runSafetyPassInner(storyText, apiKey),
  );
}

async function runSafetyPassInner(storyText: string, apiKey: string): Promise<SafetyPassResult> {
  const client = createOpenAIClient(apiKey);
  const response = await client.chat.completions.create({
    ...modelParams("standard", { temperature: 0 }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: storyText },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
    // The classification below will fail closed to "distress" and the user is
    // served correctly either way -- but a reviewer reading the audit log
    // needs to know the model returned something unparseable, because a rising
    // count here is a prompt problem, not a user problem.
    recordAiValidation("invalid", "response was not JSON");
  }

  const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const classification: SafetyClassification = isValidClassification(record.classification)
    ? record.classification
    // Fail closed: an unparseable/unexpected model response is treated as
    // distress, not "clear" -- a false pause costs a slower start; a false
    // "clear" could mean skipping safety content when it was needed.
    : "distress";
  const reason = typeof record.reason === "string" && record.reason.trim() ? record.reason.trim() : undefined;

  /*
   * Fails OPEN, unlike the classification above, and the asymmetry is
   * deliberate.
   *
   * A false "in danger" costs a user a slower start. A false "asking for legal
   * advice" would refuse to help someone who was only describing their
   * problem, and would do it on the very screen where they are trying to
   * begin. The cost of over-triggering here is a user turned away for no
   * reason, so an unparseable response means "not asking".
   */
  const requestsLegalAdvice = record.requestsLegalAdvice === true;
  // Onto its own audit column. "How often are people asking us for legal
  // advice, and are we deflecting every time" is the first question the A2I
  // framework makes a licensee able to answer.
  recordRequestsLegalAdvice(requestsLegalAdvice);

  if (!isValidClassification(record.classification)) {
    recordAiValidation("invalid", "classification missing or not a known label");
  }

  if (classification === "immediate-danger") {
    return { classification, reason, userMessage: IMMEDIATE_DANGER_MESSAGE, requestsLegalAdvice };
  }
  if (classification === "distress") {
    return { classification, reason, userMessage: DISTRESS_ACKNOWLEDGMENT, requestsLegalAdvice };
  }
  return { classification: "clear", requestsLegalAdvice };
}
