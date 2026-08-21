import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  getCanonicalFormLookup,
  type FormsCourtPath,
} from "../../../src/lib/case-system/formsSelectedCase";

type CleanCourtForm = {
  canonical_form_id: string | null;
  court_type: FormsCourtPath;
  form_number: string | null;
  official_title: string | null;
  pdf_path: string | null;
  word_path: string | null;
  form_group: string | null;
  procedure_stage: string | null;
  purpose: string | null;
};

type FormRuleRequest = {
  courtPath?: unknown;
  canonicalFormIds?: unknown;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function courtPath(value: unknown): FormsCourtPath | null {
  return value === "family" || value === "small-claims" || value === "civil"
    ? value
    : null;
}

export function resolveCanonicalFormIds(
  courtType: FormsCourtPath,
  values: unknown,
): string[] | null {
  if (!Array.isArray(values) || values.length === 0) return null;

  const ids = values.map((canonicalFormId) =>
    getCanonicalFormLookup({ canonicalFormId, courtType }),
  );

  if (ids.some((item) => item === null)) return null;

  return Array.from(new Set(ids.map((item) => item!.canonicalFormId)));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FormRuleRequest;
    const courtType = courtPath(body.courtPath);

    if (!courtType) {
      return NextResponse.json(
        { error: "A supported courtPath is required." },
        { status: 400 },
      );
    }

    const canonicalFormIds = resolveCanonicalFormIds(
      courtType,
      body.canonicalFormIds,
    );

    if (!canonicalFormIds) {
      return NextResponse.json(
        { error: "One or more canonicalFormIds are required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("court_form_clean_view")
      .select(
        "canonical_form_id, court_type, form_number, official_title, pdf_path, word_path, form_group, procedure_stage, purpose",
      )
      .eq("court_type", courtType)
      .in("canonical_form_id", canonicalFormIds);

    if (error) {
      console.error("form-rules clean view error:", error.message);
      return NextResponse.json(
        { error: "Could not read court_form_clean_view." },
        { status: 500 },
      );
    }

    const forms = (data || []) as CleanCourtForm[];
    const returnedIds = new Set(
      forms
        .map((form) => form.canonical_form_id)
        .filter((id): id is string => Boolean(id)),
    );
    const unresolvedCanonicalFormIds = canonicalFormIds.filter(
      (id) => !returnedIds.has(id),
    );

    return NextResponse.json({
      sourceView: "court_form_clean_view",
      courtPath: courtType,
      canonicalFormIds,
      unresolvedCanonicalFormIds,
      forms: forms.map((form) => ({
        canonical_form_id: form.canonical_form_id,
        court_type: form.court_type,
        form_number: form.form_number,
        official_title: form.official_title,
        pdf_path: form.pdf_path,
        word_path: form.word_path,
        form_group: form.form_group,
        procedure_stage: form.procedure_stage,
        purpose: form.purpose,
        has_pdf: Boolean(form.pdf_path),
        has_word: Boolean(form.word_path),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
