"use client";

import { A2I_SCOPE, approvedForRealUsers, type ScopeKey } from "../../../src/lib/case-system/policy/a2iScope";
import { useCapabilities } from "../../_components/CapabilityProvider";

/**
 * Shown wherever a capability is on only because of the testing preview or
 * the owner's live-testing decision (a2iScope.ts) -- i.e. it has no Law
 * Society (A2I) approval yet. Renders nothing for an approved capability, and
 * nothing where the server says the capability is off for this person (on
 * production: everyone but a listed tester, 2026-10-29).
 */
export default function ScopePreviewNotice({ scope }: { scope: ScopeKey }) {
  const capabilities = useCapabilities();
  if (!capabilities[scope] || approvedForRealUsers(A2I_SCOPE[scope])) return null;
  return (
    <p
      data-testid="scope-preview-notice"
      className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-[#5a4410]"
    >
      Testing: this feature is switched on while we test it, and is waiting for approval from the Law Society of Ontario under its Access to Innovation program.
    </p>
  );
}
