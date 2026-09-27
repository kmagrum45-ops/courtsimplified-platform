/**
 * Document analysis by a model: built, wired, tested — and OFF.
 *
 * ############################################################################
 * ##  THE FLAG IS FALSE EVERYWHERE, INCLUDING STAGING, AND STAYS FALSE      ##
 * ##  UNTIL OPENAI'S ZERO DATA RETENTION AND MODIFIED ABUSE MONITORING      ##
 * ##  CONFIRMATION IS IN WRITING AND RECORDED IN `ZDR_CONFIRMED_AT` BELOW.  ##
 * ##                                                                        ##
 * ##  AS OF 2026-09-27 THAT REQUEST HAS NOT BEEN SENT.                      ##
 * ############################################################################
 *
 * *** WHY THIS IS NOT THE USUAL "FEATURE FLAG OFF BY DEFAULT" ***
 *
 * A feature flag defaults off because the feature is unfinished. This one is off
 * because the data it would send is the most sensitive this product holds — litigants'
 * medical records, bank statements and solicitors' letters — and the terms governing
 * what happens to that data after it arrives have not been agreed.
 *
 * `docs/security/DATA_FLOW_INVENTORY.md` §3.2 sets out the position for the intake
 * text that already goes to OpenAI: zero data retention, modified abuse monitoring.
 * That position was established for TEXT A USER TYPED INTO A FORM. It has not been
 * established for the contents of a document they uploaded, and nobody has asked.
 *
 * So the ordinary reason to flip a flag — "the feature works now" — is not sufficient
 * here, and would not be sufficient even after a green run in staging. The feature
 * working is not the blocker. That is why the gate below is not a single boolean.
 *
 * *** THE TWO-KEY GATE ***
 *
 * `documentAnalysisEnabled()` requires BOTH:
 *
 *   1. `AI_DOCUMENT_ANALYSIS_ENABLED === "true"` in the environment, and
 *   2. `ZDR_CONFIRMED_AT` to be a recorded date in this file.
 *
 * The second cannot be set from an environment variable, a dashboard or a deploy. It
 * is a source change, so turning this on requires a commit, a review and a diff that
 * says what was confirmed and when — which is exactly the conversation that must
 * happen before any document reaches a model.
 *
 * Somebody who sets the env var and finds it does not work will read this comment.
 * That is the point of the design.
 *
 * *** WHAT IS TESTED, AND WHAT IS HONESTLY NOT ***
 *
 * `test:workspace-ai-flag` proves the OFF path: with the flag false, no document text
 * and no file name reaches any model call, the route refuses, and the payload builder
 * cannot be talked into producing one.
 *
 * It does NOT prove the ON path behaves well against a real model, because the ON path
 * has never run. What it does prove about the ON path is everything decidable without
 * one: the payload contains only extracted text, the file name is absent, the caps
 * hold, the schema rejects anything that grades a case. The payload builder is a pure
 * function precisely so that can be tested without a flag and without a network.
 */

/**
 * The date OpenAI confirmed, in writing, that zero data retention and modified abuse
 * monitoring cover IMAGE AND DOCUMENT inputs for this organisation's project.
 *
 * `null` means no such confirmation exists.
 *
 * *** WHEN THIS IS SET, ALSO DO THESE THINGS ***
 *
 *   1. Record the confirmation itself in DATA_FLOW_INVENTORY §3.2, beside the existing
 *      text position, with the date and what exactly was confirmed.
 *   2. Say whether it covers images as well as text. ACCURACY_ENGINE records
 *      model-based reading of document IMAGES as deliberately not built for this same
 *      reason, and the two questions have the same answer only if OpenAI says so.
 *   3. Leave `AI_DOCUMENT_ANALYSIS_ENABLED` off in production until the site owner
 *      says otherwise. This constant unblocks the flag; it is not the decision.
 */
export const ZDR_CONFIRMED_AT: string | null = null;

/** Why the feature is off, for a reader of an API response or a log line. */
export const ANALYSIS_DISABLED_REASON =
  "Document analysis is turned off. It stays off until OpenAI has confirmed in writing " +
  "that zero data retention and modified abuse monitoring cover uploaded documents, " +
  "and that confirmation has been recorded.";

/**
 * The only thing that may decide whether a document reaches a model.
 *
 * Both conditions, always, in this one function. A caller that checks
 * `process.env.AI_DOCUMENT_ANALYSIS_ENABLED` directly has bypassed the ZDR key, so
 * `test:workspace-ai-flag` asserts nothing outside this file reads that variable.
 */
