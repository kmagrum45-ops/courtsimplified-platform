import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CourtForm = {
  id: string;
  form_number: string | null;
  official_title: string | null;
  file_path: string | null;
  file_type: string | null;
  court_type: string | null;
};

type ScanPayload = {
  form_id: string;
  form_number: string;
  official_title: string;
  court_type: string;
  file_path: string;
  page_count: number;
  field_count: number;
  has_acroform: boolean;
  likely_xfa: boolean;
  strategy: string;
  usable_for_autofill: boolean;
  fields: string[];
  scan_error: string | null;
  scanned_at: string;
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text.length ? text : fallback;
}

function isRealFillableField(fieldName: string) {
  const name = fieldName.toLowerCase();

  const fakeParts = [
    "navigationbtn",
    "navigation",
    "print",
    "submit",
    "reset",
    "button",
    "btn",
    "barcode",
    "pagecount",
    "hidden",
  ];

  return !fakeParts.some((part) => name.includes(part));
}

function looksLikePdf(form: CourtForm) {
  const filePath = safe(form.file_path).toLowerCase();
  const fileType = safe(form.file_type).toLowerCase();

  return filePath.endsWith(".pdf") || fileType.includes("pdf");
}

async function saveInventoryRow(payload: ScanPayload) {
  const { error } = await supabase
    .from("pdf_form_inventory")
    .upsert(payload, {
      onConflict: "file_path",
    });

  if (error) {
    throw new Error(
      `Inventory save failed for ${payload.file_path}: ${error.message}`
    );
  }
}

export async function GET() {
  try {
    const { data: forms, error } = await supabase
      .from("court_form_library")
      .select(`
        id,
        form_number,
        official_title,
        file_path,
        file_type,
        court_type
      `)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pdfForms = ((forms || []) as CourtForm[]).filter(looksLikePdf);

    let scanned = 0;
    let usableAcroformCount = 0;
    let fakeOnlyAcroformCount = 0;
    let xfaCount = 0;
    let flattenedCount = 0;
    let brokenCount = 0;

    const saveErrors: string[] = [];

    for (const form of pdfForms) {
      if (!form.file_path) continue;

      const basePayload = {
        form_id: form.id,
        form_number: safe(form.form_number),
        official_title: safe(form.official_title),
        court_type: safe(form.court_type),
        file_path: form.file_path,
        scanned_at: new Date().toISOString(),
      };

      try {
        const { data: publicData } = supabase.storage
          .from("court-forms")
          .getPublicUrl(form.file_path);

        const response = await fetch(publicData.publicUrl);

        if (!response.ok) {
          await saveInventoryRow({
            ...basePayload,
            page_count: 0,
            field_count: 0,
            has_acroform: false,
            likely_xfa: false,
            strategy: "broken",
            usable_for_autofill: false,
            fields: [],
            scan_error: "Could not download PDF",
          });

          brokenCount++;
          continue;
        }

        const bytes = await response.arrayBuffer();

        let pdfDoc: PDFDocument;

        try {
          pdfDoc = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
            throwOnInvalidObject: false,
            updateMetadata: false,
          });
        } catch (loadError) {
          await saveInventoryRow({
            ...basePayload,
            page_count: 0,
            field_count: 0,
            has_acroform: false,
            likely_xfa: false,
            strategy: "broken",
            usable_for_autofill: false,
            fields: [],
            scan_error:
              loadError instanceof Error
                ? loadError.message
                : "Could not open PDF",
          });

          brokenCount++;
          continue;
        }

        const pageCount = pdfDoc.getPageCount();

        let rawFields: string[] = [];
        let realFields: string[] = [];
        let hasAnyAcroFormFields = false;
        let hasRealAcroFormFields = false;

        try {
          const formObject = pdfDoc.getForm();

          rawFields = formObject.getFields().map((field) => field.getName());
          hasAnyAcroFormFields = rawFields.length > 0;
          realFields = rawFields.filter(isRealFillableField);
          hasRealAcroFormFields = realFields.length > 0;
        } catch {
          rawFields = [];
          realFields = [];
          hasAnyAcroFormFields = false;
          hasRealAcroFormFields = false;
        }

        const likelyXfa = !hasAnyAcroFormFields && pageCount > 0;

        let strategy = "flattened";
        let usableForAutofill = false;

        if (hasRealAcroFormFields) {
          strategy = "acroform";
          usableForAutofill = true;
          usableAcroformCount++;
        } else if (hasAnyAcroFormFields && !hasRealAcroFormFields) {
          strategy = "acroform_fake_fields_only";
          fakeOnlyAcroformCount++;
        } else if (likelyXfa) {
          strategy = "xfa";
          xfaCount++;
        } else {
          strategy = "flattened";
          flattenedCount++;
        }

        await saveInventoryRow({
          ...basePayload,
          page_count: pageCount,
          field_count: realFields.length,
          has_acroform: hasRealAcroFormFields,
          likely_xfa: likelyXfa,
          strategy,
          usable_for_autofill: usableForAutofill,
          fields: realFields,
          scan_error: null,
        });

        scanned++;
      } catch (scanError) {
        brokenCount++;

        const message =
          scanError instanceof Error ? scanError.message : String(scanError);

        saveErrors.push(message);
        console.error("Scanner error:", form.file_path, scanError);
      }
    }

    return NextResponse.json({
      success: true,
      scannedForms: pdfForms.length,
      summary: {
        scanned,
        usableAcroformCount,
        fakeOnlyAcroformCount,
        xfaCount,
        flattenedCount,
        brokenCount,
        saveErrorCount: saveErrors.length,
        saveErrors: saveErrors.slice(0, 20),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to scan forms",
      },
      { status: 500 }
    );
  }
}