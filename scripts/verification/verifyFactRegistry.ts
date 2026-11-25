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
check("no entry names a fact that is not declared", entries.every((fact) => declared.includes(fact)), entries.filter((fact) => !declared.includes(fact)).join(", "));
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

console.log(failures ? `\n${failures} check(s) failed` : "\nThe registry decides which facts apply, in one place");
process.exit(failures ? 1 : 0);
