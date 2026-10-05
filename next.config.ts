import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages removed in the 2026-10-04 clean-up, sent to the page that replaced
  // them so an old link or bookmark still lands somewhere useful.
  async redirects() {
    return [
      // An older Small Claims landing page duplicating /small-claims.
      { source: "/ontario-smallclaims", destination: "/small-claims", permanent: true },
    ];
  },
};

export default nextConfig;
