"use client";

import { useIntakeState } from "../../_components/IntakeRecovery";
import { dateAnswerCheck } from "../../../src/lib/case-system/dates";
import StoryChangedNotice, { useStoryAnswersOutdated } from "../../_components/StoryChangedNotice";

/**
 * ONE QUESTION AT A TIME, OVER THE COURT'S OWN FORM (build order Step 2C,
 * 2026-10-12).
 *
 * Family and civil had only long forms, so every family and civil walkthrough
 * case failed the finish line's conversation check ("acknowledges what the
 * person said, asks one question at a time, says why a question matters").
 * This is a conversation layer over the SAME form state, not a second intake:
 * each question reads and writes one of the form's own fields, so the case
 * record, the analysis and what is saved are exactly what the form produces.
 *
 * - A question whose field already has a value (from the story hand-off, the
 *   saved case on "Update your story", or an earlier answer) is never asked;
 *   it is listed under "What we already have", where the person can change it.
 * - Each question says why it matters, in plain words about what the site does
 *   with the answer -- never a statement of law.
 * - "Skip" is always there; a skipped question is not asked again this visit.
 * - Nothing here calls a model.
 */

import { useMemo } from "react";

import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";

export type GuidedChoice = { value: string; label: string };

export type GuidedField = {
  /** The form field this question fills. */
  key: string;
  /** Initial orientation versus optional later detail. */
  initial?: boolean;
  question: string;
  /** Why it matters, in plain words about what the answer is used for. */
  why: string;
  kind: "text" | "longtext" | "choice" | "multi";
  options?: GuidedChoice[];
  /** Asked only when this holds for the current values. */
  when?: (values: GuidedValues) => boolean;
  /** Values that count as "not answered yet" (for example "not-sure"). */
  emptyValues?: string[];
  /** Short label for "What we already have". */
  label: string;
  /**
   * The answer the person's own story already gives, with the words it came
   * from (2026-10-13, walkthrough: the chat asked "How much money is
   * involved?" after the story said $68,000). Offered for one click -- "From
   * what you told us: ... Is that right?" -- never filled in unseen.
   */
  fromStory?: (values: GuidedValues) => { value: string | string[]; quote: string } | null;
  /**
   * A reading that goes beyond the words (being served is read as an application
   * having been filed): always its own "Is that right?", never folded into one
   * confirmation with answers the sentence states outright (re-test 2026-10-18).
   */
  confirmAlone?: boolean;
  /**
   * For a text answer the site cannot use as given, what to add, asked
   * before it is kept (review 2026-10-13: "october 6" for the day served was
   * kept with no year, and the step page then asked "Which year was that?").
   * Null when the answer can be kept. A story answer that needs more is not
   * offered for one click; the question is asked instead.
   */
  needsMore?: (value: string) => string | null;
  /**
   * Part of the answer the story gives, when it does not give all of it
   * (walkthrough run 38525903567, FR: "our daugter" was followed by "Tell us
   * about the children: how many, how old ..."). The part it gives is filled
   * in, editable, and only the rest is asked. Never kept unseen: it is saved
   * only when the person presses Next.
   */
  partialFromStory?: (values: GuidedValues) => { prefill: string; question: string; quote: string } | null;
};

/** What a text answer still needs before it is kept, or null (GuidedField.needsMore). */
export function answerNeedsMore(field: GuidedField, value: string | string[]): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  // A field's own check, else the one check every date box uses (dates.ts).
  // Family's served date is counted from (the Timeline line): one date, as every counted box.
  return field.needsMore ? field.needsMore(value.trim()) : dateAnswerCheck(field.question, value.trim(), { oneDate: field.key === "servedDate" });
}

export type GuidedValues = Record<string, string | string[] | undefined>;

export { isAnswered, pendingFields } from "./guidedFields";
import { isAnswered, pendingFields } from "./guidedFields";

/**
 * `text` cut to at most `max` characters at the end of a whole word, with an
 * ellipsis; unchanged when it fits. Never mid-word (walkthrough run
 * 38525903567: "how do i get it l…").
 */
export function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max + 1);
  const lastBreak = room.search(/\s+\S*$/);
  const head = lastBreak > 0 ? room.slice(0, lastBreak) : room.slice(0, max);
  return `${head.replace(/[\s,;:.\u2014-]+$/, "")}…`;
}

/**
 * A plain line repeating the answer back, so the person sees it was heard.
 * A long answer in their own words is not pasted back cut short, typos and
 * all (walkthrough run 38525903567, FM and FR: "Got it: ... how do i get it
 * l…", "...our daugter..."): it is named instead. Anything else that is too
 * long is cut at a whole word.
 */
