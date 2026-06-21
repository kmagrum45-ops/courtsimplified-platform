import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CourtPath = "family" | "small-claims" | "civil";

type CourtForm = {
  id: string | null;
  file_path: string | null;
  court_type: CourtPath;
  file_type: "pdf" | "docx";
  form_number: string | null;
  official_title: string | null;
  is_active: boolean;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function getFieldType(field: any) {
  const name = field?.constructor?.name || "UnknownField";

  if (name.includes("Text")) return "text";
  if (name.includes("CheckBox")) return "checkbox";
  if (name.includes("Dropdown")) return "dropdown";
  if (name.includes("OptionList")) return "option_list";
  if (name.includes("RadioGroup")) return "radio";
  if (name.includes("Signature")) return "signature";
  if (name.includes("Button")) return "button";

  return name;
}

function pdfBytesToText(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("latin1");
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) || []).length;
}

function analyzeRawPdfMarkers(raw: string) {
  const hasAcroForm = raw.includes("/AcroForm");
  const hasXfa = raw.includes("/XFA");
  const widgetCount = countMatches(raw, /\/Subtype\s*\/Widget/g);
  const annotationCount = countMatches(raw, /\/Annots/g);
  const textFieldCount = countMatches(raw, /\/FT\s*\/Tx/g);
  const buttonFieldCount = countMatches(raw, /\/FT\s*\/Btn/g);
  const choiceFieldCount = countMatches(raw, /\/FT\s*\/Ch/g);

  let classification:
    | "acroform_fillable"
    | "xfa_fillable"
    | "annotation_fillable"
    | "flat_pdf"
    | "broken_pdf" = "flat_pdf";

  if (hasXfa) {
    classification = "xfa_fillable";
  } else if (hasAcroForm || textFieldCount > 0 || buttonFieldCount > 0 || choiceFieldCount > 0) {
    classification = "acroform_fillable";
  } else if (widgetCount > 0 || annotationCount > 0) {
    classification = "annotation_fillable";
  }

  return {
    hasAcroForm,
    hasXfa,
    widgetCount,
    annotationCount,
    textFieldCount,
    buttonFieldCount,
    choiceFieldCount,
    classification,
  };
}

function makeScanStatus(params: {
  pdfLibFieldCount: number;
  rawClassification: string;
}) {
  if (params.pdfLibFieldCount > 0) return "scanned_pdf_lib_acroform_fields";
  if (params.rawClassification === "xfa_fillable") return "scanned_xfa_fillable";
  if (params.rawClassification === "acroform_fillable") return "scanned_raw_acroform_fillable";
  if (params.rawClassification === "annotation_fillable") return "scanned_annotation_fillable";
  return "scanned_flat_pdf";
}

async function saveScanRows(args: {
  form: CourtForm;
  rows: Array<{
    is_fillable: boolean;
    field_name: string | null;
    field_type: string | null;
    field_index: number | null;
    scan_status: string;
    scan_error: string | null;
  }>;
}) {
  await supabase.from("court_form_fields").delete().eq("form_id", args.form.id);

  const insertRows = args.rows.map((row) => ({
    form_id: args.form.id,
    court_type: args.form.court_type,
    form_number: args.form.form_number,
    official_title: args.form.official_title,
    file_path: args.form.file_path,
    file_type: args.form.file_type,
    is_fillable: row.is_fillable,
    field_name: row.field_name,
    field_type: row.field_type,
    field_index: row.field_index,
    scan_status: row.scan_status,
    scan_error: row.scan_error,
  }));

  const { error } = await supabase.from("court_form_fields").insert(insertRows);

  if (error) {
    throw new Error(`Could not save scan rows: ${error.message}`);
  }
}

