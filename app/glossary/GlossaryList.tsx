"use client";

import { useMemo, useState } from "react";

export type GlossaryItem = {
  id: string;
  term: string;
  explanation: string;
  definitions: { citation: string; pinpoint: string; url: string; definition: string }[];
};

/** Search and list for the glossary. All text arrives already approved by the server. */
export default function GlossaryList({ items }: { items: GlossaryItem[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.term.toLowerCase().includes(q) || item.explanation.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="mt-6">
      <label className="block">
        <span className="text-sm font-semibold text-[#16302b]">Find a term</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="For example: action, service, spouse, holiday"
          aria-label="Find a term"
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-base"
        />
      </label>
      <p className="mt-2 text-sm text-[#4d675f]" aria-live="polite">
        Showing {shown.length} of {items.length} terms
      </p>
      <dl className="mt-4 space-y-3">
        {shown.map((item) => (
          <div key={item.id} id={item.id.replace("glossary:", "")} className="rounded-2xl border border-[#d8e6df] bg-white p-5">
            <dt className="text-lg font-bold text-[#10231f]">{item.term}</dt>
            <dd>
              {item.explanation ? <p className="mt-1 text-sm leading-6 text-[#24463d]">{item.explanation}</p> : null}
              <details className="mt-3 text-sm text-[#4d675f]">
                <summary className="cursor-pointer font-semibold text-[#1c473d]">
                  The definition in the law ({item.definitions.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {item.definitions.map((definition) => (
                    <li key={`${item.id}-${definition.citation}-${definition.pinpoint}`} className="rounded-xl bg-[#f8fcfa] p-3">
                      <p>&ldquo;{definition.definition}&rdquo;</p>
                      <p className="mt-1 text-xs">
                        <a href={definition.url} target="_blank" rel="noreferrer" className="underline">
                          {definition.citation}
                        </a>
                        , {definition.pinpoint}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
