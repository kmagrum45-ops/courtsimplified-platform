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
 * (legal review 2026-10-14) Regular mail offered, or a mail "no later than"
 * date shown, for a claim or application (Small Claims r. 8.01 (1), civil
 * r. 16.01 (1), family r. 8 (5)); the ways by post for a claim without their
 * rules; an arrival note or date on a step where the person served the
 * papers; a shown date that has passed without "That date has already passed".
 * (re-check 2026-10-14) A motion to change given the application rule instead
 * of r. 15 (7); a date counted from the mailed copy's arrival called "safest",
 * or without the first-copy rule; the company route (r. 8.03 (3), 16.03 (6))
 * missing; a respondent on an either-side step given no arrival note.
 * (final re-check 2026-10-14) "first saw" read as the first copy; a company
 * defendant told "safest" or "your home"; the Small Claims company route by
 * courier counted from the mailing day.
 * (walkthrough run 38525903567, SD) the company route offered to a person
 * served (r. 8.03 (3) is service "on the corporation"), or hidden from a
 * company or a party nobody's words describe (review of bee9daf: only
 * positive evidence of an individual hides it; on the plaintiff side the other
 * party's name is judged), or a panel lookup using a different list; a date with no year
 * explained as "its most recent year" instead of the day counted.
 *
 * COSTS NOTHING: reads the saved rules, no network, no model.
 *
 * Run: npm run test:service-dates
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { applyPositionPatch, EMPTY_POSITION, isServiceDateQuestion, readCasePosition, storyHintsForDates } from "../../src/lib/case-system/casePosition";
import { arrivalNoteFor, arrivalOnlyDates, countedFromService, firstCopyQuote, latestFromArrival, offerStoryDate, receivesPapersStep, servedOnFor, yearAssumedWords } from "../../app/builder/_components/StageAnswerPanel";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { DEADLINE_EVENTS } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { addDays as addDaysIso } from "../../src/lib/case-system/deadlines/holidays";
import {
  arrivalNotSendDate,
  FAMILY_CLOSED_DAY_RULE,
  SC_R3_01_LAST_DAY,
  SENT_ON_OR_BEFORE_ARRIVAL,
  ORIGINATING_METHODS,
  ORIGINATING_QUESTIONS,
  ORIGINATING_RULE,
  originatingRuleFor,
  COMPANY_ROUTE,
  postWaysForClaim,
  serviceRulesFor,
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
    check(`${court}: ${rule.method} quote is in ${rule.rule}`, inCorpus(court, rule.quote), rule.quote);
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
check("the deadline box uses it, shown and changeable", /serviceMethod\[question\.id\] \?\? storyMethodFor\(question\.id\)/.test(readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8")));

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
  check("once the person gives the date, the note goes", arrivalNoteFor(heldBack.map((id) => ({ id })), yearlessArrival, Object.fromEntries(heldBack.map((id) => [id, "2026-09-24"])), "small-claims", {}, "mail") === null);
  check("no sentence on the panel says service or the rules 'count from' the mailing day", !/service counts from|the rules count from/.test(panel));
  for (const court of Object.keys(SERVICE_RULES) as ServiceCourt[]) {
    for (const rule of SERVICE_RULES[court].filter((item) => item.addDays > 0)) {
      const say = whenEffectiveSay(rule);
      check(`${court}: ${rule.method} says its own day count`, say.includes(rule.dateToEnter) && (rule.addDays !== 5 || /fifth day after/.test(say)) && (rule.addDays !== 2 || /second day after/.test(say)));
    }
  }
}

console.log("\nA claim or application is not served by regular mail (legal review 2026-10-14)");
{
  // Small Claims r. 8.01 (1), civil r. 16.01 (1), family r. 8 (5) / 6 (3):
  // the ways to serve a claim or application, never r. 8.07 (2) regular mail.
  for (const court of Object.keys(SERVICE_RULES) as ServiceCourt[]) {
    const rule = ORIGINATING_RULE[court];
    check(`${court}: the rule on serving a claim or application is the saved text (${rule.rule})`, inCorpus(court, rule.quote));
    for (const questionId of ORIGINATING_QUESTIONS[court]) {
      const offered = serviceRulesFor(court, questionId).map((item) => item.method);
      check(`${court} ${questionId}: offers only the ways the rules allow for it, never regular mail or courier alone`, offered.length > 0 && offered.every((method) => ORIGINATING_METHODS[court].includes(method)) && !offered.includes("mail") && !offered.some((method) => method.startsWith("courier")), offered.join(", "));
    }
    const ways = postWaysForClaim(court);
    check(`${court}: each way by post is quoted from the saved text, with its effective day where the rules set one`, ways.length > 0 && ways.every((way) => inCorpus(court, way.quote) && (way.effective === null || /^service is effective on /.test(way.effective))));
  }
  check("Small Claims: signed for (r. 8.03 (8)), left at home with a copy mailed (r. 8.03 (4)), and the company route (r. 8.03 (3), (4))", ["r. 8.03 (8)", "r. 8.03 (4)", "r. 8.03 (3), (4)"].every((pin) => postWaysForClaim("small-claims").some((way) => way.rule.endsWith(pin))));
  check("civil: the company route (r. 16.03 (6), mail effective under r. 16.06 (2)) is among them", postWaysForClaim("civil").some((way) => /r\. 16\.03 \(6\)/.test(way.rule) && /fifth day after/.test(way.effective ?? "")));
  check("the company route is offered only for a claim", (Object.keys(SERVICE_RULES) as ServiceCourt[]).every((court) => !serviceRulesFor(court).some((item) => COMPANY_ROUTE.has(item.method)) && !serviceRulesFor(court, "case-date-defence-served").some((item) => COMPANY_ROUTE.has(item.method))));
  // Final re-check 2026-10-14: r. 8.03 (4) counts the mailed route from mailing and the couriered route from the courier's confirmed delivery.
  {
    const byMail = SERVICE_RULES["small-claims"].find((rule) => rule.method === "corporation-mail");
    const byCourier = SERVICE_RULES["small-claims"].find((rule) => rule.method === "corporation-courier");
    check(
      "Small Claims company route: by mail from the day it was mailed, by courier from the day the courier confirmed delivery, both r. 8.03 (4)",
      byMail?.dateToEnter === "the day it was mailed" && byCourier?.dateToEnter === "the day the courier confirmed it was delivered" && [byMail, byCourier].every((rule) => /verified by courier that it was delivered/.test(rule?.quote ?? "") && rule?.addDays === 5) && serviceRulesFor("small-claims", "sc-date-claim-served").some((rule) => rule.method === "corporation-courier"),
    );
  }
  check("a saved company-route method is still read back", readCasePosition({ position: { service: { "sc-date-claim-served": { method: "corporation-mail", enteredOn: "2026-09-20" } } } }, "small-claims").service?.["sc-date-claim-served"]?.method === "corporation-mail");
  // A motion to change is not an application (re-check 2026-10-14): r. 15 (7), not r. 8 (5).
  const motionRule = originatingRuleFor("family", "case-date-served-with-motion-to-change");
  check("family motion to change: r. 15 (7), quoted from the saved text, never the application rule", motionRule.rule.endsWith("r. 15 (7)") && inCorpus("family", motionRule.quote) && /motion to change/i.test(motionRule.say) && !/application/i.test(`${motionRule.say} ${motionRule.quote}`));
  const ruleMismatch = [...ORIGINATING_QUESTIONS.family].filter((id) => {
    const rule = originatingRuleFor("family", id);
    return /application/.test(id) ? !/^The application shall/.test(rule.quote) : /motion-to-change/.test(id) ? !rule.rule.endsWith("r. 15 (7)") : true;
  });
  check("each family claim-type question gets the rule for its own papers", ruleMismatch.length === 0, ruleMismatch.join(", "));
  check("civil: the acknowledgment card (r. 16.03 (4)) is among them", postWaysForClaim("civil").some((way) => /r\. 16\.03 \(4\)/.test(way.rule)));
  check("family: the return postcard (r. 6 (3) (c)) is among them", postWaysForClaim("family").some((way) => /r\. 6 \(3\) \(c\)/.test(way.rule)));
  check("other papers still offer every way, regular mail included", serviceRulesFor("small-claims", "sc-date-defence-filed").some((item) => item.method === "mail"));

  // The four responding steps: no "no later than" date from a mail rule; the
  // safest date counted from the day the papers first reached them instead.
  const responding: [string, ServiceCourt, string][] = [
    ["defendant:served-defence-period-running", "small-claims", "sc-date-claim-served"],
    ["civil:defendant:served-defence-period-running", "civil", "sc-date-claim-served"],
    ["family:respondent:served-time-to-answer-running", "family", "case-date-served-with-application"],
  ];
  for (const [stageId, court, qid] of responding) {
    const quote = "i got the papers in the mail on september 28";
    const note = arrivalNoteFor([{ id: qid }], { [qid]: quote }, {}, court, {}, "mail", { stageId, hints: { [qid]: { quote, value: "2026-09-28" } } }, "2026-10-01");
    const counted = countedFromService(stageId, qid, "2026-09-28", "2026-10-01");
    check(
      `${stageId}: the note quotes the claim rule, lists the ways by post, and gives the safest date from the day they arrived -- no mail bound`,
      note?.kind === "claim" && note.claimRule?.rule === ORIGINATING_RULE[court].rule && note.postWays.length > 0 && note.latest.length === 0 && note.safest.length > 0 && note.safest.map((entry) => entry.iso).join() === counted.map((entry) => entry.iso).join(),
      JSON.stringify(note),
    );
  }
  const panel = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  // Re-check 2026-10-14: the day the MAILED copy arrived can be after service
  // took effect on a copy left or signed for earlier. "Safest" only when the
  // words say it is the first copy to reach the home; the rule for counting
  // from the first copy is always said.
  check("the card says to count from the first copy reaching the home, and from a copy left earlier", /Count from the first day a copy reached your home: signed for there, left with someone there, or arrived in the\s+mail\. If a copy was left at your home earlier than the one you got in the mail, count from the day it was left\./.test(panel) && /affidavit of service\. The court office can also tell you/.test(panel));
  check("'safest' only when the words say first copy; otherwise 'counted from the day you gave'", /arrival\.firstCopy\s*\?\s*"The safest date to act by, counted from the first day a copy reached your home: "\s*:\s*"Counted from the day you gave: "/.test(panel));
  check("'got the claim in the mail' is not the first copy; signed for, left with, or 'first' is", !firstCopyQuote("i got the plaintiffs claim in the mail on september 28") && firstCopyQuote("my wife signed for it on september 28") && firstCopyQuote("they left a copy with my son on september 26") && firstCopyQuote("the first copy came on september 26"));
  // Final re-check 2026-10-14: only home-arrival words, never "first saw" / "first got".
  check("'I first saw the claim' and 'first got' are not the first copy reaching the home; 'first came to the house' and 'first arrived' are", !firstCopyQuote("I first saw the claim on october 5") && !firstCopyQuote("i first got the papers on october 5") && firstCopyQuote("it first came to the house on october 2") && firstCopyQuote("the claim first arrived on october 2"));
  {
    const quote = "i got the papers in the mail on september 28";
    const mailed = arrivalNoteFor([{ id: "sc-date-claim-served" }], { "sc-date-claim-served": quote }, {}, "small-claims", {}, "mail", { stageId: "defendant:served-defence-period-running", hints: { "sc-date-claim-served": { quote, value: "2026-09-28" } } }, "2026-10-01");
    check("the renovation note is not called the safest date", mailed?.firstCopy === false && (mailed?.safest.length ?? 0) > 0);
    // A company: service by mail is effective five days after mailing, which can be before the papers arrived.
    const signed = "the manager signed for it on september 28";
    const company = arrivalNoteFor([{ id: "sc-date-claim-served" }], { "sc-date-claim-served": signed }, {}, "small-claims", {}, "registered-mail-signature", { stageId: "defendant:served-defence-period-running", hints: { "sc-date-claim-served": { quote: signed, value: "2026-09-28" } }, storyText: `a supplier is suing my company for 9000. ${signed}` }, "2026-10-01");
    const byRoute = arrivalNoteFor([{ id: "sc-date-claim-served" }], { "sc-date-claim-served": signed }, {}, "small-claims", { "sc-date-claim-served": "corporation-mail" }, null, { stageId: "defendant:served-defence-period-running", hints: { "sc-date-claim-served": { quote: signed, value: "2026-09-28" } } }, "2026-10-01");
    check("a company defendant is never told 'safest', even for words about signing for it; nor when the company route is chosen", company?.company === true && company.firstCopy === false && byRoute?.company === true && byRoute.firstCopy === false);
  }
  {
    const source = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
    check(
      "the company note says 'your address' and that mailed service can take effect before it arrives, with the affidavit of service",
      source.includes("Count from the first day a copy reached your address: signed for there, left with someone there, or arrived in the mail. If a copy was left at your address earlier than the one you got in the mail, count from the day it was left. If it was mailed to the company, service is effective on the fifth day after mailing, which can be before it arrived. The mailing date is on the affidavit of service.") && /arrival\.company\s*\?/.test(source),
    );
  }
  check("the card never says whether service was valid", !/\b(?:valid|invalid|improperly served|not properly served)\b/i.test(panel.slice(panel.indexOf('data-testid="next-step-arrival"'), panel.indexOf("{mipNote ?", panel.indexOf('data-testid="next-step-arrival"'))).replace(/^\s*\/\/.*$/gm, "")));
  check("the date box offers the ways for the question asked (serviceRulesFor with the question)", /waysFor\(question\.id\)\.map\(/.test(panel) && /const waysFor = \(questionId: string\) =>\s+serviceCourt \? serviceRulesFor\(serviceCourt, questionId,/.test(panel) && /storyMethodFor\(question\.id\)/.test(panel));
}

console.log("\nThe 'no later than' date: only papers that may be served by mail, only for the person who received them (legal review 2026-10-14)");
{
  // A document that may be served by mail, on a step where the person was
  // served with it: civil request to admit (r. 16.06 (2), mail).
  const stageId = "civil:both:served-with-request-to-admit";
  const qid = "case-date-served-with-request-to-admit";
  let boundMisses = 0;
  let any = 0;
  for (let offset = 0; offset < 366; offset += 3) {
    const arrived = addDaysIso("2026-01-01", offset);
    const latest = latestFromArrival(stageId, qid, "civil", "mail", arrived, "2026-01-01")[0];
    if (!latest) continue;
    any += 1;
    for (let back = 0; back <= 10; back += 1) {
      const real = latestFromArrival(stageId, qid, "civil", "mail", addDaysIso(arrived, -back), "2026-01-01")[0];
      if (!real || real.iso > latest.iso) boundMisses += 1;
    }
  }
  check("for every arrival day, a mailing day on or before it never gives a later last day than the one shown", any > 0 && boundMisses === 0, `shown ${any}, misses ${boundMisses}`);
  const notBefore = (Object.keys(SERVICE_RULES) as ServiceCourt[]).flatMap((court) =>
    SERVICE_RULES[court].filter((rule) => !SENT_ON_OR_BEFORE_ARRIVAL.has(rule.method)).filter((rule) => latestFromArrival(stageId, qid, court, rule.method, "2026-09-28").length > 0).map((rule) => `${court}:${rule.method}`),
  );
  check("no latest day for a way of serving whose day can come after arrival (courier, left and mailed)", notBefore.length === 0, notBefore.join(", "));
  const claimBound = (Object.keys(ORIGINATING_QUESTIONS) as ServiceCourt[]).flatMap((court) =>
    ALL_STAGES.flatMap((stage) => [...ORIGINATING_QUESTIONS[court]].filter((id) => latestFromArrival(stage.id, id, court, "mail", "2026-09-28").length > 0).map((id) => `${stage.id} ${id}`)),
  );
  check("never a mail bound for a claim or application, on any step", claimBound.length === 0, claimBound.slice(0, 4).join("; "));
  // Item 3: never on a step where the person served the papers.
  const notReceiving = ALL_STAGES.filter((stage) => !receivesPapersStep(stage.id)).flatMap((stage) =>
    (["small-claims", "civil", "family"] as ServiceCourt[]).flatMap((court) =>
      ["case-date-served-with-request-to-admit", "case-date-defence-served", "sc-date-claim-served"].filter((id) => latestFromArrival(stage.id, id, court, "mail", "2026-09-28").length > 0 || countedArrivalNote(stage.id, id, court)).map((id) => `${stage.id} ${id}`),
    ),
  );
  check("no arrival note or date on a step where the person served the papers (no 'your' for the other side's deadline)", notReceiving.length === 0, notReceiving.slice(0, 4).join("; "));
  // Re-check 2026-10-14: the person's side on an "either side" step counts.
  check("a respondent on an either-side step receives the papers; the mover does not", receivesPapersStep("family:both:asking-to-change-final-order", true) && !receivesPapersStep("family:both:asking-to-change-final-order", false));
  {
    const quote = "i got her motion to change in the mail on september 28";
    const hints = { "case-date-served-with-motion-to-change": { quote, value: "2026-09-28" } };
    const asResponder = arrivalOnlyDates({ stageId: "family:both:asking-to-change-final-order", court: "family", storyText: quote, storyHints: hints, methods: {}, responding: true });
    const asMover = arrivalOnlyDates({ stageId: "family:both:asking-to-change-final-order", court: "family", storyText: quote, storyHints: hints, methods: {}, responding: false });
    const note = arrivalNoteFor([{ id: "case-date-served-with-motion-to-change" }], asResponder, {}, "family", {}, "mail", { stageId: "family:both:asking-to-change-final-order", hints, responding: true }, "2026-10-01");
    check("a respondent to a motion to change gets the arrival note, with r. 15 (7)", Object.keys(asResponder).length === 1 && Object.keys(asMover).length === 0 && note?.claimRule?.rule.endsWith("r. 15 (7)") === true, JSON.stringify({ asResponder, asMover, rule: note?.claimRule?.rule }));
    // Reviewer 2026-10-14: the arrival note's dates are the person's own, in their words.
    const whats = (note?.safest ?? []).map((entry) => entry.what);
    check("the respondent's arrival note says 'Your time to serve and file a response (Form 15B) ...', never 'The other party's time'", whats.some((what) => /^Your time to serve and file a response \(Form 15B\)/.test(what)) && !whats.some((what) => /^The other party's time/.test(what)), whats.join(" | "));
    // Property: on every either-side step, no date counted from the person being served is worded as the other party's when they respond.
    const otherWorded = ALL_STAGES.filter((stage) => /:both:/.test(stage.id)).flatMap((stage) =>
      [...new Set(stage.deadlines.filter((deadline) => /^served-with/.test(deadline.countFromEvent)).map((deadline) => (DEADLINE_EVENTS as Record<string, { questionId?: string }>)[deadline.countFromEvent]?.questionId).filter((id): id is string => Boolean(id)))].flatMap((qid) =>
        countedFromService(stage.id, qid, "2026-09-28", "2026-10-01", true).filter((entry) => /^The other party's time/.test(entry.what)).map((entry) => `${stage.id}: ${entry.what}`),
      ),
    );
    check("no date counted from being served, shown to the responding side on an either-side step, is worded as the other party's", otherWorded.length === 0, otherWorded.slice(0, 4).join("; "));
  }
  { const source = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8"); check("the panel passes the person's side to the arrival readers", /methods: serviceMethod, responding \}/.test(source) && /hints: storyHints,\s*responding,/.test(source)); }
  check("plaintiff awaiting a defence: an arrival sentence is not held back as the papers reaching them", Object.keys(arrivalOnlyDates({ stageId: "plaintiff:served-awaiting-defence", court: "small-claims", storyText: "i got the claim back in the mail on september 28", storyHints: { "sc-date-claim-served": { quote: "i got the claim back in the mail on september 28", value: "2026-09-28" } }, methods: {} })).length === 0);
  // Item 4: a shown date that has passed says so (limitPassedState).
  const past = latestFromArrival(stageId, qid, "civil", "mail", "2026-01-05", "2026-12-31");
  const future = latestFromArrival(stageId, qid, "civil", "mail", "2026-01-05", "2026-01-06");
  check("a shown date that has passed is marked passed, one still to come is not", past.length > 0 && past.every((entry) => entry.passed) && future.every((entry) => !entry.passed));
  const panel = readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check("the card says 'That date has already passed' beside any passed date it shows", (panel.match(/entry\.passed \? "\. That date has already passed" : ""/g) ?? []).length >= 2);
  check("the card shows the mail bound as 'no later than', conditional on regular mail", /if they came by regular mail, your last day is no later\s+than/.test(panel) && /It may be earlier\./.test(panel));
}

console.log("\nA Small Claims fifth day on a closed day says what the rules say, with the rule (2026-10-13)");
{
  const weekend = effectiveServiceDate("small-claims", "mail", "2026-09-28");
  check("mailed Mon Sept 28: the fifth day is Saturday Oct 3, flagged to confirm", weekend.date === "2026-10-03" && Boolean(weekend.confirm));
  check("the note quotes r. 3.01, and the quote is the saved rule", /r\. 3\.01/.test(weekend.confirm ?? "") && corpus["small-claims"].includes(flat(SC_R3_01_LAST_DAY.quote)));
  check("the note never claims the rules are silent", assertsAbsenceProblems(weekend.confirm ?? "").length === 0 && assertsAbsenceProblems(smallClaimsFifthDayOnClosedDay("Sunday")).length === 0, weekend.confirm);
}

console.log("\nThe company route only for a company; the year said plainly (walkthrough run 38525903567, SD)");
{
  // r. 8.03 (3) / 16.03 (6) is service "on the corporation": a person served is
  // never offered it; a company, or a route already chosen, keeps it; unknown keeps every way.
  const homeowner = "a contractor did my bathroom reno and now hes suing me in small claims for 7500 he says i owe. i got the plaintiffs claim in the mail on september 28";
  const offeredWrong: string[] = [];
  for (const court of Object.keys(ORIGINATING_QUESTIONS) as ServiceCourt[]) {
    for (const questionId of ORIGINATING_QUESTIONS[court]) {
      const person = serviceRulesFor(court, questionId, servedOnFor(homeowner, "defendant:served-defence-period-running", true)).map((rule) => rule.method);
      const company = serviceRulesFor(court, questionId, servedOnFor("a supplier sued my company", "defendant:served-defence-period-running", true)).map((rule) => rule.method);
      const chosen = serviceRulesFor(court, questionId, servedOnFor(homeowner, "defendant:served-defence-period-running", true, "corporation-mail")).map((rule) => rule.method);
      const all = serviceRulesFor(court, questionId).map((rule) => rule.method);
      const companyWays = ORIGINATING_METHODS[court].filter((method) => COMPANY_ROUTE.has(method));
      if (person.some((method) => COMPANY_ROUTE.has(method))) offeredWrong.push(`${court} ${questionId}: company route offered to a person`);
      if (!companyWays.every((method) => company.includes(method) && chosen.includes(method) && all.includes(method))) offeredWrong.push(`${court} ${questionId}: company route lost`);
      if (person.length !== all.length - companyWays.length) offeredWrong.push(`${court} ${questionId}: a person lost a way that is not the company route`);
      const postPerson = postWaysForClaim(court, servedOnFor(homeowner, "defendant:served-defence-period-running", true)).map((way) => way.label);
      if (companyWays.some((method) => postPerson.includes(SERVICE_RULES[court].find((rule) => rule.method === method)!.label))) offeredWrong.push(`${court}: company way among a person's ways by post`);
    }
  }
  check("a person is never offered the company route; a company, a chosen route or no words keep it", offeredWrong.length === 0, offeredWrong.join("; "));
  const sd = arrivalNoteFor(
    [{ id: "sc-date-claim-served" }],
    { "sc-date-claim-served": "i got the plaintiffs claim in the mail on september 28" },
    {},
    "small-claims",
    {},
    "mail",
    { stageId: "defendant:served-defence-period-running", hints: { "sc-date-claim-served": { quote: "i got the plaintiffs claim in the mail on september 28", value: "2026-09-28", yearAssumed: true } }, storyText: homeowner },
    "2026-10-14",
  );
  check(
    "SD: the arrival note's ways by post leave out the company route",
    Boolean(sd) && sd!.postWays.length > 0 && !sd!.postWays.some((way) => /company/i.test(way.label)),
    sd?.postWays.map((way) => way.label).join(" | "),
  );
  check(
    "a date with no year says plainly which day was counted, with its year",
    Boolean(sd) && sd!.yearAssumed && yearAssumedWords(sd!.arrivedOn).includes("Monday 28 September 2026") && !/most recent year/.test(yearAssumedWords(sd!.arrivedOn)),
    sd ? yearAssumedWords(sd.arrivedOn) : "",
  );
  const panel = readFileSync(path.join(ROOT, "app", "builder", "_components", "StageAnswerPanel.tsx"), "utf8");
  check("the panel's select offers only the ways for who was served", /serviceRulesFor\(serviceCourt, questionId, servedOnFor\(/.test(panel));

  // Review of bee9daf: the company route hidden only on positive evidence of an individual.
  const companyKept = (words: string, stageId: string, responding: boolean) => servedOnFor(words, stageId, responding).company !== false;
  check(
    "kept for a company: a plaintiff suing 'ABC Renovations Inc.'; 'a customer is suing my business'; 'our numbered company got a claim'",
    servedOnFor("I am suing ABC Renovations Inc. for the botched deck", "plaintiff:claim-issued-not-served", false).company === true &&
      servedOnFor("a customer is suing my business over a refund", "defendant:served-defence-period-running", true).company === true &&
      servedOnFor("our numbered company got a claim in the mail", "defendant:served-defence-period-running", true).company === true,
  );
  check(
    "kept when nothing says who was served ('not known' keeps every way)",
    servedOnFor("the claim came on october 2", "defendant:served-defence-period-running", true).company === undefined && servedOnFor("I want to serve the claim", "plaintiff:claim-issued-not-served", false).company === undefined,
  );
  check(
    "hidden only on positive evidence of an individual",
    !companyKept(homeowner, "defendant:served-defence-period-running", true) && !companyKept("I sued my old roommate for the rent he owes", "plaintiff:claim-issued-not-served", false) && companyKept("I sued my old roommate's company, Roomco Ltd.", "plaintiff:claim-issued-not-served", false),
  );
  // Re-review of 6a0fce6: these were read as an individual.
  const probes: [string, string, boolean][] = [
    ["I own a renovation company. A client is suing me", "defendant:served-defence-period-running", true],
    ["I run a small contracting business and a customer sued me", "defendant:served-defence-period-running", true],
    ["I'm suing my landlord for my deposit", "plaintiff:claim-issued-not-served", false],
    ["I sued my former landlord, a property management outfit", "plaintiff:claim-issued-not-served", false],
    ["I'm suing my ex boss at the restaurant", "plaintiff:claim-issued-not-served", false],
  ];
  probes.push(
    ["I'm suing my neighbour and my landlord over the flood", "plaintiff:claim-issued-not-served", false],
    ["I'm suing my roommate and ABC Renovations Inc.", "plaintiff:claim-issued-not-served", false],
  );
  const misread = probes.filter(([words, stageId, responding]) => servedOnFor(words, stageId, responding).company === false).map(([words]) => words);
  check("never 'individual' for a business owner, a landlord, an ex boss, or several parties one of which is a landlord or a business (seven probes)", misread.length === 0, misread.join(" | "));
  check("'my ex' on its own, and 'my ex-wife', are individuals", servedOnFor("I am suing my ex for the car", "plaintiff:claim-issued-not-served", false).company === false && servedOnFor("I am suing my ex-wife", "plaintiff:claim-issued-not-served", false).company === false);
  check("a numbered company named as the other side is a company", servedOnFor("I am suing 1234567 Ontario Inc.", "plaintiff:claim-issued-not-served", false).company === true);
  // Every lookup of a way on the panel uses the same list, so a detected or saved route always has its option.
  const lookups = panel.match(/serviceRulesFor\(serviceCourt, question\.id[^)]*\)/g) ?? [];
  check("every lookup on the panel goes through the one list (waysFor)", lookups.length === 0 && (panel.match(/waysFor\(question\.id\)/g) ?? []).length >= 5);
  const arrivalCompany = arrivalNoteFor(
    [{ id: "sc-date-claim-served" }],
    { "sc-date-claim-served": "our numbered company got the plaintiffs claim in the mail on september 28" },
    {},
    "small-claims",
    {},
    "mail",
    { stageId: "defendant:served-defence-period-running", hints: { "sc-date-claim-served": { quote: "our numbered company got the plaintiffs claim in the mail on september 28", value: "2026-09-28", yearAssumed: true } }, storyText: "our numbered company got the plaintiffs claim in the mail on september 28" },
    "2026-10-14",
  );
  check("a company served keeps the company route among the ways by post", Boolean(arrivalCompany?.postWays.some((way) => /company/i.test(way.label))));
  check("the panel no longer says 'counting that day in its most recent year'", !/"[^"\n]*most recent year[^"\n]*"/.test(panel.replace(/^\s*(?:\*|\/\/).*$/gm, "")) && (panel.match(/yearAssumedWords\(arrival\.arrivedOn\)/g) ?? []).length === 2);
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;

/** Whether an arrival note would carry any date for this step and question (none for a step where the person served the papers). */
function countedArrivalNote(stageId: string, questionId: string, court: ServiceCourt): boolean {
  const quote = "i got it in the mail on september 28";
  const arrival = arrivalOnlyDates({ stageId, court, storyText: quote, storyHints: { [questionId]: { quote, value: "2026-09-28" } }, methods: {} });
  return Object.keys(arrival).length > 0;
}

/** A quote that may skip material (" ... "): each run is in the saved text. */
function inCorpus(court: ServiceCourt, quote: string): boolean {
  return quote.split(" ... ").every((run) => corpus[court].includes(flat(run)));
}
