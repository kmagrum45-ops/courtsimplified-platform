"use client";

/**
 * The server's answer to "which approval-tier and AI-advice features are on
 * for this person", for every screen (site owner, 2026-10-29: "production
 * defaults off, owner allowlist").
 *
 * The page starts with the anonymous answer the server rendered (`initial`:
 * on production everything off; off production what each switch says). Once
 * the browser knows who is signed in it asks /api/capabilities, which checks
 * the verified user against the server-side tester list, and again on every
 * sign-in or sign-out. A component reads it with useCapabilities(); library
 * code running in the browser reads the same answer through
 * capabilityAccess.clientCapabilities(), so a switch read in the browser never
 * decides on its own. If the request fails, the anonymous answer stays.
 *
 * *** ON PRODUCTION, A SIGNED-IN PAGE WAITS FOR ITS ANSWER (review of PR #513) ***
 *
 * Library code reads the answer when it runs, not through a hook, so when the
 * answer changes the page below has to be mounted afresh. The first version
 * mounted the page with the anonymous answer and remounted it when a tester's
 * arrived: every mount effect (load or recover the case, start an analysis, a
 * save) ran twice, possibly two model calls, and anything typed was lost. Now,
 * on production, when there is a session:
 *   - on page load, the server-rendered page stays on screen but is not brought
 *     to life (a Suspense boundary that does not hydrate) until the answer
 *     arrives; then the page mounts once, with that answer;
 *   - on signing in (in the visible tab: the login page, which then navigates),
 *     the page is replaced by a short "Loading" note until the answer arrives,
 *     and the page navigated to mounts once, with it.
 * Never on before the answer: while waiting, the held answer is the anonymous
 * one, and a failed or slow (HOLD_TIMEOUT_MS) request falls back to it.
 * Nobody signed in, and every non-production deployment, never waits: there
 * the answer is known at render.
 *
 * Asserted by tests/browser/capability-hold.spec.ts (a production server).
 */
import { Suspense, createContext, use, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { ALL_CAPABILITIES_OFF, type CapabilitySet } from "@/src/lib/case-system/policy/capabilities";
import { setClientCapabilities, clientCapabilities } from "@/src/lib/case-system/policy/capabilityAccess";
import { storedAuthSessionExists } from "@/src/lib/case-system/storage/authSessionPresence";
import { supabase } from "@/src/lib/supabase/client";

const CapabilityContext = createContext<CapabilitySet | null>(null);

/** A slow answer is not waited for longer than this; the anonymous answer is used. */
const HOLD_TIMEOUT_MS = 8_000;

/** Never settles: a held boundary stays held until the provider replaces it. */
const NEVER = new Promise<never>(() => undefined);

/** Renders the page, or suspends while the answer is awaited. */
function HoldUntilAnswer({ waiting, children }: { waiting: boolean; children: ReactNode }) {
  if (waiting) use(NEVER);
  return <>{children}</>;
}

function WaitingNote() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[#4f685f]" aria-live="polite" aria-busy="true">
      Loading…
    </main>
  );
}

export default function CapabilityProvider({
  initial,
  production,
  children,
}: {
  initial: CapabilitySet;
  /** The server's word that this deployment is production (capabilityAccess.onProductionDeployment). */
  production: boolean;
  children: ReactNode;
}) {
  const [capabilities, setCapabilitiesState] = useState<CapabilitySet>(initial);
  // Decided once, at the first render in the browser; on the server always false, so the
  // server renders the page (an anonymous visitor's first paint never waits).
  const [waiting, setWaiting] = useState<boolean>(() => production && typeof window !== "undefined" && storedAuthSessionExists());
  /*
   * A new key mounts the page afresh. It changes when the answer arrives after a wait
   * (which also discards a server-rendered page that was never brought to life), and
   * when the answer changes for a page already mounted (a sign-out on production).
   */
  const [generation, setGeneration] = useState(0);
  const held = useRef<CapabilitySet>(initial);
  const waitingRef = useRef(waiting);
  const userRef = useRef<string | null | undefined>(undefined);

  const settle = useCallback((next: CapabilitySet) => {
    const changed = !sameAnswer(held.current, next);
    held.current = next;
    setCapabilitiesState(next);
    if (waitingRef.current) {
      waitingRef.current = false;
      setWaiting(false);
      setGeneration((value) => value + 1);
    } else if (changed) {
      setGeneration((value) => value + 1);
    }
  }, []);

  // Set before the children render, so code they call in this render reads it.
  if (typeof window !== "undefined") setClientCapabilities(capabilities);

  useEffect(() => {
    let active = true;
    let asked = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load(token: string | null | undefined, userId: string | null) {
      const ask = ++asked;
      // A person signing in on THIS page (the visible tab; a background tab that hears of a
      // sign-in elsewhere keeps its page and is remounted only if its answer changes).
      const signingIn =
        production && userId !== null && userRef.current !== undefined && userRef.current !== userId &&
        document.visibilityState === "visible";
      userRef.current = userId;
      if (!token) {
        if (active && ask === asked) settle(initial);
        return;
      }
      if (signingIn && !waitingRef.current) {
        // A new person on a mounted page: take the page down until their answer is known.
        waitingRef.current = true;
        setWaiting(true);
      }
      clearTimeout(timer);
      if (waitingRef.current) {
        timer = setTimeout(() => {
          if (active && ask === asked && waitingRef.current) settle(initial);
        }, HOLD_TIMEOUT_MS);
      }
      try {
        const response = await fetch("/api/capabilities", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const body = (await response.json()) as { capabilities?: CapabilitySet };
        if (!active || ask !== asked) return;
        settle(response.ok && body.capabilities ? body.capabilities : held.current);
      } catch {
        // The answer held stays (the anonymous one, if nothing else arrived).
        if (active && ask === asked) settle(held.current);
      }
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.access_token, data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.access_token, session?.user.id ?? null);
    });
    return () => {
      active = false;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, [initial, production, settle]);

  return (
    <CapabilityContext.Provider value={capabilities}>
      <Suspense key={generation} fallback={<WaitingNote />}>
        <HoldUntilAnswer waiting={waiting}>{children}</HoldUntilAnswer>
      </Suspense>
    </CapabilityContext.Provider>
  );
}

function sameAnswer(a: CapabilitySet, b: CapabilitySet): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key as keyof CapabilitySet] === b[key as keyof CapabilitySet]);
}

/** The answer for the person on this page; re-renders the caller when it changes. Off until known. */
export function useCapabilities(): CapabilitySet {
  return useContext(CapabilityContext) ?? (clientCapabilities() as CapabilitySet | null) ?? ALL_CAPABILITIES_OFF;
}
