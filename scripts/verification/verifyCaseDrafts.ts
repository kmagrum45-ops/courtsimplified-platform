/**
 * Drafts are saved on the user's own case, hold only what the user gave us,
 * and never cross from one case to another.
 *
 * COSTS NOTHING. Pure functions and source reads; no network, no model.
 *
 * WHY. Added 2026-10-04 with src/lib/case-system/drafts/caseDrafts.ts, the
 * Drafts tab of the case page and /api/cases/drafts. They replaced a
 * browser-only drafting page whose isolation was tested by
 * verifyWorkflowIsolation (removed with it). The properties that suite guarded
 * still matter, in their new form, and so do two new ones.
 *
 * WHAT THIS CATCHES:
 *   1. A malformed or oversized draft being stored, or stored in part — the
 *      route refuses the whole draft rather than trimming it.
 *   2. A starting point adding words the user did not give us: every line of
 *      the chronology, story and outline must come from their record.
 *   3. One case's draft reaching another: the route writes only the
 *      authenticated owner's case, and the old-browser import reads only the
 *      key for THIS case, never the unscoped legacy key that once leaked a
 *      draft from case A into case B.
 *   4. A builder re-save erasing drafts made on the case page.
 *
 * Run: node --import tsx scripts/verification/verifyCaseDrafts.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MAX_SECTION_TEXT,
  affidavitOutlineDraft,
  blankDraft,
  chronologyDraft,
  draftAsPlainText,
  draftAsWordHtml,
  importLegacyWorkspaceDocument,
  orderTimeline,
  readCaseDrafts,
  upsertDraft,
  validateDraft,
  yourStoryDraft,
  type TimelineEntry,
} from "../../src/lib/case-system/drafts/caseDrafts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const NOW = new Date("2026-10-04T12:00:00Z");

// ---- 1. Validation ----

{
  const good = blankDraft(NOW);
  const checked = validateDraft(good, NOW);
  check("a well-formed draft is accepted", checked.ok);
  check("a draft with no id is refused", !validateDraft({ ...good, id: "" }, NOW).ok);
  check("an unknown kind is refused", !validateDraft({ ...good, kind: "strategy-memo" }, NOW).ok);
  check(
    "an oversized part is refused, not trimmed",
    !validateDraft({ ...good, sections: [{ id: "p1", heading: "", text: "x".repeat(MAX_SECTION_TEXT + 1), reviewed: false }] }, NOW).ok,
  );
  check(
    "duplicate part ids are refused",
    !validateDraft({ ...good, sections: [{ id: "p1", heading: "", text: "", reviewed: false }, { id: "p1", heading: "", text: "", reviewed: false }] }, NOW).ok,
  );
  check(
    "'checked by you' is stored only when the user set it",
    validateDraft({ ...good, sections: [{ id: "p1", heading: "", text: "", reviewed: "yes" }] }, NOW).ok &&
      (validateDraft({ ...good, sections: [{ id: "p1", heading: "", text: "", reviewed: "yes" }] }, NOW) as { draft: { sections: { reviewed: boolean }[] } }).draft.sections[0].reviewed === false,
  );
}

{
  const one = blankDraft(NOW);
  const stored = readCaseDrafts({ drafts: [one, { id: "bad" }, "nonsense"] });
  check("reading stored drafts drops ones that no longer validate", stored.length === 1 && stored[0].id === one.id);
  const replaced = upsertDraft([one], { ...one, title: "Renamed" });
  check("saving a draft again replaces it rather than duplicating it", replaced.ok && replaced.drafts.length === 1 && replaced.drafts[0].title === "Renamed");
}

// ---- 2. Starting points carry only the user's record ----

const ENTRIES: TimelineEntry[] = [
  { date: "2026-03-20", when: null, title: "Work stopped", detail: "The contractor left the site.", source: "timeline" },
  { date: null, when: "early February", title: "Paid the deposit", detail: null, source: "timeline" },
  { date: "2026-02-03", when: null, title: "Exhibit 1: Signed quote", detail: null, source: "document" },
];

{
  const ordered = orderTimeline(ENTRIES);
  check(
    "the chronology puts dated entries in order and keeps undated ones, last, as recorded",
    ordered.map((entry) => entry.title).join("|") === "Exhibit 1: Signed quote|Work stopped|Paid the deposit",
  );
  const chronology = chronologyDraft(ENTRIES, NOW);
  const text = chronology.sections.map((part) => `${part.heading}\n${part.text}`).join("\n");
  check(
    "every chronology entry appears, with the user's own words for an undated one",
    ENTRIES.every((entry) => text.includes(entry.title)) && text.includes("early February (approximate)"),
  );
  const outline = affidavitOutlineDraft(ENTRIES, NOW);
  const statements = outline.sections.find((part) => part.heading === "What happened")?.text ?? "";
  check("the affidavit outline numbers one statement per recorded entry", statements.split("\n").length === ENTRIES.length && statements.startsWith("1. "));
  const story = yourStoryDraft({ facts: "He never finished the deck.", goal: "My money back.", yourName: "A. Plaintiff" }, NOW);
  const storyText = story.sections.map((part) => part.text).join("\n");
  check("the story draft is the user's own words", storyText.includes("He never finished the deck.") && storyText.includes("My money back."));

  // A starting point adds headings and the user's record, nothing else.
  const userWords = ["Work stopped", "The contractor left the site.", "Paid the deposit", "Exhibit 1: Signed quote", "early February"];
  const added = chronology.sections
    .map((part) => part.text)
    .join("\n")
    .split("\n")
    .filter((line) => line.trim() && !userWords.some((words) => line.includes(words)));
  check("the chronology adds no sentence of its own when there are entries", added.length === 0, added.join(" | "));
}

{
  const imported = importLegacyWorkspaceDocument(
    { title: "Old draft", sections: [{ heading: "Facts", paragraphs: ["One.", "Two."], bulletPoints: ["Three"] }] },
    NOW,
  );
  check(
    "an old browser draft is imported as the user left it",
    imported !== null && imported.sections[0].text === "One.\n\nTwo.\n\n• Three" && imported.title === "Old draft",
  );
}

{
  const draft = { ...blankDraft(NOW), title: "A <b>bold</b> claim", sections: [{ id: "p1", heading: "Facts & figures", text: "Line one\nLine two", reviewed: false }] };
  const html = draftAsWordHtml(draft);
  check("the Word download escapes the user's text", html.includes("A &lt;b&gt;bold&lt;/b&gt; claim") && html.includes("Facts &amp; figures"));
  check("the text download keeps every part", draftAsPlainText(draft).includes("Line one\nLine two"));
}

// ---- 3 & 4. Wiring ----

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

{
  const route = read("app/api/cases/drafts/route.ts");
  check(
    "the drafts route writes only the authenticated owner's case, through validateDraft",
    /getAuthenticatedUser\(/.test(route) &&
      /getAuthenticatedOwnedCase\(/.test(route) &&
      /validateDraft\(/.test(route) &&
      (route.match(/\.eq\("user_id", owned\.user\.id\)/g) ?? []).length === 2,
  );
}

{
  const page = read("app/cases/[id]/drafts/page.tsx");
  check(
    "the old-browser import reads only this case's key",
    /courtSimplifiedWorkspaceDocument:case:\$\{caseId\}/.test(page) && !/getItem\(\s*"courtSimplifiedWorkspaceDocument"\s*\)/.test(page),
  );
}

{
  const engine = read("src/lib/case-system/drafts/caseDrafts.ts");
  check("drafts make no model call", !/openai|completions\.create|fetch\(/i.test(engine.replace(/\/\*[\s\S]*?\*\//g, "")));
}

{
  const builder = read("app/builder/page.tsx");
  check("a builder re-save keeps the drafts made on the case page", /\[[^\]]*"drafts"[^\]]*\] as const\)/.test(builder) && /\.\.\.userOwned/.test(builder));
  check(
    "the builder's starting drafts are saved to the case, not to this browser",
    /fetch\("\/api\/cases\/drafts"/.test(builder) && !/writeWorkspaceDocument\(/.test(builder),
  );
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll case-draft checks passed.");
