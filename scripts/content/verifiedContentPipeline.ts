/**
 * PART 3 — the verified content pipeline. Two passes, and a third gate that is
 * not a model at all.
 *
 * *** THE SHAPE ***
 *
 *   DRAFTER    sees the stage, the quoted rule text, and practical excerpts.
 *              Writes the five parts.
 *
 *   VERIFIER   a SEPARATE call with no sight of the drafter's reasoning, its
 *              prompt, or its explanation. Sees only the sentences and the
 *              source material. For each sentence it must FIND AND QUOTE the
 *              exact passage that supports it, or mark it unsupported.
 *
 *   CODE       takes every quote the verifier returned and looks for it,
 *              verbatim, in the vendored corpus.
 *
 * *** THE THIRD GATE IS THE POINT ***
 *
 * A verifier asked to quote its support can invent a quote. It will look
 * right — the right register, the right rule number, a plausible clause — and
 * a reviewer skimming the record would accept it. So no model's word is taken
 * for whether the support exists. The quote is looked up in the same vendored
 * text the corpus checks run against, whitespace collapsed, and a quote that
 * is not there fails the sentence no matter how confidently it was offered.
 *
 * Two independent models agreeing is not verification. A model agreeing with
 * a file on disk is.
 *
 * *** WHY THE VERIFIER IS NOT SHOWN THE DRAFTER'S REASONING ***
 *
 * Given the drafter's justification, a verifier grades the argument rather
 * than the sentence, and a confident wrong rationale is exactly what it should
 * be catching. It gets the claim and the sources, nothing else — the position
 * a reviewer would be in.
 *
 * *** TWO REDRAFTS, THEN A HUMAN ***
 *
 * An unsupported sentence goes back with the verifier's reason attached. After
 * two failed redrafts the block is marked NEEDS_HUMAN and is not published.
 * Not downgraded, not softened, not published with a caveat. The failure mode
 * this avoids is a pipeline that always produces something.
 *
 * *** NOTHING HERE REACHES `approved` ***
 *
 * `verified-draft` is the ceiling. It means checked against source text by a
 * separate pass and by code. It does not mean a licensee has read it.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { createOpenAIClient } from "../../src/lib/case-system/openaiClient";
import type { CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import { SOURCE_NAMES } from "../../src/lib/case-system/stage-map/citations";
import type { SentenceVerdict } from "../../src/lib/content-library/stageAnswers";
import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_DIR = path.join(ROOT, "docs", "sources", "corpus");

/**
 * Published rates, used only to report what a run cost.
 *
 * If these are stale the TOKEN COUNTS in the report are still exact — correct
 * the rate here and the arithmetic follows. They are stated rather than
 * hidden so nobody has to trust a dollar figure whose origin is invisible.
 */
export const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
};

export type Usage = { model: string; inputTokens: number; outputTokens: number; calls: number };

export function costOf(usage: Usage): number {
  const rate = PRICING[usage.model];
  if (!rate) return 0;
  return (
    (usage.inputTokens / 1_000_000) * rate.inputPerM +
    (usage.outputTokens / 1_000_000) * rate.outputPerM
  );
}

export function addUsage(total: Usage[], entry: Usage): void {
  const existing = total.find((candidate) => candidate.model === entry.model);
  if (existing) {
    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    existing.calls += entry.calls;
  } else {
    total.push({ ...entry });
  }
}

// ---------------------------------------------------------------- the corpus

const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

let corpusCache: Map<string, string> | null = null;

export function corpus(): Map<string, string> {
  if (corpusCache) return corpusCache;
  const loaded = new Map<string, string>();
  for (const file of readdirSync(CORPUS_DIR)) {
    if (file.endsWith(".txt")) {
      loaded.set(file.replace(/\.txt$/, ""), flat(readFileSync(path.join(CORPUS_DIR, file), "utf8")));
    }
  }
  corpusCache = loaded;
  return loaded;
}

/**
 * Is this quote actually in the vendored text? The gate no model can talk past.
 *
 * Searches EVERY source rather than only the one the verifier named, because a
 * verifier that attributes a real passage to the wrong statute has still found
 * real supporting text — that is a citation error to report, not a fabrication.
 * A quote found nowhere is the fabrication.
 */
