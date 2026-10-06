import type { ResearchFindingView } from "@/src/lib/case-system/intelligence/intelligenceTypes";
import { publicSourceUrl } from "@/src/lib/content-library/publicSourceUrl";

import ExplainProvision from "./ExplainProvision";

/**
 * "What we looked into": the questions the research step chose for this
 * story (retrieval/researchStory.ts), and for each one the provisions that
 * answer it -- the provision's own words, with the words that answer it shown
 * first, checked by code to be in the provision -- or a plain statement that
 * our library does not have it yet. No model wording about the law is shown
 * here; the questions are questions. Behind phaseScope.researchStepEnabled.
 */
/**
 * A quote or passage cut at a character limit ended mid-word ("...first
 * oug") or began mid-sentence (page review, 2026-10-06). Shown cut at a word,
 * with an ellipsis where the official text goes on.
 */
export function tidyExcerpt(text: string): string {
  let out = text.trim();
  if (out && !/[.;:!?)\]"”’]$/.test(out)) {
    const cut = out.lastIndexOf(" ");
    out = `${(cut > out.length * 0.6 ? out.slice(0, cut) : out).replace(/[,;:]$/, "")}…`;
  }
  if (/^[a-z]/.test(out)) out = `…${out}`;
  return out;
}

export default function ResearchPanel({ findings: all }: { findings: readonly ResearchFindingView[] }) {
  // Questions the library cannot answer are listed once, at the end, rather
  // than as cards that each announce nothing (page review, 2026-10-06).
  const findings = all.filter((finding) => finding.status === "answered" && finding.provisions.length > 0);
  const unanswered = all.filter((finding) => !(finding.status === "answered" && finding.provisions.length > 0));
  if (!all.length) return null;
  return (
    <div data-testid="research-findings">
      <p className="mb-3 text-sm leading-6 text-[#4d675f]">
        These are the questions a careful lawyer would look into for what you described, and what the law in our
        checked library says about each. The quoted words are from the official text. They say what the law provides,
        not how your case will turn out.
      </p>
      <ol className="space-y-4">
        {findings.map((finding, index) => (
          <li key={`${index}-${finding.question}`} className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
            {/*
              Each question opens to its passages (2026-10-06): a results page
              showed about fifteen provisions in full, one after another, and
              read as the same law repeated. The questions stay in view; the
              first is open.
            */}
            <details open={index === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-[#16302b]">
              {finding.question}
              {finding.status === "answered" && finding.provisions.length > 0 ? (
                <span className="ml-2 text-xs font-normal text-[#4d675f]">
                  ({finding.provisions.length} {finding.provisions.length === 1 ? "passage" : "passages"})
                </span>
              ) : null}
            </summary>
            {finding.status === "answered" && finding.provisions.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {finding.provisions.map((provision) => {
                  const link = publicSourceUrl(provision.sourceUrl);
                  return (
                    <li key={provision.id} className="text-sm text-[#24463d]">
                      <p className="text-xs font-semibold text-[#16302b]">{provision.citation || provision.label}</p>
                      <blockquote className="mt-1 border-l-2 border-[#2f7d67] pl-3">“{tidyExcerpt(provision.quote)}”</blockquote>
                      {provision.kind === "decision" ? (
                        <p className="mt-1 text-xs text-[#4d675f]">
                          A court decision: what the judges said in an earlier case. It has not been checked for later
                          decisions that may have changed it.
                        </p>
                      ) : null}
                      <details className="mt-1 text-xs">
                        <summary className="cursor-pointer font-semibold text-[#2f7d67]">
                          {provision.kind === "decision" ? "Read more of the decision" : "Read more of the provision"}
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{tidyExcerpt(provision.text)}</p>
                      </details>
                      {provision.explainable ? <ExplainProvision id={provision.id} /> : null}
                      {link ? (
                        <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#2f7d67] underline">
                          {provision.kind === "decision" ? "Read the decision" : "Official text"}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : finding.status === "not-in-library" ? (
              <p className="mt-2 text-sm text-[#4d675f]">
                The law that answers this is not in our checked library yet
                {finding.missingSource ? ` (it may be in ${finding.missingSource})` : ""}, so we are not quoting it. We are
                adding missing laws from the official sources.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#4d675f]">We could not find this in our checked library.</p>
            )}
            </details>
          </li>
        ))}
      </ol>
      {unanswered.length > 0 ? (
        <details className="mt-4 text-sm text-[#4d675f]" data-testid="research-unanswered">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">
            {unanswered.length === 1
              ? "One more question we looked into is not answered by our checked library yet"
              : `${unanswered.length} more questions we looked into are not answered by our checked library yet`}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {unanswered.map((finding, index) => (
              <li key={`${index}-${finding.question}`}>
                {finding.question}
                {finding.status === "not-in-library" && finding.missingSource ? ` (it may be in ${finding.missingSource})` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
