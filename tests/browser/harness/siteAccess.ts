import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

/**
 * The gate in middleware.ts compares the cs_site_access cookie to
 * SITE_ACCESS_PASSWORD and 401s everything else, including /api/*. The harness
 * must carry that cookie or no scenario can reach the builder at all.
 *
 * The cookie is set with secure: true by /api/site-access, which a browser will
 * not store over plain http on localhost, so the harness sets it directly on the
 * context instead of submitting the password form.
 *
 * The value is read from the environment, falling back to .env.local because
 * next dev loads that file but the Playwright process does not. It is never
 * logged, printed, or written anywhere.
 */
function readGateSecret(): string {
  if (process.env.SITE_ACCESS_PASSWORD) return process.env.SITE_ACCESS_PASSWORD;
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return "";
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*SITE_ACCESS_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

export async function grantSiteAccess(page: Page): Promise<void> {
  const secret = readGateSecret();
  if (!secret) {
    throw new Error("SITE_ACCESS_PASSWORD not found in environment or .env.local; the gate rejects every request.");
  }

  const base = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  await page.context().addCookies([
    {
      name: "cs_site_access",
      value: secret,
      domain: base.hostname,
      path: "/",
      httpOnly: true,
      secure: base.protocol === "https:",
      sameSite: "Lax",
    },
  ]);
}
