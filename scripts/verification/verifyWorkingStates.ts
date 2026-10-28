/**
 * EVERY CONTROL THAT WAITS ON SLOW WORK SAYS SO IN PLAIN WORDS (site owner, 28 Oct).
 *
 * Checks, across every page and component under app/ (the admin pages excepted), as properties:
 *   - every <button> held by a work state (disabled while loading, saving, busy, sending, …) sits in
 *     a file that says, in words, what that same state is doing: a WorkingButton or WorkingNote for
 *     it (app/_components/Working.tsx), or a label or status line in words shown while it runs;
 *   - no label shown while working is bare dots ("..." or "…");
 *   - every WorkingButton's working label has words and ends with "…".
 * Inputs, selects and text boxes held during the work are not buttons and are not counted.
 *
 * Failure it exists to catch: the story-suggestions card that stayed greyed for ~11 s with no words
 * at the live site's speed (#488), "..." as a working label, and a button that only greys out.
 */
import fs from "node:fs";
import path from "node:path";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const WORK_STATE = /\b(loading|saving|busy|sending|submitting|working|resolving\w*|generating\w*|uploading|confirming|counting|leaving|savingMaster|applicabilitySaving|helpState|dateStatus|busyId|busyAction)\b/;

function files(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|\.next|[\\/]admin$/.test(full)) files(full, out);
    } else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** The text of each <button …>…</button> element in a file, with where it starts. */
export function buttonsIn(source: string): { at: number; tag: string; body: string }[] {
  const out: { at: number; tag: string; body: string }[] = [];
  const re = /<button\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    // The opening tag ends at the first ">" outside braces.
    let depth = 0;
    let i = match.index;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && source[i - 1] !== "=") break;
    }
    const close = source.indexOf("</button>", i);
    out.push({ at: match.index, tag: source.slice(match.index, i + 1), body: close > 0 ? source.slice(i + 1, close) : "" });
  }
  return out;
}

/** The work state a disabled={…} expression waits on, if any. */
export function heldBy(tag: string): string | null {
  const disabled = tag.match(/disabled=\{([^}]*)\}/)?.[1] ?? "";
  return disabled.match(WORK_STATE)?.[1] ?? null;
}

/** Whether the file says, in words, what `state` is doing while it runs. */
export function spoken(source: string, state: string): boolean {
  const s = state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const words = /[A-Za-z]{3,}[^"`]*(?:…|\.\.\.)/.source;
  return (
    new RegExp(`<Working(?:Note|Button)[^>]*working=\\{[^}]*\\b${s}\\b`).test(source) ||
    new RegExp(`\\b${s}\\b[^?:;{}]{0,120}\\?\\s*["\`]${words}["\`]`).test(source) ||
    new RegExp(`\\{\\s*\\b${s}\\b[^&]{0,40}&&\\s*(?:\\(\\s*)?<(?:p|div|span)[^>]*>\\s*[A-Za-z][^<]{8,}`).test(source)
  );
}

function main() {
  const all = files(path.join(ROOT, "app"));
  const unspoken: string[] = [];
  const dots: string[] = [];
  const badLabels: string[] = [];
  let held = 0;
  for (const file of all) {
    const source = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    // The shared component itself: its own button is what the others use.
    if (rel === "app/_components/Working.tsx") continue;
    for (const button of buttonsIn(source)) {
      const state = heldBy(button.tag);
      if (!state) continue;
      held += 1;
      if (!spoken(source, state)) unspoken.push(`${rel}:${source.slice(0, button.at).split("\n").length} (${state})`);
    }
    // A label of bare dots shown while a work state runs (a text-shortening "…" elsewhere is not one).
    for (const m of source.matchAll(/\?\s*["'`](?:\.\.\.|…)["'`]\s*:/g)) {
      if (WORK_STATE.test(source.slice(Math.max(0, (m.index ?? 0) - 80), m.index))) dots.push(`${rel}:${source.slice(0, m.index).split("\n").length}`);
    }
    for (const m of source.matchAll(/workingLabel="([^"]*)"/g)) if (!/[A-Za-z]{3,}/.test(m[1]) || !m[1].endsWith("…")) badLabels.push(`${rel}: "${m[1]}"`);
  }
  check(`every button held by a work state says, in its card, what that work is doing (${held} found)`, unspoken.length === 0, unspoken.join("; "));
  check("no working label is bare dots", dots.length === 0, dots.join("; "));
  check("every working label has words and ends with \"…\"", badLabels.length === 0, badLabels.join("; "));

  // The check itself: a held button with nothing said fails; one with a WorkingNote passes.
  const bare = `<button type="button" disabled={saving} onClick={go}>Save</button>`;
  check("(self-check) a button held by a state with nothing said is caught", !spoken(bare, heldBy(buttonsIn(bare)[0].tag)!));
  check("(self-check) a WorkingNote for that state answers it", spoken(`${bare}<WorkingNote working={saving}>Saving your answer…</WorkingNote>`, "saving"));
  check("(self-check) a label in words answers it", spoken(`<button disabled={saving}>{saving ? "Saving your answer…" : "Save"}</button>`, "saving"));
  check("(self-check) a label of bare dots does not", !spoken(`<button disabled={saving}>{saving ? "..." : "Save"}</button>`, "saving"));

  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exit(failures ? 1 : 0);
}

main();
