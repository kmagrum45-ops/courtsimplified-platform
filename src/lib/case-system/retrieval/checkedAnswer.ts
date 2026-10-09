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
import { numbersStated, numbersUsed, outcomeTermNotInProvision } from "./explainProvision";
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
  /** Internal: why each topic was not confirmed (for the law exam report; never shown to a person). */
  notConfirmedWhy?: { topic: string; why: string }[];
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
/** Search hits read when a statement is checked a second time. */
const SEARCH_ON_RETRY = 12;
/** A second check is tried only with at least this much time left. */
const RETRY_NEEDS_MS = 15_000;
/** Time budgets from which the answer is thorough (fuller draft, second look). */
export const THOROUGH_FROM_MS = 90_000;
/**
 * How long a person's question may take to answer, thoroughly (site owner,
 * 2026-10-07: "if it needs to take time to be accurate, then do it"). Inside
 * Vercel's 300-second function limit with room for the fallback research.
 */
export const ANSWER_TIME_MS = 150_000;
/** The same for the story answer on the case page, which runs beside the analysis. */
export const STORY_ANSWER_TIME_MS = 120_000;
/** The second look runs only with at least this much time left. */
const REVIEW_NEEDS_MS = 40_000;
/** The most passages the second look reads, and the most points it may add. */
const REVIEW_PASSAGES = 32;
const MAX_REVIEW_ADDITIONS = 8;
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
- asksForPrediction is true when they ask whether they will win, how strong their case is, their chances, whether their claim is worth bringing, how much a court will award them, or what a judge will decide. Never answer that; answer the law that governs it instead.
- Up to ${MAX_STATEMENTS} statements, most important first. Each is one or two plain sentences a non-lawyer understands.
- Every statement of law cites the exact Ontario or federal statute or regulation and section, or the court rule, that supports it: "Limitations Act, 2002, s. 4", "Rules of the Small Claims Court, r. 9.01 (1)", "Family Law Act, s. 7 (3)". Give the full name of the Act. A leading court decision may be cited by name and neutral citation.
- Never say or suggest whether they will win, whether their case is strong or weak, or their chances. Never say what a judge will think.
- Do not compute calendar dates. State the period and what starts it ("within 20 days after being served").
- Never invent a section number. If unsure of the number, cite the Act and describe the rule.
- When the law gives the person more than one route (for example, sue in the Superior Court, or stay in Small Claims and give up the amount over the limit), name each route; never present one route as the only one.
- Answer every part of the question, including the conditions and how amounts or thresholds are measured.
- Use the figures, forms and procedures in force now, and the ones that fit this person's situation (the kind of tenancy, claim, court and party). Where the law gives a percentage or formula, work it out with their figures and say how.
- Be complete the way a careful lawyer is: state the basic rule a section starts from (for example, that a will must be in writing), then its conditions, exceptions, how amounts are calculated and capped, deadlines and who must prove what, then the form or step and where it is filed. A point left out is as harmful as a wrong one.`;

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
- When a passage gives different periods, amounts or steps for different situations (clauses (a), (b)... such as "by the day or week" and "in all other cases"), the statement must use the one for the person's situation; a statement using another is wrong and must be corrected.
- A rule that depends on a condition (the kind of tenancy, claim, party, amount, date or procedure) supports a statement only if that condition fits the person's situation; otherwise correct the statement to the rule that does fit, or mark it unsupported. Never accept an old or repealed figure.
- The passages state the law; the person's situation gives the facts. A passage not repeating the person's facts is no reason to doubt a statement that applies its rule to them.
Return JSON: {"results": [ ... ]}`;

// ---------------------------------------------------------------- parsing (pure)

export type Draft = { scope: "ontario" | "outside"; asksForPrediction: boolean; statements: { text: string; cites: string[] }[] };

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
/**
 * The first number in `statement` that is neither stated in `source` (the law
 * and the person's words) nor worked out from two numbers stated there by one
 * step of arithmetic: a percentage of an amount, a product, a sum, a
 * difference or a quotient. A lawyer applies the law to the client's figures
 * ("10 per cent of your $90,000 contract is $9,000"); refusing that cost 23
 * statements in the 2026-10-08 exam run. A number with no such basis is still
 * refused. Pure.
 */
