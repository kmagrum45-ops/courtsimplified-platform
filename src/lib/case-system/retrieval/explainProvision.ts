/**
 * A plain-language explanation of one provision (or one paragraph of a court
 * decision) from the corpus, shown only after a second, independent model
 * call and code have both checked it against the provision's own words.
 *
 * WHY TWO MODEL CALLS. "The law behind this" (AppliedLawPanel) shows each
 * provision verbatim, which is accurate but often unreadable: a section of
 * the Family Law Act is one sentence with four conditions. An explanation is
 * model wording about the law, and the failure that matters is not an
 * outrageous one (code catches those) but a quiet one: a condition left out,
 * an exception dropped, "may" turned into "must", a time limit rounded. A
 * model checking its own paragraph shares its own blind spot, so the check is
 * a separate call that never sees the first call's prompt or reasoning -- only
 * the provision and the explanation -- and is asked one thing: what in the
 * explanation the provision does not say, and what the provision says that
 * the explanation leaves out or changes. Anything on either list and the
 * explanation is not shown.
 *
 * WHAT CODE CHECKS, because the verifier is a model too:
 *   1. every number in the explanation (days, years, dollars, section
 *      numbers) appears in the provision or its citation -- no number is
 *      rounded, converted or invented;
 *   2. no outcome or merits wording (caseStrengthLanguageValidator, the same
 *      deny-list the analysis passes through, CLAUDE.md section 3);
 *   3. no advice addressed to the reader ("you should", "your case") -- an
 *      explanation says what the provision provides, for anyone;
 *   4. a sane length.
 *
 * WHAT IS EXPLAINED. Only a passage looked up by id in the built index and
 * re-read from the vendored source with its hash verified (corpusIndex.ts,
 * readPassage). The route accepts an id, never text, so nobody can have this
 * explain words that are not the official text.
 *
 * On any failure -- a model error, a parse failure, a verifier finding, a code
 * check -- the result is "not available" and the panel tells the person to
 * read the provision itself. A wrong explanation shown with confidence is
 * worse than none.
 *
 * Behind its own switch (phaseScope.plainExplanationsEnabled,
 * PLAIN_EXPLANATIONS=off) and the analysis-text switch. Asserted by
 * `npm run test:corpus-retrieval` (section "plain explanations").
 */

import { validateCaseStrengthLanguage } from "../intelligence/caseStrengthLanguageValidator";
import type { AiEffort } from "../aiModels";
import { loadCorpusIndex, passageHash, readPassage, type LoadedIndex, type Passage } from "./corpusIndex";

/**
 * The ceiling code enforces. The prompt asks for 700; the gap is so a good
 * explanation that runs slightly long is not thrown away. Measured
 * 2026-10-05 (explain-probe.md): with a 900 ceiling and no target in the
 * prompt, all six of the 30 withheld were refused by code for length -- the
 * model restated long provisions (a 20-item list in CPA s. 14) clause by
 * clause instead of explaining them.
 */
export const MAX_EXPLANATION_LENGTH = 1_000;

export type Verdict = {
  unsupported: string[];
  missing: string[];
  /** Set when code, not the checker, refused the attempt. */
  problem?: string;
};

const CODE_FEEDBACK = (reason: string) =>
  reason === "too long"
    ? `it was too long; stay under 700 characters`
    : reason === "too short"
      ? "it was too short"
      : `${reason}; write numbers exactly as the passage does and say nothing about anyone's case`;

export type ExplainResult =
  | { ok: true; id: string; explanation: string; citation: string }
  | { ok: false; id: string; reason: "not-found" | "unchecked" | "error" };

export type ExplainDeps = {
  /** Writes the explanation. `feedback` is the verifier's findings on a previous attempt. */
  generate: (provision: ProvisionForExplaining, feedback?: Verdict) => Promise<string | null>;
  /** The independent check. Sees only the provision and the explanation. */
  verify: (provision: ProvisionForExplaining, explanation: string) => Promise<Verdict | null>;
  index?: LoadedIndex | null;
};

export type ProvisionForExplaining = {
  /** e.g. "Family Law Act, R.S.O. 1990, c. F.3, s. 7(3)" or a decision and paragraph. */
  citation: string;
  text: string;
  decision: boolean;
};

export const EXPLAIN_SYSTEM_PROMPT = `You explain one passage of Ontario or Canadian law in plain words, for a person with no legal training.

Write 2 to 5 short sentences, in everyday words, that say what the passage provides. Stay under 700 characters. Explain; do not restate the passage clause by clause.

Rules you must never break:
- Keep every condition, exception, time limit, amount and number the passage contains. If the passage says "unless", "except", "only if", "subject to" or "may", the explanation must keep that.
- Write every number exactly as the passage writes it (if it says "six months", write "six months").
- Never add anything the passage does not say: no examples, no other rules, no practice tips, no consequences it does not state.
- If the passage refers to another section or rule, say it refers to that section; do not explain what the other section says.
- If the passage is a long list, say what kinds of things the list covers and that the full list is in the passage; do not repeat every item.
- Leave out amendment history ("O. Reg. 56/08, s. 2"), notes that a part was revoked, and web-page details such as an "updated" date.
- Explain it for anyone. Never write "you should", never mention anyone's case, never say who is likely to win or how a court will decide.
- For a paragraph of a court decision, say what the court said ("The court said that ..."), not what the law always is.

Return JSON: {"explanation": "<the explanation>"}`;

