"use client";

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

import { useMemo, useState } from "react";

export type GuidedChoice = { value: string; label: string };

export type GuidedField = {
  /** The form field this question fills. */
  key: string;
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
   * For a text answer the site cannot use as given, what to add, asked
   * before it is kept (review 2026-10-13: "october 6" for the day served was
   * kept with no year, and the step page then asked "Which year was that?").
   * Null when the answer can be kept. A story answer that needs more is not
   * offered for one click; the question is asked instead.
   */
  needsMore?: (value: string) => string | null;
};

/** What a text answer still needs before it is kept, or null (GuidedField.needsMore). */
export function answerNeedsMore(field: GuidedField, value: string | string[]): string | null {
  return typeof value === "string" && value.trim() && field.needsMore ? field.needsMore(value.trim()) : null;
}

export type GuidedValues = Record<string, string | string[] | undefined>;

export function isAnswered(field: GuidedField, value: GuidedValues[string]): boolean {
  if (Array.isArray(value)) return value.filter((item) => !(field.emptyValues ?? []).includes(item)).length > 0;
  const text = (value ?? "").trim();
  return text.length > 0 && !(field.emptyValues ?? []).includes(text);
}

/** The questions still to ask, in order: applicable, unanswered, not skipped. */
export function pendingFields(fields: readonly GuidedField[], values: GuidedValues, skipped: ReadonlySet<string>): GuidedField[] {
  return fields.filter(
    (field) => (field.when ? field.when(values) : true) && !isAnswered(field, values[field.key]) && !skipped.has(field.key),
  );
}

/** A plain line repeating the answer back, so the person sees it was heard. */
export function acknowledgement(field: GuidedField, value: string | string[]): string {
  const labels = (Array.isArray(value) ? value : [value])
    .map((item) => field.options?.find((option) => option.value === item)?.label ?? item)
    .filter(Boolean);
  if (labels.length === 0) return "Okay, we'll leave that for now.";
  const shown = labels.join("; ");
  return `Got it: ${shown.length > 160 ? `${shown.slice(0, 157)}…` : shown}.`;
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
  return shown.length > 160 ? `${shown.slice(0, 157)}…` : shown;
}

export default function GuidedFormChat({
  fields,
  values,
  onAnswer,
  onDone,
  onShowForm,
  busy = false,
  doneLabel = "Continue to your next steps",
}: {
  fields: readonly GuidedField[];
  values: GuidedValues;
  onAnswer: (key: string, value: string | string[]) => void;
  /** The form's own Continue: the same path as the long form. */
  onDone: () => void;
  onShowForm: () => void;
  busy?: boolean;
  doneLabel?: string;
}) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [heard, setHeard] = useState<{ question: string; reply: string }[]>([]);
  const [draft, setDraft] = useState<string | string[]>("");
  const [changing, setChanging] = useState<string | null>(null);
  // Story answers the person said were not right: asked plainly instead.
  const [notFromStory, setNotFromStory] = useState<Set<string>>(new Set());
  // What the answer just given still needs (answerNeedsMore), shown under the box.
  const [needsMore, setNeedsMore] = useState<string | null>(null);

  // Known when this opened: listed, not asked (the story, the saved case).
  const [knownAtStart] = useState(() =>
    fields.filter((field) => (field.when ? field.when(values) : true) && isAnswered(field, values[field.key])).map((field) => field.key),
  );

  const pending = useMemo(() => pendingFields(fields, values, skipped), [fields, values, skipped]);
  const current = changing ? fields.find((field) => field.key === changing) ?? null : pending[0] ?? null;

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

  const known = fields.filter((field) => knownAtStart.includes(field.key) && isAnswered(field, values[field.key]));

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
                    setDraft(values[field.key] ?? (field.kind === "multi" ? [] : ""));
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
            const shown = (Array.isArray(offered.value) ? offered.value : [offered.value])
              .map((item) => current.options?.find((option) => option.value === item)?.label ?? item)
              .join("; ");
            return (
              <div data-testid="guided-form-from-story" data-value={JSON.stringify(offered.value)}>
                <p className="font-semibold text-[#10231f]">{current.label}: {shown.length > 160 ? `${shown.slice(0, 157)}…` : shown}</p>
                <p className="mt-1 text-sm text-[#4d675f]">
                  From what you told us: &ldquo;{offered.quote.length > 200 ? `${offered.quote.slice(0, 197)}…` : offered.quote}&rdquo; Is that right?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="guided-form-from-story-yes"
                    onClick={() => answer(offered.value, true)}
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
          })() ?? (
          <>
          <p className="font-semibold text-[#10231f]">{current.question}</p>
          <p className="mt-1 text-sm text-[#4d675f]">Why we ask: {current.why}</p>
          {current.kind === "choice" ? (
            <div className="mt-3 grid gap-2">
              {(current.options ?? []).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-testid={`guided-option-${option.value}`}
                  onClick={() => answer(option.value)}
                  className="rounded-xl border border-[#d8e6df] px-4 py-2 text-left text-sm font-semibold text-[#16302b] hover:border-[#2f7d67]"
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
              aria-label={current.question}
              value={typeof draft === "string" ? draft : ""}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-3 min-h-28 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            />
          ) : (
            <input
              aria-label={current.question}
              value={typeof draft === "string" ? draft : ""}
              onChange={(event) => setDraft(event.target.value)}
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
                onClick={() => answer(draft)}
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
          )}
        </div>
      ) : (
        <div className="mt-5">
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
