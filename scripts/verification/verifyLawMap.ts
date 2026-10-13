/**
 * test:law-map -- the law map (docs/law-map/) stays well-formed and never
 * judges a case (CLAUDE.md s. 2, "Draft from knowledge; publish only what is
 * verified", 2026-10-13).
 *
 * WHAT IT CATCHES: an area file that does not parse; a duplicate id; a
 * `leadsTo` pointing at an item that does not exist; an unknown kind; an item
 * with no way to check it (no saved source with a phrase, no citation and URL,
 * no decision); a phrase too short to prove anything; a CanLII link; plain
 * words that grade a case, predict an outcome or tell the reader what to do.
 *
 * It does NOT require items to match the source: that is the job of
 * `npm run law-map:check`, whose result is a status to work down, not a gate,
 * because the map is a draft by design. Each check here asserts a property
 * of every item, so adding items never fails it; only a malformed one does.
 *
 * COSTS NOTHING: reads files only.
 */
import { loadAreas, norm, sourceWindow, statusOf } from "../law-map/checkLawMap";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const KINDS = new Set(["pre-step", "start", "step", "motion", "deadline", "form", "test", "option", "enforcement", "statute", "decision"]);
const GRADING = /\b(strong|weak|likely|unlikely|chances?|should|will win|will lose|merits of your)\b/i;

const areas = loadAreas();
const items = areas.flatMap((area) => area.items.map((item) => ({ area: area.area, item })));
check(`${areas.length} area files parse, ${items.length} items`, areas.length > 0 && items.length > 0);

const ids = items.map(({ item }) => item.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
check("every id is unique across the map", dupes.length === 0, [...new Set(dupes)].join(", "));

const known = new Set(ids);
const broken = items.flatMap(({ item }) => (item.leadsTo ?? []).filter((to) => !known.has(to)).map((to) => `${item.id} -> ${to}`));
check("every leadsTo points at an item that exists", broken.length === 0, broken.slice(0, 20).join(", "));

const badKind = items.filter(({ item }) => !KINDS.has(item.kind)).map(({ item }) => `${item.id}: ${item.kind}`);
check("every kind is a known kind", badKind.length === 0, badKind.join(", "));

const uncheckable = items
  .filter(({ item }) => {
    const s = item.source;
    if (!s) return true;
    if (s.corpusId) return !s.expect;
    if (s.decision) return false;
    return !(s.citation && s.url);
  })
  .map(({ item }) => item.id);
check("every item can be checked: a saved source with a phrase, a citation and URL, or a named decision", uncheckable.length === 0, uncheckable.slice(0, 20).join(", "));

const tooShort = items.filter(({ item }) => item.source?.corpusId && norm(item.source.expect ?? "").length < 6).map(({ item }) => item.id);
check("no phrase is too short to prove anything (6+ characters)", tooShort.length === 0, tooShort.join(", "));

const canlii = items.filter(({ item }) => /canlii\./i.test(JSON.stringify(item.source ?? {}))).map(({ item }) => item.id);
check("no CanLII link (CLAUDE.md: never fetched, never a source here)", canlii.length === 0, canlii.join(", "));

// A word the law itself uses ("unlikely that there will be any material facts
// in dispute", r. 14.05 (3) (h)) is the law's, not a judgment; only words the
// plain-language text adds are flagged.
const grading = items
  .filter(({ item }) => {
    const words = [...item.says.matchAll(new RegExp(GRADING.source, "gi"))].map((m) => m[0].toLowerCase());
    const law = sourceWindow(item.source);
    return words.some((word) => !law.includes(word));
  })
  .map(({ item }) => `${item.id}: ${item.says.slice(0, 80)}`);
check("no plain words grade a case, predict an outcome or tell the reader what to do", grading.length === 0, grading.slice(0, 20).join("\n      "));

// The checker itself, on a real item: a phrase that is in the provision matches; a changed one does not.
const probe = { corpusId: "oreg-258-98-small-claims-rules", pinpoint: "r. 9.01", expect: "within 20 days of being served with the claim" };
check("the checker matches a phrase that is in the cited rule", statusOf(probe) === "matches");
check("the checker flags a phrase that is not", statusOf({ ...probe, expect: "within 30 days of being served with the claim" }) === "differs");

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
