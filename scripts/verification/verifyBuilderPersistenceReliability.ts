import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  activeCaseIdStorageKey,
  builderDraftStorageKey,
  loadCompactBuilderDraft,
  saveCompactBuilderDraft,
} from "../../src/lib/case-system/builderDraftStorage";

const writes = new Map<string, string>();
const storage = {
  getItem(key: string) { return writes.get(key) || null; },
  setItem(key: string, value: string) {
    writes.set(key, value);
  },
};

const oversizedMasterResult = "x".repeat(250_000);
assert.equal(
  saveCompactBuilderDraft(storage, {
    caseId: "selected-family-case",
    courtPath: "family",
    caseStage: "conference",
    facts: oversizedMasterResult,
  }, "user-a"),
  true,
);
assert.deepEqual([...writes.keys()].sort(), [
  activeCaseIdStorageKey("user-a"),
  builderDraftStorageKey("user-a"),
]);
assert.ok(
  writes.get(builderDraftStorageKey("user-a"))!.length < 5_000,
  "An oversized master result must not be copied into localStorage",
);
assert.doesNotMatch(
  writes.get(builderDraftStorageKey("user-a"))!,
  /courtSimplifiedIntelligence|persistedRecord|masterCaseFile/,
);

const quotaStorage = {
  getItem() { return null; },
  setItem() {
    throw new DOMException("Storage full", "QuotaExceededError");
  },
};
assert.doesNotThrow(() => {
  assert.equal(
    saveCompactBuilderDraft(quotaStorage, {
      caseId: "selected-civil-case",
      courtPath: "civil",
    }, "user-a"),
    false,
  );
}, "QuotaExceededError must not escape the builder save flow");

assert.equal(loadCompactBuilderDraft(storage, "user-b"), null, "A different user must not load another user's compact draft");

const builderSource = readFileSync("app/builder/page.tsx", "utf8");
assert.match(
  builderSource,
  /\.update\(\{[\s\S]*master_result: masterPayload,[\s\S]*\}\)\s*\.eq\("id", activeId\)/,
  "An authorized selected case must retain the canonical Supabase master_result update",
);
assert.match(
  builderSource,
  /setLastSavedAt\(user && activeId \? now : ""\);/,
  "Anonymous preview must not be marked as saved to Supabase",
);
assert.doesNotMatch(
  builderSource,
  /setItem\(\s*"courtSimplifiedMaster(Result|Case)"/,
  "The builder must never write a full master result or master case to localStorage",
);
assert.match(
  builderSource,
  /const activeCaseId = masterCaseId \|\| queryCaseId \|\| null;/,
  "Selected case routing must not fall back to a local case",
);
assert.match(
  builderSource,
  /if \(error \|\| !data\) \{[\s\S]*setExistingMasterResult\(\{\}\);[\s\S]*The selected case could not be loaded\./,
  "A failed selected case load must not substitute a local case or court area",
);

console.log(
  "Builder persistence reliability verification passed: bounded local draft, quota handling, canonical selected-case save, and no local case substitution.",
);