export function acknowledgement(field: GuidedField, value: string | string[]): string {
  const labels = (Array.isArray(value) ? value : [value])
    .map((item) => field.options?.find((option) => option.value === item)?.label ?? item)
    .filter(Boolean);
  if (labels.length === 0) return "Okay, we'll leave that for now.";
  const shown = labels.join("; ");
  if (shown.length <= 160) return `Got it: ${withFullStop(shown)}`;
  if (field.kind === "longtext" && !Array.isArray(value)) return `Got it. We have ${field.label.charAt(0).toLowerCase()}${field.label.slice(1)}, in your own words.`;
  return `Got it: ${withFullStop(cutAtWord(shown, 157))}`;
}

/** The text with one closing full stop: "Leo, age 7." was shown as "Leo, age 7.." (#470 re-test). */
export function withFullStop(text: string): string {
  return /[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}

/** What the transcript shows above an answer: the question, or for an answer confirmed from the story, that it came from the story. */
export function heardAs(field: GuidedField, fromStory: boolean): string {
  // 2026-10-13 (walkthrough R2): a one-click "Yes" was listed under the full
  // question ("Are you starting a family case...?"), so the transcript read
  // as though the question the story answered had been asked again.
  return fromStory ? `${field.label}, from what you told us` : field.question;
}

function display(field: GuidedField, value: GuidedValues[string]): string {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const shown = list.map((item) => field.options?.find((option) => option.value === item)?.label ?? item).join("; ");
  return cutAtWord(shown, 160);
}

export default function GuidedFormChat({
  fields,
  values,
  onAnswer,
  onDone,
  onShowForm,
  busy = false,
  doneLabel = "Continue to your next steps",
  closing = null,
}: {
  fields: readonly GuidedField[];
  values: GuidedValues;
  onAnswer: (key: string, value: string | string[]) => void;
  /** The form's own Continue: the same path as the long form. */
  onDone: () => void;
  onShowForm: () => void;
  busy?: boolean;
  doneLabel?: string;
  /** A plain answer to what the person asked, said when the questions are done, with the rules it restates (motionToChange.ts chatClosingFor). */
  closing?: { say: string; rules: RuleCitation[] } | null;
}) {
  const [skipped, setSkipped] = useIntakeState<Set<string>>("form-chat", "skipped", new Set());
  const [heard, setHeard] = useIntakeState<{ question: string; reply: string }[]>("form-chat", "heard", []);
  const [changing, setChanging] = useIntakeState<string | null>("form-chat", "changing", null);
  // Story answers the person said were not right: asked plainly instead.
  const [notFromStory, setNotFromStory] = useIntakeState<Set<string>>("form-chat", "notFromStory", new Set());
  // What the answer just given still needs (answerNeedsMore), shown under the box.
  const [needsMore, setNeedsMore] = useIntakeState<string | null>("form-chat", "needsMore", null);
  // Questions whose story-filled part the person has edited (partialFromStory).
  const [edited, setEdited] = useIntakeState<Set<string>>("form-chat", "edited", new Set());

  // Known when this opened: listed, not asked (the story, the saved case).
  const [knownAtStart] = useIntakeState("form-chat", "knownAtStart", () =>
    fields.filter((field) => (field.when ? field.when(values) : true) && isAnswered(field, values[field.key])).map((field) => field.key),
  );

  const pending = useMemo(() => pendingFields(fields, values, skipped), [fields, values, skipped]);
  const current = changing ? fields.find((field) => field.key === changing) ?? null : pending[0] ?? null;
  // An unsent reply belongs to its question, including when the form changes which question comes next.
  const [drafts, setDrafts] = useIntakeState<Record<string, string | string[]>>("form-chat", "drafts", {});
  const draft = drafts[current?.key ?? "complete"] ?? "";
  function setDraft(value: string | string[], key = current?.key ?? "complete") {
    setDrafts((previous) => ({ ...previous, [key]: value }));
  }

  function answer(value: string | string[], fromStory = false) {
    if (!current) return;
    const cleaned = Array.isArray(value) ? value : value.trim();
    // Changing an answer and keeping it: nothing new was said.
    if (changing && ((Array.isArray(cleaned) && cleaned.length === 0) || cleaned === "")) {
      setDraft("");
      setChanging(null);
      setNeedsMore(null);
      return;
    }
    const more = answerNeedsMore(current, cleaned);
    if (more) {
      setNeedsMore(more);
      setDraft(cleaned);
      return;
    }
    setNeedsMore(null);
    if ((Array.isArray(cleaned) && cleaned.length === 0) || cleaned === "") {
      setSkipped((now) => new Set(now).add(current.key));
      setHeard((now) => [...now, { question: current.question, reply: "Okay, we'll leave that for now." }]);
    } else {
      onAnswer(current.key, cleaned);
      setHeard((now) => [...now, { question: heardAs(current, fromStory), reply: acknowledgement(current, cleaned) }]);
    }
    setDraft("");
    setChanging(null);
  }

  /*
   * ONE SENTENCE, ONE CONFIRMATION. "I was served with her Application on October
   * 9, 2026" answers your side, what has been filed and the day you were served;
   * asking "Is that right?" three times about the same sentence read as not
   * listening (PR #463 re-test, 2026-10-18). Pending questions the same sentence
   * answers are offered together; "Yes" records each, "No" asks this one plainly.
   */
  function storyGroup(quote: string) {
    // Including a question the group itself makes due: accepting "I was served"
    // as your side is what makes "what day were you served" a question at all.
    const group: { field: GuidedField; offer: { value: string | string[]; quote: string } }[] = [];
    const assumed: GuidedValues = { ...values };
    for (let changed = true; changed;) {
      changed = false;
      for (const field of fields) {
        if (group.some((item) => item.field.key === field.key) || notFromStory.has(field.key) || skipped.has(field.key) || field.confirmAlone) continue;
        if ((field.when && !field.when(assumed)) || isAnswered(field, assumed[field.key])) continue;
        const offer = field.fromStory?.(assumed) ?? null;
        if (!offer || offer.quote !== quote || answerNeedsMore(field, offer.value)) continue;
        group.push({ field, offer });
        assumed[field.key] = offer.value;
        changed = true;
      }
    }
    return group;
  }
  function acceptGroup(group: { field: GuidedField; offer: { value: string | string[] } }[]) {
    for (const { field, offer } of group) onAnswer(field.key, offer.value);
    setHeard((now) => [...now, ...group.map(({ field, offer }) => ({ question: heardAs(field, true), reply: acknowledgement(field, offer.value) }))]);
    setDraft("");
    setChanging(null);
  }

  // Answers based on an earlier version of the story (storyBasis.ts): not shown, not asked from.
  const storyChanged = useStoryAnswersOutdated();

  const known = fields.filter((field) => knownAtStart.includes(field.key) && isAnswered(field, values[field.key]));

  if (storyChanged) {
    return (
      <div data-testid="guided-form-chat" className="rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5">
        <h3 className="text-lg font-bold text-[#10231f]">A few questions, one at a time</h3>
        <StoryChangedNotice where="questions" />
      </div>
    );
  }

  return (
    <div data-testid="guided-form-chat" className="rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-[#10231f]">A few questions, one at a time</h3>
        <button type="button" data-testid="guided-form-show-form" onClick={onShowForm} className="text-sm font-semibold text-[#2f7d67] underline">
          Show the whole form instead
        </button>
      </div>

      {known.length > 0 ? (
        <div data-testid="guided-form-known" className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-4">
          <p className="text-sm font-semibold text-[#16302b]">What we already have from what you told us</p>
          <ul className="mt-2 space-y-1 text-sm text-[#2b4640]">
            {known.map((field) => (
              <li key={field.key}>
                <span className="font-semibold">{field.label}:</span> {display(field, values[field.key])}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setChanging(field.key);
                    setDraft(values[field.key] ?? (field.kind === "multi" ? [] : ""), field.key);
                  }}
                  className="text-[#2f7d67] underline"
                >
                  Change
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {heard.length > 0 ? (
        <ol className="mt-4 space-y-2 text-sm">
          {heard.map((item, index) => (
            <li key={`${item.question}-${index}`}>
              <p className="text-[#4d675f]">{item.question}</p>
              <p data-testid="guided-form-ack" className="font-semibold text-[#16302b]">{item.reply}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {current ? (
        <div data-testid="guided-form-question" data-key={current.key} className="mt-5 rounded-2xl border-2 border-[#2f7d67] bg-white p-4">
          {(() => {
            const offered = !changing && !notFromStory.has(current.key) ? current.fromStory?.(values) ?? null : null;
            if (!offered || answerNeedsMore(current, offered.value)) return null;
            const words = (field: GuidedField, value: string | string[]) => (Array.isArray(value) ? value : [value])
              .map((item) => field.options?.find((option) => option.value === item)?.label ?? item)
              .join("; ");
            const together = current.confirmAlone ? [] : storyGroup(offered.quote);
            const group = together.some(({ field }) => field.key === current.key) ? together : [{ field: current, offer: offered }];
            return (
              <div data-testid="guided-form-from-story" data-value={JSON.stringify(offered.value)} data-group={group.map(({ field }) => field.key).join(" ")}>
                {group.map(({ field, offer }) => <p key={field.key} className="font-semibold text-[#10231f]">{field.label}: {cutAtWord(words(field, offer.value), 160)}</p>)}
                <p className="mt-1 text-sm text-[#4d675f]">
                  From what you told us: &ldquo;{cutAtWord(offered.quote, 200)}&rdquo; Is that right?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="guided-form-from-story-yes"
                    onClick={() => (group.length > 1 ? acceptGroup(group) : answer(offered.value, true))}
                    className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Yes, that&apos;s right
                  </button>
                  <button
                    type="button"
                    data-testid="guided-form-from-story-no"
                    onClick={() => setNotFromStory((now) => new Set(now).add(current.key))}
                    className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
                  >
                    No, let me answer
                  </button>
                </div>
              </div>
            );
          })() ?? (() => {
          // Part of the answer from the story, filled in; only the rest is asked.
          const partial = !changing && !notFromStory.has(current.key) ? current.partialFromStory?.(values) ?? null : null;
          const boxValue = partial && !edited.has(current.key) ? partial.prefill : typeof draft === "string" ? draft : "";
          const editBox = (text: string) => {
            setEdited((now) => new Set(now).add(current.key));
            setDraft(text);
          };
          return (
          <>
          <p className="font-semibold text-[#10231f]">{partial ? partial.question : current.question}</p>
          {partial ? (
            <p data-testid="guided-form-partial-from-story" className="mt-1 text-sm text-[#4d675f]">
              From what you told us: &ldquo;{cutAtWord(partial.quote, 200)}&rdquo; We filled in what that says. Change it if it is not right, and add the rest.
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[#4d675f]">Why we ask: {current.why}</p>
          {current.kind === "choice" ? (
            <div className="mt-3 grid gap-2">
              {(current.options ?? []).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-testid={`guided-option-${option.value}`}
                  // The answer it holds is marked, so changing it shows what it was (#471 re-test).
                  aria-pressed={values[current.key] === option.value}
                  onClick={() => answer(option.value)}
                  className="rounded-xl border border-[#d8e6df] px-4 py-2 text-left text-sm font-semibold text-[#16302b] hover:border-[#2f7d67] aria-pressed:bg-[#2f7d67] aria-pressed:text-white"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : current.kind === "multi" ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(current.options ?? []).map((option) => {
                const list = Array.isArray(draft) ? draft : [];
                const on = list.includes(option.value);
                return (
                  <label key={option.value} className="flex items-start gap-2 text-sm text-[#16302b]">
                    <input
                      type="checkbox"
                      data-testid={`guided-check-${option.value}`}
                      checked={on}
                      onChange={() => setDraft(on ? list.filter((item) => item !== option.value) : [...list, option.value])}
                      className="mt-1"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          ) : current.kind === "longtext" ? (
            <textarea
              aria-label={partial ? partial.question : current.question}
              value={boxValue}
              onChange={(event) => editBox(event.target.value)}
              className="mt-3 min-h-28 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            />
          ) : (
            <input
              aria-label={partial ? partial.question : current.question}
              value={boxValue}
              onChange={(event) => editBox(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            />
          )}
          {needsMore ? (
            <p data-testid="guided-form-needs-more" className="mt-2 text-sm font-semibold text-[#8a4b12]">
              {needsMore}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {current.kind !== "choice" ? (
              <button
                type="button"
                data-testid="guided-form-next"
                onClick={() => answer(current.kind === "multi" ? draft : boxValue)}
                className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
              >
                Next
              </button>
            ) : null}
            <button
              type="button"
              data-testid="guided-form-skip"
              onClick={() => answer(current.kind === "multi" ? [] : "")}
              className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              {changing ? "Keep what I had" : "Skip, I'm not sure"}
            </button>
          </div>
          </>
          );
          })()}
        </div>
      ) : (
        <div className="mt-5">
          {closing ? (
            <div data-testid="guided-form-closing" className="mb-3 rounded-2xl border border-[#cde7dc] bg-white p-4">
              <p className="text-sm font-semibold leading-6 text-[#16302b]">{closing.say}</p>
              <details className="mt-2 text-xs leading-5 text-[#4d675f]">
                <summary className="cursor-pointer">The rules this restates</summary>
                <ul className="mt-1 space-y-2">
                  {closing.rules.map((rule) => (
                    <li key={rule.pinpoint}>
                      &ldquo;{rule.quote}&rdquo;{" "}
                      <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
                        {sourceName(rule)}
                      </a>
                      , {rule.pinpoint}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ) : null}
          <p className="text-sm text-[#16302b]">That&apos;s everything we need for now. You can change any answer above.</p>
          <button
            type="button"
            data-testid="guided-form-done"
            onClick={onDone}
            disabled={busy}
            className="mt-3 rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Reading what you told us..." : doneLabel}
          </button>
        </div>
      )}
    </div>
  );
}
