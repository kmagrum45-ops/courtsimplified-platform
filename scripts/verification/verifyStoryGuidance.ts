/**
 * Every box that asks a person for their story shows the same guidance, from one
 * place (site owner, 30 Oct).
 *
 *   npm run test:story-guidance
 *
 * Before this, each story box carried its own hint: the home page said "Share
 * the main events, people involved, and what you are trying to resolve.", the
 * Small Claims questions "Tell us what happened...", the "not sure which court"
 * guide and the Case story editor said nothing. So what a person was told to
 * write, and whether they were told not to type a social insurance number or a
 * bank or card number, depended on the route they took. The text now lives in
 * one constant (src/lib/case-system/copy/storyGuidance.ts), shown by one
 * component (app/_components/StoryGuidance.tsx) as visible helper text tied to
 * the box with aria-describedby.
 *
 * What it asserts (properties, not today's wording, so the owner can reword the
 * constant without touching this file):
 *   1. The constant is defined once and still tells the person not to include a
 *      social insurance number or bank or card numbers; no other file carries a
 *      copy of it.
 *   2. Every story box in app/ points at a rendered <StoryGuidance> with
 *      aria-describedby. A story box is any <textarea> whose own tag mentions
 *      "what happened" or "story", plus the boxes in the hosts listed below,
 *      whose names are computed and so cannot be found by their words.
 *   3. No story box has a placeholder that gives guidance of its own.
 *   4. A file that hosts a story box carries no other text that tells the person
 *      what to write in their story ("Share the main events…", "Describe what
 *      happened in your own words below…").
 *   5. Every one-at-a-time question that takes the story (guidedFields.ts,
 *      key "facts") is marked `story: true`, so GuidedFormChat shows the text.
 *   6. No story box's label, question or accessible name repeats the guidance's
 *      opening words (site owner, 30 Oct: the home label "Tell us what happened
 *      in your own words" sat right above helper text starting with the same
 *      words). "Repeats" is any run of three words from the guidance's first
 *      clause, read from the constant, so a reworded constant is followed.
 *   7. The boxes named for the story (home page, Small Claims chat, the
 *      civil/Family story question) take their name from the shared STORY_LABEL,
 *      not a literal of their own.
 *
 * The host list is a list that must be maintained: a story box moved to a new
 * file is added to it, a one-line change with an obvious cause. Each host must
 * still contain a story box, so a stale entry fails too.
 *
 * Source scan, offline, no model calls. The browser test
 * tests/browser/story-box-guidance.spec.ts checks the same thing on the
 * rendered pages, at desktop and phone width, in CI.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

/** Files whose story box has a computed name (a prop or a question), registered by hand. */
const HOSTS = [
  "app/_components/HomeLocationGate.tsx",
  "app/_components/NotSureCourtGuide.tsx",
  "app/builder/_components/StoryEditor.tsx",
  "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "app/builder/_components/GuidedFormChat.tsx",
];

let failures = 0;
function check(name: string, problems: string[]) {
  if (problems.length === 0) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${name}`);
  for (const problem of problems) {
    console.log(`       ${problem}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:story-guidance::${name}: ${problem.replace(/\n/g, " ")}`);
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(full);
  }
  return out;
}

/** Opening tags of every <textarea>, read with braces and quotes respected (an arrow's ">" is not the end). */
function textareaTags(source: string): { tag: string; line: number }[] {
  const tags: { tag: string; line: number }[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf("<textarea", from);
    if (start < 0) return tags;
    let depth = 0;
    let quote: string | null = null;
    let end = start + "<textarea".length;
    for (; end < source.length; end++) {
      const c = source[end];
      if (quote) {
        if (c === "\\") end++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    tags.push({ tag: source.slice(start, end + 1), line: source.slice(0, start).split("\n").length });
    from = end + 1;
  }
}

/** The value of one attribute in a tag, raw (quotes or braces included), or null. */
function attribute(tag: string, name: string): string | null {
  const at = tag.search(new RegExp(`\\s${name}=`));
  if (at < 0) return null;
  const i = tag.indexOf("=", at) + 1;
  const open = tag[i];
  if (open === '"') return tag.slice(i, tag.indexOf('"', i + 1) + 1);
  if (open !== "{") return null;
  let depth = 0;
  for (let j = i; j < tag.length; j++) {
    if (tag[j] === "{") depth++;
    else if (tag[j] === "}" && --depth === 0) return tag.slice(i, j + 1);
  }
  return null;
}

/** The ids each <StoryGuidance id=...> in a file renders, as written ("x" or the template's text). */
function guidanceIds(source: string): string[] {
  return [...source.matchAll(/<StoryGuidance\s+id=(?:"([^"]+)"|\{`([^`]+)`\})/g)].map((m) => m[1] ?? m[2]);
}

const STORY_WORDS = /what happened|\bstory\b/i;
/**
 * Words that tell a person what to put in their story: the kind of text the shared constant now owns.
 * Not "tell us what happened": that is the box's name (its label), not guidance on what to write.
 */
