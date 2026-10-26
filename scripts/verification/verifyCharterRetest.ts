/**
 * THE CHARTER CLAIM AGAINST POLICE, RE-TESTED (Chrome on the live site, 2026-10-26).
 *
 * Each fix sits in one shared piece; each check asserts its property, so a screen or path that
 * goes around the piece fails here:
 *   - the review shows only what fits the side and the claim, every field in written words
 *     (intakeReview.ts: ISSUE_ONLY, a field's own `when`, hasWrittenLabel);
 *   - the story suggests the kind of claim, the amount claimed and what they want (storyAnswers.ts,
 *     claimAmount.ts), never a badge number as money or an evidence letter's sender as the party;
 *   - "What we have so far" carries the story's own sentences for the injury, property, complaint,
 *     witness and lost pay, the badges, and the deadline counted as the next-step card counts it
 *     (caseFile/storyLines.ts, caseFile/stepDeadlines.ts);
 *   - the chat says library-owned topics in the library's words (retrieval/libraryOwned.ts): the
 *     Crown's 60-day notice always with who "the Crown" is and who answers for which police, and
 *     the simplified procedure as the amount card says it;
 *   - a decision is never the source for an Act's own words (retrieval/statuteEcho.ts);
 *   - the chat does not ask what the story answers, and says nothing of its own machinery
 *     (guided-assistant/answeredInStory.ts, through the real chat route);
 *   - a document card says a file was read only when it was (case-workspace/readStatus.ts);
 *   - "The law behind this" leads with the rules the research found (retrieval/lawBehind.ts);
 *   - the person is never asked the site's own screening question.
 *
 * Failure it exists to catch: each finding of courtsimplified-charter-test.md (2026-10-26).
 */
import fs from "node:fs";
import path from "node:path";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { hasWrittenLabel, reviewEntries, reviewQuestionField } from "../../src/lib/case-system/intakeReview";
import { situationSection } from "../../src/lib/case-system/situation/situation";
import { civilIssuesFromStory, goalFromStory, otherPartyFromStory } from "../../app/builder/_components/storyAnswers";
import { claimAmountFromStory, moneyMentions } from "../../src/lib/case-system/claimAmount";
import { caseFileOf, emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { countedStepDeadlines } from "../../src/lib/case-system/caseFile/stepDeadlines";
import { crownNoticeStatements, LIBRARY_CANNOT_ANSWER_POLICE_NOTICE, withLibraryOwned } from "../../src/lib/case-system/retrieval/libraryOwned";
import { amountNoteFor } from "../../src/lib/case-system/amountNotes";
import { courtWords, CJA_23_1_1_WORDS } from "../../app/builder/_components/StageAnswerPanel";
import { isStatuteWording, withoutStatuteEchoes } from "../../src/lib/case-system/retrieval/statuteEcho";
import { answeredInStory } from "../../src/lib/case-system/guided-assistant/answeredInStory";
import { readChip, readNote } from "../../src/lib/case-workspace/readStatus";
import { lawBehindThis } from "../../src/lib/case-system/retrieval/lawBehind";
import { chatReplies } from "./chatRouteHarness";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");

export const CHARTER_STORY = "TEST story. On June 3, 2025 in Ottawa I was stopped by two officers of the TEST Capital Region Police Service, badges 4471 and 5520. They searched my backpack even though I clearly refused. They handcuffed me very tightly, did not tell me why, and refused to let me call a lawyer when I asked twice. They held me for about 3 hours and released me with no charges. They kept my phone for 6 weeks and it came back with a cracked screen. My left wrist was bruised and swollen, I saw a doctor on June 5 and missed 2 weeks of work ($2,640). I filed a police complaint in August 2025 and it was screened out in September with no reasons. I want to sue the police service and the two officers for violating my Charter rights (unreasonable search, arbitrary detention, not being told why and not getting a lawyer) and for the injury. I think about $75,000. I have my own timeline, the clinic note, the property receipt for my phone, a letter from my employer, my complaint letter and a witness who saw it.";

const ID = "00000000-0000-4000-8000-0000000c4a17";
const civil = (input: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath: "civil", revision: ID, sections: { story: { text: CHARTER_STORY }, ...situationSection({ where: "starting", filed: "nothing" } as never), civil: { input } } });

