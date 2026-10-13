"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { isServiceDateQuestion } from "@/src/lib/case-system/casePosition";
import {
  effectiveServiceDate,
  serviceRulesFor,
  type ServiceCourt,
  type ServiceMethod,
} from "@/src/lib/case-system/deadlines/serviceEffectiveDate";

import { stagesForPathway, type StagePathway } from "@/src/lib/case-system/stage-map/stageMap";
import type { DateQuestion, StoryHint, SuggestedDate } from "@/src/lib/case-system/casePosition";
import FormsNamedHere from "../../_components/FormsNamedHere";
import NextStepPractical from "../../_components/NextStepPractical";
import GetHelp from "../../_components/GetHelp";
import { limitNotesFor, practicalFor, type PracticalCourt } from "@/src/lib/content-library/nextStepPractical";
import { datesFromPicture, stepFromPicture, type CasePicture } from "@/src/lib/case-system/intake/caseReader";
import { amountNoteFor } from "@/src/lib/case-system/amountNotes";
import { officialUrl, sourceName } from "@/src/lib/case-system/stage-map/citations";

/**
 * "Where exactly is your case?" — the reviewed answer for the position the
 * user picks.
 *
 * *** WHY THE USER PICKS ***
 *
 * The 35 Small Claims stage answers are reviewed text tied to one precise
 * position. Choosing that position for someone is a decision about their case,
 * so this panel asks them to choose it from the stage list, in their own
 * words (each stage's `userQuestion`), and shows nothing until they have
 * (CLAUDE.md §4). No model is involved; /api/case/stage-answer renders the
 * published block through the same gates as every other door.
 *
 * Added 2026-10-01, when it was found that no page showed these answers.
 */

type RenderedAnswer = {
  stageId: string;
  question: string;
  sections: { heading: string; text: string }[];
  sources: { name: string; pinpoint: string; url: string }[];
  status: string;
  release: { runId: string; promotedAt: string };
};

type NextStepSummary = {
  title: string;
  deadlines: { what: string; date: string; statement: string }[];
  periods: { what: string; count: number; unit: string; countFrom: string }[];
};

type Response =
  | { outcome: "rendered"; answer: RenderedAnswer; dateQuestions?: DateQuestion[]; nextStep?: NextStepSummary | null }
  | { outcome: "needs-a-fact"; question: string; answer: RenderedAnswer | null }
  | { outcome: "unavailable"; message: string };

const GROUPS: Record<StagePathway, { side: string; label: string }[]> = {
  "small-claims": [
    { side: "before-filing", label: "Before a case is started" },
    { side: "plaintiff", label: "I am bringing the claim (plaintiff)" },
    { side: "defendant", label: "I am responding to a claim (defendant)" },
    { side: "both", label: "Either side — something went wrong" },
  ],
  civil: [
    { side: "plaintiff", label: "I am suing (plaintiff)" },
    { side: "defendant", label: "I am being sued (defendant)" },
    { side: "both", label: "Either side" },
  ],
  family: [
    { side: "applicant", label: "I started the case (applicant)" },
    { side: "respondent", label: "The case was started against me (respondent)" },
    { side: "both", label: "Either side" },
  ],
};

/*
 * Before-filing stages are Small Claims ids with side "plaintiff"; they are
 * grouped by their id prefix so a reader who has filed nothing finds them.
 */
function groupOf(stage: { id: string; side: string }): string {
  return stage.id.startsWith("before-filing:") ? "before-filing" : stage.side;
}

// Moved to the library so server routes can use the same suggestion
// (Phase 1: the Deadlines view counted nothing until a step was picked).
export { suggestedStageFor } from "@/src/lib/case-system/stage-map/suggestedStep";
import { suggestedStageFor } from "@/src/lib/case-system/stage-map/suggestedStep";

export function orderGroupsForReader<T extends { side: string; label: string }>(
  groups: readonly T[],
  responding: boolean,
): T[] {
  const own = responding ? ["defendant", "respondent"] : ["before-filing", "plaintiff", "applicant"];
  return [
    ...groups.filter((group) => own.includes(group.side)),
    ...groups.filter((group) => group.side === "both"),
    ...groups
      .filter((group) => !own.includes(group.side) && group.side !== "both")
      .map((group) => ({ ...group, label: `Other situations — ${group.label}` })),
  ];
}

/**
 * The two years a month and day with no year can mean: the one nearest today
 * on the right side (an upcoming conference is this year's or next; a service
 * date is this year's or last), and the one beyond it. The person picks.
 * Exported for test:case-position.
 */
