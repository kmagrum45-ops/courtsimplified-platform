/**
 * GET /api/canlii/case?citation=... -- what CanLII's API says about a case:
 * its proper title, citation, date and link, and how many later decisions
 * cite it, with links to a few (src/lib/canlii/canliiApi.ts).
 *
 * Signed-in users only, so the daily allowance is spent on our users' own
 * cases. Metadata only. With no CANLII_API_KEY, or with CanLII down, it answers
 * { enabled: false } or { case: null } straight away; callers render nothing.
 */

import { NextResponse } from "next/server";

import { canliiEnabled, caseMetadata, caseRefFromCitation, citingCases, lookupCase } from "@/src/lib/canlii/canliiApi";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

const LINKED_CITING = 3;

export async function GET(request: Request) {
  if (!canliiEnabled()) return NextResponse.json({ enabled: false });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to look up a case." }, { status: 401 });

  const citation = (new URL(request.url).searchParams.get("citation") ?? "").trim().slice(0, 200);
  if (!citation || !caseRefFromCitation(citation)) return NextResponse.json({ enabled: true, case: null });

  const found = await lookupCase(citation);
  if (!found) return NextResponse.json({ enabled: true, case: null });

  const citing = await citingCases({ databaseId: found.databaseId, caseId: found.caseId });
  const linked = [];
  for (const item of citing?.cases.slice(0, LINKED_CITING) ?? []) {
    const meta = await caseMetadata({ databaseId: item.databaseId, caseId: item.caseId });
    linked.push({ title: item.title, citation: item.citation, url: meta?.url ?? null });
  }
  return NextResponse.json({
    enabled: true,
    case: found,
    citing: citing ? { count: citing.count, examples: linked } : null,
  });
}
