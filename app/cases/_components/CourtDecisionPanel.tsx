"use client";

/**
 * A court decision the person uploaded from CanLII, in the document detail
 * panel: its attribution (always "Source: CanLII"), CanLII's caution, the
 * details that name it (entered or confirmed by the person), what CanLII's
 * API says about it, and -- only on the person's click, and only when switched
 * on -- plain-language help whose every quote was checked against the
 * uploaded text. The rules are in src/lib/case-workspace/courtDecision.ts.
 */

import { useEffect, useState } from "react";

import CanliiCaseInfo, { type CanliiCase } from "@/app/_components/CanliiCaseInfo";
import {
  DECISION_CAUTION,
  DECISION_HELP_BOUNDARY,
  DECISION_SEARCH_HELP,
  decisionAttribution,
  type DecisionDetails,
  type DecisionHelp,
} from "@/src/lib/case-workspace/courtDecision";
import { supabase } from "@/src/lib/supabase/client";

/**
 * The attribution line. Every screen that shows an uploaded decision renders
 * this (test:canlii checks it). It takes no switch to turn it off.
 */
export function DecisionAttribution({ details }: { details: DecisionDetails | null | undefined }) {
  return (
    <span data-testid="decision-attribution" className="block text-xs font-semibold text-[#4c615b]">
      {decisionAttribution(details)}
    </span>
  );
}

/** CanLII's caution, in plain words. Shown with every uploaded decision. */
export function DecisionCaution() {
  return <p className="mt-2 rounded-xl bg-[#fdf3e3] p-2 text-xs leading-5 text-[#7a5418]">{DECISION_CAUTION}</p>;
}

export default function CourtDecisionPanel({
  documentId,
  details,
  onSave,
}: {
  documentId: string;
  details: DecisionDetails | null | undefined;
  onSave: (id: string, change: Record<string, unknown>) => Promise<string | null>;
}) {
  const [caseName, setCaseName] = useState(details?.caseName ?? "");
  const [citation, setCitation] = useState(details?.citation ?? "");
  const [court, setCourt] = useState(details?.court ?? "");
  const [decisionDate, setDecisionDate] = useState(details?.decisionDate ?? "");
  const [saveMessage, setSaveMessage] = useState("");
  const [help, setHelp] = useState<DecisionHelp | null>(null);
  const [helpState, setHelpState] = useState<"idle" | "loading" | "off" | "failed">("idle");
  const [helpMessage, setHelpMessage] = useState("");

  useEffect(() => {
    setCaseName(details?.caseName ?? "");
    setCitation(details?.citation ?? "");
    setCourt(details?.court ?? "");
    setDecisionDate(details?.decisionDate ?? "");
    setSaveMessage("");
    setHelp(null);
    setHelpState("idle");
  }, [documentId, details?.caseName, details?.citation, details?.court, details?.decisionDate]);

  function fillFromCanlii(found: CanliiCase) {
    // Filled in for the person to look at and save; nothing is saved until they do (CLAUDE.md s. 4).
    setCaseName(found.title);
    setCitation(found.citation);
    if (found.court) setCourt(found.court);
    if (found.decisionDate) setDecisionDate(found.decisionDate);
    setSaveMessage("CanLII's details are filled in. Check them, then save.");
  }

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
    if (body?.enabled === false) {
      setHelpState("off");
      return;
    }
    if (!body?.help) {
      setHelpMessage(body?.error || body?.message || "We could not explain this decision just now.");
      setHelpState("failed");
      return;
    }
    setHelp(body.help as DecisionHelp);
    setHelpState("idle");
  }

  return (
    <section data-testid="court-decision-panel" className="mt-4 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-3 text-sm">
      <DecisionAttribution details={{ caseName, citation }} />
      <DecisionCaution />

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSaveMessage("Saving…");
          void onSave(documentId, {
            decisionCaseName: caseName || null,
            decisionCitation: citation || null,
            decisionCourt: court || null,
            decisionDate: decisionDate || null,
          }).then((problem) => setSaveMessage(problem ?? "Saved."));
        }}
      >
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Case name
          <input
            value={caseName}
            onChange={(event) => setCaseName(event.target.value)}
            placeholder="Smith v. Jones"
            className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm normal-case tracking-normal text-[#16302b]"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Citation
          <input
            value={citation}
            onChange={(event) => setCitation(event.target.value)}
            placeholder="2023 ONSC 1234"
            className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm normal-case tracking-normal text-[#16302b]"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Court
          <input
            value={court}
            onChange={(event) => setCourt(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm normal-case tracking-normal text-[#16302b]"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
          Date of the decision
          <input
            type="date"
            value={decisionDate}
            onChange={(event) => setDecisionDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#2FB8AC] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#259E94] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
        >
          Save the decision&apos;s details
        </button>
        {saveMessage ? (
          <p className="text-xs text-[#4d675f]" aria-live="polite">
            {saveMessage}
          </p>
        ) : null}
      </form>

      {/*
        Looked up from the SAVED citation, not while it is typed: each partial
        citation ("2023 ONSC 12", "…123") would otherwise spend a CanLII call.
      */}
      {details?.citation?.trim() ? <CanliiCaseInfo citation={details.citation} onUseDetails={fillFromCanlii} /> : null}

      <div className="mt-3">
        {helpState === "off" ? (
          <p className="text-xs text-[#6b8078]">Plain-language help with decisions is not switched on yet.</p>
        ) : (
          <button
            type="button"
            data-testid="decision-help"
            disabled={helpState === "loading"}
            onClick={() => void askForHelp()}
            className="rounded-full border border-[#2f7d67] px-4 py-1.5 text-sm font-semibold text-[#2f7d67] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
          >
            {helpState === "loading" ? "Reading the decision…" : "Explain this decision in plain words"}
          </button>
        )}
        {helpState === "failed" ? <p className="mt-2 text-xs text-[#7a5418]">{helpMessage}</p> : null}
        {help ? (
          <div data-testid="decision-help-answer" className="mt-3 space-y-2 text-sm leading-6 text-[#24463d]">
            <p className="text-xs text-[#6b8078]">{DECISION_HELP_BOUNDARY}</p>
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
