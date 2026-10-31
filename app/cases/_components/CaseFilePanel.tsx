"use client";

/**
 * "WHAT WE HAVE SO FAR" (Jason, 2026-10-24): the case file, one line per fact the person
 * has answered or said "not sure" to, each with where it came from and a Change link.
 * A fact they were not sure of is never asked again (site owner, 31 Oct): it shows the quiet line
 * "Not answered yet: add it when you know" (askCopy.ts NOT_ANSWERED_YET), with "Add it".
 *
 * Restates the person's own answers; states no law.
 */
import Link from "next/link";
import { formatForCourt } from "@/src/lib/case-system/dates";
import { SLOT_FACTS, claimKindOf, conferenceKind, courtDateIsConference, isUnsureAnswer, slotText, type CaseFile, type SlotFact } from "@/src/lib/case-system/caseFile/caseFile";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { inWords, optionWords } from "@/src/lib/case-system/copy/rawKeys";
import { storyLines } from "@/src/lib/case-system/caseFile/storyLines";
import { ADD_IT_LATER, NOT_ANSWERED_YET } from "@/src/lib/case-system/copy/askCopy";
import type { CountedDeadline } from "@/src/lib/case-system/caseFile/stepDeadlines";

/** A rough time the person gave for a day ("July 2026"): kept and shown, the day still to add. */
const roughTime = (value: unknown) => typeof value === "string" && Boolean(value.trim()) && !isUnsureAnswer(value);

const LABEL: Record<SlotFact, string> = {
  side: "Your side",
  court: "Court",
  stage: "Where the case is",
  filed: "Anything filed yet",
  papers: "Papers you received",
  servedDate: "Day you got the papers",
  amount: "Amount",
  otherParty: "The other party",
  children: "Children",
  married: "Married to the other person",
  marriedWhere: "Where you married",
  claimKind: "Kind of claim",
  wants: "What you want",
  whenHappened: "When it happened",
  conferenceDate: "Conference date",
  defenceFiled: "Defence or answer filed",
  outcome: "Outcome you want",
  urgent: "Anything urgent",
  courtDate: "Next court date",
};

/** The days the step page itself asks for: a day not known yet is added there (folded, never asked again). */
const STEP_PAGE_DATES = new Set<SlotFact>(["servedDate", "whenHappened", "conferenceDate", "courtDate"]);

const COURT: Record<string, string> = { "small-claims": "Small Claims Court", civil: "Superior Court of Justice", family: "Family court" };
const SIDE: Record<string, string> = { bringing: "Bringing the case", responding: "Responding to the case" };
const BROAD: Record<string, string> = { "starting-case": "Starting a case", responding: "Served and responding", "already-started": "The case has started" };

function shownValue(fact: SlotFact, file: CaseFile): string {
  const slot = file[fact];
  // What is filed, by name, where the person said (case 16: "the filed application and answer").
  if (fact === "filed" && slot.state === "answered" && slot.value === true && file.documents?.length) return `Yes: ${inWords(file.documents)}`;
  if (slot.state === "answered" && typeof slot.value === "string") {
    if (fact === "court") return COURT[slot.value] ?? slot.value;
    if (fact === "side") return file.sideWords ?? SIDE[slot.value] ?? slot.value.replace(/-/g, " ");
    // The step picked, by its own title ("Case conference scheduled"), never its code.
    if (fact === "stage") return findStage(slot.value)?.title ?? BROAD[slot.value] ?? optionWords(slot.value) ?? slot.value.replace(/-/g, " ");
    if (optionWords(slot.value) && fact !== "claimKind") return optionWords(slot.value)!;
  }
  // The kind of claim in the words every screen shows for it (caseFile.ts claimKindOf, site owner 29 Oct).
  if (fact === "claimKind" && slot.state === "answered") return claimKindOf(file, inWords).words ?? "";
  // A list of choices ("decision-making-responsibility, parenting-time" on case 14): each in its words.
  if (slot.state === "answered" && Array.isArray(slot.value)) return inWords(slot.value.filter((item) => item !== "not-sure"));
  return slotText(slot, formatForCourt);
}

