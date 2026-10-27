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
import { createDocumentFileGet } from "../../app/api/workspace/documents/file/[id]/[name]/route";
import { fileLinkPath } from "../../src/lib/case-workspace/fileLink";

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
  const SECRET = "test-only-secret";
  const route = (signedIn: boolean) => createDocumentLinkGet({
    authenticate: async () => (signedIn ? { id: OWNER } : null),
    ownRow: async (documentId, userId) => {
      if (userId !== OWNER) return null;
      if (documentId === MINE) return { id: MINE, storage_path: `${OWNER}/case/${MINE}`, original_name: "clinic_note_wrist.pdf", deleted_at: null };
      if (documentId === GONE) return { id: GONE, storage_path: `${OWNER}/case/${GONE}`, original_name: "old.pdf", deleted_at: "2026-10-26T00:00:00Z" };
      return null; // another person's file is never this owner's row
    },
    secret: () => SECRET,
  });
  const get = (signedIn: boolean, query: string) => route(signedIn)(new NextRequest(`http://localhost/api/workspace/documents/link?${query}`));
  const noLink = async (response: Response) => !(await response.clone().json().catch(() => ({}))).url;

  const refusedNoSignIn = await get(false, `documentId=${MINE}`);
  check("no sign-in: refused, no link", refusedNoSignIn.status === 401 && (await noLink(refusedNoSignIn)));
  const refusedBadId = await get(true, "documentId=../../etc");
  check("a bad id: refused", refusedBadId.status === 400 && (await noLink(refusedBadId)));
  const refusedTheirs = await get(true, `documentId=${THEIRS}`);
  check("someone else's file: not found, no link", refusedTheirs.status === 404 && (await noLink(refusedTheirs)));
  const refusedGone = await get(true, `documentId=${GONE}`);
  check("a file being deleted: not found, no link", refusedGone.status === 404 && (await noLink(refusedGone)));
  const open = await get(true, `documentId=${MINE}`);
  const opened = await open.json();
  const openUrl = new URL(String(opened.url), "http://localhost");
  check("the owner's own file: a link on this site, ending with the file's own name (the tab's title)", open.status === 200 && String(opened.url).startsWith(`/api/workspace/documents/file/${MINE}/`) && openUrl.pathname.endsWith("/clinic_note_wrist.pdf"), String(opened.url));
  const expires = Number(openUrl.searchParams.get("exp")) - Math.floor(Date.now() / 1000);
  check("the link lasts a minute", LINK_SECONDS === 60 && opened.expiresInSeconds === 60 && expires > 50 && expires <= 60, String(expires));
  check("opening does not force a download", !openUrl.searchParams.has("download"));
  check("the link is never cached", /no-store/.test(open.headers.get("cache-control") ?? ""));
  const saved = await (await get(true, `documentId=${MINE}&download=1`)).json();
  const saveUrl = new URL(String(saved.url), "http://localhost");
  check("saving asks for the file as a download, under its own name", saveUrl.searchParams.get("download") === "1" && saveUrl.pathname.endsWith("/clinic_note_wrist.pdf"));

  // The file route serves only a valid, unexpired link, for the choice it was made for.
  const objects: string[] = [];
  const fileRoute = createDocumentFileGet({
    secret: () => SECRET,
    row: async (documentId) => documentId === MINE ? { storage_path: `${OWNER}/case/${MINE}`, original_name: "clinic_note_wrist.pdf", mime: "application/pdf", deleted_at: null } : documentId === GONE ? { storage_path: "x", original_name: "old.pdf", mime: "application/pdf", deleted_at: "2026-10-26T00:00:00Z" } : null,
    object: async (objectPath) => { objects.push(objectPath); return new Blob(["%PDF-1.4 synthetic"], { type: "application/pdf" }); },
  });
  const serve = (url: string) => {
    const at = new URL(url, "http://localhost");
    const [, , , , , id, name] = at.pathname.split("/");
    return fileRoute(new Request(at.toString()), { params: Promise.resolve({ id, name }) });
  };
  const served = await serve(String(opened.url));
  check("a valid link serves the file, inline, named as it was uploaded", served.status === 200 && /^inline;/.test(served.headers.get("content-disposition") ?? "") && /clinic_note_wrist\.pdf/.test(served.headers.get("content-disposition") ?? "") && served.headers.get("content-type") === "application/pdf");
  check("served from the private bucket by the stored object's path", objects[0] === `${OWNER}/case/${MINE}`);
  const downloaded = await serve(String(saved.url));
  check("a download link serves it as an attachment, named as it was uploaded", downloaded.status === 200 && /^attachment;/.test(downloaded.headers.get("content-disposition") ?? "") && /clinic_note_wrist\.pdf/.test(downloaded.headers.get("content-disposition") ?? ""));
  check("served files are never cached", /no-store/.test(served.headers.get("cache-control") ?? ""));
  const tampered = String(opened.url).replace(/sig=[^&]+/, "sig=AAAA");
  check("a changed signature is refused, with a plain page", (await serve(tampered)).status === 403);
  check("an open link cannot be used to download", (await serve(`${opened.url}&download=1`)).status === 403);
  const expired = fileLinkPath({ secret: SECRET, documentId: MINE, name: "clinic_note_wrist.pdf", download: false, now: Date.now() - 120_000 });
  const expiredPage = await serve(expired);
  check("an expired link is refused, in the site's own words", expiredPage.status === 403 && /expired/.test(await expiredPage.text()));
  check("a link to a file being deleted is refused", (await serve(fileLinkPath({ secret: SECRET, documentId: GONE, name: "old.pdf", download: false }))).status === 404);
  const broken = createDocumentFileGet({ secret: () => SECRET, row: async () => ({ storage_path: "p", original_name: "a.pdf", mime: "application/pdf", deleted_at: null }), object: async () => null });
  const brokenPage = await broken(new Request(new URL(String(opened.url), "http://localhost").toString()), { params: Promise.resolve({ id: MINE, name: "a.pdf" }) });
  check("a storage failure is a plain page, never the browser's error page", brokenPage.status === 502 && /text\/html/.test(brokenPage.headers.get("content-type") ?? ""));

  const card = fs.readFileSync(path.join(ROOT, "app/cases/_components/CaseWorkspace.tsx"), "utf8");
  check("every documents card offers Open, Download and Delete", ["document-open", "document-download", "document-delete"].every((id) => card.includes(`data-testid="${id}"`)) && (card.match(/<FileActions /g) ?? []).length >= 2);
  check("open and save go through the signed-link route", /\/api\/workspace\/documents\/link\?documentId=/.test(card));
  check("a download never sends the page away (a link is pressed)", !/window\.location\.assign\(payload\.url\)/.test(card) && /link\.download = ""/.test(card));
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
