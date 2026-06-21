import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

type CourtPath = "family" | "small-claims" | "civil";

type IncomingData = {
  formType?: string;
  formId?: string;
  formPath?: string;
  courtPath?: CourtPath;
  caseId?: string | null;
  master_result?: unknown;
  yourName?: string;
  otherParty?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  goal?: string;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
};

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

type PdfInspection = {
  pageCount: number;
  fieldCount: number;
  fieldNames: string[];
  hasAcroForm: boolean;
  likelyXfa: boolean;
  strategy: "acroform" | "xfa" | "flattened" | "unsupported" | "unknown";
};

type OverlayField = {
  field_key: string;
  field_label: string | null;
  page_number: number;
  x_position: number;
  y_position: number;
  font_size: number | null;
};

type CaseValues = {
  plaintiffName: string;
  plaintiffAddress: string;
  plaintiffPhone: string;
  plaintiffEmail: string;
  defendantName: string;
  defendantAddress: string;
  defendantPhone: string;
  defendantEmail: string;
  applicantName: string;
  respondentName: string;
  childNames: string;
  courtLocation: string;
  courtFileNumber: string;
  amountClaimed: string;
  facts: string;
  timeline: string;
  evidenceSummary: string;
  requestedResult: string;
  proceduralStage: string;
  caseType: string;
  formPurpose: string;
};

