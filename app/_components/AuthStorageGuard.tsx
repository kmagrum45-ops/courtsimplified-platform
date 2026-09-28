"use client";

import { useEffect } from "react";
import { supabase } from "../../src/lib/supabase/client";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";

/**
 * Clears every trace of case content from this browser whenever the session
 * ends, however it ends: the Log out button, a session that expires, or a
 * sign-out in another tab.
 *
 * Mounted once in the root layout so it is on every page. The dashboard's
 * Log out button used to be the only place that cleared anything, and it
 * cleared a hand-written list of ten keys out of twenty-six.
 *
 * Sign-IN clearing is done by the login page itself, after a successful
 * sign-in and before it navigates. It is not done here because supabase-js can
 * re-emit SIGNED_IN for an existing session (for example when a tab regains
 * focus), and wiping mid-session would break a case in progress.
 */
export default function AuthStorageGuard() {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetIntakeInBrowser();
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return null;
}
