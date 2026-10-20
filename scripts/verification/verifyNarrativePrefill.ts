/**
 * What the narrative extractor reads from a story, and that nothing hands it to a form.
 *
 * What it checks: extractNarrativePrefill keeps the story exactly, reads only
 * literal facts (names, amount, remedy, dates, evidence, contact, role and who
 * served whom), and turns unclear or contradictory ones into questions; and the
 * follow-up chat no longer pre-fills any of the three forms.
 *
 * Failure it exists to catch: a form filled from a second copy of an old story
 * after the story changed (Part 3, stale-story audit item 4), and before that a
 * chat story from an earlier test filling the form (2026-10-06).
 *
 * Run: npm run test:narrative-prefill
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  directPrefillValues,
  extractNarrativePrefill,
} from "../../src/lib/case-system/intelligence/narrativePrefill";

const narrative = "I am Alex Example. Alex Example served Jordan Example with a Plaintiff's Claim on March 4, 2026. I seek $2,500 for the unpaid invoice. I have emails, screenshots, and a witness.";

for (const courtPath of ["small-claims", "family", "civil"] as const) {
  const prefill = extractNarrativePrefill({ narrative, courtPath, caseId: `${courtPath}-case` });
  const values = directPrefillValues(prefill);
  assert.equal(prefill.narrative, narrative, `${courtPath} must preserve the first narrative exactly`);
  assert.equal(values.facts, narrative, `${courtPath} must hand the same narrative to What happened`);
  assert.equal(values.yourName, "Alex Example");
  assert.equal(values.amountClaimed, "$2,500");
  assert.match(String(courtPath === "civil" ? values.legalRemedy : values.goal), /unpaid invoice/i);
  assert.equal(values.caseStage, "already-started");
  assert.equal(values.plaintiffName, "Alex Example");
  // Alex serves, Jordan is served: the plaintiff assertion above and the
  // serviceDetails assertion below both fix this direction.
  assert.equal(values.defendantName, "Jordan Example");
  assert.match(String(values.serviceDetails), /Alex Example served Jordan Example/i);
  assert.match(String(values.timeline), /March 4, 2026/i);
  assert.match(String(values.evidence), /emails/i);
  assert.ok(prefill.facts.every((fact) => fact.state === "direct"));
}

const unclear = extractNarrativePrefill({ narrative: "Someone served a claim, but I do not know who served whom.", courtPath: "small-claims" });
assert.ok(unclear.questions.some((question) => /who served whom/i.test(question)));
assert.equal(directPrefillValues(unclear).serviceDetails, undefined);

const contradictory = extractNarrativePrefill({ narrative: "I was served with a claim, but I served the claim too.", courtPath: "civil" });
assert.ok(contradictory.facts.some((fact) => fact.field === "yourRole" && fact.state === "contradictory"));

const expandedNarrative = "My address is 123 Main Street, Toronto. Contact me at alex@example.test. I offered to settle for $1,200, but they rejected my settlement offer. The judgment remains unpaid. This is urgent because my deadline is tomorrow. There is an existing court order. The total is $2,500 and includes $2,000 invoice and $500 repair cost.";
for (const courtPath of ["small-claims", "family", "civil"] as const) {
  const values = directPrefillValues(extractNarrativePrefill({ narrative: expandedNarrative, courtPath }));
  assert.match(String(values.addressDetails), /123 Main Street/);
  assert.equal(values.yourEmail, "alex@example.test");
  assert.match(String(values.settlementEfforts), /offered to settle/i);
  assert.match(String(values.enforcementDetails), /judgment remains unpaid/i);
  assert.match(String(values.urgent), /urgent because/i);
  assert.match(String(values.existingOrderDetails), /existing court order/i);
  assert.match(String(values.damagesBreakdown), /\$2,000 invoice/i);
  assert.equal(values.amountClaimed, "$2,500");
  assert.ok(Array.isArray(values.documentStatus));
}

const unclearContact = extractNarrativePrefill({ narrative: "My address is unclear and someone needs contact details.", courtPath: "family" });
assert.ok(unclearContact.facts.some((fact) => fact.field === "addressDetails" && fact.state === "unclear"));
assert.ok(unclearContact.questions.some((question) => /exact address or contact detail/i.test(question)));

// Part 3 (stale-story audit item 4): the follow-up chat's first message no
// longer pre-fills any form. It was a second copy of the story, handed over in
// the tab outside the version record, so a form could be filled from an old
// story after the story changed. The property: the chat writes no hand-off,
// no intake reads one, and the extractor itself touches no browser storage.
const chat = readFileSync("app/builder/_components/CourtAssistantChat.tsx", "utf8");
const helper = readFileSync("src/lib/case-system/intelligence/narrativePrefill.ts", "utf8");
assert.doesNotMatch(chat, /narrativePrefill|NarrativePrefill/, "the follow-up chat hands nothing to the forms");
assert.doesNotMatch(helper, /\b(?:localStorage|sessionStorage)\b/, "the extractor stores nothing in the browser");
for (const file of [
  "app/builder/_components/SmallClaimsIntake.tsx",
  "app/builder/_components/FamilyIntake.tsx",
  "app/builder/_components/CivilIntake.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /consumeNarrativePrefill|initialPrefill/, `${file}: no form is filled from a chat hand-off`);
  assert.match(source, /Found in your description — review\/edit/);
}
assert.match(readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8"), /damagesBreakdown: String\(values\.damagesBreakdown/);
assert.match(readFileSync("app/builder/_components/CivilIntake.tsx", "utf8"), /settlementEfforts: String\(values\.settlementEfforts/);

console.log("Narrative prefill verification passed: one story, direct-fact extraction, actor direction, focused review questions, and no chat-to-form hand-off.");
