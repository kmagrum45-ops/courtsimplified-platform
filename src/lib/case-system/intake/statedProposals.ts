/**
 * WHAT THE STORY STATES, OFFERED ONCE (site owner, 11 Nov 2026: "A value stated in the story is proposed once for
 * confirmation and never asked cold afterward"; "a quote or estimate in a story may be offered once as the amount").
 *
 * The chat's story offers came only from the AI's proposals. When the AI proposed nothing for a question whose fact the
 * story states (the tree story's "a quote for 1500"; a date written in full), the chat asked it cold. The one story
 * reader (intakeReview.ts statedInStory) now adds an offer for each such question the AI left out, quoting the
 * sentence it read the value from. Each is still only an offer: Yes / No, that's not right / I'm not sure.
 *
 * Pure: no model, no network.
 */
import { statedInStory } from "../intakeReview";
import { formatForCourt } from "../dates";
import { factsOfQuestion } from "../caseFile/factsOfQuestion";
import { sentences } from "../sentences";
import type { IntakeQuestion } from "./questionBank";
import type { StoryAnswerProposal } from "./storyAnswerProposals";

/** The fact a question asks for that the story reader can state. */
const STATED_FACTS = ["amount", "whenHappened", "wants"] as const;

/** The sentence of the story a value was read from (its digits or its date's words), for the offer's quote. */
function quoteFor(story: string, fact: (typeof STATED_FACTS)[number], value: string): string {
  const all = sentences(story);
  const digits = value.replace(/\.00$/, "");
  const found = fact === "amount"
    ? all.find((sentence) => sentence.replace(/[$,]/g, "").includes(digits))
    : fact === "whenHappened"
      ? all.find((sentence) => sentence.includes(String(Number(value.slice(8, 10)))) && sentence.includes(value.slice(0, 4)))
      : all.find((sentence) => sentence.toLowerCase().includes(value.toLowerCase().slice(0, 20)));
  return (found ?? all[0] ?? story).trim().slice(0, 300);
}

/** How the offer shows the value: a day as the court writes it, an amount in dollars, the words as written. */
function shown(fact: (typeof STATED_FACTS)[number], value: string): string {
  if (fact === "whenHappened") return formatForCourt(value);
  if (fact === "amount") return `$${Number(value).toLocaleString("en-CA", { minimumFractionDigits: /\./.test(value) ? 2 : 0, maximumFractionDigits: 2 })}`;
  return value;
}

/**
 * The AI's proposals, plus an offer for each question the story states the fact of and the AI did not propose.
 * `questions`: the questions due now, in order. Never more than one offer per question.
 */
export function withStatedProposals(story: string, questions: readonly IntakeQuestion[], proposals: readonly StoryAnswerProposal[]): StoryAnswerProposal[] {
  const stated = statedInStory(story);
  const proposed = new Set(proposals.map((proposal) => proposal.questionId));
  const added: StoryAnswerProposal[] = [];
  for (const question of questions) {
    if (proposed.has(question.id)) continue;
    const fact = STATED_FACTS.find((candidate) => factsOfQuestion(question.id).includes(candidate) && stated[candidate]);
    if (!fact) continue;
    const value = stated[fact] as string;
    added.push({
      questionId: question.id,
      questionText: question.text,
      answer: shown(fact, value),
      storyQuote: quoteFor(story, fact, value),
      ...(fact === "whenHappened" ? { dateQuestion: true } : {}),
    });
    proposed.add(question.id);
  }
  return [...proposals, ...added];
}
