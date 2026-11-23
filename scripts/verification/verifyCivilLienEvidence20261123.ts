/**
 * THE APPROVED CIVIL LIEN AND EVIDENCE ACT WORDING OF 2026-11-22 AND 2026-11-23 IS ON THE SITE WORD FOR WORD (OWNER'S
 * REVIEW AND DECISIONS LOG, "CHANGES FOR THE SITE CHAT").
 *   civil:plaintiff:lien-claimant (5): the s. 35 (1) and s. 39 (1) quotes in full; s. 31 (3), (6), (7) after s. 31 (2);
 *     the new Your deadline box, four paragraphs (ss. 31, 34 (1), 36 (2), (3), 37 (1); O. Reg. 302/18 s. 1 (2), (3)).
 *   civil:defendant:lien-registered-on-title (4): the same two quotes; s. 31 (3), (6), (7) after s. 31 (2); s. 45 (1)
 *     after s. 44 (2); s. 47 (1.1) after s. 47 (1).
 *   civil:defendant:served-with-lien-claim (3): the Rules of Civil Procedure counting paragraph replaced by the Legislation
 *     Act one for a statute or regulation, and the 20 days counted that way (a Saturday does not move them); the
 *     default-consequences sentence (O. Reg. 302/18 s. 5 (5)); s. 2 (3) after s. 2 (2), s. 5 (3) and (5) after s. 5 (2).
 *   civil:both:trial-date-set (1): "and of any other report of that practitioner that relates to the case" (Evidence Act
 *     s. 52 (3)), in the stage map and the published answer.
 * Each quote is word for word in the saved source (docs/sources/corpus), read by the same check test:stage-map uses
 * (scripts/content/savedQuoteMatch.ts). That check's two allowances (owner's decision of 2026-11-23: a word split after
 * its hyphen at a line break, and one "…" at the very end) are tested here to still refuse a changed word, a stitched
 * quote and a false "…".
 *
 * WHAT FAILURE THIS CATCHES: any of these texts drifting from the approved words, a section going missing or out of
 * order, the lien defence counted or explained under the court rules again, or the quote check letting through words
 * the saved source does not have.
 *
 * Run: npm run test:civil-lien-evidence-20261123
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import lib from "../../src/lib/content-library/published/stageAnswers.published.json";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import type { RuleCitation } from "../../src/lib/case-system/stage-map/citations";
import { renderDeadlineSection } from "../../src/lib/content-library/stageAnswers";
import { stageRulesText } from "../../src/lib/content-library/stageRules";
import { renderStageRulesOnly } from "../../src/lib/content-library/stageAnswerView";
import { caseDatesFrom, DEADLINE_EVENTS } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { computedDeadlinesFor } from "../../src/lib/content-library/computedDeadline";
import { quoteProblems, savedTextForms } from "../content/savedQuoteMatch";

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
const saved = (sourceId: string) => savedTextForms(readFileSync(path.join(CORPUS, `${sourceId}.txt`), "utf8"));
const stage = (id: string) => {
  const found = ALL_STAGES.find((s) => s.id === id);
  if (!found) throw new Error(`no stage ${id}`);
  return found;
};

const CA = "construction-act";
const REG = "oreg-302-18-construction-act-procedures";
// The approved wording, copied from the log.
const APPROVED: Record<string, { sourceId: string; pinpoint: string; quote: string }> = {
  "35(1)": {
    sourceId: CA,
    pinpoint: "s. 35 (1)",
    quote:
      "In addition to any other ground on which the person may be liable, any person who preserves a claim for lien or who gives written notice of a lien in the following circumstances is liable to any person who suffers damages as a result: 1. The person knows or ought to know that the amount of the lien has been wilfully exaggerated. 2. The person knows or ought to know that he or she does not have a lien.",
  },
  "39(1)": {
    sourceId: CA,
    pinpoint: "s. 39 (1)",
    quote:
      "Any person having a lien or who is the beneficiary of a trust under Part II or who is a mortgagee may, at any time, by written request, require information to be provided within a reasonable time, not to exceed twenty-one days, as follows: …",
  },
  "31(3)": {
    sourceId: CA,
    pinpoint: "s. 31 (3)",
    quote:
      "Subject to subsection (4), the lien of any other person, (a) for services or materials supplied to an improvement on or before the date certified or declared to be the date of the substantial performance of the contract, expires at the conclusion of the 60-day period next following the occurrence of the earliest of, (i) the date on which a copy of the certificate or declaration of the substantial performance of the contract is published, as provided in section 32, (ii) the date on which the person last supplies services or materials to the improvement, (ii.1) the date the contract is completed, abandoned or terminated, and (iii) the date a subcontract is certified to be completed under section 33, where the services or materials were supplied under or in respect of that subcontract; and (b) for services or materials supplied to the improvement where there is no certification or declaration of the substantial performance of the contract, or for services or materials supplied to the improvement after the date certified or declared to be the date of the substantial performance of the contract, expires at the conclusion of the 60-day period next following the occurrence of the earlier of, (i) the date on which the person last supplied services or materials to the improvement, (i.1) the date the contract is completed, abandoned or terminated, and (ii) the date a subcontract is certified to be completed under section 33, where the services or materials were supplied under or in respect of that subcontract.",
  },
  "31(6)": {
    sourceId: CA,
    pinpoint: "s. 31 (6)",
    quote:
      "No later than seven days after a contract is terminated, either the owner or the contractor or other person whose lien is subject to expiry shall publish a notice of the termination in the prescribed form and manner.",
  },
  "31(7)": {
    sourceId: CA,
    pinpoint: "s. 31 (7)",
    quote:
      "If a notice of termination is published in accordance with subsection (6) in respect of a contract, the date on which the contract was terminated is, for the purposes of this section, the date on which the notice was published or, if more than one notice is published in accordance with that subsection, the date on which the first of the notices was published.",
  },
  "45(1)": {
    sourceId: CA,
    pinpoint: "s. 45 (1)",
    quote:
      "Where a lien that attaches to the premises is not preserved or is not perfected within the time allowed for doing so under section 31 or 36, the court upon, (a) the motion of any person without notice to any other person; (b) proof that the lien has not been preserved or perfected within the time allowed; and (c) production of, (i) a certificate of search under the Land Titles Act, or (ii) a registrar's abstract under the Registry Act, together with a certified copy of the claim for lien, shall declare that the lien has expired and order that the registration of the claim for lien be vacated.",
  },
  "47(1.1)": {
    sourceId: CA,
    pinpoint: "s. 47 (1.1)",
    quote:
      "The court may, on motion, make any of the following orders, on any proper ground: 1. An order that the registration of a claim for lien, a certificate of action or both be vacated. 2. If written notice of a lien has been given, a declaration that the lien has expired or that the written notice of the lien shall no longer bind the person to whom it was given. 3. An order dismissing an action.",
  },
  "reg2(3)": {
    sourceId: REG,
    pinpoint: "s. 2 (3)",
    quote:
      "The court may, on a motion served and filed before the date the statement of defence is delivered, grant leave to deliver a crossclaim or counterclaim after the statement of defence is delivered.",
  },
  "reg5(3)": {
    sourceId: REG,
    pinpoint: "s. 5 (3)",
    quote: "A court may grant leave under subsection (2) only if the court is satisfied that there is evidence to support a defence.",
  },
  "reg5(5)": {
    sourceId: REG,
    pinpoint: "s. 5 (5)",
    quote:
      "The following rules apply with respect to a defendant or third party who has been noted in default under subsection (1), if leave is not granted under subsection (2): 1. The defendant or third party is deemed to admit all allegations of fact made in the statement of claim, counterclaim, crossclaim or third party claim, as the case may be. 2. Despite anything to the contrary in this Regulation, the defendant or third party is not entitled to notice of the trial of the action or of any step in the action, or to participate in the trial of the action or in any step in the action. 3. Default judgment may be given against the defendant or third party.",
  },
};

// Every approved quote is word for word in its saved source.
for (const [key, approved] of Object.entries(APPROVED)) {
  const result = quoteProblems(approved.quote, saved(approved.sourceId));
  check(`${key}: the approved quote is word for word in the saved ${approved.sourceId}`, result.problems.length === 0, result.problems.join("; "));
}

/** The rule is in the stage's rules with the approved words, right after the rule named in `after`. */
const ruleAfter = (stageId: string, key: string, afterPinpoint: string) => {
  const rules = stage(stageId).rules;
  const want = APPROVED[key];
  const at = rules.findIndex((r) => r.sourceId === want.sourceId && r.pinpoint === want.pinpoint);
  check(`${stageId}: ${want.pinpoint} is in The rules for this step`, at >= 0);
  if (at < 0) return;
  check(`${stageId}: ${want.pinpoint} has the approved words`, rules[at].quote === want.quote, rules[at].quote.slice(0, 120));
  const before = rules.findIndex((r) => r.sourceId === want.sourceId && r.pinpoint === afterPinpoint);
  check(`${stageId}: ${want.pinpoint} comes after ${afterPinpoint}`, before >= 0 && before < at, `${afterPinpoint} at ${before}, ${want.pinpoint} at ${at}`);
};
/** The rule follows the previous one directly (a run of added sections in order). */
const directlyAfter = (stageId: string, keys: string[], firstAfter: string) => {
  const rules = stage(stageId).rules;
  const idx = (sourceId: string, pinpoint: string) => rules.findIndex((r) => r.sourceId === sourceId && r.pinpoint === pinpoint);
  const first = APPROVED[keys[0]];
  const positions = [idx(first.sourceId, firstAfter), ...keys.map((k) => idx(APPROVED[k].sourceId, APPROVED[k].pinpoint))];
  check(`${stageId}: ${keys.map((k) => APPROVED[k].pinpoint).join(", ")} follow ${firstAfter} in that order`, positions.every((p, i) => p >= 0 && (i === 0 || p === positions[i - 1] + 1)), positions.join(","));
};

