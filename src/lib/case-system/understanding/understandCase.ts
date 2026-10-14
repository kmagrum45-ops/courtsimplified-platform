/**
 * UNDERSTAND THE CASE, THEN SAY ONLY WHAT IS CHECKED (site owner, 2026-10-14).
 *
 * Why this exists. Until now no step on the site read a person's whole story
 * and worked out their case. The front door labelled the story with topic
 * kinds and showed fixed cards for the labels, so "she never responded so i
 * noted her in default which the court accepted" showed a card on issue
 * estoppel ("When something has already been decided") and offered Family
 * for a slander claim. The owner's direction: the site should read and reason
 * the way Claude does in conversation, and verify what it says, not react to
 * words.
 *
 * Two halves, kept apart on purpose:
 *
 *   1. THINK (one call, the strongest model, high effort). The model reads the
 *      whole story the way an experienced Ontario litigator reads a client's
 *      first email: who is who, which side the person is on, what happened,
 *      where the matter stands now, which court it belongs in, what the next
 *      step is, and what it still needs to know. It writes:
 *        - a plain restatement of the person's facts (no law), for them to confirm;
 *        - the questions whose answers change the next step or the court;
 *        - the legal points that apply, next step first, each citing the Act,
 *          regulation or rule section behind it.
 *
 *   2. SAY ONLY WHAT IS CHECKED. The legal points go through the checked-answer
 *      engine (retrieval/checkedAnswer.ts) unchanged: each is matched against
 *      the official text in the library, a separate check must quote the words
 *      that support it, and code confirms the quote is really there. A point
 *      that cannot be confirmed is not shown; its topic is listed instead. A
 *      second look adds what a complete answer still needs, checked the same way.
 *
 * Nothing here selects a fixed card from words in the story. The model's
 * reasoning decides what to look up; the official text decides what is said.
 *
 * Standing rules: never judges the case (CLAUDE.md s. 3: the draft is told
 * not to, and statementRejection refuses outcome wording); everything is a
 * suggestion the person confirms (s. 4); every legal statement shown carries
 * its official source and quote (s. 2). Never throws.
 */

import { checkedAnswer, type CheckedAnswer, type CheckedAnswerDeps } from "../retrieval/checkedAnswer";
import type { RetrievalCourt } from "../retrieval/storyRetrieval";
import { fixedRegimeFor, type FixedRegimeId } from "../intelligence/fixedRegimes";
import { isMapOwnedProcedure } from "../procedureOwnership";
import { ALL_STAGES, findStage, isSpecialStage, pathwayOf, type StagePathway } from "../stage-map/stageMap";

// ------------------------------------------------------------------ types

export type UnderstoodCourt = "small-claims" | "civil" | "family" | "tribunal" | "outside-ontario" | "unclear";

export type UnderstoodMatter = {
  /** A few plain words naming it ("Your slander claim against your uncle's ex-girlfriend"). */
  title: string;
  court: UnderstoodCourt;
  /** The tribunal or other body, when court is "tribunal". */
  forum?: string;
};

export type UnderstoodQuestion = { question: string; why?: string };

export type CaseUnderstanding = {
  /** The person's own facts, restated plainly in the second person. No law. */
  summary: string;
  /** Key facts as label/value pairs ("Your side": "Bringing the claim"). No law. */
  facts: { label: string; value: string }[];
  /** Usually one. More only when the law would need separate proceedings. */
  matters: UnderstoodMatter[];
  /** The court the main matter belongs in, for the next screen. */
  mainCourt: UnderstoodCourt;
  side: "starting" | "responding" | "unclear";
  /** Where the matter stands now, in plain words. */
  stage: string;
  /** What the site needs to know next, most important first. */
  questions: UnderstoodQuestion[];
  /** The person asked whether they will win, or similar. The site does not judge that. */
  asksForPrediction: boolean;
  /**
   * The step in the stage map the reading places them at, for mainCourt
   * (CLAUDE.md s. 2a): the next step, its form and deadline are shown from the
   * map for this step, never written by the model. A suggestion the person
   * confirms or changes (s. 4). Null when no step fits or the court has no map.
   */
  step: string | null;
  /**
   * A court fixed by law decided in code (intelligence/fixedRegimes.ts), with
   * the sourced reason. `ownProcedure`: the statute has its own procedure the
   * map does not cover yet, so no ordinary steps are shown for it.
   */
  regime: { id: FixedRegimeId; reasoning: string; ownProcedure: boolean } | null;
};