type FillDiagnostic = {
  target: string;
  source: "acroform" | "overlay";
  mappedKey: string;
  valuePresent: boolean;
  filled: boolean;
  reason: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const FIELD_ALIASES: Record<keyof CaseValues, string[]> = {
  plaintiffName: [
    "plaintiffname",
    "plaintiff",
    "claimantname",
    "claimant",
    "applicantname",
    "applicant",
    "movingparty",
    "movingpartyname",
    "yourname",
    "fullname",
    "name",
  ],
  plaintiffAddress: [
    "plaintiffaddress",
    "claimantaddress",
    "applicantaddress",
    "youraddress",
    "address",
    "mailingaddress",
  ],
  plaintiffPhone: [
    "plaintiffphone",
    "claimantphone",
    "applicantphone",
    "yourphone",
    "phone",
    "telephone",
  ],
  plaintiffEmail: [
    "plaintiffemail",
    "claimantemail",
    "applicantemail",
    "youremail",
    "email",
  ],
  defendantName: [
    "defendantname",
    "defendant",
    "respondentname",
    "respondent",
    "otherparty",
    "otherpartyname",
  ],
  defendantAddress: [
    "defendantaddress",
    "respondentaddress",
    "otherpartyaddress",
  ],
  defendantPhone: [
    "defendantphone",
    "respondentphone",
    "otherpartyphone",
  ],
  defendantEmail: [
    "defendantemail",
    "respondentemail",
    "otherpartyemail",
  ],
  applicantName: [
    "applicantname",
    "applicant",
    "movingpartyname",
    "movingparty",
  ],
  respondentName: [
    "respondentname",
    "respondent",
    "respondingpartyname",
    "respondingparty",
  ],
  childNames: [
    "child",
    "children",
    "childname",
    "childrennames",
    "namesofchildren",
  ],
  courtLocation: [
    "courtlocation",
    "court",
    "location",
    "city",
    "municipality",
    "placeofcourt",
  ],
  courtFileNumber: [
    "courtfilenumber",
    "filenumber",
    "claimnumber",
    "applicationnumber",
    "casenumber",
    "courtfile",
  ],
  amountClaimed: [
    "amountclaimed",
    "claimamount",
    "amount",
    "damages",
    "moneyclaimed",
    "totalclaimed",
  ],
  facts: [
    "facts",
    "details",
    "reasons",
    "reason",
    "story",
    "claimdetails",
    "background",
    "summary",
  ],
  timeline: [
    "timeline",
    "chronology",
    "dates",
    "events",
  ],
  evidenceSummary: [
    "evidence",
    "evidencesummary",
    "documents",
    "attachments",
    "exhibits",
  ],
  requestedResult: [
    "orders",
    "order",
    "relief",
    "remedy",
    "request",
    "requestedresult",
    "whatyouwant",
  ],
  proceduralStage: [
    "stage",
    "proceduralstage",
    "step",
    "currentstage",
  ],
  caseType: [
    "casetype",
    "courtpath",
    "path",
    "mattertype",
  ],
  formPurpose: [
    "purpose",
    "formpurpose",
  ],
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text.length ? text : fallback;
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFormNumber(value: string) {
  return normalize(value.replace(/^form\s*/i, ""));
}

function extractFormNumber(label: string) {
  const cleaned = String(label || "").replace(/[–—]/g, "-");
  const match = cleaned.match(
    /\b(?:form\s*)?([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)\b/i,
  );

  return match ? normalizeFormNumber(match[1]) : "";
}

function titleCaseFromSlug(value: string) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferTitleFromPath(filePath: string) {
  const fileName = String(filePath || "").split("/").pop() || "";
  const withoutExtension = fileName.replace(/\.[a-z0-9]+$/i, "");
  const withoutLeadingNumber = withoutExtension.replace(
    /^[a-z]*-?[0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?[-_\s]*/i,
    "",
  );

  return titleCaseFromSlug(withoutLeadingNumber || withoutExtension);
}

function displayFormNumber(form: CleanCourtForm) {
  const raw = safe(form.form_number);

  if (!raw) return "";

  return raw.toLowerCase().startsWith("form ") ? raw : `Form ${raw}`;
}

function displayFormTitle(form: CleanCourtForm) {
  return safe(
    form.official_title,
    inferTitleFromPath(form.pdf_path || form.word_path || ""),
  );
}

function getPrimaryPdfPath(form: CleanCourtForm) {
  return safe(form.pdf_path);
}

function getFallbackWordPath(form: CleanCourtForm) {
  return safe(form.word_path);
}

function formSearchText(form: CleanCourtForm) {
  return normalize(
    [
      displayFormNumber(form),
      displayFormTitle(form),
      form.form_group || "",
      form.procedure_stage || "",
      form.purpose || "",
      form.pdf_path || "",
      form.word_path || "",
    ].join(" "),
  );
}

function isExactFormNumberMatch(form: CleanCourtForm, wantedNumber: string) {
  if (!wantedNumber) return false;

  const actualNumber = normalizeFormNumber(form.form_number || "");
  return actualNumber === wantedNumber;
}

function getRecordValue(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return "";

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const direct = record[key];

    if (direct !== undefined && direct !== null && safe(direct)) {
      return safe(direct);
    }
  }

  return "";
}

function deepPick(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") return "";

  const queue: unknown[] = [source];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }

    seen.add(current);

    const record = current as Record<string, unknown>;

    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null && safe(record[key])) {
        return safe(record[key]);
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return "";
}

function arrayText(source: unknown, keys: string[]) {
  const found: string[] = [];

  if (!source || typeof source !== "object") return "";

  const queue: unknown[] = [source];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }

    seen.add(current);

    const record = current as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        const joined = value
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
              return cleanText(
                (item as Record<string, unknown>).name ||
                  (item as Record<string, unknown>).title ||
                  (item as Record<string, unknown>).label ||
                  (item as Record<string, unknown>).description ||
                  JSON.stringify(item),
              );
            }

            return cleanText(item);
          })
          .filter(Boolean)
          .join("; ");

        if (joined) found.push(joined);
      } else if (typeof value === "string" && value.trim()) {
        found.push(value);
      }
    }

    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") {
        queue.push(nested);
      }
    }
  }

  return found.filter(Boolean).slice(0, 8).join("; ");
}

