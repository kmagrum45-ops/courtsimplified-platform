import { REFERRAL_RESOURCES } from "@/src/lib/content-library/referralResources";

/**
 * "Where a person can help", wherever the site reaches the edge of what it
 * does (master plan finish line: "a case the site cannot fully handle says so
 * and points to help"). Walkthrough, 2026-10-08: pages said "we cannot fill
 * this one in for you yet", "the core intake could not be saved", "this case
 * could not be opened" or left a person with the whole forms catalogue, and
 * none of them said where to turn. The resources are the fixed list in
 * referralResources.ts, the same one the out-of-scope and advice deflections
 * use; the heading says why it is shown, and nothing here grades the case.
 */
export default function GetHelp({
  heading = "Want a person to help with this?",
  why,
  compact = false,
}: {
  heading?: string;
  /** One plain sentence on what the site could not do here. */
  why?: string;
  /** Folded, for places where help is offered but not the point of the page. */
  compact?: boolean;
}) {
  const list = (
    <ul className="mt-2 space-y-2">
      {REFERRAL_RESOURCES.map((resource) => (
        <li key={resource.id} className="text-sm leading-6">
          <a href={resource.url} target="_blank" rel="noreferrer" className="font-semibold text-[#2f7d67] underline">
            {resource.name}
          </a>
          <span className="text-[#4d675f]"> — {resource.description}</span>
        </li>
      ))}
    </ul>
  );
  if (compact) {
    return (
      <details data-testid="get-help" className="mt-3 text-sm text-[#24463d]">
        <summary className="cursor-pointer font-semibold text-[#2f7d67]">{heading}</summary>
        {why ? <p className="mt-2 text-[#4d675f]">{why}</p> : null}
        {list}
      </details>
    );
  }
  return (
    <div data-testid="get-help" role="note" className="mt-4 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#24463d]">
      <p className="font-semibold text-[#10231f]">{heading}</p>
      {why ? <p className="mt-1 text-[#4d675f]">{why}</p> : null}
      {list}
    </div>
  );
}
