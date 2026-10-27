/**
 * A ONE-MINUTE LINK TO A PERSON'S OWN FILE, ON THIS SITE (Charter re-test, 27 Oct).
 *
 * The link route (app/api/workspace/documents/link) checks the signed-in owner, then gives a path on
 * this site: /api/workspace/documents/file/<id>/<file name>?exp=…&sig=…[&download=1]. The file route
 * serves the stored object only for a valid, unexpired signature. Before, the browser was sent
 * straight to the storage service's signed address: the tab was titled with the stored object's
 * random name, a real Download click logged an error (503) and once left the tab on the browser's
 * error page. Now the tab's address ends with the file's own name (its title), the download never
 * navigates the page away, and an error is the site's own words.
 *
 * The signature is an HMAC over the document id, the expiry and open-or-download, with a key derived
 * from a server-only secret; it is never logged. Server only.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** How long a link lasts, in seconds: long enough to open, too short to share usefully. */
export const FILE_LINK_SECONDS = 60;

const keyFrom = (secret: string) => createHash("sha256").update(`courtsimplified-file-link:${secret}`).digest();
const signature = (secret: string, documentId: string, expires: number, download: boolean) =>
  createHmac("sha256", keyFrom(secret)).update(`${documentId}|${expires}|${download ? 1 : 0}`).digest("base64url");

/** A file's name as the last part of an address: its own name, nothing that changes the path. */
export function fileNameForPath(name: string | null | undefined): string {
  const cleaned = (name ?? "").replace(/[\\/\u0000-\u001f]/g, "").trim();
  return encodeURIComponent(cleaned || "document");
}

/** The path on this site that serves the file for a minute. */
export function fileLinkPath(args: { secret: string; documentId: string; name: string | null; download: boolean; now?: number }): string {
  const expires = Math.floor((args.now ?? Date.now()) / 1000) + FILE_LINK_SECONDS;
  const sig = signature(args.secret, args.documentId, expires, args.download);
  return `/api/workspace/documents/file/${args.documentId}/${fileNameForPath(args.name)}?exp=${expires}&sig=${sig}${args.download ? "&download=1" : ""}`;
}

/** Whether a link's signature is this document's, for this choice, and not yet expired. */
export function fileLinkValid(args: { secret: string; documentId: string; expires: string | null; sig: string | null; download: boolean; now?: number }): boolean {
  const expires = Number(args.expires);
  if (!args.sig || !Number.isInteger(expires)) return false;
  if (expires < Math.floor((args.now ?? Date.now()) / 1000)) return false;
  if (expires > Math.floor((args.now ?? Date.now()) / 1000) + FILE_LINK_SECONDS + 5) return false;
  const expected = Buffer.from(signature(args.secret, args.documentId, expires, args.download));
  const given = Buffer.from(args.sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
