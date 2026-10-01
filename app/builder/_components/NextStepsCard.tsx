"use client";

import { isPlaceholder, nextStepBlockFor } from "@/src/lib/content-library/nextSteps";
import { publicSourceUrl } from "@/src/lib/content-library/publicSourceUrl";

/**
 * The reviewed next steps for a confirmed stage, for civil and family cases.
 *
 * *** WHY THIS EXISTS ***
 *
 * Found 2026-10-01: the catalogue in nextSteps.ts holds 18 sourced civil and
 * family blocks, and nothing displayed them. StageConfirmation only checked
 * whether a block existed; the only renderer was the Small Claims engine. A
 * civil or family user confirmed their stage and was shown no next steps.
 *
 * Renders the catalogue text verbatim (never model-written) and nothing for a
 * missing or placeholder block, exactly as the Small Claims engine does.
 */
export default function NextStepsCard({
  pathway,
  stage,
}: {
  pathway: "family" | "civil";
  stage: string;
}) {
  const block = nextStepBlockFor(pathway, stage);
  if (!block || isPlaceholder(block)) return null;
  const source = publicSourceUrl(block.sourceUrl);

  return (
    <section
      data-testid="next-steps-card"
      className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#10231f]">{block.title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#2b4640]">{block.text}</p>
      {source && (
        <p className="mt-3 text-sm text-[#2b4640]">
          Source:{" "}
          <a href={source} target="_blank" rel="noreferrer" className="underline">
            {source}
          </a>
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-[#4d675f]">
        This is general legal information from the source above, not advice about your case. A
        licensed paralegal or lawyer can tell you how it applies to you.
      </p>
    </section>
  );
}
