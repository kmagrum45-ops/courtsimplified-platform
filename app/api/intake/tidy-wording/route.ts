import { NextRequest, NextResponse } from "next/server";

import {
  MAX_TIDY_FIELDS,
  MAX_TIDY_FIELD_LENGTH,
  MAX_TIDY_TOTAL_LENGTH,
  suggestTidyWording,
  type TidyField,
} from "@/src/lib/case-system/intake/tidyWording";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { aiAnalysisTextToUsers } from "@/src/lib/content-library/phaseScope";

/**
 * Suggested spelling and grammar fixes for the user's own text.
 *
 * Returns suggestions only. The client shows each beside the user's words and
 * changes nothing until the user picks it (CLAUDE.md §4). Code in
 * tidyWording.ts drops any suggestion that changes a number or a quote, adds a
 * name or adds a legal term.
 *
 * No sign-in, same reasoning as /api/intake/safety-check: the whole site,
 * /api included, is behind the access-password gate, the call is the
 * standard tier, and the input is capped below.
 */

export const runtime = "nodejs";

function isTidyBody(value: unknown): value is { fields: TidyField[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = (value as { fields?: unknown }).fields;
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > MAX_TIDY_FIELDS) return false;
  const total = fields.reduce(
    (sum, field) => sum + (typeof (field as TidyField)?.text === "string" ? (field as TidyField).text.length : 0),
    0,
  );
  if (total > MAX_TIDY_TOTAL_LENGTH) return false;
  return fields.every(
    (field) =>
      field &&
      typeof field === "object" &&
      typeof (field as TidyField).key === "string" &&
      (field as TidyField).key.length <= 64 &&
      typeof (field as TidyField).text === "string" &&
      (field as TidyField).text.length <= MAX_TIDY_FIELD_LENGTH,
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  if (!isTidyBody(body)) {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }

  /*
   * The suggestion is model-written text shown to a user, so it honours the
   * same switch as the analysis (phaseScope.ts). It is the user's own words
   * with spelling fixed — never legal content: tidyWording.ts refuses any
   * suggestion that adds a legal term — and nothing applies until they pick it.
   */
  const apiKey = process.env.OPENAI_API_KEY;
  if (!aiAnalysisTextToUsers() || !hasConfiguredServerAi() || !apiKey) {
    return NextResponse.json(
      { ok: false, error: "The spelling check is not available right now." },
      { status: 503 },
    );
  }

  try {
    const suggestions = await suggestTidyWording(body.fields, apiKey);
    return NextResponse.json({ ok: true, suggestions });
  } catch {
    console.error("Tidy-wording route failed.");
    return NextResponse.json(
      { ok: false, error: "The spelling check could not run just now. Your own words are unchanged." },
      { status: 500 },
    );
  }
}
