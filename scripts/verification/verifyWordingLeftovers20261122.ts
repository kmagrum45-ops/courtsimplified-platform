/**
 * TWO LEFTOVERS FROM #554 TAKE THE RULE'S OWN WORD (OWNER, 2026-11-22), WORD FOR WORD, EACH RESTING ON THE RULE THAT
 * SAYS IT.
 *
 * The 2026-11-21 wording rule: the rule's own word, with the plain word in brackets for stay, suspend and forthwith.
 *   1. family:applicant:uncontested-or-joint-divorce, stage description: "it must stay (pause) the granting of the
 *      divorce until they are" (Divorce Act s. 11 (1) (b): "to stay the granting of the divorce"), not "it holds back the
 *      divorce";
 *   2. the civil Form 38A summary: "delivers forthwith (right away)" (Rules of Civil Procedure r. 38.07 (1): "shall
 *      forthwith deliver a notice of appearance (Form 38A)"), not "right away (forthwith)".
 * For each: the new wording is there and the old is gone; the rule is attached where the sentence lives (the stage's
 * rules; the form's entry in the rule index); its quote says the rule's word; and the quote is word for word in the saved
 * source (docs/sources/corpus), ignoring only line breaks and repeated spaces.
 *
 * WHAT FAILURE THIS CATCHES: either sentence drifting back to a plain word where the rule says stay or forthwith, or its
 * supporting quote detached or not the law's own words.
 *
 * Run: npm run test:wording-leftovers-20261122
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { FORM_SUMMARIES } from "../../src/lib/content-library/forms/formSummaries";
import ruleIndex from "../../src/lib/content-library/forms/formRuleIndex.json";

let failures = 0;
let passes = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { passes += 1; return; }
  failures += 1;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
};

const CORPUS = path.resolve(import.meta.dirname, "..", "..", "docs", "sources", "corpus");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const inSource = (sourceId: string, quote: string) =>
  flat(readFileSync(path.join(CORPUS, `${sourceId}.txt`), "utf8")).includes(flat(quote));

// 1. The divorce stage.
{
  const NOW = "or it must stay (pause) the granting of the divorce until they are.";
  const OLD = "or it holds back the divorce until they are.";
  const stage = ALL_STAGES.find((s) => s.id === "family:applicant:uncontested-or-joint-divorce");
  check("divorce: stage exists", Boolean(stage));
  if (stage) {
    check("divorce: new wording in the stage description", stage.description.includes(NOW), stage.description);
    check("divorce: old wording gone", !stage.description.includes(OLD));
    const rule = stage.rules.find((r) => r.sourceId === "divorce-act" && r.pinpoint === "s. 11 (1) (b)");
    check("divorce: Divorce Act s. 11 (1) (b) is in the stage's rules", Boolean(rule));
    if (rule) {
      check("divorce: s. 11 (1) (b) says \"stay the granting of the divorce\"", rule.quote.includes("stay the granting of the divorce"));
      check("divorce: s. 11 (1) (b) is word for word in the saved divorce-act", inSource(rule.sourceId, rule.quote), rule.quote);
    }
  }
  const everywhere = ALL_STAGES.map((s) => s.description).join("\n");
  check("divorce: old wording in no stage description", !everywhere.includes(OLD));
}

// 2. Form 38A.
{
  const NOW = "delivers forthwith (right away).";
  const OLD = "right away (forthwith)";
  const summary = FORM_SUMMARIES.civil["38A"] ?? "";
  check("38A: new wording in the civil summary", summary.includes(NOW), summary);
  check("38A: old order gone", !summary.includes(OLD));
  const all = Object.values(FORM_SUMMARIES).flatMap((court) => Object.values(court)).join("\n");
  check("forms: no summary puts the plain word before forthwith", !all.includes(OLD));
  const entry = ((ruleIndex.forms as unknown as Record<string, { court: string; number: string; mentions: { rule: string; quote: string }[] }[]>).civil)
    .find((e) => e.court === "civil" && e.number === "38A");
  const mention = entry?.mentions.find((m) => m.rule === "r. 38.07 (1)");
  check("38A: r. 38.07 (1) is the form's rule in the rule index", Boolean(mention));
  if (mention) {
    check("38A: r. 38.07 (1) says \"shall forthwith deliver\"", mention.quote.includes("shall forthwith deliver"));
    check(
      "38A: r. 38.07 (1) is word for word in the saved rules-of-civil-procedure",
      inSource("rules-of-civil-procedure", mention.quote.replace(/^38\.07 \(1\) /, "")),
      mention.quote,
    );
  }
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
