/**
 * OPEN, SAVE AND DELETE AN UPLOADED FILE (Charter re-test 2026-10-26).
 *
 * Checks, as properties, through the route itself (app/api/workspace/documents/link) with the
 * database and storage stood in:
 *   - a link is made only for the signed-in owner's own file that is not being deleted: no sign-in,
 *     a bad id, someone else's file and a file mid-deletion are refused, and nothing is signed;
 *   - the link lasts a minute, is never cached, and saves the file under its own name only when asked;
 *   - every documents card offers Open, Download and Delete, and Delete uses the existing DELETE route
 *     (which says plainly when the stored file could not be removed);
 *   - the bucket stays private and nothing makes a public link to it.
 *
 * Failure it exists to catch: "there is still no way to open, download or delete a file" (Charter
 * re-test), and any later way to open one that skips the owner check or the private bucket.
 */
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { createDocumentLinkGet, LINK_SECONDS } from "../../app/api/workspace/documents/link/route";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OWNER = "11111111-1111-4111-8111-111111111111";
const MINE = "22222222-2222-4222-8222-222222222222";
const GONE = "33333333-3333-4333-8333-333333333333";
const THEIRS = "44444444-4444-4444-8444-444444444444";

async function main() {
  const signed: { path: string; seconds: number; downloadAs: string | null }[] = [];
  const route = (signedIn: boolean) => createDocumentLinkGet({
    authenticate: async () => (signedIn ? { id: OWNER } : null),
    ownRow: async (documentId, userId) => {
      if (userId !== OWNER) return null;
      if (documentId === MINE) return { id: MINE, storage_path: `${OWNER}/case/${MINE}`, original_name: "clinic_note_wrist.pdf", deleted_at: null };
      if (documentId === GONE) return { id: GONE, storage_path: `${OWNER}/case/${GONE}`, original_name: "old.pdf", deleted_at: "2026-10-26T00:00:00Z" };
      return null; // another person's file is never this owner's row
    },
    sign: async (objectPath, seconds, downloadAs) => { signed.push({ path: objectPath, seconds, downloadAs }); return `https://storage.invalid/signed/${objectPath}?token=x`; },
  });
  const get = (signedIn: boolean, query: string) => route(signedIn)(new NextRequest(`http://localhost/api/workspace/documents/link?${query}`));

  check("no sign-in: refused, nothing signed", (await get(false, `documentId=${MINE}`)).status === 401 && signed.length === 0);
  check("a bad id: refused", (await get(true, "documentId=../../etc")).status === 400 && signed.length === 0);
  check("someone else's file: not found, nothing signed", (await get(true, `documentId=${THEIRS}`)).status === 404 && signed.length === 0);
  check("a file being deleted: not found, nothing signed", (await get(true, `documentId=${GONE}`)).status === 404 && signed.length === 0);
  const open = await get(true, `documentId=${MINE}`);
  const opened = await open.json();
  check("the owner's own file: a link", open.status === 200 && typeof opened.url === "string" && signed.length === 1);
  check("the link lasts a minute", LINK_SECONDS === 60 && signed[0]?.seconds === 60 && opened.expiresInSeconds === 60);
  check("opening does not force a download", signed[0]?.downloadAs === null);
  check("the link is never cached", /no-store/.test(open.headers.get("cache-control") ?? ""));
  await get(true, `documentId=${MINE}&download=1`);
  check("saving downloads it under its own name", signed[1]?.downloadAs === "clinic_note_wrist.pdf");

  const card = fs.readFileSync(path.join(ROOT, "app/cases/_components/CaseWorkspace.tsx"), "utf8");
  check("every documents card offers Open, Download and Delete", ["document-open", "document-download", "document-delete"].every((id) => card.includes(`data-testid="${id}"`)) && (card.match(/<FileActions /g) ?? []).length >= 2);
  check("open and save go through the signed-link route", /\/api\/workspace\/documents\/link\?documentId=/.test(card));
  check("delete uses the existing DELETE route, after asking", /method: "DELETE"/.test(card) && /window\.confirm\(/.test(card));
  check("a failed delete is said, never hidden", /The file was not deleted/.test(card) && /role="alert"/.test(card));

  const files: string[] = [];
  const walk = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) { if (entry.name !== "node_modules" && !entry.name.startsWith(".")) walk(full); } else if (/\.tsx?$/.test(entry.name)) files.push(full); } };
  walk(path.join(ROOT, "app")); walk(path.join(ROOT, "src"));
  // The court-forms bucket holds the official blank forms, which are public by design; a person's own files are in case-evidence.
  const publicLinks = files.filter((file) => {
    const text = fs.readFileSync(file, "utf8");
    return [...text.matchAll(/storage\s*\.from\(\s*([^)]+)\)\s*\.getPublicUrl\(/g)].some((match) => !/^"court-forms"$/.test(match[1].trim())) || (/getPublicUrl\(/.test(text) && /DOCUMENT_BUCKET|case-evidence/.test(text));
  }).map((file) => path.relative(ROOT, file));
  check("nothing makes a public link to a person's stored file (only the public court-forms bucket has them)", publicLinks.length === 0, publicLinks.join(", "));
  const migrations = fs.readdirSync(path.join(ROOT, "supabase/migrations")).map((name) => fs.readFileSync(path.join(ROOT, "supabase/migrations", name), "utf8")).join("\n");
  check("the case-evidence bucket is private", /case-evidence[\s\S]{0,200}public\s*=\s*false|public\s*=\s*false[\s\S]{0,200}case-evidence/i.test(migrations));

  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exitCode = failures ? 1 : 0;
}

void main();