export function documentAnalysisEnabled(
  /*
   * A plain record rather than NodeJS.ProcessEnv, so a check can drive it with one key.
   * ProcessEnv requires NODE_ENV, which would force every test case to carry a value
   * irrelevant to what it is testing.
   */
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (ZDR_CONFIRMED_AT === null) return false;
  return env.AI_DOCUMENT_ANALYSIS_ENABLED === "true";
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

/**
 * How much of a document's text may be sent.
 *
 * Not a cost control. A cap means that when this is eventually switched on and
 * something is wrong with it, the blast radius is twelve thousand characters of one
 * document rather than the whole file. The first version of a data flow is the one
 * most likely to be wrong, and this is the flow where being wrong is worst.
 */
export const MAX_ANALYSIS_CHARS = 12_000;

/** Documents per request. A batch is a bigger mistake if the batch is wrong. */
export const MAX_DOCUMENTS_PER_CALL = 1;

/** Per case, per day, so a loop cannot quietly send a whole case file repeatedly. */
export const MAX_ANALYSES_PER_CASE_PER_DAY = 50;

// ---------------------------------------------------------------------------
// The payload — what may leave, and the gate that decides
// ---------------------------------------------------------------------------

export type AnalysisPayload = {
  /** Extracted document text, capped. The ONLY field carrying document content. */
  text: string;
  /** True where the text was cut at the cap, so the model is not told it has all of it. */
  truncated: boolean;
};

export type PayloadRefusal = { ok: false; reason: string };
export type PayloadAccepted = { ok: true; payload: AnalysisPayload };

/**
 * Things that must never appear in a payload, with why each one matters.
 *
 * *** THE FILE NAME IS THE ONE PEOPLE GET WRONG ***
 *
 * `restraining-order-application.pdf` tells you something the user never decided to
 * tell you. It is a disclosure in its own right, independent of the document's
 * contents, and it is the single most tempting field to include because it is short,
 * human-readable and looks like helpful context.
 *
 * `docs/lso-fixes-report.md` Step 8 records that file names used to reach OpenAI and
 * no longer do. The column comment on `workspace_documents.original_name` says the AI
 * payload is built from extracted text only and names the suite that asserts it. This
 * is that assertion.
 */
export type ForbiddenField = {
  key: string;
  why: string;
};

export const FORBIDDEN_IN_PAYLOAD: readonly ForbiddenField[] = [
  {
    key: "originalName",
    why:
      "a file name is a disclosure in its own right — restraining-order-application.pdf " +
      "tells you something the user never decided to tell you",
  },
  { key: "fileName", why: "same as originalName, under another name" },
  { key: "storagePath", why: "contains the user's id, and points at the object itself" },
  { key: "userId", why: "identifies the litigant to the processor" },
  { key: "caseId", why: "links calls together into one person's case file" },
  { key: "email", why: "identifies the litigant" },
  { key: "parties", why: "names of people who are not our users (DATA_FLOW_INVENTORY §1.3)" },
  { key: "piiFlags", why: "tells the processor which documents carry a SIN or a health card" },
  { key: "sha256", why: "a stable identifier that links the same document across calls" },
];

export type PayloadInput = {
  extractedText: string | null;
  /**
   * Passed in so the gate can prove it is EXCLUDED rather than merely absent.
   *
   * A gate that is never shown the file name cannot demonstrate it drops it — its
   * silence is indistinguishable from a caller that forgot to pass it. Taking it and
   * refusing to emit it is a testable property; not taking it is an untestable habit.
   */
  originalName: string;
  storagePath: string;
  userId: string;
  caseId: string;
};

/**
 * Builds the payload, or refuses.
 *
 * Pure, and deliberately takes everything it must NOT send, so a check can hand it a
 * distinctive file name and assert that name appears nowhere in the result.
 */
export function buildAnalysisPayload(input: PayloadInput): PayloadAccepted | PayloadRefusal {
  const text = (input.extractedText ?? "").trim();

  if (text.length === 0) {
    return {
      ok: false,
      reason:
        "there is no extracted text for this document, and the payload is built from " +
        "extracted text only — never from the file name",
    };
  }

  const truncated = text.length > MAX_ANALYSIS_CHARS;

  return {
    ok: true,
    payload: {
      text: truncated ? text.slice(0, MAX_ANALYSIS_CHARS) : text,
      truncated,
    },
  };
}

/**
 * The gate run on a built payload immediately before a call.
 *
 * *** WHY A SECOND CHECK ON SOMETHING A PURE FUNCTION JUST BUILT ***
 *
 * `buildAnalysisPayload` cannot currently emit a forbidden field — it constructs an
 * object with two keys. This gate exists for the version of that function somebody
 * writes in six months, when adding "just the document type for context" looks
 * harmless and the pure function quietly grows a third key.
 *
 * It inspects the serialised payload, so it catches a forbidden value arriving under a
 * key nobody thought of, including inside the text itself where a value was
 * interpolated by mistake.
 */
export function subjectLineGate(
  payload: AnalysisPayload,
  mustNotContain: PayloadInput,
): { ok: true } | { ok: false; leaked: string; why: string } {
  const serialised = JSON.stringify(payload);

  const values: { value: string; field: ForbiddenField }[] = [
    { value: mustNotContain.originalName, field: FORBIDDEN_IN_PAYLOAD[0] },
    { value: mustNotContain.storagePath, field: FORBIDDEN_IN_PAYLOAD[2] },
    { value: mustNotContain.userId, field: FORBIDDEN_IN_PAYLOAD[3] },
    { value: mustNotContain.caseId, field: FORBIDDEN_IN_PAYLOAD[4] },
  ];

  for (const { value, field } of values) {
    /*
     * Short values are skipped. A three-character "file name" would match by accident
     * inside ordinary text and turn the gate into a source of false refusals, which is
     * how a safety check comes to be disabled.
     */
    if (!value || value.length < 8) continue;
    if (serialised.includes(value)) {
      return { ok: false, leaked: field.key, why: field.why };
    }
  }

  const keys = Object.keys(payload);
  for (const forbidden of FORBIDDEN_IN_PAYLOAD) {
    if (keys.includes(forbidden.key)) {
      return { ok: false, leaked: forbidden.key, why: forbidden.why };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// What the model may return
// ---------------------------------------------------------------------------

/**
 * The structured response schema.
 *
 * *** EVERY FIELD DESCRIBES THE DOCUMENT. NONE DESCRIBES THE CASE. ***
 *
 * CLAUDE.md §3. The model may say what a document is, when it is dated, who it is
 * between and what amount it names. It may not say whether the document helps, matters,
 * is strong, is missing something important, or what it means for the outcome — and the
 * screen prints that boundary beside every suggestion.
 *
 * The schema is the enforcement, not the prompt. A prompt asking for no assessment is a
 * request; a schema with no field to put one in is a constraint, and `validateAnalysis`
 * below drops anything that arrives outside it.
 */
export type AnalysisSuggestion = {
  /** A documentTypes.ts id, or null. Never a free-text description of a type. */
  documentType: string | null;
  /** ISO date, or null. The model may not guess a day it did not read. */
  date: string | null;
  datePrecision: "day" | "month" | "year" | null;
  /** Who the document is from and to, as the document itself names them. */
  from: string | null;
  to: string | null;
  /** A number, or null. Never a range and never "about". */
  amount: number | null;
  /** One short sentence saying what the document IS. Not what it shows. */
  description: string | null;
};

/**
 * Wording that would make a description an assessment however it is phrased.
 *
 * *** THE WORD BOUNDARIES ARE THE WHOLE DIFFICULTY, AND I GOT THEM WRONG FIRST ***
 *
 * The first version used `\b(strong|weak|...)\b`, which does NOT match "strongest" or
 * "weakens": there is no word boundary between "strong" and "est". Three assessments
 * went straight through the validator —
 *
 *   "This is your strongest document."
 *   "A key piece of evidence for your claim."
 *   "This weakens the other side's position."
 *
 * — and the first of those is the single sentence this product must never produce.
 * Caught by the check, not by reading the pattern, which is the argument for driving a
 * gate like this with real sentences rather than inspecting it.
 *
 * So the stems take `\w*`, and the multi-word forms are matched with the words that
 * actually appear between them ("key PIECE OF evidence").
 *
 * This cannot be exhaustive — §3 says wording is not the shield — and it is not the
 * only control: the schema has no field for an assessment, so a model wanting to give
 * one has to smuggle it into `description`, which is exactly what this reads.
 */
const ASSESSMENT_WORDS = new RegExp(
  [
    // ---- §3: grading the case ----
    //
    // Stems take \w* because the boundary bug lives in the suffixes. `\bweak\b` misses
    // "weakens"; `\bhelpful\b` misses "unhelpful", because there is no boundary before
    // "helpful" in it. Both were found by driving the filter with sentences, not by
    // reading it.
    "\\b(?:strong\\w*|weak\\w*)\\b",
    "\\w*helps?\\b|\\w*helpful\\b",
    "\\bhurts?\\b|\\bharm\\w*\\b",
    "\\bprove[sn]?\\b|\\bproving\\b",
    "\\bimportant\\b|\\bcrucial\\b|\\bvital\\b|\\bessential\\b|\\bsignificant\\b",
    "\\brisk\\w*\\b|\\blikel\\w*\\b|\\bchance\\w*\\b|\\bunlikely\\b",
    "\\bwins?\\b|\\bwinning\\b|\\bloses?\\b|\\blosing\\b",
    "\\bbest\\b|\\bworst\\b|\\bgood\\b|\\bpoor\\b",
    "\\bsupports?\\s+your\\b|\\bbacks?\\s+up\\s+your\\b",
    "\\bkey\\s+(?:\\w+\\s+){0,2}(?:evidence|document|piece)\\b",
    "\\bin\\s+your\\s+favour\\b|\\bagainst\\s+you\\b",

    /*
     * ---- §2: applying law to the user's facts ----
     *
     * *** THIS WHOLE CLASS WAS MISSING, AND IT IS THE WORSE OF THE TWO ***
     *
     * The filter covered case-grading and nothing else. Sixteen of fifty-six adversarial
     * sentences escaped, and almost all of them were this: a model stating that the
     * user's facts satisfy a legal test.
     *
     *   "This shows a breach of the contract."
     *   "The contractor is liable for the damage."
     *   "This establishes liability."
     *   "You are entitled to the full amount."
     *
     * CLAUDE.md §2's "who does the applying" test. Legal INFORMATION explains law
     * generally and the USER applies it; legal ADVICE is the SYSTEM applying it to their
     * facts. Every sentence above is the second, and none of them is caught by a
     * case-grading filter — "the contractor is liable" contains no word about strength,
     * chances or importance. It simply decides the case.
     *
     * A suggestion may say a document IS a contract. It may not say the contract was
     * breached.
     */
    "\\bbreach\\w*\\b",
    "\\bliable\\b|\\bliabilit\\w*\\b",
    "\\bnegligen\\w*\\b",
    "\\bat\\s+fault\\b|\\byour\\s+fault\\b|\\btheir\\s+fault\\b",
    "\\bentitle\\w*\\b",
    "\\bestablish\\w*\\b",
    "\\bobligation\\w*\\b|\\bobliged\\b",
    /*
     * The PLURAL only. "damages" is the legal term for the money claimed; "damage" is the
     * ordinary word, and "a photograph of the damage to the fence" is a perfectly good
     * description that must keep working.
     */
    "\\bdamages\\b",
    "\\bvalid\\s+claim\\b|\\bhas\\s+a\\s+claim\\b",
    "\\bowes?\\b|\\bowing\\s+to\\s+you\\b",
    "\\bin\\s+default\\s+of\\b",
    /*
     * Attribution, not the bare word. "The landlord IS responsible for the repair" decides
     * who bears an obligation; "a letter naming the person responsible for the account" is
     * a description, and the copula is what separates them.
     *
     * *** WHICH WAY TO ERR, WHEN THE PATTERN CANNOT SEPARATE THEM CLEANLY ***
     *
     * Past tense is included, which does catch a contrived description like "a work order
     * listing who was responsible for scheduling". That is deliberate, because the two
     * failures are not equal:
     *
     *   a false REFUSAL costs the user a suggestion they can type themselves
     *   a false ACCEPTANCE tells a litigant who is legally responsible
     *
     * The first is recoverable in seconds. The second is this product doing the one thing
     * §2 forbids, in a sentence the user has no reason to doubt.
     */
    "\\b(?:is|are|was|were)\\s+responsible\\b",
  ].join("|"),
  "i",
);

export type ValidationOutcome =
  | { ok: true; suggestion: AnalysisSuggestion }
  | { ok: false; reason: string };

/**
 * Accepts only what the schema allows, and refuses a description that grades anything.
 *
 * Unknown keys are DROPPED rather than refused: a model that adds a field is not
 * necessarily misbehaving, and refusing the whole response would lose good suggestions
 * over a harmless extra. What must never happen is an unknown field being passed
 * through to a screen, so the returned object is constructed from known keys only.
 */
export function validateAnalysis(raw: unknown): ValidationOutcome {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "the response was not an object" };
  }

  const value = raw as Record<string, unknown>;

  const text = (key: string, max: number): string | null => {
    const candidate = value[key];
    return typeof candidate === "string" && candidate.trim().length > 0
      ? candidate.trim().slice(0, max)
      : null;
  };

  const description = text("description", 300);

  if (description && ASSESSMENT_WORDS.test(description)) {
    return {
      ok: false,
      reason:
        `the description grades the document or the case ("${description.slice(0, 80)}"). ` +
        `A suggestion says what a document IS, never what it shows or how it helps.`,
    };
  }

  const date = text("date", 10);
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, reason: `"${date}" is not a date written as YYYY-MM-DD` };
  }

  const precisionRaw = value.datePrecision;
  const datePrecision =
    precisionRaw === "day" || precisionRaw === "month" || precisionRaw === "year"
      ? precisionRaw
      : null;

  const amountRaw = value.amount;
  const amount =
    typeof amountRaw === "number" && Number.isFinite(amountRaw) ? amountRaw : null;

  return {
    ok: true,
    suggestion: {
      documentType: text("documentType", 60),
      date,
      datePrecision,
      from: text("from", 200),
      to: text("to", 200),
      amount,
      description,
    },
  };
}