// ---- civil:plaintiff:lien-claimant (5) ----
const CLAIMANT = "civil:plaintiff:lien-claimant";
ruleAfter(CLAIMANT, "35(1)", "s. 34 (1)");
ruleAfter(CLAIMANT, "39(1)", "s. 34 (1)");
for (const key of ["31(3)", "31(6)", "31(7)"]) ruleAfter(CLAIMANT, key, "s. 31 (2)");
directlyAfter(CLAIMANT, ["31(3)", "31(6)", "31(7)"], "s. 31 (2)");
const CLAIMANT_BOX = [
  "To keep your lien, preserve it before it expires. It expires at the end of 60 days after the earliest of the events in s. 31 that apply to you: s. 31 (2) if you are the contractor, s. 31 (3) if you are a subcontractor or supplier. You preserve it by registering a claim for lien on title, or, if the lien does not attach to the premises, by giving the owner a copy of the claim for lien.",
  "Then perfect the lien within 90 days after the last day it could have been preserved. You do this by starting an action and, where the lien attaches to the premises, registering a certificate of action on title. Serve the statement of claim within 90 days after it is issued, unless the court extends the time.",
  "A perfected lien expires immediately after the second anniversary of the start of the action, unless by then the action is set down for trial or an order is made for its trial.",
  "These times are set by a statute, so they are counted under the Legislation Act, 2006, not the Rules of Civil Procedure.",
].join("\n\n");
check(`${CLAIMANT}: Your deadline is the four approved paragraphs, word for word`, stageRulesText(stage(CLAIMANT)).deadlines === CLAIMANT_BOX, String(stageRulesText(stage(CLAIMANT)).deadlines).slice(0, 160));
const claimantShown = renderStageRulesOnly(CLAIMANT);
check(
  `${CLAIMANT}: the page shows them under "Your deadline"`,
  claimantShown?.sections.find((s) => s.heading === "Your deadline")?.text === CLAIMANT_BOX,
  JSON.stringify(claimantShown?.sections.map((s) => s.heading)),
);
// The sections the box restates are on the page, so each sentence rests on a shown rule.
for (const [sourceId, pinpoint] of [[CA, "s. 31 (2)"], [CA, "s. 31 (3)"], [CA, "s. 34 (1)"], [CA, "s. 36 (2)"], [CA, "s. 36 (3)"], [CA, "s. 37 (1)"], [REG, "s. 1 (2)"], [REG, "s. 1 (3)"]]) {
  check(`${CLAIMANT}: the box's ${pinpoint} (${sourceId}) is in The rules for this step`, stage(CLAIMANT).rules.some((r) => r.sourceId === sourceId && r.pinpoint === pinpoint));
}
check(`${CLAIMANT}: s. 37 (1) says "expires immediately after the second anniversary"`, stage(CLAIMANT).rules.some((r) => r.pinpoint === "s. 37 (1)" && r.quote.includes("expires immediately after the second anniversary")));

