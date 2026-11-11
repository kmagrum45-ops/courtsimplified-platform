/**
 * EVERY "WHAT KIND OF CASE" ANSWER LEADS TO A KIND OF ITS OWN COURT, OR ITS GAP IS DECLARED WITH THE REASON (coverage audit,
 * 11 Nov 2026; Chrome's #547 report, G2: "A loan or debt" brought no checklist, and nothing said why).
 *
 * What it checks, in all three courts (Small Claims' dispute kinds, civil's and Family's issues), with the real reader
 * (caseFile.ts claimKindOf):
 *   1. each answer leads to a kind of claim of its own court, or is listed in caseFile.ts ANSWERS_WITH_NO_KIND with a reason;
 *   2. a listed answer still leads to no kind (one that gained a kind is deleted from the list: a list that must be kept
 *      is fine, a stale one is not);
 *   3. every kind in every catalogue has a checklist (evidence categories) and a sourced explanation on each element;
 *   4. a kind an answer leads to belongs to that answer's court.
 * Sources from another court are checked by test:sources-fit-court.
 *
 * WHAT FAILURE THIS CATCHES: an answer that silently brings no checklist, or a kind with no checklist or source.
 *
 * Run: npm run test:answer-coverage
 */
import { claimKindOf, emptyCaseFile, DISPUTE_CATEGORY_WORDS } from "../../src/lib/case-system/caseFile/caseFile";
import { CIVIL_ISSUE_OPTIONS, FAMILY_ISSUE_OPTIONS } from "../../app/builder/_components/guidedFields";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { CIVIL_CLAIM_TYPES } from "../../src/lib/case-system/intake/civilClaimTypes";
import { FAMILY_MATTER_TYPES } from "../../src/lib/case-system/intake/familyMatterTypes";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

type Court = "small-claims" | "civil" | "family";
const fileWith = (court: Court, question: string, value: unknown) => {
  const file = emptyCaseFile();
  file.claimKind = { state: "answered", value: value as string, confirmed: true, source: { kind: "answer", question } };
  return { ...file, area: court };
};
const answers: Array<{ court: Court; value: string; kind: string | null }> = [
  ...Object.keys(DISPUTE_CATEGORY_WORDS).map((value) => ({ court: "small-claims" as const, value, kind: claimKindOf(fileWith("small-claims", "sc-orient-dispute-category", value) as never).claimTypeId })),
  ...CIVIL_ISSUE_OPTIONS.map((option) => ({ court: "civil" as const, value: option.value, kind: claimKindOf(fileWith("civil", "civil:issues", [option.value]) as never).claimTypeId })),
  ...FAMILY_ISSUE_OPTIONS.map((option) => ({ court: "family" as const, value: option.value, kind: claimKindOf(fileWith("family", "family:issues", [option.value]) as never).claimTypeId })),
];
const catalogue: Record<Court, readonly { id: string; courtArea: string; plaintiffElements: { evidenceCategories: unknown[]; plainExplanation: string; sourceUrl: string }[] }[]> = {
  "small-claims": CLAIM_TYPES, civil: CIVIL_CLAIM_TYPES, family: FAMILY_MATTER_TYPES,
};

async function main() {
  const coverage = await import("../../src/lib/case-system/caseFile/caseFile").catch(() => null);
  const declared = coverage?.ANSWERS_WITH_NO_KIND ?? null;
  check("setup: the answers with no kind are declared (caseFile.ts ANSWERS_WITH_NO_KIND)", Boolean(declared));
  check(`setup: answers read in all three courts (${answers.length})`, (["small-claims", "civil", "family"] as const).every((court) => answers.some((answer) => answer.court === court)));

  const silent = answers.filter((answer) => !answer.kind && !declared?.[answer.court]?.[answer.value]?.trim()).map((answer) => `${answer.court}: ${answer.value}`);
  check(`1. every answer leads to a kind or its gap is declared with a reason (${answers.filter((answer) => !answer.kind).length} with no kind)`, silent.length === 0, silent.join(", "));
  const stale = answers.filter((answer) => answer.kind && declared?.[answer.court]?.[answer.value]).map((answer) => `${answer.court}: ${answer.value} -> ${answer.kind}`);
  check("2. no declared answer has since gained a kind (delete its line)", stale.length === 0, stale.join(", "));
  const unknown = Object.entries(declared ?? {}).flatMap(([court, list]) => Object.keys(list).filter((value) => !answers.some((answer) => answer.court === court && answer.value === value)).map((value) => `${court}: ${value}`));
  check("2. every declared answer is a real answer", unknown.length === 0, unknown.join(", "));

  const thin = (Object.entries(catalogue) as [Court, (typeof catalogue)[Court]][]).flatMap(([court, kinds]) =>
    kinds.flatMap((kind) => kind.plaintiffElements.length === 0 ? [`${court}: ${kind.id} has no elements`] : kind.plaintiffElements.filter((element) => !element.evidenceCategories?.length || !element.plainExplanation?.trim() || !element.sourceUrl).map(() => `${court}: ${kind.id}`)),
  );
  check(`3. every kind has a checklist and a sourced explanation (${Object.values(catalogue).reduce((n, list) => n + list.length, 0)} kinds)`, thin.length === 0, thin.slice(0, 10).join(", "));

  const ownCourt = (court: Court, id: string) => catalogue[court].some((kind) => kind.id === id);
  const crossed = answers.filter((answer) => answer.kind && !ownCourt(answer.court, answer.kind)).map((answer) => `${answer.court}: ${answer.value} -> ${answer.kind}`);
  check("4. a kind an answer leads to is of that answer's court", crossed.length === 0, crossed.join(", "));

  console.log(failures ? `\n${failures} check(s) failed.` : "\nEvery answer leads to a kind of its own court, or its gap is declared.");
  process.exit(failures ? 1 : 0);
}
void main();
