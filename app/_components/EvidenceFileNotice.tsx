/**
 * What actually happens to a file you choose here, and what not to choose.
 *
 * *** WHY THIS EXISTS ***
 *
 * Every file picker on this site is labelled "Upload". Nothing is uploaded.
 * `handleEvidenceFilesSelected` in all three intakes reads `file.name`,
 * `file.size`, `file.type` and `file.lastModified` off the File object and
 * then lets the object go. No FileReader, no arrayBuffer(), no .text(), no
 * request body carrying bytes — verified across app/ and src/ on 2026-09-22;
 * the only arrayBuffer() in the codebase is on a blank PDF form fetched from a
 * court website, not on anything a user chose.
 *
 * So the word "Upload" was making a promise the product does not keep, in the
 * direction that matters most: a person who believes their evidence is held
 * here is a person who may stop holding it themselves.
 *
 * *** WHAT DOES LEAVE THE BROWSER ***
 *
 * The FILENAME does, along with the size, the type, and whatever the user
 * types into the title, description and relevance fields. Those go into the
 * analysis, which goes to OpenAI.
 *
 * A filename is not nothing. "restraining-order-application-2025.pdf" and
 * "hiv-results-march.pdf" are disclosures, and they are disclosures a person
 * makes without ever deciding to, because nobody thinks of a filename as
 * content. That is the specific reason the caution below names the categories
 * it names, and the specific reason this component sits at the picker rather
 * than in a privacy page nobody opens at the moment they are choosing a file.
 *
 * *** NOT LEGAL CONTENT, DELIBERATELY ***
 *
 * The caution names categories of document. It does not say what a sealing
 * order or a publication ban does, whether one applies to the reader, or what
 * follows if it does — those are statements about the law and about the
 * reader's situation, and neither belongs here. It says: if your document is
 * one of these, do not put it through this screen. Flagged in
 * docs/lso-fixes-report.md for licensee review of the wording.
 */

export default function EvidenceFileNotice() {
  return (
    <div
      role="note"
      data-testid="evidence-file-notice"
      className="mt-3 rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4"
    >
      <p className="text-sm font-semibold text-[#10231f]">
        Your files are not uploaded, saved or stored.
      </p>

      <p className="mt-2 text-sm leading-6 text-[#6e5726]">
        CourtSimplified records the file name, size and type, plus whatever you
        type about it. The file itself never leaves your device and is not kept
        anywhere. Keep your own copy of every document — this is a list, not a
        place to store evidence.
      </p>

      <p className="mt-3 text-sm font-semibold text-[#10231f]">
        Before you choose a file, check the name.
      </p>

      <p className="mt-1 text-sm leading-6 text-[#6e5726]">
        The file name is recorded and is sent to our AI provider as part of your
        case description. Rename anything whose name alone would reveal more
        than you want to share.
      </p>

      <p className="mt-3 text-sm leading-6 text-[#6e5726]">
        Please do not add files of these kinds:
      </p>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#6e5726]">
        <li>anything covered by solicitor-client or litigation privilege</li>
        <li>anything a court has sealed or ordered kept confidential</li>
        <li>anything subject to a publication ban</li>
        <li>
          health, medical or counselling records belonging to someone other than
          you
        </li>
      </ul>
    </div>
  );
}