const GUIDANCE_WORDS = /\b(share|describe|include|list)\b[^"<>{}]{0,80}\b(what happened|main events|people involved|who was involved|in your own words below)\b/i;

const constantFile = "src/lib/case-system/copy/storyGuidance.ts";
const constantSource = (() => { try { return read(constantFile); } catch { return ""; } })();
const constantMatch = constantSource.match(/export const STORY_GUIDANCE\s*=\s*\n?\s*"([^"]+)"/);
const constantText = constantMatch?.[1] ?? "";

check("1. one constant holds the story guidance, and it keeps the privacy line", (() => {
  const problems: string[] = [];
  if (!constantText) return [`${constantFile} does not export STORY_GUIDANCE as one string`];
  if (!/social insurance number/i.test(constantText) || !/bank or card numbers/i.test(constantText)) problems.push("STORY_GUIDANCE no longer asks people not to include a social insurance number, or bank or card numbers");
  const component = (() => { try { return read("app/_components/StoryGuidance.tsx"); } catch { return ""; } })();
  if (!/\{STORY_GUIDANCE\}/.test(component)) problems.push("app/_components/StoryGuidance.tsx does not render STORY_GUIDANCE");
  // A copy elsewhere: any file holding the constant's first clause.
  const firstClause = constantText.split(/[,.]/)[0] + ",";
  for (const file of [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "src"))].map(rel)) {
    if (file === constantFile) continue;
    if (read(file).includes(firstClause) || read(file).includes(constantText.slice(40, 120))) problems.push(`${file} carries its own copy of the story guidance`);
  }
  return problems;
})());

const appFiles = walk(path.join(ROOT, "app")).map(rel);
type Box = { file: string; line: number; tag: string };
const boxes: Box[] = [];
const hostsWithBox = new Set<string>();
for (const file of appFiles) {
  const source = read(file);
  for (const { tag, line } of textareaTags(source)) {
    const named = [attribute(tag, "aria-label"), attribute(tag, "placeholder")].some((value) => value && STORY_WORDS.test(value));
    const describedByGuidance = guidanceIds(source).some((id) => (attribute(tag, "aria-describedby") ?? "").includes(id));
    // In a host, the box tied to its guidance is the story box; elsewhere, a box that names a story.
    if (named || (HOSTS.includes(file) && describedByGuidance)) {
      boxes.push({ file, line, tag });
      if (HOSTS.includes(file)) hostsWithBox.add(file);
    }
  }
}

check("2a. every registered host still has a story box tied to the shared guidance", HOSTS.filter((file) => !hostsWithBox.has(file)).map((file) => {
  let source = "";
  try { source = read(file); } catch { return `${file}: no such file (remove it from HOSTS if the box moved)`; }
  return /import StoryGuidance/.test(source)
    ? `${file}: imports StoryGuidance but no <textarea> points at it with aria-describedby`
    : `${file}: no story box shows the shared guidance (no StoryGuidance imported)`;
}));

check("2b. every story box points at a rendered <StoryGuidance> (aria-describedby)", boxes.flatMap(({ file, line, tag }) => {
  const source = read(file);
  const ids = guidanceIds(source);
  const describedBy = attribute(tag, "aria-describedby") ?? "";
  if (!/import StoryGuidance/.test(source)) return [`${file}:${line}: story box, but the file does not import StoryGuidance`];
  return ids.some((id) => describedBy.includes(id)) ? [] : [`${file}:${line}: story box not described by a <StoryGuidance id> in the same file (aria-describedby=${describedBy || "none"})`];
}));

check("3. no story box carries guidance of its own in a placeholder", boxes.flatMap(({ file, line, tag }) => {
  const placeholder = attribute(tag, "placeholder");
  if (!placeholder) return [];
  const literals = [...placeholder.matchAll(/"([^"]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2]);

  return [...new Set(literals)].filter((text) => STORY_WORDS.test(text) || GUIDANCE_WORDS.test(text) || /own words|events|people involved/i.test(text)).map((text) => `${file}:${line}: placeholder "${text}"`);
}));

