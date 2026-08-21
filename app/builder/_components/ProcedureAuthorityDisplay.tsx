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
      return {
        state: "verified-full-procedure",
        guidance: ["This procedure is verified for the selected court area and stage."],
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

  return (
    <section className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#24463d]">
      <h3 className="font-bold text-[#16302b]">Ontario procedure authority</h3>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => item.state === "review-required" ? (
          <p key={`review-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            Review required — this procedure has no verified source-linked workflow guidance for the selected court area and stage.
          </p>
        ) : (
          <div key={`${item.citation}-${item.pinpoint}-${index}`} className="rounded-xl border border-[#d8e6df] bg-white p-3">
            <p className="font-semibold text-[#16302b]">
              {item.state === "verified-full-procedure" ? "Verified procedure guidance" : "Verified workflow guidance"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {item.guidance.map((guidance) => <li key={guidance}>{guidance}</li>)}
            </ul>
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
