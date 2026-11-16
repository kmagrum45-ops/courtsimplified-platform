/**
 * NO STALE OR MISSING COPY OF LOST PAY, AN AMOUNT IN WORDS, THE PARTIES OR THE CLAIM AGAINST THE PERSON (site owner,
 * 16 Nov 2026; Chrome milestone test of #550, rows 17, 21 and 22, and "anything else wrong": S6).
 *
 * What it checks, through the real functions:
 *   (a) lost pay has one owner (storyFacts.ts lostPayIn): "$450 (3 days of work)", never the $18.45 paid for medicine,
 *       for every way Chrome's story can say it; the medicine is its own line ("Costs you paid: Medicine $18.45");
 *       only "What we have so far" (storyLines) and the losses breakdown (lossesIn) read it;
 *   (b) after the amount is changed, the review's "What outcome ... Answered:" is the record's words, built from the held
 *       amount (IntakeReviewPanel recordWords -> caseFile.ts wordsFollowHeldAmount);
 *   (c) every screen that names the parties reads the one function (parties.ts partyNames): both defendants on the
 *       case snapshot ("Parties recorded"), the case file page ("Other side") and "What we have so far"; the person's own
 *       name from the Parties record in the case record (exhibit book, child support); the case review told only yes or
 *       no (partiesHeld.ts);
 *   (d) S6, being sued: "I disagree that I owe $4,200" is the claim against them, and the story's other party titles the
 *       case.
 *
 * What failure it catches: a screen that shows a copy of a fact the record has since changed, or only part of it.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { costsIn, lossesIn, lostPayIn } from "../../src/lib/case-system/caseFile/storyFacts";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { partyNames, type Party } from "../../src/lib/case-system/parties/parties";
import { partiesHeldOfMaster } from "../../src/lib/case-system/parties/partiesHeld";
import { deterministicFindings, caseFileFromMasterResult } from "../../src/lib/case-system/caseReview/caseReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}
const checkpoint = (court: string, sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: court, revision: "00000000-0000-4000-8000-000000000002", sections } as unknown as Checkpoint);

// (a)
const WAYS = [
  "Synthetic: I missed 3 days of work and had to buy medicine for $18.45, and I lost $450 in wages.",
  "Synthetic: I hurt my back and missed 3 days of work, paid $18.45 for medicine, and lost $450 in pay.",
  "Synthetic: I missed 3 days of work and spent $18.45 on medicine; that is $450 in wages I lost.",
  "Synthetic: I missed 3 days of work at $150 a day, $450 in all, and paid $18.45 for medicine.",
];
for (const story of WAYS) {
  const pay = lostPayIn(story)?.value ?? "";
  check(`(a) lost pay is $450, never the medicine: "${story.slice(11, 70)}..."`, pay.startsWith("$450") && !pay.includes("18.45"), pay);
  check(`(a) the medicine is its own line: "${story.slice(11, 50)}..."`, costsIn(story)?.value === "Medicine $18.45", costsIn(story)?.value);
}
const lines = storyLines(WAYS[0], caseFileOf(null), false);
check("(a) \"What we have so far\" shows Lost pay $450 and Costs you paid: Medicine $18.45", lines.some((line) => line.fact === "lostPay" && line.value.startsWith("$450")) && lines.some((line) => line.fact === "costs" && line.value === "Medicine $18.45"), JSON.stringify(lines.map((line) => [line.fact, line.value])));
check("(a) the losses breakdown reads the same two", /Lost pay: \$450/.test(lossesIn(WAYS[0])?.value ?? "") && /Costs you paid: Medicine \$18\.45/.test(lossesIn(WAYS[0])?.value ?? ""), lossesIn(WAYS[0])?.value);
function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return ["node_modules", ".next"].includes(entry.name) ? [] : files(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}
const code = [...files("app"), ...files("src")];
const lostPayReaders = code.filter((file) => /\blostPayIn\b/.test(read(file))).sort();
check("(a) lost pay has one owner: only storyFacts.ts (defines it, lossesIn) and storyLines.ts read it", JSON.stringify(lostPayReaders) === JSON.stringify(["src/lib/case-system/caseFile/storyFacts.ts", "src/lib/case-system/caseFile/storyLines.ts"]), lostPayReaders.join(", "));

// (b)
const changed = caseFileOf(checkpoint("small-claims", {
  story: { text: "Synthetic: I slipped." },
  builder: { step: "guided", initialAnswers: { "sc-amount-claimed": "$5,468.45", "sc-remedy-sought": "I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine" } },
  caseFile: { changes: { amount: { state: "answered", value: 5100, at: "2026-11-16T12:00:00.000Z", seq: 1 } } },
}));
const wants = typeof changed.wants.value === "string" ? changed.wants.value : "";
check("(b) after the amount is changed to $5,100, the record's \"what you want\" names $5,100.00 and none of the old amounts", wants.includes("$5,100.00") && !/\$5,000|\$450|\$18\.45/.test(wants), wants);
const panel = read("app/_components/IntakeReviewPanel.tsx");
check("(b) the review's \"Answered:\" line reads the record (recordWords), the question's own answer included", /const words = recordWords\(question\.id\) \?\?/.test(panel) && /const recordWords = \(id: string\)/.test(panel));
// Only what the person wants follows the amount: a date or any other answer keeps the person's own words (the full local
// run of 3774a858: "Answered: 2026-05-12" became "May 12, 2026").
check("(b) only the \"what you want\" answer is reworded from the record; every other answer keeps the words given", /const recordWords = \(id: string\)[\s\S]*?if \(fact !== "wants"\) continue;[\s\S]*?\n  \};/.test(panel));

// (c)
const list: Party[] = [
  { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Plaintiff" }, unsure: [] },
  { id: "o1", side: "other", kind: "company", details: { companyName: "Circle K Convenience Stores Ltd." }, unsure: [] },
  { id: "o2", side: "other", kind: "person", details: { firstName: "Test", lastName: "Manager" }, unsure: [] },
];
const names = partyNames(list);
check("(c) partyNames: the person and both defendants, each its own name", names.you === "Test Plaintiff" && JSON.stringify(names.others) === JSON.stringify(["Circle K Convenience Stores Ltd.", "Test Manager"]), JSON.stringify(names));
check("(c) an older case with no record: the form's copies", JSON.stringify(partyNames([], { you: "A B", other: "C D" })) === JSON.stringify({ you: "A B", others: ["C D"] }));
check("(c) the case snapshot's \"Parties recorded\" reads partyNames", /partyNames\(caseFile\?\.parties\.recorded/.test(read("app/builder/_components/IntelligenceOverviewPanel.tsx")));
check("(c) the case file page's \"Other side\" reads partyNames, every other party", /partyNames\(file\.parties\.recorded/.test(read("app/cases/[id]/case-file/page.tsx")) && /names\.others\.join\("; "\)/.test(read("app/cases/[id]/case-file/page.tsx")));
check("(c) \"What we have so far\" reads partyNames", /partyNames\(file\.parties\.list\)/.test(read("app/cases/_components/CaseFilePanel.tsx")));
check("(c) the case record's name for the person is the Parties record's (exhibit book, child support)", (read("src/lib/case-system/caseRecord.ts").match(/partyNames\(/g) ?? []).length === 2);
const master = { intakeData: { courtPath: "small-claims", extra: { yourRole: "Plaintiff / claimant" } }, intakeCheckpoint: checkpoint("small-claims", { situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } }, caseFile: { parties: { version: 1, declined: [], list: [list[0], { ...list[1], details: { ...list[1].details, street: "100 Sample Road" } }] } } }) };
check("(c) the case review is told yes or no only: names and the address held", JSON.stringify(partiesHeldOfMaster(master, "small-claims")) === JSON.stringify({ you: true, other: true, otherAddress: true }));
const findings = deterministicFindings({ ...caseFileFromMasterResult(master, "small-claims"), stage: "starting-case" }).map((finding) => finding.kind);
check("(c) the case review does not say the name or address is missing when the Parties step holds them", !findings.some((kind) => /missing-your-name|missing-other-party-name|missing-other-party-address/.test(kind)), findings.join(", "));
check("(c) the case review's file holds no party name or address from the record (rule 3: only yes or no)", !/partyNames|parties\.list/.test(read("src/lib/case-system/caseReview/caseReview.ts")));

// (d)
const S6 = "Synthetic: I agree I hired the contractor. I disagree that I owe $4,200: I already paid $2,000 and the work was bad.";
const sued = caseFileOf(checkpoint("small-claims", { story: { text: S6 }, situation: { record: { where: "served", stage: "just-served", papers: "small-claims-7A", court: "small-claims" } } }));
const s6 = storyLines(S6, sued, true);
check("(d) S6: the claim against them ($4,200) is in \"What we have so far\"", s6.some((line) => line.fact === "amountAgainst" && /\$4,200/.test(line.value)), JSON.stringify(s6.map((line) => [line.fact, line.value])));
check("(d) S6: and who it is with", s6.some((line) => line.fact === "otherParty" && /contractor/i.test(line.value)));
check("(d) S6: the case title falls back to the story's other party (CaseHomeContext caseTitle)", /storyLines\(file\.storyText/.test(read("app/cases/_components/CaseHomeContext.tsx")));

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll stale-copy checks passed.");
process.exit(failed ? 1 : 0);
