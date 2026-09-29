/**
 * CHAT ITEM 6 — a chat that can only say what has already been verified.
 *
 * *** WHAT THIS REPLACES, AND WHY IT HAD TO BE REPLACED ***
 *
 * `docs/chat-engine-report.md` audited the existing chat surface
 * (`ai-case-partner`). Its finding was not that a model was writing legal prose —
 * no model is involved there at all. It was worse in a quieter way: the chat
 * states law and procedure from ~25 hand-written templates and an eleven-object
 * doctrine library whose every entry is marked `verificationStatus:
 * "not-verified"`, it carries no citations, none of it is in the review packet,
 * and it is reachable in phase 1.
 *
 * That report listed four options. This is option D — keep the chat, and make it
 * SELECT from content that is already sourced and already reviewed — applied to
 * the accuracy engine rather than to the claim-type catalogue.
 *
 * *** THE MODEL RETURNS IDS. IT NEVER RETURNS WORDS. ***
 *
 * The structured output is `{ intent, blockIds, clarifyingQuestionIds,
 * requestsLegalAdvice, noMatch }` and every field is an enum, a boolean, or a
 * list of ids drawn from a fixed catalogue. There is no field a sentence could
 * travel in.
 *
 * That is the same discipline as the stage resolver, for the same reason: the
 * model may reason as deeply as it likes about which of 16 published blocks
 * answers the question, and the answer a person reads is the block, rendered
 * through `renderStageAnswer`, past the output guard, exactly as it would be
 * anywhere else in the product.
 *
 * *** AN ID THAT IS NOT IN THE CATALOGUE IS DROPPED, NOT REPAIRED ***
 *
 * No nearest-match, no fuzzy resolution. A hallucinated block id is the model
 * telling us it wanted to answer something we have not written, and the honest
 * response to that is the no-match message, not the closest block we happen to
 * have. Snapping to the nearest stage is the exact failure this whole engine
 * exists to undo.
 */

import { createOpenAIClient } from "../openaiClient";
import { modelParams } from "../aiModels";
import { currentAiCallContext, withAiCallContext } from "../../audit/aiCallLog";
import { PUBLISHED_BLOCKS } from "../../content-library/publishedLibrary";
import { CASE_STAGES, findStage } from "../stage-map/stageMap";
import { distinguishingQuestion } from "../stage-map/stageMessages";

/**
 * What the person is asking for. Used to order the answer, never to generate it.
 *
 * Deliberately coarse. A finer taxonomy would invite the model to make
 * distinctions the assembly code does not act on, and an intent nothing reads is
 * a field that looks like a decision and is not one.
 */
export type ChatIntent =
  | "where-do-i-stand"
  | "what-do-i-do-next"
  | "when-is-my-deadline"
  | "what-happens-after"
  | "what-does-this-word-mean"
  | "something-else";

export const CHAT_INTENTS: readonly ChatIntent[] = [
  "where-do-i-stand",
  "what-do-i-do-next",
  "when-is-my-deadline",
  "what-happens-after",
  "what-does-this-word-mean",
  "something-else",
];

/** Exactly what the model is allowed to return. */
export type ChatSelection = {
  intent: ChatIntent;
  /** Published block ids, in the order they should be read. */
  blockIds: string[];
  /** Ids from the clarifying-question catalogue. */
  clarifyingQuestionIds: string[];
  /** The QUESTION cannot be answered with information. */
  requestsLegalAdvice: boolean;
  /** Nothing in the library answers this. */
  noMatch: boolean;
};

/**
 * At most three blocks.
 *
 * Not a token budget. A chat answer that returns six stage blocks is a search
 * result, and a person who asked one question and received six screens of
 * procedure has been given the work of deciding which part applies to them —
 * which is the work they came here to avoid.
 */
export const MAX_BLOCKS = 3;

/** At most two questions back. Three is an interrogation, not a clarification. */
export const MAX_CLARIFYING = 2;

// ---------------------------------------------------------------- catalogues

export type ClarifyingQuestionEntry = {
  /** `stageA::stageB`, the pair whose boundary this fact settles. */
  id: string;
  question: string;
  between: [string, string];
};

/**
 * Every recorded boundary in the stage map, as an addressable question.
 *
 * Derived, never authored here. `distinguishedFrom` already holds the fact that
 * separates two neighbouring stages — the same text the stage resolver offers
 * when it cannot choose — so the chat asks the same questions the rest of the
 * engine asks, and a boundary added to the map becomes askable with no second
 * edit.
 *
 * *** DE-DUPLICATED BY THE QUESTION, NOT BY THE PAIR ***
 *
 * Two passes, and the second was not obvious. Each PAIR appears once, because
 * the map records some boundaries on one side and some on both. But distinct
 * pairs also share wording — "whether a defence has been filed" separates
 * several different pairs of stages, and it is the same sentence every time.
 *
 * Keying only on the pair left 48 entries of which a number were verbatim
 * duplicates, and the model can return two ids. A person asked "whether a
 * defence has been filed" twice in one reply would reasonably conclude the thing
 * is broken.
 *
 * So the catalogue is keyed by the QUESTION. The first pair to record a given
 * wording keeps it; a later pair with identical wording is not a second question
 * to ask, it is the same question, and asking the kept id puts exactly the same
 * sentence in front of the reader. Nothing is lost but the duplicate.
 */
