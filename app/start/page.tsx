"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = {
  province: string;
  issueType: string;
  goal: string;
  facts: string;
  people: string;
  documents: string;
  deadlines: string;
};

const initialForm: FormState = {
  province: "",
  issueType: "",
  goal: "",
  facts: "",
  people: "",
  documents: "",
  deadlines: "",
};

export default function StartPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGenerateSummary() {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/case-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }

      // 🔥 FIXED HERE (uses summary instead of result)
      const summaryText = data.summary || "No summary returned.";
      setResult(summaryText);

      const casePackage = {
        form,
        summary: summaryText,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "courtsimplified_case_package",
        JSON.stringify(casePackage)
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setForm(initialForm);
    setResult("");
    setError("");
    localStorage.removeItem("courtsimplified_case_package");
  }

  function goToForms() {
    window.location.href = "/forms";
  }

  function goToEvidence() {
    window.location.href = "/evidence";
  }

  return (
    <main className="bg-white text-[#1F2937]">
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Link href="/" className="text-sm text-[#0F766E] underline">
          ← Back to main guide
        </Link>
      </div>

      <section className="border-b py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="mb-4 text-4xl font-bold">
            Start your case in a clearer, more organized way.
          </h1>
          <p className="max-w-2xl text-[#5F6F76]">
            Enter your facts, people, documents, and deadlines. This tool will
            generate a structured case summary you can review and build on.
          </p>
        </div>
      </section>

      <section className="bg-[#F8FBFB] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold">Case Intake</h2>

            <div className="grid gap-5">
              <div>
                <label className="mb-2 block font-medium">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  className="w-full rounded-xl border p-3"
                >
                  <option value="">Select province</option>
                  <option>Ontario</option>
                  <option>British Columbia</option>
                  <option>Alberta</option>
                  <option>Manitoba</option>
                  <option>Saskatchewan</option>
                  <option>Nova Scotia</option>
                  <option>New Brunswick</option>
                  <option>Prince Edward Island</option>
                  <option>Newfoundland and Labrador</option>
                  <option>Other / Unsure</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">General issue type</label>
                <select
                  value={form.issueType}
                  onChange={(e) => updateField("issueType", e.target.value)}
                  className="w-full rounded-xl border p-3"
                >
                  <option value="">Select issue type</option>
                  <option>Small Claims / Money Dispute</option>
                  <option>Civil Claim</option>
                  <option>Contract / Service Dispute</option>
                  <option>Negligence / Injury Issue</option>
                  <option>Public Law / Charter Concern</option>
                  <option>Employment Issue</option>
                  <option>Housing / Landlord Issue</option>
                  <option>Family Issue</option>
                  <option>Other / Unsure</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">Main goal</label>
                <input
                  value={form.goal}
                  onChange={(e) => updateField("goal", e.target.value)}
                  className="w-full rounded-xl border p-3"
                  placeholder="Example: sole custody, file a claim, respond to a lawsuit"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Facts</label>
                <textarea
                  value={form.facts}
                  onChange={(e) => updateField("facts", e.target.value)}
                  className="min-h-[140px] w-full rounded-xl border p-3"
                  placeholder="Describe what happened."
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">People involved</label>
                <textarea
                  value={form.people}
                  onChange={(e) => updateField("people", e.target.value)}
                  className="min-h-[100px] w-full rounded-xl border p-3"
                  placeholder="Example: me, my daughter, her father"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Documents</label>
                <textarea
                  value={form.documents}
                  onChange={(e) => updateField("documents", e.target.value)}
                  className="min-h-[100px] w-full rounded-xl border p-3"
                  placeholder="Emails, texts, court orders, receipts, reports"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Deadlines</label>
                <input
                  value={form.deadlines}
                  onChange={(e) => updateField("deadlines", e.target.value)}
                  className="w-full rounded-xl border p-3"
                  placeholder="Any known deadline or court date"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={loading}
                  className="rounded-xl bg-[#2FB8AC] px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Summary"}
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading}
                  className="rounded-xl border px-6 py-3 font-semibold disabled:opacity-50"
                >
                  Clear Form
                </button>
              </div>
            </div>
          </div>

          {(error || result) && (
            <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">Structured Output</h2>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  {error}
                </div>
              )}

              {result && (
                <>
                  <div className="rounded-xl bg-[#F8FBFB] p-4">
                    <p className="whitespace-pre-wrap text-[#374151]">{result}</p>
                  </div>

                  <div className="mt-6 rounded-xl border border-[#D7ECE8] bg-[#F4FBFA] p-5">
                    <h3 className="mb-2 text-xl font-semibold">
                      Continue to the next step
                    </h3>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={goToForms}
                        className="rounded-xl bg-[#2FB8AC] px-5 py-3 font-semibold text-white"
                      >
                        Continue to Forms & Documents
                      </button>

                      <button
                        type="button"
                        onClick={goToEvidence}
                        className="rounded-xl border px-5 py-3 font-semibold"
                      >
                        Continue to Evidence Builder
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}