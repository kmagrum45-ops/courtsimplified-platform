import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const builder = readFileSync("app/builder/page.tsx", "utf8");
const client = readFileSync("src/lib/supabase/client.ts", "utf8");
const migrations = readFileSync("supabase/remote_schema.sql", "utf8");

assert.match(builder, /user_id:\s*user\.id/, "Case creation must use the authenticated user's ID.");
assert.match(builder, /\.update\([\s\S]*?master_result:\s*masterPayload,[\s\S]*?\)\s*\.eq\("id", activeId\)/, "Selected-case updates must stay scoped to the selected case ID.");
assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|service_role/, "Browser Supabase client must not use service-role credentials.");

const localCasesPolicies = /create\s+policy[\s\S]{0,800}on\s+(?:public\.)?cases/i.test(migrations);
console.log(`Case RLS contract: client-owner-create=pass selected-case-update=pass browser-service-role=absent local-cases-policy-metadata=${localCasesPolicies ? "present" : "unavailable"}.`);
console.log("Live RLS verification remains required through a read-only SQL Editor policy query; no policy result was inferred from client code.");
