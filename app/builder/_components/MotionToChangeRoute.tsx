"use client";

import { officialUrl, sourceName } from "@/src/lib/case-system/stage-map/citations";
import { SOURCE_SAVED_ON } from "@/src/lib/content-library/nextStepPractical";

import type { MotionToChangeLead } from "./motionToChange";

/**
 * One plain line answering "how do I change my order?", with the subrules it
 * restates quoted underneath (motionToChange.ts, walkthrough MC 2026-10-14).
 * Information about the route, not a prediction.
 */
export default function MotionToChangeRoute({ lead }: { lead: MotionToChangeLead }) {
  return (
    <section data-testid="motion-to-change-route" className="rounded-3xl border-2 border-[#2f7d67] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#10231f]">Changing the order you already have</h2>
      <p className="mt-2 text-base font-semibold leading-7 text-[#16302b]">{lead.line}</p>
      <ul className="mt-3 space-y-3 text-sm leading-6 text-[#24463d]">
        {lead.rules.map((rule) => {
          const saved = SOURCE_SAVED_ON[rule.sourceId];
          return (
            <li key={rule.pinpoint}>
              <span className="block">&ldquo;{rule.quote}&rdquo;</span>
              <span className="block text-xs text-[#4d675f]">
                <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
                  {sourceName(rule)}
                </a>
                , {rule.pinpoint}
                {saved ? ` · checked ${saved}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
