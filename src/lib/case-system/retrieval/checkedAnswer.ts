/**
 * A checked answer: the site answers a person's question (or their story) the
 * way a lawyer would, then checks every statement against the official text
 * before showing it (site owner, 2026-10-07: "answer, but make sure the answer
 * is correct before saying it").
 *
 *   1. DRAFT. The model answers from its own knowledge, applying the law to
 *      the person's facts, and names the Act and section behind each
 *      statement ("Consumer Protection Act, 2002, s. 43 (1)").
 *   2. FETCH. Code pulls each named section from the library
 *      (namedProvisions), and searches the library with each statement, so the
 *      checker reads the real text even when a citation is slightly off.
 *   3. CHECK. A separate call for each statement, all side by side, sees only
 *      that statement and its passages. It must point to the passage and copy the words that
 *      support it -- or, where the statement is wrong, give a corrected one
 *      the passage does support (the one chance to correct it).
 *   4. CODE DECIDES. A statement is shown only if the quoted words really are
 *      in that passage (quoteMatch.ts, the same check every quote on the site
 *      passes), every number in it is in the passage or the person's own
 *      words, and it neither predicts nor grades their case. Anything else is
 *      not shown; its topic is listed as "could not confirm".
 *
 * So every legal statement a person sees carries the official words that
 * support it (CLAUDE.md s. 2), and nothing unchecked gets through. Never
 * judges a case (s. 3); the answer is a suggestion, not a decision (s. 4).
 *
 * Costs one draft call, one embedding call and one small check call per
 * statement. At the time limit, statements already checked are shown and the
 * rest are listed as not confirmed. Never throws: on any failure
 * it answers { status: "unavailable" } and callers fall back to what they
 * showed before.
 */

import type { CheckedAnswerView } from "../intelligence/intelligenceTypes";
import { hasLegalContent } from "../intelligence/groundedCognition";
import { MIN_QUOTE_CHARS, normalizeQuoteText, quoteAppearsIn } from "../intelligence/quoteMatch";
import { loadCorpusIndex, readPassage, searchIndex, type LoadedIndex, type Passage } from "./corpusIndex";
import { numberNotInSource, outcomeTermNotInProvision } from "./explainProvision";
import { namedProvisions } from "./namedProvisions";
import { excludedForCourt, followCrossReferences, passageItem, type RetrievalCourt } from "./storyRetrieval";

export type CheckedAnswerInput = {
  question: string;
  /** The person's story, in their words. */
  story?: string;
  /** What the case record already holds, as plain lines ("Served: 2026-09-20"). */
  facts?: string;
  courtPath: RetrievalCourt;
  side?: "plaintiff" | "defendant";
};

export type AnswerSource = { passageId: string; citation: string; sourceUrl: string; quote: string; kind: "legislation" | "guidance" | "decision" };
export type AnswerStatement = { text: string; sources: AnswerSource[] };

export type CheckedAnswer = {
  status: "answered" | "not-confirmed" | "outside-scope" | "unavailable";
  /** Every statement shown, each with the official words that support it. */
  statements: AnswerStatement[];
  /** Topics the site could not confirm against the law, so did not state. */
  notConfirmed: string[];
  /** The person asked for a prediction or a grade of their case; the site declined and gave the law instead. */
  declinedToJudge: boolean;
  /** Laws named in the draft that the library does not hold (for source requests). */
  missingLaw: string[];
};

// ---------------------------------------------------------------- limits

export const MAX_STATEMENTS = 10;
const MAX_CITES_PER_STATEMENT = 3;
/** Search hits read for each statement, on top of the sections it names. */
const SEARCH_PER_STATEMENT = 4;
/** The most passages one statement's check reads. */
const PASSAGES_PER_STATEMENT = 10;
/** Sections other statements name, added to each check so it sees the whole answer's law. */
const SHARED_PASSAGES = 6;
const PASSAGE_CHARS = 1800;
const STATEMENT_MAX = 600;

export { ANSWER_BOUNDARY, DECLINE_TO_JUDGE, OUTSIDE_SCOPE } from "./checkedAnswerText";

// ---------------------------------------------------------------- prompts

