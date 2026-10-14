/**
 * DELETING A CASE DELETES ITS FILES (2026-10-14 audit, MASTER_PLAN build order 6C).
 *
 * The database cascade removes a case's rows, but not the uploaded files in
 * storage. A deleted case's documents stayed in the `case-evidence` bucket,
 * which is a privacy problem (PIPEDA: personal information kept with no
 * purpose). The case DELETE route now collects every object the case owns
 * BEFORE deleting the row, deletes the row, then removes the objects.
 *
 * Order matters: removing files first and then failing to delete the row would
 * leave a live case with its documents gone. A file left behind after a failed
 * removal is the lesser harm, and it is reported to the error log.
 *
 * Only paths whose first segment is the owner's id are ever removed: that
 * segment is the bucket's whole access rule (storagePaths.ts).
 */

import { DOCUMENT_BUCKET, isUuid } from "./storagePaths";

export type StorageLike = {
  list(prefix: string, options: { limit: number; offset: number }): Promise<{ data: { name: string }[] | null; error: unknown }>;
  remove(paths: string[]): Promise<{ error: unknown }>;
};

export type RowSource = (table: string, caseId: string, userId: string) => Promise<string[]>;

/** A path this user owns in the bucket: first segment is their id, no tricks. Pure. */
export function ownedPath(path: unknown, userId: string): path is string {
  if (typeof path !== "string" || !isUuid(userId)) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("//")) return false;
  return path.split("/")[0] === userId;
}

/**
 * Every object the case owns: the case's folder in the bucket, plus any
 * storage path recorded on its document rows (older uploads may sit elsewhere
 * in the owner's folder). Never throws; a failed listing yields what it found.
 */
export async function caseObjectPaths(storage: StorageLike, rows: RowSource, userId: string, caseId: string): Promise<string[]> {
  if (!isUuid(userId) || !isUuid(caseId)) return [];
  const found = new Set<string>();
  try {
    const prefix = `${userId}/${caseId}`;
    for (let offset = 0; offset < 50_000; offset += 1000) {
      const { data, error } = await storage.list(prefix, { limit: 1000, offset });
      if (error || !data || data.length === 0) break;
      for (const item of data) {
        const path = `${prefix}/${item.name}`;
        if (ownedPath(path, userId)) found.add(path);
      }
      if (data.length < 1000) break;
    }
  } catch {
    // keep what was found
  }
  for (const table of ["workspace_documents", "case_documents", "case_evidence"]) {
    try {
      for (const path of await rows(table, caseId, userId)) if (ownedPath(path, userId)) found.add(path);
    } catch {
      // a table that is missing or fails adds nothing
    }
  }
  return [...found];
}

/** Removes the paths in batches. Returns how many could not be removed. Never throws. */
export async function removeObjects(storage: StorageLike, paths: string[]): Promise<number> {
  let failed = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    try {
      const { error } = await storage.remove(batch);
      if (error) failed += batch.length;
    } catch {
      failed += batch.length;
    }
  }
  return failed;
}

export { DOCUMENT_BUCKET };
