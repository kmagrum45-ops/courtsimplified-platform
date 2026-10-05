/**
 * Sources added because the research step named them as missing
 * (src/lib/case-system/retrieval/researchStory.ts -> a "source-request" issue
 * -> .github/workflows/courtsimplified-source-requests.yml).
 *
 * The entries live in requestedSources.json so the workflow can append one
 * without editing TypeScript. Each was resolved to an official URL
 * (scripts/sources/resolveSourceRequest.ts), fetched, and kept only because
 * the fetched text contained its own title and the e-Laws consolidation line
 * (mustContain) -- the same check every hand-declared source passes. A
 * resolution that lands on the wrong document fails that check and is never
 * vendored.
 */

import type { CorpusSource } from "./corpusSources";
import entries from "./requestedSources.json";

export const REQUESTED_SOURCES: CorpusSource[] = entries as CorpusSource[];