export default function CaseFilePanel({ file, changeHref, situationHref, stepHref, deadlines = [] }: { file: CaseFile; changeHref: string; situationHref: string; stepHref: string; deadlines?: CountedDeadline[] }) {
  // The conference is the next court date: one day is listed once (26 Oct re-test, case 16 showed it twice).
  const sameDay = courtDateIsConference(file);
  const fromStory = storyLines(file.story ?? "", file, file.side.state === "answered" && file.side.value === "responding");
  // A fact answered "not sure" that the story gives is listed once, in the story's words (from your story).
  const toldInStory = new Set<string>(fromStory.map((line) => (line.fact === "amountAgainst" ? "amount" : line.fact)));
  const lines = SLOT_FACTS.filter((fact) => file[fact].state !== "not-asked" && shownValue(fact, file) && !(fact === "courtDate" && sameDay) && !(file[fact].state === "unsure" && toldInStory.has(fact)));
  if (!lines.length && !fromStory.length && !deadlines.length) return null;
  return (
    <section aria-labelledby="case-file-heading" data-testid="case-file" className="rounded-3xl border border-[#d8e6df] bg-white p-5">
      <h2 id="case-file-heading" className="text-xl font-bold text-[#10231f]">What we have so far</h2>
      <p className="mt-1 text-sm text-[#4f685f]">Your answers, each asked once. Change any of them here.</p>
      <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
        {lines.map((fact) => {
          const slot = file[fact];
          const question = slot.source?.kind === "answer" ? slot.source.question : "";
          // "Change" opens that fact's own choices in the review (?change=<fact>, ChangeAnswer.tsx, the one
          // write path; rule 6, 31 Oct). Side, court, stage and papers choose the court and its steps:
          // they are changed with the start questions; a day picked on the step page, there.
          const viaChange = !question.startsWith("situation:") && !/date|^step$/.test(question) && !["side", "court", "stage", "papers"].includes(fact);
          const href = question.startsWith("situation:") ? situationHref : /date|^step$/.test(question) ? stepHref : viaChange ? `${changeHref}${changeHref.includes("?") ? "&" : "?"}change=${fact}` : changeHref;
          return (
            <div key={fact} className="contents" data-testid="case-file-line" data-fact={fact} data-state={slot.state} data-question={fact} data-source={question}>
              <dt className="font-semibold text-[#10231f]">{(fact === "conferenceDate" ? conferenceKind(slot) : null) ?? LABEL[fact]}</dt>
              <dd>
                {slot.state === "unsure" && !roughTime(slot.value) ? (
                  // Said "not sure": never asked again (site owner, 31 Oct). The quiet line, and "Add it": a day on
                  // the step page below (folded there too), a start answer at the top, anything else in the review.
                  <>
                    <span data-testid="not-answered-yet" data-fact={fact}>{NOT_ANSWERED_YET}.</span>{" "}
                    <Link data-testid="case-file-change" href={STEP_PAGE_DATES.has(fact) ? stepHref : ["side", "court", "stage", "papers"].includes(fact) ? situationHref : `${changeHref}${changeHref.includes("?") ? "&" : "?"}change=${fact}`} className="font-semibold text-[#2f7d67] underline">{ADD_IT_LATER}</Link>
                  </>
                ) : <>
                {shownValue(fact, file)}{" "}
                {slot.state === "unsure" && STEP_PAGE_DATES.has(fact) ? (
                  // A rough time given ("July 2026"), the day not known: added on the step page below, where it is folded.
                  <Link data-testid="case-file-change" href={stepHref} className="font-semibold text-[#2f7d67] underline">Add it with your next step</Link>
                ) : (
                  <Link data-testid="case-file-change" href={href} className="font-semibold text-[#2f7d67] underline">Change</Link>
                )}
                </>}
              </dd>
            </div>
          );
        })}
        {/* The deadlines counted for the step, the same count as the next-step card (stepDeadlines.ts). */}
        {deadlines.map((deadline) => (
          <div key={deadline.id} className="contents" data-testid="case-file-deadline" data-fact="deadline">
            <dt className="font-semibold text-[#10231f]">Deadline</dt>
            <dd>{deadline.what}: {formatForCourt(deadline.date)}{" "}<Link data-testid="case-file-change" href={stepHref} className="font-semibold text-[#2f7d67] underline">See your next step</Link></dd>
          </div>
        ))}
        {fromStory.map((line) => (
          <div key={line.fact} className="contents" data-testid="case-file-story-line" data-fact={line.fact}>
            <dt className="font-semibold text-[#10231f]">{line.label}</dt>
            <dd>
              {/* Each fact in plain words; the sentence it came from is one click away (Charter re-test 27 Oct). */}
              {line.value}{" "}
              {line.quote.trim() !== line.value.trim() ? (
                <details className="inline text-[#4f685f]" data-testid="case-file-story-quote">
                  <summary className="inline cursor-pointer">(from your story)</summary>
                  <span className="block">&ldquo;{line.quote.trim()}&rdquo;</span>
                </details>
              ) : <span className="text-[#4f685f]">(from your story)</span>}{" "}
              <Link data-testid="case-file-change" href={changeHref} className="font-semibold text-[#2f7d67] underline">Change</Link>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
