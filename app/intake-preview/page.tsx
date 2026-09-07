"use client";

/**
 * DEV_ONLY -- LOCAL PIPELINE PREVIEW, NOT A REAL PRODUCT SCREEN.
 *
 * Session 12. A deliberately unpolished click-through of the guided
 * intake pipeline (Sessions 3-11), talking to /api/intake/guided-turn
 * with ?devPreview=true so it uses DEV_ONLY_testReviewedBank.ts's 8
 * hand-picked "reviewed" questions instead of the real QUESTION_BANK
 * (whose entries are all still status: "draft" -- see that route for the
 * actual gate). This route is new and clearly named "preview" -- it is
 * NOT linked from /builder, /small-claims, or anywhere else a real user
 * would encounter it. Nothing about visiting this page is part of the
 * live product.
 *
 * You must be signed in for this to work -- /api/intake/guided-turn
 * requires real authentication, same as every other AI-invoking route in
 * this repo (see that route's file header). This page just clicks
 * through the conversation locally; it doesn't manage its own auth.
 */

import { useState } from "react";
import { supabase } from "../../src/lib/supabase/client";

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

type PossibleCorrection = {
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
};

type GuidedTurnResult = {
  safetyClassification?: string;
  halted: boolean;
  haltMessage?: string;
  distressAcknowledgment?: string;
  facts: IntakeFacts;
  answeredIds: string[];
  matchedClaimTypes: { claimType: { id: string; name: string }; matchedSignals: string[] }[];
  nextQuestion?: IntakeQuestion;
  voiceTurn?: VoiceTurn;
  intakeComplete: boolean;
  possibleCorrections: PossibleCorrection[];
};

type ChatMessage = { from: "user" | "assistant"; text: string };

export default function IntakePreviewPage() {
  const [facts, setFacts] = useState<IntakeFacts>({});
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [halted, setHalted] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [lastRawResult, setLastRawResult] = useState<GuidedTurnResult | null>(null);

  async function sendTurn(newStoryText: string | undefined, newAnsweredIds: string[]) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/intake/guided-turn?devPreview=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ facts, answeredIds: newAnsweredIds, newStoryText }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError(json.error || `Request failed (${response.status}).`);
        setLoading(false);
        return;
      }

      const result: GuidedTurnResult = json.result;
      setLastRawResult(result);
      setFacts(result.facts);
      setAnsweredIds(result.answeredIds);

      if (result.halted) {
        setHalted(true);
        setMessages((current) => [...current, { from: "assistant", text: result.haltMessage || "Intake halted." }]);
        setCurrentQuestion(null);
        setLoading(false);
        return;
      }

      if (result.distressAcknowledgment) {
        setMessages((current) => [...current, { from: "assistant", text: result.distressAcknowledgment as string }]);
      }

      if (result.intakeComplete || !result.nextQuestion) {
        setIntakeComplete(true);
        setMessages((current) => [...current, { from: "assistant", text: "Guided intake complete -- no more questions." }]);
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleStorySubmit() {
    if (!inputText.trim()) return;
    setMessages((current) => [...current, { from: "user", text: inputText }]);
    const story = inputText;
    setInputText("");
    void sendTurn(story, answeredIds);
  }

  function handleAnswerSubmit() {
    if (!currentQuestion) return;
    const answerText = inputText.trim();
    if (answerText) {
      setMessages((current) => [...current, { from: "user", text: answerText }]);
    }
    const nextAnsweredIds = [...answeredIds, currentQuestion.id];
    setInputText("");
    void sendTurn(answerText || undefined, nextAnsweredIds);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff3cd", border: "1px solid #ffe69c", borderRadius: 8, padding: 12, marginBottom: 20 }}>
        <strong>DEV_ONLY preview.</strong> Not a real product screen. Uses DEV_ONLY_testReviewedBank.ts
        (developer-flipped, not licensee-reviewed) via <code>?devPreview=true</code>, which only works
        outside production. You must be signed in for this to work.
      </div>

      <h1>Guided intake pipeline preview</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, minHeight: 200, marginBottom: 16 }}>
        {messages.length === 0 ? (
          <p style={{ color: "#888" }}>Describe your situation below to start.</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: 12,
                textAlign: message.from === "user" ? "right" : "left",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: message.from === "user" ? "#16302b" : "#f0f0f0",
                  color: message.from === "user" ? "#fff" : "#000",
                  whiteSpace: "pre-wrap",
                  maxWidth: "85%",
                }}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <p style={{ color: "red" }}>{error}</p> : null}

      {!halted && !intakeComplete ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder={currentQuestion ? "Your answer..." : "Describe what happened..."}
            style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (currentQuestion) handleAnswerSubmit();
              else handleStorySubmit();
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => (currentQuestion ? handleAnswerSubmit() : handleStorySubmit())}
            style={{ padding: "8px 16px", borderRadius: 6, background: "#16302b", color: "#fff", border: "none" }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      ) : (
        <p>
          <em>{halted ? "Intake halted." : "Intake complete."}</em>
        </p>
      )}

      <details style={{ marginTop: 24 }}>
        <summary>Raw result (debug)</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f8f8f8", padding: 12 }}>
          {JSON.stringify(lastRawResult, null, 2)}
        </pre>
      </details>
    </main>
  );
}
