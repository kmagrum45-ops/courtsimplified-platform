/**
 * test:matrix-checks -- each of the journey matrix's eleven checks can fail, and passes a clean journey.
 *
 * WHAT IT CHECKS. For every check in tests/browser/matrix/matrixChecks.ts: a planted journey record holding exactly the
 * fault that check exists for must produce a failure naming the check, the screen and the fact; a clean record must
 * produce none. Also the report's table and counts (per check, per file), and that the applicability rules of check 3
 * each carry a reason.
 *
 * WHAT FAILURE IT EXISTS TO CATCH. A check that can never fail: the matrix would then report zero for a fault the site
 * still has, which is how the owner's Chrome test of #563 found 7 failures the suites called green (25 Nov 2026).
 * Pure and fast: no browser, no page, no network.
 */
import { existsSync } from "node:fs";
import type { Asked } from "../../tests/browser/harness/askOnce";
import {
  APPLICABILITY, CHECK_NAMES, OFFERS_HOME, SURFACE_FILES, screenFile, check1Held, check2Twice, check3Applies, check4Logged, check5OnePlace, check6Offered, check7Carried,
  check8Persists, check9Same, check10Forward, check11Form7A, counts, table, type JourneyRecord, type MatrixStory,
} from "../../tests/browser/matrix/matrixChecks";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
  if (!ok) failures++;
}

const story: MatrixStory = { id: "sc-kitchen", court: "small-claims", side: "plaintiff", startingPoint: "chrome", text: "...", city: "Ottawa", facts: { otherParty: "TEST Fakebuild Contracting Inc.", amount: "12,500" }, names: ["TEST Fakebuild Contracting Inc."], nothingFiled: true };
const ev = (surface: string, id: string, text: string, screen = "/builder"): Asked => ({ kind: "ask", surface, id, screen, text, at: 0 });
/** The test's own fact reader: the event's id is its fact. */
const factsOf = (event: Asked) => [event.id];
const clean = (over: Partial<JourneyRecord> = {}): JourneyRecord => ({
  journey: "sc-kitchen signed-in", story, mode: "signed-in",
  events: [ev("parties-offer", "otherParty", "From your story: TEST Fakebuild Contracting Inc."), ev("sc-proposal", "amount", "The amount: $12,500")],
  held: [], twice: [], blind: [],
  screens: [{ screen: "/builder", box: true, question: true, forward: true, working: false, idleWords: false }],
  ended: true, notFilled: ["Court location"], ...over,
});

console.log("\nEvery check passes a clean journey");
check("a clean journey has no failure on any check", [
  check1Held(clean()), check2Twice(clean()), check3Applies(clean(), factsOf), check4Logged(clean()), check5OnePlace(clean(), factsOf),
  check6Offered(clean(), factsOf), check7Carried(clean()), check8Persists(clean()), check10Forward(clean()), check11Form7A(clean()),
  check9Same(clean(), clean({ mode: "guest-then-signup" }), factsOf),
].every((list) => list.length === 0));

