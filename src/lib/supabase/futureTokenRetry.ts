/**
 * ONE "JWT ISSUED AT FUTURE" IS WAITED OUT, NOT SHOWN (27 Nov 2026).
 *
 * The database's API refuses a sign-in token whose issue time is ahead of its own clock (401, code PGRST303, "JWT issued
 * at future"). Just after a sign-in the two servers' clocks can disagree by a moment, so a good token is refused once and
 * passes a moment later. It reached people twice: the forms page went blank (client.ts, supabasePublic), and a guest who
 * had just signed up was told "Your selected case could not be loaded" (the new Small Claims flow's matrix, 27 Nov 2026;
 * the same lookup passed with the same token 27 s later).
 *
 * The signed-in client's every request goes through here: refused for that reason only, it is sent again after a short
 * wait, at most twice. Any other refusal (an expired or wrong token, 403, 500) is returned at once, as before. An aborted
 * request is never sent again. Checked by test:future-token-retry.
 */
const ISSUED_AT_FUTURE = /issued at future|issued in the future|used before issued/i;
const WAITS_MS = [1_000, 2_000] as const;

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

async function refusedForIssueTime(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  const text = await response.clone().text().catch(() => "");
  return ISSUED_AT_FUTURE.test(text);
}

export async function fetchRetryingFutureToken(input: RequestInfo | URL, init?: RequestInit, base: typeof fetch = fetch, wait: (ms: number) => Promise<void> = sleep): Promise<Response> {
  let response = await base(input, init);
  for (const ms of WAITS_MS) {
    if (init?.signal?.aborted || !(await refusedForIssueTime(response))) return response;
    await wait(ms);
    if (init?.signal?.aborted) return response;
    response = await base(input, init);
  }
  return response;
}
