/**
 * The one client-side entry point to the safety pass.
 *
 * WHY THIS EXISTS AS A SHARED MODULE
 *
 * Small Claims had its own copy of this fetch inside SmallClaimsIntake.tsx.
 * Family and Civil had nothing, so the control that reads a disclosure of
 * danger ran on one path out of three — and the path most likely to carry a
 * real disclosure was one of the two without it. See OUTSTANDING_ISSUES
 * section 0k for how that happened; the short version is that a cost
 * constraint became a safety constraint through four sound-looking steps.
 *
 * A single function means `verifySafetyPassCoverage` can assert that every
 * intake which accepts a free-text narrative calls it. Three separate copies
 * of the same fetch would make that check impossible to write honestly.
 *
 * FAILS OPEN, DELIBERATELY. A network error, a non-ok response, a malformed
 * body, or a missing API key all return "clear". A legitimate user is never
 * blocked from their own case by a technical fault in a classifier. Classification outages never block intake. Fixed safety resources remain
 * available independently of authentication, AI availability and confirmation.
 *
 * But a failure is never TREATED as clear (site owner, 2026-10-29, item N):
 * the result carries `failed`, and callers go through ensureSafetyChecked
 * below, which retries once and reports `status: "failed"`. The analyze
 * routes then check the analysed text themselves and record the result in
 * the case (analysisSafetyGate.ts).
 */

export type ClientSafetyClassification = "immediate-danger" | "distress" | "clear";

export type ClientSafetyResult = {
  classification: ClientSafetyClassification;
  /**
   * Whether the user asked for legal ADVICE rather than describing what
   * happened (LSO Step 6d). Set by the safety pass, which already runs on
   * every free-text narrative on every path.
   *
   * When true the caller shows DEFLECTION_MESSAGE and the referral resources,
   * and nothing else. The model sets a boolean; the words are fixed.
   */
  requestsLegalAdvice: boolean;
  /**
   * The fixed IMMEDIATE_DANGER_MESSAGE / DISTRESS_ACKNOWLEDGMENT constant from
   * safetyPass.ts. Never model-generated text.
   */
  userMessage?: string;
  /** The check did not run (service down, refused, network). The result still reads as clear; a caller that must act on the failure can. */
  failed?: boolean;
};

type SafetyCheckResponse = {
  ok?: boolean;
  classification?: unknown;
  requestsLegalAdvice?: unknown;
  userMessage?: unknown;
};

const CLEAR: ClientSafetyResult = { classification: "clear", requestsLegalAdvice: false };

/**
 * Runs the safety pass over a user's narrative.
 *
 * `accessToken` is sent when present. The server requires a verified session
 * before paid classification; a missing session cannot trigger external AI.
 * Fixed safety resources remain available in the shared intake panel.
 */
export async function runClientSafetyCheck(
  storyText: string,
  accessToken?: string | null,
): Promise<ClientSafetyResult> {
  if (!storyText.trim()) return CLEAR;

  try {
    const response = await fetch("/api/intake/safety-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ storyText }),
    });

    const json: SafetyCheckResponse | null = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) return { ...CLEAR, failed: true };

    const classification =
      json.classification === "immediate-danger" || json.classification === "distress"
        ? json.classification
        : "clear";

    return {
      classification,
      requestsLegalAdvice: json.requestsLegalAdvice === true,
      userMessage: typeof json.userMessage === "string" ? json.userMessage : undefined,
    };
  } catch {
    return { ...CLEAR, failed: true };
  }
}

/**
 * The one client path before an analysis (site owner, 2026-10-29, item N):
 * every Continue that asks for an analysis calls this, never
 * runClientSafetyCheck on its own.
 *
 * A failed check (refused, rate limited, timed out, unreachable) is tried
 * once more. If it fails again the result is `status: "failed"` -- never
 * "clear" -- and the caller carries on: the analyze route runs the check
 * itself on the text it analyses and records the result in the case
 * (analysisSafetyGate.ts), so a browser failure is never the last word.
 */
export type EnsuredSafetyResult = ClientSafetyResult & {
  status: "clear" | "concern" | "failed";
  attempts: number;
};

export async function ensureSafetyChecked(
  storyText: string,
  accessToken?: string | null,
  run: typeof runClientSafetyCheck = runClientSafetyCheck,
): Promise<EnsuredSafetyResult> {
  let attempts = 1;
  let result = await run(storyText, accessToken);
  if (result.failed) {
    attempts = 2;
    result = await run(storyText, accessToken);
  }
  const status = result.failed ? "failed" : result.classification === "clear" ? "clear" : "concern";
  return { ...result, status, attempts };
}

/**
 * The server's own check, as the analyze routes return it (`safety`). Used
 * when the browser's check failed: a concern the server found is shown with
 * the same danger handling. Anything else -- clear, failed, missing -- is
 * null, and nothing is shown.
 */
export function safetyConcernFromAnalysis(body: unknown): ClientSafetyResult | null {
  const safety = body && typeof body === "object" ? (body as { safety?: unknown }).safety : undefined;
  if (!safety || typeof safety !== "object") return null;
  const record = safety as { status?: unknown; classification?: unknown; requestsLegalAdvice?: unknown; userMessage?: unknown };
  if (record.status !== "concern") return null;
  if (record.classification !== "immediate-danger" && record.classification !== "distress") return null;
  return {
    classification: record.classification,
    requestsLegalAdvice: record.requestsLegalAdvice === true,
    userMessage: typeof record.userMessage === "string" ? record.userMessage : undefined,
  };
}
