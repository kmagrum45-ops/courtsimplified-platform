/**
 * The child support screen: the common case is small, the second income figure
 * is absent rather than empty, and an out-of-scope situation is named.
 *
 * COSTS NOTHING. Reads the component source and calls the pure modules behind
 * it. No render, no network, no AI.
 *
 * WHY THE SECOND INCOME FIELD GETS THE MOST ATTENTION HERE. The draft engine
 * omits it rather than defaulting it, and the reason is in that file at length.
 * The screen is the only place that decision is visible to a user, and the
 * easiest way to undo it is for someone to move the field out of the s. 7
 * disclosure "so it is not hidden". That would be a kind change with the
 * opposite effect: every applicant would then be asked for two income figures
 * when almost none of them have two.
 *
 * Run: node --import tsx scripts/verification/verifyChildSupportIntake.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { draftChildSupportApplication } from "../../src/lib/case-system/family/childSupportDraftEngine";
import {
  SCOPE_NOTICES,
  scopeNoticesFor,
} from "../../src/lib/case-system/family/childSupportScope";

const SCREEN_PATH = path.resolve(
  process.cwd(),
  "app",
  "builder",
  "_components",
  "ChildSupportIntake.tsx",
);
const BUILDER_PATH = path.resolve(process.cwd(), "app", "builder", "page.tsx");

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** Source with comments stripped — a check must not fire on its own explanation. */
function screenBody(): string {
  return fs
    .readFileSync(SCREEN_PATH, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

/** The JSX between a disclosure's opening tag and its closing tag. */
function disclosureBlock(body: string, id: string): string {
  const open = body.indexOf(`id="${id}"`);
  if (open < 0) return "";
  const close = body.indexOf("</Disclosure>", open);
  return close < 0 ? body.slice(open) : body.slice(open, close);
}

function main(): void {
  const body = screenBody();

  // ---- It is wired. An unmounted screen is the failure this repo keeps finding. ----

  const builder = fs.readFileSync(BUILDER_PATH, "utf8");
  check(
    "the screen is imported and mounted in app/builder/page.tsx",
    /import ChildSupportIntake from/.test(builder) && /<ChildSupportIntake\s*\/>/.test(builder),
  );
  check(
    "the screen imports the draft engine",
    /from "\.\.\/\.\.\/\.\.\/src\/lib\/case-system\/family\/childSupportDraftEngine"/.test(body),
    "the engine coming off the dormant list is the signal the wiring happened, " +
      "rather than the screen existing beside it",
  );

  // ---- The no-calculation line comes FIRST ----

  const noticeAt = body.indexOf("child-support-no-calculation-notice");
  const firstQuestionAt = body.indexOf("Question 1");
  check("the no-calculation notice exists", noticeAt >= 0);
  check(
    "the no-calculation notice appears before the first question",
    noticeAt >= 0 && firstQuestionAt >= 0 && noticeAt < firstQuestionAt,
    "a user who reaches question four still expecting a number has been misled " +
      "for four questions",
  );
  check(
    "it says outright that it does not calculate the amount",
    /does not\s*\n?\s*calculate the amount/i.test(body.replace(/\s+/g, " ")),
  );

  // ---- The second income field is INSIDE the s. 7 disclosure ----

  const sectionSeven = disclosureBlock(body, "section-seven");
  check("the section 7 disclosure exists", sectionSeven.length > 0);
  check(
    "the second income field is inside the section 7 disclosure",
    sectionSeven.includes("cs-income-section-seven"),
  );

  const outsideDisclosures = body
    .replace(disclosureBlock(body, "section-seven"), " ")
    .replace(disclosureBlock(body, "property"), " ");
  check(
    "the second income field appears NOWHERE outside that disclosure",
    !outsideDisclosures.includes("cs-income-section-seven"),
    "moving it out so it is 'not hidden' would ask every applicant for two " +
      "income figures when almost none of them have two",
  );
  check(
    "the Schedule III items 3 and 3.1 explanation sits with it",
    sectionSeven.includes("Item 3") && sectionSeven.includes("Item 3.1"),
  );

  // ---- Disclosures are closed on load ----

  for (const [name, initial] of [
    ["sectionSevenOpen", "useState(false)"],
    ["propertyOpen", "useState(false)"],
  ] as const) {
    check(
      `${name} starts closed`,
      new RegExp(`${name}[^=]*=\\s*useState[^;]*${initial.replace(/[()]/g, "\\$&")}`).test(body) ||
        new RegExp(`\\[${name},[^\\]]*\\]\\s*=\\s*useState\\(false\\)`).test(body),
    );
  }

  // ---- The residence question carries its reason ----

  check(
    "the residence question states why it decides the table",
    body.includes("cs-residence-reason") &&
      /parent the order is sought against/i.test(body) &&
      /not where you\s*\n?\s*live/i.test(body.replace(/\s+/g, " ")),
  );

  // ---- No readiness gate on this path ----

  check(
    "the screen does not call evaluateReadinessGate",
    !/evaluateReadinessGate/.test(body),
    "it takes a ClaimType, there is no family ClaimType, and wiring it here " +
      "returns no-confirmed-claim-type forever",
  );
  check(
    "the draft is produced regardless of what is missing",
    /draftChildSupportApplication\(draftInput\)/.test(body) &&
      !/if \(.*placeholders\.length.*\) return null/.test(body),
  );

  // ---- The engine behaves as the screen promises ----

  // The common case: no s. 7 disclosure opened, so no second figure reaches
  // the engine and none appears in the draft.
  const common = draftChildSupportApplication({
    applicantName: "A",
    applicantAddress: "B",
    respondentName: "C",
    respondentAddress: "D",
    childrenDescribed: "Two children, 6 and 9.",
    parentingTimeDescribed: "They live with me.",
    incomeForTable: { stated: "about $58,000", basisStated: "their 2025 NOA", statedBy: "user" },
    incomeDocumentsHeld: ["2025 notice of assessment"],
    propertyOrExclusivePossessionClaim: false,
    onlyClaimIsTableAmountChildSupport: true,
  });
  check(
    "common case: no second income figure in the draft",
    !common.draftText.includes("Annual income for special or extraordinary expenses"),
  );
  check(
    "common case: r. 13 (1.3) removes the financial statement",
    common.financialStatementForm.includes("None required"),
  );
  check(
    "common case: the income is carried with its qualifier",
    common.draftText.includes("about $58,000"),
  );

  // Opening the s. 7 disclosure must make the second figure appear AND must
  // take the case out of r. 13 (1.3) — a s. 7 claim is not the table amount.
  const withSeven = draftChildSupportApplication({
    ...{
      applicantName: "A",
      applicantAddress: "B",
      respondentName: "C",
      respondentAddress: "D",
      childrenDescribed: "Two children, 6 and 9.",
      parentingTimeDescribed: "They live with me.",
      incomeForTable: { stated: "about $58,000", basisStated: "their 2025 NOA", statedBy: "user" as const },
      incomeDocumentsHeld: ["2025 notice of assessment"],
      propertyOrExclusivePossessionClaim: false,
    },
    sectionSevenExpenses: ["Daycare, $610 a month"],
    incomeForSectionSeven: {
      stated: "about $51,000",
      basisStated: "the same return, less support paid",
      statedBy: "user" as const,
    },
    onlyClaimIsTableAmountChildSupport: false,
  });
  check(
    "with section 7: the second income figure appears, labelled",
    withSeven.draftText.includes("Annual income for special or extraordinary expenses") &&
      withSeven.draftText.includes("s. 3 (1) (b)"),
  );
  check(
    "with section 7: Form 13 is required, not the r. 13 (1.3) exception",
    withSeven.financialStatementForm === "Form 13",
  );

  check(
    "the screen withdraws the s. 7 figure when the disclosure is closed",
    /sectionSevenOpen \? toStatedIncome\(incomeForSectionSeven\) : undefined/.test(body),
  );
  check(
    "the screen cannot claim r. 13 (1.3) while the s. 7 disclosure is open",
    /tableAmountOnly && !sectionSevenOpen/.test(body),
  );

  // ---- Out-of-scope recognition ----

  check("there are scope notices authored", SCOPE_NOTICES.length >= 5);

  const STORIES: { text: string; expect: string }[] = [
    { text: "We already have an order from 2022 and I want to change the amount.", expect: "variation-of-existing-order" },
    { text: "My son is 19 and in his first year at college.", expect: "child-at-or-over-age-of-majority" },
    { text: "He earns well over $150,000 a year.", expect: "income-over-150000" },
    { text: "The kids are with each of us week on week off.", expect: "shared-or-split-parenting-time" },
    { text: "He says he cannot afford the table amount.", expect: "undue-hardship" },
  ];

  for (const story of STORIES) {
    const matched = scopeNoticesFor(story.text).map((notice) => notice.id);
    check(
      `an out-of-scope story is recognised: ${story.expect}`,
      matched.includes(story.expect as never),
      `got ${JSON.stringify(matched)}`,
    );
  }

  // The common-case story raises NOTHING. A notice on every case is a notice
  // nobody reads, and this one tells a user the site does not cover them.
  const plain =
    "I have two children, 6 and 9. They live with me and see their dad every second weekend. " +
    "He has never paid anything towards them.";
  check(
    "the common-case story raises no out-of-scope notice",
    scopeNoticesFor(plain).length === 0,
    `got ${JSON.stringify(scopeNoticesFor(plain).map((n) => n.id))}`,
  );

  // Every notice must be a topic, never a conclusion about the user.
  for (const notice of SCOPE_NOTICES) {
    const text = `${notice.topic} ${notice.whatItIs} ${notice.whyNotCoveredHere}`;
    check(
      `notice ${notice.id} states a topic, not a conclusion about the user`,
      !/your (case|situation) is\b|you (are|have) a\b|this is a variation/i.test(text),
    );
    check(`notice ${notice.id} carries a pinpoint and a source`, Boolean(notice.pinpoint && notice.sourceUrl));
  }

  check(
    "a notice tells the user the site does not cover it, rather than blocking",
    /does not cover it yet/i.test(body) && !/disabled=\{notices\.length/.test(body),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
