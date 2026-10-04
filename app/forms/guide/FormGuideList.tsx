"use client";

import { useMemo, useState } from "react";

export type FormGuideItem = {
  id: string;
  number: string;
  title: string;
  dateOfForm: string;
  summary: string;
  rules: { rule: string; quote: string }[];
  official: { date: string; pdf: string | null; docx: string | null; fetchedAt: string } | null;
};

/** Search and list for the form guide. All text arrives already approved by the server. */
export default function FormGuideList({
  items,
  officialFormsPage,
}: {
  items: FormGuideItem[];
  officialFormsPage: string;
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return items;
    return items.filter((item) => {
      const haystack = `form ${item.number} ${item.title} ${item.summary}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [items, query]);

  return (
    <div className="mt-6">
      <label className="block">
        <span className="text-sm font-semibold text-[#16302b]">Search by number, name or what it is for</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="For example: defence, 14A, affidavit, garnishment"
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-base"
          aria-label="Search forms"
        />
      </label>
      <p className="mt-2 text-sm text-[#4d675f]" aria-live="polite">
        Showing {shown.length} of {items.length} forms
      </p>

      <ul className="mt-4 space-y-3">
        {shown.map((item) => (
          <li key={item.id} id={`form-${item.number}`} className="rounded-2xl border border-[#d8e6df] bg-white p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#2f7d67]">Form {item.number}</span>
              <h2 className="text-lg font-bold text-[#10231f]">{item.title}</h2>
            </div>
            {item.summary ? <p className="mt-2 text-sm leading-6 text-[#24463d]">{item.summary}</p> : null}
            {item.rules.length > 0 ? (
              <details className="mt-3 text-sm text-[#4d675f]">
                <summary className="cursor-pointer font-semibold text-[#1c473d]">What the rules say</summary>
                <ul className="mt-2 space-y-2">
                  {item.rules.map((rule) => (
                    <li key={`${item.id}-${rule.rule}`} className="rounded-xl bg-[#f8fcfa] p-3">
                      <span className="font-semibold text-[#16302b]">{rule.rule}:</span> &ldquo;{rule.quote}&rdquo;
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="mt-3 text-sm text-[#4d675f]">No rule names this form by number; the explanation is from its title.</p>
            )}
            {item.official && (item.official.pdf || item.official.docx) ? (
              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {item.official.pdf ? (
                  <a href={item.official.pdf} target="_blank" rel="noreferrer" className="rounded-lg bg-[#2f7d67] px-3 py-1.5 font-semibold text-white">
                    Official form (PDF)
                  </a>
                ) : null}
                {item.official.docx ? (
                  <a href={item.official.docx} target="_blank" rel="noreferrer" className="rounded-lg border border-[#2f7d67] px-3 py-1.5 font-semibold text-[#2f7d67]">
                    Official form (Word)
                  </a>
                ) : null}
                <span className="text-xs text-[#6b7f78]">
                  Current version: {item.official.date || "not stated"} (checked {item.official.fetchedAt})
                </span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-[#6b7f78]">
                Form version: {item.dateOfForm || "not stated"}.{" "}
                {officialFormsPage ? (
                  <a href={officialFormsPage} target="_blank" rel="noreferrer" className="underline">
                    Get this form from the official site
                  </a>
                ) : null}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
