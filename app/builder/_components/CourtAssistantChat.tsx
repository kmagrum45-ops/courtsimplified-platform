"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  extractNarrativePrefill,
  persistNarrativePrefill,
} from "../../../src/lib/case-system/intelligence/narrativePrefill";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CourtAssistantChatProps = {
  caseData?: unknown;
  caseId?: string;
  path?: string;
  chatSessionId?: string;
  masterResult?: unknown;
  evidenceData?: unknown;
  strategyData?: unknown;
  workspaceDocument?: unknown;
  proceduralStage?: string;
  onMasterResultUpdate?: (patch: unknown) => void;
  onDashboardUpdate?: (patch: unknown) => void;
  onRecommendedRoute?: (route: string) => void;
  onRoutingStatusChange?: (ready: boolean) => void;
};

function knownLocation(value: unknown): { province: string; city: string } {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const intake = record.intake && typeof record.intake === "object"
    ? record.intake as Record<string, unknown>
    : record;
  const extra = intake.extra && typeof intake.extra === "object"
    ? intake.extra as Record<string, unknown>
    : {};
  const civilInput = extra.civilInput && typeof extra.civilInput === "object"
    ? extra.civilInput as Record<string, unknown>
    : {};
  return {
    province: clean(extra.province || civilInput.province || extra.yourProvince),
    city: clean(extra.city || civilInput.city || extra.yourCity),
  };
}

type ValidationState = {
  warnings?: unknown;
  needsLegalVerification?: unknown;
  safeToUseForWorkflow?: boolean;
};

type ConversationIntelligence = {
  validation?: ValidationState;
  conversationFocus?: {
    courtArea?: unknown;
  };
};

type ConversationMemory = {
  memory?: {
    warnings?: unknown;
  };
};

type InvestigationIssue = {
  id?: unknown;
  label?: unknown;
};

type CaseInvestigation = {
  validation?: ValidationState;
  evidenceNeeded?: unknown;
  proceduralStage?: unknown;
  issues?: unknown;
};

type AiCasePartnerResponse = {
  ok: boolean;
  answer?: string;
  userFacingAnswer?: string;
  caseMemory?: unknown;
  conversationIntelligence?: ConversationIntelligence;
  conversationMemory?: ConversationMemory;
  caseInvestigation?: CaseInvestigation;
  gateway?: unknown;
  result?: unknown;
  error?: string;
};

type StoredChatState = {
  messages?: unknown;
  caseMemory?: unknown;
  latestIntelligence?: unknown;
  latestInvestigation?: unknown;
  recommendedRoute?: string | null;
  systemWarnings?: unknown;
  routingConfirmed?: boolean;
};

type ResolvedChatState = {
  messages: ChatMessage[];
  caseMemory: unknown;
  latestIntelligence: unknown;
  latestInvestigation: unknown;
  recommendedRoute: string | null;
  systemWarnings: string[];
  routingConfirmed: boolean;
};

export type ChatHydrationSnapshot = {
  phase: "server" | "browser";
  state: ResolvedChatState;
  persistedSerializedState: string | null;
};

export type ChatStorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

type BrowserStoragePair = {
  localStorage: ChatStorageLike;
  sessionStorage: ChatStorageLike;
};

type ChatExternalStore = {
  getServerSnapshot: () => ChatHydrationSnapshot;
  getSnapshot: () => ChatHydrationSnapshot;
  subscribe: (listener: () => void) => () => void;
  persist: (state: ResolvedChatState, serializedState: string) => void;
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

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = Object.freeze({
  role: "assistant",
  content:
    "I have your saved case story and structured intake. What important date, document, or case detail should we clarify next?",
});
const EMPTY_CHAT_STATE: ResolvedChatState = Object.freeze({
  messages: Object.freeze([INITIAL_ASSISTANT_MESSAGE]) as ChatMessage[],
  caseMemory: null,
  latestIntelligence: null,
  latestInvestigation: null,
  recommendedRoute: null,
  systemWarnings: [],
  routingConfirmed: false,
});
const STORAGE_PREFIX = "courtsimplified-ai-case-partner-chat";
const ROUTE_TRANSFER_KEY = `${STORAGE_PREFIX}:route-transfer`;

function serializeChatState(state: ResolvedChatState): string {
  return JSON.stringify({
    messages: state.messages,
    caseMemory: state.caseMemory,
    latestIntelligence: state.latestIntelligence,
    latestInvestigation: state.latestInvestigation,
    recommendedRoute: state.recommendedRoute,
    systemWarnings: state.systemWarnings,
    routingConfirmed: state.routingConfirmed,
  });
}

const EMPTY_CHAT_SNAPSHOT: ChatHydrationSnapshot = Object.freeze({
  phase: "server",
  state: EMPTY_CHAT_STATE,
  persistedSerializedState: serializeChatState(EMPTY_CHAT_STATE),
});

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

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
        ((item as { role?: string }).role === "assistant" ||
          (item as { role?: string }).role === "user") &&
        typeof (item as { content?: unknown }).content === "string",
    )
    .map(
      (item): ChatMessage => ({
        role:
          (item as { role?: string }).role === "assistant"
            ? "assistant"
            : "user",
        content: clean((item as { content?: unknown }).content),
      }),
    )
    .filter((item) => item.content.length > 0);
}