export const VERIFY_SYSTEM_PROMPT = `You check a plain-language explanation of a legal passage against the passage itself. You did not write the explanation. Be strict: a person will rely on it.

List:
- "unsupported": every statement in the explanation that the passage does not say, or says differently (a changed number, "may" turned into "must", a wider or narrower rule, an added example or consequence, a statement about what another section says).
- "missing": every condition, exception, time limit, amount or party in the passage that the explanation leaves out and without which a reader would misunderstand what the passage provides.

Simpler words for the same meaning are fine. Leaving out a cross-reference's number, amendment history or a note that a part was revoked is fine. A long list described by what it covers is fine if the explanation says the full list is in the passage. Do not list style or tone.

Return JSON: {"unsupported": ["..."], "missing": ["..."]}, with empty lists if there is nothing.`;

// ------------------------------------------------------------ code checks

const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ""));

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  twelfth: 12, fifteenth: 15, twentieth: 20, thirtieth: 30,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/**
 * The numbers a passage writes in words, as digits: Ontario statutes write
 * "five years", "six-month period", "forty-eight hours", "second
 * anniversary", "$2.5 million". A plain-language statement saying "5 years"
 * or "$2,500,000" states the same number (2026-10-07 law exam: correct
 * statements of ESA s. 64 were refused because the Act spells its numbers).
 * Pure; only ever adds numbers the passage really states.
 */
export function numbersInWords(text: string): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  for (const match of lower.matchAll(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](one|two|three|four|five|six|seven|eight|nine|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth))?\b/g)) {
    out.push(String(TENS[match[1]] + (match[2] ? UNITS[match[2]] : 0)));
  }
  for (const match of lower.matchAll(/\b([a-z]+)\b/g)) if (match[1] in UNITS) out.push(String(UNITS[match[1]]));
  for (const match of lower.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|fifty)?\s*hundred\b/g)) {
    out.push(String((match[1] ? UNITS[match[1]] ?? TENS[match[1]] : 1) * 100));
  }
  for (const match of lower.matchAll(/\$?\s*(\d+(?:\.\d+)?)\s+(thousand|million|billion)\b/g)) {
    const scale = match[2] === "thousand" ? 1e3 : match[2] === "million" ? 1e6 : 1e9;
    out.push(String(Math.round(Number(match[1]) * scale)));
  }
  return out;
}

/** The first number in `text` that `source` does not contain, or null. Pure; shared with sourcedQuestions.ts. */
export function numberNotInSource(text: string, source: string): string | null {
  const allowed = new Set([...numbers(source), ...numbersInWords(source)]);
  for (const n of numbers(text)) if (!allowed.has(n)) return n;
  return null;
}

/**
 * The first outcome or merits term (caseStrengthLanguageValidator) in `text`
 * that the provision itself does not use, or null. Pure; shared with
 * sourcedQuestions.ts.
 */
export function outcomeTermNotInProvision(text: string, provisionText: string): string | null {
  const provisionLower = provisionText.toLowerCase();
  let rest = text.toLowerCase();
  for (let guard = 0; guard < 20; guard += 1) {
    const strength = validateCaseStrengthLanguage(rest);
    if (strength.valid) return null;
    const term = strength.matchedTerm ?? "";
    if (!term || !provisionLower.includes(term)) return term || "outcome wording";
    rest = rest.split(term).join(" ");
  }
  return null;
}

const ADVICE = [/\byou should\b/i, /\byour (?:case|claim|chances?)\b/i, /\bchances?\b/i, /\blikely to (?:win|succeed|lose)\b/i];

/** Why an explanation must not be shown, or null when code finds nothing wrong. Pure; exported for the suite. */
export function explanationRejection(provision: ProvisionForExplaining, explanation: string): string | null {
  const text = explanation.trim();
  if (text.length < 40) return "too short";
  if (text.length > MAX_EXPLANATION_LENGTH) return "too long";
  const stray = numberNotInSource(text, `${provision.citation}\n${provision.text}`);
  if (stray) return `number "${stray}" is not in the provision`;
  // The deny-list is written for wording about a person's case. A provision
  // can use one of its terms as plain law -- CRA s. 12 says a consumer "may
  // dispute" an entry, ESA s. 1 that a provision "prevails" -- and repeating
  // the law's own word is not grading anyone's case. Measured 2026-10-05: two
  // of nine withheld explanations were refused only for that. A term counts
  // only when the provision does not use it.
  const term = outcomeTermNotInProvision(text, provision.text);
  if (term) return `outcome wording "${term}"`;
  for (const pattern of ADVICE) if (pattern.test(text)) return "advice addressed to the reader";
  return null;
}

