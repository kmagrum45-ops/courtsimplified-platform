/**
 * EVERY SMALL CLAIMS CATALOGUE ITEM HAS A SHOWING CONDITION, HIDDEN BY DEFAULT (site owner, 27 Nov 2026, step 2).
 *
 * What it checks:
 *   1. catalogueConditions.generated.ts is exactly what scripts/content/generateCatalogueConditions.ts writes (no hand
 *      edit, no drift from the catalogue);
 *   2. every plaintiff element, defendant consideration and procedural note of every Small Claims claim type resolves
 *      to a condition, and every condition starts with its own claim type;
 *   3. hidden by default: with no confirmed kind, and with another kind confirmed, no item shows and nothing is asked;
 *   4. story 7 (defamation by private text): the newspaper/broadcast items are not shown and their one fact is asked;
 *      answered "no" they stay hidden, "yes" they show; set-off and the over-$50,000 text never show for its $10,000;
 *   5. story 8 (a loan with a due date): the demand-loan item asks its fact, the kind's own items show by default;
 *   6. the over-$50,000 text shows only when the recorded amount is over $50,000.
 * What failure it exists to catch: law that does not apply to the person's case on their screen (story 7 showed the
 * newspaper notice, s. 111 set-off and the Landlord and Tenant Board for a private text), or an item shown with no
 * condition at all.
 *
 * Costs nothing. Run: npm run test:catalogue-conditions
 */
