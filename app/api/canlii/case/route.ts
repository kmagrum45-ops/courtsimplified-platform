/**
 * GET /api/canlii/case?citation=... -- what CanLII's API says about a case:
 * its proper title, citation, court, date and link, and how many later
 * decisions cite it, with links to a few (src/lib/canlii/canliiCore.ts).
 *
 * Metadata only. Signed-in users only, so the daily allowance is spent on our
 * own users' reading. With no CANLII_API_KEY it answers { enabled: false } at
 * once; with CanLII down or out of quota, { enabled: true, case: null }.
 * Callers render nothing in either case.
 */

import { NextResponse } from "next/server";

import { canlii, canliiEnabled, caseRefFromCitation } from "@/src/lib/canlii/canliiServer";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

export const runtime = "nodejs";

/** How many citing decisions are given their own link (one metadata call each, cached). */
const LINKED_CITING = 3;

export async function GET(request: Request) {
  if (!canliiEnabled()) return NextResponse.json({ enabled: false });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to look up a case." }, { status: 401 });

  const citation = (new URL(request.url).searchParams.get("citation") ?? "").trim().slice(0, 200);
  if (!citation || !caseRefFromCitation(citation)) return NextResponse.json({ enabled: true, case: null });

  try {
    const api = canlii();
    const found = await api.lookupCase(citation);
    if (!found) return NextResponse.json({ enabled: true, case: null });

    const citing = await api.citingCases({ databaseId: found.databaseId, caseId: found.caseId });
    const examples = [];
    for (const item of citing?.cases.slice(0, LINKED_CITING) ?? []) {
      const meta = await api.caseMetadata({ databaseId: item.databaseId, caseId: item.caseId });
      examples.push({ title: item.title, citation: item.citation, url: meta?.url ?? null });
    }
    return NextResponse.json({
      enabled: true,
      case: found,
      citing: citing ? { count: citing.count, examples } : null,
    });
  } catch {
    return NextResponse.json({ enabled: true, case: null });
  }
}
