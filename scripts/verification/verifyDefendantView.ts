/**
 * A PERSON BEING SUED IS NEVER SHOWN WHAT IS WRITTEN FOR THE PERSON SUING (Chrome check of #550, S5; site owner's
 * decision on 6c, 13 Nov 2026).
 *
 * Chrome's being-sued story (a homeowner sued by a contractor for a kitchen job) was given the kind "A homeowner will
 * not pay the contractor", and the next-step page showed that kind's content as written for the contractor: the proof
 * list ("Proof the work was done, The invoices, Statement of the balance"), "Points the court may need clarified"
 * ("calculate and explain the amount of money ... you are claiming") and the Construction Act's prompt-payment text.
 *
 * The rule: the person's side, from the record, chooses the view in ONE place (roleView.ts kindForSide /
 * claimTypeForSide). For a person being sued, a kind written for the person suing shows its existing defendant-side
 * view where one exists (defendantViews.json "mapped"); where none exists, its plaintiff-only parts are hidden and the
 * existing generic view for a person who has been served is shown ("hiddenForDefendant"). No new wording.
 *
 * What it asserts:
 *   1. build check: every Small Claims kind written for the person suing is either mapped to an existing defendant-side
 *      kind or declared hidden for a defendant; nothing is in both; every mapping names a real defendant-side kind;
 *   2. the being-sued story (kitchen job, $4,200 claimed, $2,000 paid): the overview content holds none of the
 *      contractor's proof list or court points, and is the defendant-side view's own content;
 *   3. a kind with no defendant view (a personal loan, being sued): the generic served view, nothing of the loan
 *      lender's list;
 *   4. the person suing still sees their own kind's content, unchanged;
 *   5. wiring: the overview (IntelligenceOverviewPanel.tsx) and the chat's guidance (orchestrateIntakeTurn.ts) read
 *      the side through the one function.
 *
 * WHAT FAILURE THIS CATCHES: any page that shows a person being sued the proof, points or wording written for the
 * person suing them, and a new kind added without saying what a person being sued sees for it.
 *
 * Run: npm run test:defendant-view
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { buildClaimTypeOverviewContent, overviewContentOf } from "../../src/lib/case-system/intake/claimTypeOverviewContent";

type Views = { genericServedView: string; mapped: Record<string, string>; hiddenForDefendant: string[]; hiddenPartsForDefendant: { startsWith: string; why: string }[] };
type RoleView = { claimTypeForSide?: (claimType: (typeof CLAIM_TYPES)[number], responding: boolean) => (typeof CLAIM_TYPES)[number] };

const KITCHEN = "A contractor redid my kitchen in August 2026. The agreed price was $6,200 and I paid $2,000. They have sued me for the other $4,200. I dispute all of it: the cabinets are crooked and the countertop is cracked.";
const LOAN = "My former coworker says I owe him $3,000 he lent me and has sued me for it.";

async function main() {
  const views = JSON.parse(readFileSync("src/lib/case-system/intake/defendantViews.json", "utf8")) as Views;
  const roleView = await import("../../src/lib/case-system/intake/roleView").catch(() => ({})) as RoleView;
  let failed = 0;
  const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };
  const hiddenStarts = views.hiddenPartsForDefendant.map((part) => part.startsWith);
  const byId = new Map(CLAIM_TYPES.map((type) => [type.id, type]));
  const plaintiffKinds = CLAIM_TYPES.filter((type) => type.courtArea === "small-claims" && !type.id.startsWith("sc-defence-")).map((type) => type.id);
  const overview = (story: string, kind: string, responding: boolean) =>
    (buildClaimTypeOverviewContent as unknown as (s: string, t: typeof CLAIM_TYPES, k: string, r: boolean) => ReturnType<typeof buildClaimTypeOverviewContent>)(story, CLAIM_TYPES, kind, responding);
  const texts = (content: ReturnType<typeof buildClaimTypeOverviewContent>) => [...(content?.evidenceToOrganize ?? []), ...(content?.courtPoints ?? []), ...(content?.commonDefences ?? [])].map((item) => item.text);

  check("1. build check: every kind written for the person suing is mapped to a defendant-side view or declared hidden", () => {
    const missing = plaintiffKinds.filter((id) => !(id in views.mapped) && !views.hiddenForDefendant.includes(id));
    assert.deepEqual(missing, [], `no defendant view declared for ${missing.join(", ")}`);
    const both = views.hiddenForDefendant.filter((id) => id in views.mapped);
    assert.deepEqual(both, [], `both mapped and hidden: ${both.join(", ")}`);
    const stale = [...Object.keys(views.mapped), ...views.hiddenForDefendant].filter((id) => !plaintiffKinds.includes(id));
    assert.deepEqual(stale, [], `declared but not a kind for the person suing: ${stale.join(", ")}`);
    const badTargets = Object.values(views.mapped).filter((id) => !id.startsWith("sc-defence-") || !byId.has(id));
    assert.deepEqual(badTargets, [], `mapped to something that is not a defendant-side kind: ${badTargets.join(", ")}`);
    assert.ok(byId.has(views.genericServedView) && views.genericServedView.startsWith("sc-defence-"), "the generic served view is not a defendant-side kind");
  });

  check("2. being sued (kitchen job, $4,200): the overview holds none of the contractor's proof list or court points", () => {
    const plaintiff = texts(overview(KITCHEN, "sc-claim-homeowner-wont-pay-contractor", false));
    const defendantView = texts(overviewContentOf(byId.get(views.mapped["sc-claim-homeowner-wont-pay-contractor"])!)).filter((text) => !hiddenStarts.some((start) => text.startsWith(start)));
    const shown = texts(overview(KITCHEN, "sc-claim-homeowner-wont-pay-contractor", true));
    const plaintiffOnly = plaintiff.filter((text) => !defendantView.includes(text));
    const leaked = shown.filter((text) => plaintiffOnly.includes(text));
    assert.deepEqual(leaked, [], `shown to the person being sued: ${leaked.slice(0, 2).join(" | ")}`);
    assert.ok(!shown.some((text) => /you are claiming|calculate and explain the amount/i.test(text)), "speaks as the person suing");
    assert.deepEqual(shown, defendantView, "the defendant-side view's own content is not what is shown");
  });

  check("3. being sued on a kind with no defendant view (a personal loan): the generic served view only", () => {
    const loanKind = plaintiffKinds.find((id) => views.hiddenForDefendant.includes(id) && /loan/.test(id))!;
    const shown = texts(overview(LOAN, loanKind, true));
    const generic = texts(overviewContentOf(byId.get(views.genericServedView)!)).filter((text) => !hiddenStarts.some((start) => text.startsWith(start)));
    assert.deepEqual(shown, generic, `${loanKind}: not the generic served view`);
  });

  check("3b. every kind, being sued: nothing declared as speaking to the person suing, and no \"you are claiming\"", () => {
    const leaks = plaintiffKinds.flatMap((id) => texts(overview(KITCHEN, id, true)).filter((text) => hiddenStarts.some((start) => text.startsWith(start)) || /you are claiming/i.test(text)).map(() => id));
    assert.deepEqual([...new Set(leaks)], [], `shown to a person being sued: ${[...new Set(leaks)].join(", ")}`);
  });

  check("4. the person suing still sees their own kind's content, unchanged", () => {
    const own = overview(KITCHEN, "sc-claim-homeowner-wont-pay-contractor", false);
    assert.equal(own?.claimTypeId, "sc-claim-homeowner-wont-pay-contractor");
  });

  check("5. wiring: the overview and the chat's guidance read the side through the one function", () => {
    assert.equal(typeof roleView.claimTypeForSide, "function", "roleView.ts claimTypeForSide does not exist");
    const content = readFileSync("src/lib/case-system/intake/claimTypeOverviewContent.ts", "utf8");
    assert.ok(/claimTypeForSide\(/.test(content), "claimTypeOverviewContent.ts does not choose the view by side");
    const panel = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
    assert.ok(/buildClaimTypeOverviewContent\([^)]*responding/.test(panel), "the overview does not pass the side from the record");
    const turn = readFileSync("src/lib/case-system/intake/orchestrateIntakeTurn.ts", "utf8");
    assert.ok(/claimTypeForSide\(match\.claimType/.test(turn), "the chat's guidance does not choose the view by side");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log(`\nAll checks passed (${Object.keys(views.mapped).length} kinds mapped, ${views.hiddenForDefendant.length} hidden for a defendant)`);
}

void main();
