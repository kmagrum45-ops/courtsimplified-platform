"use client";

import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CourtAssistantChatProps = {
  caseData?: any;
  caseId?: string;
  path?: string;
  masterResult?: any;
  evidenceData?: any;
  strategyData?: any;
  workspaceDocument?: any;
  proceduralStage?: string;
  onMasterResultUpdate?: (patch: any) => void;
  onDashboardUpdate?: (patch: any) => void;
  onRecommendedRoute?: (route: string) => void;
};

type AiCasePartnerResponse = {
  ok: boolean;
  answer?: string;
  userFacingAnswer?: string;
  caseMemory?: any;
  conversationIntelligence?: any;
  conversationMemory?: any;
  caseInvestigation?: any;
  gateway?: any;
  result?: any;
  error?: string;
};

const quickActions = [
  "What is the most important thing I should clarify next?",
  "What evidence am I missing?",
  "What legal issues should be reviewed?",
  "What would a judge likely be concerned about?",
  "What should I fix before generating documents?",
];

const STORAGE_KEY = "courtsimplified-ai-case-partner-chat";

function safeJsonParse(value: string | null) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as any).role &&
        (item as any).content,
    )
    .map((item) => ({
      role: (item as any).role === "assistant" ? "assistant" : "user",
      content: String((item as any).content || ""),
    }));
}