export type UnderstandResult =
  | {
      status: "understood";
      understanding: CaseUnderstanding;
      /** The legal points, each checked against the official text. */
      answer: CheckedAnswer;
      /** Internal: the points the reasoning step drafted, before checking (for evals; never shown). */
      drafted?: { text: string; cites: string[] }[];
    }
  | { status: "unavailable" };

export type UnderstandInput = {
  story: string;
  city?: string;
  /** Earlier questions the site asked and the person's answers. */
  answers?: { question: string; answer: string }[];
  /** The court the person chose from the menu before writing; a guess, not a fact. */
  chosenCourt?: RetrievalCourt | null;
};

// ------------------------------------------------------------------ limits

const STORY_MAX = 8_000;
const MAX_QUESTIONS = 4;
const MAX_FACTS = 10;
const MAX_POINTS = 12;
/**
 * The reasoning call. At "high" effort it ran past 110 s on 2 of 5 stories
 * (2026-10-14 comparison) and the person got nothing; at the deep tier's
 * "medium" it reasons fully and finishes. AI_EFFORT_UNDERSTAND overrides.
 */
export const UNDERSTAND_TIME_MS = 140_000;
/** The checking that follows it. Together they stay inside Vercel's 300 s limit. */
export const CHECK_TIME_MS = 140_000;

// ------------------------------------------------------------------ the prompt

export const UNDERSTAND_SYSTEM_PROMPT = `You are an experienced Ontario litigator. A person who is representing themselves has written to you about their situation, in their own words, often with typos and missing details. Read it the way you would read a new client's first email: work out what actually happened, who is who, which side they are on, where things stand right now, which court or tribunal it belongs in, what their next step is, and what you still need to ask them.

Think it through carefully before you write. Read past typos and shorthand ("sueing by uncles ex" means suing my uncle's ex). Do not react to single words: "the court accepted" after "noted her in default" means the clerk noted the defendant in default, not that the claim has been decided. A procedural step is not a decision on the merits.

Return JSON:
{
 "summary": string,
 "facts": [{"label": string, "value": string}],
 "matters": [{"title": string, "court": "small-claims"|"civil"|"family"|"tribunal"|"outside-ontario"|"unclear", "forum": string}],
 "side": "starting"|"responding"|"unclear",
 "stage": string,
 "questions": [{"question": string, "why": string}],
 "asksForPrediction": boolean,
 "step": string,
 "points": [{"text": string, "cites": [string]}]
}

summary: two to four plain sentences restating what the person told you, in the second person ("You are suing..."). Only their facts. No law, no rules, no advice, no opinion on their case.

facts: up to ${MAX_FACTS} short label/value pairs of facts they gave or that follow plainly from what they said (who the other party is, by role; their side; dates; amounts; what has been filed or served; where they are). Write "Not given" for an important fact they did not give. No law.

matters: usually ONE. List more than one only when the law would need separate proceedings in different places (for example, wages owed and a human rights complaint). A procedural event inside one case (default, a motion, a judgment, an appeal) is NOT a separate matter. court:
- "small-claims": a claim for money or property up to $50,000 in the Small Claims Court, including defamation (libel or slander) claims for money.
- "civil": the Superior Court of Justice for claims over $50,000 or remedies Small Claims cannot give.
- "family": separation, divorce, children, support, property between spouses.
- "tribunal": a tribunal or board (Landlord and Tenant Board, Human Rights Tribunal, WSIB, Employment Standards, etc.); name it in "forum".
- "outside-ontario" or "unclear" only when they truly are.
When the amount is not given and decides the court, choose the likelier court and ask for the amount.
When a case has already been started, its court is the court where it was started: the person has to take their next step there, even if you think it belongs somewhere else (say that in a point instead, for example as a defence the person can raise).

side: "starting" if they are bringing it (plaintiff, applicant), "responding" if they are defending it (defendant, respondent).

stage: one plain sentence on where the matter stands now ("You have started your claim and the defendant has been noted in default; damages have not yet been assessed.").

questions: up to ${MAX_QUESTIONS}, only questions whose answers change the court, the next step, a deadline, or what they must prepare. Most important first. Plain words, one thing per question. When a deadline runs from service, ask how the papers were served (handed to them, mailed, left at their home, emailed), since that changes the day it starts. Ask for the facts the claim or defence turns on (for example what exactly was said and to whom, the exact date of an injury, who owns a property). "why" says in one short sentence why it matters, without stating a rule. Never ask something they already told you.

asksForPrediction: true if they ask whether they will win, how strong their case is, their chances, or what a judge will decide.

step: the id of the step in the site's step map, from the list in the message, that matches where their matter stands now in the court you chose for the main matter. Choose from that court's list only. Use "" when no step fits or the matter belongs to a tribunal or outside Ontario. The site shows their next step, its form, its deadline, where to file, the fee and what comes after from that step, checked against the official rules, so choosing the right step is the most important thing you do. Read carefully which side they are on and what has actually happened: a step that has not happened (they have not been sued, nothing has been served) is not their step.

points: up to ${MAX_POINTS} statements of the law that applies to THIS person now, most important first. The site already shows the next step, its form and its deadline from its checked step map, so do NOT write those: no form numbers, no response deadlines in days or weeks, no "your next step is", no "file / serve / deliver" instructions. Write, as they apply:
- which court, named exactly (for example "the Small Claims Court", "the Superior Court of Justice", "the Ontario Court of Justice"), and why; when an amount is over a court's limit, say the limit;
- what they must show, and the main facts a court looks at;
- every limitation period or notice period that is close or may have passed (for example the general two-year limitation period), what starts it, and any exception the law gives;
- required steps people miss that come from a statute (for example a notice that must be given before suing);
- other routes the law gives them, including ways to resolve it without going to court where the law provides them.
Each point is one or two plain sentences a non-lawyer understands, applied to their facts.
- Each point cites the exact statute, regulation or court rule and section behind it, with the full name: "Rules of the Small Claims Court, O. Reg. 258/98, r. 11.03", "Limitations Act, 2002, s. 4", "Family Law Act, s. 31". A leading court decision may be cited by name and neutral citation.
- Never invent a section number. If unsure of the number, cite the Act or rule and describe the rule.
- Use the forms, figures and procedures in force now.
- Do not compute calendar dates. State the period and what starts it ("within 20 days after you were served").
- Never say or suggest whether they will win, whether their case is strong or weak, their chances, or what a judge will think. Never say they have or do not have a case.
- If the matter belongs to a tribunal or outside Ontario courts, say where it belongs and what that body's first step is.`;

