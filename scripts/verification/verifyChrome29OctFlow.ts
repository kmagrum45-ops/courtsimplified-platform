/**
 * The site owner's Chrome re-test of 29 Oct, flow items C, D3 and H, checked through
 * the real code with no browser, no model and no database.
 *
 * COSTS NOTHING. The guided turn runs with every model step stubbed.
 *
 * Each check asserts the WANTED property, never today's wording:
 *   C  - a question the person types into an answer box is never silently kept as
 *        their answer (Small Claims guided chat; civil and Family one-at-a-time boxes);
 *   D3 - the "explain it" button says something of its own, never the generic
 *        sentence, and never the same paragraph "Why does this matter?" already shows;
 *   H1 - no Small Claims box suggests an outcome the court cannot order (an apology);
 *   H2 - the kind of dispute can take more than one answer;
 *   H3 - the court-office line names the city with its own capitalisation.
 *
 * WHAT FAILURE THIS CATCHES: any of the above coming back after it is fixed, or a NEW
 * failure. A check listed in tests/browser/harness/knownProblems29oct-flow.ts is
 * expected to fail until its fix lands; when it starts passing, this suite fails and
 * asks for the entry to be deleted, so the list never hides a fixed problem.
 *
 * Run: node --import tsx scripts/verification/verifyChrome29OctFlow.ts
 */
import fs from "node:fs";
import path from "node:path";

import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { explanationFor, GENERIC_FALLBACK } from "../../src/lib/content-library/questionExplanations";
import { civilCourtOfficesFor, familyCourtOfficesFor } from "../../src/lib/content-library/nextStepPractical";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";
import { answerNeedsMore } from "../../app/builder/_components/GuidedFormChat";
import { KNOWN_PROBLEMS_29OCT_FLOW } from "../../tests/browser/harness/knownProblems29oct-flow";

type Check = { name: string; run: () => Promise<string[]> | string[] };

const PERSON_QUESTIONS = ["Can I ask for $5,000?", "Do I ask for $1,200 or $1,500?", "Is there a deadline?"];

