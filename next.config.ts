import type { NextConfig } from "next";

/** `?caseId=<id>` captured as :caseId, for sending an old case URL to the case page. */
const withCaseId = [{ type: "query" as const, key: "caseId", value: "(?<caseId>[0-9a-fA-F-]{36})" }];

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