// ------------------------------------------------------------------ parsing (pure)

const str = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

const COURTS: readonly UnderstoodCourt[] = ["small-claims", "civil", "family", "tribunal", "outside-ontario", "unclear"];

/**
 * A sentence in the facts or the questions that states law. The reasoning
 * step is told to keep law out of these; this catches the times it does not,
 * because anything here is shown without the official-text check. Deliberately
 * narrower than groundedCognition's LEGAL_SIGNAL: a restatement of the person's
 * own facts says "served" and "default" ("you noted her in default") and those
 * are their facts, not law. What is caught is the language of rules: a section
 * or rule number, an Act, a form number, or an obligation or entitlement.
 */
const STATES_LAW =
  /\b(?:r\.\s*\d|s\.\s*\d|rule\s+\d|section\s+\d|subsection|act\b|regulation|o\.\s*reg|form\s+\d|must|shall|is required|are required|entitled|deadline|due\b|time limit|limitation period|within\s+\d+\s+days|the law (?:says|requires|allows))\b/i;

/** Drops a sentence the stage map owns, too (procedureOwnership.ts): "your defence is due 20 days after service". */
function statesLaw(sentence: string): boolean {
  return STATES_LAW.test(sentence) || isMapOwnedProcedure(sentence);
}

/** Drops the sentences of `text` that state law. Pure. */
export function withoutLaw(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !statesLaw(sentence))
    .join(" ")
    .trim();
}

export type ParsedUnderstanding = { understanding: CaseUnderstanding; points: { text: string; cites: string[] }[] };

