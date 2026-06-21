require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_NAME = "court-forms";
const TABLE_NAME = "court_form_library";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SOURCES = [
  {
    court_type: "civil",
    label: "Civil",
    url: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/",
    storageFolder: "ontario/civil/rules-of-civil-procedure",
  },
  {
    court_type: "small-claims",
    label: "Small Claims",
    url: "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/",
    storageFolder: "ontario/small-claims",
  },
  {
    court_type: "family",
    label: "Family",
    url: "https://ontariocourtforms.on.ca/en/family-law-rules-forms/",
    storageFolder: "ontario/family/family-law-rules",
  },
];

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;/gi, "’")
    .replace(/&#8211;/gi, "-")
    .replace(/&#8212;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href, pageUrl) {
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return "";
  }
}

function getFileType(url) {
  const clean = url.split("?")[0].toLowerCase();

  if (clean.endsWith(".pdf")) return "pdf";
  if (clean.endsWith(".docx")) return "docx";
  if (clean.endsWith(".doc")) return "docx";

  return "";
}

function cleanFileName(name) {
  return String(name || "form")
    .split("?")[0]
    .split("#")[0]
    .replace(/%20/g, "-")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function inferFormNumber(text, fileName) {
  const combined = `${text || ""} ${fileName || ""}`;

  const patterns = [
    /\bform\s+([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)\b/i,
    /\b([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)\s*[-–—]\s*/i,
    /^([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)/i,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match?.[1]) {
      return `Form ${match[1].toUpperCase()}`;
    }
  }

  return "";
}

function titleCase(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferTitle(rowText, formNumber, fileName) {
  let text = String(rowText || "")
    .replace(/\s+/g, " ")
    .trim();

  if (formNumber) {
    const shortNumber = formNumber.replace(/^Form\s+/i, "");
    text = text
      .replace(new RegExp(`\\bForm\\s+${shortNumber}\\b`, "i"), "")
      .replace(new RegExp(`\\b${shortNumber}\\b`, "i"), "")
      .trim();
  }

  text = text
    .replace(/\bPDF\b/gi, "")
    .replace(/\bWord\b/gi, "")
    .replace(/\bDOCX?\b/gi, "")
    .replace(/\bEnglish\b/gi, "")
    .replace(/\bFrench\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text && text.length > 2 && !/^(pdf|word|doc|docx)$/i.test(text)) {
    return text;
  }

  const baseName = String(fileName || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^[a-z]*-?/i, "")
    .replace(/^[0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?[-_\s]*/i, "");

  return titleCase(baseName || fileName || "Court Form");
}

function categoryFromTitle(title, formNumber) {
  const text = `${title || ""} ${formNumber || ""}`.toLowerCase();

  if (text.includes("claim") || text.includes("application")) return "Starting case";
  if (text.includes("defence") || text.includes("answer")) return "Responding";
  if (text.includes("service")) return "Service";
  if (text.includes("motion")) return "Motion";
  if (text.includes("conference")) return "Conference";
  if (text.includes("trial")) return "Trial";
  if (text.includes("enforcement") || text.includes("garnishment") || text.includes("writ")) return "Enforcement";
  if (text.includes("financial")) return "Financial disclosure";
  if (text.includes("affidavit")) return "Affidavit evidence";
  if (text.includes("order")) return "Orders";
  if (text.includes("appeal")) return "Appeals";

  return "General";
}

function stageFromCategory(category) {
  const c = String(category || "").toLowerCase();

  if (c.includes("starting")) return "starting-case";
  if (c.includes("responding")) return "responding";
  if (c.includes("service")) return "already-started";
  if (c.includes("motion")) return "motion";
  if (c.includes("conference")) return "conference";
  if (c.includes("trial")) return "trial";
  if (c.includes("enforcement")) return "enforcement";

  return "not-sure";
}

function extractFormLinksFromHtml(html, source) {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const found = [];

  for (const row of rows) {
    const rowText = stripHtml(row);
    const links = [...row.matchAll(/href=["']([^"']+)["']/gi)];

    for (const link of links) {
      const href = link[1];
      const fullUrl = absoluteUrl(href, source.url);
      const fileType = getFileType(fullUrl);

      if (!fileType) continue;

      const fileName = cleanFileName(fullUrl.split("/").pop() || "");
      const formNumber = inferFormNumber(rowText, fileName);
      const officialTitle = inferTitle(rowText, formNumber, fileName);
      const category = categoryFromTitle(officialTitle, formNumber);
      const stage = stageFromCategory(category);

      found.push({
        court_type: source.court_type,
        form_number: formNumber,
        official_title: officialTitle,
        file_type: fileType,
        source_url: fullUrl,
        original_file_name: fileName,
        storage_path: `${source.storageFolder}/${fileName}`,
        form_group: category,
        procedure_stage: stage,
        purpose: officialTitle,
        is_active: true,
      });
    }
  }

  const fallbackLinks = [...html.matchAll(/href=["']([^"']+\.(?:pdf|docx?|PDF|DOCX?|DOC))["']/g)];

  for (const link of fallbackLinks) {
    const fullUrl = absoluteUrl(link[1], source.url);
    const fileType = getFileType(fullUrl);
    if (!fileType) continue;

    const fileName = cleanFileName(fullUrl.split("/").pop() || "");

    if (found.some((item) => item.source_url === fullUrl)) continue;

    const formNumber = inferFormNumber("", fileName);
    const officialTitle = inferTitle("", formNumber, fileName);
    const category = categoryFromTitle(officialTitle, formNumber);
    const stage = stageFromCategory(category);

    found.push({
      court_type: source.court_type,
      form_number: formNumber,
      official_title: officialTitle,
      file_type: fileType,
      source_url: fullUrl,
      original_file_name: fileName,
      storage_path: `${source.storageFolder}/${fileName}`,
      form_group: category,
      procedure_stage: stage,
      purpose: officialTitle,
      is_active: true,
    });
  }

  const unique = new Map();

  for (const item of found) {
    unique.set(item.source_url, item);
  }

  return Array.from(unique.values());
}

async function downloadFile(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CourtSimplified form importer",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToStorage(filePath, buffer, fileType) {
  const contentType =
    fileType === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${filePath}: ${error.message}`);
  }
}

async function upsertCourtForm(item) {
  const row = {
    court_type: item.court_type,
    form_number: item.form_number,
    official_title: item.official_title,
    file_path: item.storage_path,
    file_type: item.file_type,
    form_group: item.form_group,
    procedure_stage: item.procedure_stage,
    purpose: item.purpose,
    is_active: true,
  };

  const { data: existing, error: existingError } = await supabase
    .from(TABLE_NAME)
    .select("id")
    .eq("file_path", item.storage_path)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Lookup failed for ${item.storage_path}: ${existingError.message}`);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(row)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Update failed for ${item.storage_path}: ${error.message}`);
    }

    return "updated";
  }

  const { error } = await supabase.from(TABLE_NAME).insert(row);

  if (error) {
    throw new Error(`Insert failed for ${item.storage_path}: ${error.message}`);
  }

  return "inserted";
}

async function run() {
  console.log("CourtSimplified Ontario forms importer");
  console.log("Using table:", TABLE_NAME);
  console.log("Using bucket:", BUCKET_NAME);
  console.log("");

  const allItems = [];

  for (const source of SOURCES) {
    console.log(`Reading ${source.label} official forms page...`);

    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "CourtSimplified form importer",
      },
    });

    if (!response.ok) {
      throw new Error(`Could not read ${source.url}: ${response.status}`);
    }

    const html = await response.text();
    const items = extractFormLinksFromHtml(html, source);

    console.log(`Found ${items.length} ${source.label} form files.`);
    allItems.push(...items);
  }

  const auditDir = path.join(process.cwd(), "scripts", "form-import-audit");
  fs.mkdirSync(auditDir, { recursive: true });

  const auditPath = path.join(auditDir, `ontario-forms-${Date.now()}.json`);
  fs.writeFileSync(auditPath, JSON.stringify(allItems, null, 2));

  console.log("");
  console.log(`Saved audit list: ${auditPath}`);
  console.log("");

  let uploaded = 0;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const item of allItems) {
    try {
      console.log(`Processing ${item.court_type}: ${item.form_number} — ${item.official_title}`);

      const buffer = await downloadFile(item.source_url);

      await uploadToStorage(item.storage_path, buffer, item.file_type);

      const result = await upsertCourtForm(item);

      uploaded += 1;
      if (result === "inserted") inserted += 1;
      if (result === "updated") updated += 1;

      console.log(`  OK: ${result} → ${item.storage_path}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAILED: ${error.message}`);
    }
  }

  console.log("");
  console.log("Import complete.");
  console.log(`Uploaded files: ${uploaded}`);
  console.log(`Inserted rows: ${inserted}`);
  console.log(`Updated rows: ${updated}`);
  console.log(`Failed: ${failed}`);
}

run().catch((error) => {
  console.error("Importer crashed:", error);
  process.exit(1);
});