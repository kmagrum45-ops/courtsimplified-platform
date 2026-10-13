import { SOURCE_SAVED_ON } from "@/src/lib/content-library/nextStepPractical";
import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";
import { nextStepsFor } from "@/src/lib/case-system/stage-map/stageSequence";

/**
 * "What can happen next" on the step card: the steps this one can lead to,
 * who or what moves the case there, and the rule for each move, from the step
 * chain (src/lib/case-system/stage-map/stageSequence.ts, test:stage-sequence).
 * It says what the rules provide, never what will happen in this case
 * (CLAUDE.md s. 3). Folded, so the card still leads with the step itself.
 */

function Rule({ cite }: { cite: RuleCitation }) {
  const saved = SOURCE_SAVED_ON[cite.sourceId];
  return (
    <details className="mt-1 text-xs leading-5 text-[#4d675f]">
      <summary className="cursor-pointer">
        <a href={officialUrl(cite)} target="_blank" rel="noreferrer" className="underline">
          {sourceName(cite)}
        </a>
        , {cite.pinpoint}
        {saved ? ` · checked ${saved}` : ""}
      </summary>
      <p className="mt-1 italic">“{cite.quote}”</p>
    </details>
  );
}

export default function WhatComesNext({ stepId, responding = false }: { stepId: string; responding?: boolean }) {
  const { moves, final } = nextStepsFor(stepId, responding);
  if (moves.length === 0 && !final) return null;
  return (
    <details data-testid="what-comes-next" className="mt-3 text-sm leading-6 text-[#16302b]">
      <summary className="cursor-pointer font-semibold text-[#2f7d67]">
        What can happen next{moves.length ? ` (${moves.length})` : ""}
      </summary>
      <p className="mt-2 text-xs leading-5 text-[#4d675f]">
        What the rules provide can follow this step. It is not a prediction of what will happen in your case.
      </p>
      {final ? (
        <div data-testid="what-comes-next-final" className="mt-2">
          <p>{final.why}</p>
          {final.rules.map((cite) => (
            <Rule key={`${cite.sourceId}-${cite.pinpoint}`} cite={cite} />
          ))}
        </div>
      ) : null}
      <ul className="mt-2 space-y-3">
        {moves.map((m) => (
          <li key={m.to} data-testid="what-comes-next-move">
            <span className="font-semibold">{m.title}.</span> <span className="text-[#4d675f]">{m.by}:</span> {m.when}
            {m.rules.map((cite) => (
              <Rule key={`${cite.sourceId}-${cite.pinpoint}`} cite={cite} />
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}
