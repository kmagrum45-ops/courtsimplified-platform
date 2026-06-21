import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type CourtPath = "family" | "small-claims" | "civil";

type CleanCourtForm = {
  court_type: CourtPath;
  form_number: string | null;
  official_title: string | null;
  pdf_path: string | null;
  word_path: string | null;
  form_group: string | null;
  procedure_stage: string | null;
  purpose: string | null;
};

type FormRuleRequest = {
  courtPath?: CourtPath;
  text?: string;
  requiredNextForms?: string[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return normalize(value).replace(/[^a-z0-9.]/g, "");
}

function extractFormNumber(value: string) {
  const match = String(value || "").match(
    /\b(?:form\s*)?([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)\b/i
  );

  return match ? compact(match[1].replace(/^form/i, "")) : "";
}

function displayFormNumber(form: CleanCourtForm) {
  const raw = String(form.form_number || "").trim();

  if (!raw) return "";

  return raw.toLowerCase().startsWith("form ") ? raw : `Form ${raw}`;
}

function displayTitle(form: CleanCourtForm) {
  return String(form.official_title || "").trim();
}

function formSearchText(form: CleanCourtForm) {
  return normalize(
    [
      displayFormNumber(form),
      displayTitle(form),
      form.form_group || "",
      form.procedure_stage || "",
      form.purpose || "",
      form.pdf_path || "",
      form.word_path || "",
    ].join(" ")
  );
}

function isExactFormNumberMatch(form: CleanCourtForm, requested: string) {
  const wantedNumber = extractFormNumber(requested);
  if (!wantedNumber) return false;

  const actualNumber = compact(String(form.form_number || "").replace(/^form/i, ""));
  return actualNumber === wantedNumber;
}

function matchesRequestedLabel(form: CleanCourtForm, requested: string) {
  const wanted = normalize(requested);
  const wantedCompact = compact(requested);

  if (!wanted && !wantedCompact) return false;

  if (isExactFormNumberMatch(form, requested)) return true;

  const number = normalize(displayFormNumber(form));
  const title = normalize(displayTitle(form));
  const combined = formSearchText(form);

  return (
    number === wanted ||
    title === wanted ||
    combined === wanted ||
    combined.includes(wanted) ||
    wanted.includes(title)
  );
}

function uniqueForms(forms: CleanCourtForm[]) {
  const seen = new Set<string>();

  return forms.filter((form) => {
    const key = [
      form.court_type,
      compact(form.form_number || ""),
      normalize(form.official_title || ""),
      form.pdf_path || "",
      form.word_path || "",
    ].join("|");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FormRuleRequest;

    const courtPath = body.courtPath;
    const requestedLabels = Array.isArray(body.requiredNextForms)
      ? body.requiredNextForms.filter(Boolean)
      : [];

    if (!courtPath) {
      return NextResponse.json(
        { error: "courtPath is required." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("court_form_clean_view")
      .select(
        "court_type, form_number, official_title, pdf_path, word_path, form_group, procedure_stage, purpose"
      )
      .eq("court_type", courtPath);

    const { data, error } = await query;

    if (error) {
      console.error("form-rules clean view error:", error);
      return NextResponse.json(
        { error: "Could not read court_form_clean_view." },
        { status: 500 }
      );
    }

    const cleanForms = (data || []) as CleanCourtForm[];

    const matchedForms =
      requestedLabels.length > 0
        ? uniqueForms(
            requestedLabels.flatMap((label) =>
              cleanForms.filter((form) => matchesRequestedLabel(form, label))
            )
          )
        : [];

    return NextResponse.json({
      sourceView: "court_form_clean_view",
      courtPath,
      requestedLabels,
      forms: matchedForms.map((form) => ({
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
  } catch (err) {
    console.error("form-rules route error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}