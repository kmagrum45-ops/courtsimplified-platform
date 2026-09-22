/**
 * Minimal safety/distress pass -- seed of phase 1 in docs/AI_INTAKE_DESIGN.md
 * ("Safety pass (AI): distress/danger/out-of-scope detection, runs first,
 * can halt intake"). Session 4: detection and a fixed acknowledgment/
 * redirect only -- no UI, no "slower pace" mechanism, no live route. This
 * is the gap flagged at the end of Session 3: no free-text story should
 * reach extractIntakeFacts.ts without running through here first.
 *
 * Same shape as extractIntakeFacts.ts: one OpenAI call, gpt-4o-mini,
 * temperature 0. The model's job is classification ONLY -- it never gives
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

// *** Numbers below are real and directly sourced (Session 8) -- the
// MESSAGE AS A WHOLE STILL NEEDS REAL REVIEW. See file header. ***
//
// Sources, each directly fetched and quoted, not taken from a search
// summary or recalled from training data:
// - Assaulted Women's Helpline (1-866-863-0511, 416-863-0511) and
//   Fem'aide (1-877-336-2433): ontario.ca/page/connect-supports-survivors-violence,
//   quoted verbatim as "Toll-free: 1-866-863-0511" / "416-863-0511" /
//   "Toll-free: 1-877-336-2433".
// - ConnexOntario (1-866-531-2600): ontario.ca/page/find-mental-health-support,
//   quoted verbatim as "Toll-free: 1-866-531-2600".
// - Child protection: no single province-wide number exists on any page
//   checked. ontario.ca/page/report-child-abuse-and-neglect says, quoted
//   verbatim: "Report it to a children's aid society or, if someone is in
//   immediate danger, call the police" -- directing people to their LOCAL
//   society, not a central number. Stated that way below rather than
//   inventing a number that doesn't exist.
// - A general/national crisis line (988-style) remains unresolved -- see
//   file header. Not included below because it was not found, not because
//   it was overlooked.
export const IMMEDIATE_DANGER_MESSAGE =
  "If you are in immediate danger, please call 911.\n\n" +
  "CourtSimplified is a legal information platform. It is not equipped to respond to emergencies " +
  "or provide crisis support, and this intake cannot continue right now.\n\n" +
  "Other support that may help:\n" +
  "- Assaulted Women's Helpline: 1-866-863-0511 (toll-free), or 416-863-0511\n" +
  "- Fem'aide (French-language support): 1-877-336-2433 (toll-free)\n" +
  "- ConnexOntario mental health, addictions, and problem gambling helpline: 1-866-531-2600 (toll-free)\n" +
  "- To report a child who may be in need of protection: contact your local Children's Aid Society, " +
  "or call police if a child is in immediate danger. There is no single province-wide number for " +
  "this -- Ontario's own guidance directs people to their local society.";

// Fixed, short, warm -- not generated by the model. Doesn't characterize
// the legal situation or give advice; just acknowledges and signals the
// flow will continue without rushing. The "slower pace" itself isn't
// built this session -- see the file header.
export const DISTRESS_ACKNOWLEDGMENT =
  "Thank you for sharing that -- it sounds like a genuinely difficult situation. We'll take this " +
  "at a slower pace, and there's no need to rush through anything.";

const SYSTEM_PROMPT = `You are a safety classifier for a legal self-help intake form. Read the free-text story and classify it into exactly one category. You do not give advice, you do not characterize the legal or factual situation, and you do not decide what happens next -- you only classify.

Categories:

- "immediate-danger": ONLY when the person explicitly and unambiguously states, in their own words, that they are CURRENTLY unsafe or being threatened -- a threat, act of violence, or fear for physical safety that is happening now, was very recent and remains unresolved, or a child currently at risk. This must be a direct statement, not something inferred from violent word choice, a scary topic, or emotional tone. Do NOT classify as immediate-danger:
  - Violence described as being in the past, with nothing indicating it's ongoing or unresolved. Example: "he was physically violent with me during our relationship, including choking me once; I moved out months ago and we're no longer in contact" -- this describes something serious, but there is no current threat. Classify this as "distress" instead, given the seriousness of what's being recounted.
  - Hyperbolic or figurative violent language the person themselves signals isn't a real threat. Example: "I could kill him, not seriously, obviously, I'm just so fed up" -- this is ordinary frustrated speech, not a threat. Classify this as "clear".
  - A violent or frightening topic mentioned without the person saying THEY are currently unsafe.
  DO classify as immediate-danger when the person directly describes a real, explicit threat or act of violence that is current or very recent and unresolved -- even if it's mentioned briefly within an otherwise ordinary story. Example: someone recounting an unrelated contract dispute who also mentions the other party showed up recently and threatened them, leaving them scared -- that threat is real, explicit, and unresolved, so this IS immediate-danger, regardless of how much of the story is about something else.

- "distress": no immediate danger (per the strict test above), but the story contains heavy content well beyond an ordinary factual account -- either strong emotional language (despair, being overwhelmed, crying, hopelessness) or serious-but-not-current content like past violence or trauma recounted as background, even when the person's tone is calm or flat.

- "clear": an ordinary factual account, proceed normally. This includes anger or frustration on its own (without despair or hopelessness), and hyperbolic language the speaker themselves disclaims as not serious.

Separately, set "requestsLegalAdvice" to true ONLY when the person is asking us to give legal advice rather than describing what happened. Examples that are true: "will I win", "do I have a case", "what should I argue", "which evidence is strongest", "what does the law say about my situation", "write my argument for me", "should I settle". Examples that are FALSE: describing events, naming amounts or dates, saying what they want to achieve, asking how to use this website, asking what a form is called, or asking where to file. Describing a problem is not asking for advice. When unsure, set it to false.

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
    model: "gpt-4o-mini",
    temperature: 0,
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