console.log("\nEach check fails on its own fault, naming the screen and the fact");
const one = (list: { check: number; fact: string; screen: string }[], id: number, fact: string) => list.length > 0 && list.every((f) => f.check === id) && list.some((f) => f.fact === fact);
check("1 a question asked while the record held its fact", one(check1Held(clean({ held: [{ fact: "whenHappened", screen: "/builder?step=guided", text: "When it happened: March 2026" }] })), 1, "whenHappened"));
check("2 a question asked twice", one(check2Twice(clean({ twice: [{ fact: "otherParty", screen: "/builder?step=review", text: "The other party" }] })), 2, "otherParty"));
check("3 \"Defence response\" shown to someone suing", one(check3Applies(clean({ events: [...clean().events, ev("form-field", "responseFacts", "Defence response")] }), factsOf), 3, "responseFacts"));
check("3 \"Claim served\" when nothing was filed", one(check3Applies(clean({ events: [...clean().events, ev("review-entry", "claimServed", "Claim served")] }), factsOf), 3, "claimServed"));
check("3 \"Has anything been filed\" after \"I want to start a case\"", one(check3Applies(clean({ events: [ev("situation", "filed", "Has anything been filed with the court yet?"), ...clean().events] }), factsOf), 3, "filed"));
check("3 \"Claim served\" merely shown on the review (already answered No) when nothing was filed", one(check3Applies(clean({ shown: [ev("review-entry", "claimServed", "Claim served Yes No")] }), factsOf), 3, "claimServed"));
check("3 a defendant may be asked for their defence response", check3Applies(clean({ story: { ...story, side: "defendant", nothingFiled: false }, events: [ev("form-field", "responseFacts", "Defence response")] }), factsOf).length === 0);
check("3 every applicability rule has its reason", APPLICABILITY.every((rule) => rule.why.trim().length > 20));
check("4 a box neither logged nor exempt", one(check4Logged(clean({ blind: ["/builder | input[name=city]"] })), 4, ""));
check("5 the other side's name typed on the Parties step and in the review", one(check5OnePlace(clean({ events: [ev("parties", "otherParty", "Company's full legal name"), ev("review-entry", "otherParty", "The other party: Not filled in yet")] }), factsOf), 5, "otherParty"));
check("5 an offer above its own box is one place", check5OnePlace(clean({ events: [ev("parties-offer", "otherParty", "From your story: X"), ev("parties", "otherParty", "Company's full legal name")] }), factsOf).length === 0);
check("6 a story fact never offered", one(check6Offered(clean({ events: [ev("sc-proposal", "amount", "The amount")] }), factsOf), 6, "otherParty"));
check("6 a story fact asked cold and never offered", check6Offered(clean({ events: [ev("parties", "otherParty", "First name"), ev("sc-proposal", "amount", "The amount")] }), factsOf).some((f) => f.fact === "otherParty" && /asked cold/.test(f.text)));
check("6 a story fact offered twice", one(check6Offered(clean({ events: [...clean().events, ev("story-proposal-row", "amount", "The amount", "/builder?step=review")] }), factsOf), 6, "amount"));
check("7 a value given before signing up gone after", one(check7Carried(clean({ mode: "guest-then-signup", carried: { before: { story: "I hired...", municipality: "Ottawa" }, after: { story: "I hired..." } } })), 7, "municipality"));
check("7 signed-in journeys have nothing to carry", check7Carried(clean({ carried: { before: { a: "1" }, after: {} } })).length === 0);
check("8 a removed value worded as not sure", one(check8Persists(clean({ persisted: { removed: { fact: "otherPartyLastName", shown: "Last name Not sure yet (not asked again)", askedAgain: false } } })), 8, "otherPartyLastName"));
check("8 not sure asked again after a reload", one(check8Persists(clean({ persisted: { notSure: { fact: "otherParty", shown: "Not sure yet (not asked again)", askedAgain: true } } })), 8, "otherParty"));
check("8 removed and not sure each worded as themselves pass", check8Persists(clean({ persisted: { notSure: { fact: "a", shown: "Not sure yet (not asked again)", askedAgain: false }, removed: { fact: "b", shown: "You removed this answer.", askedAgain: false } } })).length === 0);
check("9 a guest who signs up asked something the signed-in person was not", one(check9Same(clean(), clean({ mode: "guest-then-signup", events: [...clean().events, ev("sc-guided", "whenHappened", "When it happened")] }), factsOf), 9, "whenHappened"));
check("9 \"Not filled in yet\" items missing signed in", one(check9Same(clean({ mode: "guest-then-signup", notFilled: ["Court location", "Claim number"] }), clean(), factsOf), 9, "Claim number"));
check("10 the idle \"Send your story below\" while the story is read", one(check10Forward(clean({ screens: [{ screen: "/builder?step=guided", box: false, question: false, forward: false, working: false, idleWords: true }] })), 10, ""));
check("10 a screen with no box, no question and no way forward", one(check10Forward(clean({ screens: [{ screen: "/builder", box: false, question: false, forward: false, working: false, idleWords: false }] })), 10, ""));
check("10 a working sign is not a dead end", check10Forward(clean({ screens: [{ screen: "/builder", box: false, question: false, forward: false, working: true, idleWords: true }] })).length === 0);
check("10 a journey that never reached its end", one(check10Forward(clean({ ended: false })), 10, ""));
check("11 Form 7A's defendant blank though the record holds the name", one(check11Form7A(clean({ form7a: { fields: { "Defendant's last name or company's name": "" }, record: { otherParty: "TEST Fakebuild Contracting Inc." } } })), 11, "otherParty"));
check("11 Form 7A's amount contradicting the record", one(check11Form7A(clean({ form7a: { fields: { "Principal amount claimed": "$1,250.00" }, record: { amount: "12500" } } })), 11, "amount"));
check("11 Form 7A holding the record's values passes", check11Form7A(clean({ form7a: { fields: { "Defendant's last name or company's name": "TEST Fakebuild Contracting Inc.", "Principal amount claimed": "$12,500.00" }, record: { otherParty: "TEST Fakebuild Contracting Inc.", amount: "12500" } } })).length === 0);

console.log("\nEvery file the report names exists");
const named = [...new Set([...Object.values(SURFACE_FILES), OFFERS_HOME, ...["/builder?step=guided", "/builder?step=review", "/builder", "/cases/x", "/"].flatMap((screen) => (["small-claims", "civil"] as const).map((court) => screenFile(screen, court)))])];
const gone = named.filter((file) => !existsSync(file));
check(`every file a row can name exists (${named.length})`, gone.length === 0, gone.join(", "));

console.log("\nThe report");
const all = [...check6Offered(clean({ events: [] }), factsOf), ...check10Forward(clean({ ended: false }))];
const t = table(all);
check("the table has a row per failure with journey, screen, file, fact, text and check", t.split("\n").length === all.length + 2 && /\| sc-kitchen signed-in \|/.test(t) && /6 story fact not offered once/.test(t));
const c = counts(all);
check("counts per check and per file add up to the failures", Object.values(c.perCheck).reduce((a, b) => a + b, 0) === all.length && Object.values(c.perFile).reduce((a, b) => a + b, 0) === all.length && Boolean(c.perCheck[`6 ${CHECK_NAMES[6]}`]));

console.log(failures ? `\n${failures} check(s) failed` : "\nAll matrix checks can fail and pass as they should");
process.exit(failures ? 1 : 0);