async function scanSingleForm(form: CourtForm) {
  if (!form.id) {
    return { ok: false, form, error: "Missing form id." };
  }

  if (!form.file_path) {
    return { ok: false, form, error: "Missing file_path." };
  }

  if (form.file_type !== "pdf" || !form.file_path.toLowerCase().endsWith(".pdf")) {
    await saveScanRows({
      form,
      rows: [
        {
          is_fillable: false,
          field_name: null,
          field_type: null,
          field_index: null,
          scan_status: "docx_or_non_pdf",
          scan_error: "Only PDF files can be scanned for fillable PDF fields.",
        },
      ],
    });

    return {
      ok: false,
      form,
      classification: "docx_or_non_pdf",
      error: "Only PDF files can be scanned for fillable fields.",
    };
  }

  const { data: publicData } = supabase.storage
    .from("court-forms")
    .getPublicUrl(form.file_path);

  const pdfResponse = await fetch(publicData.publicUrl);

  if (!pdfResponse.ok) {
    await saveScanRows({
      form,
      rows: [
        {
          is_fillable: false,
          field_name: null,
          field_type: null,
          field_index: null,
          scan_status: "broken_pdf",
          scan_error: `Could not download PDF from Supabase. Status: ${pdfResponse.status}`,
        },
      ],
    });

    return {
      ok: false,
      form,
      classification: "broken_pdf",
      error: `Could not download PDF from Supabase. Status: ${pdfResponse.status}`,
    };
  }

  const pdfBytes = await pdfResponse.arrayBuffer();
  const raw = pdfBytesToText(pdfBytes);
  const rawMarkers = analyzeRawPdfMarkers(raw);

  let pdfDoc: PDFDocument | null = null;
  let pdfLibFields: any[] = [];
  let pdfOpenError = "";

  try {
    pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });

    try {
      pdfLibFields = pdfDoc.getForm().getFields();
    } catch {
      pdfLibFields = [];
    }
  } catch (error) {
    pdfOpenError =
      error instanceof Error ? error.message : "PDF could not be opened.";
  }

  const scanStatus = makeScanStatus({
    pdfLibFieldCount: pdfLibFields.length,
    rawClassification: rawMarkers.classification,
  });

  const isFillable =
    pdfLibFields.length > 0 ||
    rawMarkers.classification === "xfa_fillable" ||
    rawMarkers.classification === "acroform_fillable" ||
    rawMarkers.classification === "annotation_fillable";

  if (pdfOpenError) {
    await saveScanRows({
      form,
      rows: [
        {
          is_fillable: isFillable,
          field_name: null,
          field_type: null,
          field_index: null,
          scan_status: "broken_pdf",
          scan_error: pdfOpenError,
        },
      ],
    });

    return {
      ok: false,
      form,
      isFillable,
      classification: "broken_pdf",
      rawMarkers,
      error: pdfOpenError,
    };
  }

  if (pdfLibFields.length > 0) {
    const rows = pdfLibFields.map((field, index) => ({
      is_fillable: true,
      field_name: field.getName(),
      field_type: getFieldType(field),
      field_index: index,
      scan_status: scanStatus,
      scan_error: null,
    }));

    await saveScanRows({ form, rows });

    return {
      ok: true,
      form,
      isFillable: true,
      classification: "pdf_lib_acroform_fillable",
      fieldCount: pdfLibFields.length,
      rawMarkers,
      fields: rows.map((row) => ({
        field_name: row.field_name,
        field_type: row.field_type,
        field_index: row.field_index,
      })),
    };
  }

  await saveScanRows({
    form,
    rows: [
      {
        is_fillable: isFillable,
        field_name: null,
        field_type: null,
        field_index: null,
        scan_status: scanStatus,
        scan_error: null,
      },
    ],
  });

  return {
    ok: true,
    form,
    isFillable,
    classification: rawMarkers.classification,
    fieldCount: 0,
    rawMarkers,
    fields: [],
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const courtPath = safe(url.searchParams.get("courtPath")) as CourtPath;
    const formNumber = safe(url.searchParams.get("formNumber"));
    const limitRaw = Number(url.searchParams.get("limit") || "1");
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 1;

    let query = supabase
      .from("court_form_library")
      .select("id, file_path, court_type, file_type, form_number, official_title, is_active")
      .eq("is_active", true)
      .eq("file_type", "pdf")
      .limit(limit);

    if (courtPath) query = query.eq("court_type", courtPath);
    if (formNumber) query = query.ilike("form_number", `%${formNumber}%`);

    const { data: forms, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Could not read court_form_library: ${error.message}` },
        { status: 500 }
      );
    }

    if (!forms || forms.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No matching PDF forms found.",
          received: { courtPath, formNumber, limit },
        },
        { status: 404 }
      );
    }

    const results = [];

    for (const form of forms as CourtForm[]) {
      results.push(await scanSingleForm(form));
    }

    return NextResponse.json({
      ok: true,
      scanned: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown scanner error.",
      },
      { status: 500 }
    );
  }
}