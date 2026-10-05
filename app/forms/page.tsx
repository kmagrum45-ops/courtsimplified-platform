"use client";

import FormsWorkspace from "./FormsWorkspace";

/**
 * /forms: the official forms catalogue. With ?caseId= the request is sent to
 * the case page's Forms section instead (next.config.ts), where the same tool
 * renders inside the case.
 */
export default function FormsPage() {
  return <FormsWorkspace />;
}
