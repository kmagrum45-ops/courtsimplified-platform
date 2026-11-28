/**
 * WRITES docs/acceptance/catalogue-conditions-review.md (site owner, 27 Nov 2026): every fact-dependent Small Claims
 * catalogue item with its exact condition and the fact it waits on, then the notice/time-limit deadline lines and the
 * set-off items with their source passage (the item's own stored text, its source URL and the date it was verified),
 * for review before the new results step relies on them. Read from the generated conditions, so it cannot drift.
 *
 * Run: npx tsx scripts/content/writeConditionsReview.ts [--check]
 */
import fs from "node:fs";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { DEADLINE_LINE_ITEMS, GENERATED_CONDITIONS } from "../../src/lib/case-system/applicability/catalogueConditions.generated";
import type { ItemCondition } from "../../src/lib/case-system/applicability/catalogueConditions";

const OUT = "docs/acceptance/catalogue-conditions-review.md";
const SC = CLAIM_TYPES.filter((type) => type.courtArea === "small-claims");
type Found = { name: string; text: string; sourceUrl?: string; verifiedAt?: string };
function find(key: string): Found | null {
  const [typeId, list, id] = key.split("|");
  const type = SC.find((t) => t.id === typeId);
  if (!type) return null;
  if (list === "element") { const e = type.plaintiffElements.find((x) => x.id === id); return e ? { name: e.name, text: e.plainExplanation, sourceUrl: e.sourceUrl, verifiedAt: e.verifiedAt } : null; }
  if (list === "consideration") { const c = type.defendantConsiderations.find((x) => x.id === id); return c ? { name: c.name, text: `${c.plainExplanation} ${c.whenThisComesUp}`, sourceUrl: c.sourceUrl, verifiedAt: c.verifiedAt } : null; }
  const n = type.proceduralNotes[Number(id)];
  return n ? { name: `Procedural note ${Number(id) + 1}`, text: n.note, sourceUrl: n.sourceUrl, verifiedAt: n.verifiedAt } : null;
}
const words = (c: ItemCondition): string => ("all" in c ? c.all.map(words).join(" AND ") : "any" in c ? `(${c.any.map(words).join(" OR ") || "never"})` : c.kind === "claim-type" ? `kind confirmed is ${c.id}` : c.kind === "amount-over" ? `amount over $${c.dollars.toLocaleString("en-CA")}` : `${c.fact} is ${c.is ? "yes" : "no"}`);
const facts = (c: ItemCondition): string[] => ("all" in c ? c.all.flatMap(facts) : "any" in c ? c.any.flatMap(facts) : c.kind === "fact" ? [c.fact] : c.kind === "amount-over" ? ["amount (already asked)"] : []);
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

const rows = Object.entries(GENERATED_CONDITIONS).map(([key, condition]) => ({ key, condition, item: find(key) }));
const setOff = rows.filter((r) => JSON.stringify(r.condition).includes("moneyOwed"));
const lines: string[] = [
  "# Small Claims catalogue conditions: for review",
  "",
  "Written by `scripts/content/generateCatalogueConditions.ts` and `scripts/content/writeConditionsReview.ts`; do not edit by hand.",
  "Every item not listed here shows only when the case's confirmed kind of claim is its own claim type. An item that waits",
  "on a fact is hidden until the fact is known, and the fact is asked once (site owner's choice, 27 Nov 2026).",
  "",
  `## 1. Items that wait on a fact (${rows.length})`,
  "",
  "| Item id | Claim type | Item name | Condition | Waits on |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${cell(r.key.split("|").slice(1).join(" "))} | ${r.key.split("|")[0]} | ${cell(r.item?.name ?? "?")} | ${cell(words(r.condition))} | ${[...new Set(facts(r.condition))].join(", ")} |`),
  "",
  `## 2. Notices and time limits: one plain deadline line, shown whenever the kind is confirmed (${DEADLINE_LINE_ITEMS.length})`,
  "",
  "Rule: shown whenever the case's kind of claim is confirmed as the item's claim type; never hidden; drawn as one line.",
  "Source passage: the item's own stored text, as verified.",
  "",
  ...DEADLINE_LINE_ITEMS.flatMap((key) => { const item = find(key); return [`- **${key}** (${cell(item?.name ?? "?")})`, `  - Passage: "${cell(item?.text ?? "")}"`, `  - Source: ${item?.sourceUrl ?? "none"} (verified ${item?.verifiedAt ?? "?"})`]; }),
  "",
  `## 3. Set-off (CJA s. 111): shown only when the claim is for money owed (${setOff.length})`,
  "",
  "Rule: hidden unless the claim is for money owed. A money-owed claim type shows it with no question; on any other claim",
  "type the fact `moneyOwed` is asked once.",
  "",
  ...setOff.flatMap((r) => [`- **${r.key}** (${cell(r.item?.name ?? "?")}): ${cell(words(r.condition))}`, `  - Passage: "${cell(r.item?.text ?? "")}"`, `  - Source: ${r.item?.sourceUrl ?? "none"} (verified ${r.item?.verifiedAt ?? "?"})`]),
  "",
];
const body = lines.join("\n");
if (process.argv.includes("--check")) {
  if ((fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "") !== body) { console.error(`${OUT} is stale: run npx tsx scripts/content/writeConditionsReview.ts`); process.exit(1); }
  console.log(`${OUT} is current.`);
} else {
  fs.writeFileSync(OUT, body);
  console.log(`wrote ${OUT}: ${rows.length} fact-dependent items, ${DEADLINE_LINE_ITEMS.length} deadline lines, ${setOff.length} set-off items.`);
}
