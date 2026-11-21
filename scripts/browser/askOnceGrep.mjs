// The grep for one ask-once shard (courtsimplified-ask-once.yml, matrix "stories"): every test of the named stories,
// each reading included, and no other story whose name merely starts the same ("sc-slip-and-fall" never takes
// "sc-slip-and-fall-changed"). One copy: the workflow runs this file and test:ask-once-shards imports it.
//   node scripts/browser/askOnceGrep.mjs sc-iou sc-wages ...
import { pathToFileURL } from "node:url";

export function askOnceGrep(stories) {
  return `ask once on every page -- (${stories.join("|")})( \\(|$)`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const stories = process.argv.slice(2).flatMap((item) => item.split(/\s+/)).filter(Boolean);
  if (stories.length === 0) { console.error("askOnceGrep: no stories given"); process.exit(1); }
  process.stdout.write(askOnceGrep(stories));
}
