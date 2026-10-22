/**
 * Every place that stores data is listed, with where it stands when the story changes.
 *
 * What it checks (storyDataRegistry.ts, intakeStorageKeys.ts, storyDataScan.ts):
 *   - every intake section the code uses, every master_result key it writes and
 *     every table it writes is in the registry with one class, and every listed
 *     one is still used (an unused line is deleted, so cleanup never fails it);
 *   - each "version-record" section is really covered: an answer given for one
 *     story is gone after the story changes and the questions start again;
 *   - browser keys marked "legacy" are removed on page load, and only those;
 *   - the two unused tables are named by no code;
 *   - only the storage module, the intake store and the listed older files touch
 *     localStorage/sessionStorage (the same list the ESLint rule reads), and a
 *     listed file that stopped is removed from the list;
 *   - an event confirmed from a story sentence counts only while that sentence
 *     is in the story.
 *
 * Failure it exists to catch: the stale-story audit after PR #463 -- copies of
 * the story kept where the version record did not reach (confirmed events, dates
 * for deadlines, old Forms-page keys, the chat pre-fill, the Home card's
 * replies), still deciding a stage, a deadline or a form after the story changed.
 * A new store now fails CI until someone says where it stands.
 *
 * Run: npm run test:story-data-registry
 */
import fs from "node:fs";
import path from "node:path";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { BASIS_SECTION, discardStale, onStoryChange, tagAnswers } from "../../src/lib/case-system/storyBasis";
import { INTAKE_STORAGE_KEYS } from "../../src/lib/case-system/storage/intakeStorageKeys";
import { removeLegacyKeys } from "../../src/lib/case-system/storage/resetIntake";
import { INTAKE_SECTIONS, MASTER_RESULT_KEYS, TABLES } from "../../src/lib/case-system/storage/storyDataRegistry";
import { eventsForStory, type CaseEventRow } from "../../src/lib/case-system/events/caseEventAdapter";
import { directStorageFiles, intakeSectionsUsed, masterKeysWritten, read, REPO_ROOT, sourceFiles, tablesNamed, tablesWritten } from "./storyDataScan";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const files = sourceFiles();
const REGISTRY_FILES = new Set(["src/lib/case-system/storage/storyDataRegistry.ts", "src/lib/case-system/storage/intakeStorageKeys.ts"]);
const code = files.filter((file) => !REGISTRY_FILES.has(file)).map(read).join("\n");

// --- Intake sections -------------------------------------------------------
const sections = intakeSectionsUsed(files);
const unlistedSections = [...sections.keys()].filter((section) => !(section in INTAKE_SECTIONS));
check("every intake section the code uses is in the registry", unlistedSections.length === 0,
  unlistedSections.map((section) => `${section} (${sections.get(section)!.join(", ")})`).join("; "));
const unusedSections = Object.keys(INTAKE_SECTIONS).filter((section) => !code.includes(`"${section}"`));
check("every listed intake section is still used (delete the line if not)", unusedSections.length === 0, unusedSections.join(", "));

// Each version-record section really is covered: an answer given for the old
// story does not survive "the story changed, start the questions again".
const SAMPLE: Record<string, [string, unknown]> = {
  family: ["goal", "SAMPLE-ANSWER"],
  civil: ["input", { legalRemedy: "SAMPLE-ANSWER" }],
  "small-claims": ["input", { amountClaimed: "SAMPLE-ANSWER" }],
  guided: ["facts", { role: "SAMPLE-ANSWER" }],
  builder: ["initialAnswers", { "sc-orient-role": "SAMPLE-ANSWER" }],
  sourced: ["answers", [{ answer: "SAMPLE-ANSWER" }]],
  "form-chat": ["heard", ["SAMPLE-ANSWER"]],
  home: ["understoodAnswers", [{ answer: "SAMPLE-ANSWER" }]],
  "home-card": ["replies", { 0: "SAMPLE-ANSWER" }],
};
for (const [section, entry] of Object.entries(INTAKE_SECTIONS)) {
  if (entry.storyData !== "version-record" || section === "story" || section === BASIS_SECTION) continue;
  const sample = SAMPLE[section];
  if (!sample) { check(`${section}: a version-record section has a sample answer here to prove it`, false, "add one to SAMPLE"); continue; }
  const [key, value] = sample;
  const base: Checkpoint["sections"] = { story: { text: "Synthetic old story." }, [section]: { [key]: value } };
  base[BASIS_SECTION] = tagAnswers(base, section, key, undefined, value);
  const changed = onStoryChange({ ...base, story: { text: "Synthetic new story." } });
  const after = discardStale({ version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "family", revision: "22222222-2222-4222-8222-222222222222", sections: changed });
  check(`${section}: an answer given for the old story is gone once it changes and the questions start again`, !JSON.stringify(after.sections[section] ?? {}).includes("SAMPLE-ANSWER"));
}

// --- master_result keys ----------------------------------------------------
const masterKeys = masterKeysWritten(files);
const unlistedKeys = [...masterKeys.keys()].filter((key) => !(key in MASTER_RESULT_KEYS));
check("every master_result key written is in the registry", unlistedKeys.length === 0,
  unlistedKeys.map((key) => `${key} (${masterKeys.get(key)!.join(", ")})`).join("; "));
