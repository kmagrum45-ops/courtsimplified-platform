/**
 * The "Serving your documents · verified" panel for the exhibit book screen.
 *
 * *** STAGE-INDEPENDENCE IS ENFORCED BY THE PROP TYPE, NOT BY A COMMENT ***
 *
 * This component takes NO stage, no case position and no case id. It cannot vary by
 * stage because it is never told one, which is a stronger guarantee than a rule
 * somebody has to remember: service obligations recur throughout a case, so the panel
 * must render the same thing whatever position the reader's case is in.
 *
 * `test:generic-library` asserts the props type has no stage-shaped field, so adding
 * one later fails a check rather than quietly making the panel stage-scoped again.
 *
 * *** IT RENDERS NOTHING WHEN NOTHING IS VERIFIED, AND TODAY THAT IS THE CASE ***
 *
 * `publishedGenericBlock` returns undefined until a block passes the pipeline, and
 * the serving-documents block has NOT passed: seven drafter/verifier runs reached
 * 11/11 sentences verified with every accuracy gate clear, and never cleared the
 * grade 8 readability target at the same time.
 *
 * So this returns null and the screen simply has no such panel. That is deliberate:
 * a placeholder saying "coming soon" in a panel labelled "verified" invites the
 * reader to expect law there, and an empty bordered box labelled "verified" is worse
 * still. Nothing is the honest render.
 *
 * *** WHAT THE PANEL MAY SHOW ***
 *
 * Only what the verified block carries: the block's own sentences, and its citations
 * with a link to the official text. It composes no prose of its own about the law —
 * every string of legal content on screen comes from the block, which came from the
 * drafter, the verifier and the corpus quote gate. The panel's own words are labels.
 */

import type { GenericAnswer } from "@/src/lib/content-library/genericAnswers";
import { OFFICIAL_URLS, SOURCE_NAMES } from "@/src/lib/case-system/stage-map/citations";
import { publishedGenericBlock } from "@/src/lib/content-library/publishedGenericLibrary";

/**
 * Deliberately empty of anything case-shaped.
 *
 * If this ever needs a prop, it must not be a stage, a case id, a claim type or a
 * court path — any of those would let the panel differ between readers whose service
 * obligations are identical.
 */
export type VerifiedServingPanelProps = {
  /** Presentation only. Never anything that could change which content is shown. */
  className?: string;
};

function Citation({ citation }: { citation: GenericAnswer["citations"][number] }) {
  const url = OFFICIAL_URLS[citation.sourceId as keyof typeof OFFICIAL_URLS];
  const name = SOURCE_NAMES[citation.sourceId as keyof typeof SOURCE_NAMES] ?? citation.sourceId;

  return (
    <li className="border-l-2 border-[#cfe3dd] pl-3">
      <p className="text-sm text-[#24463d]">
        {/*
          The quote, marked as a quotation. This is the regulation's own words, taken
          from the vendored corpus and checked to be present there by findQuote, so it
          is shown verbatim rather than paraphrased.
        */}
        <q className="italic">{citation.quote}</q>
      </p>
      <p className="mt-1 text-xs text-[#6b8078]">
        {citation.pinpoint} — {name}
        {url ? (
          <>
            {" · "}
            <a
              className="underline hover:no-underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              check the rule yourself
            </a>
          </>
        ) : null}
      </p>
    </li>
  );
}

export function VerifiedServingPanel({ className }: VerifiedServingPanelProps) {
  const block = publishedGenericBlock("serving-documents");

  /*
   * Fails closed. No placeholder, no empty "verified" box, no note about content
   * being on its way — see the header.
   */
  if (!block) return null;

  const sections = [block.whatsHappening, block.whatToDoNext, block.whatHappensAfter].filter(
    (section) => section && section.trim().length > 0,
  );

  return (
    <section className={className} aria-labelledby="verified-serving-heading">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="verified-serving-heading" className="text-base font-semibold text-[#10231f]">
          Serving your documents
        </h2>
        {/*
          The label is derived from the status the block carries, so it cannot claim
          more than the content has.

          Note what is NOT here: a branch for "approved". The status union is
          verified-draft | needs-human | no-source, because `approved` means a licensee
          has read it and only a licensee may set it — the pipeline never can, and
          gateFailures refuses a block that claims it. The compiler rejected that
          branch as unreachable, which is the type doing its job.
        */}
        <span className="text-xs uppercase tracking-wide text-[#6b8078]">
          {block.verification.status === "verified-draft" ? "verified" : "no verified source"}
        </span>
      </div>

      <p className="mt-1 text-sm text-[#6b8078]">{block.userQuestion}</p>

      {sections.map((section, index) => (
        <p key={index} className="mt-3 text-sm leading-relaxed text-[#16302b]">
          {section}
        </p>
      ))}

      {block.citations.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#6b8078]">
            What the rules say
          </h3>
          <ul className="mt-2 space-y-3">
            {block.citations.map((citation) => (
              <Citation key={`${citation.sourceId}:${citation.pinpoint}`} citation={citation} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export default VerifiedServingPanel;
