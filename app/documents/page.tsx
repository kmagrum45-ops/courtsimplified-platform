"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CourtPath = "family" | "small-claims" | "civil";

type StoredCaseData = {
  courtPath: CourtPath;
  yourName?: string;
  otherParty?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  goal?: string;
  extra?: Record<string, any>;
  analysis?: {
    completedForms?: string[];
    receivedForms?: string[];
    requiredNextForms?: string[];
    notNeededNow?: string[];
  };
};

type CourtForm = {
  id: string;
  file_path: string;
  court_type: CourtPath;
  file_type: "pdf" | "docx";
  form_number: string;
  official_title: string;
  form_group?: string | null;
  procedure_stage?: string | null;
  purpose?: string | null;
  is_active: boolean;
};

type MappedForm = {
  label: string;
  form?: CourtForm;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export default function DocumentsPage() {
  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);
  const [forms, setForms] = useState<CourtForm[]>([]);
  const [loadingForm, setLoadingForm] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("caseData");

    if (!raw) {
      setCaseData(null);
      return;
    }

    try {
      setCaseData(JSON.parse(raw));
    } catch {
      setCaseData(null);
    }
  }, []);

  useEffect(() => {
    async function loadForms() {
      if (!caseData?.courtPath) return;

      const { data, error } = await supabase
        .from("court_form_library")
        .select("*")
        .eq("court_type", caseData.courtPath)
        .eq("is_active", true)
        .order("form_number", { ascending: true });

      if (error) {
        console.error("Could not load forms:", error);
        return;
      }

      setForms((data || []) as CourtForm[]);
    }

    loadForms();
  }, [caseData?.courtPath]);

  function getFormUrl(form: CourtForm) {
    const { data } = supabase.storage
      .from("court-forms")
      .getPublicUrl(form.file_path);

    return data.publicUrl;
  }

  function findFormByLabel(label: string): CourtForm | undefined {
    const normalizedLabel = normalize(label);

    return forms.find((form) => {
      const numberMatch = normalize(form.form_number) === normalizedLabel;
      const titleMatch = normalize(form.official_title).includes(normalizedLabel);
      const combinedMatch = normalize(
        `${form.form_number} ${form.official_title}`
      ).includes(normalizedLabel);

      return numberMatch || titleMatch || combinedMatch;
    });
  }

  function mapForms(labels: string[] = []): MappedForm[] {
    return labels.map((label) => ({
      label,
      form: findFormByLabel(label),
    }));
  }

  const nextForms = useMemo(
    () => mapForms(caseData?.analysis?.requiredNextForms || []),
    [caseData, forms]
  );

  const completedForms = useMemo(
    () => mapForms(caseData?.analysis?.completedForms || []),
    [caseData, forms]
  );

  const receivedForms = useMemo(
    () => mapForms(caseData?.analysis?.receivedForms || []),
    [caseData, forms]
  );

  const notNeededForms = useMemo(
    () => mapForms(caseData?.analysis?.notNeededNow || []),
    [caseData, forms]
  );

  async function generateForm(form: CourtForm) {
    if (!caseData) return;

    setLoadingForm(form.id);

    try {
      const res = await fetch("/api/generate-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formType: form.form_number,
          formId: form.id,
          courtPath: caseData.courtPath,
          yourName: caseData.yourName,
          otherParty: caseData.otherParty,
          facts: caseData.facts,
          timeline: caseData.timeline,
          evidence: caseData.evidence,
          goal: caseData.goal,
          extra: caseData.extra || {},
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.form_number.replaceAll(" ", "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Form generation failed:", err);
      alert("This form could not be generated yet. You can still open the blank form.");
    } finally {
      setLoadingForm(null);
    }
  }

  function renderFormCard(form: CourtForm, note?: string) {
    const isPdf = form.file_type === "pdf";
    const isDocx = form.file_type === "docx";

    return (
      <div
        key={form.id}
        className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
          {form.form_group || form.procedure_stage || form.court_type}
        </p>

        <h3 className="mt-2 text-xl font-bold text-[#10231f]">
          {form.form_number} — {form.official_title || "Court form"}
        </h3>

        {form.purpose && (
          <p className="mt-3 text-sm text-[#49635c]">{form.purpose}</p>
        )}

        {note && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {note}
          </p>
        )}

        <p className="mt-3 text-sm text-[#49635c]">
          File type: {form.file_type.toUpperCase()}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={getFormUrl(form)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[#2f7d67] px-4 py-2 font-semibold text-[#2f7d67]"
          >
            {isDocx ? "Download Word form" : "Open blank form"}
          </a>

          {isPdf && (
            <button
              type="button"
              onClick={() => generateForm(form)}
              disabled={loadingForm === form.id}
              className="rounded-2xl bg-[#2f7d67] px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {loadingForm === form.id ? "Generating..." : "Generate PDF"}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderMappedSection(title: string, items: MappedForm[]) {
    if (items.length === 0) return null;

    return (
      <section>
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <div className="space-y-4">
          {items.map((item, index) => {
            if (item.form) return renderFormCard(item.form);

            return (
              <div
                key={`${item.label}-${index}`}
                className="rounded-3xl border border-amber-200 bg-amber-50 p-6"
              >
                <h3 className="text-xl font-bold text-amber-900">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm text-amber-800">
                  This was recommended by the case analysis, but it did not match
                  a form in the clean form library yet.
                </p>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (!caseData) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold">No case data found</h1>
        <p className="mt-3 text-gray-600">
          Complete the intake first, then return to documents.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
      <div className="mx-auto max-w-5xl space-y-10">
        <section>
          <h1 className="text-3xl font-bold">Court Documents</h1>
          <p className="mt-2 text-[#49635c]">
            Showing forms from the clean CourtSimplified form library for{" "}
            <strong>{caseData.courtPath}</strong>.
          </p>
        </section>

        {renderMappedSection("Next required documents", nextForms)}
        {renderMappedSection("Already completed", completedForms)}
        {renderMappedSection("Documents received", receivedForms)}
        {renderMappedSection("Not needed right now", notNeededForms)}

        <section>
          <h2 className="mb-4 text-2xl font-bold">
            All available forms for this court type
          </h2>
          <div className="space-y-4">{forms.map((form) => renderFormCard(form))}</div>
        </section>
      </div>
    </main>
  );
}