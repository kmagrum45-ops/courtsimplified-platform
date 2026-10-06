/**
 * What "The law on your question" gives for real questions to the Court
 * Assistant (retrieval/researchQuestion.ts): each research question, and the
 * provisions and verified quotes that answer it, or the law the library
 * lacks. Real model calls; a report, not a gate. Fabricated questions only.
 *
 *   npm run eval:assistant-law
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { findingsView } from "../../src/lib/case-system/retrieval/findingsView";
import { researchQuestion, type QuestionInput } from "../../src/lib/case-system/retrieval/researchQuestion";

const QUESTIONS: (QuestionInput & { id: string })[] = [
  { id: "bus-notice", courtPath: "small-claims", side: "plaintiff", question: "Do I have to notify OC Transpo or the city before I sue?", story: "I was hit by an OC Transpo bus at a crosswalk and dislocated my shoulder." },
  { id: "defence-time", courtPath: "small-claims", side: "defendant", question: "How long do I have to file my defence?", story: "I was served with a Small Claims claim yesterday for $2,800." },
  { id: "collect-judgment", courtPath: "small-claims", side: "plaintiff", question: "How do I collect on my judgment? He still hasn't paid." },
  { id: "charter-damages", courtPath: "civil", side: "plaintiff", question: "Can I get money for the police violating my Charter rights?", story: "Police searched my apartment without a warrant. No charges." },
  { id: "summary-judgment", courtPath: "civil", side: "defendant", question: "What does the court look at on a summary judgment motion?" },
  { id: "relocation-notice", courtPath: "family", side: "defendant", question: "How much notice does my ex have to give before moving with our son?", story: "We have a parenting order. She wants to move to Alberta." },
  { id: "child-support-retro", courtPath: "family", side: "plaintiff", question: "Can I get back child support he should have paid when he hid his income?" },
  { id: "will-i-win", courtPath: "small-claims", side: "plaintiff", question: "Will I win my case against the contractor?", story: "The contractor took a $9,000 deposit and quit after two days." },
];

async function main() {
  const lines: string[] = [];
  let shown = 0;
  for (const q of QUESTIONS) {
    const t0 = Date.now();
    const result = await researchQuestion(q);
    const view = findingsView(result, false);
    const s = ((Date.now() - t0) / 1000).toFixed(1);
    lines.push(`## ${q.id} (${q.courtPath}, ${s}s${result.skipped ? `, ${result.skipped}` : ""})`, "", `> ${q.question}`, "");
    for (const finding of view) {
      lines.push(`- **${finding.status}** — ${finding.question}`);
      for (const p of finding.provisions) {
        shown += 1;
        lines.push(`  - ${p.citation ?? p.label}: "${p.quote}"`);
      }
      if (finding.missingSource) lines.push(`  - library lacks: ${finding.missingSource}`);
    }
    lines.push("");
    console.log(`${q.id}: ${view.filter((f) => f.provisions.length).length}/${view.length} answered, ${s}s`);
  }
  writeFileSync(path.join(process.cwd(), "assistant-law-probe.md"), `# The law on your question: ${shown} provisions shown for ${QUESTIONS.length} questions\n\n${lines.join("\n")}\n`);
  console.log(`${shown} provisions shown for ${QUESTIONS.length} questions`);
}

void main();
