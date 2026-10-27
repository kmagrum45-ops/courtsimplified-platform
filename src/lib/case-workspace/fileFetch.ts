/**
 * EVERY FILE THE PERSON DOWNLOADS OR OPENS: CHECKED BEFORE THE BROWSER GETS IT, RETRIED ONCE, AND
 * A FAILURE SAID ON THE PAGE (Chrome, 28 Oct).
 *
 * A download handed straight to the browser fails out of sight: Chrome's network log showed
 * "statusCode: 503" on a file's link while the page showed nothing and stayed as it was, and the same
 * link opened again returned the file. So each file is fetched by the page first; a failed fetch is
 * tried once more (with a fresh link where the link expires); only a file that arrived is saved or
 * opened, and one that did not is reported in plain words.
 *
 * Browser-only helpers, no React. States no law.
 */

/** Said when a file could not be fetched after one more try. */
export const FILE_DOWNLOAD_FAILED = "The file could not be downloaded. Please try again.";
export const FILE_OPEN_FAILED = "The file could not be opened. Please try again.";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * The file at the URL a link gives, fetched; one more try (asking for a fresh link) when the first
 * fails or returns anything but a file. `link` is called for each try, so an expiring link is renewed.
 */
export async function fetchFileWithRetry(link: () => Promise<string | null>, init: RequestInit = {}, fetcher: Fetcher = fetch, tries = 2): Promise<{ ok: true; blob: Blob; url: string } | { ok: false }> {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const url = await link().catch(() => null);
    if (!url) continue;
    const response = await fetcher(url, init).catch(() => null);
    if (!response?.ok) continue;
    const blob = await response.blob().catch(() => null);
    if (blob) return { ok: true, blob, url };
  }
  return { ok: false };
}

/** The file's own name from a link that ends with it (fileLink.ts), else the fallback. */
export function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const last = new URL(url, "https://example.invalid").pathname.split("/").pop() ?? "";
    return decodeURIComponent(last) || fallback;
  } catch { return fallback; }
}

/** Saves a file that arrived, under its name, without leaving the page. */
export function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // After the browser has taken it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Opens a file at a fixed address in a new tab only once it is known to arrive: the tab is opened
 * at once (so the browser does not block it), the file fetched (once more if that fails), and the
 * tab closed with false when it did not arrive, for the caller to say so.
 */
export async function openAfterCheck(url: string, fetcher: Fetcher = fetch): Promise<boolean> {
  const tab = window.open("", "_blank");
  const fetched = await fetchFileWithRetry(async () => url, {}, fetcher);
  if (!fetched.ok) { tab?.close(); return false; }
  if (tab) { tab.opener = null; tab.location.href = url; }
  return true;
}
