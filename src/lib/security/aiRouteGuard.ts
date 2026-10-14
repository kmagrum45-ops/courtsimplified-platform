/**
 * The one line each AI route that needs no sign-in calls first
 * (aiRateLimit.ts): null to go on, or the 429 response to return.
 */

import { NextResponse } from "next/server";

import { refusedResponseBody, takeAiAllowance, type AiRouteGroup } from "./aiRateLimit";

export async function aiLimitResponse(request: Request, group: AiRouteGroup): Promise<NextResponse | null> {
  const result = await takeAiAllowance(request, group);
  if (result.allowed) return null;
  return NextResponse.json(refusedResponseBody(result), { status: 429, headers: { "Retry-After": result.reason === "visitor" ? "3600" : "86400" } });
}