function normalizeIssues(input: unknown): Array<{ id: string; label: string }> {
  return unknownArray(input)
    .map((issue): { id: string; label: string } | null => {
      if (!issue || typeof issue !== "object") {
        return null;
      }

      const candidate = issue as InvestigationIssue;
      const label = clean(candidate.label);

      return label
        ? {
            id: clean(candidate.id) || label,
            label,
          }
        : null;
    })
    .filter((issue): issue is { id: string; label: string } => issue !== null);
}

function buildWarnings(data: AiCasePartnerResponse): string[] {
  return uniqueStrings([
    ...unknownArray(data.caseInvestigation?.validation?.warnings),
    ...unknownArray(
      data.conversationIntelligence?.validation?.needsLegalVerification,
    ),
    ...unknownArray(data.conversationMemory?.memory?.warnings),
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
  intelligence: unknown,
  routingConfirmed: boolean,
  detectedClaimAmount: number | null,
): CourtPathGuidance | null {
  const currentPath = clean(selectedPath);
  const detectedArea =
    intelligence && typeof intelligence === "object"
      ? clean(
          (intelligence as ConversationIntelligence).conversationFocus
            ?.courtArea,
        )
      : "";

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

  if (unknownArray(investigation.evidenceNeeded).length > 0) {
    return "/evidence";
  }

  if (
    investigation.validation?.safeToUseForWorkflow ||
    clean(investigation.proceduralStage) !== "unknown"
  ) {
    return "/case-dashboard";
  }

  if (unknownArray(investigation.issues).length > 0) {
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

function resolveBrowserSnapshot(
  storage: BrowserStoragePair,
  storageKey: string,
  path: string | undefined,
): {
  snapshot: ChatHydrationSnapshot;
  removeRouteTransfer: boolean;
} {
  let saved: StoredChatState | null = null;

  try {
    saved = safeJsonParse(storage.localStorage.getItem(storageKey));
  } catch {
    saved = null;
  }

  let transferredMessages: ChatMessage[] = [];
  let initialRoutingConfirmed = false;
  let routeTransferMatched = false;
  let removeRouteTransfer = false;

  try {
    const rawTransfer = storage.sessionStorage.getItem(ROUTE_TRANSFER_KEY);
    const transfer = rawTransfer
      ? (JSON.parse(rawTransfer) as {
          targetPath?: unknown;
          messages?: unknown;
        })
      : null;

    if (transfer && transfer.targetPath === path) {
      transferredMessages = normalizeMessages(transfer.messages);
      initialRoutingConfirmed = true;
      routeTransferMatched = true;
      removeRouteTransfer = true;
    } else {
      initialRoutingConfirmed = saved?.routingConfirmed === true;
    }
  } catch {
    removeRouteTransfer = true;
  }

  const restoredMessages =
    transferredMessages.length > 0
      ? transferredMessages
      : normalizeMessages(saved?.messages);
  const fromTransfer = transferredMessages.length > 0;
  const state: ResolvedChatState = {
    messages:
      restoredMessages.length > 0
        ? restoredMessages
        : [INITIAL_ASSISTANT_MESSAGE],
    caseMemory: fromTransfer ? null : (saved?.caseMemory ?? null),
    latestIntelligence: fromTransfer
      ? null
      : (saved?.latestIntelligence ?? null),
    latestInvestigation: fromTransfer
      ? null
      : (saved?.latestInvestigation ?? null),
    recommendedRoute:
      typeof saved?.recommendedRoute === "string"
        ? saved.recommendedRoute
        : null,
    systemWarnings: uniqueStrings(
      Array.isArray(saved?.systemWarnings) ? saved.systemWarnings : [],
    ),
    routingConfirmed: initialRoutingConfirmed,
  };

  return {
    snapshot: {
      phase: "browser",
      state,
      persistedSerializedState: routeTransferMatched
        ? null
        : serializeChatState(state),
    },
    removeRouteTransfer,
  };
}

export function createChatExternalStore(args: {
  storageKey: string;
  path?: string;
  isBrowser?: () => boolean;
  getBrowserStorage?: () => BrowserStoragePair;
  subscribeToBrowserStorage?: (
    listener: (changedKey: string | null) => void,
  ) => () => void;
}): ChatExternalStore {
  const isBrowser =
    args.isBrowser ?? (() => typeof window !== "undefined");
  const getBrowserStorage =
    args.getBrowserStorage ??
    (() => ({
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
    }));
  const subscribeToBrowserStorage =
    args.subscribeToBrowserStorage ??
    ((listener: (changedKey: string | null) => void) => {
      const handleStorage = (event: StorageEvent) => listener(event.key);
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    });
  const listeners = new Set<() => void>();
  let browserSnapshot: ChatHydrationSnapshot | null = null;
  let removeRouteTransfer = false;

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function getServerSnapshot() {
    return EMPTY_CHAT_SNAPSHOT;
  }

  function getSnapshot() {
    if (!isBrowser()) {
      return EMPTY_CHAT_SNAPSHOT;
    }

    if (!browserSnapshot) {
      const resolved = resolveBrowserSnapshot(
        getBrowserStorage(),
        args.storageKey,
        args.path,
      );
      browserSnapshot = resolved.snapshot;
      removeRouteTransfer = resolved.removeRouteTransfer;
    }

    return browserSnapshot;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    if (isBrowser() && removeRouteTransfer) {
      try {
        getBrowserStorage().sessionStorage.removeItem(ROUTE_TRANSFER_KEY);
      } catch {
        // Storage cleanup is best-effort; the cached snapshot remains stable.
      }
      removeRouteTransfer = false;
    }

    const unsubscribeStorage = isBrowser()
      ? subscribeToBrowserStorage((changedKey) => {
          if (
            changedKey !== args.storageKey &&
            changedKey !== ROUTE_TRANSFER_KEY
          ) {
            return;
          }

          browserSnapshot = null;
          notify();
        })
      : () => undefined;

    return () => {
      listeners.delete(listener);
      unsubscribeStorage();
    };
  }

  function persist(state: ResolvedChatState, serializedState: string) {
    if (!isBrowser()) {
      return;
    }

    try {
      getBrowserStorage().localStorage.setItem(
        args.storageKey,
        serializedState,
      );
    } catch {
      return;
    }

    browserSnapshot = {
      phase: "browser",
      state,
      persistedSerializedState: serializedState,
    };
    notify();
  }

  return {
    getServerSnapshot,
    getSnapshot,
    subscribe,
    persist,
  };
}

type CourtAssistantChatInnerProps = CourtAssistantChatProps & {
  initialSnapshot: ChatHydrationSnapshot;
  storageKey: string;
  chatStore: ChatExternalStore;
};

function CourtAssistantChatInner({
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
  onRoutingStatusChange,
  initialSnapshot,
  storageKey,
  chatStore,
}: CourtAssistantChatInnerProps) {
  const initialChatState = initialSnapshot.state;
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialChatState.messages,
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [caseMemory, setCaseMemory] = useState<unknown>(
    initialChatState.caseMemory,
  );
  const [latestIntelligence, setLatestIntelligence] = useState<unknown>(
    initialChatState.latestIntelligence,
  );
  const [latestInvestigation, setLatestInvestigation] = useState<unknown>(
    initialChatState.latestInvestigation,
  );
  const [recommendedRoute, setRecommendedRoute] = useState<string | null>(
    initialChatState.recommendedRoute,
  );
  const [systemWarnings, setSystemWarnings] = useState<string[]>(
    initialChatState.systemWarnings,
  );
  const [routingProvince, setRoutingProvince] = useState("Ontario");
  const [routingAmount, setRoutingAmount] = useState("");
  const [routingRelief, setRoutingRelief] = useState<
    "money-or-property" | "other-relief"
  >("money-or-property");
  const [routingError, setRoutingError] = useState("");
  const [routingConfirmed, setRoutingConfirmed] = useState(
    initialChatState.routingConfirmed,
  );
  const lastPersistedSerializedState = useRef(
    initialSnapshot.persistedSerializedState,
  );
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const location = useMemo(() => knownLocation(caseData), [caseData]);

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
    [detectedClaimAmount, latestIntelligence, path, routingConfirmed],
  );

  const investigationIssues = useMemo(
    () =>
      latestInvestigation && typeof latestInvestigation === "object"
        ? normalizeIssues(
            (latestInvestigation as CaseInvestigation).issues,
          )
        : [],
    [latestInvestigation],
  );

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript || !shouldAutoScrollRef.current) return;
    transcript.scrollTop = transcript.scrollHeight;
  }, [messages, loading, systemWarnings, investigationIssues]);

  useEffect(() => {
    if (initialSnapshot.phase === "browser") {
      onRoutingStatusChange?.(initialChatState.routingConfirmed);
    }
  }, [
    initialChatState.routingConfirmed,
    initialSnapshot.phase,
    onRoutingStatusChange,
  ]);

  useEffect(() => {
    const state: ResolvedChatState = {
      messages,
      caseMemory,
      latestIntelligence,
      latestInvestigation,
      recommendedRoute,
      systemWarnings,
      routingConfirmed,
    };
    const serializedState = serializeChatState(state);

    if (serializedState === lastPersistedSerializedState.current) {
      return;
    }

    lastPersistedSerializedState.current = serializedState;
    chatStore.persist(state, serializedState);
  }, [
    caseMemory,
    chatStore,
    latestIntelligence,
    latestInvestigation,
    messages,
    recommendedRoute,
    routingConfirmed,
    storageKey,
    systemWarnings,
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

    if (
      !messages.some((message) => message.role === "user") &&
      (path === "small-claims" || path === "family" || path === "civil")
    ) {
      persistNarrativePrefill(
        extractNarrativePrefill({
          narrative: trimmed,
          courtPath: path,
          caseId,
        }),
      );
    }

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
          courtContext: {
            courtPath: path,
            jurisdiction: location.province || routingProvince,
            city: location.city || undefined,
            stage: proceduralStage,
          },
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
          data?.error || "CourtSimplified AI Case Partner error.",
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
        "CourtSimplified recorded that update. Please add the next missing fact, document, or question you want to organize.";

      const pathGuidance = buildCourtPathGuidance(
        path,
        data.conversationIntelligence,
        routingConfirmed,
        extractClaimAmount(trimmed),
      );

      const detectedArea = clean(
        data.conversationIntelligence?.conversationFocus?.courtArea,
      );

      if (!pathGuidance && detectedArea === "family" && path === "family") {
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
        "CourtSimplified AI Case Partner request failed.",
        error instanceof Error ? { message: error.message } : { message: "unknown" },
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
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
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

    const numericAmount = Number(routingAmount.replace(/[$,\s]/g, ""));

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
      numericAmount <= 50000 && routingRelief === "money-or-property"
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
          Your saved case information is available here. Ask about the next
          detail you need to confirm, a document, or an important date.
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

        {investigationIssues.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {investigationIssues.slice(0, 5).map((issue) => (
              <div
                key={issue.id}
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
                  In Ontario, Small Claims Court generally handles claims for
                  money or return of personal property up to $50,000, excluding
                  interest and costs. Other remedies or larger claims may
                  require Civil Court review.
                </p>
              </div>
            </form>
          )}
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

      <div
        ref={transcriptRef}
        data-testid="case-partner-transcript"
        onScroll={(event) => {
          const element = event.currentTarget;
          shouldAutoScrollRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 72;
        }}
        className="max-h-[500px] space-y-4 overflow-y-auto p-4"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}-${message.content.slice(0, 30)}`}
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
            CourtSimplified is reviewing this case and choosing the next focused
            response...
          </div>
        )}

        {systemWarnings.length > 0 && (
          <div className="border border-[#ead9a7] bg-[#fffaf0] p-4">
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
      </div>

      {!courtPathGuidance && (
        <div className="border-t border-[#d8e6df] p-4">
          <textarea
            disabled={initialSnapshot.phase !== "browser"}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className="w-full resize-none rounded-2xl border border-[#c9d9d2] p-3 text-sm text-[#16302b] outline-none focus:border-[#2f7d67] focus:ring-2 focus:ring-[#d8eee7]"
            placeholder="Ask about an important date, document, or case detail."
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-[#6b8078]">
              CourtSimplified helps organize litigation information. Verify
              final court requirements before filing.
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

export default function CourtAssistantChat(props: CourtAssistantChatProps) {
  const storageKey = useMemo(
    () =>
      buildStorageKey({
        caseId: props.caseId,
        path: props.path,
        chatSessionId: props.chatSessionId,
      }),
    [props.caseId, props.chatSessionId, props.path],
  );
  const chatStore = useMemo(
    () =>
      createChatExternalStore({
        storageKey,
        path: props.path,
      }),
    [props.path, storageKey],
  );
  const subscribe = useCallback(
    (listener: () => void) => chatStore.subscribe(listener),
    [chatStore],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    chatStore.getSnapshot,
    chatStore.getServerSnapshot,
  );

  return (
    <CourtAssistantChatInner
      key={`${storageKey}:${snapshot.phase}`}
      {...props}
      initialSnapshot={snapshot}
      storageKey={storageKey}
      chatStore={chatStore}
    />
  );
}
