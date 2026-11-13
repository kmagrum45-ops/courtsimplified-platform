/**
 * A PERSON WHO WAS NOT MARRIED TO THE OTHER PERSON IS NOT OFFERED MARRIED-ONLY FAMILY TOPICS (Chrome check of #545,
 * 9 Nov 2026, item 7: an unmarried couple's case-type boxes offered "Divorce", "Dividing property (equalization)" and
 * "Who lives in the family home (matrimonial home...)").
 *
 * What it checks:
 *   1. "Change" on the case page (changeChoices, the kind of case in Family), after "not married" (answered, or the story
 *      says so with no answer), offers none of the married-only topics; a topic already chosen stays shown;
 *   2. married (answered Yes) or nothing known: every topic is offered, as before;
 *   3. the intake's boxes (FamilyIntake) and the step choices (StageAnswerPanel) read the same rule (marriedOnly.ts);
 *   4. every married-only topic and step named in marriedOnly.ts is a real option or stage-map step (no stale list);
 *   5. each provision marriedOnly.ts rests on is found, word for word, in the saved statute text.
 *
 * WHAT FAILURE THIS CATCHES: divorce, equalization or the matrimonial home offered to someone the statutes' own words
 * leave out, on any screen that lists Family case types.
 *
 * Run: npm run test:married-only-topics
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const ROOT = join(__dirname, "..", "..");
const MARRIED_ONLY = ["divorce", "property-division", "matrimonial-home"];
const NEVER = "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me.";

async function main() {
  // The Change box's module loads the browser's database client: a placeholder address (never contacted), no key.
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:9";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "placeholder";
  const { changeChoices } = await import("../../app/_components/ChangeAnswer");
  const { FAMILY_ISSUE_OPTIONS } = await import("../../app/builder/_components/guidedFields");
  const { emptyCaseFile } = await import("../../src/lib/case-system/caseFile/caseFile");
  const { stagesForPathway } = await import("../../src/lib/case-system/stage-map/stageMap");

  const fileMarried = (value: boolean | null) => {
    const file = emptyCaseFile();
    if (value !== null) file.married = { state: "answered", value, confirmed: true, source: { kind: "answer", question: "married-to-other-party" } };
    return file;
  };
  const offered = (choices: unknown) => ((choices as { options?: { value: string }[] } | null)?.options ?? []).map((option) => option.value);
  const changeFor = (file: unknown, story: string, chosen: string[] = []) =>
    offered((changeChoices as (...args: unknown[]) => unknown)("claimKind", "family", { file, story, chosen }));

  // 1. Change, not married.
  const answeredNo = changeFor(fileMarried(false), "");
  check("1a. Change: answered not married -> no married-only topic offered", MARRIED_ONLY.every((id) => !answeredNo.includes(id)), answeredNo.join(", "));
  const storyNo = changeFor(fileMarried(null), NEVER);
  check("1b. Change: the story says never married (no answer) -> no married-only topic offered", MARRIED_ONLY.every((id) => !storyNo.includes(id)), storyNo.join(", "));
  const kept = changeFor(fileMarried(false), "", ["divorce"]);
  check("1c. Change: a married-only topic already chosen stays shown", kept.includes("divorce") && !kept.includes("property-division"), kept.join(", "));
  // 2. Married, or nothing known.
  const married = changeFor(fileMarried(true), NEVER);
  check("2a. Change: answered married -> every topic offered (whatever the story says)", MARRIED_ONLY.every((id) => married.includes(id)), married.join(", "));
  const unknown = changeFor(fileMarried(null), "We separated last year.");
  check("2b. Change: nothing known -> every topic offered", MARRIED_ONLY.every((id) => unknown.includes(id)), unknown.join(", "));
  check("2c. Change: the other topics are offered to everyone (parenting time, spousal support)", ["parenting-time", "spousal-support"].every((id) => answeredNo.includes(id)));

  // 3. The intake's boxes and the step choices read the same rule.
  const intake = readFileSync(join(ROOT, "app/builder/_components/FamilyIntake.tsx"), "utf8");
  const steps = readFileSync(join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check("3a. the intake's \"What issues may exist?\" boxes read marriedOnly.ts", /from "[^"]*family\/marriedOnly"/.test(intake) && /withoutMarriedOnly\(/.test(intake));
  check("3b. the step choices read marriedOnly.ts", /from "[^"]*family\/marriedOnly"/.test(steps) && /MARRIED_ONLY_FAMILY_STEPS/.test(steps));

  // 4. No stale names.
  const rule = await import("../../src/lib/case-system/family/marriedOnly").catch(() => null);
  const issueIds = new Set(FAMILY_ISSUE_OPTIONS.map((option) => option.value));
  const stepIds = new Set(stagesForPathway("family").map((stage) => stage.id));
  check("4a. every married-only topic is an option of the Family boxes", Boolean(rule) && [...(rule?.MARRIED_ONLY_FAMILY_ISSUES ?? [])].every((id) => issueIds.has(id)));
  check("4b. every married-only step is a Family stage-map step", Boolean(rule) && [...(rule?.MARRIED_ONLY_FAMILY_STEPS ?? [])].every((id) => stepIds.has(id)));

  // 5. The provisions, word for word in the saved text.
  const flat = (file: string) => readFileSync(join(ROOT, "docs/sources/corpus", file), "utf8").replace(/\s+/g, " ");
  const divorceAct = flat("divorce-act.txt");
  const fla = flat("family-law-act.txt");
  const quotes: Array<[string, string, string]> = [
    ["Divorce Act s. 8 (1)", divorceAct, "may, on application by either or both spouses, grant a divorce to the spouse or spouses on the ground that there has been a breakdown of their marriage"],
    ["FLA s. 1 (1) spouse (a)", fla, "“spouse” means either of two persons who, (a) are married to each other, or"],
    ["FLA s. 1 (1) spouse (b)", fla, "have together entered into a marriage that is voidable or void, in good faith"],
    ["FLA s. 5 (1)", fla, "the spouse whose net family property is the lesser of the two net family properties is entitled to one-half the difference between them"],
    ["FLA s. 17 (Part II definitions)", fla, "17 In this Part, “court” means a court as defined in subsection 1 (1) but does not include the Ontario Court of Justice; (“tribunal”) “property” means real or personal property."],
    ["FLA s. 18 (1)", fla, "ordinarily occupied by the person and his or her spouse as their family residence is their matrimonial home"],
    ["FLA s. 29 (kept for everyone)", fla, "includes either of two persons who are not married to each other and have cohabited"],
  ];
  for (const [name, text, quote] of quotes) check(`5. ${name} is in the saved text`, text.includes(quote));

  console.log(failures ? `\n${failures} check(s) failed.` : "\nMarried-only Family topics are not offered to someone who was not married.");
  process.exit(failures ? 1 : 0);
}
void main();
