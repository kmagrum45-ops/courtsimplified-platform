/**
 * The meaning index over the corpus: one vector per passage, searched by
 * cosine similarity, with every hit re-read from the vendored text before it
 * is used.
 *
 * WHY THE TEXT IS NOT STORED IN THE INDEX. The index holds ids, hashes and
 * vectors only. A hit's words are cut again from docs/sources/corpus/ by the
 * same chunker that built the index, and used only if their hash still
 * matches. So the words a user is quoted are always the vendored source's
 * words, and a source re-fetched after the index was built is never served
 * under a vector computed from its old text -- that passage is skipped until
 * the index is rebuilt (`npm run retrieval:index`, run by the Corpus Index
 * workflow because this workspace cannot reach the embeddings API).
 *
 * Files (written by scripts/retrieval/buildCorpusIndex.ts):
 *   docs/sources/retrieval/corpus-index.json   model, sources, [id, hash] rows
 *   docs/sources/retrieval/corpus-vectors.bin  int8, rows x dimensions, unit
 *                                              vectors scaled by 127
 *
 * Server-only (reads the file system). Asserted by `npm run test:corpus-retrieval`.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { chunkHash, chunkSource, type ChunkSource, type CorpusChunk } from "./corpusChunker";
import { chunkDecision } from "./decisionChunker";

export type IndexedSource = ChunkSource & {
  /** The page a person opens (readableUrl). */
  readableUrl: string;
  /**
   * "legislation" or "practical" (scripts/rules/corpusSources.ts), or
   * "case-law" for a court decision (scripts/retrieval/decisionSources.ts).
   */
  tier: "legislation" | "practical" | "case-law";
  /** The vendored file name in docs/sources/corpus/. */
  file: string;
  /** For a decision: its text file, relative to docs/sources/. */
  path?: string;
  /** For a decision: the neutral or S.C.R. citation and the year. */
  year?: number;
};

/** Cuts any indexed source: a decision by its reasons, everything else by its structure. */
export function chunkIndexedSource(source: IndexedSource, text: string): CorpusChunk[] {
  return source.tier === "case-law" ? chunkDecision(source, text) : chunkSource(source, text);
}

/** Where an indexed source's text is, under the repository root. */
export function sourceTextPath(root: string, source: IndexedSource): string {
  return source.path ? path.join(root, "docs", "sources", source.path) : path.join(root, ...CORPUS_DIR, source.file);
}

export type CorpusIndexMeta = {
  generatedAt: string;
  model: string;
  dimensions: number;
  sources: Record<string, IndexedSource>;
  /** [passage id, hash of its embedding input], in vector-row order. */
  chunks: [string, string][];
};

export type Passage = CorpusChunk & {
  source: IndexedSource;
  score: number;
  /** Set when this passage was added because another one refers to it. */
  referredBy?: string;
};

export const INDEX_DIR = ["docs", "sources", "retrieval"] as const;
export const CORPUS_DIR = ["docs", "sources", "corpus"] as const;

/**
 * What is embedded for a passage. The title and pinpoint go in with the text
 * so "Residential Tenancies Act, s. 106" carries its context; the hash is of
 * this exact string, so a change to any of it is a stale vector.
 */
export function embeddingInput(chunk: CorpusChunk, source: ChunkSource): string {
  const where = [source.title, chunk.pinpoint, chunk.heading].filter(Boolean).join(" -- ");
  return `${where}\n${chunk.text}`;
}

export function passageHash(chunk: CorpusChunk, source: ChunkSource): string {
  return chunkHash(embeddingInput(chunk, source));
}

// ------------------------------------------------------------ quantization

/** Unit-normalizes and scales to int8. Shared by the builder and the tests. */
export function quantize(vector: readonly number[]): Int8Array {
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  const out = new Int8Array(vector.length);
  for (let index = 0; index < vector.length; index += 1) {
    out[index] = Math.max(-127, Math.min(127, Math.round((vector[index] / norm) * 127)));
  }
  return out;
}

function normalize(vector: readonly number[]): Float32Array {
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return Float32Array.from(vector, (value) => value / norm);
}

// ------------------------------------------------------------ loading

export type LoadedIndex = { meta: CorpusIndexMeta; vectors: Int8Array; root: string };

let cached: { root: string; index: LoadedIndex | null } | null = null;