export function numberNotStatedOrWorkedOut(statement: string, law: string, personsWords: string): string | null {
  const toNumbers = (text: string) => [...new Set(numbersStated(text))].map(Number).filter((n) => Number.isFinite(n)).slice(0, 120);
  const fromLaw = toNumbers(law);
  const fromPerson = toNumbers(personsWords);
  const stated = [...new Set([...fromLaw, ...fromPerson])];
  const allowed = new Set(stated.map((n) => String(n)));
  // Worked-out figures must start from one of the person's own figures and come
  // to 100 or more (an amount of money): small numbers (days, weeks) are never
  // worked out, so "25 days" where the law says 20 is still refused.
  const keep = (n: number) => {
    if (!Number.isFinite(n) || n < 100) return;
    allowed.add(String(Math.round(n * 100) / 100));
    allowed.add(String(Math.round(n)));
  };
  for (const a of fromPerson) {
    for (const b of stated) {
      keep((a * b) / 100);
      keep(a * b);
      keep(a + b);
      keep(a - b);
      if (b !== 0) keep(a / b);
      keep(a * (1 - b / 100));
    }
  }
  for (const n of numbersUsed(statement)) if (!allowed.has(String(Number(n)))) return n;
  return null;
}

export function statementRejection(statement: string, support: { passage: Passage; quote: string }[], personsWords: string): string | null {
  if (support.length === 0) return "no passage";
  for (const { passage, quote } of support) {
    if (normalizeQuoteText(quote).length < MIN_QUOTE_CHARS) return "quote too short to prove anything";
    if (!quoteAppearsIn(quote, passage.text)) return `quote not in ${passage.id}`;
  }
  const passageText = support
    .map(({ passage }) => `${passage.source.title ?? ""} ${passage.source.citation ?? ""} ${passage.pinpoint ?? ""} ${passage.heading ?? ""}\n${passage.text}`)
    .join("\n");
  const stray = numberNotStatedOrWorkedOut(statement, passageText, personsWords);
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
  // A sentence ends at . ! or ? followed by a space, so "$2.5 million" and
  // "s. 64 (1)" stay whole (2026-10-07 exam: an earlier pattern cut "$2." off
  // and showed "5 million" as the threshold).
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  return sentences.filter((sentence) => !PASSAGE_TALK.test(sentence)).join(" ").trim();
}

/** Share of words two statements have in common (Jaccard on words of 3+ letters). Pure. */
export function overlap(a: string, b: string): number {
  const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const word of x) if (y.has(word)) shared += 1;
  return shared / (x.size + y.size - shared);
}
/** Two statements this alike make the same point. */
const SAME_POINT = 0.6;
/** An unconfirmed point this alike to a confirmed one is already covered. */
const COVERED = 0.5;
/** The most statements checked from two merged drafts. */
const MAX_MERGED_STATEMENTS = 16;

/**
 * Two independent drafts, merged: the first draft's statements, then the
 * second's that make a point the first did not. Outside scope only if every
 * draft says so; a prediction request if either sees one. Pure.
 */
export function mergeDrafts(drafts: Draft[]): Draft | null {
  if (!drafts.length) return null;
  const inScope = drafts.filter((item) => item.scope !== "outside");
  if (!inScope.length) return drafts[0];
  const statements: Draft["statements"] = [];
  for (const item of inScope) {
    for (const statement of item.statements) {
      if (!statements.some((existing) => overlap(existing.text, statement.text) >= SAME_POINT)) statements.push(statement);
    }
  }
  return { scope: "ontario", asksForPrediction: drafts.some((item) => item.asksForPrediction), statements: statements.slice(0, MAX_MERGED_STATEMENTS) };
}

