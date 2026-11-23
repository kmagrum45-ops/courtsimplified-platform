/**
 * C9: NO FACT IS ASKED OR OFFERED IN TWO PLACES (site owner, 23 Nov 2026: "for every fact in the fact list, in every
 * court, if the fact can be answered or confirmed in one place, then NO other place may ask or offer it again. The check
 * fails, naming the fact and the two places, whenever two places can. Freeze today's list of known violations on a
 * shrink-only list (like test:one-decider) so it can only go down.")
 *
 * Reads the when-and-where table (src/lib/case-system/caseFile/factPlaces.ts) and:
 *   1. keeps the table honest:
 *      - every question id the site can ask (the Small Claims question bank, the Civil and Family fields, the Family
 *        triage, the home page) is in some row, so a new question cannot be added without its place;
 *      - every id a row lists asks that row's fact (factsOfQuestion);
 *      - every row's file exists, and no fact has two "first" places in one court;
 *      - a row that says the case file decides it is tried: its own decider (homeAsks, chatMayAsk, mayShowQuestion)
 *        is called with a file where every fact is held, and must not ask. A row about a fact the case file cannot hold
 *        (not a slot) cannot say the case file decides it;
 *   2. finds the violations: a row that asks or offers a fact with no case-file gate (its own copy, or nothing), where
 *      another place in the same court also has the fact. Each is named: the fact, the court, the two places;
 *   3. compares them with factPlacesKnown.json: a violation not on the list fails (a new repeat); an entry no longer
 *      found fails (delete it: fixed); the list may only shrink against origin/main's copy.
 * Prints the count by court every run.
 *
 * What it cannot see (say so): text that appears only because of what the AI wrote (the AI summary page's "What to
 * confirm next", the home card's reading); a place missing from the table that asks by its own words and no id; a gate
 * that is right in its decider but bypassed by the screen that calls it (the browser test, ask-once-pages, sees that).
 *
 * WHAT FAILURE THIS CATCHES: a second place that asks or offers a fact another place already has, in any court.
 *
 * Run: npm run test:fact-places
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FACT_PLACES, ALL_COURTS, type Place, type FactAtPlace, type PlaceCourt } from "../../src/lib/case-system/caseFile/factPlaces";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { SLOT_FACTS } from "../../src/lib/case-system/caseFile/slotFacts";
import { mayShowQuestion, chatMayAsk, questionStatus } from "../../src/lib/case-system/caseFile/factStatus";
import { HOME_QUESTIONS, homeAsks } from "../../src/lib/case-system/caseFile/factQuestions";
import type { CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";

const ROOT = path.resolve(__dirname, "../..");
const LIST_PATH = "scripts/verification/factPlacesKnown.json";

export type Violation = { court: PlaceCourt; fact: string; place: string; other: string; why: string };
const keyOf = (v: Pick<Violation, "court" | "fact" | "place">) => `${v.court} ${v.fact} @ ${v.place}`;

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const SLOTS = new Set<string>(SLOT_FACTS);

/** A case file in which every fact is the person's own confirmed answer. */
export function heldFile(): CaseFile {
  const file = {} as Record<string, unknown>;
  for (const fact of SLOT_FACTS) file[fact] = { state: "answered", value: "held", confirmed: true, source: { kind: "answer", question: "held" } };
  return file as CaseFile;
}

/** Whether the row's own decider would still ask its question ids with every fact held (an empty list: it does not). */
export function askedWhenHeld(place: Place, row: FactAtPlace, file: CaseFile): string[] {
  if (!place.probe || !row.ids?.length || row.gate.by !== "case-file") return [];
  return row.ids.filter((id) => {
    switch (place.probe) {
      case "home": return homeAsks(file, id, "");
      case "chat": return chatMayAsk(file, id);
      case "step": return questionStatus(file, id) === "ask";
      default: return mayShowQuestion(file, id);
    }
  });
}