async function findFormFromCleanView(data: IncomingData) {
  const requestedLabel = safe(data.formType || data.formId);
  const requestedPath = safe(data.formPath);

  let query = supabase
    .from("court_form_clean_view")
    .select(
      "court_type, form_number, official_title, pdf_path, word_path, form_group, procedure_stage, purpose",
    );

  if (data.courtPath) {
    query = query.eq("court_type", data.courtPath);
  }

  const { data: forms, error } = await query;

  if (error) {
    throw new Error(`Could not read court_form_clean_view: ${error.message}`);
  }

  const cleanForms = (forms || []) as CleanCourtForm[];

  if (requestedPath) {
    const pathMatch = cleanForms.find(
      (form) => form.pdf_path === requestedPath || form.word_path === requestedPath,
    );

    if (pathMatch) return pathMatch;
  }

  if (!requestedLabel) return null;

  const wantedText = normalize(requestedLabel);
  const wantedNumber = extractFormNumber(requestedLabel);

  if (wantedNumber) {
    const exactNumberMatch = cleanForms.find((form) =>
      isExactFormNumberMatch(form, wantedNumber),
    );

    if (exactNumberMatch) return exactNumberMatch;
  }

  const exactTitleMatch = cleanForms.find((form) => {
    const title = normalize(displayFormTitle(form));
    const number = normalize(displayFormNumber(form));
    const combined = normalize(
      `${displayFormNumber(form)} ${displayFormTitle(form)}`,
    );

    return title === wantedText || number === wantedText || combined === wantedText;
  });

  if (exactTitleMatch) return exactTitleMatch;

  return (
    cleanForms.find((form) => {
      const combined = formSearchText(form);

      if (!wantedText) return false;

      return combined.includes(wantedText) || wantedText.includes(combined);
    }) || null
  );
}

function getCaseValues(data: IncomingData, extra: Record<string, unknown>): CaseValues {
  const masterResult = data.master_result || extra.master_result || {};
  const allSources = {
    ...extra,
    ...data,
    master_result: masterResult,
  };

  const plaintiffName = safe(
    data.yourName ||
      extra.yourName ||
      extra.plaintiffName ||
      extra.claimantName ||
      extra.applicantName ||
      extra.movingPartyName ||
      deepPick(allSources, [
        "plaintiffName",
        "claimantName",
        "applicantName",
        "movingPartyName",
        "yourName",
        "fullName",
      ]),
  );

  const defendantName = safe(
    data.otherParty ||
      extra.otherParty ||
      extra.defendantName ||
      extra.respondentName ||
      deepPick(allSources, [
        "otherParty",
        "defendantName",
        "respondentName",
        "respondingPartyName",
      ]),
  );

  const applicantName = safe(
    extra.applicantName ||
      deepPick(allSources, ["applicantName", "movingPartyName"]) ||
      plaintiffName,
  );

  const respondentName = safe(
    extra.respondentName ||
      deepPick(allSources, ["respondentName", "respondingPartyName"]) ||
      defendantName,
  );

  const facts = safe(
    data.facts ||
      extra.facts ||
      extra.story ||
      extra.caseSummary ||
      deepPick(allSources, ["facts", "story", "caseSummary", "summary"]),
  );

  const timeline = safe(
    data.timeline ||
      extra.timeline ||
      deepPick(allSources, ["timeline", "chronology"]),
  );

  const evidenceSummary = safe(
    data.evidence ||
      extra.evidence ||
      arrayText(allSources, ["evidence", "exhibits", "evidenceItems"]),
  );

  const requestedResult = safe(
    data.goal ||
      extra.goal ||
      extra.ordersRequested ||
      extra.requestedResult ||
      deepPick(allSources, ["goal", "ordersRequested", "requestedResult", "relief"]),
  );

  const childNames = safe(
    extra.childNames ||
      arrayText(allSources, ["children", "childNames", "childrenNames"]),
  );

  return {
    plaintiffName,
    plaintiffAddress: safe(
      extra.yourAddress ||
        extra.plaintiffAddress ||
        extra.claimantAddress ||
        extra.address ||
        deepPick(allSources, [
          "yourAddress",
          "plaintiffAddress",
          "claimantAddress",
          "applicantAddress",
          "address",
        ]),
    ),
    plaintiffPhone: safe(
      extra.yourPhone ||
        extra.plaintiffPhone ||
        extra.phone ||
        deepPick(allSources, ["yourPhone", "plaintiffPhone", "phone"]),
    ),
    plaintiffEmail: safe(
      extra.yourEmail ||
        extra.plaintiffEmail ||
        extra.email ||
        deepPick(allSources, ["yourEmail", "plaintiffEmail", "email"]),
    ),
    defendantName,
    defendantAddress: safe(
      extra.otherPartyAddress ||
        extra.defendantAddress ||
        deepPick(allSources, [
          "otherPartyAddress",
          "defendantAddress",
          "respondentAddress",
        ]),
    ),
    defendantPhone: safe(
      extra.otherPartyPhone ||
        extra.defendantPhone ||
        deepPick(allSources, ["otherPartyPhone", "defendantPhone", "respondentPhone"]),
    ),
    defendantEmail: safe(
      extra.otherPartyEmail ||
        extra.defendantEmail ||
        deepPick(allSources, ["otherPartyEmail", "defendantEmail", "respondentEmail"]),
    ),
    applicantName,
    respondentName,
    childNames,
    courtLocation: safe(
      extra.courtLocation ||
        extra.court ||
        extra.city ||
        deepPick(allSources, ["courtLocation", "court", "city"]),
    ),
    courtFileNumber: safe(
      extra.claimNumber ||
        extra.courtFileNumber ||
        extra.fileNumber ||
        deepPick(allSources, ["claimNumber", "courtFileNumber", "fileNumber"]),
    ),
    amountClaimed: safe(
      extra.amountClaimed ||
        extra.claimAmount ||
        extra.amount ||
        deepPick(allSources, ["amountClaimed", "claimAmount", "amount", "damages"]),
    ),
    facts,
    timeline,
    evidenceSummary,
    requestedResult,
    proceduralStage: safe(
      extra.proceduralStage ||
        extra.stage ||
        deepPick(allSources, ["proceduralStage", "currentStage", "stage"]),
    ),
    caseType: safe(
      data.courtPath ||
        extra.courtPath ||
        deepPick(allSources, ["courtPath", "casePath", "path", "caseType"]),
    ),
    formPurpose: safe(extra.formPurpose || deepPick(allSources, ["formPurpose", "purpose"])),
  };
}