// ---- civil:defendant:lien-registered-on-title (4) ----
const TITLE = "civil:defendant:lien-registered-on-title";
ruleAfter(TITLE, "35(1)", "s. 31 (2)");
ruleAfter(TITLE, "39(1)", "s. 31 (2)");
directlyAfter(TITLE, ["31(3)", "31(6)", "31(7)"], "s. 31 (2)");
directlyAfter(TITLE, ["45(1)"], "s. 44 (2)");
directlyAfter(TITLE, ["47(1.1)"], "s. 47 (1)");

// The old, cut-off quotes are gone from every stage.
const allRules: RuleCitation[] = ALL_STAGES.flatMap((s) => [...s.rules, ...s.deadlines.flatMap((d) => [d.rule, ...d.exceptions])]);
check("no stage keeps the s. 35 (1) quote that began mid-sentence", !allRules.some((r) => r.sourceId === CA && r.pinpoint === "s. 35 (1)" && r.quote.startsWith("any person who preserves")));
check("no stage keeps the s. 39 (1) quote that stopped at \"within a reasonable time\"", !allRules.some((r) => r.sourceId === CA && r.pinpoint === "s. 39 (1)" && r.quote.endsWith("within a reasonable time")));

// ---- civil:defendant:served-with-lien-claim (3) ----
const SERVED = "civil:defendant:served-with-lien-claim";
const lienDefence = stage(SERVED).deadlines.find((d) => d.id === "deadline:civil:lien-defence-20-days");
const servedBox = renderDeadlineSection(stage(SERVED).deadlines) ?? "";
const LEGISLATION_COUNTING =
  "A deadline in an Ontario statute or regulation is counted under the Legislation Act, 2006, unless it shows otherwise. When a period is described as starting after a day, that day is not counted (s. 89 (5)). If the last day is a Sunday or a holiday, the deadline moves to the next day that is not a holiday (s. 89 (1)). Saturday is not a holiday under that Act, so a Saturday does not by itself move the deadline. Some deadlines are for doing something at a place, such as filing at an office. If that place is not open during its regular hours on the last day, the deadline moves to the next day it is open during its regular hours (s. 89 (2)).";
