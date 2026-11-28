/**
 * A SIGNED-IN READ IS NEVER LOST TO ONE "JWT ISSUED AT FUTURE" (27 Nov 2026, the new Small Claims flow's matrix).
 *
 * The database's API (PostgREST) refuses a sign-in token whose issue time is ahead of its own clock, with 401 and code
 * PGRST303 ("JWT issued at future"). Just after a sign-in, the clock of the sign-in server and the clock of the database's
 * API can disagree by a moment, so the first read can be refused though the token is good; a moment later the same read
 * passes. Seen twice:
 *   - live, on the forms page ("Could not load forms -- JWT issued in the future"; src/lib/supabase/client.ts), fixed then
 *     for public reads only (supabasePublic);
 *   - in the matrix, a guest who signed up: the case lookup got 401 PGRST303 about a second after the token was issued,
 *     the page said "Your selected case could not be loaded. Please retry.", and the same lookup passed 27 s later with
 *     the same token (5 of 6 runs of sc-wrong-place guest-then-signup, 27 Nov 2026).
 *
 * Checks, as properties:
 *   1. a request refused with 401 PGRST303 is sent again after a short wait, and its later answer is the one returned;
 *   2. a refusal that is not about the token's issue time (wrong password, an expired token, 403, 500) is never retried:
 *      it is returned at once, as before;
 *   3. the retries are bounded (a token that stays refused returns the last refusal; never a loop);
 *   4. a request whose signal is aborted is not sent again;
 *   5. the signed-in client (src/lib/supabase/client.ts) sends every request through the retrying fetch.
 *
 * Failure it exists to catch: a person who has just signed in sent to "could not be loaded" by a moment of clock
 * difference between two servers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fetchRetryingFutureToken } from "../../src/lib/supabase/futureTokenRetry";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failures += 1;
}

const future = () => new Response(JSON.stringify({ code: "PGRST303", details: null, hint: null, message: "JWT issued at future" }), { status: 401, headers: { "content-type": "application/json" } });
const ok = () => new Response("[]", { status: 200 });

/** A fetch that answers from a list, counting calls. */
function scripted(answers: Array<() => Response>) {
  let calls = 0;
  const base = async () => { const answer = answers[Math.min(calls, answers.length - 1)]; calls += 1; return answer(); };
  return { base: base as unknown as typeof fetch, calls: () => calls };
}
const noWait = async () => {};

async function main() {
  {
    const s = scripted([future, ok]);
    const r = await fetchRetryingFutureToken("http://x/rest/v1/cases", { method: "GET" }, s.base, noWait);
    check("1. a 401 PGRST303 is sent again and the later answer is returned", r.status === 200 && s.calls() === 2);
  }
  for (const [name, answer] of [
    ["an expired token", () => new Response(JSON.stringify({ code: "PGRST303", message: "JWT expired" }), { status: 401 })],
    ["a wrong key", () => new Response(JSON.stringify({ code: "PGRST301", message: "No suitable key or wrong key type" }), { status: 401 })],
    ["403", () => new Response("{}", { status: 403 })],
    ["500", () => new Response("{}", { status: 500 })],
  ] as const) {
    const s = scripted([answer, ok]);
    const r = await fetchRetryingFutureToken("http://x/rest/v1/cases", { method: "GET" }, s.base, noWait);
    check(`2. not retried: ${name}`, r.status !== 200 && s.calls() === 1);
  }
  {
    const s = scripted([future]);
    const r = await fetchRetryingFutureToken("http://x/rest/v1/cases", { method: "GET" }, s.base, noWait);
    check("3. a token that stays refused returns the last refusal, after a bounded number of tries", r.status === 401 && s.calls() >= 2 && s.calls() <= 4);
  }
  {
    const s = scripted([future, ok]);
    const controller = new AbortController();
    controller.abort();
    const r = await fetchRetryingFutureToken("http://x/rest/v1/cases", { method: "GET", signal: controller.signal }, s.base, noWait);
    check("4. an aborted request is not sent again", r.status === 401 && s.calls() === 1);
  }
  {
    const s = scripted([future, ok]);
    const r = await fetchRetryingFutureToken("http://x/rest/v1/cases", { method: "PATCH", body: JSON.stringify({ a: 1 }) }, s.base, noWait);
    check("1. a write with a body is sent again whole", r.status === 200 && s.calls() === 2);
  }
  const client = readFileSync(path.join(process.cwd(), "src/lib/supabase/client.ts"), "utf8");
  const signedIn = client.slice(client.indexOf("export const supabase ="), client.indexOf("export const supabasePublic"));
  check("5. the signed-in client sends every request through the retrying fetch", /global:\s*\{\s*fetch:\s*fetchRetryingFutureToken/.test(signedIn));

  if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
  console.log("future-token retry: all checks pass");
}

void main();