export const DRAFT_SYSTEM_PROMPT = `You are an experienced Ontario lawyer answering a person who is representing themselves. Answer their question directly, the way you would guide a client: apply the law to their facts, say which court, process, form, rule and time limit applies, and what the next step is.

Return JSON:
{"scope": "ontario" | "outside",
 "asksForPrediction": boolean,
 "statements": [{"text": string, "cites": [string]}]}

Rules:
- scope "outside" only when the question is about law other than Ontario law or federal law applied in Ontario courts (e.g. another province or country, immigration, federal income tax, patents). Then return no statements.
- asksForPrediction is true when they ask whether they will win, how strong their case is, their chances, or what a judge will decide. Never answer that; answer the law that governs it instead.
- Up to ${MAX_STATEMENTS} statements, most important first. Each is one or two plain sentences a non-lawyer understands.
- Every statement of law cites the exact Ontario or federal statute or regulation and section, or the court rule, that supports it: "Limitations Act, 2002, s. 4", "Rules of the Small Claims Court, r. 9.01 (1)", "Family Law Act, s. 7 (3)". Give the full name of the Act. A leading court decision may be cited by name and neutral citation.
- Never say or suggest whether they will win, whether their case is strong or weak, or their chances. Never say what a judge will think.
- Do not compute calendar dates. State the period and what starts it ("within 20 days after being served").
- Never invent a section number. If unsure of the number, cite the Act and describe the rule.
- When the law gives the person more than one route (for example, sue in the Superior Court, or stay in Small Claims and give up the amount over the limit), name each route; never present one route as the only one.
- Answer every part of the question, including the conditions and how amounts or thresholds are measured.`;

export const CHECK_SYSTEM_PROMPT = `You check statements of Ontario law against the official text. You are given numbered PASSAGES (the official text) and STATEMENTS. Use only the passages; ignore what you otherwise know.

For each statement return:
{"n": number, "verdict": "supported" | "corrected" | "unsupported",
 "passage": "<passage id that supports it>", "quote": "<words copied exactly from that passage that support it, at least 6 words>",
 "corrected": "<only if verdict is corrected: the statement rewritten so the passage supports it>",
 "topic": "<a few words naming what the statement is about>"}

- "supported": the passage says what the statement says, including every number, period and condition.
- "corrected": the statement is wrong or overstated, but the passage supports a corrected version. Give it, in the same plain style, and quote the words that support the corrected version.
- "unsupported": no passage supports the statement or a corrected version of it.
- Applying the law to the person's facts is fine when the passage states the rule being applied.
- A statement may need two passages; then give the main one and put the second in "passage2" and "quote2".
- Never write about the passages themselves ("the passages do not establish...", "the supplied text does not say..."). If part of a statement is not supported, leave that part out of the corrected version; never add doubts, caveats or "if" clauses the statement did not have.
- The passages state the law; the person's situation gives the facts. A passage not repeating the person's facts is no reason to doubt a statement that applies its rule to them.
Return JSON: {"results": [ ... ]}`;

// ---------------------------------------------------------------- parsing (pure)

type Draft = { scope: "ontario" | "outside"; asksForPrediction: boolean; statements: { text: string; cites: string[] }[] };

const str = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function parseDraft(raw: string): Draft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const statements = (Array.isArray(record.statements) ? record.statements : [])
    .map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      return {
        text: str(value.text, STATEMENT_MAX),
        cites: (Array.isArray(value.cites) ? value.cites : []).map((cite) => str(cite, 200)).filter(Boolean).slice(0, MAX_CITES_PER_STATEMENT),
      };
    })
    .filter((statement) => statement.text.length >= 10)
    .slice(0, MAX_STATEMENTS);
  return { scope: record.scope === "outside" ? "outside" : "ontario", asksForPrediction: record.asksForPrediction === true, statements };
}

export type CheckResult = {
  n: number;
  verdict: "supported" | "corrected" | "unsupported";
  passage: string;
  quote: string;
  passage2?: string;
  quote2?: string;
  corrected?: string;
  topic: string;
};

export function parseCheck(raw: string): CheckResult[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const results = (parsed as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return null;
  return results
    .map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      const verdict = value.verdict === "supported" || value.verdict === "corrected" ? value.verdict : "unsupported";
      return {
        n: Number(value.n),
        verdict,
        passage: str(value.passage, 200),
        quote: str(value.quote, 1200),
        passage2: str(value.passage2, 200) || undefined,
        quote2: str(value.quote2, 1200) || undefined,
        corrected: str(value.corrected, STATEMENT_MAX) || undefined,
        topic: str(value.topic, 120),
      } as CheckResult;
    })
    .filter((result) => Number.isInteger(result.n));
}

