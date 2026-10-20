/**
 * Family story reading: a denied mention is not a mention.
 *
 * What it checks: existingFamilyOrder (which hides the "where to start a new
 * case" rules behind "You told us there is already a court order") fires on a
 * story that says there IS an order, and not on one that says there never was
 * — "never married, never a court order, served with her Application" is a
 * respondent with no order. respondingInFamilyStory still reads that story as
 * served.
 *
 * Failure it exists to catch: the PR #463 re-test (2026-10-18), where a
 * negated "court order" showed the existing-order banner to a respondent.
 *
 * Run: npm run test:family-story-reading
 */
import assert from "node:assert/strict";
import { existingFamilyOrder, respondingInFamilyStory } from "../../src/lib/case-system/familyStoryReading";

const never = "We were never married and there has never been a court order. I was served with her Application on October 9, 2026.";
assert.equal(existingFamilyOrder(never), false, "a denied court order is not an existing order");
assert.equal(respondingInFamilyStory(never), true, "the same story is read as served");
for (const denied of ["There is no court order yet.", "We do not have a custody order.", "I have never been ordered to pay support."]) {
  assert.equal(existingFamilyOrder(denied), false, `denied: ${denied}`);
}
for (const stated of ["There is a court order from 2022 giving me the children.", "The final order says I pay $400 a month.", "I want a motion to change support.", "We never married, but there is a court order for parenting time."]) {
  assert.equal(existingFamilyOrder(stated), true, `stated: ${stated}`);
}
console.log("PASS family story reading: a denied court order is not an existing order");
