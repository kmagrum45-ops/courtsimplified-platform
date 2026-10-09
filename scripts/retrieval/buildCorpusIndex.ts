/**
 * Builds the meaning index over the vendored corpus.
 *
 *   npm run retrieval:index            embed new or changed passages, reuse the rest
 *   npm run retrieval:index -- --check report what would change; no network
 *
 * Needs OPENAI_API_KEY, which only GitHub's runners have (this workspace
 * cannot reach the API), so the Corpus Index workflow runs it and publishes
 * the two files to a `corpus-index-<run>` branch for a session to bring into
 * main through a PR. See src/lib/case-system/retrieval/corpusIndex.ts for the
 * file format and why the index holds no text.
 *
 * INCREMENTAL. A passage whose embedding input hashes the same as last time
 * keeps its vector, so re-vendoring one statute re-embeds that statute only.
 * A model or dimension change re-embeds everything.
 *
 * The OpenAI client comes from openaiClient.ts like every other call. These
 * calls run outside withAiCallContext on purpose: they send the corpus, not a
 * user's words, and there is no user or case to attribute them to.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

import { chunkSource, readableUrl } from "../../src/lib/case-system/retrieval/corpusChunker";
import { DECISION_SOURCES } from "./decisionSources";
import { HISTORICAL_SOURCES } from "./historicalSources";
import {
  chunkIndexedSource,
  sourceTextPath,
  embeddingInput,
  passageHash,
  quantize,
  type CorpusIndexMeta,
  type IndexedSource,
} from "../../src/lib/case-system/retrieval/corpusIndex";
import { CORPUS_SOURCES, sourceTier } from "../rules/corpusSources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");
const OUT = path.join(ROOT, "docs", "sources", "retrieval");
const META = path.join(OUT, "corpus-index.json");
const VECTORS = path.join(OUT, "corpus-vectors.bin");

/**
 * text-embedding-3-large shortened to 256 dimensions: OpenAI's own
 * measurements put the large model at 256 dimensions above the small model at
 * its full 1536, and 256 int8 values a passage keeps the whole index under
 * 3 MB -- small enough to ship with the function that searches it.
 */
const MODEL = process.env.AI_EMBEDDING_MODEL || "text-embedding-3-large";
const DIMENSIONS = Number(process.env.AI_EMBEDDING_DIMENSIONS || 256);
const BATCH = 200;
const TOKENS_PER_MINUTE = Number(process.env.AI_EMBEDDING_TPM || 700_000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type EmbeddingsClient = {
  embeddings: {
    create: (body: { model: string; input: string[]; dimensions: number }) => Promise<{ data: { index: number; embedding: number[] }[] }>;
  };
};

/**
 * A rate-limit rejection here is a per-minute limit that clears in seconds
 * (the API says how many), unlike the daily cap that made the app's client
 * never retry (openaiClient.ts). So this build script waits and retries; the
 * app's own calls still never do.
 */
async function embedWithRetry(client: EmbeddingsClient, input: string[]) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await client.embeddings.create({ model: MODEL, input, dimensions: DIMENSIONS });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status !== 429 || attempt >= 6) throw error;
      const message = error instanceof Error ? error.message : "";
      const hint = /try again in ([\d.]+)(ms|s)/i.exec(message);
      const wait = hint ? Number(hint[1]) * (hint[2] === "ms" ? 1 : 1000) : 10_000;
      console.log(`  rate limited; waiting ${Math.ceil(wait / 1000) + 2}s (attempt ${attempt})`);
      await sleep(wait + 2_000);
    }
  }
}

type ManifestEntry = { id: string; title: string; citation?: string; url: string; file: string };

