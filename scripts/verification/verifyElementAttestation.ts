/**
 * "I have this" and "I don't have this" work on every element of every claim type, from any saved element map.
 *
 * WHAT IT CATCHES: the Form 7A checklist lists every element of the kind the case record holds, but the element map
 * saved with the case holds only what the question step built -- for the kind it matched, or nothing at all when that
 * step never ran. The two buttons called recordDepthAnswer / recordCannotProvide on that map, which throw for an
 * element the map does not hold, so the click did nothing and the console showed `elementStateMap: unknown element id
 * "reasonably-acceptable-quality-cpw"` (browser test, 27 Nov 2026; staging case 91f708d3, contractor kind, no map saved).
 *
 * For every claim type in CLAIM_TYPES and every plaintiff element it can show, starting from three saved maps (none,
 * another kind's, the kind's own), the checklist's one path (attestElement) must:
 *   1. not throw, for "provided" (with words) and "cannot-provide";
 *   2. record exactly that state, with the person's words for "provided";
 *   3. keep every record the saved map already held;
 *   4. take the element off the readiness gate's outstanding list.
 * And the checklist (StatementOfClaimSurface.tsx) takes that path for both buttons, never the throwing record
 * functions on the saved map directly, and shows a plain message (ELEMENT_NOT_RECORDED) if recording still fails.
 *
 * Costs nothing: pure functions and a source read. Run: npm run test:element-attestation
 */

import { readFileSync } from "node:fs";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { attestElement, createElementStateMap, type ElementStateMap } from "../../src/lib/case-system/intake/depth/elementStateMap";
import { evaluateReadinessGate } from "../../src/lib/case-system/readiness/readinessGate";
import { ELEMENT_NOT_RECORDED } from "../../src/lib/case-system/copy/askCopy";

let passed = 0;
const failures: string[] = [];
function check(ok: boolean, label: string) {
  if (ok) passed += 1;
  else failures.push(label);
}

const WORDS = "The signed contract and three emails";
let elementsChecked = 0;
const typesWithFailures = new Set<string>();

for (const [index, claimType] of CLAIM_TYPES.entries()) {
  const elements = claimType.plaintiffElements;
  const other = CLAIM_TYPES[(index + 1) % CLAIM_TYPES.length];
  const otherMap = createElementStateMap(other.plaintiffElements.filter((element) => !elements.some((own) => own.id === element.id)));
  const saved: [string, ElementStateMap][] = [
    ["no saved map", {}],
    [`${other.id}'s map`, otherMap],
    ["its own map", createElementStateMap(elements)],
  ];
  for (const element of elements) {
    elementsChecked += 1;
    for (const [from, map] of saved) {
      for (const have of [true, false] as const) {
        const label = `${claimType.id} / ${element.id} / ${have ? "I have this" : "I don't have this"} / from ${from}`;
        let next: ElementStateMap | null = null;
        try {
          next = attestElement(map, elements, have ? { elementId: element.id, have, answerText: WORDS } : { elementId: element.id, have });
        } catch (error) {
          check(false, `${label}: threw ${error instanceof Error ? error.message : String(error)}`);
          typesWithFailures.add(claimType.id);
          continue;
        }
        check(true, label);
        const record = next[element.id];
        check(record?.state === (have ? "provided" : "cannot-provide"), `${label}: recorded ${record?.state ?? "nothing"}`);
        if (have) check(record?.userText === WORDS, `${label}: the person's words are kept`);
        check(Object.keys(map).every((id) => id === element.id || next![id] === map[id]), `${label}: every other saved record kept as it was`);
        const gate = evaluateReadinessGate({ claimType, elementStateMap: next, confirmedRemedyId: null, remedyHeld: true, storyText: "story" });
        check(!gate.outstanding.some((item) => item.elementId === element.id), `${label}: off the outstanding list`);
      }
    }
  }
}

// The checklist takes the one path for both buttons, and says so when recording fails.
const surface = readFileSync("app/builder/_components/StatementOfClaimSurface.tsx", "utf8");
check(/attestElement\(stateMap,\s*claimType\?\.plaintiffElements/.test(surface), "the checklist records through attestElement with the kind's elements");
check(!/\brecordDepthAnswer\(|\brecordCannotProvide\(/.test(surface), "the checklist never calls the throwing record functions on the saved map directly");
check(/catch \(error\)[\s\S]{0,300}setAttestFailed\(element\.elementId\)/.test(surface) && /\{ELEMENT_NOT_RECORDED\}/.test(surface), "a failed recording shows ELEMENT_NOT_RECORDED");
check(!/setAnswerDrafts\([^)]*\{\s*\}\s*\)/.test(surface), "the words typed are never cleared by the buttons");
check(ELEMENT_NOT_RECORDED.length > 0 && !/error|exception|undefined/i.test(ELEMENT_NOT_RECORDED), "the message is in plain words");

console.log(`claim types: ${CLAIM_TYPES.length}; elements: ${elementsChecked}; claim types that threw: ${typesWithFailures.size}${typesWithFailures.size ? ` (${[...typesWithFailures].join(", ")})` : ""}`);
if (failures.length) {
  console.log(`\nverifyElementAttestation: ${failures.length} failed, ${passed} passed`);
  for (const failure of failures.slice(0, 15)) console.log(`  FAIL ${failure}`);
  if (failures.length > 15) console.log(`  ... and ${failures.length - 15} more`);
  process.exit(1);
}
console.log(`verifyElementAttestation: all ${passed} checks passed`);
