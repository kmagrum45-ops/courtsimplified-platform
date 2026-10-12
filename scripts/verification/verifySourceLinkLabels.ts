/**
 * test:source-link-labels -- source links name their law, and the name is the
 * library's own.
 *
 * Checks: (1) every title in ELAWS_TITLES is the title the corpus index gives
 * that e-Laws id, so a link never shows a name the library does not use;
 * (2) a rule number in the sentence goes on a rules link and a section number
 * on an Act's link, never on a different law's link; (3) an unknown address
 * still gets a plain label. Exists to catch the outside tester's finding of
 * 2026-10-11 (every link read "Source") coming back, and a mislabelled link.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ELAWS_TITLES, elawsId, sourceLinkLabel } from "../../src/lib/content-library/sourceLinkLabel";

let failed = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}`); if (!ok) failed++; };

const index = JSON.parse(readFileSync(path.resolve(__dirname, "../../docs/sources/retrieval/corpus-index.json"), "utf8"));
const sources: { url?: string; title: string }[] = Array.isArray(index.sources) ? index.sources : Object.values(index.sources);
const register = new Map<string, string>();
for (const source of sources) { const id = source.url ? elawsId(source.url) : null; if (id) register.set(id, source.title); }
for (const [id, title] of Object.entries(ELAWS_TITLES)) check(`${id} is titled as the library titles it`, register.get(id) === title);

const SCR = "https://www.ontario.ca/laws/docs/980258_e.doc";
check("a rule cited beside a rules link is named", sourceLinkLabel(SCR, "Serve it under rule 8.02(a) personally.") === "Rules of the Small Claims Court, r. 8.02(a)");
check("no number when the sentence cites none", sourceLinkLabel(SCR, "Serve the claim.") === "Rules of the Small Claims Court");
check("a section number does not go on a rules link", sourceLinkLabel(SCR, "Under s. 22(1) the court continues.") === "Rules of the Small Claims Court");
check("a number for a different named law is not put on this link",
  sourceLinkLabel("https://www.ontario.ca/laws/statute/02l24", "Occupiers' Liability Act s. 6.1 needs notice in 60 days.") === "Limitations Act, 2002");
check("an Act's own section is named", sourceLinkLabel("https://www.ontario.ca/laws/statute/02l24", "The basic limitation period is in s. 4.") === "Limitations Act, 2002, s. 4");
check("an unknown address still gets a label", sourceLinkLabel("https://example.org/x", "text") === "Source");
check("the overview panel uses the label", readFileSync(path.resolve(__dirname, "../../app/builder/_components/IntelligenceOverviewPanel.tsx"), "utf8").includes("sourceLinkLabel("));

if (failed) { console.log(`\n${failed} check(s) failed.`); process.exit(1); }
console.log("\nAll source link label checks passed.");
