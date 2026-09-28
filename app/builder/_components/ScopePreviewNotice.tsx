import { scopeIsPreviewOnly, type ScopeKey } from "../../../src/lib/case-system/policy/a2iScope";

/**
 * Shown wherever a capability is on only because of the testing preview
 * (a2iScope.ts). Renders nothing for real users, and nothing in production,
 * where the preview never applies.
 */
export default function ScopePreviewNotice({ scope }: { scope: ScopeKey }) {
  if (!scopeIsPreviewOnly(scope)) return null;
  return (
    <p
      data-testid="scope-preview-notice"
      className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-[#5a4410]"
    >
      Testing preview: this feature is waiting for Law Society (A2I) approval and is not shown to real users.
    </p>
  );
}
