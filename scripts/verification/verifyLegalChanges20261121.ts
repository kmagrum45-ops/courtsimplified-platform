/**
 * THE APPROVED LEGAL WORDING CHANGES OF 2026-11-21 (THE LEGAL REVIEW, 125 CHANGES) ARE ON THE SITE, WORD FOR WORD, IN
 * THE STAGES NAMED, EACH WITH ITS QUOTE FROM THE SAVED OFFICIAL TEXT.
 *
 * Changes 1 to 7 were already made on 2026-11-09 (test:wording-20261109). For changes 8 to 125:
 *   1. every approved text is present, exactly, in the named stage(s): the published answers' prose
 *      (legalChanges20261121.data.ts), the "Your deadline" sections as the stage map renders them (DEADLINES below), and
 *      the rules-only pages' "The rules for this step" (legalChanges20261121.rules.json);
 *   2. where a change replaces wording, the old wording is gone from those stages;
 *   3. every quote added (a new sentence's supporting quote, and every rule quote added to a page) is found word for
 *      word in its saved source file (docs/sources/corpus), ignoring only line breaks and repeated spaces, case kept;
 *      an elision ("...", "…") is checked run by run, in order;
 *   4. each new prose sentence's verdict carries its approved quote (or, for change 125, the quote its old sentence was
 *      verified with);
 *   5. change 23: the four leave sentences are shown with no amount or an amount of $50,000 or less, and left out above.
 *
 * WHAT FAILURE THIS CATCHES: an approved change lost or reworded, applied to the wrong stage or only one screen, the old
 * wording left beside the new, or a quote that is not the law's own words.
 *
 * Run: npm run test:legal-changes-20261121
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import lib from "../../src/lib/content-library/published/stageAnswers.published.json";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { renderDeadlineSection } from "../../src/lib/content-library/stageAnswers";
import { stageRulesText } from "../../src/lib/content-library/stageRules";
import { SOURCE_NAMES } from "../../src/lib/case-system/stage-map/citations";
import { forThisPerson } from "../../app/builder/_components/StageAnswerPanel";
import { CHANGE_125, PROSE_CHANGES } from "./legalChanges20261121.data";
import RULES from "./legalChanges20261121.rules.json";
import { wrongReaderProblems } from "../content/blockGates";
import { predictsOutcome, RULE_PHRASES_NOT_PREDICTIONS } from "../content/verifiedContentPipeline";

let failures = 0;
let passes = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { passes += 1; return; }
  failures += 1;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
};

// ---- 3. word for word in the saved source ---------------------------------------------------------------------------
const CORPUS = path.resolve(import.meta.dirname, "..", "..", "docs", "sources", "corpus");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const sources = new Map<string, string>();
const source = (id: string) => {
  if (!sources.has(id)) sources.set(id, flat(readFileSync(path.join(CORPUS, `${id}.txt`), "utf8")));
  return sources.get(id)!;
};
function inSource(sourceId: string, quote: string): boolean {
  const text = source(sourceId);
  let at = 0;
  for (const run of flat(quote).split(/\s*(?:\.\.\.|…)\s*/).filter(Boolean)) {
    const i = text.indexOf(run, at);
    if (i < 0) return false;
    at = i + run.length;
  }
  return true;
}

type Block = { stageId: string; whatsHappening: string; whatToDoNext: string; whatHappensAfter: string; yourDeadline: string | null; verification: { verdicts: { sentence: string; quote: string; sourceId: string }[] } };
const blocks = (lib as unknown as { blocks: Block[] }).blocks;
const block = (id: string) => blocks.find((b) => b.stageId === id);
const stage = (id: string) => ALL_STAGES.find((s) => s.id === id);

