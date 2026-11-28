"use client";

/**
 * THE NEW SMALL CLAIMS RESULTS STEP'S CATALOGUE BLOCKS (site owner, 27 Nov 2026; block table rows D, E, L, F, W). Layout
 * only: what shows comes from results/scResults.ts (the record and the catalogue's conditions, no AI), in the catalogue's
 * own stored words. The next-step card above it (row A) is the stage map's (StageAnswerPanel), drawn by the builder page.
 */
import { useFlowRecord } from "./useFlowRecord";
import { scResults } from "../../../src/lib/case-system/results/scResults";
import { RESULTS_ACTIONS, RESULTS_HEADINGS, RESULTS_NO_KIND, RESULTS_VERIFIED } from "../../../src/lib/case-system/copy/flowCopy";

export function ResultsBlocks({ onCasePage, onCaseSection }: { onCasePage: () => void; onCaseSection: (section: "documents" | "forms") => void }) {
  const { record } = useFlowRecord();
  const results = scResults(record);
  const box = "rounded-2xl border border-[#d8e6df] bg-white p-4";
  return (
    <div data-testid="sc-results-blocks" className="space-y-4">
      {!results.claimTypeId ? <p data-testid="results-no-kind" className="text-sm text-[#24463d]">{RESULTS_NO_KIND}</p> : null}
      {results.deadlines.length ? (
        <section data-testid="results-deadlines" className={box}>
          <h3 className="font-bold text-[#10231f]">{RESULTS_HEADINGS.deadlines}</h3>
          <ul className="mt-2 space-y-2">
            {results.deadlines.map((line) => (
              <li key={line.key} data-testid="results-deadline" data-key={line.key} className="text-sm text-[#16302b]">{line.name || line.text}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {results.elements.length ? (
        <section data-testid="results-checklist" className={box}>
          <h3 className="font-bold text-[#10231f]">{RESULTS_HEADINGS.checklist}</h3>
          <ul className="mt-2 space-y-3">
            {results.elements.map((line) => (
              <li key={line.key} data-testid="results-element" data-key={line.key} className="text-sm">
                <span className="font-semibold text-[#16302b]">{line.name}</span>
                <span className="block text-[#24463d]">{line.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {results.considerations.length || results.notes.length ? (
        <section data-testid="results-law" className={box}>
          <h3 className="font-bold text-[#10231f]">{RESULTS_HEADINGS.law}</h3>
          {results.considerations.length ? (
            <>
              <h4 className="mt-2 text-sm font-semibold text-[#16302b]">{RESULTS_HEADINGS.considerations}</h4>
              <ul className="mt-1 space-y-2">
                {results.considerations.map((line) => (
                  <li key={line.key} data-testid="results-consideration" data-key={line.key} className="text-sm">
                    <span className="font-semibold text-[#16302b]">{line.name}</span>
                    <span className="block text-[#24463d]">{line.text}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {results.notes.length ? (
            <>
              <h4 className="mt-3 text-sm font-semibold text-[#16302b]">{RESULTS_HEADINGS.notes}</h4>
              <ul className="mt-1 space-y-2">
                {results.notes.map((line) => <li key={line.key} data-testid="results-note" data-key={line.key} className="text-sm text-[#24463d]">{line.text}</li>)}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
      <section data-testid="results-actions" className={box}>
        <h3 className="font-bold text-[#10231f]">{RESULTS_HEADINGS.next}</h3>
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" data-testid="open-case-home" onClick={onCasePage} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">{RESULTS_ACTIONS.casePage}</button>
          <button type="button" onClick={() => onCaseSection("documents")} className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67]">{RESULTS_ACTIONS.documents}</button>
          <button type="button" onClick={() => onCaseSection("forms")} className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67]">{RESULTS_ACTIONS.forms}</button>
          <a href="?step=review" data-testid="results-change-answers" className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67]">{RESULTS_ACTIONS.change}</a>
        </div>
      </section>
      {results.sources.length ? (
        <section data-testid="results-sources" className={box}>
          <h3 className="font-bold text-[#10231f]">{RESULTS_HEADINGS.sources}</h3>
          <ul className="mt-2 space-y-1">
            {results.sources.map((source) => (
              <li key={source.url} className="text-xs text-[#4d675f]">
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.url}</a>
                {source.verifiedAt ? ` (${RESULTS_VERIFIED(source.verifiedAt)})` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