// ---------------------------------------------------------------- the code check (pure)

/**
 * Why a statement must not be shown, or null when code confirms it: its quote
 * is in its passage, every number is in the passage or the person's own
 * words, and it does not predict or grade the case.
 */
export function statementRejection(statement: string, support: { passage: Passage; quote: string }[], personsWords: string): string | null {
  if (support.length === 0) return "no passage";
  for (const { passage, quote } of support) {
    if (normalizeQuoteText(quote).length < MIN_QUOTE_CHARS) return "quote too short to prove anything";
    if (!quoteAppearsIn(quote, passage.text)) return `quote not in ${passage.id}`;
  }
  const passageText = support
    .map(({ passage }) => `${passage.source.title ?? ""} ${passage.source.citation ?? ""} ${passage.pinpoint ?? ""} ${passage.heading ?? ""}\n${passage.text}`)
    .join("\n");
  const stray = numberNotInSource(statement, `${passageText}\n${personsWords}`);
  if (stray) return `number "${stray}" is not in the law or the person's words`;
  const term = outcomeTermNotInProvision(statement, passageText);
  if (term) return `outcome wording "${term}"`;
  if (/\b(?:you|they|she|he) (?:will|would) (?:likely |probably )?(?:win|lose|succeed|fail)\b|\b(?:your|their) chances\b|\b(?:strong|weak) (?:case|claim)\b/i.test(statement)) {
    return "predicts or grades the case";
  }
  return null;
}

/**
 * Drops sentences that talk about the passages instead of the law ("The
 * supplied passages do not establish..."). A reader cannot use them, and they
 * contradicted statements the rest of the answer had proved (2026-10-07 exam,
 * 3 of 18 questions graded wrong for it). Dropping a sentence only removes
 * words, so what is left is still supported by the same quote.
 */
const PASSAGE_TALK = /\b(?:(?:supplied|provided|given|these|those|the)\s+(?:passages?|text|excerpts?)|passages?\s+(?:do|does|did)\s+not)\b/i;
export function withoutTalkAboutPassages(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text];
  return sentences.filter((sentence) => !PASSAGE_TALK.test(sentence)).join("").trim();
}

// ---------------------------------------------------------------- dependencies

export type CheckedAnswerDeps = {
  index?: LoadedIndex | null;
  draft?: (input: CheckedAnswerInput) => Promise<string>;
  check?: (statements: string[], passages: Passage[], input: CheckedAnswerInput) => Promise<string>;
  embed?: (texts: string[], model: string, dimensions: number) => Promise<number[][]>;
  timeoutMs?: number;
};

const UNAVAILABLE: CheckedAnswer = { status: "unavailable", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] };

function personsWordsOf(input: CheckedAnswerInput): string {
  return `${input.question}\n${input.story ?? ""}\n${input.facts ?? ""}`;
}

/**
 * Passages the checker reads for each statement: the sections it names first,
 * then what a search with that statement finds, then the sections those point
 * to. Each statement gets its own short list, so each check is small and the
 * checks run side by side (2026-10-07: one check over every passage at once
 * ran past the time limit on 5 of 18 exam questions).
 */
