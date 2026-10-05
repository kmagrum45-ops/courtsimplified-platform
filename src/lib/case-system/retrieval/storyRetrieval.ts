/**
 * Finds the law that fits a person's story by meaning, not by matching words.
 *
 * WHY (2026-10-05, site owner: "word searches dont work because to many
 * variables. we are useing the ai intelligence to understand the story and
 * correspond to the users words"). A person writes "my old landlord still has
 * my last month's rent and won't answer"; the statute says "rent deposit"
 * and "the landlord shall apply the deposit". No keyword joins them. So:
 *
 *   1. The model reads the story and writes the legal questions it raises,
 *      each phrased the way Ontario legislation or an official guide would
 *      put it ("landlord's obligation to apply or return a rent deposit when
 *      the tenancy ends"). This is the step that understands the story. It
 *      writes no answer, cites nothing, and nothing it writes is shown.
 *   2. Those questions are embedded and the corpus index is searched by
 *      meaning (corpusIndex.ts).
 *   3. Each hit is re-cut from the vendored source and verified against the
 *      index hash, then handed to the analysis as a source item with its
 *      pinpoint and official page.
 *
 * WHAT KEEPS IT SAFE. Retrieval only decides what the analysis is ALLOWED to
 * cite; the grounding gate (groundedCognition.ts) still checks that every
 * legal statement quotes words that appear in the item it cites. A passage
 * that was retrieved but does not fit cannot put words in the model's mouth,
 * and a passage the model wanted but retrieval did not find cannot be cited
 * at all. Any failure here -- no key, no index, a timeout, a bad response --
 * returns nothing, and the analysis runs on the catalogue sources exactly as
 * it did before.
 *
 * PRIVACY. The query-writing call is told to leave out names and personal
 * details, and its output is redacted from the audit log ("queries" is a
 * prose field in aiCallLog.ts). The embeddings call is sent those phrases,
 * never the story.
 *
 * Asserted by `npm run test:corpus-retrieval`.
 */

import type { SourceItem } from "../intelligence/groundedCognition";
import { loadCorpusIndex, readPassage, searchIndex, sourcePassages, type LoadedIndex, type Passage } from "./corpusIndex";
import { findProvision, parsePinpoint, referencedProvisions } from "./crossReferences";
import { readableUrl } from "./corpusChunker";

export type RetrievalCourt = "small-claims" | "civil" | "family";

export type RetrievalInput = {
  story: string;
  courtPath: RetrievalCourt;
  /** The user's stage, in their words or the intake's code ("responding", "starting-case"). */
  stage?: string;
  side?: "plaintiff" | "defendant";
};

export type RetrievalResult = {
  queries: string[];
  passages: Passage[];
  items: SourceItem[];
  /** Why nothing came back, when nothing did. Counts and causes only. */
  skipped?: string;
};

// ------------------------------------------------------------ court scope

/**
 * Another court's procedure cannot apply to this case. Substantive law (a
 * statute about tenancies, sale of goods, support) is never excluded: a
 * family case can turn on the Family Law Act and a Small Claims case on the
 * Consumer Protection Act. Only the rule books, guides and fee schedules that
 * belong to one court are kept away from the others.
 */
const SMALL_CLAIMS_ONLY =
  /^(oreg-258-98-small-claims-rules|oreg-626-00-monetary-jurisdiction|oreg-332-16-small-claims-fees|ontario-fees-small-claims|ontario-suing-someone-small-claims|ontario-file-small-claims-online|scj-steps-in-a-case|scj-how-to-respond|scj-default-proceedings|guide-.*|cleo-tribunals-and-courts-.*|cleo-topic-small-claims-court)$/;
const CIVIL_ONLY = /^(rules-of-civil-procedure|ontario-file-civil-claim-online|scj-steps-to-a-civil-case|ontario-fees-civil)$/;
const FAMILY_ONLY = /^(family-law-rules|ontario-fees-family)$/;

