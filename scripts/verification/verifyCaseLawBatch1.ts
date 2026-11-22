/**
 * THE CASE LAW MAP, BATCH 1 (OWNER, 2026-11-22): STORED WORD FOR WORD, CHECKED, AND SHOWN TO NO ONE.
 *
 * Checks src/lib/case-system/authority-intelligence/caseLawBatch1.json against the owner's file
 * docs/law-map/case-law-batch1-2026-11-22.md and the rules for these entries:
 *   - every entry's summary, cautions, topic and review notes are the owner's text, byte for byte, and the store is
 *     exactly what the build step makes from that file (no hand edits, no stale check results);
 *   - every entry "needs review" with confirmed_at empty; the review record of every entry can be read back;
 *   - caseLawDisplay(), the only way an entry could be shown, shows none today, and can never show a summary without
 *     its cautions, a source label and a link, or show an entry that is hidden_until_checked, stopped by a prediction
 *     check, not in use, or not filed under that court;
 *   - a decision whose CanLII check has not passed is hidden_until_checked;
 *   - the outcome and case-strength checks are re-run unloosened, and an entry they refuse is out of use;
 *   - each entry is filed under every court it lists, and no other (one check per entry per court);
 *   - no render path: nothing outside the registry folder imports the batch, the entries are not in the seed list the
 *     AI reads, they are not servable library content, and as registry entries they may not be shown or used;
 *   - CanLII: the check script calls only the site's API client (no fetch, no canlii.org page); with no key it changes
 *     nothing; no decision text is stored; links go only to allowed domains, others are held;
 *   - user-facing text states none of the wrong statements the owner listed (rule 7);
 *   - nothing cites the Ontario Annual Practice.
 *
 * WHAT FAILURE THIS CATCHES: approved wording drifting from the owner's file; an entry reaching a user before its review
 * is saved or its citation is checked; a caution separated from its summary; a check loosened to let an entry through;
 * a review date typed in; a page fetched from CanLII.
 *
 * Run: npm run test:case-law-batch1
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readCaseLawFixture, NO_CAUTION } from "../content/caseLawFixture";
import { buildCaseLawBatch } from "../content/buildCaseLawBatch1";
import { linkAllowed, predictionCheck, SAVED_DECISIONS } from "../content/caseLawChecks";
import { RULE_PHRASES_NOT_PREDICTIONS } from "../content/verifiedContentPipeline";
import {
  CASE_LAW_BATCH1,
  caseLawBatch1AuthorityEntries,
  caseLawDisplay,
  caseLawEntriesForCourt,
  caseLawReviewRecords,
  caseLawText,
  type CaseLawBatch,
} from "../../src/lib/case-system/authority-intelligence/caseLawBatch1";
import { VERIFIED_AUTHORITY_SEED_ENTRIES } from "../../src/lib/case-system/authority-intelligence/verifiedAuthoritySeedRegistry";
import { checkUserContent } from "../../src/lib/content-library/outputGuard";
import { canliiEnabled } from "../../src/lib/canlii/canliiCore";
import type { CaseCourtPath } from "../../src/lib/case-system/architecture/masterCaseSchema";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let passes = 0;
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
};

const fixture = readCaseLawFixture();
const store = CASE_LAW_BATCH1;
const COURTS = ["small-claims", "civil", "family"] as const;

// 1. The owner's wording, byte for byte.
check("the owner's file has 25 entries, E01 to E25", fixture.length === 25 && fixture.every((e, i) => e.number === `E${String(i + 1).padStart(2, "0")}`));
check("the store has the same 25 entries in the same order", JSON.stringify(store.entries.map((e) => [e.number, e.id])) === JSON.stringify(fixture.map((e) => [e.number, e.slug])));
for (const { number, slug, fields } of fixture) {
  const entry = store.entries.find((e) => e.id === slug);
  if (!entry) continue;
  check(`${number} summary is the owner's, byte for byte`, caseLawText(entry.summaryTextId) === fields.summary);
  check(`${number} topic is the owner's, byte for byte`, caseLawText(entry.topicTextId) === fields.topic);
  check(`${number} owner_check_notes are the owner's review notes as supplied`, entry.review.owner_check_notes === fields.review);
  check(`${number} cautions as given are the owner's`, entry.cautionsAsGiven === fields.cautions);
  if (NO_CAUTION.test(fields.cautions)) {
    check(`${number} has no caution of its own, so none is stored`, entry.cautionsTextId === null);
  } else {
    check(`${number} cautions are the owner's, byte for byte`, Boolean(entry.cautionsTextId) && caseLawText(entry.cautionsTextId ?? "") === fields.cautions);
  }
}
const rebuilt = buildCaseLawBatch(store);
check("the store is exactly what the build step makes from the owner's file (npm run content:build-case-law)", JSON.stringify(rebuilt) === JSON.stringify(store));

// 2. The review record.
for (const entry of store.entries) {
  check(`${entry.number} status is "needs review"`, entry.review.status === "needs review");
  check(`${entry.number} confirmed_at is empty (set only by the owner's saved review)`, entry.review.confirmed_at === null);
}
const records = caseLawReviewRecords();
check("the review record of every entry can be read back", records.length === 25 && records.every((r) => r.reviewer && r.owner_check_notes && r.status === "needs review"));
const newFiles = [
  "src/lib/case-system/authority-intelligence/caseLawBatch1.ts",
  "src/lib/case-system/authority-intelligence/caseLawBatch1.json",
  "scripts/content/buildCaseLawBatch1.ts",
  "scripts/content/caseLawChecks.ts",
  "scripts/sources/checkCaseLawCitations.ts",
].map((f) => readFileSync(path.join(ROOT, f), "utf8"));
check(
  "nothing describes an entry as reviewed or approved by a lawyer or paralegal, or as proof for the Law Society",
  newFiles.every((t) => !/(reviewed|approved) by a (lawyer|paralegal|licensee)|proof of human review/i.test(t)),
);

// 3. The one display path: nothing today, and never without cautions, a source label and a link.
check("no entry can be shown today, in any court", store.entries.every((e) => COURTS.every((c) => caseLawDisplay(e.id, c) === null)));
const ready = (mutate: (batch: CaseLawBatch) => void = () => {}): CaseLawBatch => {
  const copy = JSON.parse(JSON.stringify(store)) as CaseLawBatch;
  for (const e of copy.entries) {
    e.review = { ...e.review, status: "reviewed", confirmed_at: "2099-01-01T00:00:00Z" };
    e.hidden_until_checked = false;
    e.stoppedByPredictionCheck = null;
    e.inUse = true;
  }
  mutate(copy);
  return copy;
};
{
  const all = ready();
  for (const e of all.entries) {
    const shown = caseLawDisplay(e.id, e.courts[0], all);
    check(`${e.number} once cleared, shows with its source label and link`, Boolean(shown?.sourceLabel && shown.link));
    check(
      `${e.number} once cleared, shows its cautions exactly when it has any`,
      shown !== null && (e.cautionsTextId ? shown.cautions === caseLawText(e.cautionsTextId, all) : shown.cautions === null),
    );
  }
  const first = all.entries.find((e) => e.cautionsTextId)!;
  const gate = (name: string, mutate: (b: CaseLawBatch, e: CaseLawBatch["entries"][number]) => void, court: CaseCourtPath = first.courts[0]) => {
    const batch = ready((b) => mutate(b, b.entries.find((x) => x.id === first.id)!));
    check(`not shown when ${name}`, caseLawDisplay(first.id, court, batch) === null);
  };
  gate("its caution text is missing", (b, e) => delete b.texts[e.cautionsTextId!]);
  gate("it has no link", (_b, e) => (e.links = []));
  gate("it has no source label", (_b, e) => ((e as { sourceLabel: string }).sourceLabel = ""));
  gate("it is hidden_until_checked", (_b, e) => (e.hidden_until_checked = true));
  gate("a prediction check stopped it", (_b, e) => (e.stoppedByPredictionCheck = { field: "summary", phrase: "x", rule: "x" }));
  gate("it is not in use", (_b, e) => (e.inUse = false));
  gate("its review is not saved", (_b, e) => (e.review.confirmed_at = null));
  gate("the court is not one it lists", () => {}, COURTS.find((c) => !(first.courts as string[]).includes(c)) ?? "tribunal");
}

// 4. CanLII check and hidden_until_checked.
for (const e of store.entries) {
  if (e.kind === "case-law") check(`${e.number} is hidden_until_checked unless its CanLII check passed`, e.hidden_until_checked === (e.canliiCheck.status !== "pass"));
  else check(`${e.number} (statute or rule) has no CanLII check`, e.canliiCheck.status === "not applicable");
  if (e.canliiCheck.status === "pass") check(`${e.number} passed with a date and CanLII's link`, Boolean(e.canliiCheck.checkedOn && e.canliiCheck.url?.startsWith("https://canlii.ca/")));
}

// 5. The outcome and case-strength checks, not loosened.
check("the exempt rule phrases are unchanged (nothing added for these entries)", JSON.stringify(RULE_PHRASES_NOT_PREDICTIONS) === JSON.stringify(["not likely to be disputed"]));
for (const e of store.entries) {
  const texts = [e.topicTextId, e.summaryTextId, e.cautionsTextId].filter(Boolean).map((id) => caseLawText(id!));
  const refused = texts.some((t) => predictionCheck(t));
  check(`${e.number} is marked stopped exactly when a check refuses its wording`, refused === Boolean(e.stoppedByPredictionCheck));
  check(`${e.number} is not in use`, e.inUse === false);
}

// 6. Filed under every court it lists, and no other.
for (const e of store.entries) {
  for (const court of COURTS) {
    const listed = (e.courts as string[]).includes(court);
    const found = caseLawEntriesForCourt(court).some((x) => x.id === e.id);
    check(`${e.number} ${listed ? "is" : "is not"} filed under ${court}`, found === listed);
  }
}

// 7. No render path.
const importers = execFileSync("git", ["grep", "-l", "caseLawBatch1", "--", "src", "app"], { cwd: ROOT, encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
const allowed = new Set([
  "src/lib/case-system/authority-intelligence/caseLawBatch1.ts",
  "src/lib/case-system/authority-intelligence/authorityRegistryArchitecture.ts",
]);
check("nothing in the site imports the batch (no render path)", importers.every((f) => allowed.has(f)), importers.join(", "));
check("the entries are not in the seed list the AI reads", !VERIFIED_AUTHORITY_SEED_ENTRIES.some((e) => e.approvedRecord || e.id.startsWith("authority_case_law_map_")));
const asRegistry = caseLawBatch1AuthorityEntries();
check(
  "as registry entries, none may be displayed, shown, or used for reasoning or drafting",
  asRegistry.length === 25 &&
    asRegistry.every((e) => e.displayMode === "do-not-display" && e.verificationStatus === "needs-review" && !e.aiUseRules.canShowToUser && !e.aiUseRules.canUseForReasoning && !e.aiUseRules.canUseForDrafting),
);
check("as registry entries, they carry no wording but the owner's", asRegistry.every((e) => !e.corePrinciple && !e.plainLanguageSummary && !e.legalTestSummary && e.legalTestElements.length === 0));
check("no summary is servable library content", store.entries.every((e) => !checkUserContent(caseLawText(e.summaryTextId)).allowed));

// 8. CanLII rules.
const checker = readFileSync(path.join(ROOT, "scripts/sources/checkCaseLawCitations.ts"), "utf8");
check("the CanLII check script calls only the site's API client (no fetch)", !/\bfetch\(/.test(checker) && /api\.lookupCase\(/.test(checker) && /api\.citingCases\(/.test(checker));
check("the CanLII check script names no canlii.org page", !/(?<!api\.)canlii\.org/.test(checker));
check("with no key, CanLII is off", !canliiEnabled({}));
{
  const env = { ...process.env };
  delete env.CANLII_API_KEY;
  const before = readFileSync(path.join(ROOT, "src/lib/case-system/authority-intelligence/caseLawBatch1.json"), "utf8");
  const out = execFileSync(process.execPath, ["--import", "tsx", "scripts/sources/checkCaseLawCitations.ts"], { cwd: ROOT, env, encoding: "utf8" });
  const after = readFileSync(path.join(ROOT, "src/lib/case-system/authority-intelligence/caseLawBatch1.json"), "utf8");
  check("with no key, the check says so and changes nothing", /CANLII_API_KEY is not set/.test(out) && before === after, out);
}
check(
  "no decision text is stored: each entry holds only our summary, cautions and topic",
  Object.keys(store.texts).length === 25 * 2 + store.entries.filter((e) => e.cautionsTextId).length && Object.values(store.texts).every((t) => t.length < 1500),
);
for (const e of store.entries) {
  check(`${e.number} shows links only to allowed domains`, e.links.every((l) => linkAllowed(l.url)));
  check(`${e.number} has its own source link first`, e.kind === "case-law" ? e.links[0]?.role === "decision" && e.sourceLabel === "Source: CanLII" : e.links[0]?.url.startsWith("https://www.ontario.ca/laws/") === true);
  check(`${e.number} holds back every other link`, e.linkPendingSourceDecision.every((l) => !linkAllowed(l.url)));
}
check("E01's Canadian Judicial Council link is held for a source decision", store.entries[0].linkPendingSourceDecision.some((l) => l.url.includes("cjc-ccm.ca")));

// 9. The machine check: what it says and does not say.
for (const e of store.entries) {
  check(`${e.number} is not labelled machine-verified`, e.machineCheck.verified === false);
  const d = e.machineCheck.decisionText;
  if (SAVED_DECISIONS[e.id]) {
    check(`${e.number} every paragraph it cites is in the saved decision`, Boolean(d) && d!.paragraphsMissing.length === 0, JSON.stringify(d?.paragraphsMissing));
    check(`${e.number} every phrase it quotes is in the saved decision`, Boolean(d) && d!.quotesMissing.length === 0, JSON.stringify(d?.quotesMissing));
  }
  for (const p of e.machineCheck.statutePinpoints) check(`${e.number} ${p.corpusId} ${p.pinpoint} found in the saved text`, p.found);
}

// 10. Rule 7: user-facing text states none of the wrong statements.
const WRONG: { name: string; pattern: RegExp }[] = [
  { name: "Willick as the test for changing child support", pattern: /Willick[^.]{0,200}child support/i },
  { name: "Michel v. Graydon as Ontario law", pattern: /Michel[^.]{0,200}\bOntario\b/i },
  { name: "Small Claims Court has summary judgment", pattern: /Small Claims[^.]{0,120}\b(?:has|grant[s]?|allow[s]?|offer[s]?|bring a motion for) summary judgment/i },
  { name: "Rule 12.02 a higher bar than the civil rule", pattern: /12\.02[^.]{0,200}\b(higher|stricter|harder|tougher)\b/i },
  { name: "\"hearsay\" as the wording of CJA s. 27", pattern: /(s\.|section) 27[^.]{0,160}hearsay|hearsay[^.]{0,160}(s\.|section) 27\b/i },
  { name: "an old Rule 48.14 timeline", pattern: /48\.14[^.]{0,200}\b(two years|2 years|status notice)\b/i },
  { name: "Fong v. Chan covering \"opportunity\" in general", pattern: /Fong[^.]{0,200}\bopportunit/i },
];
const userFacing = execFileSync("git", ["ls-files", "src", "app"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(ts|tsx|json)$/.test(f) && !f.includes("authority-intelligence/caseLawBatch1"));
/**
 * The pieces of text a file can show: each string value of a JSON file, each line of code with "..." + "..."
 * concatenations joined. Reading the whole file at once matched across separate fields (a glossary entry's s. 27 source
 * next to the next entry's "hearsay" heading).
 */
function shownPieces(file: string, raw: string): string[] {
  if (file.endsWith(".json")) {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(JSON.parse(raw));
    return out;
  }
  return raw.replace(/["'`]\s*\+\s*\r?\n\s*["'`]/g, "").split("\n");
}
const hits: string[] = [];
for (const file of userFacing) {
  const pieces = shownPieces(file, readFileSync(path.join(ROOT, file), "utf8"));
  for (const w of WRONG) if (pieces.some((p) => w.pattern.test(p))) hits.push(`${w.name}: ${file}`);
}
check("no user-facing text states any of the owner's listed wrong statements", hits.length === 0, hits.join("\n      "));

// 11. Nothing from the Ontario Annual Practice.
check("nothing in the batch cites the Ontario Annual Practice", !/annual practice|thomson ?reuters/i.test(JSON.stringify(store)));

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
