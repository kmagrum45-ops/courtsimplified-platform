/**
 * GET /api/capabilities -- which approval-tier and AI-advice features are on
 * for the signed-in person asking (site owner, 2026-10-29: "production
 * defaults off, owner allowlist").
 *
 * The browser cannot decide this itself: the tester list (A2I_TESTER_USER_IDS)
 * is a server-side variable and the user id must be the one verified from the
 * bearer token. So every screen asks here (CapabilityProvider) and shows a
 * feature only when the answer says so. The answer is booleans only; it never
 * says who is listed or why.
 */
import { NextResponse } from "next/server";

import { capabilitySetFor } from "@/src/lib/case-system/policy/capabilities";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request).catch(() => null);
  return NextResponse.json(
    { capabilities: capabilitySetFor({ userId: user?.id ?? null }) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
