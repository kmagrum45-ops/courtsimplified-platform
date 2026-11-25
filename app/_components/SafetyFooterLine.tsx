import Link from "next/link";

/**
 * THE SAFETY LINE IN EVERY PAGE'S FOOTER (site owner, 2026-10-29, verbatim): "always one
 * small-print line in the footer, 'If you feel you are in immediate danger, call 911',
 * with a link to the other support lines." Rendered once, by the root layout, so every
 * page has it by construction and no page can be missed off. Family matters get the same
 * line; their own safety questions are unchanged. The fuller support information shows
 * only when what the person said names danger (SafetyNotice.tsx), once.
 */
export const SAFETY_FOOTER_LINE = "If you feel you are in immediate danger, call 911";
export const SUPPORT_LINES_HREF = "/support";

export default function SafetyFooterLine() {
  return (
    <p data-testid="safety-footer-line" className="text-xs leading-5 text-[#7B8491]">
      {SAFETY_FOOTER_LINE}.{" "}
      <Link href={SUPPORT_LINES_HREF} className="font-semibold underline transition hover:text-[#2FB8AC]">
        Other support lines
      </Link>
    </p>
  );
}