const unusedKeys = Object.keys(MASTER_RESULT_KEYS).filter((key) => !new RegExp(`\\b${key}\\b`).test(code));
check("every listed master_result key is still used (delete the line if not)", unusedKeys.length === 0, unusedKeys.join(", "));

// --- Tables ----------------------------------------------------------------
const written = tablesWritten(files);
const named = tablesNamed(files);
const unlistedTables = [...written.keys()].filter((table) => !(table in TABLES) || TABLES[table].storyData === "legacy");
check("every table written is in the registry (and not as legacy)", unlistedTables.length === 0,
  unlistedTables.map((table) => `${table} (${written.get(table)!.join(", ")})`).join("; "));
const legacyNamed = Object.entries(TABLES).filter(([table, entry]) => entry.storyData === "legacy" && named.has(table)).map(([table]) => table);
check("the unused tables (case_intakes, case_generated_documents) are named by no code", legacyNamed.length === 0, legacyNamed.join(", "));
const unusedTables = Object.entries(TABLES).filter(([table, entry]) => entry.storyData !== "legacy" && !named.has(table)).map(([table]) => table);
check("every listed table is still used (delete the line if not)", unusedTables.length === 0, unusedTables.join(", "));

// --- Browser keys ----------------------------------------------------------
function fakeStorage(names: string[]) {
  const data = new Map(names.map((name) => [name, "x"]));
  return { data, get length() { return data.size; }, key: (index: number) => [...data.keys()][index] ?? null, removeItem: (name: string) => void data.delete(name) };
}
for (const area of ["local", "session"] as const) {
  const entries = INTAKE_STORAGE_KEYS.filter((entry) => entry.area === area);
  const name = (entry: (typeof entries)[number]) => entry.matches === "prefix" ? `${entry.key}:synthetic` : entry.key;
  const storage = fakeStorage(entries.map(name));
  removeLegacyKeys(area === "local" ? { local: storage } : { session: storage });
  const legacyLeft = entries.filter((entry) => entry.storyData === "legacy" && storage.data.has(name(entry)));
  // A current key can share a legacy prefix (the chat's ":narrative-prefill" under the chat prefix); only exact survivors count.
  const currentGone = entries.filter((entry) => entry.storyData !== "legacy" && !storage.data.has(name(entry)) &&
    !INTAKE_STORAGE_KEYS.some((other) => other.storyData === "legacy" && other.matches === "prefix" && name(entry).startsWith(other.key)));
  check(`${area}Storage: every legacy key is removed on load`, legacyLeft.length === 0, legacyLeft.map((entry) => entry.key).join(", "));
  check(`${area}Storage: no current key is removed with them`, currentGone.length === 0, currentGone.map((entry) => entry.key).join(", "));
}
const guard = read("app/_components/AuthStorageGuard.tsx");
check("the legacy-key cleanup runs on every page (AuthStorageGuard, mounted in the root layout)",
  /removeLegacyBrowserKeys\(\)/.test(guard) && /AuthStorageGuard/.test(read("app/layout.tsx")));

// --- Direct browser storage ------------------------------------------------
const allowlist = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "src/lib/case-system/storage/directStorageAllowlist.json"), "utf8")) as { allowed: Record<string, string>; existing: Record<string, string> };
const permitted = (file: string) => Object.keys(allowlist.allowed).some((entry) => entry.endsWith("/") ? file.startsWith(entry) : file === entry) || file in allowlist.existing;
const direct = directStorageFiles(files);
const outside = direct.filter((file) => !permitted(file));
check("only the storage module, the intake store and the listed older files touch localStorage/sessionStorage", outside.length === 0,
  `${outside.join(", ")} -- store through the storage module or the intake store instead`);
const stopped = Object.keys(allowlist.existing).filter((file) => !direct.includes(file));
check("a listed older file that no longer touches browser storage is taken off the list", stopped.length === 0, stopped.join(", "));
const eslint = fs.readFileSync(path.join(REPO_ROOT, "eslint.config.mjs"), "utf8");
check("the ESLint rule reads the same list", /directStorageAllowlist\.json/.test(eslint) && /no-restricted-globals/.test(eslint));

// --- Events from the story -------------------------------------------------
const event = (id: string, source: CaseEventRow["source"], narrative_basis: string | null) => ({ id, source, narrative_basis } as CaseEventRow);
const rows = [event("a", "confirmed-from-narrative", "I was served on May 3."), event("b", "user-stated", null), event("c", "confirmed-from-document", null)];
check("an event confirmed from a story sentence counts while the sentence is in the story",
  eventsForStory(rows, "Synthetic.  I was SERVED on May 3. More.").length === 3);
check("and not once the story no longer has it; stated and document events always count",
  JSON.stringify(eventsForStory(rows, "A different story.").map((row) => row.id)) === JSON.stringify(["b", "c"]));
check("with no story to compare (an older case), nothing is dropped", eventsForStory(rows, null).length === 3);

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS story-data registry: every store listed with where it stands when the story changes");