export function parseUnderstanding(raw: string): ParsedUnderstanding | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;

  const summary = withoutLaw(str(record.summary, 1200));
  const facts = (Array.isArray(record.facts) ? record.facts : [])
    .map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      return { label: str(value.label, 60), value: withoutLaw(str(value.value, 240)) };
    })
    .filter((fact) => fact.label && fact.value)
    .slice(0, MAX_FACTS);
  const matters = (Array.isArray(record.matters) ? record.matters : [])
    .map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      const court = COURTS.includes(value.court as UnderstoodCourt) ? (value.court as UnderstoodCourt) : "unclear";
      const forum = str(value.forum, 120);
      return { title: withoutLaw(str(value.title, 160)) || "Your matter", court, ...(forum && court === "tribunal" ? { forum } : {}) };
    })
    .slice(0, 4);
  const questions = (Array.isArray(record.questions) ? record.questions : [])
    .map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      const question = str(value.question, 300);
      const why = withoutLaw(str(value.why, 300));
      // A question asks; it states nothing, so only its "why" is screened
      // ("Did you already file Form 9A?" is a fair question).
      return { question, ...(why ? { why } : {}) };
    })
    .filter((item): item is UnderstoodQuestion => Boolean(item && item.question.length >= 8))
    .slice(0, MAX_QUESTIONS);
  const points = (Array.isArray(record.points) ? record.points : [])
    .map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      return {
        text: str(value.text, 600),
        cites: (Array.isArray(value.cites) ? value.cites : []).map((cite) => str(cite, 200)).filter(Boolean).slice(0, 3),
      };
    })
    .filter((point) => point.text.length >= 10)
    .slice(0, MAX_POINTS);

  if (!summary && points.length === 0) return null;
  const side = record.side === "starting" || record.side === "responding" ? record.side : "unclear";
  const allMatters = matters.length ? matters : [{ title: "Your matter", court: "unclear" as const }];
  const step = validStep(str(record.step, 160), allMatters[0].court);
  return {
    understanding: {
      summary,
      facts,
      matters: allMatters,
      mainCourt: allMatters[0].court,
      side,
      stage: withoutLaw(str(record.stage, 400)),
      questions,
      asksForPrediction: record.asksForPrediction === true,
      step,
      regime: null,
    },
    // A point stating a step, form or deadline is the map's (s. 2a); the
    // reasoning was told not to write one, and code holds it to that.
    points: points.filter((point) => !isMapOwnedProcedure(point.text)),
  };
}

const MAP_COURTS: readonly string[] = ["small-claims", "civil", "family"];

/** A real, non-special step of `court`'s map, or null. Pure. */
export function validStep(id: string, court: UnderstoodCourt): string | null {
  if (!id || !MAP_COURTS.includes(court)) return null;
  const stage = findStage(id);
  if (!stage || isSpecialStage(id) || pathwayOf(stage) !== (court as StagePathway)) return null;
  return id;
}

/**
 * A court fixed by law wins over the reading (CLAUDE.md s. 2a). A construction
 * lien is a Superior Court action with its own procedure, which the map does
 * not hold yet: the court becomes civil and no ordinary step is suggested. A
 * claimed amount over $50,000 moves a Small Claims reading to civil, and the
 * step is dropped because it was chosen from the wrong court's map. Pure.
 */
export function withFixedRegime(understanding: CaseUnderstanding, story: string): CaseUnderstanding {
  const regime = fixedRegimeFor(story);
  if (!regime) return understanding;
  const applies =
    regime.id === "construction-lien" || understanding.mainCourt === "small-claims" || understanding.mainCourt === "unclear";
  if (!applies) return understanding;
  const matters = understanding.matters.map((matter, index) => (index === 0 ? { ...matter, court: regime.court } : matter));
  return {
    ...understanding,
    matters,
    mainCourt: regime.court,
    step: regime.ownProcedure || understanding.mainCourt !== regime.court ? null : understanding.step,
    regime: { id: regime.id, reasoning: regime.reasoning, ownProcedure: regime.ownProcedure },
  };
}

/** The step lists the reasoning chooses from, one per court. Pure. */
export function stepCatalogue(): string {
  const lines: Record<StagePathway, string[]> = { "small-claims": [], civil: [], family: [] };
  for (const stage of ALL_STAGES) {
    if (isSpecialStage(stage.id)) continue;
    const side = stage.side === "both" ? "either side" : stage.side;
    lines[pathwayOf(stage)].push(`- ${stage.id} (${side}): ${stage.userQuestion}`);
  }
  return (["small-claims", "civil", "family"] as const)
    .map((court) => `${court.toUpperCase()} STEPS:\n${lines[court].join("\n")}`)
    .join("\n\n");
}

/** Which court's procedure the checker reads: the main matter's, or the person's own choice. Pure. */
export function retrievalCourtFor(understanding: CaseUnderstanding, chosen?: RetrievalCourt | null): RetrievalCourt {
  const court = understanding.mainCourt;
  if (court === "small-claims" || court === "civil" || court === "family") return court;
  return chosen ?? "civil";
}

