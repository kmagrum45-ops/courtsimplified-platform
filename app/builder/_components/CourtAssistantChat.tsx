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
  chatSessionId?: string;
  masterResult?: any;
  evidenceData?: any;
  strategyData?: any;
  workspaceDocument?: any;
  proceduralStage?: string;
  onMasterResultUpdate?: (patch: any) => void;
  onDashboardUpdate?: (patch: any) => void;
  onRecommendedRoute?: (route: string) => void;
  onRoutingStatusChange?: (ready: boolean) => void;
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

type StoredChatState = {
  messages?: unknown;
  caseMemory?: any;
  latestIntelligence?: any;
  latestInvestigation?: any;
  recommendedRoute?: string | null;
  systemWarnings?: unknown;
  routingConfirmed?: boolean;
};

type CourtPathGuidance = {
  title: string;
  message: string;
  routingMode: "civil-choice" | "direct-civil" | "family";
};

const quickActions = [
  "What is the most important thing I should clarify next?",
  "What evidence am I missing?",
  "What legal issues should be reviewed?",
  "What would a judge likely be concerned about?",
  "What should I fix before generating documents?",
];

const STORAGE_PREFIX = "courtsimplified-ai-case-partner-chat";
const ROUTE_TRANSFER_KEY = `${STORAGE_PREFIX}:route-transfer`;

function safeJsonParse(value: string | null): StoredChatState | null {
  try {
    return value ? (JSON.parse(value) as StoredChatState) : null;
  } catch {
    return null;
  }
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function extractClaimAmount(message: string): number | null {
  const normalized = normalize(message);

  if (
    ![
      "claim",
      "claimed",
      "compensation",
      "damage",
      "damages",
      "money owed",
      "owed me",
      "sue",
      "suing",
      "seeking",
      "want",
    ].some((term) => normalized.includes(term))
  ) {
    return null;
  }

  const amountPattern =
    /\$?\s*(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand)?\b/gi;
  const amounts: number[] = [];

  for (const match of normalized.matchAll(amountPattern)) {
    const matchIndex = match.index ?? 0;
    const beforeAmount = normalized.slice(
      Math.max(0, matchIndex - 32),
      matchIndex,
    );
    const afterAmount = normalized.slice(
      matchIndex + match[0].length,
      matchIndex + match[0].length + 16,
    );

    const hasCurrencyContext =
      match[0].includes("$") ||
      Boolean(match[2]) ||
      /^\s*(?:dollars?|cad)\b/.test(afterAmount) ||
      /(?:claim(?:ed)?|amount|seeking|sue for)\s+(?:of\s+)?$/.test(
        beforeAmount,
      );

    if (!hasCurrencyContext) {
      continue;
    }

    const baseAmount = Number(match[1].replace(/[,\s]/g, ""));
    const multiplier = match[2] ? 1000 : 1;
    const amount = baseAmount * multiplier;

    if (Number.isFinite(amount) && amount >= 0) {
      amounts.push(amount);
    }
  }

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = clean(value);
    const key = normalize(text);

    if (!text || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(text);
  }

  return result;
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        ((item as any).role === "assistant" ||
          (item as any).role === "user") &&
        typeof (item as any).content === "string",
    )
    .map(
      (item): ChatMessage => ({
        role:
          (item as any).role === "assistant"
            ? "assistant"
            : "user",
        content: clean((item as any).content),
      }),
    )
    .filter((item) => item.content.length > 0);
}

function buildWarnings(data: AiCasePartnerResponse): string[] {
  return uniqueStrings([
    ...(data.caseInvestigation?.validation?.warnings || []),
    ...(data.conversationIntelligence?.validation?.needsLegalVerification ||
      []),
    ...(data.conversationMemory?.memory?.warnings || []),
  ])
    .filter((warning) => {
      const normalized = normalize(warning);

      return (
        !normalized.startsWith("possible ") &&
        !normalized.includes("reasoning profile")
      );
    })
    .slice(0, 8);
}

