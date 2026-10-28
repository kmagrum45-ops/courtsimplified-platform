/**
 * THE SITE MAP'S "WHO READS WHAT" PART, GENERATED FROM THE CODE (SITE_MAP.md).
 *
 * For each shared piece listed below, it reads every import in app/, src/ and scripts/ and
 * writes, between the markers in SITE_MAP.md: what the piece reads (its imports inside the
 * repo) and what reads it (the screens, routes and modules that import it, and the suites
 * that check it). Written by this script only, so it cannot drift from the code.
 *
 *   npm run docs:site-map     rewrite the generated part
 *   npm run test:site-map     fail (CI) when the generated part is out of date
 *
 * Adding a shared piece: add it to SHARED with one line saying what it owns, run
 * docs:site-map, and describe it in the written part of SITE_MAP.md.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const MAP = path.join(ROOT, "SITE_MAP.md");
const START = "<!-- generated:who-reads-what:start (npm run docs:site-map; do not edit by hand) -->";
const END = "<!-- generated:who-reads-what:end -->";

/** The shared pieces: one place each fact the person gives is kept, read or worded. */
const SHARED: [string, string][] = [
  ["src/lib/case-system/situation/situation.ts", "The situation record: side, where the case is, papers, day served, stage picked."],
  ["src/lib/case-system/intakeStory.ts", "The one copy of the story and the location."],
  ["src/lib/case-system/storyBasis.ts", "Which version of the story each answer was given for."],
  ["src/lib/case-system/sideChange.ts", "Setting aside the old side's answers when the side changes."],
  ["src/lib/case-system/caseFile/caseFile.ts", "The case file: one slot per fact, and nextQuestion, the one rule for asking."],
  ["src/lib/case-system/caseFile/factsOfQuestion.ts", "Which fact each question asks for."],
  ["src/lib/case-system/caseFile/storyLines.ts", "What the story says that no answer holds yet, for \"What we have so far\"."],
  ["src/lib/case-system/caseFile/storyFacts.ts", "Each fact the story gives, in plain words with its sentence: the other side, losses, injury, evidence, last payment."],
  ["src/lib/case-system/copy/caseWords.ts", "The stage, the side and the papers in words, never codes."],
  ["src/lib/case-system/intelligence/answeredQuestions.ts", "Which generic questions the recorded papers and the stage already answer."],
  ["src/lib/case-system/guided-assistant/answeredInStory.ts", "Whether the chat's question is answered by the story or the case's facts."],
  ["src/lib/case-system/retrieval/citationCheck.ts", "Each citation names exactly what its quote comes from (subsection, title, year)."],
  ["src/lib/case-workspace/fileLink.ts", "Short-lived signed links that open an uploaded file under its own name."],
  ["src/lib/case-system/intakeReview.ts", "The review: entries, remaining questions, confirmation."],
  ["app/builder/_components/storyAnswers.ts", "The story readers: side, filed papers, children, dates, goal, other party."],
  ["app/builder/_components/guidedFields.ts", "The civil and Family questions and their choices."],
  ["src/lib/case-system/claimAmount.ts", "The amount offered from the story."],
  ["src/lib/case-system/format/recordedAmount.ts", "An amount typed, as a number."],
  ["src/lib/case-system/intake/claimKind.ts", "The kind of claim."],
  ["src/lib/case-system/dates.ts", "Reading and writing dates."],
  ["src/lib/case-system/sentences.ts", "Splitting text into sentences."],
  ["src/lib/case-system/copy/rawKeys.ts", "Words for stored codes, and the copy guard."],
  ["src/lib/case-system/stage-map/stageMap.ts", "The stage map: every step of each court's process."],
  ["src/lib/case-system/stage-map/stageSequence.ts", "What comes after each step."],
  ["src/lib/case-system/content-library/nextStepPractical.ts", "The next step's forms, filing and service details."],
  ["src/lib/case-system/casePosition.ts", "The saved position: the step chosen and the step page's date questions."],
  ["src/lib/case-system/caseStep.ts", "Which step a saved case is at."],
  ["src/lib/case-system/retrieval/corpusIndex.ts", "The law library: the saved official texts, searched by passage."],
  ["src/lib/case-system/retrieval/checkedAnswer.ts", "The checked answer: a legal statement passes only when official text supports it."],
  ["src/lib/content-library/publishedLibrary.ts", "The published library: the checked blocks a step page shows."],
  ["scripts/content/verifiedContentPipeline.ts", "The content pipeline: drafting, checking and publishing library blocks."],
  ["src/lib/case-system/caseRecord.ts", "The saved case read as facts (side, step, dates, amount) for the chat."],
];

const SOURCE_DIRS = ["app", "src", "scripts", "tests"];
const isCheck = (source: string) => source.startsWith("scripts/") || source.startsWith("tests/");

