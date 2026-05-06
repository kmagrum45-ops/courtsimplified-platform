import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

type CourtPath = "family" | "small-claims" | "civil";

type IncomingData = {
  formType?: string;
  courtPath?: CourtPath;
  yourName?: string;
  otherParty?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  goal?: string;
  extra?: Record<string, any>;
};

type LookupForm = {
  form_number: string;
  official_title: string | null;
  file_path: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function tableForCourt(courtPath?: CourtPath) {
  if (courtPath === "small-claims") return "small_claims_form_lookup";
  if (courtPath === "civil") return "civil_form_lookup";
  return "family_form_lookup";
}

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text.length ? text : fallback;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]/g, "");
}

async function findFormFromSupabase(formType: string, courtPath?: CourtPath) {
  const table = tableForCourt(courtPath);

  const { data, error } = await supabase
    .from(table)
    .select("form_number, official_title, file_path");

  if (error) {
    throw new Error(`Could not read ${table}: ${error.message}`);
  }

  const wanted = normalize(formType);

  const match = (data || []).find((form: LookupForm) => {
    const number = normalize(form.form_number || "");
    const title = normalize(form.official_title || "");
    return wanted.includes(number) || wanted.includes(title);
  });

  return match || null;
}

function wrapText(text: string, maxChars: number) {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxChars) current = test;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as IncomingData;
    const extra = data.extra || {};

    if (!data.formType) {
      return NextResponse.json({ error: "Form type missing." }, { status: 400 });
    }

    const form = await findFormFromSupabase(data.formType, data.courtPath);

    if (!form) {
      return NextResponse.json(
        { error: `Form not found in Supabase lookup table: ${data.formType}` },
        { status: 404 }
      );
    }

    if (!form.file_path) {
      return NextResponse.json(
        { error: `No file_path connected for ${form.form_number}.` },
        { status: 400 }
      );
    }

    if (form.file_path.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: "DOCX forms cannot be generated as PDFs yet. Download the Word form instead." },
        { status: 400 }
      );
    }

    const { data: publicData } = supabase.storage
      .from("court-forms")
      .getPublicUrl(form.file_path);

    const response = await fetch(publicData.publicUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not load PDF from Supabase: ${form.file_path}` },
        { status: 500 }
      );
    }

    const pdfDoc = await PDFDocument.load(await response.arrayBuffer(), {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const pages = pdfDoc.getPages();

    function draw(pageIndex: number, text: string, x: number, y: number, size = 9, isBold = false) {
      const page = pages[pageIndex];
      if (!page || !safe(text)) return;
      page.drawText(safe(text), { x, y, size, font: isBold ? bold : font, color: black });
    }

    function drawWrapped(pageIndex: number, text: string, x: number, y: number, maxChars: number, size = 8, maxLines = 20) {
      let currentY = y;
      for (const line of wrapText(text, maxChars).slice(0, maxLines)) {
        draw(pageIndex, line, x, currentY, size);
        currentY -= size + 3;
      }
    }

    const plaintiffName = safe(data.yourName || extra.yourName || extra.plaintiffName || extra.applicantName);
    const defendantName = safe(data.otherParty || extra.otherParty || extra.defendantName || extra.respondentName);
    const courtLocation = safe(extra.courtLocation || extra.court || extra.city);
    const claimNumber = safe(extra.claimNumber || extra.courtFileNumber || extra.fileNumber);
    const amountClaimed = safe(extra.amountClaimed || extra.claimAmount || extra.amount);
    const facts = safe(data.facts || extra.facts || extra.story || extra.caseSummary);
    const timeline = safe(data.timeline || extra.timeline || extra.importantDates);
    const evidence = safe(data.evidence || extra.evidence || extra.documents);
    const goal = safe(data.goal || extra.goal || extra.ordersRequested || extra.reliefRequested);

    const formNumber = form.form_number.toLowerCase();

    if (formNumber.includes("7a")) {
      draw(0, courtLocation, 290, 675, 8);
      draw(0, claimNumber, 480, 675, 9, true);
      draw(0, plaintiffName, 40, 545, 9);
      draw(0, defendantName, 40, 305, 9);
      drawWrapped(1, `${facts}\n\n${timeline}\n\n${evidence}\n\n${goal}`, 75, 515, 82, 8, 35);
      draw(2, amountClaimed, 168, 626, 10, true);
    } else {
      const summaryPage = pdfDoc.addPage([612, 792]);

      summaryPage.drawText("CourtSimplified Generated Case Information", {
        x: 50,
        y: 735,
        size: 14,
        font: bold,
        color: black,
      });

      summaryPage.drawText(`${form.form_number} — ${form.official_title || ""}`, {
        x: 50,
        y: 710,
        size: 11,
        font,
        color: black,
      });

      const summary = [
        `Court location: ${courtLocation}`,
        `Court / claim file number: ${claimNumber}`,
        `Plaintiff / Applicant: ${plaintiffName}`,
        `Defendant / Respondent: ${defendantName}`,
        `Amount claimed: ${amountClaimed}`,
        "",
        "Facts:",
        facts,
        "",
        "Timeline:",
        timeline,
        "",
        "Evidence:",
        evidence,
        "",
        "Requested result:",
        goal,
      ].join("\n");

      let y = 675;
      for (const line of wrapText(summary, 95).slice(0, 48)) {
        summaryPage.drawText(line, { x: 50, y, size: 9, font, color: black });
        y -= 13;
      }
    }

    const pdfBytes = await pdfDoc.save();

    const cleanFileName = `${form.form_number}-${form.official_title || "Court_Form"}`
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("generate-form route error:", error);
    return NextResponse.json({ error: "Failed to generate form." }, { status: 500 });
  }
}