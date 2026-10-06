import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PREFILL_MAX_AGE_MS,
  consumeNarrativePrefill,
  directPrefillValues,
  extractNarrativePrefill,
  persistNarrativePrefill,
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

const chat = readFileSync("app/builder/_components/CourtAssistantChat.tsx", "utf8");
const helper = readFileSync("src/lib/case-system/intelligence/narrativePrefill.ts", "utf8");
for (const file of [
  "app/builder/_components/SmallClaimsIntake.tsx",
  "app/builder/_components/FamilyIntake.tsx",
  "app/builder/_components/CivilIntake.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /consumeNarrativePrefill/);
  assert.match(source, /Found in your description — review\/edit/);
}
assert.match(chat, /!messages\.some\(\(message\) => message\.role === "user"\)/);
assert.match(chat, /persistNarrativePrefill/);
assert.doesNotMatch(helper, /localStorage/);
assert.doesNotMatch(chat, /narrative[^\n]{0,80}location\.assign/i);
assert.match(helper, /value\.caseId && value\.caseId !== args\.caseId/);
for (const file of [
  "app/builder/_components/SmallClaimsIntake.tsx",
  "app/builder/_components/FamilyIntake.tsx",
  "app/builder/_components/CivilIntake.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /const \[initialPrefill\] = useState/);
  assert.match(source, /useState[\s\S]{0,500}initialPrefill/);
  // The prefill is consumed once, in useState's initialiser -- never in an
  // effect, which runs twice in development and after every render it
  // depends on. Asserted on an effect's BODY: the earlier form ("useEffect"
  // anywhere within 1,200 characters before the call) failed on a plain
  // `import { useEffect, ... }` at the top of CivilIntake (2026-10-05).
  assert.doesNotMatch(source, /useEffect\(\s*\(\)\s*=>\s*\{[^}]{0,1200}consumeNarrativePrefill/);
}
assert.match(readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8"), /damagesBreakdown: String\(values\.damagesBreakdown/);
assert.match(readFileSync("app/builder/_components/CivilIntake.tsx", "utf8"), /settlementEfforts: String\(values\.settlementEfforts/);
assert.match(readFileSync("app/builder/_components/FamilyIntake.tsx", "utf8"), /initialValues\.urgent/);

console.log("Narrative prefill verification passed: one story, direct-fact prefill, actor direction, focused review questions, and three-area isolated handoff.");

// 2026-10-06: a story typed into the chat in an earlier test, same tab,
// filled the form after the site owner pressed Back. The hand-off is read
// once and expires.
{
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  const prefill = extractNarrativePrefill({ narrative: "I hired a guy off kijiji to redo my bathroom.", courtPath: "small-claims" });
  persistNarrativePrefill(prefill, storage, 1_000_000);
  assert.ok(consumeNarrativePrefill({ courtPath: "small-claims" }, storage, 1_000_000 + 60_000), "a recent hand-off is used");
  assert.equal(consumeNarrativePrefill({ courtPath: "small-claims" }, storage, 1_000_000 + 60_000), null, "and used only once");
  persistNarrativePrefill(prefill, storage, 1_000_000);
  assert.equal(consumeNarrativePrefill({ courtPath: "small-claims" }, storage, 1_000_000 + PREFILL_MAX_AGE_MS + 1), null, "an old hand-off is never used");
  assert.equal(store.size, 0, "and is removed, not left for the next visit");
  store.set("courtsimplified-ai-case-partner-chat:narrative-prefill:small-claims", JSON.stringify(prefill));
  assert.equal(consumeNarrativePrefill({ courtPath: "small-claims" }, storage, 1_000_000), null, "one stored before expiry existed is dropped");
  persistNarrativePrefill({ ...prefill, caseId: "case-a" }, storage, 1_000_000);
  assert.equal(consumeNarrativePrefill({ courtPath: "small-claims", caseId: "case-b" }, storage, 1_000_000), null, "another case's hand-off is not used");
  assert.equal(store.size, 0, "and is not kept either");
  console.log("narrative prefill: read once, expires, never another case's");
}