// ---- 1, 2, 4. the published answers' prose --------------------------------------------------------------------------
for (const change of [...PROSE_CHANGES, ...CHANGE_125]) {
  for (const stageId of change.stages) {
    const b = block(stageId);
    const label = `${change.n}. ${stageId} ${change.section}`;
    if (!b) { check(`${label}: has a published answer`, false); continue; }
    const text = b[change.section];
    check(`${label}: the approved text is there, word for word`, text.includes(change.text), change.text);
    if (change.kind === "replace" && !change.text.includes(change.target!)) {
      check(`${label}: the old wording is gone`, !text.includes(change.target!), change.target);
    }
    if (change.kind === "after") check(`${label}: it follows the sentence named`, text.includes(`${change.target} ${change.text}`));
    for (const { sourceId, quote } of change.quotes) {
      check(`${label}: quote found word for word in ${sourceId}`, inSource(sourceId, quote), quote);
    }
    // 4. the verdicts of the new sentences
    const verdicts = b.verification.verdicts.filter((v) => change.text.includes(v.sentence) || v.sentence.includes(change.text));
    check(`${label}: the new sentence(s) carry a verdict`, verdicts.length > 0);
    for (const v of verdicts) {
      if (change.quotes.length) {
        check(`${label}: its verdict carries the approved quote(s)`, change.quotes.every((q) => v.quote.includes(q.quote)), v.sentence);
      }
      const pieces = v.quote.split(" | ").filter((q) => q.trim().length >= 25);
      check(`${label}: every quote in its verdict is in the saved text`, pieces.every((q) => [...sourcesOfCorpus()].some((id) => inSource(id, q))), v.quote.slice(0, 160));
    }
  }
}
function sourcesOfCorpus(): string[] {
  return ["oreg-258-98-small-claims-rules", "oreg-332-16-small-claims-fees", "limitations-act-2002", "insurance-act", "rules-of-civil-procedure", "family-law-rules", "family-responsibility-support-arrears-enforcement-act", "cja-courts-of-justice-act", "divorce-act", "ontario-fees-small-claims", "guide-after-judgment", "legislation-act-2006", "childrens-law-reform-act", "family-law-act", "ontario-file-small-claims-online"]
    .filter((id) => { try { source(id); return true; } catch { return false; } });
}

// ---- 1, 2. "Your deadline", as the stage map renders it (published and rules-only pages alike) ----------------------
const CONFIRM = "If you are bringing the motion, talk or try to talk with the other party. Then give the registrar a confirmation of motion (Form 37B), and email a copy to the other party, by 2 p.m. on the day. Do this at least 5 days before the date the motion will be heard. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. If no confirmation is given, the motion is not heard. It is treated as abandoned, unless the court orders otherwise.";
const RESP_CONFIRM = "If you are responding and the moving party did not email you their confirmation of motion, you may give the registrar your own (Form 37B). Email a copy to the moving party, by 10 a.m. on the day. Do this at least 4 days before the date the motion will be heard. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted.";
const COUNTING = "Times set by the Rules of Civil Procedure are counted under those rules. The first day is not counted. If a time counted forward ends on a Saturday, Sunday or holiday, it ends on the next day that is not a holiday (r. 3.01 (1) (c)). For a time that must be met a number of days before a date, the safe course is to act by the last day before it that is not a holiday. For a period of seven days or less, holidays are not counted at all (r. 3.01 (1) (b)). Except for the document that starts a case, a document served after 4 p.m. or on a holiday counts as served on the next day that is not a holiday (r. 3.01 (1) (d)). Times set by a statute are counted differently, as stated beside them.";
const UPDATE_FS = "If so, update it by this same day with an affidavit if nothing has changed or the changes are only minor, or otherwise a new financial statement.";
const OLD_UPDATE_FS = "If so, update it by this same day with an affidavit or a new statement.";
const FS_CONFERENCE = "Serve and file an affidavit saying nothing has changed, an affidavit with details of the changes if they are only minor, or otherwise a new financial statement.";
const OLD_FS_CONFERENCE = "Serve and file an affidavit saying nothing has changed, an affidavit with the changes, or a new statement.";
const R41 = "In the Superior Court of Justice outside the Family Court, these rules apply only to cases started on or after July 1, 2004.";
const SET_DOWN = "That is by a notice of readiness for pre-trial conference (Form 76C), within 180 days after the first statement of defence or notice of intent to defend is filed.";