function buildCourtPathGuidance(
  selectedPath: string | undefined,
  intelligence: any,
  routingConfirmed: boolean,
  detectedClaimAmount: number | null,
): CourtPathGuidance | null {
  const currentPath = clean(selectedPath);
  const detectedArea = clean(
    intelligence?.conversationFocus?.courtArea,
  );

  if (
    routingConfirmed ||
    !currentPath ||
    !detectedArea ||
    detectedArea === "unknown" ||
    detectedArea === "mixed"
  ) {
    return null;
  }

  if (detectedArea === "family") {
    if (currentPath === "family") {
      return null;
    }

    return {
      title: "This may be the wrong court path",
      message:
        "The facts currently appear connected to a Family Court matter rather than the selected court path.",
      routingMode: "family",
    };
  }

  if (detectedArea === "civil" || detectedArea === "small-claims") {
    if (
      currentPath === "small-claims" &&
      detectedClaimAmount !== null &&
      detectedClaimAmount > 50000
    ) {
      return {
        title: "Small Claims Court limit exceeded",
        message: `You indicated a claim of ${formatCurrency(
          detectedClaimAmount,
        )}. This exceeds Ontario Small Claims Court's $50,000 monetary limit. Based on the amount stated, proceed through a Superior Court of Justice civil action.`,
        routingMode: "direct-civil",
      };
    }

    const title =
      currentPath === "family"
        ? "This may be the wrong court path"
        : currentPath === "small-claims"
          ? "Confirm Small Claims Court eligibility"
          : "Confirm Civil Court eligibility";

    const message =
      currentPath === "family"
        ? "The facts currently describe a civil dispute rather than a Family Court matter. CourtSimplified must confirm the province, amount claimed, and requested remedy before continuing in the correct intake."
        : "CourtSimplified must confirm the province, total amount claimed, and requested remedy before opening the structured intake.";

    return {
      title,
      message,
      routingMode: "civil-choice",
    };
  }

  return null;
}

function buildRecommendedRoute(
  data: AiCasePartnerResponse,
): string | null {
  const investigation = data.caseInvestigation;

  if (!investigation) {
    return null;
  }

  if (investigation.evidenceNeeded?.length > 0) {
    return "/evidence";
  }

  if (
    investigation.validation?.safeToUseForWorkflow ||
    investigation.proceduralStage !== "unknown"
  ) {
    return "/case-dashboard";
  }

  if (investigation.issues?.length > 0) {
    return "/litigation-strategy";
  }

  return null;
}

function buildStorageKey(args: {
  caseId?: string;
  path?: string;
  chatSessionId?: string;
}): string {
  const caseId = clean(args.caseId);
  const sessionId = clean(args.chatSessionId);
  const path = clean(args.path) || "unknown";

  if (caseId) {
    return `${STORAGE_PREFIX}:case:${caseId}`;
  }

  if (sessionId) {
    return `${STORAGE_PREFIX}:session:${sessionId}`;
  }

  return `${STORAGE_PREFIX}:draft:${path}`;
}

