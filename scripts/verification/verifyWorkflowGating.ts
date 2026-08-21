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

for (const file of ["app/trial-package/page.tsx", "app/court-package/page.tsx", "app/document-export/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /resolveWorkflowGate/);
  assert.match(source, /not ready yet/);
}
console.log("Workflow gating verification passed: three areas block early package modules and retain detailed access when canonical prerequisites exist.");