/** The facts each screen shows, and the shared pieces that give each one (for the screens table). */
const FACT_PIECES: [string, string[]][] = [
  ["Side", ["src/lib/case-system/situation/situation.ts", "src/lib/case-system/caseFile/caseFile.ts", "src/lib/case-system/caseRecord.ts"]],
  ["Stage", ["src/lib/case-system/stage-map/stageMap.ts", "src/lib/case-system/caseStep.ts", "src/lib/case-system/casePosition.ts", "src/lib/case-system/stage-map/stageSequence.ts", "app/builder/_components/builderTypes.ts"]],
  ["Claim kind", ["src/lib/case-system/intake/claimKind.ts", "src/lib/case-system/intake/claimTypes.ts"]],
  ["Amount", ["src/lib/case-system/claimAmount.ts", "src/lib/case-system/format/recordedAmount.ts", "src/lib/case-system/amountNotes.ts"]],
  ["Dates", ["src/lib/case-system/dates.ts", "src/lib/case-system/casePosition.ts", "src/lib/case-system/deadlines/holidays.ts", "src/lib/case-system/caseRecord.ts"]],
  ["Words", ["src/lib/case-system/copy/rawKeys.ts", "src/lib/case-system/intakeReview.ts"]],
];
const EXT = [".ts", ".tsx"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, ...EXT.map((ext) => base + ext), ...EXT.map((ext) => path.join(base, `index${ext}`))]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return rel(candidate);
  }
  return null;
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function imports(file: string): string[] {
  const text = fs.readFileSync(file, "utf8");
  const found = new Set<string>();
  for (const match of text.matchAll(IMPORT)) {
    const target = resolve(file, match[1] ?? match[2]);
    if (target) found.add(target);
  }
  return [...found];
}

export function generate(): string {
  const files = SOURCE_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const graph = new Map(files.map((file) => [rel(file), imports(file)]));
  const shared = new Set(SHARED.map(([file]) => file));
  const lines: string[] = [START, ""];
  lines.push("Generated from the imports in app/, src/, scripts/ and tests/. \"Reads\" lists the repo modules it imports (shared pieces in bold); \"Read by\" lists what imports it (screens and routes in app/, modules in src/); \"Checked by\" lists the suites and browser tests that import it.", "");
  // Which shared pieces each screen file imports directly, per fact: a screen with "—" gets that
  // fact some other way (through props, another module, or its own copy -- see "Bypasses").
  const screens = [...graph.keys()].filter((file) => file.startsWith("app/") && file.endsWith(".tsx") && !file.includes("/api/")).filter((file) => FACT_PIECES.some(([, pieces]) => pieces.some((piece) => graph.get(file)?.includes(piece)))).sort();
  lines.push("### Screens: which shared piece each imports, per fact", "");
  lines.push("The columns mean *imports*, not *shows*: a module can be imported for another reason, and a screen can get a fact through props or its own copy. Where each screen actually gets each fact is the written table \"Where each screen gets each fact\" above; this table is for checking it against the code.", "");
  lines.push(`| Screen file | ${FACT_PIECES.map(([fact]) => fact).join(" | ")} |`, `|---|${FACT_PIECES.map(() => "---").join("|")}|`);
  for (const screen of screens) {
    const cells = FACT_PIECES.map(([, pieces]) => pieces.filter((piece) => graph.get(screen)?.includes(piece)).map((piece) => path.basename(piece, path.extname(piece))).join(", ") || "—");
    lines.push(`| ${screen} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  for (const [file, owns] of SHARED) {
    const reads = (graph.get(file) ?? []).sort();
    const readBy = [...graph.entries()].filter(([, targets]) => targets.includes(file)).map(([source]) => source).sort();
    const code = readBy.filter((source) => !isCheck(source));
    const suites = readBy.filter(isCheck);
    const name = (target: string) => (shared.has(target) ? `**${target}**` : target);
    lines.push(`### ${file}`, "", owns, "");
    lines.push(`- Reads (${reads.length}): ${reads.length ? reads.map(name).join(", ") : "nothing in the repo"}`);
    lines.push(`- Read by (${code.length}): ${code.length ? code.map(name).join(", ") : "nothing"}`);
    lines.push(`- Checked by (${suites.length}): ${suites.length ? suites.join(", ") : "no suite imports it directly"}`, "");
  }
  lines.push(END);
  return lines.join("\n");
}

function currentPart(text: string): string | null {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  return start >= 0 && end > start ? text.slice(start, end + END.length) : null;
}

function main() {
  const text = fs.readFileSync(MAP, "utf8").replace(/\r\n/g, "\n");
  const part = currentPart(text);
  if (!part) throw new Error(`SITE_MAP.md has no generated part: add the two markers.\n${START}\n${END}`);
  const fresh = generate();
  if (process.argv.includes("--check")) {
    if (part !== fresh) {
      console.error("FAIL  SITE_MAP.md's \"who reads what\" part is out of date with the code. Run: npm run docs:site-map, and check the written part still matches.");
      process.exit(1);
    }
    console.log("PASS  SITE_MAP.md's \"who reads what\" part matches the code");
    return;
  }
  fs.writeFileSync(MAP, text.replace(part, fresh));
  console.log(`SITE_MAP.md: "who reads what" rewritten for ${SHARED.length} shared pieces`);
}

main();
