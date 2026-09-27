/**
 * Paths that are NEVER corpus sources, and why.
 *
 * *** WHY A LIST OF REFUSALS, WHEN THE SOURCE LIST IS ALREADY EXPLICIT ***
 *
 * `corpusSources.ts` is an allowlist: a source is vendored only if it is named
 * there. So in one sense nothing else can be a source and this file is redundant.
 *
 * It is not redundant, for the reason CLAUDE.md §8 gives: the recurring failure
 * here is work built on an assumption somebody already disproved. Somebody who
 * finds `docs/reference/civil-annual-practice/` — 34 files of rule-by-rule
 * structure, sitting in the repository, looking exactly like corpus material —
 * has every reason to add it. Nothing in an allowlist tells them not to.
 *
 * This file is where the "no" is written down with its reason, and
 * `test:reference-not-shipped` asserts it stays true.
 *
 * *** THE RULE BEING PROTECTED ***
 *
 * CLAUDE.md §2 names the acceptable sources: ontario.ca, ontariocourts.ca,
 * ontariocourtforms.on.ca, CanLII, the Courts of Justice Act, the Rules of the
 * Small Claims Court, Justice Ontario, Law Society of Ontario materials.
 *
 * **Commercial legal publications are not among them, and are never sources.**
 * That is not a technical limit. A corpus source is quoted verbatim into
 * user-facing content by the drafter, so adding a commercial publication would
 * republish somebody else's copyrighted work to the public, at scale, with a
 * citation that makes it look sanctioned.
 */

export type RefusedCorpusPath = {
  /** Repo-relative path. */
  path: string;
  /** Why it is not a source. Read by a human, not matched by anything. */
  because: string;
};

export const REFUSED_CORPUS_PATHS: RefusedCorpusPath[] = [
  {
    path: "docs/reference/civil-annual-practice",
    because:
      "A preserved planning artefact for the Civil (Rules of Civil Procedure) work. " +
      "Its `authoritySectionsCaptured` arrays are SECTION HEADINGS FROM THE ONTARIO " +
      "ANNUAL PRACTICE, a Thomson Reuters publication. The rules themselves are " +
      "public and are vendored from e-Laws as `rules-of-civil-procedure`; the book's " +
      "structure is not ours to publish. Draft Civil content from the e-Laws text, " +
      "never from this folder.",
  },
];