function getValueByKey(key: string, values: CaseValues) {
  const normalizedKey = normalize(key);

  for (const [caseValueKey, aliases] of Object.entries(FIELD_ALIASES)) {
    const typedKey = caseValueKey as keyof CaseValues;

    if (
      normalize(caseValueKey) === normalizedKey ||
      aliases.some((alias) => normalizedKey.includes(alias) || alias.includes(normalizedKey))
    ) {
      return {
        key: typedKey,
        value: safe(values[typedKey]),
      };
    }
  }

  const directKey = key as keyof CaseValues;

  if (values[directKey]) {
    return {
      key: directKey,
      value: safe(values[directKey]),
    };
  }

  return {
    key: "" as keyof CaseValues,
    value: "",
  };
}

function pickValueForField(fieldName: string, values: CaseValues) {
  const name = normalize(fieldName);

  const aliasMatch = getValueByKey(name, values);

  if (aliasMatch.value) return aliasMatch;

  if (
    (name.includes("plaintiff") ||
      name.includes("claimant") ||
      name.includes("applicant")) &&
    name.includes("name")
  ) {
    return { key: "plaintiffName" as keyof CaseValues, value: values.plaintiffName };
  }

  if (
    (name.includes("defendant") || name.includes("respondent")) &&
    name.includes("name")
  ) {
    return { key: "defendantName" as keyof CaseValues, value: values.defendantName };
  }

  if (
    (name.includes("plaintiff") ||
      name.includes("claimant") ||
      name.includes("applicant")) &&
    name.includes("address")
  ) {
    return {
      key: "plaintiffAddress" as keyof CaseValues,
      value: values.plaintiffAddress,
    };
  }

  if (
    (name.includes("defendant") || name.includes("respondent")) &&
    name.includes("address")
  ) {
    return {
      key: "defendantAddress" as keyof CaseValues,
      value: values.defendantAddress,
    };
  }

  if (name.includes("phone")) {
    if (
      name.includes("plaintiff") ||
      name.includes("claimant") ||
      name.includes("applicant")
    ) {
      return {
        key: "plaintiffPhone" as keyof CaseValues,
        value: values.plaintiffPhone,
      };
    }

    return {
      key: "defendantPhone" as keyof CaseValues,
      value: values.defendantPhone,
    };
  }

  if (name.includes("email")) {
    if (
      name.includes("plaintiff") ||
      name.includes("claimant") ||
      name.includes("applicant")
    ) {
      return {
        key: "plaintiffEmail" as keyof CaseValues,
        value: values.plaintiffEmail,
      };
    }

    return {
      key: "defendantEmail" as keyof CaseValues,
      value: values.defendantEmail,
    };
  }

  if (name.includes("amount") || name.includes("damages")) {
    return {
      key: "amountClaimed" as keyof CaseValues,
      value: values.amountClaimed,
    };
  }

  if (name.includes("file") && name.includes("number")) {
    return {
      key: "courtFileNumber" as keyof CaseValues,
      value: values.courtFileNumber,
    };
  }

  if (name.includes("court") && name.includes("location")) {
    return {
      key: "courtLocation" as keyof CaseValues,
      value: values.courtLocation,
    };
  }

  if (name.includes("child") || name.includes("children")) {
    return {
      key: "childNames" as keyof CaseValues,
      value: values.childNames,
    };
  }

  if (name.includes("timeline") || name.includes("chronology")) {
    return {
      key: "timeline" as keyof CaseValues,
      value: values.timeline,
    };
  }

  if (name.includes("evidence") || name.includes("exhibit")) {
    return {
      key: "evidenceSummary" as keyof CaseValues,
      value: values.evidenceSummary,
    };
  }

  if (name.includes("facts") || name.includes("details") || name.includes("reason")) {
    return {
      key: "facts" as keyof CaseValues,
      value: values.facts,
    };
  }

  if (
    name.includes("order") ||
    name.includes("relief") ||
    name.includes("remedy") ||
    name.includes("request")
  ) {
    return {
      key: "requestedResult" as keyof CaseValues,
      value: values.requestedResult,
    };
  }

  return {
    key: "" as keyof CaseValues,
    value: "",
  };
}

