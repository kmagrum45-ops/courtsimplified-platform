export type CourtPath = "family" | "small-claims" | "civil" | "not-sure";

export type ProceduralFormValidation = {
  requiredNextForms: string[];
  notNeededNow: string[];
  blockedForms: string[];
  duplicateFormsRemoved: string[];
  warnings: string[];
};

export function cleanList(items: string[]) {
  return Array.from(
    new Set(items.map((item) => String(item || "").trim()).filter(Boolean))
  );
}

export function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFormNumber(value: string) {
  const match = String(value || "").match(
    /\b(?:form\s*)?([0-9]+[a-z]?(?:\.[0-9]+)?[a-z]?)\b/i
  );

  return match ? match[1].toLowerCase().replace(/\s+/g, "") : "";
}

export function validateProceduralForms(params: {
  courtPath: CourtPath;
  stage: string;
  requiredNextForms: string[];
  completedForms: string[];
  receivedForms: string[];
  notNeededNow: string[];
}): ProceduralFormValidation {
  const warnings: string[] = [];
  const blockedForms: string[] = [];
  const duplicateFormsRemoved: string[] = [];

  const seen = new Set<string>();

  const alreadyDoneNumbers = [
    ...params.completedForms,
    ...params.receivedForms,
    ...params.notNeededNow,
  ]
    .map(extractFormNumber)
    .filter(Boolean);

  const stage = normalizeText(params.stage);

  const requiredNextForms = cleanList(params.requiredNextForms).filter((form) => {
    const formNumber = extractFormNumber(form);
    const formText = normalizeText(form);
    const key = formNumber || formText;

    if (seen.has(key)) {
      duplicateFormsRemoved.push(form);
      return false;
    }

    seen.add(key);

    if (formNumber && alreadyDoneNumbers.includes(formNumber)) {
      blockedForms.push(form);
      return false;
    }

    if (
      stage.includes("starting") &&
      formText.includes("affidavit of service")
    ) {
      blockedForms.push(form);
      warnings.push(
        "Affidavit of Service usually comes after an originating document has been prepared and served."
      );
      return false;
    }

    if (stage.includes("responding") && formText.includes("plaintiff")) {
      blockedForms.push(form);
      return false;
    }

    return true;
  });

  return {
    requiredNextForms,
    notNeededNow: cleanList([...params.notNeededNow, ...blockedForms]),
    blockedForms: cleanList(blockedForms),
    duplicateFormsRemoved: cleanList(duplicateFormsRemoved),
    warnings: cleanList(warnings),
  };
}