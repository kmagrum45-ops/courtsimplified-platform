/**
 * Researches a person's story the way a lawyer would, before the analysis is
 * written: spot the legal questions, look each one up in the library, read
 * what came back, look again where it fell short, and say plainly what the
 * library does not have.
 *
 * WHY (site owner, 2026-10-05): "our site can only handle cases we have put
 * into it? I thought the ai can think like you do ... if it notices my library
 * or sources does not have the information, it installs it and verifies it."
 * A pedestrian hit by a city bus got generic filing steps, because the only
 * lookup was one pass of search phrases and everything else ran in pre-built
 * lanes. Answering that case well took a loop: what would a lawyer want to
 * know (who is sued, is there a notice, which statute limits what can be
 * claimed), find it, read it, check it applies, find what is missing.
 *
 * THE LOOP
 *   1. ISSUES. The model reads the story and lists the questions a lawyer
 *      would research for it, each with search phrases in the language of
 *      Ontario law. It answers nothing and nothing it writes is cited.
 *   2. SEARCH. Each issue's phrases are embedded and the corpus searched by
 *      meaning (corpusIndex.ts); every hit is re-read from the vendored text
 *      and hash-checked; cross-references are followed one hop.
 *   3. READ. A second call per issue (all in parallel) reads its passages and says
 *      which passages answer it -- quoting them -- or that more searching is
 *      needed (new phrases), or that the library does not contain the law it
 *      needs (naming that law). CODE checks every quote is really in the
 *      passage it names; an unverified answer is dropped, not trusted.
 *   4. Steps 2-3 repeat once for issues that asked for more.
 *
 * WHAT COMES OUT
 *   - `items`: the passages, answering ones first, for the source pack. The
 *     analysis can cite only these (and the catalogue), through the same
 *     grounding gate as before (groundedCognition.ts).
 *   - `findings`: per issue, the verified passages and quotes -- what the
 *     person is shown under "What we looked into", verbatim -- or the gap.
 *   - `sourceRequests`: laws the library lacks, by name, for the vendoring
 *     workflow. A name a model wrote is a lead, not a source: nothing is cited
 *     from it until the official text is fetched, verified and indexed.
 *
 * Never throws; on any failure the analysis runs on plain retrieval as
 * before. Behind phaseScope.researchStepEnabled (RESEARCH_STEP=off).
 * Asserted by `npm run test:research-step`.
 */

import type { SourceItem } from "../intelligence/groundedCognition";
import { loadCorpusIndex, readPassage, searchIndex, type LoadedIndex, type Passage } from "./corpusIndex";
import {
  embedWithModel,
  excludedForCourt,
  followCrossReferences,
  passageItem,
  queryPrompt,
  type RetrievalInput,
  type RetrievalResult,
} from "./storyRetrieval";

export const MAX_ISSUES = 6;
const MAX_QUERIES_PER_ISSUE = 3;
const PASSAGES_PER_ISSUE = 5;
const MAX_ITEMS = 24;
const PASSAGE_CHARS_FOR_READING = 1200;
const RESEARCH_TIMEOUT_MS = 45_000;

export type ResearchIssue = { id: string; question: string; queries: string[] };

export type VerifiedQuote = { passageId: string; quote: string };

export type ResearchFinding = {
  issueId: string;
  question: string;
  status: "answered" | "not-in-library" | "not-found";
  /** Passages that answer it, each with a quote code found in the passage. */
  answeredBy: VerifiedQuote[];
  /** For not-in-library: the law the reader said is needed, as named by the model. */
  missingSource?: string;
};

export type ResearchResult = RetrievalResult & {
  issues: ResearchIssue[];
  findings: ResearchFinding[];
  sourceRequests: string[];
  rounds: number;
};

export type ResearchDeps = {
  index?: LoadedIndex | null;
  spotIssues?: (input: RetrievalInput) => Promise<ResearchIssue[]>;
  readPassages?: (
    input: RetrievalInput,
    issues: readonly ResearchIssue[],
    passagesByIssue: ReadonlyMap<string, readonly Passage[]>,
  ) => Promise<unknown>;
  embed?: (texts: string[], model: string, dimensions: number) => Promise<number[][]>;
};

