import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "workflow-isolation-anon-key";

const storage = new Map();

globalThis.window = globalThis;
globalThis.localStorage = {
  get length() {
    return storage.size;
  },
  clear() {
    storage.clear();
  },
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  key(index) {
    return [...storage.keys()][index] ?? null;
  },
  removeItem(key) {
    storage.delete(key);
  },
  setItem(key, value) {
    storage.set(String(key), String(value));
  },
};

const {
  normalizeWorkflowEvidencePackage,
  readWorkspaceDocument,
  resolveWorkflowCaseData,
  writeWorkspaceDocument,
} = await import(
  "../../src/lib/case-system/workflowCaseLoader.ts"
);

const legacyCaseAWorkspace = {
  id: "workspace-a",
  title: "Case A workspace",
};

localStorage.setItem("courtSimplifiedActiveCaseId", "case-a");
localStorage.setItem(
  "courtSimplifiedWorkspaceDocument",
  JSON.stringify(legacyCaseAWorkspace),
);

assert.equal(
  readWorkspaceDocument("case-b"),
  null,
  "Case B incorrectly inherited Case A's legacy workspace",
);
assert.deepEqual(
  readWorkspaceDocument("case-a"),
  legacyCaseAWorkspace,
  "The active case could not safely migrate its own legacy workspace",
);

writeWorkspaceDocument("case-b", {
  id: "workspace-b",
  title: "Case B workspace",
});

assert.equal(readWorkspaceDocument("case-a").id, "workspace-a");
assert.equal(readWorkspaceDocument("case-b").id, "workspace-b");

const resolvedCase = resolveWorkflowCaseData({
  masterCase: {
    courtPath: "small-claims",
  },
  intakeData: {
    facts: "Case A repair dispute",
  },
  intakeAnalysis: {
    summary: "Case A summary",
  },
});

assert.equal(resolvedCase?.courtPath, "small-claims");
assert.equal(resolvedCase?.facts, "Case A repair dispute");
assert.equal(resolvedCase?.analysis.summary, "Case A summary");

const evidencePackage = normalizeWorkflowEvidencePackage({
  evidenceItems: [
    {
      id: "invoice-a",
      exhibitNumber: "A1",
      title: "Invoice",
      userReviewed: true,
    },
  ],
});

assert.equal(evidencePackage?.exhibitCount, 1);
assert.equal(evidencePackage?.exhibits[0].label, "A1");
assert.equal(evidencePackage?.exhibits[0].confirmed, true);

console.log(
  "Workflow isolation verification passed: case-scoped workspaces, canonical case resolution, and evidence normalization.",
);
