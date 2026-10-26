import { SOURCE_SAVED_ON, rulesForWords } from "@/src/lib/content-library/nextStepPractical";
import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";
import { nextStepsFor, type NextStepView } from "@/src/lib/case-system/stage-map/stageSequence";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";

/**
 * "What can happen next" on the step card: the steps this one can lead to,
 * who or what moves the case there, and the rule for each move, from the step
 * chain (src/lib/case-system/stage-map/stageSequence.ts, test:stage-sequence).
 * It says what the rules provide, never what will happen in this case
 * (CLAUDE.md s. 3). Folded, so the card still leads with the step itself.
 *
 * Where a step can lead to many places, the usual next steps come first and
 * the rest fold under "Other things that can come up" (USUAL_NEXT).
 */

/** "r. 17 (5)", "r. 17 (5) and r. 17 (10)", "r. 1, r. 2 and r. 3". */
export function joinPinpoints(all: string[]): string {
  // Each pinpoint once (#470 re-test: a repeated citation in one line).
  const pinpoints = [...new Set(all)];
  return pinpoints.length <= 1 ? (pinpoints[0] ?? "") : `${pinpoints.slice(0, -1).join(", ")} and ${pinpoints[pinpoints.length - 1]}`;
}

/** The rules of one move, one line per source, so two subrules of the same rules do not stack up. */
export function groupBySource(rules: RuleCitation[]): RuleCitation[][] {
  const groups = new Map<string, RuleCitation[]>();
  for (const rule of rules) groups.set(rule.sourceId, [...(groups.get(rule.sourceId) ?? []), rule]);
  return [...groups.values()].map((group) => [...group].sort((a, b) => a.pinpoint.localeCompare(b.pinpoint, "en", { numeric: true })));
}

/** The mover label, left out when the sentence already starts with it ("You: You serve ..."). */
export function moverLabel(move: Pick<NextStepView, "by" | "when">): string | null {
  return move.when.toLowerCase().startsWith(`${move.by.toLowerCase()} `) ? null : move.by;
}

/** The rules by name and link, their words folded under; `linkOnly`: name and link only (stageMap.ts rulesLinkOnly). */
function Rules({ cites, linkOnly = false }: { cites: RuleCitation[]; linkOnly?: boolean }) {
  const first = cites[0];
  const saved = SOURCE_SAVED_ON[first.sourceId];
  if (linkOnly) {
    return (
      <p className="mt-1 text-xs leading-5 text-[#4d675f]">
        <a href={officialUrl(first)} target="_blank" rel="noreferrer" className="underline">
          {sourceName(first)}
        </a>
        , {joinPinpoints(cites.map((cite) => cite.pinpoint))}
        {saved ? ` · checked ${saved}` : ""}
      </p>
    );
  }
  return (
    <details className="mt-1 text-xs leading-5 text-[#4d675f]">
      <summary className="cursor-pointer">
        <a href={officialUrl(first)} target="_blank" rel="noreferrer" className="underline">
          {sourceName(first)}
        </a>
        , {joinPinpoints(cites.map((cite) => cite.pinpoint))}
        {saved ? ` · checked ${saved}` : ""}
      </summary>
      {cites.map((cite) => (
        <p key={cite.pinpoint} className="mt-1 italic">
          {cites.length > 1 ? `${cite.pinpoint}: ` : ""}“{cite.quote}”
        </p>
      ))}
    </details>
  );
}

function Move({ move }: { move: NextStepView }) {
  const label = moverLabel(move);
  return (
    <li data-testid="what-comes-next-move">
      <span className="font-semibold">{move.title}.</span> {label ? <span className="text-[#4d675f]">{label}:</span> : null} {move.when}
      {groupBySource(move.rules).map((cites) => (
        <Rules key={cites[0].sourceId} cites={cites} />
      ))}
    </li>
  );
}

/**
 * The moves narrowed to the notices the person's words fit (walkthrough run
 * 38500825561, SW: a Toronto card quoted the Crown's notice and its
 * misfeasance leave under "What can happen next"). A move keeps only the
 * notice rules that fit; a move whose rules are all notices that do not fit
 * goes under "Other things that can come up", with its rules unchanged.
 * Nothing is removed. Exported for test:next-step.
 */
export function movesForWords(stepId: string, responding = false, words = "", city = "") {
  const { moves, final } = nextStepsFor(stepId, responding);
  const shown = moves.map((move) => {
    const rules = rulesForWords(move.rules, words, city);
    return rules.length > 0 ? { move: { ...move, rules }, fits: true } : { move, fits: false };
  });
  const fitting = shown.filter((item) => item.fits).map((item) => item.move);
  const offTopic = shown.filter((item) => !item.fits).map((item) => item.move);
  const usual = fitting.filter((move) => move.usual);
  const lead = usual.length > 0 ? usual : fitting;
  const others = [...(usual.length > 0 ? fitting.filter((move) => !move.usual) : []), ...offTopic];
  return { lead, others, final };
}

export default function WhatComesNext({
  stepId,
  responding = false,
  story = "",
  city = "",
}: {
  stepId: string;
  responding?: boolean;
  /** The person's words, used only to narrow notice rules to the ones that fit. */
  story?: string;
  city?: string;
}) {
  const { lead, others, final } = movesForWords(stepId, responding, story, city);
  if (lead.length === 0 && others.length === 0 && !final) return null;
  return (
    <details data-testid="what-comes-next" className="mt-3 text-sm leading-6 text-[#16302b]">
      <summary className="cursor-pointer font-semibold text-[#2f7d67]">What can happen next</summary>
      <p className="mt-2 text-xs leading-5 text-[#4d675f]">
        What the rules provide can follow this step. It is not a prediction of what will happen in your case.
      </p>
      {final ? (
        <div data-testid="what-comes-next-final" className="mt-2">
          <p>{final.why}</p>
          {groupBySource(final.rules).map((cites) => (
            <Rules key={cites[0].sourceId} cites={cites} linkOnly={Boolean(findStage(stepId)?.rulesLinkOnly)} />
          ))}
        </div>
      ) : null}
      <ul className="mt-2 space-y-3">
        {lead.map((move) => (
          <Move key={move.to} move={move} />
        ))}
      </ul>
      {others.length > 0 ? (
        <details data-testid="what-comes-next-other" className="mt-3">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">Other things that can come up ({others.length})</summary>
          <ul className="mt-2 space-y-3">
            {others.map((move) => (
              <Move key={move.to} move={move} />
            ))}
          </ul>
        </details>
      ) : null}
    </details>
  );
}
