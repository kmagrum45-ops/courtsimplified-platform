/**
 * WRITES docs/acceptance/sc-deadline-items.md (site owner, 27 Nov 2026, block table row D): the 35 notice and time-limit
 * items, each KEPT or CUT with its reason (src/lib/case-system/results/deadlineLines.ts), its stored passage and source.
 * Read from the decisions and the catalogue, so it cannot drift.
 *
 * Run: npx tsx scripts/content/writeDeadlineItems.ts [--check]
 */
import fs from "node:fs";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { DEADLINE_LINE_ITEMS } from "../../src/lib/case-system/applicability/catalogueConditions.generated";
import { DEADLINE_DECISIONS } from "../../src/lib/case-system/results/deadlineLines";

const OUT = "docs/acceptance/sc-deadline-items.md";
const cell = (s: string) => s.replace(/\|/g, "\|").replace(/\s+/g, " ").trim();
function item(key: string): { name: string; text: string; sourceUrl?: string; verifiedAt?: string } {
  const [typeId, list, id] = key.split("|");
  const type = CLAIM_TYPES.find((t) => t.id === typeId)!;
  if (list === "element") { const e = type.plaintiffElements.find((x) => x.id === id)!; return { name: e.name, text: e.plainExplanation, sourceUrl: e.sourceUrl, verifiedAt: e.verifiedAt }; }
  if (list === "consideration") { const c = type.defendantConsiderations.find((x) => x.id === id)!; return { name: c.name, text: `${c.plainExplanation} ${c.whenThisComesUp}`, sourceUrl: c.sourceUrl, verifiedAt: c.verifiedAt }; }
  const n = type.proceduralNotes[Number(id)]; return { name: `Note ${Number(id) + 1}`, text: n.note, sourceUrl: n.sourceUrl, verifiedAt: n.verifiedAt };
}
const kept = DEADLINE_LINE_ITEMS.filter((k) => DEADLINE_DECISIONS[k]?.keep);
const cut = DEADLINE_LINE_ITEMS.filter((k) => DEADLINE_DECISIONS[k] && !DEADLINE_DECISIONS[k].keep);
const entry = (k: string) => { const d = DEADLINE_DECISIONS[k]; const i = item(k); return [`- **${k}** (${cell(i.name)})`, `  - ${d.keep ? (d.snowIce ? "KEPT, its line opening with \"If snow or ice was involved:\"" : "KEPT") : "CUT"}: ${cell(d.why)}`, `  - Passage: "${cell(i.text)}"`, `  - Source: ${i.sourceUrl ?? "none"} (verified ${i.verifiedAt ?? "?"})`]; };
const body = [
  "# Small Claims deadlines block: the 35 notice and time-limit items, kept or cut",
  "",
  "Written by `scripts/content/writeDeadlineItems.ts` from `src/lib/case-system/results/deadlineLines.ts`; do not edit by hand.",
  "Owner's test (27 Nov 2026): cut anything that has no stated period, or no notice to be given by a date. A kept item is",
  "one line in the one deadlines block, in its own stored words, each distinct deadline once, soonest first; it shows",
  "whenever the case's kind of claim is confirmed as its claim type. The reasons below are for review, never shown.",
  "",
  `## Kept (${kept.length})`,
  "",
  ...kept.flatMap(entry),
  "",
  `## Cut (${cut.length})`,
  "",
  ...cut.flatMap(entry),
  "",
].join("\n");
if (process.argv.includes("--check")) {
  if ((fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "") !== body) { console.error(`${OUT} is stale: run npx tsx scripts/content/writeDeadlineItems.ts`); process.exit(1); }
  console.log(`${OUT} is current.`);
} else { fs.writeFileSync(OUT, body); console.log(`wrote ${OUT}: ${kept.length} kept, ${cut.length} cut, of ${DEADLINE_LINE_ITEMS.length}.`); }
