"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase/client";

/**
 * Single nav slot that reads as "Sign in" or "My Workspace" depending on
 * auth state. Mirrors the getUser()+onAuthStateChange pattern already used
 * by HomeLocationGate rather than introducing a second way to read the
 * session.
 */
export default function AuthNavAction({ className }: { className?: string }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return signedIn ? (
    <Link href="/dashboard" className={className}>
      My Workspace
    </Link>
  ) : (
    <Link href="/login" className={className}>
      Sign in
    </Link>
  );
}
