/**
 * When service counts from (serviceEffectiveDate.ts, build order Step 2D,
 * 2026-10-12).
 *
 * WHAT IT CATCHES: a rule quote that is not in the saved official text, a
 * method counted from the wrong day, a closed day not moved where the rules
 * move it, and a Small Claims fifth day on a weekend stated as certain.
 *
 * COSTS NOTHING: reads the saved rules, no network, no model.
 *
 * Run: npm run test:service-dates
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { applyPositionPatch, EMPTY_POSITION, isServiceDateQuestion, readCasePosition } from "../../src/lib/case-system/casePosition";
import {
  FAMILY_CLOSED_DAY_RULE,
  SERVICE_RULES,
  effectiveServiceDate,
  serviceMethodFromStory,
  type ServiceCourt,
} from "../../src/lib/case-system/deadlines/serviceEffectiveDate";

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
check("Small Claims registered mail signed for is its own method", serviceMethodFromStory("small-claims", "it came by registered mail and i signed for it") === "registered-mail-signature");
check("a story that says nothing gives nothing", serviceMethodFromStory("civil", "i got served a statement of claim") === null);
check("a story naming two ways gives nothing", serviceMethodFromStory("family", "they emailed it and then handed me the papers") === null);
check("the deadline box uses it, shown and changeable", /serviceMethod\[question\.id\] \?\? storyServiceMethod/.test(readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8")));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