/** The person's story with the answers they gave since, as one text. Pure. */
export function storyWithAnswers(input: UnderstandInput): string {
  const answered = (input.answers ?? []).filter((item) => item.answer.trim());
  return [
    input.story.trim(),
    input.city?.trim() ? `I live in ${input.city.trim()}, Ontario.` : "",
    ...answered.map((item) => `Q: ${item.question.trim()}\nA: ${item.answer.trim()}`),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, STORY_MAX);
}

// ------------------------------------------------------------------ the pipeline

export type UnderstandDeps = {
  /** The reasoning call; returns the model's JSON text. */
  reason?: (story: string, chosenCourt?: RetrievalCourt | null) => Promise<string>;
  /** Passed through to the checked-answer engine (tests inject fakes). */
  check?: CheckedAnswerDeps;
  understandMs?: number;
  checkMs?: number;
};

/** Resolves to `fallback` when `promise` has not settled within `ms`. */
function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms).unref?.())]);
}

export async function understandCase(input: UnderstandInput, deps: UnderstandDeps = {}): Promise<UnderstandResult> {
  try {
    const story = storyWithAnswers(input);
    if (!input.story.trim()) return { status: "unavailable" };

    const raw = await within((deps.reason ?? reasonWithModel)(story, input.chosenCourt), deps.understandMs ?? UNDERSTAND_TIME_MS, "");
    const parsed = raw ? parseUnderstanding(raw) : null;
    if (!parsed) return { status: "unavailable" };
    const { points } = parsed;
    const understanding = withFixedRegime(parsed.understanding, story);

    // The reasoning step's points become the draft the checker works on. The
    // checker never sees the reasoning, only each point and the official text.
    const draft = JSON.stringify({
      scope: understanding.mainCourt === "outside-ontario" ? "outside" : "ontario",
      asksForPrediction: understanding.asksForPrediction,
      statements: points,
    });
    const answer = await checkedAnswer(
      {
        question:
          "Which court does this belong in and why, what must be shown, which limitation or notice periods apply, and what law applies to my situation?",
        story,
        facts: [
          understanding.stage ? `Where it stands: ${understanding.stage}` : "",
          ...understanding.facts.map((fact) => `${fact.label}: ${fact.value}`),
        ]
          .filter(Boolean)
          .join("\n"),
        courtPath: retrievalCourtFor(understanding, input.chosenCourt),
        side: understanding.side === "starting" ? "plaintiff" : understanding.side === "responding" ? "defendant" : undefined,
      },
      {
        ...deps.check,
        // Thorough: the second look adds what a complete answer still needs.
        thorough: deps.check?.thorough ?? true,
        timeoutMs: deps.checkMs ?? deps.check?.timeoutMs ?? CHECK_TIME_MS,
        draft: async () => draft,
      },
    );
    // The checker's second look can add points of its own; the map's ground is
    // held here too (s. 2a).
    const kept = answer.statements.filter((statement) => !isMapOwnedProcedure(statement.text));
    return { status: "understood", understanding, answer: { ...answer, statements: kept }, drafted: points };
  } catch {
    return { status: "unavailable" };
  }
}

// ------------------------------------------------------------------ the model call

function reasonUserPrompt(story: string, chosenCourt?: RetrievalCourt | null): string {
  return [
    chosenCourt
      ? `Before writing, the person clicked "${chosenCourt === "small-claims" ? "Small Claims" : chosenCourt === "family" ? "Family" : "Civil"}" on the site's menu. That was a guess before they described anything; decide the court from their facts.`
      : "",
    `TODAY: ${new Date().toISOString().slice(0, 10)}`,
    `THE SITE'S STEP MAP (choose "step" from the list for your main court):\n${stepCatalogue()}`,
    `THEIR WORDS:\n${story}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function reasonWithModel(story: string, chosenCourt?: RetrievalCourt | null): Promise<string> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Audited as the court-path check it replaces at the front door.
  return withAiCallContext({ callType: "court-path-classifier" }, async () => {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      ...modelParams("deep", { effort: process.env.AI_EFFORT_UNDERSTAND || "medium" }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: UNDERSTAND_SYSTEM_PROMPT },
        { role: "user", content: reasonUserPrompt(story, chosenCourt) },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  });
}