/** The violations the table shows: a row that asks or offers with no case-file gate, beside another place with the fact. */
export function violationsOf(places: readonly Place[], file: CaseFile): Violation[] {
  const out: Violation[] = [];
  for (const court of ALL_COURTS) {
    const byFact = new Map<string, { place: Place; row: FactAtPlace }[]>();
    for (const place of places) for (const row of place.facts) if (row.courts.includes(court)) {
      const list = byFact.get(row.fact) ?? [];
      list.push({ place, row });
      byFact.set(row.fact, list);
    }
    for (const [fact, rows] of byFact) {
      const placesWith = [...new Set(rows.map((item) => item.place.id))];
      if (placesWith.length < 2) continue;
      const seen = new Set<string>();
      for (const { place, row } of rows) {
        if (row.kind === "confirm" || seen.has(place.id)) continue;
        const gate = row.gate;
        let why: string | null = null;
        if (gate.by === "none") why = "nothing checks";
        else if (gate.by === "own-copy") why = `checks ${gate.copy}, not the case file`;
        else if (gate.by === "case-file" && !SLOTS.has(fact)) why = "the case file cannot hold this fact";
        else if (askedWhenHeld(place, row, file).length) why = `its decider still asks ${askedWhenHeld(place, row, file).join(", ")} when the fact is held`;
        if (!why) continue;
        seen.add(place.id);
        const other = placesWith.find((id) => id !== place.id)!;
        out.push({ court, fact, place: place.id, other, why });
      }
    }
  }
  return out;
}

/** Every question id the site can ask by id. */
function siteQuestionIds(): { id: string; from: string }[] {
  const choice = { issues: [], filed: [], documents: [] } as never;
  const triageSource = readFileSync(path.join(ROOT, "src/lib/case-system/family/statusTriage.ts"), "utf8");
  const block = /const QUESTIONS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(triageSource)?.[1] ?? "";
  return [
    ...QUESTION_BANK.map((item) => ({ id: item.id, from: "the Small Claims question bank" })),
    ...civilGuidedFields(choice).map((field) => ({ id: field.key, from: "the Civil fields" })),
    ...familyGuidedFields(choice).map((field) => ({ id: field.key, from: "the Family fields" })),
    ...[...block.matchAll(/\bid: "([^"]+)"/g)].map((match) => ({ id: match[1], from: "the Family triage" })),
    ...Object.values(HOME_QUESTIONS).flatMap((sides) => Object.values(sides).flatMap((list) => list.map((item) => ({ id: item.id, from: "the home page" })))),
  ];
}

