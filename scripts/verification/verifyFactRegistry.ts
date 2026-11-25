/**
 * test:fact-registry -- one registry entry per fact, and applicability decided in one place (site owner, Round 6, PR 2).
 *
 * WHAT IT CHECKS.
 *   1. Every fact the site asks for (factsOfQuestion.ts CaseFact) has exactly one registry entry, and no entry names a
 *      fact that does not exist; every fact a question id asks (factsOfQuestion) is in the registry.
 *   2. Each entry's home is where the fact is kept: a case-file slot is a SLOT_FACTS member, the Parties record's facts
 *      are the parties' own, the start's answers are the situation's.
 *   3. Every applicability rule has its reason, and each rule behaves as its reason says: with nothing filed and the
 *      person bringing the case, "Claim served", the served date and the court papers' dates do not apply, and they do
 *      apply once something is filed; a defence response applies only to the person responding.
 *   4. The start's own questions read applicability from the registry: "Has anything been filed?" is not asked of a
 *      person who said they want to start a case (situation/situation.ts nextSituationQuestion), and the Change review
 *      of the start uses the same one function (no second copy in SituationQuestions.tsx).
 *
 * WHAT FAILURE IT EXISTS TO CATCH. A question that does not apply to the person shown on some screen because that screen
 * kept its own rule (the owner's Chrome test of #563: "Claim served" on a case where nothing was filed, "Has anything
 * been filed" right after "I want to start a case"). Pure: no browser.
 */
import { readFileSync } from "node:fs";
import { FACT_REGISTRY, contextOfFile, factApplies, type FactContext } from "../../src/lib/case-system/caseFile/factRegistry";
import { homeAsks } from "../../src/lib/case-system/caseFile/factQuestions";
import { SLOT_FACTS } from "../../src/lib/case-system/caseFile/slotFacts";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { nextSituationQuestion } from "../../src/lib/case-system/situation/situation";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";
import { HOME_QUESTIONS } from "../../src/lib/case-system/caseFile/factQuestions";
import { stagesForPathway } from "../../src/lib/case-system/stage-map/stageMap";
import { dateQuestionsForStep } from "../../src/lib/case-system/casePosition";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
  if (!ok) failures++;
}

