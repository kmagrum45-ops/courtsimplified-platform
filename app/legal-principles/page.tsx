"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

type PrincipleCitation = {
  sourceName: string;
  officialUrl: string;
  verifiedAt: string;
  pinpoint?: string;
};

type PrincipleCard = {
  courtPath: "Small Claims Court" | "Superior Court (Civil)" | "Family Court";
  title: string;
  summary: string;
  keyFacts: string[];
  workflowUse: string[];
  commonRisks: string[];
  citations: [PrincipleCitation, ...PrincipleCitation[]];
};

const ONTARIO_COURTS_SMALL_CLAIMS_STEPS: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — Steps in a Case (Small Claims Court)",
  officialUrl:
    "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/steps-in-a-case/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_SMALL_CLAIMS_RESPOND: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — How to Respond to a Case (Small Claims Court)",
  officialUrl:
    "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_SMALL_CLAIMS_DEFAULT: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — Default Proceedings (Small Claims Court)",
  officialUrl:
    "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_SUING_SOMEONE_SMALL_CLAIMS: PrincipleCitation = {
  sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
  officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
  verifiedAt: "2026-08-25",
  pinpoint: "monetary limit updated effective October 1, 2025",
};

const ONTARIO_GUIDE_MAKING_CLAIM: PrincipleCitation = {
  sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl:
    "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
  verifiedAt: "2026-08-25",
};

const ONTARIO_GUIDE_SERVING_DOCUMENTS: PrincipleCitation = {
  sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Serving Documents",
  officialUrl:
    "https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents",
  verifiedAt: "2026-08-25",
};

