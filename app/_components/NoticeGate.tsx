"use client";

/**
 * THE "BEFORE YOU START" NOTICE BEFORE A PAGE THAT CAN START WORK (site owner, 16 Nov 2026).
 *
 * "No analysis, AI request or next-step work may begin until the person has accepted the notice." The builder and the
 * home page held their work for it; the case pages (overview, timeline, documents, forms, drafts, case file) and the
 * public forms page did not, so a person with no recorded acceptance -- an older saved case, a new device, site data
 * cleared -- could start work there without ever seeing it.
 *
 * This gate draws only the notice (and "Loading..." while it is not known) until it is accepted, and the page only once
 * it is: nothing inside it is drawn, so nothing inside it can send work before. The same notice, the same acceptance
 * record (acknowledgement.ts, through noticeStatus.ts), never asked again once accepted. test:notice-gate fails when a
 * page or layout that can send work is drawn outside one.
 */
import type { ReactNode } from "react";
import { useState } from "react";

import FirstUseAcknowledgement from "./FirstUseAcknowledgement";

export default function NoticeGate({ children }: { children: ReactNode }) {
  const [outstanding, setOutstanding] = useState<boolean | null>(null);
  if (outstanding !== false) {
    return (
      <main data-testid="notice-gate" className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-[#16302b] sm:px-6">
        <FirstUseAcknowledgement onStatus={setOutstanding} />
        {outstanding === null && (
          <p className="text-sm text-[#4d675f]" aria-live="polite">
            Loading…
          </p>
        )}
      </main>
    );
  }
  return <>{children}</>;
}