/** The index, or null when it has not been built (retrieval then adds nothing). */
export function loadCorpusIndex(root: string = process.cwd()): LoadedIndex | null {
  if (cached && cached.root === root) return cached.index;
  const metaPath = path.join(root, ...INDEX_DIR, "corpus-index.json");
  const vectorPath = path.join(root, ...INDEX_DIR, "corpus-vectors.bin");
  let index: LoadedIndex | null = null;
  if (existsSync(metaPath) && existsSync(vectorPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as CorpusIndexMeta;
    const buffer = readFileSync(vectorPath);
    const vectors = new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    index = vectors.length === meta.chunks.length * meta.dimensions ? { meta, vectors, root } : null;
  }
  cached = { root, index };
  return index;
}

/** For tests: an index held in memory. */
export function setCorpusIndexForTesting(index: LoadedIndex | null, root = "__test__"): void {
  cached = { root, index };
  sourceChunks.clear();
}

// ------------------------------------------------------------ search

export type SearchOptions = {
  /** Best hits kept per query. */
  perQuery?: number;
  /** Ceiling on passages returned in all. */
  total?: number;
  /** Below this cosine similarity a hit is not worth the model's attention. */
  minScore?: number;
  /** Sources that cannot apply (another court's procedure). */
  excludeSource?: (sourceId: string) => boolean;
};

/**
 * The passages nearest in meaning to any of the queries, best first: each
 * query's best passage, then the rest by score, at most four per source so
 * one long statute cannot crowd out everything else.
 */
export function searchIndex(
  index: LoadedIndex,
  queryVectors: readonly (readonly number[])[],
  options: SearchOptions = {},
): { id: string; sourceId: string; score: number }[] {
  const { perQuery = 5, total = 12, minScore = 0.2, excludeSource } = options;
  const dims = index.meta.dimensions;
  const rows = index.meta.chunks.length;
  const best = new Map<string, { id: string; sourceId: string; score: number }>();
  const firstPerQuery: string[] = [];

  for (const raw of queryVectors) {
    if (raw.length !== dims) continue;
    const query = normalize(raw);
    const top: { row: number; score: number }[] = [];
    for (let row = 0; row < rows; row += 1) {
      let dot = 0;
      const offset = row * dims;
      for (let d = 0; d < dims; d += 1) dot += query[d] * index.vectors[offset + d];
      const score = dot / 127;
      if (score < minScore) continue;
      if (top.length < perQuery * 4 || score > top[top.length - 1].score) {
        top.push({ row, score });
        top.sort((a, b) => b.score - a.score);
        if (top.length > perQuery * 4) top.pop();
      }
    }
    let kept = 0;
    for (const { row, score } of top) {
      if (kept >= perQuery) break;
      const id = index.meta.chunks[row][0];
      const sourceId = id.split(":")[1];
      if (excludeSource?.(sourceId)) continue;
      if (kept === 0) firstPerQuery.push(id);
      kept += 1;
      const existing = best.get(id);
      if (!existing || existing.score < score) best.set(id, { id, sourceId, score });
    }
  }

  // Every question the model asked keeps its best answer: a story with one
  // statute-heavy issue must not crowd out the passage for another (the
  // first probe lost RTA s. 106, the rent deposit rule itself, behind four
  // other tenancy sections). Then the rest by score, at most four a source.
  const out: { id: string; sourceId: string; score: number }[] = [];
  const perSource = new Map<string, number>();
  const take = (hit: { id: string; sourceId: string; score: number }) => {
    out.push(hit);
    perSource.set(hit.sourceId, (perSource.get(hit.sourceId) ?? 0) + 1);
  };
  for (const id of firstPerQuery) {
    if (out.length < total && !out.some((hit) => hit.id === id)) take(best.get(id)!);
  }
  for (const hit of [...best.values()].sort((a, b) => b.score - a.score)) {
    if (out.length >= total) break;
    if (out.some((existing) => existing.id === hit.id)) continue;
    if ((perSource.get(hit.sourceId) ?? 0) >= 4) continue;
    take(hit);
  }
  return out.sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------ re-reading hits

const sourceChunks = new Map<string, Map<string, CorpusChunk>>();

/**
 * A hit's passage, cut fresh from the vendored file. Null when the file is
 * gone or the passage's hash no longer matches the index (the source changed
 * after the index was built): a stale vector must not carry new words.
 */
/** Every passage of an indexed source, cut fresh from its file (cached). */
export function sourcePassages(index: LoadedIndex, sourceId: string): CorpusChunk[] {
  const source = index.meta.sources[sourceId];
  if (!source) return [];
  let chunks = sourceChunks.get(sourceId);
  if (!chunks) {
    const file = sourceTextPath(index.root, source);
    if (!existsSync(file)) return [];
    chunks = new Map(chunkIndexedSource(source, readFileSync(file, "utf8")).map((chunk) => [chunk.id, chunk]));
    sourceChunks.set(sourceId, chunks);
  }
  return [...chunks.values()];
}

export function readPassage(index: LoadedIndex, id: string, score: number): Passage | null {
  const sourceId = id.split(":")[1];
  const source = index.meta.sources[sourceId];
  if (!source) return null;
  sourcePassages(index, sourceId);
  const chunk = sourceChunks.get(sourceId)?.get(id);
  if (!chunk) return null;
  const row = index.meta.chunks.find(([chunkId]) => chunkId === id);
  if (!row || row[1] !== passageHash(chunk, source)) return null;
  return { ...chunk, source, score };
}