function inspectPdf(pdfDoc: PDFDocument): PdfInspection {
  try {
    const pageCount = pdfDoc.getPageCount();

    let fieldNames: string[] = [];
    let fieldCount = 0;
    let hasAcroForm = false;

    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      fieldNames = fields.map((field) => field.getName());
      fieldCount = fields.length;
      hasAcroForm = fieldCount > 0;
    } catch {
      hasAcroForm = false;
    }

    const likelyXfa = !hasAcroForm && pageCount > 0;

    let strategy: PdfInspection["strategy"] = "unknown";

    if (hasAcroForm && fieldCount > 0) {
      strategy = "acroform";
    } else if (likelyXfa) {
      strategy = "xfa";
    } else if (!hasAcroForm && pageCount > 0) {
      strategy = "flattened";
    }

    return {
      pageCount,
      fieldCount,
      fieldNames,
      hasAcroForm,
      likelyXfa,
      strategy,
    };
  } catch {
    return {
      pageCount: 0,
      fieldCount: 0,
      fieldNames: [],
      hasAcroForm: false,
      likelyXfa: false,
      strategy: "unsupported",
    };
  }
}

async function loadOverlayFields(filePath: string) {
  const { data, error } = await supabase
    .from("pdf_overlay_fields")
    .select("field_key, field_label, page_number, x_position, y_position, font_size")
    .eq("file_path", filePath)
    .order("field_key", { ascending: true });

  if (error) {
    throw new Error(`Could not load overlay fields: ${error.message}`);
  }

  return (data || []) as OverlayField[];
}

async function applyOverlayFields(
  pdfDoc: PDFDocument,
  overlayFields: OverlayField[],
  values: CaseValues,
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  let overlayCount = 0;
  const diagnostics: FillDiagnostic[] = [];

  for (const overlay of overlayFields) {
    const pageIndex = Math.max(0, Number(overlay.page_number || 1) - 1);
    const page = pages[pageIndex];

    const valueMatch = getValueByKey(overlay.field_key, values);

    if (!page) {
      diagnostics.push({
        target: overlay.field_key,
        source: "overlay",
        mappedKey: safe(valueMatch.key),
        valuePresent: Boolean(valueMatch.value),
        filled: false,
        reason: "Overlay page was not found in the PDF.",
      });
      continue;
    }

    if (!valueMatch.value) {
      diagnostics.push({
        target: overlay.field_key,
        source: "overlay",
        mappedKey: safe(valueMatch.key),
        valuePresent: false,
        filled: false,
        reason: "No matching case value was available for this overlay key.",
      });
      continue;
    }

    page.drawText(valueMatch.value, {
      x: Number(overlay.x_position),
      y: Number(overlay.y_position),
      size: Number(overlay.font_size || 11),
      font,
      color: rgb(0, 0, 0),
    });

    overlayCount++;

    diagnostics.push({
      target: overlay.field_key,
      source: "overlay",
      mappedKey: safe(valueMatch.key),
      valuePresent: true,
      filled: true,
      reason: "Overlay value was drawn successfully.",
    });
  }

  return {
    overlayCount,
    diagnostics,
  };
}