/** The verifier's answer, or null when it is not the shape asked for (which fails closed). */
export function parseVerdict(raw: string): Verdict | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { unsupported, missing } = parsed as { unsupported?: unknown; missing?: unknown };
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : null;
  const a = list(unsupported);
  const b = list(missing);
  return a && b ? { unsupported: a, missing: b } : null;
}

export function parseExplanation(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { explanation?: unknown };
    return typeof parsed?.explanation === "string" ? parsed.explanation.trim() : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ the pipeline

export function provisionOf(passage: Passage): ProvisionForExplaining {
  const { source } = passage;
  const decision = source.tier === "case-law";
  const citation = decision
    ? `${source.title}, ${source.citation}${passage.pinpoint ? `, ${passage.pinpoint}` : ""}`
    : [source.title, source.citation, passage.pinpoint].filter(Boolean).join(", ");
  return { citation, text: passage.text, decision };
}

/**
 * Generate, check, and on a finding try once more with the findings given
 * back; the second attempt is checked from scratch. Never throws.
 */
export async function explainChecked(
  provision: ProvisionForExplaining,
  deps: Pick<ExplainDeps, "generate" | "verify">,
): Promise<{ explanation: string } | { failed: "unchecked" | "error" }> {
  let feedback: Verdict | undefined;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const explanation = await deps.generate(provision, feedback);
      if (!explanation) return { failed: "error" };
      const rejection = explanationRejection(provision, explanation);
      if (rejection) {
        feedback = { unsupported: [], missing: [], problem: CODE_FEEDBACK(rejection) };
        continue;
      }
      const verdict = await deps.verify(provision, explanation);
      if (!verdict) return { failed: "error" };
      if (verdict.unsupported.length === 0 && verdict.missing.length === 0) return { explanation: explanation.trim() };
      feedback = verdict;
    }
    return { failed: "unchecked" };
  } catch {
    return { failed: "error" };
  }
}

/** Keyed by the passage's hash, so a re-fetched source is explained afresh. */
const cache = new Map<string, ExplainResult>();
const CACHE_LIMIT = 2_000;

export function clearExplanationCache(): void {
  cache.clear();
}

export async function explainPassage(id: string, deps?: Partial<ExplainDeps>): Promise<ExplainResult> {
  const index = deps && "index" in deps ? deps.index ?? null : loadCorpusIndex();
  const passage = index ? readPassage(index, id, 1) : null;
  if (!passage) return { ok: false, id, reason: "not-found" };
  const key = passageHash(passage, passage.source);
  const hit = cache.get(key);
  if (hit) return hit;

  const provision = provisionOf(passage);
  const outcome = await explainChecked(provision, {
    generate: deps?.generate ?? generateWithModel,
    verify: deps?.verify ?? verifyWithModel,
  });
  const result: ExplainResult =
    "explanation" in outcome
      ? { ok: true, id, explanation: outcome.explanation, citation: provision.citation }
      : { ok: false, id, reason: outcome.failed };
  // A model error is not remembered: the next request tries again.
  if (result.ok || result.reason === "unchecked") {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key, result);
  }
  return result;
}

// ------------------------------------------------------------ model calls

function provisionPrompt(provision: ProvisionForExplaining): string {
  return `${provision.decision ? "A paragraph of a court decision" : "Passage"}: ${provision.citation}\n\n${provision.text}`;
}

async function chatJson(system: string, user: string, effort: string): Promise<string> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Audited with the analysis it explains (the same call type the retrieval
  // calls use, so no migration is needed), told apart by prompt version.
  return withAiCallContext({ callType: "small-claims-analysis" }, async () => {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      ...modelParams("standard", { effort: effort as AiEffort, temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  });
}

export async function generateWithModel(provision: ProvisionForExplaining, feedback?: Verdict): Promise<string | null> {
  const retry = feedback
    ? `\n\nA checker found these problems with an earlier explanation. Write a new one that fixes them:\n${[
        ...feedback.unsupported.map((item) => `- not in the passage: ${item}`),
        ...feedback.missing.map((item) => `- left out: ${item}`),
        ...(feedback.problem ? [`- ${feedback.problem}`] : []),
      ].join("\n")}`
    : "";
  const raw = await chatJson(EXPLAIN_SYSTEM_PROMPT, provisionPrompt(provision) + retry, process.env.AI_EFFORT_EXPLAIN || "low");
  return parseExplanation(raw);
}

export async function verifyWithModel(provision: ProvisionForExplaining, explanation: string): Promise<Verdict | null> {
  const raw = await chatJson(
    VERIFY_SYSTEM_PROMPT,
    `${provisionPrompt(provision)}\n\nExplanation to check:\n${explanation}`,
    process.env.AI_EFFORT_EXPLAIN_CHECK || "medium",
  );
  return parseVerdict(raw);
}
