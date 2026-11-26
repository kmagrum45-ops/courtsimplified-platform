/**
 * WHAT THE CONSERVATIVE NAME FALLBACK HIDES ACROSS THE STORY PACK (site owner, 25 Nov 2026: "show the false positives
 * across the story pack and the allowlist you used").
 *
 * Reads every story text of the browser story pack (story-pack.spec.ts, storyPackMore.ts, ask-once-pages.spec.ts and,
 * when present, the journey matrix's stories), runs the fallback (src/lib/case-system/privacy/nameFallback.ts) on each,
 * and lists every stretch it hides, once, with how many stories hold it and whether the other-side reader (storyNames)
 * found it too. A reader then marks each one a person's name, a business, or a false positive. Prints the allowlist used.
 *
 * Usage: node --import tsx scripts/privacy/nameFallbackReport.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { FALLBACK_ALLOWLIST, fallbackNames } from "../../src/lib/case-system/privacy/nameFallback";
import { storyNames } from "../../src/lib/security/requestNames";

const FILES = ["tests/browser/story-pack.spec.ts", "tests/browser/storyPackMore.ts", "tests/browser/ask-once-pages.spec.ts", "tests/browser/matrix/matrixStories.ts"];

/** Every string literal of 40 characters or more that reads like a sentence: the stories. */
function storiesIn(file: string): string[] {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const match of text.matchAll(/"((?:[^"\\\n]|\\.){40,})"|`((?:[^`\\\n$]|\\.){40,})`/g)) {
    const story = (match[1] ?? match[2] ?? "").replace(/\\"/g, '"').replace(/^Synthetic:\s*/, "");
    if (/[.!?]/.test(story) && / [a-z]+ /.test(story) && !/^[\w./-]+\.(?:ts|tsx|json)$/.test(story)) out.push(story);
  }
  return out;
}

const stories = [...new Set(FILES.flatMap(storiesIn))];
const hidden = new Map<string, { count: number; byPatterns: boolean; example: string }>();
for (const story of stories) {
  const patterns = storyNames(story);
  for (const name of fallbackNames(story)) {
    const entry = hidden.get(name) ?? { count: 0, byPatterns: false, example: story.slice(0, 110) };
    entry.count += 1;
    entry.byPatterns ||= patterns.some((found) => found.includes(name) || name.includes(found));
    hidden.set(name, entry);
  }
}

console.log(`Stories read: ${stories.length} (from ${FILES.filter(existsSync).join(", ")})`);
console.log(`Stretches the fallback hides: ${hidden.size}\n`);
console.log("| Hidden | Stories | Found by the other-side reader too | First seen in |");
console.log("|---|---|---|---|");
for (const [name, entry] of [...hidden].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`| ${name} | ${entry.count} | ${entry.byPatterns ? "yes" : "no"} | ${entry.example.replace(/\|/g, "/")}… |`);
}
console.log("\nAllowlist (a stretch holding any of these words is not hidden):");
for (const [group, words] of Object.entries(FALLBACK_ALLOWLIST)) console.log(`- ${group} (${words.length}): ${words.join(", ")}`);
