"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FamilyIntake from "./_components/FamilyIntake";
import SmallClaimsIntake from "./_components/SmallClaimsIntake";
import CivilIntake from "./_components/CivilIntake";
import {
  AnalysisResult,
  CourtPath,
  StoredCaseData,
  getPathLabel,
} from "./_components/builderTypes";

export default function BuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPath = useMemo<CourtPath>(() => {
    const raw = searchParams.get("path");

    if (raw === "family" || raw === "small-claims" || raw === "civil") {
      return raw;
    }

    return "family";
  }, [searchParams]);

  const [courtPath] = useState<CourtPath>(initialPath);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);

  const pathLabel = getPathLabel(courtPath);

  function handleComplete(result: AnalysisResult, payload: StoredCaseData) {
    setAnalysis(result);
    setCaseData(payload);
  }

  function goToForms() {
    if (!caseData) return;

    localStorage.setItem("caseData", JSON.stringify(caseData));
    router.push("/documents");
  }

  function startOver() {
    setAnalysis(null);
    setCaseData(null);
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            {pathLabel} Intake
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f]">
            Tell your story once
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4d675f]">
            CourtSimplified reviews your intake, identifies missing information,
            and guides you to the next required forms and case-building steps.
          </p>
        </div>

        {!analysis && (
          <>
            {courtPath === "family" && (
              <FamilyIntake onComplete={handleComplete} />
            )}

            {courtPath === "small-claims" && (
              <SmallClaimsIntake onComplete={handleComplete} />
            )}

            {courtPath === "civil" && (
              <CivilIntake onComplete={handleComplete} />
            )}
          </>
        )}

        {analysis && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold text-[#10231f]">
              Case Analysis
            </h2>

            <div className="mt-6 grid gap-6">
              <div>
                <h3 className="text-lg font-bold text-[#16302b]">
                  Next required forms and documents
                </h3>
                {analysis.requiredNextForms.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[#24463d]">
                    {analysis.requiredNextForms.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[#4d675f]">
                    No next forms were detected yet. More case details may be needed.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#16302b]">
                  Missing information before forms can be completed
                </h3>
                {analysis.missingInformation.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[#24463d]">
                    {analysis.missingInformation.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[#4d675f]">
                    No major missing information was detected from the intake.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#16302b]">
                  Risks or gaps to fix
                </h3>
                {analysis.risksAndGaps.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[#24463d]">
                    {analysis.risksAndGaps.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[#4d675f]">
                    No major risks or gaps were detected yet.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#16302b]">
                  Preparation guidance
                </h3>
                {analysis.guidance.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[#24463d]">
                    {analysis.guidance.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[#4d675f]">
                    Continue to the next required forms when ready.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={goToForms}
                  className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
                >
                  Continue to Required Forms →
                </button>

                <button
                  type="button"
                  onClick={startOver}
                  className="rounded-2xl border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
                >
                  Edit Intake
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}