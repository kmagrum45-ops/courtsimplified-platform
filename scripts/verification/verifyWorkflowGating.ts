import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveWorkflowGate } from "../../src/lib/case-system/workflowGate";

for (const path of ["small-claims", "family", "civil"]) {
  const early = resolveWorkflowGate({ caseData: { courtPath: path, facts: "One narrative" }, evidencePackage: null });
  assert.equal(early.ready, false);
  assert.equal(early.nextActionLabel, "Organize evidence");
  assert.equal(early.nextActionRoute, "/evidence");
  const ready = resolveWorkflowGate({
    caseData: { courtPath: path, facts: "Organized facts", analysis: { summary: "Summary", caseStrategy: ["Review strategy"] } },
    evidencePackage: { createdAt: "", exhibitCount: 1, exhibits: [], evidenceReview: {} },
  });
  assert.equal(ready.ready, true);
}

// app/trial-package/page.tsx is no longer listed: since 2026-09-07 (de3cc27) it
// is a hub of links to the evidence, document, court-package and export pages,
// which gate themselves, and it shows no trial-preparation material to gate.
// Listing it made CI fail on main on 2026-09-28. If it renders case material
// again, add it back.
const trialPackage = readFileSync("app/trial-package/page.tsx", "utf8");
assert.doesNotMatch(
  trialPackage,
  /caseData|master_result|evidencePackage/,
  "trial-package renders case material again -- it must be gated; add it back to the list below.",
);
for (const file of ["app/court-package/page.tsx", "app/document-export/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /resolveWorkflowGate/);
  assert.match(source, /not ready yet/);
}
console.log("Workflow gating verification passed: three areas block early package modules and retain detailed access when canonical prerequisites exist.");
