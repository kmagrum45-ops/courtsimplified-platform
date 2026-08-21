import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "generate-form-test-anon-key";

async function main() {
const { resolveGenerateFormAuthorization } = await import(
  "../../app/api/generate-form/route"
);

const canonicalFormId = "550e8400-e29b-41d4-a716-446655440000";
const ownedCaseId = "11111111-1111-4111-8111-111111111111";
const anotherUsersCaseId = "22222222-2222-4222-8222-222222222222";
const request = new Request("http://localhost/api/generate-form", {
  method: "POST",
});
const user = { id: "user-a" } as never;

const ownedDependencies = {
  authenticate: async () => user,
  loadOwnedCase: async (_request: Request, _user: unknown, caseId: string) =>
    caseId === ownedCaseId
      ? {
          id: ownedCaseId,
          court_path: "family",
          master_result: { yourName: "Persisted owner", courtPath: "family" },
        }
      : null,
};

const owned = await resolveGenerateFormAuthorization(
  request,
  { canonicalFormId, courtType: "family", caseId: ownedCaseId },
  ownedDependencies,
);
assert.deepEqual(owned, {
  request: { canonicalFormId, courtType: "family", caseId: ownedCaseId },
  ownedCase: {
    id: ownedCaseId,
    court_path: "family",
    master_result: { yourName: "Persisted owner", courtPath: "family" },
  },
});

const unauthenticated = await resolveGenerateFormAuthorization(
  request,
  { canonicalFormId, courtType: "family", caseId: ownedCaseId },
  { ...ownedDependencies, authenticate: async () => null },
);
assert.deepEqual(unauthenticated, {
  error: "Sign in to generate a form for a saved case.",
  status: 401,
});

const otherUser = await resolveGenerateFormAuthorization(
  request,
  { canonicalFormId, courtType: "family", caseId: anotherUsersCaseId },
  ownedDependencies,
);
assert.deepEqual(otherUser, {
  error: "The selected case could not be used for this form.",
  status: 404,
});

const wrongArea = await resolveGenerateFormAuthorization(
  request,
  { canonicalFormId, courtType: "civil", caseId: ownedCaseId },
  ownedDependencies,
);
assert.deepEqual(wrongArea, {
  error: "The selected case could not be used for this form.",
  status: 404,
});

const clientFacts = await resolveGenerateFormAuthorization(
  request,
  {
    canonicalFormId,
    courtType: "family",
    caseId: ownedCaseId,
    master_result: { yourName: "Client supplied" },
  },
  ownedDependencies,
);
assert.deepEqual(clientFacts, {
  error: "A valid form generation request is required.",
  status: 400,
});

const noCase = await resolveGenerateFormAuthorization(
  request,
  { canonicalFormId, courtType: "family" },
  ownedDependencies,
);
assert.deepEqual(noCase, {
  request: { canonicalFormId, courtType: "family" },
  ownedCase: null,
});

const routeSource = readFileSync("app/api/generate-form/route.ts", "utf8");
assert.match(
  routeSource,
  /\.eq\("canonical_form_id", lookup\.canonicalFormId\)[\s\S]*\.eq\("court_type", lookup\.courtType\)/,
  "A valid form ID from another court area must not resolve through the catalog",
);
assert.match(
  routeSource,
  /getCaseValues\(ownedCase\?\.master_result \|\| \{\}, data\.courtType\)/,
  "Selected-case values must come from the authorized persisted master result",
);
assert.match(
  routeSource,
  /ownedCase\s*\?\s*\{ "X-CourtSimplified-Case-Id": ownedCase\.id \}/,
  "Only an authorized case ID may be emitted in the response header",
);
assert.doesNotMatch(
  routeSource,
  /X-CourtSimplified-Case-Id": safe\(data\.caseId/,
  "The route must not echo an unverified client-supplied case ID",
);

const formsSource = readFileSync("app/forms/page.tsx", "utf8");
const generateRequestSource = formsSource.slice(
  formsSource.indexOf("async function generateFilledForm"),
  formsSource.indexOf("return ("),
);
assert.match(
  generateRequestSource,
  /supabase\.auth\.getSession\(\)[\s\S]*Authorization: `Bearer \$\{session\.access_token\}`/,
  "Selected-case generation must send the existing authenticated session bearer",
);
assert.doesNotMatch(
  generateRequestSource,
  /master_result|\.\.\.caseData|yourName|otherParty/,
  "The caller must not send client-controlled case facts to form generation",
);

console.log(
  "Generate-form selected-case authorization verification passed: owned canonical cases only, matching court area, no client case facts, and no unverified case ID echo.",
);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
