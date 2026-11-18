/**
 * WHICH FACT ABOUT THE CASE EACH QUESTION ASKS FOR (the ask-once gate; the case file's slots).
 *
 * Every question the site shows -- the situation questions, the questions one at a
 * time (civil and Family), the Small Claims guided questions and its "here is what I
 * understood" rows, the review's remaining questions, the Family triage, the stage
 * question on the results and case pages, and the step page's date questions -- is
 * mapped here to the fact (or facts) it asks for. Two questions that ask for the same
 * fact in one case are the same question asked twice, whatever their wording.
 *
 * A question not listed asks for a fact of its own (its id), so asking it twice is
 * still caught. Pure.
 */
export type CaseFact =
  | "situation" | "side" | "court" | "stage" | "filed" | "defenceFiled" | "claimServed" | "papers"
  | "servedDate" | "serviceMethod" | "amount" | "otherParty" | "children" | "married" | "claimKind"
  | "wants" | "whenHappened" | "evidence" | "story" | "urgent" | "courtFileNumber" | "courtDate"
  | "conferenceDate" | "claimIssuedDate" | "defenceFiledDate" | "marriedWhere" | "outcome" | "filedDocuments" | "safety"
  // Every question asked by id has a fact (site owner, 17 Nov 2026; test:every-question-has-fact). These are asked in one
  // place each and are not case-file slots: the one function reads slots, so they are never decided by it yet.
  | "publication" | "twentyDaysPassed" | "notedInDefault" | "responseFacts" | "admission" | "completionDate" | "noticeToContractor"
  | "timeline" | "livingSituation" | "livingHistory" | "property" | "adoption" | "missingEvidence" | "yourName"
  | "divorceSought" | "cohabitation" | "municipality" | "otherPartyMunicipality";

