/**
 * Every "Source" link a reader can click opens a public page.
 *
 * COSTS NOTHING. Pure functions over the content modules; no network.
 *
 * WHAT FAILURE THIS CATCHES (found by the 2026-09-30 accuracy audit):
 *   - a catalogue entry citing a decision saved under docs/sources/ and linking
 *     to that repository path, which on the live site is a 404 (49 entries did);
 *   - an e-Laws ".doc" download shown to a reader instead of the law's page;
 *   - a new saved decision cited in content with no public address recorded in
 *     publicSourceUrl.ts, so the link would silently disappear.
 *
 * The property: every cited address either translates to an https page, or is
 * on the short list of sources with no verified public address (named below,
 * each with its reason) — so a missing link is always a decision, never an
 * accident.
 *
 * Run: node --import tsx scripts/verification/verifySourceLinks.ts
 */
import { catalogueEntries } from "../content/catalogueVerification";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { DEPTH_QUESTIONS } from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";
import { publicSourceUrl } from "../../src/lib/content-library/publicSourceUrl";

/** Cited, saved, but with no public address that was verified. The citation text names the case. */
const NO_VERIFIED_PUBLIC_PAGE: Record<string, string> = {
  "docs/sources/moore-v-sweet-2018-SCC-52.pdf":
    "Downloaded from CanLII without its page address being recorded; not linked until one is verified.",
};

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const cited = new Map<string, string>();
for (const entry of catalogueEntries()) {
  cited.set(entry.sourceUrl, entry.key);
  for (const also of entry.alsoCites ?? []) cited.set(also.sourceUrl, entry.key);
}
for (const question of QUESTION_BANK as Array<{ id: string; sourceUrl?: string }>) {
  if (question.sourceUrl) cited.set(question.sourceUrl, question.id);
}
for (const question of DEPTH_QUESTIONS as Array<{ id: string; sourceUrl?: string }>) {
  if (question.sourceUrl) cited.set(question.sourceUrl, question.id);
}

const broken: string[] = [];
const docLinks: string[] = [];
for (const [url, where] of cited) {
  if (NO_VERIFIED_PUBLIC_PAGE[url]) continue;
  const href = publicSourceUrl(url);
  if (!href || !href.startsWith("https://")) broken.push(`${url} (e.g. ${where})`);
  else if (href.endsWith(".doc")) docLinks.push(`${url} (e.g. ${where})`);
}
check(`every cited source (${cited.size}) opens a public page`, broken.length === 0, broken.join("\n      "));
check("no reader is sent to an e-Laws .doc download", docLinks.length === 0, docLinks.join("\n      "));

check(
  "an e-Laws regulation .doc becomes its regulation page",
  publicSourceUrl("https://www.ontario.ca/laws/docs/980258_e.doc") === "https://www.ontario.ca/laws/regulation/980258",
);
check(
  "an e-Laws statute .doc becomes its statute page",
  publicSourceUrl("https://www.ontario.ca/laws/docs/90c43_e.doc") === "https://www.ontario.ca/laws/statute/90c43",
);
check(
  "a saved decision becomes the court's page, and an unknown local path gets no link",
  publicSourceUrl("docs/sources/grant-v-torstar-2009-SCC-61.pdf")?.startsWith("https://decisions.scc-csc.ca/") === true &&
    publicSourceUrl("docs/sources/not-a-real-file.pdf") === undefined,
);
check(
  "every source listed as having no public page is still cited (delete stale entries)",
  Object.keys(NO_VERIFIED_PUBLIC_PAGE).every((url) => cited.has(url)),
);

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
