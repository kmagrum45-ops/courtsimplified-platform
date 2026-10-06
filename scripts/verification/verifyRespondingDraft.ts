/**
 * The side responding to a case is offered a draft of its response -- Defence
 * (Small Claims Form 9A), Statement of Defence (civil Form 18A), Answer
 * (family Form 10) -- built only from its own answers.
 *
 * WHY (2026-10-06). The site drafted only the document that starts a case;
 * a defendant or respondent, who has the shorter clock, got nothing.
 *
 * WHAT IT CATCHES:
 *   - a form number that is not the responding form in the sourced form
 *     summaries (formSummaries.json);
 *   - a line that is not the person's own answer or a plain label (an
 *     invented fact, or wording that judges the case);
 *   - the draft offered to the side that started the case, or not offered
 *     where the starting document is;
 *   - a draft kind the drafts store would refuse.
 *
 * COSTS NOTHING: pure functions and source reads.
 *
 * Run: npm run test:responding-draft
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { respondingDocumentDraft, respondingDocumentTitle } from "../../src/lib/case-system/drafts/respondingDocumentDraft";
import { DRAFT_KIND_LABELS } from "../../src/lib/case-system/drafts/caseDrafts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const summaries = JSON.parse(read("src/lib/content-library/forms/formSummaries.json")) as Record<string, Record<string, string>>;

const FORM: Record<string, { number: string; describes: RegExp }> = {
  "small-claims": { number: "9A", describes: /defendant uses to dispute/i },
  civil: { number: "18A", describes: /statement of defence/i },
  family: { number: "10", describes: /answer/i },
};
for (const [court, form] of Object.entries(FORM)) {
  const title = respondingDocumentTitle(court) ?? "";
  check(`${court}: the title names Form ${form.number}`, title.includes(`(Form ${form.number})`), title);
  check(`${court}: the sourced summary says Form ${form.number} is the response`, form.describes.test(summaries[court]?.[form.number] ?? ""), summaries[court]?.[form.number]);
}

const intake = {
  yourName: "Sam Example",
  otherParty: "Rapid Tow Ltd.",
  facts: "The car was already damaged when I bought it.",
  timeline: "Served on September 20, 2026.",
  evidence: "The bill of sale and photos.",
  goal: "I want the claim dismissed.",
  extra: { defenceResponse: "I agree I bought the car. I disagree that I owe $4,000." },
};
const draft = respondingDocumentDraft("small-claims", intake, new Date("2026-10-06T00:00:00Z"));
const body = (draft?.sections ?? []).map((section) => section.text).join("\n");
check("the person's own words are in the draft", ["Sam Example", "Rapid Tow Ltd.", "already damaged", "I disagree that I owe", "bill of sale", "dismissed"].every((words) => body.includes(words)), body);
check("nothing judges the case", !/strong|weak|likely|unlikely|you will (win|lose)|chance/i.test(JSON.stringify(draft)));
check("its kind is one the drafts store accepts", Boolean(draft && draft.kind in DRAFT_KIND_LABELS));
const empty = respondingDocumentDraft("family", {}, new Date());
check("what is not given says so, and nothing is invented", Boolean(empty) && (empty?.sections ?? []).every((section) => /Not entered|No .* entered/.test(section.text) || /Respondent \(you\): Not entered/.test(section.text)));
check("an unknown court gets no draft", respondingDocumentDraft("tribunal", intake, new Date()) === null);

const page = read("app/builder/page.tsx");
check("the builder offers it only to the responding side", /COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && respondingSide && savedCaseId\(\) && respondingDocumentTitle/.test(page));
const drafts = read("app/cases/[id]/drafts/page.tsx");
check("the Drafts tab offers it only to the responding side", /offerRespondingDocument =\s*COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && Boolean\(respondingTitle\) && responding;/.test(drafts));

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
if (failures) process.exitCode = 1;
