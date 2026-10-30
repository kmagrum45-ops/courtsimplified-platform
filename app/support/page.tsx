import { SAFETY_FOOTER_LINE } from "../_components/SafetyFooterLine";
import { SUPPORT_LINES_TEXT, VICTIM_SUPPORT_LINE, SUPPORT_LINE_SOURCES } from "@/src/lib/content-library/supportLines";

/**
 * /support: the other support lines, linked from the safety line in every page's footer
 * (SafetyFooterLine.tsx). Reviewed wording only (supportLines.ts); every number carries
 * the ontario.ca page it was read on and the date.
 */
export const metadata = { title: "Support lines | CourtSimplified" };

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-[#1F2937]" data-testid="support-lines">
      <h1 className="text-2xl font-bold">Support lines</h1>
      <p className="mt-4 font-semibold">{SAFETY_FOOTER_LINE}.</p>
      <p className="mt-4 whitespace-pre-line text-sm leading-6">{SUPPORT_LINES_TEXT}</p>
      <p className="mt-1 text-sm leading-6">{VICTIM_SUPPORT_LINE}</p>
      <h2 className="mt-8 text-base font-semibold">Sources</h2>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-[#4B5563]">
        {SUPPORT_LINE_SOURCES.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a> (checked {source.checked})
          </li>
        ))}
      </ul>
    </div>
  );
}
