/**
 * THREE MORE 2026-11-22 FOLLOW-UPS TAKE THE RULE'S OWN WORDS (OWNER, 2026-11-22), WORD FOR WORD, EACH RESTING ON THE
 * RULE THAT SAYS IT.
 *   a. civil:plaintiff:action-dismissed-for-delay, Your deadline: Change 30's approved words, "The registrar's order under
 *      rule 48.14 (1) is a dismissal for delay." (r. 48.14 (1)), not "The registrar's five-year order ...". The defendant's
 *      stage already had them.
 *   b. family:both:bringing-a-motion, Your deadline: "File them as soon as possible after you serve them." (FLR r. 14 (11)
 *      (b): "file the documents as soon as possible after service"), not "as soon as you can".
 *   c. Change 43's approved failure-to-confer sentences (FLR r. 17 (3.3)) in exactly three new places: the settlement
 *      conference's Your deadline and What to do next (where they replace an older paraphrase of the same rule), and the
 *      trial management conference's Your deadline. Not in "bringing a motion": r. 17 (3.3) covers only a failure under
 *      r. 17 (3.1), before a conference, and no saved rule covers a motion.
 * For each: the new wording is shown and the old is gone (stage map and published answers); the published deadline
 * matches the stage map's rendering; the rule is attached where the sentence lives; its quote says the words; and the
 * quote is word for word in the saved source (docs/sources/corpus), ignoring only line breaks and repeated spaces.
 *
 * WHAT FAILURE THIS CATCHES: any of these sentences drifting back to a plain or older wording, the failure-to-confer
 * sentences going missing from a conference or appearing where no rule supports them, or a quote detached or not the
 * law's own words.
 *
 * Run: npm run test:wording-leftovers-3-5-20261122
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import lib from "../../src/lib/content-library/published/stageAnswers.published.json";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { renderDeadlineSection } from "../../src/lib/content-library/stageAnswers";
import type { RuleCitation } from "../../src/lib/case-system/stage-map/citations";

let failures = 0;
let passes = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
};

const CORPUS = path.resolve(import.meta.dirname, "..", "..", "docs", "sources", "corpus");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const inSource = (sourceId: string, quote: string) => flat(readFileSync(path.join(CORPUS, `${sourceId}.txt`), "utf8")).includes(flat(quote));

type Block = { stageId: string; yourDeadline?: string | null; whatToDoNext?: string; verification: { verdicts: { sentence: string; sourceId?: string; quote?: string }[] } };
const blocks = (lib as unknown as { blocks: Block[] }).blocks;
const block = (id: string) => blocks.find((b) => b.stageId === id);
const stage = (id: string) => ALL_STAGES.find((s) => s.id === id);
const deadlineRules = (id: string, deadlineId: string): RuleCitation[] => {
  const d = stage(id)?.deadlines.find((x) => x.id === deadlineId);
  return d ? [d.rule, ...(d.exceptions ?? [])].filter(Boolean) as RuleCitation[] : [];
};
const ruleOk = (name: string, rules: RuleCitation[], sourceId: string, pinpoint: string, words: string) => {
  const rule = rules.find((r) => r.sourceId === sourceId && r.pinpoint === pinpoint);
  check(`${name}: ${pinpoint} is attached`, Boolean(rule));
  if (!rule) return;
  check(`${name}: ${pinpoint} says "${words}"`, rule.quote.includes(words));
  check(`${name}: ${pinpoint} is word for word in the saved ${sourceId}`, inSource(sourceId, rule.quote), rule.quote);
};
const shownDeadline = (name: string, id: string, now: string[], old: string[]) => {
  const st = stage(id);
  const b = block(id);
  check(`${name}: stage and published block exist`, Boolean(st && b));
  if (!st || !b) return;
  const rendered = renderDeadlineSection(st.deadlines) ?? "";
  check(`${name}: the published Your deadline is the stage map's rendering`, (b.yourDeadline ?? "") === rendered);
  for (const s of now) check(`${name}: shows "${s}"`, rendered.includes(s));
  for (const s of old) check(`${name}: no longer shows "${s}"`, !rendered.includes(s));
};

// a. The plaintiff's dismissal-for-delay deadline.
{
  const NOW = "The registrar's order under rule 48.14 (1) is a dismissal for delay.";
  const OLD = "The registrar's five-year order is a dismissal for delay.";
  shownDeadline("a. plaintiff dismissed for delay", "civil:plaintiff:action-dismissed-for-delay", [NOW], [OLD]);
  ruleOk("a.", deadlineRules("civil:plaintiff:action-dismissed-for-delay", "deadline:civil:dismissal-costs-30-days:plaintiff"), "rules-of-civil-procedure", "r. 48.14 (1)", "the registrar shall dismiss an action for delay");
  check("a. the old wording is on no page", !JSON.stringify(blocks).includes(OLD) && !ALL_STAGES.some((s) => (renderDeadlineSection(s.deadlines) ?? "").includes(OLD)));
}

// b. Filing motion papers in Family: "as soon as possible", as r. 14 (11) (b) says it.
{
  const NOW = "File them as soon as possible after you serve them.";
  const OLD = "File them as soon as you can after you serve them.";
  shownDeadline("b. bringing a motion", "family:both:bringing-a-motion", [NOW], [OLD]);
  ruleOk("b.", deadlineRules("family:both:bringing-a-motion", "deadline:family:motion-file-4-days"), "family-law-rules", "r. 14 (11) (a)-(c)", "file the documents as soon as possible after service");
}

// c. Change 43's sentences in the conferences, and not in a motion.
const FAIL = [
  "If you do not confer as required, the court may make any order that is appropriate.",
  "This includes postponing the conference until you have conferred, and ordering costs whether or not the conference is postponed.",
];
const OLDER = [
  "If a party does not do this, the court may make orders that fit.",
  "These include putting off the conference until it is done, and ordering costs whether or not the conference is put off.",
];
for (const [id, kind] of [["family:both:settlement-conference-scheduled", "settlement"], ["family:both:trial-management-conference-scheduled", "tmc"]] as const) {
  shownDeadline(`c. ${kind} conference`, id, [FAIL.join(" ")], []);
  ruleOk(`c. ${kind}`, deadlineRules(id, `deadline:family:${kind}-conference-documents-6-days`), "family-law-rules", "r. 17 (3.3)", "If a party fails to comply with subrule (3.1)");
}
{
  const b = block("family:both:settlement-conference-scheduled");
  const next = b?.whatToDoNext ?? "";
  check("c. settlement What to do next shows Change 43's sentences", next.includes(FAIL.join(" ")));
  for (const s of OLDER) check(`c. settlement What to do next no longer shows "${s}"`, !next.includes(s));
  for (const s of FAIL) {
    const v = b?.verification.verdicts.find((x) => x.sentence === s);
    check(`c. settlement What to do next: "${s.slice(0, 40)}…" rests on r. 17 (3.3)`, Boolean(v?.sourceId === "family-law-rules" && v.quote?.startsWith("If a party fails to comply with subrule (3.1)")));
    if (v?.quote) check(`c. settlement What to do next: its quote is word for word in the saved family-law-rules`, inSource("family-law-rules", v.quote));
  }
  check("c. the older paraphrase is on no page", !JSON.stringify(blocks).includes(OLDER[0]));
}
{
  const id = "family:both:bringing-a-motion";
  const b = block(id);
  const st = stage(id);
  check("c. nothing added to bringing a motion (no saved source): Your deadline", !(renderDeadlineSection(st?.deadlines ?? []) ?? "").includes(FAIL[0]));
  check("c. nothing added to bringing a motion (no saved source): What to do next", !(b?.whatToDoNext ?? "").includes(FAIL[0]));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
