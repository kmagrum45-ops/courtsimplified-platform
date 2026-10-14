"use client";

import { useMemo } from "react";

import GetHelp from "../../_components/GetHelp";
import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";
import { injuryDateWords, municipalNoticeFirst, turnsOnJudge } from "@/src/lib/content-library/municipalNoticeFirst";
import { SOURCE_SAVED_ON } from "@/src/lib/content-library/nextStepPractical";

/**
 * The 10-day notice to a municipality, shown in the intake BEFORE the
 * questions the law raises (round 4 review, 2026-10-14: a Toronto sidewalk
 * fall was asked about snow and ice under a law that does not apply to
 * Toronto, and never told the notice date had passed). Fixed words, built by
 * src/lib/content-library/municipalNoticeFirst.ts from the stage map's
 * deadline and the deadline engine; never model text. Shown only when the
 * person's words show an injury on a municipal sidewalk, road or bridge.
 */

function Rule({ rule }: { rule: RuleCitation }) {
  const saved = SOURCE_SAVED_ON[rule.sourceId];
  return (
    <span className="mt-1 block text-xs">
      <span className="italic">“{rule.quote}”</span>{" "}
      <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
        {sourceName(rule)}
      </a>
      , {rule.pinpoint}
      {saved ? ` · checked ${saved}` : ""}
    </span>
  );
}

export default function MunicipalNoticeFirst({ story, city = "" }: { story: string; city?: string }) {
  const notice = useMemo(() => municipalNoticeFirst(story, { city }), [story, city]);
  if (!notice) return null;
  const passed = notice.counted?.passed ?? false;
  return (
    <section
      data-testid="municipal-notice-first"
      role={passed ? "alert" : undefined}
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${passed ? "border-[#e2a3a3] bg-[#fff5f5] text-[#5c1414]" : "border-[#f0c88a] bg-[#fffaf2] text-[#5a3a0e]"}`}
    >
      <h3 className="text-base font-semibold">{notice.heading}</h3>
      <p className="mt-1">
        {notice.ruleSay}
        <Rule rule={notice.rule} />
      </p>
      {notice.alsoToronto ? (
        <p className="mt-2">
          {notice.alsoToronto.say}
          <Rule rule={notice.alsoToronto.rule} />
        </p>
      ) : null}
      {notice.injury && notice.counted ? (
        <div data-testid="municipal-notice-first-date" className="mt-2">
          <p>
            Counted from the injury date in what you told us: {injuryDateWords(notice.injury)}. You wrote: “{notice.injury.quote}”
          </p>
          <p className={`mt-1 font-semibold ${passed || notice.counted.urgent ? "text-[#8a1c1c]" : ""}`}>
            {notice.counted.statement}
            {notice.counted.passedLine ? ` ${notice.counted.passedLine}` : ""}
          </p>
          {notice.counted.cite ? <Rule rule={notice.counted.cite} /> : null}
          {notice.counted.barWarning ? <p className="mt-1 font-semibold">{notice.counted.barWarning}</p> : null}
        </div>
      ) : (
        <p className="mt-2">Give the date of the injury in your story and the last day will be counted for you.</p>
      )}
      {notice.notABar.length > 0 ? (
        <div className="mt-2">
          <p>The law itself says when missing the notice is not a bar:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {notice.notABar.map((rule) => (
              <li key={rule.pinpoint}>
                <Rule rule={rule} />
                {/* Only under the rule that turns on what a judge finds (s. 42 (8), s. 44 (12)); the death rule applies by itself. */}
                {turnsOnJudge(rule) ? <span className="mt-1 block">{notice.judgeDecides}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <GetHelp heading="Get help now about the notice date" why={notice.helpWhy} compact={!passed} />
    </section>
  );
}
