/*
 * Next.js's ambient types, for the VERIFICATION typecheck only.
 *
 * `next-env.d.ts` carries these same two reference directives, but it also does
 * `import "./.next/dev/types/routes.d.ts"` — and an import pulls a file into the
 * program no matter what `exclude` says. So tsconfig.verify.json's stated premise,
 * that verification reads the source tree and nothing else, was not true: the
 * generated routes file came in through that import.
 *
 * That mattered on 2026-09-27, when the dev server left
 * `.next/dev/types/routes.d.ts` half-written — a fragment line
 * `ecord<string, string | string[] | undefined>>` and `interface RouteContext`
 * twice. Syntax errors in any file of the program switch off semantic checking
 * for ALL of it, which is the exact hazard tsconfig.verify.json exists to prevent.
 * A torn write in a build artefact could disable the project's type safety.
 *
 * So verification excludes `next-env.d.ts` and reads this instead. The route types
 * are still checked, by `next build`, which is where a route-type error belongs.
 */
/// <reference types="next" />
/// <reference types="next/image-types/global" />
