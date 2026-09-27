/**
 * The stage-independent blocks the product may serve — and, right now, none.
 *
 * *** THIS LOADER FAILS CLOSED, AND TODAY THAT IS NOT HYPOTHETICAL ***
 *
 * `published/genericAnswers.published.json` does not exist yet, because the
 * serving-documents block has NOT passed the pipeline. Seven runs of drafter and
 * verifier reached 11/11 sentences verified with every accuracy gate passing, and
 * never cleared the grade 8 readability target at the same time. The pipeline's own
 * rule applies: NEEDS_HUMAN is "not downgraded, not softened, not published with a
 * caveat".
 *
 * So `publishedGenericBlock` returns undefined, and every caller must render nothing
 * rather than something. That is the whole design of this file: a screen with a panel
 * for verified content shows an empty panel until there is verified content to put in
 * it, and there is no code path that puts unverified prose there.
 *
 * *** WHY THE FILE IS OPTIONAL RATHER THAN AN EMPTY COMMITTED STUB ***
 *
 * An empty `{"blocks": []}` would work and would also read, to the next person, as a
 * published release that happens to be empty. There is a difference between "nothing
 * has been published" and "a run was promoted and produced nothing", and the second
 * would be alarming. Absence says the first, accurately.
 *
 * When the block passes, `npm run content:draft-generic -- --promote` writes the file
 * and this loader picks it up with no change here.
 */

import type { GenericAnswer, GenericTopicId } from "./genericAnswers";
import { RENDERABLE_STATUSES } from "./stageAnswers";

type PublishedGenericFile = {
  release: { model: string; promotedAt: string; blockCount: number };
  blocks: GenericAnswer[];
};

/*
 * A require in a try, deliberately, rather than a static import.
 *
 * A static `import` of a file that does not exist is a build error, and the state
 * where nothing has been published is a legitimate state — not a broken one. The
 * cast is narrow and the shape is asserted by test:generic-library, which reads the
 * same file.
 */
function load(): PublishedGenericFile | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const file = require("./published/genericAnswers.published.json") as PublishedGenericFile;
    return file && Array.isArray(file.blocks) ? file : null;
  } catch {
    return null;
  }
}

const file = load();

export const PUBLISHED_GENERIC_RELEASE = file?.release ?? null;

export const PUBLISHED_GENERIC_BLOCKS: readonly GenericAnswer[] = Object.freeze(
  file?.blocks ?? [],
);

/**
 * The verified block for a topic, or undefined.
 *
 * Undefined is the normal answer while nothing is published, and callers must treat
 * it as "render nothing". A status outside RENDERABLE_STATUSES is also undefined —
 * the same allowlist the stage blocks use, so a `needs-human` block that somehow
 * reached the file still cannot be served.
 */
export function publishedGenericBlock(topicId: GenericTopicId): GenericAnswer | undefined {
  const block = PUBLISHED_GENERIC_BLOCKS.find((candidate) => candidate.topicId === topicId);
  if (!block) return undefined;
  return (RENDERABLE_STATUSES as readonly string[]).includes(block.verification.status)
    ? block
    : undefined;
}
