import type { NextConfig } from "next";

/** `?caseId=<id>` captured as :caseId, for sending an old case URL to the case page. */
const withCaseId = [{ type: "query" as const, key: "caseId", value: "(?<caseId>[0-9a-fA-F-]{36})" }];

/** A removed page: with ?caseId= to that case's section, without it to the case list. */
function caseSection(source: string, section: string) {
  return [
    { source, has: withCaseId, destination: `/cases/:caseId${section}`, permanent: true },
    { source, destination: "/dashboard", permanent: true },
  ];
}

/**
 * Meaning-based retrieval (src/lib/case-system/retrieval/) reads its index and
 * the vendored corpus from disk at request time, by file names held in the
 * index, which the bundler cannot trace. The three analysis routes are the
 * ones that run it; without these files there they find no index and the
 * analysis runs without retrieval.
 */
const RETRIEVAL_FILES = ["./docs/sources/retrieval/**", "./docs/sources/corpus/*.txt", "./docs/sources/decisions/*.txt"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/small-claims/analyze": RETRIEVAL_FILES,
    "/api/civil/analyze": RETRIEVAL_FILES,
    "/api/family/analyze": RETRIEVAL_FILES,
  },
  // Pages removed or folded into the case page in the 2026-10-04 clean-up,
  // sent to what replaced them so an old link or bookmark still lands
  // somewhere useful. A URL that named a case goes to that case's section; one
  // that did not goes to the list of cases.
  async redirects() {
    return [
      // An older Small Claims landing page duplicating /small-claims.
      { source: "/ontario-smallclaims", destination: "/small-claims", permanent: true },

      // The case page (/cases/[id]) replaced these.
      { source: "/dashboard/cases/:id", destination: "/cases/:id", permanent: true },
      { source: "/case-workspace/:caseId", destination: "/cases/:caseId/documents", permanent: true },
      { source: "/case-timeline", has: withCaseId, destination: "/cases/:caseId/timeline", permanent: true },
      { source: "/case-timeline", destination: "/dashboard", permanent: true },
      { source: "/case-dashboard", destination: "/dashboard", permanent: true },
      // /forms stays as the public catalogue; with a case it opens inside it.
      { source: "/forms", has: withCaseId, destination: "/cases/:caseId/forms", permanent: false },

      // Workflow pages folded into the case page or removed (second stage).
      ...caseSection("/evidence", "/documents"),
      ...caseSection("/document-workspace", "/drafts"),
      ...caseSection("/ai-drafting-assistant", "/drafts"),
      ...caseSection("/document-export", "/case-file"),
      ...caseSection("/court-package", "/case-file"),
      ...caseSection("/trial-package", ""),
      ...caseSection("/settlement-conference", ""),
      ...caseSection("/litigation-strategy", ""),
    ];
  },
};

export default nextConfig;
