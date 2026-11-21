/**
 * "SEND FEEDBACK" SHOWS THE CONTACT ADDRESS AS TEXT BESIDE THE LINK (Chrome check of #547 at 0e0f7e9, G5: a person with no
 * mail program on the computer gets nothing from a mailto link; the address must be there to copy).
 *
 * What it checks, in every file of app/ that has a "Send feedback" link (data-testid="send-feedback"):
 *   1. right after the link, the address is shown as plain text (data-testid="send-feedback-address"), from the one copy
 *      of the address (src/lib/site/contact.ts CONTACT_EMAIL), not typed again;
 *   2. the link still writes to that same address.
 *
 * WHAT FAILURE THIS CATCHES: a feedback link with no address a person can read or copy.
 *
 * Run: npm run test:feedback-address-shown
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const ROOT = join(__dirname, "..", "..");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : name.endsWith(".tsx") ? [path] : [];
  });

const withLink = files("app").map((file) => ({ file, text: readFileSync(join(ROOT, file), "utf8") })).filter(({ text }) => text.includes('data-testid="send-feedback"'));
check(`setup: "Send feedback" links found (${withLink.length} files)`, withLink.length > 0);
for (const { file, text } of withLink) {
  const at = text.indexOf('data-testid="send-feedback"');
  const after = text.slice(at, at + 1200);
  check(`1. ${file}: the address is shown as text right after the link`, /data-testid="send-feedback-address"[^>]*>\s*\{CONTACT_EMAIL\}/.test(after), after.slice(0, 300));
  check(`2. ${file}: the link writes to the one copy of the address`, /href=\{`mailto:\$\{CONTACT_EMAIL\}/.test(after));
}

console.log(failures ? `\n${failures} check(s) failed.` : '\n"Send feedback" shows the contact address as text beside the link.');
process.exit(failures ? 1 : 0);
