import { NextResponse, type NextRequest } from "next/server";

/**
 * Site-wide password gate for the pre-launch deployment. Uses HTTP Basic Auth
 * rather than a custom login page/cookie: the browser handles the prompt and
 * caches the credential for the origin, so there is no session state to
 * manage here and nothing to store client-side beyond what the browser itself
 * keeps for Basic Auth.
 *
 * Fails closed: if SITE_ACCESS_PASSWORD is unset or empty, every request is
 * rejected. A misconfigured deployment should never fall open.
 *
 * The password itself is never logged, printed, or returned in any response
 * body or header -- only a fixed challenge string is sent back to
 * unauthenticated requests.
 */

const REALM = "CourtSimplified";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export function middleware(request: NextRequest): NextResponse {
  const configuredPassword = process.env.SITE_ACCESS_PASSWORD;
  if (!configuredPassword) return unauthorized();

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return unauthorized();
  }

  // Basic Auth carries "username:password"; the username is not used for
  // anything here, so everything after the first colon is the password.
  const separatorIndex = decoded.indexOf(":");
  const submittedPassword = separatorIndex === -1 ? decoded : decoded.slice(separatorIndex + 1);

  if (submittedPassword !== configuredPassword) return unauthorized();

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
