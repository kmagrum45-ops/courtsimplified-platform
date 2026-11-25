/**
 * No committed file holds a merge-conflict marker (founder, 1 Nov).
 *
 * What it checks: every file git tracks (or the files of a given commit, with `--ref <commit>`) is read,
 * and a line that is exactly a conflict marker fails: `<<<<<<< ...`, `>>>>>>> ...`, or `=======` alone
 * when it sits between the other two. Long rules made of "=" in documents are not markers.
 *
 * The failure it exists to catch: a merge resolved by hand that commits the markers. On 1 Nov the merge
 * of main into fact/claim-type (4fb1b3b5) committed them into the generated docs/VERIFICATION_SUITES.md;
 * no check noticed, and the next agent found it by chance. A generated file is not exempt.
 *
 * Usage: npm run test:no-conflict-markers [-- --ref <commit>]
 */
import { execFileSync } from "node:child_process";

const refAt = process.argv.indexOf("--ref");
const ref = refAt > 0 ? process.argv[refAt + 1] : null;
const git = (args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });

const files = (ref ? git(["ls-tree", "-r", "--name-only", ref]) : git(["ls-files"])).split("\n").filter(Boolean);
const START = /^<{7}(?: |$)/;
const END = /^>{7}(?: |$)/;
const MIDDLE = /^={7}$/;

/** The conflict-marker lines in one text (1-based line numbers). */
export function markerLines(text: string): number[] {
  const lines = text.split(/\r?\n/);
  const found: number[] = [];
  let open = false;
  lines.forEach((line, index) => {
    if (START.test(line)) { open = true; found.push(index + 1); }
    else if (END.test(line)) { open = false; found.push(index + 1); }
    else if (open && MIDDLE.test(line)) found.push(index + 1);
  });
  return found;
}

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? `\n     ${detail}` : ""}`);
  if (!ok) failed += 1;
};

// The rule itself, on planted texts.
check("a committed conflict is found", markerLines("a\n<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> origin/main\nb").length === 3);
check("a long rule of '=' in a document is not a marker", markerLines("Title\n" + "=".repeat(70) + "\ntext\n=======\n").length === 0);
check("a lone '=======' outside a conflict is not a marker", markerLines("a\n=======\nb").length === 0);

const binary = /\.(png|jpe?g|gif|webp|ico|pdf|docx?|xlsx?|pptx?|zip|gz|woff2?|ttf|otf|mp4|mp3|wasm)$/i;
const hits: string[] = [];
for (const file of files) {
  if (binary.test(file)) continue;
  let text: string;
  try { text = ref ? git(["show", `${ref}:${file}`]) : require("node:fs").readFileSync(file, "utf8"); } catch { continue; }
  if (text.includes("\u0000")) continue;
  const at = markerLines(text);
  if (at.length) hits.push(`${file}: lines ${at.join(", ")}`);
}
check(`no ${ref ? `file in ${ref}` : "tracked file"} holds a conflict marker (${files.length} files read)`, hits.length === 0, hits.join("\n     "));

if (failed) { console.log(`${failed} check(s) failed.`); process.exit(1); }
console.log("No conflict markers.");