type DeadlineChange = { n: number; stages: string[]; now?: string[]; old?: string[]; order?: string[] };
const DEADLINES: DeadlineChange[] = [
  { n: 18, stages: ["defendant:judgment-against-me"], now: ["If the judgment was made because you did not attend the trial, you can ask the court to set it aside or vary it. You must make the motion within 30 days after you become aware of the judgment, unless the court extends that time because of special circumstances."] },
  { n: 22, stages: ["civil:before-filing:deciding-whether-to-sue", "civil:before-filing:limitation-period-may-have-passed"], now: ["For a debt payable on demand and made on or after January 1, 2004, the loss happens on the first day it is not paid after a demand for payment."], old: ["For a debt payable on demand, the loss happens"] },
  { n: 27, stages: ["civil:defendant:served-with-crossclaim"], now: ["You have 20 days after the day the statement of defence and crossclaim was served on you. You can still deliver it at any time before you are noted in default on the crossclaim."] },
  { n: 30, stages: ["civil:defendant:action-dismissed-counterclaim-pending"], now: ["The registrar's order under rule 48.14 (1) is a dismissal for delay."], old: ["The registrar's five-year order is a dismissal for delay."] },
  { n: 33, stages: ["civil:both:discovery", "civil:plaintiff:defence-received", "civil:plaintiff:served-with-counterclaim", "civil:plaintiff:ready-to-set-down"], now: [SET_DOWN], old: ["within 180 days after the first defence."] },
  { n: 34, stages: ["civil:both:offer-to-settle"], old: ["For an offer on a motion, the hearing is the hearing of that motion."] },
  { n: 36, stages: ["civil:both:lawyer-removed-from-record"], now: ["If you are not a corporation, not under disability and not acting in a representative role, do one of two things."], old: ["If you are an individual, do one of two things."] },
  { n: 37, stages: ["civil:both:interlocutory-order-made"], now: ["The same leave process applies to a final order of a Superior Court judge that is only about costs, if the appeal goes to the Divisional Court."] },
  { n: 38, stages: ["civil:both:pretrial-scheduled"], old: ["For the form to use for the brief, check the notice of the pre-trial conference or the court's order."] },
  { n: 39, stages: ["family:applicant:served-waiting-for-answer"], now: ["You must also give them to the other party before any case conference, unless you already served them."], old: ["If they did not, serve them now. In any case, serve them before the case conference."] },
  { n: 40, stages: ["family:respondent:served-time-to-answer-running"], now: ["If the application made a claim about parenting, net family property, the matrimonial home or support, the clerk usually issues an automatic order, and the rules say it must be served together with the application. Look for it in what you were served."], old: ["If the application made a claim about parenting, property or support, the rules say"] },
  { n: 42, stages: ["family:respondent:answer-filed"], now: ["If your answer made its own claim about parenting, net family property, the matrimonial home or support and the clerk gave you an automatic order, serve it on every other party."], old: ["claim about parenting, property or support and the clerk"] },
  { n: 47, stages: ["family:respondent:served-with-amended-application"], now: ["After the time runs out, you need the court's permission on a motion to amend your answer, unless the parties agree in writing to a later time."], old: ["After the time runs out, you need the court's permission on a motion to amend your answer. "] },
  { n: 48, stages: ["family:respondent:served-with-amended-application"], now: ["The amendment may add a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home against you."], old: ["The amendment may add a claim for support or property against you."] },
  { n: 49, stages: ["family:both:case-conference-scheduled"], now: ["You also do not have to if there is a risk of domestic violence by a party with no licensed representative. If you do not confer as required, the court may make any order that is appropriate. This includes postponing the conference until you have conferred, and ordering costs whether or not the conference is postponed."] },
  { n: 50, stages: ["family:both:case-conference-scheduled"], now: [FS_CONFERENCE], old: [OLD_FS_CONFERENCE] },
  { n: 53, stages: ["family:both:asking-to-change-final-order"], now: ["If your motion to change makes a claim about parenting, net family property, the matrimonial home or support and the clerk gave you an automatic order, serve it on every other party."], old: ["claim about parenting, property or support and the clerk"] },
  { n: 56, stages: ["family:both:served-with-motion-to-change"], now: ["Your response may ask for its own change to parenting, net family property, the matrimonial home or support."], old: ["Your response may ask for its own change to parenting, property or support."] },
  { n: 58, stages: ["family:both:trial-scheduled"], now: ["It can be extended only by an order made at the settlement conference, together with an order about costs."], old: ["It can be extended only by an order made at the settlement conference. "] },
  { n: 62, stages: ["family:both:final-order-made"], now: ["If leave is needed, serve the notice of motion for leave within 15 days after the order, unless a statute provides otherwise. This applies whether the appeal goes to the Divisional Court or the Court of Appeal. File it within 5 days after serving it. In a case under the Child, Youth and Family Services Act, 2017, the time to serve a notice of motion for leave to the Divisional Court is 30 days instead."], old: ["For a Superior Court order going to the Divisional Court, serve a notice of motion for leave within 15 days after the order."] },
  { n: 64, stages: ["family:both:appealing-temporary-order"], now: ["Under the civil rules, serve a notice of motion for leave to appeal (Form 61A) within 15 days after the order, or 30 days in a case under the Child, Youth and Family Services Act, 2017."], old: ["(Form 61A) within 15 days after the order. "] },
  { n: 66, stages: ["family:both:responding-to-summary-judgment"], now: ["If the motion was made with a notice of motion (Form 14), do this at least 4 days before the date the motion will be heard. If it was made with a motion form (Form 14B), do it within 7 days after it was served on you."], old: ["Do this at least 4 days before the date the motion will be heard."] },
  { n: 67, stages: ["family:both:responding-to-summary-judgment"], now: [UPDATE_FS], old: [OLD_UPDATE_FS] },
  { n: 68, stages: ["family:both:missed-or-unconfirmed-conference"], now: [`In the Ontario Court of Justice and the Family Court, they do not apply to a child protection case. ${R41}`] },
  { n: 70, stages: ["family:both:order-made-without-notice"], now: ["If the order is a temporary order, that motion does not have to wait for a conference."], old: ["That motion does not have to wait for a conference."] },
  { n: 74, stages: ["family:both:served-with-licence-suspension-notice"], now: ["A motion must normally be served at least 6 days before it is heard, not counting Saturdays, Sundays and other days when all court offices are closed."], old: ["not counting weekends."] },
  { n: 80, stages: ["family:both:settlement-conference-scheduled"], now: [FS_CONFERENCE], old: [OLD_FS_CONFERENCE] },
  { n: 81, stages: ["family:both:bringing-a-motion"], now: ["It also does not apply to a motion for summary judgment, or to change a temporary order for fraud, mistake or lack of notice."], old: ["or to change an order for fraud"] },
  { n: 82, stages: ["family:both:bringing-a-motion"], now: [UPDATE_FS], old: [OLD_UPDATE_FS] },
  { n: 86, stages: ["family:both:responding-to-a-motion"], now: [UPDATE_FS], old: [OLD_UPDATE_FS] },
  { n: 92, stages: ["family:both:notice-of-approaching-dismissal"], now: [`In the Ontario Court of Justice and the Family Court, they do not apply to a child protection case. ${R41}`] },
  { n: 97, stages: ["family:both:offer-to-settle"], now: ["The party who made it must get an order as good as or better than the offer. If all of these conditions are met, the party who made the offer is entitled, unless the court orders otherwise, to costs up to the date the offer was served and full recovery of costs from that date to the end of that step. That party must prove the order is as good as or better than the offer. Even an offer that does not meet these conditions may still be considered when the court sets the amount of costs."] },
  { n: 103, stages: ["both:bringing-a-motion"], now: ["Do this at least 7 days before the hearing date. If the motion is made after judgment has been signed, serve it on all parties, including those noted in default."] },
  { n: 113, stages: ["both:motion-to-strike-out"], now: ["If you are responding to the motion: serve any affidavit in response (Form 15B) on every party who filed a claim or defence, and file it with proof of service. Do this at least 2 days before the hearing date."] },
  { n: 114, stages: ["plaintiff:court-considering-dismissal"], now: ["If you want to respond, file a written submission with the court, no more than four pages long. You have 20 days after you receive the notice. A mailed notice is treated as received on the fifth day after it was mailed. If you don't file a submission on time and within four pages, the court may make the order without further notice."], old: ["You have 20 days after the day you received the notice.", "If no submission is filed, the court may make the order without further notice."] },
  { n: 118, stages: ["civil:both:motion-to-strike-or-dismiss"],
    now: ["If you are bringing the motion, also serve your motion record on the other parties and file it with proof of service. Do this at least 7 days before the date the motion will be heard. If the motion is under rule 21.01, also serve your factum and file it with proof of service by the same day.",
      "If you are responding to a motion under rule 21.01, serve your factum on every other party to the motion and file it with proof of service. Do this at least 4 days before the date the motion will be heard."] },
  { n: 121, stages: ["civil:both:motion-to-strike-or-dismiss"], now: [CONFIRM, RESP_CONFIRM],
    order: ["If you are bringing the motion, serve the notice of motion", "If you are bringing the motion, also serve your motion record", CONFIRM, "If you are responding to a motion under rule 21.01", RESP_CONFIRM, COUNTING] },
  { n: 119, stages: ["civil:both:amending-a-pleading"],
    now: ["If you amend your pleading: serve the amended pleading forthwith (right away) on every party to the action, including parties to any counterclaim, crossclaim or third party claim, unless the court orders otherwise. File proof of service forthwith (right away) after serving it, unless the amended pleading is an originating process (a document that starts a proceeding, such as a statement of claim, a notice of action, a notice of application, a counterclaim against someone who is not already a party, or a third party claim).",
      "If you are served with an amended pleading: respond within the time left to respond to the original pleading, or within 10 days after the amended pleading was served, whichever is longer, unless the court orders otherwise. If you already responded to the original and do not respond to the amendment in time, you are treated as relying on your original response.",
      COUNTING] },
  { n: 120, stages: ["civil:both:asking-for-injunction"],
    now: ["If you are bringing the motion, also serve your motion record and your factum on the other parties and file them with proof of service. Do this at least 7 days before the date the motion will be heard. On a motion for an interlocutory injunction or mandatory order, a factum is required.", CONFIRM,
      "If you are responding to the motion, serve your factum on every other party to the motion and file it with proof of service. Do this at least 4 days before the date the motion will be heard.", RESP_CONFIRM],
    order: ["If you are bringing the motion, serve the notice of motion", "also serve your motion record and your factum", CONFIRM, "If you are responding to the motion, serve your factum", RESP_CONFIRM, COUNTING] },
  { n: 123, stages: ["civil:plaintiff:certificate-of-pending-litigation"], now: ["After the court makes the order: serve it forthwith (right away), together with a copy of the notice of motion and all affidavits and other documents used at the hearing of the motion, on all parties against whom an interest in land is claimed in the proceeding.", COUNTING] },
  // change 125, the deadline boxes
  { n: 125, stages: ["civil:plaintiff:wants-to-discontinue"], now: ["But a later action can be stayed (paused) until the costs of the discontinued one are paid."], old: ["put on hold"] },
  { n: 125, stages: ["civil:both:motion-scheduled"], now: ["and file them immediately."], old: ["and file them right away."] },
  { n: 125, stages: ["civil:both:trial-date-set"], now: ["The notice must be delivered forthwith (right away) once the amounts become known, and in any event not less than ten days before trial."], old: ["The notice must be delivered right away"] },
  { n: 125, stages: ["family:applicant:application-filed-not-served"], now: ["Serve the application on every other party immediately, by special service."], old: ["Serve the application on every other party right away"] },
  { n: 125, stages: ["family:both:bringing-a-motion"], now: ["If the court then makes an order, serve it immediately on every party affected."], old: ["serve it right away on every party affected"] },
  { n: 125, stages: ["family:both:order-made-without-notice"], now: ["Unless the court orders otherwise, the other party must serve you immediately."], old: ["the other party must serve you right away"] },
];

