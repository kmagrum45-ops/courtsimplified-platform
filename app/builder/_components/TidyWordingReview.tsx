"use client";

import { useState } from "react";

/**
 * "Check spelling and wording" — offers a corrected version of each field the
 * user typed, beside their own words, and changes nothing until they choose.
 *
 * Added 2026-10-04 (site owner: "if the user makes spelling mistakes, they
 * stay"). Everything downstream reproduces the user's words, so this is the
 * one place to fix them — by the user's choice, never silently (CLAUDE.md §4).
 * See src/lib/case-system/intake/tidyWording.ts for what the model may change
 * and what code refuses.
 */

export type TidyableField = {
  key: string;
  label: string;
  value: string;
  setValue: (next: string) => void;
};

type Suggestion = { key: string; original: string; suggested: string };

// Mirrors MAX_TIDY_* in src/lib/case-system/intake/tidyWording.ts, which pulls
// in the server-only OpenAI client and so is not imported here.
const MAX_FIELDS = 20;
const MAX_FIELD_LENGTH = 4_000;
const MAX_TOTAL = 12_000;

export default function TidyWordingReview({ fields }: { fields: TidyableField[] }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filled = fields.filter((field) => field.value.trim().length > 0);

  async function check() {
    setLoading(true);
    setMessage("");
    setSuggestions(null);
    try {
      // Batches stay under the route's limits (tidyWording.ts): at most
      // MAX_FIELDS fields and MAX_TOTAL characters per request.
      const batches: { key: string; text: string }[][] = [];
      let batch: { key: string; text: string }[] = [];
      let size = 0;
      for (const field of filled) {
        const text = field.value.slice(0, MAX_FIELD_LENGTH);
        if (batch.length > 0 && (batch.length >= MAX_FIELDS || size + text.length > MAX_TOTAL)) {
          batches.push(batch);
          batch = [];
          size = 0;
        }
        batch.push({ key: field.key, text });
        size += text.length;
      }
      if (batch.length > 0) batches.push(batch);

      const all: Suggestion[] = [];
      for (const fieldsInBatch of batches) {
        const response = await fetch("/api/intake/tidy-wording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: fieldsInBatch }),
        });
        const body = (await response.json()) as { ok?: boolean; suggestions?: Suggestion[]; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error || "unavailable");
        all.push(...(body.suggestions || []));
      }
      // A suggestion is only shown while the field still holds the text it was made from.
      const current = new Map(fields.map((field) => [field.key, field.value]));
      const fresh = all.filter((s) => current.get(s.key) === s.original);
      setSuggestions(fresh);
      if (fresh.length === 0) setMessage("No spelling or wording fixes to suggest.");
    } catch {
      setMessage("The spelling check could not run just now. Your own words are unchanged.");
    } finally {
      setLoading(false);
    }
  }

  function resolve(key: string, accept: boolean) {
    const suggestion = suggestions?.find((s) => s.key === key);
    const field = fields.find((f) => f.key === key);
    if (accept && suggestion && field) field.setValue(suggestion.suggested);
    setSuggestions((current) => (current || []).filter((s) => s.key !== key));
  }

  return (
    <section
      data-testid="tidy-wording"
      className="rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5"
    >
      <h3 className="text-lg font-bold text-[#10231f]">Check spelling and wording</h3>
      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        Your words appear in your case summary and drafts. We can suggest fixes to spelling,
        capitals and punctuation. Nothing changes unless you choose it. Numbers, dates, names and
        anything in quotation marks are kept exactly as you wrote them.
      </p>
      <button
        type="button"
        data-testid="tidy-wording-check"
        disabled={loading || filled.length === 0}
        onClick={() => void check()}
        className="mt-3 rounded-xl border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67] disabled:opacity-50"
      >
        {loading ? "Checking…" : "Suggest fixes"}
      </button>
      {message && <p className="mt-3 text-sm text-[#4d675f]">{message}</p>}

      {suggestions && suggestions.length > 0 && (
        <ul className="mt-4 space-y-4">
          {suggestions.map((suggestion) => {
            const label = fields.find((f) => f.key === suggestion.key)?.label || suggestion.key;
            return (
              <li
                key={suggestion.key}
                data-testid="tidy-wording-suggestion"
                className="rounded-2xl border border-[#d8e6df] bg-white p-4"
              >
                <p className="text-sm font-semibold text-[#16302b]">{label}</p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#4d675f]">Your words</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#2b4640]">{suggestion.original}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">Suggested</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#10231f]">{suggestion.suggested}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => resolve(suggestion.key, true)}
                    className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Use suggested
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(suggestion.key, false)}
                    className="rounded-xl border border-[#d8e6df] px-4 py-2 text-sm font-semibold text-[#16302b]"
                  >
                    Keep mine
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
