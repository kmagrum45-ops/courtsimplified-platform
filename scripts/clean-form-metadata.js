require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLE_NAME = "court_form_library";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function cleanSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeFormNumber(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  const match = text.match(/(?:form\s*)?([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)/i);

  if (!match) return text;

  return `Form ${match[1].toUpperCase()}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferFormNumberFromPath(filePath) {
  const fileName = String(filePath || "").split("/").pop() || "";
  const match = fileName.match(/(?:scr-|rscc-|rcp-|flr-|fla-|form-)?([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)/i);

  if (!match) return "";

  return `Form ${match[1].toUpperCase()}`;
}

function removeFileJunk(title) {
  return String(title || "")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi, " ")
    .replace(/\b\d{1,2},?\s+\d{4}\b/g, " ")
    .replace(/\b\d{4}\b/g, " ")
    .replace(/\b(?:rscc|scr|rcp|flr|fla)[-_a-z0-9.]*\b/gi, " ")
    .replace(/\b(?:pdf|docx|doc|html|htm)\b/gi, " ")
    .replace(/\b(?:fil|fill|fillable|en|e|english|french|fr)\b$/gi, " ")
    .replace(/\b(?:fil|fill|fillable|en|e|english|french|fr)\b\s*$/gi, " ")
    .replace(/\.[a-z0-9]+$/gi, " ")
    .replace(/\s*[-–—]\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTitleFromPath(filePath) {
  const fileName = String(filePath || "").split("/").pop() || "";

  let base = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^(scr|rscc|rcp|flr|fla)[-_]*/i, "")
    .replace(/^[0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?[-_\s]*/i, "")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\d{0,4}\b/gi, " ")
    .replace(/\b(?:fil|fill|fillable|en|e|english|fr|french)\b/gi, " ")
    .replace(/\b\d{2,4}\b/g, " ");

  base = cleanSpaces(base);

  return base ? titleCase(base) : "Court Form";
}

function knownTitle(courtType, formNumber) {
  const key = `${courtType}:${String(formNumber || "").toUpperCase().replace(/^FORM\s+/, "")}`;

  const known = {
    "civil:4A": "General Heading",
    "civil:4B": "General Heading",
    "civil:4C": "Backsheet",
    "civil:14A": "Statement of Claim",
    "civil:14B": "Notice of Action",
    "civil:14E": "Notice of Application",
    "civil:16B": "Affidavit of Service",
    "civil:18A": "Statement of Defence",
    "civil:37A": "Notice of Motion",
    "civil:38A": "Notice of Appearance",
    "civil:59A": "Order",

    "small-claims:7A": "Plaintiff's Claim",
    "small-claims:8A": "Affidavit of Service",
    "small-claims:9A": "Defence",
    "small-claims:10A": "Defendant's Claim",
    "small-claims:11A": "Notice of Motion and Supporting Affidavit",
    "small-claims:13A": "List of Proposed Witnesses",
    "small-claims:14A": "Offer to Settle",
    "small-claims:14B": "Acceptance of Offer to Settle",
    "small-claims:14C": "Notice of Withdrawal of Offer to Settle",
    "small-claims:20A": "Notice of Garnishment",
    "small-claims:20B": "Affidavit for Enforcement Request",
    "small-claims:20C": "Notice of Examination",
    "small-claims:20D": "Affidavit for Writ of Seizure and Sale of Land",
    "small-claims:20E": "Writ of Seizure and Sale of Land",

    "family:8": "Application",
    "family:10": "Answer",
    "family:13": "Financial Statement",
    "family:13.1": "Financial Statement",
    "family:14": "Notice of Motion",
    "family:14A": "Affidavit",
    "family:15": "Motion to Change",
    "family:17": "Conference Notice",
    "family:17A": "Case Conference Brief",
    "family:17C": "Settlement Conference Brief",
    "family:25": "Order",
  };

  return known[key] || "";
}

function cleanOfficialTitle(row) {
  const courtType = row.court_type || "";
  const formNumber = normalizeFormNumber(row.form_number || inferFormNumberFromPath(row.file_path));

  const known = knownTitle(courtType, formNumber);

  let title = cleanSpaces(row.official_title || row.purpose || "");

  title = removeFileJunk(title);

  if (!title || title.length < 4 || ["fil", "en", "e", "pdf", "docx", "0519"].includes(title.toLowerCase())) {
    title = inferTitleFromPath(row.file_path);
  }

  title = removeFileJunk(title);

  if (known) {
    title = known;
  }

  title = title
    .replace(/^Form\s+[0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?\s*[-–—:]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || title.length < 3) {
    title = known || inferTitleFromPath(row.file_path);
  }

  return {
    form_number: formNumber,
    official_title: title,
  };
}

function categoryFromTitle(title) {
  const text = String(title || "").toLowerCase();

  if (text.includes("claim") || text.includes("application")) return "Starting case";
  if (text.includes("defence") || text.includes("answer")) return "Responding";
  if (text.includes("service")) return "Service";
  if (text.includes("motion")) return "Motion";
  if (text.includes("conference")) return "Conference";
  if (text.includes("trial")) return "Trial";
  if (text.includes("garnishment") || text.includes("writ") || text.includes("enforcement")) return "Enforcement";
  if (text.includes("financial")) return "Financial disclosure";
  if (text.includes("affidavit")) return "Affidavit evidence";
  if (text.includes("order")) return "Orders";
  if (text.includes("appeal")) return "Appeals";
  if (text.includes("offer to settle")) return "Settlement";

  return "General";
}

function stageFromCategory(category) {
  const text = String(category || "").toLowerCase();

  if (text.includes("starting")) return "starting-case";
  if (text.includes("responding")) return "responding";
  if (text.includes("service")) return "already-started";
  if (text.includes("motion")) return "motion";
  if (text.includes("conference")) return "conference";
  if (text.includes("trial")) return "trial";
  if (text.includes("enforcement")) return "enforcement";
  if (text.includes("settlement")) return "conference";

  return "not-sure";
}

async function getAllRows() {
  const all = [];
  let from = 0;
  const size = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id,court_type,form_number,official_title,file_path,file_type,form_group,procedure_stage,purpose,is_active")
      .range(from, from + size - 1);

    if (error) {
      throw new Error(error.message);
    }

    all.push(...(data || []));

    if (!data || data.length < size) break;

    from += size;
  }

  return all;
}

async function run() {
  console.log("Cleaning court_form_library metadata...");
  console.log("");

  const rows = await getAllRows();

  console.log(`Found ${rows.length} rows.`);
  console.log("");

  const audit = [];

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const cleaned = cleanOfficialTitle(row);
      const category = categoryFromTitle(cleaned.official_title);
      const stage = stageFromCategory(category);

      const update = {
        form_number: cleaned.form_number,
        official_title: cleaned.official_title,
        purpose: cleaned.official_title,
        form_group: category,
        procedure_stage: stage,
        is_active: true,
      };

      const changed =
        row.form_number !== update.form_number ||
        row.official_title !== update.official_title ||
        row.purpose !== update.purpose ||
        row.form_group !== update.form_group ||
        row.procedure_stage !== update.procedure_stage;

      audit.push({
        id: row.id,
        court_type: row.court_type,
        file_path: row.file_path,
        before: {
          form_number: row.form_number,
          official_title: row.official_title,
          purpose: row.purpose,
          form_group: row.form_group,
          procedure_stage: row.procedure_stage,
        },
        after: update,
      });

      if (!changed) {
        skipped += 1;
        continue;
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .update(update)
        .eq("id", row.id);

      if (error) {
        throw new Error(error.message);
      }

      updated += 1;

      console.log(`Updated: ${row.court_type} ${update.form_number} — ${update.official_title}`);
    } catch (error) {
      failed += 1;
      console.error(`FAILED row ${row.id}: ${error.message}`);
    }
  }

  const auditDir = path.join(process.cwd(), "scripts", "form-import-audit");
  fs.mkdirSync(auditDir, { recursive: true });

  const auditPath = path.join(auditDir, `metadata-cleanup-${Date.now()}.json`);
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));

  console.log("");
  console.log("Metadata cleanup complete.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped unchanged: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Audit saved to: ${auditPath}`);
}

run().catch((error) => {
  console.error("Metadata cleanup crashed:", error);
  process.exit(1);
});