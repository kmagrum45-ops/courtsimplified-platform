/**
 * GET /api/canlii/case?citation=... -- what CanLII's API says about a case:
 * its proper title, citation, court, date and link, and how many later
 * decisions cite it, with links to a few (src/lib/canlii/canliiCore.ts).
 *
 * Metadata only. Signed-in users only. With no CANLII_API_KEY it answers
 * { enabled: false } at once; with CanLII down or out of quota,
 * { enabled: true, case: null }. Callers render nothing in either case.
 *
 * WHAT IS ALREADY KNOWN IS FREE; WHAT IS NEW IS COUNTED. The answer is first
 * sought in the cache alone. Only when that misses does the lookup count
 * against the person's own daily allowance (canlii_user_allow), so no one
 * account can spend the whole day's cap, or use our key to step through
 * citations and collect metadata in bulk (CanLII Terms s. 5.1).
 */

import { NextResponse } from "next/server";

import { allowPersonLookup, canlii, canliiEnabled, caseRefFromCitation } from "@/src/lib/canlii/canliiServer";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!canliiEnabled()) return NextResponse.json({ enabled: false });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to look up a case." }, { status: 401 });

  const citation = (new URL(request.url).searchParams.get("citation") ?? "").trim().slice(0, 200);
  if (!citation || !caseRefFromCitation(citation)) return NextResponse.json({ enabled: true, case: null });

  try {
    const api = canlii();
    const peek = { cacheOnly: true, missed: false };
    let summary = await api.caseSummary(citation, peek);
    if (peek.missed) {
      if (!(await allowPersonLookup(user.id))) return NextResponse.json({ enabled: true, case: null });
      summary = await api.caseSummary(citation);
    }
    if (!summary) return NextResponse.json({ enabled: true, case: null });
    return NextResponse.json({ enabled: true, case: summary.case, citing: summary.citing });
  } catch {
    return NextResponse.json({ enabled: true, case: null });
  }
}