async function gatherPassages(
  index: LoadedIndex,
  input: CheckedAnswerInput,
  draft: Draft,
  embed: NonNullable<CheckedAnswerDeps["embed"]>,
): Promise<{ perStatement: Passage[][]; missingLaw: string[] }> {
  const missingLaw: string[] = [];
  const queries = draft.statements.map((statement) => `${statement.text} ${statement.cites.join("; ")}`.slice(0, 500));
  const vectors = queries.length ? await embed(queries, index.meta.model, index.meta.dimensions) : [];
  // The sections every statement names, so each check also sees the rules the
  // rest of the answer rests on (2026-10-07 exam: a check that saw only its own
  // statement's passages doubted rules another statement had proved).
  const namedByAll = draft.statements.flatMap((statement) => statement.cites.flatMap((cite) => namedProvisions(index, cite, 0.9)));
  const perStatement = draft.statements.map((statement, i) => {
    const byId = new Map<string, Passage>();
    const add = (passage: Passage) => {
      if (!byId.has(passage.id) && !excludedForCourt(input.courtPath, passage.sourceId)) byId.set(passage.id, passage);
    };
    for (const cite of statement.cites) {
      const found = namedProvisions(index, cite, 0.9);
      if (found.length === 0) missingLaw.push(cite);
      for (const passage of found) add(passage);
    }
    if (vectors[i]) {
      const hits = searchIndex(index, [vectors[i]], {
        perQuery: SEARCH_PER_STATEMENT,
        total: SEARCH_PER_STATEMENT,
        excludeSource: (sourceId) => excludedForCourt(input.courtPath, sourceId),
      });
      const found = hits.map((hit) => readPassage(index, hit.id, hit.score)).filter((passage): passage is Passage => Boolean(passage));
      for (const passage of found) add(passage);
      for (const passage of followCrossReferences(index, found)) add(passage);
    }
    const own = [...byId.values()].slice(0, PASSAGES_PER_STATEMENT);
    for (const passage of namedByAll) if (byId.size < PASSAGES_PER_STATEMENT + SHARED_PASSAGES) add(passage);
    return [...own, ...[...byId.values()].filter((passage) => !own.includes(passage))].slice(0, PASSAGES_PER_STATEMENT + SHARED_PASSAGES);
  });
  return { perStatement, missingLaw: [...new Set(missingLaw)] };
}

/** Resolves to `fallback` when `promise` has not settled by `deadline` (ms since epoch). */
function byDeadline<T>(promise: Promise<T>, deadline: number, fallback: T): Promise<T> {
  const left = deadline - Date.now();
  if (left <= 0) return Promise.resolve(fallback);
  return Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), left).unref?.())]);
}

function sourceOf(passage: Passage, quote: string): AnswerSource {
  const item = passageItem(passage);
  return {
    passageId: passage.id,
    citation: item.citation || item.label,
    sourceUrl: item.sourceUrl,
    quote: quote.trim(),
    kind: item.kind === "decision" ? "decision" : item.kind === "guidance" ? "guidance" : "legislation",
  };
}

// ---------------------------------------------------------------- the pipeline

export async function checkedAnswer(input: CheckedAnswerInput, deps: CheckedAnswerDeps = {}): Promise<CheckedAnswer> {
  const deadline = Date.now() + (deps.timeoutMs ?? 50_000);
  const work = (async (): Promise<CheckedAnswer> => {
    const index = deps.index === undefined ? loadCorpusIndex() : deps.index;
    if (!index || !input.question.trim()) return UNAVAILABLE;

    const draftText = await byDeadline((deps.draft ?? draftWithModel)(input), deadline, null);
    const draft = draftText === null ? null : parseDraft(draftText);
    if (!draft) return UNAVAILABLE;
    if (draft.scope === "outside") {
      return { status: "outside-scope", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] };
    }
    if (draft.statements.length === 0) return { ...UNAVAILABLE, declinedToJudge: draft.asksForPrediction };

    const gathered = await byDeadline(gatherPassages(index, input, draft, deps.embed ?? (await defaultEmbed())), deadline, null);
    if (!gathered) return UNAVAILABLE;
    const { perStatement, missingLaw } = gathered;
    const texts = draft.statements.map((statement) => statement.text);
    const checkOne = deps.check ?? checkWithModel;

    // One check per statement, side by side. A statement whose check has not
    // finished by the time limit is listed as not confirmed; the rest are shown.
    const results = await Promise.all(
      texts.map(async (text, i) => {
        const passages = perStatement[i];
        if (!passages.length) return null;
        const reply = await byDeadline(checkOne([text], passages, input), deadline, "");
        const parsed = reply ? parseCheck(reply) : null;
        const result = parsed?.find((item) => item.n === 1) ?? null;
        return result ? { result, byId: new Map(passages.map((passage) => [passage.id, passage])) } : null;
      }),
    );

    const personsWords = personsWordsOf(input);
    const statements: AnswerStatement[] = [];
    const notConfirmed: string[] = [];
    texts.forEach((text, i) => {
      const checked = results[i];
      const result = checked?.result;
      const topic = result?.topic || text.split(/[.;:]/)[0].slice(0, 80);
      if (!checked || !result || result.verdict === "unsupported") {
        notConfirmed.push(topic);
        return;
      }
      const shown = withoutTalkAboutPassages(result.verdict === "corrected" ? (result.corrected ?? "") : text);
      const support = [
        { passage: checked.byId.get(result.passage), quote: result.quote },
        ...(result.passage2 && result.quote2 ? [{ passage: checked.byId.get(result.passage2), quote: result.quote2 }] : []),
      ].filter((entry): entry is { passage: Passage; quote: string } => Boolean(entry.passage));
      const why = shown ? statementRejection(shown, support, personsWords) : "no corrected statement";
      if (why) {
        notConfirmed.push(topic);
        return;
      }
      statements.push({ text: shown, sources: support.map(({ passage, quote }) => sourceOf(passage, quote)) });
    });

    // A statement with no legal content would not need a source; one with
    // legal content always has one by now. Both are fine; nothing else is shown.
    return {
      status: statements.length ? "answered" : "not-confirmed",
      statements,
      notConfirmed: [...new Set(notConfirmed)],
      declinedToJudge: draft.asksForPrediction,
      missingLaw,
    };
  })().catch(() => UNAVAILABLE);

  // A last guard: whatever happens above, the caller hears back shortly after the limit.
  return byDeadline(work, deadline + 1_000, UNAVAILABLE);
}

