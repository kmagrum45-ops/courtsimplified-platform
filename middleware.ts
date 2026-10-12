import { NextResponse, type NextRequest } from "next/server";

/**
 * Site-wide password gate for the pre-launch deployment. Uses a cookie set
 * after a visitor submits the password on /site-access, NOT HTTP Basic Auth.
 *
 * Basic Auth was the original design, but it occupies the same Authorization
 * header the app's own client code uses for real user sessions
 * (`Authorization: Bearer <supabase access token>`, e.g. in
 * SmallClaimsIntake.tsx, CivilIntake.tsx, FamilyIntake.tsx, app/forms/page.tsx).
 * A browser only sends one Authorization header per request, and an
 * explicit header set by fetch()/XHR always wins over anything the browser
 * cached from a prior Basic Auth challenge -- so every one of those
 * Bearer-authenticated API calls was being rejected by the gate before ever
 * reaching its own route handler. Confirmed live against production before
 * this fix: an Authorization: Bearer request to /api/cases got back the
 * exact same plain-text "Authentication required." + WWW-Authenticate
 * response as a request with no Authorization header at all -- proof the
 * request never reached the route. A cookie lives in a completely separate
 * channel from Authorization, so it cannot collide with that pattern again.
 *
 * Fails closed: if SITE_ACCESS_PASSWORD is unset or empty, every request is
 * rejected, including requests to /site-access itself. A misconfigured
 * deployment should never fall open.
 *
 * The password itself is never logged or printed. It is briefly present in
 * the gate cookie's value (see /api/site-access/route.ts), scoped HttpOnly
 * + Secure so client-side JS can never read it and it is only ever sent
 * over HTTPS -- the same exposure Basic Auth already had (the browser held
 * the same shared secret and resent it with every request), not a new one.
 */

const GATE_COOKIE = "cs_site_access";
const GATE_PATHS = new Set(["/site-access", "/api/site-access"]);

function isNavigationRequest(request: NextRequest): boolean {
  return request.headers.get("sec-fetch-mode") === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
}

function unauthorized(request: NextRequest): NextResponse {
  if (isNavigationRequest(request)) {
    const target = new URL("/site-access", request.url);
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (nextPath && nextPath !== "/site-access") {
      target.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(target);
  }

  return NextResponse.json(
    { error: "Site access required.", siteAccessRequired: true },
    { status: 401 },
  );
}

export function middleware(request: NextRequest): NextResponse {
  const configuredPassword = process.env.SITE_ACCESS_PASSWORD;
  if (!configuredPassword) return unauthorized(request);

  if (GATE_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const cookieValue = request.cookies.get(GATE_COOKIE)?.value;
  if (cookieValue !== configuredPassword) return unauthorized(request);

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js's own static/image internals and the handful
     * of files browsers and crawlers request unprompted. Deliberately does
     * NOT exclude /api/*: an API route reachable without the gate would let
     * someone bypass it entirely by calling the API directly instead of
     * loading a page.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