for (const change of DEADLINES) {
  for (const stageId of change.stages) {
    const s = stage(stageId);
    const label = `${change.n}. ${stageId} Your deadline`;
    if (!s) { check(`${label}: stage exists`, false); continue; }
    const rendered = renderDeadlineSection(s.deadlines) ?? "";
    for (const now of change.now ?? []) check(`${label}: the approved text is there, word for word`, rendered.includes(now), now);
    for (const old of change.old ?? []) check(`${label}: the old wording is gone`, !rendered.includes(old), old);
    if (change.order) {
      const at = change.order.map((piece) => rendered.indexOf(piece));
      check(`${label}: the paragraphs are in the approved order`, at.every((i) => i >= 0) && at.every((i, k) => k === 0 || i > at[k - 1]), JSON.stringify(at));
    }
    const published = block(stageId);
    if (published) check(`${label}: the published answer shows the same section`, published.yourDeadline === rendered);
  }
}
// change 30 names the defendant's stage only: the plaintiff's keeps its wording
check("30. civil:plaintiff:action-dismissed-for-delay keeps its wording (not named)", (renderDeadlineSection(stage("civil:plaintiff:action-dismissed-for-delay")!.deadlines) ?? "").includes("The registrar's five-year order is a dismissal for delay."));

// ---- 1, 3. the rules-only pages ----------------------------------------------------------------------------------
for (const entry of RULES as { changes: number[]; stage: string; rules: { sourceId: string; pinpoint: string; quote: string }[] }[]) {
  const s = stage(entry.stage);
  const label = `${entry.changes.join(", ")}. ${entry.stage} The rules for this step`;
  if (!s) { check(`${label}: stage exists`, false); continue; }
  const text = stageRulesText(s).rules ?? "";
  check(`${label}: quotes are shown, not only links`, !s.rulesLinkOnly);
  check(`${label}: has no published answer (a rules-only page)`, !block(entry.stage));
  for (const rule of entry.rules) {
    const shown = `${SOURCE_NAMES[rule.sourceId as keyof typeof SOURCE_NAMES]}, ${rule.pinpoint}: “${rule.quote}”`;
    check(`${label}: ${rule.pinpoint} is shown in full`, text.includes(shown), shown.slice(0, 160));
    check(`${label}: ${rule.pinpoint} is word for word in the saved ${rule.sourceId}`, inSource(rule.sourceId, rule.quote), rule.quote.slice(0, 160));
  }
}

