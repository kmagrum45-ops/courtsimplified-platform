/**
 * THE ACCEPTANCE SCRIPT, RE-CHECKED OFFLINE (site owner, 27 Nov 2026): every rule applied again to the screens a run
 * saved (screens-<story>.json, run-<story>.json), with no browser and no AI. So a rule change, or a story's expectations
 * changed in docs/acceptance/small-claims-journeys.md, is measured on the last run's screens at no cost.
 *
 * Re-checked from the saved text: (a), (b), (c), (e), (f), (g), (j), (n), (o), (p), (q) on every screen
 * (rules.ts screenRows); (i) on the review, the case page and the reloaded case page; (k) between stories 8 and 8b;
 * (l) from the saved checklist; (m) from the saved seconds; (r) when two or more folders are given, the "Here is what
 * we understood" labels of each story compared across them. Carried as recorded (about what a click did, which text
 * cannot replay): reached, (d), (h), the (i) row for the reloaded checklist, and a run that stopped.
 *
 * Run: npx tsx tests/browser/acceptance/reevaluate.ts <results folder> [<more folders> ...] [--out <table.md>]
 */
import fs from "node:fs";
import path from "node:path";
import { DOC, journeysOf, keptProblems, ownDetailsAgain, prefilledProblems, QUICK_SECONDS, screenRows, understoodLabels, type Given, type Row, type SavedScreen } from "./rules";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : (args.length === 2 && args[1].endsWith(".md") ? args[1] : undefined);
const folders = args.filter((a, i) => a !== "--out" && i !== outAt + 1 && !(a === out));
if (!folders.length) { console.error("usage: reevaluate.ts <results folder> [<more folders>] [--out <table.md>]"); process.exit(2); }
const journeys = journeysOf(fs.readFileSync(DOC, "utf8"));
const filesIn = (folder: string, name: RegExp): string[] => fs.readdirSync(folder, { recursive: true, encoding: "utf8" }).filter((f) => name.test(path.basename(f))).map((f) => path.join(folder, f));

type Saved = { journey: string; route?: string; screens: SavedScreen[] };
type Recorded = { journey: string; route?: string; given: Given[]; seen: { nextSeconds?: number; stillToAdd?: string[]; checklist?: string }; rows: Row[] };
/** A run of one story by one route, in one folder. */
type One = { folder: string; key: string; journey: string; route: string; screens: SavedScreen[]; run?: Recorded };
const all: One[] = [];
for (const folder of folders) {
  const runs = new Map<string, Recorded>();
  for (const file of filesIn(folder, /^run-.+\.json$/)) runs.set(path.basename(file).replace(/^run-|\.json$/g, ""), JSON.parse(fs.readFileSync(file, "utf8")));
  for (const file of filesIn(folder, /^screens-.+\.json$/)) {
    const key = path.basename(file).replace(/^screens-|\.json$/g, "");
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as Saved;
    all.push({ folder, key, journey: saved.journey, route: saved.route ?? "chat", screens: saved.screens, run: runs.get(key) });
  }
}

const lines = ["| Story | Step | Screen | Rule | PASS/FAIL | What was seen |", "|---|---|---|---|---|---|"];
let fails = 0;
const many = folders.length > 1;
for (const one of all.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }) || a.folder.localeCompare(b.folder))) {
  const journey = journeys.find((j) => j.id === one.journey);
  if (!journey) continue;
  const { run, screens } = one;
  const rows: Row[] = [];
  const row = (step: string, screen: string, rule: string, problems: string[]) => rows.push({ step, screen, rule, pass: problems.length === 0, seen: problems.join("; ").slice(0, 600) || "ok" });
  for (const saved of screens) {
    rows.push(...screenRows(journey, saved));
    if (run && /^(Review|Case page|Case page after a reload)$/.test(saved.screen)) {
      // (i) on that screen counts what had been given before it (the review: the chat's answers and the typed outcome).
      const given = saved.screen === "Review" ? run.given.filter((g) => g.where === "chat-yes" || g.where === "typed") : run.given;
      row(saved.step, saved.screen, "(i) kept", keptProblems(given, saved.text));
    }
  }
  if (run) {
    // Also the new flow's own recorded rows: (t), and its (i) on the review (made live before the person confirmed).
    for (const recorded of run.rows) if (/^(reached|finished|\(d\)|\(h\)|\(t\))/.test(recorded.rule) || (recorded.rule === "(i) kept" && recorded.screen === "Next step after a reload")) rows.push(recorded);
    if (run.seen.nextSeconds !== undefined) row(`T${journey.id}-next`, "Next step", "(m) quick", run.seen.nextSeconds > QUICK_SECONDS ? [`${run.seen.nextSeconds} seconds (over ${QUICK_SECONDS})`] : []);
    if (journey.notStillToAdd?.length && run.seen.checklist !== undefined) row(`T${journey.id}-7a`, "Form 7A", "(l) checklist prefilled", prefilledProblems(journey, run.seen.stillToAdd ?? [], run.seen.checklist));
  }
  if (journey.id === "8b" && one.route === "chat") {
    const eight = all.find((o) => o.folder === one.folder && o.journey === "8" && o.route === "chat");
    if (eight) row("T8b-k", "Same account as story 8", "(k) account details once", ownDetailsAgain(eight.screens, screens));
  }
  // (r): the same story by the same route in another folder shows the same "Here is what we understood" labels.
  const twin = all.find((o) => o !== one && o.journey === one.journey && o.route === one.route && o.folder !== one.folder);
  if (twin && one.folder === folders[0]) {
    const mine = understoodLabels(screens.find((s) => /Here is what we understood/.test(s.screen))?.text ?? "");
    const theirs = understoodLabels(twin.screens.find((s) => /Here is what we understood/.test(s.screen))?.text ?? "");
    row(`T${journey.id}-r`, "Here is what we understood, two runs", "(r) labels stable", JSON.stringify(mine) === JSON.stringify(theirs) ? [] : [`run 1: ${mine.join(", ")} / run 2: ${theirs.join(", ")}`]);
  }
  const tag = `${journey.id}${one.route === "chat" ? "" : ` (${one.route})`}${many ? ` [run ${folders.indexOf(one.folder) + 1}]` : ""}`;
  for (const r of rows) { if (!r.pass) fails += 1; lines.push(`| ${tag} | ${r.step} | ${r.screen} | ${r.rule} | ${r.pass ? "PASS" : "FAIL"} | ${r.seen.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`); }
}
const table = lines.join("\n") + "\n";
if (out) fs.writeFileSync(out, table); else process.stdout.write(table);
console.error(`${lines.length - 2} rows, ${fails} FAIL`);
