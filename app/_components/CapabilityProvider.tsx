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
 */
import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { ALL_CAPABILITIES_OFF, type CapabilitySet } from "@/src/lib/case-system/policy/capabilities";
import { setClientCapabilities, clientCapabilities } from "@/src/lib/case-system/policy/capabilityAccess";
import { supabase } from "@/src/lib/supabase/client";

const CapabilityContext = createContext<CapabilitySet | null>(null);

export default function CapabilityProvider({ initial, children }: { initial: CapabilitySet; children: ReactNode }) {
  const [capabilities, setCapabilitiesState] = useState<CapabilitySet>(initial);
  /*
   * Library code in the browser (the deadline engine, the case position) reads the answer
   * when it runs, not through a hook, so a component that only calls it would keep showing
   * the old answer. When the answer CHANGES the page below is mounted afresh, so everything
   * reads the new one. It changes only for a listed tester on production (anonymous answer:
   * all off; theirs: on) and on signing in or out there; off production a person's answer
   * equals the anonymous one, so nothing is remounted.
   */
  const [generation, setGeneration] = useState(0);
  const held = useRef<CapabilitySet>(initial);
  const setCapabilities = useCallback((next: CapabilitySet) => {
    if (sameAnswer(held.current, next)) return;
    held.current = next;
    setCapabilitiesState(next);
    setGeneration((value) => value + 1);
  }, []);
  // Set before the children render, so code they call in this render reads it.
  if (typeof window !== "undefined") setClientCapabilities(capabilities);

  useEffect(() => {
    let active = true;
    let asked = 0;
    async function load(token: string | null | undefined) {
      const ask = ++asked;
      if (!token) {
        if (active && ask === asked) setCapabilities(initial);
        return;
      }
      try {
        const response = await fetch("/api/capabilities", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const body = (await response.json()) as { capabilities?: CapabilitySet };
        if (active && ask === asked && response.ok && body.capabilities) setCapabilities(body.capabilities);
      } catch {
        /* the anonymous answer stays */
      }
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.access_token));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.access_token);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [initial, setCapabilities]);

  return (
    <CapabilityContext.Provider value={capabilities}>
      <Fragment key={generation}>{children}</Fragment>
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