// ---- 5. change 23: the four leave sentences, by the amount -------------------------------------------------------
const deciding = block("civil:before-filing:deciding-whether-to-sue")!;
const LEAVE4 = [
  "A case that is within the Small Claims Court's limits must not be started in the Superior Court of Justice unless the Superior Court gives leave.",
  "The court may give that leave only if it is in the interest of justice.",
  "You may ask for this leave without notice, unless the court orders otherwise.",
  "Leave is not needed for a counterclaim, a crossclaim, or a third or later party claim, if the main case was started in the Superior Court.",
];
check("23. the four leave sentences are in the published answer, wording unchanged", LEAVE4.every((s) => deciding.whatToDoNext.includes(s)));
for (const [amount, shown] of [[null, true], [40_000, true], [50_000, true], [50_001, false], [85_000, false]] as const) {
  const out = forThisPerson(deciding.whatToDoNext, { userWords: "", filingShown: false, amount });
  check(`23. amount ${amount ?? "not known"}: the four leave sentences are ${shown ? "shown" : "left out"}`, LEAVE4.every((s) => out.includes(s) === shown));
}
check("23. above $50,000 the rest of the paragraph is still shown", forThisPerson(deciding.whatToDoNext, { userWords: "", filingShown: false, amount: 85_000 }).includes("In the Superior Court, a set of steps called the simplified procedure must be used if two things are true."));

