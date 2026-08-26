import Link from "next/link";

/**
 * The platform's one disclaimer. Before this component existed, the same
 * idea was hand-rewritten five different ways across the site (home,
 * /family, /legal-principles, /privacy, and nowhere at all on the pages that
 * most needed it -- litigation-strategy, trial-package,
 * settlement-conference, dashboard/cases/[id]). Wording is copied verbatim
 * from app/privacy/page.tsx, which stays the canonical source; this
 * component should be the only other place the sentence appears.
 */
export default function LegalInformationNotice() {
  return (
    <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#4d675f]">
      CourtSimplified provides legal information only, not legal advice, and
      is not a law firm. Using this site does not create a lawyer-client
      relationship.{" "}
      <Link
        href="/privacy"
        className="font-semibold text-[#2f7d67] underline"
      >
        Read more
      </Link>
    </div>
  );
}
