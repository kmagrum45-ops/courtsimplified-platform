/**
 * The spelling check can only fix spelling — never change what the user said.
 *
 * COSTS NOTHING. Pure validator runs, no model call.
 *
 * WHY. Added 2026-10-04 with tidyWording.ts (site owner: "if the user makes
 * spelling mistakes, they stay"). A model asked to tidy text drifts into
 * rewording, and in a legal record a changed age, date or amount, an invented
 * name, or a legal label the user never used ("custody", "respondent") is the
 * system putting words in the user's mouth. This suite exists to catch the
 * validator letting any of those through, or blocking a genuine fix.
 *
 * Asserts properties: a pure spelling/punctuation fix passes; each kind of
 * drift is refused; the model output is matched to fields by key, and only
 * changed, safe suggestions survive; the builder never applies one silently.
 *
 * Run: node --import tsx scripts/verification/verifyTidyWording.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MAX_TIDY_FIELDS,
  MAX_TIDY_FIELD_LENGTH,
  MAX_TIDY_TOTAL_LENGTH,
  tidyRejectionReason,
  validateTidyResponse,
} from "../../src/lib/case-system/intake/tidyWording";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ORIGINAL =
  'mother primary and me, the father every second weekend and every wednsday for diner. she texted me "u cant see her this week" on march 3';

const accepted = [
  [
    "spelling, capitals and punctuation only",
    'The mother has primary care, and I, the father, have every second weekend and every Wednesday for dinner. She texted me "u cant see her this week" on March 3.',
  ],
] as const;
for (const [name, suggested] of accepted) {
  const reason = tidyRejectionReason(ORIGINAL, suggested);
  check(`accepts: ${name}`, reason === null, reason ?? "");
}

const refused = [
  ["a changed number", ORIGINAL.replace("march 3", "March 4")],
  ["a dropped number", ORIGINAL.replace(" on march 3", "")],
  ["an added number", `${ORIGINAL}, 2026`],
  ["a corrected quote", ORIGINAL.replace("u cant see her", "you can't see her")],
  ["an invented name", ORIGINAL.replace("she texted me", "Her mother Sarah texted me")],
  ["an added legal term", ORIGINAL.replace("mother primary", "mother has primary custody")],
  ["a big rewrite", "Shared care."],
] as const;
for (const [name, suggested] of refused) {
  check(`refuses: ${name}`, tidyRejectionReason(ORIGINAL, suggested) !== null);
}

{
  const fields = [
    { key: "a", text: ORIGINAL },
    { key: "b", text: "Already fine." },
  ];
  const out = validateTidyResponse(
    {
      fields: [
        { key: "a", text: accepted[0][1] },
        { key: "b", text: "Already fine." },
        { key: "z", text: "a field nobody sent" },
        { key: "a", text: "a duplicate key" },
      ],
    },
    fields,
  );
  check("only changed, known-key, first-seen suggestions survive", out.length === 1 && out[0].key === "a", JSON.stringify(out));
  check("malformed model output yields no suggestions", validateTidyResponse("nonsense", fields).length === 0);
}

const panel = readFileSync(path.join(process.cwd(), "app/builder/_components/TidyWordingReview.tsx"), "utf8");
check(
  "the builder applies a suggestion only from the user's 'Use suggested' choice",
  (panel.match(/setValue\(/g) ?? []).length === 1 && /if \(accept && suggestion && field\) field\.setValue/.test(panel),
);

{
  const num = (name: string) => Number((panel.match(new RegExp(`const ${name} = ([\\d_]+);`))?.[1] ?? "NaN").replace(/_/g, ""));
  check(
    "the panel's batch limits match the route's, so no batch is refused",
    num("MAX_FIELDS") === MAX_TIDY_FIELDS &&
      num("MAX_FIELD_LENGTH") === MAX_TIDY_FIELD_LENGTH &&
      num("MAX_TOTAL") === MAX_TIDY_TOTAL_LENGTH,
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll tidy-wording checks passed.");
