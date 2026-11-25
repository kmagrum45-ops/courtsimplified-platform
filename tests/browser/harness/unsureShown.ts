/**
 * "I DO NOT KNOW YET" SHOWN AS AN ANSWER, ON ANY SCREEN (founder's Chrome check of #541, 2 Nov: the review's earlier
 * answers showed "What outcome are you asking the court to order?: I do not know yet").
 *
 * A "not sure" is shown as the quiet "Not answered yet" line, never as the answer itself (the one reader,
 * caseFile/unsureAnswer.ts). This finds the lines of a screen that show the typed phrase as an answer: the line is
 * the phrase, or a label then the phrase ("Goal: I do not know yet", "Answered: I do not know yet. You can change it
 * here.", "I don't know (your answer as you changed it…)"). A sentence that only uses the words ("I do not know yet
 * whether he will pay") is not an answer. The story pack runs it on every screen, over the text outside the
 * page's controls and the person's own chat messages (UNSURE_SHOWN_SKIP), the way rawKeys.ts guards codes.
 * Test-only, so it lives with the browser harness (a module only tests import does not belong in src/:
 * test:reachability).
 * Pure; states no law.
 */
import { sentences } from "../../../src/lib/case-system/sentences";

/** Typed "I don't know" words, the ones a person types (not the stored codes, not the choice label "Not sure"). */
const TYPED = /^(?:i\s*(?:do\s*not|don'?t|dont)\s*know(?:\s*yet)?|idk|no\s*idea)\s*[.!]?$/i;

/** Where the phrase is the page's own control or the person's own message, never an answer the site shows back. */
export const UNSURE_SHOWN_SKIP = "button, label, option, select, textarea, input, summary, [role=button], [data-from=user]";

/** The value a line shows: what follows a label's colon, without a trailing note in brackets or a second sentence. */
function shownValues(line: string): string[] {
  const text = line.trim();
  const values = [text];
  const colon = text.indexOf(":");
  if (colon > 0 && colon < 160) values.push(text.slice(colon + 1).trim());
  return values.flatMap((value) => [value, value.replace(/\s*\([^)]*\)\s*$/, "").trim(), (sentences(value)[0] ?? "").trim()]);
}

/** The lines that show typed "I don't know" words as an answer. */
export function unsureShownAsAnswer(lines: string[]): string[] {
  return lines.flatMap((text) => text.split("\n")).map((line) => line.trim()).filter((line) => line && shownValues(line).some((value) => TYPED.test(value)));
}
