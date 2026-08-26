import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { VERIFIED_AUTHORITY_SEED_ENTRIES } from "../../src/lib/case-system/authority-intelligence/verifiedAuthoritySeedRegistry";

function isHttpsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function main() {
  for (const entry of VERIFIED_AUTHORITY_SEED_ENTRIES) {
    const hasResolvableSource = entry.sourceReferences.some((source) =>
      isHttpsUrl(source.sourceUrl),
    );

    if (entry.verificationStatus === "verified") {
      assert.ok(
        hasResolvableSource,
        `${entry.id}: marked "verified" but has no resolvable HTTPS source URL. ` +
          `Either add sourceReferences[].sourceUrl or change verificationStatus to ` +
          `"source-pending" (or another non-verified status).`,
      );
    }

    if (!hasResolvableSource) {
      assert.equal(
        entry.aiUseRules.canUseForReasoning,
        false,
        `${entry.id}: has no resolvable HTTPS source URL but aiUseRules.canUseForReasoning ` +
          `is true. An unsourced authority must not be usable for AI reasoning.`,
      );

      assert.equal(
        entry.aiUseRules.canUseForDrafting,
        false,
        `${entry.id}: has no resolvable HTTPS source URL but aiUseRules.canUseForDrafting ` +
          `is true. An unsourced authority must not be usable for drafting.`,
      );

      assert.notEqual(
        entry.verificationStatus,
        "verified",
        `${entry.id}: has no resolvable HTTPS source URL but verificationStatus is "verified".`,
      );
    }
  }

  console.log(
    `Authority seed registry integrity verification passed: ${VERIFIED_AUTHORITY_SEED_ENTRIES.length} entries checked, ` +
      `no entry is marked verified or reasoning/drafting-eligible without a resolvable HTTPS source URL.`,
  );
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Authority seed registry integrity verification failed.",
    );
    process.exitCode = 1;
  }
}
