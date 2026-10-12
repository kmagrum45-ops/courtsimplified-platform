/**
 * The words on a source link: the law's name and, when the sentence beside it
 * cites one, the rule or section ("Rules of the Small Claims Court, r. 8.02"),
 * instead of a bare "Source" (outside tester, 2026-10-11: every link read
 * "Source" and none said which law or section it was).
 *
 * Titles are the library's own (docs/sources/retrieval/corpus-index.json), for
 * the laws the pages link to most. The index itself is too large to send to a
 * browser, so the titles are copied here and test:source-link-labels checks
 * every one still matches the index.
 */

export const ELAWS_TITLES: Record<string, string> = {
  "990114": "Family Law Rules",
  "980258": "Rules of the Small Claims Court",
  "900194": "Rules of Civil Procedure",
  "90c43": "Courts of Justice Act",
  "02l24": "Limitations Act, 2002",
  "90f03": "Family Law Act",
  "000626": "Small Claims Court Jurisdiction and Appeal Limit",
  "90c12": "Children's Law Reform Act",
  "02c30": "Consumer Protection Act, 2002",
  "00e41": "Employment Standards Act, 2000",
  "90i08": "Insurance Act",
  "970391": "Child Support Guidelines (Ontario)",
  "90o02": "Occupiers' Liability Act",
  "050017": "General regulation under the Consumer Protection Act, 2002",
  "90r25": "Repair and Storage Liens Act",
  "90l12": "Libel and Slander Act",
  "06r17": "Residential Tenancies Act, 2006",
  "98c19": "Condominium Act, 1998",
  "90s01": "Sale of Goods Act",
  "00p04": "Parental Responsibility Act, 2000",
};

export function elawsId(url: string): string | null {
  return /ontario\.ca\/laws\/(?:docs|statute|regulation)\/([a-z0-9]+?)(?:_e)?(?:\.doc)?(?:[#?].*)?$/i.exec(url)?.[1]?.toLowerCase() ?? null;
}

const RULE_PIN = /\b(?:r\.|rule|subrule)\s*(\d+(?:\.\d+)*(?:\s?\(\d+(?:\.\d+)?\))*(?:\s?\([a-z]\))?)/i;
const SECTION_PIN = /\b(?:s\.|section|subsection)\s*(\d+(?:\.\d+)*(?:\s?\(\d+(?:\.\d+)?\))*(?:\s?\([a-z]\))?)/i;

/**
 * The first rule (for a set of rules) or section (for an Act) the text cites,
 * or null when the text names a different law than this one, so a number is
 * never put on the wrong law's link.
 */
export function pinpointIn(text: string | null | undefined, title: string): string | null {
  if (!text) return null;
  const namesAnother = Object.values(ELAWS_TITLES).some(
    (other) => other !== title && !title.includes(other) && text.toLowerCase().includes(other.toLowerCase().replace(/,? \d{4}$/, "")),
  );
  if (namesAnother) return null;
  const rules = /\brules\b/i.test(title);
  const match = (rules ? RULE_PIN : SECTION_PIN).exec(text);
  return match ? `${rules ? "r." : "s."} ${match[1].replace(/\s+/g, "")}` : null;
}

export function sourceLinkLabel(url: string | null | undefined, nearbyText?: string | null): string {
  if (!url) return "Source";
  const id = elawsId(url);
  const title = id ? ELAWS_TITLES[id] : undefined;
  if (title) {
    const pin = pinpointIn(nearbyText, title);
    return pin ? `${title}, ${pin}` : title;
  }
  if (/ontariocourts\.ca/i.test(url)) return "Ontario courts guide";
  if (/laws-lois\.justice\.gc\.ca/i.test(url)) return "Justice Laws (federal)";
  if (/ontario\.ca/i.test(url)) return "Government of Ontario";
  return "Source";
}
