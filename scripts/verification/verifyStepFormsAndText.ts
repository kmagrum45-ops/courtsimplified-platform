/**
 * THE NEXT-STEP CARD SHOWS ONLY THE TEXT AND FORMS THAT FIT THE RECORDED ANSWERS: THE SMALL-CLAIMS-SIZED LEAVE RULE ONLY
 * FOR $50,000 OR LESS, EVERY FORM THE STEP TEXT NAMES IN ITS FORMS LIST (OR LISTED FOR REVIEW), AND NO DIVORCE APPLICATION
 * FOR SOMEONE NEVER MARRIED (Chrome check of production c38e69fd, 8 Nov 2026, B4).
 *
 * Chrome: (a) the Civil step text for an $85,000 claim quoted the s. 23 (1.1) rule on starting a claim within the Small
 * Claims limit in the Superior Court; (b) it named "Information for court use (Form 14F)", which was not in "The forms";
 * (c) the Family step listed Form 8A (Application (Divorce)) for a couple who were never married. Causes: (a) the card's
 * lead paragraph (StageAnswerPanel forThisPerson) showed the published answer's sentences whatever the amount; (b) the
 * step's forms row (nextStepPractical.ts STEP_PRACTICAL) listed only 14A and 14C; (c) the Family starting row lists 8, 8A
 * and 35.1 for every case, reordered only by the story's words.
 *
 * What it checks (no legal wording is changed; only which sentences and forms are shown):
 *   1. forThisPerson leaves out the six leave sentences once the recorded amount is over $50,000, keeps them at $50,000 or
 *      less or with no amount, and never touches the notice-of-action sentence about the court's leave;
 *   2. every form a step's lead paragraph names is in its forms list, or the step is in stepFormsNamedPending.json (for
 *      the owner's legal review); a pending entry whose forms are now listed must be deleted (the list only shrinks);
 *      the Civil starting step lists 14D and 14F;
 *   3. practicalFor lists Form 8A for a Family starting step, and not when the person recorded they were never married.
 *
 * WHAT FAILURE THIS CATCHES: a rule about another size of claim, a form the text names but the list leaves out, or a
 * divorce form for a couple who never married.
 *
 * Run: npm run test:step-forms-and-text
 */
import fs from "node:fs";
import { forThisPerson } from "../../app/builder/_components/StageAnswerPanel";
import { practicalFor, STEP_PRACTICAL } from "../../src/lib/content-library/nextStepPractical";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

type Block = { stageId: string; whatToDoNext?: string };
const published = JSON.parse(fs.readFileSync("src/lib/content-library/published/stageAnswers.published.json", "utf8")) as { blocks: Block[] };
const civilStart = published.blocks.find((block) => block.stageId === "civil:plaintiff:claim-drafted-not-issued");
const lead = String(civilStart?.whatToDoNext ?? "").split(/\n\s*\n/)[0];

// 1. The leave rule for a claim within the Small Claims limit.
const LEAVE = "If your claim is within that limit, it can only be started in the Superior Court with that court's leave.";
const NOTICE = "the court's leave obtained on notice to the defendant";
check("1. the published Civil starting text holds the leave sentences (else this check checks nothing)", lead.includes(LEAVE) && lead.includes(NOTICE));
const over = forThisPerson(lead, { userWords: "", filingShown: false, amount: 85_000 });
check("1. $85,000: the six leave sentences are left out", !over.includes(LEAVE) && !over.includes("That amount is $50,000.") && !over.includes("interest of justice") && !over.includes("You may ask for leave by motion"), over.slice(-400));
check("1. $85,000: the notice-of-action sentence about the court's leave stays", over.includes(NOTICE));
check("1. $40,000: the leave sentences are shown", forThisPerson(lead, { userWords: "", filingShown: false, amount: 40_000 }).includes(LEAVE));
check("1. $50,000 exactly: shown", forThisPerson(lead, { userWords: "", filingShown: false, amount: 50_000 }).includes(LEAVE));
check("1. no amount recorded: shown", forThisPerson(lead, { userWords: "", filingShown: false }).includes(LEAVE));

// 2. Every form the step text names is in its forms list, or listed for review.
const pending = JSON.parse(fs.readFileSync("scripts/verification/stepFormsNamedPending.json", "utf8")) as { stepId: string; notListed: string[]; why: string }[];
const unlisted: string[] = [];
const stale: string[] = [];
for (const block of published.blocks) {
  const row = STEP_PRACTICAL[block.stageId];
  if (!row) continue;
  const text = String(block.whatToDoNext ?? "").split(/\n\s*\n/)[0];
  const named = new Set([...text.matchAll(/Forms? (\d+[A-Z]?(?:\.\d+[A-Z]?)?)/g)].map((match) => match[1]));
  const listed = new Set(row.forms.map((form) => form.replace(/^(civil|family):/, "")));
  const missing = [...named].filter((form) => !listed.has(form)).sort();
  const entry = pending.find((item) => item.stepId === block.stageId);
  const notCovered = missing.filter((form) => !entry?.notListed.includes(form));
  if (notCovered.length) unlisted.push(`${block.stageId}: ${notCovered.join(", ")}`);
  if (entry) for (const form of entry.notListed) if (!missing.includes(form)) stale.push(`${block.stageId}: ${form}`);
}
check("2. every form a step's text names is in its forms list, or listed for review", unlisted.length === 0, unlisted.join("\n      "));
check("2. no pending entry is stale (a form now listed is deleted from stepFormsNamedPending.json)", stale.length === 0, stale.join("\n      "));
check("2. every pending entry says why", pending.every((item) => item.why.trim().length > 0));
check("2. the Civil starting step lists 14A, 14C, 14D and 14F", ["14A", "14C", "14D", "14F"].every((form) => STEP_PRACTICAL["civil:plaintiff:claim-drafted-not-issued"].forms.includes(form)));

// 3. No divorce application for someone who recorded they were never married.
const familyStart = Object.keys(STEP_PRACTICAL).find((id) => id.startsWith("family:") && STEP_PRACTICAL[id].forms.some((form) => /8A$/.test(form)));
const numbers = (view: ReturnType<typeof practicalFor>) => (view?.forms ?? []).map((form) => form.number);
check("3. a Family starting step lists Form 8A when nothing says otherwise", Boolean(familyStart) && numbers(practicalFor(familyStart!, "family")).includes("8A"), String(familyStart));
check("3. not when the person recorded they were never married", Boolean(familyStart) && !numbers(practicalFor(familyStart!, "family", "", false, "", "", { notMarried: true })).includes("8A"));

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe card shows the text and forms that fit the recorded answers.");
process.exit(failures ? 1 : 0);
