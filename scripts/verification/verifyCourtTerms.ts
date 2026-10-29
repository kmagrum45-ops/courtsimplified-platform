/**
 * THE COURT'S OWN WORDS: THE OLD WORDING NEVER COMES BACK (Jason, 2026-10-24).
 *
 * Fails if any text a person can see (pages, components, content, the stage map, claim
 * types, the chat's templates and the strategy prompt) uses a term Jason ruled out:
 *   - "Civil Court"            -> "Superior Court of Justice" once known, "civil court" before
 *   - a generic "Family Court" -> "family court" (the statutory Family Court, which the law
 *                                 names, is kept where it is meant: "the Family Court",
 *                                 "Family Court branch", "Family Court of the Superior Court")
 *   - "Conference / settlement step", "Conference / case management",
 *     "Settlement Conference preparation tools"
 *   - the case file's "Court date" label  -> "Next court date"
 *   - "lawsuit"                -> "claim" in Small Claims, "action" in the Superior Court,
 *                                 with "(lawsuit)" beside "action" (words a person might type,
 *                                 read by the matchers, are not text shown and are allowed)
 *   - plaintiff/defendant in the Family strategy questions and the Kerr v. Baranow family
 *     claim type -> applicant/respondent
 * and that the passed-deadline card's Form 18B sentence is hidden at the screen level.
 *
 * Failure it exists to catch: a wrong court name or term creeping back after the 2026-10-24
 * sweep, which nobody would notice until a walkthrough.
 */
import fs from "node:fs";
import path from "node:path";
import { strategyQuestions } from "../../src/lib/case-system/retrieval/strategy";
import { courtWords, withoutSentencesNaming } from "../../app/builder/_components/StageAnswerPanel";
import { findStage, pathwayOf, stagesForPathway } from "../../src/lib/case-system/stage-map/stageMap";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const ROOTS = ["app", "src/lib/content-library", "src/lib/case-system"];
const SKIP_DIRS = new Set(["node_modules", ".next"]);
function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else if (/\.(tsx?|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** The file without comments, line numbers kept. */
function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (match, lead) => lead + " ".repeat(match.length - lead.length));
}

