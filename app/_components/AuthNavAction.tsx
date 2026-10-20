"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase/client";
import { startSignIn } from "./startSignIn";

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
    // Through startSignIn, so a guest intake open in this tab comes with them (guestCarry.ts).
    <a href="/login" onClick={(event) => { event.preventDefault(); startSignIn(); }} className={className} data-testid="header-sign-in">
      Sign in
    </a>
  );
}
