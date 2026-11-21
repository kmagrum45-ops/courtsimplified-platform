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
 *       The review's "The other party" names every defendant too (caseFile.ts otherSideWords; Chrome pass 2, C.4);
 *   (d) S6, being sued: "I disagree that I owe $4,200" is the claim against them, and the story's other party titles the
 *       case;
 *   (e) a draft made from the case keeps what the case said (drafts/draftFreshness.ts madeFrom), and the drafts page says
 *       what changed since: the amount changed after a Form 7A draft was made (Chrome pass 2, C.5); where the case is
 *       never makes a draft out of date; an older draft reads unchanged.
 *   Lost pay also reads Chrome pass 2's S1 word for word (the $450 in the sentence after the time off).
 *
 * What failure it catches: a screen that shows a copy of a fact the record has since changed, or only part of it.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { costsIn, lossesIn, lostPayIn } from "../../src/lib/case-system/caseFile/storyFacts";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { caseFileOf, otherSideWords } from "../../src/lib/case-system/caseFile/caseFile";
import { draftChanges, madeFromOf } from "../../src/lib/case-system/drafts/draftFreshness";
import { readCaseDrafts, validateDraft } from "../../src/lib/case-system/drafts/caseDrafts";
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
// Chrome pass 2 on #550 (17 Nov), S1 word for word: the time off in one sentence (with the rate, then "and bought …
// for $18.45"), the $450 in the next ("$450 lost wages", no "in"). The case page showed "Lost pay $18.45 (3 days of work)".
const S1_PASS2 = "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. There was no wet-floor sign. I fell on my right hip. A shopper, Sam Patel, saw it. The manager wrote notes. I went to the hospital that night; X-rays showed a bad bruise, no break. I missed 3 days of work (Oct 5 to 7) at $150 a day and bought Tylenol and an ice pack for $18.45. I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.";
check("(a) Chrome pass 2 S1: lost pay is $450 (3 days of work)", lostPayIn(S1_PASS2)?.value === "$450 (3 days of work)", lostPayIn(S1_PASS2)?.value);
check("(a) Chrome pass 2 S1: what was bought is its own line", costsIn(S1_PASS2)?.value === "Tylenol and an ice pack $18.45", costsIn(S1_PASS2)?.value);
check("(a) Chrome pass 2 S1: the case page's line and the losses breakdown say $450", storyLines(S1_PASS2, caseFileOf(null), false).some((line) => line.fact === "lostPay" && line.value.startsWith("$450")) && /Lost pay: \$450/.test(lossesIn(S1_PASS2)?.value ?? ""), lossesIn(S1_PASS2)?.value);
// A rate alone stays a rate (never multiplied out), and money paid after the time off is never pay.
check("(a) a rate alone is shown as said", lostPayIn("Synthetic: I missed 3 days of work at $150 a day.")?.value === "$150 a day (3 days of work)", lostPayIn("Synthetic: I missed 3 days of work at $150 a day.")?.value);
check("(a) a taxi paid after the time off is not pay", !(lostPayIn("Synthetic: I missed 3 days of work and paid $60 for a taxi.")?.value ?? "").includes("$60"), lostPayIn("Synthetic: I missed 3 days of work and paid $60 for a taxi.")?.value);
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
check("(b) the review's \"Answered:\" line reads the record (recordWords), the question's own answer included", /const words = recordWords\(question\.id, given\) \?\?/.test(panel) && /const recordWords = \(id: string, given\?: unknown\)/.test(panel));
// What the person wants follows the amount always; any other answer reads the record when the record holds something
// other than the answer's own words (the amount changed to $2,650 shows $2,650: full local run of 4d1ae680,
// review-newest-answer), and keeps the person's own words otherwise (the full local run of 3774a858: "Answered:
// 2026-05-12" became "May 12, 2026").
check("(b) \"what you want\" and an answer the record holds differently read the record; one it holds as given keeps the words given", /const recordWords = \(id: string, given\?: unknown\)[\s\S]*?if \(fact !== "wants" && typeof given === "string" && String\(slot\.value \?\? ""\)\.trim\(\) === given\.trim\(\)\) continue;[\s\S]*?\n  \};/.test(panel) && /const words = recordWords\(question\.id, given\) \?\?/.test(panel));

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
// Chrome pass 2 on #550 (C.4): after the amount was changed, the review's "The other party" showed only Circle K while
// the Parties step listed both defendants. The review's held line reads otherSideWords, which reads partyNames.
{
  const both = caseFileOf(checkpoint("small-claims", { situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } }, caseFile: { parties: { version: 1, declined: [], list } } }), null);
  check("(c) C.4: the other side in words is every defendant (otherSideWords)", otherSideWords(both) === "Circle K Convenience Stores Ltd.; Test Manager", otherSideWords(both) ?? "");
  check("(c) C.4: otherSideWords reads partyNames", /export function otherSideWords[\s\S]*?partyNames\(file\.parties\.list\)\.others/.test(read("src/lib/case-system/caseFile/caseFile.ts")));
  check("(c) C.4: the review's held line names the other side through otherSideWords", /const heldWords = \(file: CaseFile, fact: SlotFact \| undefined, slot: Slot\) => fact === "otherParty" && slot\.state === "answered" && otherSideWords\(file\)/.test(panel));
}
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

