/**
 * THE ACCEPTANCE SCRIPT'S RULES CATCH WHAT THE PERSON SAW (site owner, 27 Nov 2026, item J), without a browser.
 *
 * What it checks: the pure rules the browser script applies to each screen's visible text
 * (tests/browser/acceptance/rules.ts) flag the real findings of the 27 Nov browser test, word for word, and stay quiet on
 * text that has none of them:
 *   1. the doc's `json` blocks parse, each story has an id, a story text and stated facts, and story 7 forbids the five
 *      strings the owner named (newspaper, broadcast, s. 111, set-off, Landlord and Tenant Board);
 *   2. rule (g): "Confirmed from the story: What you're asking the court to order: I want my $4,000 paid back." on story 8
 *      is flagged (the story never says it), a value the story does say is not, and a "From your story" quote not in the
 *      story is flagged;
 *   3. rule (f): a sentence of 60+ characters twice on one screen, and one citation twice, are flagged; once each is not;
 *   4. rule (b): "When it happened: February 10, 2026" asks a date the contractor story states;
 *   5. rule (c): the raw timeout the #567 run showed ("signal timed out") and the other raw errors are flagged, and
 *      "null" as a whole word is, while "annulled" is not;
 *   6. the four script defects the 27 Nov baseline showed stay fixed (T6-08, T5-01, story 3 amount and month), and the
 *      invented goal is still caught;
 *   7. the owner's rules of 27 Nov: (c) per court start, (i) kept, (j) one notice, (k) account details once, (l) checklist
 *      prefilled (an item missing from the checklist fails, never passes), and story 9's contract price;
 *   8. the six Chrome findings no rule caught, on the words Chrome saw: cards read (I1a), (o) a question twice and "not
 *      asked again" above its question (I1c), (n) (I2c), (p) the story in a box (I1f), (q) (I1j), (r), (c) first screen
 *      (I2i) and new flow (I2k), (k) the "(you):" boxes, and story 8's typed outcome and own details;
 *   9. rule (g) as set on 27 Nov: a paraphrase of a stated fact passes; a goal, a kind, a question shown as a fact fail.
 * What failure it exists to catch: a rule that quietly stops catching the thing it was written for, so the acceptance
 * script passes while the person's screen still shows the problem.
 *
 * Costs nothing. Run: npm run test:acceptance-rules
 */
