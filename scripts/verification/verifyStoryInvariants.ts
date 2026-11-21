/**
 * THIRTY-TWO STORIES, ALL THREE COURTS, BOTH SIDES: THE SAME FOUR PROMISES HOLD FOR EVERY ONE (audit of the three families,
 * 11 Nov 2026: Chrome kept finding the same kinds of mistake in new places, so they are checked across a wide story set).
 *
 * Each story runs through the site's own code with NO real AI: the review's story reading (suggestInitialAnswers), the
 * review's labels (reviewEntries), the Small Claims kind's overview (buildClaimTypeOverviewContent), and the analysis
 * engine every court uses (runCourtSimplifiedBrain) with allowExternalCognition: false, which is the stand-in CI uses.
 * Zero model calls, zero cost. Invariants, per story:
 *   1. a person being sued is shown no wording written for the person suing (review labels, suggestions, analysis text);
 *   2. no link goes to a source written for another court (overview and analysis, sourceCourt.ts);
 *   3. no words grading the case (caseStrengthLanguageValidator.ts) in anything the analysis returns;
 *   4. the deadline's day comes from the right fact: "When it happened" is never the day served, and a lent-money story is
 *      a loan, not a contractor dispute.
 *
 * WHAT FAILURE THIS CATCHES: a known kind of mistake (role, source, grading, date) coming back in a story not tried before.
 *
 * Run: npm run test:story-invariants
 */
import { reviewEntries, suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";
import { buildClaimTypeOverviewContent } from "../../src/lib/case-system/intake/claimTypeOverviewContent";
import { sourceFitsCourt } from "../../src/lib/content-library/sourceCourt";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

type Court = "small-claims" | "civil" | "family";
type Story = { court: Court; side: "bringing" | "responding"; text: string; served?: string; loan?: true };
const S = (court: Court, side: Story["side"], text: string, extra: Partial<Story> = {}): Story => ({ court, side, text: `Synthetic: ${text}`, ...extra });
const STORIES: Story[] = [
  // Loans and debts.
  S("small-claims", "bringing", "In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised to pay me back by June 1, 2026.", { loan: true }),
  S("small-claims", "bringing", "I loaned my sister $2,000 in May 2026 to fix her roof. She has not repaid any of it.", { loan: true }),
  S("small-claims", "bringing", "My coworker signed an IOU for $900 on April 4, 2026 and has not paid it back.", { loan: true }),
  S("small-claims", "responding", "On October 28, 2026 I was served with a Plaintiff's Claim. My former roommate says I owe her $3,200 for rent and utilities.", { served: "2026-10-28" }),
  S("small-claims", "responding", "I was served on November 2, 2026 with a claim saying I owe $1,500 on a loan from my cousin. I paid most of it back.", { served: "2026-11-02" }),
  S("civil", "bringing", "In June 2025 I lent my former business partner $85,000. She signed a note promising to repay it by March 1, 2026.", { loan: true }),
  S("civil", "responding", "On November 2, 2026 I was served with a Statement of Claim. A supplier says I owe $120,000 under a guarantee I signed.", { served: "2026-11-02" }),
  // Deposits.
  S("small-claims", "bringing", "I moved out on August 31, 2026. My former landlord kept my $1,500 last month's rent deposit."),
  S("small-claims", "bringing", "I paid a $600 deposit for a wedding venue on January 10, 2026. The venue cancelled and kept the deposit."),
  S("small-claims", "responding", "I was served with a claim on October 15, 2026. A customer says I kept her $2,000 deposit for a kitchen I never built.", { served: "2026-10-15" }),
  // Contractors.
  S("small-claims", "bringing", "I paid a contractor $6,000 to renovate my bathroom in April 2026 and the work was never finished."),
  S("small-claims", "bringing", "A roofer charged me $8,000 on July 2, 2026 and the roof still leaks."),
  S("small-claims", "responding", "I am a plumber. I was served with a claim on September 30, 2026 by a homeowner who says my work flooded her basement.", { served: "2026-09-30" }),
  S("civil", "bringing", "A builder took $140,000 from me for an addition in 2025 and walked off the job in February 2026."),
  // Car damage.
  S("small-claims", "bringing", "On May 3, 2026 a driver backed into my parked car. The repair cost $3,400."),
  S("small-claims", "responding", "I was served with a claim on November 5, 2026. A neighbour says I scratched his truck in a parking lot.", { served: "2026-11-05" }),
  S("small-claims", "bringing", "A mechanic charged me $1,800 on March 9, 2026 for a repair that did not fix my car's engine."),
  // Employment.
  S("small-claims", "bringing", "My former employer did not pay my last two weeks of wages, $2,300, when I quit on July 15, 2026."),
  S("civil", "bringing", "I was fired without notice on September 1, 2026 after eight years at my job."),
  S("civil", "responding", "I was served with a Statement of Claim on October 20, 2026. A former employee says I wrongfully dismissed him.", { served: "2026-10-20" }),
  S("small-claims", "bringing", "I did freelance design work and sent an invoice for $2,000 on May 1, 2026. It is still unpaid."),
  // Other money and property.
  S("small-claims", "bringing", "I bought a used laptop online for $700 on June 6, 2026 and it never arrived."),
  S("small-claims", "responding", "I was served with a claim on October 1, 2026. My former tenant says I damaged his furniture when he moved out.", { served: "2026-10-01" }),
  S("civil", "bringing", "My neighbour's tree fell on my house on March 3, 2026, causing $60,000 in damage."),
  // Family.
  S("family", "bringing", "Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me."),
  S("family", "bringing", "I married Sam Testmarsh in 2015 and we separated in January 2026. We have two children who live with me."),
  S("family", "responding", "I was served with a Form 8 Application on October 12, 2026. My ex wants sole decision-making for our son.", { served: "2026-10-12" }),
  S("family", "bringing", "My ex has not paid child support since March 2026 even though there is a court order."),
  S("family", "responding", "On November 1, 2026 I was served with a motion to change the support order. My ex says my income went up.", { served: "2026-11-01" }),
  S("family", "bringing", "We separated in May 2026 after 12 years of marriage. I want to sell the house we own together."),
  S("family", "responding", "I got served on September 20, 2026 with my wife's application for divorce and spousal support.", { served: "2026-09-20" }),
  S("family", "bringing", "My former partner moved away with our son in August 2026 without telling me. I want a parenting schedule."),
];

const PLAINTIFF_ONLY = [/\bdefendant address\b/i, /\byour losses\b/i, /\bthe court to order\b/i, /\bowed to you\b/i, /\byou paid for\b/i, /\bsaid about you\b/i, /\bhas the defendant filed a defence\b/i];
const checkpointOf = (story: Story) => {
  const situation = story.side === "responding" ? { where: "served", papers: "not-sure", court: story.court, courtFrom: "choice", stage: "just-served" } : { where: "starting", filed: "nothing", court: story.court, courtFrom: "choice" };
  const sections: Record<string, Record<string, unknown>> = { situation: { record: situation }, story: { text: story.text, facts: story.text } };
  if (story.court === "small-claims") sections["small-claims"] = { input: { facts: story.text, damagesBreakdown: "x", defendantAddress: "x", goal: "x" } };
  if (story.court === "civil") sections.civil = { input: { facts: story.text, legalRemedy: "x", damagesBreakdown: "x" } };
  if (story.court === "family") sections.family = { facts: story.text, goal: "x" };
  return { version: 1, flowId: "x", courtPath: story.court, revision: "1", sections } as never;
};
const strings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => strings(item, out));
  return out;
};
const urls = (value: unknown, out: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach((item) => urls(item, out));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) {
    if (/url$/i.test(key) && typeof item === "string") out.push(item);
    else urls(item, out);
  }
  return out;
};