const FACTS: Record<string, readonly CaseFact[]> = {
  // The situation questions (situation.ts).
  "situation:where": ["situation"],
  "situation:started": ["side"],
  "situation:papers": ["papers"],
  "situation:received": ["servedDate"],
  "situation:filed": ["filed"],
  "situation:court": ["court"],
  "situation:stage": ["stage"],
  // Civil and Family, one at a time and in the review.
  facts: ["story"],
  yourRole: ["side"],
  // Which documents exist is a detail of its own: the situation answers say whether anything
  // is filed, not which papers (the case file reads "filed" from these lists itself).
  filedDocuments: ["filedDocuments"],
  documents: ["filedDocuments"],
  issues: ["claimKind"],
  childrenInfo: ["children"],
  servedDate: ["servedDate"],
  serviceDetails: ["servedDate", "serviceMethod"],
  // A court date, or a conference date when the answer names one (caseFile.ts give).
  upcomingCourtDate: ["courtDate", "conferenceDate"],
  goal: ["wants"],
  legalRemedy: ["wants"],
  otherParty: ["otherParty"],
  urgent: ["urgent"],
  amountClaimed: ["amount"],
  courtFileNumber: ["courtFileNumber"],
  defendantOutcomeText: ["outcome"],
  // The person being sued says whether they want anything of their own in the same words as their outcome, so a claim
  // of their own is the outcome (Chrome check of #550, 5b: offered again after "I only want to defend the claim").
  "sc-defendant-outcome": ["outcome"],
  "sc-defendant-counterclaim": ["outcome"],
  counterclaimIntentText: ["outcome"],
  // Family's safety box, and the home page's safety question (5c).
  safetyConcerns: ["safety"],
  remedySought: ["wants"],
  placeOfMarriage: ["marriedWhere"],
  "case-date-case-conference-date": ["conferenceDate"],
  // Every conference's date is the conference date, kept with its kind (caseFile.ts conferenceKind).
  "case-date-family-settlement-conference-date": ["conferenceDate"],
  "case-date-trial-management-conference-date": ["conferenceDate"],
  "case-date-pre-trial-conference-date": ["conferenceDate"],
  // The first day of trial fills "the next court date" only when nothing else holds it (caseFile.ts STEP_DATE_NEVER_REPLACES).
  "case-date-trial-date": ["courtDate"],
  caseStage: ["stage"],
  // Small Claims guided questions and the review's.
  "sc-orient-role": ["side"],
  "sc-orient-dispute-category": ["claimKind"],
  "sc-orient-when-happened": ["whenHappened"],
  // The injury's date is when it happened, for an injury claim: the deadline engine already treats them as one moment
  // (casePosition.ts copies it to case-date-act-or-omission). Chrome milestone test of #550, row 9: asked again after the
  // date was confirmed.
  "sc-date-injury": ["whenHappened"],
  "sc-amount-claimed": ["amount"],
  "sc-claim-filed": ["filed"],
  "sc-defendant-served": ["claimServed"],
  "sc-defendant-claim-received": ["servedDate", "papers"],
  "sc-defendant-service-method": ["servedDate", "serviceMethod"],
  "sc-defendant-defence-filed": ["defenceFiled"],
  "sc-defence-filed": ["defenceFiled"],
  "sc-evidence-available": ["evidence"],
  "sc-remedy-sought": ["wants"],
  // The step page's date questions (casePosition.ts) for the same moments.
  // The day served ("Day you got the papers") is the day the person got the papers that started their case: never a later
  // service (a defendant's claim, a crossclaim, a third party claim), each kept as its own step-page date only (question-
  // to-fact audit, 11 Nov: a later service replaced the first, and pre-filled the defence deadline's question).
  "sc-date-claim-served": ["servedDate"],
  "case-date-served-with-application": ["servedDate"],
  "case-date-served-with-motion-to-change": ["servedDate"],
  "sc-date-settlement-conference": ["conferenceDate"],
  "sc-date-claim-issued": ["claimIssuedDate"],
  // A defence FILED with the court; a defence served on the other side is another moment (its own step-page date only).
  "sc-date-defence-filed": ["defenceFiledDate"],
  "case-date-own-defence-delivered": ["defenceFiledDate"],
  "case-date-act-or-omission": ["whenHappened"],
  // The Family triage.
  "married-to-other-party": ["married"],
  "situation:marriedWhere": ["marriedWhere"],
  "child-together": ["children"],
  "case-involves-children": ["children"],
  // The stage question on the results and case pages.
  "stage-confirmation": ["stage"],
  // The Small Claims guided route's "This sounds like it may be about..." card.
  "claim-kind-suggestion": ["claimKind"],
  // The review's own boxes, by the field they hold (the Small Claims guided facts and form fields).
  role: ["side"],
  claimFiled: ["filed"],
  defenceFiled: ["defenceFiled"],
  amountClaimedText: ["amount"],
  remedySoughtText: ["wants"],
  timelineText: ["whenHappened"],
  claimReceivedText: ["servedDate", "papers"],
  serviceMethodText: ["servedDate", "serviceMethod"],
  serviceDetailsText: ["claimServed"],
  evidenceText: ["evidence"],
  disputeCategory: ["claimKind"],
  // The follow-up chat's own questions, by the fact each asks for ENTIRELY (never ask twice, row 1,
  // 29 Oct): the chat asks by fact, through the one gate, never by comparing its own wording. Which
  // chat sentence asks by which id is CHAT_QUESTIONS below.
  "chat:main-dates": ["whenHappened"],
  "chat:anything-filed": ["filed"],
  "chat:outcome": ["wants"],
  "chat:other-party": ["otherParty"],
  "chat:court-date": ["courtDate"],
  "chat:amount": ["amount"],
  "chat:served-date": ["servedDate"],
  "chat:proof": ["evidence"],
  // Questions asked in one place each, by id (test:every-question-has-fact; Chrome milestone pass 2).
  "sc-defamation-publication-details": ["publication"],
  "sc-defence-time-elapsed": ["twentyDaysPassed"],
  "sc-defendant-noted-in-default": ["notedInDefault"],
  "sc-defendant-response-facts": ["responseFacts"],
  "sc-defendant-response-evidence": ["evidence"],
  "sc-defendant-admission-payment": ["admission"],
  "sc-contractor-completion-date": ["completionDate"],
  "sc-contractor-notice-before-replacement": ["noticeToContractor"],
  "sc-safety-check": ["safety"],
  // The Family form's own boxes (the Small Claims form's "timeline" box asks when it happened: asker.ts FORM_FIELD_FACTS).
  timeline: ["timeline"],
  currentLivingSituation: ["livingSituation"],
  pastLivingHistory: ["livingHistory"],
  propertyHomeDetails: ["property"],
  adoptionDetails: ["adoption"],
  missingEvidence: ["missingEvidence"],
  yourName: ["yourName"],
  // The Family triage's own questions.
  "divorce-sought": ["divorceSought"],
  "cohabitation-dates": ["cohabitation"],
  municipalities: ["municipality"],
  "other-party-municipality": ["otherPartyMunicipality"],
};