/** What the screens receive: everything but the internal list of missing laws. */
export function checkedAnswerView(answer: CheckedAnswer): CheckedAnswerView {
  return { status: answer.status, statements: answer.statements, notConfirmed: answer.notConfirmed, declinedToJudge: answer.declinedToJudge };
}

/** The question asked of a person's story on their case page. */
export const STORY_QUESTION =
  "Based on what I have told you, what law applies to my situation, what do I have to show, and what is my next step, including any time limit?";

/** True when a line carries law and so must have come through the check (used by the suite). */
export const needsSource = hasLegalContent;

// ---------------------------------------------------------------- the model calls

function draftUserPrompt(input: CheckedAnswerInput): string {
  return [
    `COURT: ${input.courtPath === "small-claims" ? "Ontario Small Claims Court" : input.courtPath === "family" ? "Ontario family court" : "Ontario Superior Court of Justice (civil)"}`,
    input.side ? `THEY ARE: ${input.side === "plaintiff" ? "the person bringing the case" : "the person responding to it"}` : "",
    input.facts ? `WHAT THEIR CASE RECORD HOLDS:\n${input.facts.slice(0, 2000)}` : "",
    input.story ? `THEIR STORY, IN THEIR WORDS:\n${input.story.slice(0, 6000)}` : "",
    `THEIR QUESTION: ${input.question.slice(0, 1000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function checkUserPrompt(statements: string[], passages: Passage[], input: CheckedAnswerInput): string {
  const passageBlock = passages
    .map((passage) => {
      const item = passageItem(passage);
      return `[${passage.id}] ${item.citation || item.label}\n${passage.text.slice(0, PASSAGE_CHARS)}`;
    })
    .join("\n\n");
  return [
    `THE PERSON'S SITUATION (for applying the law; not a source of law):\n${`${input.story ?? ""}\n${input.facts ?? ""}`.trim().slice(0, 2000) || "(not given)"}`,
    `QUESTION: ${input.question.slice(0, 1000)}`,
    `PASSAGES:\n${passageBlock}`,
    `STATEMENTS:\n${statements.map((text, i) => `${i + 1}. ${text}`).join("\n")}`,
  ].join("\n\n");
}

async function chatJson(system: string, user: string, effort: string): Promise<string> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Audited as the analysis it is part of: the call type the retrieval and
  // explanation calls already use, so no migration is needed.
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

export async function draftWithModel(input: CheckedAnswerInput): Promise<string> {
  return chatJson(DRAFT_SYSTEM_PROMPT, draftUserPrompt(input), process.env.AI_EFFORT_ANSWER || "low");
}

export async function checkWithModel(statements: string[], passages: Passage[], input: CheckedAnswerInput): Promise<string> {
  return chatJson(CHECK_SYSTEM_PROMPT, checkUserPrompt(statements, passages, input), process.env.AI_EFFORT_ANSWER_CHECK || "medium");
}

async function defaultEmbed() {
  const { embedWithModel } = await import("./storyRetrieval");
  return embedWithModel;
}
