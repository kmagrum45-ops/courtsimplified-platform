/**
 * Runs the story pack (tests/browser/story-pack.spec.ts) and prints its findings,
 * grouped by what failed. Exits non-zero when there are any, so it can gate a PR.
 *
 * Run: npm run test:story-pack -- [playwright options, e.g. -g "civil-"]
 * Against PLAYWRIGHT_BASE_URL (default http://localhost:3100, a production build
 * served the way CI serves it). A preview needs its own SITE_ACCESS_PASSWORD in the
 * environment.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";

// This run's own folder (tests/browser/harness/packRecords.ts): named here, so its workers share it.
process.env.STORY_PACK_RUN_ID ||= `local-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const FINDINGS = `story-pack-records/${process.env.STORY_PACK_RUN_ID.replace(/[^\w.-]/g, "-")}/findings.jsonl`;
process.env.PLAYWRIGHT_BASE_URL ||= "http://localhost:3100";
const run = spawnSync("npx", ["playwright", "test", "tests/browser/story-pack.spec.ts", "--reporter=line", ...process.argv.slice(2)], { stdio: "inherit", shell: true });

const findings = fs.existsSync(FINDINGS)
  ? fs.readFileSync(FINDINGS, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))
  : [];
const grouped = new Map();
for (const finding of findings) {
  const key = `${finding.where}: ${finding.what}`;
  grouped.set(key, [...(grouped.get(key) ?? []), finding]);
}
console.log(`\nSTORY PACK (records in ${FINDINGS.replace(/\/findings\.jsonl$/, "")}): ${findings.length} finding(s) in ${new Set(findings.map((finding) => finding.run)).size} run(s)`);
for (const [key, list] of grouped) {
  console.log(`\n  ${key} -- ${list.length}`);
  for (const finding of list.slice(0, 14)) console.log(`    ${finding.run}${finding.detail ? `: ${finding.detail.slice(0, 170)}` : ""}`);
}
process.exit(findings.length || run.status ? 1 : 0);