export function clarifyingQuestionCatalogue(): ClarifyingQuestionEntry[] {
  const byPair = new Map<string, ClarifyingQuestionEntry>();

  for (const stage of CASE_STAGES) {
    for (const boundary of stage.distinguishedFrom) {
      const pair = [stage.id, boundary.stage].sort() as [string, string];
      const id = `${pair[0]}::${pair[1]}`;
      if (byPair.has(id)) continue;

      const question = distinguishingQuestion(pair[0], pair[1]);
      if (!question) continue;

      byPair.set(id, { id, question, between: pair });
    }
  }

  const byQuestion = new Map<string, ClarifyingQuestionEntry>();
  for (const entry of [...byPair.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = entry.question.trim().toLowerCase();
    if (!byQuestion.has(key)) byQuestion.set(key, entry);
  }

  return [...byQuestion.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export type BlockCatalogueEntry = {
  stageId: string;
  /** The question this block answers, in the words a person would use. */
  userQuestion: string;
  /** Which side of a case the reader is on. */
  side: string;
  /** Whether the block carries a deadline section. */
  hasDeadline: boolean;
};

/**
 * The blocks the chat may offer: the PUBLISHED set, and nothing else.
 *
 * Not `CASE_STAGES`. A stage exists in the map long before it has content, and
 * offering the model 37 stages when 16 have published blocks would produce
 * selections that render nothing — which the assembly would then have to turn
 * into a no-match, after the model had already decided it had an answer.
 */
export function blockCatalogue(): BlockCatalogueEntry[] {
  return PUBLISHED_BLOCKS.map((block) => ({
    stageId: block.stageId,
    userQuestion: block.userQuestion,
    side: findStage(block.stageId)?.side ?? "both",
    hasDeadline: Boolean(block.yourDeadline),
  }));
}

// ------------------------------------------------------------------- the call

export const LIBRARY_CHAT_SYSTEM = `You route a question from a self-represented person in the Ontario Small Claims Court to content that has ALREADY been written and verified.

YOU DO NOT ANSWER THE QUESTION. You choose which of the available answers is the one they need. You return ids and nothing else. There is no field in your reply that a sentence can go in, and that is deliberate: every word this person reads has been checked against the actual rules, and you have not seen those rules.

INTENT must be exactly one of: where-do-i-stand, what-do-i-do-next, when-is-my-deadline, what-happens-after, what-does-this-word-mean, something-else. Use something-else only when none of the others fits.

HOW TO CHOOSE
1. Read what they asked and what is known about their case. Pick the block whose "asks" line is closest to their actual question.
1a. NEVER CHOOSE A BLOCK THAT ASSUMES A FACT THEY HAVE NOT GIVEN YOU. Some blocks are specific — to one municipality, to private premises rather than public, to one side of a case. If their story does not state the fact that block assumes, you must not supply it. Prefer the GENERAL block, or return no block and ask the clarifying question that settles it. A real run chose the City of Toronto block for somebody who said only "a city sidewalk"; Toronto has its own Act and its own clerk, so that person would have served notice on the wrong office with ten days to do it in.
1b. This is NOT a reason to return nothing when you do have the right block. If their story states where they are, give them the block. Rule 1a is about not inventing the deciding fact, not about caution in general.
2. Prefer ONE block. Add a second or third only when the question genuinely spans them — "what do I do and when is it due" is one block, not two, because a block already contains both.
3. WHOSE SIDE ARE THEY ON. Each block says whether the reader is the plaintiff or the defendant. A plaintiff must never be given a defendant's block. If you cannot tell which side they are on, that is a clarifying question, not a guess.
4. If two blocks are both plausible and the difference matters, return BOTH ids only if both would be useful; otherwise return neither and ask the clarifying question that separates them.

WHEN TO SET noMatch
noMatch is about THE LIBRARY and never about the question. It answers one thing: is the content they need on the list? Never set it true because the question was one you must decline — those are different decisions and a question you decline still has a stage, which they still need. "Do you think I'll win?" from somebody who has just been served is requestsLegalAdvice TRUE and noMatch FALSE, with the block for where they are.

Set it true when nothing in the list answers what they asked. That is a real and common outcome — the library covers 16 positions out of 37, so most questions about later stages have no block yet. Do NOT pick the closest available block instead. A person asking about enforcement who is handed the settlement conference block has been misled twice: once about the answer and once about whether we had one.

WHEN TO SET requestsLegalAdvice
Set it true when the QUESTION ITSELF cannot be answered with information, whatever the stage: "will I win", "how strong is my case", "what should I say to the judge", "should I take this offer", "do I have a case", "is it worth it". This is independent of everything else — a person can ask an advice question at a stage you can place perfectly, and you should still set the flag AND return the block. The flag does not replace the answer.

DECIDE requestsLegalAdvice BEFORE YOU LOOK AT THE LIST OF BLOCKS, and do not revisit it afterwards. Ask only this: if we had written every block in existence, could this question be answered by describing procedure? If yes, requestsLegalAdvice is FALSE, however little we happen to have.

  "How do I collect on my judgment?"        procedure. FALSE. (noMatch true)
  "How do I appeal?"                        procedure. FALSE. (noMatch true)
  "What is a settlement conference?"        procedure. FALSE.
  "Should I take their offer?"              a judgment about their case. TRUE.
  "Will I win?"                             TRUE.
  "What should I say to the judge?"         TRUE.

Setting the advice flag because you have nothing to offer tells a person that an ordinary question about court procedure is one only a lawyer may answer. That is untrue, it is discouraging, and it is the opposite of what a self-represented person needs to hear.

CLARIFYING QUESTIONS
Return an id from the clarifying list when a fact you do not have would change which block applies. Return none when you are confident. Never return more than two.

Reply with JSON only:
{"intent": "...", "blockIds": ["..."], "clarifyingQuestionIds": ["..."], "requestsLegalAdvice": false, "noMatch": false}`;

function catalogueForPrompt(): string {
  const blocks = blockCatalogue()
    .map(
      (entry) =>
        `- ${entry.stageId}\n    THE READER IS THE ${entry.side.toUpperCase()}.` +
        ` They ask: ${entry.userQuestion}${entry.hasDeadline ? "\n    Carries a deadline." : ""}`,
    )
    .join("\n");

  const questions = clarifyingQuestionCatalogue()
    .map((entry) => `- ${entry.id}\n    ${entry.question}`)
    .join("\n");

  return `AVAILABLE ANSWERS:\n\n${blocks}\n\nCLARIFYING QUESTIONS:\n\n${questions}`;
}

/*
 * *** PROCEDURAL QUESTIONS ARE NEVER LEGAL ADVICE, AND THIS IS DECIDED IN CODE ***
 *
 * The model sets `requestsLegalAdvice` whenever it has nothing to offer. It was
 * told not to, in four places, with "How do I collect on my judgment?" given as a
 * worked counter-example, and it did it anyway — which is the same lesson as the
 * WSIAT classification: a prompt is a request, not a safeguard.
 *
 * The cost is not abstract. A person asking how to serve a document is told that
 * their ordinary question about court procedure is one only a lawyer may answer.
 * That is untrue, it is discouraging, and it is the opposite of what a
 * self-represented person needs to hear from a product built for them.
 *
 * So a fixed list of procedural askings overrides the flag BEFORE it is read.
 *
 * *** WHY THIS LIST IS SAFE WHERE A LIST OF ADVICE PHRASES WOULD NOT BE ***
 *
 * It only ever makes the product MORE willing to answer a question of the form
 * "how do I do this procedural step". It cannot cause an advice question to be
 * answered as though it were procedural, because being on this list does not
 * produce content — the blocks are still selected by id from the published set,
 * still rendered through the guard, and still contain no prediction, which
 * `predictsOutcome` guarantees before publication.
 *
 * The verbs are paired with a procedural object on purpose. "How do I file" and
 * "what form do I need" are procedure. "How do I win" and "what should I say"
 * share the interrogative and are not on the list.
 */
const PROCEDURAL_ASKINGS: RegExp[] = [
  /\bhow (do|can|would) i\b[^?.]{0,40}\b(file|filing|serve|serving|collect|enforce|respond|reply|defend|appeal|start|begin|issue|withdraw|discontinue|amend)\b/i,
  /\bwhat form\b/i,
  /\bwhich form\b/i,
  /\bwhat (do|does) i\b[^?.]{0,20}\b(file|serve|bring|fill)\b/i,
  /\bwhere (do|can) i\b[^?.]{0,30}\b(file|serve|pay|go)\b/i,
  /\bwhat (is|are) the (steps?|process|procedure)\b/i,
  /\bhow (much|long)\b[^?.]{0,30}\b(cost|fee|days?|time)\b/i,
  /\bhow do i (get|obtain)\b[^?.]{0,30}\b(judgment|a hearing|a date|a copy)\b/i,
];

/**
 * Is this a procedural asking, on its face?
 *
 * Exported so the check can drive it directly, and so the list is visible to
 * anyone reviewing what the product refuses to treat as advice.
 */
export function isProceduralAsking(message: string): boolean {
  return PROCEDURAL_ASKINGS.some((pattern) => pattern.test(message));
}

/**
 * Keeps only what the catalogues actually contain.
 *
 * *** THIS IS THE GATE, AND IT RUNS WHETHER OR NOT A MODEL WAS INVOLVED ***
 *
 * Separated from the call so the suite can drive it with the exact payloads a
 * model might return — including the ones it should never return. The WSIAT
 * check earlier in this work taught the lesson the hard way: a check that goes
 * through the whole pipeline to reach a validator ends up testing whichever path
 * the model happened to take that day.
 */
export function validateSelection(
  raw: Partial<ChatSelection> | null,
  message = "",
): ChatSelection {
  if (!raw) {
    return {
      intent: "something-else",
      blockIds: [],
      clarifyingQuestionIds: [],
      requestsLegalAdvice: false,
      noMatch: true,
    };
  }

  const published = new Set(PUBLISHED_BLOCKS.map((block) => block.stageId));
  const questions = new Set(clarifyingQuestionCatalogue().map((entry) => entry.id));

  const blockIds = [...new Set(Array.isArray(raw.blockIds) ? raw.blockIds : [])]
    .filter((id) => typeof id === "string" && published.has(id))
    .slice(0, MAX_BLOCKS);

  const clarifyingQuestionIds = [
    ...new Set(Array.isArray(raw.clarifyingQuestionIds) ? raw.clarifyingQuestionIds : []),
  ]
    .filter((id) => typeof id === "string" && questions.has(id))
    .slice(0, MAX_CLARIFYING);

  const intent = CHAT_INTENTS.includes(raw.intent as ChatIntent)
    ? (raw.intent as ChatIntent)
    : "something-else";

  /*
   * A selection with no surviving block IS a no-match, whatever the model said.
   *
   * It reaches here two ways: the model set noMatch itself, or it named blocks
   * that do not exist. Both mean the person gets the no-match message, and the
   * second is the one worth being strict about — a model confident enough to
   * invent an id is a model that believed it had an answer.
   */
  const noMatch = raw.noMatch === true || blockIds.length === 0;

  return {
    intent,
    blockIds,
    clarifyingQuestionIds,
    /*
     * The override, applied BEFORE the model's flag is read rather than after:
     * a procedural asking is not legal advice however little content we have for
     * it. See PROCEDURAL_ASKINGS.
     */
    requestsLegalAdvice: raw.requestsLegalAdvice === true && !isProceduralAsking(message),
    noMatch,
  };
}

/** How many ids the model invented. Logged, never shown. */
export function droppedIds(raw: Partial<ChatSelection> | null): string[] {
  if (!raw || !Array.isArray(raw.blockIds)) return [];
  const published = new Set(PUBLISHED_BLOCKS.map((block) => block.stageId));
  return raw.blockIds.filter((id) => typeof id === "string" && !published.has(id));
}

/**
 * Asks the model which published content answers this question.
 *
 * Never throws. A model that errors, times out or returns malformed JSON lands
 * in the same place as one that found nothing: no-match, with referrals. There
 * is no failure path that produces a confident answer.
 */
export async function selectFromLibrary(
  message: string,
  caseContext = "",
  model?: string,
): Promise<ChatSelection> {
  const run = async (): Promise<ChatSelection> => {
    try {
      const client = createOpenAIClient();
      const response = await client.chat.completions.create({
        ...modelParams("standard", { model, temperature: 0, seed: 1 }),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: LIBRARY_CHAT_SYSTEM },
          {
            role: "user",
            content:
              `${catalogueForPrompt()}\n\n` +
              `${caseContext ? `WHAT IS KNOWN ABOUT THE CASE:\n\n${caseContext}\n\n` : ""}` +
              `THEIR QUESTION:\n\n${message}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      const parsed = content ? (JSON.parse(content) as Partial<ChatSelection>) : null;

      const dropped = droppedIds(parsed);
      if (dropped.length > 0) {
        // Console only. The user sees the no-match message, not our diagnostics.
        console.error(`[libraryChat] model named ${dropped.length} unpublished block id(s)`, {
          dropped,
        });
      }

      return validateSelection(parsed, message);
    } catch {
      return validateSelection(null);
    }
  };

  // Same reasoning as resolveStageWithModel: ensure a context so a script's
  // calls are attributable, without clobbering one a route already opened.
  return currentAiCallContext()
    ? run()
    : withAiCallContext({ callType: "library-chat" }, run);
}