/** The second look's doubts: statement numbers (1-based) and why, within range. Pure. */
export function parseDoubts(raw: string, count: number): { n: number; why: string }[] {
  try {
    const parsed = JSON.parse(raw) as { doubtful?: unknown };
    if (!Array.isArray(parsed.doubtful)) return [];
    return parsed.doubtful
      .map((item) => item as { n?: unknown; why?: unknown })
      .filter((item) => typeof item.n === "number" && item.n >= 1 && item.n <= count && Number.isInteger(item.n))
      .map((item) => ({ n: item.n as number, why: String(item.why ?? "").replace(/\s+/g, " ").slice(0, 300) }))
      .slice(0, 6);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- dependencies

export type CheckedAnswerDeps = {
  index?: LoadedIndex | null;
  draft?: (input: CheckedAnswerInput, effort?: string) => Promise<string>;
  /** The second look: names what a complete answer still needs, as statements with cites. */
  review?: (input: CheckedAnswerInput, confirmed: string[], passages: Passage[]) => Promise<string>;
  /** Fuller draft and a second look. Default: on when timeoutMs is at least THOROUGH_FROM_MS. */
  thorough?: boolean;
  check?: (statements: string[], passages: Passage[], input: CheckedAnswerInput, hint?: string) => Promise<string>;
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
): Promise<{ passagesFor: (i: number, searchCount: number) => Passage[]; missingLaw: string[] }> {
  const missingLaw: string[] = [];
  const queries = draft.statements.map((statement) => `${statement.text} ${statement.cites.join("; ")}`.slice(0, 500));
  const vectors = queries.length ? await embed(queries, index.meta.model, index.meta.dimensions) : [];
  // The sections every statement names, so each check also sees the rules the
  // rest of the answer rests on (2026-10-07 exam: a check that saw only its own
  // statement's passages doubted rules another statement had proved).
  const namedByAll = draft.statements.flatMap((statement) => statement.cites.flatMap((cite) => namedProvisions(index, cite, 0.9)));
  const named = draft.statements.map((statement) =>
    statement.cites.flatMap((cite) => {
      const found = namedProvisions(index, cite, 0.9);
      if (found.length === 0) missingLaw.push(cite);
      return found;
    }),
  );
  const passagesFor = (i: number, searchCount: number): Passage[] => {
    const byId = new Map<string, Passage>();
    const add = (passage: Passage) => {
      if (!byId.has(passage.id) && !excludedForCourt(input.courtPath, passage.sourceId)) byId.set(passage.id, passage);
    };
    for (const passage of named[i] ?? []) add(passage);
    if (vectors[i]) {
      const hits = searchIndex(index, [vectors[i]], {
        perQuery: searchCount,
        total: searchCount,
        excludeSource: (sourceId) => excludedForCourt(input.courtPath, sourceId),
      });
      const found = hits.map((hit) => readPassage(index, hit.id, hit.score)).filter((passage): passage is Passage => Boolean(passage));
      for (const passage of found) add(passage);
      for (const passage of followCrossReferences(index, found)) add(passage);
    }
    const ownLimit = Math.max(PASSAGES_PER_STATEMENT, searchCount + (named[i]?.length ?? 0));
    const own = [...byId.values()].slice(0, ownLimit);
    for (const passage of namedByAll) if (byId.size < ownLimit + SHARED_PASSAGES) add(passage);
    return [...own, ...[...byId.values()].filter((passage) => !own.includes(passage))].slice(0, ownLimit + SHARED_PASSAGES);
  };
  return { passagesFor, missingLaw: [...new Set(missingLaw)] };
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
  const timeoutMs = deps.timeoutMs ?? 50_000;
  const deadline = Date.now() + timeoutMs;
  // Thorough when there is time for it: a fuller first draft and a second look.
  const thorough = deps.thorough ?? timeoutMs >= THOROUGH_FROM_MS;
  const work = (async (): Promise<CheckedAnswer> => {
    const index = deps.index === undefined ? loadCorpusIndex() : deps.index;
    if (!index || !input.question.trim()) return UNAVAILABLE;

    // CONSISTENCY (2026-10-08 exam: the same question came back complete on one
    // run and missing a point on the next). When thorough, two drafts are
    // written independently, side by side, and merged; every statement in
    // either is checked, so a point one draft misses the other can supply.
    const drafting = (deps.draft ?? draftWithModel);
    const draftTexts = await Promise.all(
      (thorough ? [0, 1] : [0]).map(() => byDeadline(drafting(input, thorough ? "medium" : undefined), deadline, null)),
    );
    const drafts = draftTexts.map((text) => (text === null ? null : parseDraft(text))).filter((item): item is Draft => Boolean(item));
    const draft = mergeDrafts(drafts);
    if (!draft) return UNAVAILABLE;
    if (draft.scope === "outside") {
      return { status: "outside-scope", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] };
    }
    if (draft.statements.length === 0) return { ...UNAVAILABLE, declinedToJudge: draft.asksForPrediction };

    const embed = deps.embed ?? (await defaultEmbed());
    const checkOne = deps.check ?? checkWithModel;
    const personsWords = personsWordsOf(input);
    type Judged = { statement: AnswerStatement; topic: string; passages: Passage[] } | { why: string; topic: string; text?: string };

    /** Checks a set of drafted statements, each on its own, side by side. */
    const checkAll = async (drafted: Draft, hints: (string | undefined)[] = []): Promise<{ judged: Judged[]; missingLaw: string[] } | null> => {
      const gathered = await byDeadline(gatherPassages(index, input, drafted, embed), deadline, null);
      if (!gathered) return null;
      const { passagesFor } = gathered;
      const texts = drafted.statements.map((statement) => statement.text);
      const judge = async (i: number, searchCount: number, hint?: string): Promise<Judged> => {
        const text = texts[i];
        const fallbackTopic = text.split(/[.;:]/)[0].slice(0, 80);
        const passages = passagesFor(i, searchCount);
        const failed = (why: string, topic = fallbackTopic): Judged => ({ why, topic, text });
        if (!passages.length) return failed("no passage found");
        const reply = await byDeadline(checkOne([text], passages, input, hint), deadline, "");
        if (!reply) return failed("the check did not finish");
        const result = parseCheck(reply)?.find((item) => item.n === 1) ?? null;
        const topic = result?.topic || fallbackTopic;
        if (!result) return failed("the check gave no result", topic);
        if (result.verdict === "unsupported") return failed("the checker found no passage that supports it", topic);
        const byId = new Map(passages.map((passage) => [passage.id, passage]));
        const shown = withoutTalkAboutPassages(result.verdict === "corrected" ? (result.corrected ?? "") : text);
        const support = [
          { passage: byId.get(result.passage), quote: result.quote },
          ...(result.passage2 && result.quote2 ? [{ passage: byId.get(result.passage2), quote: result.quote2 }] : []),
        ].filter((entry): entry is { passage: Passage; quote: string } => Boolean(entry.passage));
        const why = shown ? statementRejection(shown, support, personsWords) : "no corrected statement";
        if (why) return failed(`${why} (quoted: "${result.quote.slice(0, 120)}")`, topic);
        return { statement: { text: shown, sources: support.map(({ passage, quote }) => sourceOf(passage, quote)) }, topic, passages };
      };
      // A statement that fails is checked once more, against a wider search
      // and told why it failed, if time allows (2026-10-07 exam: most lost
      // points were true statements the first check could not confirm).
      const judged = await Promise.all(
        texts.map(async (_text, i) => {
          const first = await judge(i, SEARCH_PER_STATEMENT, hints[i]);
          if ("statement" in first || deadline - Date.now() < RETRY_NEEDS_MS) return first;
          const hint = `${hints[i] ? `${hints[i]} ` : ""}An earlier check of this statement failed: ${first.why}. Look again across all the passages. Copy the supporting words exactly, character for character. If only part of the statement is supported, give the supported part as the corrected statement.`;
          const second = await judge(i, SEARCH_ON_RETRY, hint);
          return "statement" in second ? second : { ...second, why: `${first.why}; then ${second.why}` };
        }),
      );
      return { judged, missingLaw: gathered.missingLaw };
    };

    const firstRound = await checkAll(draft);
    if (!firstRound) return UNAVAILABLE;
    const judged = [...firstRound.judged];
    const missingLaw = [...firstRound.missingLaw];

    // THE SECOND LOOK (2026-10-07, site owner: "if it needs to take time to be
    // accurate, then do it"). Most exam points lost were answers that were
    // right but left something out. With time left, a separate review reads
    // the question, the confirmed statements and the law they rest on, and
    // names what a complete answer still needs; each point it adds is checked
    // exactly like the first ones before it can be shown.
    if (thorough && deadline - Date.now() > REVIEW_NEEDS_MS) {
      const confirmed = judged.flatMap((item) => ("statement" in item ? [item] : []));
      // What the second look reads, the way a lawyer reads around a section:
      // the passages the answer rests on, then the provisions on either side of
      // each (where the exceptions, the appeal route and the next step usually
      // are), then what a search with the question itself finds (2026-10-08
      // exam: most remaining misses were a point in a neighbouring section).
      const lawRead = new Map<string, Passage>();
      const addRead = (passage: Passage | null | undefined) => {
        if (passage && lawRead.size < REVIEW_PASSAGES && !lawRead.has(passage.id) && !excludedForCourt(input.courtPath, passage.sourceId)) lawRead.set(passage.id, passage);
      };
      const cited = confirmed.flatMap((item) => item.statement.sources.map((source) => item.passages.find((passage) => passage.id === source.passageId)));
      for (const passage of cited) addRead(passage);
      for (const passage of cited) {
        if (!passage) continue;
        const at = passage.id.lastIndexOf(":");
        const n = Number(passage.id.slice(at + 1));
        if (!Number.isInteger(n)) continue;
        for (const near of [n - 1, n + 1]) addRead(readPassage(index, `${passage.id.slice(0, at)}:${near}`, 0.5));
      }
      try {
        const [vector] = await embed([input.question.slice(0, 500)], index.meta.model, index.meta.dimensions);
        const hits = searchIndex(index, [vector], { perQuery: 8, total: 8, excludeSource: (sourceId) => excludedForCourt(input.courtPath, sourceId) });
        for (const hit of hits) addRead(readPassage(index, hit.id, hit.score));
      } catch {
        // The second look still runs on what the answer rests on.
      }
      const reviewText = await byDeadline(
        (deps.review ?? reviewWithModel)(input, confirmed.map((item) => item.statement.text), [...lawRead.values()]),
        deadline,
        null,
      );
      const additions = reviewText === null ? null : parseDraft(reviewText.replace(/"missing"\s*:/, '"statements":'));
      // Statements the reviewer says apply the wrong rule to these facts are
      // checked again, told the reviewer's reason; one that fails is removed.
      const doubts = reviewText === null ? [] : parseDoubts(reviewText, confirmed.length);
      if (doubts.length) {
        const doubted = doubts.map((doubt) => confirmed[doubt.n - 1]);
        const recheck = await checkAll(
          { ...draft, statements: doubted.map((item) => ({ text: item.statement.text, cites: item.statement.sources.map((source) => source.citation) })) },
          doubts.map((doubt) => `A senior reviewer doubts this statement fits the person's facts: ${doubt.why}. Mark it supported only if the passage's rule, with all its conditions, applies to this person's situation; otherwise correct it to the rule that does apply, or mark it unsupported.`),
        );
        if (recheck) {
          doubted.forEach((item, k) => {
            const at = judged.indexOf(item);
            if (at >= 0) judged[at] = recheck.judged[k];
          });
        }
      }
      const already = new Set(judged.map((item) => ("statement" in item ? item.statement.text : item.topic).toLowerCase()));
      const fresh = (additions?.statements ?? []).filter((statement) => !already.has(statement.text.toLowerCase())).slice(0, MAX_REVIEW_ADDITIONS);
      if (fresh.length) {
        const secondRound = await checkAll({ ...draft, statements: fresh });
        if (secondRound) {
          judged.push(...secondRound.judged);
          missingLaw.push(...secondRound.missingLaw);
        }
      }
    }

    const statements: AnswerStatement[] = [];
    const notConfirmed: string[] = [];
    const notConfirmedWhy: { topic: string; why: string }[] = [];
    for (const item of judged) {
      if ("statement" in item) statements.push(item.statement);
    }
    // Two drafts can confirm the same point twice: keep the fuller one.
    const kept = statements.filter((statement, i) =>
      !statements.some((other, j) => j !== i && overlap(statement.text, other.text) >= SAME_POINT && (other.text.length > statement.text.length || (other.text.length === statement.text.length && j < i))),
    );
    for (const item of judged) {
      if ("statement" in item) continue;
      // A point confirmed in other words is not listed as unconfirmed.
      if (item.text && kept.some((statement) => overlap(statement.text, item.text!) >= COVERED)) continue;
      notConfirmed.push(item.topic);
      notConfirmedWhy.push({ topic: item.topic, why: item.why });
    }
    statements.splice(0, statements.length, ...kept);

    // A statement with no legal content would not need a source; one with
    // legal content always has one by now. Both are fine; nothing else is shown.
    return {
      status: statements.length ? "answered" : "not-confirmed",
      statements,
      notConfirmed: [...new Set(notConfirmed)],
      declinedToJudge: draft.asksForPrediction,
      missingLaw: [...new Set(missingLaw)],
      notConfirmedWhy,
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
    `THEIR QUESTION: ${input.question.slice(0, 5000)}`,
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
    `QUESTION: ${input.question.slice(0, 5000)}`,
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

export async function draftWithModel(input: CheckedAnswerInput, effort?: string): Promise<string> {
  return chatJson(DRAFT_SYSTEM_PROMPT, draftUserPrompt(input), effort || process.env.AI_EFFORT_ANSWER || "low");
}

export const REVIEW_SYSTEM_PROMPT = `You are a senior Ontario lawyer reviewing a junior's answer before it goes to a client who is representing themselves. You are given the client's QUESTION and situation, the STATEMENTS already in the answer (each already checked against the law), and PASSAGES of the law those statements rest on.

Name what a complete answer to this question still needs, the way a careful lawyer would before court: the basic rule a section starts from, its conditions and exceptions, every route the law gives the client, how amounts are calculated or capped, deadlines and what starts them, who must prove what, and the form or step and where it is filed. Only what the question calls for; never repeat a point already made.

Also check each statement already in the answer against the person's facts: a rule that depends on a condition (the kind of tenancy, claim, party, amount or date) must fit this person's situation, use the current figure and the right form, and not be a rule from a different procedure. List any that do not.

Return JSON: {"missing": [{"text": "<one or two plain sentences>", "cites": ["<full Act or rule name and section>"]}], "doubtful": [{"n": <statement number>, "why": "<what does not fit>"}]}, at most ${MAX_REVIEW_ADDITIONS} missing points, most important first; empty lists if nothing is missing or doubtful.
- Every point cites the exact statute, regulation or rule section. Never invent a section number.
- Never say or suggest whether the client will win, how strong the case is, or what a judge will think.
- Do not compute calendar dates; state the period and what starts it.`;

export async function reviewWithModel(input: CheckedAnswerInput, confirmed: string[], passages: Passage[]): Promise<string> {
  const user = [
    `QUESTION: ${input.question.slice(0, 5000)}`,
    `SITUATION (facts, not law):\n${`${input.story ?? ""}\n${input.facts ?? ""}`.trim().slice(0, 3000) || "(not given)"}`,
    `STATEMENTS ALREADY IN THE ANSWER:\n${confirmed.map((text, i) => `${i + 1}. ${text}`).join("\n") || "(none)"}`,
    `PASSAGES:\n${passages.map((passage) => `${passageItem(passage).citation || passageItem(passage).label}\n${passage.text.slice(0, PASSAGE_CHARS)}`).join("\n\n")}`,
  ].join("\n\n");
  return chatJson(REVIEW_SYSTEM_PROMPT, user, process.env.AI_EFFORT_ANSWER_REVIEW || "medium");
}

export async function checkWithModel(statements: string[], passages: Passage[], input: CheckedAnswerInput, hint?: string): Promise<string> {
  const user = checkUserPrompt(statements, passages, input) + (hint ? `\n\nNOTE: ${hint}` : "");
  return chatJson(CHECK_SYSTEM_PROMPT, user, process.env.AI_EFFORT_ANSWER_CHECK || "medium");
}

async function defaultEmbed() {
  const { embedWithModel } = await import("./storyRetrieval");
  return embedWithModel;
}