function buildWarnings(data: AiCasePartnerResponse): string[] {
  return [
    ...(data.caseInvestigation?.validation?.warnings || []),
    ...(data.conversationIntelligence?.validation?.needsLegalVerification || []),
    ...(data.conversationMemory?.memory?.warnings || []),
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function buildRecommendedRoute(data: AiCasePartnerResponse): string | null {
  const investigation = data.caseInvestigation;

  if (!investigation) return null;

  if (investigation.evidenceNeeded?.length > 0) return "/evidence";

  if (
    investigation.validation?.safeToUseForWorkflow ||
    investigation.proceduralStage !== "unknown"
  ) {
    return "/case-dashboard";
  }

  if (investigation.issues?.length > 0) return "/litigation-strategy";

  return null;
}

export default function CourtAssistantChat({
  caseData,
  caseId,
  path,
  masterResult,
  evidenceData,
  strategyData,
  workspaceDocument,
  proceduralStage,
  onMasterResultUpdate,
  onDashboardUpdate,
  onRecommendedRoute,
}: CourtAssistantChatProps) {
  const initialAssistantMessage = useMemo<ChatMessage>(
    () => ({
      role: "assistant",
      content:
        "Tell me what happened in normal words. I’ll help organize the case, identify missing facts, track evidence, spot legal issues to review, and ask the next most useful question.",
    }),
    [],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    initialAssistantMessage,
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [caseMemory, setCaseMemory] = useState<any>(null);
  const [latestIntelligence, setLatestIntelligence] = useState<any>(null);
  const [latestInvestigation, setLatestInvestigation] = useState<any>(null);
  const [recommendedRoute, setRecommendedRoute] = useState<string | null>(null);
  const [systemWarnings, setSystemWarnings] = useState<string[]>([]);

  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY));

    if (!saved) return;

    const normalized = normalizeMessages(saved.messages);

    if (normalized.length > 0) setMessages(normalized);
    if (saved.caseMemory) setCaseMemory(saved.caseMemory);
    if (saved.latestIntelligence) setLatestIntelligence(saved.latestIntelligence);
    if (saved.latestInvestigation) setLatestInvestigation(saved.latestInvestigation);
    if (Array.isArray(saved.systemWarnings)) setSystemWarnings(saved.systemWarnings);
    if (saved.recommendedRoute) setRecommendedRoute(saved.recommendedRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
        caseMemory,
        latestIntelligence,
        latestInvestigation,
        recommendedRoute,
        systemWarnings,
      }),
    );
  }, [
    messages,
    caseMemory,
    latestIntelligence,
    latestInvestigation,
    recommendedRoute,
    systemWarnings,
  ]);

  async function sendMessage(customMessage?: string) {
    const trimmed = (customMessage ?? input).trim();

    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai-case-partner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          caseId,
          mode: "builder-chat",
          caseMemory: caseMemory || {
            caseData,
            masterResult,
            evidenceData,
            strategyData,
            workspaceDocument,
            proceduralStage,
            path,
          },
          conversation: nextMessages,
        }),
      });

      const data: AiCasePartnerResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "CourtSimplified AI Case Partner error.");
      }

      if (data.caseMemory) {
        setCaseMemory(data.caseMemory);
        onMasterResultUpdate?.({
          aiCasePartnerMemory: data.caseMemory,
        });
      }

      if (data.conversationIntelligence) {
        setLatestIntelligence(data.conversationIntelligence);
      }

      if (data.caseInvestigation) {
        setLatestInvestigation(data.caseInvestigation);

        onDashboardUpdate?.({
          aiCasePartnerInvestigation: data.caseInvestigation,
        });
      }

      const route = buildRecommendedRoute(data);

      if (route) {
        setRecommendedRoute(route);
        onRecommendedRoute?.(route);
      }

      setSystemWarnings(buildWarnings(data));

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.answer ||
            data.userFacingAnswer ||
            "CourtSimplified could not generate a response right now.",
        },
      ]);
    } catch (error) {
      console.error("CourtSimplified AI Case Partner error:", error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "CourtSimplified could not respond right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
      <div className="border-b border-[#d8e6df] p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
          AI Case Partner
        </p>

        <h2 className="text-xl font-bold text-[#10231f]">
          CourtSimplified Case Companion
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#4d675f]">
          CourtSimplified now uses the AI Case Partner pipeline to understand
          your story, remember the case, investigate legal issues, identify
          missing proof, and ask the next useful question.
        </p>

        {recommendedRoute && (
          <div className="mt-4 rounded-2xl border border-[#d5ebe2] bg-[#f4fbf8] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
              Suggested workflow step
            </p>

            <p className="mt-1 text-sm text-[#16302b]">
              Recommended next page:
              <span className="ml-2 font-semibold">{recommendedRoute}</span>
            </p>
          </div>
        )}

        {latestInvestigation?.issues?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {latestInvestigation.issues.slice(0, 5).map((issue: any) => (
              <div
                key={issue.id || issue.label}
                className="rounded-full bg-[#e7f5ef] px-3 py-1 text-xs font-semibold text-[#2f7d67]"
              >
                {issue.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {systemWarnings.length > 0 && (
        <div className="border-b border-[#f0d7d7] bg-[#fff8f8] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#a63b3b]">
            Case partner warnings
          </p>

          <div className="space-y-2">
            {systemWarnings.slice(0, 4).map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                className="rounded-xl border border-[#f0d7d7] bg-white px-3 py-2 text-sm text-[#7a2d2d]"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-[#d8e6df] p-4">
        <p className="mb-3 text-sm font-semibold text-[#16302b]">
          Suggested questions
        </p>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => sendMessage(action)}
              disabled={loading}
              className="rounded-full border border-[#b8d8cc] bg-[#f4fbf8] px-4 py-2 text-sm font-medium text-[#2f7d67] hover:bg-[#e8f6f1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[500px] space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-auto max-w-[88%] rounded-2xl bg-[#2f7d67] px-4 py-3 text-sm text-white"
                : "mr-auto max-w-[88%] rounded-2xl bg-[#f1f5f3] px-4 py-3 text-sm text-[#24463d]"
            }
          >
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mr-auto max-w-[88%] rounded-2xl bg-[#f1f5f3] px-4 py-3 text-sm text-[#4d675f]">
            CourtSimplified is using the AI Case Partner to update memory,
            investigate issues, check missing proof, and choose the next useful
            question...
          </div>
        )}
      </div>

      <div className="border-t border-[#d8e6df] p-4">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full resize-none rounded-2xl border border-[#c9d9d2] p-3 text-sm text-[#16302b] outline-none focus:border-[#2f7d67] focus:ring-2 focus:ring-[#d8eee7]"
          placeholder="Tell CourtSimplified what happened. You can use normal words. The system will help identify facts, parties, evidence, legal issues, missing proof, and the next question."
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#6b8078]">
            CourtSimplified helps organize litigation information. Verify final
            court requirements before filing.
          </p>

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white hover:bg-[#276b58] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Investigating..." : "Ask Case Partner"}
          </button>
        </div>
      </div>
    </section>
  );
}