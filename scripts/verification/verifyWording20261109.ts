/**
 * THE SEVEN SMALL CLAIMS WORDING CHANGES APPROVED BY THE FOUNDERS ON 2026-11-09 (Review and Decisions Log) ARE IN EVERY
 * STAGE NAMED, AND IN NO OTHER.
 *
 * For each change: the old sentence is absent and the new one present in the named section of every named stage's
 * published answer (stageAnswers.published.json), and neither the new nor the old sentence is in any other stage. The two
 * "Your deadline" changes are also checked at their one source, the stage map's deadline qualifiers (stageMap.ts), which
 * the published deadline sections are rendered from byte for byte (blockGates.ts). Each changed sentence's verdict must
 * carry the quote it was approved with, found in the saved official text (findQuote); the deadline sentences carry their
 * rules beside the qualifier (r. 1.02 (1), r. 11.02 (1), r. 11.1.01 (2)).
 *
 * WHAT FAILURE THIS CATCHES: an approved wording change lost, applied to the wrong stage, or applied on one screen only.
 *
 * Run: npm run test:wording-20261109
 */
import lib from "../../src/lib/content-library/published/stageAnswers.published.json";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { findQuote } from "../content/verifiedContentPipeline";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

type Block = { stageId: string; whatsHappening: string; whatToDoNext: string; whatHappensAfter: string; yourDeadline: string | null; verification: { verdicts: { sentence: string; quote: string; sourceId: string }[] } };
const blocks = (lib as unknown as { blocks: Block[] }).blocks;
const TEN = ["claim-issued-not-served", "service-attempted-failed", "six-month-service-window-expired", "served-awaiting-defence", "defence-period-expired-no-defence", "defendant-noted-in-default", "assessment-of-damages-needed", "defence-filed", "awaiting-settlement-conference", "settlement-conference-held"].map((s) => `plaintiff:${s}`);

type Change = { n: number; section: keyof Block; stages: string[]; old: string; now: string; quotes?: { sentence: string; quote: string }[] };
const CHANGES: Change[] = [
  { n: 1, section: "whatToDoNext", stages: ["plaintiff:claim-drafted-not-filed"],
    old: "The fee is $108, or $228 if you filed 10 or more claims at that office this calendar year.",
    now: "The fee is $108, or $228 if you have already filed 10 or more claims at that court office this calendar year.",
    quotes: [{ sentence: "The fee is $108, or $228 if you have already filed 10 or more claims at that court office this calendar year.", quote: "has already filed 10 or more claims in the same office in that calendar year" }] },
  { n: 2, section: "whatHappensAfter", stages: ["plaintiff:claim-drafted-not-filed"],
    old: "You cannot file online to meet a deadline that is 3 business days away or less. Court",
    now: "You cannot file online to meet a deadline that is 3 business days away or less. Instead, you can file in person at the courthouse, by mail or by email.",
    quotes: [{ sentence: "Instead, you can file in person at the courthouse, by mail or by email.", quote: "If you cannot submit your documents online, you may file them" }] },
  { n: 3, section: "yourDeadline", stages: TEN,
    old: "This does not apply if the action was already decided by an order. Nor",
    now: "This does not apply if the action was already decided by an order. An order includes a judgment, such as a default judgment signed by the clerk." },
  { n: 4, section: "whatHappensAfter", stages: ["plaintiff:service-attempted-failed"],
    old: "Home and company service takes effect on the fifth day after mailing, or after the courier verifies delivery.",
    now: "The envelope method and the company mailing take effect on the fifth day after mailing, or after the courier verifies delivery. Registered mail or courier to the home takes effect on the date of the signature shown on the delivery confirmation.",
    quotes: [{ sentence: "Registered mail or courier to the home takes effect on the date of the signature shown on the delivery confirmation.", quote: "Service under subrule (7) is effective on the date on which receipt of the copy of the claim is verified by signature" }] },
  { n: 5, section: "whatsHappening", stages: ["plaintiff:served-awaiting-defence"],
    old: ". Every Saturday and Sunday counts as a holiday.",
    now: "Under the Small Claims Court rules, every Saturday and Sunday counts as a holiday.",
    quotes: [{ sentence: "Under the Small Claims Court rules, every Saturday and Sunday counts as a holiday.", quote: "\"holiday\" means, (a) any Saturday or Sunday" }] },
  { n: 6, section: "whatToDoNext", stages: ["plaintiff:assessment-of-damages-needed"],
    old: "One way is a motion in writing, by filing a Notice of Motion and Supporting Affidavit (Form 15A), for a fee.",
    now: "One way is a motion in writing, by filing a Notice of Motion and Supporting Affidavit (Form 15A); the fee is $127.",
    quotes: [{ sentence: "One way is a motion in writing, by filing a Notice of Motion and Supporting Affidavit (Form 15A); the fee is $127.", quote: "a notice of motion for a consent order (except a notice of motion under the Wages Act), $127." }] },
  { n: 7, section: "yourDeadline", stages: ["plaintiff:assessment-of-damages-needed"],
    old: "Nor does it apply if an offer to settle was accepted and filed, or if you are under disability.",
    now: "Nor does it apply if an offer to settle was accepted and filed, if the defence admits liability for your claim and proposes terms of payment, or if you are under disability." },
];