// ------------------------------------------------------------ prompts

export const ISSUES_SYSTEM_PROMPT = `You are an experienced Ontario lawyer doing legal research for a person's situation before advising them. Read their account and list the questions you would research in Ontario law to guide them from where they are to their goal.

Think the way a careful lawyer does. Depending on the facts, consider:
- who could be sued or is suing, and in what capacity (an individual, a business, a municipality or public body, an insurer);
- any notice that must be given before suing, and its time limit;
- the limitation period, and when it starts;
- which court or tribunal hears this, and any monetary limit;
- any statute that governs this kind of situation (for example insurance, municipal, tenancy, employment, consumer protection, family) and what it requires or limits;
- what the person bringing the claim must show, and what can be claimed;
- the procedural next step from where they are now.

Rules:
- Ask questions only; never answer them and never say how the case will turn out.
- Leave out every name, address, date, amount and personal detail.
- For each question give 2 or 3 search phrases written the way Ontario legislation, court rules or an official guide would phrase it.

Return JSON: {"issues": [{"question": "...", "queries": ["...", "..."]}]} with 3 to 6 issues, most important first.`;

export const READ_SYSTEM_PROMPT = `You are checking legal research. For each research question you are given passages found in a library of Ontario and Canadian law. Decide, for each question, from the passages only:

- "answered": one or more passages state the law that answers it. List them, each with a short quote copied EXACTLY, character for character, from that passage, that shows the answer.
- "search-again": the passages miss, but the answer is probably a provision you can describe. Give 1 or 2 new search phrases.
- "not-in-library": the answer needs a specific law that is clearly not among the passages. Name it as precisely as you can (Act or regulation, and section if you know it).

Never answer from your own knowledge. A passage that is about a different situation does not answer the question. Do not judge how the person's case will turn out.

Return JSON: {"results": [{"issueId": "...", "status": "answered" | "search-again" | "not-in-library", "answers": [{"passageId": "...", "quote": "..."}], "queries": ["..."], "missingLaw": "..."}]}`;

// ------------------------------------------------------------ parsing

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** The model's issues, cleaned: at most eight, each with 1-3 distinct queries. Pure; exported for the suite. */
export function parseIssues(content: unknown): ResearchIssue[] {
  let parsed: unknown = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
  }
  const raw = (parsed as { issues?: unknown })?.issues;
  if (!Array.isArray(raw)) return [];
  const out: ResearchIssue[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const question = clean((entry as { question?: unknown }).question, 240);
    const queries = Array.isArray((entry as { queries?: unknown }).queries)
      ? [...new Set(((entry as { queries: unknown[] }).queries).map((q) => clean(q, 300)).filter((q) => q.length >= 8))].slice(
          0,
          MAX_QUERIES_PER_ISSUE,
        )
      : [];
    if (question.length < 10 || queries.length === 0) continue;
    out.push({ id: `issue-${out.length + 1}`, question, queries });
    if (out.length >= MAX_ISSUES) break;
  }
  return out;
}

const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type ReadResult = {
  issueId: string;
  status: "answered" | "search-again" | "not-in-library";
  answers: VerifiedQuote[];
  queries: string[];
  missingLaw?: string;
};

/**
 * The reading step's verdicts, checked. An answer counts only if its passage
 * was offered for THAT issue and its quote (at least 15 characters) is in the
 * passage's text. An "answered" verdict with no surviving quote becomes
 * "search-again" -- a claimed answer the code cannot find is not an answer.
 * Pure; exported for the suite.
 */
