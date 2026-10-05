"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { publicSourceUrl } from "../../../src/lib/content-library/publicSourceUrl";
import { supabase } from "../../../src/lib/supabase/client";

/**
 * Follow-up questions written from the law that applies to the person's
 * story (/api/intake/sourced-questions, retrieval/sourcedQuestions.ts), shown
 * in all three intakes before the analysis. Each shows the provision it comes
 * from. Answering is optional; the answers are added to what the person told
 * us, in their own words, under a heading that says what they are.
 */

export type ClientSourcedQuestion = {
  id: string;
  question: string;
  why: string;
  citation: string;
  sourceUrl?: string;
};

export type SourcedQuestionsState = "idle" | "loading" | "ready" | "none";

export const MAX_SOURCED_ANSWER_LENGTH = 800;

/** The answered questions as text to add to the story; empty when none are answered. */
export function sourcedAnswersText(questions: readonly ClientSourcedQuestion[], answers: Record<string, string>): string {
  const lines = questions
    .map((question) => {
      const answer = (answers[question.id] ?? "").trim().slice(0, MAX_SOURCED_ANSWER_LENGTH);
      return answer ? `Q: ${question.question}\nA: ${answer}` : "";
    })
    .filter(Boolean);
  return lines.length > 0 ? `Answers to follow-up questions about the law that applies:\n${lines.join("\n")}` : "";
}

/** The story with the answers added, or the story unchanged. */
export function withSourcedAnswers(story: string, questions: readonly ClientSourcedQuestion[], answers: Record<string, string>): string {
  const extra = sourcedAnswersText(questions, answers);
  return extra ? `${story.trim()}\n\n${extra}` : story;
}

/**
 * Fetches the questions once per story text; a changed story is asked about
 * again, and a reply for an older text is ignored.
 */
export function useSourcedQuestions(courtPath: "small-claims" | "civil" | "family") {
  const [state, setState] = useState<SourcedQuestionsState>("idle");
  const [questions, setQuestions] = useState<ClientSourcedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const askedFor = useRef<string>("");

  const start = useCallback(
    async (story: string, side?: string) => {
      const text = story.trim();
      if (text.length < 40 || text.length > 8_000) return;
      if (askedFor.current === text) return;
      askedFor.current = text;
      setState("loading");
      try {
        // Signed-in only, like every route that sends a story to a model.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers = {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        };
        const base = { story: text, courtPath, ...(side ? { side } : {}) };
        // Two calls, each with a whole request's time: research, then the
        // questions from the passages it found (route.ts explains why).
        const first = (await (
          await fetch("/api/intake/sourced-questions", { method: "POST", headers, body: JSON.stringify(base) })
        ).json()) as { passageIds?: string[]; situation?: string };
        if (askedFor.current !== text) return;
        const passageIds = Array.isArray(first.passageIds) ? first.passageIds : [];
        if (passageIds.length === 0) {
          setState("none");
          return;
        }
        const response = await fetch("/api/intake/sourced-questions", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...base, passageIds, situation: first.situation ?? "" }),
        });
        const data = (await response.json()) as { ok?: boolean; questions?: ClientSourcedQuestion[] };
        if (askedFor.current !== text) return;
        const list = Array.isArray(data.questions) ? data.questions.slice(0, 5) : [];
        setQuestions(list);
        setAnswers({});
        setState(list.length > 0 ? "ready" : "none");
      } catch {
        if (askedFor.current === text) setState("none");
      }
    },
    [courtPath],
  );

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value.slice(0, MAX_SOURCED_ANSWER_LENGTH) }));
  }, []);

  return { state, questions, answers, setAnswer, start };
}

export function SourcedQuestionsCard({
  state,
  questions,
  answers,
  setAnswer,
  footer,
}: {
  state: SourcedQuestionsState;
  questions: readonly ClientSourcedQuestion[];
  answers: Record<string, string>;
  setAnswer: (id: string, value: string) => void;
  footer?: ReactNode;
}) {
  if (state === "loading") {
    return (
      <div data-testid="sourced-questions-loading" className="rounded-xl border border-[#d9e7e1] bg-[#f6fbf9] p-4 text-sm text-[#4d675f]">
        Reading the law that applies to what you told us, to see what else matters for your situation…
      </div>
    );
  }
  if (state !== "ready" || questions.length === 0) return null;
  return (
    <section data-testid="sourced-questions" className="rounded-xl border border-[#d9e7e1] bg-[#f6fbf9] p-4 text-sm text-[#1f3b33]">
      <h3 className="text-base font-semibold">Questions the law raises for your situation</h3>
      <p className="mt-1 text-[#4d675f]">
        We read the law that applies to what you told us. It makes these points matter, and your story does not cover them
        yet. Answer any you can, in your own words. Skip any you do not know.
      </p>
      <ol className="mt-3 space-y-4">
        {questions.map((question) => {
          const link = publicSourceUrl(question.sourceUrl);
          return (
            <li key={question.id}>
              <label htmlFor={`sq-${question.id}`} className="font-semibold">
                {question.question}
              </label>
              <textarea
                id={`sq-${question.id}`}
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                rows={2}
                maxLength={MAX_SOURCED_ANSWER_LENGTH}
                className="mt-1 w-full rounded-lg border border-[#c9dcd4] bg-white p-2"
              />
              <p className="mt-1 text-xs text-[#4d675f]">
                Why we ask: {question.why}{" "}
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer" className="font-semibold underline">
                    {question.citation}
                  </a>
                ) : (
                  <span className="font-semibold">{question.citation}</span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      {footer}
    </section>
  );
}