for (const change of CHANGES) {
  for (const stageId of change.stages) {
    const block = blocks.find((b) => b.stageId === stageId);
    const text = String(block?.[change.section] ?? "");
    check(`${change.n}. ${stageId} ${String(change.section)}: the new wording is there`, text.includes(change.now));
    check(`${change.n}. ${stageId} ${String(change.section)}: the old wording is gone`, !text.includes(change.old));
    for (const { sentence, quote } of change.quotes ?? []) {
      const verdict = block?.verification.verdicts.find((v) => v.sentence === sentence);
      check(`${change.n}. ${stageId}: the new sentence carries its approved quote, found in the saved text`, Boolean(verdict && verdict.quote.includes(quote) && findQuote(quote)), JSON.stringify(verdict));
    }
  }
  // In no other stage. Change 7 brings the one stage in line with nine others that already say it, so for it: the old
  // wording is in no stage at all.
  const all = (b: Block) => [b.whatsHappening, b.whatToDoNext, b.whatHappensAfter, b.yourDeadline ?? ""].join("\n");
  if (change.n === 7) {
    const old = blocks.filter((b) => all(b).includes(change.old));
    check("7. the old wording is in no stage", old.length === 0, old.map((b) => b.stageId).join(", "));
  } else {
    const others = blocks.filter((b) => !change.stages.includes(b.stageId) && all(b).includes(change.now));
    check(`${change.n}. the new wording is in no other stage`, others.length === 0, others.map((b) => b.stageId).join(", "));
  }
}

// The deadline changes at their one source: the stage map's qualifiers, with their rules beside them.
const C3 = CHANGES[2];
const C7 = CHANGES[6];
for (const stage of ALL_STAGES) {
  const qualifiers = stage.deadlines.map((d) => d.qualifier ?? "").join("\n");
  const named3 = C3.stages.includes(stage.id);
  if (named3) {
    check(`3. stage map ${stage.id}: the qualifier holds the new sentence`, qualifiers.includes(C3.now));
    const rules = stage.deadlines.flatMap((d) => d.exceptions).map((c) => c.pinpoint);
    check(`3. stage map ${stage.id}: r. 1.02 (1) and r. 11.02 (1) are shown beside it`, rules.includes("r. 1.02 (1)") && rules.includes("r. 11.02 (1)"), rules.join(", "));
  } else check(`3. stage map ${stage.id}: not changed`, !qualifiers.includes(C3.now));
  if (stage.id === "plaintiff:assessment-of-damages-needed") {
    check("7. stage map: the qualifier holds the new sentence", qualifiers.includes(C7.now));
    check("7. stage map: r. 11.1.01 (2) is shown beside it", stage.deadlines.flatMap((d) => d.exceptions).some((c) => c.pinpoint === "r. 11.1.01 (2)"));
  }
  check(`7. stage map ${stage.id}: the old wording is gone`, !qualifiers.includes(C7.old));
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe seven wording changes of 2026-11-09 are in every stage named and no other.");
process.exit(failures ? 1 : 0);
