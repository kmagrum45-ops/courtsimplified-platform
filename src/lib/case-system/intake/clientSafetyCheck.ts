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
 * blocked from their own case by a technical fault in a classifier. The cost
 * of that choice is that an outage silently disables the check — which is why
 * the route is now reachable without a session, so the commonest cause of
 * "no check ran" is gone.
 */

export type ClientSafetyClassification = "immediate-danger" | "distress" | "clear";

export type ClientSafetyResult = {
  classification: ClientSafetyClassification;
  /**
   * The fixed IMMEDIATE_DANGER_MESSAGE / DISTRESS_ACKNOWLEDGMENT constant from
   * safetyPass.ts. Never model-generated text.
   */
  userMessage?: string;
};

type SafetyCheckResponse = {
  ok?: boolean;
  classification?: unknown;
  userMessage?: unknown;
};

const CLEAR: ClientSafetyResult = { classification: "clear" };

/**
 * Runs the safety pass over a user's narrative.
 *
 * `accessToken` is optional and is sent when present. Its absence does NOT
 * skip the check — that was the defect. The route accepts anonymous requests
 * because the whole site is behind the beta password gate and this is the
 * cheapest model call in the system.
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
    if (!response.ok || !json?.ok) return CLEAR;

    const classification =
      json.classification === "immediate-danger" || json.classification === "distress"
        ? json.classification
        : "clear";

    return {
      classification,
      userMessage: typeof json.userMessage === "string" ? json.userMessage : undefined,
    };
  } catch {
    return CLEAR;
  }
}
