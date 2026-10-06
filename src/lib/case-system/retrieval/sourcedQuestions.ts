/**
 * Follow-up questions for ANY kind of case, written from the law the research
 * step actually read -- not from a hand-written list.
 *
 * WHY (site owner, 2026-10-05): "civil needs charter human rights maybe and
 * many more ... when we look at sources, they explain every step ... so we
 * should be ready for every type of case." The intake asked case-specific
 * questions only for the 27 Small Claims and 7 civil claim types someone had
 * written questions for; a Charter claim, a bus injury or anything else got
 * generic ones. The owner chose (2026-10-05) to let the intake write its own
 * questions from the law it reads, each tied to a quoted source and checked
 * by a second AI. Hand-written lists stay and are used first where they
 * exist.
 *
 * HOW
 *   1. researchStory() reads the story and researches it (verified quotes,
 *      and the library fetches missing laws on its own).
 *   2. A model is shown the story and ONLY the passages the research found
 *      to answer a question, and writes up to five questions about what those
 *      passages say matters for someone in this position that the story has
 *      not answered -- each naming its passage and quoting it exactly.
 *   3. CODE checks each one: the passage was offered; the quote is in it;
 *      every number in the question and its "why" is in the passage; no
 *      outcome or merits wording the passage does not itself use
 *      (caseStrengthLanguageValidator, CLAUDE.md section 3); no advice
 *      ("you should"), no "do you have a case"; it is a question; sane length.
 *   4. A SECOND, independent model call -- which never sees the story or the
 *      first call's prompt, only a neutral one-line situation, the passage and
 *      the question -- checks that the "why" says only what the passage says,
 *      that the passage applies to this kind of situation, and that the
 *      question is neutral: it asks for facts, does not suggest an answer,
 *      and does not judge. Anything it does not pass is dropped.
 *
 * WHAT THE PERSON SEES: the question, a "why we ask" line, and the provision
 * with its official link. Answering is optional; answers are added to what
 * they told us, as their own words (suggest, never decide: CLAUDE.md s. 4).
 * Nothing here says whether anyone has a case (CLAUDE.md s. 2).
 *
 * Never throws; any failure is "no questions" and the intake goes on as
 * before. Behind phaseScope.sourcedQuestionsEnabled (SOURCED_QUESTIONS=off).
 * Asserted by `npm run test:sourced-questions`.
 */

import { loadCorpusIndex, readPassage, type LoadedIndex, type Passage } from "./corpusIndex";
import { numberNotInSource, outcomeTermNotInProvision, provisionOf } from "./explainProvision";
import { researchStory, type ResearchDeps, type ResearchResult } from "./researchStory";
import { passageItem, type RetrievalInput } from "./storyRetrieval";

export const MAX_SOURCED_QUESTIONS = 5;
const MAX_PASSAGES_OFFERED = 10;
const PASSAGE_CHARS = 1500;
/**
 * Writing and checking, in their own request (phase 2). Research has its own
 * request and its own 45 s budget (researchStory). Measured 2026-10-05: the
 * two together took a median 43 s, and one request ran out of time on 9 of
 * 12 stories when the model was slow.
 */
const QUESTION_BUDGET_MS = 40_000;

export type SourcedQuestion = {
  id: string;
  question: string;
  /** One plain sentence: what the provision requires or says matters. */
  why: string;
  passageId: string;
  /** Copied from the provision; code checked it is there. */
  quote: string;
  citation: string;
  sourceUrl?: string;
};

export type SourcedQuestionsResult = {
  questions: SourcedQuestion[];
  /** Why there are none, when there are none. Causes only, never content. */
  skipped?: string;
  /** Counts for the probe: written, refused by code, refused by the checker. */
  counts: { written: number; refusedByCode: number; refusedByChecker: number };
  /**
   * Why drafts were refused -- code's reason or the checker's few words --
   * for the probe and the coverage report. Never shown to a person.
   */
  refusals?: string[];
  /** Laws the research named as missing (already filed as source requests by the analysis path). */
  sourceRequests: string[];
};