export function excludedForCourt(court: RetrievalCourt, sourceId: string): boolean {
  if (court === "small-claims") return CIVIL_ONLY.test(sourceId) || FAMILY_ONLY.test(sourceId);
  if (court === "civil") return SMALL_CLAIMS_ONLY.test(sourceId) || FAMILY_ONLY.test(sourceId);
  return SMALL_CLAIMS_ONLY.test(sourceId) || CIVIL_ONLY.test(sourceId);
}

// ------------------------------------------------------------ passages -> items

/** A retrieved passage as a citable source item. */
export function passageItem(passage: Passage): SourceItem {
  const { source } = passage;
  const where = passage.pinpoint || passage.heading;
  if (source.tier === "case-law") {
    // A court's reasons in an earlier case: named by the case, its citation
    // and the paragraph, and told apart from legislation everywhere it shows.
    const citation = `${source.title}, ${source.citation}${passage.pinpoint ? `, ${passage.pinpoint}` : ""}`;
    return {
      id: passage.id,
      label: `Court decision: ${citation}`,
      text: passage.text,
      sourceUrl: source.readableUrl,
      citation,
      kind: "decision",
    };
  }
  const citation = passage.pinpoint
    ? `${source.title}${source.citation ? `, ${source.citation}` : ""}, ${passage.pinpoint}`
    : undefined;
  const kind = source.tier === "practical" ? "Official or public-legal-education guidance" : "Legislation";
  const referred = passage.referredBy ? ` (referred to in ${passage.referredBy})` : "";
  return {
    id: passage.id,
    label: `${kind}: ${source.title}${where ? ` -- ${where}` : ""}${referred}`,
    text: passage.text,
    sourceUrl: source.readableUrl || readableUrl(source),
    ...(citation ? { citation } : {}),
    kind: source.tier === "practical" ? "guidance" : "legislation",
  };
}

// ------------------------------------------------------------ cross-references

/** At most this many provisions are added by following references. */
const MAX_FOLLOWED = 6;
const MAX_PER_PASSAGE = 2;

/**
 * The provisions the found passages point to in the same law (one hop), as
 * passages of their own: "an order made under section 9 or 10" brings in
 * sections 9 and 10. Each is re-read and hash-checked like any hit, carries
 * the score of the passage that referred to it, and names it in `referredBy`.
 * Legislation only; see crossReferences.ts for what counts as a reference.
 */
export function followCrossReferences(index: LoadedIndex, found: readonly Passage[]): Passage[] {
  const have = new Set(found.map((passage) => passage.id));
  const added: Passage[] = [];
  for (const passage of found) {
    if (added.length >= MAX_FOLLOWED) break;
    if (passage.source.tier === "case-law" || !passage.pinpoint) continue;
    const own = parsePinpoint(passage.pinpoint);
    const chunks = sourcePassages(index, passage.sourceId);
    let fromThis = 0;
    for (const reference of referencedProvisions(passage.text, own?.number)) {
      if (fromThis >= MAX_PER_PASSAGE || added.length >= MAX_FOLLOWED) break;
      if (reference.number === own?.number) {
        // Its own section: only a subsection outside this passage's range.
        const sub = reference.sub === undefined ? NaN : Number(reference.sub);
        if (Number.isNaN(sub) || own.from === undefined || (sub >= own.from && sub <= (own.to ?? own.from))) continue;
      }
      const target = findProvision(chunks, reference);
      if (!target || have.has(target.id)) continue;
      const read = readPassage(index, target.id, passage.score);
      if (!read) continue;
      have.add(read.id);
      added.push({ ...read, referredBy: passage.pinpoint });
      fromThis += 1;
    }
  }
  return added;
}

// ------------------------------------------------------------ the model step

export const QUERY_SYSTEM_PROMPT =
  "You help a legal research tool find the Ontario law that applies to a person's situation. " +
  "Read their account and list the distinct legal questions it raises, including where they are in the court process. " +
  "Write each question the way Ontario legislation, court rules or an official government guide would phrase it, " +
  "using legal terms rather than the person's own words. Do not answer the questions, do not judge the case, " +
  "and leave out every name, address, date, amount and other personal detail. " +
  'Return JSON: {"queries": ["...", "..."]} with 3 to 6 queries.';

