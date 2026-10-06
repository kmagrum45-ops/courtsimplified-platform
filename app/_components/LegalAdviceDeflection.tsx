"use client";

import {
  REFERRAL_RESOURCES,
  DEFLECTION_MESSAGE,
  OUT_OF_SCOPE_MESSAGE,
  CASE_JUDGMENT_HEADING,
  CASE_JUDGMENT_MESSAGE,
} from "@/src/lib/content-library/referralResources";
import { isInScope } from "@/src/lib/case-system/policy/a2iScope";

/**
 * What a user sees when we cannot help them.
 *
 * Two cases, one component, because the answer is the same shape: say plainly
 * that we cannot, then give somewhere real to go.
 *
 *   "legal-advice"  the safety pass set requestsLegalAdvice
 *   "out-of-scope"  outside Ontario, or outside the three court paths
 *
 * *** EVERY WORD HERE IS FIXED ***
 *
 * The message is a constant from the content library and the resources are a
 * static list with verified URLs. The model's only role is setting the boolean
 * that decides whether this renders. Nothing it wrote appears.
 *
 * *** WHAT THIS DELIBERATELY DOES NOT DO ***
 *
 * It does not hedge toward an answer, hint at one, or say "generally speaking".
 * A partial answer to a legal question is still a legal answer, and it is worse
 * than none because it sounds authoritative while being unreliable.
 */
export default function LegalAdviceDeflection({
  reason,
}: {
  reason: "legal-advice" | "out-of-scope";
}) {
  // While answerLegalQuestions is on, the safety pass flags only a request
  // to judge the case, so the words say that and point the user onward.
  const judgingOnly = reason === "legal-advice" && isInScope("answerLegalQuestions");
  const heading =
    reason === "out-of-scope"
      ? "This isn't something we cover"
      : judgingOnly
        ? CASE_JUDGMENT_HEADING
        : "We can't answer that one";
  const message =
    reason === "out-of-scope" ? OUT_OF_SCOPE_MESSAGE : judgingOnly ? CASE_JUDGMENT_MESSAGE : DEFLECTION_MESSAGE;

  return (
    <section
      role="note"
      aria-live="polite"
      data-testid={reason === "legal-advice" ? "legal-advice-deflection" : "out-of-scope-deflection"}
      className="rounded-3xl border-2 border-[#2f7d67] bg-[#f8fcfa] p-5"
    >
      <h3 className="text-lg font-bold text-[#10231f]">
        {heading}
      </h3>

      <p className="mt-2 text-[15px] leading-7 text-[#24463d]">
        {message}
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
    </section>
  );
}
