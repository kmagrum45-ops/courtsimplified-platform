import { NextRequest, NextResponse } from "next/server";

import { explainPassage } from "@/src/lib/case-system/retrieval/explainProvision";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { plainExplanationsEnabled } from "@/src/lib/content-library/phaseScope";

/**
 * A checked plain-language explanation of one provision from the corpus.
 *
 * Takes a passage id only -- never text -- so what is explained is always the
 * official text re-read from the vendored source with its hash verified. The
 * explanation is shown only if an independent second model call and code both
 * find nothing in it the provision does not say and nothing left out
 * (explainProvision.ts). It explains the provision for anyone; it says
 * nothing about the person's case.
 *
 * No sign-in, same reasoning as /api/intake/tidy-wording: the whole site,
 * /api included, is behind the access-password gate, the input is one short
 * id, and results are cached per passage.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const ID = /^corpus:[A-Za-z0-9._-]{1,120}:\d{1,6}$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  const id = body && typeof body === "object" ? (body as { id?: unknown }).id : undefined;
  if (typeof id !== "string" || !ID.test(id)) {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  if (!plainExplanationsEnabled() || !hasConfiguredServerAi()) {
    return NextResponse.json({ ok: false, error: "Plain explanations are not available right now." }, { status: 503 });
  }

  const result = await explainPassage(id);
  if (result.ok) return NextResponse.json({ ok: true, explanation: result.explanation, citation: result.citation });
  if (result.reason === "not-found") {
    return NextResponse.json({ ok: false, error: "That provision was not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
}
