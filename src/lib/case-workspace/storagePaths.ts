/**
 * Where a user's document object lives, and the one rule that keeps it theirs.
 *
 * WHAT THIS CATCHES: an object path whose first segment is not the owner's id.
 *
 * *** THE FIRST SEGMENT IS THE ENTIRE ACCESS CONTROL ***
 *
 * The four policies on `storage.objects` for the `case-evidence` bucket, created
 * in 20260823020500, each read:
 *
 *   bucket_id = 'case-evidence' AND (storage.foldername(name))[1] = auth.uid()::text
 *
 * So whether one litigant can read another litigant's medical records is decided
 * by a string comparison on the first path segment, and nothing else. A path built
 * with the segments in the wrong order — `{case_id}/{user_id}/…` — would not fail
 * loudly. It would put every document in a folder named after a case id, which no
 * user's `auth.uid()` matches, and the user would simply be unable to read their
 * own upload. The dangerous inverse is a path whose first segment is a value an
 * attacker can choose.
 *
 * That is why paths are never assembled by string concatenation at a call site.
 * `documentObjectPath` is the only way to make one, `parseObjectPath` is the only
 * way to read one, and `pathBelongsTo` is what a route calls before it hands out a
 * signed URL or deletes anything.
 *
 * *** WHY THE IDS ARE VALIDATED AS UUIDS AND NOT JUST INTERPOLATED ***
 *
 * A `/` or a `..` inside any segment would change the shape of the path, and the
 * shape is the security boundary. Requiring all three segments to be UUIDs makes
 * that structurally impossible rather than filtered for, and every one of the three
 * genuinely is a UUID: `auth.users.id`, `cases.id` and `workspace_documents.id`.
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DOCUMENT_BUCKET = "case-evidence";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export type ObjectPathParts = {
  userId: string;
  caseId: string;
  documentId: string;
};

/**
 * `{user_id}/{case_id}/{document_id}`.
 *
 * Throws rather than returning a fallback. A caller that cannot supply three
 * UUIDs has a bug, and the alternative — a path built from a sanitised version of
 * bad input — is how an object ends up somewhere nobody expects.
 */
export function documentObjectPath(parts: ObjectPathParts): string {
  for (const [field, value] of Object.entries(parts)) {
    if (!isUuid(value)) {
      throw new Error(
        `documentObjectPath: ${field} is not a UUID, so no object path can be built.`,
      );
    }
  }
  return `${parts.userId}/${parts.caseId}/${parts.documentId}`;
}

/** null for anything that is not exactly three UUID segments. */
export function parseObjectPath(path: string): ObjectPathParts | null {
  const segments = path.split("/");
  if (segments.length !== 3) return null;
  const [userId, caseId, documentId] = segments;
  if (!isUuid(userId) || !isUuid(caseId) || !isUuid(documentId)) return null;
  return { userId, caseId, documentId };
}

/**
 * The check a route makes before touching an object.
 *
 * Deliberately NOT `path.startsWith(userId)`. A prefix test would pass for a path
 * whose first segment merely begins with the user's id, and it would pass for the
 * empty-ish cases a malformed path produces. This parses the path and compares the
 * whole segment.
 */
export function pathBelongsTo(path: string, userId: string): boolean {
  if (!isUuid(userId)) return false;
  const parts = parseObjectPath(path);
  return parts !== null && parts.userId === userId;
}
