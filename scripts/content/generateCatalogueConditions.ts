/**
 * WRITES src/lib/case-system/applicability/catalogueConditions.generated.ts (site owner, 27 Nov 2026, step 2).
 *
 * For every Small Claims catalogue item (plaintiff element, defendant consideration, procedural note) whose own text
 * names a fact beyond its claim type, one entry: its claim type AND that fact. Every other item has no entry and takes
 * the default rule (catalogueConditions.ts conditionFor): its claim type only. An item a pattern cannot place safely is
 * listed in `needsOwnRule` with why, and keeps the default until someone writes its rule by hand.
 *
 * A pattern does not add a fact when the claim type itself already says it (an employment claim type mentioning
 * employment), so nothing is asked that the kind of claim already answers.
 *
 * Run: npx tsx scripts/content/generateCatalogueConditions.ts            (writes the file)
 *      npx tsx scripts/content/generateCatalogueConditions.ts --check    (fails if the file is not what this writes)
 */
import fs from "node:fs";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { itemKey, type ApplicabilityFact, type ItemCondition } from "../../src/lib/case-system/applicability/catalogueConditions";

const OUT = "src/lib/case-system/applicability/catalogueConditions.generated.ts";
const SMALL_CLAIMS = CLAIM_TYPES.filter((type) => type.courtArea === "small-claims");

/**
 * A fact an item's text names, the words that name it, and the words that show the claim type already implies it.
 * `elements`: whether the fact may hide a plaintiff ELEMENT. What a person must prove for their own claim type is never
 * hidden by a broad pattern (27 Nov 2026, found reading the review file: "The amount claimed is accurate and remains
 * unpaid" hid under $50,000, and a roommate claim's own element waited on "residential tenancy"). Only the narrowly
 * conditional facts hide one.
 */
const FACTS: { fact: ApplicabilityFact; names: RegExp; implied: RegExp; elements: boolean }[] = [
  { fact: "publishedInNewspaperOrBroadcast", names: /\bnewspaper|\bbroadcast/i, implied: /newspaper|broadcast|media/i, elements: true },
  { fact: "loanRepayableOnDemand", names: /\bdemand obligation|repayable on demand/i, implied: /on demand/i, elements: true },
  { fact: "partyIsMinor", names: /\bminor\b|under (?:the age of )?18|litigation guardian/i, implied: /minor|child|youth/i, elements: true },
  { fact: "consumerAgreement", names: /Consumer Protection Act|consumer agreement/i, implied: /consumer|purchase|bought|warranty|contractor|renovat|repair|service|goods|product|vehicle|car\b/i, elements: false },
  { fact: "employment", names: /Employment Standards|\bemployer\b|\bemployee\b/i, implied: /employ|wage|salary|pay ?cheque|dismiss|severance|vacation pay|overtime/i, elements: false },
  { fact: "residentialTenancy", names: /Landlord and Tenant Board|residential tenanc|Residential Tenancies Act/i, implied: /tenan|landlord|rent|lease/i, elements: false },
  { fact: "governmentParty", names: /\bmunicipal|\bthe Crown\b|notice to the (?:city|municipality)/i, implied: /municipal|city|town|government|crown|road|sidewalk/i, elements: false },
  { fact: "insurerInvolved", names: /\binsur(?:er|ance)\b/i, implied: /insur/i, elements: false },
];
/** A procedural note about going OVER the Small Claims limit: shown only when the amount is over it. */
const OVER_LIMIT = /(?:over|more than|exceed\w*|above|waiv\w*|abandon\w*)[^.]{0,60}\$\s?50,000|\$\s?50,000[^.]{0,60}(?:waiv\w*|abandon\w*|Superior Court)/i;
/** Set-off (CJA s. 111) belongs to money-owed claims; elsewhere it has no condition the record can meet. */
const SET_OFF = /set-off|\bs\. ?111\b/i;
const MONEY_OWED = /loan|debt|invoice|unpaid|owed|owing|cheque|promissory|account|refund|deposit|wage|rent|not paying|payment/i;
/** A deadline counted from a notice or a discovery, with no fact above to hang it on: written by hand. */
const NOTICE_DEADLINE = /written notice|within (?:six|6) weeks|three months|ten days/i;

type Item = { list: "element" | "consideration" | "note"; key: string; text: string };
const itemsOf = (type: (typeof SMALL_CLAIMS)[number]): Item[] => [
  ...type.plaintiffElements.map((element) => ({ list: "element" as const, key: element.id, text: [element.name, element.plainExplanation].join(" ") })),
  ...type.defendantConsiderations.map((item) => ({ list: "consideration" as const, key: item.id, text: [item.name, item.plainExplanation, item.whenThisComesUp].join(" ") })),
  ...type.proceduralNotes.map((note, index) => ({ list: "note" as const, key: String(index), text: note.note })),
];

const entries: [string, ItemCondition][] = [];
const needsOwnRule: { key: string; why: string }[] = [];
const deadlineLines: string[] = [];
for (const type of SMALL_CLAIMS) {
  const typeWords = `${type.id} ${type.name}`;
  for (const item of itemsOf(type)) {
    const key = itemKey(type.id, item.list, item.key);
    const parts: ItemCondition[] = [{ kind: "claim-type", id: type.id }];
    for (const { fact, names, implied, elements } of FACTS) if ((elements || item.list !== "element") && names.test(item.text) && !implied.test(typeWords)) parts.push({ kind: "fact", fact, is: true });
    if (item.list === "note" && OVER_LIMIT.test(item.text)) parts.push({ kind: "amount-over", dollars: 50_000 });
    // Set-off shows only when the claim is for money owed (site owner, 27 Nov 2026): implied by a money-owed claim type,
    // otherwise asked once.
    if (SET_OFF.test(item.text) && !MONEY_OWED.test(typeWords)) parts.push({ kind: "fact", fact: "moneyOwed", is: true });
    // A notice or time limit shows whenever the kind is confirmed, never hidden, as one plain deadline line (site owner,
    // 27 Nov 2026): no condition beyond its claim type; the results step draws it as a deadline line.
    if (NOTICE_DEADLINE.test(item.text) && parts.length === 1) deadlineLines.push(key);
    if (parts.length > 1) entries.push([key, { all: parts }]);
  }
}

const body = `/**
 * GENERATED by scripts/content/generateCatalogueConditions.ts: do not edit by hand (run it again). Read with
 * catalogueConditions.ts conditionFor. An item not listed here takes the default rule: its own claim type only.
 */
import type { ItemCondition } from "./catalogueConditions";

export const GENERATED_CONDITIONS: Record<string, ItemCondition> = ${JSON.stringify(Object.fromEntries(entries), null, 1)};

/** Items no pattern could place safely: each keeps the default until its own rule is written. */
export const NEEDS_OWN_RULE: { key: string; why: string }[] = ${JSON.stringify(needsOwnRule, null, 1)};

/** Notices and time limits: shown whenever the kind is confirmed, as one plain deadline line (site owner, 27 Nov 2026). */
export const DEADLINE_LINE_ITEMS: string[] = ${JSON.stringify(deadlineLines, null, 1)};
`;
if (process.argv.includes("--check")) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (now !== body) { console.error(`${OUT} is not what the generator writes: run npx tsx scripts/content/generateCatalogueConditions.ts`); process.exit(1); }
  console.log(`${OUT} is current (${entries.length} entries, ${needsOwnRule.length} need their own rule).`);
} else {
  fs.writeFileSync(OUT, body);
  console.log(`wrote ${OUT}: ${entries.length} entries; ${deadlineLines.length} deadline lines; ${needsOwnRule.length} items need their own rule.`);
}