import { readFileSync } from "node:fs";
import { askedPart, ASKS, cardsOn, DOC, doubleControls, duplicatesOn, forbiddenOn, journeysOf, keptProblems, NEVER_SHOWN_ANYWHERE, neverShownFor, notAnsweredButAnswered, noticeProblems, offeredValue, OWN_DETAILS, ownDetailsAgain, prefilledProblems, questionTwice, screenRows, storyLabelProblems, storyLabelSplit, storyTwice, understoodLabels, type SavedScreen } from "../../tests/browser/acceptance/rules";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : ` -- ${detail}`}`);
};

// 1. The doc.
const journeys = journeysOf(readFileSync(DOC, "utf8"));
check("the doc's stories parse (six existing, 7, 8, 8b, 9)", ["1", "2", "3", "4", "5", "6", "7", "8", "8b", "9"].every((id) => journeys.some((j) => j.id === id)), journeys.map((j) => j.id).join(","));
check("every story has its text and the facts it states", journeys.every((j) => j.story.length > 40 && Object.keys(j.stated).length > 0));
// A stated fact with no question words would never be checked by rule (b): it would look covered and catch nothing.
const inert = journeys.flatMap((j) => Object.keys(j.stated).filter((fact) => !ASKS[fact]).map((fact) => `${j.id}:${fact}`));
check("every stated fact has its question words (rule (b) can check it)", inert.length === 0, inert.join(", "));
check("story 9 states \"$6,000 paid up front\" (site owner, 27 Nov 2026)", Boolean(journeys.find((j) => j.id === "9")?.stated.paidUpFront));
check("each stated fact's words are in its story", journeys.every((j) => Object.values(j.stated).every((value) => new RegExp(value, "i").test(j.story))), journeys.flatMap((j) => Object.entries(j.stated).filter(([, v]) => !new RegExp(v, "i").test(j.story)).map(([k]) => `${j.id}:${k}`)).join(", "));
const seven = journeys.find((j) => j.id === "7");
check("story 7 forbids the five strings the owner named", ["newspaper", "broadcast", "s. 111", "set-off", "Landlord and Tenant Board"].every((s) => seven?.neverShown.includes(s)));

// 2. Rule (g): the invented goal (browser test of 27 Nov 2026, Test 1).
const eight = journeys.find((j) => j.id === "8")!;
const invented = "Confirmed from the story:\n• What you're asking the court to order: I want my $4,000 paid back.\n";
check("the invented goal is flagged", storyLabelProblems(invented, eight.story).length > 0, JSON.stringify(storyLabelProblems(invented, eight.story)));
check("a value the story says is not flagged", storyLabelProblems("Confirmed from the story:\n• Amount: $4,000\n• Date: March 3, 2026\n", eight.story).length === 0, JSON.stringify(storyLabelProblems("Confirmed from the story:\n• Amount: $4,000\n• Date: March 3, 2026\n", eight.story)));
check("a quote not in the story is flagged", storyLabelProblems("From your story: “I want my $4,000 paid back”", eight.story).length > 0);
check("a quote in the story is not flagged", storyLabelProblems("From your story: “I texted him twice asking for the money”", eight.story).length === 0);

// 3. Rule (f): duplicates on one screen.
const paragraph = "Initial questions establish your situation, side, what has happened and what you want to do next.";
check("a 60+ character sentence twice on one screen is flagged", duplicatesOn(`${paragraph}\nHere is what we have\n${paragraph}`).length > 0);
check("the same sentence once is not", duplicatesOn(`${paragraph}\nHere is what we have`).length === 0);
check("a citation twice on one screen is flagged", duplicatesOn("Rules of the Small Claims Court, O. Reg. 258/98, r. 7.01 (1). The law behind this: O. Reg. 258/98, r. 7.01 (1).").length > 0);
check("a citation once is not", duplicatesOn("Rules of the Small Claims Court, O. Reg. 258/98, r. 7.01 (1).").length === 0);

// 4. Rule (b): the contractor story's date asked as a card (browser test of 27 Nov 2026, Test 3).
const nine = journeys.find((j) => j.id === "9")!;
check("\"When it happened: February 10, 2026\" asks a date the story states", Boolean(nine.stated.whenHappened) && ASKS.whenHappened.test("When it happened: February 10, 2026"));

// 5. Rule (c): raw errors (site owner, 27 Nov 2026, item D).
check("the raw timeout message is flagged", forbiddenOn("That could not be saved: signal timed out", NEVER_SHOWN_ANYWHERE).includes("signal timed out"));
check("every raw error string is flagged", ["AbortError", "Error: x", "undefined", "[object Object]", "null", "elementStateMap"].every((t) => forbiddenOn(t, NEVER_SHOWN_ANYWHERE).length > 0));
check("\"annulled\" is not \"null\"", forbiddenOn("The order was annulled.", NEVER_SHOWN_ANYWHERE).length === 0, JSON.stringify(forbiddenOn("The order was annulled.", NEVER_SHOWN_ANYWHERE)));

// 6. Script defects the 27 Nov baseline showed (rows that failed on the script, not the site).
check("(b) \"Has the other party been formally served…\" does not ask who the other party is (T6-08)", !ASKS.otherParty.test("Has the other party been formally served with the claim, and do you have a completed Affidavit of Service (Form 8A)?"));
check("(b) \"Who is the other party?\" still does", ASKS.otherParty.test("Who is the other party?") && ASKS.otherParty.test("What is the other party's name?"));
check("(b) a \"Why we ask\" explanation is not a question (T5-01)", askedPart("Are you also making a claim? Why we ask: A defendant can bring their own claim against the plaintiff") === "Are you also making a claim?");
check("(b) \"When were you served?\" asks the served date", ASKS.servedDate.test("When were you served with the claim?"));
const three = journeys.find((j) => j.id === "3")!;
check("(g) \"$10,000.00\" and \"September 14, 2025\" are the story's \"10000 dollars\" and \"sept 14 2025\" (story 3)", storyLabelProblems("Confirmed from the story:\n• The amount: $10,000.00\n• When it happened: September 14, 2025\n", three.story).length === 0, JSON.stringify(storyLabelProblems("Confirmed from the story:\n• The amount: $10,000.00\n• When it happened: September 14, 2025\n", three.story)));
check("(g) the invented goal is still flagged after the amount and month reading", storyLabelProblems(invented, eight.story).length > 0);

// 7. The new rules (site owner, 27 Nov 2026).
check("(c) every nothing-filed story forbids \"Claim filed\"; a served story does not", neverShownFor(eight).includes("Claim filed") && !neverShownFor(journeys.find((j) => j.id === "5")!).includes("Claim filed"));
check("(j) a notice twice on the body is flagged; once is not", noticeProblems("CourtSimplified is not a law firm.\nText\nCourtSimplified is not a law firm.").length === 1 && noticeProblems("CourtSimplified is not a law firm.").length === 0);
const nineJ = journeys.find((j) => j.id === "9")!;
check("(l) story 9's covered item listed as still to add is flagged", prefilledProblems(nineJ, ["The work was not of a reasonably acceptable quality, or was not finished"], "Preparing… The work was not of a reasonably acceptable quality, or was not finished").length === 1);
check("(l) the same item off the list passes", prefilledProblems(nineJ, ["An agreement for the work"], "Already in your case: The work was not of a reasonably acceptable quality, or was not finished").length === 0);
check("(l) an item missing from the checklist altogether is flagged, never passed", prefilledProblems(nineJ, [], "Preparing your Plaintiff's Claim").length === 1);
check("story 9 states the contract price, not an amount claimed", Boolean(nineJ.stated.contractPrice) && !nineJ.stated.amount);
const screenOf = (questions: string[], emptyFields: string[] = []): SavedScreen => ({ step: "T", screen: "s", text: "", bodyWithoutFooter: "", questions, emptyFields, console: [] });
check("(k) the second case asking your name again is flagged", ownDetailsAgain([screenOf([], ["Your full name"])], [screenOf(["What is your full name?"])]).length === 1);
check("(k) a detail the first case never asked is not \"again\"", ownDetailsAgain([screenOf([])], [screenOf(["What is your email?"])]).length === 0);
check("(i) an answer missing from a screen is flagged; one shown is not", keptProblems([{ what: "Amount", value: "$4,000", where: "chat-yes" }], "Amount: $4,000.00").length === 0 && keptProblems([{ what: "I have this: x", value: "The screenshots and the emails I kept", where: "checklist-have" }], "nothing here").length === 1);
check("(i) a \"from your story\" row's value is read without its buttons", offeredValue("Amount: $4,000\nYes\nNo\nI'm not sure").value === "$4,000");

// 8. The six Chrome findings no rule caught (site owner, 27 Nov 2026), each on the words Chrome saw.
check("cards: \"When it happened / January 2026 / Yes / No, that's not right / I'm not sure\" is read as a card (I1a)", cardsOn("Here's what I understood\nWhen it happened\n\nJanuary 2026\n\nYes\nNo, that's not right\nI'm not sure\n\nFrom your story: “x”").includes("When it happened: January 2026"));
check("(o) the same short question twice on one screen fails", questionTwice("When did it happen?\nsome text\nWhen did it happen?").length === 1 && questionTwice("When did it happen?").length === 0);
check("(o) \"not asked again\" above its own question fails (I1c kind)", questionTwice("Kind of claim: A loan or debt (your answer already given; it is not asked again)\nWhat kind of dispute is this?").length === 1);
check("(n) \"Not answered yet\" next to \"Answered: January 2026\" fails (I2c)", notAnsweredButAnswered("When it happened: Not answered yet: add it when you know. Add it\nAnswered: January 2026. You can change it here.").length === 1);
check("(n) \"Not answered yet\" beside \"I do not know yet\" passes", notAnsweredButAnswered("When it happened: Not answered yet\nWhen it happened: I do not know yet").length === 0);
check("(p) the story's first sentence in the text and again in a box fails (I1f)", storyTwice(eight.story, `Your story\n${eight.story}`, [eight.story]).length === 1 && storyTwice(eight.story, `Your story\n${eight.story}`).length === 0);
check("(q) \"Not right\" and \"Yes, that's right\" on one card fails (I1j)", doubleControls("From your story we found:\nWhat the contractor agreed to do\nNot right\nIs this right?\nYes, that's right").length === 1 && doubleControls("From your story we found:\nWhat the contractor agreed to do\nIs this right?\nYes, that's right").length === 0);
check("(r) the Understood labels are read in order", JSON.stringify(understoodLabels("Here is what we understood\n\nsummary\n\nLOAN AMOUNT\n$3,000\nRECORD OF PAYMENT\nNone\nThis is our reading")) === JSON.stringify(["LOAN AMOUNT", "RECORD OF PAYMENT"]));
check("(c) \"Intake saved to your account\" on a first screen fails (I2i)", screenRows(eight, { step: "T8-01", screen: "Home", text: "Intake saved to your account.", bodyWithoutFooter: "", questions: [], emptyFields: [], console: [] }).some((r) => r.rule === "(c) never shown" && !r.pass));
check("(c) \"Send my story\" fails in the new flow only (I2k)", screenRows(eight, { step: "T8-03", screen: "s", text: "Send my story", bodyWithoutFooter: "", questions: [], emptyFields: [], console: [], flow: "v2" }).some((r) => r.rule === "(c) never shown" && !r.pass) && screenRows(eight, { step: "T8-03", screen: "s", text: "Send my story", bodyWithoutFooter: "", questions: [], emptyFields: [], console: [], flow: "old" }).every((r) => r.rule !== "(c) never shown" || r.pass));
check("(k) a \"(you): Phone number\" box is one of the person's own details", OWN_DETAILS.test("Plaintiff (you): Phone number"));
check("story 8 types an outcome in its own words and fills its own details", eight.answers?.outcome === "I want my $4,000 back" && eight.answers?.ownDetails === true);
// 9. Rule (g) as set on 27 Nov: a paraphrase of a stated fact passes; a goal, a kind and a question shown as a fact fail.
const split = (line: string, story: string) => storyLabelSplit(`Confirmed from the story:\n• ${line}\n`, story);
check("(g) \"The amount: $1,850.00\" is a paraphrase (story 4)", split("The amount: $1,850.00", journeys.find((j) => j.id === "4")!.story).paraphrase.length + (split("The amount: $1,850.00", journeys.find((j) => j.id === "4")!.story).invented.length === 0 ? 1 : 0) > 0);
check("(g) a goal in the site's words fails even when the story states one (story 1)", split("What you're asking the court to order: Return of my $12,500 deposit", journeys.find((j) => j.id === "1")!.story).invented.length === 1);
check("(g) \"What it's about: A deposit that wasn't returned\" fails as a kind", split("What it's about: A deposit that wasn't returned", journeys.find((j) => j.id === "1")!.story).invented.length === 1);
check("(g) a question shown as a fact fails (story 5)", split("In your own words, which facts in the Plaintiff's Claim do you agree with?", journeys.find((j) => j.id === "5")!.story).invented.length === 1);

// 10. Rule (b) in the new flow (site owner, 27 Nov 2026, item 4): the Understood step's once-offer of a stated fact and a
// review line are not questions; a Questions-page question asking a stated fact still fails, and so does the old flow's card.
const kitchen = journeys.find((j) => j.id === "1")!;
const bRow = (saved: SavedScreen) => screenRows(kitchen, saved).find((row) => row.rule === "(b) never asked");
const understoodText = "Here is what we understood\nAMOUNT\n$12,500\nFrom your story: “x”\nYes\nNo, that's not right\nI'm not sure\nWHEN IT HAPPENED\nMarch 2026\nYes\nNo, that's not right\nI'm not sure\n";
const v2 = (screen: string, text: string, questions: string[]): SavedScreen => ({ step: "T1-03", screen, text, bodyWithoutFooter: text, questions, emptyFields: [], console: [], flow: "v2" });
check("(b) new flow: the Understood step's lines are not questions", bRow(v2("New flow: Understood", understoodText, ["AMOUNT\n$12,500\nFrom your story: “x”\nYes\nNo, that's not right\nI'm not sure"]))?.pass !== false, JSON.stringify(bRow(v2("New flow: Understood", understoodText, []))));
check("(b) new flow: a review line is not a question", bRow(v2("Review", "WHEN IT HAPPENED\nMarch 2026 (day not given yet)\nChange\n", ["WHEN IT HAPPENED\nMarch 2026 (day not given yet)\nChange", "AMOUNT\n$12,500.00\nChange"]))?.pass !== false);
check("(b) new flow: a Questions-page question asking a stated date still fails", bRow(v2("New flow: Questions", "", ["Roughly when did the situation that led to this claim happen?\nI'm not sure"]))?.pass === false);
check("(b) new flow: the kind question is not read as asking the date through its options", bRow(v2("New flow: Questions", "", ["What kind of dispute is this?\nThe kind of dispute decides which follow-up questions we show you.\nA loan the other party did not pay back when promised\nI'm not sure"]))?.pass !== false);
check("(b) new flow: the defamation question asking when it happened still fails", bRow(v2("New flow: Questions", "", ["What exact words were said or written, who received or saw them, and when did that happen?\nI'm not sure"]))?.pass === false);
check("(b) old flow: a card offering a stated amount still fails", bRow({ ...v2("Chat: from your story", understoodText, []), flow: undefined })?.pass === false);

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nThe acceptance script's rules: every check passed.");
