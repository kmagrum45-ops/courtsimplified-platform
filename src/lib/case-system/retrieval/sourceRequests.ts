/**
 * Files the laws the research step said the library lacks as "source-request"
 * issues on the repository, where the Source Requests workflow picks each up,
 * resolves it to the official text, fetches and verifies it, indexes it and
 * merges it (.github/workflows/courtsimplified-source-requests.yml).
 *
 * WHAT IS SENT: the law's name as the research step wrote it ("Statutory
 * Accident Benefits Schedule, O. Reg. 34/10") and the court path. Never the
 * story, never anything about the person -- an issue is readable by anyone
 * with access to the repository.
 *
 * WHEN: only with GITHUB_SOURCE_REQUEST_TOKEN set (a fine-grained token with
 * Issues: read and write on this repository). Without it this does nothing,
 * and the gaps are still logged by name. A token-created issue triggers the
 * workflow; one created with the Actions token would not.
 *
 * Never throws; gives up after a few seconds; at most three requests a call;
 * skips a law already requested (an open issue with the same title).
 */

const TITLE_PREFIX = "Source request: ";
const LABEL = "source-request";
const MAX_PER_CALL = 3;
const TIMEOUT_MS = 4_000;

const recentlyFiled = new Set<string>();

export function requestTitle(name: string): string {
  return `${TITLE_PREFIX}${name.replace(/\s+/g, " ").trim().slice(0, 120)}`;
}

const key = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Fetch = typeof fetch;

export async function fileSourceRequests(
  names: readonly string[],
  context: { courtPath: string },
  deps: { fetch?: Fetch; env?: Record<string, string | undefined> } = {},
): Promise<{ filed: string[]; skipped: string[] }> {
  const env = deps.env ?? process.env;
  const token = env.GITHUB_SOURCE_REQUEST_TOKEN;
  const repo = env.GITHUB_SOURCE_REQUEST_REPO || "kmagrum45-ops/courtsimplified-platform";
  const doFetch = deps.fetch ?? fetch;
  const filed: string[] = [];
  const skipped: string[] = [];
  if (!token || names.length === 0) return { filed, skipped: [...names] };

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const work = async () => {
    const open = await doFetch(`https://api.github.com/repos/${repo}/issues?state=open&labels=${LABEL}&per_page=100`, { headers });
    const existing = open.ok ? ((await open.json()) as { title?: string }[]).map((issue) => key(issue.title ?? "")) : [];
    for (const name of [...new Set(names)].slice(0, MAX_PER_CALL)) {
      const title = requestTitle(name);
      if (existing.includes(key(title)) || recentlyFiled.has(key(title))) {
        skipped.push(name);
        continue;
      }
      const body =
        `The research step could not find this law in the library while researching a ${context.courtPath} story.\n\n` +
        `Requested as: ${name.slice(0, 300)}\n\n` +
        "The Source Requests workflow resolves it to the official text, verifies it, indexes it and merges it. " +
        "No user information is included in this issue.";
      const response = await doFetch(`https://api.github.com/repos/${repo}/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title, body, labels: [LABEL] }),
      });
      if (response.ok) {
        filed.push(name);
        recentlyFiled.add(key(title));
      } else skipped.push(name);
    }
  };
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([work(), new Promise<void>((resolve) => (timer = setTimeout(resolve, TIMEOUT_MS)))]);
    if (timer) clearTimeout(timer);
  } catch {
    // A failure to file never affects the analysis.
  }
  return { filed, skipped };
}