type Draft = { question: string; why: string; passageId: string; quote: string };

export type CheckVerdict = { id: string; ok: boolean; problem?: string };

export type SourcedQuestionDeps = {
  research?: (input: RetrievalInput) => Promise<ResearchResult>;
  researchDeps?: ResearchDeps;
  write?: (input: RetrievalInput, passages: readonly Passage[]) => Promise<unknown>;
  check?: (situation: string, items: readonly { id: string; question: string; why: string; passage: Passage }[]) => Promise<unknown>;
};

// ------------------------------------------------------------ prompts

export const WRITE_SYSTEM_PROMPT = `You are an experienced Ontario lawyer meeting a person about their legal matter. You have their account and passages of Ontario and Canadian law that research found apply to their situation.

From the passages ONLY, find what the law says matters for someone in their position -- what must be shown, a notice to give, a time limit, a condition, an exception -- and write one question for each point their account does not already answer. Each question asks for facts the person would know: what happened, when, who was involved, whether something was done or received.

Rules you must never break:
- Use only the passages. Never use your own knowledge of the law.
- Never say or suggest whether the person has a case, how strong it is, or how it will turn out. Never give advice ("you should").
- Do not suggest what the answer should be. Ask neutrally.
- Do not ask what their account already answers.
- Do not ask for names, addresses, phone numbers, or general questions any intake asks (what happened, how much, what proof they have). Ask only about points a passage raises.
- Ask about a condition or exception only if their account gives some sign it could apply to them (do not ask whether their children are married when nothing suggests it).
- Do not assume what they claim is right: "Did the artist make an error?" not "When did you realize the artist made the error?"
- Each question must make sense alone: the person never sees the passage, so never write "this section", "this rule" or "that notice" for something the question does not name.
- Plain, everyday words. One question each, under 200 characters.
- For each, "why" is one plain sentence saying what the law provides on that point (not what it means for this person), under 250 characters. Name the law it comes from ("The Insurance Act says ...", "The Small Claims Court rules require ..."); never write "the passage". Write any number exactly as the passage does.
- For each, give the passage id and a short quote copied EXACTLY, character for character, from that passage, showing the point.

At most 5 questions, the most important first. If no passage raises a point the account leaves open, return an empty list.

Return JSON: {"questions": [{"question": "...", "why": "...", "passageId": "...", "quote": "..."}]}`;

export const CHECK_SYSTEM_PROMPT = `You check follow-up questions a legal information service wants to ask a person. You did not write them. Each comes with a passage of law and a "why" line that is meant to say what the passage provides. Be strict: a person will rely on it.

The COURT AND SITUATION line says which Ontario court the matter is in; take that as given. The questions were written from the person's own account, which you are not shown: a question may name facts from it (what was damaged, who did it, what was said). That is not presupposing.

For each item decide "ok": true only if ALL of these hold:
1. The "why" says only what the passage says: nothing added, no number changed, "may" not turned into "must". It is one short sentence and need not list every condition or exception; refuse only if what it leaves out makes what it does say wrong.
2. The passage is written for this kind of situation (a rule for a different situation -- another kind of claim, another place, another court -- does not apply).
3. The question asks for facts, neutrally. It does not suggest what the answer should be, does not tell the person what to do, and does not say or hint whether they have a case or how it will turn out.

Otherwise "ok": false with "problem": a few words.

Return JSON: {"results": [{"id": "...", "ok": true | false, "problem": "..."}]}`;

// ------------------------------------------------------------ code checks

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max + 1) : "";

const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ADVICE = [
  /\byou should\b/i,
  /\byou (?:must|need to|have to) (?:file|sue|serve|claim|apply|send|go)\b/i,
  /\bhave a (?:good |strong |valid )?case\b/i,
  /\b(?:chances?|likely to (?:win|succeed|lose))\b/i,
  /\bwill (?:you )?(?:win|lose|succeed)\b/i,
];