/** Model prompts and matchers: words a person may write, never shown to them. */
const NOT_SHOWN_FILES = /intake[\\/]caseReader\.ts$|courtPathClassifier\.ts$|guided-assistant[\\/]conversationIntelligenceEngine\.ts$|[\\/]events[\\/]stepEvent\.ts$|casePosition\.ts$|storyAnswers\.ts$|StageAnswerPanel\.tsx$/;
/** A line that is a matcher: a regular expression, or an entry of a list of phrases a person might write. */
function isMatcherLine(lines: string[], index: number): boolean {
  const line = lines[index];
  if (/\/\\b|new RegExp|\.test\(/.test(line)) return true;
  // A source's own words, quoted verbatim, are never changed.
  if (/^\s*"(?:quote|pinpoint)":/.test(line)) return true;
  if (!/^\s*"[^"]*",?\s*$/.test(line)) return false;
  for (let back = index - 1; back >= 0 && back > index - 400; back -= 1) {
    if (/^\s*\]/.test(lines[back])) return false;
    const key = /"?(\w+)"?\s*:\s*\[\s*$/.exec(lines[back]);
    if (key) return /^(signals|cues|keywords|phrases|examples|triggers|patterns|also)$/.test(key[1].replace(/"/g, ""));
  }
  return false;
}

const BANNED: { name: string; pattern: RegExp; allow?: RegExp }[] = [
  { name: "\"Civil Court\" (say the Superior Court of Justice, or civil court before the court is known)", pattern: /\bCivil Court\b/ },
  // "Guided Pathways to Family Court Forms" is the name of Ontario's own service, kept as it is.
  { name: "a generic \"Family Court\" (say family court; the statutory Family Court is named only where meant)", pattern: /\bOntario Family Court\b|\bFamily Court (?:matter|intake|Forms|forms|parenting|resources)\b|What Family Court covers|^\s*Family Court\s*$/, allow: /Guided Pathways to Family Court Forms/ },
  { name: "\"Conference / settlement step\"", pattern: /Conference \/ settlement step/ },
  { name: "\"Conference / case management\" (say Pre-trial conference or case management)", pattern: /Conference \/ case management/ },
  { name: "\"Settlement Conference preparation tools\"", pattern: /Settlement Conference preparation tools/ },
  { name: "the case file's \"Court date\" label (say Next court date)", pattern: /courtDate:\s*"Court date"/ },
  { name: "\"lawsuit\" (claim in Small Claims; action, with (lawsuit) beside it, in the Superior Court)", pattern: /\blawsuits?\b/i, allow: /action \(lawsuit\)/i },
];

const found: Record<string, string[]> = {};
for (const root of ROOTS) {
  for (const file of files(root)) {
    const lines = withoutComments(fs.readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      for (const rule of BANNED) {
        if (!rule.pattern.test(line)) continue;
        if (rule.allow && rule.allow.test(line)) continue;
        if (rule.name.startsWith("\"lawsuit\"") && (NOT_SHOWN_FILES.test(file) || isMatcherLine(lines, index))) continue;
        // A stage-map deadline's qualifier is mirrored in the published library, so it is not edited
        // by hand either: it is checked as it is shown (courtWords), below.
        if (rule.name.startsWith("\"lawsuit\"") && /stage-map[\\/]stageMap\.ts$/.test(file) && /qualifier|^\s*"/.test(line)) continue;
        // The published library is never edited by hand: it is checked as it is shown, below.
        if (rule.name.startsWith("\"lawsuit\"") && /published[\\/]stageAnswers\.published\.json$/.test(file)) continue;
        // Generated placings of checked quotes: each entry is a section number or a guide's own
        // heading, verbatim ("what happened that led to the lawsuit"), like a "pinpoint" line above.
        if (rule.name.startsWith("\"lawsuit\"") && /published[\\/]quotePinpoints\.generated\.json$/.test(file)) continue;
        (found[rule.name] ??= []).push(`${file}:${index + 1}: ${line.trim().slice(0, 140)}`);
      }
    });
  }
}
for (const rule of BANNED) check(`no ${rule.name}`, !found[rule.name], (found[rule.name] ?? []).slice(0, 8).join("\n      "));

// Family's own words in the strategy questions and the Kerr v. Baranow claim type.
for (const side of ["plaintiff", "defendant"] as const) {
  const text = strategyQuestions(side, "family").map((seat) => seat.question).join(" ");
  check(`Family strategy questions (${side === "plaintiff" ? "applicant" : "respondent"}) say applicant and respondent, never plaintiff or defendant`, !/\bplaintiff|\bdefendant|\bbeing sued\b/i.test(text.replace(/never plaintiff or defendant/i, "")), text.slice(0, 200));
}
const familyClaims = withoutComments(fs.readFileSync("src/lib/case-system/intake/moreClaimTypes/family-1.ts", "utf8"));
const kerr = familyClaims.slice(familyClaims.indexOf("unjust-enrichment-elements-commonlawproperty"), familyClaims.indexOf("these are not a checklist (para. 89)."));
check("the Kerr v. Baranow family claim type says applicant and respondent", kerr.length > 0 && !/\bthe (?:plaintiff|defendant)\b/i.test(kerr));
check("its evidence lines say the law is the Court's, not the site's", (kerr.match(/why: "/g) ?? []).length > 0 && (kerr.match(/why: "In Kerr v\. Baranow/g) ?? []).length === (kerr.match(/why: "/g) ?? []).length);

// The published library, as the step page shows it (courtWords): no bare "lawsuit" left.
{
  const published = JSON.parse(fs.readFileSync("src/lib/content-library/published/stageAnswers.published.json", "utf8")) as unknown;
  const shownBadly: string[] = [];
  const walk = (value: unknown, stageId: string) => {
    if (typeof value === "string") {
      const court = findStage(stageId) ? pathwayOf(findStage(stageId)!) : "small-claims";
      const shown = courtWords(value, court);
      if (/\blawsuits?\b/i.test(shown.replace(/action \(lawsuit\)/gi, ""))) shownBadly.push(`${stageId}: ${shown.slice(0, 120)}`);
      return;
    }
    if (Array.isArray(value)) { for (const item of value) walk(item, stageId); return; }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const id = typeof record.stageId === "string" ? record.stageId : stageId;
      for (const item of Object.values(record)) walk(item, id);
    }
  };
  walk(published, "");
  check("the published library, as shown, says claim in Small Claims and action (lawsuit) in the Superior Court", shownBadly.length === 0, shownBadly.slice(0, 5).join("\n      "));
  const qualifiers = stagesForPathway("small-claims").concat(stagesForPathway("civil")).flatMap((stage) => stage.deadlines.map((deadline) => ({ id: stage.id, court: pathwayOf(stage), text: (deadline as { qualifier?: string }).qualifier ?? "" })));
  const badQualifiers = qualifiers.filter((item) => /\blawsuits?\b/i.test(courtWords(item.text, item.court).replace(/action \(lawsuit\)/gi, "")));
  check("every stage-map deadline qualifier, as shown, uses the court's word", badQualifiers.length === 0, badQualifiers.map((item) => item.id).join(", "));
  check("Small Claims: \"start the lawsuit\" is shown as \"start the claim\"", courtWords("You can still start the lawsuit.", "small-claims") === "You can still start the claim.");
  check("Superior Court: the first mention reads action (lawsuit), later ones action", courtWords("Start the lawsuit. Then the lawsuit goes on.", "civil") === "Start the action (lawsuit). Then the action goes on.");
  check("Superior Court: \"a lawsuit\" and \"someone else's lawsuit\" read as an action", courtWords("A defendant in someone else's lawsuit filed a lawsuit.", "civil") === "A defendant in someone else's action (lawsuit) filed an action.");
}

// The passed-deadline card: the Form 18B sentence is hidden at the screen level.
const paragraph = "Your defence must briefly state the key facts. You may first deliver a notice of intent to defend (Form 18B) within the time for your defence. If you do, you get 10 more days to deliver the defence.";
const shown = withoutSentencesNaming(paragraph, /\bForm 18B\b|\bnotice of intent to defend\b/i);
check("the passed-deadline card leaves out the sentence about Form 18B, and keeps the rest as written", !/Form 18B/.test(shown) && shown.startsWith("Your defence must briefly state the key facts."), shown);

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS court terms: the court's own words, and none of the old wording, on every screen");