// ---- 6. change 26 passes the wrong-reader gate as written, with the gate unchanged (owner's decision, 2026-11-21) ----
{
  const THIRD = "civil:defendant:served-with-third-party-claim";
  const sentence = PROSE_CHANGES.find((c) => c.n === 26)!.text;
  const third = stage(THIRD)!;
  check("26. \"the defendant in the main action\" (owner's wording) passes the wrong-reader gate with no allowance", wrongReaderProblems(sentence, third.side, []).length === 0);
  check("26. the gate still flags a defendant's page naming \"the defendant\" as someone else", wrongReaderProblems("If the defendant does not file a defence, the plaintiff can ask the clerk to note the defendant in default.", third.side, []).length > 0);
}

// ---- 7. changes 83 and 85: the one exact rule phrase the outcome gate skips (owner's decision, 2026-11-21) ----------
// A property, not today's list (CLAUDE.md s. 5): r. 14 (19) (b)'s phrase stays skipped, and every other skipped phrase is
// one the owner authorized (the Case Law Map's five, Jason's decision 1, 2026-11-22; test:case-law-batch1 checks each).
check("83, 85. r. 14 (19) (b)'s \"not likely to be disputed\" is skipped", RULE_PHRASES_NOT_PREDICTIONS.includes("not likely to be disputed"));
check(
  "83, 85. every skipped phrase is owner-authorized: r. 14 (19) (b)'s, or one of the Case Law Map's five",
  RULE_PHRASES_NOT_PREDICTIONS.every((p) =>
    [
      "not likely to be disputed",
      "a meritorious defence",
      "a strong likelihood, on the law and the evidence, that they will succeed at trial",
      "would likely have resulted in different terms",
      "A judge may decline to find contempt where the person acted in good faith and took reasonable steps to comply",
    ].includes(p),
  ),
);
check("83, 85. the approved sentence is not read as a prediction", predictsOutcome("On a contempt motion, that information must also be not likely to be disputed.") === null);
for (const prediction of ["Your claim is unlikely to succeed.", "The judge will likely agree with you.", "You are not likely to win.", "It is likely that the court will order costs.", "That information must also be not likely to be disputed, and you are likely to win."]) {
  check(`83, 85. the outcome gate still refuses: "${prediction}"`, predictsOutcome(prediction) !== null);
}

console.log(failures ? `\n${failures} check(s) failed, ${passes} passed.` : `\nThe approved legal changes of 2026-11-21 are on the site word for word (${passes} checks).`);
process.exit(failures ? 1 : 0);
