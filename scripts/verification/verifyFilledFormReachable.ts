/**
 * THE FILLED OFFICIAL FORM IS REACHABLE WHEREVER ITS FORM IS (site owner, 16 Nov 2026; Chrome milestone test of #550,
 * row 24: "No filled Form 7A anywhere" for injury, contractor and loan claims).
 *
 * Cause found: the builder's Form 7A section returned early when the kind of claim had no checklist, before the Parties
 * step and the filled form; the Forms tab never offered the filled form at all.
 *
 * What it checks, reading the source (no build, no browser):
 *   1. every form the site fills (FORM_MAPS) says which side files it (FILED_BY), and FILED_BY names no other form;
 *   2. filledFormFor offers each form to the side that files it, by court and form number as the catalogue writes it
 *      ("Form 7A"), and never to the other side;
 *   3. one browser file asks for a filled form (FilledForm.tsx, POST /api/cases/forms/filled), so every place that
 *      offers one shares its download, its button words and its "missing" list;
 *   4. the Form 7A section draws the Parties step and the filled form in EVERY return (each section it can return holds
 *      {partiesAndForm}, and FilledForm7A appears only inside it), so no kind of claim can hide the download;
 *   5. the Forms tab offers the filled form on the form's card (filledFormFor, FilledForm / FilledForm7A);
 *   6. the button always says "filled" (filledButtonLabel), so it is never mistaken for the blank official form.
 *
 * What failure it catches: a kind of claim, a page or a new form from which the filled official form cannot be reached.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { FILED_BY, FORM_MAPS, filledFormFor } from "../../src/lib/case-system/forms/maps";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

// 1.
const ids = FORM_MAPS.map((map) => map.id);
check("every form the site fills says which side files it (FILED_BY)", ids.every((id) => id in FILED_BY), ids.filter((id) => !(id in FILED_BY)).join(", "));
check("FILED_BY names no form the site does not fill", Object.keys(FILED_BY).every((id) => ids.includes(id)), Object.keys(FILED_BY).filter((id) => !ids.includes(id)).join(", "));

// 2.
const wrong: string[] = [];
for (const map of FORM_MAPS) {
  const by = FILED_BY[map.id];
  if (by === "with-7A") continue;
  for (const starts of [true, false]) {
    const offered = filledFormFor(map.court, `Form ${map.number}`, starts)?.id === map.id;
    const should = by === "either" || (by === "starts") === starts;
    if (offered !== should) wrong.push(`${map.id} ${starts ? "starting" : "responding"}: ${offered ? "offered" : "not offered"}`);
  }
}
check("filledFormFor offers each form to the side that files it, and only to that side", wrong.length === 0, wrong.join("; "));
check("Form 7A is offered for a Small Claims claim whatever its kind (no kind or checklist is read)", filledFormFor("small-claims", "Form 7A", true)?.id === "small-claims/7A" && !/claimKind|claimType|checklist/i.test(filledFormFor.toString()));

// 3.
function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return ["node_modules", ".next", "api"].includes(entry.name) ? [] : files(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}
const askers = [...files("app"), ...files("src")].filter((file) => read(file).includes("/api/cases/forms/filled"));
check("one browser file asks for a filled form: app/_components/FilledForm.tsx", JSON.stringify(askers) === JSON.stringify(["app/_components/FilledForm.tsx"]), askers.join(", "));

// 4.
const surface = read("app/builder/_components/StatementOfClaimSurface.tsx");
const sections = (surface.match(/data-testid="statement-of-claim-surface"/g) ?? []).length;
const drawn = (surface.match(/\{partiesAndForm\}/g) ?? []).length;
const definition = surface.slice(surface.indexOf("const partiesAndForm = ("), surface.indexOf("\n  );", surface.indexOf("const partiesAndForm = (")));
check(`the Form 7A section draws the Parties step and the filled form in every return (${sections} sections, ${drawn} drawn)`, sections > 0 && drawn === sections);
check("FilledForm7A and PartiesStep appear in the Form 7A section only inside partiesAndForm", (surface.match(/<FilledForm7A\b/g) ?? []).length === 1 && definition.includes("<FilledForm7A") && (surface.match(/<PartiesStep\b/g) ?? []).length === 1 && definition.includes("<PartiesStep"));
// Self-test: the old shape (the early return without it) is caught.
const old = `return (<section data-testid="statement-of-claim-surface"></section>); return (<section data-testid="statement-of-claim-surface">{partiesAndForm}</section>)`;
check("self-test: a section returned without {partiesAndForm} is caught", (old.match(/data-testid="statement-of-claim-surface"/g) ?? []).length !== (old.match(/\{partiesAndForm\}/g) ?? []).length);

// 5.
const forms = read("app/forms/FormsWorkspace.tsx");
check("the Forms tab offers the filled form on the form's card (filledFormFor, FilledForm / FilledForm7A)", /filledFormFor\(form\.court_type/.test(forms) && /<FilledForm7A\b/.test(forms) && /<FilledForm map=\{map\}/.test(forms));

// 6.
const shared = read("app/_components/FilledForm.tsx");
check("the download button always says the form is filled (filledButtonLabel)", /`Download filled Form \$\{map\.number\} \(PDF\)`/.test(shared) && /\{filledButtonLabel\(map\)\}/.test(shared) && !/Download Form 7A/.test(read("app/_components/FilledForm7A.tsx")));

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll filled-form checks passed.");
process.exit(failed ? 1 : 0);
