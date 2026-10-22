"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase/client";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";
import { startSignIn } from "./startSignIn";

/**
 * Single nav slot that reads as "Sign in" or "My Workspace" depending on
 * auth state. Mirrors the getUser()+onAuthStateChange pattern already used
 * by HomeLocationGate rather than introducing a second way to read the
 * session.
 *
 * With `account` (the header and the narrow-screen menu), a signed-in person
 * also sees who they are signed in as and a Log out button, on every page
 * (L25: Log out was only on My cases). The header shows the email only on wide
 * screens (emailClassName), so a long address never pushes Log out off-screen.
 */
export default function AuthNavAction({ className, account = false, emailClassName = "" }: { className?: string; account?: boolean; emailClassName?: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setSignedIn(Boolean(data.user));
      setEmail(data.user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logOut() {
    // As the dashboard's Log out: clear first, so nothing survives even if the request fails.
    resetIntakeInBrowser();
    await supabase.auth.signOut().catch(() => {});
    window.location.assign("/login");
  }

  if (!signedIn) {
    return (
      // Through startSignIn, so a guest intake open in this tab comes with them (guestCarry.ts).
      <a href="/login" onClick={(event) => { event.preventDefault(); startSignIn(); }} className={className} data-testid="header-sign-in">
        Sign in
      </a>
    );
  }

  const workspace = (
    <Link href="/dashboard" className={className}>
      My Workspace
    </Link>
  );
  if (!account) return workspace;
  return (
    <>
      {email ? (
        <span data-testid="signed-in-as" title={email} className={`max-w-[16rem] truncate text-sm text-[#4B5563] ${emailClassName}`}>
          Signed in as {email}
        </span>
      ) : null}
      {workspace}
      <button type="button" data-testid="header-log-out" onClick={() => void logOut()} className="text-sm font-semibold text-[#2f7d67] underline">
        Log out
      </button>
    </>
  );
}