export function findQuote(quote: string): { sourceId: string } | null {
  const needle = normaliseQuoteEdges(quote);
  // Below about 25 characters a fragment matches by accident. A "quote" that
  // short is not support for anything.
  if (needle.length < 25) return null;
  for (const [sourceId, text] of corpus()) {
    if (text.toLowerCase().includes(needle.toLowerCase())) return { sourceId };
  }
  return null;
}

/**
 * Trims what excerpting does to a quote's EDGES. Never touches its interior.
 *
 * *** WHY THIS LOOSENING EXISTS, AND EXACTLY HOW FAR IT GOES ***
 *
 * The first version compared verbatim, and the adversarial run rejected a
 * genuine quote of r. 3.01. The passage was real and present; the verifier had
 * ended it with a full stop where the source has a semicolon. One character.
 *
 * Strictly, a quote that is not character-for-character is not a quote. But
 * the consequence of enforcing that here is not rigour, it is noise: models
 * terminate an excerpt with a full stop as a matter of habit, so a large
 * share of TRUE sentences would fail the gate and land in NEEDS_HUMAN. A gate
 * that rejects truth and falsehood alike is not a filter, and the reviewer
 * queue it fills is the thing this pipeline exists to keep small.
 *
 * So the edges are normalised and the interior is not:
 *
 *   allowed   surrounding whitespace, quote marks, ellipses; a trailing
 *             . , ; :  ; a difference of case
 *   NOT allowed   any change inside the passage — a different number, a
 *                 different actor, a dropped "not", a swapped form
 *
 * "excluding the first day" -> "excluding the last day" is interior and still
 * fails. That is the distinction the gate is actually for: boundary
 * punctuation is an artefact of excerpting, the words are the claim.
 */
