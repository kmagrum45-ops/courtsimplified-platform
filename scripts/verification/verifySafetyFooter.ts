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
 *   no-words-stored   what the browser keeps for "shown once" contains no word of the
 *                     story (a one-way fingerprint only), under a registered key that
 *                     sign-out clears.
 *   journey           screen by screen through one tab: not on the home page while the
 *                     story is typed; shown on the builder (the first screen after the
 *                     story) and through a remount there; not again on the case page
 *                     or a reload; shown for new danger words. No words stored.
 *   notice shows/hidden  the emergency notice's rule (site owner, 2026-10-30), through
 *                     the shared decision: shown only when the person says they are in
 *                     danger, afraid for their safety, or threatened or hurt now; not for
 *                     past events, ordinary conflict, "threatened to sue", or Family alone.
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
import { MUST_FLAG, MUST_NOT_FLAG, NOTICE_MUST_SHOW, NOTICE_MUST_NOT_SHOW } from "./dangerExamples";

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

  // calm / once. The decision may be sync or async and may return the fingerprint or
  // { show, fingerprint }; both are read, so this suite runs on either shape.
  type Decision = string | null | { show: boolean; fingerprint: string | null };
  const once = await load<{
    safetyNoticeToShow: (story: string, shown: readonly string[]) => Decision | Promise<Decision>;
    recordShownKey: (store: Pick<Storage, "getItem" | "setItem">, key: string) => void;
    SAFETY_NOTICE_SHOWN_KEY: string;
  }>("../../src/lib/case-system/intake/safetyNoticeOnce");
  const decide = async (story: string, shown: string[]) => {
    const result = once ? await once.safetyNoticeToShow(story, shown) : null;
    if (result === null || typeof result === "string") return { show: result !== null, fingerprint: result };
    return result;
  };
  const calm: Record<string, string> = {
    "small-claims": "Synthetic story: my former landlord kept my $1,500 deposit when I moved out in June 2026. I have the lease.",
    civil: "Synthetic story: my former business partner owes me $80,000 under our agreement from May 2026. I have the agreement.",
    "small-claims bakery": "Synthetic story: I run a bakery. A cafe ordered $3,200 of cakes in March 2026 and never paid the invoice.",
  };
  for (const [court, story] of Object.entries(calm)) {
    check(`calm ${court}`, Boolean(once) && !(await decide(story, [])).show, `no notice for a story naming no danger (decision module ${once ? "present" : "missing"})`);
  }
  const danger = "Synthetic story: my former landlord threatened me when I asked for my $1,500 deposit back in June 2026. I am scared to go back there.";
  const first = await decide(danger, []);
  const again = first.fingerprint ? await decide(danger, [first.fingerprint]) : { show: true };
  const changed = first.fingerprint ? await decide(`${danger} He said he would hurt me.`, [first.fingerprint]) : { show: false };
  check("once", Boolean(once) && first.show && !again.show && changed.show, `shown at that moment (${first.show}), not again for the same words (${!again.show}), shown for new words naming danger (${changed.show})`);

  // no-words-stored: what the browser keeps names none of the person's words (a shared
  // computer must not keep their story), and the key is registered so sign-out clears it.
  const memory = new Map<string, string>();
  const fakeStore = { getItem: (name: string) => memory.get(name) ?? null, setItem: (name: string, value: string) => void memory.set(name, value) };
  if (once && first.fingerprint) once.recordShownKey(fakeStore, first.fingerprint);
  const stored = [...memory.values()].join(" ").toLowerCase();
  const words = [...new Set(danger.toLowerCase().match(/[a-z]{4,}/g) ?? [])];
  const leaked = words.filter((word) => stored.includes(word));
  const registry = await load<{ INTAKE_STORAGE_KEYS: { key: string; scope: string }[] }>("../../src/lib/case-system/storage/intakeStorageKeys");
  const registered = Boolean(once?.SAFETY_NOTICE_SHOWN_KEY) && (registry?.INTAKE_STORAGE_KEYS ?? []).some((entry) => entry.key === once!.SAFETY_NOTICE_SHOWN_KEY);
  check("no-words-stored", Boolean(stored) && leaked.length === 0 && registered,
    `the stored value names no word of the story (leaked: ${leaked.join(", ") || "none"}; stored: ${stored ? `${stored.length} chars` : "nothing"}) and its key is in the storage registry, so sign-out clears it (${registered})`);

  // journey: the screens a person passes through, each mounting SafetyNotice the way the
  // site does (IntakeRecovery mounts it on the home page once the situation is answered,
  // on every builder screen, and the case page mounts it), each running the decision
  // SafetyNotice's effect runs, against one tab's store. The notice must be visible on
  // the first screen after the story (the builder), stay through a remount there, and not
  // come back on the case page, on a reload, or in a later mount; new words naming danger
  // show it again. On a commit without decideSafetyNotice (3e30ca6a), the effect body of
  // that commit's SafetyNotice is run instead: safetyNoticeToShow + recordShownKey, on
  // every screen (it had no screen rule).
  type Mod = {
    decideSafetyNotice?: (story: string, pathname: string, store: Pick<Storage, "getItem" | "setItem">) => Promise<boolean>;
    startNewPageLoad?: () => void;
    safetyNoticeToShow: (story: string, shown: readonly string[]) => unknown;
    readShownKeys: (store: Pick<Storage, "getItem">) => string[];
    recordShownKey: (store: Pick<Storage, "getItem" | "setItem">, key: string) => void;
  };
  const mod = once as unknown as Mod | null;
  const tab = new Map<string, string>();
  const tabStore = { getItem: (name: string) => tab.get(name) ?? null, setItem: (name: string, value: string) => void tab.set(name, value) };
  const mount = async (story: string, pathname: string): Promise<boolean> => {
    if (!mod) return false;
    if (mod.decideSafetyNotice) return mod.decideSafetyNotice(story, pathname, tabStore);
    const decision = (await mod.safetyNoticeToShow(story, mod.readShownKeys(tabStore))) as { show: boolean; fingerprint: string | null } | string | null;
    const fingerprint = typeof decision === "string" ? decision : decision?.fingerprint ?? null;
    const show = typeof decision === "string" ? true : Boolean(decision?.show);
    if (show && fingerprint) mod.recordShownKey(tabStore, fingerprint);
    return show;
  };
  const newLoad = () => mod?.startNewPageLoad?.();
  const journey: [string, boolean][] = [];
  newLoad();
  journey.push(["home page, story typed (not a screen after the story)", await mount(danger, "/")]);
  newLoad();
  const onBuilder = await mount(danger, "/builder");
  journey.push(["builder, first screen after the story: SHOWN", onBuilder]);
  journey.push(["builder, same screen remounted: still shown", await mount(danger, "/builder")]);
  newLoad();
  journey.push(["case page, same words: not again", await mount(danger, "/cases/synthetic-case")]);
  newLoad();
  journey.push(["builder reloaded, same words: not again", await mount(danger, "/builder")]);
  journey.push(["builder, new words naming danger: shown", await mount(`${danger} He said he would hurt me.`, "/builder")]);
  const expected = [false, true, true, false, false, true];
  const wrong = journey.filter(([, got], index) => got !== expected[index]);
  check("journey", Boolean(mod) && wrong.length === 0, `screen by screen: ${journey.map(([what, got]) => `${what} -> ${got ? "shown" : "hidden"}`).join("; ")}`);
  const leakedAfterJourney = words.filter((word) => [...tab.values()].join(" ").toLowerCase().includes(word));
  check("journey-no-words-stored", leakedAfterJourney.length === 0, `the tab's store after the journey names none of the story's words (leaked: ${leakedAfterJourney.join(", ")})`);

  // notice rule (site owner, 2026-10-30): the shared decision every SafetyNotice runs
  // (decideSafetyNotice, on the builder, in a fresh tab) shows the notice only when the
  // person says they are in danger, afraid for their safety, or threatened or hurt now --
  // never for a past event with no present danger, ordinary conflict, a legal threat or a
  // Family case on its own. The earlier lists (MUST_FLAG / MUST_NOT_FLAG) hold too.
  // A MUST_FLAG sentence the owner ruled out for the notice (fear about custody) is held to NOTICE_MUST_NOT_SHOW.
  const noticeShows = [...MUST_FLAG, ...NOTICE_MUST_SHOW].filter((text) => !NOTICE_MUST_NOT_SHOW.includes(text));
  for (const [texts, want] of [[noticeShows, true], [[...MUST_NOT_FLAG, ...NOTICE_MUST_NOT_SHOW], false]] as const) {
    for (const text of texts) {
      mod?.startNewPageLoad?.();
      const fresh = new Map<string, string>();
      const freshStore = { getItem: (name: string) => fresh.get(name) ?? null, setItem: (name: string, value: string) => void fresh.set(name, value) };
      const got = mod?.decideSafetyNotice ? await mod.decideSafetyNotice(text, "/builder", freshStore) : null;
      check(`notice ${want ? "shows" : "hidden"}: ${text.slice(0, 70)}`, got === want, `the notice ${want ? "must show" : "must not show"} (got ${got === null ? "no shared decision" : got ? "shown" : "hidden"})`);
    }
  }

  // once-wired
  const notice = read("app/_components/SafetyNotice.tsx");
  check("once-wired", /decideSafetyNotice\(story, window\.location\.pathname/.test(notice) && /<SafetyNotice\b/.test(read("app/_components/IntakeRecovery.tsx")) && /<SafetyNotice\b/.test(read("app/cases/[id]/page.tsx")),
    "SafetyNotice decides with decideSafetyNotice on its own screen (the journey above), and it is the notice the builder and the case page render");

  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
