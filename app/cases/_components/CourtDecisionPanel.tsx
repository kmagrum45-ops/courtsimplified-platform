"use client";

/**
 * A court decision the person uploaded from CanLII: its attribution (always
 * "Source: CanLII"), CanLII's caution, the details that name it, what
 * CanLII's API says about it, and -- on the person's click, when switched
 * on -- plain-language help whose every quote is checked against the
 * uploaded text. See src/lib/case-workspace/courtDecision.ts for the rules.
 */

import { useEffect, useState } from "react";

import CanliiCaseInfo from "@/app/_components/CanliiCaseInfo";
import {
  DECISION_CAUTION,
  DECISION_SEARCH_HELP,
  decisionAttribution,
  type DecisionDetails,
  type DecisionHelp,
} from "@/src/lib/case-workspace/courtDecision";
import { supabase } from "@/src/lib/supabase/client";

export function DecisionAttribution({ details }: { details: DecisionDetails | null | undefined }) {
  return (
    <span data-testid="decision-attribution" className="block text-xs font-semibold text-[#4c615b]">
      {decisionAttribution(details ?? {})}
    </span>
  );
}

export default function CourtDecisionPanel({
  documentId,
  details,
  onSave,
}: {
  documentId: string;
  details: DecisionDetails | null | undefined;
  onSave: (id: string, change: Record<string, unknown>) => Promise<void>;
}) {
  const [caseName, setCaseName] = useState(details?.caseName ?? "");
  const [citation, setCitation] = useState(details?.citation ?? "");
  const [court, setCourt] = useState(details?.court ?? "");
  const [decisionDate, setDecisionDate] = useState(details?.decisionDate ?? "");
  const [help, setHelp] = useState<DecisionHelp | null>(null);
  const [helpState, setHelpState] = useState<"idle" | "loading" | "off" | "failed">("idle");
  const [helpMessage, setHelpMessage] = useState("");

  useEffect(() => {
    setCaseName(details?.caseName ?? "");
    setCitation(details?.citation ?? "");
    setCourt(details?.court ?? "");
    setDecisionDate(details?.decisionDate ?? "");
    setHelp(null);
    setHelpState("idle");
  }, [documentId, details?.caseName, details?.citation, details?.court, details?.decisionDate]);

  async function askForHelp() {
    setHelpState("loading");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch("/api/workspace/documents/decision-help", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ documentId }),
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    if (body?.enabled === false) return setHelpState("off");
    if (!body?.help) {
      setHelpMessage(body?.error || body?.message || "We could not explain this decision just now.");
      return setHelpState("failed");
    }
    setHelp(body.help as DecisionHelp);
    setHelpState("idle");
  }

  return (
    <section data-testid="court-decision-panel" className="mt-4 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-3 text-sm">
      <DecisionAttribution details={{ caseName, citation }} />
      <p className="mt-2 text-xs leading-5 text-[#7a5418]">{DECISION_CAUTION}</p>

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(documentId, {
            decisionCaseName: caseName || null,
            decisionCitation: citation || null,
            decisionCourt: court || null,
            decisionDate: decisionDate || null,
          });
        }}
      >
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Case name
          <input value={caseName} onChange={(event) => setCaseName(event.target.value)} placeholder="Smith v. Jones" className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]" />
        </label>
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Citation
          <input value={citation} onChange={(event) => setCitation(event.target.value)} placeholder="2023 ONSC 1234" className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]" />
        </label>
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Court
          <input value={court} onChange={(event) => setCourt(event.target.value)} className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]" />
        </label>
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Date of the decision
          <input type="date" value={decisionDate} onChange={(event) => setDecisionDate(event.target.value)} className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]" />
        </label>
        <button type="submit" className="rounded-full bg-[#2FB8AC] px-4 py-1.5 text-sm font-semibold text-white">
          Save the decision&apos;s details
        </button>
      </form>

      {citation.trim() ? <CanliiCaseInfo citation={citation} /> : null}

      <div className="mt-3">
        {helpState === "off" ? (
          <p className="text-xs text-[#6b8078]">Plain-language help with decisions is not switched on yet.</p>
        ) : (
          <button
            type="button"
            data-testid="decision-help"
            disabled={helpState === "loading"}
            onClick={() => void askForHelp()}
            className="rounded-full border border-[#2f7d67] px-4 py-1.5 text-sm font-semibold text-[#2f7d67] disabled:opacity-60"
          >
            {helpState === "loading" ? "Reading the decision…" : "Explain this decision in plain words"}
          </button>
        )}
        {helpState === "failed" ? <p className="mt-2 text-xs text-[#7a5418]">{helpMessage}</p> : null}
        {help ? (
          <div data-testid="decision-help-answer" className="mt-3 space-y-2 text-sm leading-6 text-[#24463d]">
            <p className="text-xs text-[#6b8078]">An AI suggestion to help you read the decision. It does not say how your case will go.</p>
            <p className="whitespace-pre-line">{help.explanation}</p>
            {help.passages.length ? (
              <ul className="space-y-2">
                {help.passages.map((passage) => (
                  <li key={passage.quote}>
                    <blockquote className="border-l-2 border-[#2f7d67] pl-3">“{passage.quote}”</blockquote>
                    <p className="mt-1 text-xs text-[#4d675f]">{passage.why}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <DecisionAttribution details={{ caseName, citation }} />
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-5 text-[#6b8078]">{DECISION_SEARCH_HELP}</p>
    </section>
  );
}
