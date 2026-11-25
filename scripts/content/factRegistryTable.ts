/**
 * The fact registry as a table, for the owner to read the rules (site owner, 25 Nov 2026): fact, who it applies to, why,
 * where it lives, and whether the story can give it. Prints markdown.
 *
 * Usage: node --import tsx scripts/content/factRegistryTable.ts
 */
import { FACT_REGISTRY } from "../../src/lib/case-system/caseFile/factRegistry";

const rows = FACT_REGISTRY.map((entry) => `| ${entry.fact} | ${entry.applies?.who ?? "everyone"} | ${entry.applies?.why ?? ""} | ${entry.home} | ${entry.fromStory ? "yes" : ""} |`);
console.log(`${FACT_REGISTRY.length} facts, ${FACT_REGISTRY.filter((entry) => entry.applies).length} with a rule of whom they apply to.\n`);
console.log("| Fact | Applies to | Why | Where it lives | The story can give it |");
console.log("|---|---|---|---|---|");
console.log(rows.join("\n"));