/** Why a drafted question must not be asked, or null. Pure; exported for the suite. */
export function questionRejection(draft: Draft, passage: Passage | undefined): string | null {
  if (!passage) return "passage not offered";
  if (norm(draft.quote).length < 15 || !norm(passage.text).includes(norm(draft.quote))) return "quote not in passage";
  const question = draft.question.trim();
  if (question.length < 15 || question.length > 220) return "question length";
  if (!question.endsWith("?")) return "not a question";
  if (draft.why.trim().length < 20 || draft.why.trim().length > 300) return "why length";
  const source = `${passage.source.title}\n${passage.source.citation ?? ""}\n${passage.pinpoint ?? ""}\n${passage.text}`;
  const stray = numberNotInSource(`${question} ${draft.why}`, source);
  if (stray) return `number "${stray}" not in passage`;
  const term = outcomeTermNotInProvision(`${question} ${draft.why}`, passage.text);
  if (term) return `outcome wording "${term}"`;
  for (const pattern of ADVICE) if (pattern.test(`${question} ${draft.why}`)) return "advice or outcome";
  // The person sees the question, not the passage (independent review,
  // 2026-10-06: "...agreement to be bound by this section?").
  if (/\b(?:this|that|the above) (?:section|subsection|clause|rule|regulation|provision|passage)\b/i.test(question)) return "refers to text the person cannot see";
  return null;
}

/** The writer's drafts, shaped; nothing checked yet. Pure; exported for the suite. */
export function parseDrafts(content: unknown): Draft[] {
  let parsed: unknown = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
  }
  const raw = (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      question: clean(entry.question, 300),
      why: clean(entry.why, 400),
      passageId: clean(entry.passageId, 140),
      quote: clean(entry.quote, 600),
    }))
    .slice(0, MAX_SOURCED_QUESTIONS * 2);
}

/** The checker's verdicts; anything missing or malformed counts as not ok. Pure; exported for the suite. */
export function parseVerdicts(content: unknown): CheckVerdict[] {
  let parsed: unknown = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
  }
  const raw = (parsed as { results?: unknown })?.results;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({ id: clean(entry.id, 20), ok: entry.ok === true, problem: clean(entry.problem, 200) || undefined }));
}

/** The passages the research found to answer a question, in its order. Pure; exported for the suite. */
export function answeringPassages(research: ResearchResult): Passage[] {
  const byId = new Map(research.passages.map((passage) => [passage.id, passage]));
  const ids = [...new Set(research.findings.flatMap((finding) => finding.answeredBy.map((answer) => answer.passageId)))];
  return ids
    .map((id) => byId.get(id))
    .filter((passage): passage is Passage => Boolean(passage))
    .slice(0, MAX_PASSAGES_OFFERED);
}

// ------------------------------------------------------------ the pipeline

const empty = (skipped: string, sourceRequests: string[] = []): SourcedQuestionsResult => ({
  questions: [],
  skipped,
  counts: { written: 0, refusedByCode: 0, refusedByChecker: 0 },
  sourceRequests,
});

export type ResearchForQuestions = {
  /** Ids of the passages the research found to answer a question, in its order. */
  passageIds: string[];
  /** The research's neutral one-line situation, for the independent check. */
  situation: string;
  sourceRequests: string[];
  skipped?: string;
};

/**
 * Phase 1: research the story. Returns passage IDS, not text: phase 2
 * re-reads each from the index (hash-verified), so what the writer is shown
 * is always the official text whoever carries the ids between the phases.
 * Always resolves; never throws.
 */
