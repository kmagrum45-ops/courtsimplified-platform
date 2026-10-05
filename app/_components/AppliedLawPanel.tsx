import type { AppliedLawItem } from "@/src/lib/case-system/intelligence/intelligenceTypes";
import { publicSourceUrl } from "@/src/lib/content-library/publicSourceUrl";

import ExplainProvision from "./ExplainProvision";

/**
 * "The law behind this": the provisions a person's analysis rests on.
 *
 * Each one was found for their story by meaning-based retrieval, cited by the
 * analysis, and its quote checked word for word against the official text
 * before it got here (retrieval/storyRetrieval.ts,
 * groundedCognition.verifiedSourceIds). What is shown is the provision's own
 * words, its citation and the official page -- no model wording. Applying the
 * law to the person's situation is what CLAUDE.md section 2 asks for; saying
 * how the case will go is not, and nothing here does. Behind its own switch
 * (phaseScope.appliedLawEnabled): when off, the analysis carries no items and
 * this renders nothing. A checked plain-language explanation can be asked for
 * per item (ExplainProvision, behind phaseScope.plainExplanationsEnabled); it
 * sits beside the provision's words, never in place of them.
 */
export default function AppliedLawPanel({ items }: { items: readonly AppliedLawItem[] }) {
  if (!items.length) return null;
  return (
    <div data-testid="applied-law">
      <p className="mb-3 text-sm leading-6 text-[#4d675f]">
        These provisions were found for the situation you described. Each is quoted from the official text and was
        checked word for word. Read them against your own facts: they say what the law provides, not how your case
        will turn out.
      </p>
      <ul className="space-y-4">
        {items.map((item) => {
          const preview = item.text.length > 320 ? `${item.text.slice(0, 320).replace(/\s+\S*$/, "")} …` : item.text;
          const link = publicSourceUrl(item.sourceUrl);
          return (
            <li key={item.id} className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
              <p className="text-sm font-semibold text-[#16302b]">{item.citation || item.label}</p>
              {item.kind === "decision" ? (
                <p className="mt-1 text-xs text-[#4d675f]">
                  A court decision: what the judges said in an earlier case. It has not been checked for later decisions
                  that may have changed it.
                </p>
              ) : null}
              {item.text.length > 320 ? (
                <details className="mt-1 text-sm text-[#24463d]">
                  <summary className="cursor-pointer">
                    <span>{preview}</span> <span className="font-semibold text-[#2f7d67]">Read the whole provision</span>
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{item.text}</p>
                </details>
              ) : (
                <p className="mt-1 text-sm text-[#24463d]">{item.text}</p>
              )}
              {item.explainable ? <ExplainProvision id={item.id} /> : null}
              {link ? (
                <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#2f7d67] underline">
                  {item.kind === "decision" ? "Read the decision" : "Official text"}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
