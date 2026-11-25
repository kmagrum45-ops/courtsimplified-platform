import { sentences } from "../sentences";
/**
 * Words that suggest the person may be in danger from someone: threats,
 * violence, harassment, fear for their safety. A screen for whether to ask the
 * safety question, never a finding about anyone.
 */
export const DANGER_WORDS =
  /\b(?:threat(?:en(?:ed|ing|s)?)?|unsafe|afraid|scared|frightened|in danger|harass(?:ed|ing|ment)?|stalk(?:ed|ing)?|hit me|hurt me|hits me|beat(?:s)? me|attack(?:ed)? me|assault(?:ed)? me|abus(?:e|ed|ive)|violen(?:t|ce)|weapon|knife|gun|kill|follow(?:s|ed|ing)? me|restraining order|peace bond)\b/i;

export function storySuggestsDanger(text: string): boolean {
  return DANGER_WORDS.test(text);
}

/**
 * THE EMERGENCY NOTICE'S RULE (site owner, 2026-10-30, verbatim): "the fuller emergency
 * notice (911 and the Victim Support Line) must appear only when the person writes that
 * they themselves are in danger, afraid for their safety, or being threatened or hurt now
 * (a crisis). It must not appear for past events with no present danger, for ordinary
 * conflict, for legal threats such as 'he threatened to sue me', or just because the case
 * is Family."
 *
 * The one decision for the notice (SafetyNotice, through safetyNoticeOnce.ts), narrower
 * than storySuggestsDanger above, which still decides the safety question and the case
 * file's Safety line and is unchanged. Read sentence by sentence:
 *
 *   - fear for their own safety: "I'm afraid of him", "scared to go back", "scared he'll
 *     take the kids", "fear for my life", "I don't feel safe", "I'm not safe with him",
 *     "unsafe", "in danger";
 *   - a threat or harm aimed at them by a person: "threatened me", "threatens to hurt",
 *     "said he would kill me", "hit me", "hits me", "follows me", "stalking me";
 *   - not when the sentence denies it ("He never hit me", "I'm not afraid of him") unless
 *     it goes on ("never hit me until last month");
 *   - not a legal threat ("threatened to sue", "threatened me with a lawsuit");
 *   - not harm told as long past with nothing present ("He hit me years ago; we have not
 *     spoken since"): a sentence with "years ago", "when we were together", "we have not
 *     spoken since" and the like, and no "now", "still", "again", "last week" and the like.
 *
 * Topic words on their own ("abuse", "violence", "restraining order", "weapon") do not
 * show the notice. Present danger told in words this does not read is still caught by the
 * AI safety pass (safetyPass.ts, "immediate-danger"), which halts with its fixed message.
 * A screen for when to show help, never a finding about anyone.
 */
// Fear of what someone will do counts only when it is harm (owner, 30 Oct): "scared he'll take the kids" is fear about custody, not danger.
const FEAR =/\b(?:afraid|scared|frightened|terrified)\s+(?:of\s+(?:him|her|them|my\s+(?:ex|husband|wife|partner|life)|what\s+(?:he|she|they))|for\s+my\s+(?:life|safety|kids|children|son|daughter)|to\s+(?:go|be|leave|stay|see|meet|return|sleep|come)\b|(?:that\s+)?(?:he|she|they)(?:['’]ll|['’]s\s+going\s+to|\s+will|\s+might|\s+would|\s+is\s+going\s+to|\s+may|\s+could)?\s+(?:hurt|harm|hit|kill|beat|attack|stab|shoot|choke|come\s+after|do\s+something\s+to)\b)|\bfear\s+for\s+my\s+(?:life|safety)|\b(?:don't|do\s+not|doesn't|never)\s+feel\s+safe|\b(?:i'm|i\s+am|we're|we\s+are|i\s+feel|we\s+feel)\s+(?:not\s+|un)safe|\bunsafe\b|\bin\s+danger\b/i;
const HARM_TO_ME = /\b(?:threat(?:en(?:ed|ing|s)?)\s+(?:me|us|my\s+(?:life|kids|children|family)|to\s+(?:hurt|kill|hit|harm|beat|take|burn|shoot|stab|come\s+after))|(?:said|says|told\s+me)\s+(?:he|she|they)(?:'d|'ll|\s+would|\s+will|\s+is\s+going\s+to)\s+(?:kill|hurt|hit|harm|beat|shoot|stab)|(?:hit|hits|hurt|hurts|beat|beats|kick(?:s|ed)?|chok(?:e|es|ed)|punch(?:es|ed)?|slap(?:s|ped)?|push(?:es|ed)?|grab(?:s|bed)?|attack(?:s|ed)?|assault(?:s|ed)?|abus(?:es|ed|ing)|kill)\s+me\b|(?:follow(?:s|ed|ing)?|stalk(?:s|ed|ing)?|harass(?:es|ed|ing)?)\s+me\b|violent\s+(?:with|towards?|to)\s+me\b)/i;
const LEGAL_THREAT = /^threat(?:en(?:ed|ing|s)?)?\s+(?:me\s+|us\s+)?(?:to\s+(?:sue|take\s+(?:me|us)\s+to\s+court|report|call\s+(?:a\s+)?(?:lawyer|collections))|with\s+(?:a\s+)?(?:lawsuit|legal\s+action|court|small\s+claims|claim|collections|eviction))/i;
const NEGATED = /\b(?:never|not|no|didn't|did\s+not|doesn't|does\s+not|hasn't|has\s+not|isn't|wasn't|won't|nobody|no\s+one)\s+(?:\w+\s+){0,2}$/i;
const STATES_UNSAFE = /^(?:i'm|i\s+am|we're|we\s+are|i\s+feel|we\s+feel|don't|do\s+not|doesn't|never)\b/i;
const LONG_PAST = /\b(?:(?:\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|several|many)\s+years?\s+ago|years\s+ago|long\s+ago|decades?\s+ago|when\s+we\s+were\s+(?:together|married|dating|living\s+together)|during\s+(?:our|the)\s+(?:relationship|marriage)|(?:have\s+not|haven't|have\s+never)\s+(?:spoken|talked|seen\s+(?:him|her|each\s+other)|been\s+in\s+contact)|no\s+(?:longer\s+)?(?:in\s+)?contact)\b/i;
const PRESENT = /\b(?:now|still|again|keeps?|lately|recently|yesterday|today|tonight|this\s+(?:week|morning|month)|last\s+(?:night|week|weekend)|every\s+(?:day|time|week|night))\b/i;

function sentenceNamesPresentDanger(sentence: string): boolean {
  if (LONG_PAST.test(sentence) && !PRESENT.test(sentence)) return false;
  for (const pattern of [FEAR, HARM_TO_ME]) {
    for (const match of sentence.matchAll(new RegExp(pattern.source, "gi"))) {
      const start = match.index ?? 0;
      const before = sentence.slice(0, start);
      const after = sentence.slice(start + match[0].length);
      if (pattern === HARM_TO_ME && LEGAL_THREAT.test(sentence.slice(start))) continue;
      // "I'm not safe" and "don't feel safe" state danger: their "not" is the danger, not a denial.
      if (pattern === FEAR && STATES_UNSAFE.test(match[0])) return true;
      if (NEGATED.test(before) && !/^\s*until\b/i.test(after)) continue;
      return true;
    }
  }
  return false;
}

/** Whether the person's words say THEY are in danger now: the emergency notice's one rule. */
export function storyNamesPresentDanger(text: string): boolean {
  return sentences(text).some((sentence) => sentenceNamesPresentDanger(sentence));
}
