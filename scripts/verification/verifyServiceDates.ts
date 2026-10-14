/**
 * When service counts from (serviceEffectiveDate.ts, build order Step 2D,
 * 2026-10-12).
 *
 * WHAT IT CATCHES: a rule quote that is not in the saved official text, a
 * method counted from the wrong day, a closed day not moved where the rules
 * move it, and a Small Claims fifth day on a weekend stated as certain -- or
 * explained by claiming the rules are silent (2026-10-13). Also: a day the
 * papers ARRIVED offered as the day to count from, with or without its year,
 * or a card that states a last day before the mailing date is given.
 * (2026-10-14) An arrival note that says service "counts from" the mailing
 * day instead of the rule's own effective day; a "no later than" date that a
 * mailing day on or before arrival could exceed, or one shown for a way of
 * serving whose day can come after arrival.
 *
 * COSTS NOTHING: reads the saved rules, no network, no model.
 *
 * Run: npm run test:service-dates
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { applyPositionPatch, EMPTY_POSITION, isServiceDateQuestion, readCasePosition, storyHintsForDates } from "../../src/lib/case-system/casePosition";
import { arrivalNoteFor, arrivalOnlyDates, latestFromArrival, offerStoryDate } from "../../app/builder/_components/StageAnswerPanel";
import { addDays as addDaysIso } from "../../src/lib/case-system/deadlines/holidays";
import {
  arrivalNotSendDate,
  FAMILY_CLOSED_DAY_RULE,
  SC_R3_01_LAST_DAY,
  SENT_ON_OR_BEFORE_ARRIVAL,
  SERVICE_RULES,
  effectiveServiceDate,
  whenEffectiveSay,
  serviceMethodFromStory,
  smallClaimsFifthDayOnClosedDay,
  type ServiceCourt,
} from "../../src/lib/case-system/deadlines/serviceEffectiveDate";
import { assertsAbsenceProblems } from "../content/blockGates";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const flat = (text: string) => text.replace(/\s+/g, " ").trim();
const corpus: Record<ServiceCourt, string> = {
  "small-claims": flat(readFileSync(path.join(ROOT, "docs/sources/corpus/oreg-258-98-small-claims-rules.txt"), "utf8")),
  civil: flat(readFileSync(path.join(ROOT, "docs/sources/corpus/rules-of-civil-procedure.txt"), "utf8")),
  family: flat(readFileSync(path.join(ROOT, "docs/sources/corpus/family-law-rules.txt"), "utf8")),
};

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

console.log("\n1. Every rule line is the saved official text, word for word");
for (const court of Object.keys(SERVICE_RULES) as ServiceCourt[]) {
  for (const rule of SERVICE_RULES[court]) {
    if (!rule.rule) {
      check(`${court}: ${rule.method} counts from the day itself, with no rule to quote`, rule.addDays === 0 && rule.quote === "");
      continue;
    }
    check(`${court}: ${rule.method} quote is in ${rule.rule}`, corpus[court].includes(flat(rule.quote)), rule.quote);
  }
}
check("family: the closed-day rule is in r. 6 (11.3)", corpus.family.includes(flat(FAMILY_CLOSED_DAY_RULE.quote)));

console.log("\n2. Worked examples");
{
  const scMail = effectiveServiceDate("small-claims", "mail", "2026-09-25");
  check("Small Claims, mailed Fri Sept 25: counts from Wed Sept 30 (r. 8.07 (2))", scMail.date === "2026-09-30" && !scMail.confirm, JSON.stringify(scMail));

  const scWeekend = effectiveServiceDate("small-claims", "mail", "2026-09-21");
  check(
    "Small Claims, fifth day on a Saturday: the fifth day, flagged to confirm (the rules don't say it moves)",
    scWeekend.date === "2026-09-26" && Boolean(scWeekend.confirm),
    JSON.stringify(scWeekend),
  );

  const scSigned = effectiveServiceDate("small-claims", "registered-mail-signature", "2026-09-25");
  check("Small Claims, signed for on Sept 25: counts from that day (r. 8.03 (8))", scSigned.date === "2026-09-25");

  const scEmailLate = effectiveServiceDate("small-claims", "email-after-4pm", "2026-09-25");
  check("Small Claims, email after 4 p.m. Fri Sept 25: counts from Sat Sept 26 (r. 8.08 (4) (b))", scEmailLate.date === "2026-09-26");

  const civilCourier = effectiveServiceDate("civil", "courier", "2026-10-09");
  check(
    "Civil, courier given Fri Oct 9: second day is Sun Oct 11, Mon Oct 12 is Thanksgiving, so Tue Oct 13 (r. 16.06.2), flagged to confirm",
    civilCourier.date === "2026-10-13" && Boolean(civilCourier.confirm),
    JSON.stringify(civilCourier),
  );

  const civilMail = effectiveServiceDate("civil", "mail", "2026-09-25");
  check("Civil, mailed Sept 25: counts from Sept 30 (r. 16.06 (2))", civilMail.date === "2026-09-30");

  const familyEmail = effectiveServiceDate("family", "email-after-4pm", "2026-10-02");
  check(
    "Family, email after 4 p.m. Fri Oct 2: next day is Saturday, so Mon Oct 5 (r. 6 (11) (b), r. 6 (11.3))",
    familyEmail.date === "2026-10-05" && familyEmail.rules.includes(FAMILY_CLOSED_DAY_RULE.rule),
    JSON.stringify(familyEmail),
  );

  const familyPersonal = effectiveServiceDate("family", "personal", "2026-09-30");
  check("Family, handed over Wed Sept 30: counts from that day", familyPersonal.date === "2026-09-30" && !familyPersonal.confirm);

  const unknown = effectiveServiceDate("civil", "email", "2026-09-30");
  check("a method a court's rules don't list here leaves the typed date unchanged", unknown.date === "2026-09-30" && unknown.rules.length === 0);
}

console.log("\n3. Saved with the case");
{
  const now = new Date("2026-10-12T12:00:00Z");
  const saved = applyPositionPatch(
    EMPTY_POSITION,
    { dateAnswers: { "sc-date-claim-served": "2026-09-30" }, service: { "sc-date-claim-served": { method: "mail", enteredOn: "2026-09-25" } } },
    "small-claims",
    now,
  );
  check(
    "how it was served is saved beside the date service counts from",
    saved.ok && saved.position.dateAnswers["sc-date-claim-served"] === "2026-09-30" && saved.position.service?.["sc-date-claim-served"]?.method === "mail",
    JSON.stringify(saved),
  );
  const wrongCourt = applyPositionPatch(EMPTY_POSITION, { dateAnswers: { "sc-date-claim-served": "2026-09-30" }, service: { "sc-date-claim-served": { method: "courier-next-day", enteredOn: "2026-09-25" } } }, "small-claims", now);
  check("a method from another court's rules is refused", !wrongCourt.ok);
  if (saved.ok) {
    const cleared = applyPositionPatch(saved.position, { dateAnswers: { "sc-date-claim-served": "" } }, "small-claims", now);
    check("removing the date removes how it was served", cleared.ok && !cleared.position.service?.["sc-date-claim-served"]);
    const reread = readCasePosition({ position: saved.position }, "small-claims");
    check("it reads back from the saved case", reread.service?.["sc-date-claim-served"]?.enteredOn === "2026-09-25");
  }
  check("a 'when were you served' question is a service date", isServiceDateQuestion("sc-date-claim-served", "When were you served with the claim?"));
  check("a hearing date is not", !isServiceDateQuestion("x", "When is the hearing scheduled?"));
  const panel = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check("the deadline box asks how the papers were served for a service date", /isServiceDateQuestion\(question\.id, question\.question\)/.test(panel) && /How were the papers served\?/.test(panel));
  check("the deadline counts from the day service is effective", /asked\[question\.id\] = effectiveServiceDate\(serviceCourt, method, typed\)\.date/.test(panel));
  check("the saved date shows how it was served and the rule", /Service counts from/.test(panel) && /effective\.rules\.join/.test(panel));
}

console.log("\n4. How it was served, from the story (pre-selected, not applied unseen)");
check("'handed me the plaintiffs claim at my door' is in person", serviceMethodFromStory("small-claims", "someone handed me the plaintiffs claim at my door on october 1") === "personal");
check("'got the plaintiffs claim in the mail' is mail", serviceMethodFromStory("small-claims", "i got the plaintiffs claim in the mail on september 28") === "mail");
// Walkthrough RN (2026-10-13): every everyday way of saying it came by mail.
for (const words of ["the claim came by mail on september 28", "they mailed me the plaintiffs claim", "it came in the mail last week", "i got it by mail"]) {
  check(`'${words}' is mail`, serviceMethodFromStory("small-claims", words) === "mail", String(serviceMethodFromStory("small-claims", words)));
}
check("Small Claims registered mail signed for is its own method", serviceMethodFromStory("small-claims", "it came by registered mail and i signed for it") === "registered-mail-signature");
check("a story that says nothing gives nothing", serviceMethodFromStory("civil", "i got served a statement of claim") === null);
check("a story naming two ways gives nothing", serviceMethodFromStory("family", "they emailed it and then handed me the papers") === null);
check("the deadline box uses it, shown and changeable", /serviceMethod\[question\.id\] \?\? storyServiceMethod/.test(readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8")));

console.log("\nThe day papers arrived is never counted as the day they were mailed (2026-10-13)");
{
  check("'got the claim in the mail on september 28' is an arrival, not a mailing", arrivalNotSendDate("mail", "i got the plaintiffs claim in the mail on september 28"));
  check("'he mailed it on september 20' is the mailing day", !arrivalNotSendDate("mail", "he mailed it to me on september 20"));
  check("handed over in person counts from that day", !arrivalNotSendDate("personal", "i got the papers at my door on september 28"));
  check("signed for counts from the signature", !arrivalNotSendDate("registered-mail-signature", "i got it by registered mail on september 28"));
  check("a courier delivery is an arrival", arrivalNotSendDate("courier", "it arrived by courier on october 2"));
  const story =
    "a contractor did my bathroom reno and now hes suing me in small claims for 7500 he says i owe. the tiles are cracked and the shower leaks into the basement so i stopped paying. i got the plaintiffs claim in the mail on september 28 2026";
  const hints = storyHintsForDates(story, new Date("2026-10-12T12:00:00Z"));
  const arrival = arrivalOnlyDates({ stageId: "defendant:served-defence-period-running", court: "small-claims", storyText: story, storyHints: hints, methods: {} });
  check("the renovation defendant's arrival date is held back from the count", Object.keys(arrival).length === 1, JSON.stringify({ hints, arrival }));
  const typedMethod = arrivalOnlyDates({
    stageId: "defendant:served-defence-period-running",
    court: "small-claims",
    storyText: story,
    storyHints: hints,
    methods: Object.fromEntries(Object.keys(arrival).map((id) => [id, "personal" as const])),
  });
  check("choosing 'handed to me' counts from that day again", Object.keys(typedMethod).length === 0);
  const panel = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check("held-back dates never reach the count", /!arrivalOnly\[id\]\) out\[id\] = \{ value: hint\.value/.test(panel) && /useState<Record<string, string>>\(initialCountable\)/.test(panel));
  check("the person is told why, and what date to look for", /That is the day the papers reached you/.test(panel));

  // 2026-10-13, walkthrough run: the story said "september 28" with no year;
  // the arrival note showed, but "Which year was that?" was offered beside it
  // and one click counted the arrival day as the mailing day. No date from
  // the story is offered for an arrival-only question, with or without a year.
  const yearless = story.replace(/ 2026$/, "");
  const yearlessHints = storyHintsForDates(yearless, new Date("2026-10-12T12:00:00Z"));
  const yearlessArrival = arrivalOnlyDates({ stageId: "defendant:served-defence-period-running", court: "small-claims", storyText: yearless, storyHints: yearlessHints, methods: {} });
  const heldBack = Object.keys(yearlessArrival);
  check("a yearless arrival date is held back too", heldBack.length === 1, JSON.stringify(yearlessHints));
  check("an arrival-only date is never offered as a date to count from", heldBack.every((id) => !offerStoryDate(id, yearlessArrival)) && offerStoryDate("some-other-question", yearlessArrival));
  check("the date list asks offerStoryDate before offering a story date", /!offerStoryDate\(question\.id, arrivalOnly\)\s*\?\s*undefined/.test(panel));
  const note = arrivalNoteFor(heldBack.map((id) => ({ id })), yearlessArrival, {}, "small-claims", {}, "mail");
  check("the card says what date to give, with the rule that counts from it", note?.dateToEnter === "the day it was mailed" && note.rule === "O. Reg. 258/98, r. 8.07 (2)" && corpus["small-claims"].includes(flat(note.ruleQuote)));
  check("once the person gives the mailing date, the note goes", arrivalNoteFor(heldBack.map((id) => ({ id })), yearlessArrival, Object.fromEntries(heldBack.map((id) => [id, "2026-09-24"])), "small-claims", {}, "mail") === null);
  // Walkthrough 2026-10-14, RN: the note said "service counts from the day it
  // was mailed"; r. 8.07 (2) says service by mail is effective on the fifth
  // day after mailing. The note now says the rule's own effective day, and
  // shows the latest last day, counted from the arrival day, as "no later
  // than", only where the starting day is on or before arrival.
  check("the note says when service is effective, as the rule does", note?.effectiveSay === "service is effective on the fifth day after the day it was mailed" && /fifth day following the date of mailing/.test(note.ruleQuote));
  check("no sentence on the panel says service or the rules 'count from' the mailing day", !/service counts from|the rules count from/.test(panel));
  check("both notes use the rule's effective day (whenEffectiveSay)", (panel.match(/whenEffectiveSay\(rule\)/g) ?? []).length >= 2);
  for (const court of Object.keys(SERVICE_RULES) as ServiceCourt[]) {
    for (const rule of SERVICE_RULES[court].filter((item) => item.addDays > 0)) {
      const say = whenEffectiveSay(rule);
      check(`${court}: ${rule.method} says its own day count`, say.includes(rule.dateToEnter) && (rule.addDays !== 5 || /fifth day after/.test(say)) && (rule.addDays !== 2 || /second day after/.test(say)));
    }
  }
  const stageId = "defendant:served-defence-period-running";
  const qid = "sc-date-claim-served";
  const withYear = arrivalNoteFor([{ id: qid }], { [qid]: "i got the plaintiffs claim in the mail on september 28" }, {}, "small-claims", {}, "mail", {
    stageId,
    hints: { [qid]: { quote: "i got the plaintiffs claim in the mail on september 28", value: "2026-09-28", yearAssumed: true } },
  });
  check("RN: the note shows the latest last day for the defence, counted from the arrival day", (withYear?.latest.length ?? 0) === 1 && Boolean(withYear?.yearAssumed), JSON.stringify(withYear?.latest));
  // Property: for any arrival day and any mailing day on or before it, the
  // real last day is never after the one shown.
  let boundMisses = 0;
  for (let offset = 0; offset < 366; offset += 3) {
    const arrived = addDaysIso("2026-01-01", offset);
    const latest = latestFromArrival(stageId, qid, "small-claims", "mail", arrived)[0];
    if (!latest) {
      boundMisses += 1;
      continue;
    }
    for (let back = 0; back <= 10; back += 1) {
      const real = latestFromArrival(stageId, qid, "small-claims", "mail", addDaysIso(arrived, -back))[0];
      if (!real || real.iso > latest.iso) boundMisses += 1;
    }
  }
  check("for every arrival day, a mailing day on or before it never gives a later last day than the one shown", boundMisses === 0, `misses ${boundMisses}`);
  const notBefore = (Object.keys(SERVICE_RULES) as ServiceCourt[]).flatMap((court) =>
    SERVICE_RULES[court].filter((rule) => !SENT_ON_OR_BEFORE_ARRIVAL.has(rule.method)).filter((rule) => latestFromArrival(stageId, qid, court, rule.method, "2026-09-28").length > 0).map((rule) => `${court}:${rule.method}`),
  );
  check("no latest day for a way of serving whose day can come after arrival (courier, left and mailed)", notBefore.length === 0, notBefore.join(", "));
  check("the card shows it as 'no later than', conditional on regular mail, never as the last day", /if they came by regular mail, your last day is no later\s+than/.test(panel) && /It may be earlier\./.test(panel) && /arrival=\{arrivalNoteFor\(/.test(panel));
}

console.log("\nA Small Claims fifth day on a closed day says what the rules say, with the rule (2026-10-13)");
{
  const weekend = effectiveServiceDate("small-claims", "mail", "2026-09-28");
  check("mailed Mon Sept 28: the fifth day is Saturday Oct 3, flagged to confirm", weekend.date === "2026-10-03" && Boolean(weekend.confirm));
  check("the note quotes r. 3.01, and the quote is the saved rule", /r\. 3\.01/.test(weekend.confirm ?? "") && corpus["small-claims"].includes(flat(SC_R3_01_LAST_DAY.quote)));
  check("the note never claims the rules are silent", assertsAbsenceProblems(weekend.confirm ?? "").length === 0 && assertsAbsenceProblems(smallClaimsFifthDayOnClosedDay("Sunday")).length === 0, weekend.confirm);
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