export function parseReadResults(
  content: unknown,
  issues: readonly ResearchIssue[],
  passagesByIssue: ReadonlyMap<string, readonly Passage[]>,
): ReadResult[] {
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
  const known = new Set(issues.map((issue) => issue.id));
  const out: ReadResult[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const issueId = clean(e.issueId, 40);
    if (!known.has(issueId) || out.some((r) => r.issueId === issueId)) continue;
    const offered = new Map((passagesByIssue.get(issueId) ?? []).map((passage) => [passage.id, passage]));
    const answers: VerifiedQuote[] = [];
    for (const answer of Array.isArray(e.answers) ? e.answers : []) {
      const passageId = clean((answer as { passageId?: unknown })?.passageId, 120);
      const quote = clean((answer as { quote?: unknown })?.quote, 600);
      const passage = offered.get(passageId);
      if (!passage || norm(quote).length < 15 || !norm(passage.text).includes(norm(quote))) continue;
      if (!answers.some((a) => a.passageId === passageId)) answers.push({ passageId, quote });
    }
    const queries = Array.isArray(e.queries)
      ? [...new Set(e.queries.map((q) => clean(q, 300)).filter((q) => q.length >= 8))].slice(0, 2)
      : [];
    const said = e.status;
    let status: ReadResult["status"] =
      said === "answered" || said === "not-in-library" || said === "search-again" ? said : "search-again";
    if (status === "answered" && answers.length === 0) status = "search-again";
    const missingLaw = clean(e.missingLaw, 200);
    out.push({ issueId, status, answers, queries, ...(status === "not-in-library" && missingLaw ? { missingLaw } : {}) });
  }
  return out;
}

// ------------------------------------------------------------ the loop

async function searchIssues(
  index: LoadedIndex,
  input: RetrievalInput,
  issues: readonly ResearchIssue[],
  embed: NonNullable<ResearchDeps["embed"]>,
): Promise<Map<string, Passage[]>> {
  const all = issues.flatMap((issue) => issue.queries);
  const vectors = await embed(all, index.meta.model, index.meta.dimensions);
  const byIssue = new Map<string, Passage[]>();
  let at = 0;
  for (const issue of issues) {
    const mine = vectors.slice(at, at + issue.queries.length);
    at += issue.queries.length;
    const hits = searchIndex(index, mine, {
      perQuery: 4,
      total: PASSAGES_PER_ISSUE,
      excludeSource: (sourceId) => excludedForCourt(input.courtPath, sourceId),
    });
    const found = hits
      .map((hit) => readPassage(index, hit.id, hit.score))
      .filter((passage): passage is Passage => Boolean(passage));
    byIssue.set(issue.id, [...found, ...followCrossReferences(index, found)].slice(0, PASSAGES_PER_ISSUE + 2));
  }
  return byIssue;
}

