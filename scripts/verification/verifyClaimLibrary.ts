/**
 * Everything the public claims library shows is approved library content.
 *
 * COSTS NOTHING. Pure data; no model call.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a string /claims or /claims/[id] renders that is not in the content
 *     inventory, which the output guard would blank on the live page (a new
 *     claim type, element, defence or note added to a catalogue without
 *     being registered);
 *   - two library entries with the same id (one page would hide the other);
 *   - a defence or remedy id a claim type references that does not exist
 *     (the page would silently drop it).
 *
 * Run: node --import tsx scripts/verification/verifyClaimLibrary.ts
 */
import { DEFENCE_CONCEPTS } from "../../src/lib/case-system/intake/claimTypes";
import { REMEDY_TYPES } from "../../src/lib/case-system/intake/remedyTypes";
import { LIBRARY_MATTER_TYPES, defencesFor, remediesFor } from "../../src/lib/content-library/claimLibrary";
import { checkUserContent } from "../../src/lib/content-library/outputGuard";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const rendered: [string, string][] = [];
for (const entry of LIBRARY_MATTER_TYPES) {
  rendered.push([entry.id, entry.broughtBy]);
  for (const element of entry.plaintiffElements) {
    rendered.push([entry.id, element.name], [entry.id, element.plainExplanation]);
    for (const category of element.evidenceCategories) {
      rendered.push([entry.id, category.name], [entry.id, category.why], ...category.examples.map((e): [string, string] => [entry.id, e]));
    }
  }
  for (const item of entry.defendantConsiderations) {
    rendered.push([entry.id, item.name], [entry.id, item.plainExplanation], [entry.id, item.whenThisComesUp]);
  }
  for (const concept of defencesFor(entry)) rendered.push([entry.id, concept.name], [entry.id, concept.plainExplanation]);
  for (const remedy of remediesFor(entry)) rendered.push([entry.id, remedy.plainExplanation]);
  for (const note of entry.proceduralNotes) rendered.push([entry.id, note.note]);
}
const blocked = rendered.filter(([, text]) => text && !checkUserContent(text).allowed);
for (const [id, text] of blocked.slice(0, 8)) console.log(`      ${id}: "${text.slice(0, 80)}"`);
check(`every one of ${rendered.length} strings the library shows passes the output guard`, blocked.length === 0, `${blocked.length} blocked`);

const ids = LIBRARY_MATTER_TYPES.map((entry) => entry.id);
check("library ids are unique across the three catalogues", new Set(ids).size === ids.length);

const missingDefences = LIBRARY_MATTER_TYPES.flatMap((entry) =>
  entry.applicableDefenceConceptIds.filter((id) => !DEFENCE_CONCEPTS.some((concept) => concept.id === id)).map((id) => `${entry.id} -> ${id}`),
);
check("every defence a claim type names exists", missingDefences.length === 0, missingDefences.join(", "));
const missingRemedies = LIBRARY_MATTER_TYPES.flatMap((entry) =>
  entry.remedies.filter((id) => !REMEDY_TYPES.some((remedy) => remedy.id === id)).map((id) => `${entry.id} -> ${id}`),
);
check("every remedy a claim type names exists", missingRemedies.length === 0, missingRemedies.join(", "));

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