export function queryPrompt(input: RetrievalInput): string {
  const court =
    input.courtPath === "family"
      ? "Ontario family court"
      : input.courtPath === "civil"
        ? "the Ontario Superior Court of Justice (civil)"
        : "the Ontario Small Claims Court";
  return [
    `Court: ${court}.`,
    input.stage ? `Where they say they are: ${input.stage}.` : "",
    input.side ? `They are the ${input.side === "defendant" ? "person responding to a case" : "person bringing the case"}.` : "",
    "",
    "Their account:",
    input.story.slice(0, 6000),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** The model's queries, cleaned: strings only, de-duplicated, at most six, none huge. */
export function parseQueries(content: unknown): string[] {
  let parsed: unknown = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
  }
  const raw = (parsed as { queries?: unknown })?.queries;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const query of raw) {
    if (typeof query !== "string") continue;
    const text = query.replace(/\s+/g, " ").trim().slice(0, 300);
    if (text.length >= 8 && !out.includes(text)) out.push(text);
    if (out.length >= 6) break;
  }
  return out;
}

const RETRIEVAL_TIMEOUT_MS = 20_000;

/**
 * Runs the whole retrieval. Always resolves; never throws.
 *
 * `deps` exists for the suite: it replaces the two network calls so the
 * search, the court scope and the item shape are checked without a key.
 */
export async function retrieveForStory(
  input: RetrievalInput,
  deps?: {
    index?: LoadedIndex | null;
    writeQueries?: (input: RetrievalInput) => Promise<string[]>;
    embed?: (texts: string[], model: string, dimensions: number) => Promise<number[][]>;
  },
): Promise<RetrievalResult> {
  const empty = (skipped: string, queries: string[] = []): RetrievalResult => ({ queries, passages: [], items: [], skipped });
  if (!input.story || input.story.trim().length < 20) return empty("no story");
  const index = deps?.index !== undefined ? deps.index : loadCorpusIndex();
  if (!index) return empty("no index");
  if (!deps && !process.env.OPENAI_API_KEY) return empty("no key");

  const work = async (): Promise<RetrievalResult> => {
    const queries = await (deps?.writeQueries ?? writeQueriesWithModel)(input);
    if (queries.length === 0) return empty("no queries");
    const vectors = await (deps?.embed ?? embedWithModel)(queries, index.meta.model, index.meta.dimensions);
    const hits = searchIndex(index, vectors, {
      excludeSource: (sourceId) => excludedForCourt(input.courtPath, sourceId),
    });
    const found = hits
      .map((hit) => readPassage(index, hit.id, hit.score))
      .filter((passage): passage is Passage => Boolean(passage));
    const passages = [...found, ...followCrossReferences(index, found)];
    return { queries, passages, items: passages.map(passageItem) };
  };

  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<RetrievalResult>((resolve) => {
      timer = setTimeout(() => resolve(empty("timeout")), RETRIEVAL_TIMEOUT_MS);
    });
    const result = await Promise.race([work(), timeout]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (error) {
    console.error("[storyRetrieval] retrieval failed; the analysis continues without it.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return empty("error");
  }
}

export async function writeQueriesWithModel(input: RetrievalInput): Promise<string[]> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Part of the analysis, and audited as such: the same call type as the
  // analysis call it feeds, told apart in the log by its prompt version.
  return withAiCallContext({ callType: "small-claims-analysis" }, async () => {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      ...modelParams("standard", { effort: process.env.AI_EFFORT_RETRIEVAL || "low", temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: QUERY_SYSTEM_PROMPT },
        { role: "user", content: queryPrompt(input) },
      ],
    });
    return parseQueries(response.choices[0]?.message?.content ?? "");
  });
}

export async function embedWithModel(texts: string[], model: string, dimensions: number): Promise<number[][]> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  return withAiCallContext({ callType: "small-claims-analysis" }, async () => {
    const client = createOpenAIClient();
    const response = await client.embeddings.create({ model, input: texts, dimensions });
    return response.data.sort((a, b) => a.index - b.index).map((row) => row.embedding as number[]);
  });
}
