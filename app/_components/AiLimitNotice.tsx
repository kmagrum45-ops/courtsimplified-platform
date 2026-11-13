"use client";

/**
 * THE AI-HELP LIMIT, SAID ON EVERY SCREEN (site owner, 10 Nov 2026; aiSpendLimit.ts).
 *
 * When the server refuses a model call for a spending limit it sets a cookie naming that limit and when it ends
 * (AI_LIMIT_COOKIE, limitWords.ts limitMark). This notice, in the shared layout, shows that limit's words (the hour's
 * limit and the time help is back, or the owner's words for a day's limit) until the limit ends, and goes when a later
 * call succeeds (the server clears the cookie). It checks every few seconds, so it appears soon after the refused
 * request returns, on whatever screen made it. Reads a cookie only: no storage of its own, no request.
 */

import { useEffect, useState } from "react";

import { limitNoticeWords } from "@/src/lib/security/limitWords";

export default function AiLimitNotice() {
  const [words, setWords] = useState<string | null>(null);
  useEffect(() => {
    const check = () => setWords(limitNoticeWords(document.cookie, Date.now()));
    check();
    const timer = window.setInterval(check, 2_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!words) return null;
  return (
    <div data-testid="ai-limit-notice" role="status" className="border-b border-[#ead9a7] bg-[#fffaf0] px-6 py-3 text-sm text-[#5c4a14] print:hidden">
      <p className="mx-auto max-w-7xl">{words}</p>
    </div>
  );
}