check("4. no story-box host carries story guidance of its own", [...new Set(boxes.map((box) => box.file))].flatMap((file) => {
  const lines = read(file).split("\n");
  return lines.flatMap((text, index) => {
    const code = text.replace(/^\s*(\/\/|\*|\/\*|\{\/\*).*$/, ""); // comments explain history; they are not shown
    return GUIDANCE_WORDS.test(code) ? [`${file}:${index + 1}: ${code.trim().slice(0, 140)}`] : [];
  });
}));

check("5. every one-at-a-time question that takes the story is marked story: true", (() => {
  const source = read("app/builder/_components/guidedFields.ts");
  const problems: string[] = [];
  const facts = [...source.matchAll(/\{\s*key: "facts",[\s\S]*?\n\s{4}\}/g)];
  if (facts.length === 0) problems.push("guidedFields.ts: no question with key \"facts\" found (the check needs updating if the story question moved)");
  for (const match of facts) {
    if (!/\bstory: true\b/.test(match[0])) problems.push(`guidedFields.ts:${source.slice(0, match.index).split("\n").length}: the story question is not marked story: true`);
  }
  return problems;
})());

/** Three-word runs of the guidance's first clause ("tell us what", "in your own", ...). */
const wordsOf = (text: string) => text.toLowerCase().match(/[a-z’']+/g) ?? [];
const firstClauseWords = wordsOf(constantText.split(/[,.]/)[0] ?? "");
const openingRuns = firstClauseWords.slice(0, -2).map((_, i) => firstClauseWords.slice(i, i + 3).join(" "));
const repeatsOpening = (text: string) => openingRuns.find((run) => ` ${wordsOf(text).join(" ")} `.includes(` ${run} `)) ?? null;
const storyLabel = constantSource.match(/export const STORY_LABEL\s*=\s*"([^"]+)"/)?.[1] ?? "";

/** The text that names each story box: its aria-label, the visible label text by its guidance, and the story questions. */
const GUIDED_FIELDS = "app/builder/_components/guidedFields.ts";
const guidedSource = read(GUIDED_FIELDS);
const factsEntries = [...guidedSource.matchAll(/\{\s*key: "facts",[\s\S]*?\n\s{4}\}/g)].map((m) => ({ text: m[0], line: guidedSource.slice(0, m.index).split("\n").length }));
const names: { where: string; text: string }[] = [];
for (const { file, line, tag } of boxes) {
  for (const m of (attribute(tag, "aria-label") ?? "").matchAll(/"([^"]*)"|`([^`]*)`/g)) names.push({ where: `${file}:${line} aria-label`, text: m[1] ?? m[2] });
}
for (const file of HOSTS) {
  const lines = read(file).split("\n");
  lines.forEach((text, index) => {
    if (!/<StoryGuidance\s/.test(text)) return;
    for (const m of text.matchAll(/>([^<>{}]+)</g)) names.push({ where: `${file}:${index + 1} label`, text: m[1] });
    const before = (lines[index - 1] ?? "").trim();
    if (before && !/[<>{}]/.test(before)) names.push({ where: `${file}:${index} label`, text: before });
  });
}
for (const { text, line } of factsEntries) {
  for (const m of text.matchAll(/\b(label|question): "([^"]*)"/g)) names.push({ where: `${GUIDED_FIELDS}:${line} ${m[1]}`, text: m[2] });
}

check("6. no story box's label, question or accessible name repeats the guidance's opening words", (() => {
  if (openingRuns.length === 0) return ["could not read the guidance's first clause"];
  const problems: string[] = [];
  if (storyLabel && repeatsOpening(storyLabel)) problems.push(`STORY_LABEL "${storyLabel}" repeats "${repeatsOpening(storyLabel)}"`);
  for (const { where, text } of names) {
    const run = repeatsOpening(text);
    if (run) problems.push(`${where}: "${text.trim()}" repeats the guidance's opening words ("${run}")`);
  }
  return problems;
})());

check("7. the boxes named for the story take their name from the shared STORY_LABEL", (() => {
  if (!storyLabel) return [`${constantFile} does not export STORY_LABEL as one string`];
  const problems: string[] = [];
  const home = read("app/_components/HomeLocationGate.tsx");
  const homeBox = textareaTags(home).find(({ tag }) => /home-story-guidance/.test(tag));
  if (!homeBox || attribute(homeBox.tag, "aria-label") !== "{STORY_LABEL}") problems.push("HomeLocationGate.tsx: the story box's aria-label is not {STORY_LABEL}");
  if (!/>\{STORY_LABEL\}<\/span><StoryGuidance id="home-story-guidance"/.test(home)) problems.push("HomeLocationGate.tsx: the visible label above the guidance is not {STORY_LABEL}");
  const chat = read("app/builder/_components/GuidedSmallClaimsIntake.tsx");
  const chatBox = textareaTags(chat).find(({ tag }) => /guided-story-guidance/.test(tag));
  if (!chatBox || !/:\s*STORY_LABEL\s*\}$/.test(attribute(chatBox.tag, "aria-label") ?? "")) problems.push("GuidedSmallClaimsIntake.tsx: the story box's aria-label is not STORY_LABEL");
  for (const { text, line } of factsEntries) {
    if (!/\blabel: STORY_LABEL\b/.test(text) || !/\bquestion: STORY_LABEL\b/.test(text)) problems.push(`${GUIDED_FIELDS}:${line}: the story question's label and question are not STORY_LABEL`);
  }
  return problems;
})());

console.log(`\n${boxes.length} story boxes found: ${boxes.map((box) => `${box.file}:${box.line}`).join(", ")}`);
if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll story-guidance checks passed.");
