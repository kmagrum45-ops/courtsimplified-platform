import { scopeIsPreviewOnly, type ScopeKey } from "../../../src/lib/case-system/policy/a2iScope";
import { TESTING_NOTICE_TEXT } from "../../../src/lib/case-system/policy/testingNotice";

/**
 * Shown wherever a capability is on only because of the testing preview or
 * the owner's live-testing decision (a2iScope.ts) -- i.e. it has no Law
 * Society (A2I) approval yet. Renders nothing for an approved capability.
 * Its words are the one shared copy, TESTING_NOTICE_TEXT (testingNotice.ts).
 */
export default function ScopePreviewNotice({ scope }: { scope: ScopeKey }) {
  if (!scopeIsPreviewOnly(scope)) return null;
  return (
    <p
      data-testid="scope-preview-notice"
      className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-[#5a4410]"
    >
      {TESTING_NOTICE_TEXT}
    </p>
  );
}
