"use client";

import { useMemo, useState } from "react";

export type GlossaryItem = {
  id: string;
  term: string;
  kind: "term" | "latin";
  also: string[];
  meaning: string;
  courts: { label: string; text: string }[];
  sources: { title: string; citation: string; pinpoint: string; url: string }[];
  definitions: { citation: string; pinpoint: string; url: string; definition: string }[];
};

type Filter = "all" | "latin";

/** Search and list for the glossary. All text arrives already approved by the server. */
export default function GlossaryList({ items }: { items: GlossaryItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const latinCount = items.filter((item) => item.kind === "latin").length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "latin" && item.kind !== "latin") return false;
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.also.some((name) => name.toLowerCase().includes(q)) ||
        item.meaning.toLowerCase().includes(q) ||
        item.courts.some((note) => note.text.toLowerCase().includes(q))
      );
    });
  }, [items, query, filter]);

  const chip = (value: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`rounded-full border px-4 py-2 text-sm font-semibold ${
        filter === value ? "border-[#1c473d] bg-[#1c473d] text-white" : "border-[#d8e6df] bg-white text-[#1c473d]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-6">
      <label className="block">
        <span className="text-sm font-semibold text-[#16302b]">Find a term</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="For example: affidavit, served, costs, ex parte"
          aria-label="Find a term"
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-base"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {chip("all", `All terms (${items.length})`)}
        {latinCount ? chip("latin", `Latin phrases (${latinCount})`) : null}
      </div>
      <p className="mt-2 text-sm text-[#4d675f]" aria-live="polite">
        Showing {shown.length} of {items.length} terms
      </p>
      {[
        { key: "terms", heading: "", list: shown.filter((item) => item.kind !== "latin") },
        { key: "latin", heading: "Latin phrases", list: shown.filter((item) => item.kind === "latin") },
      ].map((group) =>
        group.list.length ? (
          <section key={group.key} aria-label={group.heading || "Terms"}>
            {group.heading && filter !== "latin" ? (
              <h2 className="mt-10 text-xl font-bold text-[#10231f]">{group.heading}</h2>
            ) : null}
            <dl className="mt-4 space-y-3">
              {group.list.map((item) => (
          <div key={item.id} id={item.id.replace("glossary:", "")} className="rounded-2xl border border-[#d8e6df] bg-white p-5">
            <dt className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-[#10231f]">{item.term}</span>
              {item.kind === "latin" ? (
                <span className="rounded-full bg-[#eef6f2] px-2 py-0.5 text-xs font-semibold text-[#2f7d67]">Latin</span>
              ) : null}
              {item.also.length ? <span className="text-sm text-[#4d675f]">also: {item.also.join(", ")}</span> : null}
            </dt>
            <dd>
              {item.meaning ? <p className="mt-1 text-sm leading-6 text-[#24463d]">{item.meaning}</p> : null}
              {item.courts.length ? (
                <ul className="mt-3 space-y-2">
                  {item.courts.map((note) =>
                    note.text ? (
                      <li key={note.label} className="rounded-xl border-l-4 border-[#2f7d67] bg-[#f8fcfa] px-3 py-2 text-sm leading-6 text-[#24463d]">
                        <span className="font-semibold text-[#1c473d]">{note.label}: </span>
                        {note.text}
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : null}
              <details className="mt-3 text-sm text-[#4d675f]">
                <summary className="cursor-pointer font-semibold text-[#1c473d]">Where this comes from ({item.sources.length})</summary>
                <ul className="mt-2 space-y-1">
                  {item.sources.map((source) => (
                    <li key={`${item.id}-${source.url}-${source.pinpoint}`}>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                          {source.title}
                        </a>
                      ) : (
                        source.title
                      )}
                      {source.citation ? ` (${source.citation})` : ""}, {source.pinpoint}
                    </li>
                  ))}
                </ul>
              </details>
              {item.definitions.length ? (
                <details className="mt-2 text-sm text-[#4d675f]">
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
              ) : null}
            </dd>
          </div>
              ))}
            </dl>
          </section>
        ) : null,
      )}
    </div>
  );
}