async function main() {
  const check = process.argv.includes("--check");
  const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as { entries: ManifestEntry[] };
  const tiers = new Map(CORPUS_SOURCES.map((source) => [source.id, sourceTier(source)]));

  const sources: Record<string, IndexedSource> = {};
  const rows: { id: string; hash: string; input: string }[] = [];
  for (const entry of manifest.entries) {
    const file = path.join(CORPUS, entry.file);
    if (!existsSync(file)) continue;
    const source: IndexedSource = {
      id: entry.id,
      title: entry.title,
      citation: entry.citation,
      url: entry.url,
      readableUrl: readableUrl(entry),
      tier: tiers.get(entry.id) ?? "legislation",
      file: entry.file,
    };
    const chunks = chunkSource(source, readFileSync(file, "utf8"));
    if (chunks.length === 0) continue;
    sources[entry.id] = source;
    for (const chunk of chunks) rows.push({ id: chunk.id, hash: passageHash(chunk, source), input: embeddingInput(chunk, source) });
  }

  // Court decisions already retrieved and read (docs/sources/README.md).
  for (const decision of DECISION_SOURCES) {
    const source: IndexedSource = {
      id: decision.id,
      title: decision.title,
      citation: decision.citation,
      url: decision.url,
      readableUrl: decision.readableUrl,
      tier: "case-law",
      file: path.basename(decision.path),
      path: decision.path,
      year: decision.year,
    };
    const file = sourceTextPath(ROOT, source);
    if (!existsSync(file) || !source.readableUrl) continue;
    const chunks = chunkIndexedSource(source, readFileSync(file, "utf8"));
    if (chunks.length === 0) continue;
    sources[source.id] = source;
    for (const chunk of chunks) rows.push({ id: chunk.id, hash: passageHash(chunk, source), input: embeddingInput(chunk, source) });
  }

  // Law as it read on a past date, each titled with its period
  // (historicalSources.ts). Cut like any statute.
  for (const source of HISTORICAL_SOURCES) {
    const file = sourceTextPath(ROOT, source);
    if (!existsSync(file)) continue;
    const chunks = chunkIndexedSource(source, readFileSync(file, "utf8"));
    if (chunks.length === 0) continue;
    sources[source.id] = source;
    for (const chunk of chunks) rows.push({ id: chunk.id, hash: passageHash(chunk, source), input: embeddingInput(chunk, source) });
  }

  // Reuse vectors whose input has not changed.
  const reuse = new Map<string, Int8Array>();
  if (existsSync(META) && existsSync(VECTORS)) {
    const previous = JSON.parse(readFileSync(META, "utf8")) as CorpusIndexMeta;
    if (previous.model === MODEL && previous.dimensions === DIMENSIONS) {
      const buffer = readFileSync(VECTORS);
      previous.chunks.forEach(([, hash], row) => {
        reuse.set(hash, new Int8Array(buffer.buffer, buffer.byteOffset + row * DIMENSIONS, DIMENSIONS));
      });
    }
  }
  const todo = rows.filter((row) => !reuse.has(row.hash));
  console.log(`${rows.length} passages from ${Object.keys(sources).length} sources; ${rows.length - todo.length} reused, ${todo.length} to embed (${MODEL}, ${DIMENSIONS} dimensions).`);
  if (check) return;

  if (todo.length > 0) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set; nothing embedded.");
    const { createOpenAIClient } = await import("../../src/lib/case-system/openaiClient");
    const client = createOpenAIClient() as unknown as EmbeddingsClient;
    const window: { at: number; tokens: number }[] = [];
    for (let start = 0; start < todo.length; start += BATCH) {
      const batch = todo.slice(start, start + BATCH);
      // Stay under the organisation's tokens-per-minute limit (1,000,000 for
      // this model, measured 2026-10-05: the first full build hit it at 5,000
      // of 10,758 passages). About four characters a token, with headroom.
      const tokens = Math.ceil(batch.reduce((sum, row) => sum + row.input.length, 0) / 3.5);
      for (;;) {
        const now = Date.now();
        while (window.length && now - window[0].at > 60_000) window.shift();
        const used = window.reduce((sum, entry) => sum + entry.tokens, 0);
        if (used + tokens <= TOKENS_PER_MINUTE) break;
        await sleep(60_000 - (now - window[0].at) + 250);
      }
      window.push({ at: Date.now(), tokens });
      const response = await embedWithRetry(client, batch.map((row) => row.input));
      const ordered = response.data.sort((a, b) => a.index - b.index);
      if (ordered.length !== batch.length) throw new Error(`Batch at ${start}: asked for ${batch.length} vectors, got ${ordered.length}.`);
      ordered.forEach((row, offset) => reuse.set(batch[offset].hash, quantize(row.embedding as number[])));
      console.log(`  embedded ${Math.min(start + BATCH, todo.length)} / ${todo.length}`);
    }
  }

  const vectors = new Int8Array(rows.length * DIMENSIONS);
  rows.forEach((row, index) => vectors.set(reuse.get(row.hash)!, index * DIMENSIONS));
  const meta: CorpusIndexMeta = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    dimensions: DIMENSIONS,
    sources,
    chunks: rows.map((row) => [row.id, row.hash]),
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(META, JSON.stringify(meta) + "\n");
  writeFileSync(VECTORS, Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength));
  console.log(`Wrote ${path.relative(ROOT, META)} and ${path.relative(ROOT, VECTORS)} (${vectors.byteLength} bytes).`);
}

main().catch((error) => {
  // The API's status and message say what went wrong (a model the project
  // cannot use, a rate limit); neither carries the key.
  const status = (error as { status?: number })?.status;
  console.error(`${status ? `HTTP ${status}: ` : ""}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
