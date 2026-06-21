import type {
  AnalysisResult,
  BuilderEvidenceIssue,
  BuilderFormRecommendation,
  BuilderIntelligenceItem,
  BuilderLegalIntelligenceSnapshot,
} from "./builderTypes";

type Props = {
  analysis: AnalysisResult;
};

function safeList(items?: string[]): string[] {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isContaminated(value: string): boolean {
  const text = normalizeText(value);

  return (
    text.includes("agreement existed") ||
    text.includes("agreement or obligation") ||
    text.includes("invoices") ||
    text.includes("payment records") ||
    text.includes("property damage") ||
    text.includes("repair value") ||
    text.includes("repair cost") ||
    text.includes("form 9a") ||
    text.includes("defence") ||
    text.includes("responding")
  );
}

function cleanDisplayList(items?: string[]): string[] {
  return safeList(items).filter((item) => !isContaminated(item));
}

function itemText(item: BuilderIntelligenceItem): string {
  return (
    item.title ||
    item.question ||
    item.argument ||
    item.concern ||
    item.description ||
    item.explanation ||
    item.reason ||
    item.text ||
    "Review required"
  );
}

function cleanItems(items?: BuilderIntelligenceItem[]): BuilderIntelligenceItem[] {
  return (items || []).filter((item) => !isContaminated(itemText(item)));
}

function confidenceLabel(value?: string): string {
  if (!value) return "Confidence not assessed";
  return value.replace(/-/g, " ");
}

function severityClass(severity?: string): string {
  if (severity === "critical" || severity === "high") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-[#d8e6df] bg-[#f8fcfa] text-[#24463d]";
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-[#16302b]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-[#6b8078]">{text}</p>;
}

function PillList({ items }: { items?: string[] }) {
  const list = cleanDisplayList(items);

  if (!list.length) return <Empty text="Nothing detected yet." />;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((item) => (
        <span
          key={item}
          className="rounded-full bg-[#e9f7f2] px-3 py-1 text-sm font-semibold text-[#2f7d67]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function StringItems({
  items,
  emptyText,
}: {
  items?: string[];
  emptyText: string;
}) {
  const list = cleanDisplayList(items);

  if (!list.length) return <Empty text={emptyText} />;

  return (
    <div className="space-y-3">
      {list.map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#24463d]"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function IntelligenceItems({
  items,
  emptyText,
}: {
  items?: BuilderIntelligenceItem[];
  emptyText: string;
}) {
  const list = cleanItems(items);

  if (!list.length) return <Empty text={emptyText} />;

  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <div
          key={item.id || `${itemText(item)}-${index}`}
          className={`rounded-2xl border p-4 text-sm leading-6 ${severityClass(
            item.severity,
          )}`}
        >
          <p className="font-semibold">{itemText(item)}</p>

          {item.suggestedFix && (
            <p className="mt-2">
              <span className="font-semibold">Fix: </span>
              {item.suggestedFix}
            </p>
          )}

          {item.responseStrategy && (
            <p className="mt-2">
              <span className="font-semibold">Response strategy: </span>
              {item.responseStrategy}
            </p>
          )}

          {item.howToAddress && (
            <p className="mt-2">
              <span className="font-semibold">How to address: </span>
              {item.howToAddress}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function EvidenceIssues({ issues }: { issues?: BuilderEvidenceIssue[] }) {
  const cleaned = (issues || []).filter((issue) => {
    return !isContaminated(
      [
        issue.issueLabel,
        issue.requiredProof,
        issue.explanation,
        ...(issue.missingEvidence || []),
      ]
        .filter(Boolean)
        .join(" "),
    );
  });

  if (!cleaned.length) {
    return <Empty text="No evidence-to-issue mapping has been generated yet." />;
  }

  return (
    <div className="space-y-3">
      {cleaned.map((issue) => (
        <div
          key={issue.id || issue.issueLabel}
          className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-bold text-[#16302b]">{issue.issueLabel}</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67]">
              {confidenceLabel(issue.strength)}
            </span>
          </div>

          {issue.requiredProof && (
            <p className="mt-2 text-[#24463d]">
              <span className="font-semibold">Required proof: </span>
              {issue.requiredProof}
            </p>
          )}

          {issue.explanation && (
            <p className="mt-2 text-[#4d675f]">{issue.explanation}</p>
          )}

          {issue.missingEvidence?.length ? (
            <div className="mt-3 rounded-xl bg-white p-3">
              <p className="font-semibold text-[#16302b]">Missing proof</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#24463d]">
                {issue.missingEvidence
                  .filter((missing) => !isContaminated(missing))
                  .map((missing) => (
                    <li key={missing}>{missing}</li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FormRecommendations({
  forms,
}: {
  forms?: BuilderFormRecommendation[];
}) {
  const cleaned = (forms || []).filter((form) => {
    return !isContaminated(
      [form.formNumber, form.title, form.reason, ...(form.warnings || [])]
        .filter(Boolean)
        .join(" "),
    );
  });

  if (!cleaned.length) {
    return <Empty text="No form recommendations have been generated yet." />;
  }

  return (
    <div className="space-y-3">
      {cleaned.map((form) => (
        <div
          key={form.id || `${form.formNumber}-${form.title}`}
          className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm"
        >
          <p className="font-bold text-[#16302b]">
            {form.formNumber ? `${form.formNumber} — ` : ""}
            {form.title}
          </p>

          {form.reason && <p className="mt-2 text-[#4d675f]">{form.reason}</p>}

          {form.warnings?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[#7a4b00]">
              {form.warnings
                .filter((warning) => !isContaminated(warning))
                .map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function buildAnalysisFormRecommendations(
  analysis: AnalysisResult,
): BuilderFormRecommendation[] {
  return safeList(analysis.requiredNextForms).map((form) => {
    if (form.includes("7A")) {
      return {
        id: "analysis-form-7a",
        formNumber: "7A",
        title: "Plaintiff's Claim",
        courtPath: "small-claims",
        stage: analysis.caseStage,
        reason:
          "You appear to be starting a Small Claims case as the plaintiff/claimant.",
        confidence: "high",
        warnings: [],
      };
    }

    if (form.includes("8A")) {
      return {
        id: "analysis-form-8a",
        formNumber: "8A",
        title: "Affidavit of Service",
        courtPath: "small-claims",
        stage: analysis.caseStage,
        reason:
          "After the Plaintiff's Claim is issued and served, service usually needs to be proven.",
        confidence: "medium",
        warnings: [],
      };
    }

    return {
      id: `analysis-form-${form}`,
      title: form,
      courtPath: analysis.courtPath,
      stage: analysis.caseStage,
      reason: "Recommended by the cleaned case analysis workflow.",
      confidence: "medium",
      warnings: [],
    };
  });
}

function ReadinessScore({
  analysis,
  intelligence,
}: {
  analysis: AnalysisResult;
  intelligence?: BuilderLegalIntelligenceSnapshot;
}) {
  const confidence = intelligence?.confidence || "medium";
  const warnings = cleanDisplayList(analysis.userWarnings).length;
  const missing = cleanDisplayList(analysis.missingInformation).length;
  const risks = cleanDisplayList(analysis.risksAndGaps).length;
  const evidenceIssues = cleanDisplayList(analysis.missingEvidence).length;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
          Confidence
        </p>
        <p className="mt-2 text-xl font-bold capitalize text-[#10231f]">
          {confidenceLabel(confidence)}
        </p>
      </div>

      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
          Missing info
        </p>
        <p className="mt-2 text-xl font-bold text-[#10231f]">{missing}</p>
      </div>

      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
          Risks
        </p>
        <p className="mt-2 text-xl font-bold text-[#10231f]">{risks}</p>
      </div>

      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
          Proof gaps
        </p>
        <p className="mt-2 text-xl font-bold text-[#10231f]">
          {evidenceIssues}
        </p>
      </div>

      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
          Warnings
        </p>
        <p className="mt-2 text-xl font-bold text-[#10231f]">{warnings}</p>
      </div>
    </div>
  );
}

export default function IntelligenceOverviewPanel({ analysis }: Props) {
  const intelligence = analysis.intelligence;
  const formRecommendations = buildAnalysisFormRecommendations(analysis);

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-[#f8faf8] p-5 md:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
          Litigation Intelligence Overview
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#10231f]">
          Case readiness, proof gaps, risks, and next steps
        </h2>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#4d675f]">
          This panel displays the cleaned case analysis, not raw legacy
          recommendations. Forms, risks, proof gaps, and judge concerns are
          filtered through the current workflow state.
        </p>
      </div>

      <ReadinessScore analysis={analysis} intelligence={intelligence} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Detected claim direction">
          <PillList items={analysis.detectedClaimTypes || analysis.detectedIssues} />
        </Card>

        <Card title="Procedural posture">
          <div className="space-y-3 text-sm leading-6 text-[#24463d]">
            <p>
              <span className="font-semibold">Court path: </span>
              {analysis.courtPath}
            </p>
            <p>
              <span className="font-semibold">Stage: </span>
              {analysis.caseStage}
            </p>
            <p>
              <span className="font-semibold">Province: </span>
              {intelligence?.proceduralPosture?.province || "Ontario"}
            </p>
            <p>
              <span className="font-semibold">Confidence: </span>
              {confidenceLabel(intelligence?.proceduralPosture?.confidence)}
            </p>
          </div>
        </Card>

        <Card title="Missing information">
          <StringItems
            items={analysis.missingInformation}
            emptyText="No major missing information detected."
          />
        </Card>

        <Card title="Litigation risks">
          <StringItems
            items={analysis.risksAndGaps}
            emptyText="No major litigation risks detected."
          />
        </Card>

        <Card title="Evidence-to-issue map">
          <EvidenceIssues issues={analysis.intelligenceEvidenceIssues} />
        </Card>

        <Card title="Likely judge concerns">
          <StringItems
            items={analysis.judgeConcerns || analysis.courtConcerns}
            emptyText="No judge concerns generated yet."
          />
        </Card>

        <Card title="Likely opposing arguments">
          <StringItems
            items={analysis.opposingArguments || analysis.defenceAttacks}
            emptyText="No opposing arguments generated yet."
          />
        </Card>

        <Card title="Recommended forms / documents">
          <FormRecommendations forms={formRecommendations} />
        </Card>
      </div>

      {cleanDisplayList(analysis.userWarnings).length ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-lg font-bold text-amber-900">
            Source and system warnings
          </h3>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">
            {cleanDisplayList(analysis.userWarnings).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 rounded-3xl border border-[#d8e6df] bg-white p-5">
        <h3 className="text-lg font-bold text-[#16302b]">
          Structured case summary
        </h3>

        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#24463d]">
          {analysis.structuredIntelligenceSummary ||
            analysis.intelligenceSummary ||
            analysis.summary ||
            "No structured summary has been generated yet."}
        </pre>
      </div>
    </section>
  );
}