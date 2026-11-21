/**
 * NO TWO FACTS DECLARE THE SAME MEANING (site owner, 19 Nov 2026).
 *
 * The same real-world fact under two ids is how a fact gets asked twice (S1: "If this involves an injury, what date did
 * it happen?" after the story gave the date, because the injury date and the event date were asked as two). Every fact
 * id declares one plain meaning (caseFile/factMeanings.ts; the type requires it). This fails when two ids declare the
 * same meaning, compared without case, punctuation, word order or small words (meaningKey).
 *
 * Asserts: every fact id has a meaning of some words; no two meanings have the same key; planted controls: two ids
 * with the same meaning in other order and case fail, two different meanings pass.
 *
 * Run: npm run test:fact-meanings
 */
import { FACT_MEANINGS, meaningKey } from "../../src/lib/case-system/caseFile/factMeanings";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failed++; };

export function sameMeanings(meanings: Readonly<Record<string, string>>): string[][] {
  const byKey = new Map<string, string[]>();
  for (const [id, meaning] of Object.entries(meanings)) byKey.set(meaningKey(meaning), [...(byKey.get(meaningKey(meaning)) ?? []), id]);
  return [...byKey.values()].filter((ids) => ids.length > 1);
}

check("planted: two ids with the same meaning (other order and case) fail", sameMeanings({ a: "The day the papers arrived", b: "papers arrived: the day" }).length === 1);
check("planted: two different meanings pass", sameMeanings({ a: "the day the papers arrived", b: "the day the hearing is" }).length === 0);
const empty = Object.entries(FACT_MEANINGS).filter(([, meaning]) => meaningKey(meaning).split(" ").length < 2).map(([id]) => id);
check(`every one of the ${Object.keys(FACT_MEANINGS).length} fact ids declares a meaning`, empty.length === 0, empty.join(", "));
const same = sameMeanings(FACT_MEANINGS);
check("no two fact ids declare the same meaning", same.length === 0, same.map((ids) => ids.join(" = ")).join("; "));

console.log(failed ? `\n${failed} check(s) failed` : "\nAll fact-meaning checks passed");
process.exitCode = failed ? 1 : 0;