function baseList(list: Violation[]): { base: Violation[]; from: string } {
  try {
    const text = execFileSync("git", ["show", `origin/main:${LIST_PATH}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return { base: JSON.parse(text) as Violation[], from: `origin/main:${LIST_PATH}` };
  } catch {
    return { base: list, from: `${LIST_PATH} (seeded in this change; not on origin/main yet)` };
  }
}

export function judge(found: Violation[], list: Violation[], base: Violation[]) {
  const listed = new Set(list.map(keyOf));
  const foundKeys = new Set(found.map(keyOf));
  const baseKeys = new Set(base.map(keyOf));
  return {
    unlisted: found.filter((v) => !listed.has(keyOf(v))),
    stale: list.filter((v) => !foundKeys.has(keyOf(v))),
    grown: list.filter((v) => !baseKeys.has(keyOf(v))),
  };
}

function main() {
  const file = heldFile();

  // 1. The table is honest.
  const rowIds = new Set(FACT_PLACES.flatMap((place) => [...place.facts.flatMap((row) => row.ids ?? []), ...(place.ownIds ?? [])]));
  const unplaced = siteQuestionIds().filter((item) => !rowIds.has(item.id));
  check("every question the site can ask by id is in a row of the table (factPlaces.ts)", unplaced.length === 0, unplaced.map((item) => `${item.id} (${item.from})`).join("\n      "));
  const wrongFact = FACT_PLACES.flatMap((place) => place.facts.flatMap((row) => (row.ids ?? []).filter((id) => !factsOfQuestion(id).includes(row.fact)).map((id) => `${place.id}: ${id} asks ${factsOfQuestion(id).join("+")}, not ${row.fact}`)));
  check("every id a row lists asks that row's fact", wrongFact.length === 0, wrongFact.join("\n      "));
  const ownWrong = FACT_PLACES.flatMap((place) => (place.ownIds ?? []).filter((id) => factsOfQuestion(id).join() !== id).map((id) => `${place.id}: ${id}`));
  check("every own-fact id is its own fact", ownWrong.length === 0, ownWrong.join("\n      "));
  const missingFiles = FACT_PLACES.filter((place) => !existsSync(path.join(ROOT, place.at))).map((place) => `${place.id}: ${place.at}`);
  check("every place's file exists", missingFiles.length === 0, missingFiles.join("\n      "));
  const firsts = new Map<string, string[]>();
  for (const place of FACT_PLACES) for (const row of place.facts) if (row.gate.by === "first") for (const court of row.courts) firsts.set(`${court} ${row.fact}`, [...(firsts.get(`${court} ${row.fact}`) ?? []), place.id]);
  const twoFirsts = [...firsts].filter(([, list]) => new Set(list).size > 1).map(([key, list]) => `${key}: ${list.join(", ")}`);
  check("no fact has two first places in one court", twoFirsts.length === 0, twoFirsts.join("\n      "));
  const ids = FACT_PLACES.map((place) => place.id);
  check("every place id is used once", new Set(ids).size === ids.length);

  // 2. The violations.
  const found = violationsOf(FACT_PLACES, file);
  const list = JSON.parse(readFileSync(path.join(ROOT, LIST_PATH), "utf8")) as Violation[];
  const { base, from } = baseList(list);
  const verdict = judge(found, list, base);
  const byCourt = ALL_COURTS.map((court) => `${court} ${found.filter((v) => v.court === court).length}`).join(", ");
  console.log(`Fact places: ${FACT_PLACES.length} places, ${FACT_PLACES.reduce((n, place) => n + place.facts.length, 0)} rows. Asked or offered again: ${found.length} (${byCourt}); ${list.length} on the known list; compared with ${from}.`);
  check("nothing new asks or offers a fact another place already has", verdict.unlisted.length === 0, verdict.unlisted.map((v) => `${keyOf(v)} (also at ${v.other}): ${v.why}`).join("\n      "));
  check("every known violation is still found (delete a fixed one)", verdict.stale.length === 0, verdict.stale.map(keyOf).join("\n      "));
  check(`the known list allows nothing ${from} does not: it may only shrink`, verdict.grown.length === 0, verdict.grown.map(keyOf).join("\n      "));

  // Self-tests: a planted repeat is caught, a gated one is not, and a grown list fails.
  const planted: Place = { id: "planted", name: "planted", at: "x", facts: [{ fact: "amount", kind: "ask", courts: ["small-claims"], gate: { by: "none" } }] };
  const withPlanted = violationsOf([...FACT_PLACES, planted], file);
  check("self-test: a planted place asking the amount with no gate is a new violation", judge(withPlanted, list, base).unlisted.some((v) => v.place === "planted" && v.fact === "amount"));
  const gated: Place = { id: "gated", name: "gated", at: "x", probe: "sc-guided", facts: [{ fact: "amount", kind: "ask", courts: ["small-claims"], gate: { by: "case-file" }, ids: ["sc-amount-claimed"] }] };
  check("self-test: a planted place gated by the case file is not a violation", !violationsOf([...FACT_PLACES, gated], file).some((v) => v.place === "gated"));
  const lying: Place = { id: "lying", name: "lying", at: "x", probe: "sc-guided", facts: [{ fact: "evidence", kind: "ask", courts: ["small-claims"], gate: { by: "case-file" }, ids: ["sc-evidence-available"] }] };
  check("self-test: a row saying the case file decides a fact it cannot hold is a violation", violationsOf([...FACT_PLACES, lying], file).some((v) => v.place === "lying"));
  check("self-test: adding an entry to the known list fails as growth", judge(found, [...list, { court: "civil", fact: "amount", place: "planted", other: "x", why: "x" }], list).grown.length === 1);

  if (process.argv.includes("--write-list")) {
    // Used once, to seed the list in the change that adds this suite; never to make a failing run pass.
    require("node:fs").writeFileSync(path.join(ROOT, LIST_PATH), `${JSON.stringify(found, null, 2)}\n`);
    console.log(`wrote ${found.length} entries to ${LIST_PATH}`);
  }

  if (failures) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll passed");
}

main();