console.log("\n1. One entry per fact");
const source = readFileSync("src/lib/case-system/caseFile/factsOfQuestion.ts", "utf8");
const typeStart = source.indexOf("export type CaseFact");
const declared = [...source.slice(typeStart, source.indexOf("\n\n", typeStart)).replace(/\/\/.*$/gm, "").matchAll(/"([a-zA-Z]+)"/g)].map((match) => match[1]);
const entries = FACT_REGISTRY.map((entry) => entry.fact as string);
check(`every declared fact (${declared.length}) has an entry`, declared.every((fact) => entries.includes(fact)), declared.filter((fact) => !entries.includes(fact)).join(", "));
// An entry is a declared fact, or a question id that asks a fact of its own (factsOfQuestion gives back the id itself):
// never a made-up name (the own-id entries are each asked by some screen, section 6).
const ownId = (fact: string) => factsOfQuestion(fact).length === 1 && factsOfQuestion(fact)[0] === fact;
check("every entry is a declared fact or a question asking a fact of its own", entries.every((fact) => declared.includes(fact) || ownId(fact)), entries.filter((fact) => !declared.includes(fact) && !ownId(fact)).join(", "));
check("no fact has two entries", new Set(entries).size === entries.length);
const mapped = new Set([...source.slice(source.indexOf("const FACTS"), source.indexOf("};", source.indexOf("const FACTS"))).matchAll(/"?([\w:.-]+)"?:\s*\[/g)].flatMap((match) => factsOfQuestion(match[1])));
check("every fact a question id asks is in the registry", [...mapped].every((fact) => entries.includes(fact)), [...mapped].filter((fact) => !entries.includes(fact)).join(", "));

console.log("\n2. Homes");
const slot = FACT_REGISTRY.filter((entry) => entry.home === "case-file slot").map((entry) => entry.fact as string);
check("a case-file slot fact is a slot of the case file", slot.every((fact) => (SLOT_FACTS as readonly string[]).includes(fact)));
check("the other side's name is kept in the Parties record", FACT_REGISTRY.find((entry) => entry.fact === "otherParty")?.home === "parties record");
check("the start's own answers are the situation's", ["situation", "side", "court"].every((fact) => FACT_REGISTRY.find((entry) => entry.fact === fact)?.home === "start answers"));

console.log("\n3. Rules, each with its reason, each doing what its reason says");
check("every rule has its reason", FACT_REGISTRY.every((entry) => !entry.applies || entry.applies.why.trim().length > 30));
const starting: FactContext = { court: "small-claims", side: "bringing", nothingFiled: true };
const filedCase: FactContext = { court: "small-claims", side: "bringing", nothingFiled: false };
const responding: FactContext = { court: "small-claims", side: "responding", nothingFiled: false };
for (const fact of ["claimServed", "servedDate", "claimIssuedDate", "courtFileNumber", "courtDate", "conferenceDate", "defenceFiledDate", "filed"]) {
  check(`"${fact}" does not apply with nothing filed, bringing the case`, !factApplies(fact, starting));
}
for (const fact of ["claimServed", "servedDate", "claimIssuedDate", "courtFileNumber"]) check(`"${fact}" applies once something is filed`, factApplies(fact, filedCase));
check("a defence response applies only to the person responding", !factApplies("responseFacts", filedCase) && factApplies("responseFacts", responding));
check("a fact with no rule applies to everyone", factApplies("amount", starting) && factApplies("amount", responding));

console.log("\n4. The start's questions read the registry");
check("\"Has anything been filed?\" is not asked after \"I want to start a case\"", nextSituationQuestion({ where: "starting" } as never, null) !== "filed", String(nextSituationQuestion({ where: "starting" } as never, null)));
check("the court is still asked after \"I want to start a case\"", nextSituationQuestion({ where: "starting" } as never, null) === "court");
const component = readFileSync("app/_components/SituationQuestions.tsx", "utf8");
check("the Change review of the start keeps no second copy of which question applies", !/question === "filed" && situation\.where === "starting"/.test(component));

console.log("\n5. The home page's questions read the registry");
const suing = { court: { state: "answered", value: "small-claims" }, side: { state: "answered", value: "bringing" }, filed: { state: "answered", value: false } };
const sued = { court: { state: "answered", value: "small-claims" }, side: { state: "answered", value: "responding" }, filed: { state: "answered", value: true } };
check("the case file gives the context: court, side, nothing filed", JSON.stringify(contextOfFile(suing)) === JSON.stringify({ court: "small-claims", side: "bringing", nothingFiled: true }));
check("an unknown side rules nothing out", contextOfFile({}).side === null && !contextOfFile({}).nothingFiled);
check("a defendant's own claim is not asked on the home page of a person suing", !homeAsks(suing as never, "sc-defendant-counterclaim", "My neighbour owes me $900."));
check("it is asked of the person sued", homeAsks(sued as never, "sc-defendant-counterclaim", "I was served with a claim for $900."));

console.log("\n6. Fail closed: every fact any screen can ask for is in the registry");
// Every list of question ids a screen draws from, each id through the one fact map (factsOfQuestion: an id not mapped asks
// a fact of its own, its id). A fact that is not registered has no rule of whom it applies to, so it could be shown to
// anyone: fail closed. (The Parties step's details live in the Parties record, whose facts are registered.)
const triageSource = readFileSync("src/lib/case-system/family/statusTriage.ts", "utf8");
const reviewSource = readFileSync("src/lib/case-system/intakeReview.ts", "utf8");
const labels = reviewSource.slice(reviewSource.indexOf("const FIELD_LABELS"), reviewSource.indexOf("};", reviewSource.indexOf("const FIELD_LABELS")));
const screens: Record<string, string[]> = {
  "the Small Claims question bank": QUESTION_BANK.map((question) => question.id),
  "the Civil questions": civilGuidedFields({ issues: [], documents: [] }).map((field) => field.key),
  "the Family questions": familyGuidedFields({ issues: [], filed: [] }).map((field) => field.key),
  "the start": ["where", "started", "papers", "received", "filed", "court", "stage"].map((question) => `situation:${question}`),
  "the home page": Object.values(HOME_QUESTIONS).flatMap((sides) => Object.values(sides).flatMap((list) => list.map((question) => question.id))),
  "the Family triage": [...triageSource.slice(triageSource.indexOf("export type TriageQuestionId"), triageSource.indexOf(";", triageSource.indexOf("export type TriageQuestionId"))).matchAll(/"([a-z-]+)"/g)].map((match) => match[1]),
  "the step page's dates": (["small-claims", "civil", "family"] as const).flatMap((court) => stagesForPathway(court).flatMap((stage) => dateQuestionsForStep(stage.id).map((question) => question.id))),
  "the review's own boxes": [...labels.matchAll(/(\w+):\s*"/g)].map((match) => match[1]),
};
for (const [screen, ids] of Object.entries(screens)) {
  const unregistered = [...new Set(ids.flatMap((id) => factsOfQuestion(id).filter((fact) => !entries.includes(fact)).map((fact) => (fact === id ? id : `${id} -> ${fact}`))))];
  check(`${screen} (${new Set(ids).size} question ids): every fact it can ask is registered`, ids.length > 0 && unregistered.length === 0, unregistered.join(", "));
}

console.log(failures ? `\n${failures} check(s) failed` : "\nThe registry decides which facts apply, in one place");
process.exit(failures ? 1 : 0);