/** Runs the research. Always resolves; never throws. */
export async function researchStory(input: RetrievalInput, deps: ResearchDeps = {}): Promise<ResearchResult> {
  const empty = (skipped: string): ResearchResult => ({
    queries: [],
    passages: [],
    items: [],
    skipped,
    issues: [],
    findings: [],
    sourceRequests: [],
    rounds: 0,
  });
  if (!input.story || input.story.trim().length < 20) return empty("no story");
  const index = "index" in deps ? deps.index ?? null : loadCorpusIndex();
  if (!index) return empty("no index");
  const usingModels = !deps.spotIssues || !deps.readPassages || !deps.embed;
  if (usingModels && !process.env.OPENAI_API_KEY) return empty("no key");

  const spot = deps.spotIssues ?? spotIssuesWithModel;
  const read = deps.readPassages ?? readPassagesWithModel;
  const embed = deps.embed ?? embedWithModel;

  const work = async (): Promise<ResearchResult> => {
    const issues = await spot(input);
    if (issues.length === 0) return empty("no issues");

    const passagesByIssue = await searchIssues(index, input, issues, embed);
    // Each question is read in its own call, all at once: one call over every
    // question's passages took longer than the whole step may (first probe,
    // 2026-10-05: 9 of 10 stories timed out at 45 s).
    const readEach = async (asked: readonly ResearchIssue[]) =>
      (
        await Promise.all(
          asked.map(async (issue) => {
            try {
              return parseReadResults(await read(input, [issue], passagesByIssue), [issue], passagesByIssue);
            } catch {
              return [];
            }
          }),
        )
      ).flat();
    let results = await readEach(issues);
    let rounds = 1;

    // One more round for the questions the reader could not answer from what
    // was found, with the phrases it asked for. Their new passages are added
    // to what the issue already had, so an answer can come from either.
    const again = results.filter((result) => result.status === "search-again" && result.queries.length > 0);
    if (again.length > 0) {
      const retry = again.map((result) => ({ ...issues.find((issue) => issue.id === result.issueId)!, queries: result.queries }));
      const more = await searchIssues(index, input, retry, embed);
      for (const issue of retry) {
        const had = passagesByIssue.get(issue.id) ?? [];
        const seen = new Set(had.map((passage) => passage.id));
        passagesByIssue.set(issue.id, [...had, ...(more.get(issue.id) ?? []).filter((passage) => !seen.has(passage.id))]);
      }
      const second = await readEach(retry);
      results = results.map((result) => second.find((s) => s.issueId === result.issueId) ?? result);
      rounds = 2;
    }

    const findings: ResearchFinding[] = issues.map((issue) => {
      const result = results.find((r) => r.issueId === issue.id);
      if (result?.status === "answered") {
        return { issueId: issue.id, question: issue.question, status: "answered", answeredBy: result.answers };
      }
      if (result?.status === "not-in-library" && result.missingLaw) {
        return { issueId: issue.id, question: issue.question, status: "not-in-library", answeredBy: [], missingSource: result.missingLaw };
      }
      return { issueId: issue.id, question: issue.question, status: "not-found", answeredBy: [] };
    });

    // Answering passages first, in issue order; then the rest by score.
    const byId = new Map<string, Passage>();
    for (const list of passagesByIssue.values()) for (const passage of list) if (!byId.has(passage.id)) byId.set(passage.id, passage);
    const answering = findings.flatMap((finding) => finding.answeredBy.map((answer) => answer.passageId));
    const ordered = [
      ...[...new Set(answering)].map((id) => byId.get(id)!).filter(Boolean),
      ...[...byId.values()].filter((passage) => !answering.includes(passage.id)).sort((a, b) => b.score - a.score),
    ].slice(0, MAX_ITEMS);

    const sourceRequests = [
      ...new Set(findings.map((finding) => finding.missingSource).filter((name): name is string => Boolean(name))),
    ];
    return {
      queries: issues.flatMap((issue) => issue.queries),
      passages: ordered,
      items: ordered.map(passageItem) as SourceItem[],
      issues,
      findings,
      sourceRequests,
      rounds,
    };
  };

  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<ResearchResult>((resolve) => {
      timer = setTimeout(() => resolve(empty("timeout")), RESEARCH_TIMEOUT_MS);
    });
    const result = await Promise.race([work(), timeout]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (error) {
    console.error("[researchStory] research failed; the analysis continues without it.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return empty("error");
  }
}

// ------------------------------------------------------------ model calls

async function chatJson(system: string, user: string, effort: string): Promise<string> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Part of the analysis, audited as such (the retrieval precedent), told
  // apart by prompt version.
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

export async function spotIssuesWithModel(input: RetrievalInput): Promise<ResearchIssue[]> {
  return parseIssues(await chatJson(ISSUES_SYSTEM_PROMPT, queryPrompt(input), process.env.AI_EFFORT_RESEARCH || "low"));
}

/** What the reading call is shown: each issue and its passages, by id. Exported for the suite. */
export function readingPrompt(
  issues: readonly ResearchIssue[],
  passagesByIssue: ReadonlyMap<string, readonly Passage[]>,
): string {
  return issues
    .map((issue) => {
      const passages = (passagesByIssue.get(issue.id) ?? [])
        .map((passage) => {
          const where = [passage.source.title, passage.source.citation, passage.pinpoint].filter(Boolean).join(", ");
          return `  [${passage.id}] ${where}\n  ${passage.text.slice(0, PASSAGE_CHARS_FOR_READING)}`;
        })
        .join("\n\n");
      return `QUESTION ${issue.id}: ${issue.question}\nPASSAGES:\n${passages || "  (none found)"}`;
    })
    .join("\n\n---\n\n");
}

export async function readPassagesWithModel(
  _input: RetrievalInput,
  issues: readonly ResearchIssue[],
  passagesByIssue: ReadonlyMap<string, readonly Passage[]>,
): Promise<unknown> {
  return chatJson(READ_SYSTEM_PROMPT, readingPrompt(issues, passagesByIssue), process.env.AI_EFFORT_RESEARCH_READ || "low");
}
