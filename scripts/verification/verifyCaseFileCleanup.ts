/**
 * test:case-file-cleanup -- deleting a case deletes its stored files, and only
 * its owner's (src/lib/case-workspace/caseFileCleanup.ts; 2026-10-14 audit).
 *
 * WHAT IT CATCHES: a deleted case's uploads left in storage (PIPEDA); a path
 * outside the owner's folder removed (another litigant's file); the files
 * removed before the row, so a failed row delete loses documents of a live
 * case; a storage failure that throws and breaks the delete.
 *
 * COSTS NOTHING: fake storage, no network.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { caseObjectPaths, ownedPath, removeObjects, type StorageLike } from "../../src/lib/case-workspace/caseFileCleanup";

let failures = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`pass  ${name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL  ${name}\n      ${message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:case-file-cleanup::${name}: ${message.replace(/\n/g, " ")}`);
  }
}

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const CASE = "33333333-3333-4333-8333-333333333333";
const DOC = "44444444-4444-4444-8444-444444444444";

function fakeStorage(files: string[]): StorageLike & { removed: string[] } {
  const removed: string[] = [];
  return {
    removed,
    async list(prefix) {
      return { data: files.filter((f) => f.startsWith(`${prefix}/`)).map((f) => ({ name: f.slice(prefix.length + 1) })), error: null };
    },
    async remove(paths) {
      removed.push(...paths);
      return { error: null };
    },
  };
}

async function main() {
  await check("the case's folder and its recorded paths are collected, nobody else's", async () => {
    const storage = fakeStorage([`${USER}/${CASE}/${DOC}`, `${OTHER}/${CASE}/${DOC}`, `${USER}/55555555-5555-4555-8555-555555555555/${DOC}`]);
    const paths = await caseObjectPaths(storage, async (table) => (table === "case_documents" ? [`${USER}/legacy/receipt.pdf`, `${OTHER}/x.pdf`, `${USER}/../${OTHER}/y.pdf`] : []), USER, CASE);
    assert.deepEqual(paths.sort(), [`${USER}/${CASE}/${DOC}`, `${USER}/legacy/receipt.pdf`].sort());
  });

  await check("a path outside the owner's folder is never owned", () => {
    assert.equal(ownedPath(`${OTHER}/${CASE}/${DOC}`, USER), false);
    assert.equal(ownedPath(`${USER}/../${OTHER}/a`, USER), false);
    assert.equal(ownedPath(`/${USER}/a`, USER), false);
    assert.equal(ownedPath(`${USER}/${CASE}/${DOC}`, USER), true);
  });

  await check("a storage failure is counted, never thrown", async () => {
    const storage: StorageLike = {
      async list() { throw new Error("down"); },
      async remove() { throw new Error("down"); },
    };
    assert.deepEqual(await caseObjectPaths(storage, async () => { throw new Error("no table"); }, USER, CASE), []);
    assert.equal(await removeObjects(storage, ["a", "b"]), 2);
  });

  await check("the delete route collects files before the row and removes them only after it is gone", () => {
    const source = readFileSync("app/api/cases/route.ts", "utf8");
    const del = source.slice(source.indexOf("export async function DELETE"));
    const collect = del.indexOf("caseObjectPaths(");
    const rowDelete = del.indexOf(".delete()");
    const remove = del.indexOf("removeObjects(");
    assert.ok(collect > 0 && rowDelete > collect && remove > rowDelete, `collect ${collect}, row ${rowDelete}, remove ${remove}`);
    assert.match(del.slice(rowDelete, remove + 40), /!error && data/);
  });

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll case-file-cleanup checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