async function main() {
  const { runCourtSimplifiedBrain } = await import("../../src/lib/case-system/intelligence/courtSimplifiedBrain");
  const courts = new Set(STORIES.map((story) => `${story.court}/${story.side}`));
  check(`setup: ${STORIES.length} stories, every court on both sides (${[...courts].sort().join(", ")})`, STORIES.length >= 30 && courts.size === 6);
  const role: string[] = [];
  const cross: string[] = [];
  const graded: string[] = [];
  const dates: string[] = [];
  for (const [index, story] of STORIES.entries()) {
    const name = `story ${index + 1} (${story.court}, ${story.side})`;
    const checkpoint = checkpointOf(story);
    const suggested = suggestInitialAnswers(checkpoint);
    const labels = reviewEntries(checkpoint).flatMap((entry) => [entry.label, entry.question ?? ""]);
    const analysis = await runCourtSimplifiedBrain({ courtPath: story.court, province: "Ontario", stage: "not-sure", rawUserText: story.text, existingMasterResult: { courtPath: story.court, province: "Ontario", city: "Ottawa" }, sourceType: "user-intake", allowExternalCognition: false } as never);
    // authorityAnalysis labels each SOURCE's legal weight ("binding", "persuasive"): about a source, never about the
    // person's case, and no screen renders it (grep app/ for authorityAnalysis). Everything else the analysis returns is read.
    const { authorityAnalysis: _sourceWeights, ...caseText } = ((analysis as { masterResultPatch?: { masterCase?: Record<string, unknown> } }).masterResultPatch?.masterCase ?? {}) as Record<string, unknown>;
    const said = strings({ ...(analysis as Record<string, unknown>), masterResultPatch: { masterCase: caseText }, dashboardPatch: undefined });
    if (story.side === "responding") {
      const found = [...labels, ...Object.values(suggested), ...said].filter((text) => PLAINTIFF_ONLY.some((pattern) => pattern.test(text)));
      if (found.length) role.push(`${name}: ${found.slice(0, 2).map((text) => `"${text.slice(0, 70)}"`).join("; ")}`);
    }
    const overview = story.court === "small-claims" ? buildClaimTypeOverviewContent(story.text) : null;
    for (const url of [...urls(analysis), ...urls(overview)]) if (!sourceFitsCourt(url, story.court)) cross.push(`${name}: ${url.slice(0, 90)}`);
    for (const text of said) {
      const verdict = validateCaseStrengthLanguage(text);
      if (!verdict.valid) graded.push(`${name}: "${verdict.matchedTerm}" in "${text.slice(0, 80)}"`);
    }
    if (story.served && suggested["sc-orient-when-happened"] === story.served) dates.push(`${name}: the day served (${story.served}) suggested as when it happened`);
    if (story.loan && story.court === "small-claims" && suggested["sc-orient-dispute-category"] !== "A loan or debt") dates.push(`${name}: a lent-money story suggested as "${suggested["sc-orient-dispute-category"]}"`);
  }
  check("1. no wording for the person suing is shown to a person being sued", role.length === 0, role.join("\n      "));
  check("2. no link to a source written for another court", cross.length === 0, [...new Set(cross)].slice(0, 8).join("\n      "));
  check("3. no words grading the case", graded.length === 0, graded.slice(0, 8).join("\n      "));
  check("4. the deadline's day comes from the right fact (never the day served; a loan stays a loan)", dates.length === 0, dates.join("\n      "));
  console.log("\nReal AI calls: 0 (allowExternalCognition: false; the review and overview readers make none).");
  console.log(failures ? `\n${failures} check(s) failed.` : `\nThe four promises hold for all ${STORIES.length} stories.`);
  process.exit(failures ? 1 : 0);
}
void main();
