"use client";

import {
  PATHWAY_UNAVAILABLE_HEADING,
  pathwayUnavailableMessage,
  type KnownPathway,
} from "@/src/lib/content-library/phaseScope";
import { REFERRAL_RESOURCES } from "@/src/lib/content-library/referralResources";

/**
 * What a user sees when they arrive at a pathway phase 1 does not cover.
 *
 * *** EVERY WORD IS FIXED ***
 *
 * The message is a constant from `phaseScope.ts` with the pathway's own name
 * substituted by code. No model is involved, and nothing here varies with the
 * user's facts.
 *
 * *** WHY IT SHOWS THE REFERRALS ***
 *
 * The alternative — "we don't cover this" and nothing else — sends someone away
 * from a legal problem with nowhere to go, which is the failure the LSO work
 * closed for out-of-scope forums. Turning a person away at the door is exactly
 * when the list of real services is worth the most.
 *
 * It is the same four resources the out-of-scope and legal-advice deflections
 * use, from the same constant, so a change to that list reaches all three.
 */
export default function PathwayUnavailable({ pathway }: { pathway: KnownPathway }) {
  return (
    <section
      role="note"
      aria-live="polite"
      data-testid="pathway-unavailable"
      data-pathway={pathway}
      className="rounded-3xl border-2 border-[#2f7d67] bg-[#f8fcfa] p-5"
    >
      <h2 className="text-lg font-bold text-[#10231f]">{PATHWAY_UNAVAILABLE_HEADING}</h2>

      <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-[#24463d]">
        {pathwayUnavailableMessage(pathway)}
      </p>

      <ul className="mt-4 space-y-3">
        {REFERRAL_RESOURCES.map((resource) => (
          <li key={resource.id} className="rounded-2xl border border-[#d8e6df] bg-white p-4">
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#2f7d67] underline"
            >
              {resource.name}
            </a>
            <p className="mt-1 text-sm leading-6 text-[#4d675f]">{resource.description}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-6 text-[#4d675f]">
        If your matter is an Ontario Small Claims Court case, you can{" "}
        <a href="/ontario-smallclaims" className="font-semibold text-[#2f7d67] underline">
          start there instead
        </a>
        .
      </p>
    </section>
  );
}