export default function CourtAssistantChat({
  caseData,
  caseId,
  path,
  chatSessionId,
  masterResult,
  evidenceData,
  strategyData,
  workspaceDocument,
  proceduralStage,
  onMasterResultUpdate,
  onDashboardUpdate,
  onRecommendedRoute,
  onRoutingStatusChange,
}: CourtAssistantChatProps) {
  const initialAssistantMessage = useMemo<ChatMessage>(
    () => ({
      role: "assistant",
      content:
        "Tell me what happened in normal words. I’ll help organize the case, identify missing facts, track evidence, spot legal issues to review, and ask the next most useful question.",
    }),
    [],
  );

  const storageKey = useMemo(
    () =>
      buildStorageKey({
        caseId,
        path,
        chatSessionId,
      }),
    [caseId, path, chatSessionId],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    initialAssistantMessage,
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydratedStorageKey, setHydratedStorageKey] = useState("");
  const [caseMemory, setCaseMemory] = useState<any>(null);
  const [latestIntelligence, setLatestIntelligence] =
    useState<any>(null);
  const [latestInvestigation, setLatestInvestigation] =
    useState<any>(null);
  const [recommendedRoute, setRecommendedRoute] =
    useState<string | null>(null);
  const [systemWarnings, setSystemWarnings] = useState<string[]>([]);
  const [routingProvince, setRoutingProvince] = useState("Ontario");
  const [routingAmount, setRoutingAmount] = useState("");
  const [routingRelief, setRoutingRelief] = useState<
    "money-or-property" | "other-relief"
  >("money-or-property");
  const [routingError, setRoutingError] = useState("");
  const [routingConfirmed, setRoutingConfirmed] = useState(false);

  const detectedClaimAmount = useMemo(() => {
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    return latestUserMessage
      ? extractClaimAmount(latestUserMessage.content)
      : null;
  }, [messages]);

  const courtPathGuidance = useMemo(
    () =>
      buildCourtPathGuidance(
        path,
        latestIntelligence,
        routingConfirmed,
        detectedClaimAmount,
      ),
    [
      detectedClaimAmount,
      latestIntelligence,
      path,
      routingConfirmed,
    ],
  );

  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(storageKey));
    let transferredMessages: ChatMessage[] = [];

    try {
      const rawTransfer = sessionStorage.getItem(ROUTE_TRANSFER_KEY);
      const transfer = rawTransfer ? JSON.parse(rawTransfer) : null;

      if (transfer?.targetPath === path) {
        transferredMessages = normalizeMessages(transfer.messages);
        setRoutingConfirmed(true);
        onRoutingStatusChange?.(true);
        sessionStorage.removeItem(ROUTE_TRANSFER_KEY);
      } else {
        const savedRoutingConfirmed =
          saved?.routingConfirmed === true;

        setRoutingConfirmed(savedRoutingConfirmed);
        onRoutingStatusChange?.(savedRoutingConfirmed);
      }
    } catch {
      sessionStorage.removeItem(ROUTE_TRANSFER_KEY);
      setRoutingConfirmed(false);
      onRoutingStatusChange?.(false);
    }

    const normalizedMessages =
      transferredMessages.length > 0
        ? transferredMessages
        : normalizeMessages(saved?.messages);

    setMessages(
      normalizedMessages.length > 0
        ? normalizedMessages
        : [initialAssistantMessage],
    );

    setCaseMemory(
      transferredMessages.length > 0 ? null : saved?.caseMemory || null,
    );
    setLatestIntelligence(
      transferredMessages.length > 0
        ? null
        : saved?.latestIntelligence || null,
    );
    setLatestInvestigation(
      transferredMessages.length > 0
        ? null
        : saved?.latestInvestigation || null,
    );

    setSystemWarnings(
      uniqueStrings(
        Array.isArray(saved?.systemWarnings)
          ? saved.systemWarnings
          : [],
      ),
    );

    setRecommendedRoute(
      typeof saved?.recommendedRoute === "string"
        ? saved.recommendedRoute
        : null,
    );

    setInput("");
    setLoading(false);
    setRoutingProvince("Ontario");
    setRoutingAmount("");
    setRoutingRelief("money-or-property");
    setRoutingError("");
    setHydratedStorageKey(storageKey);
  }, [initialAssistantMessage, onRoutingStatusChange, path, storageKey]);

  useEffect(() => {
    if (hydratedStorageKey !== storageKey) {
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        messages,
        caseMemory,
        latestIntelligence,
        latestInvestigation,
        recommendedRoute,
        systemWarnings,
        routingConfirmed,
      }),
    );
  }, [
    storageKey,
    hydratedStorageKey,
    messages,
    caseMemory,
    latestIntelligence,
    latestInvestigation,
    recommendedRoute,
    systemWarnings,
    routingConfirmed,
  ]);

  async function sendMessage(customMessage?: string) {
    const trimmed = clean(customMessage ?? input);

    if (!trimmed || loading) {
      return;
    }

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
        throw new Error(
          data?.error ||
            "CourtSimplified AI Case Partner error.",
        );
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

      const coreAnswer =
        clean(data.answer) ||
        clean(data.userFacingAnswer) ||
        "CourtSimplified could not generate a response right now.";

      const pathGuidance = buildCourtPathGuidance(
        path,
        data.conversationIntelligence,
        routingConfirmed,
        extractClaimAmount(trimmed),
      );

      const detectedArea = clean(
        data.conversationIntelligence?.conversationFocus?.courtArea,
      );

      if (
        !pathGuidance &&
        detectedArea === "family" &&
        path === "family"
      ) {
        setRoutingConfirmed(true);
        onRoutingStatusChange?.(true);
      }

      const answer = pathGuidance
        ? `${pathGuidance.message}\n\nBefore CourtSimplified continues, confirm the routing information shown below.`
        : coreAnswer;

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (error) {
      console.error(
        "CourtSimplified AI Case Partner error:",
        error,
      );

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

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearCurrentChat() {
    localStorage.removeItem(storageKey);

    setMessages([initialAssistantMessage]);
    setInput("");
    setCaseMemory(null);
    setLatestIntelligence(null);
    setLatestInvestigation(null);
    setRecommendedRoute(null);
    setSystemWarnings([]);
    setRoutingAmount("");
    setRoutingError("");
    setRoutingConfirmed(false);
    onRoutingStatusChange?.(false);
  }

  function continueInCorrectCourt(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (courtPathGuidance?.routingMode === "family") {
      transferToCourtPath("family");
      return;
    }

    if (!routingAmount.trim()) {
      setRoutingError(
        "Enter the total amount being claimed using numbers, for example 10000.",
      );
      return;
    }

    const numericAmount = Number(
      routingAmount.replace(/[$,\s]/g, ""),
    );

    if (routingProvince !== "Ontario") {
      setRoutingError(
        "CourtSimplified currently needs Ontario selected before it can apply the Ontario court limits.",
      );
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setRoutingError(
        "Enter the total amount being claimed using numbers, for example 10000.",
      );
      return;
    }

    const targetPath =
      numericAmount <= 50000 &&
      routingRelief === "money-or-property"
        ? "small-claims"
        : "civil";

    if (targetPath === path) {
      setRoutingConfirmed(true);
      onRoutingStatusChange?.(true);
      setRoutingError("");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            targetPath === "small-claims"
              ? "The court-path check is complete. This claim can continue in the Ontario Small Claims intake based on the information provided."
              : "The court-path check is complete. This claim can continue in the Ontario Civil Court intake based on the information provided.",
        },
      ]);
      return;
    }

    transferToCourtPath(targetPath);
  }

  function transferToCourtPath(targetPath: string) {

    sessionStorage.setItem(
      ROUTE_TRANSFER_KEY,
      JSON.stringify({
        targetPath,
        messages,
        routingConfirmed: true,
        transferredAt: new Date().toISOString(),
      }),
    );

    window.location.assign(`/builder?path=${targetPath}`);
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
      <div className="border-b border-[#d8e6df] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
              AI Case Partner
            </p>

            <h2 className="text-xl font-bold text-[#10231f]">
              CourtSimplified Case Companion
            </h2>
          </div>

          <button
            type="button"
            onClick={clearCurrentChat}
            disabled={loading}
            className="rounded-xl border border-[#c9d9d2] bg-white px-4 py-2 text-xs font-semibold text-[#4d675f] hover:bg-[#f4fbf8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear this conversation
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-[#4d675f]">
          CourtSimplified uses the AI Case Partner pipeline to
          organize your story, remember this case, identify missing
          information, review proof gaps, and ask focused follow-up
          questions.
        </p>

        {recommendedRoute && (
          <div className="mt-4 rounded-2xl border border-[#d5ebe2] bg-[#f4fbf8] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
              Suggested workflow step
            </p>

            <p className="mt-1 text-sm text-[#16302b]">
              Recommended next page:
              <span className="ml-2 font-semibold">
                {recommendedRoute}
              </span>
            </p>
          </div>
        )}

        {latestInvestigation?.issues?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {latestInvestigation.issues
              .slice(0, 5)
              .map((issue: any) => (
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

      {courtPathGuidance && (
        <div className="border-b border-[#ead9a7] bg-[#fffaf0] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6517]">
            Court path review
          </p>

          <h3 className="mt-2 text-base font-bold text-[#5f4715]">
            {courtPathGuidance.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#6e5726]">
            {courtPathGuidance.message}
          </p>

          {courtPathGuidance.routingMode === "family" ? (
            <button
              type="button"
              onClick={() => transferToCourtPath("family")}
              className="mt-4 rounded-full bg-[#725514] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5f4715]"
            >
              Continue in the Family Court intake
            </button>
          ) : courtPathGuidance.routingMode === "direct-civil" ? (
            <button
              type="button"
              onClick={() => transferToCourtPath("civil")}
              className="mt-4 rounded-full bg-[#725514] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5f4715]"
            >
              Proceed to Superior Court Civil Intake
            </button>
          ) : (
          <form
              onSubmit={continueInCorrectCourt}
              className="mt-4 grid gap-4 rounded-2xl border border-[#ead9a7] bg-white p-4 md:grid-cols-3"
            >
            <label className="text-sm font-semibold text-[#5f4715]">
              Province
              <select
                value={routingProvince}
                onChange={(event) =>
                  setRoutingProvince(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-[#d9bd72] bg-white px-3 py-2 font-normal text-[#16302b]"
              >
                <option value="Ontario">Ontario</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-[#5f4715]">
              Total amount claimed
              <input
                value={routingAmount}
                onChange={(event) => {
                  setRoutingAmount(event.target.value);
                  setRoutingError("");
                }}
                inputMode="decimal"
                placeholder="Example: 10000"
                className="mt-2 w-full rounded-xl border border-[#d9bd72] bg-white px-3 py-2 font-normal text-[#16302b]"
              />
            </label>

            <label className="text-sm font-semibold text-[#5f4715]">
              Remedy requested
              <select
                value={routingRelief}
                onChange={(event) =>
                  setRoutingRelief(
                    event.target.value as
                      | "money-or-property"
                      | "other-relief",
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d9bd72] bg-white px-3 py-2 font-normal text-[#16302b]"
              >
                <option value="money-or-property">
                  Money or return of property
                </option>
                <option value="other-relief">
                  Another type of court order
                </option>
              </select>
            </label>

            <div className="md:col-span-3">
              {routingError && (
                <p className="mb-3 text-sm font-semibold text-[#a63b3b]">
                  {routingError}
                </p>
              )}

              <button
                type="submit"
                className="rounded-full bg-[#725514] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5f4715]"
              >
                Continue in the correct court intake
              </button>

              <p className="mt-3 text-xs leading-5 text-[#7a673a]">
                In Ontario, Small Claims Court generally handles claims
                for money or return of personal property up to $50,000,
                excluding interest and costs. Other remedies or larger
                claims may require Civil Court review.
              </p>
            </div>
            </form>
          )}
        </div>
      )}

      {systemWarnings.length > 0 && (
        <div className="border-b border-[#ead9a7] bg-[#fffaf0] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8a6517]">
            Information still to confirm
          </p>

          <div className="space-y-2">
            {systemWarnings.slice(0, 4).map((warning) => (
              <div
                key={normalize(warning)}
                className="rounded-xl border border-[#ead9a7] bg-white px-3 py-2 text-sm text-[#6e5726]"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {!courtPathGuidance && (
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
      )}

      <div className="max-h-[500px] space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}-${message.content.slice(
              0,
              30,
            )}`}
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
            CourtSimplified is reviewing this case and choosing the
            next focused response...
          </div>
        )}
      </div>

      {!courtPathGuidance && (
      <div className="border-t border-[#d8e6df] p-4">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full resize-none rounded-2xl border border-[#c9d9d2] p-3 text-sm text-[#16302b] outline-none focus:border-[#2f7d67] focus:ring-2 focus:ring-[#d8eee7]"
          placeholder="Tell CourtSimplified what happened in normal words."
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#6b8078]">
            CourtSimplified helps organize litigation information.
            Verify final court requirements before filing.
          </p>

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white hover:bg-[#276b58] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Reviewing..." : "Ask Case Partner"}
          </button>
        </div>
      </div>
      )}
    </section>
  );
}
