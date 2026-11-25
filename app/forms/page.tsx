"use client";

import FormsWorkspace from "./FormsWorkspace";
import NoticeGate from "../_components/NoticeGate";

/**
 * /forms: the official forms catalogue. With ?caseId= the request is sent to
 * the case page's Forms section instead (next.config.ts), where the same tool
 * renders inside the case.
 */
export default function FormsPage() {
  // The notice first when no acceptance is recorded: form generation is work (site owner, 16 Nov 2026; NoticeGate.tsx).
  return <NoticeGate><FormsWorkspace /></NoticeGate>;
}
