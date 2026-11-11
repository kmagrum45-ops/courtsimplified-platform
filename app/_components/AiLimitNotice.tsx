"use client";

/**
 * THE AI-HELP LIMIT, SAID ON EVERY SCREEN (site owner, 10 Nov 2026; aiSpendLimit.ts).
 *
 * When the server refuses a model call for the daily spending limit it sets a cookie holding the Toronto day
 * (AI_LIMIT_COOKIE). This notice, in the shared layout, shows the owner's words while that mark is today's. It checks
 * every few seconds, so it appears soon after the refused request returns, on whatever screen made it. Reads a cookie
 * only: no storage of its own, no request.
 */

import { useEffect, useState } from "react";

import { todayInOntario } from "@/src/lib/case-system/dates";
import { AI_LIMIT_WORDS, aiLimitMarkedToday } from "@/src/lib/security/limitWords";

export default function AiLimitNotice() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const check = () => setShown(aiLimitMarkedToday(document.cookie, todayInOntario()));
    check();
    const timer = window.setInterval(check, 2_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!shown) return null;
  return (
    <div data-testid="ai-limit-notice" role="status" className="border-b border-[#ead9a7] bg-[#fffaf0] px-6 py-3 text-sm text-[#5c4a14] print:hidden">
      <p className="mx-auto max-w-7xl">{AI_LIMIT_WORDS}</p>
    </div>
  );
}
