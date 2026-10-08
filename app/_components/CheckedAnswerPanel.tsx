import type { CheckedAnswerView } from "@/src/lib/case-system/intelligence/intelligenceTypes";
import { ANSWER_BOUNDARY, DECLINE_TO_JUDGE, OUTSIDE_SCOPE } from "@/src/lib/case-system/retrieval/checkedAnswerText";
import { publicSourceUrl } from "@/src/lib/content-library/publicSourceUrl";

/**
 * A checked answer (retrieval/checkedAnswer.ts): the site's plain answer to the
 * person's question or story, one statement at a time, each with the official
 * words that support it. Nothing here is written on the screen that did not
 * pass the check; the fixed lines (boundary, decline, outside scope) are
 * written in code, never by the model.
 */
export default function CheckedAnswerPanel({ answer }: { answer: CheckedAnswerView }) {
  if (answer.status === "unavailable") return null;
  if (answer.status === "outside-scope") {
    return (
      <div data-testid="checked-answer" className="text-sm leading-6 text-[#24463d]">
        <p>{OUTSIDE_SCOPE}</p>
      </div>
    );
  }
  return (
    <div data-testid="checked-answer" className="text-sm leading-6 text-[#24463d]">
      {answer.declinedToJudge ? <p className="mb-3 font-semibold text-[#16302b]">{DECLINE_TO_JUDGE}</p> : null}
      {answer.statements.length ? (
        <>
          <p className="mb-3 text-xs text-[#4d675f]">{ANSWER_BOUNDARY}</p>
          <ol className="space-y-3">
            {answer.statements.map((statement, index) => (
              <li key={`${index}-${statement.text.slice(0, 24)}`}>
                <p className="text-[#16302b]">{statement.text}</p>
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer font-semibold text-[#2f7d67]">
                    {statement.sources.map((source) => source.citation).join("; ")}
                  </summary>
                  {statement.sources.map((source) => {
                    const link = publicSourceUrl(source.sourceUrl);
                    return (
                      <div key={source.passageId} className="mt-1">
                        <blockquote className="border-l-2 border-[#2f7d67] pl-3 text-[#24463d]">“{source.quote}”</blockquote>
                        {source.kind === "decision" ? (
                          <p className="mt-1 text-[#4d675f]">
                            From a court decision. It has not been checked for later decisions that may have changed it.
                          </p>
                        ) : null}
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-[#2f7d67] underline">
                            {source.kind === "decision" ? "Read the decision" : "Official text"}
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </details>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {answer.notConfirmed.length ? (
        <p className="mt-3 text-xs leading-5 text-[#7a5418]">
          We could not confirm these against the official text yet, so we have not answered them: {answer.notConfirmed.join("; ")}.
        </p>
      ) : null}
      {answer.statements.length ? (
        <a href="/how-answers-are-checked" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#2f7d67] underline">
          How this answer was checked
        </a>
      ) : null}
    </div>
  );
}