const ONTARIO_GUIDE_GETTING_READY: PrincipleCitation = {
  sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Getting Ready for Court",
  officialUrl:
    "https://www.ontario.ca/document/guide-procedures-small-claims-court/getting-ready-court",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURT_FORMS_SMALL_CLAIMS: PrincipleCitation = {
  sourceName: "Ontario Court Services — Rules of the Small Claims Court Forms",
  officialUrl: "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_CIVIL_STEPS: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — Steps to a Civil Case",
  officialUrl:
    "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_CIVIL_CLAIMS_GUIDE: PrincipleCitation = {
  sourceName: "Ontario.ca — Civil Claims: Suing and Being Sued",
  officialUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURT_FORMS_CIVIL: PrincipleCitation = {
  sourceName: "Ontario Court Services — Rules of Civil Procedure Forms",
  officialUrl: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_FAMILY_STEPS: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — The Steps in a Family Case",
  officialUrl:
    "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/family-resources-to-help-self-represented-litigants/steps/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURT_FORMS_FAMILY: PrincipleCitation = {
  sourceName: "Ontario Court Services — Family Law Rules Forms",
  officialUrl: "https://ontariocourtforms.on.ca/en/family-law-rules-forms/",
  verifiedAt: "2026-08-25",
};

const PRINCIPLES: PrincipleCard[] = [
  // ---- Small Claims Court ----
  {
    courtPath: "Small Claims Court",
    title: "Monetary Jurisdiction",
    summary:
      "Small Claims Court can only hear claims up to a set dollar limit. Claims for more than that must go to the Superior Court of Justice, unless the excess is waived.",
    keyFacts: [
      "The claim limit is $50,000, excluding interest and costs.",
      "This limit increased from $35,000 effective October 1, 2025.",
      "The minimum amount that can be appealed also rose, from $3,500 to $5,000.",
      "A claim must generally be started within two years of the incident.",
    ],
    workflowUse: [
      "Confirm the claim amount fits Small Claims Court before starting a case.",
      "Use Evidence to support the dollar amount claimed.",
    ],
    commonRisks: [
      "Filing in the wrong court for the amount claimed.",
      "Missing the two-year limitation period.",
    ],
    citations: [ONTARIO_SUING_SOMEONE_SMALL_CLAIMS],
  },
  {
    courtPath: "Small Claims Court",
    title: "Filing a Claim",
    summary: "Starting a Small Claims Court case requires the correct form, served on the defendant within a fixed window.",
    keyFacts: [
      "A claim is started with the Plaintiff's Claim (Form 7A).",
      "Counter-claims use the Defendant's Claim (Form 10A); additional parties use Form 1A.",
      "The claim must be served on the defendant within six months of being issued.",
    ],
    workflowUse: [
      "Use Forms to locate and complete Form 7A.",
      "Use Evidence to organize proof of the amount and basis of the claim before filing.",
    ],
    commonRisks: [
      "Letting the six-month service window lapse.",
      "Using the wrong form for the type of claim.",
    ],
    citations: [ONTARIO_GUIDE_MAKING_CLAIM, ONTARIO_COURT_FORMS_SMALL_CLAIMS],
  },
  {
    courtPath: "Small Claims Court",
    title: "Responding to a Claim",
    summary: "A defendant has a short, fixed window to file a defence, with a specific form required.",
    keyFacts: [
      "A defendant must serve and file a Defence (Form 9A) within 20 calendar days of being served with the claim.",
      "An Affidavit of Service (Form 8A) must be filed to show all parties were properly served.",
      "The Defence can be filed through the Small Claims Court Submissions Online Portal or in person.",
    ],
    workflowUse: [
      "Use Forms to complete Form 9A before the deadline.",
      "Use Dashboard to track the 20-day response deadline.",
    ],
    commonRisks: [
      "Missing the 20-day deadline.",
      "Filing the Defence without an Affidavit of Service.",
    ],
    citations: [ONTARIO_COURTS_SMALL_CLAIMS_RESPOND],
  },
  {
    courtPath: "Small Claims Court",
    title: "If a Defence Is Not Filed",
    summary: "Missing the defence deadline has a specific, serious procedural consequence.",
    keyFacts: [
      "If no defence is filed in time, the plaintiff may ask the court to note the defendant in default.",
      "A defendant noted in default cannot file a defence or take further steps without the plaintiff's consent or the court's permission.",
      "The plaintiff may be entitled to a judgment without the defendant's participation.",
      "A defendant can bring a motion to set aside a default notation or judgment.",
    ],
    workflowUse: [
      "Use Dashboard to flag cases at risk of default.",
      "Use Legal Strategy if a default has already been noted, to assess a motion to set it aside.",
    ],
    commonRisks: [
      "Assuming a late defence will still be accepted without consequence.",
      "Not knowing that a motion is required to reverse a default.",
    ],
    citations: [ONTARIO_COURTS_SMALL_CLAIMS_DEFAULT],
  },
  {
    courtPath: "Small Claims Court",
    title: "Serving Documents",
    summary: "Different documents in a Small Claims case require different service methods and notice periods.",
    keyFacts: [
      "Documents can be served personally, by mail, by courier, or by email where the Rules permit.",
      "A claim must be served within six months of issuance.",
      "Motions require at least 7 days' notice before the hearing.",
      "Examinations require at least 30 days' notice; witness summonses require at least 10 days' notice.",
      "Proof of service is filed using an Affidavit of Service (Form 8A), or a Certificate of Service (Form 8B) for licensees.",
    ],
    workflowUse: [
      "Use Dashboard to track service deadlines for each document type.",
      "Use Evidence to preserve proof of how and when service occurred.",
    ],
    commonRisks: [
      "Using a service method the Rules do not permit for a given document.",
      "Missing the notice period for a motion or examination.",
    ],
    citations: [ONTARIO_GUIDE_SERVING_DOCUMENTS],
  },
  {
    courtPath: "Small Claims Court",
    title: "Evidence and Witnesses for Trial",
    summary: "The court expects specific document deadlines and preparation before a settlement conference or trial.",
    keyFacts: [
      "Admissible evidence includes oral testimony, documents such as business records, expert reports, and photographs where properly identified.",
      "Documents not already attached to the claim or defence must be served and filed at least 14 days before a settlement conference.",
      "For trial, that deadline extends to at least 30 days before the trial date.",
      "A List of Proposed Witnesses (Form 13A) must be served at least 14 days before the settlement conference.",
      "Parties should bring original documents plus at least three copies to trial.",
    ],
    workflowUse: [
      "Use Evidence to label and organize exhibits ahead of these deadlines.",
      "Use Trial Package to prepare document copies and the witness list.",
    ],
    commonRisks: [
      "Serving documents or the witness list too close to the settlement conference or trial.",
      "Bringing only one copy of a document to trial.",
    ],
    citations: [ONTARIO_GUIDE_GETTING_READY],
  },
  {
    courtPath: "Small Claims Court",
    title: "Case Timeline",
    summary: "A Small Claims case moves through a defined sequence of stages, each with its own deadlines.",
    keyFacts: [
      "The stages run: Claim, Default Proceedings (if applicable), Settlement Conference, Motions (if needed), Trial, and Enforcement.",
      "A Request to Clerk for a trial date must generally be filed within 30 days after the settlement conference.",
      "Motions must be served at least 7 days before the hearing and filed at least 3 days before it.",
    ],
    workflowUse: [
      "Use Dashboard to see which stage a case is currently in.",
      "Use Court Package to prepare stage-appropriate materials.",
    ],
    commonRisks: [
      "Skipping the settlement conference step by mistake.",
      "Missing the window to request a trial date.",
    ],
    citations: [ONTARIO_COURTS_SMALL_CLAIMS_STEPS],
  },
  {
    courtPath: "Small Claims Court",
    title: "Filing Fees",
    summary: "Filing a claim or taking further steps has fixed government fees, which vary by how often a party files.",
    keyFacts: [
      "An infrequent filer pays $108 to file a claim.",
      "A frequent filer (10 or more claims per year) pays $228 to file a claim.",
      "Additional fees apply for judgments, trials, and motions.",
    ],
    workflowUse: [
      "Use Dashboard to budget for filing and later-stage fees.",
    ],
    commonRisks: [
      "Assuming filing is free.",
      "Not budgeting for motion or trial fees later in the case.",
    ],
    citations: [ONTARIO_SUING_SOMEONE_SMALL_CLAIMS],
  },

  // ---- Superior Court (Civil) ----
  {
    courtPath: "Superior Court (Civil)",
    title: "Starting a Claim",
    summary: "A civil claim above the Small Claims limit is started in the Superior Court of Justice with its own form, service window, and limitation period.",
    keyFacts: [
      "A claim is started with a Statement of Claim (Form 14A or 14B), or a Notice of Action (Form 14C) for extra time to prepare it.",
      "The claim must generally be served on each defendant within six months of being issued.",
      "A claim generally cannot be started more than two years after it was discovered.",
      "An Affidavit of Service (Form 16B) must be filed after serving defendants.",
    ],
    workflowUse: [
      "Use Forms to locate the Statement of Claim form.",
      "Use Dashboard to track the limitation period and service deadline.",
    ],
    commonRisks: [
      "Missing the two-year limitation period.",
      "Letting the six-month service window lapse.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, ONTARIO_CIVIL_CLAIMS_GUIDE],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Defending a Claim",
    summary: "A defendant in a civil claim has a form-specific deadline that can be extended once, briefly.",
    keyFacts: [
      "A Statement of Defence (Form 18A) must be served within the timeframe set out in Rule 18 of the Rules of Civil Procedure, which varies by where the defendant was served.",
      "A Notice of Intent to Defend (Form 18B) gives an additional 10 days to serve and file the Statement of Defence.",
      "An Affidavit of Service (Form 16B) must be filed with proof of service of the defence.",
    ],
    workflowUse: [
      "Use Forms to complete Form 18A or the Form 18B extension.",
      "Use Dashboard to track the Rule 18 deadline once it is confirmed for the specific case.",
    ],
    commonRisks: [
      "Assuming the deadline is the same as Small Claims Court's 20 days — Rule 18 deadlines vary by how and where service occurred.",
      "Not filing a Notice of Intent to Defend when more time is needed.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Discovery",
    summary: "After pleadings close, both sides must exchange documents and may examine each other under oath, on a schedule.",
    keyFacts: [
      "Parties must agree on a Discovery Plan within 60 days of the close of pleadings.",
      "Each side exchanges an Affidavit of Documents (Form 30A or 30B).",
      "Examinations for discovery are typically limited to about 7 hours per examination.",
    ],
    workflowUse: [
      "Use Evidence to prepare the Affidavit of Documents.",
      "Use Legal Strategy to plan for examinations for discovery.",
    ],
    commonRisks: [
      "Missing the 60-day Discovery Plan deadline.",
      "Incomplete document disclosure in the Affidavit of Documents.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Mandatory Mediation",
    summary: "In some regions, mediation is a required step before trial, on a fixed timeline.",
    keyFacts: [
      "Mandatory mediation applies in Toronto, Ottawa, and Windsor.",
      "Mediation must occur within 180 days after the first defence is filed.",
    ],
    workflowUse: [
      "Use Settlement Conference preparation tools if the case is in a mandatory mediation region.",
    ],
    commonRisks: [
      "Not scheduling mediation within the 180-day window in a mandatory region.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Setting Down for Trial",
    summary: "A civil case must be actively moved toward trial or it can be dismissed for delay.",
    keyFacts: [
      "A pre-trial conference must be scheduled within 180 days of the case being set down for trial.",
      "An action can be dismissed if it is not set down for trial or settled within five years of being started.",
    ],
    workflowUse: [
      "Use Dashboard to track the five-year dismissal risk on older cases.",
      "Use Trial Package once the case is set down for trial.",
    ],
    commonRisks: [
      "Letting a case sit without being set down for trial or settled.",
      "Missing the 180-day pre-trial conference window.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, ONTARIO_CIVIL_CLAIMS_GUIDE],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Forms",
    summary: "Superior Court civil cases use a distinct set of forms from Small Claims Court, organized under the Rules of Civil Procedure.",
    keyFacts: [
      "Forms are catalogued under Ontario Regulation 194 (Rules of Civil Procedure) and include pleadings, motion forms, and enforcement writs.",
      "Documents can be filed in hardcopy at the court counter, and in some cases by mail, email, or through online filing portals.",
    ],
    workflowUse: [
      "Use Forms to locate the correct Rules of Civil Procedure form for each stage.",
    ],
    commonRisks: [
      "Using a Small Claims Court form in a Superior Court civil case, or vice versa.",
    ],
    citations: [ONTARIO_COURT_FORMS_CIVIL],
  },

  // ---- Family Court ----
  {
    courtPath: "Family Court",
    title: "Starting a Case",
    summary: "Most family law cases begin with a required education session before the case proceeds.",
    keyFacts: [
      "Attendance at a Mandatory Information Program (MIP) is required for most family law cases.",
      "The party starting the case is the applicant; the party who receives it is the respondent.",
    ],
    workflowUse: [
      "Use Dashboard to confirm MIP attendance has been arranged before other steps proceed.",
    ],
    commonRisks: [
      "Proceeding with other steps before completing the required MIP session.",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS],
  },
  {
    courtPath: "Family Court",
    title: "Responding to an Application",
    summary: "A respondent has a fixed window to answer, and the applicant then has a further, shorter window to reply.",
    keyFacts: [
      "An Answer (Form 10) must be served and filed within 30 days of being served with the application (60 days if the respondent lives outside Canada or the United States).",
      "The Answer can agree or disagree with the applicant's claims, state supporting facts, and make the respondent's own requests for court orders.",
      "If the Answer raises new claims or issues, the applicant has 10 days to serve and file a Reply (Form 10A).",
    ],
    workflowUse: [
      "Use Forms to complete Form 10 or Form 10A.",
      "Use Dashboard to track the 30-day or 10-day response window.",
    ],
    commonRisks: [
      "Missing the 30-day deadline to answer.",
      "Not replying within 10 days to new claims raised in an Answer.",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS],
  },
  {
    courtPath: "Family Court",
    title: "Conferences",
    summary: "A family case moves through a sequence of court conferences before any trial.",
    keyFacts: [
      "The sequence generally runs: First Appearance, Case Conference, Settlement Conference, and (if unresolved) a Trial Scheduling and Management Conference, then Trial.",
      "At First Appearance, the court clerk checks that documents are complete and properly served.",
      "The Case Conference and Settlement Conference are opportunities to narrow or resolve disputed issues before trial.",
    ],
    workflowUse: [
      "Use Settlement Conference preparation tools ahead of each conference stage.",
      "Use Dashboard to see which conference stage the case has reached.",
    ],
    commonRisks: [
      "Arriving at a conference without documents properly served or filed.",
      "Treating a Case Conference as optional.",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS],
  },
  {
    courtPath: "Family Court",
    title: "Motions",
    summary: "Bringing a family court motion has its own notice rules, including an emergency exception.",
    keyFacts: [
      "Motions generally require at least 1 day's notice, unless emergency circumstances apply.",
      "An emergency motion may be brought without notice, but the case must return to court within 14 days.",
    ],
    workflowUse: [
      "Use Legal Strategy to assess whether a motion, including an emergency motion, is appropriate.",
    ],
    commonRisks: [
      "Bringing an emergency motion without a genuine emergency.",
      "Missing the 14-day return date after an emergency motion.",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS],
  },
  {
    courtPath: "Family Court",
    title: "Forms",
    summary: "Family Court uses its own set of forms under the Family Law Rules, distinct from civil or Small Claims forms.",
    keyFacts: [
      "Forms are catalogued under the Family Law Rules, O. Reg. 114/99, including Application (Form 8), Answer (Form 10), and Financial Statement (Form 13 or 13.1).",
      "Most family court forms can be filed online through the Ministry of the Attorney General's Justice Services Online.",
    ],
    workflowUse: [
      "Use Forms to locate the correct Family Law Rules form for each stage.",
    ],
    commonRisks: [
      "Using a civil or Small Claims form instead of the matching Family Law Rules form.",
    ],
    citations: [ONTARIO_COURT_FORMS_FAMILY],
  },
];

function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-[#16302b]">{title}</h2>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
          {description}
        </p>
      ) : null}

      <div className="mt-5">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function CitationList({ citations }: { citations: PrincipleCitation[] }) {
  return (
    <ul className="space-y-2 text-xs leading-5 text-[#49635c]">
      {citations.map((citation, index) => (
        <li key={`${citation.officialUrl}-${index}`}>
          <a
            href={citation.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#2f7d67] underline"
          >
            {citation.sourceName}
          </a>
          {citation.pinpoint ? <> — {citation.pinpoint}</> : null}
          <span className="text-[#6b8078]"> · verified {citation.verifiedAt}</span>
        </li>
      ))}
    </ul>
  );
}

function LegalPrinciplesPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const groupedPrinciples = useMemo(() => {
    return PRINCIPLES.reduce<Record<string, PrincipleCard[]>>((acc, item) => {
      if (!acc[item.courtPath]) acc[item.courtPath] = [];
      acc[item.courtPath].push(item);
      return acc;
    }, {});
  }, []);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );
  const courtPackageHref = buildWorkflowHref("/court-package", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  return (
    <main className="min-h-screen bg-[#f6faf8] px-6 py-12 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Procedure Reference
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Legal Principles and Court Procedure
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                This page covers procedure, forms, monetary limits, and
                deadlines for Ontario Small Claims Court, Superior Court civil
                claims, and Family Court — the facts a self-represented
                litigant needs to move a case forward correctly. Every
                statement here is sourced and dated below it.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">Sourced From</p>
              <p className="mt-2 text-[#4d675f]">ontario.ca</p>
              <p className="mt-1 text-[#4d675f]">ontariocourts.ca</p>
              <p className="mt-1 text-[#4d675f]">ontariocourtforms.on.ca</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Case Workspace
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Apply to Drafting
            </Link>
          </div>
        </section>

        <Section
          title="How to use this page"
          description="This is not a substitute for legal advice. It is a sourced procedural reference — what form to file, what deadline applies, and what a missed step costs. Every fact below links to the official source it was checked against, and the date it was checked."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Identify</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Find the court path — Small Claims, Civil, or Family — that
                matches the case.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Track</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Match each stage of the case to its deadline, form, and
                service rule.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Verify</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Facts like dollar limits change — check the verified date on
                each card, and the official source if it looks old.
              </p>
            </div>
          </div>
        </Section>

        {Object.entries(groupedPrinciples).map(([courtPath, principles]) => (
          <Section
            key={courtPath}
            title={courtPath}
            description={`Sourced procedure, forms, and deadlines for ${courtPath}.`}
          >
            <div className="space-y-6">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
                    {principle.courtPath}
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {principle.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#4d675f]">
                    {principle.summary}
                  </p>

                  <div className="mt-5 grid gap-5 md:grid-cols-4">
                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Key Facts
                      </h4>
                      <div className="mt-3">
                        <BulletList items={principle.keyFacts} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Workflow Use
                      </h4>
                      <div className="mt-3">
                        <BulletList items={principle.workflowUse} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                      <h4 className="font-semibold text-red-800">
                        Common Risks
                      </h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-red-900">
                        {principle.commonRisks.map((risk, index) => (
                          <li key={`${principle.title}-risk-${index}`}>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Source
                      </h4>
                      <div className="mt-3">
                        <CitationList citations={principle.citations} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ))}

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Connected litigation workflow
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Use this procedure reference alongside evidence organization,
            strategy, drafting, form selection, trial preparation, and court
            packages.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Forms
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Trial Package
            </Link>

            <Link
              href={exportHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Export
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LegalPrinciplesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#16302b]">
          Loading legal principles...
        </main>
      }
    >
      <LegalPrinciplesPageContent />
    </Suspense>
  );
}
