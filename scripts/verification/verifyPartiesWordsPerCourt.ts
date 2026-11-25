/**
 * EACH COURT'S OWN WORDS FOR THE PARTIES, FROM ONE FUNCTION; FAMILY NEVER ASKS "A PERSON OR A COMPANY?" (site owner,
 * 16 Nov 2026; Chrome milestone test of #550, row 42 and its note).
 *
 * Chrome: the Family review's Parties step said "Plaintiff 1 (you)", "Defendant 1", "Add another defendant", "Add another
 * plaintiff on your side", while the overview of the same case said "Applicant"; and it asked "A person or a company?"
 * about the other parent.
 *
 * What it checks:
 *   1. parties.ts sideWordsOf: Family's applicant and respondent; Small Claims and Civil the plaintiff and the defendant;
 *      partySideWord gives each party its side's word, the person's own side included, starting or responding;
 *   2. every place that names a side reads it: the Parties step (its heading and both "Add another" buttons), the drafts,
 *      the responding draft and the exhibit book cover; and no file in app/ or src/ writes the words as a side's name of
 *      its own (a new copy fails: the declared list below is the code's list);
 *   3. the Parties step reads a Family party as a person (never asks the kind) and only in Family.
 *
 * What failure it catches: a screen calling a Family party a plaintiff or defendant, or asking a parent whether they are
 * a company.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { partySideWord, sideWordsOf } from "../../src/lib/case-system/parties/parties";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

// 1.
check("Family: applicant and respondent", JSON.stringify(sideWordsOf("family")) === JSON.stringify({ starts: "Applicant", responds: "Respondent" }));
check("Small Claims and Civil: plaintiff and defendant", ["small-claims", "civil"].every((court) => JSON.stringify(sideWordsOf(court)) === JSON.stringify({ starts: "Plaintiff", responds: "Defendant" })));
const you = { side: "yours" as const };
const other = { side: "other" as const };
check("partySideWord: Family, starting: you are the applicant, the other parent the respondent", partySideWord("family", you, true) === "Applicant" && partySideWord("family", other, true) === "Respondent");
check("partySideWord: Family, responding: you are the respondent, the other parent the applicant", partySideWord("family", you, false) === "Respondent" && partySideWord("family", other, false) === "Applicant");
check("partySideWord: Small Claims, suing: you are the plaintiff, the other party the defendant", partySideWord("small-claims", you, true) === "Plaintiff" && partySideWord("small-claims", other, true) === "Defendant");

// 2.
const step = read("app/_components/PartiesStep.tsx");
check("the Parties step names each side through partySideWord", /const sideWord = \(party: Party\) => partySideWord\(court, party, personSues\);/.test(step));
check("the Parties step's \"Add another\" buttons and story offers use the court's words (sideWordsOf), never fixed ones", /const words = sideWordsOf\(court\);/.test(step) && !/"defendant"|"plaintiff"|"Defendant"|"Plaintiff"/.test(step), (step.match(/"[Dd]efendant"|"[Pp]laintiff"/g) ?? []).join(", "));
check("the drafts read sideWordsOf", /sideWordsOf\(ctx\.file\.area\)/.test(read("src/lib/case-system/drafts/recordDrafts.ts")));
check("the responding draft reads sideWordsOf", /const words = sideWordsOf\(courtPath\);/.test(read("src/lib/case-system/drafts/respondingDocumentDraft.ts")));
check("the exhibit book cover gets the court's words", /sideWords: sideWordsOf\(ownedCase\.court_path\)/.test(read("app/api/workspace/exhibit-book/route.ts")) && /caseDetails\.sideWords\?\.starts/.test(read("src/lib/case-workspace/exhibitBook.ts")));
// No other file names a side with its own "Applicant"/"Respondent" pair beside "Plaintiff"/"Defendant" (a new copy of the
// mapping). Declared: files whose words are a form's, a question's or a rule's own text, not a side's name for a screen.
const DECLARED: Record<string, string> = {
  "src/lib/case-system/parties/parties.ts": "the one function",
  "src/lib/case-workspace/exhibitBook.ts": "its fallback when no court is given (an older caller), the words sideWordsOf gives for Small Claims and Civil",
};
function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return ["node_modules", ".next"].includes(entry.name) ? [] : files(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}
const mappings = [...files("app"), ...files("src")].filter((file) => {
  const text = read(file);
  return /["'`]Applicant["'`]/.test(text) && /["'`]Respondent["'`]/.test(text) && /["'`]Plaintiff["'`]/.test(text) && /["'`]Defendant["'`]/.test(text);
});
const stray = mappings.filter((file) => !(file in DECLARED));
check("no other file keeps its own copy of the side words (applicant/respondent beside plaintiff/defendant)", stray.length === 0, stray.join(", "));

// 3.
check("the Parties step reads a Family party as a person, and only in Family", /const familyCourt = \(view\?\.checkpoint\.courtPath \?\? file\.area\) === "family";/.test(step) && /familyCourt && !party\.kind \? \{ \.\.\.party, kind: "person" \}/.test(step) && /list: held\.list\.map\(asPerson\)/.test(step));

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll court-words checks passed.");
process.exit(failed ? 1 : 0);