const checks: Check[] = [
  {
    name: "C: a question typed as a Small Claims guided answer is not silently saved as the answer",
    run: async () => {
      const problems: string[] = [];
      for (const question of QUESTION_BANK.filter((q) => q.capturesField && q.courtArea === "small-claims")) {
        for (const typed of PERSON_QUESTIONS) {
          const result = await orchestrateIntakeTurn({}, [], typed, "stub-key", QUESTION_BANK, CLAIM_TYPES, "small-claims", question.id, {
            runSafety: async () => ({ classification: "clear" as const, reason: "stub", requestsLegalAdvice: false }),
            extractFacts: async () => ({ facts: {}, directFields: [] }),
            classifyClaimType: async () => null,
            composeVoice: async () => ({ leadIn: null, questionText: "", fellBackToPlainText: true }),
            proposeAnswers: async () => [],
          } as never);
          const saved = (result.facts as Record<string, unknown>)[question.capturesField!];
          // Wanted: either not kept as the answer, or carried back as the person's question to be answered.
          const carried = JSON.stringify(result).includes(JSON.stringify(typed).slice(1, -1)) && saved !== typed;
          if (saved === typed && !carried) problems.push(`${question.id}: "${typed}" kept as ${question.capturesField}`);
        }
      }
      return problems;
    },
  },
  {
    // Owner, 29 Oct: a mixed answer is split. The statement is saved; the question stays open for
    // the checked answer. Typed in the amount question: "$1,500" is the amount, "can I ask for more?"
    // is the person's question.
    name: "C: a mixed answer (\"$1,500, can I ask for more?\") saves the statement and keeps the question open",
    run: async () => {
      const typed = "$1,500, can I ask for more?";
      const amount = QUESTION_BANK.find((q) => q.id === "sc-amount-claimed");
      if (!amount?.capturesField) return ["the Small Claims amount question (sc-amount-claimed) was not found"];
      const result = await orchestrateIntakeTurn({}, [], typed, "stub-key", QUESTION_BANK, CLAIM_TYPES, "small-claims", amount.id, {
        runSafety: async () => ({ classification: "clear" as const, reason: "stub", requestsLegalAdvice: false }),
        extractFacts: async () => ({ facts: {}, directFields: [] }),
        classifyClaimType: async () => null,
        composeVoice: async () => ({ leadIn: null, questionText: "", fellBackToPlainText: true }),
        proposeAnswers: async () => [],
      } as never);
      const saved = String((result.facts as Record<string, unknown>)[amount.capturesField] ?? "");
      const problems: string[] = [];
      if (!/1,?500/.test(saved)) problems.push(`the statement part is not saved as the amount (saved "${saved}")`);
      if (/can i ask/i.test(saved)) problems.push(`the question part is saved inside the answer ("${saved}")`);
      const elsewhere = JSON.stringify({ ...result, facts: undefined });
      if (!/can I ask for more\?/i.test(elsewhere)) problems.push("the question part is not kept open anywhere in the turn's result");
      return problems;
    },
  },
  {
    name: "C: a question typed into a civil or Family answer box is not kept as the answer without a note",
    run: () => {
      const problems: string[] = [];
      const fields = [
        ...civilGuidedFields({ issues: [], documents: [] }).map((field) => ["civil", field] as const),
        ...familyGuidedFields({ issues: [], filed: [] }).map((field) => ["family", field] as const),
      ];
      for (const [court, field] of fields) {
        // The story box is the person's whole account, read by the home reading; the boxes after it are answers.
        if ((field.kind !== "text" && field.kind !== "longtext") || field.key === "facts") continue;
        for (const typed of PERSON_QUESTIONS) if (answerNeedsMore(field, typed) === null) problems.push(`${court} ${field.key}: "${typed}" kept with no note`);
      }
      return problems;
    },
  },
  {
    name: "D3: the explain button says something the why line does not already say",
    run: () =>
      ["sc-orient-role", "sc-amount-claimed", "sc-evidence-available", "sc-remedy-sought"].flatMap((id) => {
        const question = QUESTION_BANK.find((q) => q.id === id);
        const shown = explanationFor(id)?.text ?? GENERIC_FALLBACK;
        return question?.why && shown.trim() === question.why.trim() ? [`${id}: both buttons show the same paragraph`] : [];
      }),
  },
  {
    name: "D3: every question offered with an explain button has its own explanation",
    run: () =>
      // The four the Small Claims form shows FieldHelp for (SmallClaimsIntake.tsx ROLE/AMOUNT/EVIDENCE/REMEDY).
      ["sc-orient-role", "sc-amount-claimed", "sc-evidence-available", "sc-remedy-sought"].flatMap((id) =>
        (explanationFor(id)?.text ?? GENERIC_FALLBACK) === GENERIC_FALLBACK ? [`${id}: the generic sentence`] : [],
      ),
  },
  {
    name: "H1: no Small Claims box suggests an outcome the court cannot order (apology)",
    run: () => {
      const file = path.join(process.cwd(), "app/builder/_components/SmallClaimsIntake.tsx");
      const placeholders = [...fs.readFileSync(file, "utf8").matchAll(/placeholder="([^"]*)"/g)].map((match) => match[1]);
      const bank = QUESTION_BANK.filter((q) => q.courtArea === "small-claims").flatMap((q) => [q.text, ...(q.examples ?? []), ...((q as { choices?: string[] }).choices ?? [])]);
      return [...placeholders, ...bank].filter((text) => /\bapolog/i.test(text)).map((text) => `suggests: "${text}"`);
    },
  },
  {
    name: "H2: the kind of dispute can take more than one answer",
    run: () => {
      const question = QUESTION_BANK.find((q) => q.id === "sc-orient-dispute-category");
      return question && question.answerType === "choice" ? ["sc-orient-dispute-category takes one choice only"] : [];
    },
  },
  {
    name: "H3: the court-office line names the city with its own capitalisation",
    run: () => {
      const problems: string[] = [];
      for (const typed of ["kingston", "  kingston ", "KINGSTON", "thunder bay"]) {
        const lines = [
          ["small-claims", civilCourtOfficesFor("plaintiff:claim-filed", "small-claims", typed)],
          ["civil", civilCourtOfficesFor("civil:plaintiff:claim-issued", "civil", typed)],
          ["family", familyCourtOfficesFor("family:applicant:case-started", typed)],
        ] as const;
        for (const [court, offices] of lines) {
          if (!offices) continue;
          const words = offices.city.split(/\s+/).filter(Boolean);
          if (!words.every((word) => /^[A-Z][a-z'’-]*$/.test(word) || /^(of|the|on|upon)$/.test(word))) problems.push(`${court}: "If your case is in ${offices.city}"`);
        }
      }
      return problems;
    },
  },
];

async function main() {
  const known = new Map(KNOWN_PROBLEMS_29OCT_FLOW.map((problem) => [problem.test, problem]));
  let failed = 0;
  for (const check of checks) {
    const problems = await check.run();
    const entry = known.get(check.name);
    if (problems.length && entry) console.log(`KNOWN  ${check.name}\n       [${entry.id}] ${problems.slice(0, 3).join(" | ")}${problems.length > 3 ? ` (+${problems.length - 3} more)` : ""}`);
    else if (problems.length) { failed += 1; console.log(`FAIL   ${check.name}\n       ${problems.join("\n       ")}`); }
    else if (entry) { failed += 1; console.log(`FIXED  ${check.name}\n       now passes: delete its entry [${entry.id}] from tests/browser/harness/knownProblems29oct-flow.ts`); }
    else console.log(`PASS   ${check.name}`);
  }
  if (failed) { console.error(`\n${failed} check(s) need attention.`); process.exit(1); }
  console.log("\nAll checks pass or are listed as known problems.");
}

void main();
