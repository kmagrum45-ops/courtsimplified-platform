"use client";

import { useState } from "react";

import { officialUrl, sourceName } from "@/src/lib/case-system/stage-map/citations";
import { SOURCE_SAVED_ON } from "@/src/lib/content-library/nextStepPractical";

import { routeShown, type MotionToChangeLead, type ReadingChoice } from "./motionToChange";

/**
 * "How do I change my order?" answered in one plain line, with the subrules it
 * restates quoted underneath (motionToChange.ts, walkthrough MC 2026-10-14).
 *
 * Which route applies is READ from the person's words, so it is put to them
 * first (CLAUDE.md s. 4; re-review 2026-10-14): "From what you told us, it
 * sounds like ... Is that right?" with Yes, the other route, and Not sure.
 * No route is shown until they answer, so a misreading costs one click, not a
 * wrong instruction. Information about the route, never a prediction.
 */
export default function MotionToChangeRoute({ lead }: { lead: MotionToChangeLead }) {
  const [choice, setChoice] = useState<ReadingChoice>(null);
  const shown = routeShown(lead, choice);

  if (choice === null) {
    return (
      <section data-testid="motion-to-change-reading" className="rounded-3xl border-2 border-[#2f7d67] bg-white p-5 shadow-sm">
        <p className="text-sm leading-6 text-[#16302b]">
          From what you told us, it sounds like <strong className="text-[#10231f]">{lead.reading}</strong>. Is that right?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="motion-to-change-yes"
            onClick={() => setChoice("yes")}
            className="rounded-xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
          >
            Yes
          </button>
          {lead.alternate ? (
            <button
              type="button"
              data-testid="motion-to-change-other"
              onClick={() => setChoice("other")}
              className="rounded-xl border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              {lead.alternateLabel}
            </button>
          ) : null}
          <button
            type="button"
            data-testid="motion-to-change-not-sure"
            onClick={() => setChoice("not-sure")}
            className="rounded-xl border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
          >
            Not sure
          </button>
        </div>
      </section>
    );
  }

  if (!shown) {
    return (
      <section data-testid="motion-to-change-reading" className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
        <p className="text-sm leading-6 text-[#16302b]">That is fine. The question below asks where your case is, and the next step follows from your answer.</p>
        <button type="button" onClick={() => setChoice(null)} className="mt-2 text-sm font-semibold text-[#2f7d67] underline">
          Change this
        </button>
      </section>
    );
  }

  return (
    <section data-testid="motion-to-change-route" data-kind={shown.kind} className="rounded-3xl border-2 border-[#2f7d67] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#10231f]">{shown.heading}</h2>
      <p className="mt-2 text-base font-semibold leading-7 text-[#16302b]">{shown.line}</p>
      <ul className="mt-3 space-y-3 text-sm leading-6 text-[#24463d]">
        {shown.rules.map((rule) => {
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
      <button type="button" onClick={() => setChoice(null)} className="mt-3 text-sm font-semibold text-[#2f7d67] underline">
        Change this
      </button>
    </section>
  );
}
