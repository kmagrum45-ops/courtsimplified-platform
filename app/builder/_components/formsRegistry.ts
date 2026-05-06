import type { CourtPath, UniversalStage } from "./builderTypes";

const SUPABASE_FORMS_BASE =
  "https://ffymjxjcnwakgdmldpne.supabase.co/storage/v1/object/public/court-forms";

export type FormFileType = "pdf" | "docx";

export type GenerationStrategy =
  | "pdf-overlay"
  | "fillable-pdf"
  | "docx-template"
  | "download-only";

export type FormItem = {
  courtPath: CourtPath;
  province: "Ontario";
  formNumber: string;
  formName: string;
  category: string;
  neededWhen: string[];
  stages: UniversalStage[];
  officialUrl: string;
  supabasePath: string;
  fileType: FormFileType;
  generationStrategy: GenerationStrategy;
  canDownloadBlank: boolean;
  canGenerateNow: boolean;
};

const officialUrls = {
  family: "https://ontariocourtforms.on.ca/en/family-law-rules-forms/",
  smallClaims:
    "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/",
  civil: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/",
};

function formUrl(path: string) {
  return `${SUPABASE_FORMS_BASE}/${path}`;
}

export const formRegistry: FormItem[] = [
  {
    courtPath: "family",
    province: "Ontario",
    formNumber: "Form 8",
    formName: "Application",
    category: "Starting family case",
    neededWhen: ["parenting", "support", "divorce", "decision-making"],
    stages: ["starting-case", "not-sure"],
    officialUrl: officialUrls.family,
    supabasePath: "family/form-8.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "family",
    province: "Ontario",
    formNumber: "Form 10",
    formName: "Answer",
    category: "Responding to family case",
    neededWhen: ["responding", "served", "answer"],
    stages: ["responding"],
    officialUrl: officialUrls.family,
    supabasePath: "family/flr-10-jun25-en-fil.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 7A",
    formName: "Plaintiff’s Claim",
    category: "Starting Small Claims case",
    neededWhen: ["claim", "plaintiff", "money", "damages", "unpaid", "contract"],
    stages: ["starting-case", "not-sure"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/scr-7a-aug22-en-fil.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 8A",
    formName: "Affidavit of Service",
    category: "Service",
    neededWhen: ["service", "served"],
    stages: ["already-started", "conference", "motion", "trial", "enforcement"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/rscc-8a-e.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 9A",
    formName: "Defence",
    category: "Responding to Small Claims case",
    neededWhen: ["defence", "defense", "responding", "served"],
    stages: ["responding"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/scr-9a-aug22-en-fil.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 13A",
    formName: "List of Proposed Witnesses",
    category: "Settlement conference",
    neededWhen: ["conference", "witness", "settlement"],
    stages: ["conference", "trial"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/scr-13a-jan21-en-fil.pdf",
    fileType: "pdf",
    generationStrategy: "download-only",
    canDownloadBlank: true,
    canGenerateNow: false,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 14A",
    formName: "Offer to Settle",
    category: "Settlement",
    neededWhen: ["settlement", "offer"],
    stages: ["already-started", "conference", "trial"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/rscc-14a-e.pdf",
    fileType: "pdf",
    generationStrategy: "download-only",
    canDownloadBlank: true,
    canGenerateNow: false,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 14B",
    formName: "Terms of Settlement",
    category: "Settlement",
    neededWhen: ["settlement", "terms"],
    stages: ["conference", "trial"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/rscc-14b-e-0416.pdf",
    fileType: "pdf",
    generationStrategy: "download-only",
    canDownloadBlank: true,
    canGenerateNow: false,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 4A",
    formName: "General Heading",
    category: "Formatting",
    neededWhen: ["heading", "general heading"],
    stages: ["starting-case", "already-started", "conference", "motion", "trial"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/rscc-4a-jan21-en-fil.pdf",
    fileType: "pdf",
    generationStrategy: "download-only",
    canDownloadBlank: true,
    canGenerateNow: false,
  },
  {
    courtPath: "small-claims",
    province: "Ontario",
    formNumber: "Form 4C",
    formName: "Backsheet",
    category: "Formatting",
    neededWhen: ["backsheet"],
    stages: ["starting-case", "already-started", "conference", "motion", "trial"],
    officialUrl: officialUrls.smallClaims,
    supabasePath: "ontario/small-claims/rscc-4c-e.pdf",
    fileType: "pdf",
    generationStrategy: "download-only",
    canDownloadBlank: true,
    canGenerateNow: false,
  },
  {
    courtPath: "civil",
    province: "Ontario",
    formNumber: "Form 14A",
    formName: "Statement of Claim",
    category: "Starting civil case",
    neededWhen: ["claim", "lawsuit", "damages", "negligence", "charter"],
    stages: ["starting-case", "not-sure"],
    officialUrl: officialUrls.civil,
    supabasePath:
      "ontario/civil/rules-of-civil-procedure/14a-statement-of-claim.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "civil",
    province: "Ontario",
    formNumber: "Form 18A",
    formName: "Statement of Defence",
    category: "Responding to civil case",
    neededWhen: ["defence", "defense", "responding"],
    stages: ["responding"],
    officialUrl: officialUrls.civil,
    supabasePath:
      "ontario/civil/rules-of-civil-procedure/18a-statement-of-defence.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
  {
    courtPath: "civil",
    province: "Ontario",
    formNumber: "Form 16B",
    formName: "Affidavit of Service",
    category: "Service",
    neededWhen: ["service", "served"],
    stages: ["already-started", "conference", "motion", "trial"],
    officialUrl: officialUrls.civil,
    supabasePath:
      "ontario/civil/rules-of-civil-procedure/16b-affidavit-of-service.docx",
    fileType: "docx",
    generationStrategy: "docx-template",
    canDownloadBlank: true,
    canGenerateNow: false,
  },
  {
    courtPath: "civil",
    province: "Ontario",
    formNumber: "Form 37A",
    formName: "Notice of Motion",
    category: "Motion",
    neededWhen: ["motion", "urgent"],
    stages: ["motion", "urgent"],
    officialUrl: officialUrls.civil,
    supabasePath:
      "ontario/civil/rules-of-civil-procedure/37a-notice-of-motion.pdf",
    fileType: "pdf",
    generationStrategy: "pdf-overlay",
    canDownloadBlank: true,
    canGenerateNow: true,
  },
];

export function getBlankFormUrl(form: FormItem) {
  return formUrl(form.supabasePath);
}

export function getFormsForCase(params: {
  courtPath: CourtPath;
  caseStage: UniversalStage;
  text: string;
}) {
  const normalizedText = params.text.toLowerCase();

  return formRegistry.filter((form) => {
    if (form.courtPath !== params.courtPath) return false;

    const stageMatch = form.stages.includes(params.caseStage);
    const keywordMatch = form.neededWhen.some((term) =>
      normalizedText.includes(term.toLowerCase())
    );

    return stageMatch || keywordMatch;
  });
}

export function getFormsByCourtPath(courtPath: CourtPath) {
  return formRegistry.filter((form) => form.courtPath === courtPath);
}

export function findFormByLabel(label: string) {
  const normalized = label.toLowerCase().replace(/[’']/g, "'");

  return formRegistry.find((form) => {
    const formNumber = form.formNumber.toLowerCase();
    const shortNumber = form.formNumber.replace("Form ", "").toLowerCase();
    const formName = form.formName.toLowerCase().replace(/[’']/g, "'");

    return (
      normalized.includes(formNumber) ||
      normalized.includes(shortNumber) ||
      normalized.includes(formName)
    );
  });
}

export function getBlankFormUrlByLabel(label: string) {
  const form = findFormByLabel(label);
  return form ? getBlankFormUrl(form) : undefined;
}