check(`${SERVED}: Your deadline ends with the Legislation Act counting paragraph, word for word`, servedBox.endsWith(`\n\n${LEGISLATION_COUNTING}`), servedBox.slice(-200));
check(`${SERVED}: the Rules of Civil Procedure counting paragraph is gone`, !servedBox.includes("Times set by the Rules of Civil Procedure are counted under those rules."));
check(`${SERVED}: the 20 days are counted under the Legislation Act`, lienDefence?.regime === "legislation-act" && lienDefence?.computation.sourceId === "legislation-act-2006", `${lienDefence?.regime} ${lienDefence?.computation.pinpoint}`);
const NOTED = "A defendant who does not deliver a defence may be noted in default, and then cannot contest the claim or file a defence without the court's leave.";
const DEFAULT =
  "If you are noted in default and the court does not give leave, you are treated as admitting all the facts in the claim, you are not entitled to notice of the trial or of any step in the action, and default judgment may be given against you.";
check(`${SERVED}: the default-consequences sentence follows the noted-in-default sentence`, servedBox.includes(`${NOTED} ${DEFAULT}`), servedBox.slice(0, 600));
check(`${SERVED}: s. 5 (5) is attached to the deadline the sentence is in`, Boolean(lienDefence?.exceptions.some((r) => r.sourceId === REG && r.pinpoint === "s. 5 (5)" && r.quote === APPROVED["reg5(5)"].quote)));
directlyAfter(SERVED, ["reg2(3)"], "s. 2 (2)");
directlyAfter(SERVED, ["reg5(3)", "reg5(5)"], "s. 5 (2)");
// The probe: served Sunday 1 November 2026; day 20 is Saturday 21 November. Under the Legislation Act a Saturday does not
// move it (the Rules of Civil Procedure would have moved it to Monday 23 November).
if (lienDefence) {
  const counted = computedDeadlinesFor([lienDefence], caseDatesFrom({ [String(DEADLINE_EVENTS["served-with-claim"].questionId)]: "2026-11-01" }), "probe");
  check("probe: served 1 November 2026, the lien defence is due Saturday 21 November", counted[0]?.date === "2026-11-21", JSON.stringify(counted.map((c) => c.date)));
}
// Only this deadline asks for that paragraph: every other deadline's box is as before.
const others = ALL_STAGES.flatMap((s) => s.deadlines).filter((d) => d.statuteOrRegulationCounting);
check("only the lien defence deadline shows the statute-or-regulation paragraph", others.length === 1 && others[0].id === "deadline:civil:lien-defence-20-days", others.map((d) => d.id).join(", "));

