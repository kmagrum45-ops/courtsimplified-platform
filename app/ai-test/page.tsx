"use client";

import { useMemo, useRef, useState } from "react";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  structured?: unknown;
};

type ApiResponse = {
  answer?: string;
  userFacingAnswer?: string;
  structuredCaseUnderstanding?: unknown;
  casePlan?: unknown;
  validation?: unknown;
  safety?: unknown;
  error?: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to display structured output.";
  }
}

export default function AITestPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      createdAt: new Date().toISOString(),
      content:
        "Tell me the story of the case in your own words. Include what happened, who is involved, what stage you are at, what documents or evidence you have, and what you want CourtSimplified to help you prepare.",
    },
  ]);

  const [input, setInput] = useState("");
  const [showStructured, setShowStructured] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const conversationForApi = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-case-partner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversation: [...conversationForApi, userMessage].slice(-12),
          mode: "sandbox-test",
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "The AI Case Partner could not respond.");
      }

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        createdAt: new Date().toISOString(),
        content:
          data.userFacingAnswer ||
          data.answer ||
          "I understood the request, but no user-facing answer was returned.",
        structured: {
          structuredCaseUnderstanding: data.structuredCaseUnderstanding,
          casePlan: data.casePlan,
          validation: data.validation,
          safety: data.safety,
        },
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        createdAt: new Date().toISOString(),
        content:
          error instanceof Error
            ? `Something went wrong: ${error.message}`
            : "Something went wrong while contacting the AI Case Partner.",
      };

      setMessages((current) => [...current, assistantMessage]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function clearSandbox() {
    setMessages([
      {
        id: makeId(),
        role: "assistant",
        createdAt: new Date().toISOString(),
        content:
          "Sandbox reset. Tell me a new case story and I will test whether the AI Case Partner can understand it.",
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            CourtSimplified Sandbox
          </p>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                AI Case Partner Test Workspace
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                This page tests the new AI reasoning layer outside the production
                workflow. Use it to test whether the AI understands the case,
                identifies missing proof, explains risks, and recommends the
                next practical step without changing the main site.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowStructured((value) => !value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showStructured ? "Hide structured output" : "Show structured output"}
              </button>

              <button
                type="button"
                onClick={clearSandbox}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Reset sandbox
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-lg font-bold">Conversation Test</h2>
              <p className="mt-1 text-sm text-slate-600">
                Try real scenarios: family, civil, small claims, motions,
                affidavits, conferences, settlement, evidence, or trial prep.
              </p>
            </div>

            <div className="flex h-[620px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-3xl p-4 ${
                      message.role === "user"
                        ? "ml-auto max-w-[85%] bg-cyan-700 text-white"
                        : "mr-auto max-w-[92%] border border-slate-200 bg-slate-50 text-slate-900"
                    }`}
                  >
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-75">
                      {message.role === "user" ? "User" : "AI Case Partner"}
                    </div>

                    <div className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </div>

                    {showStructured && message.structured ? (
                      <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900">
                        <summary className="cursor-pointer text-sm font-semibold">
                          Structured reasoning output
                        </summary>
                        <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                          {safeJson(message.structured)}
                        </pre>
                      </details>
                    ) : null}
                  </article>
                ))}

                {isLoading ? (
                  <div className="mr-auto max-w-[92%] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    AI Case Partner is analyzing the case story…
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-200 p-4">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Paste or type a full case story here. Include facts, timeline, evidence, what stage you are at, and what you want to prepare."
                  className="min-h-36 w-full resize-y rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-6 outline-none ring-cyan-600 focus:ring-2"
                />

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Press Ctrl+Enter to send. This sandbox does not save to the
                    main case file yet.
                  </p>

                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isLoading ? "Analyzing…" : "Send to AI Case Partner"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">What to test</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <p>
                  Test whether the AI identifies the user’s goal, procedural
                  stage, missing proof, likely risks, judge concerns, opposing
                  arguments, and next best step.
                </p>
                <p>
                  The AI should guide the user without exposing rejected internal
                  classifications unless it is necessary to prevent a serious
                  mistake.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Good sandbox scenarios</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                <li>Small Claims defamation with screenshots and witnesses.</li>
                <li>Family custody dispute before a case conference.</li>
                <li>Civil negligence claim with unclear causation.</li>
                <li>Motion materials where evidence is missing.</li>
                <li>Settlement conference preparation.</li>
                <li>Trial preparation with weak proof or contradictions.</li>
              </ul>
            </section>

            <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-cyan-950">
                Development rule
              </h2>
              <p className="mt-3 text-sm leading-6 text-cyan-950">
                This page is a testing lab only. Do not connect it to production
                case memory, form generation, Supabase storage, or the main
                builder until the AI reasoning is tested and trusted.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}