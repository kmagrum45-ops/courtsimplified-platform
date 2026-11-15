/**
 * The person's words split across a form's boxes (a first box, a continued box, then added pages), each cut at a
 * paragraph or sentence end so no line is cut in the middle. The same rule as Form 7A's splitReasons, with each form's
 * own room. Pure. States no law.
 */

/** The text split into one piece per budget, then the rest (what goes on added pages). */
export function splitText(text: string, budgets: readonly number[]): string[] {
  const pieces: string[] = [];
  let rest = text.trim();
  for (const budget of budgets) {
    if (rest.length <= budget) { pieces.push(rest); rest = ""; continue; }
    const window = rest.slice(0, budget);
    const cut = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(". ") + 1);
    const at = cut > budget * 0.5 ? cut : budget;
    pieces.push(rest.slice(0, at).trimEnd());
    rest = rest.slice(at).trimStart();
  }
  pieces.push(rest);
  return pieces;
}
