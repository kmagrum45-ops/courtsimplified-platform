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
 * The file's TYPE and SIZE, a neutral reference ("Document 1"), and whatever
 * the user chooses to type about it. Those go into the analysis, which goes to
 * OpenAI.
 *
 * *** THE FILENAME NO LONGER DOES. UPDATED 2026-09-23. ***
 *
 * It used to. "restraining-order-application-2025.pdf" and
 * "hiv-results-march.pdf" are disclosures a person makes without ever deciding
 * to, because nobody thinks of a filename as content — and this notice's
 * previous wording told users to rename such files, which put the burden on
 * the person least placed to carry it.
 *
 * The name is now never read at all. `readSelectedFiles` in
 * evidenceReference.ts touches size, type and lastModified, and there is no
 * field on the resulting object that can hold a name. So this notice no longer
 * warns about filenames: there is nothing left to warn about, and a warning
 * that describes a risk we have removed teaches users to distrust the accurate
 * parts too.
 *
 * What replaces it is the label. A label is a disclosure the user makes ON
 * PURPOSE, which is a different thing entirely — so the notice says where it
 * goes, and so does the hint beside the field itself.
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
        This list does not upload your files.
      </p>

      <p className="mt-2 text-sm leading-6 text-[#6e5726]">
        Here you only list your documents: the file itself stays on your device.
        Once your case is saved, you can upload copies in &ldquo;Add your documents
        and photos&rdquo;, where they are stored privately with your case. Keep your
        own copy of every document either way.
      </p>

      <p className="mt-3 text-sm font-semibold text-[#10231f]">
        We do not read or record your file names.
      </p>

      <p className="mt-1 text-sm leading-6 text-[#6e5726]">
        Each document is listed as &ldquo;Document 1&rdquo;,
        &ldquo;Document 2&rdquo; and so on, with its type and size. You can add
        your own label and notes — <strong>those are sent to our AI provider</strong>{" "}
        as part of your case description, so write them the way you would write
        anything else here.
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