async function fillAcroFieldsOnly(pdfDoc: PDFDocument, values: CaseValues) {
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  let filledCount = 0;
  const diagnostics: FillDiagnostic[] = [];

  for (const field of fields) {
    const fieldName = field.getName();
    const valueMatch = pickValueForField(fieldName, values);

    if (!valueMatch.value) {
      diagnostics.push({
        target: fieldName,
        source: "acroform",
        mappedKey: safe(valueMatch.key),
        valuePresent: false,
        filled: false,
        reason: "No matching case value was available for this PDF field.",
      });
      continue;
    }

    try {
      if ("setText" in field && typeof (field as any).setText === "function") {
        (field as any).setText(valueMatch.value);
        filledCount++;

        diagnostics.push({
          target: fieldName,
          source: "acroform",
          mappedKey: safe(valueMatch.key),
          valuePresent: true,
          filled: true,
          reason: "AcroForm field was filled successfully.",
        });
      } else {
        diagnostics.push({
          target: fieldName,
          source: "acroform",
          mappedKey: safe(valueMatch.key),
          valuePresent: true,
          filled: false,
          reason: "PDF field does not support text filling.",
        });
      }
    } catch (error) {
      diagnostics.push({
        target: fieldName,
        source: "acroform",
        mappedKey: safe(valueMatch.key),
        valuePresent: true,
        filled: false,
        reason:
          error instanceof Error
            ? `Could not fill field: ${error.message}`
            : "Could not fill field.",
      });
    }
  }

  try {
    form.updateFieldAppearances();
  } catch {
    console.warn("Could not update field appearances.");
  }

  return {
    filledCount,
    diagnostics,
  };
}

async function savePdfSafely(pdfDoc: PDFDocument) {
  return await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
}

function summarizeMissingValues(values: CaseValues) {
  const importantKeys: (keyof CaseValues)[] = [
    "plaintiffName",
    "defendantName",
    "courtFileNumber",
    "courtLocation",
    "facts",
    "requestedResult",
    "amountClaimed",
    "timeline",
    "evidenceSummary",
  ];

  return importantKeys
    .filter((key) => !safe(values[key]))
    .map((key) => String(key));
}