async function main() {
  // ---- 1. The civil review shows only what fits, in words ----
  const empty = { humanRightsGrounds: "", discriminationFacts: "", accommodationRequests: "", governmentActor: "", publicDecisionOrConduct: "", institutionalFacts: "", privacyRecordsFacts: "", serviceDetails: "", damagesBreakdown: "", settlementEfforts: "", limitationDeadline: "", courtLocation: "", courtFileNumber: "", otherParty: "", issues: ["charter", "police-conduct"] };
  const entries = reviewEntries(civil(empty));
  const shown = (key: string) => entries.some((entry) => entry.field === key && entry.essential);
  check("a plaintiff is not asked when and how they were served", !shown("serviceDetails"));
  check("a Charter claim is not asked human-rights grounds, discrimination or accommodation", !["humanRightsGrounds", "discriminationFacts", "accommodationRequests"].some(shown));
  check("a Charter claim against police is asked about the public body", shown("governmentActor"));
  const allKeys = Object.keys(empty).concat(["yourName", "yourRole", "amountClaimed", "facts", "timeline", "evidence", "missingEvidence", "legalRemedy", "urgent", "documents", "caseStage"]);
  const unlabelled = allKeys.filter((key) => !hasWrittenLabel("civil", key) && !["facts"].includes(key));
  check("every civil field has written words for its label (none shown as its code name)", unlabelled.length === 0, unlabelled.join(", "));

  // ---- 2. The story's suggestions ----
  check("the kinds of claim the story names are suggested (Charter, police)", JSON.stringify(civilIssuesFromStory(CHARTER_STORY)?.value) === JSON.stringify(["charter", "police-conduct"]));
  check("the review ticks them as suggestions", JSON.stringify(reviewQuestionField("civil", "issues", civil({}))?.suggested) === JSON.stringify(["charter", "police-conduct"]));
  check("never a kind the words do not name (no assault from handcuffs, no negligence from an injury)", !civilIssuesFromStory(CHARTER_STORY)?.value.some((value) => ["intentional-tort", "negligence"].includes(value)));
  check("the amount claimed is $75,000, never the lost pay", claimAmountFromStory(CHARTER_STORY)?.value === "$75,000", JSON.stringify(claimAmountFromStory(CHARTER_STORY)));
  check("badge numbers are never money", !moneyMentions(CHARTER_STORY).some((mention) => mention.number === 4471 || mention.number === 5520));
  check("the civil review offers the amount from the story", reviewQuestionField("civil", "amountClaimed", civil({}))?.fromStory === "$75,000");
  check("what they want is offered from the story", /violating my Charter rights/.test(goalFromStory(CHARTER_STORY)?.value ?? ""));
  check("the review offers what they want", /violating my Charter rights/.test(reviewQuestionField("civil", "legalRemedy", civil({}))?.fromStory ?? ""));
  check("the party sued is the police service, never the employer whose letter is evidence", otherPartyFromStory(CHARTER_STORY)?.value === "The police service", JSON.stringify(otherPartyFromStory(CHARTER_STORY)));

  // ---- 3. What we have so far ----
  const lines = storyLines(CHARTER_STORY, emptyCaseFile(), false);
  const line = (fact: string) => lines.find((item) => item.fact === fact)?.value ?? "";
  check("who is sued, with the badges", /police service/i.test(line("otherParty")) && /4471 and 5520/.test(line("otherParty")), line("otherParty"));
  check("the injury, in their words", /wrist was bruised and swollen/.test(line("injury")), line("injury"));
  check("the phone", /cracked screen/.test(line("property")));
  check("the screened-out complaint", /screened out/.test(line("complaint")));
  check("the witness", /witness/.test(line("witness")));
  check("the lost pay", /missed 2 weeks of work/.test(line("lostPay")));
  const counted = countedStepDeadlines("civil:plaintiff:claim-drafted-not-issued", { "case-date-act-or-omission": "2025-06-03" });
  check("the deadline is counted as the next-step card counts it (June 3, 2027)", counted.some((deadline) => deadline.date === "2027-06-03"), JSON.stringify(counted));
  check("no deadline is counted without a saved step or date", countedStepDeadlines(null, { "case-date-act-or-omission": "2025-06-03" }).length === 0 && countedStepDeadlines("civil:plaintiff:claim-drafted-not-issued", {}).length === 0);
  const file = caseFileOf(civil({ issues: ["charter", "police-conduct", "government-public-authority", "intentional-tort", "negligence"] }));
  check("the kind of claim is held as the options chosen (shown in words by the panel)", Array.isArray(file.claimKind.value));

  // ---- 4. The chat's library-owned topics ----
  const modelSaid = [
    { text: "Before suing, you must serve a notice of claim on the Crown at least 60 days before starting the proceeding.", sources: [] },
    { text: "A $75,000 damages-only action in the Superior Court must follow simplified procedure under Rule 76.", sources: [] },
    { text: "A police service board may be sued in its own name.", sources: [] },
  ];
  const owned = withLibraryOwned(modelSaid);
  const ownedText = owned.map((statement) => statement.text).join("\n");
  check("the Crown's notice is never in the model's words", !owned.some((statement) => statement.text === modelSaid[0].text));
  check("the Crown's notice always says who the Crown is (CLPA s. 1)", /‘Crown’ means the Crown in right of Ontario/.test(ownedText), ownedText);
  // Site owner, 2026-10-26: every sentence is the statute's own words with its section, no paraphrase.
  const crownSentences = crownNoticeStatements().filter((statement) => statement.text !== LIBRARY_CANNOT_ANSWER_POLICE_NOTICE);
  check("every Crown-notice sentence is an Act's words, quoted, with its section", crownSentences.every((statement) => /^“[^”]+” \([^)]*, s\. [\d ()]+\)$/.test(statement.text)), crownSentences.map((statement) => statement.text).join("\n      "));
  check("and those words are the checked citation's, nothing added", crownSentences.every((statement) => statement.sources.length === 1 && statement.text.startsWith(`“${statement.sources[0].quote.replace(/"([^"]+)"/g, "‘$1’")}”`)));
  check("the one other line says what the library cannot answer, and states no law", crownNoticeStatements().filter((statement) => !crownSentences.some((kept) => kept.text === statement.text)).length === 1);
  check("and who answers for the OPP and for a municipal police service (CSPA ss. 63 (1), 47 (1))", /Ontario Provincial Police/.test(ownedText) && /A police service board is liable/.test(ownedText));
  check("and says plainly what the library cannot answer about notice to a police board", /does not hold a rule that says whether notice is needed before suing a municipal police service board/.test(ownedText));
  check("every legal sentence it adds carries its source", owned.filter((statement) => /says:|means/.test(statement.text)).every((statement) => statement.sources.length > 0));
  check("simplified procedure is said as the amount card says it", /If your claim is only for money or property, \$200,000 or less means it must go under the simplified procedure \(Rule 76\)/.test(ownedText) && !/must follow simplified procedure/.test(ownedText));
  check("anything else the model said is kept", owned.some((statement) => statement.text === modelSaid[2].text));

  // ---- 4b. The leave rule: the Act's own words with s. 23 (1.1), never a paraphrase (site owner, 2026-10-26) ----
  const ACT_23_1_1 = "An action that is within the Small Claims Court's jurisdiction shall not, despite subsection 11 (2), be commenced in the Superior Court of Justice except with leave of the Superior Court of Justice as provided in the rules of court.";
  const codeFiles: string[] = [];
  const walkCode = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walkCode(full); else if (/\.tsx?$/.test(entry.name)) codeFiles.push(full); } };
  walkCode(path.join(ROOT, "src")); walkCode(path.join(ROOT, "app"));
  const PARAPHRASE = /(?:can only be started|cannot be started|shall not be started|can be started there only|started in the Superior Court only)[^."]*\bleave\b/i;
  const paraphrased = codeFiles.filter((file) => PARAPHRASE.test(fs.readFileSync(file, "utf8").replace(/const LEAVE_PARAPHRASE = [^\n]+/, ""))).map((file) => path.relative(ROOT, file));
  check("no code says the leave rule in its own words", paraphrased.length === 0, paraphrased.join(", "));
  const amount = amountNoteFor({ courtPath: "civil", stepId: "civil:plaintiff:claim-drafted-not-issued", recordedAmount: "$12,000" })?.text ?? "";
  check("the amount card gives the Act's words with s. 23 (1.1)", amount.includes(`Courts of Justice Act, s. 23 (1.1): “${ACT_23_1_1}”`), amount);
  const published = ["If your claim is within that limit, it can only be started in the Superior Court with that court's leave.", "A claim within that limit cannot be started in the Superior Court of Justice without that court's leave."];
  check("the published library's two sentences show as the Act's words on screen", published.every((sentence) => courtWords(`Before. ${sentence} After.`, "civil") === `Before. ${CJA_23_1_1_WORDS} After.`) && CJA_23_1_1_WORDS.includes(ACT_23_1_1));

  // ---- 5. A decision is not the source for an Act's words ----
  const charterNine = "Everyone has the right not to be arbitrarily detained or imprisoned.";
  check("Charter s. 9's words are an Act's words", isStatuteWording(charterNine));
  const echoes = withoutStatuteEchoes([
    { text: "Section 9 protects against arbitrary detention.", sources: [{ kind: "decision" as const, quote: charterNine }] },
    { text: "Section 9 protects against arbitrary detention (Charter).", sources: [{ kind: "legislation" as const, quote: charterNine }, { kind: "decision" as const, quote: charterNine }] },
  ]);
  check("a statement whose only source is a decision quoting an Act is not shown", echoes.dropped.length === 1 && echoes.kept.length === 1);
  check("a statement keeps the Act and loses the decision quoting it", echoes.kept[0]?.sources.length === 1 && echoes.kept[0]?.sources[0].kind === "legislation");
  check("a decision's own reasoning is kept as a source", !isStatuteWording("the detention was arbitrary because the officer acted on a hunch and nothing more than that"));

  // ---- 6. The chat ----
  check("the chat does not ask which public actor when the story names the police", answeredInStory("Which public actor is involved?", CHARTER_STORY));
  check("it still asks when the story names none", !answeredInStory("Which public actor is involved?", "My neighbour's dog bit me in June."));
  const replies = await chatReplies("civil", CHARTER_STORY, ["Who do I name, do I need to give notice, will I get $75,000?", "What should I gather first?"], { issues: ["charter", "police-conduct", "government-public-authority"] });
  const said = replies.join("\n");
  check("the chat never asks which public actor is involved", !/Which public actor is involved/i.test(said), said.slice(0, 300));
  check("the chat says nothing of a reasoning profile", !/reasoning profile/i.test(said));
  const engine = fs.readFileSync(path.join(ROOT, "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts"), "utf8");
  check("the question's reason is in plain words", !/This follows the reasoning profile for/.test(engine));
  const chat = fs.readFileSync(path.join(ROOT, "app/builder/_components/CourtAssistantChat.tsx"), "utf8");
  check("the chat's own labels are plain words", !/Ask Case Partner|helps organize litigation information/.test(chat));

  // ---- 7. Document cards ----
  check("a file not read says so", readNote("pending") === "Saved. The site has not read this file yet." && readNote(undefined) === "Saved. The site has not read this file yet.");
  check("only a read file says it was read", readNote("done").startsWith("Read from the document itself") && !readNote("failed").startsWith("Read") && !readNote("skipped").startsWith("Read"));
  check("the chip never says waiting for a read that is not coming", readChip("pending") === "Not read yet");
  const appFiles: string[] = [];
  const walk = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (/\.tsx?$/.test(entry.name)) appFiles.push(full); } };
  walk(path.join(ROOT, "app"));
  const bypass = appFiles.filter((file) => /Read from the document itself/.test(fs.readFileSync(file, "utf8"))).map((file) => path.relative(ROOT, file));
  check("no screen words a file's read status itself (readStatus.ts is the one place)", bypass.length === 0, bypass.join(", "));

  // ---- 8. The law behind this ----
  const provision = (id: string, citation: string) => ({ id, label: `Legislation: ${citation}`, citation, text: "", sourceUrl: "https://example.invalid", quote: "" });
  const law = lawBehindThis([
    { question: "Was the search reasonable?", status: "answered", provisions: [provision("charter-8", "Charter, s. 8")] },
    { question: "Was the detention arbitrary?", status: "answered", provisions: [provision("charter-9", "Charter, s. 9"), provision("ward", "Vancouver (City) v. Ward, 2010 SCC 27")] },
    { question: "Who is liable for the officers?", status: "answered", provisions: [provision("cspa-47", "CSPA, s. 47 (1)")] },
  ], [provision("cspa-158", "CSPA, s. 158 (3)-(5)") as never]);
  check("the box leads with the rules the research found", JSON.stringify(law.lines.map((item) => item.id)) === JSON.stringify(["charter-8", "charter-9", "cspa-47", "ward"]), JSON.stringify(law.lines.map((item) => item.id)));
  check("other law the analysis rests on still follows", law.quoted.some((item) => item.id === "cspa-158"));
  const panel = fs.readFileSync(path.join(ROOT, "app/builder/_components/IntelligenceOverviewPanel.tsx"), "utf8");
  check("the overview takes the box from lawBehindThis", /lawBehindThis\(/.test(panel) && !/lawNotAlreadyShown/.test(panel));

  // ---- 9. The site's own question is not put to the person ----
  const brain = fs.readFileSync(path.join(ROOT, "src/lib/case-system/intelligence/courtSimplifiedBrain.ts"), "utf8");
  check("no \"Does this claim require leave, notice, or a public-authority screening step?\" for the person", !/^\s*\? "Does this claim require leave, notice, or a public-authority screening step\?"/m.test(brain));

  // ---- 10. Feedback ----
  const gate = fs.readFileSync(path.join(ROOT, "app/_components/HomeLocationGate.tsx"), "utf8");
  check("Update with my answers never returns silently while a reading runs", /async function updateWithAnswers\(/.test(gate) && !/async function updateWithAnswers\([^)]*\)\s*\{\s*if \(requestRef\.current\.pending/.test(gate));
  const stepPanel = fs.readFileSync(path.join(ROOT, "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check("dates kept from the story are counted at once", /autoKeptFor[\s\S]{0,4000}if \(stageId\) void load\(stageId, factsForStep\(stageId, municipality\), next\);\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s*\}, \[result, storyDates, stageId\]\);/.test(stepPanel));

  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exitCode = failures ? 1 : 0;
}

void main();