export function yearChoices(isoDate: string, today: string = todayIso()): string[] {
  const year = Number(isoDate.slice(0, 4));
  const rest = isoDate.slice(4);
  const other = isoDate >= today ? year + 1 : year - 1;
  return [`${year}${rest}`, `${other}${rest}`].filter((date) => !Number.isNaN(Date.parse(date)));
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * "Your next step", first (master plan Phase 2). The step, its deadline
 * counted from the person's dates (or the period and what it runs from), what
 * to do, and the forms -- the answer a lawyer gives first -- with the full
 * reviewed answer and every rule folded underneath. Every sentence here is
 * from the stage map, the reviewed deadline templates or the published answer;
 * the card only chooses what goes first.
 */
function NextStepCard({
  summary,
  answer,
  court,
  userWords,
  askedForDates,
  stepId,
  city,
  fromStory = [],
  responding = false,
}: {
  summary: NextStepSummary;
  answer: RenderedAnswer;
  court: string;
  userWords: string;
  askedForDates: boolean;
  stepId: string;
  /** The person's city, which decides the filing portal (Toronto region or not). */
  city: string;
  /** Dates used for this count that came from the person's own words and are not yet saved. */
  fromStory?: { label: string; date: string }[];
  /** The person's side, so an "either side" step leads with their own limit ("If you are responding ..."). */
  responding?: boolean;
}) {
  const practical = practicalFor(stepId, court as PracticalCourt, city, responding);
  const today = todayIso();
  const toDo = answer.sections.find((section) => section.heading === "What to do next")?.text ?? "";
  const firstParagraph = forThisPerson(toDo.split(/\n\s*\n/)[0]?.trim() ?? "", {
    userWords,
    filingShown: Boolean(practical?.filing.length),
  });
  const unit = (count: number, word: string) => `${count} ${count === 1 ? word.replace(/s$/, "") : word}`;
  const isConditional = (what: string) => /^(if|where|when|unless)\b/i.test(what.trim());
  const split = <T extends { what: string }>(items: T[]) => [items.filter((item) => !isConditional(item.what)), items.filter((item) => isConditional(item.what))];
  const [mainDeadlines, laterDeadlines] = split(summary.deadlines);
  const [mainPeriods, laterPeriods] = split(summary.periods);
  // With nothing unconditional, the limits for the person's own side lead
  // ("If you are responding ..." for a respondent; held-back walkthrough,
  // 2026-10-09: a defendant's card led with "If you are bringing the motion").
  const ownSide = (what: string) => (responding ? /\bresponding\b|\bthe other party\b/i : /\bbringing\b|\bmoving party\b/i).test(what);
  const otherSide = (what: string) => (responding ? /\bbringing\b|\bmoving party\b/i : /\bresponding\b/i).test(what);
  const leadDeadlines = laterDeadlines.filter((item) => ownSide(item.what));
  const leadPeriods = laterPeriods.filter((item) => ownSide(item.what));
  const neutral = <T extends { what: string }>(items: T[]) => items.filter((item) => !otherSide(item.what));
  const main =
    mainDeadlines.length + mainPeriods.length > 0
      ? { deadlines: mainDeadlines, periods: mainPeriods }
      : leadDeadlines.length + leadPeriods.length > 0
        ? { deadlines: leadDeadlines, periods: leadPeriods }
        : {
            deadlines: neutral(laterDeadlines).slice(0, 1),
            periods: neutral(laterDeadlines).length ? [] : neutral(laterPeriods).slice(0, 1),
          };
  const conditional = {
    deadlines: laterDeadlines.filter((item) => !main.deadlines.includes(item)),
    periods: laterPeriods.filter((item) => !main.periods.includes(item)),
  };
  const deadlineItem = (deadline: NextStepSummary["deadlines"][number]) => (
    <li key={`${deadline.what}-${deadline.date}`} data-testid="next-step-deadline">
      <span className="font-semibold">{deadline.what}.</span> {deadline.statement}
      {deadline.date < today ? <span className="font-semibold text-[#8a1c1c]"> That date has already passed.</span> : null}
    </li>
  );
  const periodItem = (period: NextStepSummary["periods"][number]) => (
    <li key={period.what} data-testid="next-step-period">
      <span className="font-semibold">{period.what}.</span> {unit(period.count, period.unit)} after {period.countFrom}.
      {askedForDates ? " Give the date below and we will count the last day for you." : ""}
    </li>
  );
  return (
    <div data-testid="next-step-card" className="mt-4 rounded-2xl border-2 border-[#2f7d67] bg-[#f2fbf7] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">Your next step</p>
      <p className="mt-1 text-sm text-[#4d675f]">Where you are: {summary.title}</p>
      {fromStory.length > 0 ? (
        <p data-testid="next-step-from-story" className="mt-2 text-sm leading-6 text-[#16302b]">
          Counted from what you told us: {fromStory.map((entry) => `${entry.label} ${entry.date}`).join("; ")}. Check the date
          below and save it to your case.
        </p>
      ) : null}
      {main.deadlines.length > 0 || main.periods.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#16302b]">
          {main.deadlines.map(deadlineItem)}
          {main.periods.map(periodItem)}
        </ul>
      ) : null}
      {conditional.deadlines.length > 0 || conditional.periods.length > 0 ? (
        // "If your action is under the simplified procedure ..." -- time limits
        // that apply only in some cases. Folded, so the card leads with the one
        // that applies now (held-back walkthrough, 2026-10-09: seven conditional
        // limits each said "Give the date below").
        <details data-testid="next-step-conditional" className="mt-3 text-sm leading-6 text-[#16302b]">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">
            Other time limits that may apply later ({conditional.deadlines.length + conditional.periods.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {conditional.deadlines.map(deadlineItem)}
            {conditional.periods.map(periodItem)}
          </ul>
        </details>
      ) : null}
      {firstParagraph ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#2b4640]">{firstParagraph}</p> : null}
      {/* The form, fee, filing and service for this step (Phase 2); the forms
          the answer's text names are the fallback for a step with none recorded. */}
      {practical ? <NextStepPractical stepId={stepId} court={court} city={city} responding={responding} /> : null}
      {!practical?.forms.length && toDo ? <FormsNamedHere texts={[toDo]} court={court} userWords={userWords} heading="Forms for this step" /> : null}
      {answer.sources.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-[#4d675f]">
          {answer.sources.slice(0, 4).map((source, index) => (
            <span key={`${source.name}-${source.pinpoint}`}>
              {index > 0 ? "; " : "Sources: "}
              <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                {source.name}
              </a>
              {source.pinpoint ? `, ${source.pinpoint}` : ""}
            </span>
          ))}
          {answer.sources.length > 4 ? " — all sources are in the full answer below." : ""}
        </p>
      ) : null}
      {limitNotesFor(court as PracticalCourt, userWords).map((line) => (
        <p key={line.cite.pinpoint} data-testid="next-step-limit" className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-3 py-2 text-sm leading-6 text-[#7a4b12]">
          {line.say}{" "}
          <a href={officialUrl(line.cite)} target="_blank" rel="noreferrer" className="underline">
            {sourceName(line.cite)}, {line.cite.pinpoint}
          </a>
        </p>
      ))}
      <GetHelp compact heading="Want a person to check this step with you?" />
    </div>
  );
}

/**
 * The "What to do next" paragraph the card above already shows (build order
 * Step 2B, 2026-10-12): the full answer printed it again word for word under
 * the card, and the walkthrough flagged that on 7 of 10 cases.
 */
export function cardLeadOf(answer: RenderedAnswer): string {
  const toDo = answer.sections.find((section) => section.heading === "What to do next")?.text ?? "";
  return toDo.split(/\n\s*\n/)[0]?.trim() ?? "";
}

/** A section's text without the paragraph the card already shows. */
export function withoutCardLead(heading: string, text: string, cardLead: string): string {
  if (!cardLead || heading !== "What to do next") return text;
  const paragraphs = text.split(/\n\s*\n/);
  if ((paragraphs[0] ?? "").trim() !== cardLead) return text;
  return paragraphs.slice(1).join("\n\n").trim();
}

function AnswerView({
  answer,
  court,
  userWords = "",
  underCard = false,
}: {
  answer: RenderedAnswer;
  court: string;
  userWords?: string;
  /** Shown under the next-step card, which already shows the first step. */
  underCard?: boolean;
}) {
  const cardLead = underCard ? cardLeadOf(answer) : "";
  return (
    <div className="mt-4 space-y-4" data-testid="stage-answer">
      <h4 className="text-base font-bold text-[#10231f]">{answer.question}</h4>
      {answer.status === "rules-only" ? (
        <p data-testid="stage-rules-only" className="text-xs leading-5 text-[#4d675f]">
          We have not written a step-by-step answer for this step yet. These are its deadlines and
          the rules that apply to it, in the official words.
        </p>
      ) : null}
      {answer.sections.map((section) => {
        const text = withoutCardLead(section.heading, section.text, cardLead);
        return (
          <div key={section.heading}>
            <p className="text-sm font-semibold text-[#16302b]">{section.heading}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#2b4640]">
              {text || "The first step is in \"Your next step\" above."}
            </p>
          </div>
        );
      })}
      <FormsNamedHere texts={answer.sections.map((section) => section.text)} court={court} userWords={userWords} />
      {answer.sources.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#16302b]">Sources</p>
          <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-[#2b4640]">
            {answer.sources.map((source) => (
              <li key={`${source.name}-${source.pinpoint}`}>
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                  {source.name}
                </a>
                {source.pinpoint ? `, ${source.pinpoint}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs leading-5 text-[#4d675f]">
        {answer.status === "rules-only" ? "Quoted from" : "Written from"} the official sources above. CourtSimplified guides you through the process
        but is not your lawyer, so check the source before you rely on it.
      </p>
    </div>
  );
}

/** Saves the user's own choice to the case. Never called for a suggestion they have not acted on. */
async function savePosition(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    // Imported on use: verifyRespondingSide imports this module's pure helpers,
    // and the Supabase client must not be constructed just to read them.
    const { supabase } = await import("@/src/lib/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    const response = await fetch("/api/cases/position", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ caseId, ...patch }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The card's opening paragraph, without what does not concern this person
 * (held-back walkthrough, 2026-10-09): the portal sentence when the card's
 * own filing lines already name their portal ("Toronto uses ..." shown to a
 * Hamilton plaintiff), and the mortgage-action form for someone whose case is
 * not about a mortgage. Whole sentences or that one aside are dropped, never
 * reworded; the full answer below keeps every word.
 */
export function forThisPerson(paragraph: string, { userWords, filingShown }: { userWords: string; filingShown: boolean }): string {
  let text = paragraph;
  if (!/\bmortgage/i.test(userWords)) {
    text = text.replace(/,? or Form 14B for a mortgage action/g, "").replace(/ \(Form 14A, or Form 14B for a mortgage action\)/g, " (Form 14A)");
  }
  if (filingShown) {
    text = text
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !/\bportal\b/i.test(sentence))
      .join(" ");
  }
  return text.trim();
}

/**
 * "If you were served with a defendant's claim, what date was it served?" as
 * the label of an answer already known: "Served with a defendant's claim".
 */
export function shortLabel(question: string): string {
  const head = question.split("?")[0].split(/,\s*what date|,\s*what is/i)[0].replace(/^If\s+/i, "");
  const served = /^you were (served with .+)$/i.exec(head);
  const text = served ? served[1] : head.replace(/^(?:a|an|the)\s+/i, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatIso(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function StageAnswerPanel({
  courtPath,
  confirmedStage = null,
  responding = false,
  caseId = null,
  initialStepId = null,
  initialDateAnswers = {},
  initialService = {},
  suggestedDates = {},
  storyHints = {},
  noticeStepId = null,
  userWords = "",
  recordedAmount = "",
  city = "",
  storyText = "",
  picture = null,
  onSaved,
}: {
  courtPath: StagePathway;
  confirmedStage?: string | null;
  responding?: boolean;
  /**
   * With a case, the step the user picks and the dates they enter are saved
   * to it (master_result.position), so the case page and a return visit show
   * the same step. Without one, nothing is saved.
   */
  caseId?: string | null;
  /** The step this user picked before, from the case. Wins over the suggestion. */
  initialStepId?: string | null;
  initialDateAnswers?: Record<string, string>;
  /** How service dates were served, as saved (position.service; Step 2D). */
  initialService?: Record<string, { method: ServiceMethod; enteredOn: string }>;
  /** Exact dates the user recorded elsewhere, offered — never applied — as answers. */
  suggestedDates?: Record<string, SuggestedDate>;
  /** Sentences from the user's story about each moment, quoted beside its question. */
  storyHints?: Record<string, StoryHint>;
  /**
   * A written-notice step the person's claim and story point to
   * (claim-types/noticeStep.ts). Suggested first when nothing is filed yet,
   * because its deadline runs from the incident and comes before filing.
   */
  noticeStepId?: string | null;
  /** The user's own words, so a family step lists only the forms for their kind of case. */
  userWords?: string;
  /** The amount the user recorded, set against the court's limits at the starting step (amountNotes.ts). */
  recordedAmount?: string;
  /** The person's city, so the card names the filing portal for their region. */
  city?: string;
  /** The person's own story (not the analysis), read for a procedural event they name, such as "noted in default". */
  storyText?: string;
  /**
   * The case reader's checked reading of everything they wrote
   * (intake/caseReader.ts), when CASE_READER is on. Its step and dates come
   * first; without it, the phrase lists below are the fallback.
   */
  picture?: CasePicture | null;
  /** Told what the person chose (dates and step), so a page that remounts this panel can show it again; called before the save to the case. */
  onSaved?: (saved: { stepId?: string | null; dateAnswers?: Record<string, string> }) => void;
}) {
  const options = stagesForPathway(courtPath).map((stage) => ({
    id: stage.id,
    group: groupOf(stage),
    label: stage.userQuestion,
  }));
  const noticeFirst =
    courtPath !== "family" &&
    !responding &&
    (confirmedStage === "starting-case" || !confirmedStage) &&
    Boolean(noticeStepId) &&
    options.some((option) => option.id === noticeStepId);
  const suggested = noticeFirst
    ? (noticeStepId as string)
    : stepFromPicture(courtPath, picture, responding) || suggestedStageFor(courtPath, confirmedStage, responding, storyText);
  // Dates the case reader found in their words, under what the guided intake recorded.
  const offeredDates = { ...datesFromPicture(picture), ...suggestedDates };
  const savedStep = initialStepId && options.some((option) => option.id === initialStepId) ? initialStepId : "";
  const startingStep = savedStep || suggested;
  const [stageId, setStageId] = useState(startingStep);
  const [choosingStep, setChoosingStep] = useState(false);
  const [result, setResult] = useState<Response | null>(null);
  const [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dateAnswers, setDateAnswers] = useState<Record<string, string>>(initialDateAnswers);
  const [dateDraft, setDateDraft] = useState<Record<string, string>>(initialDateAnswers);
  // How the papers were served, per service date (Step 2D, 2026-10-12): the
  // deadline counts from the day service is effective, not the day typed.
  const [serviceMethod, setServiceMethod] = useState<Record<string, ServiceMethod>>(() =>
    Object.fromEntries(Object.entries(initialService).map(([id, entry]) => [id, entry.method])),
  );
  const [serviceSaved, setServiceSaved] = useState<Record<string, { method: ServiceMethod; enteredOn: string }>>(initialService);
  const serviceCourt: ServiceCourt | null = courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? courtPath : null;
  const [dateStatus, setDateStatus] = useState<"" | "saving" | "saved" | "not-saved">("");
  /*
   * Page review 2026-10-07: a confirmed defendant scrolled 36 to 48 steps,
   * half of them the other side's (and saw "I have a settlement conference
   * date" twice, once per side). Once the side is known, the list shows that
   * side and "either side"; the rest is one tap away, never removed.
   */
  const [showOtherSide, setShowOtherSide] = useState(false);
  /*
   * A full date the person already gave -- in the guided intake, in their
   * story, or found by the case reader in their words -- is USED for the count
   * straight away and shown as theirs, instead of being asked again (held-back
   * walkthrough, 2026-10-09: "on september 25 2026 his lawyer served me" and
   * the page asked "what date was it served?"). Nothing is saved until they
   * confirm it (CLAUDE.md section 4); "No, change it" drops it.
   */
  const [rejected, setRejected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const offeredKey = JSON.stringify(offeredDates);
  const hintsKey = JSON.stringify(storyHints);
  const storyDates = useMemo(() => {
    const out: Record<string, { value: string; basis: string }> = {};
    for (const [id, hint] of Object.entries(storyHints)) {
      if (hint.value && !hint.yearAssumed) out[id] = { value: hint.value, basis: `from your story: “${hint.quote}”` };
    }
    for (const [id, offered] of Object.entries(offeredDates)) {
      if (offered.value && !offered.yearAssumed) out[id] = { value: offered.value, basis: offered.basis };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeredKey, hintsKey]);
  const withStoryDates = (answers: Record<string, string>, dropped: Record<string, boolean> = rejected) => {
    const fromStory: Record<string, string> = {};
    for (const [id, date] of Object.entries(storyDates)) if (!dropped[id]) fromStory[id] = date.value;
    return { ...fromStory, ...answers };
  };
  const amountNote = amountNoteFor({ courtPath, stepId: stageId, recordedAmount });

  // Dates saved to the case after this panel mounted (the guided intake's
  // confirmed dates are saved with the case) are counted when they arrive.
  const initialKey = JSON.stringify(initialDateAnswers);
  useEffect(() => {
    const arriving = Object.entries(initialDateAnswers).filter(([key, value]) => value && !(key in dateAnswers));
    if (!arriving.length) return;
    const next = { ...Object.fromEntries(arriving), ...dateAnswers };
    setDateAnswers(next);
    setDateDraft((current) => ({ ...Object.fromEntries(arriving), ...current }));
    if (stageId) void load(stageId, municipality ? { municipality } : {}, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  // Show the saved (or suggested) step's answer straight away; the user can change it.
  useEffect(() => {
    setStageId(startingStep);
    if (startingStep) void load(startingStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingStep]);

  async function load(
    id: string,
    facts: Record<string, string> = {},
    answers: Record<string, string> = dateAnswers,
    dropped: Record<string, boolean> = rejected,
  ) {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/case/stage-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: id, courtPath, confirmedFacts: facts, dateAnswers: withStoryDates(answers, dropped) }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setResult((await response.json()) as Response);
    } catch {
      setResult(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function countDeadline(draft: Record<string, string>) {
    if (result?.outcome !== "rendered") return;
    const asked = Object.fromEntries(
      (result.dateQuestions ?? []).map((question) => [question.id, draft[question.id] ?? ""]),
    );
    // A service date counts from the day service is effective under the
    // court's rules for how it was served (serviceEffectiveDate.ts).
    const servicePatch: Record<string, { method: ServiceMethod; enteredOn: string } | null> = {};
    for (const question of result.dateQuestions ?? []) {
      const typed = asked[question.id];
      const method = serviceMethod[question.id];
      if (!serviceCourt || !isServiceDateQuestion(question.id, question.question)) continue;
      if (typed && method) {
        asked[question.id] = effectiveServiceDate(serviceCourt, method, typed).date;
        servicePatch[question.id] = { method, enteredOn: typed };
      } else {
        servicePatch[question.id] = null;
      }
    }
    setServiceSaved((current) => {
      const out = { ...current };
      for (const [id, entry] of Object.entries(servicePatch)) {
        if (entry) out[id] = entry;
        else delete out[id];
      }
      return out;
    });
    const next = { ...dateAnswers };
    for (const [key, value] of Object.entries(asked)) {
      if (value) next[key] = value;
      else delete next[key];
    }
    setDateAnswers(next);
    void load(stageId, municipality ? { municipality } : {}, next);
    // The page keeps what the person chose for this visit whether or not the
    // save below succeeds, so Back and Forward show the counted date again
    // (walkthrough, 2026-10-08: it was kept only after a successful save, and
    // two runs lost it on returning to the results).
    onSaved?.({ dateAnswers: next, stepId: stageId || null });
    if (!caseId) return;
    setDateStatus("saving");
    // The step is saved with the dates: counting a deadline at the suggested
    // step is the user acting on it, and the case file needs the step to show
    // the counted date (page review, 2026-10-06).
    const saved = await savePosition(caseId, {
      dateAnswers: asked,
      stepId: stageId || null,
      ...(Object.keys(servicePatch).length ? { service: servicePatch } : {}),
    });
    setDateStatus(saved ? "saved" : "not-saved");
  }

  /*
   * A full date the person wrote in their story (with its year) is kept with
   * the case as soon as it is shown, instead of waiting for "Yes, save this
   * date" (build order Step 2B, 2026-10-12). It is their own statement, not a
   * guess; the deadline was already counted from it; and the walkthrough
   * flagged the waiting prompt as asking again on 8 cases, including after
   * every reload, because nothing was saved until the click. The quote it
   * came from stays on screen with "Change", and a date with no year is still
   * asked (yearAssumed never reaches storyDates).
   */
  const [keptFromStory, setKeptFromStory] = useState<Record<string, string>>({});
  const autoKeptFor = useRef("");
  useEffect(() => {
    if (result?.outcome !== "rendered") return;
    const fill: Record<string, string> = {};
    const bases: Record<string, string> = {};
    for (const question of result.dateQuestions ?? []) {
      const story = storyDates[question.id];
      if (story && !dateAnswers[question.id] && !rejected[question.id]) {
        fill[question.id] = story.value;
        bases[question.id] = story.basis;
      }
    }
    const key = `${stageId}|${JSON.stringify(fill)}`;
    if (Object.keys(fill).length === 0 || autoKeptFor.current === key) return;
    autoKeptFor.current = key;
    setKeptFromStory((current) => ({ ...current, ...bases }));
    setDateDraft((current) => ({ ...current, ...fill }));
    const next = { ...dateAnswers, ...fill };
    setDateAnswers(next);
    onSaved?.({ dateAnswers: next });
    if (!caseId) return;
    // Only the dates: the step is saved when the person acts on it, never
    // because a date was kept (case position stores only what they chose).
    void savePosition(caseId, { dateAnswers: fill }).then((saved) => setDateStatus(saved ? "saved" : "not-saved"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, storyDates, stageId]);

  return (
    <section
      data-testid="stage-answer-panel"
      className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#10231f]">What happens next at your exact step</h3>
      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        {noticeFirst && suggested === stageId
          ? "Before filing: this step may apply to the kind of claim you described. It shows a written-notice deadline counted from the day of the injury, with the rule it comes from. If it does not fit, choose the question closest to where your case is."
          : suggested
          ? "Based on what you told us, this is your step. If it is not right, choose the question closest to where your case is."
          : "Choose the question closest to where your case is. We will show what the court rules and official guides say about that step, with the sources."}
      </p>

      {/* With a step already suggested from what they told us, the person sees
          it named, not a "Where is your case?" list asking them again
          (walkthrough, 2026-10-08: the list stayed open after every stage was
          confirmed, and read as the question being asked twice). The list is
          one click away. */}
      {stageId && !choosingStep ? (
        <p className="mt-4 text-sm text-[#16302b]" data-testid="stage-answer-current">
          <span className="font-semibold">Your step: </span>
          {options.find((option) => option.id === stageId)?.label ?? ""}{" "}
          <button
            type="button"
            data-testid="stage-answer-change"
            onClick={() => setChoosingStep(true)}
            className="font-semibold text-[#2f7d67] underline"
          >
            Not right? Choose another step
          </button>
        </p>
      ) : null}
      <label className={stageId && !choosingStep ? "hidden" : "mt-4 block"}>
        <span className="text-sm font-semibold text-[#16302b]">Where is your case?</span>
        <select
          aria-label="Where is your case?"
          data-testid="stage-answer-select"
          value={stageId}
          onChange={(event) => {
            const id = event.target.value;
            setStageId(id);
            setChoosingStep(false);
            setResult(null);
            setMunicipality("");
            // Choosing the Toronto question IS the person saying it was in
            // Toronto — the fact comes from them, which is what the stage's
            // confirmed-fact rule requires. Every other municipality has its
            // own question.
            if (id) void load(id, id === "before-filing:notice-toronto" ? { municipality: "Toronto" } : {});
            // The user picked this: kept on the page for this visit, and
            // recorded on their case.
            onSaved?.({ stepId: id || null });
            if (caseId) void savePosition(caseId, { stepId: id || null });
          }}
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
        >
          <option value="">Choose one…</option>
          {orderGroupsForReader(GROUPS[courtPath], responding)
            .filter(
              (group) =>
                showOtherSide ||
                !confirmedStage ||
                !group.label.startsWith("Other situations") ||
                options.some((option) => option.group === group.side && option.id === stageId),
            )
            .map((group) => (
            <optgroup key={group.side} label={group.label}>
              {options.filter((option) => option.group === group.side).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {confirmedStage && !showOtherSide && (choosingStep || !stageId) ? (
        <button
          type="button"
          data-testid="stage-answer-show-other-side"
          onClick={() => setShowOtherSide(true)}
          className="mt-2 text-sm font-semibold text-[#2f7d67] underline"
        >
          Show the other side&apos;s steps too
        </button>
      ) : null}

      {loading && <p className="mt-3 text-sm text-[#4d675f]">Loading…</p>}
      {failed && (
        <p className="mt-3 text-sm text-[#7a4b12]">
          We could not load this just now. Please try again.
        </p>
      )}

      {result?.outcome === "rendered" && result.nextStep ? (
        <NextStepCard
          summary={result.nextStep}
          answer={result.answer}
          court={courtPath}
          userWords={userWords}
          askedForDates={(result.dateQuestions ?? []).some((question) => !dateAnswers[question.id] && !(storyDates[question.id] && !rejected[question.id]))}
          stepId={stageId}
          city={city}
          responding={responding}
          fromStory={(result.dateQuestions ?? [])
            .filter((question) => !dateAnswers[question.id] && storyDates[question.id] && !rejected[question.id])
            .map((question) => ({ label: "", date: formatIso(storyDates[question.id].value) }))}
        />
      ) : null}

      {result?.outcome === "rendered" && (result.dateQuestions?.length ?? 0) > 0 && (
        <div id="work-out-your-dates" data-testid="stage-answer-dates" className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-semibold text-[#16302b]">Work out your dates</p>
          <p className="mt-1 text-sm leading-6 text-[#4d675f]">
            Give the date and we will count the deadline for you, with the working shown below.
            Leave it empty if you do not know. You will still see the time period.
          </p>
          <div className="mt-3 space-y-4">
            {result.dateQuestions!.map((question) => {
              const hint = storyHints[question.id];
              const suggestion: { value: string; basis: string; yearAssumed?: boolean } | undefined =
                offeredDates[question.id] ??
                (hint?.value
                  ? { value: hint.value, basis: `from your story: “${hint.quote}”`, yearAssumed: hint.yearAssumed }
                  : undefined);
              const value = dateDraft[question.id] ?? "";
              const saved = dateAnswers[question.id];
              const fromStory = !saved && !rejected[question.id] ? storyDates[question.id] : undefined;
              if ((saved || fromStory) && !editing[question.id]) {
                return (
                  <div key={question.id} data-testid={`stage-answer-known-${question.id}`}>
                    <p className="text-sm text-[#16302b]">
                      <span className="font-semibold">{shortLabel(question.question)}:</span> {formatIso(saved || fromStory!.value)}
                    </p>
                    {saved && serviceCourt && serviceSaved[question.id] ? (
                      (() => {
                        const entry = serviceSaved[question.id];
                        const how = serviceRulesFor(serviceCourt).find((rule) => rule.method === entry.method);
                        const effective = effectiveServiceDate(serviceCourt, entry.method, entry.enteredOn);
                        return (
                          <p data-testid={`stage-answer-service-${question.id}`} className="text-xs text-[#16302b]">
                            {how?.label ?? entry.method}, {formatIso(entry.enteredOn)}.{" "}
                            {effective.date !== entry.enteredOn ? `Service counts from ${formatIso(effective.date)}` : "Service counts from that day"}
                            {effective.rules.length ? ` (${effective.rules.join("; ")})` : ""}.
                            {effective.confirm ? ` ${effective.confirm}` : ""}
                          </p>
                        );
                      })()
                    ) : null}
                    <p className="text-xs text-[#4d675f]">
                      {saved
                        ? keptFromStory[question.id]
                          ? `${keptFromStory[question.id].replace(/^from your story/, "From your story")}. Saved to your case.`
                          : "Saved to your case."
                        : `${fromStory!.basis.replace(/^from your story/, "From your story")}`}{" "}
                      Used for:{" "}
                      {question.sets.join("; ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fromStory ? (
                        <button
                          type="button"
                          data-testid={`stage-answer-date-suggestion-${question.id}`}
                          onClick={() => {
                            const draft = { ...dateDraft, [question.id]: fromStory.value };
                            setDateDraft(draft);
                            void countDeadline(draft);
                          }}
                          className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Yes, save this date
                        </button>
                      ) : null}
                      <button
                        type="button"
                        data-testid={`stage-answer-date-change-${question.id}`}
                        onClick={() => {
                          setEditing({ ...editing, [question.id]: true });
                          // Edit the day they typed, not the day service counts from.
                          if (serviceSaved[question.id]) setDateDraft({ ...dateDraft, [question.id]: serviceSaved[question.id].enteredOn });
                          if (fromStory) {
                            const dropped = { ...rejected, [question.id]: true };
                            setRejected(dropped);
                            void load(stageId, municipality ? { municipality } : {}, dateAnswers, dropped);
                          }
                        }}
                        className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
                      >
                        {fromStory ? "No, change it" : "Change"}
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={question.id}>
                  {serviceCourt && isServiceDateQuestion(question.id, question.question) ? (
                    <label className="mb-2 block">
                      <span className="text-sm font-semibold text-[#16302b]">How were the papers served?</span>
                      <span className="block text-xs text-[#4d675f]">
                        The rules count service from a different day depending on how it was done.
                      </span>
                      <select
                        data-testid={`stage-answer-service-method-${question.id}`}
                        value={serviceMethod[question.id] ?? ""}
                        onChange={(event) =>
                          setServiceMethod({ ...serviceMethod, [question.id]: event.target.value as ServiceMethod })
                        }
                        className="mt-2 rounded-xl border border-[#d8e6df] bg-white px-3 py-2"
                      >
                        <option value="">Choose how</option>
                        {serviceRulesFor(serviceCourt).map((rule) => (
                          <option key={rule.method} value={rule.method}>
                            {rule.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="text-sm font-semibold text-[#16302b]">
                      {serviceCourt && serviceMethod[question.id]
                        ? `Enter ${serviceRulesFor(serviceCourt).find((rule) => rule.method === serviceMethod[question.id])?.dateToEnter ?? "the date"}`
                        : question.question}
                    </span>
                    <span className="block text-xs text-[#4d675f]">Used for: {question.sets.join("; ")}</span>
                    <input
                      type="date"
                      data-testid={`stage-answer-date-${question.id}`}
                      value={value}
                      onChange={(event) => setDateDraft({ ...dateDraft, [question.id]: event.target.value })}
                      className="mt-2 rounded-xl border border-[#d8e6df] bg-white px-3 py-2"
                    />
                  </label>
                  {hint && !hint.value && !suggestion && !value ? (
                    <p className="mt-2 text-sm text-[#4d675f]" data-testid={`stage-answer-story-hint-${question.id}`}>
                      You wrote: &ldquo;{hint.quote}&rdquo; Pick that date above, with its year.
                    </p>
                  ) : null}
                  {suggestion && !value && suggestion.yearAssumed ? (
                    // The person gave a month and day but no year. The deadline
                    // depends on the year, so we ask instead of guessing
                    // (site owner, 2026-10-08: "why wouldn't the site ask for
                    // the year when it knows the rule depends on it?"). One
                    // click on their year uses it and counts the deadline.
                    <div className="mt-2" data-testid={`stage-answer-year-choice-${question.id}`}>
                      <p className="text-sm text-[#16302b]">
                        {suggestion.basis.replace(/^from your story/, "From your story")}.{" "}
                        <span className="font-semibold">Which year was that?</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yearChoices(suggestion.value).map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            data-testid={`stage-answer-year-${question.id}-${choice.slice(0, 4)}`}
                            onClick={() => {
                              const draft = { ...dateDraft, [question.id]: choice };
                              setDateDraft(draft);
                              void countDeadline(draft);
                            }}
                            className="rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
                          >
                            {formatIso(choice)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : suggestion && !value ? (
                    // One click uses the suggested date AND counts the deadline:
                    // choosing it is the user's confirmation (page review,
                    // 2026-10-06: no served person ever saw their due date).
                    <button
                      type="button"
                      data-testid={`stage-answer-date-suggestion-${question.id}`}
                      onClick={() => {
                        const draft = { ...dateDraft, [question.id]: suggestion.value };
                        setDateDraft(draft);
                        void countDeadline(draft);
                      }}
                      className="mt-2 block rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-left text-sm font-semibold text-[#2f7d67]"
                    >
                      Count my deadline from {formatIso(suggestion.value)}
                      <span className="block text-xs font-normal text-[#4d675f]">{suggestion.basis}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="stage-answer-dates-save"
              disabled={dateStatus === "saving"}
              onClick={() => void countDeadline(dateDraft)}
              className="rounded-xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Count my deadline
            </button>
            {dateStatus === "saved" ? <span className="text-sm text-[#2f7d67]">Saved to your case.</span> : null}
            {dateStatus === "not-saved" ? (
              <span className="text-sm text-[#7a4b12]">Shown here, but it could not be saved to your case.</span>
            ) : null}
          </div>
        </div>
      )}

      {result?.outcome === "rendered" && amountNote ? (
        <div data-testid="stage-answer-amount" className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-semibold text-[#16302b]">Your amount</p>
          <p className="mt-1 text-sm leading-6 text-[#2b4640]">{amountNote.text}</p>
          <p className="mt-2 text-xs leading-5 text-[#4d675f]">
            {amountNote.sources.map((source, index) => (
              <span key={`${source.sourceId}-${source.pinpoint}`}>
                {index > 0 ? "; " : "Source: "}
                <a href={officialUrl(source)} target="_blank" rel="noreferrer" className="underline">
                  {sourceName(source)}
                </a>
                , {source.pinpoint}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {result?.outcome === "rendered" && result.nextStep ? (
        <details data-testid="stage-answer-full" className="mt-5 rounded-2xl border border-[#d8e6df] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#2f7d67]">
            The full answer for this step, with every rule and source
          </summary>
          <AnswerView answer={result.answer} court={courtPath} userWords={userWords} underCard />
        </details>
      ) : result?.outcome === "rendered" ? (
        <AnswerView answer={result.answer} court={courtPath} userWords={userWords} />
      ) : null}

      {result?.outcome === "needs-a-fact" && (
        <div className="mt-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#16302b]">{result.question}</span>
            <input
              data-testid="stage-answer-fact"
              value={municipality}
              onChange={(event) => setMunicipality(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            />
          </label>
          <button
            type="button"
            disabled={!municipality.trim()}
            onClick={() => void load(stageId, { municipality })}
            className="mt-3 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            Show the steps for that place
          </button>
          {result.answer && <AnswerView answer={result.answer} court={courtPath} userWords={userWords} />}
        </div>
      )}

      {result?.outcome === "unavailable" && (
        <p className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#7a4b12]">
          {result.message}
        </p>
      )}
    </section>
  );
}