function buildFailureMessage(
  inspection: PdfInspection,
  overlayFields: OverlayField[],
  diagnostics: FillDiagnostic[],
) {
  if (overlayFields.length === 0 && inspection.fieldCount === 0) {
    return "This PDF has no fillable AcroForm fields and no overlay mappings yet. It needs overlay mapping before automatic generation can work.";
  }

  if (inspection.fieldCount > 0 && overlayFields.length === 0) {
    return "This PDF has fillable fields, but none matched the available case data. More case data or field aliases may be needed.";
  }

  if (overlayFields.length > 0) {
    const missing = diagnostics.filter((item) => !item.valuePresent);

    if (missing.length > 0) {
      return "Overlay mappings were found, but the case is missing values needed to fill this form.";
    }
  }

  return "No fields were filled. This form may need additional field mapping or richer case data.";
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as IncomingData;
    const extra =
      data.extra && typeof data.extra === "object"
        ? (data.extra as Record<string, unknown>)
        : {};

    if (!data.formType && !data.formId && !data.formPath) {
      return NextResponse.json(
        {
          error: "Form type, form ID, or form path missing.",
        },
        { status: 400 },
      );
    }

    const form = await findFormFromCleanView(data);

    if (!form) {
      return NextResponse.json(
        {
          error: `Form not found in court_form_clean_view: ${
            data.formType || data.formId || data.formPath
          }`,
        },
        { status: 404 },
      );
    }

    const pdfPath = getPrimaryPdfPath(form);
    const wordPath = getFallbackWordPath(form);

    if (!pdfPath) {
      return NextResponse.json(
        {
          error: wordPath
            ? "This form is Word-only right now. Download the Word fallback instead."
            : `No PDF path is connected for ${displayFormNumber(form)}.`,
          formNumber: displayFormNumber(form),
          formTitle: displayFormTitle(form),
          wordPath: wordPath || null,
          sourceView: "court_form_clean_view",
        },
        { status: 400 },
      );
    }

    const { data: publicData } = supabase.storage
      .from("court-forms")
      .getPublicUrl(pdfPath);

    const pdfResponse = await fetch(publicData.publicUrl);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        {
          error: `Could not load PDF from Supabase: ${pdfPath}`,
        },
        { status: 500 },
      );
    }

    const originalBytes = await pdfResponse.arrayBuffer();

    let pdfDoc: PDFDocument;

    try {
      pdfDoc = await PDFDocument.load(originalBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Could not open this PDF: ${error.message}`
              : "Could not open this PDF.",
          filePath: pdfPath,
        },
        { status: 500 },
      );
    }

    const inspection = inspectPdf(pdfDoc);
    const values = getCaseValues(data, extra);
    const missingCoreValues = summarizeMissingValues(values);
    const overlayFields = await loadOverlayFields(pdfPath);

    let acroFilledCount = 0;
    let overlayFilledCount = 0;
    let acroDiagnostics: FillDiagnostic[] = [];
    let overlayDiagnostics: FillDiagnostic[] = [];

    if (inspection.strategy === "acroform") {
      try {
        const acroResult = await fillAcroFieldsOnly(pdfDoc, values);
        acroFilledCount = acroResult.filledCount;
        acroDiagnostics = acroResult.diagnostics;
      } catch (error) {
        console.warn("AcroForm fill failed, trying overlay fallback:", error);
      }
    }

    if (overlayFields.length > 0) {
      const overlayResult = await applyOverlayFields(pdfDoc, overlayFields, values);
      overlayFilledCount = overlayResult.overlayCount;
      overlayDiagnostics = overlayResult.diagnostics;
    }

    const allDiagnostics = [...acroDiagnostics, ...overlayDiagnostics];

    if (acroFilledCount === 0 && overlayFilledCount === 0) {
      return NextResponse.json(
        {
          error: buildFailureMessage(inspection, overlayFields, allDiagnostics),
          strategy: inspection.strategy,
          acroFilledCount,
          overlayFilledCount,
          overlayMappingsFound: overlayFields.length,
          fieldCount: inspection.fieldCount,
          pageCount: inspection.pageCount,
          formNumber: displayFormNumber(form),
          formTitle: displayFormTitle(form),
          filePath: pdfPath,
          sourceView: "court_form_clean_view",
          missingCoreValues,
          diagnostics: allDiagnostics.slice(0, 50),
        },
        { status: 400 },
      );
    }

    let pdfBytes: Uint8Array;

    try {
      pdfBytes = await savePdfSafely(pdfDoc);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Could not save generated PDF: ${error.message}`
              : "Could not save generated PDF.",
          filePath: pdfPath,
        },
        { status: 500 },
      );
    }

    const cleanFileName = `${displayFormNumber(form)}-${displayFormTitle(form)}`
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}.pdf"`,
        "X-CourtSimplified-Case-Id": safe(data.caseId || ""),
        "X-CourtSimplified-Source-View": "court_form_clean_view",
        "X-CourtSimplified-Strategy": inspection.strategy,
        "X-CourtSimplified-Acro-Filled-Fields": String(acroFilledCount),
        "X-CourtSimplified-Overlay-Filled-Fields": String(overlayFilledCount),
        "X-CourtSimplified-Overlay-Mappings": String(overlayFields.length),
        "X-CourtSimplified-Field-Count": String(inspection.fieldCount),
        "X-CourtSimplified-Page-Count": String(inspection.pageCount),
        "X-CourtSimplified-Missing-Core-Values": missingCoreValues.join(","),
      },
    });
  } catch (error) {
    console.error("generate-form route error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate form.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}