// ---- civil:both:trial-date-set (1) ----
const TRIAL = "civil:both:trial-date-set";
const NOW = "When notice is given, the other parties can get a copy of the report, and of any other report of that practitioner that relates to the case, unless the court orders otherwise.";
const OLD = "When notice is given, the other parties can get a copy of the report, unless the court orders otherwise.";
const trialBox = renderDeadlineSection(stage(TRIAL).deadlines) ?? "";
type Block = { stageId: string; yourDeadline?: string | null };
const published = (lib as unknown as { blocks: Block[] }).blocks.find((b) => b.stageId === TRIAL)?.yourDeadline ?? "";
check(`${TRIAL}: the stage map says the approved sentence`, trialBox.includes(NOW) && !trialBox.includes(OLD));
check(`${TRIAL}: the published answer says it, and matches the stage map's rendering`, published.includes(NOW) && !published.includes(OLD) && published === trialBox);
const practitioner = stage(TRIAL).deadlines.find((d) => d.id === "deadline:civil:practitioner-report-notice-10-days");
const s52 = practitioner?.exceptions.find((r) => r.sourceId === "evidence-act" && r.pinpoint === "s. 52 (3)");
check(`${TRIAL}: s. 52 (3) is attached and says "together with any other report of the practitioner that relates to the action"`, Boolean(s52?.quote.includes("together with any other report of the practitioner that relates to the action")));
if (s52) check(`${TRIAL}: s. 52 (3) is word for word in the saved Evidence Act`, quoteProblems(s52.quote, saved("evidence-act")).problems.length === 0);
const elsewhere = ALL_STAGES.filter((s) => s.id !== TRIAL && (renderDeadlineSection(s.deadlines) ?? "").includes("can get a copy of the report"));
check("no other stage has the report sentence (the fix is everywhere it appears)", elsewhere.length === 0, elsewhere.map((s) => s.id).join(", "));

// ---- The quote check's two allowances refuse what they should ----
const ca = saved(CA);
const refused = (name: string, quote: string) => check(`the quote check refuses ${name}`, quoteProblems(quote, ca).problems.length > 0);
refused("a changed word across the joined line break", APPROVED["39(1)"].quote.replace("twenty-one", "thirty-one"));
refused("the line break joined without its hyphen", APPROVED["39(1)"].quote.replace("twenty-one", "twentyone"));
refused("a \"…\" after words the source does not have", "Any person having a lien may demand anything at all: …");
refused("two real passages stitched together with a \"…\" in the middle", `${APPROVED["31(6)"].quote.slice(0, 40)} … ${APPROVED["31(7)"].quote.slice(0, 40)}`);
check("the quote check refuses a \"…\" where the saved text does not go on", quoteProblems("final text that is not there …", { flat: "final text that is not there", joined: "final text that is not there" }).problems.length > 0);
check("the quote check still reads \" ... \" as separate runs", quoteProblems(`${APPROVED["31(6)"].quote.slice(0, 40)} ... not in the act at all`, ca).problems.length === 1);

console.log(`${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