export function normaliseQuoteEdges(quote: string): string {
  return flat(quote)
    .replace(/^["'“”‘’\s.…]+/, "")
    .replace(/["'“”‘’\s]+$/, "")
    .replace(/[.,;:…]+$/, "")
    .trim();
}

/** Splits drafted prose into the sentences the verifier must account for. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[a-z]/i.test(sentence) && sentence.split(/\s+/).length >= 4);
}

// --------------------------------------------------------------- the sources

/**
 * The stage premise: where the case stands, as a given rather than a claim.
 *
 * *** WHY THIS HAD TO BECOME A SOURCE ***
 *
 * The first subset run sent all three blocks to NEEDS_HUMAN, and the reasons
 * were not what I expected. Alongside real gaps, the verifier rejected:
 *
 *   "You have been served with a claim."
 *   "You are the defendant."
 *   "The defendant has not filed a defence."
 *
 * It was right. No rule says the reader was served. Those sentences are the
 * PREMISE of the stage — the position established before the block is shown at
 * all — and I had asked a verifier to check them against rule text, where they
 * were never going to be found. That was my error, not the content's.
 *
 * So the premise is supplied as its own source, clearly labelled as stating no
 * law. It is not model-written: it comes from the stage map, which is authored
 * and whose every citation is verified against the corpus.
 *
 * The obvious risk is that the premise becomes a laundry route — a legal claim
 * smuggled in by calling it context. `assertsRequirement` closes that: a
 * sentence whose only support is the premise may not state a deadline, a form,
 * a number, or an obligation. Those must come from legislation.
 */
export function stagePremise(stage: CaseStage): string {
  return `${stage.description} The reader's question at this point is: ${stage.userQuestion}`;
}

export const PREMISE_SOURCE_ID = "stage-premise";

/**
 * Does this sentence state a legal REQUIREMENT, as opposed to a position?
 *
 * Narrower than `makesAClaim` on purpose. "You have been served" describes
 * where the case stands; "you must file within 20 days" is law. Only the
 * second needs legislation behind it, and only the second is dangerous if the
 * premise is used as cover.
 */
/*
 * Narrowed after the second subset run rejected this:
 *
 *   "The defendant has not filed a defence within the required time."
 *
 * That is a position, not a requirement — it states no period and no form. It
 * was caught because the first version triggered on "within", "file", "days"
 * and "required", words that appear just as often in past-tense statements of
 * where a case stands as in statements of what the law demands.
 *
 * The harm this guards against is specific: a wrong NUMBER, a wrong FORM, or
 * an obligation asserted as absolute. So those are what it looks for. A
 * sentence with no particular in it cannot carry a wrong particular.
 */
const REQUIREMENT_MARKERS = /\b(\d|form\s+\d|must|shall|entitled to)\b/i;

export function assertsRequirement(sentence: string): boolean {
  return REQUIREMENT_MARKERS.test(sentence);
}

/**
 * The practical layer — fees, filing, what to bring, what happens after.
 *
 * *** WHY THE FIRST FULL RUN PRODUCED 3 BLOCKS OUT OF 35 ***
 *
 * The pipeline was given legislation and nothing else, and then asked for the
 * things legislation does not contain. The rejections said so plainly: "the
 * source does not mention a demand letter", "the source does not specify what
 * is required to be ready for trial", "whatHappensAfter could not be written
 * from the sources". Those were correct. O. Reg. 258/98 does not say what a
 * filing fee is, whether you can file online, or what to bring to a hearing.
 *
 * The tier-2 guides that DO say those things were vendored in Part 1b and
 * then never wired in. That was my omission, not a limit of the approach.
 *
 * *** WHY A MAP AND NOT A SEARCH ***
 *
 * Handing every guide to every stage would bury the two relevant pages in
 * fifty thousand characters and invite the drafter to pick the wrong one — a
 * defendant told how to issue a claim. The mapping is short, it is obviously
 * wrong when it is wrong, and it is a list that has to be maintained, which
 * CLAUDE.md permits. What it must not do is silently omit: a stage matching
 * nothing gets legislation only, and the run log records that.
 */
const PRACTICAL_FOR_STAGE: Array<{ match: RegExp; sources: string[] }> = [
  {
    match: /^before-filing|claim-drafted|claim-exceeds|limitation/,
    sources: [
      "guide-making-a-claim",
      "ontario-suing-someone-small-claims",
      "ontario-file-small-claims-online",
      "ontario-fee-waiver",
    ],
  },
  {
    match: /not-served|service-attempted|service-window/,
    sources: ["guide-serving-documents", "guide-making-a-claim"],
  },
  {
    match: /defence-period|served-defence|defence-filed|defendants-claim/,
    sources: ["guide-replying-to-a-claim", "scj-how-to-respond"],
  },
  {
    match: /default/,
    sources: ["scj-default-proceedings", "guide-after-judgment"],
  },
  {
    match: /settlement-conference|awaiting-settlement/,
    sources: ["guide-getting-ready-for-court", "scj-steps-in-a-case"],
  },
  {
    match: /trial/,
    sources: ["guide-getting-ready-for-court", "scj-steps-in-a-case"],
  },
  {
    match: /judgment|enforce/,
    sources: ["guide-after-judgment"],
  },
  {
    match: /dismissed-for-delay|filed-in-wrong-place/,
    sources: ["guide-motions-and-clerks-orders", "scj-steps-in-a-case"],
  },
];

/** Characters of each guide passed through. Whole pages, where they fit. */
const PRACTICAL_BUDGET = 7_000;

export function practicalSourcesFor(stageId: string): string[] {
  const matched = PRACTICAL_FOR_STAGE.filter((entry) => entry.match.test(stageId));
  return Array.from(new Set(matched.flatMap((entry) => entry.sources)));
}

/** The source material both passes are given. Quotes only — never summaries. */
export function sourceMaterial(stage: CaseStage): string {
  const seen = new Set<string>();
  const lines: string[] = [
    `[STAGE PREMISE — already established with the reader before this block is shown. ` +
      `It states no law. You may rely on it for WHERE THE CASE STANDS, and never for ` +
      `what the law requires, permits, or when anything is due.]\n${stagePremise(stage)}`,
  ];

  const add = (pinpoint: string, sourceId: string, quote: string) => {
    const key = `${sourceId} ${pinpoint}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(`[${pinpoint} — ${SOURCE_NAMES[sourceId as keyof typeof SOURCE_NAMES]}]\n${quote}`);
  };

  for (const citation of stage.rules) {
    add(citation.pinpoint, citation.sourceId, citation.quote);
  }
  for (const deadline of stage.deadlines) {
    for (const citation of [deadline.rule, deadline.computation, ...deadline.exceptions]) {
      add(citation.pinpoint, citation.sourceId, citation.quote);
    }
  }

  /*
   * The practical pages go in whole rather than as pre-chosen quotes.
   *
   * Legislation is cited to a pinpoint, so quoting it is precise. A guide page
   * is prose, and deciding in advance which paragraph matters would be me
   * choosing the answer and then asking the model to agree with it. The
   * verifier checks whatever is used against the same text, and findQuote
   * searches every vendored source, so nothing escapes the gate either way.
   */
  for (const sourceId of practicalSourcesFor(stage.id)) {
    const text = corpus().get(sourceId);
    if (!text) continue;
    lines.push(
      `[${SOURCE_NAMES[sourceId as keyof typeof SOURCE_NAMES] ?? sourceId} — official court guide. ` +
        `Use for practical detail: fees, filing, timing, what to bring. It is not legislation, ` +
        `so do not state a rule from it.]\n${text.slice(0, PRACTICAL_BUDGET)}`,
    );
  }

  return lines.join("\n\n");
}

// ---------------------------------------------------------------- the passes

const DRAFTER_SYSTEM = `You write procedural information for people representing themselves in the Ontario Small Claims Court.

ABSOLUTE RULES
1. Every factual statement you make must be supported by the SOURCE MATERIAL given to you. If the source material does not say something, you do not say it. Do not add anything from your own knowledge of Ontario procedure, however confident you are.
2. Never tell the reader whether they will win, how strong their position is, what they should argue, or what a judge is likely to do. You give information; the reader applies it.
3. Never address the reader's specific facts. Write the general position for someone at this stage.
3a. Use Canadian spelling: defence, favour, honour, centre, judgment (not judgement). The document a defendant files is a DEFENCE.
4. Write at a Grade 8 reading level. Short sentences. Ordinary words. Say what a term means the first time you use it.
5. Address the reader as "you". Be direct and calm. Do not reassure, do not alarm, do not apologise.
6. Where a form is mentioned, give BOTH its number and its name.
7. Keep each sentence to one idea. Do not combine what the rule says with where the case stands in a single sentence.
8. Do not write encouragement, exhortation or filler. "Prepare for the conference", "be ready for trial", "review the judgment" and "you may want to consider" say nothing a source can support and nothing a reader can act on. Every sentence must carry a fact from the sources.
9. If the source material does not let you write one of the sections properly, write the string NOT_SUPPORTED for that section rather than filling it with something plausible.

You reply with JSON only, in this shape:
{"whatsHappening": "...", "whatToDoNext": "...", "yourDeadline": "..." or null, "whatHappensAfter": "..."}`;

const VERIFIER_SYSTEM = `You check whether each sentence is supported by the source material provided.

You are not the author. You have not seen how these sentences were written or why. Judge only the sentence against the sources.

For EACH sentence you must decide:
- supported: true ONLY if the source material actually states this. You must then give "quote": the exact wording from the source material that supports it, copied character for character. If the sentence draws on more than one passage, give "quote" as a LIST of the exact passages. Every passage you list must be copied from the source material. Do not paraphrase the quote. Do not construct a quote. If you cannot copy an exact passage that states this, the sentence is NOT supported.
- supported: false otherwise. Give "reason": what the sentence claims that the sources do not say.

Be strict about these in particular, because they are the errors that cost people their cases:
- a number that differs from the source (days, months, dollar amounts)
- the wrong actor (the clerk does some things, a judge does others, a party does others)
- a form number or name that does not match the source
- "must" where the source says "may", or the reverse
- anything the source is silent about

A sentence that is merely plausible, or that you believe to be true from general knowledge, is NOT supported. Only the source material counts.

Some sentences make no claim about law or procedure at all — for example "This page explains what happens next." Mark those "states": "nothing". Use this ONLY for sentences that say nothing a source could support or contradict. A sentence that mentions a deadline, a number, a form, a court official, or what someone must or may do is making a claim and must be supported or rejected.

You reply with JSON only:
{"verdicts": [{"sentence": "...", "states": "law", "supported": true, "quote": ["...", "..."]} or {"sentence": "...", "states": "law", "supported": false, "reason": "..."} or {"sentence": "...", "states": "nothing"}]}`;

/**
 * Words that mean a sentence IS making a procedural claim.
 *
 * *** WHY THE MODEL DOES NOT GET THE LAST WORD ON THIS ***
 *
 * "states: nothing" is necessary — a block needs an occasional framing
 * sentence, and a verifier that rejects those sends every block to a human,
 * which defeats the pipeline. But it is also the obvious loophole: the easiest
 * way for a verifier to pass a sentence it cannot support is to decide the
 * sentence was not really claiming anything.
 *
 * So the classification is checked by code. A sentence carrying a number, a
 * form, a deadline word, a court actor or a modal obligation is making a
 * claim, whatever the verifier called it, and it must be supported or fail.
 * The model may narrow this set's effect; it cannot widen it.
 */
const CLAIM_MARKERS =
  /\b(\d|form|days?|months?|years?|deadline|within|file|filed|filing|serve|served|service|court|clerk|judge|justice|must|shall|may|required|entitled|rule|section|fee|motion|default|judgment|hearing|conference|trial)\b/i;

/** Does this sentence make a claim a source could support or contradict? */
export function makesAClaim(sentence: string): boolean {
  return CLAIM_MARKERS.test(sentence);
}

type ChatResult = { content: string; usage: Usage };

/*
 * A token-per-minute throttle, because retrying is forbidden here.
 *
 * openaiClient sets maxRetries: 0 deliberately — see its header; retries once
 * tripled the request rate against a daily cap. That is right, and it means a
 * 429 in this pipeline is not a blip, it is a lost stage: the first gpt-4o run
 * dropped two of three stages to "Rate limit reached ... on tokens per min".
 *
 * The practical guides make each call about 7,000 tokens, so a 30,000 TPM
 * ceiling is reached after four. Rather than retry, the pipeline paces itself:
 * it tracks what it has sent in the last minute and waits before it would
 * exceed the budget. Slower, and it finishes.
 */
/*
 * *** THE THROTTLE IS PER MODEL, AFTER APPLYING ONE MODEL'S LIMIT TO ANOTHER ***
 *
 * I added this for gpt-4o's 30,000 TPM ceiling and then applied that budget to
 * every model. gpt-4o-mini's limit is far higher, so a full run that had taken
 * ten minutes spent most of its time asleep — and the throttle became the
 * slowest part of a pipeline it was meant to make reliable.
 *
 * So the budget is looked up by model, and a model with no entry is not
 * throttled at all. An unnecessary throttle is not a safe default: it makes
 * long runs unusable, and unusable checks get skipped.
 */
const TPM_BY_MODEL: Record<string, number> = {
  "gpt-4o": 28_000,
};

const recentCalls: Array<{ at: number; tokens: number }> = [];

async function throttle(model: string, estimatedTokens: number): Promise<void> {
  const budget = Number(process.env.PIPELINE_TPM ?? TPM_BY_MODEL[model] ?? 0);
  if (budget <= 0) return;

  /*
   * A single call larger than the whole budget can never fit.
   *
   * The first version looped forever in that case and then read
   * `recentCalls[0].at` on an empty array. Waiting cannot help — the call is
   * over the per-minute ceiling on its own — so it goes out after the window
   * has drained and the rate limiter, not this function, decides.
   */
  if (estimatedTokens >= budget) {
    if (recentCalls.length > 0) {
      const drain = Math.max(0, recentCalls[0].at + 60_000 - Date.now());
      if (drain > 0) await new Promise((resolve) => setTimeout(resolve, drain));
      recentCalls.length = 0;
    }
    return;
  }

  for (;;) {
    const cutoff = Date.now() - 60_000;
    while (recentCalls.length > 0 && recentCalls[0].at < cutoff) recentCalls.shift();

    const used = recentCalls.reduce((total, call) => total + call.tokens, 0);
    if (used + estimatedTokens <= budget) return;
    if (recentCalls.length === 0) return;

    const waitFor = Math.min(60_000, Math.max(1_000, recentCalls[0].at + 60_000 - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, waitFor));
  }
}

async function chat(
  model: string,
  system: string,
  user: string,
): Promise<ChatResult> {
  // Roughly four characters per token. Only needs to be close enough to pace.
  const estimated = Math.ceil((system.length + user.length) / 4) + 800;
  await throttle(model, estimated);
  recentCalls.push({ at: Date.now(), tokens: estimated });

  const client = createOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return {
    content: response.choices[0]?.message?.content ?? "{}",
    usage: {
      model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      calls: 1,
    },
  };
}

export type DraftSections = {
  whatsHappening: string;
  whatToDoNext: string;
  yourDeadline: string | null;
  whatHappensAfter: string;
};

export async function draft(
  model: string,
  stage: CaseStage,
  feedback: string[],
): Promise<{ sections: DraftSections; usage: Usage }> {
  const deadlineNote =
    stage.deadlines.length === 0
      ? "This stage carries no deadline of its own. Set yourDeadline to null."
      : `This stage has ${stage.deadlines.length} deadline(s). Say what the period is and what it is counted FROM. Do not compute a date — a date is filled in later by code.`;

  const retry =
    feedback.length === 0
      ? ""
      : `\n\nA previous draft was rejected. Each line below is a sentence that could not be supported, and why. Do not repeat these claims. If a section cannot be written from the sources without them, write NOT_SUPPORTED for that section.\n${feedback.map((line) => `- ${line}`).join("\n")}`;

  const user = `STAGE: ${stage.title}
THE READER'S QUESTION: ${stage.userQuestion}
WHERE THEIR CASE STANDS: ${stage.description}
${deadlineNote}

SOURCE MATERIAL — the only thing you may state:

${sourceMaterial(stage)}${retry}`;

  const result = await chat(model, DRAFTER_SYSTEM, user);
  const parsed = JSON.parse(result.content) as Partial<DraftSections>;

  return {
    sections: {
      whatsHappening: parsed.whatsHappening ?? "NOT_SUPPORTED",
      whatToDoNext: parsed.whatToDoNext ?? "NOT_SUPPORTED",
      yourDeadline: parsed.yourDeadline ?? null,
      whatHappensAfter: parsed.whatHappensAfter ?? "NOT_SUPPORTED",
    },
    usage: result.usage,
  };
}

/**
 * The verifier pass, plus the code gate on its quotes.
 *
 * `sourceText` is passed in rather than derived so the adversarial harness can
 * hand it a known set of provisions and a known-wrong sentence.
 */
export async function verify(
  model: string,
  sourceText: string,
  sentences: string[],
  /** The stage premise, when one was supplied as a source. */
  premise?: string,
): Promise<{ verdicts: SentenceVerdict[]; usage: Usage }> {
  const user = `SOURCE MATERIAL:

${sourceText}

SENTENCES TO CHECK:

${sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n")}`;

  const result = await chat(model, VERIFIER_SYSTEM, user);
  const parsed = JSON.parse(result.content) as { verdicts?: SentenceVerdict[] };
  const returned = parsed.verdicts ?? [];

  const verdicts: SentenceVerdict[] = sentences.map((sentence) => {
    const match =
      returned.find((verdict) => verdict.sentence?.trim() === sentence.trim()) ??
      returned.find((verdict) => sentence.includes((verdict.sentence ?? "").slice(0, 40)));

    if (!match) {
      return {
        sentence,
        supported: false,
        reason: "the verifier returned no verdict for this sentence",
      };
    }

    /*
     * "states nothing" — accepted only if code agrees the sentence really
     * makes no claim. See CLAIM_MARKERS for why the model is not trusted here.
     */
    if ((match as { states?: string }).states === "nothing") {
      if (makesAClaim(sentence)) {
        return {
          sentence,
          supported: false,
          reason:
            "the verifier called this a sentence that states nothing, but it makes a " +
            "procedural claim (a number, a form, a deadline, a court actor or an " +
            "obligation) and so must be supported by a source",
        };
      }
      return { sentence, supported: true, quoteFound: false };
    }

    if (!match.supported) {
      return { sentence, supported: false, reason: match.reason ?? "unsupported" };
    }

    /*
     * The code gate. A verifier that says "supported" and hands back a quote
     * that is nowhere in the vendored text has fabricated its support, and
     * that is treated as a harder failure than an honest rejection — it is the
     * one failure a reviewer reading the record would not catch.
     */
    /*
     * A sentence may rest on MORE THAN ONE passage.
     *
     * The subset run produced "The 20 days have passed since the claim was
     * served, and no defence has been filed." That is a compound: r. 9.01
     * supplies the twenty days, the stage premise supplies that they have
     * passed. My first gate allowed a single source and rejected it as a
     * requirement smuggled in on the premise — a false positive on a true
     * sentence, which is the failure mode that fills the reviewer queue.
     *
     * So every passage offered is checked, ALL must be found, and a sentence
     * asserting a requirement must have at least one passage from legislation
     * rather than from the premise alone.
     */
    const offered = (Array.isArray(match.quote) ? match.quote : [match.quote]).filter(
      (quote): quote is string => typeof quote === "string" && quote.length > 0,
    );

    if (offered.length === 0) {
      return {
        sentence,
        supported: false,
        reason: "the verifier called this supported but quoted nothing",
      };
    }

    const inPremise = (quote: string) =>
      Boolean(
        premise &&
          normaliseQuoteEdges(premise)
            .toLowerCase()
            .includes(normaliseQuoteEdges(quote).toLowerCase()),
      );

    const resolved = offered.map((quote) => ({
      quote,
      sourceId: findQuote(quote)?.sourceId ?? (inPremise(quote) ? PREMISE_SOURCE_ID : null),
    }));

    const missing = resolved.filter((entry) => entry.sourceId === null);
    if (missing.length > 0) {
      return {
        sentence,
        supported: false,
        quote: missing[0].quote,
        quoteFound: false,
        reason:
          "the verifier called this supported but the passage it quoted is not in the " +
          "vendored source text",
      };
    }

    const fromLaw = resolved.filter((entry) => entry.sourceId !== PREMISE_SOURCE_ID);
    if (assertsRequirement(sentence) && fromLaw.length === 0) {
      return {
        sentence,
        supported: false,
        quote: offered[0],
        quoteFound: true,
        reason:
          "this states a requirement — a deadline, a form, a number or an obligation — " +
          "but its only support is the stage premise, which states no law. It needs a " +
          "legislative source.",
      };
    }

    return {
      sentence,
      supported: true,
      quote: offered.join(" | "),
      sourceId: (fromLaw[0] ?? resolved[0]).sourceId ?? undefined,
      quoteFound: true,
    };
  });

  return { verdicts, usage: result.usage };
}

/** Readability is checked by code, not asked of the model. */
export function readabilityProblem(text: string): string | null {
  const score = readability(text);
  /*
   * Compared at one decimal place, because that is the precision the estimate
   * actually has.
   *
   * A run rejected a draft "at grade 8.0, above the grade 8 target" — it was
   * 8.04. The syllable count is a vowel-group heuristic accurate to a few
   * percent, so treating 8.04 as a failure and 7.99 as a pass is precision the
   * measurement does not possess, and it sends true, readable content to a
   * human reviewer over rounding noise.
   */
  if (Number(score.grade.toFixed(1)) <= TARGET_GRADE) return null;
  return (
    `reads at grade ${score.grade.toFixed(1)}, above the grade ${TARGET_GRADE} target. ` +
    `Longest sentence: "${score.hardestSentences[0]?.text ?? ""}"`
  );
}