/** The facts a question asks for: its listed facts, or a fact of its own (its id). */
/**
 * Which fact a question asks for, from its own words, for questions that have no id of their own:
 * the story reading's questions on the home page and the chat's (Charter re-test 27 Oct: the
 * person answered "what would you like the court to order?" on the home page, including a
 * declaration; nothing else knew, so the review offered a story sentence instead and the chat asked
 * "what outcome are you seeking?" again). Null when the words name none of these.
 */
const ASKS_FOR: [RegExp, CaseFact][] = [
  // Each pattern names only what the person wants, claims, was served on, filed or sues: never a question that asks
  // something else in similar words (question-to-fact audit, 11 Nov: "What would you like to know?", "What outcome did the
  // tribunal reach?", "How much time has passed?", "How were you served?", "Have you filed a Defence?" and "Who is the
  // defendant's insurer?" each wrote a fact they do not ask about). test:question-meanings.
  [/\bwhat (?:outcome|result|remedy|remedies) (?:are|do|would) you\b|\boutcome (?:are|do) you (?:seeking|want)\b|\bwhat (?:do|would) you (?:want|like) (?:to happen|the court to (?:order|do))\b|\bwhat are you (?:asking|seeking)\b|\bwhat (?:would you like|do you want) the court\b/i, "wants"],
  [/\bhow much (?:money )?(?:\w+\s+){0,4}?(?:owe[sd]?|owing|claim\w*|asking for|seeking|su(?:e|ing) for|in dispute)\b|\bwhat (?:is the )?amount (?:\w+\s+){0,3}?(?:claim\w*|owed|owing|in dispute|you are (?:asking|seeking))\b/i, "amount"],
  [/\bwhen were you served\b|\bwhat (?:date|day) were you served\b/i, "servedDate"],
  [/\b(?:have|has) (?:you|the defendant|they|he|she) (?:already )?filed (?:a |an |your |their |his |her )?defen[cs]e\b/i, "defenceFiled"],
  // The same question in the home reading's other words (Chrome milestone pass 2, finding 4, S6: "Have you responded to the
  // claim or received any further court papers since October 20?" and "Have you submitted a defence or received any
  // further court papers since you were served?" after "Nothing else yet. I was just served").
  [/\b(?:have|has) (?:you|the defendant|they|he|she) (?:already )?(?:submitted|served|sent|delivered|filed or served) (?:a |an |your |their |his |her )?defen[cs]e\b|\b(?:have|has) (?:you|the defendant) (?:already )?(?:responded|replied) to (?:the|this|their|that) (?:plaintiff'?s )?claim\b/i, "defenceFiled"],
  [/\b(?:received|been served with|gotten|got) any (?:further|more|other|new) (?:court )?(?:papers|documents)\b|\banything (?:else )?(?:happened|changed) since you were served\b/i, "stage"],
  [/\b(?:have you|has anyone|has anything been) (?:already )?(?:started|filed)\b|\bstarted a court case\b/i, "filed"],
  [/\bwho (?:is|are) the (?:other party|other side|defendants?|respondents?)\b(?!'s|s')|\bwho (?:exactly )?(?:are you|do you want to|will you|would you like to) su(?:e|ing)\b|\bwho (?:exactly )?(?:do|would) you (?:name|sue)\b/i, "otherParty"],
  // The other side named by their part in the story, in the words the home page's questions use for it (Chrome check of
  // #550, 5d: "Who is the other side?" was asked after the home page's question about who bought the goods).
  [/\bwho (?:bought|purchased|hired|owes|is suing)\b|\bwho did you (?:sell|lend|rent|pay|hire|buy)\b[^?]*\b(?:to|from)?\b|\bwho (?:is|was|are|were) the (?:buyers?|sellers?|purchasers?|landlords?|tenants?|contractors?|lenders?|borrowers?|employers?|customers?|clients?)\b(?!'s|s')|\bname of the (?:company|business|buyers?|sellers?|store|landlord|contractor|employer|person|customer|client)\b|\b(?:full|legal|exact) (?:legal )?name of (?:the )?(?:business|company|store|other)\b/i, "otherParty"],
  [/\bwhen did (?:this|it|the [a-z]+) happen\b|\bwhat (?:date|day) did (?:this|it) happen\b/i, "whenHappened"],
  // A worry about safety, asked on its own (Chrome check of #550, 5c: "Is anything urgent ... a safety worry" after
  // "No safety concerns"). Only a question about the person's or the child's safety, never "what safety rules".
  [/\b(?:any|immediate|current|ongoing) (?:immediate )?safety (?:concerns?|worr(?:y|ies)|issues?|risks?)\b|\b(?:are|do) you (?:feel )?(?:safe|unsafe)\b|\bworried about (?:your|the child'?s|your child'?s|your children'?s) safety\b/i, "safety"],
  // The same worry in the real AI's other words (Chrome pass 2, S7a reading r2: "Are there any concerns about violence,
  // your child's safety, or your child being taken away without agreement?", answered "No safety concerns", then the
  // urgent question named a safety worry again).
  [/\bconcerns? about [^?]{0,40}?\b(?:violence|safety|abuse)\b|\b(?:family|domestic|intimate partner) violence\b|\bat risk of (?:harm|being harmed)\b|\b(?:your|the) (?:child'?s|children'?s) safety\b/i, "safety"],
  // A claim of the person's own against the one suing them: the person's outcome (5b: "A claim of your own against them"
  // was offered after "I only want to defend the claim").
  [/\bclaim of your own\b|\bcounter-?claim\b|\bdefendant'?s claim\b/i, "outcome"],
  // Whether they were married to each other, in the words the home page's reading and the case page's "What to confirm
  // next" use (Chrome milestone test of #550, rows 39 and 45: "Are you and your partner legally married?" on the home page,
  // the triage's own question, and "Were you married, is a divorce proceeding underway..." after "No"). Never "married
  // where" (marriedWhere) or "when did you marry".
  [/(?<!\b(?:where|when|how) )\b(?:are|were) you(?: and (?:your|the) [a-z ]+?)? (?:legally |ever )?married\b(?! (?:in|where|at)\b)/i, "married"],
];

/** Read only for a person being sued: the same words asked of a person suing name another fact (or none). */
const ASKS_FOR_RESPONDING: [RegExp, CaseFact][] = [
  [/\b(?:do|does) you (?:believe|think) (?:that )?(?:the )?[\w' ]{1,40}? owes? you (?:any )?money\b/i, "outcome"],
];

/**
 * A question that names the person themself as one of its answers ("you personally, a business you operate, or a
 * corporation?") asks about their own side, never the other party (real reading S8 r2, 18 Nov 2026: "Who was the seller
 * under the agreement" read as the other party, and the buyer's name was offered as the seller).
 */
const ABOUT_YOUR_OWN_SIDE = /\byou personally\b|\b(?:a|the) business you (?:operate|own|run)\b|\byourself\b/i;

export function factOfAskedText(question: string, options: { responding?: boolean } = {}): CaseFact | null {
  const fact = ASKS_FOR.find(([asks]) => asks.test(question))?.[1] ?? (options.responding ? ASKS_FOR_RESPONDING.find(([asks]) => asks.test(question))?.[1] : undefined) ?? null;
  return fact === "otherParty" && ABOUT_YOUR_OWN_SIDE.test(question) ? null : fact;
}

/**
 * EVERY CHAT QUESTION THAT ASKS A CASE-FILE FACT, BY ITS EXACT WORDS (row 1 review, 29 Oct). A
 * question is given an id only for facts it asks about ENTIRELY. A compound question (the fact and
 * something the case file does not hold: when they first found out, the order in place now, how an
 * amount was worked out, what was done) names its `open` part, asked instead once the fact is held,
 * so the rest is never lost. A sentence that asks about a fact only in part, and has no part the
 * case file holds whole, is not listed: it is asked as before ("Is there already a court order or
 * agreement?" -- an order or agreement in place is not "anything filed": a new case and a motion to
 * change are different steps). Words not listed are read by the one word reader (factOfAskedText),
 * and a dynamic sentence by CHAT_ASKS. Checked both ways by test:chat-asks-by-fact.
 */
export type ChatQuestion = { asks: string; open?: string };
const CHAT_QUESTIONS: Record<string, ChatQuestion> = {
  // conversationIntelligenceEngine.ts buildQuestions.
  "What are the main dates, including when the problem happened and when you first found out about it?": { asks: "chat:main-dates", open: "When did you first find out about the problem, and are there other important dates?" },
  "Has anything already been filed, served, ordered, scheduled, or decided by a court or tribunal?": { asks: "chat:anything-filed", open: "Has a court or tribunal already ordered, scheduled or decided anything?" },
  "What are you trying to get or fix through the legal process?": { asks: "chat:outcome" },
  // Its issue frameworks.
  "What order or arrangement exists right now, and what are you trying to change?": { asks: "chat:outcome", open: "What order or arrangement exists right now?" },
  "Is there already a court order, agreement, upcoming conference, motion, or court date?": { asks: "chat:court-date", open: "Is there already a court order or agreement?" },
  "Which public actor is involved, and what exactly did they do or fail to do?": { asks: "chat:other-party", open: "What exactly did they do or fail to do?" },
  "Has anything already been filed, ordered, appealed, reviewed, or decided by a court or tribunal?": { asks: "chat:anything-filed", open: "Has a court or tribunal already ordered, reviewed or decided anything, or has anything been appealed?" },
  // The reasoning profiles' first questions (legalReasoningProfiles.ts).
  "How much money are you claiming and how did you calculate it?": { asks: "chat:amount", open: "How did you work out the amount you are claiming?" },
  "What are you asking the court to change?": { asks: "chat:outcome" },
  "Which public actor is involved?": { asks: "chat:other-party" },
  // The general question's parts (assistantBlocks.ts).
  "What are the main dates?": { asks: "chat:main-dates", open: "Are there other important dates?" },
  "What outcome are you seeking?": { asks: "chat:outcome" },
  // What proof they have (buildQuestions; the general question's part): a fact the case file does not
  // hold, so only the conversation check stops it (CI 29 Oct, m19-laptop-repair).
  "What proof do you already have, such as messages, emails, screenshots, witnesses, court papers, recordings, receipts, or transcripts?": { asks: "chat:proof" },
  "What proof do you currently have?": { asks: "chat:proof" },
};
/** A chat sentence built with names in it: the parties it names, to confirm (asks only who the other party is). */
const CHAT_ASKS: [RegExp, string][] = [
  [/^From what you described, it sounds like this may involve [^?]*\. Is that right, or is the main concern with someone else\?$/, "chat:other-party"],
];
const CHAT_ID_OF_FACT: Partial<Record<CaseFact, string>> = {
  wants: "chat:outcome", amount: "chat:amount", servedDate: "chat:served-date", filed: "chat:anything-filed",
  otherParty: "chat:other-party", whenHappened: "chat:main-dates",
};

/** How a chat sentence asks: its listed id and open part; else by CHAT_ASKS; else the one word reader; else a fact of its own (its words). */
export function chatQuestionOf(words: string): ChatQuestion {
  const text = words.trim();
  const listed = CHAT_QUESTIONS[text];
  if (listed) return listed;
  const own = CHAT_ASKS.find(([asks]) => asks.test(text))?.[1];
  if (own) return { asks: own };
  const fact = factOfAskedText(text);
  return { asks: (fact && CHAT_ID_OF_FACT[fact]) || text };
}

/** The chat's own sentences that ask by this id (or are this open part): how a conversation shows it was asked. */
export function chatSentencesFor(key: string): string[] {
  return Object.entries(CHAT_QUESTIONS).flatMap(([words, question]) => [...(question.asks === key ? [words] : []), ...(question.open === key ? [question.open] : [])]);
}

/** The chat question id a chat sentence asks by. */
export function chatQuestionId(words: string): string {
  return chatQuestionOf(words).asks;
}

export function factsOfQuestion(id: string, surface?: string): string[] {
  const keyed = surface === "situation" ? FACTS[`situation:${id}`] : undefined;
  return [...(keyed ?? FACTS[id] ?? [id])];
}