// (e) Chrome pass 2 on #550, C.5: the Form 7A draft made before the amount was changed still said "$5,468.45", with no
// notice. A draft made from the case keeps what the case said (madeFrom); the drafts page says what changed since.
{
  const answered = (value: unknown) => ({ state: "answered", value, source: { kind: "answer", question: "test" }, confirmed: true }) as never;
  const before = caseFileOf(checkpoint("small-claims", { situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } }, caseFile: { parties: { version: 1, declined: [], list } } }), null);
  before.amount = answered(5468.45);
  before.outcome = answered("Payment of $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.");
  const made = madeFromOf(before);
  check("(e) a draft keeps the amount, the outcome and both defendants as the case said them", made.amount === "$5,468.45" && /\$5,000 for pain/.test(made.outcome ?? "") && made.otherParty === "Circle K Convenience Stores Ltd.; Test Manager", JSON.stringify(made));
  check("(e) unchanged, the draft is not out of date", draftChanges(made, before).length === 0, JSON.stringify(draftChanges(made, before)));
  const after = { ...before, amount: answered(5100), outcome: answered("Payment of $5,100.00."), stage: answered("defence-filed") } as typeof before;
  const changes = draftChanges(made, after);
  check("(e) after the amount is changed, the draft is out of date, with both amounts and both outcomes", changes.some((c) => c.fact === "amount" && c.then === "$5,468.45" && c.now === "$5,100.00") && changes.some((c) => c.fact === "outcome" && c.now === "Payment of $5,100.00."), JSON.stringify(changes));
  check("(e) where the case is (its stage) never makes a draft out of date", !changes.some((c) => c.fact === "stage"), JSON.stringify(changes));
  const removed = { ...before, amount: { ...(answered(5468.45) as object), removed: true } } as typeof before;
  check("(e) an amount removed since reads as now removed", draftChanges(made, removed).some((c) => c.fact === "amount" && c.now === ""), JSON.stringify(draftChanges(made, removed)));
  check("(e) a draft saved before (no madeFrom) is never called out of date", draftChanges(undefined, after).length === 0);
  const saved = validateDraft({ id: "draft_test1", title: "Form 7A", kind: "starting-document", sections: [{ id: "part_1", heading: "", text: "", reviewed: false }], madeFrom: { ...made, notAFact: "x" } }, new Date());
  check("(e) the drafts route keeps madeFrom (known facts only)", saved.ok && saved.draft.madeFrom?.amount === "$5,468.45" && !("notAFact" in (saved.draft.madeFrom ?? {})), JSON.stringify(saved));
  const oldDraft = readCaseDrafts({ drafts: [{ id: "draft_old1", title: "Old", kind: "your-story", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", sections: [{ id: "part_1", heading: "", text: "x" }] }] });
  check("(e) an older saved draft still reads, unchanged and with no madeFrom", oldDraft.length === 1 && oldDraft[0].madeFrom === undefined && oldDraft[0].sections[0].text === "x");
  const page = read("app/cases/[id]/drafts/page.tsx");
  // Updated 19 Nov 2026 with the code (Chrome pass 3, CA-4): the same properties, read from the page as it is now (a draft
  // made from the case also starts unchanged; the open draft and its card read the draft as shown).
  check("(e) the drafts page records madeFrom on every draft made from the case (not a blank or imported one)", /const draft = fresh\.kind === "blank" \|\| fresh\.kind === "imported" \? fresh : \{ \.\.\.fresh, madeFrom: madeFromOf\(caseFileOfMaster\(master, courtPath\)\), edited: false \};/.test(page));
  check("(e) the open draft and its card say when the case changed since", /<DraftOutOfDate changes=\{changes\} onUpdate=\{onUpdate\} \/>/.test(page) && /changes=\{draftChanges\(shownDraft\(open\)\.madeFrom, fileNow\)\}/.test(page) && /<DraftOutOfDate compact changes=\{draftChanges\(shownDraft\(draft\)\.madeFrom, fileNow\)\}/.test(page) && /const fileNow = caseFileOfMaster\(master, courtPath\);/.test(page));
}

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll stale-copy checks passed.");
process.exit(failed ? 1 : 0);