export async function researchForQuestions(input: RetrievalInput, deps: SourcedQuestionDeps = {}): Promise<ResearchForQuestions> {
  try {
    const research = deps.research ? await deps.research(input) : await researchStory(input, deps.researchDeps ?? {});
    const passages = answeringPassages(research);
    return {
      passageIds: passages.map((passage) => passage.id),
      situation: (research.issues[0]?.situation ?? "").slice(0, 300),
      sourceRequests: research.sourceRequests,
      ...(passages.length === 0 ? { skipped: research.skipped ?? "nothing answered" } : {}),
    };
  } catch (error) {
    console.error("[sourcedQuestions] research failed; the intake continues without questions.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { passageIds: [], situation: "", sourceRequests: [], skipped: "error" };
  }
}

/**
 * Phase 2: write and check questions from the passages phase 1 found.
 * Always resolves; never throws.
 */
export async function questionsFromPassages(
  input: RetrievalInput,
  passages: readonly Passage[],
  situation: string,
  deps: SourcedQuestionDeps = {},
): Promise<SourcedQuestionsResult> {
  if (passages.length === 0) return empty("nothing answered");
  const work = async (): Promise<SourcedQuestionsResult> => {
    const drafts = parseDrafts(await (deps.write ?? writeWithModel)(input, passages));
    const offered = new Map(passages.map((passage) => [passage.id, passage]));
    const counts = { written: drafts.length, refusedByCode: 0, refusedByChecker: 0 };
    const refusals: string[] = [];
    const seen = new Set<string>();
    const passed: (Draft & { id: string; passage: Passage })[] = [];
    for (const draft of drafts) {
      const passage = offered.get(draft.passageId);
      const rejection = questionRejection(draft, passage) ?? (seen.has(norm(draft.question)) ? "duplicate" : null);
      if (rejection) {
        counts.refusedByCode += 1;
        refusals.push(`code: ${rejection}`);
        continue;
      }
      seen.add(norm(draft.question));
      passed.push({ ...draft, id: `q${passed.length + 1}`, passage: passage! });
      if (passed.length >= MAX_SOURCED_QUESTIONS) break;
    }
    if (passed.length === 0) return { questions: [], skipped: "none passed code checks", counts, refusals, sourceRequests: [] };

    const verdicts = parseVerdicts(
      await (deps.check ?? checkWithModel)(
        checkerSituation(input, situation),
        passed.map(({ id, question, why, passage }) => ({ id, question, why, passage })),
      ),
    );
    const questions: SourcedQuestion[] = [];
    for (const item of passed) {
      const verdict = verdicts.find((candidate) => candidate.id === item.id);
      if (!verdict?.ok) {
        counts.refusedByChecker += 1;
        refusals.push(`check: ${verdict?.problem ?? "no verdict"} -- ${item.question.slice(0, 120)}`);
        continue;
      }
      const source = passageItem(item.passage);
      questions.push({
        id: `sq-${questions.length + 1}`,
        question: item.question.trim(),
        why: item.why.trim(),
        passageId: item.passageId,
        quote: item.quote,
        citation: provisionOf(item.passage).citation,
        ...(source.sourceUrl ? { sourceUrl: source.sourceUrl } : {}),
      });
    }
    return { questions, ...(questions.length === 0 ? { skipped: "none passed the check" } : {}), counts, refusals, sourceRequests: [] };
  };

  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<SourcedQuestionsResult>((resolve) => {
      timer = setTimeout(() => resolve(empty("timeout")), QUESTION_BUDGET_MS);
    });
    const result = await Promise.race([work(), timeout]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (error) {
    console.error("[sourcedQuestions] failed; the intake continues without them.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return empty("error");
  }
}

/**
 * Both phases in one call, for the probe and the suite. The route runs them
 * as two requests so each has a whole request's time (one request ran out of
 * time on 9 of 12 stories when the model was slow, 2026-10-05).
 */
export async function sourcedQuestions(input: RetrievalInput, deps: SourcedQuestionDeps = {}): Promise<SourcedQuestionsResult> {
  const index = deps.research ? null : (deps.researchDeps?.index ?? loadCorpusIndex());
  let passages: Passage[] = [];
  let found: ResearchForQuestions;
  if (deps.research) {
    // A stubbed research hands over its passages directly.
    const research = await deps.research(input).catch(() => null);
    if (!research) return empty("error");
    passages = answeringPassages(research);
    found = {
      passageIds: passages.map((passage) => passage.id),
      situation: research.issues[0]?.situation ?? "",
      sourceRequests: research.sourceRequests,
    };
  } else {
    found = await researchForQuestions(input, deps);
    passages = index ? passagesById(index, found.passageIds) : [];
  }
  if (passages.length === 0) return { ...empty(found.skipped ?? "nothing answered"), sourceRequests: found.sourceRequests };
  const result = await questionsFromPassages(input, passages, found.situation, deps);
  return { ...result, sourceRequests: found.sourceRequests };
}

/** Passages re-read from the index by id (hash-verified); unknown ids are dropped. */
export function passagesById(index: LoadedIndex, ids: readonly string[]): Passage[] {
  return ids
    .slice(0, MAX_PASSAGES_OFFERED)
    .map((id) => readPassage(index, id, 1))
    .filter((passage): passage is Passage => Boolean(passage));
}

// ------------------------------------------------------------ model calls

async function chatJson(system: string, user: string, effort: string): Promise<string> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Part of preparing the analysis, audited as such (the research precedent).
  return withAiCallContext({ callType: "small-claims-analysis" }, async () => {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      ...modelParams("standard", { effort: effort as "low", temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  });
}

function passageBlock(passage: Passage): string {
  return `[${passage.id}] ${provisionOf(passage).citation}\n${passage.text.slice(0, PASSAGE_CHARS)}`;
}

/** What the writer is shown. Exported for the suite. */
export function writingPrompt(input: RetrievalInput, passages: readonly Passage[]): string {
  const who = input.side ? ` The person is the ${input.side === "plaintiff" ? "one bringing the matter" : "one responding to it"}.` : "";
  return `COURT: ${input.courtPath}.${who}\n\nTHEIR ACCOUNT:\n${input.story.slice(0, 6000)}\n\nPASSAGES:\n\n${passages.map(passageBlock).join("\n\n")}`;
}

const COURT_NAMES: Record<string, string> = {
  "small-claims": "Ontario Small Claims Court",
  civil: "Ontario Superior Court of Justice, a civil action or application",
  family: "Ontario family court",
};

/**
 * The checker's SITUATION line: the court and side, then research's neutral
 * line. Without the court (2026-10-06 coverage run) it refused every Small
 * Claims rule on a trial-preparation story as "applicability not
 * established". Never the story. Pure; exported for the suite.
 */
export function checkerSituation(input: Pick<RetrievalInput, "courtPath" | "side">, situation: string): string {
  const court = COURT_NAMES[input.courtPath] ?? input.courtPath;
  const side = input.side ? ` The person is the ${input.side === "plaintiff" ? "one bringing the matter" : "one responding to it"}.` : "";
  return `${court}.${side}${situation ? ` ${situation}` : ""}`;
}

/** What the checker is shown -- never the story. Exported for the suite. */
export function checkingPrompt(
  situation: string,
  items: readonly { id: string; question: string; why: string; passage: Passage }[],
): string {
  return `COURT AND SITUATION: ${situation || "(not given)"}\n\n${items
    .map((item) => `ITEM ${item.id}\nPASSAGE: ${passageBlock(item.passage)}\nWHY: ${item.why}\nQUESTION: ${item.question}`)
    .join("\n\n---\n\n")}`;
}

export async function writeWithModel(input: RetrievalInput, passages: readonly Passage[]): Promise<unknown> {
  return chatJson(WRITE_SYSTEM_PROMPT, writingPrompt(input, passages), process.env.AI_EFFORT_SOURCED_QUESTIONS || "low");
}

export async function checkWithModel(
  situation: string,
  items: readonly { id: string; question: string; why: string; passage: Passage }[],
): Promise<unknown> {
  return chatJson(CHECK_SYSTEM_PROMPT, checkingPrompt(situation, items), process.env.AI_EFFORT_SOURCED_QUESTIONS_CHECK || "low");
}
