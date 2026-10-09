/**
 * Claims against the government, victims' rights and court records, for
 * stories like the one the owner tested on 2026-10-09: a person harmed by an
 * accused released on bail, asking about the Crown's role, the time limits,
 * and a missing court recording.
 *
 * Already in the library before this file (checked 2026-10-09, not assumed):
 * the whole Criminal Code (bail is Part XVI, s. 515), the Crown Liability and
 * Proceedings Act, 2019, the Limitations Act, 2002, the Human Rights Code, the
 * Charter, the Community Safety and Policing Act, and the decisions Nelles,
 * Miazga, Henry and Ward. This adds what the same story needed and the
 * library lacked.
 *
 * Not added, and why: the Proceedings Against the Crown Act was repealed in
 * 2019, so e-Laws has no current consolidation and the CONSOLIDATION PERIOD
 * check would (rightly) refuse it; a historical version needs its own decision
 * about which period to cite.
 *
 * Fetched through the vendor-sources workflow (SOURCING_NOTES.md, "Vendoring a
 * new source"). Each is kept only if the fetched text contains its mustContain
 * strings, so a wrong id fails closed.
 */

import type { CorpusSource } from "./corpusSources";

const ELAWS = (id: string) => `https://www.ontario.ca/laws/docs/${id}_e.doc`;

export const CROWN_AND_VICTIM_SOURCES: CorpusSource[] = [
  {
    id: "victims-bill-of-rights-1995",
    title: "Victims' Bill of Rights, 1995",
    citation: "S.O. 1995, c. 6",
    url: ELAWS("95v06"),
    format: "elaws-doc",
    mustContain: ["BILL OF RIGHTS, 1995", "CONSOLIDATION PERIOD"],
    why: "What Ontario's law says victims of crime should be told and how they should be treated, and what it says about suing over it.",
  },
  {
    id: "canadian-victims-bill-of-rights",
    title: "Canadian Victims Bill of Rights",
    citation: "S.C. 2015, c. 13, s. 2",
    url: "https://laws-lois.justice.gc.ca/eng/acts/C-23.7/FullText.html",
    format: "html",
    mustContain: ["Canadian Victims Bill of Rights"],
    why: "A victim's federal rights to information about the case and the accused's release, and how a complaint is made.",
  },
  {
    id: "crown-attorneys-act",
    title: "Crown Attorneys Act",
    citation: "R.S.O. 1990, c. C.49",
    url: ELAWS("90c49"),
    format: "elaws-doc",
    mustContain: ["CROWN ATTORNEYS ACT", "CONSOLIDATION PERIOD"],
    why: "What a Crown attorney's duties are under Ontario law, for questions about the Crown's role at a bail hearing.",
  },
  {
    id: "ministry-of-the-attorney-general-act",
    title: "Ministry of the Attorney General Act",
    citation: "R.S.O. 1990, c. M.17",
    url: ELAWS("90m17"),
    format: "elaws-doc",
    mustContain: ["ATTORNEY GENERAL", "CONSOLIDATION PERIOD"],
    why: "The Attorney General's functions, including conducting prosecutions, for who answers for the Crown's conduct.",
  },
  {
    id: "ocj-public-access-court-recordings",
    title: "Public Access to Court Recordings — Ontario Court of Justice",
    citation: "ontariocourts.ca — Ontario Court of Justice",
    url: "https://ontariocourts.ca/ocj/public-access/public-access-to-court-recordings",
    format: "html",
    tier: "practical",
    mustContain: ["recording"],
    minCharacters: 1000,
    why: "How a member of the public asks for the audio recording of a hearing in the Ontario Court of Justice, where most bail hearings are held.",
  },
  {
    id: "scj-accessing-digital-recordings",
    title: "Accessing a Digital Recording and Ordering Transcripts — Superior Court of Justice",
    citation: "ontariocourts.ca — Superior Court of Justice",
    url: "https://www.ontariocourts.ca/scj/guides-and-service-resources/access-to-digital-recordings-court-records/accessing-a-digital-recording-ordering-transcripts/",
    format: "html",
    tier: "practical",
    mustContain: ["transcript"],
    minCharacters: 1000,
    why: "How to get a recording or transcript of a Superior Court hearing.",
  },
];
