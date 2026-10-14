/**
 * test:server-error-log -- the built-in error log records a server error
 * without anything that identifies a person (src/lib/monitoring/
 * serverErrorLog.ts, instrumentation.ts; 2026-10-14 audit).
 *
 * WHAT IT CATCHES: an email, phone number, long number or key in an error
 * message written to the log; a row with no route; the instrumentation hook
 * disconnected from the log; a write that throws and breaks the request.
 *
 * COSTS NOTHING: no network (no database configured, so nothing is sent).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { errorRow, recordServerError, scrubErrorMessage } from "../../src/lib/monitoring/serverErrorLog";

let failures = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`pass  ${name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL  ${name}\n      ${message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:server-error-log::${name}: ${message.replace(/\n/g, " ")}`);
  }
}

async function main() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  await check("emails, phone numbers, long numbers and keys are removed", () => {
    const out = scrubErrorMessage("Failed for jane.doe@example.com at 613-555-0199, account 12345678, key sk_live_abcdefghijklmnopqrstu");
    assert.ok(!/jane|example\.com|555|12345678|sk_live/.test(out), out);
  });

  await check("a long message is cut to 500 characters", () => {
    assert.equal(scrubErrorMessage("x".repeat(2000)).length, 500);
  });

  await check("a row names the route without its query string", () => {
    const row = errorRow(new TypeError("boom"), { path: "/api/case/understand?x=1", method: "POST" }, { routePath: "/api/case/understand", routeType: "route" });
    assert.equal(row.route, "/api/case/understand");
    assert.equal(row.method, "POST");
    assert.equal(row.kind, "route:TypeError");
    assert.equal(row.message, "boom");
  });

  await check("writing never throws, even with no database", async () => {
    await recordServerError(new Error("x"), { path: "/a", method: "GET" }, {});
  });

  await check("the instrumentation hook sends request errors to the log", () => {
    const source = readFileSync("instrumentation.ts", "utf8");
    assert.match(source, /export async function onRequestError/);
    assert.match(source, /recordServerError\(/);
  });

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll error-log checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
