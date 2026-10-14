"use client";

import { useEffect, useMemo, useState } from "react";

import GetHelp from "../../_components/GetHelp";
import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";
import { injuryDateWords, municipalNoticeFirst, turnsOnJudge, type GivenElsewhere, type MunicipalNoticeFirst as Notice } from "@/src/lib/content-library/municipalNoticeFirst";
import { SOURCE_SAVED_ON } from "@/src/lib/content-library/nextStepPractical";

/**
 * The 10-day notice to a municipality, shown in the intake BEFORE the
 * questions the law raises (round 4 review, 2026-10-14: a Toronto sidewalk
 * fall was asked about snow and ice under a law that does not apply to
 * Toronto, and never told the notice date had passed). Fixed words, built by
 * src/lib/content-library/municipalNoticeFirst.ts from the stage map's
 * deadline and the deadline engine; never model text. Shown only when the
 * person's words show an injury on a municipal sidewalk, road or bridge.
 *
 * ASKED FIRST (CLAUDE.md s. 4; round 4 review, 2026-10-14). Whether the fall
 * was on a way the municipality keeps is read from the person's words, and a
 * reading can be wrong. So the box first asks, with the reason in one line
 * and, under it, the counted date said conditionally ("If it was, the last
 * day ... has passed", walkthrough run 38593464953, SW: the counted warning
 * waited behind the question). The full box -- the bar warning and the
 * exceptions -- shows only after "Yes" or "Not sure" (a missed notice can bar
 * the claim, so an unsure person sees it too). "No" folds it to one line with
 * Change. A misreading costs one click, never a wrong legal warning.
 */

export type NoticeAnswer = "yes" | "no" | "not-sure" | null;

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

/** The storage key for one story's answer (a short hash, never the story itself). */
export function noticeAnswerKey(story: string): string {
  let hash = 0;
  for (const ch of story.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `cs-municipal-notice:${(hash >>> 0).toString(36)}`;
}

/** Whether the full notice shows for this answer. Exported for test:municipal-notice-first. */
export function showsFullNotice(answer: NoticeAnswer): boolean {
  return answer === "yes" || answer === "not-sure";
}

/**
 * The counted day while the question waits, said conditionally (walkthrough
 * run 38593464953, SW: the counted urgent warning waited behind the question).
 * The full box's own counted statement and passed line, after "If it was,":
 * nothing is applied, and the bar and the exceptions still wait for Yes or
 * Not sure (CLAUDE.md s. 4). Null with no counted day. Exported for
 * test:municipal-notice-first.
 */
export function conditionalCountedLine(notice: Pick<Notice, "counted" | "injury">): string | null {
  if (!notice.counted || !notice.injury) return null;
  // Lower-case only a plain opening word ("The last day ..."), never a day or a name.
  const statement = /^(?:The|This|That|It|Act|Your|Based)\b/.test(notice.counted.statement) ? notice.counted.statement.replace(/^./, (c) => c.toLowerCase()) : notice.counted.statement;
  return `If it was, ${statement}${notice.counted.passedLine ? ` ${notice.counted.passedLine}` : ""} Counted from ${injuryDateWords(notice.injury)}.`;
}

export default function MunicipalNoticeFirst({ story, city = "", elsewhere = [] }: { story: string; city?: string; elsewhere?: GivenElsewhere[] }) {
  // Where else the person gave dates (the timeline, guided answers), so a year
  // given there is used rather than called missing (walkthrough run 38593464953, SW).
  const elsewhereKey = JSON.stringify(elsewhere);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notice = useMemo(() => municipalNoticeFirst(story, { city, elsewhere }), [story, city, elsewhereKey]);
  const key = noticeAnswerKey(story);
  const [answer, setAnswerState] = useState<NoticeAnswer>(null);
  // Going back to the story must not ask again (walkthrough noRepeat): the
  // answer is kept in this browser for this story, best effort only.
  useEffect(() => {
    try {
      const kept = window.sessionStorage.getItem(key);
      // A new or edited story starts unanswered unless this story was answered.
      setAnswerState(kept === "yes" || kept === "no" || kept === "not-sure" ? kept : null);
    } catch {
      /* storage unavailable: ask */
    }
  }, [key]);
  const setAnswer = (next: NoticeAnswer) => {
    setAnswerState(next);
    try {
      if (next) window.sessionStorage.setItem(key, next);
      else window.sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  };
  if (!notice) return null;
  const passed = notice.counted?.passed ?? false;
  const who = notice.place === "toronto" ? "the City of Toronto" : "a municipality (a city, town, township or region)";
  if (!showsFullNotice(answer)) {
    if (answer === "no") {
      return (
        <section data-testid="municipal-notice-first" data-answer="no" className="rounded-xl border border-[#d9d2c3] px-4 py-2 text-sm text-[#4a463d]">
          You said it did not happen on a public sidewalk, road or bridge, so the 10-day notice to a municipality is not shown.{" "}
          <button type="button" className="underline" onClick={() => setAnswer(null)}>
            Change
          </button>
        </section>
      );
    }
    return (
      <section
        data-testid="municipal-notice-first"
        data-answer="unanswered"
        className="rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#5a3a0e]"
      >
        <h3 className="text-base font-semibold">
          From what you told us, it sounds like you were hurt on a public sidewalk, road or bridge that {who} looks after. Is that right?
        </h3>
        <p className="mt-1">
          Why we ask: if it was, the law says a lawsuit about the condition of the sidewalk, road or bridge cannot go ahead unless written notice is served on,
          or sent by registered mail to, the municipality's clerk within 10 days of the injury, with some exceptions. So this comes before anything else.
          <Rule rule={notice.rule} />
        </p>
        {conditionalCountedLine(notice) ? (
          <p data-testid="municipal-notice-conditional-date" className="mt-1 font-semibold">
            {conditionalCountedLine(notice)}
            {notice.counted?.cite ? <Rule rule={notice.counted.cite} /> : null}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" data-testid="municipal-notice-yes" className="rounded-lg border px-3 py-1 font-semibold" onClick={() => setAnswer("yes")}>
            Yes
          </button>
          <button type="button" data-testid="municipal-notice-no" className="rounded-lg border px-3 py-1" onClick={() => setAnswer("no")}>
            No, it happened somewhere else
          </button>
          <button type="button" data-testid="municipal-notice-not-sure" className="rounded-lg border px-3 py-1" onClick={() => setAnswer("not-sure")}>
            Not sure
          </button>
        </div>
      </section>
    );
  }
  return (
    <section
      data-testid="municipal-notice-first"
      data-answer={answer ?? "unanswered"}
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
      <p className="mt-2 text-xs">
        {answer === "not-sure" ? "Shown because you were not sure where it happened. " : "You said it happened on a public sidewalk, road or bridge. "}
        <button type="button" className="underline" onClick={() => setAnswer(null)}>
          Change
        </button>
      </p>
    </section>
  );
}
