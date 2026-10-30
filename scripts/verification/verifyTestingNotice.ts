/**
 * THE YELLOW TESTING NOTICE'S WORDS (site owner, 2026-10-29). The notice
 * (ScopePreviewNotice.tsx) no longer says the site is waiting for the Law Society of
 * Ontario's Access to Innovation approval; it says what the owner set: the site was
 * built by self-represented litigants, it uses AI governed by rules, and what it shows
 * has not been looked at by a lawyer or paralegal.
 *
 *   npx tsx scripts/verification/verifyTestingNotice.ts
 *
 * No browser, no model call, no database. Each check asserts a property:
 *
 *   one-copy          the words live in one constant (TESTING_NOTICE_TEXT); no other
 *                     file in app/ or src/ writes them out, and every screen that
 *                     renders the notice reads the constant.
 *   renders-constant  the notice, when shown, renders exactly that constant.
 *   no-old-wording    no shown text in app/ or src/ (comments aside) says "waiting for
 *                     approval from the Law Society" or names "Access to Innovation".
 *   owner-brief       the constant names the three things the owner listed (who built
 *                     the site, AI under rules, not checked by a lawyer or paralegal)
 *                     and does not name the Law Society.
 *
 * What failure it exists to catch: the old approval wording coming back, or a second
 * copy of the notice drifting from the one the owner approved.
 *
 * Imports are dynamic so the suite runs (and fails, check by check) on a commit without
 * the change.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}   ${name}${ok ? "" : `\n         ${detail}`}`);
}
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(root, dir))) {
    const path = join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    if (statSync(join(root, path)).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}
/** A file's lines with comment lines and trailing // comments removed: what can reach a screen. */
function shownLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(line))
    .map((line) => line.replace(/\s\/\/.*$/, ""));
}
async function load<T>(path: string): Promise<T | null> {
  try {
    return (await import(path)) as T;
  } catch {
    return null;
  }
}

async function main() {
  const notice = await load<{ TESTING_NOTICE_TEXT: string }>("../../src/lib/case-system/policy/testingNotice");
  const text = notice?.TESTING_NOTICE_TEXT ?? "";
  const files = [...walk("app"), ...walk("src")];

  // one-copy
  const constantFile = join("src", "lib", "case-system", "policy", "testingNotice.ts");
  const copies = text ? files.filter((path) => path !== constantFile && read(path).includes(text.slice(0, 40))) : [];
  const renderers = files.filter((path) => read(path).includes('data-testid="scope-preview-notice"'));
  const notReading = renderers.filter((path) => !/TESTING_NOTICE_TEXT/.test(read(path)));
  check("one-copy", Boolean(text) && copies.length === 0 && renderers.length > 0 && notReading.length === 0,
    `one constant (${text ? "present" : "missing"}); other copies: ${copies.join(", ") || "none"}; renderers not reading it: ${notReading.join(", ") || "none"}`);

  // renders-constant
  const component = await load<{ default: (props: { scope: string }) => null }>("../../app/builder/_components/ScopePreviewNotice");
  const scope = await load<{ scopeIsPreviewOnly: (key: string) => boolean }>("../../src/lib/case-system/policy/a2iScope");
  const html = component ? renderToStaticMarkup(createElement(component.default, { scope: "formCompletion" })) : "";
  const shown = scope?.scopeIsPreviewOnly("formCompletion") ?? true;
  const inner = html.replace(/<[^>]+>/g, "").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  check("renders-constant", Boolean(text) && (shown ? inner === text : html === ""),
    `the notice renders exactly TESTING_NOTICE_TEXT when shown (shown: ${shown}; got ${JSON.stringify(inner)})`);

  // no-old-wording
  const old = /waiting for approval from the Law Society|Access to Innovation/i;
  const withOld = files.filter((path) => shownLines(read(path)).some((line) => old.test(line)));
  check("no-old-wording", withOld.length === 0, `the Law Society approval wording appears outside comments in: ${withOld.join(", ")}`);

  // owner-brief
  const brief = /represented themselves|self-represented/i.test(text) && /\bAI\b/.test(text) && /rules/i.test(text) && /lawyer or paralegal/i.test(text) && !/Law Society/i.test(text);
  check("owner-brief", brief, `names who built the site, AI under rules, and not checked by a lawyer or paralegal, and not the Law Society (got ${JSON.stringify(text)})`);

  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
