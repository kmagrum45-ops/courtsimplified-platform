/**
 * THE SAFETY NOTICE, AS THE SITE OWNER SET IT ON 2026-10-29 (verbatim): "always one
 * small-print line in the footer, 'If you feel you are in immediate danger, call 911',
 * with a link to the other support lines. No open box and no 'available without an AI
 * safety check' wording for anyone. The fuller support information shows only when what
 * the person said indicates danger, at that moment, once. ... Add a test that the box is
 * not open in a Small Claims or civil case with no danger."
 *
 *   npx tsx scripts/verification/verifySafetyFooter.ts
 *
 * No browser, no model call, no database. Each check asserts a property:
 *
 *   footer-line       the shared footer line renders the owner's exact words and a link
 *                     to the support lines page.
 *   footer-every-page the root layout renders it inside its <footer> (every page goes
 *                     through the root layout), and no other layout opens its own <html>.
 *   support-page      the support lines page renders every number of the reviewed list
 *                     (IMMEDIATE_DANGER_MESSAGE) and each source carries a URL and date.
 *   no-ai-check-wording  "available without an AI safety check" is nowhere in app/ or src/.
 *   no-open-box       the review panel holds no helpline box, and no <details> anywhere
 *                     in app/ is opened by the intake's phase.
 *   calm <court>      a Small Claims or civil story naming no danger brings no notice.
 *   once              a story naming danger brings the notice at that moment; the same
 *                     words never bring it again; new words naming danger do.
 *   once-wired        the notice the builder and the case page render is the one that
 *                     uses that decision.
 *
 * What failure it exists to catch: the helplines box opened on every case (a bakery
 * invoice), the AI-check wording returning, the footer line dropped off a page, and the
 * notice re-shown on every page.
 *
 * Imports are dynamic so the suite runs (and fails, check by check) on a commit without
 * the change.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}   ${name}${ok ? "" : `\n         ${detail}`}`);
}
const root = process.cwd();
const read = (path: string) => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : "");
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(root, dir))) {
    const path = join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    if (statSync(join(root, path)).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mdx?)$/.test(entry)) out.push(path);
  }
  return out;
}
async function load<T>(path: string): Promise<T | null> {
  try {
    return (await import(path)) as T;
  } catch {
    return null;
  }
}
const OWNER_LINE = "If you feel you are in immediate danger, call 911";

async function main() {
  // footer-line
  const footer = await load<{ default: () => null; SAFETY_FOOTER_LINE: string }>("../../app/_components/SafetyFooterLine");
  const footerHtml = footer ? renderToStaticMarkup(createElement(footer.default)) : "";
  check("footer-line", footerHtml.includes(OWNER_LINE) && /href="\/support"/.test(footerHtml) && footer?.SAFETY_FOOTER_LINE === OWNER_LINE,
    `the footer line renders ${JSON.stringify(OWNER_LINE)} and a link to /support (got ${JSON.stringify(footerHtml || "no SafetyFooterLine component")})`);

  // footer-every-page
  const layout = read("app/layout.tsx");
  const otherRoots = walk("app").filter((path) => /layout\.tsx$/.test(path) && path !== join("app", "layout.tsx") && /<html\b/.test(read(path)));
  check("footer-every-page", /<footer[\s\S]*<SafetyFooterLine\s*\/>[\s\S]*<\/footer>/.test(layout) && otherRoots.length === 0,
    `app/layout.tsx renders <SafetyFooterLine /> inside <footer>, and no other layout opens <html> (others: ${otherRoots.join(", ") || "none"})`);

  // support-page
  const crisis = await load<{ IMMEDIATE_DANGER_MESSAGE: string }>("../../src/lib/content-library/crisisMessages");
  const support = await load<{ default: () => null }>("../../app/support/page");
  const lines = await load<{ SUPPORT_LINE_SOURCES: { url: string; checked: string; quoted: string[] }[] }>("../../src/lib/content-library/supportLines");
  const supportHtml = support ? renderToStaticMarkup(createElement(support.default)) : "";
  const numbers = (crisis?.IMMEDIATE_DANGER_MESSAGE ?? "").split("\n\n").slice(2).join(" ").match(/\d-\d{3}-\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/g) ?? [];
  const missing = numbers.filter((number) => !supportHtml.includes(number));
  const sources = lines?.SUPPORT_LINE_SOURCES ?? [];
  const sourcesOk = sources.length > 0 && sources.every((source) => /^https:\/\/www\.ontario\.ca\//.test(source.url) && /^\d{4}-\d{2}-\d{2}$/.test(source.checked) && supportHtml.includes(source.url) && source.quoted.length > 0);
  check("support-page", Boolean(supportHtml) && numbers.length > 0 && missing.length === 0 && sourcesOk,
    `the /support page renders every reviewed number (missing: ${missing.join(", ") || (supportHtml ? "none" : "no page")}) and each source has an ontario.ca URL, a checked date and a quote (${sourcesOk})`);

  // no-ai-check-wording
  const phrase = /available without an AI safety check/i;
  const withPhrase = [...walk("app"), ...walk("src")].filter((path) => phrase.test(read(path)));
  check("no-ai-check-wording", withPhrase.length === 0, `"available without an AI safety check" appears in: ${withPhrase.join(", ")}`);

  // no-open-box
  const panel = read("app/_components/IntakeReviewPanel.tsx");
  const phaseOpened = walk("app").filter((path) => /<details[^>]*open=\{[^}]*phase\b/.test(read(path)));
  check("no-open-box", !/intake-safety-resources|IMMEDIATE_DANGER_MESSAGE|Assaulted Women/.test(panel) && phaseOpened.length === 0,
    `the review panel holds no helpline box and no <details> is opened by the phase (opened by phase: ${phaseOpened.join(", ") || "none"}; panel box: ${/intake-safety-resources/.test(panel)})`);

  // calm / once
  const once = await load<{ safetyNoticeToShow: (story: string, shown: readonly string[]) => string | null }>("../../src/lib/case-system/intake/safetyNoticeOnce");
  const calm: Record<string, string> = {
    "small-claims": "Synthetic story: my former landlord kept my $1,500 deposit when I moved out in June 2026. I have the lease.",
    civil: "Synthetic story: my former business partner owes me $80,000 under our agreement from May 2026. I have the agreement.",
    "small-claims bakery": "Synthetic story: I run a bakery. A cafe ordered $3,200 of cakes in March 2026 and never paid the invoice.",
  };
  for (const [court, story] of Object.entries(calm)) {
    check(`calm ${court}`, Boolean(once) && once!.safetyNoticeToShow(story, []) === null, `no notice for a story naming no danger (decision module ${once ? "present" : "missing"})`);
  }
  const danger = "Synthetic story: my former landlord threatened me when I asked for my $1,500 deposit back in June 2026. I am scared to go back there.";
  const first = once?.safetyNoticeToShow(danger, []) ?? null;
  const again = first && once ? once.safetyNoticeToShow(danger, [first]) : "unset";
  const changed = first && once ? once.safetyNoticeToShow(`${danger} He said he would hurt me.`, [first]) : null;
  check("once", Boolean(first) && again === null && Boolean(changed), `shown at that moment (${Boolean(first)}), not again for the same words (${again === null}), shown for new words naming danger (${Boolean(changed)})`);

  // once-wired
  const notice = read("app/_components/SafetyNotice.tsx");
  check("once-wired", /safetyNoticeToShow\(/.test(notice) && /recordShownKey\(/.test(notice) && /<SafetyNotice\b/.test(read("app/_components/IntakeRecovery.tsx")) && /<SafetyNotice\b/.test(read("app/cases/[id]/page.tsx")),
    "SafetyNotice decides with safetyNoticeToShow and records what it showed, and it is the notice the builder and the case page render");

  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