import { execFileSync } from "node:child_process";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import type { CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { conditionFor, itemApplies } from "../../src/lib/case-system/applicability/itemApplies";
import { DEADLINE_LINE_ITEMS, NEEDS_OWN_RULE } from "../../src/lib/case-system/applicability/catalogueConditions.generated";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : ` -- ${detail}`}`);
};

// 1. Generated file current.
let current = true;
try { execFileSync(process.execPath, ["--import", "tsx", "scripts/content/generateCatalogueConditions.ts", "--check"], { stdio: "pipe" }); } catch { current = false; }
check("1. the generated conditions are what the generator writes", current);

// 2. Every item resolves, starting with its claim type.
const SC = CLAIM_TYPES.filter((type) => type.courtArea === "small-claims");
type Item = { type: string; list: "element" | "consideration" | "note"; key: string | number; text: string };
const items: Item[] = SC.flatMap((type) => [
  ...type.plaintiffElements.map((e) => ({ type: type.id, list: "element" as const, key: e.id, text: `${e.name} ${e.plainExplanation}` })),
  ...type.defendantConsiderations.map((c) => ({ type: type.id, list: "consideration" as const, key: c.id, text: `${c.name} ${c.plainExplanation} ${c.whenThisComesUp}` })),
  ...type.proceduralNotes.map((n, i) => ({ type: type.id, list: "note" as const, key: i, text: n.note })),
]);
const startsWithType = (type: string, condition: ReturnType<typeof conditionFor>): boolean => ("kind" in condition && condition.kind === "claim-type" && condition.id === type) || ("all" in condition && startsWithType(type, condition.all[0]));
const bad = items.filter((item) => !startsWithType(item.type, conditionFor(item.type, item.list, item.key)));
check(`2. all ${items.length} items in ${SC.length} claim types have a condition that starts with their claim type`, items.length > 1000 && bad.length === 0, bad.slice(0, 3).map((b) => `${b.type}|${b.list}|${b.key}`).join(", "));

// 3. Hidden by default.
const record = (kind: string | null, amount?: number) => ({ ...(kind ? { claimKind: { state: "answered", value: kind, confirmed: true } } : {}), ...(amount !== undefined ? { amount: { state: "answered", value: amount } } : {}) }) as unknown as CaseFile;
const shown = (r: CaseFile, list = items) => list.filter((item) => itemApplies(r, item.type, item.list, item.key).shows);
const asked = (r: CaseFile, list = items) => list.filter((item) => { const v = itemApplies(r, item.type, item.list, item.key); return !v.shows && v.ask.length > 0; });
check("3a. with no confirmed kind nothing shows and nothing is asked", shown(record(null)).length === 0 && asked(record(null)).length === 0);
const DEFAMATION = "sc-claim-defamation-libel-slander";
const LOAN = "sc-claim-personal-loan-between-individuals";
const loanItems = items.filter((item) => item.type === LOAN);
check("3b. another kind confirmed: none of the loan's items show or ask", shown(record(DEFAMATION, 10_000), loanItems).length === 0 && asked(record(DEFAMATION, 10_000), loanItems).length === 0);

// 4. Story 7.
const defamation = items.filter((item) => item.type === DEFAMATION);
const story7 = record(DEFAMATION, 10_000);
const paper = defamation.filter((item) => /\bnewspaper|\bbroadcast/i.test(item.text));
check("4a. story 7: no newspaper/broadcast item shows; each asks its one fact", paper.length > 0 && paper.every((item) => { const v = itemApplies(story7, item.type, item.list, item.key); return !v.shows && v.ask.includes("publishedInNewspaperOrBroadcast"); }), String(paper.length));
check("4b. answered \"no\" they stay hidden and ask nothing; \"yes\" they show", paper.every((item) => { const no = itemApplies(story7, item.type, item.list, item.key, { publishedInNewspaperOrBroadcast: false }); const yes = itemApplies(story7, item.type, item.list, item.key, { publishedInNewspaperOrBroadcast: true }); return !no.shows && no.ask.length === 0 && yes.shows; }));
// An element may name the limit (what the person must show for their own claim is never hidden by a pattern); a NOTE
// about going over it may not show for $10,000.
check("4c. story 7: no set-off item, and no note about going over $50,000, shows", shown(story7, defamation).every((item) => !/set-off|\bs\. ?111\b/i.test(item.text) && !(item.list === "note" && /(?:over|more than|exceed\w*|above|waiv\w*|abandon\w*)[^.]{0,60}\$\s?50,000/i.test(item.text))));
check("4e. no plaintiff element waits on a broad fact (consumer, employment, tenancy, government, insurer) or on the amount", items.filter((item) => item.list === "element").every((item) => !/consumerAgreement|employment|residentialTenancy|governmentParty|insurerInvolved|amount-over/.test(JSON.stringify(conditionFor(item.type, item.list, item.key)))));
check("4d. story 7: the defamation items with no further condition show", shown(story7, defamation).length > 0);

// 5. Story 8.
const story8 = record(LOAN, 4_000);
const demand = loanItems.filter((item) => /demand obligation|repayable on demand/i.test(item.text));
check("5a. story 8: the demand-loan item asks whether the loan was repayable on demand", demand.length > 0 && demand.every((item) => { const v = itemApplies(story8, item.type, item.list, item.key); return !v.shows && v.ask.includes("loanRepayableOnDemand"); }));
check("5b. story 8: the loan's own items show by default", loanItems.filter((item) => !/demand obligation|repayable on demand|\$\s?50,000|monetary jurisdiction/i.test(item.text)).every((item) => itemApplies(story8, item.type, item.list, item.key).shows));

// 6. Over the limit.
const overLimit = items.filter((item) => /\$\s?50,000|monetary jurisdiction/i.test(item.text) && "all" in conditionFor(item.type, item.list, item.key) && JSON.stringify(conditionFor(item.type, item.list, item.key)).includes("amount-over") && !JSON.stringify(conditionFor(item.type, item.list, item.key)).includes("\"fact\""));
check("6. the over-$50,000 text shows only over $50,000", overLimit.length > 0 && overLimit.every((item) => !itemApplies(record(item.type, 50_000), item.type, item.list, item.key).shows && itemApplies(record(item.type, 60_000), item.type, item.list, item.key).shows), String(overLimit.length));

// 7. The owner's two rules of 27 Nov 2026.
const deadline = items.filter((item) => DEADLINE_LINE_ITEMS.includes(`${item.type}|${item.list}|${item.key}`));
check("7a. every notice or time-limit deadline line shows whenever its kind is confirmed (never hidden, asks nothing)", deadline.length >= 30 && deadline.every((item) => itemApplies(record(item.type, 1_000), item.type, item.list, item.key).shows), String(deadline.length));
const setOff = items.filter((item) => /set-off|\bs\. ?111\b/i.test(item.text) && !/loan|debt|invoice|unpaid|owed|owing|cheque|promissory|account|refund|deposit|wage|rent|not paying|payment/i.test(`${item.type} ${SC.find((t) => t.id === item.type)!.name}`));
check("7b. set-off on a claim type not about money owed is hidden and asks once whether the claim is for money owed; \"yes\" shows it", setOff.length > 0 && setOff.every((item) => { const v = itemApplies(record(item.type, 1_000), item.type, item.list, item.key); const yes = itemApplies(record(item.type, 1_000), item.type, item.list, item.key, { moneyOwed: true }); return !v.shows && v.ask.includes("moneyOwed") && yes.shows; }), String(setOff.length));
const sublet = items.filter((item) => item.type === "sc-claim-subletter-not-paying" && /set-off|\bs\. ?111\b/i.test(item.text));
check("7c. set-off on \"subletter not paying\" (money owed) shows with no question", sublet.length > 0 && sublet.every((item) => itemApplies(record(item.type, 1_000), item.type, item.list, item.key).shows));
check("7d. no item is left needing its own rule", NEEDS_OWN_RULE.length === 0, NEEDS_OWN_RULE.map((n) => n.key).join(", "));

console.log(`\n${NEEDS_OWN_RULE.length} items need their own rule (kept on the default until written).`);
if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("Every Small Claims catalogue item has a showing condition, hidden by default: every check passed.");
