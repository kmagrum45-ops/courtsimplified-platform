"use client";

/**
 * Guided Small Claims intake -- one question at a time, answered through a
 * chat-style conversation, powered by /api/intake/guided-turn (the real
 * QUESTION_BANK, no devPreview flag). This is a separate, lighter-weight
 * path from SmallClaimsIntake.tsx's structured form: it collects facts
 * conversationally and does not produce an AnalysisResult, so it does not
 * feed into the builder's case-save/analysis pipeline the form path uses.
 */

import { useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";

type IntakeFacts = Record<string, string | number | boolean>;

type VoiceTurn = {
  leadIn: string | null;
  questionText: string;
  fellBackToPlainText: boolean;
};

type IntakeQuestion = {
  id: string;
  text: string;
};

type GuidedTurnResult = {
  halted: boolean;
  haltMessage?: string;
  distressAcknowledgment?: string;
  facts: IntakeFacts;
  answeredIds: string[];
  nextQuestion?: IntakeQuestion;
  voiceTurn?: VoiceTurn;
  intakeComplete: boolean;
};

type ChatMessage = { from: "user" | "assistant"; text: string };

type Props = {
  location: { province: "Ontario"; city: string };
  initialStory: string;
};

export default function GuidedSmallClaimsIntake({ initialStory }: Props) {
  const [facts, setFacts] = useState<IntakeFacts>({});
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState(initialStory || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [halted, setHalted] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [started, setStarted] = useState(false);

  async function sendTurn(newStoryText: string | undefined, newAnsweredIds: string[], nextFacts: IntakeFacts) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/intake/guided-turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ facts: nextFacts, answeredIds: newAnsweredIds, newStoryText }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError(json.error || "That didn't go through. Please try again.");
        setLoading(false);
        return;
      }

      const result: GuidedTurnResult = json.result;
      setFacts(result.facts);
      setAnsweredIds(result.answeredIds);

      if (result.halted) {
        setHalted(true);
        setMessages((current) => [
          ...current,
          { from: "assistant", text: result.haltMessage || "Intake stopped here." },
        ]);
        setCurrentQuestion(null);
        setLoading(false);
        return;
      }

      if (result.distressAcknowledgment) {
        setMessages((current) => [...current, { from: "assistant", text: result.distressAcknowledgment as string }]);
      }

      if (result.intakeComplete || !result.nextQuestion) {
        setIntakeComplete(true);
        setMessages((current) => [
          ...current,
          {
            from: "assistant",
            text: "That's everything needed for now. You can review what you've entered, or continue to the next step whenever you're ready.",
          },
        ]);
        setCurrentQuestion(null);
        setLoading(false);
        return;
      }

      const displayText = [result.voiceTurn?.leadIn, result.voiceTurn?.questionText ?? result.nextQuestion.text]
        .filter(Boolean)
        .join("\n\n");
      setMessages((current) => [...current, { from: "assistant", text: displayText }]);
      setCurrentQuestion(result.nextQuestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleStorySubmit() {
    if (!inputText.trim()) return;
    setStarted(true);
    setMessages((current) => [...current, { from: "user", text: inputText }]);
    const story = inputText;
    setInputText("");
    void sendTurn(story, answeredIds, facts);
  }

  function handleAnswerSubmit() {
    if (!currentQuestion) return;
    const answerText = inputText.trim();
    if (answerText) {
      setMessages((current) => [...current, { from: "user", text: answerText }]);
    }
    const nextAnsweredIds = [...answeredIds, currentQuestion.id];
    setInputText("");
    void sendTurn(answerText || undefined, nextAnsweredIds, facts);
  }

  function handleSend() {
    if (!started) handleStorySubmit();
    else if (currentQuestion) handleAnswerSubmit();
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4" style={{ minHeight: 220 }}>
        {messages.length === 0 ? (
          <p className="text-sm text-[#5a736a]">
            Describe what happened in your own words below to get started. CourtSimplified will ask
            follow-up questions one at a time.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className="mb-3"
              style={{ textAlign: message.from === "user" ? "right" : "left" }}
            >
              <div
                className="inline-block rounded-2xl px-4 py-2 text-sm"
                style={{
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                  background: message.from === "user" ? "#16302b" : "#ffffff",
                  color: message.from === "user" ? "#ffffff" : "#16302b",
                  border: message.from === "user" ? "none" : "1px solid #d8e6df",
                }}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-[#a63b3b]">{error}</p> : null}

      {!halted && !intakeComplete ? (
        <div className="mt-4 flex gap-2">
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder={currentQuestion ? "Your answer..." : "Tell us what happened..."}
            className="min-h-12 flex-1 rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            disabled={loading || !inputText.trim()}
            onClick={handleSend}
            className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-[#4d675f]">
          {halted ? "Intake stopped here." : "Guided intake complete."}
        </p>
      )}
    </div>
  );
}
