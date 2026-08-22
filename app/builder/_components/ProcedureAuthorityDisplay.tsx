"use client";

import { useEffect, useState } from "react";

import {
  resolveBetaProcedureAuthority,
  type BetaProcedureAuthorityMetadata,
} from "../../../src/lib/case-system/authority-intelligence/betaProcedureAuthority";

type CourtArea = "small-claims" | "family" | "civil";

type AuthorityDisplayItem = {
  state: "verified-full-procedure" | "verified-field-guidance" | "review-required";
  guidance: string[];
  officialSourceUrl: string | null;
  citation: string | null;
  pinpoint: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getProcedureAuthorityDisplayItems(
  records: unknown,
  context: { courtArea: CourtArea; procedureStage: string; asOf?: Date },
): AuthorityDisplayItem[] {
  if (!Array.isArray(records) || records.length === 0) {
    return [{ state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null }];
  }

  return records.map((record): AuthorityDisplayItem => {
    if (!isRecord(record)) {
      return { state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null };
    }

    const resolved = resolveBetaProcedureAuthority(
      record as BetaProcedureAuthorityMetadata,
      context,
    );

    if (resolved.displayState !== "review-required") {
      // Only real procedural text is carried across. The resolution verifies the
      // rule reference, not any wording, so it supplies no guidance of its own.
      // Where the workflow-guidance field is separately verified its text is
      // used; otherwise this stays empty and the citation line stands alone,
      // rather than restating that the record is verified.
      const verifiedWorkflowText =
        resolved.permittedWorkflowGuidance.displayState === "verified-source-linked-workflow"
          ? resolved.permittedWorkflowGuidance.guidance
          : [];

      return {
        state: "verified-full-procedure",
        guidance: verifiedWorkflowText,
        officialSourceUrl: resolved.officialSourceUrl,
        citation: resolved.citation,
        pinpoint: resolved.pinpoint,
      };
    }

    if (resolved.permittedWorkflowGuidance.displayState === "verified-source-linked-workflow") {
      return {
        state: "verified-field-guidance",
        guidance: resolved.permittedWorkflowGuidance.guidance,
        officialSourceUrl: resolved.permittedWorkflowGuidance.officialSourceUrl,
        citation: resolved.permittedWorkflowGuidance.citation,
        pinpoint: resolved.permittedWorkflowGuidance.pinpoint,
      };
    }

    return { state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null };
  });
}

export default function ProcedureAuthorityDisplay({
  courtArea,
  procedureStage,
}: {
  courtArea: CourtArea;
  procedureStage: string;
}) {
  const [items, setItems] = useState<AuthorityDisplayItem[]>([
    { state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null },
  ]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/rules/procedures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courtPath: courtArea, stage: procedureStage }),
        });
        const body: unknown = response.ok ? await response.json() : null;
        if (active) setItems(getProcedureAuthorityDisplayItems(body, { courtArea, procedureStage }));
      } catch {
        if (active) setItems(getProcedureAuthorityDisplayItems(null, { courtArea, procedureStage }));
      }
    }

    void load();
    return () => { active = false; };
  }, [courtArea, procedureStage]);

  // Nothing verified means nothing worth showing. The panel used to render a
  // lone amber box announcing its own absence, in data-model wording, directly
  // above the next-step buttons. Rendering nothing is the honest result; a
  // stage with no verified rule reference is common rather than exceptional.
  if (!items.some((item) => item.state !== "review-required")) return null;

  return (
    <section className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5 text-sm leading-6 text-[#24463d]">
      <h2 className="text-lg font-bold text-[#16302b]">Ontario procedure authority</h2>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => item.state === "review-required" ? (
          <p key={`review-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            We don’t yet have a verified Ontario rule reference for this item — check the official source before filing.
          </p>
        ) : (
          <div key={`${item.citation}-${item.pinpoint}-${index}`} className="rounded-xl border border-[#d8e6df] bg-white p-3">
            {/* The full-procedure state verifies the rule reference itself, so it
                is the broader of the two. The field-guidance state verifies only
                the workflow-guidance field while the procedure record stays under
                review, which "only" makes explicit. */}
            <p className="font-semibold text-[#16302b]">
              {item.state === "verified-full-procedure"
                ? item.guidance.length > 0
                  ? "Verified procedure guidance"
                  : "Verified procedure reference"
                : "Verified workflow guidance only"}
            </p>
            {item.guidance.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {item.guidance.map((guidance) => <li key={guidance}>{guidance}</li>)}
              </ul>
            ) : null}
            {item.officialSourceUrl && item.citation && item.pinpoint ? (
              <p className="mt-3">
                <a className="font-semibold text-[#2f7d67] underline" href={item.officialSourceUrl} rel="noreferrer" target="_blank">Official source</a>
                {`: ${item.citation}, ${item.pinpoint}.`}
              </p>
            ) : null}
            <p className="mt-3 font-semibold text-[#7a4b00]">Verify current official requirements before filing.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
