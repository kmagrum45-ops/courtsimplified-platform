import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GATE_COOKIE = "cs_site_access";
const GATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  try {
    const configuredPassword = process.env.SITE_ACCESS_PASSWORD;
    if (!configuredPassword) {
      return NextResponse.json(
        { success: false, error: "Site access is not available." },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
    const submittedPassword = typeof body?.password === "string" ? body.password : "";

    if (submittedPassword !== configuredPassword) {
      return NextResponse.json(
        { success: false, error: "Incorrect password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(GATE_COOKIE, configuredPassword, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: GATE_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not process the request." },
      { status: 500 },
    );
  }
}
